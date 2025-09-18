<template>
  <div class="basemap-select-container">
    <Viewer @ready="ready">
      <tianditu v-if="mapType === 'tianditu'"/>
      <tianditu type="annotation" v-if="mapType === 'tiandituAnnotation'"/>
      <CesiumTileset value="/balipu/tileset.json"/>
    </Viewer>
    <div class="tools">
      <a-radio-group v-model:value="mapType" button-style="solid">
        <a-radio-button v-for="item of list" :value="item.value">{{ item.label }}</a-radio-button>
      </a-radio-group>
    </div>
  </div>
</template>

<script setup>
// 页面逻辑
import { onMounted, ref } from 'vue';
import Viewer from '../../components/cesiumComponents/viewer.vue';
import tianditu from '../../components/cesiumComponents/tianditu.vue';
import Showline from './showline.vue';
import CesiumTileset from '../../components/cesiumComponents/CesiumTileset.vue';


const mapType = ref('tianditu')
const list = [
  {label: '天地图卫星图层', value: 'tianditu'},
  {label: '天地图注记图层', value: 'tiandituAnnotation'},
]


onMounted(() => {
  console.log('basemap-select 页面加载完成');
});
</script>

<style scoped lang="scss">
.basemap-select-container {
  padding: var(--spacing-base);
  height: 100%;
}
.tools {
  position: absolute;
  top: 20px;
  right: 20px;
}
</style>