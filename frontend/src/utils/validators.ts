/**
 * Mỗi rule trả về `true` khi hợp lệ, hoặc chuỗi thông báo lỗi khi không hợp lệ.
 */
export type ValidationResult = true | string

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const USERNAME_PATTERN = /^[a-zA-Z0-9._]{3,20}$/

const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

export const required =
  (message = 'Vui lòng nhập thông tin này.') =>
  (value: unknown): ValidationResult =>
    asText(value).length > 0 || message

export const email =
  (message = 'Email chưa đúng định dạng, ví dụ: ten@congty.vn.') =>
  (value: unknown): ValidationResult =>
    EMAIL_PATTERN.test(asText(value)) || message

export const username =
  (message = 'Tên tài khoản dài 3–20 kí tự, chỉ gồm chữ không dấu, số, dấu chấm hoặc gạch dưới.') =>
  (value: unknown): ValidationResult =>
    USERNAME_PATTERN.test(asText(value)) || message

export const strongPassword =
  (message = 'Mật khẩu cần ít nhất 8 kí tự, gồm cả chữ và số.') =>
  (value: unknown): ValidationResult => {
    const text = typeof value === 'string' ? value : ''
    return (text.length >= 8 && /[a-zA-Z]/.test(text) && /\d/.test(text)) || message
  }

export const sameAs =
  <T>(field: keyof T, message: string) =>
  (value: unknown, values: T): ValidationResult =>
    value === values[field] || message
