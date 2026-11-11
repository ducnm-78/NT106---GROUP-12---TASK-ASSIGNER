<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'error' | 'success' | 'info' }>(), { tone: 'info' })
</script>

<template>
  <div class="alert" :class="`alert--${tone}`" :role="tone === 'error' ? 'alert' : 'status'">
    <slot />
  </div>
</template>

<style scoped>
.alert {
  padding: 0.75rem 1.125rem;
  border-radius: 1rem;
  font-size: var(--fs-small);
  font-weight: 500;
  line-height: 1.5;
}

.alert--error {
  background: var(--color-danger-soft);
  color: #b42318;
}

.alert--success {
  background: var(--color-success-soft);
  color: var(--color-success);
}

.alert--info {
  background: var(--color-field);
  color: var(--color-ink-soft);
}

.alert :deep(a) {
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
