
/** 代表 */
const borderLineSource = `
uniform vec4 edgeColor;    // 两侧边框色
uniform vec4 bgColor;      // 中间背景色
uniform float edgeRatio;   // 单侧边框占比（0~0.5，总边框占比为 2*edgeRatio）
czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material material = czm_getDefaultMaterial(materialInput);
    float t = materialInput.st.t;  // 纵向坐标（0~1 范围）

    // 计算两侧边框的阈值（中间区域为背景）
    float leftThreshold = edgeRatio;       // 左侧边框阈值（0 ~ edgeRatio 为左侧边框）
    float rightThreshold = 1.0 - edgeRatio; // 右侧边框阈值（1.0 - edgeRatio ~ 1.0 为右侧边框）

    // 判断是否在左侧边框或右侧边框（1.0 表示边框区，0.0 表示背景区）
    float isLeftEdge = step(t, leftThreshold);       // t <= leftThreshold → 左侧边框
    float isRightEdge = step(rightThreshold, t);     // t >= rightThreshold → 右侧边框
    float isEdge = max(isLeftEdge, isRightEdge);     // 合并两侧边框（取最大值，只要在一侧就为 1.0）

    // 混合颜色：边框区用 edgeColor，背景区用 bgColor
    vec4 finalColor = mix(bgColor, edgeColor, isEdge);

    material.diffuse = finalColor.rgb;
    material.alpha = 1.0;
    return material;
}
`

/**
 * PolylineEdgeMaterial - 横向两侧深蓝描边 + 中间浅蓝背景
 * 效果：横截面始终是 [深蓝][浅蓝][深蓝]，纵向无限延伸
 */
class PolylineEdgeMaterial {
    constructor(options = {}) {
        this._definitionChanged = new Cesium.Event();

        this._edgeColor = undefined;
        this._bgColor = undefined;
        this._edgeRatio = undefined;

        this._type = 'PolylineEdge';

        this.edgeColor = options.edgeColor || Cesium.Color.fromCssColorString('#003366');
        this.bgColor = options.bgColor || Cesium.Color.fromCssColorString('#66CCFF').withAlpha(0.7);
        this.edgeRatio = options.edgeRatio ?? 0.1; // 两侧各 20%

        this._registerMaterial();
    }

    _registerMaterial() {
        const type = this._type;
        if (Cesium.Material._materialCache.getMaterial(type)) return;

        Cesium.Material._materialCache.addMaterial(type, {
            fabric: {
                type,
                uniforms: {
                    edgeColor: new Cesium.Color(0, 0.2, 0.4, 1),
                    bgColor: new Cesium.Color(0.4, 0.8, 1.0, 0.7),
                    edgeRatio: 0.2
                },
                source: borderLineSource
            },
            translucent: () => true
        });
    }

    getType() { return this._type; }

    getValue(time, result) {
        if (!result) result = {};
        result.edgeColor = Cesium.Property.getValueOrClonedDefault(
            this._edgeColor, time,
            Cesium.Color.fromCssColorString('#003366'), result.edgeColor
        );
        result.bgColor = Cesium.Property.getValueOrClonedDefault(
            this._bgColor, time,
            Cesium.Color.fromCssColorString('#66CCFF').withAlpha(0.7), result.bgColor
        );
        result.edgeRatio = Cesium.Property.getValueOrDefault(
            this._edgeRatio, time, 0.2, result.edgeRatio
        );
        return result;
    }

    equals(other) {
        return this === other ||
            (other instanceof PolylineEdgeMaterial &&
                Cesium.Property.equals(this._edgeColor, other._edgeColor) &&
                Cesium.Property.equals(this._bgColor, other._bgColor) &&
                Cesium.Property.equals(this._edgeRatio, other._edgeRatio));
    }

    static get isConstant() { return false; }
    get definitionChanged() { return this._definitionChanged; }
}

// 响应式属性
Object.defineProperties(PolylineEdgeMaterial.prototype, {
    edgeColor: Cesium.createPropertyDescriptor('edgeColor'),
    bgColor: Cesium.createPropertyDescriptor('bgColor'),
    edgeRatio: Cesium.createPropertyDescriptor('edgeRatio')
});

export default PolylineEdgeMaterial;