import type { TaskPriority, TaskStatus } from '../types'

/** Màu chủ đạo cho phép chọn trong Cài đặt. `on` là màu chữ trên nền màu đó. */
export const ACCENTS = [
  { value: '#7468f8', label: 'Tím', on: '#ffffff' },
  { value: '#a78bfa', label: 'Tím nhạt', on: '#1b1530' },
  { value: '#60a5fa', label: 'Xanh dương', on: '#0b1a2e' },
  { value: '#2bb5a0', label: 'Xanh ngọc', on: '#062520' },
  { value: '#f5b65b', label: 'Cam', on: '#2b1a04' },
] as const

export const DEFAULT_ACCENT = ACCENTS[0].value

/** Thứ tự cột trên bảng Kanban. */
export const STATUS_ORDER: TaskStatus[] = ['todo', 'doing', 'review', 'done']

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Cần làm',
  doing: 'Đang làm',
  review: 'Chờ duyệt',
  done: 'Hoàn tất',
}

/** Màu trạng thái (biểu đồ, chấm cột) — tươi, phân biệt rõ trên cả nền tối lẫn sáng. */
export const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: '#f5a524',
  doing: '#9b7bff',
  review: '#3b9eff',
  done: '#22c08a',
}

export const PRIORITY_ORDER: TaskPriority[] = ['high', 'medium', 'low']

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'Ưu tiên cao',
  medium: 'Trung bình',
  low: 'Thấp',
}

/** Nhãn ngắn trên thẻ / bảng. */
export const PRIORITY_SHORT: Record<TaskPriority, string> = {
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
}
