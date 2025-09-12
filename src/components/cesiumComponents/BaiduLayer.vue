<template>
  <div class="baidu-layer" v-if="isLoaded"></div>
</template>

<script setup>
import { inject, onMounted, onUnmounted, ref, watch } from 'vue';
import * as Cesium from 'cesium';

// 注入 Cesium Viewer 实例
const viewer = inject('viewer.value');
if (!viewer.value) {
  console.error('百度图层组件需要通过 provide 提供 viewer 实例');
}

// 组件属性
const props = defineProps({
  // 图层类型：normal(普通)、satellite(卫星)、labels(标签)
  type: {
    type: String,
    default: 'normal',
    validator: (v) => ['normal', 'satellite', 'labels'].includes(v)
  },
  visible: {
    type: Boolean,
    default: true
  },
  zIndex: {
    type: Number,
    default: 18
  },
  // 百度地图密钥（需自行申请）
  ak: {
    type: String,
    required: true,
    default: 'E4805d16520de693a3fe707cdc962045'
  }
});

// 图层实例引用
const imageryLayer = ref(null);
const isLoaded = ref(false);

// 百度地图瓦片地址配置
const getBaiduUrl = () => {
  const subdomains = ['0', '1', '2', '3', '4', '5', '6', '7'];
  const subdomain = subdomains[Math.floor(Math.random() * subdomains.length)];
  
  // 百度使用BD09坐标，需要特殊处理
  switch (props.type) {
    case 'satellite':
      return `http://shangetu${subdomain}.map.bdimg.com/it/u=x={x};y={y};z={z};v=009;type=sate&fm=46&udt=20220627&ak=${props.ak}`;
    case 'labels':
      return `http://online${subdomain}.map.bdimg.com/tile/?qt=tile&x={x}&y={y}&z={z}&styles=pl&scaler=1&udt=20220627&ak=${props.ak}`;
    default: // 普通地图
      return `http://online${subdomain}.map.bdimg.com/tile/?qt=tile&x={x}&y={y}&z={z}&styles=sl&scaler=1&udt=20220627&ak=${props.ak}`;
  }
};

// 创建图层
const createLayer = () => {
  if (!viewer.value.value) return null;

  // 移除已有图层
  if (imageryLayer.value) {
    viewer.value.value.imageryLayers.remove(imageryLayer.value, true);
  }

  // 百度地图使用的是BD09坐标系，需要自定义投影转换
  const provider = new Cesium.UrlTemplateImageryProvider({
    url: getBaiduUrl(),
    tilingScheme: new Cesium.WebMercatorTilingScheme(),
    maximumLevel: 19,
    minimumLevel: 1,
    credit: '百度地图'
  });

  // 添加到地图并返回图层实例
  const layer = viewer.value.value.imageryLayers.addImageryProvider(provider);
  layer.visible = props.visible;
  layer.zIndex = props.zIndex;
  return layer;
};

// 初始化图层
onMounted(() => {
  if (viewer.value.value) {
    imageryLayer.value = createLayer();
    isLoaded.value = !!imageryLayer.value;
  }
});

// 监听属性变化
watch(
  [() => props.type, () => props.visible, () => props.zIndex, () => props.ak],
  () => {
    if (viewer.value.value) {
      imageryLayer.value = createLayer();
      isLoaded.value = !!imageryLayer.value;
    }
  }
);

// 组件销毁时移除图层
onUnmounted(() => {
  if (viewer.value.value && imageryLayer.value) {
    viewer.value.value.imageryLayers.remove(imageryLayer.value, true);
    imageryLayer.value = null;
    isLoaded.value = false;
  }
});
</script>

<style scoped>
.baidu-layer {
  display: none;
}
</style>
    