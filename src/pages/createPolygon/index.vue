<template>
    <initCesium @ready="readyCesium" />
    <button class="create-polygon-button" @click="isCreatePolygon = true" :disabled="isCreatePolygon">绘制多边形</button>
    <button class="create-polygon-button" @click="isCreatePolygon = true" :disabled="isCreatePolygon">绘制矩形</button>
    <createPolygon v-if="ready && isCreatePolygon" @end="handleCreatePolygon" @cancel="handleCancelCreatePolygon" />
    <template v-if="ready" v-for="item of polygonList" :key="item.id">
        <editPolygon adsorption v-if="editID === item.id" :positions="item.positions" />
        <showPolygon adsorption v-else :positions="item.positions" :id="item.id" />
    </template>
</template>

<script setup>
import { onUnmounted, ref } from 'vue';
import initCesium from '../initCesium/viewer.vue'
import createPolygon from './createPolygon.vue';
import showPolygon from './showPolygon.vue';
import editPolygon from './editPolygon.vue';
import { bindEvent, saveEvnet } from '../../utils/event'
import { pick } from '../../utils/coordinateTransformation'
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
polygonList.value.push({ "positions": [{ "longitude": 112.99959544431147, "latitude": 31.00056949159147 }, { "longitude": 112.9990282278715, "latitude": 31.000043820965637 }, { "longitude": 112.99950389067607, "latitude": 30.999615898343546 }, { "longitude": 113.0008327800616, "latitude": 30.999817935135283 }], "id": "d6861f7b1c519b9d8da4801f7b997c4d" })

const isCreatePolygon = ref(false)

const handleCreatePolygon = (data) => {
    polygonList.value.push({ positions: data, id: generateUUID() })

    isCreatePolygon.value = false
}
const handleCancelCreatePolygon = () => {
    isCreatePolygon.value = false
}

const editID = ref('')
const selectEntity = (movement) => {
    const pickedEntity = pick(movement.position)
    if (!pickedEntity) return
    const id = pickedEntity.properties?.getValue().id
    editID.value = id

}

onUnmounted(() => resetEvents())


</script>

<style scoped>
.create-polygon-button {
    position: absolute;
    left: 10px;
    top: 10px;
}
</style>