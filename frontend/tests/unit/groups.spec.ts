import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWorkspace } from '@/features/workspace/composables/useWorkspace'
import { AI_BOT_ID } from '@/features/workspace/groups/data'
import { FEATURES, VOICE_SOON_MESSAGE } from '@/features/workspace/groups/features'
import { __resetGroups, normalizeChannelName, useGroups } from '@/features/workspace/groups/useGroups'

const ME = 'u-demo'
let g: ReturnType<typeof useGroups>

beforeEach(() => {
  __resetGroups({ aiDelay: 900 })
  g = useGroups()
})

afterEach(() => {
  vi.useRealTimers()
  FEATURES.voice = false
})

describe('Dữ liệu mẫu', () => {
  it('có 4 nhóm theo thiết kế, người dùng hiện tại là chủ nhóm "Ra mắt sản phẩm"', () => {
    expect(g.groups.value.map((x) => x.name)).toEqual(['Ra mắt sản phẩm', 'Thiết kế UI/UX', 'Đồ án NT106', 'Cá nhân'])
    const launch = g.group('g-launch')!
    expect(launch.ownerId).toBe(ME)
    expect(launch.roles.map((r) => r.name)).toEqual([
      'Quản trị viên',
      'Biên tập',
      'Thiết kế',
      'Engineering',
      'Người xem',
      'Bot AI',
      '@everyone',
    ])
    expect(launch.categories.map((c) => c.name)).toEqual(['Thông tin', 'Dự án', 'Quản trị', 'Kênh thoại'])
  })

  it('Đồ án NT106 có 3 tin chưa đọc và 1 lượt nhắc (@everyone)', () => {
    expect(g.groupUnread('g-nt106')).toEqual({ count: 3, mentions: 1 })
    expect(g.groupUnread('g-launch').count).toBe(0)
    expect(g.totalUnread.value).toBe(3)
  })
})

describe('Phân quyền', () => {
  it('chủ nhóm có mọi quyền', () => {
    expect(g.can('g-launch', 'MANAGE_ROLES')).toBe(true)
    expect(g.can('g-launch', 'ADMINISTRATOR')).toBe(true)
  })

  it('thành viên thường ở NT106 không quản lý được kênh/vai trò nhưng vẫn gửi được tin', () => {
    expect(g.can('g-nt106', 'MANAGE_CHANNELS')).toBe(false)
    expect(g.can('g-nt106', 'MANAGE_ROLES')).toBe(false)
    expect(g.can('g-nt106', 'SEND_MESSAGES')).toBe(true)
    const r = g.createChannel('g-nt106', { name: 'thử', type: 'text', categoryId: null })
    expect(r.ok).toBe(false)
  })

  it('kênh riêng tư chỉ hiện với vai trò được phép', () => {
    expect(g.canSeeChannel('g-launch', 'c-admin', 'anh-minh')).toBe(true) // Biên tập
    expect(g.canSeeChannel('g-launch', 'c-admin', 'quoc-bao')).toBe(false) // Người xem
    expect(g.canSeeChannel('g-launch', 'c-admin', ME)).toBe(true) // chủ nhóm
  })

  it('Người xem không có quyền gửi tin nhắn', () => {
    expect(g.can('g-launch', 'SEND_MESSAGES', 'quoc-bao')).toBe(false)
    expect(g.can('g-launch', 'VIEW_TASKS', 'quoc-bao')).toBe(true)
  })

  it('ADMINISTRATOR bao gồm mọi quyền', () => {
    g.toggleMemberRole('g-launch', 'thao-linh', 'r-admin')
    expect(g.can('g-launch', 'MANAGE_ROLES', 'thao-linh')).toBe(true)
    expect(g.canSeeChannel('g-launch', 'c-admin', 'thao-linh')).toBe(true)
  })
})

