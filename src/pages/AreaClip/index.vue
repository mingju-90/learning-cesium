<template>
  <div class="AreaClip-container">
    <Viewer @ready="ready"></Viewer>
    <div class="tools">
      <el-select v-model="showArea" class="m-2" placeholder="Select" size="large" style="width: 240px"
        @change="handleChangeArea">
        <el-option v-for="item in areaList.province" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
    </div>
  </div>
</template>

<script setup>
// 页面逻辑
import { onMounted, ref } from 'vue';
import china from '../../../public/china-geoJson.json'
import Viewer from '../../components/cesiumComponents/viewer.vue';


const showArea = ref('')
let viewer

/**
 * 步骤1：解析GeoJSON，提取行政区信息（按层级分组）
 * @param {Object} geoJSON - 行政区GeoJSON数据
 * @returns {Object} 按层级分组的行政区数据（key: level，value: 数组）
 */
const parseGeoJSON = (geoJSON) => {
  // 按层级分组（province/city/district）
  const levelGroup = {
    province: [], // 省级
    city: [],     // 市级
    district: []  // 区级
  };

  // 遍历每个Feature（每个Feature对应一个行政区）
  geoJSON.features.forEach(feature => {
    const { properties, geometry } = feature;
    const { adcode, name, level, acroutes, center } = properties;

    // 提取当前行政区的核心信息（关联coordinates）
    const adminItem = {
      label: name,          // 选择器显示名称
      value: adcode,        // 唯一标识（adcode，全国唯一）
      level: level,         // 层级（province/city/district）
      coordinates: geometry.coordinates, // 目标：要获取的coordinates
      parentAdcode: acroutes?.[acroutes.length - 1] || null, // 父级adcode（从acroutes提取，如北京的acroutes是[100000]，父级是100000）
      children: [],          // 子级行政区（后续填充）
      center
    };

    // 按层级加入对应分组
    if (levelGroup[level]) {
      levelGroup[level].push(adminItem);
    }
  });

  return levelGroup;
};

const areaList = parseGeoJSON(china)


const handleChangeArea = () => {
  const area = areaList.province.find(item => item.value === showArea.value)
  console.log(area)
  clipping(area.coordinates, area.center)
}

const clipping = (coordinates, center) => {
  const coors = coordinates[0].flat().flat()
  console.log(coors)
  const areas = new Cesium.ClippingPolygon({
    positions: Cesium.Cartesian3.fromDegreesArray(coors),
  })
  viewer.scene.globe.clippingPolygons = new Cesium.ClippingPolygonCollection({
    polygons: [areas],
    inverse: true
  })

  // 飞行到青岛区域
  viewer.camera.flyTo({
    destination: new Cesium.Cartesian3.fromDegrees(...center, 30000),
  })
}


const ready = async(data) => {
  viewer = data.viewer
  const terrain = await Cesium.CesiumTerrainProvider.fromIonAssetId(1);
  viewer.terrainProvider = terrain;
  viewer.scene.globe.depthTestAgainstTerrain = true;
  // 关闭一些不必要的视觉效果，优化性能
  viewer.scene.sun.show = false; // 太阳
  viewer.scene.moon.show = false; // 月亮 
  viewer.scene.skyBox.show = false; // 天空盒
  viewer.scene.fog.enabled = false; // 雾
  viewer.scene.skyAtmosphere.show = false; // 大气
}

console.log(areaList)

onMounted(() => {
  console.log('AreaClip 页面加载完成',);
});
</script>

<style scoped lang="scss">
.AreaClip-container {
  padding: var(--spacing-base);
  height: 100%;
}

.tools {
  position: absolute;
  right: 10px;
  top: 10px;
}
</style>