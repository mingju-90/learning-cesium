
/**
 * 将大疆设备的角度（偏航角、俯仰角）转换为Cesium的HeadingPitchRoll对象
 * @param {number} yaw - 大疆设备的偏航角（单位：度）
 * @param {number} pitch - 大疆设备的俯仰角（单位：度）
 * @returns {Cesium.HeadingPitchRoll} Cesium坐标系下的航向-俯仰-翻滚角对象
 */
export const convertDjiToCesiumAngles = (yaw, pitch) => {
    // 转换偏航角：大疆与Cesium坐标系偏航角基准不同，需加90度补偿，再转为弧度
    const radYaw = Cesium.Math.toRadians(90 + yaw);
    // 转换俯仰角：大疆与Cesium俯仰角方向相反，取负值后转为弧度
    const radPitch = -Cesium.Math.toRadians(pitch);
    // 翻滚角(roll)默认为0，创建并返回HeadingPitchRoll对象
    return new Cesium.HeadingPitchRoll(radYaw, radPitch, 0);
};


/**
 * 将大疆设备的角度参数转换为Cesium可用的四元数方向
 * 用于将大疆设备的姿态（偏航角、俯仰角等）正确映射到Cesium场景中
 * @param {Cesium.Cartesian3} position - 位置坐标（世界坐标系）
 * @param {number} yaw - 大疆设备的偏航角（单位：度）
 * @param {number} [pitch=0] - 大疆设备的俯仰角（单位：度），默认0
 * @param {number} [gimbalRoll=0] - 云台翻滚角（单位：度），默认0（当前实现未使用）
 * @returns {Cesium.Quaternion} 转换后的四元数，代表Cesium中的方向
 */
export const getCesiumHPRFromDjiSpecifications = (position, yaw, pitch = 0, gimbalRoll = 0) => {
    // 1. 将大疆的偏航角和俯仰角转换为Cesium的HeadingPitchRoll对象
    const orientation = convertDjiToCesiumAngles(yaw, pitch);

    // 2. 将HeadingPitchRoll转换为四元数（基于指定位置的局部坐标系）
    const orientationHPR = Cesium.Transforms.headingPitchRollQuaternion(position, orientation);

    // 3. 创建方向修正四元数：绕Y轴（北方向）旋转-90度（-π/2弧度）
    // 作用：修正大疆与Cesium的前向方向差异，将默认前向从-Z轴（下）转向+Y轴（北）
    const correctionQuaternion = Cesium.Quaternion.fromAxisAngle(
        Cesium.Cartesian3.UNIT_Y, // 旋转轴：Y轴（北方向）
        -Cesium.Math.PI_OVER_TWO // 旋转角度：-90度（转为弧度）
    );

    // 4. 组合旋转四元数：先应用修正旋转，再应用设备姿态旋转
    // 四元数乘法顺序注意：结果 = 姿态旋转 * 修正旋转（实际执行顺序相反）
    return Cesium.Quaternion.multiply(orientationHPR, correctionQuaternion, new Cesium.Quaternion());
};


export const calculateFarPlanePoints = (cameraPos, fov, aspectRatio, far, heading, pitch, roll) => {
    // 1. 创建透视视锥体
    const frustum = new Cesium.PerspectiveFrustum({
        fov: Cesium.Math.toRadians(fov),
        aspectRatio: aspectRatio,
        near: 10,
        far: far
    });

    // 2. 计算相机位置和姿态
    const origin = Cesium.Cartesian3.fromDegrees(...cameraPos);


    const orientation = getCesiumHPRFromDjiSpecifications(origin, heading, pitch)

    // 3. 生成视锥体轮廓顶点（包含近/远平面共8个顶点）
    const geometry = Cesium.FrustumOutlineGeometry.createGeometry(
        new Cesium.FrustumOutlineGeometry({ frustum, origin, orientation })
    );
    const positions = geometry.attributes.position.values; // 扁平数组：[x1,y1,z1, x2,y2,z2, ...]

    // 4. 解析顶点为三维坐标（8个顶点，每3个值一组）
    const vertices = [];
    for (let i = 0; i < positions.length; i += 3) {
        vertices.push(new Cesium.Cartesian3(
            positions[i],
            positions[i + 1],
            positions[i + 2]
        ));
    }

    // 5. 筛选远平面顶点（视锥体中，后4个顶点为远平面，前4个为近平面）
    // 验证：计算顶点与相机的距离，远平面顶点距离≈far，近平面≈near
    const farPlaneVertices = vertices.filter(vertex => {
        const distance = Cesium.Cartesian3.distance(origin, vertex);
        // 允许一定误差（因视锥体顶点距离不完全等于far，受姿态影响）
        return distance > far
    });

    // 6. 转换远平面顶点为经纬度和高度
    return farPlaneVertices.map(vertex => {
        const cartographic = Cesium.Cartographic.fromCartesian(vertex);
        return [
            +Cesium.Math.toDegrees(cartographic.longitude).toFixed(8), // 经度
            +Cesium.Math.toDegrees(cartographic.latitude).toFixed(8),  // 纬度
            +cartographic.height.toFixed(2)                            // 高度
        ];
    });
}

