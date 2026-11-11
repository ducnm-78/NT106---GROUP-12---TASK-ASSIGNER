import { beforeEach, describe, expect, it } from 'vitest'
import { useWorkspace } from '@/features/workspace/composables/useWorkspace'
import { __resetGroups, useGroups } from '@/features/workspace/groups/useGroups'
import { activityText, daysUntil, dayFromToday, dueInfo, normalize } from '@/features/workspace/tasks/taskFormat'
import { __resetTasks, useTasks } from '@/features/workspace/tasks/taskStore'
import { useTaskView } from '@/features/workspace/tasks/useTaskView'
import type { TaskStatus } from '@/features/workspace/types'

const ME = 'u-demo'
let s: ReturnType<typeof useTasks>
let v: ReturnType<typeof useTaskView>

const byCode = (code: string) => s.taskByCode(code)!

beforeEach(() => {
  __resetGroups({ aiDelay: 0 })
  __resetTasks()
  s = useTasks()
  v = useTaskView()
  v.clearFilters()
  v.filters.projectId = null
  v.prefs.groupBy = 'project'
  v.prefs.collapsed = []
  v.prefs.showDone = []
  v.sort.key = 'order'
  v.sort.dir = 1
})

describe('Dữ liệu mẫu (khớp thiết kế)', () => {
  it('4 nhóm, 24 công việc: 8 cần làm · 6 đang làm · 3 chờ duyệt · 7 hoàn tất', () => {
    expect(s.projects.map((p) => [p.id, p.code, p.groupId])).toEqual([
      ['launch', 'RS', 'g-launch'],
      ['design', 'UX', 'g-design'],
      ['nt106', 'ĐA', 'g-nt106'],
      ['personal', 'CN', 'g-personal'],
    ])
    expect(s.tasks.value).toHaveLength(24)
    const { statusCounts } = useWorkspace()
    expect(statusCounts.value).toEqual({ todo: 8, doing: 6, review: 3, done: 7 })
    expect(new Set(s.tasks.value.map((t) => t.key)).size).toBe(24)
  })

  it('TF-128 có mô tả, 3/4 việc con, 2 bình luận, người duyệt là mình', () => {
    const t = byCode('TF-128')
    expect(t.title).toBe('Hoàn thành API đăng nhập')
    expect(t.status).toBe('review')
    expect(t.labels).toEqual(['Xác thực', 'Backend'])
    expect(t.reviewerId).toBe(ME)
    expect(t.subtasks.filter((x) => x.done)).toHaveLength(3)
    expect(t.comments.map((c) => c.authorId)).toEqual(['anh-minh', ME])
  })

  it('badge "việc cần bạn xử lý" = việc được giao chưa xong + việc chờ mình duyệt = 8', () => {
    expect(s.myOpenCount.value).toBe(8)
  })

  it('tìm theo mã: TF-128, tf128, 128', () => {
    expect(s.taskByCode('TF-128')?.key).toBe(128)
    expect(s.taskByCode('tf128')?.key).toBe(128)
    expect(s.taskByCode('128')?.key).toBe(128)
    expect(s.taskByCode('TF-9999')).toBeUndefined()
  })
})

describe('Tạo & sửa', () => {
  it('tạo việc: kiểm tra tên, mã tăng dần, ghi lịch sử, chuẩn hoá nhãn', () => {
    expect(s.createTask({ title: '   ', projectId: 'launch' }).ok).toBe(false)
    expect(s.createTask({ title: 'x', projectId: 'khong-co' }).ok).toBe(false)
    const r = s.createTask({ title: ' Viết báo cáo ', projectId: 'nt106', labels: ['Báo cáo', ' báo cáo ', 'Demo', ''] })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.title).toBe('Viết báo cáo')
    expect(r.value.key).toBe(167)
    expect(r.value.labels).toEqual(['Báo cáo', 'Demo'])
    expect(r.value.activity[0].kind).toBe('created')
    const r2 = s.createTask({ title: 'Việc 2', projectId: 'nt106' })
    expect(r2.ok && r2.value.key).toBe(168)
  })

  it('cập nhật ghi lịch sử từng thay đổi; tên rỗng bị từ chối', () => {
    const t = byCode('TF-140')
    expect(s.updateTask(t.id, { title: '  ' }).ok).toBe(false)
    s.updateTask(t.id, { priority: 'high', assigneeId: 'anh-minh', due: '2030-01-05', projectId: 'nt106' })
    expect(t.activity.slice(0, 4).map((a) => a.kind).sort()).toEqual(['assignee', 'due', 'priority', 'project'])
    expect(t.projectId).toBe('nt106')
    expect(s.updateTask(t.id, { due: '05/01/2030' }).ok).toBe(false)
  })
})

