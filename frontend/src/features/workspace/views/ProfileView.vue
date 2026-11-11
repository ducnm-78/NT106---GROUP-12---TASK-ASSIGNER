<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import AvatarModal from '../components/AvatarModal.vue'
import EditProfileModal from '../components/EditProfileModal.vue'
import PanelCard from '../components/PanelCard.vue'
import StatCard from '../components/StatCard.vue'
import UserAvatar from '../components/UserAvatar.vue'
import { useProfile } from '../composables/useProfile'
import { useWorkspace } from '../composables/useWorkspace'
import { formatMonthYear, formatNumber, formatPercent, formatTimezone } from '../utils/format'

const { user, isGuest, profile, initials } = useProfile()
const { statusCounts, weeklyFocus, activity } = useWorkspace()

const editingAvatar = ref(false)
const editingProfile = ref(false)

const info = computed(() => [
  { label: 'Họ và tên', value: profile.value.displayName },
  { label: 'Tên người dùng', value: user.value?.username ?? '—' },
  { label: 'Email', value: user.value?.email || '—' },
  { label: 'Chức danh', value: profile.value.jobTitle || 'Chưa cập nhật' },
  { label: 'Múi giờ', value: formatTimezone(profile.value.timezone) },
])
</script>

<template>
  <div class="ws-page">
    <header>
      <h1 class="ws-title">Hồ sơ cá nhân</h1>
      <p class="ws-subtitle">Quản lý thông tin cá nhân và hoạt động của bạn.</p>
    </header>

    <section class="hero" aria-label="Tóm tắt hồ sơ">
      <div class="hero__banner" aria-hidden="true">
        <span class="hero__orb hero__orb--a" />
        <span class="hero__orb hero__orb--b" />
      </div>
      <div class="hero__body">
        <button
          type="button"
          class="hero__avatar"
          aria-label="Đổi ảnh đại diện"
          :disabled="isGuest"
          @click="editingAvatar = true"
        >
          <UserAvatar :initials="initials" :src="profile.avatar" size="100%" />
          <span v-if="!isGuest" class="hero__avatar-edit"><AppIcon name="camera" :size="18" /></span>
        </button>

        <div class="hero__info">
          <div class="hero__name-row">
            <h2 class="hero__name">{{ profile.displayName }}</h2>
            <span class="hero__badge">{{ isGuest ? 'Khách' : 'Thành viên' }}</span>
          </div>
          <p class="hero__meta">
            <span v-if="user?.email">{{ user.email }}</span>
            <span v-if="profile.jobTitle">{{ profile.jobTitle }}</span>
          </p>
        </div>

        <BaseButton class="ws-btn-auto hero__edit" :disabled="isGuest" @click="editingProfile = true">
          <AppIcon name="pencil" :size="17" />
          Chỉnh sửa hồ sơ
        </BaseButton>
      </div>
      <p v-if="isGuest" class="hero__guest">Bạn đang dùng chế độ Khách. Đăng kí tài khoản để chỉnh sửa và lưu hồ sơ.</p>
    </section>

    <div class="profile__grid">
      <PanelCard title="Thông tin cá nhân" subtitle="Thông tin được hiển thị trong không gian làm việc.">
        <dl class="info">
          <div v-for="row in info" :key="row.label" class="info__row">
            <dt>{{ row.label }}</dt>
            <dd>{{ row.value }}</dd>
          </div>
        </dl>
      </PanelCard>

      <PanelCard title="Tổng quan hoạt động" subtitle="Năng suất và các thành tích gần đây.">
        <div class="activity">
          <StatCard label="Đã hoàn thành" :value="String(statusCounts.done)" hint="công việc" icon="check-square" />
          <StatCard
            label="Tập trung tuần này"
            :value="`${formatNumber(weeklyFocus)} h`"
            hint="7 ngày gần nhất"
            icon="clock"
          />
          <StatCard
            label="Chuỗi ngày liên tiếp"
            :value="`${activity.streakDays} ngày`"
            :hint="`kỷ lục ${activity.bestStreakDays} ngày`"
            icon="flame"
          />
          <StatCard label="Đúng hạn" :value="formatPercent(activity.onTimeRate)" hint="trong 30 ngày qua" icon="target" />
        </div>
        <p class="activity__since">Thành viên từ {{ formatMonthYear(user?.createdAt ?? '') }}</p>
      </PanelCard>
    </div>

    <AvatarModal v-model:open="editingAvatar" />
    <EditProfileModal v-model:open="editingProfile" />
  </div>
