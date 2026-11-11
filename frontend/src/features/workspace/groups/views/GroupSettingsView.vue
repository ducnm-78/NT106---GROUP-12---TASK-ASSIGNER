<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon, { type IconName } from '@/shared/components/AppIcon.vue'
import { useGroups } from '../useGroups'
import type { Permission } from '../types'
import GroupIcon from '../components/GroupIcon.vue'
import AdminSections from '../settings/AdminSections.vue'
import ChannelsSection from '../settings/ChannelsSection.vue'
import MembersSection from '../settings/MembersSection.vue'
import OverviewSection from '../settings/OverviewSection.vue'
import RolesSection from '../settings/RolesSection.vue'
import '../settings/settings.css'

type Section = 'overview' | 'roles' | 'members' | 'channels' | 'invites' | 'automod' | 'bans' | 'audit'

const NAV: { id: Section; label: string; icon: IconName; perm: Permission | null; group: string }[] = [
  { id: 'overview', label: 'Tổng quan', icon: 'grid', perm: null, group: 'Nhóm' },
  { id: 'roles', label: 'Vai trò & quyền', icon: 'shield', perm: 'MANAGE_ROLES', group: 'Nhóm' },
  { id: 'channels', label: 'Kênh & AI', icon: 'hash', perm: 'MANAGE_CHANNELS', group: 'Nhóm' },
  { id: 'members', label: 'Thành viên', icon: 'users', perm: 'MANAGE_MEMBERS', group: 'Cộng đồng' },
  { id: 'invites', label: 'Lời mời', icon: 'link', perm: 'MANAGE_MEMBERS', group: 'Cộng đồng' },
  { id: 'automod', label: 'Kiểm duyệt', icon: 'filter', perm: 'ADMINISTRATOR', group: 'Kiểm duyệt' },
  { id: 'bans', label: 'Danh sách cấm', icon: 'ban', perm: 'MANAGE_MEMBERS', group: 'Kiểm duyệt' },
  { id: 'audit', label: 'Nhật ký', icon: 'clipboard', perm: 'ADMINISTRATOR', group: 'Kiểm duyệt' },
]

const route = useRoute()
const router = useRouter()
const store = useGroups()

const group = computed(() => store.group(String(route.params.groupId)))
const section = computed<Section>(() => {
  const s = String(route.params.section || 'overview') as Section
  return NAV.some((n) => n.id === s) ? s : 'overview'
})
const allowed = (perm: Permission | null) => !perm || (!!group.value && store.can(group.value.id, perm))
const navGroups = computed(() => {
  const map = new Map<string, typeof NAV>()
  for (const n of NAV) map.set(n.group, [...(map.get(n.group) ?? []), n])
  return [...map.entries()]
})
const current = computed(() => NAV.find((n) => n.id === section.value)!)

// Nhóm bị xoá/rời → quay về danh sách nhóm
watch(group, (g) => {
  if (!g && route.name === 'team-settings') router.replace({ name: 'team' })
})
</script>

<template>
  <div v-if="group" class="gset">
    <nav class="gset__nav ws-scroll" aria-label="Mục cài đặt nhóm">
      <RouterLink :to="{ name: 'team-channel', params: { groupId: group.id } }" class="gset__back" data-test="settings-back">
        <AppIcon name="arrow-left" :size="16" /> Quay lại trò chuyện
      </RouterLink>
      <div class="gset__group">
        <GroupIcon :group="group" :size="40" />
        <span>
          <strong>{{ group.name }}</strong>
          <small>{{ group.members.length }} thành viên</small>
        </span>
      </div>
      <template v-for="[title, items] in navGroups" :key="title">
        <h2 class="gset__heading">{{ title }}</h2>
        <ul class="gset__list">
          <li v-for="n in items" :key="n.id">
            <RouterLink
              :to="{ name: 'team-settings', params: { groupId: group.id, section: n.id } }"
              class="gset__link"
              :class="{ 'is-active': n.id === section, 'is-locked': !allowed(n.perm) }"
              :aria-current="n.id === section ? 'page' : undefined"
              :data-test="`nav-${n.id}`"
            >
              <AppIcon :name="n.icon" :size="18" />
              <span>{{ n.label }}</span>
              <AppIcon v-if="!allowed(n.perm)" name="lock" :size="13" class="gset__lock" />
              <span v-else-if="n.id === 'bans' && group.bans.length" class="gset__count">{{ group.bans.length }}</span>
            </RouterLink>
          </li>
        </ul>
      </template>
    </nav>

    <main class="gset__content ws-scroll">
      <div class="gset__inner">
        <div v-if="!allowed(current.perm)" class="gset__denied" data-test="settings-denied">
          <span><AppIcon name="lock" :size="28" /></span>
          <h1>Bạn không có quyền xem mục này</h1>
          <p>Cần quyền “{{ current.label }}”. Hãy liên hệ quản trị viên nhóm.</p>
        </div>
        <OverviewSection v-else-if="section === 'overview'" :group="group" />
        <RolesSection v-else-if="section === 'roles'" :key="group.id" :group="group" />
        <MembersSection v-else-if="section === 'members'" :group="group" />
        <ChannelsSection v-else-if="section === 'channels'" :group="group" />
        <AdminSections v-else :group="group" :section="section as 'invites' | 'automod' | 'bans' | 'audit'" />
      </div>
    </main>
  </div>
