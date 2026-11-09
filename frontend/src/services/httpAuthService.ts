import { AuthError } from './AuthError'
import type { AuthService } from './AuthService'
import type { AuthSession, User } from '@/types/auth'

/**
 * Cài đặt gọi API thật. Quy ước endpoint (đổi cho khớp backend của bạn):
 *   POST /auth/login                  { username, password, remember } -> AuthSession
 *   POST /auth/guest                                                   -> AuthSession
 *   POST /auth/register               { username, email, password }    -> User
 *   POST /auth/forgot-password        { email }                        -> 204
 *   GET  /auth/reset-password/:token                                   -> 204 | 4xx
 *   POST /auth/reset-password         { token, password }              -> 204
 *   POST /auth/logout                 (Authorization: Bearer <token>)  -> 204
 * Lỗi trả về dạng: { "message": "...", "field": "email" }
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')

interface ApiErrorBody {
  message?: string
  field?: string
}

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  token?: string
}

async function request<T>(path: string, { method = 'POST', body, token }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new AuthError('Không kết nối được tới máy chủ. Kiểm tra mạng rồi thử lại.')
  }

  const data: unknown = response.status === 204 ? null : await response.json().catch(() => null)

  if (!response.ok) {
    const error = (data ?? {}) as ApiErrorBody
    throw new AuthError(error.message ?? `Yêu cầu không thành công (mã ${response.status}).`, error.field)
  }
  return data as T
}

export const httpAuthService: AuthService = {
  login: (payload) => request<AuthSession>('/auth/login', { body: payload }),

  loginAsGuest: () => request<AuthSession>('/auth/guest'),

  register: (payload) => request<User>('/auth/register', { body: payload }),

  async requestPasswordReset(email) {
    await request<null>('/auth/forgot-password', { body: { email } })
    return {}
  },

  async verifyResetToken(token) {
    try {
      await request<null>(`/auth/reset-password/${encodeURIComponent(token)}`, { method: 'GET' })
      return true
    } catch {
      return false
    }
  },

  async resetPassword(payload) {
    await request<null>('/auth/reset-password', { body: payload })
  },

  async logout(token) {
    await request<null>('/auth/logout', { token })
  },
}
