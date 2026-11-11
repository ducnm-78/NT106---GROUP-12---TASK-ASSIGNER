import { onBeforeUnmount, onMounted, type Ref } from 'vue'

/** Gọi handler khi bấm ra ngoài phần tử hoặc nhấn Escape. */
export function useClickOutside(target: Ref<HTMLElement | null>, handler: () => void): void {
  const onPointer = (event: PointerEvent) => {
    if (target.value && !target.value.contains(event.target as Node)) handler()
  }
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') handler()
  }
  onMounted(() => {
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', onPointer)
    document.removeEventListener('keydown', onKey)
  })
}
