import type {
  Channel,
  ChannelCategory,
  Group,
  GroupMember,
  GroupTemplate,
  Message,
  Permission,
  Person,
  Role,
} from './types'

/* ================= Danh bạ ================= */

export const AI_BOT_ID = 'ai-assistant'

/** Người dùng mẫu (đồng nghiệp/bạn bè) dùng khi chưa có backend. */
export const PEOPLE: Person[] = [
  { id: 'anh-minh', name: 'Anh Minh', username: 'anhminh', color: '#3a6e8f', status: 'online', activity: 'Đang review PR #128' },
  { id: 'thao-linh', name: 'Thảo Linh', username: 'thaolinh', color: '#6b5296', status: 'online', activity: 'Thiết kế màn hình chat' },
  { id: 'mai-phuong', name: 'Mai Phương', username: 'maiphuong', color: '#8c5274', status: 'idle' },
  { id: 'huy-nguyen', name: 'Huy Nguyễn', username: 'huynguyen', color: '#3a7a66', status: 'dnd', activity: 'Tập trung — đừng làm phiền' },
  { id: 'quoc-bao', name: 'Quốc Bảo', username: 'quocbao', color: '#8a6a3a', status: 'online' },
  { id: 'thu-ha', name: 'Thu Hà', username: 'thuha', color: '#4a5f9c', status: 'idle' },
  { id: 'minh-khoa', name: 'Minh Khoa', username: 'minhkhoa', color: '#2f7d8a', status: 'offline' },
  { id: 'lan-anh', name: 'Lan Anh', username: 'lananh', color: '#7a4a5e', status: 'offline' },
  { id: AI_BOT_ID, name: 'Trợ lý AI', username: 'taskflow-ai', color: '#7060fa', status: 'online', bot: true, activity: 'Sẵn sàng hỗ trợ' },
]

/* ================= Quyền ================= */

export interface PermissionMeta {
  label: string
  description: string
  group: string
}

export const PERMISSION_META: Record<Permission, PermissionMeta> = {
  VIEW_CHANNELS: { label: 'Xem kênh', description: 'Thấy các kênh công khai và đọc tin nhắn.', group: 'Chung' },
  MANAGE_CHANNELS: { label: 'Quản lý kênh', description: 'Tạo, sửa, xoá kênh và danh mục.', group: 'Chung' },
  MANAGE_ROLES: { label: 'Quản lý vai trò', description: 'Tạo, sửa vai trò thấp hơn vai trò cao nhất của mình.', group: 'Chung' },
  MANAGE_MEMBERS: { label: 'Quản lý thành viên', description: 'Mời, đổi biệt danh, tạm khoá, mời ra hoặc cấm thành viên.', group: 'Thành viên' },
  SEND_MESSAGES: { label: 'Gửi tin nhắn', description: 'Gửi tin nhắn trong kênh văn bản.', group: 'Tin nhắn' },
  ATTACH_FILES: { label: 'Đính kèm tệp', description: 'Tải ảnh và tệp lên kênh.', group: 'Tin nhắn' },
  MENTION_EVERYONE: { label: 'Nhắc @everyone', description: 'Gửi thông báo đến tất cả thành viên.', group: 'Tin nhắn' },
  VIEW_TASKS: { label: 'Xem công việc', description: 'Xem bảng công việc của nhóm.', group: 'Công việc' },
  EDIT_TASKS: { label: 'Sửa công việc', description: 'Tạo và chỉnh sửa công việc.', group: 'Công việc' },
  ASSIGN_TASKS: { label: 'Giao việc', description: 'Giao công việc cho thành viên khác.', group: 'Công việc' },
  DELETE_TASKS: { label: 'Xoá công việc', description: 'Xoá công việc khỏi nhóm.', group: 'Công việc' },
  JOIN_VOICE: { label: 'Tham gia kênh thoại', description: 'Kết nối, nói và chia sẻ màn hình.', group: 'Thoại & AI' },
  USE_AI: { label: 'Dùng Trợ lý AI', description: 'Hỏi AI, nhờ tóm tắt và lập kế hoạch.', group: 'Thoại & AI' },
  ADMINISTRATOR: {
    label: 'Quản trị viên',
    description: 'Có mọi quyền và bỏ qua giới hạn kênh. Chỉ cấp cho người tin cậy.',
    group: 'Nâng cao',
  },
}

