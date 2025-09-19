<!-- VideoRectangle.vue -->
<template>
  <div>
    <video
      :id="videoId"
      style="display: none;"
      :src="videoSrc"
      muted
      autoplay
      loop
      ref="videoRef"
      crossorigin="anonymous"
    >
      <source :src="videoSrc" type="video/mp4" />
    </video>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, inject, computed, ref, watch } from 'vue';
import * as Cesium from 'cesium';

// 获取注入的 Cesium Viewer
const viewer = inject('viewer');

// 定义 props
const props = defineProps({
  videoSrc: { type: String, required: true }, // 视频 URL
  x: { type: Number, required: true }, // 矩形中心经度
  y: { type: Number, required: true }, // 矩形中心纬度
  z: { type: Number, required: true }, // 矩形中心高度
  heading: { type: Number, default: 0 }, // 偏航角（度）
  pitch: { type: Number, default: 180 }, // 俯仰角（度）
  roll: { type: Number, default: 0 }, // 翻滚角（度）
  fov: { type: Number, default: 30 }, // 视场角（度）
  near: { type: Number, default: 10 }, // 近裁剪面（米，未使用）
  far: { type: Number, default: 3000 }, // 远裁剪面（米）
  aspectRatio: { type: Number, default: 1.4 } // 宽高比
});

// 视频元素引用
const videoRef = ref();

// 生成唯一的视频元素 ID
const videoId = computed(() => `video_${Math.random().toString(36).substr(2, 9)}`);

let rectangleEntity = null;
let outlineEntities = []; // 定义 outlineEntities 数组

// 格式化坐标为经纬高
const formatPosition = position => {
  const carto = Cesium.Cartographic.fromCartesian(position);
  return {
    x: Number(Cesium.Math.toDegrees(carto.longitude).toFixed(6)),
    y: Number(Cesium.Math.toDegrees(carto.latitude).toFixed(6)),
    z: Number(carto.height.toFixed(1))
  };
};

// 计算矩形顶点和轮廓线的公共函数
const computeGeometry = () => {
  const position = Cesium.Cartesian3.fromDegrees(props.x, props.y, props.z);
  const hpr = new Cesium.HeadingPitchRoll(
    Cesium.Math.toRadians(props.heading),
    Cesium.Math.toRadians(props.pitch),
    Cesium.Math.toRadians(props.roll)
  );
  const orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);

  // 计算矩形尺寸（基于 fov, far, aspectRatio）
  const halfFov = Cesium.Math.toRadians(props.fov) / 2;
  const halfWidth = Math.tan(halfFov) * props.far;
  const halfHeight = halfWidth / props.aspectRatio;

  // 定义矩形四个角点（本地坐标）
  const corners = [
    new Cesium.Cartesian3(-halfWidth, -halfHeight, props.far),
    new Cesium.Cartesian3(halfWidth, -halfHeight, props.far),
    new Cesium.Cartesian3(halfWidth, halfHeight, props.far),
    new Cesium.Cartesian3(-halfWidth, halfHeight, props.far)
  ];

  // 转换为世界坐标
  const matrix = Cesium.Matrix4.fromRotationTranslation(
    Cesium.Matrix3.fromQuaternion(orientation),
    position
  );
  const worldCorners = corners.map(corner =>
    Cesium.Matrix4.multiplyByPoint(matrix, corner, new Cesium.Cartesian3())
  );

  return { position, worldCorners };
};

