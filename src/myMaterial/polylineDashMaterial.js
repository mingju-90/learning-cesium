
const source = `
uniform vec4 lineColor;
uniform float dashLength;
uniform float gapLength;

czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material material = czm_getDefaultMaterial(materialInput);

    // 纵向进度 t (0~1)
    float t = materialInput.st.t;

    // 一个完整虚线周期的像素长度
    float cycle = dashLength + gapLength;

    // 当前像素在周期中的位置（0 ~ cycle）
    float pos = t * czm_viewport.z;  // czm_viewport.z = 屏幕宽度（像素）

    // 取模，得到周期内位置
    float localPos = mod(pos, cycle);

    // 判断是否在实线段
    float isDash = step(localPos, dashLength);

    // 实线段显示颜色，间隙透明
    vec4 finalColor = lineColor;
    finalColor.a *= isDash;  // 间隙部分 alpha = 0

    material.diffuse = finalColor.rgb;
    material.alpha = finalColor.a;
    return material;
}
`

/**
 * PolylineDashMaterial - 虚线材质
 * 效果：实线 + 透明间隙，沿线重复
 */
class PolylineDashMaterial {
    constructor(options = {}) {
        this._definitionChanged = new Cesium.Event();

        this._lineColor = undefined;
        this._dashLength = undefined;  // 实线段长度（像素）
        this._gapLength = undefined;   // 间隙长度（像素）

        this._type = 'PolylineDash';

        // 默认参数
        this.lineColor = options.lineColor || Cesium.Color.WHITE;
        this.dashLength = options.dashLength ?? 20;  // 实线 20px
        this.gapLength = options.gapLength ?? 10;    // 间隙 10px

        this._registerMaterial();
    }

    _registerMaterial() {
        const type = this._type;
        if (Cesium.Material._materialCache.getMaterial(type)) return;

        Cesium.Material._materialCache.addMaterial(type, {
            fabric: {
                type: type,
                uniforms: {
                    lineColor: new Cesium.Color(1, 1, 1, 1),
                    dashLength: 20.0,
                    gapLength: 10.0
                },
                source
            },
            translucent: () => true
        });
    }

    getType() { return this._type; }

    getValue(time, result) {
        if (!Cesium.defined(result)) result = {};

        result.lineColor = Cesium.Property.getValueOrClonedDefault(
            this._lineColor, time, Cesium.Color.WHITE, result.lineColor
        );
        result.dashLength = Cesium.Property.getValueOrDefault(
            this._dashLength, time, 20.0, result.dashLength
        );
        result.gapLength = Cesium.Property.getValueOrDefault(
            this._gapLength, time, 10.0, result.gapLength
        );

        return result;
    }

    equals(other) {
        return this === other ||
            (other instanceof PolylineDashMaterial &&
                Cesium.Property.equals(this._lineColor, other._lineColor) &&
                Cesium.Property.equals(this._dashLength, other._dashLength) &&
                Cesium.Property.equals(this._gapLength, other._gapLength));
    }

    static get isConstant() { return false; }
    get definitionChanged() { return this._definitionChanged; }
}

// 添加响应式属性
Object.defineProperties(PolylineDashMaterial.prototype, {
    lineColor: Cesium.createPropertyDescriptor('lineColor'),
    dashLength: Cesium.createPropertyDescriptor('dashLength'),
    gapLength: Cesium.createPropertyDescriptor('gapLength')
});

export default PolylineDashMaterial;