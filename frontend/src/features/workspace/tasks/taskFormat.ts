import { PRIORITY_SHORT, STATUS_LABELS } from '../data/constants'
import type { Task, TaskActivity, TaskPriority, TaskStatus } from '../types'
import { todayISO } from '../utils/format'

const pad = (n: number) => String(n).padStart(2, '0')

/** Bỏ dấu tiếng Việt, chữ thường — dùng cho tìm kiếm. */
export { normalizeText as normalize } from '@/shared/utils/text'

function parseDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

/** Số ngày từ hôm nay tới ngày hạn (âm = đã quá). */
export function daysUntil(due: string, today = todayISO()): number {
  return Math.round((parseDay(due).getTime() - parseDay(today).getTime()) / 86_400_000)
}

export const shortDate = (iso: string) => {
  const d = parseDay(iso)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
}

export const fullDate = (iso: string) => {
  const d = parseDay(iso)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

/** Ngày (YYYY-MM-DD) cách hôm nay `offset` ngày. */
export function dayFromToday(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return todayISO(d)
}

/** Thứ Hai của tuần sau. */
export function nextMonday(): string {
  const d = new Date()
  const add = ((8 - d.getDay()) % 7) || 7
  d.setDate(d.getDate() + add)
  return todayISO(d)
}

export type DueTone = 'overdue' | 'today' | 'soon' | 'normal' | 'done'

export interface DueInfo {
  tone: DueTone
  /** Nhãn ngắn trên thẻ: "Hôm nay", "Quá hạn 2 ngày", "28/10" */
  label: string
  /** Mô tả tương đối: "còn 3 ngày", "quá hạn 1 ngày" */
  relative: string
}

export function dueInfo(task: Pick<Task, 'due' | 'status' | 'completedAt'>): DueInfo {
  if (task.status === 'done') {
    const doneDay = task.completedAt ? todayISO(new Date(task.completedAt)) : task.due
    return { tone: 'done', label: `Xong ${shortDate(doneDay)}`, relative: 'đã hoàn tất' }
  }
  const days = daysUntil(task.due)
  if (days < 0) return { tone: 'overdue', label: `Quá hạn ${-days} ngày`, relative: `quá hạn ${-days} ngày` }
  if (days === 0) return { tone: 'today', label: 'Hôm nay', relative: 'hôm nay' }
  if (days === 1) return { tone: 'soon', label: 'Ngày mai', relative: 'ngày mai' }
  return { tone: days <= 2 ? 'soon' : 'normal', label: shortDate(task.due), relative: `còn ${days} ngày` }
}

/** "09:14" nếu là hôm nay, "Hôm qua 09:14", ngược lại "24/10 09:14". */
export function formatStamp(iso: string): string {
  const d = new Date(iso)
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const days = daysUntil(todayISO(d))
  if (days === 0) return time
  if (days === -1) return `Hôm qua ${time}`
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${time}`
}

/** Câu mô tả cho một dòng lịch sử. */
export function activityText(
  a: TaskActivity,
  nameOf: (id: string) => string,
  projectName: (id: string) => string,
): string {
  const v = a.value ?? ''
  switch (a.kind) {
    case 'created':
      return 'đã tạo công việc'
    case 'status':
      return `đã chuyển sang ${STATUS_LABELS[v as TaskStatus] ?? v}`
    case 'assignee':
      return v ? `đã giao cho ${nameOf(v)}` : 'đã bỏ người phụ trách'
    case 'reviewer':
      return v ? `đã chọn ${nameOf(v)} làm người duyệt` : 'đã bỏ người duyệt'
    case 'priority':
      return `đã đổi ưu tiên thành ${PRIORITY_SHORT[v as TaskPriority] ?? v}`
    case 'due':
      return `đã đặt hạn chót ${fullDate(v)}`
    case 'project':
      return `đã chuyển sang nhóm ${projectName(v)}`
    case 'title':
      return `đã đổi tên thành “${v}”`
    case 'subtask-add':
      return `đã thêm việc con “${v}”`
    case 'subtask-done':
      return `đã hoàn thành việc con “${v}”`
    case 'approved':
      return 'đã duyệt và hoàn tất'
    case 'changes':
      return 'đã yêu cầu sửa'
  }
}
