export type TaskStatus = 'todo' | 'doing' | 'review' | 'done'
export type TaskPriority = 'high' | 'medium' | 'low'

export interface Project {
  id: string
  name: string
  /** Màu nhận diện dự án (chấm tròn ở sidebar, ô mã trên bảng công việc) */
  color: string
  /** Mã ngắn hiển thị trong ô màu, vd. "RS" */
  code: string
  /** Nhóm (mục Nhóm) gắn với dự án — để mở kênh trao đổi */
  groupId: string | null
}

export interface Subtask {
  id: string
  title: string
  done: boolean
  assigneeId?: string | null
}

export interface TaskComment {
  id: string
  authorId: string
  /** ISO timestamp */
  at: string
  text: string
}

export type TaskActivityKind =
  | 'created'
  | 'status'
  | 'assignee'
  | 'reviewer'
  | 'priority'
  | 'due'
  | 'project'
  | 'title'
  | 'subtask-add'
  | 'subtask-done'
  | 'approved'
  | 'changes'

/** Lịch sử thay đổi — lưu dạng có cấu trúc, giao diện tự dựng câu. */
export interface TaskActivity {
  id: string
  actorId: string
  at: string
  kind: TaskActivityKind
  value?: string | null
}

export interface Task {
  id: string
  /** Số thứ tự hiển thị dạng TF-<key> */
  key: number
  title: string
  description: string
  projectId: string
  status: TaskStatus
  priority: TaskPriority
  /** Ngày hạn dạng YYYY-MM-DD */
  due: string
  /** Giờ bắt đầu dạng HH:mm (nếu có) */
  time?: string
  labels: string[]
  assigneeId: string | null
  reviewerId: string | null
  subtasks: Subtask[]
  comments: TaskComment[]
  activity: TaskActivity[]
  createdAt: string
  /** Thời điểm chuyển sang Hoàn tất */
  completedAt: string | null
  /** Thứ tự trong cột trạng thái (kéo thả) */
  order: number
}

export interface AppNotification {
  id: string
  title: string
  body: string
  /** ISO timestamp */
  at: string
  read: boolean
}

export interface ProfileData {
  displayName: string
  jobTitle: string
  timezone: string
  /** Ảnh đại diện đã thu nhỏ, dạng data URL */
  avatar: string | null
}

export type ThemeMode = 'dark' | 'light'

export interface NotificationPrefs {
  taskReminders: boolean
  weeklySummary: boolean
  mentions: boolean
  email: boolean
}

export interface Preferences {
  theme: ThemeMode
  accent: string
  notifications: NotificationPrefs
}
