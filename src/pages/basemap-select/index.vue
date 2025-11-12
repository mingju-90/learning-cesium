<template>
  <div class="basemap-select-container">
    <Viewer @ready="ready">
      <tianditu v-if="mapType === 'tianditu'"/>
      <tianditu type="annotation" v-if="mapType === 'tiandituAnnotation'"/>
    </Viewer>
    <div class="tools">
      <a-radio-group v-model:value="mapType" button-style="solid">
        <a-radio-button v-for="item of list" :value="item.value">{{ item.label }}</a-radio-button>
      </a-radio-group>
    </div>
  </div>
</template>

<script setup>
// 页面逻辑
import { onMounted, ref } from 'vue';
import Viewer from '../../components/cesiumComponents/viewer.vue';
import tianditu from '../../components/cesiumComponents/tianditu.vue';
import Showline from './showline.vue';
import CesiumTileset from '../../components/cesiumComponents/CesiumTileset.vue';
import { setCenter } from '../../utils/cesiumUtils';

let viewer = null
const isReady = ref(false)
const mapType = ref('tianditu')
const list = [
  {label: '天地图卫星图层', value: 'tianditu'},
  {label: '天地图注记图层', value: 'tiandituAnnotation'},
]


/**
 * 通过射线检测两点之间是否与任意 Entity 发生碰撞（支持自定义回调）
 *
 * @param {Cesium.Viewer} viewer            - Cesium Viewer 实例
 * @param {Array} startLLH                 - 起点坐标 [lng, lat, height]（单位：度、米）
 * @param {Array} endLLH                   - 终点坐标 [lng, lat, height]
 * @param {Function} [callback = () => {}] - 可选回调函数，接收每个拾取对象（pick），返回 true 表示“确认碰撞”
 *                                           - 可用于过滤特定 Entity、排除自身、判断属性等
 * @returns {boolean} true = 射线在两点之间与 Entity 相交（且回调通过），false = 无碰撞或回调未通过
 */
const rayIntersectsEntityBetween = (
    viewer,
    startLLH,
    endLLH,
    callback = () => {}
) => {
    // 将经纬高转为笛卡尔坐标（ECEF）
    const start = Cesium.Cartesian3.fromDegrees(...startLLH);
    const end = Cesium.Cartesian3.fromDegrees(...endLLH);

    // 计算射线方向向量并归一化
    const direction = Cesium.Cartesian3.subtract(end, start, new Cesium.Cartesian3());
    const ray = new Cesium.Ray(
        start,
        Cesium.Cartesian3.normalize(direction, new Cesium.Cartesian3())
    );

    // 计算两点之间的总距离（用于判断交点是否在线段内）
    const totalDistance = Cesium.Cartesian3.distance(start, end);

    // 使用 Cesium 官方推荐的 drillPickFromRay 方法
    // 沿射线拾取所有可能的交点（支持 Entity、3D Tiles、模型等）
    const pickedObjects = viewer.scene.drillPickFromRay(ray, totalDistance);

    // 若无任何拾取对象 → 直接返回无碰撞
    if (!pickedObjects || pickedObjects.length === 0) {
        return false;
    }

    // 遍历所有拾取结果
    for (const pick of pickedObjects) {
        // 确保拾取对象包含有效交点
        if (pick.position) {
            // 计算交点到起点的距离
            const dist = Cesium.Cartesian3.distance(start, pick.position);

            // 调试输出：查看拾取对象的详细信息（如 id、primitive、position）
            console.log('拾取对象:', pick);

            // 判断：
            // 1. 交点必须在两点之间（dist <= totalDistance）
            // 2. 自定义回调必须返回 true（用于过滤）
            if (dist <= totalDistance && callback(pick)) {
                return true; // 确认碰撞
            }
        }
    }

    // 所有交点都不满足条件 → 无有效碰撞
    return false;
};


const ready = async(data) => {
  viewer = data.viewer
  viewer.value = true
  addPolygon()



  setTimeout(() => {
    setCenter(viewer, {longitude: 116.3961, latitude: 39.908})
    const data = [
      // [120.26969657018468, 31.61340747755707, 100],
      // [120.26969657018468, 31.61340747755707, 100]
      [120.26521937049358, 31.617929608858425, 100],
      [120.2674688574947, 31.61597966436243, 100],
      [120.27166473224105, 31.611935170865166, 100],
    ]
    for(let i = 1; i < data.length; i++) {
      const result = rayIntersectsEntityBetween(viewer, data[i - 1], data[i], data => {
        data.primitive.appearance.material = Cesium.Color.RED.withAlpha(0.5)
      })
      console.log(result)
    }
    
  }, 300);
}

const addPolygon = () => {
  const data = [{"id":"1898629673969053698","siteId":"1803667300965437441","fenceData":[[116.39614459108238,39.9088924035036,128],[116.39659916139831,39.90990038595133,128],[116.39917775061281,39.90899500575074,128],[116.39614459108238,39.9088924035036,128]],"fenceType":"0","fenceTypeName":"禁飞区","groundDis":0,"height":0,"siteName":null},{"id":"1899754405682540546","siteId":"1803667300965437441","fenceData":[[121.56762635869832,31.176680928239676,300],[121.56737835702478,31.175339529694078,300],[121.57214670237241,31.174919876686513,300],[121.57231477435668,31.176729047615,300],[121.56762635869832,31.176680928239676,300]],"fenceType":"0","fenceTypeName":"禁飞区","groundDis":0,"height":0,"siteName":null},{"id":"1900091267237806081","siteId":"1803667300965437441","fenceData":[[121.56871675726674,31.176693550178104,400],[121.56827490622706,31.17558657596943,400],[121.57058321890733,31.17609747836491,400],[121.57024041821796,31.177348561277306,400],[121.56871675726674,31.176693550178104,400],[121.56871675726674,31.176693550178104,400]],"fenceType":"0","fenceTypeName":"禁飞区","groundDis":400,"height":400,"siteName":null},{"id":"1988419227049336834","siteId":"1803667300965437441","fenceData":[[120.26883850909834,31.61567159541444,5800],[120.26687098880232,31.61382800869147,5800],[120.26836840352037,31.612607607267677,5800],[120.27183842575158,31.612995830227604,5800],[120.27159437852198,31.614399736675868,5800],[120.26883850909834,31.61567159541444,5800]],"fenceType":"0","fenceTypeName":"禁飞区","groundDis":1,"height":5800,"siteName":null}]
  
  data.forEach(item => {
    if(item.height - item.groundDis < 1) return
      viewer.entities.add({
      type: 'area',
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(item.fenceData.map(iitem => Cesium.Cartesian3.fromDegrees(iitem[0], iitem[1], item.groundDis))),
        material: Cesium.Color.RED, // 设置多边形颜色和透明度
        extrudedHeight: item.height
      }
    });
  })
  

}


onMounted(() => {
  console.log('basemap-select 页面加载完成');
});
</script>

<style scoped lang="scss">
.basemap-select-container {
  padding: var(--spacing-base);
  height: 100%;
}
.tools {
  position: absolute;
  top: 20px;
  right: 20px;
}
</style>