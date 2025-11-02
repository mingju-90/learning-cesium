
## vue生命周期
### what
vue生命周期是指vue组建从创建，挂载，更新到销毁的完整过程，vue提供了一系列的生命周期钩子，允许在特定阶段插入自定义逻辑。

### why
使用生命周期钩子是为了正确的时机执行逻辑，比如请求数据，dom操作，销毁定时器等。


vue3的生命周期：
- setup 初始化
- onbeforemount 虚拟dom已经生成，没有加载到页面
- onmounted 页面加载dom，可以操作dom
- onbeforeupdate   组件更新前
- onupdated 组件更新后
- onbeforeunmount   组件销毁前 一般是清理定时器，解绑事件
- onunmounted



## vue2和vue3的区别
### what
vue3是vue的一次升级和改革，vue2是使用的是options api，vue3引入了compotions api。

| 特性 | vue2 | vue3 |
|-------|-------|-------|
| 核心api | options api | composition api + options api |
| 响应式原理 | object.defineProperty | proxy |
| ts支持 | 支持不佳 | 原生支持 |
| 打包体积 | 较大 | 更小（tree-shaking） |


### why
vue3的改变主要是为了解决vue2在大型项目，可维护行和性能上暴露的问题。
- vue2逻辑复用使用的是mixins，会导致不同mixins的命名冲突，数据来源模糊
- vue3使用 composition api来实现逻辑复用，解决了以上问题

- vue2的响应式属性使用的是 Object.defineProperty实现的，必须在初始化的时候给对象的属性绑定代理，手动添加的属性没有响应式，和设置响应式需要递归遍历所有的属性将其转换为响应式性能消耗较大。
- vue3使用proxy代理整个对象， 可以拦截所有的操作，从根本上解决了问题，并且只有在使用到对象的属性是才转换为响应式，性能更好。


更小的包体积
vue2 无论使用了那些功能，整个vue核心库都会打包进去。
vue3 的内部功能都支持tree-shaking，这代表如果没有使用的功能或者组件，都会被剔除，最终的生产包更小。


## 对MVVM的理解
### what
MVVM(Model-View-ViewModel) 是用于构建用户界面的软件架构模式。核心思想是数据驱动试图，通过数据绑定和命令机制，实现视图和逻辑的分离。
- model 处理数据获取，存储，更新等纯粹的数据操作；
- view 定义页面的结构，布局，外观，负责展示和接收用户输入；
- viewmode view和model之间的桥梁，通过数据绑定机制，自动将数据同步到视图，将视图交互同步给数据；


## vue2中如何检测数组的变化
vue2 直接修改数组的元素，无法触发响应式。通过重写数组的方法来实现响应式监听；

vue2 的响应式基于 Object.defineProperty，Vue 出于性能考虑没有对每个索引进行监听。修改 length 不会处罚 Object.defineProperty 的 setter。

实现原理
```js
const arrayProto = Array.portotype
const arrayMethods = Object.create(arrayProto)


// 拦截原生方法，执行完原生方法后，通知更新依赖
['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].forEach(method => {
    const original = arrayProto[method]
    def(arrayMethods, method, function mutator(...args) {
        const result = original.apply(this, args)   // 调用原生方法
        const ob = this.__ob__
        ob.dep.notify() // 通知依赖更新
        return result;
    })
})

```


## vue2 和 vue3 的 Diff 算法
### what diff算法是什么
diff 算法是虚拟 DOM 的核心部分，用于比较新旧虚拟 DOM 树的差异，并计算出最小的 DOM 操作来更新试图。
vue 的渲染器 Renderer 通过 Diff 算法实现高效更新，避免不必要的 DOM 操作。

### why 为什么需要 diff 算法
直接操作 DOM 是非常昂贵的，涉及浏览器重排和重绘。
diff 算法的目标：
- 减少 DOM 操作次数，只更新真正变化的部分；
- 提高性能，通过高效的对比策略，较低时间复杂度。

### how vue2 和 vue3 的 diff 算法实现
#### vue2 的 diff 算法
双端对比，头尾指针对比
同级对比，只对比同一层级的节点，不跨层级比较。
四种对比方式，按顺序尝试；
1. 头头比较，新旧节点的头部是否相同。
2. 尾尾比较，新旧节点的尾部是否相同。
3. 头尾比较，就节点的头部与新节点的尾部是否相同。
4. 尾头比较，旧节点的尾部与新节点的头部是否相等。
key 的作用，通过 key 标识节点的身份，避免就地复用导致的错误更新。

缺点：
- 全量递归对比：即使没有变化的节点也会被遍历，存在一定性能浪费。
- 移动逻辑不够高效：在某些场景下仍需多次 DOM 操作。

### vue3 的 diff 算法
基于最长递增子序列(LIS)的优化。
预处理：
1. 静态提升，标记静态节点，跳过 diff 过程。
2. 事件缓存，缓存事件处理函数，避免重复绑定。

动态节点对比：
1. 头部同步，直接对比头部相同节点，直到遇到不同节点。
2. 尾部同步，直接对比尾部相同节点，直到遇到不同节点。
3. 最长递增子序列(LIS)，对剩余的新节点生成位置索引映射，通过LIS算法找到最长无需移动的节点序列，只移动不在序列中的节点。

更快的静态节点跳过，通过编译时标记，完全跳过静态子树对比。
更智能的移动策略，LIS 算法显著减少了节点移动次数。
更好的 TS 支持，重写后的渲染器代码更模块化。

## vue组件通信方式及原理
vue组件的通信方式根据组件关系可以分为多个场景
### 父子组件通信
1. Props 父组件通过 props 向子组件传递数据，子组件通过 emit('update:xxx') 更新数据；
2. ref 父组件通过 ref 获取子组件实例，触发子组件的方法和获取子组件的数据；
3. evetn 父组件绑定子组件事件，获取子组件传递的参数；

### 跨级通信
通过 provide，祖先组件向后代组件传递数据，通过 inject 获取数据；

### 任意组件通信
1. eventBus 任意组件都可以通过 eventBus 监听事件获取数据；
2. vuex/pinia 全局状态管理器，任意组件可以通过状态管理器获取数据；
3. vue router 参数 通过 URL 传递参数；

## vue的路由现实，hash路由和history路由实现原理
vue 路由模式分为两种：
1. Hash 模式，URL 中带有#，SEO 不友好，传统的爬虫会忽落 # 后面的内容
2. History 模式，URL不需要携带#，需要服务器支持，配置服务器所有路径重定向到 index.html;













