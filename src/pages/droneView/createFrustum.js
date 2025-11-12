/**
 * 计算视锥体远平面的4个顶点世界坐标
 * @param {Object} params - 视锥体参数
 * @param {Cesium.Cartesian3} params.position - 视锥体顶点位置（世界坐标）
 * @param {number} params.fov - 垂直视场角（度）
 * @param {number} params.aspectRatio - 宽高比
 * @param {number} params.far - 远裁剪面距离
 * @param {Cesium.Quaternion} params.orientation - 视锥体姿态四元数（世界坐标系下）
 * @returns {Cesium.Cartesian3[]} 远平面4个顶点的世界坐标（顺序：左上、右上、右下、左下）
 */
const calculateFrustumFarPlaneCorners = (params) => {
  const { position, fov, aspectRatio, far, orientation } = params;

  // 1. 计算远平面的半高度和半宽度（基于视场角和远距）
  const fovRadians = Cesium.Math.toRadians(fov);
  const farPlaneHalfHeight = Math.tan(fovRadians / 2) * far;
  const farPlaneHalfWidth = farPlaneHalfHeight * aspectRatio;

  // 2. 视锥体局部坐标系下的远平面4个顶点（以视锥体顶点为原点，前向为Y轴正方向）
  // 局部坐标系定义：X轴向右、Y轴向前、Z轴向上（与视锥体姿态匹配）
  const localCorners = [
    new Cesium.Cartesian3(-farPlaneHalfWidth, far, farPlaneHalfHeight), // 左上
    new Cesium.Cartesian3(farPlaneHalfWidth, far, farPlaneHalfHeight),  // 右上
    new Cesium.Cartesian3(farPlaneHalfWidth, far, -farPlaneHalfHeight), // 右下
    new Cesium.Cartesian3(-farPlaneHalfWidth, far, -farPlaneHalfHeight) // 左下
  ];

  // 3. 将局部坐标转换为世界坐标（应用姿态旋转+平移）
  const farPlaneCorners = localCorners.map(localCorner => {
    // 步骤1：通过四元数将局部向量旋转到世界坐标系
    const rotatedCorner = Cesium.Quaternion.rotateVector(orientation, localCorner, new Cesium.Cartesian3());
    // 步骤2：将旋转后的向量与视锥体顶点位置相加，得到世界坐标
    return Cesium.Cartesian3.add(position, rotatedCorner, new Cesium.Cartesian3());
  });

  return farPlaneCorners;
};


