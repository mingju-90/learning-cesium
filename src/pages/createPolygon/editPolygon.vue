<template>
    <div v-show="toolbarWrapPosition" class="toolbar-wrap" @mouseenter="handleMouseEnter" @mouseleave="delayedClose"
        :style="toolbarWrapPosition">
        <a-button size="small" @click="moveVertex">移动</a-button>
        <a-button size="small" @click="handleDelVertex" :disabled="_positions.length <= 3">删除</a-button>
        <a-button size="small" @click="handleAddVertex">增加</a-button>
    </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { deepCopy, throttle } from '../../utils/index'
import { getPosition, pick } from '../../utils/coordinateTransformation';
import { bindEvent, saveEvnet } from '../../utils/event';
import { drawFunc, getBestPoint, getNearestPoint } from './utils';

const props = defineProps({
    positions: {
        type: Array,
        required: true,
    },
    stroke: {
        type: String,
        default: 'green'
    },
    adsorption: Boolean,  // 吸附功能
    adsorptionDistance: {   // 吸附距离
        type: Number,
        default: 5
    }
})


const emits = defineEmits(['close'])
const resetEvents = saveEvnet(['mouseMove', 'leftClick'])



const entityCollection = new Cesium.CustomDataSource()
viewer.dataSources.add(entityCollection)


const _positions = ref(deepCopy(props.positions))
const polyLinePosition = computed(() => [..._positions.value, _positions.value[0]])
/** toolbar 弹框定位数据 */
const toolbarWrapPosition = ref()
/** 顶点对应的数组，每个元素的index属性应该对应其索引 */
const pointList = []

let referenceLinesLeft = []
let referenceLinesRight = []
const referenceLineLeftPositon = ref([])
const referenceLineRightPositon = ref([])


/** 添加参考线 */
const createReferenceLines = () => {
    entityCollection.entities.add({
        polyline: {
            positions: new Cesium.CallbackProperty(() => {
                let start = referenceLineLeftPositon.value[0]
                let end = referenceLineLeftPositon.value[1]
                if (!end) return []
                return [start, end].map(({ longitude, latitude }) => Cesium.Cartesian3.fromDegrees(longitude, latitude))
            }, false),
            width: 1,
            material: new Cesium.PolylineDashMaterialProperty({
                color: Cesium.Color.fromCssColorString('yellow')
            }),
            height: 0.1
        }
    })
    entityCollection.entities.add({
        polyline: {
            positions: new Cesium.CallbackProperty(() => {
                let start = referenceLineRightPositon.value[0]
                let end = referenceLineRightPositon.value[1]
                if (!end) return []
                return [start, end].map(({ longitude, latitude }) => Cesium.Cartesian3.fromDegrees(longitude, latitude))
            }, false),
            width: 1,
            material: new Cesium.PolylineDashMaterialProperty({
                color: Cesium.Color.fromCssColorString('yellow')
            }),
            height: 0.1
        }
    })
}
createReferenceLines()
/** 创建顶点，渲染对应所以坐标 */
const createVertex = (index) => {
    const pointEntity = entityCollection.entities.add({
        position: new Cesium.CallbackProperty(() => {
            const item = _positions.value[index]
            if (!item) return null
            return Cesium.Cartesian3.fromDegrees(item.longitude, item.latitude, 0.2)
        }, false),
        point: {
            pixelSize: 10,
            color: Cesium.Color.RED,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
        },
        properties: {
            index,
            type: 'vertex'
        }
    })

    pointList.push(pointEntity)
}
const createPolygon = () => {
    entityCollection.entities.add({
        polyline: {
            positions: new Cesium.CallbackProperty(() => {
                return polyLinePosition.value.map(({ longitude, latitude }) => Cesium.Cartesian3.fromDegrees(longitude, latitude))
            }, false),
            width: 3,
            material: Cesium.Color.fromCssColorString(props.stroke),
            height: 0.1
        }
    })
    _positions.value.forEach((item, index) => createVertex(index))
}

