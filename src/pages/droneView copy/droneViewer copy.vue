<template>
    <Viewer @ready="ready"></Viewer>
</template>

<script setup>
import { onMounted, watch, ref } from 'vue';
import Viewer from '../../components/cesiumComponents/viewer.vue';
import { CreateFrustum } from './createFrustum';
const props = defineProps({

})
let viewer


const ready = async (data) => {
    viewer = data.viewer

    const frustum = new CreateFrustum(viewer, {
        position: Cesium.Cartesian3.fromDegrees(120.279604894, 31.613370323, 139.387),
        fov: 47,
        yaw: -92.0,
        pitch: -55.0,
        aspectRatio: 3/4,
        roll: 0,
        near: 1,
        far: 50,
    })
    // 刷新场景（修改后需触发渲染更新）

    // const data1 = calculateFarPlanePoints({ lon: 120.279604894, lat: 31.613370323, alt: 139.387 }, 47, 4 / 3,  100, -91.8, -55.0 + 14.70, -2.1)
    // const data1 = calculateFarPlanePoints2({ lon: 120.279604894, lat: 31.613370323, alt: 139.387 }, 47, 4 / 3,  100, 0, 0, 0)
    // console.log(data1, data1)
    // const a =  viewer.entities.add({
    //     polyline: {
    //         positions: [...data1, data1[0]].map(coord => {
    //             const [lng, lat, height = 0] = coord; // 高度默认0
    //             return Cesium.Cartesian3.fromDegrees(Number(lng), Number(lat), Number(height));
    //         }), // 绑定回调属性
    //         width: 3,
    //         material: Cesium.Color.YELLOW,
    //         followSurface: false
    //     }
    // })
    addPoint({ longitude: 120.279604894, latitude: 31.613370323, height: 139.387 })
}

const addPoint = (val) => {
    const pointEntity = viewer.entities.add({
        // 位置：经度、纬度、高度（单位：度、度、米）
        // position: Cesium.Cartesian3.fromDegrees(
        //     120.279604894,  // 经度（对应之前无人机数据）
        //     31.613370323,   // 纬度
        //     20              // 高度（地面以上20米，可根据地形调整）
        // ),
        position: Cesium.Cartesian3.fromDegrees(val.longitude, val.latitude, val.height),
        // 点样式配置
        point: {
            pixelSize: 12,        // 点的像素大小（默认10）
            color: Cesium.Color.RED,  // 点的颜色（支持RGB、十六进制）
            outlineColor: Cesium.Color.WHITE,  // 点的轮廓颜色
            outlineWidth: 2,      // 轮廓宽度（像素）
            show: true,           // 是否显示（默认true）
            disableDepthTestDistance: Number.POSITIVE_INFINITY  // 始终显示在最上层（避免被地形遮挡）
        },
    });
    viewer.flyTo(pointEntity)
}


/**
 * 计算视锥体远平面的四个三维顶点（经纬度+高度格式）
 * @param {Object} cameraPos 相机三维位置 {lon, lat, alt}
 * @param {number} fov 水平视场角（度）
 * @param {number} aspectRatio 宽高比
 * @param {number} far 相机到远平面的直线距离（米）
 * @param {number} heading 航向角（度）
 * @param {number} pitch 俯仰角（度）
 * @param {number} roll 横滚角（度）
 * @returns {Array<Array<number>>} 远平面顶点数组 [[lon1, lat1, height1], [lon2, lat2, height2], ...]
 */
