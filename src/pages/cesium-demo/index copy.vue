<template>
  <viewerVue v-bind="attributeMap" @ready="ready">
    <aaa />
  </viewerVue>

</template>

<script setup>
// 引入所需的响应式函数和钩子函数
import { ref, reactive, onMounted } from "vue";
import viewerVue from "./viewer.vue";
import aaa from './aaa.vue'

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


const ready = () => {
  
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