/**
 * 根据起点和远平面点计算与地面的交点坐标
 * 功能：从起点向远平面点发射射线，检测射线与地形（地面）的交点，返回交点的经纬度和高度；若无交点则返回null
 * @param {Array} origin - 起点的经纬度高度数组 [经度(度), 纬度(度), 高度(米)]
 * @param {Array} farPlanePoint - 远平面点的经纬度高度数组 [经度(度), 纬度(度), 高度(米)]
 * @returns {Array|null} 地面交点坐标 [经度(度), 纬度(度), 高度(米)]，无交点时返回null
 */
export const calculateGroundIntersection = (viewer, origin, farPlanePoint) => {
    // 1. 起点 → Cartesian3
    const originCartesian = Cesium.Cartesian3.fromDegrees(
        Number(origin[0]),
        Number(origin[1]),
        Number(origin[2] || 0)  // 高度默认 0
    );

    // 2. 远点 → Cartesian3
    const farPointCartesian = Cesium.Cartesian3.fromDegrees(
        Number(farPlanePoint[0]),
        Number(farPlanePoint[1]),
        Number(farPlanePoint[2] || 0)
    );

    // 3. 方向向量 + 归一化（关键！）
    const direction = Cesium.Cartesian3.subtract(
        farPointCartesian,
        originCartesian,
        new Cesium.Cartesian3()
    );
    const directionNormalized = Cesium.Cartesian3.normalize(direction, new Cesium.Cartesian3());

    // 4. 构造射线
    const ray = new Cesium.Ray(originCartesian, directionNormalized);

    // 5. 拾取地表交点
    const intersection = viewer.scene.globe.pick(ray, viewer.scene);

    if (intersection) {
        const cartographic = Cesium.Cartographic.fromCartesian(intersection);
        return [
            Cesium.Math.toDegrees(cartographic.longitude),
            Cesium.Math.toDegrees(cartographic.latitude),
            cartographic.height  // 通常接近 0（地表）
        ];
    }

    return null;  // 无交点（射线背对地球）
};


import img from './11.png'


const imgSource = `
    uniform sampler2D image;
    // 传入四边形第1、4顶点的世界坐标（从材质类传递）
    uniform vec3 vertex1; // 四边形第1顶点（目标：图片左上）
    uniform vec3 vertex4; // 四边形第4顶点（目标：图片右上）

    czm_material czm_getMaterial(czm_materialInput materialInput) {
        czm_material material = czm_getDefaultMaterial(materialInput);
        
        // 1. 获取当前像素的世界坐标（与几何体顶点在同一坐标系）
        vec3 currentPos = materialInput.positionMC;
        
        // 2. 计算第1→4顶点的向量（图片顶部边的方向）
        vec3 v1v4 = vertex4 - vertex1;
        float v1v4Length = length(v1v4); // 第1→4顶点的距离（图片宽度对应长度）
        
        // 3. 计算当前像素到第1顶点的向量
        vec3 v1Current = currentPos - vertex1;
        
        // 4. 计算UV的x分量（0=第1顶点，1=第4顶点）
        // 原理：当前像素在v1v4向量上的投影长度 / v1v4总长度
        float uvX = dot(v1Current, v1v4) / (v1v4Length * v1v4Length + 1e-6);
        uvX = clamp(uvX, 0.0, 1.0); // 限制在0~1，避免超出图片
        
        // 5. 计算UV的y分量（0=四边形底部，1=顶部（第1、4顶点））
        // 原理：基于垂直于v1v4的方向计算高度比例（适配任意四边形）
        vec3 upDir = cross(v1v4, vec3(0.0, 1.0, 0.0)); // 垂直于顶部边的方向
        upDir = normalize(upDir);
        float uvY = dot(v1Current, upDir) / (length(vertex1 - materialInput.positionMC) + 1e-6);
        uvY = clamp(uvY, 0.0, 1.0);
        
        // 6. 最终UV坐标（确保第1顶点=UV(0,1)，第4顶点=UV(1,1)）
        vec2 texCoord = vec2(uvX, 1.0 - uvY);
        
        // 7. 采样图片纹理
        vec4 color = texture(image, texCoord);
        
        material.diffuse = color.rgb;
        material.alpha = color.a;
        
        return material;
    }
`;
const autoImgSource = `
            uniform sampler2D image;
            czm_materialInput materialInput;

            vec2 uv2 = vec2(0.0, 1.0); // 图片左上 → 顶点0
            vec2 uv3 = vec2(0.0, 0.0); // 图片左下 → 顶点1
            vec2 uv0 = vec2(1.0, 0.0); // 图片右下 → 顶点2
            vec2 uv1 = vec2(1.0, 1.0); // 图片右上 → 顶点3

            // 四边形四个顶点在局部坐标系中的位置（由 Cesium 自动传入）
            // materialInput.st 已经是插值后的 UV (0,0)-(1,1)
            // 我们要把它反向映射到纹理的四角

            vec2 perspectiveMap(vec2 st) {
              // 目标：st → 纹理四角
              // 使用双线性插值逆向求解（等价于透视除法）

              vec2 p0 = st * (1.0 - st.s - st.t) * uv0;
              vec2 p1 = vec2(st.s, 0.0) * (1.0 - st.t) * uv1;
              vec2 p2 = st * uv2;
              vec2 p3 = vec2(0.0, st.t) * (1.0 - st.s) * uv3;

              return p0 + p1 + p2 + p3;
            }

            czm_material czm_getMaterial(czm_materialInput materialInput) {
              czm_material material = czm_getDefaultMaterial(materialInput);

              // 直接使用 materialInput.st 作为四边形内的归一化坐标
              vec2 uv = materialInput.st;

              // 关键：双线性插值实现透视贴合
              float s = uv.s;
              float t = uv.t;
              vec2 texCoord =
                  uv0 * (1.0 - s) * (1.0 - t) +
                  uv1 * s * (1.0 - t) +
                  uv2 * s * t +
                  uv3 * (1.0 - s) * t;

              vec4 color = texture(image, texCoord);
              material.diffuse = color.rgb;
              material.alpha = color.a;
              return material;
            }
            `
