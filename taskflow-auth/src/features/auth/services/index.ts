import type { AuthService } from './AuthService'
import { httpAuthService } from './httpAuthService'
import { mockAuthService } from './mockAuthService'
import { supabaseAuthService } from './supabaseAuthService'

type AuthProvider = 'mock' | 'http' | 'supabase'

const services: Record<AuthProvider, AuthService> = {
  mock: mockAuthService,
  http: httpAuthService,
  supabase: supabaseAuthService,
}

const requestedProvider = import.meta.env.VITE_AUTH_PROVIDER
const legacyProvider = import.meta.env.VITE_USE_MOCK_API === 'false' ? 'http' : 'mock'

/** Chọn mock/http/supabase; vẫn hỗ trợ VITE_USE_MOCK_API cũ để tương thích. */
export const authProvider: AuthProvider =
  requestedProvider === 'mock' || requestedProvider === 'http' || requestedProvider === 'supabase'
	? requestedProvider
	: legacyProvider

export const authService = services[authProvider]

export { AuthError } from './AuthError'
export type { AuthService } from './AuthService'
