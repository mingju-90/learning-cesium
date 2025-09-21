<template>
  <div></div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, inject } from 'vue';
import * as Cesium from 'cesium';
import M300 from "./M300.png";

const props = defineProps({
  value: {
    type: Array,
    required: true
  },
});

const viewer = inject('viewer');
const createdEntity = ref(null);

const airPic = computed(() => {
  return M300;
});

const validCoordinates = computed(() => {
  return isValidCoordinates(props.value);
});

function isValidCoordinates(data) {
  if (!Array.isArray(data) || data.length !== 4) return null;
  const parsed = data.map(Number);
  if (parsed.some(isNaN)) return null;
  const [lng, lat, , gimbalYaw] = parsed;
  return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90
    ? parsed
    : null;
}

function drawEntityAndPolyline() {
  console.log('viewer.value', viewer.value)
  if (!viewer.value) return;

  const positionsCallback = new Cesium.CallbackProperty(() => {
   
    const {longitude, latitude, altitude} = props.value;
    const cartographic = Cesium.Cartographic.fromDegrees(longitude, latitude, altitude);
    const cartesian = viewer.value.scene.globe.ellipsoid.cartographicToCartesian(cartographic);
    return cartesian;
  }, false);

  const rotationCallback = new Cesium.CallbackProperty(() => {
    if (!validCoordinates.value) return 0;
    const gimbalYaw = props.value.gimbalYaw
    let yaw = 0;
    if (gimbalYaw < 0) {
      yaw = yaw - gimbalYaw;
    } else {
      yaw = 360 - gimbalYaw;
    }
    return Cesium.Math.toRadians(yaw);
  }, false);

  createdEntity.value = viewer.value.entities.add({
    position: positionsCallback,
    billboard: {
      image: airPic.value,
      rotation: rotationCallback,
      alignedAxis: Cesium.Cartesian3.UNIT_Z,
      width: 80,
      height: 80,
    },
  });
}

function destroyEntity() {
  if (viewer.value && createdEntity.value) {
    viewer.value.entities.remove(createdEntity.value);
    createdEntity.value = null;
  }
}

onMounted(() => {
  drawEntityAndPolyline();
});

onBeforeUnmount(() => {
  destroyEntity();
});
</script>

<style scoped></style>