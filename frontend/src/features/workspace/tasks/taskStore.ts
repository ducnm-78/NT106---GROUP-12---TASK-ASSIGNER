import { computed, reactive, ref, watch } from 'vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import { loadJSON, saveJSON } from '../composables/storage'
import type { ActionResult } from '../groups/useGroups'
import type { Project, Subtask, Task, TaskActivityKind, TaskComment, TaskPriority, TaskStatus } from '../types'
import { todayISO } from '../utils/format'
import { BASE_PROJECTS, createTaskSeed, SEED_NEXT_KEY } from './seed'

/* =============================================================
 * Kho Công việc (singleton theo module, lưu localStorage theo từng người dùng).
 * Khi có backend: thay phần thân các hàm bằng lời gọi API, giữ nguyên chữ ký.
 * ============================================================= */

interface TasksState {
  tasks: Task[]
  projects: Project[]
  nextKey: number
}

const ok = <T>(value: T): ActionResult<T> => ({ ok: true, value })
const fail = (error: string): ActionResult<never> => ({ ok: false, error })

export const tasks = ref<Task[]>([])
/** Mảng reactive (không phải ref) để các nơi cũ vẫn dùng được `projects.find(...)`. */
export const projects = reactive<Project[]>([])
let nextKey = SEED_NEXT_KEY
let loadedFor: string | null = null

