<template>
  <div class="frustum-visualizer">
    <video 
      id="myVideo" 
      ref="videoRef" 
      style="display: none" 
      loop 
      muted
    >
      <source :src="videoSrc" type="video/mp4">
    </video>
    <video 
      style="position: absolute; right: 10px; top: 200px;width: 100px;" 
      loop
      ref="videoRef1" 
      muted
    >
      <source :src="videoSrc" type="video/mp4">
    </video>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, inject } from 'vue'
import * as dat from 'dat.gui'
import * as Cesium from 'cesium'

// 通过 inject 获取 viewer（Ref 类型）
const viewer = inject('viewer')

// Props 定义
const props = defineProps({
  videoSrc: {
    type: String,
    default: ''
  },
  // 外部传入相机三维位置（经纬度+高度）
  cameraPosition: {
    type: Object,
    default: () => ({ lon: 120, lat: 30, alt: 1500 })
  }
})

// 状态管理：新增射线实体存储
const videoRef = ref(null)
const videoRef1 = ref(null)
let farPlaneEntity = null // 远平面轮廓线
let frustumRayEntities = [] // 相机到远平面顶点的射线数组
let videoPolygonEntity = null // 地面投影多边形
let synchronizer = null
let gui = null

// 控制参数
const controls = ref({
  fov: 30,         // 水平视场角（度）
  aspectRatio: 16/9, // 宽高比（width/height）
  far: 500,        // 相机到远平面的直线距离（米）
  heading: 0,      // 航向角（度，0=正北，顺时针递增）
  pitch: -45,      // 俯仰角（度，0=水平向前，负值向下）
  roll: 0          // 横滚角（度，0=水平）
})

/**
 * 计算视锥体远平面的四个三维顶点（经纬度+高度格式）
 * @param {Object} cameraPos 相机三维位置 {lon, lat, alt}
 * @param {number} fov 水平视场角（度）
 * @param {number} aspectRatio 宽高比
 * @param {number} far 相机到远平面的直线距离（米）
 * @param {number} heading 航向角（度）
 * @param {number} pitch 俯仰角（度）
 * @param {number} roll 横滚角（度）
 * @returns {Array<Array<number>>} 远平面顶点数组 [[lon1, lat1, height1], [lon2, lat2, height2], ...]
 */
const calculateFarPlanePoints = (cameraPos, fov, aspectRatio, far, heading, pitch, roll) => {
  // 1. 相机三维位置：经纬度+高度 → 世界坐标（Cartesian3）
  const cameraWorldPos = Cesium.Cartesian3.fromDegrees(
    cameraPos.lon,
    cameraPos.lat,
    cameraPos.alt
  )

  // 2. 相机姿态：航向角/俯仰角/横滚角 → 旋转矩阵（三维朝向）
  const hpr = new Cesium.HeadingPitchRoll(
    Cesium.Math.toRadians(heading),
    Cesium.Math.toRadians(pitch),
    Cesium.Math.toRadians(roll)
  )
  const orientation = Cesium.Quaternion.fromHeadingPitchRoll(hpr)
  const rotationMatrix = Cesium.Matrix3.fromQuaternion(orientation)

  // 3. 视场角计算（透视原理）
  const fovRad = Cesium.Math.toRadians(fov)
  const halfHFov = fovRad / 2
  const halfVFov = Math.atan(Math.tan(halfHFov) / aspectRatio)

  // 4. 相机本地坐标系下的远平面三维顶点（X=右，Y=上，Z=前）
  const cameraLocalPoints = [
    [Math.tan(halfHFov) * far, Math.tan(halfVFov) * far, far], // 右上
    [-Math.tan(halfHFov) * far, Math.tan(halfVFov) * far, far], // 左上
    [-Math.tan(halfHFov) * far, -Math.tan(halfVFov) * far, far], // 左下
    [Math.tan(halfHFov) * far, -Math.tan(halfVFov) * far, far]  // 右下
  ]

  // 5. 本地三维坐标 → 世界三维坐标 → 经纬度+高度（核心转换）
  return cameraLocalPoints.map(localPoint => {
    // 本地向量 → 世界向量（应用相机姿态旋转）
    const localVector = new Cesium.Cartesian3(...localPoint)
    const worldVector = Cesium.Matrix3.multiplyByVector(
      rotationMatrix,
      localVector,
      new Cesium.Cartesian3()
    )

    // 世界向量 + 相机世界位置 = 远平面顶点世界坐标
    const pointWorldPos = Cesium.Cartesian3.add(
      cameraWorldPos,
      worldVector,
      new Cesium.Cartesian3()
    )

    // 世界坐标 → 经纬度+高度（Cartographic 包含弧度经纬度和高度）
    const cartographic = Cesium.Cartographic.fromCartesian(pointWorldPos)
    return [
      Cesium.Math.toDegrees(cartographic.longitude), // 经度（度）
      Cesium.Math.toDegrees(cartographic.latitude),  // 纬度（度）
      cartographic.height                            // 高度（米，WGS84大地高）
    ]
  })
}

