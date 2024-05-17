<template>
  <div class="cesium-demo">
    <a-menu
      v-model:openKeys="openKeys"
      v-model:selectedKeys="selectedKeys"
      style="width: 256px"
      mode="inline"
      :items="items"
      @select="handleSelect"
    />
    <component :is="currentComponent" class="viewer-wrap" />
  </div>
</template>
<script setup>
import { computed, ref } from 'vue';
import clippingPlanes from './clippingPlanes.vue'
import planePath from './planePath.vue'

const components = {clippingPlanes, planePath}
const currentComponent = computed(() => components[selectDemo.value] || '')


const selectedKeys = ref([]);
const openKeys = ref([]);
const selectDemo = ref('')
const items = ref([
  {
    key: 'clippingPlanes',
    label: '剪切平面',
  },
  {
    key: 'planePath',
    label: '飞机轨迹',
  },
  // {
  //   key: 'sub1',
  //   label: 'Navigation Three',
  //   title: 'Navigation Three',
  //   children: [
  //     {
  //       key: '3',
  //       label: 'Option 3',
  //       title: 'Option 3',
  //     },
  //     {
  //       key: '4',
  //       label: 'Option 4',
  //       title: 'Option 4',
  //     },
  //     {
  //       key: 'sub1-2',
  //       label: 'Submenu',
  //       title: 'Submenu',
  //       children: [
  //         {
  //           key: '5',
  //           label: 'Option 5',
  //           title: 'Option 5',
  //         },
  //         {
  //           key: '6',
  //           label: 'Option 6',
  //           title: 'Option 6',
  //         },
  //       ],
  //     },
  //   ],
  // },
  // {
  //   key: 'sub2',
  //   label: 'Navigation Four',
  //   title: 'Navigation Four',
  //   children: [
  //     {
  //       key: '7',
  //       label: 'Option 7',
  //       title: 'Option 7',
  //     },
  //     {
  //       key: '8',
  //       label: 'Option 8',
  //       title: 'Option 8',
  //     },
  //     {
  //       key: '9',
  //       label: 'Option 9',
  //       title: 'Option 9',
  //     },
  //     {
  //       key: '10',
  //       label: 'Option 10',
  //       title: 'Option 10',
  //     },
  //   ],
  // },
]);
const handleSelect = ({ item, key, selectedKeys }) => {
  selectDemo.value = key
  console.log('click ', item, key, selectedKeys);
};
</script>

<style scoped>
.cesium-demo {
  display: flex;
}

.viewer-wrap {
  width: calc(100% - 256px);
  height: 100vh;
}
</style>