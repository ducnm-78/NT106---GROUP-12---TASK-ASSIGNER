<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger'
    type?: 'button' | 'submit'
    loading?: boolean
    disabled?: boolean
  }>(),
  { variant: 'primary', type: 'button', loading: false, disabled: false },
)
</script>

<template>
  <button
    :type="type"
    class="btn"
    :class="[`btn--${variant}`, { 'btn--loading': loading }]"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <span v-if="$slots.icon" class="btn__icon"><slot name="icon" /></span>
    <span class="btn__label"><slot /></span>
    <span v-if="loading" class="btn__spinner" aria-hidden="true" />
  </button>
</template>

<style scoped>
.btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: var(--field-height);
  padding: 0 1.75rem;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    transform 0.1s ease;
}

.btn:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 3px;
}

.btn:active:not(:disabled) {
  transform: scale(0.99);
}

.btn:disabled {
  cursor: not-allowed;
}

.btn--primary {
  background: var(--color-primary);
  color: var(--color-on-primary, #fff);
  font-size: var(--fs-button);
  font-weight: 700;
  letter-spacing: 0.01em;
}

.btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn--primary:disabled:not(.btn--loading) {
  opacity: 0.55;
}

.btn--secondary {
  background: var(--color-field);
  color: var(--color-ink);
  font-size: var(--fs-body);
  font-weight: 400;
}

.btn--secondary:hover:not(:disabled) {
  background: var(--color-field-hover);
}

.btn__icon {
  position: absolute;
  left: clamp(1.25rem, 2.4vw, 2.875rem);
  display: grid;
}

.btn--loading .btn__label,
.btn--loading .btn__icon {
  visibility: hidden;
}

.btn__spinner {
  position: absolute;
  width: 1.5rem;
  height: 1.5rem;
  border: 3px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: btn-spin 0.7s linear infinite;
}

@keyframes btn-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