// 新增：清理视锥射线实体
const clearFrustumRays = () => {
  frustumRayEntities.forEach(entity => {
    if (entity && viewer.value) {
      viewer.value.entities.remove(entity)
    }
  })
  frustumRayEntities = [] // 清空数组
}

// 绘制远平面、视锥射线和地面投影
const drawPlanes = () => {
  if (!viewer.value) {
    console.error('Cesium Viewer 实例未注入')
    return
  }

  // 清理旧资源（含新增的射线）
  if (farPlaneEntity) viewer.value.entities.remove(farPlaneEntity)
  clearFrustumRays() // 清理视锥射线
  if (videoPolygonEntity) viewer.value.entities.remove(videoPolygonEntity)

  const videoElement = videoRef.value

  // 1. 计算远平面顶点（经纬度+高度格式）
  const farPlaneLonLatHeight = calculateFarPlanePoints(
    props.cameraPosition,
    controls.value.fov,
    controls.value.aspectRatio,
    controls.value.far,
    controls.value.heading,
    controls.value.pitch,
    controls.value.roll
  )
  console.log('farPlaneLonLatHeight', farPlaneLonLatHeight)

  // 2. 转换为 Cesium 绘制所需的 Cartesian3 数组
  const farPlanePoints = [...farPlaneLonLatHeight].map(([lon, lat, height]) => 
    Cesium.Cartesian3.fromDegrees(lon, lat, height)
  )
  console.log('farPlaneLonLatHeight', farPlaneLonLatHeight)
  const hierarchy = new Cesium.PolygonHierarchy(
  Cesium.Cartesian3.fromDegreesArrayHeights(
    // 扁平化数组：[lng1, lat1, height1, lng2, lat2, height2, ...]
    farPlaneLonLatHeight.flat()
  ))

  // 3. 绘制三维远平面轮廓线（保持原有逻辑）
  farPlaneEntity = viewer.value.entities.add({
    polygon: {
        hierarchy: hierarchy,
        // material: videoElement,
        material: Cesium.Color.GREEN,
        outline: true,
        outlineColor: Cesium.Color.GREEN,
        outlineWidth: 2,
      }
  })

  // 4. 绘制相机到远平面四个顶点的射线（核心新增逻辑）
  const cameraWorldPos = Cesium.Cartesian3.fromDegrees(
    props.cameraPosition.lon,
    props.cameraPosition.lat,
    props.cameraPosition.alt
  )

  farPlaneLonLatHeight.forEach(([lon, lat, height], index) => {
    // 远平面顶点世界坐标
    const pointWorldPos = Cesium.Cartesian3.fromDegrees(lon, lat, height)
    // 射线：相机位置 → 远平面顶点（两点连线）
    const rayEntity = viewer.value.entities.add({
      name: `frustumRay-${index}`,
      polyline: {
        positions: [cameraWorldPos, pointWorldPos], // 相机到当前顶点的连线
        width: 3, // 射线宽度（略细于远平面轮廓，区分层次）
        material: Cesium.Color.RED.withAlpha(0.8), // 红色半透明，醒目
        followSurface: false // 禁用贴地，保持空间直线
      }
    })
    frustumRayEntities.push(rayEntity) // 存入数组，便于后续清理
  })
  return 

  // 5. 计算地面投影（三维射线求交，保持原有逻辑）
  const groundIntersections = []
  for (const [lon, lat, height] of farPlaneLonLatHeight) {
    const pointWorldPos = Cesium.Cartesian3.fromDegrees(lon, lat, height)
    const direction = Cesium.Cartesian3.subtract(pointWorldPos, cameraWorldPos, new Cesium.Cartesian3())
    const ray = new Cesium.Ray(cameraWorldPos, direction)
    const intersection = viewer.value.scene.globe.pick(ray, viewer.value.scene)
    if (intersection) {
      groundIntersections.push(intersection)
    } else {
      groundIntersections.push(Cesium.Cartesian3.fromDegrees(lon, lat, 0))
    }
  }

  // 6. 绘制地面投影多边形（保持原有逻辑）
  if (groundIntersections.length === 4 && videoElement) {
    videoPolygonEntity = viewer.value.entities.add({
      name: 'groundProjectionPolygon',
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(groundIntersections),
        material: videoElement,
        outline: true,
        outlineColor: Cesium.Color.GREEN,
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
      }
    })
  }

  // 7. 视频同步（保持原有逻辑）
  if (synchronizer) synchronizer.destroy()
  if (videoElement) {
    synchronizer = new Cesium.VideoSynchronizer({
      clock: viewer.value.clock,
      element: videoElement
    })
    viewer.value.clock.shouldAnimate = true
  }
}

