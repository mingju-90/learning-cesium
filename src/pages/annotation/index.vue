<template>
  <div>
    <div>
      <el-button @click="handleEditMode">编辑</el-button>
      <el-button @click="handleDrawingMode('rect')">绘制矩形</el-button>
      <el-button @click="handleDrawingMode('polygon')">绘制多边形</el-button>
      <el-button @click="handleUndo" :disabled="!canUndo">撤销</el-button>
      <el-button @click="handleRedo" :disabled="!canRedo">恢复</el-button>
      <el-button @click="handleDel" :disabled="selectedIndex == undefined">删除</el-button>
      <el-button @click="handleExport">导出</el-button>
    </div>
    <div id="canvas-container" ref="container">
      <canvas id="canvas"></canvas>
    </div>
    <template v-if="canvas">
      <template v-for="(item, index) of rectangleList" :key="item.uid">
        <rectangleVue v-if="item.type == 'rect'" v-model:value="rectangleList[index]" :edit="editMode" :index="index"
          @select="handleSelect" />
        <Polygon v-else-if="item.type === 'polygon'" v-model:value="rectangleList[index]" :edit="editMode"
          :index="index" @select="handleSelect" />
      </template>
      <RectangleAnnotator v-if="drawType === 'rect'" @end="addRect" />
      <PolygonAnnotator v-if="drawType === 'polygon'" @end="addRect" />

    </template>

  </div>
</template>

<script setup>
import { ref, provide, shallowRef, onMounted, watch, onUnmounted, computed, nextTick } from 'vue';
import * as fabric from 'fabric';
import rectangleVue from './rectangle.vue';
import RectangleAnnotator from './RectangleAnnotator.vue';
import PolygonAnnotator from './PolygonAnnotator.vue';
import Polygon from './Polygon.vue';
const selectedIndex = ref(undefined); // 选中的索引


const drawType = ref('')
const dragMode = ref(false)

// Undo/Redo 栈管理
const undoStack = ref([]); // 撤销栈
const redoStack = ref([]); // 恢复栈
const historyLimit = 20; // 限制历史记录数量

// 保存状态到栈
const saveState = (val) => {
  const state = JSON.parse(JSON.stringify(val)); // 深拷贝当前状态

  undoStack.value.push(state);
  if (undoStack.value.length > historyLimit) {
    undoStack.value.shift(); // 移除最早的历史记录
  }
  redoStack.value = []; // 清空恢复栈
};

const container = ref()

const canvas = shallowRef()

// 计算是否可撤销/恢复
const canUndo = computed(() => undoStack.value.length > 0);
const canRedo = computed(() => redoStack.value.length > 0);


provide('canvas', canvas); // 注入 canvas 实例 canvas.value 访问

const rectangleList = ref([])

const addRect = (data) => {
  rectangleList.value.push(data)
}

const editMode = ref(true);

const handleEditMode = () => {
  editMode.value = true
  drawType.value = ''
}


const handleDrawingMode = (type) => {
  editMode.value = false
  drawType.value = type
}
const handleSelect = index => {
  selectedIndex.value = index
}

const handleDel = () => {
  rectangleList.value.splice(selectedIndex.value, 1)
  onSelectionCleared()
}

// 撤销操作
const handleUndo = () => {
  if (canUndo.value) {
    let previousState = undoStack.value.pop()
    redoStack.value.push(JSON.parse(JSON.stringify(rectangleList.value))); // 保存当前状态到恢复栈
    rectangleList.value = previousState;
    // 清空选中
    selectedIndex.value = undefined;
    canvas.value?.discardActiveObject();
    canvas.value?.requestRenderAll();
  }
};

// 恢复操作
const handleRedo = () => {
  if (canRedo.value) {
    const nextState = redoStack.value.pop();
    undoStack.value.push(JSON.parse(JSON.stringify(rectangleList.value))); // 保存当前状态到撤销栈
    rectangleList.value = nextState;
    // 清空选中
    selectedIndex.value = undefined;
    canvas.value?.discardActiveObject();
    canvas.value?.requestRenderAll();
  }
};




watch(() => editMode.value, val => {
  canvas.value.selection = val
  canvas.value.discardActiveObject();
  canvas.value.requestRenderAll();
})


