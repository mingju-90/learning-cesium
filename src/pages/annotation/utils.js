export const generateUUID = () => {
    let d = new Date().getTime();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        d += performance.now();
    }
    return 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-uid'.replace(/[x]/g, function (c) {
        const r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
};


export const createRect = ({left, top, width, height, uid = generateUUID()}) => {
    return {
        left,
        top,
        width,
        height,
        uid,
        type: 'rect'
    }
}
export const createPolygon = ({left, top, points, uid = generateUUID()}) => {
    return {
        left,
        top,
        points,
        uid,
        type: 'polygon'
    }
}


