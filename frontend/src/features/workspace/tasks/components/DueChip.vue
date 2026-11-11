<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import type { Task } from '../../types'
import { dueInfo, fullDate } from '../taskFormat'

const props = withDefaults(defineProps<{ task: Pick<Task, 'due' | 'status' | 'completedAt'>; long?: boolean }>(), { long: false })

const info = computed(() => dueInfo(props.task))
const icon = computed(() =>
  info.value.tone === 'done' ? 'circle-check' : info.value.tone === 'overdue' ? 'alert' : info.value.tone === 'today' ? 'clock' : 'calendar',
)
const text = computed(() => (props.long && (info.value.tone === 'normal' || info.value.tone === 'soon') ? fullDate(props.task.due) : info.value.label))
</script>

<template>
  <span class="due" :class="`due--${info.tone}`" :title="info.tone === 'done' ? info.label : `Hạn chót ${fullDate(task.due)} (${info.relative})`">
    <AppIcon :name="icon" :size="14" />
    {{ text }}
  </span>
</template>

<style scoped>
.due {
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  height: 1.625rem;
  color: var(--ws-text-2);
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.due--today,
.due--overdue {
  padding: 0 0.625rem 0 0.5rem;
  border-radius: 999px;
  font-weight: 600;
}

.due--today {
  background: color-mix(in srgb, var(--st-todo) 18%, transparent);
  color: var(--st-todo-text);
}

.due--overdue {
  background: color-mix(in srgb, var(--ws-danger) 16%, transparent);
  color: var(--ws-danger);
}

.due--soon {
  color: var(--st-todo-text);
  font-weight: 600;
}

.due--done {
  color: var(--ws-text-3);
}
</style>
