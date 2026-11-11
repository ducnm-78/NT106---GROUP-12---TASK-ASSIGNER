<script setup lang="ts">
import AppIcon from '@/shared/components/AppIcon.vue'
import { useToast } from '../composables/useToast'

const { toasts, dismiss } = useToast()

const ICON = { success: 'check', error: 'x', info: 'bell' } as const
</script>

<template>
  <div class="toasts" role="status" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="`toast--${t.tone}`" data-test="toast">
        <span class="toast__icon"><AppIcon :name="ICON[t.tone]" :size="16" :stroke-width="2.4" /></span>
        <span class="toast__msg">{{ t.message }}</span>
        <button
          v-if="t.action"
          type="button"
          class="toast__action"
          @click="
            t.action.run();
            dismiss(t.id)
          "
        >
          {{ t.action.label }}
        </button>
        <button type="button" class="toast__close" aria-label="Đóng thông báo" @click="dismiss(t.id)">
          <AppIcon name="x" :size="16" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  /* Giữa phía trên (đè lên topbar): không che thanh lưu, ô soạn tin hay nút ở góc dưới */
  position: fixed;
  top: 0.875rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 80;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: min(30rem, calc(100vw - 2rem));
  pointer-events: none;
}

.toast {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.75rem 0.75rem 0.875rem;
  border: 1px solid var(--ws-border-strong);
  border-radius: var(--ws-radius-sm);
  background: var(--ws-surface-2);
  box-shadow: var(--ws-shadow);
  color: var(--ws-text);
  font-size: 0.875rem;
  pointer-events: auto;
}

.toast__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  color: #fff;
}

.toast--success .toast__icon {
  background: var(--ws-success);
}

.toast--error .toast__icon {
  background: var(--ws-danger);
}

.toast--info .toast__icon {
  background: var(--ws-accent);
}

.toast__msg {
  flex: 1;
  line-height: 1.4;
}

.toast__action {
  flex: none;
  padding: 0.375rem 0.75rem;
  border: 0;
  border-radius: 999px;
  background: var(--ws-accent-soft);
  color: var(--ws-accent-text);
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
}

.toast__close {
  display: grid;
  flex: none;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ws-text-3);
  cursor: pointer;
}

.toast__close:hover {
  background: var(--ws-surface-3);
  color: var(--ws-text);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
