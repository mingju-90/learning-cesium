<template>
    <Viewer @ready="ready">
        <template v-if="isReady">
            <VideoFusion :drone-info="droneInfo" :viewer="viewer"/>
        </template>
    </Viewer>
</template>

<script setup>
import { onMounted, watch, ref } from 'vue';
import Viewer from '../../components/cesiumComponents/viewer.vue';
import { CreateFrustum, getCesiumHPRFromDjiSpecifications } from './createFrustum';
import { setCenter } from '../../utils/cesiumUtils';
import { calculateFarPlanePoints, calculateGroundIntersection } from './uits';
import VideoFusion from './videoFusion.vue';

// import Frustum from './frustum.vue';


// droneInfo: {longitude, latitude, height, fov, aspectRatio, heading, pitch, roll}
const props = defineProps({
    droneInfo: Object,
})
let viewer

function createVideoMaterial(canvas) {
    return new Cesium.Material({
        fabric: {
            type: 'Image',
            uniforms: {
                image: canvas,
            },
            // 关键：自定义 UV 透视变换
            source: `
            uniform sampler2D image;
            czm_materialInput materialInput;

            vec2 uv0 = vec2(0.0, 1.0); // 图片左上 → 顶点0
            vec2 uv1 = vec2(0.0, 0.0); // 图片左下 → 顶点1
            vec2 uv2 = vec2(1.0, 0.0); // 图片右下 → 顶点2
            vec2 uv3 = vec2(1.0, 1.0); // 图片右上 → 顶点3

            // 四边形四个顶点在局部坐标系中的位置（由 Cesium 自动传入）
            // materialInput.st 已经是插值后的 UV (0,0)-(1,1)
            // 我们要把它反向映射到纹理的四角

            vec2 perspectiveMap(vec2 st) {
              // 目标：st → 纹理四角
              // 使用双线性插值逆向求解（等价于透视除法）

              vec2 p0 = st * (1.0 - st.s - st.t) * uv0;
              vec2 p1 = vec2(st.s, 0.0) * (1.0 - st.t) * uv1;
              vec2 p2 = st * uv2;
              vec2 p3 = vec2(0.0, st.t) * (1.0 - st.s) * uv3;

              return p0 + p1 + p2 + p3;
            }

            czm_material czm_getMaterial(czm_materialInput materialInput) {
              czm_material material = czm_getDefaultMaterial(materialInput);

              // 直接使用 materialInput.st 作为四边形内的归一化坐标
              vec2 uv = materialInput.st;

              // 关键：双线性插值实现透视贴合
              float s = uv.s;
              float t = uv.t;
              vec2 texCoord =
                  uv0 * (1.0 - s) * (1.0 - t) +
                  uv1 * s * (1.0 - t) +
                  uv2 * s * t +
                  uv3 * (1.0 - s) * t;

              vec4 color = texture(image, texCoord);
              material.diffuse = color.rgb;
              material.alpha = color.a;
              return material;
            }
            `
        }
    })
}

let frustum
const isReady = ref(false)
const ready = async (data) => {
    viewer = data.viewer
    isReady.value = true
    frustum = new CreateFrustum(viewer, {
        position: Cesium.Cartesian3.fromDegrees(props.droneInfo.longitude, props.droneInfo.latitude, props.droneInfo.height),
        fov: props.droneInfo.fov,
        yaw: props.droneInfo.heading,
        pitch: props.droneInfo.pitch,
        aspectRatio: props.droneInfo.aspectRatio,
        roll: 0,
        near: 1,
        far: 100,
    })
    setCenter(viewer, { longitude: 120.279604894, latitude: 31.613370323 })

}

watch(() => props.droneInfo, (val) => {
    frustum.update(Cesium.Cartesian3.fromDegrees(val.longitude, val.latitude, val.height), val.heading, val.pitch, val.fov)
})

const addPoint = (position, i = 0) => {
    const pointEntity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(...position),
        // 点样式配置
        point: {
            pixelSize: 12,        // 点的像素大小（默认10）
            color: Cesium.Color.RED,  // 点的颜色（支持RGB、十六进制）
            outlineColor: Cesium.Color.WHITE,  // 点的轮廓颜色
            outlineWidth: 2,      // 轮廓宽度（像素）
            show: true,           // 是否显示（默认true）
            disableDepthTestDistance: Number.POSITIVE_INFINITY  // 始终显示在最上层（避免被地形遮挡）
        },
        label: {
            text: `P${i + 1}`,
            font: '12px sans-serif',
            fillColor: Cesium.Color.WHITE,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -10),
        },
    });
    viewer.flyTo(pointEntity)
}

/**
 * 根据百分比在远平面上计算目标点的经纬度坐标
 * 功能：通过给定的远平面四个顶点和百分比，计算平面内对应位置的地理坐标（经纬度+高度）
 * @param {Array} farPlane 远平面的四个顶点，格式为 [[lon, lat, height], ...]
 *                         顶点顺序要求：[左上角(p0), 左下角(p1), 右下角(p2), 右上角(p3)]
 * @param {Number} xPercent X方向百分比（0~1），0对应最左侧，1对应最右侧
 * @param {Number} yPercent Y方向百分比（0~1），0对应最顶部，1对应最底部
 * @returns {Array} 目标点的经纬度和高度 [longitude, latitude, height]
 */
