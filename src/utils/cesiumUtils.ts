import * as Cesium from 'cesium';
import { Cartesian3, Cartographic, sampleTerrainMostDetailed, Viewer, TerrainProvider } from 'cesium';
import * as turf from '@turf/turf';
/**
 * 创建一个带有圆形图形和文本（可选）的 Canvas 元素，并返回其数据 URL
 * @param string 要绘制在圆形内的文本，可选参数，如果传入则会绘制文本，否则只绘制圆形
 * @returns 返回生成的 Canvas 的数据 URL，格式为"data:image/png;base64,..."
 */
export const createCircleCanvas = (string: string | number | undefined, fillcolor = '#19A0FE'): string => {
  const canvas = document.createElement('canvas');
  // canvas.style.zIndex = '999'
  canvas.width = 30;
  canvas.height = 30;
  const textcolor = 'white';
  // const fillcolor = '#19A0FE';
  const context = canvas.getContext('2d');
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = (canvas.width - 4) / 2;
  // 调用 drawCircle 函数绘制圆形
  drawCircle(context, centerX, centerY, radius, textcolor, fillcolor);
  // 如果传入了文本字符串，则调用 drawTextInCircle 函数在圆形内绘制文本
  if (string) {
    string = `${string}`;
    drawTextInCircle(context, centerX, centerY, string, textcolor);
  }
  return canvas.toDataURL();
};

/**
 * 在给定的 2D 绘图上下文上绘制一个圆形
 * @param ctx 2D 绘图上下文对象，用于绘制图形
 * @param x 圆形的圆心 x 坐标
 * @param y 圆形的圆心 y 坐标
 * @param radius 圆形的半径
 * @param borderColor 圆形的边框颜色
 * @param fillcolor 圆形的填充颜色
 */
const drawCircle = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, borderColor: string, fillcolor: string): void => {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2; // 可自定义线条宽度
  ctx.fillStyle = fillcolor;
  ctx.fill();
  ctx.stroke();
};

/**
 * 在给定的 2D 绘图上下文上的圆形内绘制文本
 * @param ctx 2D 绘图上下文对象，用于绘制图形和文本
 * @param x 文本的 x 坐标，通常设置为圆形的圆心 x 坐标
 * @param y 文本的 y 坐标，通常设置为圆形的圆心 y 坐标
 * @param text 要绘制的文本内容
 * @param textColor 文本的颜色
 * @param fontFamily 文本的字体样式，默认值为 '16px Arial'
 */
const drawTextInCircle = (ctx: CanvasRenderingContext2D, x: number, y: number, text: string, textColor: string, fontFamily = '12px Arial'): void => {
  ctx.font = fontFamily;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
};

/**
 * 该函数用于将 Cesium Viewer 的视角飞行到一组坐标的中心点位置。
 * @param viewer - Cesium 的 Viewer 实例，用于操作和展示 Cesium 场景。
 * @param coordinates - 包含经度和纬度的坐标数组，每个坐标对象应具有 longitude 和 latitude 属性。
 * @param height - 飞行到的目标高度，单位为米，默认为 2000 米。
 */
export const flyToCenter = (
  viewer: Cesium.Viewer,
  coordinates: { longitude: number | string; latitude: number | string }[],
  height: number = 2000
): void => {
  // 计算坐标的中心位置
  let sumLongitude = 0;
  let sumLatitude = 0;
  for (const coord of coordinates) {
    sumLongitude += +coord.longitude;
    sumLatitude += +coord.latitude;
  }
  const centerLongitude = sumLongitude / coordinates.length;
  const centerLatitude = sumLatitude / coordinates.length;

  // 将经纬度转换为弧度
  const radiansLongitude = Cesium.Math.toRadians(centerLongitude);
  const radiansLatitude = Cesium.Math.toRadians(centerLatitude);

  // 创建笛卡尔坐标
  const cartesian = Cesium.Cartesian3.fromRadians(radiansLongitude, radiansLatitude, height);

  // 跳转到指定坐标位置，并配置飞行选项
  viewer.camera.flyTo({
    destination: cartesian,
    duration: 0.5, // 飞行时间，单位：秒
    easingFunction: Cesium.EasingFunction.EASE_IN_OUT_QUAD, // 飞行缓动函数
    complete: () => {
      console.log('已跳转到指定位置');
    }
  });
};