const MEMBER_PERMS: Permission[] = ['VIEW_CHANNELS', 'SEND_MESSAGES', 'ATTACH_FILES', 'VIEW_TASKS', 'JOIN_VOICE', 'USE_AI']

/** Bảng màu vai trò (đủ tương phản trên nền tối và sáng). */
export const ROLE_COLORS = ['#fbbe69', '#6ea8ff', '#f28fc0', '#4fd1a5', '#ab8df8', '#ff8a65', '#5ccfe6', '#94a4bf']

/** Màu biểu tượng nhóm. */
export const GROUP_COLORS = ['#7060fa', '#38bdf8', '#f28fc0', '#f5b65b', '#2bb5a0', '#ff8a65', '#ab8df8', '#4fd1a5']

/* ================= Mẫu nhóm ================= */

export interface TemplateMeta {
  id: GroupTemplate
  label: string
  description: string
  icon: 'folder' | 'grad' | 'users' | 'sparkles'
}

export const GROUP_TEMPLATES: TemplateMeta[] = [
  { id: 'project', label: 'Dự án', description: 'Kênh kế hoạch, thiết kế, kỹ thuật và phòng họp.', icon: 'folder' },
  { id: 'study', label: 'Học tập', description: 'Kênh tài liệu, bài tập và học nhóm.', icon: 'grad' },
  { id: 'club', label: 'Câu lạc bộ', description: 'Kênh thông báo, sự kiện và trò chuyện.', icon: 'users' },
  { id: 'blank', label: 'Tự tạo', description: 'Chỉ có #chung và một kênh thoại.', icon: 'sparkles' },
]

type ChannelSeed = [name: string, type: Channel['type'], topic: string]

const TEMPLATE_LAYOUT: Record<GroupTemplate, { name: string; channels: ChannelSeed[] }[]> = {
  blank: [
    { name: 'Kênh văn bản', channels: [['chung', 'text', 'Trò chuyện chung của nhóm']] },
    { name: 'Kênh thoại', channels: [['Phòng chung', 'voice', '']] },
  ],
  project: [
    {
      name: 'Thông tin',
      channels: [
        ['thông-báo', 'announcement', 'Thông báo quan trọng của nhóm'],
        ['chung', 'text', 'Trao đổi chung về dự án'],
      ],
    },
    {
      name: 'Dự án',
      channels: [
        ['kế-hoạch', 'text', 'Mốc thời gian, phân công'],
        ['thiết-kế', 'text', 'Ý tưởng, mockup và phản hồi'],
        ['kỹ-thuật', 'text', 'Thảo luận triển khai'],
      ],
    },
    { name: 'Kênh thoại', channels: [['Phòng họp', 'voice', '']] },
  ],
  study: [
    {
      name: 'Học tập',
      channels: [
        ['chung', 'text', 'Trao đổi chung'],
        ['tài-liệu', 'text', 'Slide, giáo trình và link tham khảo'],
        ['bài-tập', 'text', 'Hạn nộp và thảo luận bài tập'],
      ],
    },
    { name: 'Kênh thoại', channels: [['Học nhóm', 'voice', '']] },
  ],
  club: [
    {
      name: 'Thông tin',
      channels: [
        ['thông-báo', 'announcement', 'Tin tức câu lạc bộ'],
        ['sự-kiện', 'text', 'Lịch hoạt động'],
      ],
    },
    { name: 'Cộng đồng', channels: [['chung', 'text', 'Giao lưu'], ['hỏi-đáp', 'text', 'Đặt câu hỏi cho ban chủ nhiệm']] },
    { name: 'Kênh thoại', channels: [['Sảnh chờ', 'voice', '']] },
  ],
}

