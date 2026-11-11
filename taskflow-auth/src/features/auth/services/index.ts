import type { AuthService } from './AuthService'
import { httpAuthService } from './httpAuthService'
import { mockAuthService } from './mockAuthService'

/** Mặc định dùng dữ liệu giả lập; đặt VITE_USE_MOCK_API=false để gọi API thật. */
export const authService: AuthService =
  import.meta.env.VITE_USE_MOCK_API === 'false' ? httpAuthService : mockAuthService

export { AuthError } from './AuthError'
export type { AuthService } from './AuthService'
