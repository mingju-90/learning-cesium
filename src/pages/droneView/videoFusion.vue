<template>
    <div>{{ currentPointOnGroundCoordinates }}</div>
</template>

<script setup>
import { calculateFarPlanePoints, calculateGroundIntersection, VideoMaterial } from './uits';
import { computed, watch } from 'vue'

const props = defineProps({
    droneInfo: Object,
    viewer: Object
})

const frustumFarPlaneCoordinates = computed(() => {
    const farPlane = 100
    const { longitude, latitude, height, fov, aspectRatio, heading, pitch, roll } = props.droneInfo
    if (pitch > -75) return []
    return calculateFarPlanePoints([longitude, latitude, height], fov, aspectRatio, farPlane, heading, pitch, roll)
})

const currentPointOnGroundCoordinates = computed(() => {
    const { longitude, latitude, height, fov, aspectRatio, heading, pitch, roll } = props.droneInfo
    const result = frustumFarPlaneCoordinates.value.map(item => {
        return calculateGroundIntersection(props.viewer, [longitude, latitude, height], item)
    })
    return result
})

const positions = computed(() => {
    if (currentPointOnGroundCoordinates.value.filter(item => item).length < 4) return []
    return currentPointOnGroundCoordinates.value.map(item => Cesium.Cartesian3.fromDegrees(...item))
})

const createMaterial = (image) => new Cesium.Material({
    fabric: {
        type: 'Image',
        uniforms: {
            image: image
        },
        // 关键：自定义 UV 透视变换
        source: `
            uniform sampler2D image;
            czm_materialInput materialInput;

            vec2 uv0 = vec2(0.0, 1.0); // 图片左上 → 顶点0
            vec2 uv1 = vec2(0.0, 0.0); // 图片左下 → 顶点1
            vec2 uv2 = vec2(1.0, 0.0); // 图片右下 → 顶点2
            vec2 uv3 = vec2(1.0, 1.0); // 图片右上 → 顶点3

            // 四边形四个顶点在局部坐标系中的位置（由 Cesium 自动传入）
            // materialInput.st 已经是插值后的 UV (0,0)-(1,1)
            // 我们要把它反向映射到纹理的四角

            vec2 perspectiveMap(vec2 st) {
              // 目标：st → 纹理四角
              // 使用双线性插值逆向求解（等价于透视除法）

              vec2 p0 = st * (1.0 - st.s - st.t) * uv0;
              vec2 p1 = vec2(st.s, 0.0) * (1.0 - st.t) * uv1;
              vec2 p2 = st * uv2;
              vec2 p3 = vec2(0.0, st.t) * (1.0 - st.s) * uv3;

              return p0 + p1 + p2 + p3;
            }

            czm_material czm_getMaterial(czm_materialInput materialInput) {
              czm_material material = czm_getDefaultMaterial(materialInput);

              // 直接使用 materialInput.st 作为四边形内的归一化坐标
              vec2 uv = materialInput.st;

              // 关键：双线性插值实现透视贴合
              float s = uv.s;
              float t = uv.t;
              vec2 texCoord =
                  uv0 * (1.0 - s) * (1.0 - t) +
                  uv1 * s * (1.0 - t) +
                  uv2 * s * t +
                  uv3 * (1.0 - s) * t;

              vec4 color = texture(image, texCoord);
              material.diffuse = color.rgb;
              material.alpha = color.a;
              return material;
            }
            `
    }
})

const createVideoMaterial = (videoElement) => {
    return new Cesium.Material({
        fabric: {
            type: 'Image',
            uniforms: {
                image: videoElement,           // 直接传入 <video>
                imageVersion: 0                 // 强制刷新
            },
            source: `
        uniform sampler2D image;
        uniform float imageVersion;

        czm_materialInput materialInput;

        czm_material czm_getMaterial(czm_materialInput materialInput) {
          czm_material material = czm_getDefaultMaterial(materialInput);

          // 获取 UV 坐标
          vec2 st = materialInput.st;
          float s = st.s, t = st.t;

          // 四角 UV 映射（视频 → 四边形）
          vec2 uv0 = vec2(0.0, 1.0); // 视频左上 → 顶点0
          vec2 uv1 = vec2(0.0, 0.0); // 视频左下 → 顶点1
          vec2 uv2 = vec2(1.0, 0.0); // 视频右下 → 顶点2
          vec2 uv3 = vec2(1.0, 1.0); // 视频右上 → 顶点3

          // 双线性插值：根据四边形 UV 位置采样视频
          vec2 texCoord =
              uv0 * (1.0 - s) * (1.0 - t) +
              uv1 *      s  * (1.0 - t) +
              uv2 *      s  *      t  +
              uv3 * (1.0 - s) *      t;

          // 采样视频纹理
          vec4 color = texture(image, texCoord);

          // 透明处理
          if (color.a < 0.01) {
            discard;
          }

          material.diffuse = color.rgb;
          material.alpha = color.a;
          return material;
        }
      `
        },
        translucent: true
    });
};