let oldVal
// 初始化时保存初始状态
watch(rectangleList.value, (val) => {
  // 延迟执行，确保更新后保存
  oldVal?.length && saveState(oldVal);
  oldVal = JSON.parse(JSON.stringify(val))
}, { deep: true, immediate: true });

// 监听对象取消选中
const onSelectionCleared = () => {
  selectedIndex.value = undefined
};



const add = () => {
  // 支持鼠标滚轮缩放
  canvas.value.on('mouse:wheel', (opt) => {
    let delta = opt.e.deltaY;
    let zoom = canvas.value.getZoom();
    zoom *= 0.999 ** delta;
    zoom = Math.max(0.5, Math.min(zoom, 7));
    canvas.value.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
    opt.e.preventDefault();
    opt.e.stopPropagation();
  });
  // 拖拽画布功能
  let isDragging = false;
  let lastPosX = 0;
  let lastPosY = 0;
  canvas.value.on('mouse:down', (opt) => {
    if (editMode.value && !opt.target) {
      isDragging = true;
      lastPosX = opt.e.clientX;
      lastPosY = opt.e.clientY;
      canvas.value.setCursor('grabbing'); // 设置拖拽时的鼠标样式
    }
  });

  canvas.value.on('mouse:move', (opt) => {
    if (editMode.value && isDragging) {
      const e = opt.e;
      const vpt = canvas.value.viewportTransform;
      vpt[4] += e.clientX - lastPosX;
      vpt[5] += e.clientY - lastPosY;
      canvas.value.setViewportTransform(vpt);
      lastPosX = e.clientX;
      lastPosY = e.clientY;
      canvas.value.requestRenderAll();
    }
  });

  canvas.value.on('mouse:up', () => {
    if (editMode.value) {
      isDragging = false;
      canvas.value.setCursor('grab'); // 恢复拖拽模式的鼠标样式
    }
  });
}

// 导出功能
const handleExport = () => {
  if (!canvas.value || !canvas.value.backgroundImage) return;

  // 保存当前状态
  const originalWidth = canvas.value.getWidth();
  const originalHeight = canvas.value.getHeight();
  const originalViewport = [...canvas.value.viewportTransform];
  const originalZoom = canvas.value.getZoom();

  // 获取背景图尺寸
  const bgImage = canvas.value.backgroundImage;
  const bgWidth = bgImage.width * bgImage.scaleX;
  const bgHeight = bgImage.height * bgImage.scaleY;

  // 设置画布为背景图尺寸
  canvas.value.setDimensions({ width: bgWidth, height: bgHeight });

  // 重置 viewportTransform 以显示整个背景图
  canvas.value.setViewportTransform([1, 0, 0, 1, 0, 0]); // 无缩放、无平移
  canvas.value.setZoom(1); // 重置缩放

  // 渲染画布
  canvas.value.renderAll();

  // 导出画布为图片
  const dataURL = canvas.value.toDataURL({
    format: 'png',
    quality: 1,
    multiplier: 1, // 导出时使用原始分辨率
  });

  // 恢复原始状态
  canvas.value.setDimensions({ width: originalWidth, height: originalHeight });
  canvas.value.setViewportTransform(originalViewport);
  canvas.value.setZoom(originalZoom);
  canvas.value.renderAll();

  // 触发下载
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = 'canvas_export.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


onMounted(async () => {
  const img = await fabric.FabricImage.fromURL('http://112.64.193.138:9000/xinlan//imageData/2025/09/11/1757574807197.png', { crossOrigin: 'anonymous' });
  const { width, height } = container.value.getBoundingClientRect()
  canvas.value = new fabric.Canvas('canvas', {
    width,
    height,
  });
  canvas.value.backgroundImage = img;
  canvas.value.selection = false
  canvas.value.on('selection:cleared', onSelectionCleared);
  canvas.value.requestRenderAll();
  add()
  fabric.Object.prototype.setControlsVisibility({
    mtr: false,
  })
})

onUnmounted(() => {
  canvas.value.off('selection:cleared', onSelectionCleared);
})
</script>

<style>
#canvas-container {
  border: 1px solid #ccc;
  margin: 10px;
  height: 500px;
}

#canvas {
  width: 100%;
  height: 100%;
}
</style>