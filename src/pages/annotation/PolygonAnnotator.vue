<template>
  <div>
    <div id="data-output" v-if="polygon">
      <h3>当前多边形数据:</h3>
      <p>点数组: {{ JSON.stringify(polygon.points) }}</p>
      <p>左: {{ polygon.left.toFixed(2) }}, 上: {{ polygon.top.toFixed(2) }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, provide, onMounted, onUnmounted, inject } from 'vue';
import * as fabric from 'fabric';
import { createPolygon } from './utils'; // 假设 utils 中有 createPolygon 函数，返回 { uid, points, left, top }

// Emits 定义
const emit = defineEmits(['end']);

// 状态管理
const isDrawing = ref(false); // 是否处于绘制模式
const points = ref([]); // 当前绘制的点数组
const currentPoly = ref(null); // 当前绘制的多边形
const polygon = ref(null); // 存储多边形数据
const startPoint = ref(null); // 起点，用于闭合检测

const canvas = inject('canvas');

// 初始化 Fabric.js 画布
onMounted(() => {
  canvas.value.on('mouse:down', onMouseDown);
  canvas.value.on('mouse:move', onMouseMove);
  canvas.value.on('mouse:dblclick', onDoubleClick); // 双击结束绘制
});

// 清理事件
onUnmounted(() => {
  canvas.value.off('mouse:down', onMouseDown);
  canvas.value.off('mouse:move', onMouseMove);
  canvas.value.off('mouse:dblclick', onDoubleClick);
  exitDrawing();
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
  if (currentPoly.value) {
    canvas.value.remove(currentPoly.value);
    currentPoly.value = null;
    polygon.value = null;
    points.value = [];
  }
  canvas.value.requestRenderAll();
};

// 鼠标按下：添加点
const onMouseDown = (o) => {
  if (!isDrawing.value) return;

  const pointer = canvas.value.getPointer(o.e);

  // 检测是否闭合（点击靠近起点）
  if (points.value.length >= 3 && startPoint.value) {
    const dist = Math.sqrt(
      Math.pow(pointer.x - startPoint.value.x, 2) +
      Math.pow(pointer.y - startPoint.value.y, 2)
    );
    if (dist < 10) { // 闭合阈值 10px
      completePolygon();
      return;
    }
  }

  // 添加新点
  points.value.push({ x: pointer.x, y: pointer.y });
  if (!startPoint.value) {
    startPoint.value = { x: pointer.x, y: pointer.y };
  }

  // 更新或创建多边形
  if (points.value.length >= 2) {
    if (currentPoly.value) {
      canvas.value.remove(currentPoly.value);
    }
    currentPoly.value = new fabric.Polygon(points.value, {
      left: Math.min(...points.value.map(p => p.x)),
      top: Math.min(...points.value.map(p => p.y)),
      fill: 'rgba(0, 255, 0, 0.2)',
      stroke: 'green',
      strokeWidth: 2,
      selectable: false,
    });
    canvas.value.add(currentPoly.value);
  }
  canvas.value.renderAll();
};

// 鼠标移动：预览多边形
const onMouseMove = (o) => {
  if (!isDrawing.value || points.value.length < 1) return;

  const pointer = canvas.value.getPointer(o.e);
  if (currentPoly.value) {
    canvas.value.remove(currentPoly.value);
  }

  // 创建临时多边形，包括鼠标当前点
  const tempPoints = [...points.value, { x: pointer.x, y: pointer.y }];
  currentPoly.value = new fabric.Polygon(tempPoints, {
    left: Math.min(...tempPoints.map(p => p.x)),
    top: Math.min(...tempPoints.map(p => p.y)),
    fill: 'rgba(0, 255, 0, 0.2)',
    stroke: 'green',
    strokeWidth: 2,
    selectable: false,
  });
  canvas.value.add(currentPoly.value);
  canvas.value.renderAll();
};

// 双击完成绘制
const onDoubleClick = () => {
  if (!isDrawing.value || points.value.length < 3) return;
  completePolygon();
};

// 完成多边形绘制
const completePolygon = () => {
  if (points.value.length < 3) return;

  const polyData = {
    points: points.value,
    left: Math.min(...points.value.map(p => p.x)),
    top: Math.min(...points.value.map(p => p.y)),
  };

  polygon.value = polyData; // 更新本地多边形数据
  emit('end', createPolygon(polyData)); // 触发 end 事件

  canvas.value.remove(currentPoly.value); // 从画布移除对象
  currentPoly.value = null;
  points.value = [];
  startPoint.value = null;
  isDrawing.value = false;
  canvas.value.defaultCursor = 'default';
  canvas.value.requestRenderAll();
};

startDrawing();
</script>

<style scoped>
#data-output {
  margin: 10px;
  padding: 10px;
  border: 1px solid #ccc;
  max-height: 200px;
  overflow-y: auto;
}
</style>