const getLat = (geometry) => {
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
        return distance > far // 误差范围10%
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
 * 视锥体绘制工具类
 * 用于在Cesium场景中创建并显示透视视锥体
 */
export class CreateFrustum {
    /**
     * 构造函数
     * @param {Cesium.Viewer} viewer - Cesium viewer实例
     * @param {Object} options - 视锥体配置参数
     * @param {Cesium.Cartesian3} options.position - 视锥体顶点位置(世界坐标)
     * @param {number} options.yaw - 偏航角(度)
     * @param {number} options.pitch - 俯仰角(度)
     * @param {number} [options.roll=0] - 翻滚角(度)
     * @param {number} [options.aspectRatio] - 宽高比，默认使用viewer画布的宽高比
     * @param {number} [options.fov=35.0] - 垂直视场角(度)
     * @param {number} [options.near=0.1] - 近裁剪面距离
     * @param {number} [options.far=20] - 远裁剪面距离
     * @param {boolean} [options.fill=false] - 是否填充视锥体
     * @param {boolean} [options.closed=false] - 是否闭合视锥体
     * @param {Cesium.Color} [options.color] - 填充颜色，默认半透明绿色
     * @param {Cesium.Color} [options.outlineColor] - 轮廓线颜色，默认半透明绿色
     * @param {boolean} [options.flat=true] - 是否使用平面着色
     */
    constructor(viewer, options) {
        this.viewer = viewer;
        // 视锥体顶点位置
        this._position = options.position;
        // 偏航角
        this._yaw = options.yaw;
        // 俯仰角
        this._pitch = options.pitch;
        // 翻滚角
        this._roll = options.roll;
        // 宽高比，默认使用viewer画布的宽高比(注意此处原代码可能颠倒，通常宽/高才是正确的宽高比)
        this._aspectRatio = options.aspectRatio || this.viewer.scene.canvas.clientHeight / this.viewer.scene.canvas.clientWidth;
        // 垂直视场角(度)
        this._fov = options.fov || 35.0;
        // 近裁剪面距离
        this._near = options.near || 0.1;
        // 远裁剪面距离
        this._far = options.far || 20;
        // 是否填充
        this._fill = options.fill || false;
        // 是否闭合
        this._closed = options.closed || false;
        // 填充颜色
        this._color = options.color || new Cesium.Color(0.0, 1.0, 0.0, 0.2);
        // 轮廓线颜色
        this._outlineColor = options.outlineColor || new Cesium.Color(0.0, 1.0, 0.0, 0.5);
        // 是否平面着色
        this._flat = options.flat || true;

        // 初始化视锥体
        this.update(this._position, this._yaw, this._pitch, this._fov, this._far);
    }

    /**
     * 更新视锥体参数并重新绘制
     * @param {Cesium.Cartesian3} position - 新的顶点位置
     * @param {number} yaw - 新的偏航角
     * @param {number} pitch - 新的俯仰角
     * @param {number} fov - 新的视场角
     * @param {number} far - 新的远裁剪面距离
     */
    update(position, yaw, pitch, fov, far) {
        this._position = position;
        this._yaw = yaw;
        this._pitch = pitch;
        this._fov = fov;
        // this._far = far;
        this._add();
    }

    /**
     * 内部方法：清除现有视锥体并添加新的视锥体和轮廓线
     */
    _add() {
        this.clear();
        this._addFrustum();
        this._addOutline();
    }

    /**
     * 清除场景中的视锥体和轮廓线
     */
    clear() {
        this._clearFrustum();
        this._clearOutline();
    }

    /**
     * 内部方法：创建并添加视锥体实体
     */
    _addFrustum() {
        // 检查位置和viewer是否有效
        if (!Cesium.defined(this._position)) {
            return;
        }
        if (!Cesium.defined(this.viewer)) {
            return;
        }

        // 创建透视视锥体参数
        const frustum = new Cesium.PerspectiveFrustum({
            fov: Cesium.Math.toRadians(this._fov), // 视场角转换为弧度
            aspectRatio: this._aspectRatio,       // 宽高比
            near: this._near,                     // 近裁剪面
            far: this._far                        // 远裁剪面
        });
        this._frustum = frustum;

        // 创建视锥体几何
        const frustumGeometry = new Cesium.FrustumGeometry({
            frustum: frustum,
            origin: this._position,               // 顶点位置
            // 从无人机参数获取Cesium的航向-俯仰-翻滚角
            orientation: getCesiumHPRFromDjiSpecifications(this._position, this._yaw, this._pitch),
            vertexFormat: Cesium.VertexFormat.POSITION_ONLY // 只需要位置信息
        });

        // 创建几何实例
        const frustumGeometryInstance = new Cesium.GeometryInstance({
            geometry: frustumGeometry,
            attributes: {
                color: Cesium.ColorGeometryInstanceAttribute.fromColor(this._color)
            },
            id: 'frustum' // 唯一标识
        });

        // 创建并添加primitive
        this._frustumPrimitive = this.viewer.scene.primitives.add(
            new Cesium.Primitive({
                geometryInstances: [frustumGeometryInstance],
                appearance: new Cesium.PerInstanceColorAppearance({
                    closed: this._closed,
                    flat: this._flat
                }),
                asynchronous: false // 同步加载，立即显示
            })
        );

        
    }

    /**
     * 内部方法：创建并添加视锥体轮廓线
     */
    _addOutline() {
        // 创建透视视锥体参数(与主体一致)
        const frustum = new Cesium.PerspectiveFrustum({
            fov: Cesium.Math.toRadians(this._fov),
            aspectRatio: this._aspectRatio,
            near: this._near,
            far: this._far
        });

        // 创建轮廓线几何
        const geometry = new Cesium.FrustumOutlineGeometry({
            frustum: frustum,
            origin: this._position,
            orientation: getCesiumHPRFromDjiSpecifications(this._position, this._yaw, this._pitch)
        });

        




        // 创建几何实例
        const instance = new Cesium.GeometryInstance({
            geometry: geometry,
            attributes: {
                color: Cesium.ColorGeometryInstanceAttribute.fromColor(this._outlineColor)
            }
        });

        // 创建并添加primitive
        const primitive = new Cesium.Primitive({
            geometryInstances: [instance],
            appearance: new Cesium.PerInstanceColorAppearance({
                closed: true,
                flat: true
            }),
            asynchronous: false
        });

        this._outlinePrimitive = this.viewer.scene.primitives.add(primitive);
    }

    /**
     * 内部方法：清除视锥体主体
     */
    _clearFrustum() {
        if (this._frustumPrimitive) {
            this.viewer.scene.primitives.remove(this._frustumPrimitive);
            this._frustumPrimitive = null;
        }
    }

    /**
     * 内部方法：清除视锥体轮廓线
     */
    _clearOutline() {
        if (this._outlinePrimitive) {
            this.viewer.scene.primitives.remove(this._outlinePrimitive);
            this._outlinePrimitive = null;
        }
    }
    /**
   * 获取当前视锥体远平面的4个顶点世界坐标
   * @returns {Cesium.Cartesian3[]|null} 远平面4个顶点坐标（顺序：左上、右上、右下、左下），参数无效时返回null
   */
  getFarPlaneCorners() {
    // 检查必要参数是否有效
    if (!Cesium.defined(this._position) || !Cesium.defined(this._frustum) || !this.viewer) {
      console.warn('视锥体参数未初始化，无法计算远平面坐标');
      return null;
    }

    // 获取视锥体姿态四元数（复用原有方向计算逻辑）
    const orientation = getCesiumHPRFromDjiSpecifications(this._position, this._yaw, this._pitch);

    // 调用工具方法计算远平面坐标
    return calculateFrustumFarPlaneCorners({
      position: this._position,
      fov: this._fov,
      aspectRatio: this._aspectRatio,
      far: this._far,
      orientation: orientation
    });
  }
    /**
   * 获取当前视锥体远平面4个顶点的经纬度和高度
   * @returns {Object[]|null} 包含经纬度信息的数组，每个元素为 { lng, lat, height }，参数无效时返回null
   */
    getFarPlaneLngLatCorners() {
        // 先获取远平面的世界坐标
        const farPlaneCorners = this.getFarPlaneCorners();
        if (!farPlaneCorners) {
            return null;
        }

        // 将每个世界坐标转换为经纬度和高度
        return farPlaneCorners.map(corner => {
            // 转换为弧度制的经纬度和高度
            const cartographic = Cesium.Cartographic.fromCartesian(corner);
            // 弧度转角度，保留6位小数
            return {
                lng: Number(Cesium.Math.toDegrees(cartographic.longitude).toFixed(6)), // 经度（度）
                lat: Number(Cesium.Math.toDegrees(cartographic.latitude).toFixed(6)),  // 纬度（度）
                height: Number(cartographic.height.toFixed(2))                         // 高度（米）
            };
        });
    }
}

/**
 * 根据大疆相机镜头参数计算Cesium中的视场角(FOV)
 * @param {number} [focalLength=6.7] - 相机焦距(单位：mm)，默认值6.7mm
 * @param {number} zoomFactor - 变焦倍数(缩放因子)，无默认值，必须传入
 * @param {number} [sensorHeight=24] - 传感器高度(单位：mm)，默认值24mm
 * @param {number} [distortionFactor=1] - 畸变系数，广角镜头需应用桶形畸变校正，默认值1(无畸变)
 * @param {number} [pixelPitch=0] - 像素间距(单位：μm)，高分辨率传感器需考虑像素密度，默认值0(不调整)
 * @returns {string} 转换为角度的垂直视场角，保留两位小数
 */
export const getCesiumFovFromCameraSpecifications = (
    focalLength = 6.7,
    zoomFactor,
    sensorHeight = 24,
    distortionFactor = 1,
    pixelPitch = 0
) => {
    // 计算有效焦距 = 原始焦距 × 变焦倍数
    const effectiveFocalLength = focalLength * zoomFactor;

    // 计算基础垂直视场角：2 × arctan(传感器高度 / (2 × 有效焦距))
    // 公式原理：基于相似三角形，视场角与传感器尺寸和焦距成反比
    const commonVerticalFOV = 2 * Math.atan(sensorHeight / (2 * effectiveFocalLength));

    // 应用广角镜头畸变校正：视场角 × 畸变系数
    const wideAngleLensVerticalFOV = commonVerticalFOV * distortionFactor;

    // 应用高分辨率传感器像素密度调整：视场角 × (1 - 像素间距/1000)
    // 像素间距越小(密度越高)，调整系数越接近1，对视场角影响越小
    const highResolutionVerticalFOV = wideAngleLensVerticalFOV * (1 - pixelPitch / 1000);

    // 将弧度转换为角度，并保留两位小数后返回
    return Cesium.Math.toDegrees(highResolutionVerticalFOV).toFixed(2);
};

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


/**
 * 将 Cesium.Cartesian3 世界坐标转换为经纬度和高度
 * @param {Cesium.Cartesian3} cartesian - 待转换的三维世界坐标
 * @param {Cesium.Ellipsoid} [ellipsoid=Cesium.Ellipsoid.WGS84] - 参考椭球（默认 WGS84 椭球）
 * @param {number} [lngLatPrecision=6] - 经纬度保留小数位数（默认 6 位）
 * @param {number} [heightPrecision=2] - 高度保留小数位数（默认 2 位）
 * @returns {Object|null} 经纬度高度对象，格式 { lng, lat, height }；转换失败返回 null
 */
export const cartesian3ToLngLat = (
  cartesian,
  ellipsoid = Cesium.Ellipsoid.WGS84,
  lngLatPrecision = 6,
  heightPrecision = 2
) => {
  // 校验输入参数有效性
  if (!Cesium.defined(cartesian) || !(cartesian instanceof Cesium.Cartesian3)) {
    console.warn('输入不是有效的 Cesium.Cartesian3 对象');
    return null;
  }

  // 1. 转换为椭球面坐标（弧度制经纬度 + 高度）
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian, ellipsoid);

  // 校验转换结果
  if (!Cesium.defined(cartographic) || isNaN(cartographic.longitude) || isNaN(cartographic.latitude)) {
    console.warn('Cartesian3 坐标转换经纬度失败');
    return null;
  }

  // 2. 弧度转角度并处理精度
  const lng = Number(Cesium.Math.toDegrees(cartographic.longitude).toFixed(lngLatPrecision));
  const lat = Number(Cesium.Math.toDegrees(cartographic.latitude).toFixed(lngLatPrecision));
  const height = Number(cartographic.height.toFixed(heightPrecision));

  return { lng, lat, height };
};