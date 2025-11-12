import * as dat from 'dat.gui'
let primitive = null
let primitiveLine = null
let videoPolygonEntity = null
let marker = null
let videoMaterial = null
// 将笛卡尔坐标转换为WGS84坐标（带高度）
function convertToCartographicArray(cartesians, height = 100) {
  return cartesians.map((cartesian) => {
    const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
    return Cesium.Cartesian3.fromRadians(
      cartographic.longitude,
      cartographic.latitude,
      height // 使用合理的高度值
    )
  })
}
function addFrutum(origin, position, fov, near, far, aspectRatio) {
  if (primitive) {
    viewer.scene.primitives.remove(primitive)
  }
  if (primitiveLine) {
    viewer.scene.primitives.remove(primitiveLine)
  }
  if (videoPolygonEntity) {
    viewer.entities.remove(videoPolygonEntity)
  }
  // 视频元素
  const videoElement = document.getElementById('myVideo')
  // debugger
  const frustum = new Cesium.PerspectiveFrustum({
    fov: Cesium.Math.toRadians(fov),
    aspectRatio: aspectRatio,
    near: near,
    far: far,
  })
 
  // 计算远平面顶点
  const frustumGeometry = Cesium.FrustumOutlineGeometry.createGeometry(
    new Cesium.FrustumOutlineGeometry({
      frustum: frustum,
      origin: origin,
      orientation: position.orientation,
    })
  )
  // 提取远平面四个点
  const positions = frustumGeometry.attributes.position.values
  const farPlanePoints = []
  for (let i = 4 * 3; i < 8 * 3; i += 3) {
    farPlanePoints.push(Cesium.Cartesian3.fromArray(positions, i))
  }
  // 计算与地面的交点
  const groundIntersections = []
  for (let i = 0; i < 4; i++) {
    const ray = new Cesium.Ray(
      origin,
      Cesium.Cartesian3.subtract(
        farPlanePoints[i],
        origin,
        new Cesium.Cartesian3()
      )
    )
 
    const intersection = viewer.scene.globe.pick(ray, viewer.scene)
    if (intersection) {
      groundIntersections.push(intersection)
    } else {
      // 如果没有交点，使用远平面点
      groundIntersections.push(farPlanePoints[i])
    }
  }
 
  // 创建视频多边形（如果需要）
  if (groundIntersections.length === 4) {
    console.log('groundIntersections', groundIntersections)
    videoPolygonEntity = viewer.entities.add({
      name: 'videoFrustumPolygon',
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(groundIntersections),
        material: videoElement,
        heightReference: Cesium.HeightReference.NONE,
      },
    })
  }
  // 视频同步器
  let synchronizer = new Cesium.VideoSynchronizer({
    clock: viewer.clock,
    element: videoElement,
  })
  viewer.clock.shouldAnimate = true
 
  // 添加远平面顶点标记（调试用）
  // for (let i = 0; i < groundIntersections.length; i++) {
  //   marker = viewer.entities.add({
  //     position: groundIntersections[i],
  //     point: {
  //       pixelSize: 8,
  //       color: Cesium.Color.RED,
  //       outlineColor: Cesium.Color.WHITE,
  //       outlineWidth: 2,
  //     },
  //     label: {
  //       text: `P${i + 1}`,
  //       font: '12px sans-serif',
  //       fillColor: Cesium.Color.WHITE,
  //       style: Cesium.LabelStyle.FILL_AND_OUTLINE,
  //       outlineWidth: 2,
  //       verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
  //       pixelOffset: new Cesium.Cartesian2(0, -10),
  //     },
  //   })
  // }
  //创建instaces
  let instances = new Cesium.GeometryInstance({
    geometry: new Cesium.FrustumGeometry({
      frustum: frustum,
      origin: origin,
      // orientation: orientation,
      orientation: position.orientation,
      vertexFormat: Cesium.VertexFormat.POSITION_ONLY,
    }),
    attributes: {
      color: Cesium.ColorGeometryInstanceAttribute.fromColor(
        Cesium.Color.RED.withAlpha(0.03)
      ),
    },
  })
  let instanceGeoline = new Cesium.GeometryInstance({
    geometry: new Cesium.FrustumOutlineGeometry({
      frustum: frustum,
      origin: origin,
      orientation: position.orientation,
      // orientation: orientation,
    }),
    attributes: {
      color: Cesium.ColorGeometryInstanceAttribute.fromColor(
        new Cesium.Color(1.0, 1.0, 1.0, 1)
      ),
    },
    id: 'frustum1',
  })
  primitive = new Cesium.Primitive({
    
    // geometryInstances: [instances, instanceGeoline],
    geometryInstances: instances,
    appearance: new Cesium.PerInstanceColorAppearance({
      closed: true,
      translucent: true,
    }),
    asynchronous: false,
  })
  primitiveLine = new Cesium.Primitive({
    geometryInstances: instanceGeoline,
    appearance: new Cesium.PerInstanceColorAppearance({
      closed: true,
      flat: true,
    }),
    asynchronous: false,
  })
 
  removeEntitesAndPrimitiveByName('fustumPoint')
  viewer.scene.primitives.add(primitive)
  viewer.scene.primitives.add(primitiveLine)
}
// 移除实体和Primitive对象
 
function removeEntitesAndPrimitiveByName(name) {
  const entities = viewer.entities.values
  for (let i = entities.length - 1; i >= 0; i--) {
    if (entities[i].name === name) {
      viewer.entities.remove(entities[i])
    }
  }
}
const controls = {
  fov: 30,
  near: 100,
  far: 500,
  aspectRatio: 1,
  heading: 0,
  pitch: -Math.PI / 4,
  roll: 0,
 
  update: function () {
    // 更新视锥体
    const origin = Cesium.Cartesian3.fromDegrees(120, 30, 1500)
    const position = {
      heading: Cesium.Math.toRadians(controls.heading),
      pitch: controls.pitch,
      roll: controls.roll,
      orientation: Cesium.Quaternion.fromHeadingPitchRoll(
        new Cesium.HeadingPitchRoll(
          Cesium.Math.toRadians(controls.heading),
          Cesium.Math.toRadians(controls.pitch),
          Cesium.Math.toRadians(controls.roll)
        )
      ),
    }
    addFrutum(
      origin,
      position,
      controls.fov,
      controls.near,
      controls.far,
      controls.aspectRatio,
      controls.heading,
      controls.pitch,
      controls.roll
    )
  },
}
 
function initGui() {
  const gui = new dat.GUI()
  gui.add(controls, 'fov', 0, 100).onChange(controls.update)
  gui.add(controls, 'near', 1, 1500).onChange(controls.update)
  gui.add(controls, 'far', 100, 4000).onChange(controls.update)
  gui.add(controls, 'aspectRatio', 0.1, 5).onChange(controls.update)
  gui.add(controls, 'heading', -180, 180).onChange(controls.update)
  gui.add(controls, 'pitch',  -180, 180).onChange(controls.update)
  gui.add(controls, 'roll',  -180, 180).onChange(controls.update)
 
  // 设置 GUI 面板的位置
  const guiContainer = gui.domElement.parentElement
  guiContainer.style.position = 'absolute'
  guiContainer.style.top = '10px'
  guiContainer.style.right = '10px'
}
 
// 修改 addEventListener 函数
export function addEventListener() {
  initGui() // 初始化 GUI
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(120, 30, 500),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-30),
      roll: 0.0,
    },
  })
  controls.update() // 使用控制参数更新视锥体
}