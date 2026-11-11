<script setup lang="ts">
import AppIcon from '@/shared/components/AppIcon.vue'
import { PRIORITY_ORDER, PRIORITY_SHORT } from '../../data/constants'
import type { TaskPriority } from '../../types'
import PriorityBadge from './PriorityBadge.vue'
import TaskMenu from './TaskMenu.vue'

defineProps<{ priority: TaskPriority; testId?: string }>()
const emit = defineEmits<{ change: [priority: TaskPriority] }>()
</script>

<template>
  <TaskMenu label="Đổi ưu tiên">
    <template #trigger="{ toggle, open }">
      <button
        type="button"
        class="pm-trigger"
        :aria-expanded="open"
        aria-haspopup="menu"
        :aria-label="`Ưu tiên: ${PRIORITY_SHORT[priority]}. Bấm để đổi`"
        :data-test="testId"
        @click.stop="toggle"
      >
        <PriorityBadge :priority="priority" chevron />
      </button>
    </template>
    <template #default="{ close }">
      <button
        v-for="p in PRIORITY_ORDER"
        :key="p"
        type="button"
        class="tk-menu__item"
        role="menuitemradio"
        :aria-checked="p === priority"
        :data-test="`priority-option-${p}`"
        @click="
          close();
          p !== priority && emit('change', p)
        "
      >
        <PriorityBadge :priority="p" />
        <AppIcon v-if="p === priority" name="check" :size="16" class="tk-menu__check" />
      </button>
    </template>
  </TaskMenu>
</template>

<style scoped>
.pm-trigger {
  display: inline-flex;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: none;
  cursor: pointer;
}

.pm-trigger:hover :deep(.prio) {
  filter: brightness(1.12);
}
</style>
