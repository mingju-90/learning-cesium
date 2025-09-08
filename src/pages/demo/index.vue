<template>
  <div class="demo-container">
    <h1>demo 页面</h1>
  </div>
</template>

<script setup>
// 页面逻辑
import { onMounted } from 'vue';

onMounted(() => {
  console.log('demo 页面加载完成');
});
</script>

<style scoped lang="scss">
.demo-container {
  padding: var(--spacing-base);
}
</style>