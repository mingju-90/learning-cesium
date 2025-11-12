<template>
    <video id="video" src="/flightHistory/history.mp4" muted autoplay loop ref="videoRef" crossorigin="anonymous" @timeupdate="handleTimeUpdate">
    </video>
    <canvas id="frameCanvas" width="640" height="360" style="display:none; position: absolute;"></canvas>
</template>


<script setup>
import { onMounted, ref } from 'vue';
const props = defineProps({
    currentTime: Number,
})
const emits = defineEmits(['update:currentTime'])


const videoRef = ref();

const handleTimeUpdate = () => {
    if (!videoRef.value) return
    emits('update:currentTime', Math.round(videoRef.value.currentTime))
}

onMounted(() => {
    videoRef.value?.play()
})
</script>

<style scoped>
video {
    width: 100%;
    height: 100%;
}
</style>