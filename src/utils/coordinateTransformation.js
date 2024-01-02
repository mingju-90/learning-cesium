import proj4 from 'proj4'
const CGCS2000CodeMap = {
    25: '+proj=tmerc +lat_0=0 +lon_0=75 +k=1 +x_0=25500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
    26: '+proj=tmerc +lat_0=0 +lon_0=78 +k=1 +x_0=26500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
    27: '+proj=tmerc +lat_0=0 +lon_0=81 +k=1 +x_0=27500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
    28: '+proj=tmerc +lat_0=0 +lon_0=84 +k=1 +x_0=28500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
    29: '+proj=tmerc +lat_0=0 +lon_0=87 +k=1 +x_0=29500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
    30: '+proj=tmerc +lat_0=0 +lon_0=90 +k=1 +x_0=30500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
    31: '+proj=tmerc +lat_0=0 +lon_0=93 +k=1 +x_0=31500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
    32: '+proj=tmerc +lat_0=0 +lon_0=96 +k=1 +x_0=32500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
    33: '+proj=tmerc +lat_0=0 +lon_0=99 +k=1 +x_0=33500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
    34: '+proj=tmerc +lat_0=0 +lon_0=102 +k=1 +x_0=34500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
    35: '+proj=tmerc +lat_0=0 +lon_0=105 +k=1 +x_0=35500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
    36: '+proj=tmerc +lat_0=0 +lon_0=108 +k=1 +x_0=36500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
    37: '+proj=tmerc +lat_0=0 +lon_0=111 +k=1 +x_0=37500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
    38: '+proj=tmerc +lat_0=0 +lon_0=114 +k=1 +x_0=38500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
    39: '+proj=tmerc +lat_0=0 +lon_0=117 +k=1 +x_0=39500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
    40: '+proj=tmerc +lat_0=0 +lon_0=120 +k=1 +x_0=40500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
    41: '+proj=tmerc +lat_0=0 +lon_0=123 +k=1 +x_0=41500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
    42: '+proj=tmerc +lat_0=0 +lon_0=126 +k=1 +x_0=42500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
    43: '+proj=tmerc +lat_0=0 +lon_0=129 +k=1 +x_0=43500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
    44: '+proj=tmerc +lat_0=0 +lon_0=132 +k=1 +x_0=44500000 +y_0=0 +ellps=GRS80 +units=m +no_defs',
    45: '+proj=tmerc +lat_0=0 +lon_0=135 +k=1 +x_0=45500000 +y_0=0 +ellps=GRS80 +units=m +no_defs'
}


/**
 * 经纬度转投影坐标系
 * @param {{longitude: number, latitude: number}} coords 
 * @returns 
 */
export const getUtmCoords = (coords) => {
    // // 定义经纬度坐标系和CGCS2000坐标系的投影定义
    const wgs84 = '+proj=longlat +datum=WGS84 +no_defs';
    const cgcs2000 = CGCS2000CodeMap[Math.round(coords.longitude / 3)]
    // 转换为UTM投影坐标
    const utmCoords = proj4(wgs84, cgcs2000, [coords.longitude, coords.latitude]);
    return utmCoords
}

/** 将 cgcs2000 坐标转 经纬度*/
export const getWgs84 = (coords) => {
    const wgs84 = '+proj=longlat +datum=WGS84 +no_defs';
    const cgcs2000 = CGCS2000CodeMap[coords[0].toString().slice(0, 2)]
    const wgs84Coords = proj4(cgcs2000, wgs84, coords)
    return wgs84Coords
}


/**
 * 获取鼠标对应的经纬度
 * @param {{x: number, y: number}} position 
 * @returns {{longitude: number, latitude: number}}
 */
export const getPosition = (position) => {
    const ellipsoid = viewer.scene.globe.ellipsoid
    const cartesian = viewer.camera.pickEllipsoid(position, ellipsoid)
    if (!cartesian) return
    const cartographic = ellipsoid.cartesianToCartographic(cartesian)
    const longitude = Cesium.Math.toDegrees(cartographic.longitude)
    const latitude = Cesium.Math.toDegrees(cartographic.latitude)
    return { longitude, latitude }
}

/**
 * 根据两点坐标返回距离
 * @param {{longitude: number, latitude: number}} start 
 * @param {{longitude: number, latitude: number}} end 
 * @returns {number}
 */
export const getDistance = (start, end) => {
    const startPoint = Cesium.Cartographic.fromDegrees(start.longitude, start.latitude);
    const endPoint = Cesium.Cartographic.fromDegrees(end.longitude, end.latitude);
    const geodesic = new Cesium.EllipsoidGeodesic(startPoint, endPoint);
    const distance = geodesic.surfaceDistance; // 线段长度
    return ~~(distance * 100) / 100; // 显示线段长度，保留两位小数
}

export const getInterpolated = (start, end, targetDistance = 100) => {
    // 定义起点和终点坐标
    const startPoint = Cesium.Cartesian3.fromDegrees(start.longitude, start.latitude);
    const endPoint = Cesium.Cartesian3.fromDegrees(end.longitude, end.latitude);

    // 计算起点到终点的距离
    const totalDistance = Cesium.Cartesian3.distance(startPoint, endPoint);

    // 根据目标距离进行线性插值，得到对应的坐标
    const interpolatedPosition = Cesium.Cartesian3.lerp(startPoint, endPoint, targetDistance / totalDistance, new Cesium.Cartesian3());
    console.log(interpolatedPosition);

    // 将插值后的坐标转换为经度和纬度
    const interpolated = {
        longitude: Cesium.Math.toDegrees(Cesium.Cartographic.fromCartesian(interpolatedPosition).longitude),
        latitude: Cesium.Math.toDegrees(Cesium.Cartographic.fromCartesian(interpolatedPosition).latitude)
    }

    console.log(interpolated);
    return interpolated
}