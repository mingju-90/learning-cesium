import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router/index'

// import 'ant-design-vue/dist/antd.css';
import 'ant-design-vue/dist/reset.css';
import Antd from 'ant-design-vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

createApp(App).use(ElementPlus).use(Antd).use(router).mount('#app')
