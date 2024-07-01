import {defineComponent, ref, onMounted} from 'vue';
import * as THREE from 'three'

export default defineComponent({
    props: {},
    setup() {
        const container = ref()
        let scene, camera, renderer
        const init = () => {
            const width = container.value.clientWidth
            const height = container.value.clientHeight

            camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
            camera.position.set(5, 5, 20)

            scene = new THREE.Scene()

            renderer = new THREE.WebGLRenderer({antialias: true})
            renderer.setSize(width, height)
            container.value.appendChild(renderer.domElement)
        }
        const addCar = () => {
            const geometry = new THREE.BoxGeometry(2, 0.6, 3)
            const material = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                side: THREE.DoubleSide
            })
            const vehicle = new THREE.Mesh(geometry, material)
            vehicle.position.set(0, 1, 0)
            scene.add(vehicle)

            const box = geometry.clone()
            const edges = new THREE.EdgesGeometry(box)
            const edgesMaterial = new THREE.LineBasicMaterial({color: 0x333333})
            const line = new THREE.LineSegments(edges, edgesMaterial)
            line.position.set(0, 1, 0)
            scene.add(line)

            const egoCar = new THREE.Group()
            egoCar.name = '自车'
            egoCar.add(vehicle, line)
            scene.add(egoCar)
        }

        onMounted(() => {
            init()
        })
        const render = () => {
            return (
                <div ref={container}>
                    {/* Your JSX content here */}
                </div>
            );
        }
        return render
    }
});