import { defineComponent, ref, h } from 'vue'
import demoList from './demo-list'



export default defineComponent({
    props: {},
    setup(props) {
        const active = ref('')
        const handleSelectMenu = (data) => active.value = data
        const showThreeComponent = () => {
            const threeComponent = demoList.find(item => item.value === active.value)?.component
            if (!threeComponent) return
            return <threeComponent />
        }
        const render = () => <el-container class="h-full">
            <el-aside width="300px">
                <el-menu
                    class="h-full"
                    onSelect={handleSelectMenu}
                >
                    {demoList.map((menu, index) => <el-menu-item index={menu.value}>
                        <span>{menu.label}</span>
                    </el-menu-item>)}
                </el-menu>
            </el-aside>
            <el-main>
                {showThreeComponent()}
            </el-main>
        </el-container>
        return render
    }
})