const calculateFarPlanePoints = (cameraPos, fov, aspectRatio, far, heading, pitch, roll) => {
    console.log(heading, pitch, roll)
    // 1. 相机三维位置：经纬度+高度 → 世界坐标（Cartesian3）
    const cameraWorldPos = Cesium.Cartesian3.fromDegrees(
        cameraPos.lon,
        cameraPos.lat,
        cameraPos.alt
    )
    // 2. 相机姿态：航向角/俯仰角/横滚角 → 旋转矩阵（三维朝向）
    const hpr = new Cesium.HeadingPitchRoll(
        Cesium.Math.toRadians(heading),
        Cesium.Math.toRadians(pitch),
        Cesium.Math.toRadians(roll)
    )
    const orientation = Cesium.Quaternion.fromHeadingPitchRoll(hpr)
    const rotationMatrix = Cesium.Matrix3.fromQuaternion(orientation)

    // 3. 视场角计算（透视原理）
    const fovRad = Cesium.Math.toRadians(fov)
    const halfHFov = fovRad / 2
    const halfVFov = Math.atan(Math.tan(halfHFov) / aspectRatio)

    // 4. 相机本地坐标系下的远平面三维顶点（X=右，Y=上，Z=前）
    const cameraLocalPoints = [
        [Math.tan(halfHFov) * far, Math.tan(halfVFov) * far, far], // 右上
        [-Math.tan(halfHFov) * far, Math.tan(halfVFov) * far, far], // 左上
        [-Math.tan(halfHFov) * far, -Math.tan(halfVFov) * far, far], // 左下
        [Math.tan(halfHFov) * far, -Math.tan(halfVFov) * far, far]  // 右下
    ]

    // 5. 本地三维坐标 → 世界三维坐标 → 经纬度+高度（核心转换）
    return cameraLocalPoints.map(localPoint => {
        // 本地向量 → 世界向量（应用相机姿态旋转）
        const localVector = new Cesium.Cartesian3(...localPoint)
        const worldVector = Cesium.Matrix3.multiplyByVector(
            rotationMatrix,
            localVector,
            new Cesium.Cartesian3()
        )

        // 世界向量 + 相机世界位置 = 远平面顶点世界坐标
        const pointWorldPos = Cesium.Cartesian3.add(
            cameraWorldPos,
            worldVector,
            new Cesium.Cartesian3()
        )

        // 世界坐标 → 经纬度+高度（Cartographic 包含弧度经纬度和高度）
        const cartographic = Cesium.Cartographic.fromCartesian(pointWorldPos)
        return [
            Cesium.Math.toDegrees(cartographic.longitude), // 经度（度）
            Cesium.Math.toDegrees(cartographic.latitude),  // 纬度（度）
            cartographic.height                            // 高度（米，WGS84大地高）
        ]
    })
}

const calculateFarPlanePoints2 = (cameraPos, fov, aspectRatio, far, heading, pitch, roll) => {
    // 1. 创建透视视锥体
    const frustum = new Cesium.PerspectiveFrustum({
        fov: Cesium.Math.toRadians(fov),
        aspectRatio: aspectRatio,
        near: 10,
        far: far
    });

    // 2. 计算相机位置和姿态
    const origin = Cesium.Cartesian3.fromDegrees(
        cameraPos.lon,
        cameraPos.lat,
        cameraPos.alt
    );
    const hpr = new Cesium.HeadingPitchRoll(
        // Cesium.Math.toRadians(heading),
        // Cesium.Math.toRadians(pitch),
        // Cesium.Math.toRadians(roll)
        Cesium.Math.toRadians(-91.8),
        Cesium.Math.toRadians(-55.0 + 14.70),
        Cesium.Math.toRadians(-2.1)
    );
    const orientation = Cesium.Quaternion.fromHeadingPitchRoll(hpr);

    // 3. 生成视锥体轮廓顶点（包含近/远平面共8个顶点）
    const geometry = Cesium.FrustumOutlineGeometry.createGeometry(
        new Cesium.FrustumOutlineGeometry({ frustum, origin, orientation })
    );
    const positions = geometry.attributes.position.values; // 扁平数组：[x1,y1,z1, x2,y2,z2, ...]

    // 4. 解析顶点为三维坐标（8个顶点，每3个值一组）
    const vertices = [];
    for (let i = 0; i < positions.length; i += 3) {
        vertices.push(new Cesium.Cartesian3(
            positions[i],
            positions[i + 1],
            positions[i + 2]
        ));
    }

    // 5. 筛选远平面顶点（视锥体中，后4个顶点为远平面，前4个为近平面）
    // 验证：计算顶点与相机的距离，远平面顶点距离≈far，近平面≈near
    const farPlaneVertices = vertices.filter(vertex => {
        const distance = Cesium.Cartesian3.distance(origin, vertex);
        // 允许一定误差（因视锥体顶点距离不完全等于far，受姿态影响）
        return distance > far // 误差范围10%
    });

    // 6. 转换远平面顶点为经纬度和高度
    return farPlaneVertices.map(vertex => {
        const cartographic = Cesium.Cartographic.fromCartesian(vertex);
        return [
            +Cesium.Math.toDegrees(cartographic.longitude).toFixed(8), // 经度
            +Cesium.Math.toDegrees(cartographic.latitude).toFixed(8),  // 纬度
            +cartographic.height.toFixed(2)                            // 高度
        ];
    });
}

