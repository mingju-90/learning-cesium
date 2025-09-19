<template>
  <div class="frustum-container">
    <Viewer @ready="ready">
      <VideoRectangle v-bind="obj" videoSrc="/login.mp4"/>
    </Viewer>
  </div>
</template>

<script setup>
// 页面逻辑
import { onMounted } from 'vue';
import Viewer from '../../components/cesiumComponents/viewer.vue';
import FrustumComponent from '../../components/cesiumComponents/FrustumComponent.vue';
import { setCenter } from '../../utils/cesiumUtils';
import VideoRectangle from './VideoRectangle.vue';



// 初始化参数
const obj = {
  x: 120,
  y: 30,
  z: 2000,
  heading: 0,
  pitch: 180,
  roll: 0,
  fov: 30,
  near: 10,
  far: 1000,
  aspectRatio: 1.4,
};

const ready = ({viewer}) => {
  setCenter(viewer, {longitude: obj.x, latitude: obj.y})
}

onMounted(() => {
  console.log('frustum 页面加载完成');
});
</script>

<style scoped lang="scss">
.frustum-container {
  padding: var(--spacing-base);
  height: 100%;
}
</style>