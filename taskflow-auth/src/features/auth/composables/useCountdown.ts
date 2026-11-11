import { onScopeDispose, readonly, ref } from 'vue'

/** Đếm ngược theo giây, dùng cho nút "Gửi lại" để tránh spam. */
export function useCountdown() {
  const remaining = ref(0)
  let timer: ReturnType<typeof setInterval> | undefined

  function stop(): void {
    if (timer !== undefined) clearInterval(timer)
    timer = undefined
  }

  function start(seconds: number): void {
    stop()
    remaining.value = seconds
    timer = setInterval(() => {
      remaining.value -= 1
      if (remaining.value <= 0) {
        remaining.value = 0
        stop()
      }
    }, 1000)
  }

  onScopeDispose(stop)

  return { remaining: readonly(remaining), start, stop }
}
