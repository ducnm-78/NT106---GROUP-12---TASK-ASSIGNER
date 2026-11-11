import type {
  AuthSession,
  LoginPayload,
  PasswordResetRequestResult,
  RegisterPayload,
  ResetPasswordPayload,
  User,
} from '@/features/auth/types'

/** Hợp đồng chung: giao diện chỉ phụ thuộc vào interface này, không phụ thuộc vào cách cài đặt. */
export interface AuthService {
  login(payload: LoginPayload): Promise<AuthSession>
  loginAsGuest(): Promise<AuthSession>
  register(payload: RegisterPayload): Promise<User>
  requestPasswordReset(email: string): Promise<PasswordResetRequestResult>
  verifyResetToken(token: string): Promise<boolean>
  resetPassword(payload: ResetPasswordPayload): Promise<void>
  logout(token: string): Promise<void>
}
