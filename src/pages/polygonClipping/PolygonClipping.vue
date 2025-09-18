<!-- PolygonClipping.vue -->
<template>
  <div class="cesium-container">
    <div class="control-panel">
      <span>经度: {{ mouseCoords.longitude.toFixed(6) }}°</span>
      <span>纬度: {{ mouseCoords.latitude.toFixed(6) }}°</span>
      <span>高度: {{ mouseCoords.height.toFixed(2) }} m</span>
      <span>顶点数: {{ clickedPoints.length }}</span>
      <button @click="applyPolygonClipping" :disabled="clickedPoints.length < 3">应用多边形裁剪</button>
      <button @click="clearClipping">清除裁剪</button>
    </div>
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

  const planes = clickedPoints.value.map(([lng, lat], index) => {
    const nextIndex = (index + 1) % clickedPoints.value.length;
    const p1 = Cesium.Cartesian3.fromDegrees(lng, lat, 0);
    const p2 = Cesium.Cartesian3.fromDegrees(
      clickedPoints.value[nextIndex][0],
      clickedPoints.value[nextIndex][1],
      0
    );
    // 计算法向量（指向多边形内部）
    const edge = Cesium.Cartesian3.subtract(p2, p1, new Cesium.Cartesian3());
    const normal = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.cross(edge, Cesium.Cartesian3.UNIT_Z, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    );
    // 确保法向量指向多边形内部（基于多边形方向）
    const center = Cesium.Cartesian3.fromDegrees(
      clickedPoints.value.reduce((sum, [lng]) => sum + lng, 0) / clickedPoints.value.length,
      clickedPoints.value.reduce((sum, [, lat]) => sum + lat, 0) / clickedPoints.value.length,
      0
    );
    const toCenter = Cesium.Cartesian3.subtract(center, p1, new Cesium.Cartesian3());
    if (Cesium.Cartesian3.dot(normal, toCenter) < 0) {
      Cesium.Cartesian3.negate(normal, normal);
    }
    const distance = -Cesium.Cartesian3.dot(normal, p1);
    return new Cesium.ClippingPlane(normal, distance);
  });

  const clippingPlaneCollection = new Cesium.ClippingPlaneCollection({
    planes,
    unionClippingRegions: false, // 交集裁剪，保留多边形内部
    edgeColor: Cesium.Color.RED,
    edgeWidth: 2.0,
  });

  tileset.clippingPlanes = clippingPlaneCollection;
  console.log('已应用多边形裁剪', clippingPlaneCollection);
};

// 清除裁剪和多边形
const clearClipping = () => {
  if (tileset) {
    tileset.clippingPlanes = null;
  }
  clickedPoints.value = [];
  if (polygonEntity.value) {
    viewer.value.entities.remove(polygonEntity.value);
    polygonEntity.value = null;
  }
  console.log('已清除裁剪和多边形');
};
</script>

<style scoped>
.cesium-container {
  position: relative;
}
.control-panel {
  position: absolute;
  bottom: 10px;
  left: 10px;
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