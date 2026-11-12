import { createClient, type Session, type User as SupabaseUser } from '@supabase/supabase-js'
import { AuthError } from './AuthError'
import type { AuthService } from './AuthService'
import type { AuthSession, User } from '@/features/auth/types'

let client: ReturnType<typeof createClient> | undefined
let rememberSession = true
let passwordRecoveryActive = false

const RECOVERY_KEY = 'taskflow:password-recovery'

function getClient(): ReturnType<typeof createClient> {
  if (client) return client

  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key =
	import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !key) {
	throw new AuthError('Chưa cấu hình Supabase. Hãy điền VITE_SUPABASE_URL và publishable/anon key trong tệp .env.local.')
  }

  const storage = {
	getItem(key: string) {
	  const localValue = localStorage.getItem(key)
	  if (localValue) {
		rememberSession = true
		return localValue
	  }
	  const sessionValue = sessionStorage.getItem(key)
	  if (sessionValue) rememberSession = false
	  return sessionValue
	},
	setItem(key: string, value: string) {
	  const target = rememberSession ? localStorage : sessionStorage
	  const other = rememberSession ? sessionStorage : localStorage
	  other.removeItem(key)
	  target.setItem(key, value)
	},
	removeItem(key: string) {
	  localStorage.removeItem(key)
	  sessionStorage.removeItem(key)
	},
  }

  client = createClient(url, key, {
	auth: {
	  storage,
	  persistSession: true,
	  autoRefreshToken: true,
	  detectSessionInUrl: true,
	},
  })
  return client
}

function toUser(user: SupabaseUser): User {
  const email = user.email ?? ''
  const username = user.user_metadata.username
  return {
	id: user.id,
	username: typeof username === 'string' && username ? username : email.split('@')[0] || 'user',
	email,
	createdAt: user.created_at,
  }
}

function toSession(session: Session | null): AuthSession | null {
  if (!session) return null
  return { token: session.access_token, user: toUser(session.user), isGuest: false }
}

function throwAuthError(error: { message: string; code?: string }, field?: string): never {
  const messages: Record<string, { message: string; field?: string }> = {
	invalid_credentials: { message: 'Email hoặc mật khẩu không đúng.' },
	email_not_confirmed: { message: 'Email chưa được xác nhận. Hãy kiểm tra hộp thư của bạn.', field: 'email' },
	user_already_exists: { message: 'Email này đã được đăng kí. Hãy đăng nhập hoặc khôi phục mật khẩu.', field: 'email' },
	weak_password: { message: 'Mật khẩu chưa đủ mạnh.', field: 'password' },
  }
  const mapped = error.code ? messages[error.code] : undefined
  throw new AuthError(mapped?.message ?? error.message, mapped?.field ?? field)
}

function isRecoveryActive(): boolean {
  return passwordRecoveryActive || sessionStorage.getItem(RECOVERY_KEY) === 'true'
}

function setRecoveryActive(active: boolean): void {
  passwordRecoveryActive = active
  if (active) sessionStorage.setItem(RECOVERY_KEY, 'true')
  else sessionStorage.removeItem(RECOVERY_KEY)
}

function createId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
	? crypto.randomUUID()
	: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export const supabaseAuthService: AuthService = {
  async login(payload) {
	if (!payload.username.includes('@')) {
	  throw new AuthError('Hãy nhập địa chỉ email đã đăng kí.', 'username')
	}
	rememberSession = payload.remember
	const { data, error } = await getClient().auth.signInWithPassword({
	  email: payload.username.trim(),
	  password: payload.password,
	})
	if (error) throwAuthError(error)
	const session = toSession(data.session)
	if (!session) throw new AuthError('Không tạo được phiên đăng nhập. Hãy thử lại.')
	return session
  },

  async loginAsGuest() {
	const user: User = {
	  id: `guest-${createId()}`,
	  username: 'Khách',
	  email: '',
	  createdAt: new Date().toISOString(),
	}
	return { token: `guest.${createId()}`, user, isGuest: true }
  },

  async register(payload) {
	const { data, error } = await getClient().auth.signUp({
	  email: payload.email.trim(),
	  password: payload.password,
	  options: {
		data: { username: payload.username.trim() },
		emailRedirectTo: `${window.location.origin}/login?status=registered`,
	  },
	})
	if (error) throwAuthError(error, 'email')
	if (!data.user) throw new AuthError('Không tạo được tài khoản. Hãy thử lại.')
	return toUser(data.user)
  },

  async requestPasswordReset(email) {
	const { error } = await getClient().auth.resetPasswordForEmail(email, {
	  redirectTo: `${window.location.origin}/reset-password`,
	})
	if (error) throwAuthError(error)
	return {}
  },

  async verifyResetToken(token) {
	if (token) {
	  const { data, error } = await getClient().auth.verifyOtp({ token_hash: token, type: 'recovery' })
	  if (error || !data.session) return false
	  setRecoveryActive(true)
	  return true
	}

	if (!isRecoveryActive()) return false
	const { data, error } = await getClient().auth.getSession()
	return !error && data.session !== null
  },

  async resetPassword({ password }) {
	if (!isRecoveryActive()) {
	  throw new AuthError('Liên kết khôi phục không hợp lệ hoặc đã hết hạn. Hãy gửi yêu cầu mới.')
	}
	const supabase = getClient()
	const { error } = await supabase.auth.updateUser({ password })
	if (error) throwAuthError(error, 'password')
	const { error: signOutError } = await supabase.auth.signOut()
	setRecoveryActive(false)
	if (signOutError) throwAuthError(signOutError)
  },

  async logout(token) {
	if (token.startsWith('guest.')) return
	const { error } = await getClient().auth.signOut()
	if (error) throwAuthError(error)
  },

  async restoreSession() {
	const { data, error } = await getClient().auth.getSession()
	if (error) throwAuthError(error)
	return toSession(data.session)
  },

  subscribe(listener) {
	const { data } = getClient().auth.onAuthStateChange((event, session) => {
	  if (event === 'PASSWORD_RECOVERY') setRecoveryActive(true)
	  if (event === 'SIGNED_OUT') setRecoveryActive(false)
	  listener(toSession(session))
	})
	return () => data.subscription.unsubscribe()
  },
}