let primitive
let polygonEntity


class EllipsoidFadeMaterialProperty {
    constructor(color, duration) {
        // 初始化事件与内部状态
        this._definitionChanged = new Cesium.Event();
        this._color = undefined;
        this._colorSubscription = undefined;
        this.duration = duration;
        this._time = new Date().getTime();

        // 初始化颜色属性
        this.color = color;

        this._type = 'EllipsoidFade'
        this._registerMaterial()
    }
    _registerMaterial() {
        const type = this._type;

        if (Cesium.Material._materialCache.getMaterial(type)) {
            return; // 已注册
        }
        // 将材质添加到Cesium缓存
        Cesium.Material._materialCache.addMaterial(type, {
            fabric: {
                type: type,
                uniforms: {
                    color: new Cesium.Color(1.0, 0.0, 0.0, 1), // 默认红色
                    time: 0 // 时间变量（由材质属性动态更新）
                },
                source: `
                czm_material czm_getMaterial(czm_materialInput materialInput) {
                    czm_material material = czm_getDefaultMaterial(materialInput);
                    material.diffuse = 1.5 * color.rgb; // 增强漫反射颜色
                    vec2 st = materialInput.st; // 获取纹理坐标
                    float dis = distance(st, vec2(0.5, 0.5)); // 计算到中心的距离
                    float per = fract(time); // 归一化时间（0~1循环）
                    
                    // 根据距离和时间控制透明度，实现渐变效果
                    if (dis > per * 0.5) {
                    material.alpha = 0.0;
                    discard; // 剔除超出范围的像素
                    } else {
                    material.alpha = color.a * dis / per / 1.0;
                    }
                    return material;
                }
                `
            },
            translucent: (material) => true // 标识为透明材质
        });

    }

    // 材质类型标识
    getType(time) {
        return 'EllipsoidFade';
    }

    // 获取材质参数（每帧渲染时调用，返回给着色器的uniforms）
    getValue(time, result) {
        if (!Cesium.defined(result)) {
            result = {};
        }
        // 解析颜色属性（支持动态Property）
        result.color = Cesium.Property.getValueOrClonedDefault(
            this._color,
            time,
            Cesium.Color.WHITE,
            result.color
        );
        // 计算归一化的时间（0~1循环）
        result.time = ((new Date().getTime() - this._time) % this.duration) / this.duration;
        return result;
    }

    // 判断两个材质属性是否相等
    equals(other) {
        return (
            this === other ||
            (other instanceof EllipsoidFadeMaterialProperty &&
                Cesium.Property.equals(this._color, other._color))
        );
    }

    // 静态属性：标识材质是否为常量（此处为动态材质）
    static get isConstant() {
        return false;
    }

    // 获取定义变更事件（Cesium材质系统需要）
    get definitionChanged() {
        return this._definitionChanged;
    }
}

// 定义可响应式属性（使用Cesium的属性描述符，支持动态更新）
Object.defineProperties(EllipsoidFadeMaterialProperty.prototype, {
    color: Cesium.createPropertyDescriptor('color')
});

// 注册材质到Cesium系统
Cesium.EllipsoidFadeMaterialProperty = EllipsoidFadeMaterialProperty;









import img from './111.jpeg'

function downloadCanvas(canvas, filename = 'video_frame.png') {
    try {
        // 1. 将 canvas 转换为图片 URL（PNG格式，质量无损）
        const dataURL = canvas.toDataURL('image/png');
        
        // 2. 创建隐藏的下载链接
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = filename; // 文件名（含扩展名）
        
        // 3. 触发点击下载
        document.body.appendChild(link);
        link.click();
        
        // 4. 清理临时元素
        document.body.removeChild(link);
        URL.revokeObjectURL(dataURL); // 释放URL对象，节省内存
    } catch (error) {
        console.error('下载canvas失败：', error);
    }
}



