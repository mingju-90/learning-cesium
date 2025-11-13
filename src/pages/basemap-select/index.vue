<template>
  <div class="basemap-select-container">
    <Viewer @ready="ready">
      <tianditu v-if="mapType === 'tianditu'" />
      <tianditu type="annotation" v-if="mapType === 'tiandituAnnotation'" />
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
import DirectionTrackMaterial from '../../myMaterial/directionTrackMaterial';
import PolylineDashMaterial from '../../myMaterial/polylineDashMaterial';

let viewer = null
const isReady = ref(false)
const mapType = ref('tianditu')
const list = [
  { label: '天地图卫星图层', value: 'tianditu' },
  { label: '天地图注记图层', value: 'tiandituAnnotation' },
]



const ready = async (data) => {
  viewer = data.viewer
  isReady.value = true


  const entity = viewer.entities.add({
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        116.30, 39.30, 100,
        116.36, 39.3, 100,
      ]),
      width: 12,
      material: new DirectionTrackMaterial({
        backgroundColor: Cesium.Color.ROYALBLUE.withAlpha(0.7),
        arrowColor: Cesium.Color.YELLOW,
        spacing: 60,  // 每 60 像素一个箭头
        lineWidth: 5
      }),
      // material: new PolylineDashMaterial() 
    }
  });

  viewer.flyTo(entity, {
    duration: 0.5, // 飞行时间（秒）

  });


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

.tools {
  position: absolute;
  top: 20px;
  right: 20px;
}
</style>