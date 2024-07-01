import { defineComponent, ref, onMounted } from 'vue';
import * as THREE from 'three'
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import floor from './floorWood.jpg'

// 创建立方体，地板，设置灯光和阴影效果
export default defineComponent({
    props: {},
    setup() {
        const container = ref()
        /** 场景 */
        let scene
        /** 相机 */
        let camera
        /** 渲染器 */
        let renderer

        const init = () => {
            const width = container.value.clientWidth
            const height = container.value.clientHeight
            // 初始化相机，设置相机的角度，宽高比，近端面，远端面
            camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
            // 设置相机的位置
            camera.position.set(5, 5, 20)

            // 设置场景
            scene = new THREE.Scene()

            // 开启反锯齿
            renderer = new THREE.WebGLRenderer({antialias: true})
            // 渲染器能够渲染阴影效果
            renderer.shadowMap.enabled = true
            renderer.setSize(width, height);
            // 将指定的渲染器加入容器中
            container.value.appendChild(renderer.domElement)
        }
        /** 增加控制器 */
        const addControls = () => {
            const controls = new OrbitControls(camera, renderer.domElement)
            controls.update()
        }
        const addCube = () => {
            const geometry = new THREE.BoxGeometry(4, 4, 4)
            const material = new THREE.MeshBasicMaterial({ color: 0xff0000 })
            const cube = new THREE.Mesh(geometry, material)
            cube.castShadow = true;
            scene.add(cube)
        }

        const addLight = () => {
            
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
            scene.add(ambientLight)
            ambientLight.castShadow = true

            const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
            directionalLight.position.set(10, 5, 10)
            // 该方向会投射阴影效果
            directionalLight.castShadow = true
            scene.add(directionalLight)

            // 方向光辅助线
            const directionalLightHelper = new THREE.DirectionalLightHelper(
                directionalLight
              );
              scene.add(directionalLightHelper); // 辅助线

        }

        const addPlane = () => {
            const geometry = new THREE.PlaneGeometry(40, 40)

            // 初始化纹理加载器
            const textloader = new THREE.TextureLoader()
            // 给地板加载纹理
            const material = new THREE.MeshStandardMaterial({
                map: textloader.load(floor)
            })
            const plane = new THREE.Mesh(geometry, material)
            // 设置水平方向
            plane.rotation.x = -0.5 * Math.PI
            plane.position.set(0, -3, 0)
            // 接受其他光源的阴影
            plane.receiveShadow = true
            scene.add(plane)
        }
        /** 更新场景 */
        const animate = () => {
            requestAnimationFrame(animate)
            renderer.render(scene, camera)
        }
        onMounted(() => {
            init()
            addCube()
            addControls()
            addLight()
            addPlane()
            animate()
        })
        const render = () => <div class="h-full" ref={container}></div>
        return render
    }
});