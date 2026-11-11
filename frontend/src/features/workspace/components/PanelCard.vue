<script setup lang="ts">
defineProps<{ title?: string; subtitle?: string }>()
</script>

<template>
  <section class="panel">
    <header v-if="title || $slots.actions" class="panel__head">
      <div>
        <h2 v-if="title" class="panel__title">{{ title }}</h2>
        <p v-if="subtitle" class="panel__subtitle">{{ subtitle }}</p>
      </div>
      <slot name="actions" />
    </header>
    <div class="panel__body"><slot /></div>
  </section>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: clamp(1.125rem, 1.4vw, 1.5rem);
  border: 1px solid var(--ws-border);
  border-radius: var(--ws-radius);
  background: var(--ws-surface);
}

.panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.panel__title {
  margin: 0;
  font-size: 1.1875rem;
  font-weight: 700;
  line-height: 1.3;
}

.panel__subtitle {
  margin: 0.25rem 0 0;
  color: var(--ws-text-2);
  font-size: 0.875rem;
}

.panel__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}
</style>
