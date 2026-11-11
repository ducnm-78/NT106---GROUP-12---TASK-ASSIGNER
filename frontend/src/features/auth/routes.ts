import type { RouteRecordRaw } from 'vue-router'

/** Khu vực xác thực: dùng khung thẻ chia đôi (AuthLayout). */
export const authRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('./layouts/AuthLayout.vue'),
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('./views/LoginView.vue'),
        meta: { title: 'Đăng nhập', panel: 'right', guestOnly: true },
      },
      {
        path: 'register',
        name: 'register',
        component: () => import('./views/RegisterView.vue'),
        meta: { title: 'Đăng kí', panel: 'left', guestOnly: true },
      },
      {
        path: 'forgot-password',
        name: 'forgot-password',
        component: () => import('./views/ForgotPasswordView.vue'),
        // Không đặt guestOnly: người đã đăng nhập cũng vào được từ Cài đặt › Bảo mật
        meta: { title: 'Quên mật khẩu', panel: 'right' },
      },
      {
        path: 'reset-password',
        name: 'reset-password',
        component: () => import('./views/ResetPasswordView.vue'),
        meta: { title: 'Đặt mật khẩu mới', panel: 'right' },
      },
    ],
  },
]