describe('Kéo thả & trạng thái', () => {
  it('chuyển cột: đặt completedAt khi Hoàn tất, xoá khi mở lại', () => {
    const t = byCode('TF-124')
    s.moveTask(t.id, { status: 'done' })
    expect(t.status).toBe('done')
    expect(t.completedAt).toBeTruthy()
    expect(t.activity[0]).toMatchObject({ kind: 'status', value: 'done' })
    s.setStatus(t.id, 'doing')
    expect(t.completedAt).toBeNull()
  })

  it('thả trước một thẻ khác: đúng vị trí trong cột', () => {
    const target = byCode('TF-128')
    const moving = byCode('TF-124')
    s.moveTask(moving.id, { status: 'review', beforeId: target.id })
    const col = s.tasks.value.filter((x) => x.status === 'review').sort((a, b) => a.order - b.order)
    expect(col.findIndex((x) => x.id === moving.id)).toBe(col.findIndex((x) => x.id === target.id) - 1)
  })

  it('thả sang làn khác đổi nhóm / người phụ trách / ưu tiên', () => {
    const t = byCode('TF-151')
    s.moveTask(t.id, { status: 'doing', projectId: 'launch' })
    expect([t.projectId, t.status]).toEqual(['launch', 'doing'])
    s.moveTask(t.id, { assigneeId: null })
    expect(t.assigneeId).toBeNull()
    s.moveTask(t.id, { priority: 'high' })
    expect(t.priority).toBe('high')
  })

  it('duyệt / yêu cầu sửa chỉ áp dụng cho việc Chờ duyệt', () => {
    const t = byCode('TF-128')
    expect(s.approveTask(byCode('TF-131').id).ok).toBe(false)
    expect(s.approveTask(t.id).ok).toBe(true)
    expect(t.status).toBe('done')
    expect(t.activity[0].kind).toBe('approved')
    const t2 = byCode('TF-145')
    expect(s.requestChanges(t2.id).ok).toBe(true)
    expect(t2.status).toBe('doing')
    expect(t2.activity[0].kind).toBe('changes')
  })

  it('hoàn tác: khôi phục trạng thái, thứ tự và việc đã xoá', () => {
    const saved = s.snapshot(s.tasks.value.map((t) => t.id))
    const t = byCode('TF-131')
    s.moveTask(t.id, { status: 'done' })
    s.deleteTasks([byCode('TF-140').id, byCode('TF-151').id])
    expect(s.tasks.value).toHaveLength(22)
    s.restore(saved)
    expect(s.tasks.value).toHaveLength(24)
    expect(byCode('TF-131').status).toBe('todo')
  })

  it('nhân bản: mã mới, việc con chưa làm, không mang bình luận', () => {
    const r = s.duplicateTask(byCode('TF-128').id)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.title).toBe('Hoàn thành API đăng nhập (bản sao)')
    expect(r.value.status).toBe('todo')
    expect(r.value.subtasks).toHaveLength(4)
    expect(r.value.subtasks.every((x) => !x.done)).toBe(true)
    expect(r.value.comments).toHaveLength(0)
  })
})

describe('Việc con & bình luận', () => {
  it('thêm / tích / đổi tên / xoá việc con', () => {
    const t = byCode('TF-140')
    expect(s.addSubtask(t.id, '  ').ok).toBe(false)
    const r = s.addSubtask(t.id, 'Ước lượng thời gian')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    s.toggleSubtask(t.id, r.value.id)
    expect(t.subtasks[0].done).toBe(true)
    expect(t.activity[0]).toMatchObject({ kind: 'subtask-done', value: 'Ước lượng thời gian' })
    s.renameSubtask(t.id, r.value.id, 'Ước lượng')
    expect(t.subtasks[0].title).toBe('Ước lượng')
    s.removeSubtask(t.id, r.value.id)
    expect(t.subtasks).toHaveLength(0)
  })

  it('bình luận: không rỗng, tối đa 2000 ký tự, tác giả là mình', () => {
    const t = byCode('TF-140')
    expect(s.addComment(t.id, ' ').ok).toBe(false)
    expect(s.addComment(t.id, 'a'.repeat(2001)).ok).toBe(false)
    const r = s.addComment(t.id, '@Anh Minh xem giúp nhé')
    expect(r.ok && r.value.authorId).toBe(ME)
    expect(t.comments).toHaveLength(1)
  })
})

