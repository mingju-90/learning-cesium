<template>
  <viewerVue v-bind="attributeMap" @ready="ready" />
  <div class="button-list">
    <span v-for="item of attributeList">
      {{ item.label }}
      <a-switch v-model:checked="attributeMap[item.key]" />
    </span>
  </div>
</template>

<script setup>
// 引入所需的响应式函数和钩子函数
import { ref, reactive, onMounted } from "vue";
import viewerVue from "./viewer.vue";

const attributeList = ref([
  {
    label: '全屏',
    key: 'fullscreenButton'
  },
  {
    label: 'VR',
    key: 'vrButton',
  }
])
const attributeMap = ref({
  fullscreenButton: true
})

const uri = './test.gltf'

const ready = () => {
  const position = Cesium.Cartesian3.fromDegrees(117, 31, 10);
  const entity = viewer.entities.add({
    name: uri,
    description: "<div><p>这是一个飞机！</div>", // 这是模型的描述属性，可以是html标签
    position: position,
    model: {
      uri: uri,
      minimumPixelSize: 128,
      maximumScale: 20000
    }
  });
  viewer.trackedEntity = entity
}
</script>

<style scoped>
.wrap {
  /* Your styles here */
  height: 100%;
}

#container {
  height: 100%;
}

.button-list {
  position: absolute;
  left: 10px;
  top: 10px;
  color: #fff;
}
</style>
