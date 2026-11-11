<script setup lang="ts">
import AppIcon from '@/shared/components/AppIcon.vue'
import { STATUS_LABELS, STATUS_ORDER } from '../../data/constants'
import type { TaskStatus } from '../../types'
import StatusPill from './StatusPill.vue'
import TaskMenu from './TaskMenu.vue'

defineProps<{ status: TaskStatus; size?: 'sm' | 'md'; testId?: string }>()
const emit = defineEmits<{ change: [status: TaskStatus] }>()
</script>

<template>
  <TaskMenu label="Đổi trạng thái">
    <template #trigger="{ toggle, open, menuId }">
      <button
        type="button"
        class="sm-trigger"
        :aria-expanded="open"
        :aria-controls="open ? menuId : undefined"
        aria-haspopup="menu"
        :aria-label="`Trạng thái: ${STATUS_LABELS[status]}. Bấm để đổi`"
        :data-test="testId"
        @click.stop="toggle"
      >
        <StatusPill :status="status" :size="size" chevron />
      </button>
    </template>
    <template #default="{ close }">
      <div class="tk-menu__label">Chuyển sang</div>
      <button
        v-for="s in STATUS_ORDER"
        :key="s"
        type="button"
        class="tk-menu__item"
        role="menuitemradio"
        :aria-checked="s === status"
        :data-test="`status-option-${s}`"
        @click="
          close();
          s !== status && emit('change', s)
        "
      >
        <span class="tk-dot" :class="`tk-dot--${s}`" />
        {{ STATUS_LABELS[s] }}
        <AppIcon v-if="s === status" name="check" :size="16" class="tk-menu__check" />
      </button>
    </template>
  </TaskMenu>
</template>

<style scoped>
.sm-trigger {
  display: inline-flex;
  min-width: 0;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: none;
  cursor: pointer;
}

.sm-trigger:hover :deep(.pill) {
  filter: brightness(1.08);
}
</style>