// 资源清理辅助函数
const removeEntityByName = (name) => {
  if (!viewer.value) return
  const entities = viewer.value.entities.values
  for (let i = entities.length - 1; i >= 0; i--) {
    if (entities[i].name === name) {
      viewer.value.entities.remove(entities[i])
    }
  }
}

// 初始化 GUI 控制面板（保持原有逻辑）
const initGui = () => {
  gui = new dat.GUI()
  const guiContainer = gui.domElement.parentElement
  guiContainer.style.position = 'absolute'
  guiContainer.style.top = '10px'
  guiContainer.style.right = '10px'

  gui.add(controls.value, 'fov', 10, 120).onChange(drawPlanes).name('水平视场角(度)')
  gui.add(controls.value, 'heading', -180, 180).onChange(drawPlanes).name('航向角(度)')
  gui.add(controls.value, 'pitch', -90, 0).onChange(drawPlanes).name('俯仰角(度)')
  gui.add(controls.value, 'roll', -90, 90).onChange(drawPlanes).name('横滚角(度)')
}

// 初始化相机视角（保持原有逻辑）
const initCameraView = () => {
  if (!viewer.value) return
  viewer.value.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(
      props.cameraPosition.lon + 0.01,
      props.cameraPosition.lat + 0.01,
      props.cameraPosition.alt + 1000
    ),
    orientation: {
      heading: Cesium.Math.toRadians(-45),
      pitch: Cesium.Math.toRadians(-45),
      roll: 0
    }
  })
}

// 生命周期-挂载（保持原有逻辑）
onMounted(() => {
  if (viewer.value) {
    if (props.videoSrc && videoRef.value) {
      videoRef.value.src = props.videoSrc
      videoRef.value.load()
    }
    videoRef.value.play()
    videoRef1.value.play()
    initGui()
    initCameraView()
    drawPlanes()
  } else {
    console.warn('等待 viewer 注入...')
    const unwatch = watch(() => viewer.value, (newVal) => {
      if (newVal) {
        unwatch()
        initGui()
        initCameraView()
        drawPlanes()
      }
    })
  }
})

// 生命周期-卸载（新增射线清理）
onUnmounted(() => {
  if (!viewer.value) return

  // 清理所有实体
  if (farPlaneEntity) viewer.value.entities.remove(farPlaneEntity)
  clearFrustumRays() // 卸载时清理射线
  if (videoPolygonEntity) viewer.value.entities.remove(videoPolygonEntity)
  removeEntityByName('farPlanePolygon')
  removeEntityByName('groundProjectionPolygon')

  // 清理视频同步器和 GUI
  if (synchronizer) synchronizer.destroy()
  if (gui) gui.destroy()
})

// 监听视频源变化（保持原有逻辑）
watch(() => props.videoSrc, (newSrc) => {
  if (newSrc && videoRef.value) {
    videoRef.value.src = newSrc
    videoRef.value.load()
    if (videoPolygonEntity) {
      videoPolygonEntity.polygon.material = videoRef.value
    }
  }
})

// 监听相机位置变化（保持原有逻辑）
watch(() => props.cameraPosition, (newPos) => {
  drawPlanes()
}, { deep: true })
</script>

<style scoped></style>