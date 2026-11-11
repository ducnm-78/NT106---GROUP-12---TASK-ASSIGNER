<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import { STATUS_LABELS } from '../../data/constants'
import type { Project, Task } from '../../types'
import { taskCode } from '../taskStore'
import DueChip from './DueChip.vue'
import PriorityBadge from './PriorityBadge.vue'
import TaskAvatar from './TaskAvatar.vue'

const props = defineProps<{ task: Task; active?: boolean; project?: Project | null; ghost?: boolean }>()
const emit = defineEmits<{ open: []; shift: [dir: -1 | 1] }>()

const subDone = computed(() => props.task.subtasks.filter((s) => s.done).length)
const done = computed(() => props.task.status === 'done')

function onKeydown(event: KeyboardEvent): void {
  if (event.target !== event.currentTarget) return
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emit('open')
  } else if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
    event.preventDefault()
    emit('shift', event.key === 'ArrowLeft' ? -1 : 1)
  }
}
</script>

<template>
  <div
    class="card"
    :class="{ 'is-done': done, 'is-active': active, 'is-ghost': ghost }"
    :tabindex="ghost ? -1 : 0"
    role="button"
    :aria-label="`${taskCode(task)}: ${task.title}. ${STATUS_LABELS[task.status]}. Enter để mở, Alt + mũi tên để đổi cột`"
    :data-card-id="ghost ? undefined : task.id"
    :data-test="ghost ? 'drag-ghost' : `card-${taskCode(task)}`"
    @keydown="onKeydown"
  >
    <div class="card__top">
      <PriorityBadge :priority="task.priority" />
      <span v-if="task.labels[0]" class="tk-label card__label">{{ task.labels[0] }}</span>
      <span v-if="task.labels.length > 1" class="card__more">+{{ task.labels.length - 1 }}</span>
      <span class="tk-key card__key">{{ taskCode(task) }}</span>
    </div>

    <p class="card__title">{{ task.title }}</p>

    <div class="card__bottom">
      <TaskAvatar :id="task.assigneeId" :size="24" ring="var(--ws-surface-2)" />
      <span v-if="project" class="card__project" :title="project.name">
        <span class="tk-code card__code" :style="{ '--c': project.color }">{{ project.code }}</span>
      </span>
      <span v-if="task.subtasks.length && !done" class="card__meta" :title="`${subDone}/${task.subtasks.length} việc con`">
        <AppIcon name="list-checks" :size="15" /> {{ subDone }}/{{ task.subtasks.length }}
      </span>
      <span v-if="task.comments.length && !done" class="card__meta" :title="`${task.comments.length} bình luận`">
        <AppIcon name="message" :size="14" /> {{ task.comments.length }}
      </span>
      <DueChip :task="task" class="card__due" />
    </div>
  </div>
</template>

<style scoped>
.card {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 0.8125rem 0.875rem;
  border: 1px solid var(--ws-border);
  border-radius: 0.875rem;
  background: var(--ws-surface-2);
  box-shadow: 0 1px 0 rgb(0 0 0 / 0.08);
  cursor: grab;
  user-select: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.card:hover {
  border-color: color-mix(in srgb, var(--ws-accent) 45%, var(--ws-border));
  box-shadow: 0 10px 24px -16px rgb(0 0 0 / 0.55);
  transform: translateY(-1px);
}

.card.is-active {
  border-color: var(--ws-accent);
  box-shadow: 0 0 0 1px var(--ws-accent);
}

.card.is-ghost {
  border-color: var(--ws-accent);
  box-shadow:
    0 0 0 1px var(--ws-accent),
    0 22px 40px -14px rgb(0 0 0 / 0.55);
  cursor: grabbing;
  transform: rotate(-3deg);
}

.card__top {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
}

.card__label {
  min-width: 0;
  text-overflow: ellipsis;
}

.card__more {
  color: var(--ws-text-3);
  font-size: 0.75rem;
}

.card__key {
  flex: none;
  margin-left: auto;
}

.card__title {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.card.is-done .card__title {
  color: var(--ws-text-3);
  text-decoration: line-through;
}

.card__bottom {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-height: 1.625rem;
}

.card__meta {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--ws-text-2);
  font-size: 0.8125rem;
  font-weight: 500;
}

.card__meta :deep(svg) {
  color: var(--ws-text-3);
}

.card__code {
  width: 1.375rem;
  height: 1.375rem;
  border-radius: 0.375rem;
  font-size: 0.5625rem;
}

.card__due {
  margin-left: auto;
}

/* Cột hẹp (màn ~1366px): bỏ nhãn trên thẻ để mã TF và ưu tiên không bị chèn */
@container (max-width: 17.5rem) {
  .card__label,
  .card__more {
    display: none;
  }
}
</style>
