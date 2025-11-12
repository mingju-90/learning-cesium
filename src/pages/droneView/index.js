// droneView 页面导出

const component = () => import('./index.vue')

export default {
    name: 'droneView',
    component,
    path: '/droneView',
    description: '地图展示无人机实时视角'
}