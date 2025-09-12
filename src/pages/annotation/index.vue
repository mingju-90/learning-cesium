<template>
  <div>
    <div>
      <el-button @click="handleEditMode">编辑</el-button>
      <el-button @click="handleDrawingMode('rect')">绘制矩形</el-button>
      <el-button @click="handleDrawingMode('polygon')">绘制多边形</el-button>
      <el-button @click="handleUndo" :disabled="!canUndo">撤销</el-button>
      <el-button @click="handleRedo" :disabled="!canRedo">恢复</el-button>
      <el-button @click="handleDel" :disabled="selectedIndex == undefined">删除</el-button>
    </div>
    <div id="canvas-container">
      <canvas id="canvas" style="width: 100%;"></canvas>
    </div>
    <template v-if="canvas">
      <template v-for="(item, index) of rectangleList" :key="item.uid">
        <rectangleVue v-if="item.type == 'rect'" v-model:value="rectangleList[index]" :edit="editMode" :index="index" @select="handleSelect" />
        <Polygon v-else-if="item.type === 'polygon'" v-model:value="rectangleList[index]" :edit="editMode" :index="index" @select="handleSelect"/>
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

// Undo/Redo 栈管理
const undoStack = ref([]); // 撤销栈
const redoStack = ref([]); // 恢复栈
const historyLimit = 20; // 限制历史记录数量

// 保存状态到栈
const saveState = () => {
  const state = JSON.parse(JSON.stringify(rectangleList.value)); // 深拷贝当前状态

  undoStack.value.push(state);
  if (undoStack.value.length > historyLimit) {
    undoStack.value.shift(); // 移除最早的历史记录
  }
  redoStack.value = []; // 清空恢复栈
};



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
    while (JSON.stringify(previousState) === JSON.stringify(rectangleList.value)) {
      previousState = undoStack.value.pop();
    }
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

// 初始化时保存初始状态
watch(rectangleList.value, () => {
  // 延迟执行，确保更新后保存
  nextTick(() => {
    saveState();
  });
}, { deep: true, immediate: true });

// 监听对象取消选中
const onSelectionCleared = () => {
  selectedIndex.value = undefined
};


onMounted(async () => {
  const img = await fabric.FabricImage.fromURL('http://112.64.193.138:9000/xinlan//imageData/2025/09/11/1757574807197.png', { crossOrigin: 'anonymous' });
  canvas.value = new fabric.Canvas('canvas', { selection: true, width: img.width, height: img.height });
  canvas.value.backgroundImage = img;
  canvas.value.selection = false
  canvas.value.on('selection:cleared', onSelectionCleared);
  canvas.value.requestRenderAll();
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
}
</style>