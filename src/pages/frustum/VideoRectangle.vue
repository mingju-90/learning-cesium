<template>
  <div class="frustum-viewer">
    <!-- 组件容器 -->
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, inject } from 'vue'
import * as dat from 'dat.gui'
import * as Cesium from 'cesium'

// 注入 Cesium Viewer 实例
const viewer = inject('viewer')

// 状态管理
let frustumEntity = null // 视锥体实体
let gui = null // GUI 控制器

// 视锥体核心参数（响应式）
const params = ref({
  fov: 30,         // 垂直视场角（度）
  aspectRatio: 16/9, // 宽高比
  near: 10,        // 近平面距离（米）
  far: 500,        // 远平面距离（米）
  lon: 120,        // 相机经度
  lat: 30,         // 相机纬度
  alt: 1500,       // 相机高度（米）
  heading: 0,      // 航向角（度）
  pitch: -45,      // 俯仰角（度）
  roll: 0          // 横滚角（度）
})

// 生成视锥体顶点的回调函数（核心：使用 CallbackProperty）
const getFrustumPositions = () => {
  return new Cesium.CallbackProperty(() => {
    // 1. 创建透视视锥体
    const frustum = new Cesium.PerspectiveFrustum({
      fov: Cesium.Math.toRadians(params.value.fov),
      aspectRatio: params.value.aspectRatio,
      near: params.value.near,
      far: params.value.far
    })

    // 2. 计算相机位置和姿态
    const origin = Cesium.Cartesian3.fromDegrees(
      params.value.lon,
      params.value.lat,
      params.value.alt
    )
    const hpr = new Cesium.HeadingPitchRoll(
      Cesium.Math.toRadians(params.value.heading),
      Cesium.Math.toRadians(params.value.pitch),
      Cesium.Math.toRadians(params.value.roll)
    )
    const orientation = Cesium.Quaternion.fromHeadingPitchRoll(hpr)

    // 3. 生成视锥体轮廓顶点
    const geometry = Cesium.FrustumOutlineGeometry.createGeometry(
      new Cesium.FrustumOutlineGeometry({ frustum, origin, orientation })
    )
    const positions = geometry.attributes.position.values

    // 4. 转换为 Cartesian3 数组（按棱边顺序排列）
    const vertices = []
    for (let i = 0; i < positions.length; i += 3) {
      vertices.push(Cesium.Cartesian3.fromArray(positions, i))
    }

    // 5. 构建棱边连接关系（12条棱边）
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0], // 近平面
      [4, 5], [5, 6], [6, 7], [7, 4], // 远平面
      [0, 4], [1, 5], [2, 6], [3, 7]  // 连接棱
    ]
    
    // 6. 展开为折线所需的位置数组
    const result = []
    edges.forEach(([a, b]) => {
      result.push(vertices[a])
      result.push(vertices[b])
    })
    return result
  }, false)
}

// 初始化视锥体实体
const initFrustum = () => {
  if (!viewer.value) return

  // 创建视锥体实体（一次性创建，通过 CallbackProperty 更新）
  frustumEntity = viewer.value.entities.add({
    name: 'dynamicFrustum',
    polyline: {
      positions: getFrustumPositions(), // 绑定回调属性
      width: 3,
      material: Cesium.Color.YELLOW,
      followSurface: false
    }
  })
}

// 初始化 GUI 控制器
const initGui = () => {
  gui = new dat.GUI()
  const folder = gui.addFolder('视锥体参数')
  folder.open()

  // 相机位置参数
  folder.add(params.value, 'lon', 110, 130).step(0.01).name('经度')
  folder.add(params.value, 'lat', 20, 40).step(0.01).name('纬度')
  folder.add(params.value, 'alt', 100, 3000).name('高度(米)')

  // 相机姿态参数
  folder.add(params.value, 'heading', -180, 180).step(1).name('航向角(度)')
  folder.add(params.value, 'pitch', -90, 0).step(1).name('俯仰角(度)')
  folder.add(params.value, 'roll', -90, 90).step(1).name('横滚角(度)')

  // 视锥体参数
  folder.add(params.value, 'fov', 10, 120).step(1).name('垂直视场角(度)')
  folder.add(params.value, 'aspectRatio', 0.5, 3).step(0.1).name('宽高比')
  folder.add(params.value, 'near', 1, 200).name('近平面(米)')
  folder.add(params.value, 'far', 100, 5000).name('远平面(米)')
}

// 初始化相机视角
const initCameraView = () => {
  if (!viewer.value) return
  viewer.value.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(
      params.value.lon + 0.1,
      params.value.lat + 0.1,
      params.value.alt + 1000
    ),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-60),
      roll: 0
    }
  })
}

// 生命周期 - 挂载
onMounted(() => {
  if (viewer.value) {
    initGui()
    initCameraView()
    initFrustum()
  } else {
    console.error('未获取到 Cesium Viewer 实例')
  }
})

// 生命周期 - 卸载
onUnmounted(() => {
  // 清理资源
  if (viewer.value && frustumEntity) {
    viewer.value.entities.remove(frustumEntity)
  }
  if (gui) {
    gui.destroy()
  }
})
</script>

<style scoped>
.frustum-viewer {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>