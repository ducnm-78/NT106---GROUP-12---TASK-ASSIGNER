const pad = (n: number) => String(n).padStart(2, '0')

export function todayISO(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const numberFmt = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })
const percentFmt = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 0 })

export const formatNumber = (value: number) => numberFmt.format(value)
export const formatPercent = (ratio: number) => percentFmt.format(ratio)

/** "Thứ Hai, 10/11" */
export function formatToday(date = new Date()): string {
  const weekday = new Intl.DateTimeFormat('vi-VN', { weekday: 'long' }).format(date)
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`
}

export function greeting(date = new Date()): string {
  const h = date.getHours()
  if (h < 11) return 'Chào buổi sáng'
  if (h < 13) return 'Chào buổi trưa'
  if (h < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

/** "08/2026" */
export function formatMonthYear(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : `${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

/** "5 phút trước", "2 giờ trước", "1 ngày trước" */
export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  return `${Math.round(hours / 24)} ngày trước`
}

/** "Asia/Ho_Chi_Minh (UTC+07:00)" */
export function formatTimezone(zone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' }).formatToParts(new Date())
    const offset = parts.find((p) => p.type === 'timeZoneName')?.value.replace('GMT', 'UTC') ?? ''
    return `${zone} (${offset === 'UTC' ? 'UTC+00:00' : offset})`
  } catch {
    return zone
  }
}
