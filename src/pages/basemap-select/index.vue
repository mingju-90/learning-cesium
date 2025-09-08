<template>
  <div class="basemap-select-container">
    <Viewer @ready="ready"></Viewer>
  </div>
</template>

<script setup>
// 页面逻辑
import { onMounted, ref } from 'vue';
import Viewer from '../../components/cesiumComponents/viewer.vue';


const isReady = ref(false)
const ready = () => {

}


onMounted(() => {
  console.log('basemap-select 页面加载完成');
});
</script>

<style scoped lang="scss">
.basemap-select-container {
  padding: var(--spacing-base);
  height: 100%;
}
</style>