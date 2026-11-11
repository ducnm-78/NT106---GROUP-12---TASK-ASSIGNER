import { restoreSession } from '@/features/auth/composables/useAuth'

/**
 * Node ≥ 22 có localStorage thử nghiệm (cần --localstorage-file) che mất bản của jsdom.
 * Thay bằng Storage trong bộ nhớ để kiểm thử chạy ổn định trên mọi phiên bản Node.
 */
class MemoryStorage implements Storage {
  private data = new Map<string, string>()
  get length(): number {
    return this.data.size
  }
  clear(): void {
    this.data.clear()
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }
  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null
  }
  removeItem(key: string): void {
    this.data.delete(key)
  }
  setItem(key: string, value: string): void {
    this.data.set(key, String(value))
  }
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  Object.defineProperty(globalThis, name, { value: new MemoryStorage(), configurable: true, writable: true })
}

/** Đăng nhập sẵn tài khoản demo cho mọi bài kiểm thử. */
localStorage.setItem(
  'taskflow:session',
  JSON.stringify({
    token: 'test-token',
    isGuest: false,
    user: { id: 'u-demo', username: 'demo', email: 'demo@taskflow.app', createdAt: '2026-01-01T00:00:00.000Z' },
  }),
)
restoreSession()
