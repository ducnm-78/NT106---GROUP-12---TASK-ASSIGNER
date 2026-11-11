<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/features/auth/composables/useAuth'
import AppIcon from '@/shared/components/AppIcon.vue'
import { normalizeText as normalize } from '@/shared/utils/text'
import { useClickOutside } from '../composables/useClickOutside'
import { useProfile } from '../composables/useProfile'
import { useWorkspace } from '../composables/useWorkspace'
import { timeAgo } from '../utils/format'
import UserAvatar from './UserAvatar.vue'

defineEmits<{ 'toggle-menu': [] }>()

const route = useRoute()
const router = useRouter()
const { logout } = useAuth()
const { profile, initials, isGuest } = useProfile()
const { tasks, projects, projectName, notifications, unreadCount, markAllNotificationsRead } = useWorkspace()

const isHome = computed(() => route.name === 'overview')

/* ----- Tìm kiếm ----- */
const query = ref('')
const searchOpen = ref(false)
const searchBox = ref<HTMLElement | null>(null)
const searchListId = useId()
useClickOutside(searchBox, () => (searchOpen.value = false))

const results = computed(() => {
  const q = normalize(query.value.trim())
  if (!q) return []
  const projectHits = projects
    .filter((p) => normalize(p.name).includes(q))
    .map((p) => ({ id: `p-${p.id}`, title: p.name, meta: 'Dự án', to: { name: 'tasks', query: { scope: p.id } } }))
  const taskHits = tasks.value
    .filter((t) => normalize(t.title).includes(q) || `tf-${t.key}`.includes(q.replace(/\s+/g, '')))
    .map((t) => ({
      id: `t-${t.id}`,
      title: t.title,
      meta: `TF-${t.key} · ${projectName(t.projectId)}`,
      to: { name: 'tasks', query: { task: `TF-${t.key}` } },
    }))
  return [...projectHits, ...taskHits].slice(0, 6)
})

function openResult(): void {
  searchOpen.value = false
  query.value = ''
}

/* ----- Thông báo & menu tài khoản ----- */
const notifOpen = ref(false)
const notifBox = ref<HTMLElement | null>(null)
useClickOutside(notifBox, () => (notifOpen.value = false))

const userOpen = ref(false)
const userBox = ref<HTMLElement | null>(null)
useClickOutside(userBox, () => (userOpen.value = false))

async function onLogout(): Promise<void> {
  userOpen.value = false
  await logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <header class="topbar">
    <button type="button" class="ws-icon-btn topbar__menu" aria-label="Mở menu" @click="$emit('toggle-menu')">
      <AppIcon name="menu" :size="20" />
    </button>

    <nav class="topbar__crumbs" aria-label="Vị trí">
      <ol>
        <li>
          <RouterLink v-if="!isHome" :to="{ name: 'overview' }">Trang chủ</RouterLink>
          <span v-else>Trang chủ</span>
        </li>
        <li aria-current="page">{{ route.meta.title }}</li>
      </ol>
    </nav>

    <div ref="searchBox" class="topbar__search">
      <AppIcon name="search" :size="18" class="topbar__search-icon" />
      <input
        v-model="query"
        type="search"
        class="topbar__search-input"
        placeholder="Tìm việc, dự án hoặc thành viên…"
        aria-label="Tìm kiếm"
        role="combobox"
        :aria-expanded="searchOpen && !!query"
        :aria-controls="searchListId"
        @focus="searchOpen = true"
        @input="searchOpen = true"
      />
      <div v-if="searchOpen && query.trim()" :id="searchListId" class="dropdown topbar__results" role="listbox">
        <p v-if="!results.length" class="dropdown__empty">Không tìm thấy kết quả cho “{{ query }}”.</p>
        <RouterLink
          v-for="item in results"
          :key="item.id"
          :to="item.to"
          class="dropdown__item dropdown__item--link"
          role="option"
          aria-selected="false"
          data-test="search-result"
          @click="openResult"
        >
          <strong>{{ item.title }}</strong>
          <span>{{ item.meta }}</span>
        </RouterLink>
      </div>
    </div>

    <div class="topbar__actions">
      <div ref="notifBox" class="topbar__anchor">
        <button
          type="button"
          class="ws-icon-btn"
          :aria-label="`Thông báo${unreadCount ? `, ${unreadCount} chưa đọc` : ''}`"
          :aria-expanded="notifOpen"
          @click="notifOpen = !notifOpen"
        >
          <AppIcon name="bell" :size="19" />
          <span v-if="unreadCount" class="topbar__dot" />
        </button>
        <div v-if="notifOpen" class="dropdown topbar__panel">
          <div class="dropdown__head">
            <strong>Thông báo</strong>
            <button v-if="unreadCount" type="button" class="dropdown__link" @click="markAllNotificationsRead">
              Đánh dấu đã đọc
            </button>
          </div>
          <div v-for="n in notifications" :key="n.id" class="dropdown__item" :class="{ 'is-unread': !n.read }">
            <strong>{{ n.title }}</strong>
            <span>{{ n.body }}</span>
            <small>{{ timeAgo(n.at) }}</small>
          </div>
        </div>
      </div>

      <RouterLink :to="{ name: 'settings' }" class="ws-icon-btn" aria-label="Cài đặt">
        <AppIcon name="settings" :size="19" />
      </RouterLink>

      <div ref="userBox" class="topbar__anchor">
        <button
          type="button"
          class="topbar__user"
          :aria-expanded="userOpen"
          aria-haspopup="menu"
          @click="userOpen = !userOpen"
        >
          <UserAvatar :initials="initials" :src="profile.avatar" size="2.5rem" />
          <span class="topbar__user-text">
            <strong>{{ profile.displayName }}</strong>
            <span>{{ isGuest ? 'Khách' : 'Thành viên' }}</span>
          </span>
          <AppIcon name="chevron-down" :size="16" class="topbar__chevron" />
        </button>
        <div v-if="userOpen" class="dropdown topbar__panel topbar__panel--menu" role="menu">
          <RouterLink :to="{ name: 'profile' }" class="dropdown__action" role="menuitem" @click="userOpen = false">
            <AppIcon name="user" :size="18" /> Hồ sơ cá nhân
          </RouterLink>
          <RouterLink :to="{ name: 'settings' }" class="dropdown__action" role="menuitem" @click="userOpen = false">
            <AppIcon name="settings" :size="18" /> Cài đặt
          </RouterLink>
          <button type="button" class="dropdown__action is-danger" role="menuitem" @click="onLogout">
            <AppIcon name="log-out" :size="18" /> Đăng xuất
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  height: var(--topbar-h);
  padding: 0 clamp(1rem, 2.5vw, 2.5rem);
  border-bottom: 1px solid var(--ws-border);
  background: var(--ws-sidebar);
}

