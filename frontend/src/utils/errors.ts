export const FALLBACK_ERROR_MESSAGE = 'Có lỗi xảy ra. Hãy thử lại sau ít phút.'

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return FALLBACK_ERROR_MESSAGE
}