</template>

<style scoped>
.gset {
  display: grid;
  grid-template-columns: 16rem minmax(0, 1fr);
  height: 100%;
  min-height: 0;
}

.gset__nav {
  min-height: 0;
  padding: 1rem 0.75rem;
  overflow-y: auto;
  border-right: 1px solid var(--ws-border);
  background: color-mix(in srgb, var(--ws-sidebar) 55%, var(--ws-surface));
}

.gset__back {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.5rem;
  border-radius: 0.5rem;
  color: var(--ws-text-2);
  font-size: 0.8125rem;
  font-weight: 600;
  text-decoration: none;
}

.gset__back:hover {
  background: var(--ws-surface-2);
  color: var(--ws-text);
}

.gset__group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.75rem 0 0.5rem;
  padding: 0.75rem;
  border-radius: 0.875rem;
  background: var(--ws-surface-2);
}

.gset__group span {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.gset__group strong {
  overflow: hidden;
  font-size: 0.9375rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gset__group small {
  color: var(--ws-text-3);
  font-size: 0.75rem;
}

.gset__heading {
  margin: 1rem 0 0.375rem;
  padding: 0 0.5rem;
  color: var(--ws-text-3);
  font-size: 0.6875rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.gset__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.gset__link {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  height: 2.375rem;
  padding: 0 0.625rem;
  border-radius: 0.625rem;
  color: var(--ws-text-2);
  font-size: 0.9rem;
  font-weight: 500;
  text-decoration: none;
}

.gset__link span:first-of-type {
  flex: 1;
}

.gset__link:hover {
  background: var(--ws-surface-2);
  color: var(--ws-text);
}

.gset__link.is-active {
  background: var(--ws-accent-soft);
  color: var(--ws-text);
  font-weight: 600;
}

.gset__link.is-active svg:first-child {
  color: var(--ws-accent-text);
}

.gset__link.is-locked {
  opacity: 0.6;
}

.gset__lock {
  color: var(--ws-text-3);
}

.gset__count {
  min-width: 1.25rem;
  padding: 0 0.375rem;
  border-radius: 999px;
  background: var(--ws-dnd);
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 800;
  text-align: center;
}

.gset__content {
  min-height: 0;
  overflow-y: auto;
  padding: clamp(1rem, 2.5vw, 2rem);
}

.gset__inner {
  max-width: 64rem;
  margin: 0 auto;
}

.gset__denied {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem 1rem;
  text-align: center;
}

.gset__denied > span {
  display: grid;
  place-items: center;
  width: 4rem;
  height: 4rem;
  margin-bottom: 1rem;
  border-radius: 1.25rem;
  background: color-mix(in srgb, var(--ws-idle) 16%, transparent);
  color: var(--ws-idle);
}

.gset__denied h1 {
  margin: 0;
  font-size: 1.375rem;
}

.gset__denied p {
  margin: 0.5rem 0 0;
  color: var(--ws-text-2);
}

@media (max-width: 52rem) {
  .gset {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
  }

  .gset__nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    padding: 0.75rem;
    overflow: visible;
    border-right: 0;
    border-bottom: 1px solid var(--ws-border);
  }

  .gset__group,
  .gset__heading {
    display: none;
  }

  .gset__list {
    display: contents;
  }

  .gset__back {
    width: 100%;
  }

  .gset__link {
    height: 2.125rem;
    background: var(--ws-surface-2);
    font-size: 0.8125rem;
  }
}
</style>
