import { computed, reactive, watch } from 'vue'
import { loadJSON, saveJSON } from '../composables/storage'
import { PRIORITY_ORDER, PRIORITY_SHORT, STATUS_ORDER } from '../data/constants'
import { AI_BOT_ID, PEOPLE } from '../groups/data'
import { useGroups } from '../groups/useGroups'
import type { Task, TaskPriority, TaskStatus } from '../types'
import { normalize } from './taskFormat'
import { meId, projects, tasks } from './taskStore'

/* =============================================================
 * Trạng thái giao diện của mục Công việc: chế độ xem, bộ lọc, gom làn, sắp xếp.
 * Singleton để giữ bộ lọc khi chuyển trang; chế độ xem/gom/làn thu gọn lưu localStorage.
 * ============================================================= */

export type ViewMode = 'board' | 'list'
export type GroupBy = 'project' | 'assignee' | 'priority' | 'none'
export type SortKey = 'order' | 'title' | 'assignee' | 'priority' | 'due' | 'status'

export const GROUP_BY_LABELS: Record<GroupBy, string> = {
  project: 'Nhóm',
  assignee: 'Người phụ trách',
  priority: 'Ưu tiên',
  none: 'Không gom',
}

interface UiPrefs {
  view: ViewMode
  groupBy: GroupBy
  /** Làn đang thu gọn (theo khoá làn) */
  collapsed: string[]
  /** Làn đang hiện việc đã hoàn tất (chế độ danh sách) */
  showDone: string[]
}

const UI_KEY = 'taskflow:tasks-ui'
const defaults: UiPrefs = { view: 'board', groupBy: 'project', collapsed: [], showDone: [] }
const prefs = reactive<UiPrefs>({ ...defaults, ...loadJSON<Partial<UiPrefs>>(UI_KEY, {}) })
watch(prefs, () => saveJSON(UI_KEY, prefs), { deep: true })

const filters = reactive({
  query: '',
  projectId: null as string | null,
  priority: null as TaskPriority | null,
  /** Người phụ trách được chọn; 'none' = chưa giao */
  assignees: [] as string[],
  mine: false,
})

const sort = reactive({ key: 'order' as SortKey, dir: 1 as 1 | -1 })

/** Giá trị điền sẵn khi mở form tạo việc từ một cột / làn. */
export interface CreateDefaults {
  status?: TaskStatus
  projectId?: string
  assigneeId?: string | null
  priority?: TaskPriority
}

export interface Lane {
  key: string
  kind: GroupBy
  title: string
  color: string
  code: string
  projectId?: string
  groupId?: string | null
  personId?: string | null
  priority?: TaskPriority
  tasks: Task[]
  counts: Record<TaskStatus, number>
  progress: number
  /** Người phụ trách trong làn (để hiện avatar) */
  people: string[]
}

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }
const STATUS_RANK: Record<TaskStatus, number> = { todo: 0, doing: 1, review: 2, done: 3 }
const PRIORITY_COLORS: Record<TaskPriority, string> = { high: '#ff8a5c', medium: '#9b7bff', low: '#94a4bf' }

