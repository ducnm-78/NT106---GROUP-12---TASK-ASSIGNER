<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'

defineOptions({ inheritAttrs: false })

const model = defineModel<string>({ required: true })

const props = withDefaults(
  defineProps<{
    label: string
    type?: 'text' | 'email' | 'password'
    error?: string
  }>(),
  { type: 'text', error: '' },
)

const emit = defineEmits<{ blur: [] }>()

const id = useId()
const errorId = `${id}-error`
const showPassword = ref(false)

const isPassword = computed(() => props.type === 'password')
const inputType = computed(() => (isPassword.value && showPassword.value ? 'text' : props.type))
</script>

<template>
  <div class="field" :class="{ 'field--invalid': !!error }">
    <label :for="id" class="field__label">{{ label }}</label>
    <div class="field__control">
      <input
        v-bind="$attrs"
        :id="id"
        v-model="model"
        :type="inputType"
        class="field__input"
        :class="{ 'field__input--with-toggle': isPassword }"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? errorId : undefined"
        @blur="emit('blur')"
      />
      <button
        v-if="isPassword"
        type="button"
        class="field__toggle"
        :aria-label="showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
        :aria-pressed="showPassword"
        @click="showPassword = !showPassword"
      >
        <AppIcon :name="showPassword ? 'eye-off' : 'eye'" :size="22" />
      </button>
    </div>
    <p v-if="error" :id="errorId" class="field__error">{{ error }}</p>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: var(--label-gap);
}

.field__label {
  font-size: var(--fs-body);
  line-height: 1.3;
}

.field__control {
  position: relative;
}

.field__input {
  width: 100%;
  height: var(--field-height);
  padding: 0 1.75rem;
  border: 0;
  border-radius: 999px;
  background: var(--color-field);
  font-size: var(--fs-body);
  outline: none;
  transition:
    background-color 0.15s ease,
    box-shadow 0.15s ease;
}

.field__input--with-toggle {
  padding-right: 4rem;
}

.field__input:hover:not(:disabled) {
  background: var(--color-field-hover);
}

.field__input:focus-visible {
  box-shadow:
    0 0 0 2px var(--color-primary),
    0 0 0 6px var(--color-focus);
}

.field__input:-webkit-autofill {
  -webkit-box-shadow: 0 0 0 100px var(--color-field) inset;
}

.field__input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.field--invalid .field__input {
  box-shadow: inset 0 0 0 2px var(--color-danger);
}

.field--invalid .field__input:focus-visible {
  box-shadow:
    0 0 0 2px var(--color-danger),
    0 0 0 6px rgb(217 45 32 / 0.2);
}

.field__toggle {
  position: absolute;
  top: 50%;
  right: 0.875rem;
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--color-ink-muted);
  cursor: pointer;
  transform: translateY(-50%);
}

.field__toggle:hover:not(:disabled) {
  background: rgb(0 0 0 / 0.05);
  color: var(--color-ink);
}

.field__toggle:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

.field__error {
  margin: 0;
  padding-left: 1.75rem;
  color: var(--color-danger);
  font-size: var(--fs-small);
  font-weight: 500;
  line-height: 1.4;
}
</style>
