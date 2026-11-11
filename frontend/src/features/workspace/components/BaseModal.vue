<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'

const open = defineModel<boolean>('open', { required: true })
defineProps<{ title: string; description?: string; wide?: boolean }>()

const titleId = useId()
const dialog = ref<HTMLElement | null>(null)
let lastFocused: HTMLElement | null = null

function close(): void {
  open.value = false
}

function focusables(): HTMLElement[] {
  return Array.from(
    dialog.value?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select, textarea, [href], [tabindex]:not([tabindex="-1"])',
    ) ?? [],
  )
}

/** Giữ focus trong hộp thoại khi bấm Tab. */
function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.stopPropagation()
    close()
    return
  }
  if (event.key !== 'Tab') return
  const items = focusables()
  if (!items.length) return
  const first = items[0]
  const last = items[items.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(open, async (isOpen) => {
  if (isOpen) {
    lastFocused = document.activeElement as HTMLElement | null
    await nextTick()
    ;(dialog.value?.querySelector<HTMLElement>('[autofocus]') ?? dialog.value)?.focus()
  } else {
    lastFocused?.focus()
  }
})

onBeforeUnmount(() => lastFocused?.focus())
</script>

<template>
  <Teleport to=".ws" defer>
    <Transition name="modal">
      <div v-if="open" class="modal" @pointerdown.self="close">
        <div
          ref="dialog"
          class="modal__dialog"
          :class="{ 'modal__dialog--wide': wide }"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
          @keydown="onKeydown"
        >
          <button type="button" class="modal__close ws-icon-btn" aria-label="Đóng" @click="close">
            <AppIcon name="x" :size="20" />
          </button>
          <h2 :id="titleId" class="modal__title">{{ title }}</h2>
          <p v-if="description" class="modal__desc">{{ description }}</p>
          <div class="modal__body"><slot /></div>
          <footer v-if="$slots.footer" class="modal__footer"><slot name="footer" /></footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 1rem;
  overflow-y: auto;
  background: var(--ws-overlay);
  backdrop-filter: blur(4px);
}

.modal__dialog {
  position: relative;
  width: min(100%, 36rem);
  padding: clamp(1.5rem, 3vw, 2.25rem);
  border: 1px solid var(--ws-border-strong);
  border-radius: 1.5rem;
  background: var(--ws-surface);
  box-shadow: var(--ws-shadow);
  outline: none;
}

.modal__dialog--wide {
  width: min(100%, 46rem);
}

.modal__close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2.25rem;
  height: 2.25rem;
  border-color: transparent;
  background: transparent;
}

.modal__title {
  margin: 0;
  padding-right: 2.5rem;
  font-size: 1.5rem;
  font-weight: 700;
}

.modal__desc {
  margin: 0.5rem 0 0;
  color: var(--ws-text-2);
  font-size: 0.9375rem;
}

.modal__body {
  margin-top: 1.5rem;
}

.modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.75rem;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.18s ease;
}

.modal-enter-active .modal__dialog,
.modal-leave-active .modal__dialog {
  transition: transform 0.18s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal__dialog,
.modal-leave-to .modal__dialog {
  transform: translateY(12px) scale(0.98);
}
</style>
