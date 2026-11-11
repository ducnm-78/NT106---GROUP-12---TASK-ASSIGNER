export const AVATAR_TYPES = ['image/jpeg', 'image/png']
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024

export function validateAvatar(file: File): string {
  if (!AVATAR_TYPES.includes(file.type)) return 'Chỉ nhận ảnh JPG hoặc PNG.'
  if (file.size > AVATAR_MAX_BYTES) return 'Ảnh vượt quá 5 MB.'
  return ''
}

/** Cắt ảnh thành hình vuông ở giữa và thu nhỏ để lưu gọn (data URL JPEG). */
export async function toAvatarDataUrl(file: File, size = 256): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ xử lí ảnh.')
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.88)
}
