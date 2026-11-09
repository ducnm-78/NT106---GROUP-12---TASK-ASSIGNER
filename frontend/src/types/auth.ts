export interface User {
  id: string
  username: string
  email: string
  createdAt: string
}

export interface AuthSession {
  token: string
  user: User
  isGuest: boolean
}

export interface LoginPayload {
  /** Tên tài khoản hoặc email */
  username: string
  password: string
  remember: boolean
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
}

export interface ResetPasswordPayload {
  token: string
  password: string
}

export interface PasswordResetRequestResult {
  /** Chỉ có ở chế độ giả lập, để thử luồng khôi phục mà không cần email thật */
  devToken?: string
}
