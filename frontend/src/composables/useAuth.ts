import { computed, shallowRef } from 'vue'
import { authService } from '@/services'
import type { AuthSession, LoginPayload, RegisterPayload, ResetPasswordPayload } from '@/types/auth'

const SESSION_KEY = 'taskflow:session'

/** Trạng thái dùng chung toàn app (singleton theo module). */
const session = shallowRef<AuthSession | null>(null)

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  const user = candidate.user as Record<string, unknown> | null | undefined
  return (
    typeof candidate.token === 'string' &&
    typeof candidate.isGuest === 'boolean' &&
    !!user &&
    typeof user.id === 'string' &&
    typeof user.username === 'string'
  )
}

function readSession(storage: Storage): AuthSession | null {
  try {
    const raw = storage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isAuthSession(parsed) ? parsed : null
  } catch {
    return null
  }
}

function clearStoredSession(): void {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      storage.removeItem(SESSION_KEY)
    } catch {
      /* trình duyệt chặn storage: bỏ qua */
    }
  }
}

/** "Ghi nhớ tôi" → localStorage (giữ sau khi đóng trình duyệt); ngược lại → sessionStorage. */
function saveSession(next: AuthSession, remember: boolean): void {
  clearStoredSession()
  try {
    ;(remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(next))
  } catch {
    /* không lưu được thì phiên chỉ tồn tại trong bộ nhớ */
  }
  session.value = next
}

/** Gọi một lần khi khởi động app, trước khi router chạy guard. */
export function restoreSession(): void {
  session.value = readSession(localStorage) ?? readSession(sessionStorage)
}

export function useAuth() {
  const user = computed(() => session.value?.user ?? null)
  const isAuthenticated = computed(() => session.value !== null)
  const isGuest = computed(() => session.value?.isGuest ?? false)

  async function login(payload: LoginPayload): Promise<void> {
    const next = await authService.login({ ...payload, username: payload.username.trim() })
    saveSession(next, payload.remember)
  }

  async function loginAsGuest(): Promise<void> {
    saveSession(await authService.loginAsGuest(), false)
  }

  function register(payload: RegisterPayload) {
    return authService.register(payload)
  }

  function requestPasswordReset(email: string) {
    return authService.requestPasswordReset(email.trim())
  }

  function verifyResetToken(token: string) {
    return authService.verifyResetToken(token)
  }

  function resetPassword(payload: ResetPasswordPayload) {
    return authService.resetPassword(payload)
  }

  async function logout(): Promise<void> {
    const token = session.value?.token
    clearStoredSession()
    session.value = null
    if (token) await authService.logout(token).catch(() => undefined)
  }

  return {
    user,
    isAuthenticated,
    isGuest,
    login,
    loginAsGuest,
    register,
    requestPasswordReset,
    verifyResetToken,
    resetPassword,
    logout,
  }
}