</template>

<style scoped>
/* ----- Thẻ tóm tắt ----- */
.hero {
  overflow: hidden;
  border: 1px solid var(--ws-border);
  border-radius: var(--ws-radius);
  background: var(--ws-surface);
}

.hero__banner {
  position: relative;
  height: clamp(6rem, 12vh, 9rem);
  overflow: hidden;
  background: linear-gradient(120deg, color-mix(in srgb, var(--ws-accent) 70%, #1b1660), color-mix(in srgb, var(--ws-accent) 35%, #0f1729));
}

.hero__orb {
  position: absolute;
  border-radius: 50%;
  background: rgb(255 255 255 / 0.12);
}

.hero__orb--a {
  top: -60%;
  right: 8%;
  width: 14rem;
  aspect-ratio: 1;
}

.hero__orb--b {
  bottom: -90%;
  right: 22%;
  width: 10rem;
  aspect-ratio: 1;
  background: rgb(255 255 255 / 0.08);
}

/* Avatar đè lên banner; phần tên nằm hoàn toàn dưới banner để không bị chồng chữ */
.hero__body {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem 1.5rem;
  padding: 0 clamp(1.25rem, 2.5vw, 2.5rem) 1.5rem;
}

.hero__avatar {
  position: relative;
  flex: none;
  width: clamp(6.5rem, 8vw, 8rem);
  aspect-ratio: 1;
  margin-top: calc(clamp(6.5rem, 8vw, 8rem) / -2);
  padding: 0;
  border: 4px solid var(--ws-surface);
  border-radius: 50%;
  background: var(--ws-surface);
  box-shadow: 0 0 0 3px var(--ws-accent);
  cursor: pointer;
}

.hero__avatar:disabled {
  cursor: default;
}

.hero__avatar :deep(.avatar) {
  font-size: 2.5rem;
}

.hero__avatar-edit {
  position: absolute;
  right: 0;
  bottom: 0;
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 3px solid var(--ws-surface);
  border-radius: 50%;
  background: var(--ws-accent);
  color: var(--ws-on-accent);
  transition: transform 0.15s ease;
}

.hero__avatar:hover .hero__avatar-edit {
  transform: scale(1.08);
}

.hero__info {
  flex: 1;
  min-width: 14rem;
  padding-bottom: 0.25rem;
}

.hero__name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.875rem;
}

.hero__name {
  margin: 0;
  font-size: clamp(1.5rem, 1.1rem + 0.8vw, 2rem);
  font-weight: 700;
}

.hero__badge {
  padding: 0.3125rem 0.75rem;
  border-radius: 999px;
  background: var(--ws-accent-soft);
  color: var(--ws-accent-text);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0;
  margin: 0.375rem 0 0;
  color: var(--ws-text-2);
  font-size: 0.9375rem;
}

.hero__meta span + span::before {
  content: '·';
  margin: 0 0.5rem;
}

.hero__edit :deep(.btn__label) {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.hero__guest {
  margin: 0;
  padding: 0.75rem clamp(1.25rem, 2.5vw, 2.5rem);
  border-top: 1px solid var(--ws-border);
  color: var(--ws-text-2);
  font-size: 0.875rem;
}

/* ----- Lưới dưới ----- */
.profile__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  gap: var(--ws-gap);
}

.info {
  display: flex;
  flex-direction: column;
  margin: 0;
}

.info__row {
  display: grid;
  grid-template-columns: 9rem minmax(0, 1fr);
  gap: 1rem;
  padding: 0.875rem 0;
}

.info__row + .info__row {
  border-top: 1px solid var(--ws-border);
}

.info dt {
  color: var(--ws-text-3);
  font-size: 0.875rem;
}

.info dd {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 0.9375rem;
  font-weight: 500;
}

.activity {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.activity :deep(.stat) {
  background: var(--ws-surface-2);
  border-color: transparent;
}

.activity__since {
  margin: 1.25rem 0 0;
  color: var(--ws-text-3);
  font-size: 0.875rem;
}

@media (max-width: 64rem) {
  .profile__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 36rem) {
  .hero__edit {
    width: 100%;
  }

  .info__row {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.25rem;
  }
}

@media (max-width: 26rem) {
  .activity {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