export function useTaskView() {
  const groups = useGroups()

  const nameOf = (id: string | null) => (id ? groups.person(id).name : 'Chưa giao')

  /** Thành viên có thể nhận việc trong một dự án (theo nhóm tương ứng; không gồm bot AI). */
  function peopleFor(projectId: string | null | undefined): string[] {
    const project = projects.find((p) => p.id === projectId)
    const group = project?.groupId ? groups.group(project.groupId) : undefined
    const ids = group ? group.members.map((m) => m.userId).filter((id) => id !== AI_BOT_ID) : [meId.value]
    return sortPeople([...new Set(ids)])
  }

  /** Mọi người trong danh bạ (dùng cho thao tác hàng loạt). */
  const everyone = computed(() => sortPeople([meId.value, ...PEOPLE.filter((p) => !p.bot).map((p) => p.id)]))

  function sortPeople(ids: string[]): string[] {
    return [...ids].sort((a, b) =>
      a === meId.value ? -1 : b === meId.value ? 1 : nameOf(a).localeCompare(nameOf(b), 'vi'),
    )
  }

  const filtersActive = computed(
    () => !!filters.query.trim() || !!filters.priority || filters.assignees.length > 0 || filters.mine,
  )

  function matches(t: Task, ignoreAssignees = false): boolean {
    if (filters.projectId && t.projectId !== filters.projectId) return false
    if (filters.priority && t.priority !== filters.priority) return false
    if (!ignoreAssignees && filters.assignees.length && !filters.assignees.includes(t.assigneeId ?? 'none')) return false
    if (filters.mine && t.assigneeId !== meId.value && t.reviewerId !== meId.value) return false
    const q = normalize(filters.query.trim())
    if (q) {
      const compact = q.replace(/[\s-]/g, '')
      const hit =
        normalize(t.title).includes(q) ||
        `tf${t.key}`.includes(compact) ||
        String(t.key) === compact ||
        t.labels.some((l) => normalize(l).includes(q))
      if (!hit) return false
    }
    return true
  }

  const filtered = computed(() => tasks.value.filter((t) => matches(t)))

  /** Người có việc trong phạm vi hiện tại — để hiện ở bộ lọc avatar. */
  const assigneeOptions = computed(() => {
    const count = new Map<string, number>()
    for (const t of tasks.value) {
      if (!matches(t, true)) continue
      const key = t.assigneeId ?? 'none'
      count.set(key, (count.get(key) ?? 0) + 1)
    }
    const ids = [...count.keys()].filter((k) => k !== 'none')
    const sorted = ids.sort((a, b) =>
      a === meId.value ? -1 : b === meId.value ? 1 : (count.get(b) ?? 0) - (count.get(a) ?? 0) || nameOf(a).localeCompare(nameOf(b), 'vi'),
    )
    return count.has('none') ? [...sorted, 'none'] : sorted
  })

  const laneKeyOf = (t: Task): string => {
    switch (prefs.groupBy) {
      case 'project':
        return t.projectId
      case 'assignee':
        return t.assigneeId ?? 'none'
      case 'priority':
        return t.priority
      default:
        return 'all'
    }
  }

  function buildLane(base: Omit<Lane, 'tasks' | 'counts' | 'progress' | 'people'>, list: Task[]): Lane {
    const counts: Record<TaskStatus, number> = { todo: 0, doing: 0, review: 0, done: 0 }
    for (const t of list) counts[t.status]++
    const people = sortPeople([...new Set(list.map((t) => t.assigneeId).filter((x): x is string => !!x))])
    return { ...base, tasks: list, counts, progress: list.length ? counts.done / list.length : 0, people }
  }

  const lanes = computed<Lane[]>(() => {
    const byKey = new Map<string, Task[]>()
    for (const t of filtered.value) {
      const key = laneKeyOf(t)
      byKey.set(key, [...(byKey.get(key) ?? []), t])
    }
    const keep = (lane: Lane) => lane.tasks.length > 0 || !filtersActive.value

    if (prefs.groupBy === 'project') {
      return projects
        .filter((p) => !filters.projectId || p.id === filters.projectId)
        .map((p) =>
          buildLane(
            { key: p.id, kind: 'project', title: p.name, color: p.color, code: p.code, projectId: p.id, groupId: p.groupId },
            byKey.get(p.id) ?? [],
          ),
        )
        .filter(keep)
    }
    if (prefs.groupBy === 'assignee') {
      const keys = sortPeople([...byKey.keys()].filter((k) => k !== 'none'))
      if (byKey.has('none')) keys.push('none')
      return keys.map((k) => {
        const person = k === 'none' ? null : groups.person(k)
        const words = (person?.name ?? '?').split(/\s+/)
        return buildLane(
          {
            key: k,
            kind: 'assignee',
            title: person ? (k === meId.value ? `${person.name} (bạn)` : person.name) : 'Chưa giao',
            color: person?.color ?? '#5b6b88',
            code: person ? (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase() : '—',
            personId: person ? k : null,
            projectId: filters.projectId ?? undefined,
          },
          byKey.get(k) ?? [],
        )
      })
    }
    if (prefs.groupBy === 'priority') {
      return PRIORITY_ORDER.map((p) =>
        buildLane(
          { key: p, kind: 'priority', title: `Ưu tiên ${PRIORITY_SHORT[p].toLowerCase()}`, color: PRIORITY_COLORS[p], code: PRIORITY_SHORT[p][0], priority: p, projectId: filters.projectId ?? undefined },
          byKey.get(p) ?? [],
        ),
      ).filter(keep)
    }
    return [
      buildLane(
        { key: 'all', kind: 'none', title: 'Tất cả công việc', color: '#8175ff', code: 'TF', projectId: filters.projectId ?? undefined },
        filtered.value,
      ),
    ]
  })

  /** Thẻ của một ô (làn × trạng thái) trên bảng, theo thứ tự kéo thả. */
  function cell(lane: Lane, status: TaskStatus): Task[] {
    return lane.tasks.filter((t) => t.status === status).sort((a, b) => a.order - b.order)
  }

  /** Việc của một làn ở chế độ danh sách (đã sắp xếp; ẩn việc hoàn tất nếu chưa mở). */
  function rows(lane: Lane): { visible: Task[]; hiddenDone: number } {
    const showDone = prefs.showDone.includes(lane.key) || filters.mine || !!filters.query.trim()
    const list = [...lane.tasks].sort(compare)
    const visible = showDone ? list : list.filter((t) => t.status !== 'done')
    return { visible, hiddenDone: list.length - visible.length }
  }

  function compare(a: Task, b: Task): number {
    const d = sort.dir
    switch (sort.key) {
      case 'title':
        return d * a.title.localeCompare(b.title, 'vi')
      case 'assignee':
        return d * nameOf(a.assigneeId).localeCompare(nameOf(b.assigneeId), 'vi')
      case 'priority':
        return d * (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) || a.due.localeCompare(b.due)
      case 'due':
        return d * a.due.localeCompare(b.due) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
      case 'status':
        return d * (STATUS_RANK[a.status] - STATUS_RANK[b.status]) || a.order - b.order
      default:
        return STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.order - b.order
    }
  }

  /** Nhóm/người/ưu tiên mặc định khi tạo việc trong một làn. */
  function laneDefaults(lane: Lane, status?: TaskStatus): CreateDefaults & { projectId: string } {
    const fallback = filters.projectId ?? projects.find((p) => p.id === 'personal')?.id ?? projects[0]?.id ?? ''
    return {
      status,
      projectId: lane.kind === 'project' ? lane.key : (lane.projectId ?? fallback),
      assigneeId: lane.kind === 'assignee' ? (lane.personId ?? null) : meId.value,
      priority: lane.kind === 'priority' ? lane.priority : undefined,
    }
  }

  function toggleSort(key: SortKey): void {
    if (sort.key === key) {
      if (sort.dir === 1) sort.dir = -1
      else {
        sort.key = 'order'
        sort.dir = 1
      }
    } else {
      sort.key = key
      sort.dir = 1
    }
  }

  function toggleLane(key: string): void {
    prefs.collapsed = prefs.collapsed.includes(key) ? prefs.collapsed.filter((k) => k !== key) : [...prefs.collapsed, key]
  }

  function toggleShowDone(key: string): void {
    prefs.showDone = prefs.showDone.includes(key) ? prefs.showDone.filter((k) => k !== key) : [...prefs.showDone, key]
  }

  function toggleAssignee(id: string): void {
    filters.assignees = filters.assignees.includes(id) ? filters.assignees.filter((x) => x !== id) : [...filters.assignees, id]
  }

  function clearFilters(): void {
    filters.query = ''
    filters.priority = null
    filters.assignees = []
    filters.mine = false
  }

  return {
    prefs,
    filters,
    sort,
    filtered,
    filtersActive,
    lanes,
    assigneeOptions,
    everyone,
    nameOf,
    peopleFor,
    cell,
    rows,
    laneDefaults,
    toggleSort,
    toggleLane,
    toggleShowDone,
    toggleAssignee,
    clearFilters,
    STATUS_ORDER,
  }
}
