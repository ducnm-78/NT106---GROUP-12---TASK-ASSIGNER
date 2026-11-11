import { computed, ref } from 'vue'
import { createMockNotifications, MOCK_ACTIVITY, MOCK_FOCUS_HOURS } from '../data/mock'
import { createTask, meId, projects, tasks, toggleDone, useTasks } from '../tasks/taskStore'
import type { AppNotification, Task, TaskPriority, TaskStatus } from '../types'
import { todayISO } from '../utils/format'

/** Trạng thái dùng chung (singleton theo module) — thay bằng API khi có backend. */
const notifications = ref<AppNotification[]>(createMockNotifications())
const focusHours = MOCK_FOCUS_HOURS

export interface NewTaskInput {
  title: string
  projectId: string
  priority: TaskPriority
  due: string
  time?: string
}

export function useWorkspace() {
  // Đảm bảo kho công việc đã nạp cho người dùng hiện tại
  useTasks()

  const statusCounts = computed(() => {
    const counts: Record<TaskStatus, number> = { todo: 0, doing: 0, review: 0, done: 0 }
    for (const task of tasks.value) counts[task.status]++
    return counts
  })

  const totalTasks = computed(() => tasks.value.length)
  const openTaskCount = computed(() => totalTasks.value - statusCounts.value.done)
  const completionRate = computed(() =>
    totalTasks.value ? statusCounts.value.done / totalTasks.value : 0,
  )

  const projectStats = computed(() =>
    projects.map((project) => {
      const own = tasks.value.filter((task) => task.projectId === project.id)
      const done = own.filter((task) => task.status === 'done').length
      return {
        ...project,
        total: own.length,
        open: own.length - done,
        progress: own.length ? done / own.length : 0,
      }
    }),
  )

  /** Việc hạn hôm nay, việc chưa xong lên trước rồi xếp theo giờ. */
  const todayTasks = computed(() =>
    tasks.value
      .filter((task) => task.due === todayISO())
      .sort(
        (a, b) =>
          Number(a.status === 'done') - Number(b.status === 'done') ||
          (a.time ?? '99').localeCompare(b.time ?? '99'),
      ),
  )

  const weeklyFocus = computed(() => focusHours.reduce((sum, h) => sum + h, 0))
  const unreadCount = computed(() => notifications.value.filter((n) => !n.read).length)

  function projectName(id: string): string {
    return projects.find((project) => project.id === id)?.name ?? ''
  }

  function toggleTask(id: string): void {
    toggleDone(id)
  }

  /** Tạo nhanh (Tổng quan, kế hoạch AI). Trả về việc vừa tạo hoặc null nếu dữ liệu không hợp lệ. */
  function addTask(input: NewTaskInput & { assigneeId?: string | null }): Task | null {
    const r = createTask({ ...input, assigneeId: input.assigneeId === undefined ? meId.value : input.assigneeId })
    return r.ok ? r.value : null
  }

  function markAllNotificationsRead(): void {
    for (const item of notifications.value) item.read = true
  }

  return {
    tasks,
    projects,
    focusHours,
    activity: MOCK_ACTIVITY,
    notifications,
    statusCounts,
    totalTasks,
    openTaskCount,
    completionRate,
    projectStats,
    todayTasks,
    weeklyFocus,
    unreadCount,
    projectName,
    toggleTask,
    addTask,
    markAllNotificationsRead,
  }
}
