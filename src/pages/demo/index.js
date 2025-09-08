// demo 页面导出

const component = () => import('./index.vue')

export default {
    name: 'demo',
    component,
    path: '/demo',
    description: 'demo'
}