const getPointByPercentage = (farPlane, xPercent, yPercent) => {
    if (farPlane.length !== 4) {
        throw new Error("远平面必须包含4个顶点");
    }

    // 1. 解析四个顶点的经纬度和高度（转为Cesium世界坐标）
    const [p0, p1, p2, p3] = farPlane.map(([lon, lat, height]) =>
        Cesium.Cartesian3.fromDegrees(lon, lat, height)
    );

    // 2. 确定局部坐标系
    const origin = p0; // 原点（第一个点）
    const xAxis = Cesium.Cartesian3.subtract(p1, p0, new Cesium.Cartesian3()); // X轴向量（p0到p1）
    const tempY = Cesium.Cartesian3.subtract(p2, p0, new Cesium.Cartesian3()); // 临时Y方向向量（p0到p2）

    // 3. 计算面的法向量（确保Y轴在面内）
    const normal = Cesium.Cartesian3.cross(xAxis, tempY, new Cesium.Cartesian3()); // 面的法向量
    Cesium.Cartesian3.normalize(normal, normal);

    // 4. 计算Y轴（与X轴垂直，且在面内）
    const yAxis = Cesium.Cartesian3.cross(normal, xAxis, new Cesium.Cartesian3()); // Y轴向量（与X轴垂直）
    Cesium.Cartesian3.normalize(yAxis, yAxis);

    // 5. 计算X、Y方向的实际长度（基于输入的面）
    const xLength = Cesium.Cartesian3.magnitude(xAxis); // X轴总长度（p0到p1的距离）
    const yLength = Cesium.Cartesian3.distance(p0, p2) * Math.sin(
        Math.PI / 2 - Cesium.Cartesian3.angleBetween(tempY, xAxis)
    ); // Y轴总长度（面内垂直于X轴的距离）

    // 6. 按百分比计算偏移量
    const xOffset = Cesium.Cartesian3.multiplyByScalar(
        Cesium.Cartesian3.normalize(xAxis, new Cesium.Cartesian3()),
        xLength * xPercent,
        new Cesium.Cartesian3()
    );
    const yOffset = Cesium.Cartesian3.multiplyByScalar(
        yAxis,
        yLength * yPercent,
        new Cesium.Cartesian3()
    );

    // 7. 计算目标点的世界坐标
    const targetWorldPos = Cesium.Cartesian3.add(
        origin,
        Cesium.Cartesian3.add(xOffset, yOffset, new Cesium.Cartesian3()),
        new Cesium.Cartesian3()
    );

    // 8. 转换为经纬度+高度
    const cartographic = Cesium.Cartographic.fromCartesian(targetWorldPos);
    return [
        Cesium.Math.toDegrees(cartographic.longitude),
        Cesium.Math.toDegrees(cartographic.latitude),
        cartographic.height
    ];
}

