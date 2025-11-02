<template>
  <div class="droneView-container">
    <h1>droneView 页面</h1>
  </div>
</template>

<script setup>
// 页面逻辑
import { onMounted } from 'vue';

onMounted(() => {
  console.log('droneView 页面加载完成');
});
</script>

<style scoped lang="scss">
.droneView-container {
  padding: var(--spacing-base);
  height: 100%;
}
</style>