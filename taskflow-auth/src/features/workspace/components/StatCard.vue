<script setup lang="ts">
import AppIcon, { type IconName } from '@/shared/components/AppIcon.vue'

defineProps<{ label: string; value: string; hint: string; icon: IconName }>()
</script>

<template>
  <article class="stat">
    <div class="stat__top">
      <p class="stat__label">{{ label }}</p>
      <span class="stat__icon"><AppIcon :name="icon" :size="20" /></span>
    </div>
    <p class="stat__value">{{ value }}</p>
    <p class="stat__hint">{{ hint }}</p>
  </article>
</template>

<style scoped>
.stat {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 1rem 1.25rem;
  border: 1px solid var(--ws-border);
  border-radius: var(--ws-radius);
  background: var(--ws-surface);
}

.stat__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.stat__label {
  margin: 0;
  color: var(--ws-text-2);
  font-size: 0.9375rem;
}

.stat__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  background: var(--ws-accent-soft);
  color: var(--ws-accent-text);
}

.stat__value {
  margin: 0.125rem 0 0.25rem;
  font-size: clamp(1.75rem, 1.2rem + 1vw, 2.25rem);
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.stat__hint {
  margin: 0;
  color: var(--ws-accent-text);
  font-size: 0.875rem;
  font-weight: 500;
}
</style>
