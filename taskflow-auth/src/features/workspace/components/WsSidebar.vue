<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppIcon from '@/shared/components/AppIcon.vue'
import AppLogo from '@/shared/components/AppLogo.vue'
import { useProfile } from '../composables/useProfile'
import { useWorkspace } from '../composables/useWorkspace'
import { useGroups } from '../groups/useGroups'
import { useTasks } from '../tasks/taskStore'
import { NAV_ITEMS } from '../routes'
import UserAvatar from './UserAvatar.vue'

defineEmits<{ navigate: [] }>()

const route = useRoute()
const { projectStats } = useWorkspace()
const { myOpenCount } = useTasks()
const { profile, initials, isGuest } = useProfile()
const { totalUnread } = useGroups()
</script>

<template>
  <aside class="sidebar">
    <RouterLink :to="{ name: 'overview' }" class="sidebar__brand" @click="$emit('navigate')">
      <AppLogo />
    </RouterLink>

    <nav class="sidebar__section" aria-labelledby="nav-main">
      <h2 id="nav-main" class="sidebar__heading">Không gian làm việc</h2>
      <ul class="sidebar__list">
        <li v-for="item in NAV_ITEMS" :key="item.name">
          <RouterLink
            :to="{ name: item.name }"
            class="sidebar__link"
            :class="{ 'is-active': route.meta.nav === item.name }"
            :aria-current="route.meta.nav === item.name ? 'page' : undefined"
            @click="$emit('navigate')"
          >
            <AppIcon :name="item.icon" :size="20" :stroke-width="1.8" />
            <span>{{ item.label }}</span>
            <span v-if="item.name === 'tasks' && myOpenCount" class="sidebar__badge" data-test="tasks-badge" title="Việc cần bạn xử lý">
              {{ myOpenCount }}
              <span class="visually-hidden">việc cần bạn xử lý</span>
            </span>
            <span v-if="item.name === 'team' && totalUnread" class="sidebar__badge sidebar__badge--alert" data-test="team-badge">
              {{ totalUnread }}
              <span class="visually-hidden">tin nhắn chưa đọc</span>
            </span>
          </RouterLink>
        </li>
      </ul>
    </nav>

    <section class="sidebar__section sidebar__projects" aria-labelledby="nav-projects">
      <h2 id="nav-projects" class="sidebar__heading">Dự án của tôi</h2>
      <ul class="sidebar__list">
        <li v-for="project in projectStats" :key="project.id">
          <RouterLink
            :to="{ name: 'tasks', query: { scope: project.id } }"
            class="sidebar__project"
            :data-test="`sidebar-project-${project.id}`"
            @click="$emit('navigate')"
          >
            <span class="sidebar__dot" :style="{ background: project.color }" />
            <span class="sidebar__project-name">{{ project.name }}</span>
            <span class="sidebar__count" :title="`${project.open} việc chưa xong`">
              {{ String(project.open).padStart(2, '0') }}
            </span>
          </RouterLink>
        </li>
      </ul>
    </section>

    <RouterLink :to="{ name: 'profile' }" class="sidebar__user" @click="$emit('navigate')">
      <UserAvatar :initials="initials" :src="profile.avatar" size="2.5rem" />
      <span class="sidebar__user-text">
        <strong>{{ profile.displayName }}</strong>
        <span>{{ isGuest ? 'Chế độ khách' : 'Không gian cá nhân' }}</span>
      </span>
    </RouterLink>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  border-right: 1px solid var(--ws-border);
  background: var(--ws-sidebar);
}

.sidebar__brand {
  display: flex;
  align-items: center;
  height: var(--topbar-h);
  padding: 0 1.5rem;
  border-bottom: 1px solid var(--ws-border);
  text-decoration: none;
}

.sidebar__brand :deep(.logo__mark) {
  width: 2.5rem;
  color: #fff;
  background: var(--ws-accent);
}

.sidebar__brand :deep(.logo__text) {
  font-size: 1.375rem;
}

.sidebar__section {
  padding: 1.25rem 0.875rem 0.5rem;
}

.sidebar__heading {
  margin: 0 0 0.5rem;
  padding: 0 0.75rem;
  color: var(--ws-text-3);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sidebar__list {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sidebar__link {
  position: relative;
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
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.sidebar__link:hover {
  background: var(--ws-surface);
  color: var(--ws-text);
}

.sidebar__link.is-active {
  background: var(--ws-accent-soft);
  color: var(--ws-text);
  font-weight: 600;
}

.sidebar__link.is-active::before {
  content: '';
  position: absolute;
  top: 0.625rem;
  bottom: 0.625rem;
  left: -0.875rem;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--ws-accent);
}

.sidebar__link.is-active svg {
  color: var(--ws-accent-text);
}

.sidebar__badge {
  margin-left: auto;
  min-width: 1.5rem;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  background: var(--ws-surface-3);
  color: var(--ws-text);
  font-size: 0.75rem;
  font-weight: 700;
  text-align: center;
}

.sidebar__projects {
  margin-top: 0.5rem;
  border-top: 1px solid var(--ws-border);
}

.sidebar__project {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  height: 2.5rem;
  padding: 0 0.75rem;
  border-radius: 0.625rem;
  color: var(--ws-text-2);
  font-size: 0.9375rem;
  text-decoration: none;
  transition: background-color 0.15s ease;
}

.sidebar__project:hover {
  background: var(--ws-surface-2);
  color: var(--ws-text);
}

.sidebar__dot {
  flex: none;
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 50%;
}

.sidebar__project-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar__count {
  margin-left: auto;
  color: var(--ws-text-3);
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
}

.sidebar__user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: auto;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--ws-border);
  color: inherit;
  text-decoration: none;
}

.sidebar__user:hover {
  background: var(--ws-surface);
}

.sidebar__user-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sidebar__user-text strong {
  overflow: hidden;
  font-size: 0.9375rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar__user-text span {
  color: var(--ws-text-3);
  font-size: 0.8125rem;
}
.sidebar__badge--alert {
  background: var(--ws-dnd);
  color: #fff;
}
</style>
