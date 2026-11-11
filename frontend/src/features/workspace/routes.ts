import type { RouteRecordRaw } from 'vue-router'
import type { IconName } from '@/shared/components/AppIcon.vue'

/** Mục trong thanh điều hướng bên trái. */
export interface NavItem {
  name: string
  label: string
  icon: IconName
}

export const NAV_ITEMS: NavItem[] = [
  { name: 'overview', label: 'Tổng quan', icon: 'grid' },
  { name: 'calendar', label: 'Lịch', icon: 'calendar' },
  { name: 'tasks', label: 'Công việc', icon: 'check-square' },
  { name: 'team', label: 'Nhóm', icon: 'users' },
  { name: 'reports', label: 'Thống kê', icon: 'bar-chart' },
  { name: 'settings', label: 'Cài đặt', icon: 'settings' },
]

const comingSoon = () => import('./views/ComingSoonView.vue')
const groupChat = () => import('./groups/views/GroupChatView.vue')

/** Khu vực làm việc sau khi đăng nhập: sidebar + topbar (WorkspaceLayout). */
export const workspaceRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('./layouts/WorkspaceLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'overview',
        name: 'overview',
        component: () => import('./views/OverviewView.vue'),
        meta: { title: 'Tổng quan', nav: 'overview' },
      },
      {
        path: 'calendar',
        name: 'calendar',
        component: () => import('./calendar/CalendarView.vue'),
        meta: { title: 'Lịch', nav: 'calendar' },
      },
      {
        path: 'tasks',
        name: 'tasks',
        component: () => import('./tasks/TasksView.vue'),
        meta: { title: 'Công việc', nav: 'tasks' },
      },
      {
        path: 'team',
        name: 'team',
        component: groupChat,
        meta: { title: 'Nhóm', nav: 'team', fill: true, view: 'group-chat' },
      },
      {
        path: 'team/:groupId/:channelId?',
        name: 'team-channel',
        component: groupChat,
        meta: { title: 'Nhóm', nav: 'team', fill: true, view: 'group-chat' },
      },
      {
        path: 'team/:groupId/settings/:section?',
        name: 'team-settings',
        component: () => import('./groups/views/GroupSettingsView.vue'),
        meta: { title: 'Cài đặt nhóm', nav: 'team', fill: true, view: 'group-settings' },
      },
      { path: 'reports', name: 'reports', component: comingSoon, meta: { title: 'Thống kê', nav: 'reports' } },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('./views/ProfileView.vue'),
        // Hồ sơ không thuộc mục nào trên sidebar (mở từ avatar), nên không gán nav
        meta: { title: 'Hồ sơ cá nhân' },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('./views/SettingsView.vue'),
        meta: { title: 'Cài đặt', nav: 'settings' },
      },
    ],
  },
]
