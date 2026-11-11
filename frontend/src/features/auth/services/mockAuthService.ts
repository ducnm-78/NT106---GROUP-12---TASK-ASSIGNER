import { AuthError } from './AuthError'
import type { AuthService } from './AuthService'
import type { AuthSession, User } from '@/features/auth/types'

/**
 * Backend giả lập chạy hoàn toàn trong trình duyệt (lưu ở localStorage).
 * Dùng để phát triển giao diện khi chưa có API. KHÔNG dùng cho môi trường thật.
 */

interface StoredUser extends User {
  passwordHash: string
}

interface StoredResetToken {
  token: string
  userId: string
  expiresAt: number
}

const USERS_KEY = 'taskflow:mock-users'
const RESET_TOKENS_KEY = 'taskflow:mock-reset-tokens'
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000
const NETWORK_DELAY_MS = 600

const wait = (ms = NETWORK_DELAY_MS) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const normalize = (value: string) => value.trim().toLowerCase()

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`taskflow:${password}`)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
  }
  // crypto.subtle chỉ có trên HTTPS hoặc localhost; phương án dự phòng cho bản demo
  return Array.from(data).join('.')
}

function toPublicUser(user: StoredUser): User {
  return { id: user.id, username: user.username, email: user.email, createdAt: user.createdAt }
}

function createSession(user: User, isGuest: boolean): AuthSession {
  return { token: `mock.${createId()}`, user, isGuest }
}

const readUsers = () => readJson<StoredUser[]>(USERS_KEY, [])
const readValidResetTokens = () =>
  readJson<StoredResetToken[]>(RESET_TOKENS_KEY, []).filter((t) => t.expiresAt > Date.now())

/** Tạo sẵn tài khoản demo / Demo1234 ở lần chạy đầu tiên. */
let seedPromise: Promise<void> | null = null
function ensureSeeded(): Promise<void> {
  seedPromise ??= (async () => {
    if (localStorage.getItem(USERS_KEY) !== null) return
    const demo: StoredUser = {
      id: createId(),
      username: 'demo',
      email: 'demo@taskflow.vn',
      createdAt: new Date().toISOString(),
      passwordHash: await hashPassword('Demo1234'),
    }
    writeJson(USERS_KEY, [demo])
  })()
  return seedPromise
}

export const mockAuthService: AuthService = {
  async login({ username, password }) {
    await ensureSeeded()
    await wait()
    const identifier = normalize(username)
    const user = readUsers().find(
      (u) => normalize(u.username) === identifier || normalize(u.email) === identifier,
    )
    if (!user || user.passwordHash !== (await hashPassword(password))) {
      throw new AuthError('Tên tài khoản hoặc mật khẩu không đúng.')
    }
    return createSession(toPublicUser(user), false)
  },

  async loginAsGuest() {
    await wait(400)
    const guest: User = {
      id: `guest-${createId()}`,
      username: 'Khách',
      email: '',
      createdAt: new Date().toISOString(),
    }
    return createSession(guest, true)
  },

  async register({ username, email, password }) {
    await ensureSeeded()
    await wait()
    const users = readUsers()
    if (users.some((u) => normalize(u.username) === normalize(username))) {
      throw new AuthError('Tên tài khoản này đã có người dùng. Hãy chọn tên khác.', 'username')
    }
    if (users.some((u) => normalize(u.email) === normalize(email))) {
      throw new AuthError('Email này đã được đăng kí. Hãy đăng nhập hoặc khôi phục mật khẩu.', 'email')
    }
    const user: StoredUser = {
      id: createId(),
      username: username.trim(),
      email: email.trim(),
      createdAt: new Date().toISOString(),
      passwordHash: await hashPassword(password),
    }
    writeJson(USERS_KEY, [...users, user])
    return toPublicUser(user)
  },

  async requestPasswordReset(email) {
    await ensureSeeded()
    await wait()
    const user = readUsers().find((u) => normalize(u.email) === normalize(email))
    // Không tiết lộ email có tồn tại hay không: luôn trả về thành công
    if (!user) return {}
    const token = createId()
    const tokens = readValidResetTokens().filter((t) => t.userId !== user.id)
    writeJson(RESET_TOKENS_KEY, [
      ...tokens,
      { token, userId: user.id, expiresAt: Date.now() + RESET_TOKEN_TTL_MS },
    ])
    return { devToken: token }
  },

  async verifyResetToken(token) {
    await wait(300)
    return readValidResetTokens().some((t) => t.token === token)
  },

  async resetPassword({ token, password }) {
    await wait()
    const tokens = readValidResetTokens()
    const match = tokens.find((t) => t.token === token)
    if (!match) {
      throw new AuthError('Liên kết khôi phục không hợp lệ hoặc đã hết hạn. Hãy gửi yêu cầu mới.')
    }
    const users = readUsers()
    const user = users.find((u) => u.id === match.userId)
    if (!user) {
      throw new AuthError('Không tìm thấy tài khoản cần đổi mật khẩu.')
    }
    user.passwordHash = await hashPassword(password)
    writeJson(USERS_KEY, users)
    writeJson(
      RESET_TOKENS_KEY,
      tokens.filter((t) => t.userId !== user.id),
    )
  },

  async logout() {
    await wait(150)
  },
}
