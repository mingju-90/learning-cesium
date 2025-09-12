<template>
  <div>
   
    <div id="data-output" v-if="rectangle">
      <h3>当前矩形数据:</h3>
      <p>
        左: {{ rectangle.left.toFixed(2) }}, 上: {{ rectangle.top.toFixed(2) }}, 宽: {{ rectangle.width.toFixed(2) }}, 高: {{ rectangle.height.toFixed(2) }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, provide, onMounted, onUnmounted, inject } from 'vue';
import * as fabric from 'fabric';
import { createRect } from './utils';

// Emits 定义
const emit = defineEmits(['end']);

// 状态管理
const isDrawing = ref(false); // 是否处于绘制模式
const startPoint = ref(null); // 矩形起点
const currentRect = ref(null); // 当前绘制的矩形
const rectangle = ref(null); // 存储矩形数据


const canvas = inject('canvas');
// 初始化 Fabric.js 画布
onMounted(() => {
  
  canvas.value.on('mouse:down', onMouseDown);
  canvas.value.on('mouse:move', onMouseMove);
  canvas.value.on('mouse:up', onMouseUp);
});

// 清理事件
onUnmounted(() => {
  canvas.value.off('mouse:down', onMouseDown);
  canvas.value.off('mouse:move', onMouseMove);
  canvas.value.off('mouse:up', onMouseUp);
  exitDrawing()
});

// 开始绘制
const startDrawing = () => {
  isDrawing.value = true;
  canvas.value.defaultCursor = 'crosshair';
  canvas.value.discardActiveObject();
  canvas.value.requestRenderAll();
};

// 取消绘制
const exitDrawing = () => {
  isDrawing.value = false;
  canvas.value.defaultCursor = 'default';
  if (currentRect.value) {
    canvas.value.remove(currentRect.value);
    currentRect.value = null;
    rectangle.value = null;
  }
  canvas.value.requestRenderAll();
};

// 鼠标按下：开始绘制矩形
const onMouseDown = (o) => {
  if (!isDrawing.value) return;

  const pointer = canvas.value.getPointer(o.e);
  startPoint.value = { x: pointer.x, y: pointer.y };

  currentRect.value = new fabric.Rect({
    left: startPoint.value.x,
    top: startPoint.value.y,
    width: 0,
    height: 0,
    fill: 'rgba(255, 0, 0, 0.2)',
    stroke: 'red',
    strokeWidth: 2,
    selectable: false,
  });

  canvas.value.add(currentRect.value);
};

// 鼠标移动：更新矩形大小
const onMouseMove = (o) => {
  if (!isDrawing.value || !currentRect.value) return;

  const pointer = canvas.value.getPointer(o.e);
  const width = pointer.x - startPoint.value.x;
  const height = pointer.y - startPoint.value.y;

  currentRect.value.set({
    left: width < 0 ? startPoint.value.x + width : startPoint.value.x,
    top: height < 0 ? startPoint.value.y + height : startPoint.value.y,
    width: Math.abs(width),
    height: Math.abs(height),
  });

  canvas.value.renderAll();
};

// 鼠标释放：完成矩形绘制并触发 end 事件
const onMouseUp = () => {
  if (!isDrawing.value || !currentRect.value) return;

  const rectData = {
    left: currentRect.value.left,
    top: currentRect.value.top,
    width: currentRect.value.width * currentRect.value.scaleX,
    height: currentRect.value.height * currentRect.value.scaleY,
  };

  rectangle.value = rectData; // 更新本地矩形数据
  emit('end', createRect(rectData)); // 触发 end 事件

  canvas.value.remove(currentRect.value); // 从画布移除对象
  currentRect.value = null; // 清空引用

  canvas.value.requestRenderAll();
};

startDrawing()
</script>

<style scoped>
#data-output {
  margin: 10px;
  padding: 10px;
  border: 1px solid #ccc;
  max-height: 200px;
  overflow-y: auto;
}
button {
  margin: 5px;
  padding: 8px 16px;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>