<template>
    <div id="data-output">
        <h3>矩形数据:</h3>
        <p v-if="rectangle">
            矩形: 左: {{ rectangle.left.toFixed(2) }}, 上: {{ rectangle.top.toFixed(2) }}, 宽: {{ rectangle.width.toFixed(2)
            }}, 高: {{ rectangle.height.toFixed(2) }}
        </p>
        <p v-else>无矩形数据</p>
    </div>
</template>

<script setup>
import { ref, inject, watch, onMounted, onUnmounted } from 'vue';
import * as fabric from 'fabric';
import { createRect } from './utils';

// 获取父组件注入的 Fabric.js 画布实例
const canvas = inject('canvas');

// Props 定义
const props = defineProps({
    value: {
        type: Object,
        default: null, // 允许为空，空时不渲染矩形
    },
    edit: {
        type: Boolean,
        default: true,
    },
    index: Number
});

// Emits 定义
const emit = defineEmits(['update:value', 'select']);

// 状态管理
const rectangle = ref(null); // 存储矩形数据
let fabricRect = null; // Fabric.js 矩形对象

// 根据 props.value 绘制矩形
const drawRectangleFromProps = () => {
    const isSelected = fabricRect && canvas.value.getActiveObjects().includes(fabricRect)
    fabricRect && canvas.value.remove(fabricRect); // 从画布移除对象
    rectangle.value = props.value; // 同步 props.value 到本地状态
    fabricRect = null
    if (props.value) {
        fabricRect = new fabric.Rect({
            left: props.value.left,
            top: props.value.top,
            width: props.value.width,
            height: props.value.height,
            fill: 'rgba(255, 0, 0, 0.2)',
            stroke: 'red',
            strokeWidth: 2,
            selectable: props.edit,
        });
       
        canvas.value.add(fabricRect);
        isSelected && canvas.value.setActiveObject(fabricRect)
    }
    canvas.value.requestRenderAll();
};

// 更新矩形数据并触发 update:value 事件
const updateRectangle = () => {
    if (!fabricRect) return;
  
    const updatedRect = createRect({
        uid: props.value.uid,
        left: fabricRect.left,
        top: fabricRect.top,
        width: fabricRect.width * fabricRect.scaleX,
        height: fabricRect.height * fabricRect.scaleY,
    })
    rectangle.value = updatedRect;
    if(JSON.stringify(props.value) !== JSON.stringify(updatedRect)) emit('update:value', updatedRect); // 触发更新事件
    
};


// 监听对象选中
const onObjectSelected = ({selected: [target]}) => {
    if (target !== fabricRect) return;
    emit('select', props.index)
};



// 监听对象修改（拖拽或缩放）
const onObjectModified = (o) => {
    if (!props.edit || o.target !== fabricRect) return;
    updateRectangle();
};

// 监听 props.value 和 props.edit 的变化
watch(() => props.value, drawRectangleFromProps, { deep: true });
watch(() => props.edit, (newEdit) => {
    drawRectangleFromProps()
});

// 组件挂载时初始化
onMounted(() => {
    drawRectangleFromProps();
    canvas.value.on('object:modified', onObjectModified);
    canvas.value.on('selection:created', onObjectSelected);
    canvas.value.on('selection:updated', onObjectSelected);
});

// 组件卸载时清理事件
onUnmounted(() => {
    fabricRect && canvas.value.remove(fabricRect);
    canvas.value.off('object:modified', onObjectModified);
    canvas.value.off('selection:created', onObjectSelected);
    canvas.value.off('selection:updated', onObjectSelected);
    
});
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