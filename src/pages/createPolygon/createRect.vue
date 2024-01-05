<template>
    <div class="wrap">
        <a-input-number class="input-number-point" ref="inputNumber" v-model:value="distance" @keydown="handleInputDown"
            @pressEnter="pressEnter" autofocus :controls="false" />
    </div>
</template>

<script setup>
import { computed, onUnmounted, ref } from 'vue';
import { bindEvent, saveEvnet } from '../../utils/event';
import { getDistance, getInterpolated, getPosition } from '../../utils/coordinateTransformation';
import { drawFunc, getBestPoint, getNearestPoint, getPoint } from './utils'

const props = defineProps({
    fill: {
        type: String,
        default: 'green'
    },
    stroke: {
        type: String,
        default: 'red'
    },
    adsorption: Boolean,  // 吸附功能
    adsorptionDistance: {   // 吸附距离
        type: Number,
        default: 5
    }
})
const emits = defineEmits(['end', 'cancel'])
const inputNumber = ref()

const entityCollection = new Cesium.CustomDataSource()
viewer.dataSources.add(entityCollection)

const resetEvents = saveEvnet(['leftClick', 'mouseMove', 'rightClick'])

/** 多边形的坐标 */
const rectPosition = ref([])
/** 鼠标移动坐标 */
const mousePosition = ref(null)

/** 参考线坐标 */
const referenceLines = ref([])
const referenceLinePositon = ref([])

/** 添加参考线 */
const createReferenceLines = () => {
    entityCollection.entities.add({
        polyline: {
            positions: new Cesium.CallbackProperty(() => {
                let start = referenceLinePositon.value[0]
                let end = referenceLinePositon.value[1]
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

/** 获取矩形第三第四个点的坐标 */
const getRectPoints = () => {
    const point1 = rectPosition.value[0]
    const point2 = rectPosition.value[1]
    const point3 = mousePosition.value
    const point4 = {
        longitude: point3.longitude - point2.longitude + point1.longitude,
        latitude: point3.latitude - point2.latitude + point1.latitude
    }
    return [point3, point4]
}
const polyLinePosition = computed(() => {
    if (!rectPosition.value.length) return []
    if (rectPosition.value.length === 1) return [...rectPosition.value, mousePosition.value, rectPosition.value[0]]
    return [...rectPosition.value, ...getRectPoints(), rectPosition.value[0]]
})

let isMouseMovePoint = true
let temporaryDistance = 0
/**
 * 输入框按下按键的时候全选文本，就不需要挨个删除数字
 */
const handleInputDown = () => {
    if (!isMouseMovePoint) return
    const inputEl = document.querySelector('.input-number-point input')
    inputEl.select()
    isMouseMovePoint = false
}
const distance = computed({
    get: () => {
        if (!mousePosition.value) return null
        if (!isMouseMovePoint) isMouseMovePoint = true
        return getDistance(rectPosition.value[rectPosition.value.length - 1], mousePosition.value)
    },
    set: (val) => temporaryDistance = val
})

const pressEnter = () => {
    const position = getInterpolated(rectPosition.value[rectPosition.value.length - 1], mousePosition.value, temporaryDistance)
    mousePosition.value = position
    if(rectPosition.value.length === 1) {
        rectPosition.value.push(position)
    }else if(rectPosition.value.length > 1) {
        rectPosition.value.push(...getRectPoints())
        emits('end', JSON.parse(JSON.stringify(rectPosition.value)))
    }
}

/** 添加点 */
const leftClickFn = (movement) => {
    const position = getPosition(movement.position)

    if (!mousePosition.value) {
        // 第一次点击，新建多边形，鼠标位置默认值设置为第一个点
        mousePosition.value = { ...position }
        createPolygon()
        bindEvent('mouseMove', mouseMoveFn)
        const data = drawFunc(null, position, 1000)
        referenceLines.value = data
        referenceLinePositon.value = [position]
    } else if (referenceLines.value.length) {
        referenceLines.value = []
        referenceLinePositon.value = []
    }
    if (rectPosition.value.length > 1) {
        rectPosition.value.push(...getRectPoints())
        emits('end', JSON.parse(JSON.stringify(rectPosition.value)))
        return
    }
    rectPosition.value.push({ ...mousePosition.value })
}

const mouseMoveFn = (movement) => {
    inputNumber.value?.focus()
    const position = getPosition(movement.endPosition)
    if (rectPosition.value.length < 2) {
        mousePosition.value = position
        if (!referenceLines.value.length) return
        // 只有一个点的时候，矩形才开启参考线功能
        const data = getBestPoint(referenceLinePositon.value[0], referenceLines.value, position)
        referenceLinePositon.value[1] = data
        // 开启吸附功能
        if (props.adsorption) mousePosition.value = getNearestPoint(referenceLinePositon.value[0], data, position, props.adsorptionDistance)
        return
    }
    mousePosition.value = getPoint(rectPosition.value[0], rectPosition.value[1], position)
    if (!referenceLines.value.length) return

    
}

const createPolygon = () => {
    entityCollection.entities.add({
        polyline: {
            positions: new Cesium.CallbackProperty(() => polyLinePosition.value.map(({ longitude, latitude }) => Cesium.Cartesian3.fromDegrees(longitude, latitude)), false),
            width: 3,
            material: Cesium.Color.fromCssColorString(props.stroke),
            height: 0.1
        }
    })
}


const clearEntities = () => {
    entityCollection.entities.removeAll()
    viewer.dataSources.remove(entityCollection)
}

bindEvent('leftClick', leftClickFn)

onUnmounted(clearEntities)
onUnmounted(resetEvents)
</script>

<style scoped>
.wrap {
    position: absolute;
    left: 10px;
    bottom: 10px;
}
</style>
