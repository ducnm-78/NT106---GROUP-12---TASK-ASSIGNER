<script setup lang="ts">
import AppIcon from '@/shared/components/AppIcon.vue'
import { PRIORITY_SHORT } from '../../data/constants'
import type { TaskPriority } from '../../types'

withDefaults(defineProps<{ priority: TaskPriority; chevron?: boolean }>(), { chevron: false })

const LEVEL = { high: 3, medium: 2, low: 1 } as const
</script>

<template>
  <span class="prio" :class="`prio--${priority}`" :title="`Ưu tiên: ${PRIORITY_SHORT[priority]}`">
    <span class="prio__bars" aria-hidden="true">
      <i v-for="n in 3" :key="n" :class="{ 'is-on': n <= LEVEL[priority] }" :style="{ height: `${3 + n * 3}px` }" />
    </span>
    {{ PRIORITY_SHORT[priority] }}
    <AppIcon v-if="chevron" name="chevron-down" :size="13" class="prio__chev" />
  </span>
</template>

<style scoped>
.prio {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  height: 1.375rem;
  padding: 0 0.5625rem 0 0.5rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--c) 15%, transparent);
  color: var(--c);
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.prio--high {
  --c: var(--pr-high);
}

.prio--medium {
  --c: var(--pr-medium);
}

.prio--low {
  --c: var(--pr-low);
}

.prio__bars {
  display: inline-flex;
  align-items: flex-end;
  gap: 1.5px;
  height: 10px;
}

.prio__bars i {
  width: 3px;
  border-radius: 1px;
  background: color-mix(in srgb, var(--ws-text-3) 45%, transparent);
}

.prio__bars i.is-on {
  background: currentColor;
}

.prio__chev {
  opacity: 0.7;
}
</style>
