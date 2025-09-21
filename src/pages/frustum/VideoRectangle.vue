<!-- VideoRectangle.vue -->
<template>
    <div>
        <video :id="videoId" style="display: none;" :src="videoSrc" muted autoplay loop ref="videoRef"
            crossorigin="anonymous" @timeupdate="handleTimeUpdate" @loadedmetadata="handleLoadedMetadata"
            @ended="handleVideoEnded">
        </video>
    </div>
</template>

<script setup>
import { onMounted, onUnmounted, inject, computed, ref, watch } from 'vue';
import * as Cesium from 'cesium';

const viewer = inject('viewer');
const emits = defineEmits(['close', 'update:currentTime', 'update:duration', 'end'])

const props = defineProps({
    videoSrc: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    z: { type: Number, required: true },
    heading: { type: Number, default: 0 },
    pitch: { type: Number, default: 180 },
    roll: { type: Number, default: 0 },
    fov: { type: Number, default: 30 },
    near: { type: Number, default: 10 },
    far: { type: Number, default: 3000 },
    aspectRatio: { type: Number, default: 1.4 },
    currentTime: Number
});

const videoRef = ref();
const videoId = computed(() => `video_${Math.random().toString(36).substr(2, 9)}`);


const handleTimeUpdate = () => {
  if (!videoRef.value) return
  emits('update:currentTime', Math.round(videoRef.value.currentTime))
}


let rectangleEntity = null;
let outlineEntities = [];

// 使用CallbackProperty计算矩形顶点
const computeRectangleHierarchy = () => {
    const position = Cesium.Cartesian3.fromDegrees(props.x, props.y, props.z);
    const hpr = new Cesium.HeadingPitchRoll(
        Cesium.Math.toRadians(props.heading),
        Cesium.Math.toRadians(props.pitch),
        Cesium.Math.toRadians(props.roll)
    );

    const halfFov = Cesium.Math.toRadians(props.fov) / 2;
    const halfWidth = Math.tan(halfFov) * props.far;
    const halfHeight = halfWidth / props.aspectRatio;

    const corners = [
        new Cesium.Cartesian3(-halfWidth, -halfHeight, props.far),
        new Cesium.Cartesian3(halfWidth, -halfHeight, props.far),
        new Cesium.Cartesian3(halfWidth, halfHeight, props.far),
        new Cesium.Cartesian3(-halfWidth, halfHeight, props.far)
    ];

    const matrix = Cesium.Matrix4.fromRotationTranslation(
        Cesium.Matrix3.fromQuaternion(
            Cesium.Transforms.headingPitchRollQuaternion(position, hpr)
        ),
        position
    );

    const worldCorners = corners.map(corner =>
        Cesium.Matrix4.multiplyByPoint(matrix, corner, new Cesium.Cartesian3())
    );

    return new Cesium.PolygonHierarchy(worldCorners);
};

// 使用CallbackProperty计算轮廓线位置
const computeOutlinePositions = (index) => {
    const position = Cesium.Cartesian3.fromDegrees(props.x, props.y, props.z);
    const hpr = new Cesium.HeadingPitchRoll(
        Cesium.Math.toRadians(props.heading),
        Cesium.Math.toRadians(props.pitch),
        Cesium.Math.toRadians(props.roll)
    );

    const halfFov = Cesium.Math.toRadians(props.fov) / 2;
    const halfWidth = Math.tan(halfFov) * props.far;
    const halfHeight = halfWidth / props.aspectRatio;

    const corners = [
        new Cesium.Cartesian3(-halfWidth, -halfHeight, props.far),
        new Cesium.Cartesian3(halfWidth, -halfHeight, props.far),
        new Cesium.Cartesian3(halfWidth, halfHeight, props.far),
        new Cesium.Cartesian3(-halfWidth, halfHeight, props.far)
    ];

    const matrix = Cesium.Matrix4.fromRotationTranslation(
        Cesium.Matrix3.fromQuaternion(
            Cesium.Transforms.headingPitchRollQuaternion(position, hpr)
        ),
        position
    );

    const worldCorners = corners.map(corner =>
        Cesium.Matrix4.multiplyByPoint(matrix, corner, new Cesium.Cartesian3())
    );

    if (index < 4) {
        return [position, worldCorners[index]];
    } else {
        return [...worldCorners, worldCorners[0]];
    }
};

// 初始化矩形和轮廓线
const addRectangle = () => {
    if (!viewer?.value) {
        console.error('Cesium Viewer is not available');
        return;
    }

    // 获取视频元素
    const videoElement = document.getElementById(videoId.value);
    if (!videoElement) {
        console.error('Video element not found:', videoId.value);
        return;
    }

    // 创建矩形实体（使用CallbackProperty）
    rectangleEntity = viewer.value.entities.add({
        name: 'videoRectangle',
        polygon: {
            hierarchy: new Cesium.CallbackProperty(computeRectangleHierarchy, false),
            material: videoElement,
            heightReference: Cesium.HeightReference.NONE,
            perPositionHeight: true
        }
    });

    // 创建视锥体轮廓线（使用CallbackProperty）
    outlineEntities = [];
    for (let i = 0; i < 4; i++) {
        outlineEntities.push(viewer.value.entities.add({
            name: `frustumOutline_${i}`,
            polyline: {
                positions: new Cesium.CallbackProperty(() => computeOutlinePositions(i), false),
                width: 2,
                material: Cesium.Color.WHITE
            }
        }));
    }

    // 创建矩形边界轮廓线（使用CallbackProperty）
    outlineEntities.push(viewer.value.entities.add({
        name: 'rectangleOutline',
        polyline: {
            positions: new Cesium.CallbackProperty(() => computeOutlinePositions(4), false),
            width: 2,
            material: Cesium.Color.WHITE
        }
    }));

    viewer.value.scene.requestRender();
};

// 清理实体
const cleanup = () => {
    if (viewer?.value) {
        if (rectangleEntity) {
            viewer.value.entities.remove(rectangleEntity);
            rectangleEntity = null;
        }
        if (outlineEntities.length > 0) {
            outlineEntities.forEach(entity => viewer.value.entities.remove(entity));
            outlineEntities = [];
        }
        viewer.value.scene.requestRender();
    }
};

// 监听视频源变化
watch(
    () => props.videoSrc,
    () => {
        const videoElement = document.getElementById(videoId.value);
        if (videoElement && rectangleEntity) {
            rectangleEntity.polygon.material = videoElement;
            videoRef.value?.play();
        }
    }
);

onMounted(() => {
    addRectangle();
    videoRef.value?.play();
    setTimeout(() => {
        videoRef.value.playbackRate= 8
    }, 500);
});

onUnmounted(() => {
    cleanup();
});
</script>