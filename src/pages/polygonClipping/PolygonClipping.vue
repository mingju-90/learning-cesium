<!-- PolygonClipping.vue -->
<template>
    <div class="control-panel">
      <button @click="applyPolygonClipping" :disabled="clickedPoints.length < 3">应用多边形裁剪</button>
      <button @click="clearClipping">清除裁剪</button>
    </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, inject } from 'vue';

// Cesium Ion 令牌（替换为你的令牌）


const viewer = inject('viewer');
// 存储鼠标坐标
const mouseCoords = ref({
  longitude: 0,
  latitude: 0,
  height: 0,
});

// 存储点击的多边形顶点 [lng, lat]
const clickedPoints = ref([]);

// 存储多边形实体
const polygonEntity = ref(null);

// Cesium Viewer 实例
let tileset = null;

onMounted(async () => {
  

  // 加载 3D Tileset（替换为你的 Tileset URL）
  try {
    tileset = await Cesium.Cesium3DTileset.fromUrl('/balipu/tileset.json');
    tileset.height = 100;
    viewer.value.scene.primitives.add(tileset);
    viewer.value.zoomTo(tileset);
  } catch (error) {
    console.error('加载 Tileset 失败:', error);
  }

  // 鼠标移动事件：更新坐标
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.value.scene.canvas);
  handler.setInputAction((movement) => {
    if (!viewer.value || !movement.endPosition) return;
    const cartesian = viewer.value.camera.pickEllipsoid(movement.endPosition, viewer.value.scene.globe.ellipsoid);
    if (cartesian) {
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      mouseCoords.value = {
        longitude: Cesium.Math.toDegrees(cartographic.longitude),
        latitude: Cesium.Math.toDegrees(cartographic.latitude),
        height: cartographic.height,
      };
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  // 鼠标点击事件：收集多边形顶点
  handler.setInputAction((click) => {
    if (!viewer.value || !click.position) return;
    const cartesian = viewer.value.camera.pickEllipsoid(click.position, viewer.value.scene.globe.ellipsoid);
    if (cartesian) {
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      const longitude = Cesium.Math.toDegrees(cartographic.longitude).toFixed(6);
      const latitude = Cesium.Math.toDegrees(cartographic.latitude).toFixed(6);
      console.log(`点击坐标: 经度=${longitude}°, 纬度=${latitude}°`);

      // 添加顶点
      clickedPoints.value.push([parseFloat(longitude), parseFloat(latitude)]);
      updatePolygonVisualization();
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  // 清理
  onUnmounted(() => {
    handler.destroy();
    if (viewer.value) viewer.value.destroy();
  });
});

// 更新多边形可视化
const updatePolygonVisualization = () => {
  if (polygonEntity.value) {
    viewer.value.entities.remove(polygonEntity.value);
    polygonEntity.value = null;
  }

  if (clickedPoints.value.length < 3) return;

  const positions = clickedPoints.value.map(([lng, lat]) =>
    Cesium.Cartesian3.fromDegrees(lng, lat, 0)
  );

  polygonEntity.value = viewer.value.entities.add({
    polygon: {
      hierarchy: new Cesium.PolygonHierarchy(positions),
      material: Cesium.Color.RED.withAlpha(0.3),
      outline: true,
      outlineColor: Cesium.Color.RED,
      outlineWidth: 2.0,
    },
  });
};

// 应用多边形裁剪
const applyPolygonClipping = () => {
  if (!tileset || clickedPoints.value.length < 3) {
    console.warn('需要至少三个点来定义多边形');
    return;
  }
  const coors = clickedPoints.value.flat()
  const areas = new Cesium.ClippingPolygon({
    positions: Cesium.Cartesian3.fromDegreesArray(coors),
  })
  console.log(tileset.clippingPolygons)
  tileset.clippingPolygons = new Cesium.ClippingPolygonCollection({
    polygons: [areas],
    inverse: true
  })
  clearPolygon()
};

const clearPolygon = () => {
  clickedPoints.value = [];
  if (polygonEntity.value) {
    viewer.value.entities.remove(polygonEntity.value);
    polygonEntity.value = null;
  }
}

// 清除裁剪和多边形
const clearClipping = () => {
  if (tileset) {
    tileset.clippingPolygons = undefined;
  }
  clearPolygon()
  console.log('已清除裁剪和多边形');
};
</script>

<style scoped>
.cesium-container {
  position: relative;
}
.control-panel {
  position: absolute;
  top:  20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  display: flex;
  gap: 20px;
  font-size: 14px;
}
button {
  background: #333;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
}
button:hover {
  background: #555;
}
button:disabled {
  background: #666;
  cursor: not-allowed;
}
</style>