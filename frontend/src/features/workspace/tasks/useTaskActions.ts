import { STATUS_LABELS, STATUS_ORDER } from '../data/constants'
import { useToast } from '../composables/useToast'
import type { Task, TaskStatus } from '../types'
import { moveTask, restore, snapshot, taskCode, tasks, type MoveTarget } from './taskStore'

/** Thao tác thay đổi công việc kèm thông báo và nút "Hoàn tác". */
export function useTaskActions() {
  const toast = useToast()

  /**
   * Chụp lại toàn bộ trước khi đổi (thứ tự trong cột cũng thay đổi theo),
   * chạy thay đổi, rồi hiện thông báo có nút Hoàn tác.
   */
  function undoable(message: string, mutate: () => boolean | void): boolean {
    const saved = snapshot(tasks.value.map((t) => t.id))
    if (mutate() === false) return false
    toast.show(message, 'success', {
      label: 'Hoàn tác',
      run: () => {
        restore(saved)
        toast.show('Đã hoàn tác.', 'info')
      },
    })
    return true
  }

  function changeStatus(task: Task, status: TaskStatus): void {
    if (task.status === status) return
    undoable(`Đã chuyển ${taskCode(task)} sang ${STATUS_LABELS[status]}.`, () => moveTask(task.id, { status }).ok)
  }

  /** Kéo thả: đổi trạng thái/làn/vị trí. Chỉ báo khi có thay đổi trạng thái hoặc làn. */
  function drop(task: Task, target: MoveTarget, laneChanged: boolean): void {
    const statusChanged = !!target.status && target.status !== task.status
    if (!statusChanged && !laneChanged) {
      moveTask(task.id, target)
      return
    }
    const where = statusChanged ? `sang ${STATUS_LABELS[target.status!]}` : 'sang làn mới'
    undoable(`Đã chuyển ${taskCode(task)} ${where}.`, () => moveTask(task.id, target).ok)
  }

  /** Alt + ←/→ trên thẻ: lùi / tiến một cột. */
  function shift(task: Task, dir: -1 | 1): void {
    const next = STATUS_ORDER[STATUS_ORDER.indexOf(task.status) + dir]
    if (next) changeStatus(task, next)
  }

  return { undoable, changeStatus, drop, shift }
}
