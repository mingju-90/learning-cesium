import { getUtmCoords, getWgs84 } from "../../utils/coordinateTransformation";

/**
 * 根据两点和距离计算出对应的4点坐标
 * @param {{longitude: number, latitude: number}} start 
 * @param {{longitude: number, latitude: number}} end 
 * @param {number} dist - 距离
 * @returns {[{longitude: number, latitude: number}, {longitude: number, latitude: number}, {longitude: number, latitude: number}, {longitude: number, latitude: number}]}
 */
export const drawFunc = (start, end, dist = 1000) => {
    start = getUtmCoords(start)
    end = getUtmCoords(end)
    if (start[0] === end[0] && start[1] === end[1]) {
        const horizontal = [end[0] - dist, end[1]];
        const vertical = [end[0], end[1] - dist];
        return [horizontal, vertical];
    }

    const vector_s = [end[0] - start[0], end[1] - start[1]];
    const original_dist = Math.hypot(vector_s[0], vector_s[1]);

    if (original_dist === 0) {
        return null;
    }

    const rate = dist / original_dist;

    const left = [end[0] - rate * vector_s[0], end[1] - rate * vector_s[1]];
    const right = [end[0] + rate * vector_s[0], end[1] + rate * vector_s[1]];

    let n_x, n_y;
    if (vector_s[1] !== 0) {
        n_x = 1;
        n_y = -vector_s[0] * n_x / vector_s[1];
    } else {
        n_x = 0;
        n_y = 1;
    }

    const n_dist = Math.hypot(n_x, n_y);
    const n_rate = dist / n_dist;

    const up = [end[0] - n_rate * n_x, end[1] - n_rate * n_y];
    const down = [end[0] + n_rate * n_x, end[1] + n_rate * n_y];
    return [
        getWgs84(left),
        getWgs84(right),
        getWgs84(up),
        getWgs84(down)
    ];
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
export function getNearestPoint(start, end, target, limitDist = 5) {
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