describe('Liên kết với mục Nhóm', () => {
  it('tạo nhóm → có dự án tương ứng; đổi tên đồng bộ; xoá nhóm chưa có việc thì bỏ dự án', () => {
    const g = useGroups()
    const r = g.createGroup({ name: 'Nhóm Kiểm Thử', memberIds: ['thu-ha'] })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const p = s.projects.find((x) => x.groupId === r.value.id)!
    expect(p).toMatchObject({ name: 'Nhóm Kiểm Thử', code: 'NT' })
    g.updateGroup(r.value.id, { name: 'Nhóm QA' })
    expect(p.name).toBe('Nhóm QA')
    // Thành viên nhóm là người có thể nhận việc
    expect(v.peopleFor(p.id).sort()).toEqual([ME, 'thu-ha'].sort())
    g.deleteGroup(r.value.id)
    expect(s.projects.some((x) => x.groupId === r.value.id)).toBe(false)
  })

  it('xoá nhóm đã có việc thì giữ dự án để không mất việc', () => {
    const g = useGroups()
    const r = g.createGroup({ name: 'Nhóm giữ việc' })
    if (!r.ok) throw new Error(r.error)
    const p = s.projects.find((x) => x.groupId === r.value.id)!
    s.createTask({ title: 'Việc còn lại', projectId: p.id })
    g.deleteGroup(r.value.id)
    expect(s.projects.some((x) => x.id === p.id)).toBe(true)
  })

  it('gửi thẻ công việc vào kênh #chung của nhóm', () => {
    const g = useGroups()
    const r = g.postTaskCard('g-launch', { title: 'TF-128 · Hoàn thành API đăng nhập', status: 'Chờ duyệt', due: '29/10/2026' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.name).toBe('chung')
    const last = g.channelMessages(r.value.id).at(-1)!
    expect(last.embed).toMatchObject({ type: 'task', status: 'Chờ duyệt' })
    expect(g.unreadCount(r.value.id)).toBe(0) // tin của chính mình
  })
})

describe('Bộ lọc, gom làn, sắp xếp', () => {
  it('tìm theo tên không dấu, theo mã và theo nhãn', () => {
    v.filters.query = 'dang nhap'
    expect(v.filtered.value.map((t) => t.key).sort()).toEqual([128, 131, 154])
    v.filters.query = 'TF-124'
    expect(v.filtered.value.map((t) => t.key)).toEqual([124])
    v.filters.query = 'backend'
    expect(v.filtered.value.every((t) => t.labels.includes('Backend'))).toBe(true)
  })

  it('chỉ việc của tôi gồm cả việc mình là người duyệt', () => {
    v.filters.mine = true
    const keys = v.filtered.value.map((t) => t.key)
    expect(keys).toContain(128)
    expect(keys).toContain(145)
    expect(keys).not.toContain(131)
  })

  it('lọc người phụ trách & ưu tiên; thanh avatar liệt kê người có việc (mình đứng đầu)', () => {
    expect(v.assigneeOptions.value[0]).toBe(ME)
    v.toggleAssignee('anh-minh')
    v.filters.priority = 'high'
    expect(v.filtered.value.map((t) => t.key).sort()).toEqual([128, 161])
  })

  it('gom theo nhóm: 4 làn với tiến độ; phạm vi chỉ còn 1 làn', () => {
    const lanes = v.lanes.value
    expect(lanes.map((l) => [l.key, l.tasks.length, Math.round(l.progress * 100)])).toEqual([
      ['launch', 7, 29],
      ['design', 3, 0],
      ['nt106', 10, 40],
      ['personal', 4, 25],
    ])
    v.filters.projectId = 'nt106'
    expect(v.lanes.value.map((l) => l.key)).toEqual(['nt106'])
  })

  it('gom theo người phụ trách / ưu tiên / không gom', () => {
    v.prefs.groupBy = 'assignee'
    expect(v.lanes.value[0].key).toBe(ME)
    expect(v.lanes.value.reduce((n, l) => n + l.tasks.length, 0)).toBe(24)
    v.prefs.groupBy = 'priority'
    expect(v.lanes.value.map((l) => l.key)).toEqual(['high', 'medium', 'low'])
    v.prefs.groupBy = 'none'
    expect(v.lanes.value).toHaveLength(1)
    expect(v.lanes.value[0].tasks).toHaveLength(24)
  })

  it('ô trên bảng xếp theo thứ tự kéo thả; danh sách ẩn việc hoàn tất cho tới khi bấm hiện', () => {
    const launch = v.lanes.value[0]
    const cell = (st: TaskStatus) => v.cell(launch, st).map((t) => t.key)
    expect(cell('doing')).toEqual([118, 124])
    expect(v.rows(launch).hiddenDone).toBe(2)
    v.toggleShowDone('launch')
    expect(v.rows(v.lanes.value[0]).hiddenDone).toBe(0)
  })

  it('sắp xếp theo hạn chót tăng / giảm rồi về mặc định', () => {
    v.prefs.showDone = ['launch']
    v.toggleSort('due')
    const asc = v.rows(v.lanes.value[0]).visible.map((t) => t.due)
    expect([...asc].sort()).toEqual(asc)
    v.toggleSort('due')
    expect(v.sort.dir).toBe(-1)
    v.toggleSort('due')
    expect(v.sort.key).toBe('order')
  })

  it('giá trị điền sẵn khi tạo việc trong một làn', () => {
    expect(v.laneDefaults(v.lanes.value[2], 'review')).toMatchObject({ projectId: 'nt106', status: 'review', assigneeId: ME })
    v.prefs.groupBy = 'assignee'
    const lane = v.lanes.value.find((l) => l.key === 'anh-minh')!
    expect(v.laneDefaults(lane)).toMatchObject({ assigneeId: 'anh-minh', projectId: 'personal' })
  })
})

describe('Định dạng hạn chót & lịch sử', () => {
  it('nhãn hạn: hôm nay / ngày mai / quá hạn / xong', () => {
    expect(daysUntil(dayFromToday(3))).toBe(3)
    expect(dueInfo({ due: dayFromToday(0), status: 'todo', completedAt: null })).toMatchObject({ tone: 'today', label: 'Hôm nay' })
    expect(dueInfo({ due: dayFromToday(1), status: 'todo', completedAt: null }).label).toBe('Ngày mai')
    expect(dueInfo({ due: dayFromToday(-2), status: 'doing', completedAt: null })).toMatchObject({ tone: 'overdue', label: 'Quá hạn 2 ngày' })
    expect(dueInfo({ due: dayFromToday(5), status: 'todo', completedAt: null }).relative).toBe('còn 5 ngày')
    expect(dueInfo({ due: dayFromToday(-9), status: 'done', completedAt: new Date().toISOString() }).tone).toBe('done')
  })

  it('câu lịch sử tiếng Việt', () => {
    const name = (id: string) => (id === 'anh-minh' ? 'Anh Minh' : id)
    const proj = () => 'Đồ án NT106'
    const a = (kind: Parameters<typeof activityText>[0]['kind'], value?: string) => activityText({ id: 'x', actorId: ME, at: '', kind, value }, name, proj)
    expect(a('status', 'review')).toBe('đã chuyển sang Chờ duyệt')
    expect(a('assignee', 'anh-minh')).toBe('đã giao cho Anh Minh')
    expect(a('assignee')).toBe('đã bỏ người phụ trách')
    expect(a('due', '2026-10-29')).toBe('đã đặt hạn chót 29/10/2026')
    expect(a('project', 'nt106')).toBe('đã chuyển sang nhóm Đồ án NT106')
    expect(normalize('Đặc tả API')).toBe('dac ta api')
  })
})

describe('Lưu trữ', () => {
  it('lưu theo từng người dùng', () => {
    s.createTask({ title: 'Lưu thử', projectId: 'personal' })
    const saved = JSON.parse(localStorage.getItem(`taskflow:tasks:${ME}`)!)
    expect(saved.tasks).toHaveLength(25)
    expect(saved.nextKey).toBe(168)
  })
})