const getPointByPercentage = (farPlane, xPercent, yPercent) => {
    // 校验输入：远平面必须包含4个顶点，否则抛出错误
    if (farPlane.length !== 4) {
        throw new Error("远平面必须包含4个顶点");
    }

    // 将远平面的经纬度坐标（度）转换为Cesium的笛卡尔空间坐标（世界坐标）
    // 顶点顺序：[左上角(p0), 左下角(p1), 右下角(p2), 右上角(p3)]
    const [p0, p1, p2, p3] = farPlane.map(([lon, lat, height]) =>
        Cesium.Cartesian3.fromDegrees(lon, lat, height) // 转换方法：度 -> 笛卡尔坐标
    );

    // 1. 定义局部坐标系的基础原点和初始轴向量
    const origin = p0; // 以左上角p0为局部坐标系原点
    // X轴初始向量：从左上角p0指向右上角p3（代表平面的宽度方向）
    const xAxis = Cesium.Cartesian3.subtract(p3, p0, new Cesium.Cartesian3());
    // Y轴初始向量：从左上角p0指向左下角p1（代表平面的高度方向）
    const yAxis = Cesium.Cartesian3.subtract(p1, p0, new Cesium.Cartesian3());

    // 2. 计算远平面的法向量（垂直于平面的向量）
    // 用法向量确保局部坐标系与平面垂直，通过X轴和Y轴叉乘得到
    const normal = Cesium.Cartesian3.cross(xAxis, yAxis, new Cesium.Cartesian3());
    Cesium.Cartesian3.normalize(normal, normal); // 归一化法向量（单位向量）

    // 3. 修正Y轴向量，确保与X轴垂直且位于平面内
    // 由于地形或投影偏差，初始Y轴可能与X轴不垂直，通过法向量叉乘X轴重新计算
    // 叉乘性质：normal × xAxis 得到的向量既垂直于xAxis，又位于平面内（垂直于法向量）
    const correctedYAxis = Cesium.Cartesian3.cross(normal, xAxis, new Cesium.Cartesian3());
    Cesium.Cartesian3.normalize(correctedYAxis, correctedYAxis); // 归一化修正后的Y轴

    // 4. 计算平面的实际宽度和高度（物理长度，单位：米）
    const xLength = Cesium.Cartesian3.magnitude(xAxis); // X方向总长度（p0到p3的直线距离）
    const yLength = Cesium.Cartesian3.distance(p0, p1); // 初始Y方向距离（p0到p1的直线距离）

    // 修正Y方向长度：计算平面内垂直于X轴的实际高度
    // 原理：通过初始Y轴与修正后Y轴的夹角，计算垂直分量（投影长度）
    const correctedYLength = yLength * Math.cos(
        Cesium.Cartesian3.angleBetween(yAxis, correctedYAxis) // 计算两向量夹角（弧度）
    );

    // 5. 根据百分比计算X和Y方向的偏移向量
    // X方向偏移：归一化X轴后乘以总宽度×百分比（确保方向正确且长度成比例）
    const xOffset = Cesium.Cartesian3.multiplyByScalar(
        Cesium.Cartesian3.normalize(xAxis, new Cesium.Cartesian3()), // X轴单位向量
        xLength * xPercent, // 偏移长度 = 总宽度 × X百分比
        new Cesium.Cartesian3() // 存储结果的向量
    );

    // Y方向偏移：使用修正后的Y轴（已归一化）乘以修正后总高度×百分比
    const yOffset = Cesium.Cartesian3.multiplyByScalar(
        correctedYAxis, // 修正后的Y轴单位向量（确保垂直于X轴）
        correctedYLength * yPercent, // 偏移长度 = 修正后总高度 × Y百分比
        new Cesium.Cartesian3() // 存储结果的向量
    );

    // 6. 计算目标点的世界坐标（笛卡尔坐标）
    // 公式：目标点 = 原点 + X偏移 + Y偏移
    const targetWorldPos = Cesium.Cartesian3.add(
        origin, // 局部坐标系原点（p0）
        Cesium.Cartesian3.add(xOffset, yOffset, new Cesium.Cartesian3()), // X+Y总偏移
        new Cesium.Cartesian3() // 存储最终世界坐标
    );

    // 7. 将世界坐标转换为经纬度和高度（地理坐标）
    const cartographic = Cesium.Cartographic.fromCartesian(targetWorldPos); // 笛卡尔坐标 -> 弧度坐标
    return [
        Cesium.Math.toDegrees(cartographic.longitude), // 经度（弧度转度）
        Cesium.Math.toDegrees(cartographic.latitude),  // 纬度（弧度转度）
        cartographic.height                            // 高度（米）
    ];
};