// 初始化矩形和轮廓线
function addRectangle() {
  if (!viewer?.value) {
    console.error('Cesium Viewer is not available');
    return;
  }

  // 清理现有实体
  if (rectangleEntity) {
    viewer.value.entities.remove(rectangleEntity);
  }
  if (outlineEntities.length > 0) {
    outlineEntities.forEach(entity => viewer.value.entities.remove(entity));
    outlineEntities = [];
  }

  // 计算几何
  const { position, worldCorners } = computeGeometry();

  // 获取视频元素
  const videoElement = document.getElementById(videoId.value);
  if (!videoElement) {
    console.error('Video element not found:', videoId.value);
    return;
  }

  // 创建矩形（polygon 实体）
  rectangleEntity = viewer.value.entities.add({
    name: 'videoRectangle',
    polygon: {
      hierarchy: new Cesium.PolygonHierarchy(worldCorners),
      material: videoElement,
      heightReference: Cesium.HeightReference.NONE,
      perPositionHeight: true
    }
  });

  // 创建视锥体轮廓线（从 x, y, z 到每个角点的 polyline 实体）
  outlineEntities = worldCorners.map((corner, index) =>
    viewer.value.entities.add({
      name: `frustumOutline_${index}`,
      polyline: {
        positions: [position, corner], // 从中心点到角点
        width: 2,
        material: Cesium.Color.WHITE
      }
    })
  );

  // 创建矩形边界轮廓线（polyline 实体，闭合）
  outlineEntities.push(
    viewer.value.entities.add({
      name: 'rectangleOutline',
      polyline: {
        positions: [...worldCorners, worldCorners[0]], // 闭合矩形
        width: 2,
        material: Cesium.Color.WHITE
      }
    })
  );

  // 输出顶点坐标
  const result = worldCorners.map(position => formatPosition(position));
  console.log('矩形顶点坐标：', result);

  viewer.value.scene.requestRender();
}

// 更新矩形和轮廓线的函数
function updateRectangle() {
  if (!viewer?.value || !rectangleEntity || outlineEntities.length === 0) {
    // 如果实体不存在，重新创建
    addRectangle();
    return;
  }

  // 计算新几何
  const { position, worldCorners } = computeGeometry();

  // 更新矩形（polygon 实体）
  rectangleEntity.polygon.hierarchy = new Cesium.PolygonHierarchy(worldCorners);

  // 更新视锥体轮廓线（从 x, y, z 到每个角点）
  outlineEntities.forEach((entity, index) => {
    if (index < 4) {
      // 前四个是视锥体轮廓线
      entity.polyline.positions = [position, worldCorners[index]];
    } else {
      // 最后一个是矩形边界轮廓线
      entity.polyline.positions = [...worldCorners, worldCorners[0]];
    }
  });

  // 输出顶点坐标
  const result = worldCorners.map(position => formatPosition(position));
  console.log('矩形顶点坐标（更新）：', result);

  viewer.value.scene.requestRender();
}

// 监听 props 变化
watch(
  () => [props.x, props.y, props.z, props.heading, props.pitch, props.roll, props.fov, props.far, props.aspectRatio],
  () => {
    updateRectangle();
  },
  { deep: true }
);

// 单独监听 videoSrc 变化
watch(
  () => props.videoSrc,
  () => {
    const videoElement = document.getElementById(videoId.value);
    if (!videoElement) {
      console.error('Video element not found:', videoId.value);
      return;
    }
    if (rectangleEntity) {
      rectangleEntity.polygon.material = videoElement;
    }
    videoRef.value?.play();
    viewer.value?.scene.requestRender();
  }
);

onMounted(() => {
  if (!viewer?.value) {
    console.error('Cesium Viewer is not available');
    return;
  }

  // 调试 Viewer 状态
  console.log('Viewer:', viewer.value);
  console.log('Canvas:', viewer.value.scene.canvas);
  console.log('WebGL Context:', viewer.value.scene.canvas.getContext('webgl'));

  addRectangle();
  videoRef.value?.play();
});

onUnmounted(() => {
  if (rectangleEntity && viewer?.value) {
    viewer.value.entities.remove(rectangleEntity);
  }
  if (outlineEntities.length > 0 && viewer?.value) {
    outlineEntities.forEach(entity => viewer.value.entities.remove(entity));
  }
  viewer.value?.scene.requestRender();
});
</script>