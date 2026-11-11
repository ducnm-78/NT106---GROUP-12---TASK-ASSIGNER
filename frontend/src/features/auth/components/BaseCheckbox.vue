<script setup lang="ts">
import AppIcon from '@/shared/components/AppIcon.vue'

const model = defineModel<boolean>({ default: false })
</script>

<template>
  <label class="checkbox">
    <input v-model="model" type="checkbox" class="checkbox__input" />
    <span class="checkbox__box" aria-hidden="true">
      <AppIcon name="check" class="checkbox__icon" :size="20" :stroke-width="3" />
    </span>
    <span class="checkbox__label"><slot /></span>
  </label>
</template>

<style scoped>
.checkbox {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-ink-soft);
  cursor: pointer;
  user-select: none;
}

.checkbox__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.checkbox__box {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  flex-shrink: 0;
  border: 2px solid var(--color-ink);
  border-radius: 4px;
  background: #fff;
}

.checkbox__icon {
  opacity: 0;
  transform: scale(0.6);
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}

.checkbox__input:checked + .checkbox__box .checkbox__icon {
  opacity: 1;
  transform: scale(1);
}

.checkbox__input:focus-visible + .checkbox__box {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}
</style>