/**
 * 设置 Cesium Viewer 的相机视角中心到指定的经纬度和高度。
 *
 * @param {Viewer} viewer - Cesium 的 Viewer 实例，用于操作地图视图。
 * @param {Object} options - 包含经纬度和高度的对象。
 * @param {number} options.longitude - 目标位置的经度，以度为单位。
 * @param {number} options.latitude - 目标位置的纬度，以度为单位。
 * @param {number} [options.height=2000] - 目标位置的高度，以米为单位，默认为 2000 米。
 * @returns {void}
 */
export const setCenter = (
  viewer: Viewer,
  { longitude, latitude, pitch }: { longitude: number | string; latitude: number | string, pitch: number | string },
  height = 2000
): void => {
  if(pitch === undefined) pitch = -90
  // 将 longitude 转换为 number 类型
  const parsedLongitude = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
  // 将 latitude 转换为 number 类型
  const parsedLatitude = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
  // 将 height 转换为 number 类型
  const parsedHeight = typeof height === 'string' ? parseFloat(height) : height;
  const parsedPitch = typeof pitch === 'string' ? parseFloat(pitch) : pitch;
  console.log(parsedLongitude, parsedLatitude, parsedHeight)
  viewer.camera.setView({
    destination: Cartesian3.fromDegrees(parsedLongitude, parsedLatitude, parsedHeight),
    orientation: {
      pitch: Cesium.Math.toRadians(parsedPitch),  // 转换为弧度（Cesium内部使用弧度）
      heading: 0  // 航向角保持默认0（正北方向）
    }
  });
};


export const lookAtPoint = (
  viewer: Viewer,
  { 
    longitude, 
    latitude, 
    altitude,  // 中心点的海拔（地面基准点）
    pitch = -90  // 倾斜角度，默认-90度（正俯视）
  }: { 
    longitude: number | string; 
    latitude: number | string;
    altitude: number;  // 必选：中心点海拔
    pitch?: number | string;  // 可选：倾斜角度
  },
  height = 2000  // 最终相机高度（拉高后的高度）
): void => {
  // 解析经纬度为数字
  const parsedLongitude = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
  const parsedLatitude = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
  
  // 解析倾斜角度（转为弧度）
  const parsedPitch = typeof pitch === 'string' ? parseFloat(pitch) : pitch;
  const pitchRadians = Cesium.Math.toRadians(parsedPitch);
  
  // 解析最终相机高度
  const parsedHeight = typeof height === 'string' ? parseFloat(height) : height;

  // 1. 计算中心点坐标（经纬度 + 基准海拔）
  const centerPoint = Cartesian3.fromDegrees(
    parsedLongitude, 
    parsedLatitude, 
    altitude  // 这里用中心点自身的海拔
  );
  viewer.camera.lookAt(centerPoint, new Cesium.HeadingPitchRange(0, pitchRadians, height))
  
};

/**
 * 聚焦到指定地理位置并设置相机视角
 * @param {Cesium.Viewer} viewer - Cesium Viewer实例
 * @param {number} longitude - 经度
 * @param {number} latitude - 纬度
 * @param {number} altitude - 高度（米）
 * @param {number} [pitch=-50] - 俯仰角（度），默认-50度（向下倾斜）
 */
export const focusOnLocation = (viewer, longitude, latitude, altitude, pitch = -50) => {
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude), // 从高空俯瞰地球
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(pitch) // 垂直向下看
    }
  });
  viewer.camera.moveBackward(1000);
};

