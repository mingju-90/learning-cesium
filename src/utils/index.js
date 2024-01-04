/**
 * 深拷贝，可以处理循环引用
 * @param {*} obj 需要拷贝的对象
 * @param {*} hash 缓存已经拷贝的对象
 * @returns 
 */
export const deepCopy = (obj, hash = new WeakMap()) => {
    // 基本数据类型直接返回
    if (Object(obj) !== obj) return obj
    // 处理循环引用
    if (hash.has(obj)) return hash.get(obj)
    const newObj = Array.isArray(obj) ? [] : {}
    hash.set(obj, newObj)
    for (let key in obj) if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = deepCopy(obj[key], hash)
    return newObj
}

/**
 * 获取随机 ID
 * @returns {String}
 */
export const generateUUID = () => {
    const hexDigits = '0123456789abcdef';
    const uuid = Array(32).fill(1).map(item => hexDigits[Math.floor(Math.random() * 16)]).join('')
    return uuid;
};

/**
 * 函数截流
 * @param {*} callback 执行方法
 * @param {*} delay 截流时间
 * @returns 
 */
export const throttle = (callback, delay = 1000 / 60) => {
    let previous = Date.now()
    return (...args) => {
        const now = Date.now()
        if(now - previous < delay) return
        previous = now
        return callback(...args)
    }
}