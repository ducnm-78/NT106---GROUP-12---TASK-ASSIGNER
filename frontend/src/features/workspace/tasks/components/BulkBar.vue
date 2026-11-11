<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import { PRIORITY_ORDER, PRIORITY_SHORT, STATUS_LABELS, STATUS_ORDER } from '../../data/constants'
import type { TaskPriority, TaskStatus } from '../../types'
import { fullDate } from '../taskFormat'
import { moveTask, updateTask, useTasks } from '../taskStore'
import { useTaskActions } from '../useTaskActions'
import { useTaskView } from '../useTaskView'
import DuePicker from './DuePicker.vue'
import PersonPicker from './PersonPicker.vue'
import PriorityBadge from './PriorityBadge.vue'
import TaskMenu from './TaskMenu.vue'

/** Thanh thao tác hàng loạt khi chọn nhiều việc ở chế độ Danh sách. */
const selected = defineModel<string[]>('selected', { required: true })
const emit = defineEmits<{ remove: [ids: string[]] }>()

const view = useTaskView()
const { projects } = useTasks()
const actions = useTaskActions()

const n = computed(() => selected.value.length)

function apply(message: string, run: (id: string) => void, close: () => void): void {
  close()
  const ids = [...selected.value]
  actions.undoable(message.replace('{n}', String(ids.length)), () => ids.forEach(run))
}

const setStatus = (s: TaskStatus, close: () => void) =>
  apply(`Đã chuyển {n} việc sang ${STATUS_LABELS[s]}.`, (id) => moveTask(id, { status: s }), close)
const setPriority = (p: TaskPriority, close: () => void) =>
  apply(`Đã đổi ưu tiên {n} việc thành ${PRIORITY_SHORT[p]}.`, (id) => updateTask(id, { priority: p }), close)
const setDue = (due: string, close: () => void) =>
  apply(`Đã đặt hạn chót ${fullDate(due)} cho {n} việc.`, (id) => updateTask(id, { due }), close)
const setAssignee = (who: string | null, close: () => void) =>
  apply(who ? `Đã giao {n} việc cho ${view.nameOf(who)}.` : 'Đã bỏ người phụ trách {n} việc.', (id) => updateTask(id, { assigneeId: who }), close)
const setProject = (projectId: string, close: () => void) =>
  apply(`Đã chuyển {n} việc sang ${projects.find((p) => p.id === projectId)?.name}.`, (id) => updateTask(id, { projectId }), close)
</script>

