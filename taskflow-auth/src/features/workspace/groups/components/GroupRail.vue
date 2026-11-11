<script setup lang="ts">
import AppIcon from '@/shared/components/AppIcon.vue'
import { useGroups } from '../useGroups'
import GroupIcon from './GroupIcon.vue'

defineProps<{ activeId: string | null }>()
const emit = defineEmits<{ select: [groupId: string]; create: []; join: [] }>()

const { groups, groupUnread } = useGroups()
</script>

<template>
  <nav class="rail ws-scroll" aria-label="Danh sách nhóm">
    <ul class="rail__list">
      <li v-for="g in groups" :key="g.id" class="rail__item">
        <span
          class="rail__pill"
          :class="{
            'is-active': g.id === activeId,
            'is-unread': g.id !== activeId && !g.muted && groupUnread(g.id).count > 0,
          }"
          aria-hidden="true"
        />
        <button
          type="button"
          class="rail__btn"
          :class="{ 'is-active': g.id === activeId, 'is-muted': g.muted }"
          :aria-current="g.id === activeId ? 'page' : undefined"
          :title="g.name"
          :data-test="`rail-${g.id}`"
          @click="emit('select', g.id)"
        >
          <GroupIcon :group="g" :size="44" />
          <span class="visually-hidden">{{ g.name }}</span>
          <span v-if="groupUnread(g.id).mentions && !g.muted" class="rail__badge" data-test="rail-badge">
            {{ groupUnread(g.id).mentions }}
            <span class="visually-hidden">lượt nhắc đến bạn</span>
          </span>
          <span v-else-if="groupUnread(g.id).count && !g.muted" class="rail__badge rail__badge--soft" data-test="rail-badge">
            {{ groupUnread(g.id).count }}
            <span class="visually-hidden">tin chưa đọc</span>
          </span>
        </button>
      </li>
    </ul>
    <span class="rail__sep" aria-hidden="true" />
    <button type="button" class="rail__action" title="Tạo nhóm" data-test="rail-create" @click="emit('create')">
      <AppIcon name="plus" :size="22" />
      <span class="visually-hidden">Tạo nhóm</span>
    </button>
    <button type="button" class="rail__action" title="Tham gia / khám phá nhóm" data-test="rail-join" @click="emit('join')">
      <AppIcon name="compass" :size="22" />
      <span class="visually-hidden">Tham gia nhóm</span>
    </button>
  </nav>
</template>

<style scoped>
.rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  height: 100%;
  padding: 0.875rem 0;
  overflow-y: auto;
  border-right: 1px solid var(--ws-border);
  background: var(--ws-sidebar);
}

.rail__list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rail__item {
  position: relative;
  display: flex;
  justify-content: center;
  width: 4.5rem;
}

.rail__pill {
  position: absolute;
  top: 50%;
  left: 0;
  width: 4px;
  height: 0;
  border-radius: 0 4px 4px 0;
  background: var(--ws-text);
  transform: translateY(-50%);
  transition: height 0.18s ease;
}

.rail__pill.is-unread {
  height: 0.5rem;
}

.rail__pill.is-active {
  height: 2.25rem;
  background: var(--ws-accent);
}

.rail__btn {
  position: relative;
  padding: 0;
  border: 0;
  border-radius: 14px;
  background: none;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.rail__btn :deep(.gi) {
  transition: border-radius 0.18s ease;
}

.rail__btn:hover :deep(.gi),
.rail__btn.is-active :deep(.gi) {
  border-radius: 12px;
}

.rail__btn.is-active {
  box-shadow: 0 0 0 2px var(--ws-sidebar), 0 0 0 4px var(--ws-accent);
}

.rail__btn.is-muted {
  opacity: 0.6;
}

.rail__badge {
  position: absolute;
  right: -6px;
  bottom: -4px;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.3rem;
  border: 3px solid var(--ws-sidebar);
  border-radius: 999px;
  background: var(--ws-dnd);
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 800;
  line-height: 0.875rem;
  text-align: center;
  box-sizing: content-box;
}

.rail__badge--soft {
  background: var(--ws-accent);
}

.rail__sep {
  width: 2rem;
  height: 2px;
  margin: 0.25rem 0;
  border-radius: 2px;
  background: var(--ws-border-strong);
}

.rail__action {
  display: grid;
  flex: none;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px dashed var(--ws-border-strong);
  border-radius: 14px;
  background: var(--ws-surface);
  color: var(--ws-online);
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.rail__action:hover {
  border-style: solid;
  background: var(--ws-online);
  color: #06261a;
}
</style>
