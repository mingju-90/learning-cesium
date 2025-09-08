<template>
    <div></div>
</template>

<script setup>
import { inject, onBeforeUnmount } from 'vue'
const props = defineProps({
    // 图层类型：satellite(卫星影像)、annotation(注记)
    type: {
        required: true,
        validator: (value) => ['satellite', 'annotation'].includes(value),
        default: 'satellite'
    },
})
const webKey = '0387f2eabe7fbbe6ba8d86f2c2b2f2b7';
const viewer = inject('viewer')
if (!viewer.value) {
    console.error('天地图组件需要通过provide提供viewer实例');
}

let imageryLayer = null


const removeLayer = () => {
    if (!imageryLayer || !viewer.value.imageryLayers?.length) return
    if (!viewer.value.imageryLayers._layers.some(item => item === imageryLayer)) return console.error('没有对应图层')
    viewer.value.imageryLayers.remove(imageryLayer)
    imageryLayer = null
}
const loadSatellite = () => {
    removeLayer()
    let tdtUrl = 'https://t{s}.tianditu.gov.cn/';
    let subdomains = ['0', '1', '2', '3', '4', '5', '6', '7'];

    //影像底图
    const t = new Cesium.UrlTemplateImageryProvider({
        url: tdtUrl + 'DataServer?T=img_w&x={x}&y={y}&l={z}&tk=' + webKey,
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        subdomains: subdomains,
        maximumLevel: 18
    });
    imageryLayer = viewer.value.imageryLayers.addImageryProvider(t);
}

const loadAnnotation = () => {
    removeLayer()
    const t = new Cesium.WebMapTileServiceImageryProvider({
        url: 'http://t0.tianditu.gov.cn/cva_w/wmts?tk=' + webKey,
        layer: 'cva', // 注记图层
        style: 'default',
        format: 'tiles',
        tileMatrixSetID: 'w',
        maximumLevel: 18 // 最大层级
    });
    imageryLayer = viewer.value.imageryLayers.addImageryProvider(t);
   
}


const loadMap = () => {
    if (props.type === 'satellite') loadSatellite()
    else if (props.type === 'annotation') loadAnnotation()
}

loadMap()


onBeforeUnmount(() => {
    removeLayer()
})
</script>