<!-- StatusBar.vue -->
<template>
  <div class="status-bar">
    <span>经度: {{ mouseCoords.longitude.toFixed(6) }}°</span>
    <span>纬度: {{ mouseCoords.latitude.toFixed(6) }}°</span>
    <span>高度: {{ mouseCoords.height.toFixed(2) }} m</span>
  </div>
</template>

<script setup>
import { inject, onMounted, onUnmounted, ref } from 'vue';
// import * as Cesium from 'cesium';

// 获取 Cesium Viewer 实例
const viewer = inject('viewer');

if (!viewer.value) {
  console.error('Cesium Viewer instance not provided');
}

// 存储鼠标坐标和比例尺
const mouseCoords = ref({
  longitude: 0,
  latitude: 0,
  height: 0,
});
const scale = ref(0);




// 鼠标移动事件处理
const handleMouseMove = (movement) => {
  if (!viewer.value || !movement.endPosition) return;

  const cartesian = viewer.value.camera.pickEllipsoid(movement.endPosition, viewer.value.scene.globe.ellipsoid);
  if (cartesian) {
    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    mouseCoords.value = {
      longitude: Cesium.Math.toDegrees(cartographic.longitude),
      latitude: Cesium.Math.toDegrees(cartographic.latitude),
      height: cartographic.height,
    };
  }
};



// 鼠标点击事件处理，记录点击坐标
const logClickCoords = (click) => {
  if (!viewer.value || !click.position) return;

  const cartesian = viewer.value.camera.pickEllipsoid(click.position, viewer.value.scene.globe.ellipsoid);
  if (cartesian) {
    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    const longitude = Cesium.Math.toDegrees(cartographic.longitude).toFixed(6);
    const latitude = Cesium.Math.toDegrees(cartographic.latitude).toFixed(6);
    const height = cartographic.height.toFixed(2);
    console.log(`[${longitude}, ${latitude}]`);
  } else {
    console.log('点击位置不在地球表面');
  }
};




// 初始化事件监听
onMounted(() => {
  if (!viewer.value) return;

  // 添加鼠标移动事件
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.value.scene.canvas);
  handler.setInputAction(handleMouseMove, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // 添加鼠标点击事件
  handler.setInputAction(logClickCoords, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  // 清理函数
  onUnmounted(() => {
    handler.destroy();
  });
});
</script>

<style scoped>
.status-bar {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  display: flex;
  gap: 20px;
  font-size: 14px;
}
</style>