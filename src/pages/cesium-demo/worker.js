// import * as THREE from 'three';
// import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// let scene = new THREE.Scene()
// const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
importScripts('https://cdn.jsdelivr.net/npm/three@latest/build/three.min.js')
// importScripts('https://cdn.jsdelivr.net/npm/three@latest/examples/jsm/exporters/GLTFExporter.js')
// camera.position.z = 5
self.addEventListener('message', e => {
    if(e.data === 'create') {
        let scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        camera.position.z = 5
        const geometry = new THREE.BoxGeometry(10, 10, 10)
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        console.log(THREE.GLTFExporter);
        console.log(THREE);
        const data = THREE.exportGLTF()
        console.log(data);
        self.postMessage(data)
    }
})


// const exportGLTF = () => {
//     const exporter = new GLTFExporter();
//     exporter.parse(scene, reslult => {
//         return JSON.stringify(reslult)
//         saveString(JSON.stringify(reslult), 'test')
//     });
// }

// const saveString = (text, filename) => {
//     const blob = new Blob([text], {type: 'application/json'});
//     const url = URL.createObjectURL(blob)
//     const link = document.createElement('a')
//     link.href = url
//     link.download = filename || '123'
//     link.click()
//     URL.revokeObjectURL(url)

// }