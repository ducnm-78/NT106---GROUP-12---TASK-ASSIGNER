import { createRouter, createWebHistory } from 'vue-router'
import { authRoutes } from '@/features/auth/routes'
import { useAuth } from '@/features/auth/composables/useAuth'
import { workspaceRoutes } from '@/features/workspace/routes'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    /** Vị trí khối màu tím trong khung xác thực */
    panel?: 'left' | 'right'
    /** Mục sidebar được tô sáng khi ở trang này */
    nav?: string
    /** Chỉ dành cho người chưa đăng nhập */
    guestOnly?: boolean
    requiresAuth?: boolean
    /** Màn hình dạng ứng dụng chiếm trọn vùng nội dung (không padding, tự cuộn bên trong) */
    fill?: boolean
    /** Khoá giữ component khi chuyển giữa các route cùng một màn */
    view?: string
  }
}

export const HOME_ROUTE = { name: 'overview' } as const

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: HOME_ROUTE },
    ...authRoutes,
    ...workspaceRoutes,
    // Đường dẫn cũ của bản demo
    { path: '/home', redirect: HOME_ROUTE },
    { path: '/:pathMatch(.*)*', redirect: HOME_ROUTE },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const { isAuthenticated } = useAuth()

  if (to.matched.some((record) => record.meta.requiresAuth) && !isAuthenticated.value) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && isAuthenticated.value) {
    return HOME_ROUTE
  }

  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} | TaskFlow` : 'TaskFlow'
})

export default router
