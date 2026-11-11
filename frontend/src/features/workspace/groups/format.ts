const time = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' })
const date = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
const longDate = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

function dayDiff(iso: string): number {
  const d = new Date(iso)
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const now = new Date()
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round((b - a) / 86_400_000)
}

/** "Hôm nay lúc 14:05", "Hôm qua lúc 09:00" hoặc "12/10/2026 14:05". */
export function formatMessageTime(iso: string): string {
  const diff = dayDiff(iso)
  const t = time.format(new Date(iso))
  if (diff === 0) return `Hôm nay lúc ${t}`
  if (diff === 1) return `Hôm qua lúc ${t}`
  return `${date.format(new Date(iso))} ${t}`
}

export function formatClock(iso: string): string {
  return time.format(new Date(iso))
}

export function formatDate(iso: string): string {
  return date.format(new Date(iso))
}

/** Nhãn ngăn cách ngày trong luồng tin nhắn. */
export function formatDayDivider(iso: string): string {
  const diff = dayDiff(iso)
  if (diff === 0) return 'Hôm nay'
  if (diff === 1) return 'Hôm qua'
  return longDate.format(new Date(iso))
}

/** "YYYY-MM-DD" → "dd/mm" */
export function shortDay(day: string): string {
  const [, m, d] = day.split('-')
  return `${d}/${m}`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

export const JOIN_LABELS = {
  owner: 'Người tạo nhóm',
  invite: 'Lời mời',
  calendar: 'Từ sự kiện Lịch',
  added: 'Được thêm',
  code: 'Mã mời',
} as const
