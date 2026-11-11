<script setup lang="ts">
const model = defineModel<boolean>({ required: true })
defineProps<{ label: string }>()
</script>

<template>
  <button
    type="button"
    role="switch"
    class="switch"
    :aria-checked="model"
    :aria-label="label"
    @click="model = !model"
  >
    <span class="switch__thumb" />
  </button>
</template>

<style scoped>
.switch {
  position: relative;
  flex: none;
  width: 3rem;
  height: 1.75rem;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--ws-surface-3);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.switch[aria-checked='true'] {
  background: var(--ws-accent);
}

.switch__thumb {
  position: absolute;
  top: 0.1875rem;
  left: 0.1875rem;
  width: 1.375rem;
  height: 1.375rem;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
  transition: transform 0.2s ease;
}

.switch[aria-checked='true'] .switch__thumb {
  transform: translateX(1.25rem);
}
</style>