/**
 * 将值转换为数字类型的函数，如果转换失败则输出错误信息并返回 null
 * @param {string | number} value - 待转换为数字的值
 * @returns {number | null} - 转换后的数字，若转换失败则返回 null
 */
const convertToNumber = (value: string | number): number | null => {
  const num = Number(value);
  if (isNaN(num)) {
    console.error(`值 ${value} 无法转换为有效的数字`);
    return null;
  }
  return num;
};

/**
 * 获取多个经纬度坐标点的地形高度
 * @param viewer Cesium Viewer 实例
 * @param positions 坐标数组，格式：[[lng, lat], [lng, lat], ...]
 * @returns 带高度的坐标数组，格式：[[lng, lat, height], ...]
 */
export const getPositionHeight = async (
  viewer: { terrainProvider: any },
  positions: [number, number][]
): Promise<[number, number, number][] | null> => {
  const terrainProvider = viewer.terrainProvider;

  if (!terrainProvider) {
    console.error('地形提供者未定义');
    return positions.map((pos) => [...pos, 0]); // 默认返回高度0
  }

  try {
    // 转换为 Cartographic 数组
    const cartographicList = positions.map(([lng, lat]) => Cartographic.fromDegrees(lng, lat));

    // 采样地形高度（异步）
    const sampledPositions = await sampleTerrainMostDetailed(terrainProvider, cartographicList);

    // 合并结果：[lng, lat, height]
    return sampledPositions.map((pos, index) => [
      positions[index][0], // lng
      positions[index][1], // lat
      pos.height || 0 // height（默认0）
    ]);
  } catch (error) {
    console.error('地形采样出错:', error);
    return null;
  }
};

/**
 * 生成围绕中心点盘旋上升的点的坐标数组
 * @param center - 中心点的坐标，包含经度、纬度和高度
 * @param radius - 盘旋的半径，单位为米
 * @param totalHeight - 盘旋上升的总高度，单位为米
 * @param pointsPerCircle - 每一圈的点数，默认为 50
 * @param numCircles - 总的盘旋圈数，默认为 5
 * @returns 包含所有点坐标的数组，每个元素是一个包含经度、纬度和高度的对象
 */
export const generateSpiralPositions: (
  center: { longitude: number; latitude: number; height: number },
  radius: number,
  totalHeight: number,
  pointsPerCircle: number,
  numCircles: number
) => { longitude: number; latitude: number; height: number }[] = (center, radius, totalHeight, pointsPerCircle, numCircles) => {
  // 设置参数默认值
  // 如果调用时未传入 pointsPerCircle 或者传入的值为 falsy 值（如 0、null、undefined 等），则将其设为 50
  pointsPerCircle = pointsPerCircle || 50;
  // 如果调用时未传入 numCircles 或者传入的值为 falsy 值，则将其设为 5
  numCircles = numCircles || 5;

  // 计算总的点数，通过每圈的点数乘以总圈数得到
  const totalPoints = numCircles * pointsPerCircle;

  // 用于存储所有生成点的坐标，每个点以包含经度、纬度和高度的对象形式存储
  const positions: { longitude: number; latitude: number; height: number }[] = [];

  // 循环生成每个点的坐标
  for (let i = 0; i < totalPoints; i++) {
    // 计算当前点所在的角度，根据当前点的索引与每圈点数的比例乘以 2π 得到
    const angle = (i / pointsPerCircle) * 2 * Math.PI;

    // 根据角度计算该点的经度
    // 利用三角函数 cos 结合半径和中心点的经度，计算出相对于中心点的经度偏移量并累加
    const longitude = center.longitude + (radius / 111320) * Math.cos(angle);

    // 根据角度计算该点的纬度
    // 先通过三角函数 sin 结合半径计算出纬度的偏移量
    // 再除以中心点纬度的余弦值进行修正，最后累加到中心点的纬度上
    const latitude = center.latitude + ((radius / 111320) * Math.sin(angle)) / Math.cos((center.latitude * Math.PI) / 180);

    // 根据当前点的索引与总点数的比例计算该点的高度
    // 得到当前点相对于总上升高度的比例，再乘以总上升高度并累加到中心点的高度上
    const height = center.height + (i / totalPoints) * totalHeight;

    // 将计算得到的点的经度、纬度和高度封装成一个对象，并添加到 positions 数组中
    positions.push({ longitude, latitude, height });
  }

  // 返回包含所有点坐标的数组
  return positions;
};

