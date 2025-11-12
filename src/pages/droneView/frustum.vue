<template>
    <!-- <div></div> -->
</template>

<script setup>
import { computed, onMounted } from 'vue'
const props = defineProps({
    viewer: Object,
    position: Array,
    heading: Number,    // 偏航角(度)
    pitch: Number,  // 俯仰角(度)
    fov: Number,    // 视场角(度)
    aspectRatio: Number,    // 宽高比
    near: {
        type: Number,
        default: 10
    },   // 近裁剪面距离
    far: {
        type: Number,
        default: 100
    },   // 远裁剪面距离
    color: {
        type: String,
        default: '#cccccc50'
    }
})

const CartesianPosition = computed(() => Cesium.Cartesian3.fromDegrees(...props.position))
const color = computed(() => Cesium.Color.fromCssColorString(props.color))



/**
 * 将大疆设备的角度（偏航角、俯仰角）转换为Cesium的HeadingPitchRoll对象
 * @param {number} yaw - 大疆设备的偏航角（单位：度）
 * @param {number} pitch - 大疆设备的俯仰角（单位：度）
 * @returns {Cesium.HeadingPitchRoll} Cesium坐标系下的航向-俯仰-翻滚角对象
 */
const convertDjiToCesiumAngles = (yaw, pitch) => {
    // 转换偏航角：大疆与Cesium坐标系偏航角基准不同，需加90度补偿，再转为弧度
    const radYaw = Cesium.Math.toRadians(90 + yaw);
    // 转换俯仰角：大疆与Cesium俯仰角方向相反，取负值后转为弧度
    const radPitch = -Cesium.Math.toRadians(pitch);
    // 翻滚角(roll)默认为0，创建并返回HeadingPitchRoll对象
    return new Cesium.HeadingPitchRoll(radYaw, radPitch, 0);
};

/**
 * 将大疆设备的角度参数转换为Cesium可用的四元数方向
 * 用于将大疆设备的姿态（偏航角、俯仰角等）正确映射到Cesium场景中
 * @param {Cesium.Cartesian3} position - 位置坐标（世界坐标系）
 * @param {number} yaw - 大疆设备的偏航角（单位：度）
 * @param {number} [pitch=0] - 大疆设备的俯仰角（单位：度），默认0
 * @param {number} [gimbalRoll=0] - 云台翻滚角（单位：度），默认0（当前实现未使用）
 * @returns {Cesium.Quaternion} 转换后的四元数，代表Cesium中的方向
 */
const getCesiumHPRFromDjiSpecifications = (position, yaw, pitch = 0, gimbalRoll = 0) => {
    // 1. 将大疆的偏航角和俯仰角转换为Cesium的HeadingPitchRoll对象
    const orientation = convertDjiToCesiumAngles(yaw, pitch);

    // 2. 将HeadingPitchRoll转换为四元数（基于指定位置的局部坐标系）
    const orientationHPR = Cesium.Transforms.headingPitchRollQuaternion(position, orientation);

    // 3. 创建方向修正四元数：绕Y轴（北方向）旋转-90度（-π/2弧度）
    // 作用：修正大疆与Cesium的前向方向差异，将默认前向从-Z轴（下）转向+Y轴（北）
    const correctionQuaternion = Cesium.Quaternion.fromAxisAngle(
        Cesium.Cartesian3.UNIT_Y, // 旋转轴：Y轴（北方向）
        -Cesium.Math.PI_OVER_TWO // 旋转角度：-90度（转为弧度）
    );

    // 4. 组合旋转四元数：先应用修正旋转，再应用设备姿态旋转
    // 四元数乘法顺序注意：结果 = 姿态旋转 * 修正旋转（实际执行顺序相反）
    return Cesium.Quaternion.multiply(orientationHPR, correctionQuaternion, new Cesium.Quaternion());
};



const createFrustum = () => {
    const frustum = new Cesium.PerspectiveFrustum({
        fov: new Cesium.CallbackProperty(() => {
            // 每次调用时返回最新的 fov（度转弧度）
            return Cesium.Math.toRadians(props.fov);
        }, false), // 视场角转换为弧度
        aspectRatio: props.aspectRatio,       // 宽高比
        near: props.near,                     // 近裁剪面
        far: props.far                        // 远裁剪面
    });
    // 创建视锥体几何
    const frustumGeometry = new Cesium.FrustumGeometry({
        frustum: frustum,
        origin: new Cesium.CallbackProperty(() => {
            // 每次回调返回最新的位置（this._position 应为 Cesium.Cartesian3 类型）
            return CartesianPosition.value;
        }, false),
        // 从无人机参数获取Cesium的航向-俯仰-翻滚角
        // 动态更新方向（四元数 Quaternion）
        orientation: new Cesium.CallbackProperty(() => {
            // 每次回调通过设备参数计算最新的方向四元数
            return getCesiumHPRFromDjiSpecifications(
                CartesianPosition.value, // 最新位置
                props.heading,      // 最新偏航角
                props.pitch,    // 最新俯仰角
                0 // 最新翻滚角（若需要）
            );
        }, false), // isConstant: false（方向会动态变化）
        vertexFormat: Cesium.VertexFormat.POSITION_ONLY // 只需要位置信息
    });

    // 创建几何实例
    const frustumGeometryInstance = new Cesium.GeometryInstance({
        geometry: frustumGeometry,
        attributes: {
            color: Cesium.ColorGeometryInstanceAttribute.fromColor(color.value)
        },
    });

    // 创建并添加primitive
    const frustumPrimitive = props.viewer.scene.primitives.add(
        new Cesium.Primitive({
            geometryInstances: [frustumGeometryInstance],
            appearance: new Cesium.PerInstanceColorAppearance({
                closed: false,
                flat: true
            }),
            asynchronous: false // 同步加载，立即显示
        })
    );

    console.log('frustumPrimitive', frustumPrimitive)
}

onMounted(() => {
    createFrustum()
})

</script>