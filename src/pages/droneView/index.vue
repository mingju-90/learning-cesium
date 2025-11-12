<template>
  <div class="droneView-container">
    <div style="width: 50%; height: 100%; position: relative;">
      <VideoVue v-model:current-time="currentTime"/>
      <!-- <img style="width: 100%;" ref="imgRef" id="myVideo"
        @click="getClickPercent"
        src="http://112.64.193.138:9000/xinlan//missionAssets/1581F6Q8D245H00EB0XF/2025/10/28/ed379cca-cf43-4521-9749-e00591c7f5bc/DJI_202510280936_006_ed379cca-cf43-4521-9749-e00591c7f5bc/DJI_20251028094015_0004_V_%E8%88%AA%E7%82%B913.jpeg"
        alt=""> -->
    </div>
    <div style="width: 50%; height: 100%;">
      <droneView ref="aaa" :drone-info="droneInfo"/>
    </div>
  </div>
</template>

<script setup>
// 页面逻辑
import { onMounted, ref, computed } from 'vue';
import VideoVue from './video.vue';
import historyData from '../../../public/flightHistory/history.json'
import droneView from './droneViewer.vue';

const imgRef = ref()
const aaa = ref()
const getClickPercent = (e) => {
  const rect = imgRef.value.getBoundingClientRect()
  // 计算点击位置相对于元素左上角的偏移量（像素）
  const offsetX = e.clientX - rect.left;
  const offsetY = e.clientY - rect.top;

  // 计算百分比（除以元素显示宽度/高度）
  const xPercent = offsetX / rect.width;
  const yPercent = offsetY / rect.height;
  const result = {
    x: Math.max(0, Math.min(1, xPercent)),
    y: Math.max(0, Math.min(1, yPercent))
  };
  aaa.value.fn(result.x, result.y)
  // 限制在0~1范围内（处理边界点击）
  return result
}

// const droneInfo = {
//   longitude: 120.279604894, 
//   latitude: 31.613370323, 
//   height: 139.387, 
//   fov: 47, 
//   aspectRatio: 3/4, 
//   heading: -91.8, 
//   pitch: -55, 
//   roll: 0
// }

const flightLogs = historyData.flightLogs
const currentTime = ref(90)
const droneInfo = computed(() => {
  const item = flightLogs[currentTime.value * 2]
  return {
      longitude: item.longitude, 
      latitude: item.latitude, 
      height: item.altitude, 
      fov: 47, 
      aspectRatio: 3/4,
      heading: item.gimbalYaw, 
      // heading: 0, 
      pitch: item.gimbalPitch, 
      // pitch: -75, 
      roll: 0
  }
})




// setInterval(() => {
//     currentTime.value++
// }, 500);
onMounted(() => {
});
</script>

<style scoped lang="scss">
.droneView-container {
  padding: var(--spacing-base);
  height: 100%;
  display: flex;
}
</style>