export class VideoMaterial {
    constructor(options = {}) {
        this._definitionChanged = new Cesium.Event();
        this._type = 'VideoMaterial';

        // 1. 初始化内部状态
        this._image = img;
        this._uv0 = new Cesium.Cartesian2(0.0, 1.0);
        this._uv1 = new Cesium.Cartesian2(0.0, 0.0);
        this._uv2 = new Cesium.Cartesian2(1.0, 0.0);
        this._uv3 = new Cesium.Cartesian2(1.0, 1.0);

        this._vertex1 = options.vertex1; // 四边形第1顶点坐标（Cartesian3）
        this._vertex4 = options.vertex4; // 四边形第4顶点坐标（Cartesian3）

        // 2. 注册材质（只一次）
        this._registerMaterial();

        // 3. 设置初始值（支持 CallbackProperty）
        if (options.image) {
            this.image = options.image;
        }
        if (options.uv0) this.uv0 = options.uv0;
        if (options.uv1) this.uv1 = options.uv1;
        if (options.uv2) this.uv2 = options.uv2;
        if (options.uv3) this.uv3 = options.uv3;
    }

    _registerMaterial() {
        const type = this._type;
        if (Cesium.Material._materialCache.getMaterial(type)) return;

        Cesium.Material._materialCache.addMaterial(type, {
            fabric: {
                type: type,
                uniforms: {
                    image: img,
                    uv0: { x: 0.0, y: 1.0 },
                    uv1: { x: 0.0, y: 0.0 },
                    uv2: { x: 1.0, y: 0.0 },
                    uv3: { x: 1.0, y: 1.0 },
                    vertex1: new Cesium.Cartesian3(0,0,0), // 初始值
                    vertex4: new Cesium.Cartesian3(0,0,0)  // 初始值
                },
                source: imgSource
            },
            translucent: () => true
        });
    }

    // Cesium 必需接口
    getType() {
        return this._type;
    }

    getValue(time, result = {}) {
        result.image = Cesium.Property.getValueOrUndefined(this._image, time);
        result.uv0 = this._uv0;
        result.uv1 = this._uv1;
        result.uv2 = this._uv2;
        result.uv3 = this._uv3;
        result.vertex1 = { x: this._vertex1.x, y: this._vertex1.y, z: this._vertex1.z };
        result.vertex4 = { x: this._vertex4.x, y: this._vertex4.y, z: this._vertex4.z };
        return result;
    }

    equals(other) {
        return other instanceof VideoMaterial &&
            Cesium.Property.equals(this._image, other._image) &&
            Cesium.Cartesian2.equals(this._uv0, other._uv0) &&
            Cesium.Cartesian2.equals(this._uv1, other._uv1) &&
            Cesium.Cartesian2.equals(this._uv2, other._uv2) &&
            Cesium.Cartesian2.equals(this._uv3, other._uv3);
    }

    get definitionChanged() {
        return this._definitionChanged;
    }

    get isConstant() {
        return false;
    }
}

// 使用 createPropertyDescriptor 实现响应式
Object.defineProperties(VideoMaterial.prototype, {
    image: Cesium.createPropertyDescriptor('image', '_image', true), // 关键：第三个参数 true 启用事件
    uv0: Cesium.createPropertyDescriptor('uv0', '_uv0'),
    uv1: Cesium.createPropertyDescriptor('uv1', '_uv1'),
    uv2: Cesium.createPropertyDescriptor('uv2', '_uv2'),
    uv3: Cesium.createPropertyDescriptor('uv3', '_uv3'),
    vertex1: Cesium.createPropertyDescriptor('vertex1', '_vertex1'),
    vertex4: Cesium.createPropertyDescriptor('vertex4', '_vertex4')
});




