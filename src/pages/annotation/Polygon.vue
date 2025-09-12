<template>
    <div id="data-output">
        <h3>多边形数据:</h3>
        <p v-if="polygon">
            点数组: {{ JSON.stringify(polygon.points) }}
            <br>左: {{ polygon.left.toFixed(2) }}, 上: {{ polygon.top.toFixed(2) }}
        </p>
        <p v-else>无多边形数据</p>
    </div>
</template>

<script setup>
import { ref, inject, watch, onMounted, onUnmounted } from 'vue';
import * as fabric from 'fabric';
import { createPolygon } from './utils'; // 假设 utils 中有 createPolygon 函数，返回 { uid, points: [{x,y}, ...], left, top }

// 获取父组件注入的 Fabric.js 画布实例
const canvas = inject('canvas');

// Props 定义
const props = defineProps({
    value: {
        type: Object,
        default: null, // 允许为空，空时不渲染多边形
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
const polygon = ref(null); // 存储多边形数据
let fabricPoly = null; // Fabric.js 多边形对象

// 根据 props.value 绘制多边形
const drawPolygonFromProps = () => {
    const isSelected = fabricPoly && canvas.value.getActiveObjects().includes(fabricPoly);
    fabricPoly && canvas.value.remove(fabricPoly); // 从画布移除对象
    polygon.value = props.value; // 同步 props.value 到本地状态
    fabricPoly = null;

    if (props.value && props.value.points && props.value.points.length >= 3) {
        // 确保 points 是 [{x,y}, ...] 格式
        const points = props.value.points.map(p => ({ x: p.x, y: p.y }));

        fabricPoly = new fabric.Polygon(points, {
            left: props.value.left,
            top: props.value.top,
            fill: 'rgba(0, 255, 0, 0.2)',
            stroke: 'green',
            strokeWidth: 2,
            selectable: props.edit,
        });

        canvas.value.add(fabricPoly);
        if (isSelected) {
            canvas.value.setActiveObject(fabricPoly);
        }
    }
    canvas.value.requestRenderAll();
};

// 更新多边形数据并触发 update:value 事件
const updatePolygon = () => {
    if (!fabricPoly) return;

    // 获取绝对坐标的 points 数组
    const absolutePoints = fabricPoly.get('points').map(p => {
        const transformed = fabric.util.transformPoint(
            new fabric.Point(p.x, p.y),
            fabricPoly.calcTransformMatrix()
        );
        return { x: transformed.x, y: transformed.y };
    });

    const updatedPoly = createPolygon({
        uid: props.value.uid,
        points: absolutePoints,
        left: fabricPoly.left,
        top: fabricPoly.top,
    });

    polygon.value = updatedPoly;
    if (JSON.stringify(props.value) !== JSON.stringify(updatedPoly)) {
        emit('update:value', updatedPoly); // 触发更新事件
    }
};

// 监听对象选中
const onObjectSelected = (o) => {
    if (o.selected?.[0] !== fabricPoly) return;
    emit('select', props.index);
};

// 监听对象修改（拖拽或缩放）
const onObjectModified = (o) => {
    if (!props.edit || o.target !== fabricPoly) return;
    updatePolygon();
};

// 监听 props.value 和 props.edit 的变化
watch(() => props.value, drawPolygonFromProps, { deep: true });
watch(() => props.edit, () => {
    drawPolygonFromProps();
});

// 组件挂载时初始化
onMounted(() => {
    drawPolygonFromProps();
    canvas.value.on('object:modified', onObjectModified);
    canvas.value.on('selection:created', onObjectSelected);
    canvas.value.on('selection:updated', onObjectSelected);
});

// 组件卸载时清理事件
onUnmounted(() => {
    fabricPoly && canvas.value.remove(fabricPoly);
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