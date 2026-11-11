import { ref } from 'vue'

export interface Toast {
  id: number
  message: string
  tone: 'success' | 'error' | 'info'
  action?: { label: string; run: () => void }
}

const toasts = ref<Toast[]>([])
let next = 1

/** Thông báo nổi ngắn (góc dưới phải), tự ẩn sau vài giây. */
export function useToast() {
  function dismiss(id: number): void {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function show(message: string, tone: Toast['tone'] = 'success', action?: Toast['action']): number {
    const id = next++
    toasts.value = [...toasts.value.slice(-3), { id, message, tone, action }]
    setTimeout(() => dismiss(id), action ? 6000 : 3500)
    return id
  }

  return { toasts, show, dismiss }
}
