<template>
    <initCesium @ready="readyCesium" />
    <div class="create-button-toolbar">
        <template v-if="!editID">
            <button @click="isCreatePolygon = true" :disabled="isCreatePolygon">绘制多边形</button>
            <button @click="isCreateRect = true" :disabled="isCreatePolygon">绘制矩形</button>
        </template>
        <template v-else>
            <button @click="editID = null">取消编辑</button>
            <button @click="handleConfirm">完成</button>
        </template>
    </div>
    <createPolygon adsorption v-if="ready && isCreatePolygon" @end="handleCreatePolygon" @cancel="handleCancelCreatePolygon" />
    <createRect adsorption v-if="ready && isCreateRect" @end="handleCreateRect" @cancel="handleCancelCreateRect"/>
    <template v-if="ready" v-for="item of polygonList" :key="JSON.stringify(item.positions)">
        <editPolygon ref="editRef" adsorption v-if="editID === item.id && item.type === 'polygon'" :positions="item.positions" @close="(positions) => handleChangeRect(item, positions)"/>
        <editRect ref="editRef" adsorption v-else-if="editID === item.id && item.type === 'rect'" :positions="item.positions" @close="(positions) => handleChangeRect(item, positions)"/>
        <showPolygon v-else :positions="item.positions" :id="item.id" />
    </template>
</template>

<script setup>
import { onUnmounted, ref } from 'vue';
import initCesium from '../initCesium/viewer.vue'
import createPolygon from './createPolygon.vue';
import createRect from './createRect.vue';
import showPolygon from './showPolygon.vue';
import editPolygon from './editPolygon.vue';
import editRect from './editRect.vue'
import { bindEvent, saveEvnet } from '../../utils/event.js'
import { pick } from '../../utils/coordinateTransformation.js'
import { generateUUID } from '../../utils/index'
const ready = ref(false)
let resetEvents = () => { }
const readyCesium = () => {
    ready.value = true

    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(113, 31, 300)
    });
    resetEvents = saveEvnet(['leftDoubleClick', 'leftClick'])
    bindEvent('leftDoubleClick', () => viewer.scene.screenSpaceCameraController.enableInputs = false)
    bindEvent('leftClick', selectEntity)

}

const polygonList = ref([])
polygonList.value.push(
    { "positions": [{ "longitude": 112.99959544431147, "latitude": 31.00056949159147 }, { "longitude": 112.9990282278715, "latitude": 31.000043820965637 }, { "longitude": 112.99950389067607, "latitude": 30.999615898343546 }, { "longitude": 113.0008327800616, "latitude": 30.999817935135283 }], "id": "d6861f7b1c519b9d8da4801f7b997c4d", "type":"polygon" },
    {"positions":[{"longitude":112.99983304556694,"latitude":31.000997225065753},{"longitude":112.99983304690289,"latitude":31.000739329039266},{"longitude":113.00021524128502,"latitude":31.000739329931545},{"longitude":113.00021523994907,"latitude":31.00099722595803}],"id":"29fe3b8ff12608cf15246af2e6225b72","type":"rect"},
    )

const isCreatePolygon = ref(false)
const isCreateRect = ref(false)

const handleCreatePolygon = (data) => {
    polygonList.value.push({ positions: data, id: generateUUID(), type: 'polygon' })
    isCreatePolygon.value = false
}
const handleCreateRect = data => {
    polygonList.value.push({ positions: data, id: generateUUID(), type: 'rect' })
    isCreateRect.value = false
}
const handleCancelCreatePolygon = () => {
    isCreatePolygon.value = false
}
const handleCancelCreateRect = () => {
    isCreateRect.value = false
}

const handleChangeRect = (item, positions) => {
    console.log(positions);
    item.positions = positions
    console.log(polygonList.value);
}

const editID = ref('')
const editRef = ref()
const selectEntity = (movement) => {
    const pickedEntity = pick(movement.position)
    if (!pickedEntity) return
    const id = pickedEntity.properties?.getValue().id
    editID.value = id

}
const handleConfirm = () => {
    editID.value = ''
    console.log(editRef.value[0]);
}

onUnmounted(() => resetEvents())


</script>

<style scoped>
.create-button-toolbar {
    position: absolute;
    left: 10px;
    top: 10px;
    display: flex;
    gap: 10px;
}
</style>../initCesium/viewer.vue