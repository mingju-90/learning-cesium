<template>
    <div></div>
</template>

<script setup lang="ts">
import {inject} from 'vue'
// import * as Cesium from 'cesium';
// import data from '../../assets/data2.json'
import data from '../../assets/data2.json'
console.log(data)

const viewer = inject('viewer')
if (!viewer.value) {
    console.error('天地图组件需要通过provide提供viewer实例');
}
/**
 * 将坐标数组转换为LineString类型的GeoJSON
 * @param {Array} coordinates - 坐标对象数组，每个对象需包含longitude、latitude、altitude
 * @returns {Object} LineString类型的GeoJSON对象
 */
function convertToLineGeoJSON(coordinates) {
    // 输入验证
    // if (!Array.isArray(coordinates) || coordinates.length === 0) {
    //     throw new Error('请提供有效的坐标数组，且至少包含一个坐标点');
    // }

    // 提取坐标点（转换为 [经度, 纬度, 高度] 格式）
    const lineCoordinates = coordinates.map(coord => {
        // if (!coord.longitude || !coord.latitude) {
        //     throw new Error('坐标对象必须包含longitude和latitude属性');
        // }
        return [...coord]
        return [
            coord.longitude,    // 经度
            coord.latitude,     // 纬度
            coord.altitude || 0 // 高度（默认0）
        ];
    });

    // LineString至少需要2个点，若只有1个点则复制该点形成线段
    if (lineCoordinates.length === 1) {
        lineCoordinates.push([...lineCoordinates[0]]);
        console.warn('坐标点数量不足，已自动复制该点形成线段');
    }

    // 构建GeoJSON
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {}, // 可自定义添加属性信息
                "geometry": {
                    "type": "LineString",
                    "coordinates": lineCoordinates
                }
            }
        ]
    };
}




const lineData = convertToLineGeoJSON(data)


async function loadGeoJson(viewer, geojson, options = {}) {
  // 默认配置
  const {
    lineColor = Cesium.Color.RED,
    lineWidth = 3,
    clampToGround = false
  } = options;

  try {
    // 加载 GeoJSON 数据（支持本地对象或远程 URL）
    const dataSource = await Cesium.GeoJsonDataSource.load(geojson, {
      // 样式配置
      stroke: lineColor,       // 线颜色
      strokeWidth: lineWidth,  // 线宽度
      clampToGround: clampToGround // 是否贴地
    });

    // 将数据源添加到 viewer
    viewer.dataSources.add(dataSource);

    // 自动定位到数据范围
    const entities = dataSource.entities.values;
    if (entities.length > 0) {
    //   const boundingSphere = Cesium.BoundingSphere.fromEntities(entities);
    //   viewer.camera.viewBoundingSphere(boundingSphere, new Cesium.HeadingPitchRange(0, -0.5, 0));
    }

    console.log('GeoJSON 加载成功');
    return dataSource;
  } catch (error) {
    console.error('GeoJSON 加载失败:', error);
    throw error; // 抛出错误供外部处理
  }
}

loadGeoJson(viewer.value, lineData)
</script>