describe('Kênh', () => {
  it('chuẩn hoá tên kênh văn bản', () => {
    expect(normalizeChannelName('  Tài Liệu   Thiết Kế! ', 'text')).toBe('tài-liệu-thiết-kế')
    expect(normalizeChannelName('#chung', 'text')).toBe('chung')
    expect(normalizeChannelName('Phòng Họp 2', 'voice')).toBe('Phòng Họp 2')
  })

  it('tạo kênh trong danh mục, chặn trùng tên, ghi nhật ký', () => {
    const r = g.createChannel('g-launch', { name: 'Báo cáo tuần', type: 'text', categoryId: 'cat-project', topic: 'Tổng kết' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.name).toBe('báo-cáo-tuần')
    const launch = g.group('g-launch')!
    const projectChannels = launch.channels.filter((c) => c.categoryId === 'cat-project').map((c) => c.name)
    expect(projectChannels.at(-1)).toBe('báo-cáo-tuần')
    expect(launch.auditLog[0].action).toBe('đã tạo kênh')
    expect(g.createChannel('g-launch', { name: 'báo cáo tuần', type: 'text', categoryId: null }).ok).toBe(false)
  })

  it('kênh riêng tư mới chỉ hiện với vai trò đã chọn', () => {
    const r = g.createChannel('g-launch', { name: 'thiết kế riêng', type: 'text', categoryId: null, private: true, allowedRoleIds: ['r-design'] })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(g.canSeeChannel('g-launch', r.value.id, 'thao-linh')).toBe(true)
    expect(g.canSeeChannel('g-launch', r.value.id, 'huy-nguyen')).toBe(false)
  })

  it('kênh thoại không bật AI; xoá kênh xoá luôn tin nhắn', () => {
    FEATURES.voice = true
    const v = g.createChannel('g-launch', { name: 'Phòng 2', type: 'voice', categoryId: 'cat-voice' })
    expect(v.ok && v.value.aiAccess).toBe(false)
    expect(g.deleteChannel('g-launch', 'c-design').ok).toBe(true)
    expect(g.messages.value.some((m) => m.channelId === 'c-design')).toBe(false)
  })
})

describe('Tin nhắn', () => {
  it('gửi tin, đánh dấu đã đọc, trả lời và luồng', () => {
    const r = g.sendMessage('g-launch', 'c-general', 'Xin chào @Anh Minh')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const reply = g.sendMessage('g-launch', 'c-general', 'Trả lời', { replyToId: r.value.id })
    expect(reply.ok && reply.value.replyToId).toBe(r.value.id)
    const t = g.sendMessage('g-launch', 'c-general', 'Trong luồng', { threadParentId: r.value.id })
    expect(t.ok).toBe(true)
    expect(g.threadReplies(r.value.id)).toHaveLength(1)
    expect(g.channelMessages('c-general').some((m) => m.text === 'Trong luồng')).toBe(false)
  })

  it('từ chối tin trống, tin chứa từ bị chặn, liên kết khi bị chặn', () => {
    expect(g.sendMessage('g-launch', 'c-general', '   ').ok).toBe(false)
    const blocked = g.sendMessage('g-launch', 'c-general', 'đây là SPAM')
    expect(blocked.ok).toBe(false)
    g.updateAutomod('g-launch', { blockLinks: true })
    expect(g.sendMessage('g-launch', 'c-general', 'xem https://example.com').ok).toBe(false)
    g.updateAutomod('g-launch', { enabled: false })
    expect(g.sendMessage('g-launch', 'c-general', 'spam https://example.com').ok).toBe(true)
  })

  it('thành viên không có quyền thì không được @everyone, không đăng được kênh thông báo', () => {
    const nGeneral = g.visibleChannels('g-nt106').find((c) => c.name === 'chung')!
    const r = g.sendMessage('g-nt106', nGeneral.id, '@everyone họp nhé')
    expect(r.ok).toBe(false)
    expect(g.sendMessage('g-launch', 'c-announce', '@everyone thông báo').ok).toBe(true) // chủ nhóm được phép
  })

  it('tách mention để hiển thị và nhận ra mention của mình', () => {
    const parts = g.splitMentions('g-launch', 'Chào @Anh Minh và @Thiết kế, cả @everyone')
    expect(parts.filter((p) => p.mention).map((p) => p.text)).toEqual(['@Anh Minh', '@Thiết kế', '@everyone'])
    expect(parts.find((p) => p.text === '@everyone')?.me).toBe(true)
    expect(parts.find((p) => p.text === '@Anh Minh')?.me).toBe(false)
  })

  it('reaction bật/tắt, ghim, xoá tin kèm luồng', () => {
    g.toggleReaction('m-g6', '🎉')
    expect(g.findMessage('m-g6')!.reactions.find((r) => r.emoji === '🎉')?.userIds).toEqual([ME])
    g.toggleReaction('m-g6', '🎉')
    expect(g.findMessage('m-g6')!.reactions.some((r) => r.emoji === '🎉')).toBe(false)
    expect(g.togglePin('m-g6')).toEqual({ ok: true, value: true })
    expect(g.pinnedMessages('c-general').map((m) => m.id)).toContain('m-g6')
    expect(g.deleteMessage('m-g4').ok).toBe(true)
    expect(g.threadReplies('m-g4')).toHaveLength(0)
  })

  it('đọc kênh làm mất số chưa đọc', () => {
    const nGeneral = g.visibleChannels('g-nt106').find((c) => c.name === 'chung')!
    expect(g.unreadCount(nGeneral.id)).toBe(2)
    g.markRead(nGeneral.id)
    expect(g.unreadCount(nGeneral.id)).toBe(0)
    expect(g.groupUnread('g-nt106').count).toBe(1)
  })

  it('bị tạm khoá thì không gửi được tin; quản trị tạm khoá/gỡ khoá người khác', () => {
    const nGeneral = g.visibleChannels('g-nt106').find((c) => c.name === 'chung')!
    g.member('g-nt106', ME)!.timeoutUntil = new Date(Date.now() + 60_000).toISOString()
    expect(g.canPost('g-nt106', nGeneral.id).ok).toBe(false)
    expect(g.sendMessage('g-nt106', nGeneral.id, 'xin chào')).toMatchObject({ ok: false, error: expect.stringContaining('tạm khoá') })
    g.member('g-nt106', ME)!.timeoutUntil = null
    expect(g.sendMessage('g-nt106', nGeneral.id, 'xin chào').ok).toBe(true)

    g.timeoutMember('g-launch', 'huy-nguyen', 10)
    expect(g.isTimedOutIn('g-launch', 'huy-nguyen')).toBe(true)
    g.timeoutMember('g-launch', 'huy-nguyen', 0)
    expect(g.isTimedOutIn('g-launch', 'huy-nguyen')).toBe(false)
  })
})

describe('Trợ lý AI', () => {
  it('trả lời bằng kế hoạch khi được nhắc, và tạo công việc từ kế hoạch', () => {
    vi.useFakeTimers()
    const { tasks } = useWorkspace()
    const before = tasks.value.length
    const r = g.sendMessage('g-launch', 'c-general', '@Trợ lý AI lập kế hoạch cho buổi demo')
    expect(r.ok).toBe(true)
    expect(g.typing.value['c-general']).toContain(AI_BOT_ID)
    vi.advanceTimersByTime(1000)
    expect(g.typing.value['c-general']).not.toContain(AI_BOT_ID)
    const reply = g.channelMessages('c-general').at(-1)!
    expect(reply.authorId).toBe(AI_BOT_ID)
    expect(reply.embed?.type).toBe('plan')
    if (reply.embed?.type !== 'plan') return
    expect(reply.embed.title).toBe('Kế hoạch: buổi demo')
    expect(reply.embed.items).toHaveLength(3)

    const created = g.createPlanTasks(reply.id)
    expect(created).toEqual({ ok: true, value: 3 })
    expect(tasks.value.length).toBe(before + 3)
    expect(tasks.value.slice(-3).every((t) => t.projectId === 'launch' && t.status === 'todo')).toBe(true)
    expect(g.createPlanTasks(reply.id).ok).toBe(false) // không tạo trùng
  })

  it('kênh AI tự trả lời không cần nhắc; tóm tắt kênh', () => {
    vi.useFakeTimers()
    g.sendMessage('g-launch', 'c-ai', 'tóm tắt giúp mình')
    vi.advanceTimersByTime(1000)
    const reply = g.channelMessages('c-ai').at(-1)!
    expect(reply.authorId).toBe(AI_BOT_ID)
    expect(reply.text).toMatch(/#kế-hoạch-ai/)
  })

  it('không trả lời trong kênh đã tắt AI', () => {
    vi.useFakeTimers()
    g.sendMessage('g-launch', 'c-rules', '@Trợ lý AI chào')
    vi.advanceTimersByTime(1000)
    expect(g.channelMessages('c-rules').at(-1)!.authorId).toBe(ME)
  })
})

describe('Vai trò', () => {
  it('tạo vai trò mới nằm ngay trên @everyone, sửa, đổi thứ tự, xoá', () => {
    const r = g.createRole('g-launch', { name: 'QA', color: '#5ccfe6' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const roles = () => g.group('g-launch')!.roles.map((x) => x.name)
    expect(roles().slice(-2)).toEqual(['QA', '@everyone'])

    expect(g.updateRole('g-launch', r.value.id, { name: 'Kiểm thử', permissions: ['VIEW_CHANNELS', 'EDIT_TASKS'] }).ok).toBe(true)
    expect(roles()).toContain('Kiểm thử')

    expect(g.moveRole('g-launch', r.value.id, -1).ok).toBe(true)
    expect(roles().slice(-3)).toEqual(['Kiểm thử', 'Bot AI', '@everyone'])
    expect(g.moveRole('g-launch', r.value.id, 1).ok).toBe(true)
    expect(g.moveRole('g-launch', r.value.id, 1).ok).toBe(false) // không vượt @everyone

    g.toggleMemberRole('g-launch', 'thu-ha', r.value.id)
    expect(g.memberRoles('g-launch', 'thu-ha').map((x) => x.name)).toContain('Kiểm thử')
    expect(g.deleteRole('g-launch', r.value.id).ok).toBe(true)
    expect(g.member('g-launch', 'thu-ha')!.roleIds).not.toContain(r.value.id)
  })

  it('không xoá/gán được vai trò hệ thống, không đổi tên @everyone', () => {
    expect(g.deleteRole('g-launch', 'r-everyone').ok).toBe(false)
    expect(g.deleteRole('g-launch', 'r-bot').ok).toBe(false)
    expect(g.toggleMemberRole('g-launch', 'thu-ha', 'r-bot').ok).toBe(false)
    expect(g.updateRole('g-launch', 'r-everyone', { name: 'Mọi người' }).ok).toBe(false)
  })

  it('thứ bậc: chỉ quản lý được vai trò thấp hơn vai trò cao nhất của mình', () => {
    const nt = g.group('g-nt106')!
    const [adminRole, memberRole] = nt.roles
    expect(g.canManageRole('g-nt106', memberRole.id)).toBe(false) // chưa có MANAGE_ROLES
    memberRole.permissions.push('MANAGE_ROLES') // cấp quyền cho vai trò của mình
    expect(g.canManageRole('g-nt106', adminRole.id)).toBe(false) // cao hơn
    expect(g.canManageRole('g-nt106', memberRole.id)).toBe(false) // ngang hàng
    const created = g.createRole('g-nt106', { name: 'Thực tập' })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(g.canManageRole('g-nt106', created.value.id)).toBe(true) // thấp hơn
    expect(g.moveRole('g-nt106', created.value.id, -1).ok).toBe(true) // đổi chỗ với Bot AI (vẫn thấp hơn mình)
    expect(g.moveRole('g-nt106', created.value.id, -1).ok).toBe(false) // không được vượt lên ngang vai trò của mình
    expect(g.updateRole('g-nt106', created.value.id, { permissions: ['ADMINISTRATOR'] }).ok).toBe(false)
    expect(g.toggleMemberRole('g-nt106', 'huy-nguyen', adminRole.id).ok).toBe(false)
    expect(g.toggleMemberRole('g-nt106', 'huy-nguyen', created.value.id).ok).toBe(true)
  })
})

describe('Thành viên & lời mời', () => {
  it('mời ra, cấm, gỡ cấm; không thao tác được với chủ nhóm và chính mình', () => {
    expect(g.canModerate('g-launch', ME)).toBe(false)
    expect(g.kickMember('g-launch', 'quoc-bao').ok).toBe(true)
    expect(g.member('g-launch', 'quoc-bao')).toBeUndefined()
    expect(g.banMember('g-launch', 'minh-khoa', 'spam').ok).toBe(true)
    expect(g.group('g-launch')!.bans.map((b) => b.userId)).toEqual(['minh-khoa'])
    expect(g.unban('g-launch', 'minh-khoa').ok).toBe(true)
    expect(g.group('g-launch')!.bans).toHaveLength(0)
    expect(g.kickMember('g-nt106', 'anh-minh').ok).toBe(false) // chủ nhóm NT106
  })

  it('biệt danh hiển thị thay tên', () => {
    g.setNickname('g-launch', 'anh-minh', 'Minh Lead')
    expect(g.displayName('g-launch', 'anh-minh')).toBe('Minh Lead')
    g.setNickname('g-launch', 'anh-minh', '')
    expect(g.displayName('g-launch', 'anh-minh')).toBe('Anh Minh')
  })

  it('thêm thành viên, tạo/thu hồi mã mời, tham gia bằng mã', () => {
    expect(g.addMembers('g-design', ['huy-nguyen', 'thao-linh'])).toEqual({ ok: true, value: 1 })
    const code = g.createInvite('g-design', { hours: 24, maxUses: null })
    expect(code.ok).toBe(true)
    if (!code.ok) return
    expect(g.joinByCode(code.value)).toMatchObject({ ok: false })
    expect(g.revokeInvite('g-design', code.value).ok).toBe(true)

    const joined = g.joinByCode(' taskflow.app/invite/uit-code ')
    expect(joined.ok).toBe(true)
    if (!joined.ok) return
    expect(joined.value.name).toBe('CLB Lập trình UIT')
    expect(g.member(joined.value.id, ME)?.joinedVia).toBe('code')
    expect(g.can(joined.value.id, 'MANAGE_CHANNELS')).toBe(false)
    expect(g.joinByCode('UIT-CODE').ok).toBe(false)
    expect(g.joinByCode('KHONG-TON-TAI').ok).toBe(false)
  })

  it('rời nhóm / xoá nhóm', () => {
    expect(g.leaveGroup('g-launch').ok).toBe(false) // chủ nhóm
    expect(g.leaveGroup('g-nt106').ok).toBe(true)
    expect(g.group('g-nt106')).toBeUndefined()
    expect(g.deleteGroup('g-personal').ok).toBe(true)
    expect(g.groups.value).toHaveLength(2)
  })
})

describe('Tạo nhóm, thoại, lưu trữ', () => {
  it('tạo nhóm theo mẫu với thành viên đã chọn + bot AI', () => {
    const r = g.createGroup({ name: 'Nhóm học', template: 'study', memberIds: ['thu-ha', 'lan-anh', ME] })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.members.map((m) => m.userId)).toEqual([ME, 'thu-ha', 'lan-anh', AI_BOT_ID])
    expect(r.value.channels.map((c) => c.name)).toEqual(['chung', 'tài-liệu', 'bài-tập', 'Học nhóm'])
    expect(g.createGroup({ name: '  ' }).ok).toBe(false)
  })

  it('thoại là tính năng mở rộng: mặc định tắt, không tham gia / tạo kênh thoại được', () => {
    expect(FEATURES.voice).toBe(false)
    const j = g.joinVoice('g-launch', 'c-voice-meet')
    expect(j.ok).toBe(false)
    expect(!j.ok && j.error).toBe(VOICE_SOON_MESSAGE)
    expect(g.voice.value).toBeNull()
    expect(g.voiceParticipants('g-launch', 'c-voice-meet')).toEqual([])
    const c = g.createChannel('g-launch', { name: 'Phòng 3', type: 'voice', categoryId: 'cat-voice' })
    expect(!c.ok && c.error).toBe(VOICE_SOON_MESSAGE)
    // Kênh văn bản vẫn tạo bình thường
    expect(g.createChannel('g-launch', { name: 'vẫn-ổn', type: 'text', categoryId: null }).ok).toBe(true)
  })

  it('thoại (khi bật lại FEATURES.voice): tham gia, tắt mic, tắt nghe kéo theo tắt mic, rời', () => {
    FEATURES.voice = true
    expect(g.joinVoice('g-launch', 'c-voice-meet').ok).toBe(true)
    expect(g.voiceParticipants('g-launch', 'c-voice-meet')).toEqual([ME, 'anh-minh', 'huy-nguyen'])
    g.toggleVoice('deafened')
    expect(g.voice.value).toMatchObject({ muted: true, deafened: true })
    g.leaveVoice()
    expect(g.voice.value).toBeNull()
    expect(g.joinVoice('g-launch', 'c-general').ok).toBe(false) // không phải kênh thoại
  })

  it('lưu localStorage theo người dùng', () => {
    g.createChannel('g-launch', { name: 'lưu-trữ', type: 'text', categoryId: null })
    const saved = JSON.parse(localStorage.getItem(`taskflow:groups:${ME}`)!)
    expect(saved.groups[0].channels.some((c: { name: string }) => c.name === 'lưu-trữ')).toBe(true)
  })
})
