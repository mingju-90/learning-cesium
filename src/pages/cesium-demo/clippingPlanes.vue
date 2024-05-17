<template>
    <viewerVue @ready="ready">
        <div class="toolbar">
            <a-select style="width: 150px;" v-model:value="clipObject" :options="clipObjects"
                @change="handleChange"></a-select>
        </div>
    </viewerVue>
</template>

<script setup>
import { ref } from "vue";
import viewerVue from "./viewer.vue";
import { bindEvent, saveEvnet } from "../../utils/event";
/** 选择切片模型类型 */
const clipObjects = ["BIM", "Point Cloud", "Instanced", "Model"].map((item) => ({ value: item, label: item }));
const clipObject = ref('BIM')

const modelUrl = "/Cesium_Air.glb";
const instancedUrl = "/tileset.json";
const bimUrl = '/powerStation.json'

let tileset
/** 剪切平面高度 */
let targetY = 0
/** 剪切平面实例 */
let clippingPlanes

let selectedPlane


const bindClippingPlanesEvent = () => {
    bindEvent('leftDown', movement => {
        const pickedObject = scene.pick(movement.position)
        console.log(pickedObject);
        if (!pickedObject?.id?.plane) return
        selectedPlane = pickedObject.id.plane
        selectedPlane.material = Cesium.Color.WHITE.withAlpha(0.05);
        selectedPlane.outlineColor = Cesium.Color.WHITE;
        // 禁止鼠标与场景中的相机交互
        scene.screenSpaceCameraController.enableInputs = false;
    })
    bindEvent('leftUp', () => {
        scene.screenSpaceCameraController.enableInputs = true;
        if (!selectedPlane) return
        selectedPlane.material = Cesium.Color.WHITE.withAlpha(0.1);
        selectedPlane.outlineColor = Cesium.Color.WHITE;
        selectedPlane = undefined;
    })
    bindEvent('mouseMove', movement => {
        if (!selectedPlane) return
        const deltaY = movement.startPosition.y - movement.endPosition.y
        targetY += deltaY
    })
}

const createPlaneUpdateFunction = plane => {
    return () => {
        plane.distance = targetY
        return plane
    }
}
const loadModel = url => {
    clippingPlanes = new Cesium.ClippingPlaneCollection({
        planes: [new Cesium.ClippingPlane(new Cesium.Cartesian3(0.0, 0.0, -1.0), 0.0)],
        edgeWidth: 1
    })

    const position = Cesium.Cartesian3.fromDegrees(117.174087, 31.850551, 300);
    const heading = Cesium.Math.toRadians(135.0);
    const pitch = 0, roll = 0
    const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll)
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);

    const entity = viewer.entities.add({
        position,
        orientation,
        model: {
            uri: url,
            scale: 8,
            minimumPixelSize: 100,
            clippingPlanes
        }
    })
    // 动态追踪模型
    viewer.trackedEntity = entity;
    

    createPlane(position, new Cesium.Cartesian2(300.0, 300.0))
}

// TODO： 加载tileset遇到问题，目前看起来需要模型文件，现在这个单纯的tileset.json 不行
const loadTileset = async (resource, modelMatrix) => {
    clippingPlanes = new Cesium.ClippingPlaneCollection({
        planes: [new Cesium.ClippingPlane(new Cesium.Cartesian3(0, 0, -1), 0)],
        edgeWidth: 1
    })
    try {
        const url = await Promise.resolve(resource)
        console.log(url);

        tileset = await Cesium.Cesium3DTileset({url, clippingPlanes })
        console.log(tileset);
        if (modelMatrix) tileset.modelMatrix = modelMatrix
        const aa = scene.primitives.add(tileset)
        console.log(aa);
        const boundingSphere = tileset.boundingSphere
        const radius = boundingSphere.radius
        viewer.zoomTo(tileset, new Cesium.HeadingPitchRange(0.5, -0.2, radius * 4.0))
       
        if (!Cesium.Matrix4.equals(tileset.root.transform, Cesium.Matrix4.IDENTITY)) {
            const transformCenter = Cesium.Matrix4.getTranslation(tileset.root.transform, new Cesium.Cartesian3())
            const transformCartographic = Cesium.Cartographic.fromCartesian(transformCenter)
            const boundingSphereCartographic = Cesium.Cartographic.fromCartesian(tileset.boundingSphere.center)
            const height = boundingSphereCartographic.height - transformCartographic.height
            clippingPlanes.modelMatrix = Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(0, 0, height))
        }
        createPlane(boundingSphere.center, new Cesium.Cartesian2(radius * 2.5, radius * 2.5))
        return tileset
    } catch (error) {
        console.log(`Error loading  tileset: ${error}`);
    }
}


const createPlane = (position, dimensions) => {
    // TODO: 为什么要循环，如果不做这么又该如何实现
    for (let i = 0; i < clippingPlanes.length; i++) {
        const plane = clippingPlanes.get(i)
        const planeEntity = viewer.entities.add({
            position,
            plane: {
                dimensions,
                material: Cesium.Color.WHITE.withAlpha(0.1),
                plane: new Cesium.CallbackProperty(
                    createPlaneUpdateFunction(plane),
                    false
                ),
                outline: true,
                outlineColor: Cesium.Color.WHITE,
            }
        })
    }
}



function reset() {
    viewer.entities.removeAll();
    if (tileset) viewer.scene.primitives.remove(tileset)

    planeEntities = [];
    targetY = 0.0;
    tileset = undefined;
}

const handleChange = () => {

}

const ready = () => {
    bindClippingPlanesEvent()
    loadModel(modelUrl);
    // loadTileset(bimUrl)
    
}
</script>

<style scoped>
.toolbar {
    position: absolute;
    left: 10px;
    top: 10px;
}
</style>