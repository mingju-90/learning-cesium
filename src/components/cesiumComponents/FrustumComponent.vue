<!-- Frustum.vue -->
<template>
  <div></div>
</template>

<script setup>
import { onMounted, onUnmounted, inject } from 'vue';
import * as Cesium from 'cesium';
import * as dat from 'dat.gui';

// 获取注入的 Cesium Viewer
const viewer = inject('viewer');

// 定义 props
const props = defineProps({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  z: { type: Number, required: true },
  heading: { type: Number, default: 0 },
  pitch: { type: Number, default: 180 },
  roll: { type: Number, default: 0 },
  fov: { type: Number, default: 30 },
  near: { type: Number, default: 10 },
  far: { type: Number, default: 3000 },
  aspectRatio: { type: Number, default: 1.4 }
});

let frustumEntity = null;
let gui;

// 格式化坐标为经纬高
const formatPosition = position => {
  const carto = Cesium.Cartographic.fromCartesian(position);
  return {
    x: Number(Cesium.Math.toDegrees(carto.longitude).toFixed(6)),
    y: Number(Cesium.Math.toDegrees(carto.latitude).toFixed(6)),
    z: Number(carto.height.toFixed(1))
  };
};

function initFrustum() {
  if (!viewer?.value) {
    console.error('Cesium Viewer is not available');
    return;
  }

  const position = Cesium.Cartesian3.fromDegrees(props.x, props.y, props.z);
  const hpr = new Cesium.HeadingPitchRoll(
    Cesium.Math.toRadians(props.heading),
    Cesium.Math.toRadians(props.pitch),
    Cesium.Math.toRadians(props.roll)
  );
  const orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);

  addFrustum(position, orientation, props.fov, props.near, props.far, props.aspectRatio);
}

function updateFrustum() {
  if (frustumEntity) {
    viewer.value.entities.remove(frustumEntity);
  }

  const position = Cesium.Cartesian3.fromDegrees(props.x, props.y, props.z);
  const hpr = new Cesium.HeadingPitchRoll(
    Cesium.Math.toRadians(props.heading),
    Cesium.Math.toRadians(props.pitch),
    Cesium.Math.toRadians(props.roll)
  );
  const orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);

  addFrustum(position, orientation, props.fov, props.near, props.far, props.aspectRatio);
}

function addFrustum(position, orientation, fov, near, far, aspectRatio) {
  const halfFov = Cesium.Math.toRadians(fov) / 2;
  const halfWidth = Math.tan(halfFov) * far;
  const halfHeight = halfWidth / aspectRatio;

  // 定义远截面四个角点（本地坐标）
  const corners = [
    new Cesium.Cartesian3(-halfWidth, -halfHeight, far),
    new Cesium.Cartesian3(halfWidth, -halfHeight, far),
    new Cesium.Cartesian3(halfWidth, halfHeight, far),
    new Cesium.Cartesian3(-halfWidth, halfHeight, far),
    new Cesium.Cartesian3(-halfWidth, -halfHeight, far) // 闭合
  ];

  // 转换为世界坐标
  const matrix = Cesium.Matrix4.fromRotationTranslation(
    Cesium.Matrix3.fromQuaternion(orientation),
    position
  );
  const worldCorners = corners.map(corner =>
    Cesium.Matrix4.multiplyByPoint(matrix, corner, new Cesium.Cartesian3())
  );

  // 创建视锥体轮廓（polyline 实体）
  frustumEntity = viewer.value.entities.add({
    name: 'frustumOutline',
    polyline: {
      positions: worldCorners,
      width: 2,
      material: Cesium.Color.WHITE
    }
  });

  // 输出顶点坐标
  const result = worldCorners.map(position => formatPosition(position));
  console.log('视锥体顶点坐标：', result);

  viewer.value.scene.requestRender();
}

onMounted(() => {
  if (!viewer?.value) {
    console.error('Cesium Viewer is not available');
    return;
  }

  // 调试 Viewer 状态
  console.log('Viewer:', viewer.value);
  console.log('Canvas:', viewer.value.scene.canvas);
  console.log('WebGL Context:', viewer.value.scene.canvas.getContext('webgl'));

  // 初始化 GUI 控制面板
  gui = new dat.GUI();
  gui.domElement.style = 'position:absolute;top:10px;left:10px;';

  // 添加控制参数
  gui.add(props, 'x', -180, 180).name('经度').onChange(updateFrustum);
  gui.add(props, 'y', -90, 90).name('纬度').onChange(updateFrustum);
  gui.add(props, 'z', 100, 10000).name('高度').onChange(updateFrustum);
  gui.add(props, 'heading', 0, 360).name('偏航角').onChange(updateFrustum);
  gui.add(props, 'pitch', 0, 360).name('俯仰角').onChange(updateFrustum);
  gui.add(props, 'roll', 0, 360).name('翻滚角').onChange(updateFrustum);
  gui.add(props, 'fov', 0, 180).name('视场角').onChange(updateFrustum);
  gui.add(props, 'near', 0, 1000).name('近距').onChange(updateFrustum);
  gui.add(props, 'far', 0, 5000).name('远距').onChange(updateFrustum);
  gui.add(props, 'aspectRatio', 0.1, 3).name('宽高比').onChange(updateFrustum);

  initFrustum();
});

onUnmounted(() => {
  if (frustumEntity && viewer?.value) {
    viewer.value.entities.remove(frustumEntity);
  }
  if (gui) {
    gui.destroy();
  }
  viewer.value?.scene.requestRender();
});
</script>