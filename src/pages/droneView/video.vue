<template>
    <video id="video" src="/flightHistory/history.mp4" muted autoplay loop ref="videoRef" crossorigin="anonymous" @timeupdate="handleTimeUpdate">
    </video>
    <canvas id="frameCanvas" width="640" height="360" style=" position: absolute; width: 200px; height: 120px; left: 0; top: 0;"></canvas>
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
    emits('update:currentTime', Math.round(videoRef.value.currentTime * 2) / 2)
}

// setTimeout(() => {
//     videoRef.value.currentTime = props.currentTime + 1
//     videoRef.value.pause(); // 暂停播放
// }, 3000);

onMounted(() => {
    videoRef.value.currentTime = props.currentTime
    // videoRef.value.pause(); // 暂停播放
    // videoRef.value?.play()
})
</script>

<style scoped>
video {
    width: 100%;
    height: 100%;
    object-fit: fill;
}
</style>