<template>
  <div class="bulk" role="group" aria-label="Thao tác với các việc đã chọn" data-test="bulk-bar">
    <button type="button" class="tk-icon-btn bulk__x" aria-label="Bỏ chọn" data-test="bulk-clear" @click="selected = []">
      <AppIcon name="x" :size="17" :stroke-width="2.4" />
    </button>
    <strong class="bulk__count" aria-live="polite" data-test="bulk-count">Đã chọn {{ n }} việc</strong>
    <span class="bulk__sep" aria-hidden="true" />

    <TaskMenu label="Đổi trạng thái">
      <template #trigger="{ toggle, open }">
        <button type="button" class="bulk__btn" :aria-expanded="open" data-test="bulk-status" @click="toggle">
          <AppIcon name="circle-check" :size="17" /> Đổi trạng thái
        </button>
      </template>
      <template #default="{ close }">
        <button
          v-for="s in STATUS_ORDER"
          :key="s"
          type="button"
          class="tk-menu__item"
          role="menuitem"
          :data-test="`bulk-status-${s}`"
          @click="setStatus(s, close)"
        >
          <span class="tk-dot" :class="`tk-dot--${s}`" /> {{ STATUS_LABELS[s] }}
        </button>
      </template>
    </TaskMenu>

    <TaskMenu label="Giao cho">
      <template #trigger="{ toggle, open }">
        <button type="button" class="bulk__btn" :aria-expanded="open" data-test="bulk-assign" @click="toggle">
          <AppIcon name="user-plus" :size="17" /> Giao cho
        </button>
      </template>
      <template #default="{ close }">
        <PersonPicker :people="view.everyone.value" :selected="null" always-none @pick="setAssignee($event, close)" />
      </template>
    </TaskMenu>

    <TaskMenu label="Đặt hạn chót">
      <template #trigger="{ toggle, open }">
        <button type="button" class="bulk__btn" :aria-expanded="open" data-test="bulk-due" @click="toggle">
          <AppIcon name="calendar" :size="17" /> Đặt hạn chót
        </button>
      </template>
      <template #default="{ close }">
        <DuePicker @pick="setDue($event, close)" />
      </template>
    </TaskMenu>

    <TaskMenu label="Đổi ưu tiên">
      <template #trigger="{ toggle, open }">
        <button type="button" class="bulk__btn" :aria-expanded="open" data-test="bulk-priority" @click="toggle">
          <AppIcon name="bar-chart" :size="17" /> Đổi ưu tiên
        </button>
      </template>
      <template #default="{ close }">
        <button
          v-for="p in PRIORITY_ORDER"
          :key="p"
          type="button"
          class="tk-menu__item"
          role="menuitem"
          :data-test="`bulk-priority-${p}`"
          @click="setPriority(p, close)"
        >
          <PriorityBadge :priority="p" />
        </button>
      </template>
    </TaskMenu>

    <TaskMenu label="Chuyển nhóm">
      <template #trigger="{ toggle, open }">
        <button type="button" class="bulk__btn" :aria-expanded="open" data-test="bulk-project" @click="toggle">
          <AppIcon name="users" :size="17" /> Chuyển nhóm
        </button>
      </template>
      <template #default="{ close }">
        <button
          v-for="p in projects"
          :key="p.id"
          type="button"
          class="tk-menu__item"
          role="menuitem"
          :data-test="`bulk-project-${p.id}`"
          @click="setProject(p.id, close)"
        >
          <span class="tk-code bulk__code" :style="{ '--c': p.color }">{{ p.code }}</span> {{ p.name }}
        </button>
      </template>
    </TaskMenu>

    <button type="button" class="bulk__btn bulk__btn--danger" data-test="bulk-delete" @click="emit('remove', [...selected])">
      <AppIcon name="trash" :size="17" /> Xoá
    </button>
  </div>
</template>

<style scoped>
.bulk {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.875rem;
  padding: 0.3125rem 0.5rem;
  border: 1px solid var(--ws-accent);
  border-radius: 0.875rem;
  background: color-mix(in srgb, var(--ws-accent) 14%, var(--ws-surface));
  animation: bulk-in 0.18s ease-out;
}

@keyframes bulk-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
}

.bulk__x {
  width: 2rem;
  height: 2rem;
}

.bulk__count {
  padding: 0 0.25rem;
  font-size: 0.9375rem;
  white-space: nowrap;
}

.bulk__sep {
  width: 1px;
  height: 1.25rem;
  margin: 0 0.25rem;
  background: var(--ws-border-strong);
}

.bulk__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4375rem;
  height: 2.125rem;
  padding: 0 0.75rem;
  border: 0;
  border-radius: 0.5625rem;
  background: var(--ws-surface-2);
  color: var(--ws-text);
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.bulk__btn :deep(svg) {
  color: var(--ws-accent-text);
}

.bulk__btn:hover {
  background: var(--ws-surface-3);
}

.bulk__btn--danger {
  margin-left: auto;
  background: none;
  color: var(--ws-danger);
}

.bulk__btn--danger :deep(svg) {
  color: var(--ws-danger);
}

.bulk__btn--danger:hover {
  background: color-mix(in srgb, var(--ws-danger) 14%, transparent);
}

.bulk__code {
  width: 1.5rem;
  height: 1.5rem;
  font-size: 0.5625rem;
}
</style>