/**
 * 将经纬度坐标转换为窗口坐标
 * @param {Cesium.Viewer} viewer - Cesium 的 Viewer 对象，用于获取场景信息
 * @param {Object} position - 包含经度、纬度和高度的对象
 * @param {number} position.longitude - 位置的经度
 * @param {number} position.latitude - 位置的纬度
 * @param {number} position.height - 位置的高度
 * @returns {Object|null} - 如果转换成功，返回包含 x 和 y 窗口坐标的对象；否则返回 null
 */
export const getWindowCoordinates = (viewer, position) => {
  const { longitude, latitude, height } = position;
  // 将经纬度和高度转换为笛卡尔坐标
  const cartesian = Cesium.Cartesian3.fromDegrees(longitude, latitude, height);

  console.log(Cesium.SceneTransforms.worldToWindowCoordinates);
  // 将笛卡尔坐标转换为窗口坐标
  // const windowCoordinates = Cesium.SceneTransforms.wgs84ToWindowCoordinates(viewer.scene, cartesian);
  const windowCoordinates = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, cartesian);

  if (windowCoordinates) {
    return {
      x: windowCoordinates.x,
      y: windowCoordinates.y
    };
  }
  return null;
};

/**
 * 格式化单个经纬度数值到指定精度
 * @param {number} coordinate - 要格式化的经纬度数值
 * @param {number} [precision=6] - 精度，默认为 6（厘米级）
 * @returns {string} 格式化后的经纬度字符串
 */
export const formatCoordinate = (coordinate: number, precision: number = 6): string => {
  const decimalPlaces = precision;
  return coordinate.toFixed(decimalPlaces);
};

export const isWaylinePoint = (position, viewer) => {
  const pickedObject = viewer.scene.pick(position);
  if (Cesium.defined(pickedObject) && pickedObject.id instanceof Cesium.Entity) {
    const clickedEntity = pickedObject.id;
    const type = clickedEntity.type;
    return type === 'waylinePoint';
  }
  return false;
};

/** 获取航点的索引, 这个是实际索引 + 1的值 */
export const getWaylinePointIndex = (position, viewer) => {
  const pickedObject = viewer.scene.pick(position);
  if (Cesium.defined(pickedObject) && pickedObject.id instanceof Cesium.Entity) {
    const clickedEntity = pickedObject.id;
    const type = clickedEntity.type;
    if (type !== 'waylinePoint') return false;
    const index = clickedEntity.index;
    return index;
  }
  return false;
};

/** 根据中心点, 长宽 获取边界4点坐标, center = [lng, lat], 返回的数据 [[lng, lat]] */
export const getRectangleVertices = (center, length, width) => {
  // 将长度和宽度从米转换为千米
  const lengthInKm = length / 1000;
  const widthInKm = width / 1000;

  const halfLength = lengthInKm / 2;
  const halfWidth = widthInKm / 2;

  // 定义四个顶点相对于中心点的偏移角度（单位：度）
  const angles = [0, 90, 180, 270];
  const distances = [halfLength, halfWidth, halfLength, halfWidth];

  const vertices = [];
  for (let i = 0; i < 4; i++) {
    const vertex = turf.destination(center, distances[i], angles[i], { units: 'kilometers' });
    vertices.push(vertex.geometry.coordinates);
  }

  return vertices;
};