/**
 * 根据起点和远平面点计算与地面的交点坐标
 * 功能：从起点向远平面点发射射线，检测射线与地形（地面）的交点，返回交点的经纬度和高度；若无交点则返回null
 * @param {Array} origin - 起点的经纬度高度数组 [经度(度), 纬度(度), 高度(米)]
 * @param {Array} farPlanePoint - 远平面点的经纬度高度数组 [经度(度), 纬度(度), 高度(米)]
 * @returns {Array|null} 地面交点坐标 [经度(度), 纬度(度), 高度(米)]，无交点时返回null
 */
const calculateGroundIntersection1 = (origin, farPlanePoint) => {
    // 将起点的经纬度高度转换为Cesium世界坐标（Cartesian3）
    const originCartesian = Cesium.Cartesian3.fromDegrees(
        Number(origin[0]),    // 起点经度（度）
        Number(origin[1]),    // 起点纬度（度）
        Number(origin[2])  // 起点高度（米）
    );

    // 将远平面点的经纬度高度转换为Cesium世界坐标（Cartesian3）
    // 注：若高度未提供，默认使用0米
    const farPointCartesian = Cesium.Cartesian3.fromDegrees(
        Number(farPlanePoint[0]),  // 远平面点经度（度）
        Number(farPlanePoint[1]),  // 远平面点纬度（度）
        Number(farPlanePoint[2])  // 远平面点高度（米）
    );

    // 计算从起点指向远平面点的方向向量
    // 用远平面点坐标减去起点坐标，得到射线方向
    const direction = Cesium.Cartesian3.subtract(
        farPointCartesian,
        originCartesian,
        new Cesium.Cartesian3()
    );

    // 构造射线（起点：原点世界坐标，方向：上述向量）
    const ray = new Cesium.Ray(originCartesian, direction);
    const intersectionCartesian = viewer.scene.globe.pick(ray, viewer.scene);
    if (intersectionCartesian) {
        // 有交点：将世界坐标转回经纬度
        const cartographic = Cesium.Cartographic.fromCartesian(intersectionCartesian);
        return [
            Cesium.Math.toDegrees(cartographic.longitude),  // 经度（度）
            Cesium.Math.toDegrees(cartographic.latitude),   // 纬度（度）
            cartographic.height                             // 高度（米）
        ];
    }

    // 若无交点：返回null
    return null;
};



const getTerrainIntersection = (origin, farPoint) => {
    const originCartesian = Cesium.Cartesian3.fromDegrees(
        Number(origin[0]),    // 原点经度（度）
        Number(origin[1]),    // 原点纬度（度）
        Number(origin[2]) || 0  // 原点高度（默认0米）
    );

    // 当前远平面顶点经纬度转世界坐标
    const farPointCartesian = Cesium.Cartesian3.fromDegrees(
        Number(farPoint[0]),  // 顶点经度（度）
        Number(farPoint[1]),  // 顶点纬度（度）
        Number(farPoint[2]) || 0  // 顶点高度（默认0米）
    );
    // 方向向量：从原点指向远平面顶点的世界坐标向量
    const direction = Cesium.Cartesian3.subtract(
        farPointCartesian,
        originCartesian,
        new Cesium.Cartesian3()
    );
    // 构造射线（起点：原点世界坐标，方向：上述向量）
    const ray = new Cesium.Ray(originCartesian, direction);
    const intersectionCartesian = viewer.scene.globe.pick(ray, viewer.scene);
    let result;
    if (intersectionCartesian) {
        // 有交点：将世界坐标转回经纬度
        const cartographic = Cesium.Cartographic.fromCartesian(intersectionCartesian);
        return [
            Cesium.Math.toDegrees(cartographic.longitude),  // 经度（度）
            Cesium.Math.toDegrees(cartographic.latitude),   // 纬度（度）
            cartographic.height                             // 高度（米）
        ];
    }
    return null
}


const getLonLatFromVideoPercent = (xPercent, yPercent) => {
    const farPlane = 100
    const { longitude, latitude, height, fov, aspectRatio, heading, pitch, roll } = props.droneInfo
    // 计算当前无人机视角的远平面
    const frustumFarPlaneCoordinates = calculateFarPlanePoints([longitude, latitude, height], fov, aspectRatio, farPlane, heading, pitch, roll)

    // frustumFarPlaneCoordinates.forEach(addPoint)
    // 当前点在远平面上的坐标
    const currentPointOnFarPlaneCoordinates = getPointByPercentage(frustumFarPlaneCoordinates, xPercent, yPercent)
    addPoint(currentPointOnFarPlaneCoordinates)

    // 当前点在地面上的坐标
    const currentPointOnGroundCoordinates = calculateGroundIntersection(viewer, [longitude, latitude, height], currentPointOnFarPlaneCoordinates)

    if (currentPointOnGroundCoordinates) addPoint(currentPointOnGroundCoordinates)
    return currentPointOnGroundCoordinates
}


defineExpose({ fn: getLonLatFromVideoPercent })
</script>

<style scoped></style>