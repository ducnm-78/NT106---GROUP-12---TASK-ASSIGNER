<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId } from 'vue'

/**
 * Menu bật lên dùng chung: tự đặt vị trí (lật lên trên khi thiếu chỗ), đóng khi bấm ra ngoài / Esc,
 * di chuyển bằng phím mũi tên. Nội dung được Teleport ra `.ws` nên không bị khung cuộn cắt mất.
 */
const props = withDefaults(defineProps<{ align?: 'start' | 'end'; width?: string; label?: string }>(), {
  align: 'start',
  width: undefined,
  label: undefined,
})
const emit = defineEmits<{ open: []; close: [] }>()

const open = ref(false)
const anchor = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const pos = ref({ top: 0, left: 0, maxHeight: 360 })
const id = useId()

function place(): void {
  const el = anchor.value?.firstElementChild ?? anchor.value
  if (!el || !panel.value) return
  const r = el.getBoundingClientRect()
  const pw = panel.value.offsetWidth
  const ph = panel.value.scrollHeight
  const gap = 6
  const below = window.innerHeight - r.bottom - gap - 8
  const above = r.top - gap - 8
  const up = ph > below && above > below
  const maxHeight = Math.max(160, Math.min(440, up ? above : below))
  const top = up ? Math.max(8, r.top - gap - Math.min(ph, maxHeight)) : r.bottom + gap
  let left = props.align === 'end' ? r.right - pw : r.left
  left = Math.min(Math.max(8, left), window.innerWidth - pw - 8)
  pos.value = { top, left, maxHeight }
}

function items(): HTMLElement[] {
  return Array.from(panel.value?.querySelectorAll<HTMLElement>('.tk-menu__item:not([disabled])') ?? [])
}

async function show(): Promise<void> {
  if (open.value) return
  open.value = true
  emit('open')
  await nextTick()
  place()
  const target =
    panel.value?.querySelector<HTMLElement>('[autofocus]') ??
    panel.value?.querySelector<HTMLElement>('.tk-menu__item[aria-checked="true"]') ??
    items()[0]
  target?.focus({ preventScroll: true })
  document.addEventListener('pointerdown', onOutside, true)
  window.addEventListener('resize', place)
  window.addEventListener('scroll', onScroll, true)
}

function close(refocus = true): void {
  if (!open.value) return
  open.value = false
  emit('close')
  document.removeEventListener('pointerdown', onOutside, true)
  window.removeEventListener('resize', place)
  window.removeEventListener('scroll', onScroll, true)
  if (refocus) (anchor.value?.querySelector<HTMLElement>('button, [tabindex]') ?? null)?.focus({ preventScroll: true })
}

function toggle(): void {
  if (open.value) close()
  else void show()
}

function onOutside(event: PointerEvent): void {
  const target = event.target as Node
  if (panel.value?.contains(target) || anchor.value?.contains(target)) return
  close(false)
}

function onScroll(event: Event): void {
  // Cuộn bên trong menu thì bỏ qua; cuộn trang thì bám theo nút mở
  if (panel.value?.contains(event.target as Node)) return
  place()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.stopPropagation()
    close()
    return
  }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  const list = items()
  if (!list.length) return
  event.preventDefault()
  const i = list.indexOf(document.activeElement as HTMLElement)
  const next = event.key === 'ArrowDown' ? (i + 1) % list.length : (i - 1 + list.length) % list.length
  list[next].focus()
}

onBeforeUnmount(() => close(false))

defineExpose({ show, close, toggle })
</script>

<template>
  <span ref="anchor" class="tk-anchor">
    <slot name="trigger" :open="open" :toggle="toggle" :menu-id="id" />
  </span>
  <Teleport to=".ws" defer>
    <div
      v-if="open"
      :id="id"
      ref="panel"
      class="tk-menu ws-scroll"
      role="menu"
      :aria-label="label"
      :style="{ top: `${pos.top}px`, left: `${pos.left}px`, maxHeight: `${pos.maxHeight}px`, width }"
      @keydown="onKeydown"
    >
      <slot :close="close" />
    </div>
  </Teleport>
</template>

<style scoped>
.tk-anchor {
  display: inline-flex;
  min-width: 0;
}
</style>