export const meId = computed(() => useAuth().user.value?.id ?? 'guest')
const storageKey = (id: string) => `taskflow:tasks:${id}`
const LEGACY_KEY = 'taskflow:tasks'

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`
const now = () => new Date().toISOString()

function load(id: string): void {
  if (loadedFor === id) return
  loadedFor = id
  const stored = loadJSON<TasksState | null>(storageKey(id), null)
  const valid = stored && Array.isArray(stored.tasks) && Array.isArray(stored.projects)
  const state: TasksState = valid ? stored : { tasks: createTaskSeed(id), projects: BASE_PROJECTS.map((p) => ({ ...p })), nextKey: SEED_NEXT_KEY }
  tasks.value = state.tasks
  projects.splice(0, projects.length, ...state.projects)
  nextKey = state.nextKey
  if (!valid) {
    // Dữ liệu dạng cũ (trước khi có Chờ duyệt / mã TF) không còn dùng
    try {
      localStorage.removeItem(LEGACY_KEY)
    } catch {
      /* bỏ qua */
    }
    commit()
  }
}

function commit(): void {
  if (loadedFor) saveJSON(storageKey(loadedFor), { tasks: tasks.value, projects: [...projects], nextKey })
}

watch(meId, load, { immediate: true })

/** Dùng trong unit test: nạp lại dữ liệu mẫu. */
export function __resetTasks(): void {
  try {
    localStorage.removeItem(storageKey(meId.value))
  } catch {
    /* bỏ qua */
  }
  loadedFor = null
  load(meId.value)
}

/* ---------------- Tiện ích ---------------- */

const find = (id: string) => tasks.value.find((t) => t.id === id)

function log(task: Task, kind: TaskActivityKind, value: string | null = null): void {
  task.activity.unshift({ id: uid('a'), actorId: meId.value, at: now(), kind, value })
  task.activity.splice(60)
}

function cleanLabels(labels: string[]): string[] {
  const out: string[] = []
  for (const raw of labels) {
    const label = raw.trim().replace(/\s+/g, ' ').slice(0, 24)
    if (label && !out.some((x) => x.toLocaleLowerCase('vi') === label.toLocaleLowerCase('vi'))) out.push(label)
  }
  return out.slice(0, 6)
}

function codeFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? '?').slice(0, 2)
  return letters.toLocaleUpperCase('vi')
}

function maxOrder(status: TaskStatus): number {
  return tasks.value.reduce((m, t) => (t.status === status ? Math.max(m, t.order) : m), -1)
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export const taskCode = (task: Pick<Task, 'key'>) => `TF-${task.key}`

/* =============================================================
 * Tạo / sửa
 * ============================================================= */

export interface CreateTaskInput {
  title: string
  projectId: string
  status?: TaskStatus
  priority?: TaskPriority
  due?: string
  time?: string
  description?: string
  labels?: string[]
  assigneeId?: string | null
  reviewerId?: string | null
}

export function createTask(input: CreateTaskInput): ActionResult<Task> {
  const title = input.title.trim()
  if (!title) return fail('Nhập tên công việc.')
  if (title.length > 200) return fail('Tên công việc tối đa 200 ký tự.')
  if (!projects.some((p) => p.id === input.projectId)) return fail('Không tìm thấy nhóm/dự án.')
  const status = input.status ?? 'todo'
  const task: Task = {
    id: uid('t'),
    key: nextKey++,
    title,
    description: input.description?.trim() ?? '',
    projectId: input.projectId,
    status,
    priority: input.priority ?? 'medium',
    due: input.due || todayISO(),
    time: input.time || undefined,
    labels: cleanLabels(input.labels ?? []),
    assigneeId: input.assigneeId ?? null,
    reviewerId: input.reviewerId ?? null,
    subtasks: [],
    comments: [],
    activity: [],
    createdAt: now(),
    completedAt: status === 'done' ? now() : null,
    order: maxOrder(status) + 1,
  }
  log(task, 'created')
  tasks.value.push(task)
  commit()
  return ok(task)
}

export type TaskPatch = Partial<
  Pick<Task, 'title' | 'description' | 'priority' | 'due' | 'time' | 'labels' | 'assigneeId' | 'reviewerId' | 'projectId'>
>

export function updateTask(id: string, patch: TaskPatch): ActionResult<Task> {
  const t = find(id)
  if (!t) return fail('Không tìm thấy công việc.')
  if (patch.title !== undefined) {
    const title = patch.title.trim()
    if (!title) return fail('Tên công việc không được để trống.')
    if (title.length > 200) return fail('Tên công việc tối đa 200 ký tự.')
    if (title !== t.title) {
      t.title = title
      log(t, 'title', title)
    }
  }
  if (patch.description !== undefined) t.description = patch.description.trim().slice(0, 4000)
  if (patch.priority !== undefined && patch.priority !== t.priority) {
    t.priority = patch.priority
    log(t, 'priority', patch.priority)
  }
  if (patch.due !== undefined && patch.due && patch.due !== t.due) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(patch.due)) return fail('Ngày không hợp lệ.')
    t.due = patch.due
    log(t, 'due', patch.due)
  }
  if (patch.time !== undefined) t.time = patch.time || undefined
  if (patch.labels !== undefined) t.labels = cleanLabels(patch.labels)
  if (patch.assigneeId !== undefined && patch.assigneeId !== t.assigneeId) {
    t.assigneeId = patch.assigneeId
    log(t, 'assignee', patch.assigneeId)
  }
  if (patch.reviewerId !== undefined && patch.reviewerId !== t.reviewerId) {
    t.reviewerId = patch.reviewerId
    log(t, 'reviewer', patch.reviewerId)
  }
  if (patch.projectId !== undefined && patch.projectId !== t.projectId) {
    if (!projects.some((p) => p.id === patch.projectId)) return fail('Không tìm thấy nhóm/dự án.')
    t.projectId = patch.projectId
    log(t, 'project', patch.projectId)
  }
  commit()
  return ok(t)
}

export interface MoveTarget {
  status?: TaskStatus
  projectId?: string
  assigneeId?: string | null
  priority?: TaskPriority
  /** Chèn trước thẻ này; `null` = cuối cột; bỏ trống = giữ vị trí nếu không đổi trạng thái */
  beforeId?: string | null
}

/** Đổi trạng thái (và làn) của thẻ — dùng cho kéo thả, menu trạng thái và thao tác hàng loạt. */
export function moveTask(id: string, to: MoveTarget): ActionResult<Task> {
  const t = find(id)
  if (!t) return fail('Không tìm thấy công việc.')
  if (to.projectId !== undefined && to.projectId !== t.projectId) {
    const r = updateTask(id, { projectId: to.projectId })
    if (!r.ok) return r
  }
  if (to.assigneeId !== undefined && to.assigneeId !== t.assigneeId) updateTask(id, { assigneeId: to.assigneeId })
  if (to.priority !== undefined && to.priority !== t.priority) updateTask(id, { priority: to.priority })

  const target = to.status ?? t.status
  const changed = target !== t.status
  if (changed) {
    t.status = target
    t.completedAt = target === 'done' ? now() : null
    log(t, 'status', target)
  }
  if (changed || to.beforeId !== undefined) {
    const column = tasks.value.filter((x) => x.status === target && x.id !== t.id).sort((a, b) => a.order - b.order)
    let index = column.length
    if (to.beforeId) {
      const i = column.findIndex((x) => x.id === to.beforeId)
      if (i >= 0) index = i
    }
    column.splice(index, 0, t)
    column.forEach((x, i) => (x.order = i))
  }
  commit()
  return ok(t)
}

export function setStatus(id: string, status: TaskStatus): ActionResult<Task> {
  return moveTask(id, { status })
}

/** Người duyệt chấp nhận: Chờ duyệt → Hoàn tất. */
export function approveTask(id: string): ActionResult<Task> {
  const t = find(id)
  if (!t) return fail('Không tìm thấy công việc.')
  if (t.status !== 'review') return fail('Chỉ duyệt được việc đang chờ duyệt.')
  moveTask(id, { status: 'done' })
  if (t.activity[0]?.kind === 'status') t.activity.shift()
  log(t, 'approved')
  commit()
  return ok(t)
}

/** Người duyệt trả lại: Chờ duyệt → Đang làm. */
export function requestChanges(id: string): ActionResult<Task> {
  const t = find(id)
  if (!t) return fail('Không tìm thấy công việc.')
  if (t.status !== 'review') return fail('Chỉ yêu cầu sửa với việc đang chờ duyệt.')
  moveTask(id, { status: 'doing' })
  if (t.activity[0]?.kind === 'status') t.activity.shift()
  log(t, 'changes')
  commit()
  return ok(t)
}

/** Dùng ở Tổng quan: bấm ô tích để xong / làm lại. */
export function toggleDone(id: string): void {
  const t = find(id)
  if (t) moveTask(id, { status: t.status === 'done' ? 'todo' : 'done' })
}

export function deleteTasks(ids: string[]): number {
  const set = new Set(ids)
  const before = tasks.value.length
  tasks.value = tasks.value.filter((t) => !set.has(t.id))
  commit()
  return before - tasks.value.length
}

export function duplicateTask(id: string): ActionResult<Task> {
  const t = find(id)
  if (!t) return fail('Không tìm thấy công việc.')
  const r = createTask({
    title: `${t.title} (bản sao)`.slice(0, 200),
    projectId: t.projectId,
    priority: t.priority,
    due: t.due,
    time: t.time,
    description: t.description,
    labels: t.labels,
    assigneeId: t.assigneeId,
    reviewerId: t.reviewerId,
  })
  if (r.ok) {
    r.value.subtasks = t.subtasks.map((s) => ({ ...s, id: uid('s'), done: false }))
    commit()
  }
  return r
}

/* ---------------- Hoàn tác ---------------- */

/** Chụp lại trạng thái các việc trước khi thay đổi, để nút "Hoàn tác" trả về. */
export function snapshot(ids: string[]): Task[] {
  return ids.map(find).filter((t): t is Task => !!t).map(clone)
}

export function restore(saved: Task[]): void {
  for (const copy of saved) {
    const i = tasks.value.findIndex((t) => t.id === copy.id)
    if (i >= 0) tasks.value.splice(i, 1, clone(copy))
    else tasks.value.push(clone(copy))
  }
  commit()
}

/* ---------------- Việc con ---------------- */

export function addSubtask(id: string, title: string): ActionResult<Subtask> {
  const t = find(id)
  if (!t) return fail('Không tìm thấy công việc.')
  const name = title.trim()
  if (!name) return fail('Nhập tên việc con.')
  if (t.subtasks.length >= 30) return fail('Tối đa 30 việc con.')
  const sub: Subtask = { id: uid('s'), title: name.slice(0, 200), done: false, assigneeId: null }
  t.subtasks.push(sub)
  log(t, 'subtask-add', sub.title)
  commit()
  return ok(sub)
}

export function toggleSubtask(id: string, subId: string): void {
  const t = find(id)
  const s = t?.subtasks.find((x) => x.id === subId)
  if (!t || !s) return
  s.done = !s.done
  if (s.done) log(t, 'subtask-done', s.title)
  commit()
}

export function renameSubtask(id: string, subId: string, title: string): ActionResult<Subtask> {
  const s = find(id)?.subtasks.find((x) => x.id === subId)
  if (!s) return fail('Không tìm thấy việc con.')
  const name = title.trim()
  if (!name) return fail('Tên việc con không được để trống.')
  s.title = name.slice(0, 200)
  commit()
  return ok(s)
}

export function removeSubtask(id: string, subId: string): void {
  const t = find(id)
  if (!t) return
  t.subtasks = t.subtasks.filter((x) => x.id !== subId)
  commit()
}

/* ---------------- Bình luận ---------------- */

export function addComment(id: string, text: string): ActionResult<TaskComment> {
  const t = find(id)
  if (!t) return fail('Không tìm thấy công việc.')
  const body = text.trim()
  if (!body) return fail('Nhập nội dung bình luận.')
  if (body.length > 2000) return fail('Bình luận tối đa 2000 ký tự.')
  const comment: TaskComment = { id: uid('c'), authorId: meId.value, at: now(), text: body }
  t.comments.push(comment)
  commit()
  return ok(comment)
}

/* ---------------- Dự án ↔ Nhóm ---------------- */

/** Mỗi nhóm bên mục Nhóm có một dự án tương ứng để gom công việc. */
export function ensureProject(group: { id: string; name: string; color: string }): Project {
  const existing = projects.find((p) => p.groupId === group.id)
  if (existing) return existing
  const project: Project = { id: `p-${group.id}`, name: group.name, color: group.color, code: codeFor(group.name), groupId: group.id }
  projects.push(project)
  commit()
  return project
}

export function syncProject(groupId: string, patch: { name?: string; color?: string }): void {
  const p = projects.find((x) => x.groupId === groupId)
  if (!p) return
  if (patch.name) {
    p.name = patch.name
    // Mã của dự án mẫu giữ nguyên như thiết kế
    if (!BASE_PROJECTS.some((b) => b.id === p.id)) p.code = codeFor(patch.name)
  }
  if (patch.color) p.color = patch.color
  commit()
}

/** Nhóm bị xoá/rời: bỏ dự án nếu chưa có việc nào, còn việc thì giữ lại. */
export function releaseProject(groupId: string): void {
  const i = projects.findIndex((p) => p.groupId === groupId)
  if (i < 0) return
  if (!tasks.value.some((t) => t.projectId === projects[i].id)) projects.splice(i, 1)
  commit()
}

/* =============================================================
 * API dùng trong component
 * ============================================================= */

export function useTasks() {
  load(meId.value)

  const projectOf = (id: string) => projects.find((p) => p.id === id)
  const taskById = (id: string) => find(id)

  /** Nhận "TF-128", "tf128" hoặc "128". */
  function taskByCode(code: string): Task | undefined {
    const n = Number(code.replace(/^tf-?/i, ''))
    return Number.isFinite(n) ? tasks.value.find((t) => t.key === n) : undefined
  }

  const labelsInUse = computed(() =>
    [...new Set(tasks.value.flatMap((t) => t.labels))].sort((a, b) => a.localeCompare(b, 'vi')),
  )

  /** Việc cần mình xử lý: được giao mà chưa xong, hoặc đang chờ mình duyệt. */
  const myOpenCount = computed(
    () =>
      tasks.value.filter(
        (t) => (t.assigneeId === meId.value && t.status !== 'done') || (t.reviewerId === meId.value && t.status === 'review'),
      ).length,
  )

  return {
    tasks,
    projects,
    meId,
    projectOf,
    taskById,
    taskByCode,
    labelsInUse,
    myOpenCount,
    taskCode,
    createTask,
    updateTask,
    moveTask,
    setStatus,
    approveTask,
    requestChanges,
    toggleDone,
    deleteTasks,
    duplicateTask,
    snapshot,
    restore,
    addSubtask,
    toggleSubtask,
    renameSubtask,
    removeSubtask,
    addComment,
    ensureProject,
  }
}
