const eventTypeMap = {
    leftClick: Cesium.ScreenSpaceEventType.LEFT_CLICK,  // 表示鼠标左键单击事件。
    leftDoubleClick: Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK,   // 表示鼠标左键双击事件。
    leftDown: Cesium.ScreenSpaceEventType.LEFT_DOWN,   // 表示鼠标左键按下事件。
    leftUp: Cesium.ScreenSpaceEventType.LEFT_UP,   // 表示鼠标左键抬起事件。
    middleClick: Cesium.ScreenSpaceEventType.MIDDLE_CLICK,   // 表示鼠标中键单击事​​件。
    middleDown: Cesium.ScreenSpaceEventType.MIDDLE_DOWN,   // 表示鼠标中键按下事​​件。
    middleUp: Cesium.ScreenSpaceEventType.MIDDLE_UP,   // 表示鼠标中键抬起事​​件。
    mouseMove: Cesium.ScreenSpaceEventType.MOUSE_MOVE,   // 表示鼠标移动事件。
    rightClick: Cesium.ScreenSpaceEventType.RIGHT_CLICK,   // 表示鼠标右键单击事件。
    rightDown: Cesium.ScreenSpaceEventType.RIGHT_DOWN,   // 表示鼠标左键按下事件。
    rightUp: Cesium.ScreenSpaceEventType.RIGHT_UP,   // 表示鼠标左键抬起事件。
    wheel: Cesium.ScreenSpaceEventType.WHEEL,   // 表示鼠标滚轮事件。
}


/**
 * 根据传入的事件名保存该事件，并返回重置对应事件的方法, 已保存的事件用空函数代替
 * @param {['leftClick' | 'leftDoubleClick' | 'leftDown' | 'leftUp' | 'middleClick' | 'middleDown' | 'middleUp' | 'mouseMove' | 'rightClick' | 'rightDown' | 'rightUp' | 'wheel']} eventTypeList 
 * @returns {Function}
 */
export const saveEvnet = (eventTypeList = []) => {
    const eventMap = {}
    eventTypeList.forEach(type => {
        if(eventTypeMap[type] === undefined) return console.error(`${type} 不是有效的事件`)
        eventMap[type] = viewer.screenSpaceEventHandler.getInputAction(eventTypeMap[type])
        bindEvent(type, () => {})
    })
    const resetEvents = () => {
        Object.keys(eventMap).forEach(type => bindEvent(type, eventMap[type]))
    }
    return resetEvents
}

/**
 * 根据传入的类型和方法，给cesium绑定事件
 * @param {'leftClick' | 'leftDoubleClick' | 'leftDown' | 'leftUp' | 'middleClick' | 'middleDown' | 'middleUp' | 'mouseMove' | 'rightClick' | 'rightDown' | 'rightUp' | 'wheel'} type 
 * @param {Function} callback 
 * @returns 
 */
export const bindEvent = (type, callback) => {
    if(eventTypeMap[type] === undefined) return console.error(`${type} 不是有效的事件`)
    viewer.screenSpaceEventHandler.setInputAction(callback, eventTypeMap[type])
}