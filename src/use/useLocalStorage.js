/** localStorage 设置有效时间 */
const useLocalStorage = () => {
    /**
     * 保存参数，maxAge是有效时间，不传，默认使用key之前的时间，如果没有maxAge就不过期
     * @param {*} key 
     * @param {*} value 
     * @param {*} maxAge 有效时间，毫秒
     */
    const setLocalStorageItem = (key, value, maxAge) => {
        // 设置值的时候，更新有效时间
        const setItemValue = { value, time: Date.now(), maxAge: Infinity }
        // 传参有有效时间，使用有效时间
        if (maxAge) setItemValue.maxAge = maxAge
        else {
            const item = JSON.parse(localStorage.getItem(key))
            // 原本有有效时间，使用原本的
            if (item && item.maxAge) setItemValue.maxAge = item.maxAge
        }
        localStorage.setItem(key, JSON.stringify(setItemValue))
    }

    /** 获取key对应的数据，如果已经过期，返回null */
    const getLocalStorageItem = (key) => {
        const item = JSON.parse(localStorage.getItem(key))
        // 判断时间有没有超时，没有返回内容
        if (item && item.maxAge && Date.now() - item.time < item.maxAge) return item.value
        // 超时删除内容
        localStorage.removeItem(key)
        return null
    }

    return {setLocalStorageItem, getLocalStorageItem}
}

export default useLocalStorage