const updatePolygon = async () => {
    const video = document.getElementById('video');
    // let canvas = document.getElementById('frameCanvas')
    // let ctx = canvas.getContext('2d');


    polygonEntity = props.viewer.entities.add({
        polygon: {
            hierarchy: new Cesium.CallbackProperty(() => new Cesium.PolygonHierarchy(positions.value), false),
    //         material: new VideoMaterial({
    //             image: new Cesium.CallbackProperty(() => {
        

    //                 const newCanvas = document.createElement('canvas');
    //                 newCanvas.width = video.videoWidth;;
    //                 newCanvas.height = video.videoHeight;
    //                 newCanvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    //                 // downloadCanvas(newCanvas)
    //                 return img;
    //             }, false),
    //             vertex1: new Cesium.CallbackProperty(() => positions.value[0], false), // 第1顶点
    // vertex4: new Cesium.CallbackProperty(() => positions.value[3], false)  // 第4顶点
    //         }),
            material: video

        },

    });
    positions.value.forEach((item, index) => {
        props.viewer.entities.add({
            position: new Cesium.CallbackProperty(() => positions.value[index], false),
            // 点样式配置
            point: {
                pixelSize: 12,        // 点的像素大小（默认10）
                color: Cesium.Color.RED,  // 点的颜色（支持RGB、十六进制）
                outlineColor: Cesium.Color.WHITE,  // 点的轮廓颜色
                outlineWidth: 2,      // 轮廓宽度（像素）
                show: true,           // 是否显示（默认true）
                disableDepthTestDistance: Number.POSITIVE_INFINITY  // 始终显示在最上层（避免被地形遮挡）
            },
            label: {
                text: `P${index + 1}`,
                font: '12px sans-serif',
                fillColor: Cesium.Color.WHITE,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                outlineWidth: 2,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -10),
            },

        });
    })


    // const updateFrame = () => {
    //     if (video.readyState >= 2) {
    //         canvas.width = video.videoWidth
    //         canvas.height = video.videoHeight
    //         ctx.drawImage(video, 0, 0)

    //         material.uniforms.image = canvas
    //         material.uniforms.imageVersion = Date.now()
    //     }
    // }
    // video.addEventListener('timeupdate', () => {
    //     updateFrame();
    // });
    // updateFrame()
    // return



    // 步骤1：移除旧的 Primitive（避免重复渲染和内存泄漏）
    // if (primitive && props.viewer.scene.primitives.contains(primitive)) {
    //     props.viewer.scene.primitives.remove(primitive);
    //     // 释放几何和材质资源（可选，优化内存）
    //     primitive.destroy();
    //     primitive = null;

    //     video.removeEventListener('timeupdate');
    // }
    // if (positions.value.length < 4) return;
    // init()
}


const init = () => {
    const video = document.getElementById('video');
    const polygon = new Cesium.PolygonGeometry({
        polygonHierarchy: new Cesium.PolygonHierarchy(positions.value),
    });
    const geometry = Cesium.PolygonGeometry.createGeometry(polygon);
    const instance = new Cesium.GeometryInstance({
        geometry: geometry,
    });


    let canvas = document.createElement('canvas')
    let ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const material = createMaterial(canvas)


    primitive = props.viewer.scene.primitives.add(new Cesium.Primitive({
        geometryInstances: instance,
        appearance: new Cesium.MaterialAppearance({
            material: material,
            faceForward: true
        }),
        asynchronous: false
    }));

    const updateVideoFrame = () => {
        requestAnimationFrame(updateVideoFrame)
        if (video.readyState < 2) return
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // 关键：强制更新纹理
        // const gl = props.viewer.scene.context._gl;
        // const texture = material._textures.image;
        // if (texture) {
        //     gl.bindTexture(gl.TEXTURE_2D, texture._texture);
        //     gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
        //     gl.bindTexture(gl.TEXTURE_2D, null);
        // }
        material.uniforms.image = canvas;           // 视频帧
        // material.markDirty()
        props.viewer.scene.requestRender(); // 强制场景重绘
        // const material = createMaterial(canvas)
        // primitive.appearance.material = material

    }
    updateVideoFrame()
    // video.addEventListener('timeupdate', () => {
    //     updateVideoFrame();
    // });
}

// init()
// init()
// setTimeout(() => {
//     console.log('positions', positions.value)
// }, 2000);
watch(() => positions.value, (val) => {
    if (!val.length) return
    if (!polygonEntity) updatePolygon()
})
</script>
