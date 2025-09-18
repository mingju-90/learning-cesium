<template>
  <div></div>
</template>

<script setup lang="ts">
import { onUnmounted, watch, inject } from 'vue';
// import * as Cesium from 'cesium';


const viewer = inject('viewer')
if (!viewer.value) {
  console.error('天地图组件需要通过provide提供viewer实例');
}

const props = defineProps({
  value: {
    type: String,
    required: true
  },
  splitDirection: Number
});

let currentTileset: Cesium.Cesium3DTileset | null = null;

// 封装创建裁剪平面的方法
const createClippingPlanes = (planes, tileset) => {

  // 创建 ClippingPlaneCollection
  const clippingPlaneCollection = new Cesium.ClippingPlaneCollection({
    planes: [
      new Cesium.ClippingPlane(new Cesium.Cartesian3(1.0, 0.15, 0.0), 200.0),//裁左边
      new Cesium.ClippingPlane(new Cesium.Cartesian3(-1.0, -0.15, 0.0), 200.0),//裁右边
      new Cesium.ClippingPlane(new Cesium.Cartesian3(0.0, -1.0, 0.0), 600.0),//裁上边
      new Cesium.ClippingPlane(new Cesium.Cartesian3(0.0, 1.0, 0.0), 600.0),//裁下边
    ],
    unionClippingRegions: true, // 可根据需求设置为 true（并集）或 false（交集）
  });

  // 应用到 tileset
  tileset.clippingPlanes = clippingPlaneCollection;

  return clippingPlaneCollection;
};


// 加载3D Tileset
const loadTileset = async (url: string) => {
  // 销毁现有tileset
  destroyTileset();

  try {
    const tileset = await Cesium.Cesium3DTileset.fromUrl(url, {
      // 修正为512MB（512 * 1024 * 1024 字节）
      maximumCacheOverflowBytes: 512 * 1024 * 1024,
      cacheBytes: 512 * 1024 * 1024,
      maximumScreenSpaceError: 8,
      cullRequestsWhileMovingMultiplier: 10,
      dynamicScreenSpaceError: true,
      dynamicScreenSpaceErrorFactor: 16,
      dynamicScreenSpaceErrorHeightFalloff: 0.3,
      loadSiblings: true
    });

    viewer.value.scene.primitives.add(tileset);
    currentTileset = tileset;
    viewer.value.zoomTo(tileset)

    createClippingPlanes([[112.371365, 40.120357]], tileset)
    if (props.splitDirection) tileset.splitDirection = props.splitDirection
    return tileset;
  } catch (error) {
    console.error('加载3D Tileset失败:', error);
    return null;
  }
};

// 销毁3D Tileset
const destroyTileset = () => {
  if (currentTileset) {
    viewer.value.scene.primitives.remove(currentTileset);
    currentTileset = null;
  }
};

// 初始化加载
loadTileset(props.value);

// 监听URL变化，动态更新
watch(
  () => props.value,
  (newUrl) => {
    loadTileset(newUrl);
  },
  { immediate: false }
);

// 组件销毁时清理资源
onUnmounted(() => {
  destroyTileset();
});
</script>