let seq = 0
export function uid(prefix: string): string {
  seq += 1
  return `${prefix}-${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/** Ngày (YYYY-MM-DD) cách hôm nay `offset` ngày, theo giờ địa phương. */
export function isoDay(offset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

/** Bộ vai trò mặc định: Quản trị viên, Thành viên, Bot AI, @everyone. */
export function defaultRoles(groupId: string): Role[] {
  return [
    { id: `${groupId}-admin`, name: 'Quản trị viên', color: '#fbbe69', permissions: ['ADMINISTRATOR'], hoist: true, mentionable: true },
    {
      id: `${groupId}-member`,
      name: 'Thành viên',
      color: '#6ea8ff',
      permissions: [...MEMBER_PERMS, 'EDIT_TASKS'],
      hoist: true,
      mentionable: true,
    },
    { id: `${groupId}-bot`, name: 'Bot AI', color: '#ab8df8', permissions: ['VIEW_CHANNELS', 'SEND_MESSAGES'], hoist: true, mentionable: false, managed: true },
    { id: `${groupId}-everyone`, name: '@everyone', color: '#94a4bf', permissions: [...MEMBER_PERMS], hoist: false, mentionable: false, isDefault: true },
  ]
}

/** Dựng danh mục + kênh theo mẫu. */
export function buildChannels(groupId: string, template: GroupTemplate): { categories: ChannelCategory[]; channels: Channel[] } {
  const categories: ChannelCategory[] = []
  const channels: Channel[] = []
  TEMPLATE_LAYOUT[template].forEach((cat, ci) => {
    const categoryId = `${groupId}-cat${ci}`
    categories.push({ id: categoryId, name: cat.name })
    cat.channels.forEach(([name, type, topic], i) => {
      channels.push({
        id: `${groupId}-c${ci}${i}`,
        name,
        type,
        categoryId,
        topic,
        private: false,
        allowedRoleIds: [],
        aiAccess: type !== 'voice',
      })
    })
  })
  return { categories, channels }
}

function member(userId: string, roleIds: string[], minutes: number, via: GroupMember['joinedVia'] = 'invite'): GroupMember {
  return { userId, roleIds, joinedAt: minutesAgo(minutes), joinedVia: via, timeoutUntil: null }
}

function msg(
  id: string,
  channelId: string,
  authorId: string,
  minutes: number,
  text: string,
  extra: Partial<Message> = {},
): Message {
  return {
    id,
    channelId,
    authorId,
    at: minutesAgo(minutes),
    text,
    reactions: [],
    attachments: [],
    pinned: false,
    replyToId: null,
    threadParentId: null,
    embed: null,
    ...extra,
  }
}

const DAY = 60 * 24

function emptyGroupBase(id: string, name: string, ownerId: string, minutes: number): Omit<Group, 'roles' | 'members' | 'categories' | 'channels'> {
  return {
    id,
    name,
    color: GROUP_COLORS[0],
    description: '',
    ownerId,
    createdAt: minutesAgo(minutes),
    invites: [],
    bans: [],
    auditLog: [],
    automod: { enabled: true, blockedWords: ['spam'], blockLinks: false, maxMentions: 5 },
    eventId: null,
    muted: false,
  }
}

/* ================= Dữ liệu mẫu theo thiết kế ================= */

export interface GroupsSeed {
  groups: Group[]
  messages: Message[]
  /** channelId → thời điểm đọc gần nhất */
  readState: Record<string, string>
}

export function createSeed(meId: string): GroupsSeed {
  /* ---- Nhóm 1: Ra mắt sản phẩm (đầy đủ vai trò & kênh như thiết kế) ---- */
  const L = 'g-launch'
  const roles: Role[] = [
    { id: 'r-admin', name: 'Quản trị viên', color: '#fbbe69', permissions: ['ADMINISTRATOR'], hoist: true, mentionable: true },
    {
      id: 'r-editor',
      name: 'Biên tập',
      color: '#6ea8ff',
      permissions: [...MEMBER_PERMS, 'MANAGE_CHANNELS', 'MENTION_EVERYONE', 'EDIT_TASKS', 'ASSIGN_TASKS'],
      hoist: true,
      mentionable: true,
    },
    { id: 'r-design', name: 'Thiết kế', color: '#f28fc0', permissions: [...MEMBER_PERMS, 'EDIT_TASKS'], hoist: true, mentionable: true },
    { id: 'r-eng', name: 'Engineering', color: '#4fd1a5', permissions: [...MEMBER_PERMS, 'EDIT_TASKS', 'ASSIGN_TASKS'], hoist: true, mentionable: true },
    { id: 'r-viewer', name: 'Người xem', color: '#94a4bf', permissions: ['VIEW_CHANNELS', 'VIEW_TASKS'], hoist: false, mentionable: false },
    { id: 'r-bot', name: 'Bot AI', color: '#ab8df8', permissions: ['VIEW_CHANNELS', 'SEND_MESSAGES', 'USE_AI'], hoist: true, mentionable: false, managed: true },
    // @everyone chỉ được xem; quyền nhắn tin đến từ các vai trò công việc → "Người xem" thực sự chỉ đọc
    { id: 'r-everyone', name: '@everyone', color: '#94a4bf', permissions: ['VIEW_CHANNELS', 'VIEW_TASKS', 'JOIN_VOICE'], hoist: false, mentionable: false, isDefault: true },
  ]
  const categories: ChannelCategory[] = [
    { id: 'cat-info', name: 'Thông tin' },
    { id: 'cat-project', name: 'Dự án' },
    { id: 'cat-admin', name: 'Quản trị' },
    { id: 'cat-voice', name: 'Kênh thoại' },
  ]
  const ch = (id: string, name: string, type: Channel['type'], categoryId: string, topic: string, extra: Partial<Channel> = {}): Channel => ({
    id,
    name,
    type,
    categoryId,
    topic,
    private: false,
    allowedRoleIds: [],
    aiAccess: type !== 'voice',
    ...extra,
  })
  const channels: Channel[] = [
    ch('c-announce', 'thông-báo', 'announcement', 'cat-info', 'Mốc quan trọng và thông báo chính thức'),
    ch('c-rules', 'nội-quy', 'text', 'cat-info', 'Quy tắc làm việc chung', { aiAccess: false }),
    ch('c-general', 'chung', 'text', 'cat-project', 'Trao đổi chung về đợt ra mắt sản phẩm'),
    ch('c-design', 'thiết-kế', 'text', 'cat-project', 'Mockup, phản hồi và tài nguyên thiết kế'),
    ch('c-eng', 'kỹ-thuật', 'text', 'cat-project', 'Triển khai, review code và lỗi'),
    ch('c-ai', 'kế-hoạch-ai', 'text', 'cat-project', 'Hỏi Trợ lý AI để tóm tắt, lập kế hoạch và tạo công việc'),
    ch('c-admin', 'quản-trị', 'text', 'cat-admin', 'Chỉ Quản trị viên và Biên tập', { private: true, allowedRoleIds: ['r-admin', 'r-editor'] }),
    ch('c-voice-meet', 'Phòng họp', 'voice', 'cat-voice', ''),
    ch('c-voice-focus', 'Góc tập trung', 'voice', 'cat-voice', ''),
  ]
  const launch: Group = {
    ...emptyGroupBase(L, 'Ra mắt sản phẩm', meId, 30 * DAY),
    color: '#7060fa',
    icon: 'sparkles',
    description: 'Phối hợp đợt ra mắt TaskFlow 2.0: nội dung, thiết kế, kỹ thuật và truyền thông.',
    roles,
    categories,
    channels,
    members: [
      member(meId, ['r-admin'], 30 * DAY, 'owner'),
      member('anh-minh', ['r-editor', 'r-eng'], 29 * DAY),
      member('thao-linh', ['r-design'], 28 * DAY),
      member('mai-phuong', ['r-design', 'r-editor'], 25 * DAY),
      member('huy-nguyen', ['r-eng'], 20 * DAY),
      member('quoc-bao', ['r-viewer'], 12 * DAY, 'code'),
      member('thu-ha', ['r-eng'], 10 * DAY),
      member('minh-khoa', ['r-viewer'], 6 * DAY, 'code'),
      member('lan-anh', ['r-design'], 3 * DAY),
      member(AI_BOT_ID, ['r-bot'], 30 * DAY, 'added'),
    ],
    invites: [
      { code: 'LAUNCH-2X9K', createdBy: meId, createdAt: minutesAgo(2 * DAY), expiresAt: new Date(Date.now() + 5 * DAY * 60_000).toISOString(), maxUses: 20, uses: 4 },
    ],
    auditLog: [
      { id: 'a1', at: minutesAgo(3 * DAY), actorId: meId, action: 'đã thêm thành viên', target: 'Lan Anh', icon: 'user-plus' },
      { id: 'a2', at: minutesAgo(4 * DAY), actorId: 'anh-minh', action: 'đã tạo kênh', target: '#kế-hoạch-ai', icon: 'hash' },
      { id: 'a3', at: minutesAgo(6 * DAY), actorId: meId, action: 'đã cập nhật vai trò', target: 'Biên tập', icon: 'shield' },
    ],
  }

  const general = 'c-general'
  const messages: Message[] = [
    msg('m-a1', 'c-announce', meId, 2 * DAY, '📣 Lịch ra mắt chính thức: thứ Sáu tuần sau. Mọi người cập nhật tiến độ trong #chung nhé!', { pinned: true }),
    msg('m-r1', 'c-rules', meId, 30 * DAY, '1. Cập nhật tiến độ trước 17:00 hằng ngày.\n2. Mọi thay đổi giao diện cần review từ nhóm Thiết kế.\n3. Dùng #kế-hoạch-ai để nhờ AI tóm tắt và lập kế hoạch.', { pinned: true }),
    msg('m-g1', general, 'anh-minh', 180, 'Chào cả nhóm! Mình vừa merge xong luồng giới thiệu, mọi người thử trên bản staging giúp mình nhé 🚀', {
      reactions: [{ emoji: '🚀', userIds: ['thao-linh', 'huy-nguyen', meId] }, { emoji: '👍', userIds: ['mai-phuong'] }],
    }),
    msg('m-g2', general, 'thao-linh', 150, 'Mình đã cập nhật mockup màn hình chat và bảng màu mới, tươi hơn bản trước. @Anh Minh xem giúp phần trạng thái online nha.', {
      attachments: [{ name: 'chat-v3.fig', size: 2_480_000, kind: 'file' }],
    }),
    msg('m-g3', general, 'huy-nguyen', 120, 'Đã tạo công việc cho phần kiểm thử thanh toán, ai rảnh nhận giúp mình.', {
      embed: { type: 'task', title: 'Kiểm thử thanh toán', status: 'Đang làm', due: 'Hôm nay' },
    }),
    msg('m-g4', general, 'mai-phuong', 95, 'Nội dung thông cáo đã xong bản nháp, mình gửi trong thread này để mọi người góp ý.'),
    msg('m-t1', general, 'anh-minh', 90, 'Phần mở đầu nên nhấn mạnh tính năng AI lập kế hoạch nhé.', { threadParentId: 'm-g4' }),
    msg('m-t2', general, 'thao-linh', 80, 'Đồng ý, thêm 1 ảnh minh hoạ nữa là đẹp 👌', { threadParentId: 'm-g4' }),
    msg('m-g5', general, AI_BOT_ID, 60, 'Tóm tắt hôm nay: 3 việc hạn hôm nay, 1 việc ưu tiên cao chưa bắt đầu. Đây là kế hoạch đề xuất cho buổi chiều:', {
      embed: {
        type: 'plan',
        title: 'Kế hoạch chiều nay',
        items: [
          { title: 'Chốt nội dung thông cáo ra mắt', due: isoDay(0), priority: 'high' },
          { title: 'Kiểm thử luồng thanh toán lần cuối', due: isoDay(0), priority: 'high' },
          { title: 'Chuẩn bị FAQ cho đội hỗ trợ', due: isoDay(1), priority: 'medium' },
        ],
      },
    }),
    msg('m-g6', general, 'quoc-bao', 25, 'Bản staging chạy mượt trên điện thoại của mình 👏', { reactions: [{ emoji: '❤️', userIds: ['anh-minh'] }] }),
    msg('m-d1', 'c-design', 'lan-anh', 300, 'Mình gom lại các icon mới cho sidebar trong file chung rồi nhé.'),
    msg('m-e1', 'c-eng', 'thu-ha', 240, 'CI đã xanh lại sau khi sửa test đăng nhập ✅'),
    msg('m-ai1', 'c-ai', AI_BOT_ID, 2 * DAY, 'Xin chào! Gõ “@Trợ lý AI lập kế hoạch …” hoặc hỏi bất kỳ điều gì về dự án, mình sẽ trả lời ngay trong kênh này.'),
    msg('m-ad1', 'c-admin', 'anh-minh', 400, 'Nhắc: hạn chót chốt ngân sách quảng cáo là thứ Tư.'),
  ]

  /* ---- Nhóm 2: Thiết kế UI/UX ---- */
  const D = 'g-design'
  const dLayout = buildChannels(D, 'project')
  const dRoles = defaultRoles(D)
  const design: Group = {
    ...emptyGroupBase(D, 'Thiết kế UI/UX', meId, 20 * DAY),
    color: '#38bdf8',
    icon: 'palette',
    description: 'Hệ thống thiết kế, mockup và kiểm thử khả dụng.',
    roles: dRoles,
    ...dLayout,
    members: [
      member(meId, [dRoles[0].id], 20 * DAY, 'owner'),
      member('thao-linh', [dRoles[1].id], 19 * DAY),
      member('lan-anh', [dRoles[1].id], 15 * DAY),
      member('mai-phuong', [dRoles[1].id], 12 * DAY),
      member(AI_BOT_ID, [dRoles[2].id], 20 * DAY, 'added'),
    ],
  }
  const dGeneral = dLayout.channels.find((c) => c.name === 'chung')!.id
  messages.push(
    msg('m-dd1', dGeneral, 'thao-linh', 500, 'Bản design system v2 đã có token màu mới, mọi người cập nhật thư viện nhé.'),
    msg('m-dd2', dGeneral, 'lan-anh', 420, 'Đã cập nhật! Mình thấy màu trạng thái online dễ nhìn hơn hẳn.'),
  )

  /* ---- Nhóm 3: Đồ án NT106 (có 3 tin chưa đọc) ---- */
  const N = 'g-nt106'
  const nLayout = buildChannels(N, 'study')
  const nRoles = defaultRoles(N)
  const nt106: Group = {
    ...emptyGroupBase(N, 'Đồ án NT106', 'anh-minh', 14 * DAY),
    color: '#f28fc0',
    icon: 'grad',
    description: 'Nhóm 12 — Đồ án môn Lập trình mạng căn bản.',
    roles: nRoles,
    ...nLayout,
    members: [
      member('anh-minh', [nRoles[0].id], 14 * DAY, 'owner'),
      member(meId, [nRoles[1].id], 14 * DAY),
      member('huy-nguyen', [nRoles[1].id], 13 * DAY),
      member('minh-khoa', [nRoles[1].id], 13 * DAY),
      member(AI_BOT_ID, [nRoles[2].id], 14 * DAY, 'added'),
    ],
  }
  const nGeneral = nLayout.channels.find((c) => c.name === 'chung')!.id
  const nHomework = nLayout.channels.find((c) => c.name === 'bài-tập')!.id
  messages.push(
    msg('m-n0', nGeneral, 'anh-minh', 2 * DAY, 'Chào cả nhóm, mình sẽ chia việc cho đồ án trong tuần này.'),
    msg('m-n1', nGeneral, 'huy-nguyen', 40, 'Mình đã xong phần socket server, mọi người pull về test nhé.'),
    msg('m-n2', nGeneral, 'minh-khoa', 30, 'Phần giao diện client còn thiếu màn hình nhóm, mình đang làm.'),
    msg('m-n3', nHomework, 'anh-minh', 15, '@everyone Hạn nộp báo cáo giữa kỳ là thứ Năm, nhớ cập nhật file Word nha!'),
  )

  /* ---- Nhóm 4: Cá nhân ---- */
  const P = 'g-personal'
  const pLayout = buildChannels(P, 'blank')
  const pRoles = defaultRoles(P)
  const personal: Group = {
    ...emptyGroupBase(P, 'Cá nhân', meId, 40 * DAY),
    color: '#f5b65b',
    icon: 'user',
    description: 'Ghi chú riêng và trò chuyện với Trợ lý AI.',
    roles: pRoles,
    ...pLayout,
    members: [member(meId, [pRoles[0].id], 40 * DAY, 'owner'), member(AI_BOT_ID, [pRoles[2].id], 40 * DAY, 'added')],
  }

  // Đánh dấu đã đọc mọi kênh trừ các kênh của Đồ án NT106 (để có 3 tin chưa đọc)
  const readState: Record<string, string> = {}
  for (const g of [launch, design, personal]) for (const c of g.channels) readState[c.id] = new Date().toISOString()
  readState[nGeneral] = minutesAgo(60)
  readState[nHomework] = minutesAgo(60)

  return { groups: [launch, design, nt106, personal], messages, readState }
}

/** Nhóm công khai có thể tham gia bằng mã mời (mô phỏng khám phá). */
export const DISCOVER_GROUPS: { code: string; name: string; description: string; color: string; template: GroupTemplate; memberIds: string[] }[] = [
  {
    code: 'UIT-CODE',
    name: 'CLB Lập trình UIT',
    description: 'Chia sẻ kiến thức, cuộc thi và sự kiện lập trình.',
    color: '#2bb5a0',
    template: 'club',
    memberIds: ['quoc-bao', 'thu-ha', 'minh-khoa', 'lan-anh'],
  },
  {
    code: 'VUE-VN',
    name: 'Vue.js Việt Nam',
    description: 'Cộng đồng Vue, Vite và TypeScript.',
    color: '#4fd1a5',
    template: 'club',
    memberIds: ['anh-minh', 'huy-nguyen', 'thu-ha'],
  },
  {
    code: 'STUDY-AI',
    name: 'Học nhóm Trí tuệ nhân tạo',
    description: 'Ôn tập học máy, đọc paper mỗi tuần.',
    color: '#ab8df8',
    template: 'study',
    memberIds: ['mai-phuong', 'minh-khoa'],
  },
]

/** Người đang ở sẵn trong kênh thoại (mô phỏng). */
export const VOICE_SEED: Record<string, string[]> = {
  'c-voice-meet': ['anh-minh', 'huy-nguyen'],
  'c-voice-focus': ['thu-ha'],
}
