<template>
  <div class="wrap">
    <div id="container"></div>
  </div>
</template>

<script setup>
// 引入所需的响应式函数和钩子函数
import { ref, reactive, onMounted } from "vue";
onMounted(() => {
    initCesium()
});

const initCesium = () => {
  Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxYjQ0NWI2Yi0zOTFiLTRkYzAtODFlNS1iNTQ2NzAwNTI5N2QiLCJpZCI6MTgyMTk3LCJpYXQiOjE3MDE1OTQ3OTJ9.pTuIpfzcMZB-z301bqrHrLPk8PXiVFPfptLFa5E1bFM"

  // 实例化地图
  /*
      用于构建应用程序的基本小部件。它将所有标准的 Cesium 小部件组合到一个可重用的包中。小部件总是可以通过使用 mixins 来扩展，它添加了对各种应用程序有用的功能。
      */
  const viewer = new Cesium.Viewer("container", {
    // terrainProvider: Cesium.createWorldTerrain(),
    baseLayerPicker: false, // 如果设置为false，将不会创建右上角图层按钮。
    fullscreenButton: false, // 如果设置为false，将不会创建右下角全屏按钮。
    vrButton: false, // 如果设置为false，将不会创建VR应用场景
    geocoder: true, // 如果设置为false，将不会创建右上角查询(放大镜)按钮。
    homeButton: true, // 如果设置为false，将不会创建右上角主页(房子)按钮。
    infoBox: false, // 是否显示点击要素之后显示的信息,cesium中的沙盒开关
    sceneModePicker: false, // 如果设置为false，将不会创建右上角投影方式控件(显示二三维切换按钮)。
    selectionIndicator: true, // 获取当选定实体更改时引发的事件。
    navigationHelpButton: false, // 如果设置为false，则不会创建右上角帮助(问号)按钮。
    navigationInstructionsInitiallyVisible: true, // 如果帮助说明最初应该是可见的，则为true；如果直到用户明确单击该按钮，则不显示该说明，否则为false。
    timeline: false, // 如果设置为false，则不会创建正下方时间轴小部件。
    scene3DOnly: true, // 为 true 时，每个几何实例将仅以3D渲染以节省GPU内存。
    animation: false, // 如果设置为false，将不会创建左下角动画小部件。
    shouldAnimate: false, // 默认true ，否则为 false 。此选项优先于设置 Viewer＃clockViewModel 。
    // ps. Viewer＃clockViewModel 是用于控制当前时间的时钟视图模型。我们这里用不到时钟，就把shouldAnimate设为false
    sceneMode: 3, // 初始场景模式 1 2D模式 2 2D循环模式 3 3D模式  Cesium.SceneMode
    requestRenderMode: false, // 启用请求渲染模式，不需要渲染，节约资源吧
    // fullscreenElement: document.body, // 全屏时渲染的HTML元素 暂时没发现用处，虽然我关闭了全屏按钮，但是键盘按F11 浏览器也还是会进入全屏
    // 配置地图源
    // imageryProvider: new Cesium.createWorldImagery({
    //   url: "https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
    // }),
  });
  window.viewer = viewer
};
</script>

<style scoped>
.wrap {
  /* Your styles here */
}
</style>