.topbar__menu {
  display: none;
}

.topbar__crumbs ol {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.875rem;
  white-space: nowrap;
}

.topbar__crumbs li:first-child {
  color: var(--ws-text-3);
}

.topbar__crumbs li:first-child a {
  color: inherit;
  text-decoration: none;
}

.topbar__crumbs li:first-child a:hover {
  color: var(--ws-text);
}

.topbar__crumbs li + li::before {
  content: '/';
  margin-right: 0.5rem;
  color: var(--ws-text-3);
}

.topbar__crumbs li[aria-current] {
  font-weight: 600;
}

.topbar__search {
  position: relative;
  flex: 1;
  max-width: 30rem;
  margin: 0 auto;
}

.topbar__search-icon {
  position: absolute;
  top: 50%;
  left: 0.875rem;
  color: var(--ws-text-3);
  transform: translateY(-50%);
  pointer-events: none;
}

.topbar__search-input {
  width: 100%;
  height: 2.75rem;
  padding: 0 1rem 0 2.625rem;
  border: 1px solid var(--ws-border);
  border-radius: var(--ws-radius-sm);
  background: var(--ws-surface);
  color: var(--ws-text);
  font-size: 0.875rem;
  outline: none;
}

.topbar__search-input::placeholder {
  color: var(--ws-text-3);
}

.topbar__search-input:focus {
  border-color: var(--ws-accent);
}

.topbar__actions {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.topbar__anchor {
  position: relative;
}

.topbar__actions .ws-icon-btn {
  position: relative;
}

.topbar__dot {
  position: absolute;
  top: 0.625rem;
  right: 0.6875rem;
  width: 0.5rem;
  height: 0.5rem;
  border: 2px solid var(--ws-surface);
  border-radius: 50%;
  background: var(--ws-danger);
}

.topbar__user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: 0.5rem;
  padding: 0.25rem 0.5rem 0.25rem 0.25rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.topbar__user:hover {
  background: var(--ws-surface);
}

.topbar__user-text {
  display: flex;
  flex-direction: column;
  max-width: 10rem;
}

.topbar__user-text strong {
  overflow: hidden;
  font-size: 0.875rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topbar__user-text span {
  color: var(--ws-text-3);
  font-size: 0.75rem;
}

.topbar__chevron {
  color: var(--ws-text-3);
}

/* ----- Dropdown ----- */
.dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  z-index: 30;
  display: flex;
  flex-direction: column;
  padding: 0.375rem;
  border: 1px solid var(--ws-border-strong);
  border-radius: 0.875rem;
  background: var(--ws-surface);
  box-shadow: var(--ws-shadow);
}

.topbar__results {
  right: 0;
  left: 0;
}

.topbar__panel {
  right: 0;
  width: 21rem;
}

.topbar__panel--menu {
  width: 13.5rem;
}

.dropdown__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.625rem;
}

.dropdown__link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--ws-accent-text);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

.dropdown__empty {
  margin: 0;
  padding: 0.75rem;
  color: var(--ws-text-2);
  font-size: 0.875rem;
}

.dropdown__item {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.625rem;
  border-radius: 0.625rem;
  font-size: 0.875rem;
}

.dropdown__item span {
  color: var(--ws-text-2);
  font-size: 0.8125rem;
}

.dropdown__item small {
  color: var(--ws-text-3);
  font-size: 0.75rem;
}

.dropdown__item--link {
  color: var(--ws-text);
  text-decoration: none;
}

.dropdown__item--link:hover,
.dropdown__item--link:focus-visible {
  background: var(--ws-surface-2);
}

.dropdown__item.is-unread {
  background: var(--ws-accent-soft);
}

.dropdown__item + .dropdown__item {
  margin-top: 0.125rem;
}

.dropdown__action {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  padding: 0.625rem;
  border: 0;
  border-radius: 0.625rem;
  background: none;
  color: var(--ws-text);
  font-size: 0.875rem;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.dropdown__action:hover {
  background: var(--ws-surface-2);
}

.dropdown__action.is-danger {
  color: var(--ws-danger);
}

@media (max-width: 64rem) {
  .topbar__menu {
    display: inline-grid;
  }
}

@media (max-width: 52rem) {
  .topbar__crumbs,
  .topbar__user-text,
  .topbar__chevron {
    display: none;
  }

  .topbar__search {
    margin: 0;
  }
}

@media (max-width: 30rem) {
  .topbar {
    gap: 0.5rem;
  }

  .topbar__actions > .ws-icon-btn {
    display: none;
  }

  .topbar__panel {
    width: min(21rem, calc(100vw - 2rem));
  }
}
</style>
