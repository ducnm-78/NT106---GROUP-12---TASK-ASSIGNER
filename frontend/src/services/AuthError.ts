/**
 * Lỗi nghiệp vụ trả về từ tầng xác thực.
 * Nếu có `field`, lỗi sẽ được hiển thị ngay dưới ô nhập tương ứng.
 */
export class AuthError extends Error {
  readonly field?: string

  constructor(message: string, field?: string) {
    super(message)
    this.name = 'AuthError'
    this.field = field
  }
}
