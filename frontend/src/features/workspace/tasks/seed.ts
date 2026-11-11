import type { Project, Task, TaskPriority, TaskStatus } from '../types'

/**
 * Dữ liệu mẫu cho mục Công việc (khi chưa có backend).
 * 4 dự án gắn với 4 nhóm mẫu bên mục Nhóm; ngày hạn tính tương đối so với hôm nay.
 */

export const BASE_PROJECTS: Project[] = [
  { id: 'launch', name: 'Ra mắt sản phẩm', color: '#8175ff', code: 'RS', groupId: 'g-launch' },
  { id: 'design', name: 'Thiết kế UI/UX', color: '#38bdf8', code: 'UX', groupId: 'g-design' },
  { id: 'nt106', name: 'Đồ án NT106', color: '#f28fc0', code: 'ĐA', groupId: 'g-nt106' },
  { id: 'personal', name: 'Cá nhân', color: '#fbbe69', code: 'CN', groupId: 'g-personal' },
]

function isoDay(offset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Thời điểm `offsetDays` ngày trước/sau, lúc hh:mm. */
function at(offsetDays: number, hh = 9, mm = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  d.setHours(hh, mm, 0, 0)
  return d.toISOString()
}

interface SeedRow {
  key: number
  title: string
  project: string
  status: TaskStatus
  priority: TaskPriority
  due: number
  labels: string[]
  assignee: string | null
  reviewer?: string
  time?: string
  description?: string
  /** [tên, đã xong, người làm?] */
  subtasks?: [string, boolean, string?][]
  /** [tác giả, nội dung, giờ, phút, cách đây bao nhiêu ngày] */
  comments?: [string, string, number, number, number?][]
  /** Hoàn tất cách đây bao nhiêu ngày */
  doneAgo?: number
}

export const SEED_NEXT_KEY = 167

export function createTaskSeed(meId: string): Task[] {
  const me = (id: string | null) => (id === 'me' ? meId : id)
  const rows: SeedRow[] = [
    /* ---- Ra mắt sản phẩm: 2 cần làm · 2 đang làm · 1 chờ duyệt · 2 hoàn tất ---- */
    {
      key: 131, title: 'Xây dựng màn đăng nhập', project: 'launch', status: 'todo', priority: 'high', due: 0, time: '13:00',
      labels: ['Xác thực'], assignee: 'huy-nguyen',
      description: 'Màn đăng nhập theo thiết kế mới: email/tên đăng nhập, ghi nhớ đăng nhập, quên mật khẩu.',
      subtasks: [['Dựng bố cục form', true], ['Kiểm tra dữ liệu nhập', false], ['Nối API đăng nhập (TF-128)', false]],
      comments: [['mai-phuong', 'Mình đã gửi bản thiết kế ở kênh #thiết-kế nhé.', 15, 20, 1], ['huy-nguyen', 'Ok, chiều nay mình bắt đầu.', 16, 5, 1]],
    },
    {
      key: 140, title: 'Lập kế hoạch đợt làm việc', project: 'launch', status: 'todo', priority: 'medium', due: 5,
      labels: ['Kế hoạch'], assignee: 'me', description: 'Chia việc cho 2 tuần tới, ước lượng thời gian và người phụ trách.',
    },
    {
      key: 118, title: 'Hoàn thiện luồng giới thiệu', project: 'launch', status: 'doing', priority: 'high', due: 0, time: '09:30',
      labels: ['Onboarding'], assignee: 'mai-phuong',
      subtasks: [['Màn chào mừng', true], ['Chọn mục tiêu', true], ['Mời đồng đội', false], ['Hướng dẫn tạo việc đầu tiên', false], ['Hiệu ứng chuyển màn', false]],
      comments: [
        ['thao-linh', 'Bước 3 nên cho bỏ qua được.', 10, 2, 2], ['mai-phuong', 'Đã thêm nút “Để sau”.', 10, 40, 2],
        ['anh-minh', 'Nhớ lưu lại bước đang làm dở nhé.', 14, 0, 1], ['mai-phuong', 'Đã lưu vào localStorage.', 14, 30, 1],
        ['me', 'Tuyệt, mai demo cho cả nhóm.', 17, 10, 1], ['mai-phuong', '👍', 17, 12, 1],
      ],
    },
    {
      key: 124, title: 'Phát triển chức năng lịch', project: 'launch', status: 'doing', priority: 'medium', due: 2,
      labels: ['Lịch'], assignee: 'huy-nguyen',
      subtasks: [['Lưới tháng', true], ['Tạo sự kiện', true], ['Tạo nhóm từ sự kiện', true], ['Nhắc lịch', false]],
      comments: [['anh-minh', 'Phần tạo nhóm từ sự kiện chạy ổn rồi.', 11, 0, 1]],
    },
    {
      key: 128, title: 'Hoàn thành API đăng nhập', project: 'launch', status: 'review', priority: 'high', due: 3,
      labels: ['Xác thực', 'Backend'], assignee: 'anh-minh', reviewer: 'me',
      description: 'Làm API /login và /logout dùng JWT, khoá tài khoản sau 5 lần sai mật khẩu. Giao diện đã có ở màn Đăng nhập (TF-131).',
      subtasks: [['Thiết kế bảng users', true], ['Viết API /login và /logout', true], ['Viết test đăng nhập', true], ['Cập nhật tài liệu API', false, 'anh-minh']],
      comments: [['anh-minh', 'PR #42 đã sẵn sàng, mọi người review giúp mình.', 9, 14], ['me', 'Tốt rồi, thứ 5 mình merge luôn nhé.', 9, 18]],
    },
    { key: 102, title: 'Nghiên cứu người dùng', project: 'launch', status: 'done', priority: 'medium', due: -5, labels: ['Nghiên cứu'], assignee: 'thao-linh', doneAgo: 4 },
    { key: 105, title: 'Đặc tả API', project: 'launch', status: 'done', priority: 'medium', due: -3, labels: ['Backend'], assignee: 'anh-minh', doneAgo: 2 },

    /* ---- Thiết kế UI/UX: 1 · 1 · 1 · 0 ---- */
    { key: 151, title: 'Rà soát thành phần UI', project: 'design', status: 'todo', priority: 'low', due: 2, labels: ['Thiết kế'], assignee: 'mai-phuong' },
    {
      key: 148, title: 'Tạo khung giao diện', project: 'design', status: 'doing', priority: 'medium', due: 4,
      labels: ['Thiết kế'], assignee: 'thao-linh', subtasks: [['Khung trang tổng quan', true], ['Khung trang công việc', false]],
    },
    {
      key: 145, title: 'Thiết kế trang tổng quan', project: 'design', status: 'review', priority: 'medium', due: -1,
      labels: ['Thiết kế'], assignee: 'thao-linh', reviewer: 'me',
      comments: [
        ['thao-linh', 'Bản v2 đã có biểu đồ tiến độ dự án.', 14, 0, 2], ['me', 'Thêm chế độ sáng giúp mình nhé.', 14, 30, 2],
        ['thao-linh', 'Đã cập nhật, nhờ bạn duyệt.', 9, 45, 1], ['lan-anh', 'Màu chữ phụ hơi nhạt trên nền sáng.', 11, 10, 1],
      ],
    },

    /* ---- Đồ án NT106: 3 · 2 · 1 · 4 ---- */
    { key: 160, title: 'Viết báo cáo chương 1', project: 'nt106', status: 'todo', priority: 'medium', due: 6, labels: ['Báo cáo'], assignee: 'me' },
    { key: 161, title: 'Kịch bản demo cuối kỳ', project: 'nt106', status: 'todo', priority: 'high', due: 9, labels: ['Demo'], assignee: 'anh-minh' },
    { key: 162, title: 'Kiểm thử kết nối socket', project: 'nt106', status: 'todo', priority: 'high', due: 4, labels: ['Kiểm thử'], assignee: 'minh-khoa' },
    {
      key: 157, title: 'Xây dựng server chat TCP', project: 'nt106', status: 'doing', priority: 'high', due: 2,
      labels: ['Backend'], assignee: 'huy-nguyen', subtasks: [['Lắng nghe kết nối', true], ['Phát tin nhắn cho cả phòng', true], ['Xử lý mất kết nối', false]],
    },
    { key: 158, title: 'Đồng bộ dữ liệu thời gian thực', project: 'nt106', status: 'doing', priority: 'medium', due: 5, labels: ['Backend'], assignee: 'me' },
    { key: 159, title: 'Vẽ sơ đồ kiến trúc hệ thống', project: 'nt106', status: 'review', priority: 'medium', due: 1, labels: ['Tài liệu'], assignee: 'minh-khoa', reviewer: 'anh-minh' },
    { key: 152, title: 'Chọn đề tài và phân công', project: 'nt106', status: 'done', priority: 'low', due: -13, labels: ['Kế hoạch'], assignee: 'anh-minh', doneAgo: 12 },
    { key: 153, title: 'Thiết kế cơ sở dữ liệu', project: 'nt106', status: 'done', priority: 'medium', due: -9, labels: ['Backend'], assignee: 'me', doneAgo: 9 },
    { key: 154, title: 'Dựng giao diện đăng nhập', project: 'nt106', status: 'done', priority: 'medium', due: -6, labels: ['Giao diện'], assignee: 'me', doneAgo: 6 },
    { key: 155, title: 'Tìm hiểu giao thức WebSocket', project: 'nt106', status: 'done', priority: 'low', due: -5, labels: ['Nghiên cứu'], assignee: 'huy-nguyen', doneAgo: 5 },

    /* ---- Cá nhân: 2 · 1 · 0 · 1 ---- */
    { key: 163, title: 'Lên kế hoạch tập luyện', project: 'personal', status: 'todo', priority: 'low', due: 2, labels: ['Sức khoẻ'], assignee: 'me' },
    { key: 164, title: 'Ôn tập môn Mạng máy tính', project: 'personal', status: 'todo', priority: 'high', due: 0, time: '20:00', labels: ['Học tập'], assignee: 'me' },
    { key: 165, title: 'Đọc sách Atomic Habits', project: 'personal', status: 'doing', priority: 'low', due: 7, labels: ['Đọc sách'], assignee: 'me' },
    { key: 166, title: 'Gia hạn thẻ thư viện', project: 'personal', status: 'done', priority: 'low', due: -1, labels: ['Cá nhân'], assignee: 'me', doneAgo: 1 },
  ]

  const order: Record<string, number> = {}
  return rows.map((r) => {
    const created = at(-14 + (r.key % 7), 8, 30)
    const completedAt = r.status === 'done' ? at(-(r.doneAgo ?? 1), 17, 0) : null
    order[r.status] = (order[r.status] ?? -1) + 1
    const activity: Task['activity'] = [{ id: `a-${r.key}-0`, actorId: meId, at: created, kind: 'created' }]
    if (r.status !== 'todo') {
      activity.unshift({
        id: `a-${r.key}-1`,
        actorId: me(r.assignee) ?? meId,
        at: completedAt ?? at(-1, 10, 0),
        kind: 'status',
        value: r.status,
      })
    }
    return {
      id: `t-${r.key}`,
      key: r.key,
      title: r.title,
      description: r.description ?? '',
      projectId: r.project,
      status: r.status,
      priority: r.priority,
      due: isoDay(r.due),
      time: r.time,
      labels: r.labels,
      assigneeId: me(r.assignee),
      reviewerId: r.reviewer ? me(r.reviewer) : null,
      subtasks: (r.subtasks ?? []).map(([title, done, who], i) => ({
        id: `s-${r.key}-${i}`,
        title,
        done,
        assigneeId: who ? me(who) : null,
      })),
      comments: (r.comments ?? []).map(([author, text, hh, mm, ago], i) => ({
        id: `c-${r.key}-${i}`,
        authorId: me(author) ?? meId,
        at: at(-(ago ?? 0), hh, mm),
        text,
      })),
      activity,
      createdAt: created,
      completedAt,
      order: order[r.status],
    }
  })
}
