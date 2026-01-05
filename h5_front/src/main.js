import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// 检测设备类型,如果是 PC 端则跳转到 PC 端地址
const isMobile = () => {
  const userAgent = navigator.userAgent.toLowerCase()
  const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'windows phone', 'mobile']
  const isMobileDevice = mobileKeywords.some(keyword => userAgent.includes(keyword))
  
  // 同时检查屏幕宽度
  const isSmallScreen = window.innerWidth <= 768
  
  return isMobileDevice || isSmallScreen
}

// 如果是 PC 端访问,跳转到 PC 端地址
if (!isMobile()) {
  window.location.href = 'http://pan.coderxp.top/'
}

// 引入 Vant 组件和样式
import {
  Button,
  Form,
  Field,
  CellGroup,
  Cell,
  Tab,
  Tabs,
  Checkbox,
  NavBar,
  Tabbar,
  TabbarItem,
  Icon,
  Image as VanImage,
  Progress,
  PullRefresh,
  List,
  Empty,
  ActionSheet,
  Popup,
  Dialog,
  Search,
  Toast,
  Loading,
  DropdownMenu,
  DropdownItem,
  DatePicker,
  Picker,
  NoticeBar,
  Tag,
  Switch
} from 'vant'
import 'vant/lib/index.css'

const app = createApp(App)
const pinia = createPinia()

// 注册 Vant 组件
app.use(Button)
app.use(Form)
app.use(Field)
app.use(CellGroup)
app.use(Cell)
app.use(Tab)
app.use(Tabs)
app.use(Checkbox)
app.use(NavBar)
app.use(Tabbar)
app.use(TabbarItem)
app.use(Icon)
app.use(VanImage)
app.use(Progress)
app.use(PullRefresh)
app.use(List)
app.use(Empty)
app.use(ActionSheet)
app.use(Popup)
app.use(Dialog)
app.use(Search)
app.use(Toast)
app.use(Loading)
app.use(DropdownMenu)
app.use(DropdownItem)
app.use(DatePicker)
app.use(Picker)
app.use(NoticeBar)
app.use(Tag)
app.use(Switch)

app.use(pinia)
app.use(router)
app.mount('#app')
