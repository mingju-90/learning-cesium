

import { defineComponent, ref, onMounted } from 'vue';
import * as THREE from 'three'
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export default defineComponent({
    props: {},
    setup() {
        const MAX_FRONT_WHEEL_STEERING_ANGLE = 40
        const frontWheelAngle = ref(40)
        const container = ref()
        let scene, camera, renderer, controls, grid

        // 汽车模型的轮子
        const wheels = []
        const frontWheels = []

        // metalness 金属度，1代表完全金属，roughness 材质的粗糙度，clearcoat 透明涂层的强度，1代表完全透明，clearcoatRoughness 透明涂层的粗糙度
        const bodyMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xff0000, metalness: 1.0, roughness: 0.5, clearcoat: 1.0, clearcoatRoughness: 0.03
        });
        const detailsMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff, metalness: 1, roughness: 0.5
        })
        const glassMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff, metalness: 0.25, roughness: 0, transmission: 1
        })

        const init = () => {
            const { clientWidth: width, clientHeight: height } = container.value
            renderer = new THREE.WebGLRenderer({ antialias: true })
            // 常见的配置，用于控制渲染器针对高分辨率显示器进行渲染
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(width, height)
            // 设置动画循环的方法，使用这个方法，THREE货管理动画循环的细节，确保动画的平滑性和帧率的一致性
            renderer.setAnimationLoop(animation)
            // 设置渲染器色调映射
            renderer.toneMapping = THREE.ACESFilmicToneMapping
            // 设置色调映射的曝光值，用于控制场景的亮度
            renderer.toneMappingExposure = 0.85
            container.value.appendChild(renderer.domElement)

            camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
            camera.position.set(4.24, 1.4, -4.5)

            controls = new OrbitControls(camera, container.value)
            controls.maxDistance = 9
            controls.maxPolarAngle = THREE.MathUtils.degToRad(90)
            controls.target.set(0, 0.5, 0)
            controls.update()

            scene = new THREE.Scene()
            // 设置背景色
            scene.background = new THREE.Color(0x333333)
            // 设置环境贴图
            // scene.environment = new RGBELoader().load('textures/equirectangular/venice_sunset_1k.hdr')
            // scene.environment.mapping = THREE.EquirectangularReflectionMapping
            // 设置雾效， 起始距离10，可见距离15
            scene.fog = new THREE.Fog(0x333333, 10, 15)

            grid = new THREE.GridHelper(20, 40, 0xffffff, 0xffffff)
            grid.material.opacity = 0.2
            grid.material.depthWrite = false
            grid.material.transparent = true
            scene.add(grid)

        }

        const addCar = () => {
            const shadow = new THREE.TextureLoader().load('/ferrari-shadow.png')
            const dracoLoader = new DRACOLoader()
            // dracoLoader.setDecoderPath('jsm/libs/draco/gltf')
            // 上面那个路径，会报错，需要将 draco文件夹放入public中，修改为 ./drace/
            dracoLoader.setDecoderPath('./draco/')

            const loader = new GLTFLoader();
            loader.setDRACOLoader(dracoLoader)

            loader.load('/ferrari.glb', gltf => {
                const carModel = gltf.scene.children[0]
                carModel.getObjectByName('body').material = bodyMaterial

                    ;['rim_fl', 'rim_fr', 'rim_rr', 'rim_rl', 'trim'].forEach(name => carModel.getObjectByName(name).material = detailsMaterial)

                carModel.getObjectByName('glass').material = glassMaterial

                    ;['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'].forEach(name => wheels.push(carModel.getObjectByName(name)))
                frontWheels
                    ;['wheel_fl', 'wheel_fr'].forEach(name => {
                        // 给前轮添加两个父对象，负责转向，将父对象和轮胎的中心点对其
                        let tireParent = new THREE.Object3D();
                        const wheel = carModel.getObjectByName(name)
                        const { x, y, z } = wheel.position
                        wheel.position.set(0, 0, 0)
                        tireParent.add(wheel)
                        tireParent.position.set(x, y, z)
                        frontWheels.push(tireParent)
                        carModel.add(tireParent)
                    })

                const mesh = new THREE.Mesh(
                    new THREE.PlaneGeometry(0.655 * 4, 1.3 * 4),
                    new THREE.MeshBasicMaterial({
                        map: shadow, blending: THREE.MultiplyBlending, toneMapped: false, transparent: true
                    })
                )
                mesh.rotation.x = -Math.PI / 2
                mesh.renderOrder = 2

                carModel.add(mesh)

                scene.add(carModel)

            })
        }
        const addLight = () => {

            const ambientLight = new THREE.AmbientLight(0xffffff, 1)
            scene.add(ambientLight)

            const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
            directionalLight.position.set(1000, 500, 1000)
            // 该方向会投射阴影效果
            directionalLight.castShadow = true
            scene.add(directionalLight)

        }
        const animation = () => {
            controls.update();
            const time = - performance.now() / 1000;
            // 控制轮胎滚动
            for (let i = 0; i < wheels.length; i++) {
                wheels[i].rotation.x = time * Math.PI * 2;
            }
            // 控制前轮转向
            for (let i = 0; i < frontWheels.length; i++) {
                frontWheels[i].rotation.y = frontWheelAngle.value * Math.PI / 180
            }
            grid.position.z = - (time) % 1;
            renderer.render(scene, camera)
        }

        onMounted(() => {
            init()
            addCar()
            addLight()
            window.addEventListener('keydown', event => {
                if (event.key === 'ArrowLeft') {
                    if (frontWheelAngle.value > MAX_FRONT_WHEEL_STEERING_ANGLE) return
                    frontWheelAngle.value++
                } else if (event.key === 'ArrowRight') {
                    if (frontWheelAngle.value < -MAX_FRONT_WHEEL_STEERING_ANGLE) return
                    frontWheelAngle.value--
                }
            })
        })
        const render = () => {
            return (
                <>
                    <div ref={container} class="h-full">
                    </div>
                    <div class="absolute right-10 top-10">
                        <el-input-number v-model={frontWheelAngle.value} min="-40" max="40" />
                    </div>
                </>
            );
        }
        return render
    }
});