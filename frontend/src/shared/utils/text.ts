/**
 * Bỏ dấu tiếng Việt và chuyển về chữ thường — dùng cho mọi ô tìm kiếm/lọc.
 * Xử lý cả "Đ" hoa: chữ này không tách dấu được bằng NFD nên phải thay riêng.
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
}

/** `haystack` có chứa `needle` không, bỏ qua dấu và hoa/thường. */
export function matchesText(haystack: string, needle: string): boolean {
  return normalizeText(haystack).includes(normalizeText(needle.trim()))
}
