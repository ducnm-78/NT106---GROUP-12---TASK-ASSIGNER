import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { restoreSession } from './features/auth/composables/useAuth'
// Font tự host (có subset tiếng Việt): ứng dụng desktop vẫn đúng font khi không có mạng
import '@fontsource-variable/inter'
import '@fontsource-variable/montserrat'
import './shared/styles/base.css'

restoreSession()

const app = createApp(App)
app.use(router)
void router.isReady().then(() => app.mount('#app'))
