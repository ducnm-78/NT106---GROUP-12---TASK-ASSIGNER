<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/features/auth/composables/useAuth'
import AppIcon, { type IconName } from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import PanelCard from '../components/PanelCard.vue'
import ToggleSwitch from '../components/ToggleSwitch.vue'
import { ACCENTS } from '../data/constants'
import { clonePreferences, usePreferences } from '../composables/usePreferences'
import { useProfile } from '../composables/useProfile'
import type { NotificationPrefs, Preferences, ThemeMode } from '../types'

type TabKey = 'account' | 'appearance' | 'notifications' | 'security' | 'integrations'

const TABS: { key: TabKey; label: string; icon: IconName; title: string; subtitle: string }[] = [
  { key: 'account', label: 'Tài khoản', icon: 'user', title: 'Tài khoản', subtitle: 'Thông tin đăng nhập và phiên làm việc.' },
  { key: 'appearance', label: 'Giao diện', icon: 'palette', title: 'Giao diện và trải nghiệm', subtitle: 'Đồng bộ thiết kế trên toàn bộ không gian làm việc.' },
  { key: 'notifications', label: 'Thông báo', icon: 'bell', title: 'Thông báo', subtitle: 'Chọn những gì TaskFlow nên nhắc bạn.' },
  { key: 'security', label: 'Bảo mật', icon: 'lock', title: 'Bảo mật', subtitle: 'Mật khẩu và quyền truy cập tài khoản.' },
  { key: 'integrations', label: 'Kết nối', icon: 'link', title: 'Kết nối', subtitle: 'Liên kết TaskFlow với các công cụ bạn đang dùng.' },
]

const THEMES: { value: ThemeMode; label: string; hint: string }[] = [
  { value: 'dark', label: 'Tối', hint: 'Tối ưu cho môi trường ít ánh sáng' },
  { value: 'light', label: 'Sáng', hint: 'Giao diện sáng, tương phản rõ' },
]

const NOTIFICATION_OPTIONS: { key: keyof NotificationPrefs; label: string; hint: string }[] = [
  { key: 'taskReminders', label: 'Nhắc việc sắp đến hạn', hint: 'Nhắc trước hạn chót và lịch họp quan trọng.' },
  { key: 'mentions', label: 'Khi được nhắc tên', hint: 'Báo khi có người nhắc đến bạn trong bình luận.' },
  { key: 'weeklySummary', label: 'Tổng kết hằng tuần', hint: 'Gửi báo cáo năng suất vào sáng thứ Hai.' },
  { key: 'email', label: 'Gửi qua email', hint: 'Nhận thêm bản sao thông báo qua email.' },
]

const INTEGRATIONS = [
  { name: 'Google Calendar', hint: 'Đồng bộ hạn công việc vào lịch.' },
  { name: 'Slack', hint: 'Nhận thông báo trong kênh nhóm.' },
  { name: 'GitHub', hint: 'Gắn pull request vào công việc.' },
]

const route = useRoute()
const router = useRouter()
const { logout } = useAuth()
const { user, isGuest } = useProfile()
const { prefs, save } = usePreferences()

const activeTab = computed<TabKey>(() => {
  const tab = route.query.tab
  return TABS.some((t) => t.key === tab) ? (tab as TabKey) : 'appearance'
})
const current = computed(() => TABS.find((t) => t.key === activeTab.value)!)

/* Bản nháp: chỉ áp dụng khi bấm "Lưu thay đổi" */
const draft = ref<Preferences>(clonePreferences(prefs.value))
const saved = ref(false)

const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(prefs.value))
watch(dirty, (isDirty) => isDirty && (saved.value = false))

const hasSaveBar = computed(() => activeTab.value === 'appearance' || activeTab.value === 'notifications')

function onSave(): void {
  save(draft.value)
  saved.value = true
}

function onReset(): void {
  draft.value = clonePreferences(prefs.value)
}

