<template>
  <viewerVue v-bind="attributeMap"/>
  <div class="button-list" >
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
  }
])
const attributeMap = ref({
  fullscreenButton: true
})

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
