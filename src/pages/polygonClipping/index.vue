<template>
  <div class="polygonClipping-container">
    <Viewer @ready="ready">
      <PolygonClipping />
      <!-- <CesiumTileset value="/balipu/tileset.json"/> -->
    </Viewer>
  </div>
</template>

<script setup>
// 页面逻辑
import { onMounted } from 'vue';
import Viewer from '../../components/cesiumComponents/viewer.vue';
import PolygonClipping from './PolygonClipping.vue';


onMounted(() => {
  console.log('polygonClipping 页面加载完成');
});
</script>

<style scoped lang="scss">
.polygonClipping-container {
  padding: var(--spacing-base);
  height: 100%;
}
</style>