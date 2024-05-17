<template>
    <viewerVue @ready="ready">
        <div class="toolbar">

        </div>
    </viewerVue>
</template>

<script setup>
import { ref } from "vue";
import viewerVue from "./viewer.vue";
import { bindEvent, saveEvnet } from "../../utils/event";



const bindClippingPlanesEvent = () => {

}

const fn = async () => {
    let isReady = false
    // 定义和控制实体的运动和轨迹
    const pathPosition = new Cesium.SampledPositionProperty()
    // 添加一个带有飞行路径的实体，用来展示飞机的轨迹
    const entityPath = viewer.entities.add({
        position: pathPosition,
        path: {
            show: true,
            leadTime: 0,    // 路径前端延伸时间，单位秒
            trailTime: 60,  // 路径后端延伸的时间
            width: 3,  // 路径的宽度
            resolution: 1,  // 路径的分辨率
            material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.3,
                taperPower: 0.3,
                color: Cesium.Color.PALEGOLDENROD,
            })
        }
    })

    const camera = viewer.camera
    const controller = scene.screenSpaceCameraController
    let r = 0

    const hpRoll = new Cesium.HeadingPitchRoll()
    const hpRange = new Cesium.HeadingPitchRange()
    let speed = 5;
    const deltaRadians = Cesium.Math.toRadians(3)

    let position = Cesium.Cartesian3.fromDegrees(117.174087, 31.850551, 5)
    let speedVector = new Cesium.Cartesian3()
    const fixedFrameTransform = Cesium.Transforms.localFrameToFixedFrameGenerator('north', 'west')

    try {
        const planePrimitive = scene.primitives.add(await Cesium.Model.fromGltfAsync({
            url: '/Cesium_Air.glb',
            modelMatrix: Cesium.Transforms.headingPitchRollToFixedFrame(position, hpRoll, Cesium.Ellipsoid.WGS84, fixedFrameTransform),
            // minimumPixelSize: 128,
        }))
        planePrimitive.readyEvent.addEventListener(() => {
            planePrimitive.activeAnimations.addAll({
                multiplier: 0.5,
                loop: Cesium.ModelAnimationLoop.REPEAT,
            })
            r = 2 * Math.max(planePrimitive.boundingSphere.radius, camera.frustum.near)
            // controller.minimumZoomDistance = r * 0.5
            const center = planePrimitive.boundingSphere.center
            const heading = Cesium.Math.toRadians(230)
            const pitch = Cesium.Math.toRadians(-20)

            hpRange.heading = heading
            hpRange.pitch = pitch
            hpRange.range = r * 50
            // camera.lookAt(center, hpRange)
            camera.setView({ destination: center })
            isReady = true
        })
        // viewer.scene.preUpdate cesium的每一帧渲染之前都会被调用
        viewer.scene.preUpdate.addEventListener(function (scene, time) {
            // 更新速度向量，沿着x轴向前 speed / 10
            speedVector = Cesium.Cartesian3.multiplyByScalar(
                Cesium.Cartesian3.UNIT_X,
                speed / 10,
                speedVector
            );
            // 更新实体位置，使用旋转矩阵和速度向量计算新的位置
            position = Cesium.Matrix4.multiplyByPoint(
                planePrimitive.modelMatrix,
                speedVector,
                position
            );
            // 更新飞行路径
            pathPosition.addSample(Cesium.JulianDate.now(), position);
            // 更新实体的朝向
            Cesium.Transforms.headingPitchRollToFixedFrame(
                position,
                hpRoll,
                Cesium.Ellipsoid.WGS84,
                fixedFrameTransform,
                planePrimitive.modelMatrix
            );
            if (isReady) {
                // Zoom to model
                const center = planePrimitive.boundingSphere.center;
                // hpRange.heading = hpRoll.heading;
                hpRange.heading = Cesium.Math.toRadians(230)
                // hpRange.pitch = hpRoll.pitch;
                hpRange.pitch = Cesium.Math.toRadians(-20)
                hpRange.range = r * 20
                camera.lookAt(center, hpRange);
            }
        });
        // 绑定键盘事件，操控飞机的朝向
        document.addEventListener("keydown", function (e) {
            switch (e.code) {
                case "ArrowDown":
                    if (e.shiftKey) {
                        // speed down
                        speed = Math.max(--speed, 1);
                    } else {
                        // pitch down
                        hpRoll.pitch -= deltaRadians;
                        if (hpRoll.pitch < -Cesium.Math.TWO_PI) {
                            hpRoll.pitch += Cesium.Math.TWO_PI;
                        }
                    }
                    break;
                case "ArrowUp":
                    if (e.shiftKey) {
                        // speed up
                        speed = Math.min(++speed, 1000);
                    } else {
                        // pitch up
                        hpRoll.pitch += deltaRadians;
                        if (hpRoll.pitch > Cesium.Math.TWO_PI) {
                            hpRoll.pitch -= Cesium.Math.TWO_PI;
                        }
                    }
                    break;
                case "ArrowRight":
                    if (e.shiftKey) {
                        // roll right
                        hpRoll.roll += deltaRadians;
                        if (hpRoll.roll > Cesium.Math.TWO_PI) {
                            hpRoll.roll -= Cesium.Math.TWO_PI;
                        }
                    } else {
                        // turn right
                        hpRoll.heading += deltaRadians;
                        if (hpRoll.heading > Cesium.Math.TWO_PI) {
                            hpRoll.heading -= Cesium.Math.TWO_PI;
                        }
                    }
                    break;
                case "ArrowLeft":
                    if (e.shiftKey) {
                        // roll left until
                        hpRoll.roll -= deltaRadians;
                        if (hpRoll.roll < 0.0) {
                            hpRoll.roll += Cesium.Math.TWO_PI;
                        }
                    } else {
                        // turn left
                        hpRoll.heading -= deltaRadians;
                        if (hpRoll.heading < 0.0) {
                            hpRoll.heading += Cesium.Math.TWO_PI;
                        }
                    }
                    break;
                default:
            }
        });
    } catch (error) {

    }
}


const ready = async () => {
    console.log(Cesium);
    fn()
}
</script>

<style scoped>
.toolbar {
    position: absolute;
    left: 10px;
    top: 10px;
}
</style>