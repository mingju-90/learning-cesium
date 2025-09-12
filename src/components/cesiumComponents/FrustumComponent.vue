<template>
  <div class="frustum-component" v-if="isRendered"></div>
</template>

<script setup>
import { inject, onMounted, onUnmounted, ref, watch } from 'vue';
import * as Cesium from 'cesium';

// 注入Cesium Viewer实例
const viewer = inject('viewer.value');
if (!viewer) {
  console.error('视锥体组件需要通过provide提供viewer实例（格式：provide("viewer.value", viewerRef)）');
}

// 组件参数
const props = defineProps({
  // 渲染类型：entity 或 primitive
  renderType: {
    type: String,
    required: true,
    validator: (v) => ['entity', 'primitive'].includes(v)
  },
  // 视锥体顶点坐标（世界坐标系，Cartesian3数组）
  // 格式：[近截面左下角, 近截面右下角, 近截面右上角, 近截面左上角, 远截面左下角, 远截面右下角, 远截面右上角, 远截面左上角]
  vertices: {
    type: Array,
    required: true,
    validator: (v) => v.length === 8 && v.every(item => item instanceof Cesium.Cartesian3)
  },
  // 样式配置
  style: {
    type: Object,
    default: () => ({
      color: 'rgba(255, 100, 0, 0.3)',      // 填充色
      outlineColor: 'rgba(255, 100, 0, 1)', // 轮廓色
      outlineWidth: 2,                     // 轮廓线宽
      show: true                           // 是否显示
    })
  }
});

// 实例引用
const frustumRef = ref(null);
const isRendered = ref(false);

// 颜色转换工具
const parseColor = (colorStr) => {
  const [r, g, b, a] = colorStr.match(/\d+/g).map(Number);
  return new Cesium.Color(r / 255, g / 255, b / 255, a || 1);
};

// 使用Entity创建视锥体
const createEntityFrustum = () => {
  const { vertices } = props;
  const color = parseColor(props.style.color);
  const outlineColor = parseColor(props.style.outlineColor);

  // 构建视锥体的三角形面（共6个面）
  const triangles = [
    // 近截面
    [vertices[0], vertices[1], vertices[2]],
    [vertices[0], vertices[2], vertices[3]],
    // 远截面
    [vertices[4], vertices[5], vertices[6]],
    [vertices[4], vertices[6], vertices[7]],
    // 四个侧面
    [vertices[0], vertices[1], vertices[5]],
    [vertices[0], vertices[5], vertices[4]],
    [vertices[1], vertices[2], vertices[6]],
    [vertices[1], vertices[6], vertices[5]],
    [vertices[2], vertices[3], vertices[7]],
    [vertices[2], vertices[7], vertices[6]],
    [vertices[3], vertices[0], vertices[4]],
    [vertices[3], vertices[4], vertices[7]]
  ];

  // 创建多边形集合
  const polygonHierarchies = triangles.map(tri => ({
    polygonHierarchy: new Cesium.PolygonHierarchy(tri)
  }));

  return viewer.entities.add({
    show: props.style.show,
    polygons: {
      ...polygonHierarchies,
      material: color,
      outline: true,
      outlineColor,
      outlineWidth: props.style.outlineWidth,
      perPositionHeight: false
    }
  });
};

// 使用Primitive创建视锥体
const createPrimitiveFrustum = () => {
  const { vertices } = props;
  const color = parseColor(props.style.color);
  const outlineColor = parseColor(props.style.outlineColor);

  // 定义视锥体的12个三角形面（与Entity保持一致）
  const positions = [];
  const indices = [];
  let index = 0;

  // 近截面
  positions.push(...vertices.slice(0, 4));
  indices.push(0, 1, 2, 0, 2, 3);
  index += 4;

  // 远截面
  positions.push(...vertices.slice(4, 8));
  indices.push(index, index + 1, index + 2, index, index + 2, index + 3);
  index += 4;

  // 四个侧面
  // 侧面1
  positions.push(vertices[0], vertices[1], vertices[5], vertices[4]);
  indices.push(index, index + 1, index + 2, index, index + 2, index + 3);
  index += 4;

  // 侧面2
  positions.push(vertices[1], vertices[2], vertices[6], vertices[5]);
  indices.push(index, index + 1, index + 2, index, index + 2, index + 3);
  index += 4;

  // 侧面3
  positions.push(vertices[2], vertices[3], vertices[7], vertices[6]);
  indices.push(index, index + 1, index + 2, index, index + 2, index + 3);
  index += 4;

  // 侧面4
  positions.push(vertices[3], vertices[0], vertices[4], vertices[7]);
  indices.push(index, index + 1, index + 2, index, index + 2, index + 3);

  // 创建几何体
  const geometry = new Cesium.Geometry({
    attributes: {
      position: new Cesium.GeometryAttribute({
        componentDatatype: Cesium.ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3,
        values: new Float64Array(Cesium.Cartesian3.packArray(positions))
      }),
      color: new Cesium.GeometryAttribute({
        componentDatatype: Cesium.ComponentDatatype.FLOAT,
        componentsPerAttribute: 4,
        values: new Float32Array(positions.map(() => [color.red, color.green, color.blue, color.alpha]).flat())
      })
    },
    indices: new Uint16Array(indices),
    primitiveType: Cesium.PrimitiveType.TRIANGLES,
    boundingSphere: Cesium.BoundingSphere.fromPoints(positions)
  });

  // 创建外观
  const appearance = new Cesium.PerInstanceColorAppearance({
    flat: true,
    translucent: true,
    vertexShaderSource: `
      attribute vec4 color;
      varying vec4 v_color;
      void main() {
        v_color = color;
        gl_Position = czm_modelViewProjection * vec4(position, 1.0);
      }
    `,
    fragmentShaderSource: `
      varying vec4 v_color;
      void main() {
        gl_FragColor = v_color;
      }
    `,
    outline: props.style.outline,
    outlineColor
  });

  // 创建实例
  const instance = new Cesium.GeometryInstance({
    geometry
  });

  return viewer.scene.primitives.add(new Cesium.Primitive({
    geometryInstances: instance,
    appearance,
    show: props.style.show
  }));
};

// 渲染视锥体
const renderFrustum = () => {
  // 清除已有实例
  if (frustumRef.value) {
    if (props.renderType === 'entity') {
      viewer.entities.remove(frustumRef.value);
    } else {
      viewer.scene.primitives.remove(frustumRef.value);
    }
    frustumRef.value = null;
  }

  // 创建新实例
  frustumRef.value = props.renderType === 'entity' 
    ? createEntityFrustum() 
    : createPrimitiveFrustum();
  
  isRendered.value = !!frustumRef.value;
};

// 初始化渲染
onMounted(() => {
  if (viewer) {
    renderFrustum();
  }
});

// 监听参数变化
watch(
  [() => props.renderType, () => props.vertices, () => props.style],
  () => {
    if (viewer) {
      renderFrustum();
    }
  },
  { deep: true }
);

// 组件销毁时清理
onUnmounted(() => {
  if (viewer && frustumRef.value) {
    if (props.renderType === 'entity') {
      viewer.entities.remove(frustumRef.value);
    } else {
      viewer.scene.primitives.remove(frustumRef.value);
    }
    frustumRef.value = null;
    isRendered.value = false;
  }
});
</script>

<style scoped>
.frustum-component {
  display: none;
}
</style>
