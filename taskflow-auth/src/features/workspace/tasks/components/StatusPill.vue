<script setup lang="ts">
import AppIcon from '@/shared/components/AppIcon.vue'
import { STATUS_LABELS } from '../../data/constants'
import type { TaskStatus } from '../../types'

withDefaults(defineProps<{ status: TaskStatus; chevron?: boolean; size?: 'sm' | 'md' }>(), { chevron: false, size: 'md' })
</script>

<template>
  <span class="pill" :class="[`pill--${status}`, `pill--${size}`]">
    <span class="tk-dot" :class="`tk-dot--${status}`" />
    <span class="pill__text">{{ STATUS_LABELS[status] }}</span>
    <AppIcon v-if="chevron" name="chevron-down" :size="14" class="pill__chev" />
  </span>
</template>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 1.875rem;
  padding: 0 0.75rem 0 0.625rem;
  border: 1px solid color-mix(in srgb, var(--c) 45%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--c) 14%, var(--ws-surface));
  color: var(--ws-text);
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
}

.pill--sm {
  height: 1.625rem;
  gap: 0.375rem;
  padding: 0 0.5rem;
  font-size: 0.75rem;
}

.pill--md {
  min-width: 0;
}

.pill--todo {
  --c: var(--st-todo);
}

.pill--doing {
  --c: var(--st-doing);
}

.pill--review {
  --c: var(--st-review);
}

.pill--done {
  --c: var(--st-done);
}

.pill__chev {
  margin-left: auto;
  color: var(--ws-text-3);
}
</style>
