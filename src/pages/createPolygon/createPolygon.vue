<template>
    <div class="wrap">
        <a-input-number class="input-number-point" ref="inputNumber" v-model:value="distance" @keydown="handleInputDown"
            @pressEnter="pressEnter" autofocus :controls="false" />
    </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { saveEvnet, bindEvent } from '../../utils/event'
import { getPosition, getDistance, getInterpolated, getUtmCoords } from '../../utils/coordinateTransformation'
import { drawFunc, getBestPoint, getNearestPoint } from './utils';



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


/** 多边形的坐标 */
const polygonPosition = ref([])
const mousePosition = ref(null)
/** 多边形边框坐标数据 */
const polyLinePosition = computed(() => {
    if (!polygonPosition.value.length) return []
    return [...polygonPosition.value, mousePosition.value, polygonPosition.value[0]]
})
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



watch(() => polygonPosition.value.length, (val) => {
    if (val < 1) return
    const startPoint = polygonPosition.value[polygonPosition.value.length - 2]
    const endPoint = polygonPosition.value[polygonPosition.value.length - 1]
    const data = drawFunc(startPoint, endPoint, 1000)
    referenceLines.value = data
    referenceLinePositon.value = [endPoint]
})

let temporaryDistance = 0
let isMouseMovePoint = true
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
        return getDistance(polygonPosition.value[polygonPosition.value.length - 1], mousePosition.value)
    },
    set: (val) => {
        temporaryDistance = val
    }
})

const pressEnter = () => {
    const position = getInterpolated(polygonPosition.value[polygonPosition.value.length - 1], mousePosition.value, temporaryDistance)
    polygonPosition.value.push(position)
}



let isClick = false
/** 添加点 */
const leftClickFn = (movement) => {
    if (isClick) return
    isClick = true
    setTimeout(() => {
        isClick = false
    }, 300);
    const position = getPosition(movement.position)
    // polygonPosition.value.push(position)
    if (!mousePosition.value) {
        // 第一次点击，新建多边形，鼠标位置默认值设置为第一个点
        mousePosition.value = { ...position }
        createPolygon()
        bindEvent('mouseMove', mouseMoveFn)
        bindEvent('leftDoubleClick', leftDoubleClickFn)
    }
    polygonPosition.value.push({...mousePosition.value})
}
const mouseMoveFn = (movement) => {
    inputNumber.value?.focus()
    const position = getPosition(movement.endPosition)
    mousePosition.value = position
    if (!referenceLinePositon.value.length) return
    const data = getBestPoint(referenceLinePositon.value[0], referenceLines.value, position)
    referenceLinePositon.value[1] = data
    // 开启吸附功能
    if (props.adsorption) mousePosition.value = getNearestPoint(referenceLinePositon.value[0], data, position, props.adsorptionDistance)
}
/** 完成绘制 */
const leftDoubleClickFn = () => {
    emits('end', JSON.parse(JSON.stringify(polygonPosition.value)))
    reset()
}
/** 取消绘制 */
const rightClickFn = () => {
    emits('cancel')
    reset()
}

const reset = () => {
    entityCollection.entities.removeAll()
    viewer.dataSources.remove(entityCollection)
    bindEvent('mouseMove', () => { })
    bindEvent('leftDoubleClick', () => { })
    mousePosition.value = null
    polygonPosition.value = []
    temporaryDistance = 0
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
// 这个一定要在绑定事件之前使用，要不然可能会导致保存的事件错误
const resetEvents = saveEvnet(['leftClick', 'mouseMove', 'leftDoubleClick', 'rightClick'])
bindEvent('leftClick', leftClickFn)
bindEvent('rightClick', rightClickFn)




onUnmounted(reset)
onUnmounted(resetEvents)

</script>

<style scoped>
.wrap {
    position: absolute;
    left: 10px;
    bottom: 10px;
}
</style>