const getTerrainIntersection1 = (startPoint, wayPoint) => {
    const pointWorldPos = Cesium.Cartesian3.fromDegrees(wayPoint[0], wayPoint[1], wayPoint[2])
    const cameraWorldPos = Cesium.Cartesian3.fromDegrees(startPoint[0], startPoint[1], startPoint[2])
    const direction = Cesium.Cartesian3.subtract(cameraWorldPos, pointWorldPos, new Cesium.Cartesian3())
    const ray = new Cesium.Ray(cameraWorldPos, direction)
    const intersection = viewer.scene.globe.pick(ray, viewer.scene)
    // 2. 将交点的三维世界坐标转换为经纬度
    if (intersection) {
        // 将 Cartesian3 转换为 Cartographic（包含弧度经纬度和高度）
        const cartographic = Cesium.Cartographic.fromCartesian(intersection);

        // 转换为度分秒格式的经纬度
        const longitude = Cesium.Math.toDegrees(cartographic.longitude); // 经度（度）
        const latitude = Cesium.Math.toDegrees(cartographic.latitude);   // 纬度（度）
        const height = cartographic.height;                             // 高度（米，地形高程）

        console.log("交点经纬度：", [longitude, latitude, height]);
        // 输出示例：[120.2783, 31.6134, 152.8]（经度、纬度、地形高度）
    } else {
        console.log("射线未与地面相交");
    }
}
const getTerrainIntersection = (startCoord, passCoord, useTerrain = true) => {
    const [startLng, startLat, startHeight] = startCoord;
    const [passLng, passLat, passHeight] = passCoord;

    const startPos = Cesium.Cartesian3.fromDegrees(
        Number(startLng),
        Number(startLat),
        Number(startHeight) || 0
    );
    const passPos = Cesium.Cartesian3.fromDegrees(
        Number(passLng),
        Number(passLat),
        Number(passHeight) || 0
    );

    // 2. 计算射线方向（从起点指向途径点的单位向量）
    const direction = Cesium.Cartesian3.subtract(passPos, startPos, new Cesium.Cartesian3());
    Cesium.Cartesian3.normalize(direction, direction); // 归一化方向向量

    // 3. 创建射线（起点 + 方向）
    const ray = new Cesium.Ray(startPos, direction);

    // 4. 计算射线与地面的交点
    let intersection;
    if (useTerrain && viewer.terrainProvider) {
        // 与地形求交（需加载地形数据）
        intersection = viewer.scene.pickFromRay(ray, [viewer.terrainProvider]);
    } else {
        // 与椭球面求交（无地形时使用）
        const ellipsoid = Cesium.Ellipsoid.WGS84;
        const intersectionResult = ellipsoid.intersectRay(ray, new Cesium.Cartesian3());
        if (intersectionResult) {
            intersection = { position: intersectionResult };
        }
    }

    // 5. 转换交点为经纬度坐标
    if (intersection?.position) {
        const cartographic = Cesium.Cartographic.fromCartesian(intersection.position);
        return {
            longitude: +Cesium.Math.toDegrees(cartographic.longitude).toFixed(8),
            latitude: +Cesium.Math.toDegrees(cartographic.latitude).toFixed(8),
            height: +cartographic.height.toFixed(2) // 地形高度（或椭球面高度）
        };
    }

    console.warn('射线与地面无交点');
    return null;
}


const getLonLatFromVideoPercent = ({ u, v, droneData = {
    GPSLatitude: 31.613370323,    // 无人机纬度
    GPSLongitude: 120.279604894,  // 无人机经度
    AbsoluteAltitude: 139.387,    // 无人机绝对高度（米）
    GimbalYawDegree: -92.0,       // 云台偏航角（度）
    GimbalPitchDegree: -55.0,     // 云台俯仰角（度）
    FlightYawDegree: -91.8,       // 机身偏航角（度）
    FlightPitchDegree: 14.70,     // 机身俯仰角（度）
    FlightRollDegree: -2.1
}, fov = 47,                       // 核心调整：使用相机实际视角82°
    aspectRatio = 4 / 3,            // 核心调整：根据照片分辨率8064×6048计算（8064/6048=4/3）
    farPlane = 100                   // 远平面默认50米
}) => {
    const data = calculateFarPlanePoints(
        { lon: droneData.GPSLongitude, lat: droneData.GPSLatitude, alt: droneData.AbsoluteAltitude },
        fov,
        aspectRatio,
        farPlane,
        0,
        0,
        0,
        // droneData.GimbalYawDegree,
        droneData.FlightPitchDegree + droneData.GimbalPitchDegree,
        droneData.FlightRollDegree
    )
    console.log('data', data)
    viewer.entities.add({
        polyline: {
            positions: [...data, data[0]].map(coord => {
                const [lng, lat, height = 0] = coord; // 高度默认0
                return Cesium.Cartesian3.fromDegrees(Number(lng), Number(lat), Number(height));
            }), // 绑定回调属性
            width: 3,
            material: Cesium.Color.YELLOW,
            followSurface: false
        }
    })
    addPoint({ longitude: droneData.GPSLongitude, latitude: droneData.GPSLatitude, height: droneData.AbsoluteAltitude })
    const point = getPointByPercentage(data, u, v)
    const point1 = getTerrainIntersection([droneData.GPSLongitude, droneData.GPSLatitude, droneData.AbsoluteAltitude], point)
    console.log('data', point1)
    point1 && addPoint(point1)
    return point
}

defineExpose({ fn: getLonLatFromVideoPercent })
</script>

<style scoped></style>