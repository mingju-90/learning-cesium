<template>
  <div class="wrap">
    <div class="container" ref="containerRef"></div>
  </div>
</template>

<script setup>
// 引入所需的响应式函数和钩子函数
import { ref, reactive, onMounted, watch } from "vue";
// import worker from './worker'

const containerRef = ref()

const emits = defineEmits(['ready', 'destroyed'])
const props = defineProps({
  baseLayerPicker: {  // 如果设置为false，将不会创建右上角图层按钮，切换图层图源
    type: Boolean,
    default: false
  },
  fullscreenButton: {   // 如果设置为false，将不会创建右下角全屏按钮。
    type: Boolean,
    default: false
  },
  vrButton: {   // 如果设置为false，将不会创建VR应用场景
    type: Boolean,
    default: false
  },
  geocoder: {   // 如果设置为false，将不会创建右上角查询(放大镜)按钮。
    type: Boolean,
    default: false
  },
  homeButton: {   // 如果设置为false，将不会创建右上角主页(房子)按钮。
    type: Boolean,
    default: false
  },
  infoBox: {   // 是否显示点击要素之后显示的信息,cesium中的沙盒开关
    type: Boolean,
    default: false
  },
  sceneModePicker: {   // 如果设置为false，将不会创建右上角投影方式控件(显示二三维切换按钮)。
    type: Boolean,
    default: false
  },
  selectionIndicator: {   // 获取当选定实体更改时引发的事件
    type: Boolean,
    default: false
  },
  navigationHelpButton: {   // 如果设置为false，则不会创建右上角帮助(问号)按钮。
    type: Boolean,
    default: false
  },
  navigationInstructionsInitiallyVisible: {   // 如果帮助说明最初应该是可见的，则为true；如果直到用户明确单击该按钮，则不显示该说明，否则为false。
    type: Boolean,
    default: false
  },
  timeline: {   // 如果设置为false，则不会创建正下方时间轴小部件。
    type: Boolean,
    default: false
  },
  scene3DOnly: {   // 为 true 时，每个几何实例将仅以3D渲染以节省GPU内存。
    type: Boolean,
    default: true
  },
  animation: {   // 如果设置为false，将不会创建左下角动画小部件。
    type: Boolean,
    default: false
  },
  shouldAnimate: {   // 默认true ，否则为 false 。此选项优先于设置 Viewer＃clockViewModel。
    type: Boolean,
    default: true
  },
  sceneMode: {   // 初始场景模式 1 2D模式 2 2D循环模式 3 3D模式  Cesium.SceneMode
    type: Number,
    default: 3,
    validator: (value) => [1, 2, 3].includes(value)
  },
  requestRenderMode: {   // 启用请求渲染模式，不需要渲染，节约资源吧
    type: Boolean,
    default: false
  },
})

onMounted(() => {
  initCesium()

//   const myWorker = new Worker(new URL('./worker.js', import.meta.url))
//   myWorker.postMessage('create')
});



// watch(() => props.fullscreenButton, val => {
//   const {defined} = Cesium
//   const container = viewer._element
  
//   let fullscreenContainer
//   if(defined(viewer.fullscreenButton) && !viewer.fullscreenButton.isDestroyed() && !val) {
//     // 卸载全屏按钮
//     fullscreenContainer = viewer.fullscreenButton.container
//     container?.removeChild(fullscreenContainer)
//     viewer.fullscreenButton.destroy()
//     viewer._fullscreenButton = undefined
//   }else if(!defined(viewer.fullscreenButton) || viewer.fullscreenButton.isDestroyed()) {
//     fullscreenContainer = document.createElement('div')
//     fullscreenContainer.className = 'cesium-viewer-fullscreenContainer'
//     container?.appendChild(fullscreenContainer)
//     const fullscreenButton = new Cesium.FullscreenButton(fullscreenContainer, container)
//     viewer._fullscreenButton = fullscreenButton
//   }

//   // 确保Viewer能够正确地调整大小并通知其他模块或组件
//   viewer.forceResize()
// })

// watch(() => props.vrButton, val => {
//   const {defined} = Cesium
//   let vrContainer
//   const container = viewer._element
//   if(defined(viewer.vrButton) && !viewer.vrButton.isDestroyed() && !val) {
//     vrContainer = viewer.vrButton.container
//     container?.removeChild(vrContainer)
//     viewer.vrButton.destroy()
//     viewer._vrButton = undefined
//   }else if(!defined(viewer.vrButton) || viewer.vrButton.isDestroyed()) {
//     vrContainer = document.createElement('div')
//     vrContainer.className = 'cesium-viewer-vrContainer'
//     container?.appendChild(vrContainer)
//     const vrButton = new Cesium.VRButton(vrContainer, viewer.scene, container)
//     // 这一段的作用是切换VR时，展示或者隐藏UI样式，未处理
//     const viewModelCommand = vrButton.viewModel.command
//     vrButton.viewModel._command = function (VRButtonViewModel) {
//       viewModelCommand()
//       // enableVRUI()
//     }
//     viewer._vrButton = vrButton
//     viewer.forceResize()
//   }
// })

const initCesium = () => {
  Cesium.Ion.defaultAccessToken = config.defaultAccessToken

  // 实例化地图
  /*
    用于构建应用程序的基本小部件。它将所有标准的 Cesium 小部件组合到一个可重用的包中。小部件总是可以通过使用 mixins 来扩展，它添加了对各种应用程序有用的功能。
  */
  const viewer = new Cesium.Viewer(containerRef.value, props);
  window.viewer = viewer
  emits('ready', {viewer, Cesium})
};
</script>

<style scoped>
.wrap {
  /* Your styles here */
  height: 100%;
}
.container {
  height: 100%;
}
</style>
