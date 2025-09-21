<template>
  <div class="frustum-container">
    <Viewer @ready="ready">
      <VideoRectangle v-bind="obj" videoSrc="/历史视频.mp4" v-model:currentTime="currentTime"/>
      <Drone :value="lastPoint"/>
    </Viewer>
  </div>
</template>

<script setup>
// 页面逻辑
import { onMounted, ref, computed } from 'vue';
import Viewer from '../../components/cesiumComponents/viewer.vue';
import FrustumComponent from '../../components/cesiumComponents/FrustumComponent.vue';
import { setCenter } from '../../utils/cesiumUtils';
import VideoRectangle from './VideoRectangle.vue';
import data from './data.json'
import Drone from './drone.vue';


const currentTime = ref(0)

function extractViewFrustumParams(droneData) {
  if(!droneData) return null
  // 使用云台俯仰角来计算更准确的视锥体
  const gimbalPitch = droneData.gimbalPitch || 0; // 云台俯仰角（度）
  
  // 计算动态far值 - 基于高度和云台俯仰角
  // 当云台朝下时，far值较小；朝上时，far值较大
  const pitchRad = Cesium.Math.toRadians(gimbalPitch) + 180;
  const result = {
    x: droneData.longitude,       // 经度直接使用
    y: droneData.latitude,        // 纬度直接使用
    z: droneData.altitude,   // 将原始高度放大20倍作为示例
    heading: -droneData.droneYaw + 180, // 偏航角取反（无人机yaw与Cesium坐标系相反）
    pitch: 180,           // 使用云台俯仰角
    roll: 0,                      // 固定滚转角
    fov: 30,                      // 固定视场角
    near: 10,                     // 固定近裁剪面
    far: Math.max(droneData.altitude, 10), // 动态计算的远裁剪面，确保最小值
    aspectRatio: 1.4              // 固定宽高比
  }
  console.log('result', result, currentTime.value)
  return result
}

const obj = computed(() => extractViewFrustumParams(data.flightLogs[currentTime.value]))
const lastPoint = computed(()=> data.flightLogs[currentTime.value])


// 初始化参数
// const obj = ref({
//   x: 120,
//   y: 30,
//   z: 2000,
//   heading: 0,
//   pitch: 180,
//   roll: 0,
//   fov: 30,
//   near: 10,
//   far: 1000,
//   aspectRatio: 1.4,
// });

const ready = ({viewer}) => {
  setCenter(viewer, {longitude: obj.value.x, latitude: obj.value.y})
}
window.aaa = () => obj.value.heading += 1

onMounted(() => {
  console.log(data)
  console.log('frustum 页面加载完成');
});
</script>

<style scoped lang="scss">
.frustum-container {
  padding: var(--spacing-base);
  height: 100%;
}
</style>