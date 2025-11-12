<template>
  <div class="droneView-container">
    <div style="width: 50%; height: 100%;">
      <VideoVue v-model:current-time="currentTime"/>
      <!-- <img style="width: 100%;" ref="imgRef" id="myVideo"
        @click="getClickPercent"
        src="http://112.64.193.138:9000/xinlan//missionAssets/1581F6Q8D245H00EB0XF/2025/10/28/ed379cca-cf43-4521-9749-e00591c7f5bc/DJI_202510280936_006_ed379cca-cf43-4521-9749-e00591c7f5bc/DJI_20251028094015_0004_V_%E8%88%AA%E7%82%B913.jpeg"
        alt=""> -->
    </div>
    <div style="width: 50%; height: 100%;">
      <droneView ref="aaa" />
    </div>
  </div>
</template>

<script setup>
// 页面逻辑
import { onMounted, ref } from 'vue';
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
  aaa.value.fn({u: result.x, v: result.y})
  console.log(result)
  // 限制在0~1范围内（处理边界点击）
  return result
}


const flightLogs = historyData.flightLogs
const currentTime = ref(0)

// setInterval(() => {
//     currentTime.value++
// }, 500);
onMounted(() => {
  console.log('droneView 页面加载完成', historyData);
});
</script>

<style scoped lang="scss">
.droneView-container {
  padding: var(--spacing-base);
  height: 100%;
  display: flex;
}
</style>