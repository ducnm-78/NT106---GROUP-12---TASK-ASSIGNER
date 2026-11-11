/** Đọc/ghi localStorage an toàn (trình duyệt có thể chặn storage). */
export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* hết dung lượng hoặc bị chặn: chỉ giữ trong bộ nhớ */
  }
}
