<template>
    <div></div>
</template>

<script setup>
import { computed, onUnmounted } from 'vue';


const props = defineProps({
    positions: Array,
    id: String,
    fill: {
        type: String,
        default: 'green'
    },
    stroke: {
        type: String,
        default: 'red'
    },
})

const polyLinePositions = computed(() => [...props.positions, props.positions[0]])

const polygonEntity = viewer.entities.add({
    polygon: {
        hierarchy: {
            positions: props.positions.map(({ longitude, latitude }) => Cesium.Cartesian3.fromDegrees(longitude, latitude))
        },
        material: Cesium.Color.fromCssColorString(props.fill).withAlpha(0.5),
        height: 0.1
    },
    properties: {
        id: props.id
    }

})
polygonEntity.polyline = {
    positions: polyLinePositions.value.map(({ longitude, latitude }) => Cesium.Cartesian3.fromDegrees(longitude, latitude)),
    width: 3,
    material: Cesium.Color.fromCssColorString(props.stroke),
    height: 0.1
}

onUnmounted(() => {
    viewer.entities.remove(polygonEntity)
})

</script>