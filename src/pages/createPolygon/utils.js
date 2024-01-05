import { getUtmCoords, getWgs84 } from "../../utils/coordinateTransformation";



/**
 * 根据起点、终点、长度和等分数量计算出对应的点数组
 * @param {{longitude: number, latitude: number}} start - 起点坐标 
 * @param {{longitude: number, latitude: number}} end - 终点坐标 [x, y]
 * @param {number} dist - 长度
 * @param {number} dividedNum - 等分数量
 * @returns {Array} - 点数组 {longitude: number, latitude: number}[]
 */
export const drawFunc = (start, end, dist = 1000, dividedNum = 8) => {
    if(!start) start = {longitude: end.longitude + 0.001, latitude: end.latitude}
    start = getUtmCoords(start)
    end = getUtmCoords(end)
    const result = [];
    const vectorSE = [end[0] - start[0], end[1] - start[1]];

    if (vectorSE[0] === 0 && vectorSE[1] === 0) {
        return null;
    }

    const originalDist = Math.sqrt(vectorSE[0] ** 2 + vectorSE[1] ** 2);
    const rate = dist / originalDist;

    const rightX = end[0] + rate * vectorSE[0];
    const rightY = end[1] + rate * vectorSE[1];
    const rightVector = [rightX - end[0], rightY - end[1]];
    result.push(getWgs84([rightX, rightY]));

    const theta = (2 * Math.PI) / dividedNum;

    for (let i = 1; i < dividedNum; i++) {
        const angle = i * theta;
        const cosAngle = Math.cos(angle);
        const sinAngle = Math.sin(angle);

        const rotatedX = end[0] + rightVector[0] * cosAngle - rightVector[1] * sinAngle;
        const rotatedY = end[1] + rightVector[0] * sinAngle + rightVector[1] * cosAngle;

        result.push(getWgs84([rotatedX, rotatedY]));
    }

    return result;
}

/** 计算线段 AB 与线段 CD 之间的夹角，返回两条线段之间的夹角值（以弧度为单位） */
export const calculateAngle = (startA, endA, startC, endC) => {
    const vectorAB = [endA[0] - startA[0], endA[1] - startA[1]];
    const vectorCD = [endC[0] - startC[0], endC[1] - startC[1]];

    const dotProduct = vectorAB[0] * vectorCD[0] + vectorAB[1] * vectorCD[1];
    const lengthAB = Math.hypot(...vectorAB);
    const lengthCD = Math.hypot(...vectorCD);

    const cosTheta = dotProduct / (lengthAB * lengthCD);
    const theta = Math.acos(Math.max(-1, Math.min(1, cosTheta)));

    return theta;
}

/**
* 获取角度最小点
* @param {Array} referencePoint - 参考点的坐标 [x, y]
* @param {Array} pointsArray - 上下左右四个点的集合，每个点的坐标 [x, y]
* @param {Array} targetPoint - 目标点的坐标 [x, y]
* @returns {Array} - 最佳点的坐标 [x, y]
*/
export const getBestPoint = (referencePoint, pointsArray, targetPoint) => {
    let bestPoint = pointsArray[0];
    let bestAngle = calculateAngle(getUtmCoords(referencePoint), getUtmCoords(targetPoint), getUtmCoords(referencePoint), getUtmCoords(bestPoint));

    for (let i = 1; i < pointsArray.length; i++) {
        let angle = calculateAngle(getUtmCoords(referencePoint), getUtmCoords(targetPoint), getUtmCoords(referencePoint), getUtmCoords(pointsArray[i]));

        if (angle < bestAngle) {
            bestPoint = pointsArray[i];
            bestAngle = angle;
        }
    }

    return bestPoint;
}

/**
 * 获取最近点
 * @param {Array} start - 参考线段起点坐标 [x, y]
 * @param {Array} end - 参考线段终点坐标 [x, y]
 * @param {Array} target - 目标点坐标 [x, y]
 * @param {number} limitDist - 限制距离
 * @returns {Array} - 最近点的坐标 [x, y]
 */
export const getNearestPoint = (start, end, target, limitDist = 5) => {
    const startUtm = getUtmCoords(start)
    const endUtm = getUtmCoords(end)
    const targetUtm = getUtmCoords(target)
    const vector = [endUtm[0] - startUtm[0], endUtm[1] - startUtm[1]];
    const angle = calculateAngle(startUtm, endUtm, startUtm, targetUtm);
    const length1 = Math.hypot(...vector);
    const length2 = Math.hypot(targetUtm[0] - startUtm[0], targetUtm[1] - startUtm[1]);
    const dist = length2 * Math.sin(angle);

    if (dist > limitDist) {
        return target;
    }


    if (length2 === 0) {
        return target;
    }

    const rate = (length2 * Math.cos(angle)) / length1;
    const x = startUtm[0] + rate * vector[0];
    const y = startUtm[1] + rate * vector[1];

    return getWgs84([x, y]);
}

/**
 * 根据三个点计算相对于 1-2 点生成线段的直角点
 * @param {{longitude: number, latitude: number}} point1 - 第一个点对象 
 * @param {{longitude: number, latitude: number}} point2 - 第二个点对象 
 * @param {{longitude: number, latitude: number}} point3 - 第三个点对象 
 * @returns {{longitude: number, latitude: number}} - 直角点对象 
 */
export const getPoint = (point1, point2, point3) => {
    const [x1, y1] = getUtmCoords(point1);
    const [x2, y2] = getUtmCoords(point2);
    const [x3, y3] = getUtmCoords(point3);

    const temp_a = (x1 - x2) * (y2 - y1);
    const temp_b = (x1 - x2) ** 2;
    const temp_c = (y2 - y1) ** 2;

    let x, y;
    y = (temp_b * y3 + temp_c * y2 + temp_a * (x3 - x2)) / (temp_b + temp_c);

    if (y1 !== y2) x = x3 + ((y - y3) * (x2 - x1)) / (y2 - y1);
    else x = x2;

    const result = getWgs84([x, y]);

    return result
};