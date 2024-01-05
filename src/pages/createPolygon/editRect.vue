<template>
    <div v-show="toolbarWrapPosition" class="toolbar-wrap" @mouseenter="handleMouseEnter" @mouseleave="delayedClose"
        :style="toolbarWrapPosition">
        <a-button size="small" @click="moveVertex">移动</a-button>
    </div>
</template>

<script setup>
import { computed, onUnmounted, ref } from 'vue';
import { deepCopy, throttle } from '../../utils';
import { getPosition, getUtmCoords, getWgs84, pick } from '../../utils/coordinateTransformation';
import { bindEvent, saveEvnet } from '../../utils/event';

const props = defineProps({
    positions: {
        type: Array,
        required: true,
    },
    stroke: {
        type: String,
        default: 'green'
    },
})

const emits = defineEmits(['close'])
const resetEvents = saveEvnet(['mouseMove', 'leftClick'])



const entityCollection = new Cesium.CustomDataSource()
viewer.dataSources.add(entityCollection)

const _positions = ref(deepCopy(props.positions))
const polyLinePosition = computed(() => [..._positions.value, _positions.value[0]])
/** 顶点对应的数组，每个元素的index属性应该对应其索引 */
const pointList = []

/** toolbar 弹框定位数据 */
const toolbarWrapPosition = ref()
/** 保存延时关闭toolbar弹框的定时器标识 */
let hideVertexToolbarTime = null
/** 当前打开的toolbar弹框对应的顶点索引 */
let hoverVertexIndex = null

/** 移动到toolbar弹框上，取消延时关闭弹框 */
const handleMouseEnter = () => {
    clearTimeout(hideVertexToolbarTime)
    hideVertexToolbarTime = false
}
/** 延时关闭toolbar弹框 */
const delayedClose = () => {
    hideVertexToolbarTime && clearTimeout(hideVertexToolbarTime)
    hideVertexToolbarTime = setTimeout(() => {
        hoverVertexIndex = null
        hideVertexToolbarTime = null
        toolbarWrapPosition.value = null
    }, 300)
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
        zoomRect(_positions.value, vertexIndex, position)
    })
    const endSetVertexPostion = () => {
        resetEvents()
    }
    const resetEvents = saveEvnet(['mouseMove', 'leftClick'])
    bindEvent('leftClick', endSetVertexPostion)
    bindEvent('mouseMove', setVertexPostion)
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

const clearEntities = () => {
    entityCollection.entities.removeAll()
    viewer.dataSources.remove(entityCollection)
}

const euclidean_distance = (point_a, point_b) =>
  Math.sqrt(
    (point_a.longitude - point_b.longitude) ** 2 + (point_a.latitude - point_b.latitude) ** 2
  );
const vector_dot = (vector_a, vector_b) =>
  vector_a.longitude * vector_b.longitude + vector_a.latitude * vector_b.latitude;
/** 调整直角四边形, 根据移动点的坐标和索引调整直接四边形的四个点坐标 */
const zoomRect = (positions, index, point) => {
    let leftIndex,
        rightIndex,
        referenceP,
        leftP,
        rightP,
        leftVector,
        rightVector,
        leftDist,
        rightDist,
        rateLeft,
        rateRight,
        leftX,
        leftY,
        rightX,
        rightY,
        targetVector;
    const referenceIndex = (index + 2) % 4;
    leftIndex = referenceIndex === 0 ? 3 : referenceIndex - 1;
    rightIndex = (referenceIndex + 1) % 4;
    referenceP = { ...positions[referenceIndex] };
    ; ([referenceP.longitude, referenceP.latitude] = getUtmCoords(referenceP))
    leftP = positions[leftIndex];
    ; ([leftP.longitude, leftP.latitude] = getUtmCoords(leftP))
    let pointUtm = getUtmCoords(point)
    pointUtm = { longitude: pointUtm[0], latitude: [pointUtm[1]] }
    rightP = positions[rightIndex];
    ; ([rightP.longitude, rightP.latitude] = getUtmCoords(rightP))
    leftVector = {
        longitude: leftP.longitude - referenceP.longitude,
        latitude: leftP.latitude - referenceP.latitude,
    };
    rightVector = {
        longitude: rightP.longitude - referenceP.longitude,
        latitude: rightP.latitude - referenceP.latitude,
    };
    targetVector = {
        longitude: pointUtm.longitude - referenceP.longitude,
        latitude: pointUtm.latitude - referenceP.latitude,
    };
    leftDist = euclidean_distance(leftP, referenceP);
    rightDist = euclidean_distance(rightP, referenceP);
    rateLeft = vector_dot(leftVector, targetVector) / (leftDist * leftDist);
    rateRight = vector_dot(rightVector, targetVector) / (rightDist * rightDist);
    leftX = referenceP.longitude + rateLeft * leftVector.longitude;
    leftY = referenceP.latitude + rateLeft * leftVector.latitude;
    rightX = referenceP.longitude + rateRight * rightVector.longitude;
    rightY = referenceP.latitude + rateRight * rightVector.latitude;

    positions[index] = point;
    positions[leftIndex] = getWgs84([leftX, leftY])
    positions[rightIndex] = getWgs84([rightX, rightY])
};

createPolygon()
bindEvent('mouseMove', mouseMoveToVertex)

onUnmounted(resetEvents)
onUnmounted(clearEntities)
onUnmounted(() => emits('close', deepCopy(_positions.value)))
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