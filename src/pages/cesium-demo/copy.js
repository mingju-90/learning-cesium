

const copy = (obj, map = new Map()) => {
    let result
    if (!obj) return obj
    if (typeof obj === 'function') return obj
    if (typeof obj === 'string') return obj
    if (map.has(obj)) return map.get(obj)

    result = Object.prototype.toString.call(obj) === '[object Array]' ? [] : {}
    map.set(obj, result)
    for(let key in obj) result[key] = copy(obj[key], map)
    return result
}