/** 保存延时关闭toolbar弹框的定时器标识 */
let hideVertexToolbarTime = null
/** 当前打开的toolbar弹框对应的顶点索引 */
let hoverVertexIndex = null
/** 延时关闭toolbar弹框 */
const delayedClose = () => {
    hideVertexToolbarTime && clearTimeout(hideVertexToolbarTime)
    hideVertexToolbarTime = setTimeout(() => {
        hoverVertexIndex = null
        hideVertexToolbarTime = null
        toolbarWrapPosition.value = null
    }, 300)
}
/** 移动到toolbar弹框上，取消延时关闭弹框 */
const handleMouseEnter = () => {
    clearTimeout(hideVertexToolbarTime)
    hideVertexToolbarTime = false
}
/** 鼠标移动到顶点上显示toolbar弹框 */
const mouseMoveToVertex = throttle((movement) => {
    const vertexEntity = pick(movement.endPosition)
    const isVertex = vertexEntity?.properties?.getValue().type === 'vertex'
    if (!isVertex) {
        document.body.style.cursor = 'default'
        delayedClose()
        return
    }
    const vertexIndex = vertexEntity?.properties?.getValue().index
    if (hideVertexToolbarTime) {
        clearTimeout(hideVertexToolbarTime)
        hideVertexToolbarTime = false
    }
    document.body.style.cursor = 'pointer'
    if (hoverVertexIndex === vertexIndex) return
    hoverVertexIndex = vertexIndex
    const { x, y } = movement.endPosition
    toolbarWrapPosition.value = {
        left: `${x + 20}px`,
        top: `${y - 20}px`
    }
})
/** 删除当前顶点 */
const handleDelVertex = () => {
    _positions.value = _positions.value.filter((item, index) => index !== hoverVertexIndex)
    const lastVertex = pointList.pop()
    entityCollection.entities.remove(lastVertex)

    hoverVertexIndex = null
    hideVertexToolbarTime = null
    toolbarWrapPosition.value = null
}

const moveVertex = () => {
    // 当前顶点索引
    const vertexIndex = hoverVertexIndex
    // 重置toolbar信息
    hoverVertexIndex = null
    hideVertexToolbarTime = null
    toolbarWrapPosition.value = null

    const setVertexPostion = throttle(movement => {
        const position = getPosition(movement.endPosition)
        _positions.value[vertexIndex] = position

        if (referenceLineLeftPositon.value.length) {
            const data = getBestPoint(referenceLineLeftPositon.value[0], referenceLinesLeft, position)
            referenceLineLeftPositon.value[1] = data
            // 开启吸附功能
            if (props.adsorption) _positions.value[vertexIndex] = getNearestPoint(referenceLineLeftPositon.value[0], data, position, props.adsorptionDistance)
        }
        if (referenceLineRightPositon.value.length) {
            const data = getBestPoint(referenceLineRightPositon.value[0], referenceLinesRight, position)
            referenceLineRightPositon.value[1] = data
            // 开启吸附功能
            if (props.adsorption && JSON.stringify(_positions.value[vertexIndex]) === JSON.stringify(position)) _positions.value[vertexIndex] = getNearestPoint(referenceLineRightPositon.value[0], data, position, props.adsorptionDistance)
        }

    })
    const endSetVertexPostion = () => {
        resetEvents()
        referenceLinesLeft = []
        referenceLinesRight = []
        referenceLineLeftPositon.value = []
        referenceLineRightPositon.value = []
    }
    const resetEvents = saveEvnet(['mouseMove', 'leftClick'])
    bindEvent('leftClick', endSetVertexPostion)
    bindEvent('mouseMove', setVertexPostion)

    const leftPoints = getAdjacentValues(_positions.value, vertexIndex)
    const rightPoints = getAdjacentValues(_positions.value, vertexIndex, 'right')
    referenceLinesLeft = drawFunc(...leftPoints)
    referenceLinesRight = drawFunc(...rightPoints)
    referenceLineLeftPositon.value = [leftPoints[1]]
    referenceLineRightPositon.value = [rightPoints[0]]
}

/**
 * 获取数组中相邻的两个值
 * @param {Array} arr - 输入数组
 * @param {number} index - 索引
 * @param {string} direction - 方向，'left' 或 'right'
 * @returns {Array} - 相邻的两个值
 */
const getAdjacentValues = (arr, index, direction = 'left') => {
    const length = arr.length;
    let firstIndex, secondIndex;

    if (direction === 'left') {
        firstIndex = (index - 2 + length) % length;
        secondIndex = (index - 1 + length) % length;
    } else if (direction === 'right') {
        firstIndex = (index + 1) % length;
        secondIndex = (index + 2) % length;
    } else {
        throw new Error('Invalid direction');
    }
    return [arr[firstIndex], arr[secondIndex]];
}

const handleAddVertex = () => {
    hoverVertexIndex += 1
    createVertex(_positions.value.length)
    _positions.value.splice(hoverVertexIndex, 0, _positions.value[hoverVertexIndex - 1])
    moveVertex()
}

bindEvent('mouseMove', mouseMoveToVertex)

onMounted(createPolygon)

onUnmounted(resetEvents)
onUnmounted(() => emits('close', deepCopy(_positions.value)))
onUnmounted(() => {
    entityCollection.entities.removeAll()
    viewer.dataSources.remove(entityCollection)
})
</script>

<style scoped>
.toolbar-wrap {
    position: absolute;
    border: 1px solid #f0f0f0;
    background: #fff;
    border-radius: 2px;
    padding: 12px;
    display: flex;
    gap: 8px;
}
</style>