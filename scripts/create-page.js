import { existsSync, mkdirSync, writeFileSync } from 'fs'; // 导入同步方法
import path from 'path';
import { fileURLToPath } from 'url';

// 解决 ESM 中 __dirname 未定义的问题
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 获取命令行传入的页面名称
const pageName = process.argv[2];
if (!pageName) {
  console.error('❌ 请输入页面名称！例如：npm run create-page [页面名]');
  process.exit(1);
}

// 页面文件夹路径（pages/[页面名]）
const pageDir = path.resolve(__dirname, '../src/pages', pageName);

// 检查文件夹是否已存在
if (existsSync(pageDir)) {
  console.error(`❌ 页面 "${pageName}" 已存在！`);
  process.exit(1);
}

// 创建文件夹（recursive: true 支持多级目录）
mkdirSync(pageDir, { recursive: true });
// 1. 生成 index.vue 模板
const vueTemplate = `
<template>
  <div class="${pageName}-container">
    <h1>${pageName} 页面</h1>
  </div>
</template>

<script setup>
// 页面逻辑
import { onMounted } from 'vue';

onMounted(() => {
  console.log('${pageName} 页面加载完成');
});
</script>

<style scoped lang="scss">
.${pageName}-container {
  padding: var(--spacing-base);
  height: 100%;
}
</style>
`.trim();

// 2. 生成 index.js 模板（用于导出组件，便于路由注册等）
const jsTemplate = `
// ${pageName} 页面导出

const component = () => import('./index.vue')

export default {
    name: '${pageName}',
    component,
    path: '/${pageName}',
    description: '${pageName}'
}

`.trim();

// 写入文件（使用同步方法）
writeFileSync(path.join(pageDir, 'index.vue'), vueTemplate);
writeFileSync(path.join(pageDir, 'index.js'), jsTemplate);

console.log(`✅ 页面 "${pageName}" 创建成功！路径：src/pages/${pageName}`);