async function onLogout(): Promise<void> {
  await logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <div class="ws-page">
    <header>
      <h1 class="ws-title">Cài đặt</h1>
      <p class="ws-subtitle">Điều chỉnh cách TaskFlow hoạt động theo nhu cầu của bạn.</p>
    </header>

    <div class="settings">
      <nav class="settings__nav" aria-label="Danh mục cài đặt">
        <h2 class="settings__nav-title">Danh mục cài đặt</h2>
        <ul>
          <li v-for="tab in TABS" :key="tab.key">
            <RouterLink
              :to="{ query: { tab: tab.key } }"
              replace
              class="settings__tab"
              :class="{ 'is-active': tab.key === activeTab }"
              :aria-current="tab.key === activeTab ? 'page' : undefined"
            >
              <AppIcon :name="tab.icon" :size="20" :stroke-width="1.8" />
              {{ tab.label }}
            </RouterLink>
          </li>
        </ul>
      </nav>

      <PanelCard :title="current.title" :subtitle="current.subtitle" class="settings__panel">
        <!-- Tài khoản -->
        <div v-if="activeTab === 'account'" class="group">
          <dl class="kv">
            <div><dt>Tên người dùng</dt><dd>{{ user?.username }}</dd></div>
            <div><dt>Email</dt><dd>{{ user?.email || '—' }}</dd></div>
            <div><dt>Loại tài khoản</dt><dd>{{ isGuest ? 'Khách (dữ liệu không được lưu)' : 'Thành viên' }}</dd></div>
          </dl>
          <div class="row">
            <div>
              <h3 class="row__title">Hồ sơ cá nhân</h3>
              <p class="row__hint">Đổi tên hiển thị, chức danh, múi giờ và ảnh đại diện.</p>
            </div>
            <RouterLink :to="{ name: 'profile' }" class="link-btn">Mở hồ sơ</RouterLink>
          </div>
          <div class="row">
            <div>
              <h3 class="row__title">Đăng xuất</h3>
              <p class="row__hint">Kết thúc phiên làm việc trên thiết bị này.</p>
            </div>
            <button type="button" class="link-btn link-btn--danger" @click="onLogout">
              <AppIcon name="log-out" :size="16" /> Đăng xuất
            </button>
          </div>
        </div>

        <!-- Giao diện -->
        <div v-else-if="activeTab === 'appearance'" class="group">
          <div class="section">
            <h3 id="theme-label" class="section__title">Chế độ hiển thị</h3>
            <div class="themes" role="radiogroup" aria-labelledby="theme-label">
              <label v-for="theme in THEMES" :key="theme.value" class="theme" :class="{ 'is-active': draft.theme === theme.value }">
                <input v-model="draft.theme" type="radio" name="theme" :value="theme.value" class="visually-hidden" />
                <span class="theme__preview" :class="`theme__preview--${theme.value}`" aria-hidden="true">
                  <i /><i /><i />
                </span>
                <span class="theme__text">
                  <span class="theme__radio" aria-hidden="true" />
                  <strong>{{ theme.label }}</strong>
                </span>
                <span class="theme__hint">{{ theme.hint }}</span>
              </label>
            </div>
          </div>

          <div class="section">
            <h3 id="accent-label" class="section__title">Màu chủ đạo</h3>
            <div class="accents" role="radiogroup" aria-labelledby="accent-label">
              <label v-for="accent in ACCENTS" :key="accent.value" class="accent" :title="accent.label">
                <input v-model="draft.accent" type="radio" name="accent" :value="accent.value" class="visually-hidden" />
                <span class="accent__dot" :style="{ background: accent.value, color: accent.on }">
                  <AppIcon v-if="draft.accent === accent.value" name="check" :size="18" :stroke-width="3" />
                </span>
                <span class="visually-hidden">{{ accent.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Thông báo -->
        <div v-else-if="activeTab === 'notifications'" class="group">
          <div v-for="opt in NOTIFICATION_OPTIONS" :key="opt.key" class="row">
            <div>
              <h3 class="row__title">{{ opt.label }}</h3>
              <p class="row__hint">{{ opt.hint }}</p>
            </div>
            <ToggleSwitch v-model="draft.notifications[opt.key]" :label="opt.label" />
          </div>
        </div>

        <!-- Bảo mật -->
        <div v-else-if="activeTab === 'security'" class="group">
          <div class="row">
            <div>
              <h3 class="row__title">Đổi mật khẩu</h3>
              <p class="row__hint">Gửi liên kết đặt lại mật khẩu tới email của bạn.</p>
            </div>
            <RouterLink v-if="!isGuest" :to="{ name: 'forgot-password' }" class="link-btn">Đổi mật khẩu</RouterLink>
            <span v-else class="row__hint">Không khả dụng ở chế độ Khách</span>
          </div>
          <div class="row">
            <div>
              <h3 class="row__title">Xác thực hai bước</h3>
              <p class="row__hint">Thêm một lớp bảo vệ khi đăng nhập.</p>
            </div>
            <span class="soon">Sắp có</span>
          </div>
        </div>

        <!-- Kết nối -->
        <div v-else class="group">
          <div v-for="app in INTEGRATIONS" :key="app.name" class="row">
            <div>
              <h3 class="row__title">{{ app.name }}</h3>
              <p class="row__hint">{{ app.hint }}</p>
            </div>
            <span class="soon">Sắp có</span>
          </div>
        </div>

        <footer v-if="hasSaveBar" class="savebar">
          <p class="savebar__status" role="status">
            <template v-if="dirty">Bạn có thay đổi chưa lưu.</template>
            <template v-else-if="saved">Đã lưu thay đổi.</template>
          </p>
          <BaseButton v-if="dirty" variant="secondary" class="ws-btn-auto" @click="onReset">Huỷ</BaseButton>
          <BaseButton class="ws-btn-auto" :disabled="!dirty" @click="onSave">Lưu thay đổi</BaseButton>
        </footer>
      </PanelCard>
    </div>
  </div>
</template>

<style scoped>
.settings {
  display: grid;
  grid-template-columns: minmax(14rem, 18rem) minmax(0, 1fr);
  align-items: start;
  gap: var(--ws-gap);
}

/* ----- Danh mục ----- */
.settings__nav {
  padding: 1.25rem 0.875rem;
  border: 1px solid var(--ws-border);
  border-radius: var(--ws-radius);
  background: var(--ws-surface);
}

.settings__nav-title {
  margin: 0 0 0.75rem;
  padding: 0 0.75rem;
  font-size: 1.0625rem;
  font-weight: 700;
}

.settings__nav ul {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.settings__tab {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  height: 2.875rem;
  padding: 0 0.75rem;
  border-radius: var(--ws-radius-sm);
  color: var(--ws-text-2);
  font-size: 0.9375rem;
  font-weight: 500;
  text-decoration: none;
}

.settings__tab:hover {
  background: var(--ws-surface-2);
  color: var(--ws-text);
}

.settings__tab.is-active {
  background: var(--ws-accent-soft);
  color: var(--ws-text);
  font-weight: 600;
}

.settings__tab.is-active svg {
  color: var(--ws-accent-text);
}

.settings__panel {
  min-height: 26rem;
}

.group {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding-top: 0.5rem;
}

/* ----- Khối trong panel ----- */
.section {
  padding-bottom: 1.5rem;
}

.section + .section {
  padding-top: 1.5rem;
  border-top: 1px solid var(--ws-border);
}

.section__title {
  margin: 0 0 1rem;
  font-size: 1rem;
  font-weight: 700;
}

.themes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.theme {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 1rem;
  border: 1px solid var(--ws-border-strong);
  border-radius: 1rem;
  background: var(--ws-surface-2);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.theme:hover {
  border-color: var(--ws-text-3);
}

.theme.is-active {
  border-color: var(--ws-accent);
  background: var(--ws-accent-soft);
}

.theme:has(input:focus-visible) {
  outline: 2px solid var(--ws-accent);
  outline-offset: 2px;
}

.theme__preview {
  display: grid;
  grid-template-columns: 1fr 3fr;
  grid-template-rows: 1fr 1fr;
  gap: 0.375rem;
  height: 4.5rem;
  padding: 0.5rem;
  border-radius: 0.625rem;
}

.theme__preview i {
  border-radius: 0.375rem;
}

.theme__preview i:first-child {
  grid-row: span 2;
}

.theme__preview--dark {
  background: #0f1729;
}

.theme__preview--dark i {
  background: #212e4c;
}

.theme__preview--light {
  background: #e7ebf4;
}

.theme__preview--light i {
  background: #ffffff;
}

.theme__text {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.theme__radio {
  width: 1.125rem;
  height: 1.125rem;
  border: 2px solid var(--ws-text-3);
  border-radius: 50%;
}

.theme.is-active .theme__radio {
  border: 5px solid var(--ws-accent);
}

.theme__hint {
  color: var(--ws-text-2);
  font-size: 0.875rem;
}

.accents {
  display: flex;
  flex-wrap: wrap;
  gap: 0.875rem;
}

.accent {
  cursor: pointer;
}

.accent__dot {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  transition: transform 0.15s ease;
}

.accent:hover .accent__dot {
  transform: scale(1.08);
}

.accent:has(input:checked) .accent__dot {
  box-shadow:
    0 0 0 3px var(--ws-surface),
    0 0 0 5px var(--ws-text);
}

.accent:has(input:focus-visible) .accent__dot {
  outline: 2px solid var(--ws-accent);
  outline-offset: 6px;
}

/* ----- Hàng thiết lập ----- */
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1rem 0;
}

.row + .row,
.kv + .row {
  border-top: 1px solid var(--ws-border);
}

.row__title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
}

.row__hint {
  margin: 0.25rem 0 0;
  color: var(--ws-text-2);
  font-size: 0.875rem;
}

.kv {
  display: grid;
  gap: 0.875rem;
  margin: 0 0 1rem;
}

.kv div {
  display: grid;
  grid-template-columns: 9rem minmax(0, 1fr);
  gap: 1rem;
}

.kv dt {
  color: var(--ws-text-3);
  font-size: 0.875rem;
}

.kv dd {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 0.9375rem;
  font-weight: 500;
}

.link-btn {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 0.5rem;
  height: 2.5rem;
  padding: 0 1rem;
  border: 1px solid var(--ws-border-strong);
  border-radius: var(--ws-radius-sm);
  background: var(--ws-surface-2);
  color: var(--ws-text);
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.link-btn:hover {
  background: var(--ws-surface-3);
}

.link-btn--danger {
  color: var(--ws-danger);
}

.soon {
  flex: none;
  padding: 0.3125rem 0.75rem;
  border-radius: 999px;
  background: var(--ws-surface-2);
  color: var(--ws-text-3);
  font-size: 0.75rem;
  font-weight: 700;
}

/* ----- Thanh lưu ----- */
.savebar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: auto;
  padding-top: 1.25rem;
  border-top: 1px solid var(--ws-border);
}

.savebar__status {
  margin: 0 auto 0 0;
  color: var(--ws-text-2);
  font-size: 0.875rem;
}

@media (max-width: 64rem) {
  .settings {
    grid-template-columns: minmax(0, 1fr);
  }

  .settings__nav {
    padding: 0.5rem;
  }

  .settings__nav-title {
    display: none;
  }

  .settings__nav ul {
    flex-flow: row wrap;
  }

  .settings__tab {
    white-space: nowrap;
  }
}

@media (max-width: 36rem) {
  .themes {
    grid-template-columns: minmax(0, 1fr);
  }

  .row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .kv div {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.125rem;
  }
}
</style>
