import { computed, ref, watch } from 'vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import type { IconName } from '@/shared/components/AppIcon.vue'
import { normalizeText } from '@/shared/utils/text'
import { loadJSON, saveJSON } from '../composables/storage'
import { useProfile } from '../composables/useProfile'
import { useWorkspace } from '../composables/useWorkspace'
import { ensureProject, releaseProject, syncProject } from '../tasks/taskStore'
import {
  AI_BOT_ID,
  buildChannels,
  createSeed,
  defaultRoles,
  DISCOVER_GROUPS,
  GROUP_COLORS,
  isoDay,
  PEOPLE,
  uid,
  VOICE_SEED,
  type GroupsSeed,
} from './data'
import { FEATURES, VOICE_SOON_MESSAGE } from './features'
import type {
  Attachment,
  Channel,
  CreateChannelInput,
  CreateGroupInput,
  Group,
  GroupMember,
  JoinMethod,
  Message,
  MessageEmbed,
  Permission,
  Person,
  PlanItem,
  Role,
  VoiceState,
} from './types'

/* =============================================================
 * Kho dữ liệu Nhóm (singleton theo module, lưu localStorage theo từng người dùng).
 * Khi có backend: thay các hàm bên dưới bằng lời gọi API, giữ nguyên chữ ký.
 * ============================================================= */

type GroupsState = GroupsSeed

export type ActionResult<T = undefined> = { ok: true; value: T } | { ok: false; error: string }

const ok = <T>(value: T): ActionResult<T> => ({ ok: true, value })
const fail = (error: string): ActionResult<never> => ({ ok: false, error })

const state = ref<GroupsState>({ groups: [], messages: [], readState: {} })
const voice = ref<VoiceState | null>(null)
/** channelId → danh sách người đang nhập */
const typing = ref<Record<string, string[]>>({})

let loadedFor: string | null = null
let aiDelay = 900

const meId = computed(() => useAuth().user.value?.id ?? 'guest')
const storageKey = (id: string) => `taskflow:groups:${id}`

function load(id: string): void {
  if (loadedFor === id) return
  loadedFor = id
  const stored = loadJSON<GroupsState | null>(storageKey(id), null)
  state.value = stored && Array.isArray(stored.groups) ? stored : createSeed(id)
  voice.value = null
  typing.value = {}
  if (!stored) commit()
}

function commit(): void {
  if (loadedFor) saveJSON(storageKey(loadedFor), state.value)
}

watch(meId, load, { immediate: true })

/* ---------------- Tiện ích nội bộ ---------------- */

function findGroup(groupId: string): Group | undefined {
  return state.value.groups.find((g) => g.id === groupId)
}

function findMember(group: Group, userId: string): GroupMember | undefined {
  return group.members.find((m) => m.userId === userId)
}

function rolePosition(group: Group, roleId: string): number {
  const index = group.roles.findIndex((r) => r.id === roleId)
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

/** Vị trí vai trò cao nhất của thành viên (số nhỏ = cao). Chủ nhóm = -1. */
function topPosition(group: Group, userId: string): number {
  if (group.ownerId === userId) return -1
  const member = findMember(group, userId)
  if (!member) return Number.MAX_SAFE_INTEGER
  const positions = member.roleIds.map((id) => rolePosition(group, id))
  return positions.length ? Math.min(...positions) : rolePosition(group, defaultRoleOf(group)?.id ?? '')
}

function defaultRoleOf(group: Group): Role | undefined {
  return group.roles.find((r) => r.isDefault)
}

function permissionSet(group: Group, userId: string): Set<Permission> | 'all' {
  if (group.ownerId === userId) return 'all'
  const member = findMember(group, userId)
  if (!member) return new Set()
  const set = new Set<Permission>()
  const roles = group.roles.filter((r) => r.isDefault || member.roleIds.includes(r.id))
  for (const role of roles) for (const p of role.permissions) set.add(p)
  return set.has('ADMINISTRATOR') ? 'all' : set
}

function hasPerm(group: Group, userId: string, perm: Permission): boolean {
  const set = permissionSet(group, userId)
  return set === 'all' || set.has(perm)
}

function canSee(group: Group, channel: Channel, userId: string): boolean {
  const set = permissionSet(group, userId)
  if (set === 'all') return true
  if (!set.has('VIEW_CHANNELS')) return false
  if (!channel.private) return true
  const member = findMember(group, userId)
  return !!member && (set.has('MANAGE_CHANNELS') || member.roleIds.some((id) => channel.allowedRoleIds.includes(id)))
}

function isTimedOut(member: GroupMember | undefined): boolean {
  return !!member?.timeoutUntil && new Date(member.timeoutUntil).getTime() > Date.now()
}

function audit(group: Group, action: string, target: string, icon: IconName): void {
  group.auditLog.unshift({ id: uid('a'), at: new Date().toISOString(), actorId: meId.value, action, target, icon })
  group.auditLog.splice(100)
}

/** Thời điểm tin nhắn tăng nghiêm ngặt: hai tin tạo cùng mili-giây vẫn phân biệt được thứ tự đã đọc/chưa đọc. */
let lastStamp = 0
function stamp(): string {
  lastStamp = Math.max(Date.now(), lastStamp + 1)
  return new Date(lastStamp).toISOString()
}

function newMessage(channelId: string, authorId: string, text: string, extra: Partial<Message> = {}): Message {
  return {
    id: uid('m'),
    channelId,
    authorId,
    at: stamp(),
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

function firstTextChannel(group: Group): Channel | undefined {
  return group.channels.find((c) => c.type === 'text' && c.name === 'chung') ?? group.channels.find((c) => c.type === 'text')
}

/** Chuẩn hoá tên kênh văn bản: chữ thường, khoảng trắng → "-", bỏ ký tự đặc biệt. */
export function normalizeChannelName(name: string, type: Channel['type']): string {
  const trimmed = name.trim().replace(/\s+/g, ' ')
  if (type === 'voice') return trimmed.slice(0, 40)
  return trimmed
    .toLocaleLowerCase('vi')
    .replace(/^#+/, '')
    .replace(/\s/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 40)
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const stripDiacritics = normalizeText

/* ---------------- Trợ lý AI (mô phỏng) ---------------- */

const AI_MENTION = /@(trợ lý ai|ai)(?![\p{L}\p{N}])/iu

function isAIChannel(channel: Channel): boolean {
  return /(^|-)ai$/.test(channel.name)
}

function planFor(topic: string): PlanItem[] {
  return [
    { title: `Phân tích yêu cầu: ${topic}`, due: isoDay(1), priority: 'high' },
    { title: `Thực hiện: ${topic}`, due: isoDay(3), priority: 'medium' },
    { title: `Kiểm tra & tổng kết: ${topic}`, due: isoDay(5), priority: 'low' },
  ]
}

function buildAIReply(group: Group, channel: Channel, text: string): { text: string; embed: MessageEmbed | null } {
  const plain = stripDiacritics(text)
  const { tasks } = useWorkspace()
  const open = tasks.value.filter((t) => t.status !== 'done').sort((a, b) => a.due.localeCompare(b.due))

  if (/ke hoach|lap plan|plan|chia viec|phan cong/.test(plain)) {
    const raw = text.replace(AI_MENTION, '').trim()
    const match = raw.match(/kế\s*hoạch\s*(cho|về)?\s*(.+)/iu)
    const topic = (match?.[2] ?? group.name).replace(/[.?!]+$/, '').trim() || group.name
    const nearest = open[0]
    return {
      text:
        `Mình đã lập kế hoạch 3 bước cho “${topic}”.` +
        (nearest ? ` Hiện có ${open.length} việc chưa xong, gần hạn nhất là “${nearest.title}”.` : ''),
      embed: { type: 'plan', title: `Kế hoạch: ${topic}`, items: planFor(topic) },
    }
  }

  if (/tom tat|summary|tong ket/.test(plain)) {
    const today = new Date().toDateString()
    const list = state.value.messages.filter(
      (m) => m.channelId === channel.id && !m.system && m.authorId !== AI_BOT_ID && new Date(m.at).toDateString() === today,
    )
    const authors = [...new Set(list.map((m) => personOf(m.authorId).name))]
    return {
      text: list.length
        ? `Hôm nay #${channel.name} có ${list.length} tin nhắn từ ${authors.join(', ')}. Nhóm còn ${open.length} việc chưa xong.`
        : `Hôm nay #${channel.name} chưa có trao đổi nào. Nhóm còn ${open.length} việc chưa xong.`,
      embed: null,
    }
  }

  return {
    text: 'Mình đã ghi nhận! Bạn có thể nhờ mình “lập kế hoạch …” để tạo danh sách công việc, hoặc “tóm tắt kênh”.',
    embed: null,
  }
}

function scheduleAIReply(group: Group, channel: Channel, text: string, threadParentId: string | null): void {
  const channelId = channel.id
  typing.value = { ...typing.value, [channelId]: [...(typing.value[channelId] ?? []), AI_BOT_ID] }
  const ownerKey = loadedFor
  setTimeout(() => {
    typing.value = { ...typing.value, [channelId]: (typing.value[channelId] ?? []).filter((id) => id !== AI_BOT_ID) }
    // Người dùng đã đăng xuất/đổi tài khoản hoặc nhóm đã bị xoá
    if (ownerKey !== loadedFor || !findGroup(group.id)) return
    const reply = buildAIReply(group, channel, text)
    state.value.messages.push(newMessage(channelId, AI_BOT_ID, reply.text, { embed: reply.embed, threadParentId }))
    commit()
  }, aiDelay)
}

/* ---------------- Danh bạ ---------------- */

function personOf(userId: string): Person {
  if (userId === meId.value) {
    const { profile } = useProfile()
    return {
      id: userId,
      name: profile.value.displayName || 'Bạn',
      username: useAuth().user.value?.username ?? 'ban',
      color: '#7060fa',
      status: 'online',
      avatar: profile.value.avatar,
    }
  }
  return (
    PEOPLE.find((p) => p.id === userId) ?? {
      id: userId,
      name: 'Người dùng đã rời',
      username: 'unknown',
      color: '#5b6b88',
      status: 'offline',
    }
  )
}

/* =============================================================
 * API công khai
 * ============================================================= */

export function useGroups() {
  load(meId.value)

  const groups = computed(() => state.value.groups)
  const messages = computed(() => state.value.messages)

  /* ----- Truy vấn ----- */

  const group = (groupId: string) => findGroup(groupId)

  function can(groupId: string, perm: Permission, userId = meId.value): boolean {
    const g = findGroup(groupId)
    return !!g && hasPerm(g, userId, perm)
  }

  function visibleChannels(groupId: string): Channel[] {
    const g = findGroup(groupId)
    return g ? g.channels.filter((c) => canSee(g, c, meId.value)) : []
  }

  function canSeeChannel(groupId: string, channelId: string, userId = meId.value): boolean {
    const g = findGroup(groupId)
    const c = g?.channels.find((x) => x.id === channelId)
    return !!g && !!c && canSee(g, c, userId)
  }

  function member(groupId: string, userId: string): GroupMember | undefined {
    const g = findGroup(groupId)
    return g && findMember(g, userId)
  }

  /** Vai trò của thành viên, xếp từ cao xuống thấp (không gồm @everyone). */
  function memberRoles(groupId: string, userId: string): Role[] {
    const g = findGroup(groupId)
    const m = g && findMember(g, userId)
    if (!g || !m) return []
    return g.roles.filter((r) => !r.isDefault && m.roleIds.includes(r.id))
  }

  function displayName(groupId: string, userId: string): string {
    return member(groupId, userId)?.nickname || personOf(userId).name
  }

  /** Màu tên = màu vai trò cao nhất. */
  function nameColor(groupId: string, userId: string): string | null {
    return memberRoles(groupId, userId)[0]?.color ?? null
  }

  function isTimedOutIn(groupId: string, userId = meId.value): boolean {
    return isTimedOut(member(groupId, userId))
  }

  function channelMessages(channelId: string): Message[] {
    return state.value.messages.filter((m) => m.channelId === channelId && !m.threadParentId)
  }

  function threadReplies(parentId: string): Message[] {
    return state.value.messages.filter((m) => m.threadParentId === parentId)
  }

  function findMessage(messageId: string): Message | undefined {
    return state.value.messages.find((m) => m.id === messageId)
  }

  function mentionsMe(groupId: string, message: Message): boolean {
    if (message.authorId === meId.value) return false
    const text = message.text
    if (text.includes('@everyone')) return true
    if (text.includes(`@${displayName(groupId, meId.value)}`) || text.includes(`@${personOf(meId.value).name}`)) return true
    return memberRoles(groupId, meId.value).some((r) => r.mentionable && text.includes(`@${r.name}`))
  }

  function unreadIn(channelId: string): Message[] {
    const since = state.value.readState[channelId] ?? ''
    return state.value.messages.filter((m) => m.channelId === channelId && !m.threadParentId && m.authorId !== meId.value && m.at > since)
  }

  function unreadCount(channelId: string): number {
    return unreadIn(channelId).length
  }

  function groupUnread(groupId: string): { count: number; mentions: number } {
    let count = 0
    let mentions = 0
    for (const c of visibleChannels(groupId)) {
      if (c.type === 'voice') continue
      const list = unreadIn(c.id)
      count += list.length
      mentions += list.filter((m) => mentionsMe(groupId, m)).length
    }
    return { count, mentions }
  }

  const totalUnread = computed(() => state.value.groups.reduce((sum, g) => sum + (g.muted ? 0 : groupUnread(g.id).count), 0))

  function markRead(channelId: string): void {
    const latest = state.value.messages.reduce((max, m) => (m.channelId === channelId && m.at > max ? m.at : max), '')
    const now = new Date().toISOString()
    const value = latest > now ? latest : now
    if ((state.value.readState[channelId] ?? '') >= value) return
    state.value.readState[channelId] = value
    commit()
  }

  function markGroupRead(groupId: string): void {
    for (const c of visibleChannels(groupId)) markRead(c.id)
  }

  /* ----- Nhóm ----- */

  function createGroup(input: CreateGroupInput): ActionResult<Group> {
    const name = input.name.trim()
    if (!name) return fail('Vui lòng nhập tên nhóm.')
    if (name.length > 60) return fail('Tên nhóm tối đa 60 ký tự.')
    const id = uid('g')
    const roles = defaultRoles(id)
    const [adminRole, memberRole, botRole] = roles
    const { categories, channels } = buildChannels(id, input.template ?? 'project')
    const now = new Date().toISOString()
    const via: JoinMethod = input.joinedVia ?? 'added'
    const memberIds = [...new Set(input.memberIds ?? [])].filter((x) => x !== meId.value && x !== AI_BOT_ID)

    const g: Group = {
      id,
      name,
      color: input.color ?? GROUP_COLORS[state.value.groups.length % GROUP_COLORS.length],
      icon: null,
      description: input.description?.trim() ?? '',
      ownerId: meId.value,
      createdAt: now,
      roles,
      categories,
      channels,
      members: [
        { userId: meId.value, roleIds: [adminRole.id], joinedAt: now, joinedVia: 'owner', timeoutUntil: null },
        ...memberIds.map((userId) => ({ userId, roleIds: [memberRole.id], joinedAt: now, joinedVia: via, timeoutUntil: null })),
        { userId: AI_BOT_ID, roleIds: [botRole.id], joinedAt: now, joinedVia: 'added' as const, timeoutUntil: null },
      ],
      invites: [],
      bans: [],
      auditLog: [],
      automod: { enabled: true, blockedWords: [], blockLinks: false, maxMentions: 5 },
      eventId: input.eventId ?? null,
      muted: false,
    }
    audit(g, 'đã tạo nhóm', name, 'sparkles')
    state.value.groups.push(g)
    // Mỗi nhóm có một dự án tương ứng bên mục Công việc
    ensureProject(g)

    const welcome = firstTextChannel(g)
    if (welcome) {
      const names = memberIds.map((x) => personOf(x).name)
      const text = input.eventId
        ? `Nhóm được tạo từ sự kiện trong Lịch với ${names.length} thành viên${names.length ? `: ${names.join(', ')}` : ''}.`
        : `${personOf(meId.value).name} đã tạo nhóm${names.length ? ` và thêm ${names.join(', ')}` : ''}.`
      const msg = newMessage(welcome.id, meId.value, text, { system: true })
      state.value.messages.push(msg)
      // Tin hệ thống của chính mình coi như đã đọc; tin đến sau (vd. thẻ sự kiện) vẫn là chưa đọc
      state.value.readState[welcome.id] = msg.at
    }
    commit()
    return ok(g)
  }

  function updateGroup(groupId: string, patch: Partial<Pick<Group, 'name' | 'description' | 'color' | 'muted'>>): ActionResult<Group> {
    const g = findGroup(groupId)
    if (!g) return fail('Không tìm thấy nhóm.')
    const settingsChange = patch.name !== undefined || patch.description !== undefined || patch.color !== undefined
    if (settingsChange && !hasPerm(g, meId.value, 'ADMINISTRATOR')) return fail('Bạn không có quyền sửa nhóm.')
    if (patch.name !== undefined) {
      const name = patch.name.trim()
      if (!name) return fail('Vui lòng nhập tên nhóm.')
      if (name !== g.name) audit(g, 'đã đổi tên nhóm thành', name, 'pencil')
      g.name = name
    }
    if (patch.description !== undefined) g.description = patch.description.trim()
    if (patch.color !== undefined) g.color = patch.color
    if (patch.muted !== undefined) g.muted = patch.muted
    if (settingsChange) syncProject(g.id, { name: g.name, color: g.color })
    commit()
    return ok(g)
  }

  function deleteGroup(groupId: string): ActionResult<null> {
    const g = findGroup(groupId)
    if (!g) return fail('Không tìm thấy nhóm.')
    if (g.ownerId !== meId.value) return fail('Chỉ chủ nhóm mới xoá được nhóm.')
    const channelIds = new Set(g.channels.map((c) => c.id))
    state.value.groups = state.value.groups.filter((x) => x.id !== groupId)
    state.value.messages = state.value.messages.filter((m) => !channelIds.has(m.channelId))
    if (voice.value?.groupId === groupId) voice.value = null
    releaseProject(groupId)
    commit()
    return ok(null)
  }

  function leaveGroup(groupId: string): ActionResult<null> {
    const g = findGroup(groupId)
    if (!g) return fail('Không tìm thấy nhóm.')
    if (g.ownerId === meId.value) return fail('Chủ nhóm không thể rời nhóm. Hãy xoá nhóm hoặc chuyển quyền sở hữu.')
    state.value.groups = state.value.groups.filter((x) => x.id !== groupId)
    if (voice.value?.groupId === groupId) voice.value = null
    releaseProject(groupId)
    commit()
    return ok(null)
  }

  /** Tham gia bằng mã mời: mã của nhóm khám phá hoặc mã do nhóm hiện có tạo ra. */
  function joinByCode(rawCode: string): ActionResult<Group> {
    const code = rawCode.trim().toUpperCase().replace(/^.*\//, '')
    if (!code) return fail('Vui lòng nhập mã mời.')
    const own = state.value.groups.find((g) => g.invites.some((i) => i.code === code))
    if (own) return fail(`Bạn đã là thành viên của “${own.name}”.`)
    const target = DISCOVER_GROUPS.find((d) => d.code === code)
    if (!target) return fail('Mã mời không hợp lệ hoặc đã hết hạn.')
    const id = `g-${target.code.toLowerCase()}`
    const existing = findGroup(id)
    if (existing) return fail(`Bạn đã là thành viên của “${existing.name}”.`)

    const roles = defaultRoles(id)
    const { categories, channels } = buildChannels(id, target.template)
    const now = new Date().toISOString()
    const [owner, ...rest] = target.memberIds
    const g: Group = {
      id,
      name: target.name,
      color: target.color,
      icon: null,
      description: target.description,
      ownerId: owner,
      createdAt: now,
      roles,
      categories,
      channels,
      members: [
        { userId: owner, roleIds: [roles[0].id], joinedAt: now, joinedVia: 'owner', timeoutUntil: null },
        ...rest.map((userId) => ({ userId, roleIds: [roles[1].id], joinedAt: now, joinedVia: 'invite' as const, timeoutUntil: null })),
        { userId: meId.value, roleIds: [], joinedAt: now, joinedVia: 'code', timeoutUntil: null },
        { userId: AI_BOT_ID, roleIds: [roles[2].id], joinedAt: now, joinedVia: 'added', timeoutUntil: null },
      ],
      invites: [],
      bans: [],
      auditLog: [],
      automod: { enabled: true, blockedWords: [], blockLinks: true, maxMentions: 5 },
      eventId: null,
      muted: false,
    }
    state.value.groups.push(g)
    ensureProject(g)
    const welcome = firstTextChannel(g)
    if (welcome) {
      const msg = newMessage(welcome.id, meId.value, `${personOf(meId.value).name} đã tham gia nhóm bằng mã mời.`, { system: true })
      state.value.messages.push(msg)
      state.value.readState[welcome.id] = msg.at
    }
    commit()
    return ok(g)
  }

  /* ----- Kênh ----- */

  function createChannel(groupId: string, input: CreateChannelInput): ActionResult<Channel> {
    const g = findGroup(groupId)
    if (!g) return fail('Không tìm thấy nhóm.')
    if (!hasPerm(g, meId.value, 'MANAGE_CHANNELS')) return fail('Bạn không có quyền tạo kênh.')
    if (input.type === 'voice' && !FEATURES.voice) return fail(VOICE_SOON_MESSAGE)
    const name = normalizeChannelName(input.name, input.type)
    if (!name) return fail('Vui lòng nhập tên kênh hợp lệ.')
    if (g.channels.some((c) => c.name === name && c.type === input.type)) return fail('Đã có kênh trùng tên.')
    const categoryId = input.categoryId && g.categories.some((c) => c.id === input.categoryId) ? input.categoryId : null
    const channel: Channel = {
      id: uid('c'),
      name,
      type: input.type,
      categoryId,
      topic: input.topic?.trim() ?? '',
      private: !!input.private,
      allowedRoleIds: input.private ? [...(input.allowedRoleIds ?? [])] : [],
      aiAccess: input.type !== 'voice' && (input.aiAccess ?? true),
    }
    // Chèn sau kênh cuối cùng của danh mục để giữ thứ tự hiển thị
    const lastIndex = g.channels.map((c) => c.categoryId).lastIndexOf(categoryId)
    g.channels.splice(lastIndex === -1 ? g.channels.length : lastIndex + 1, 0, channel)
    audit(g, 'đã tạo kênh', channel.type === 'voice' ? channel.name : `#${channel.name}`, channel.type === 'voice' ? 'volume' : 'hash')
    state.value.readState[channel.id] = new Date().toISOString()
    commit()
    return ok(channel)
  }

  function updateChannel(groupId: string, channelId: string, patch: Partial<Omit<Channel, 'id' | 'type'>>): ActionResult<Channel> {
    const g = findGroup(groupId)
    const c = g?.channels.find((x) => x.id === channelId)
    if (!g || !c) return fail('Không tìm thấy kênh.')
    if (!hasPerm(g, meId.value, 'MANAGE_CHANNELS')) return fail('Bạn không có quyền sửa kênh.')
    if (patch.name !== undefined) {
      const name = normalizeChannelName(patch.name, c.type)
      if (!name) return fail('Vui lòng nhập tên kênh hợp lệ.')
      patch = { ...patch, name }
    }
    Object.assign(c, patch)
    if (!c.private) c.allowedRoleIds = []
    audit(g, 'đã cập nhật kênh', c.type === 'voice' ? c.name : `#${c.name}`, 'settings')
    commit()
    return ok(c)
  }

  function deleteChannel(groupId: string, channelId: string): ActionResult<null> {
    const g = findGroup(groupId)
    const c = g?.channels.find((x) => x.id === channelId)
    if (!g || !c) return fail('Không tìm thấy kênh.')
    if (!hasPerm(g, meId.value, 'MANAGE_CHANNELS')) return fail('Bạn không có quyền xoá kênh.')
    if (g.channels.filter((x) => x.type !== 'voice').length <= 1 && c.type !== 'voice') return fail('Nhóm cần ít nhất một kênh văn bản.')
    g.channels = g.channels.filter((x) => x.id !== channelId)
    state.value.messages = state.value.messages.filter((m) => m.channelId !== channelId)
    if (voice.value?.channelId === channelId) voice.value = null
    audit(g, 'đã xoá kênh', c.type === 'voice' ? c.name : `#${c.name}`, 'trash')
    commit()
    return ok(null)
  }

  function createCategory(groupId: string, name: string): ActionResult<string> {
    const g = findGroup(groupId)
    if (!g) return fail('Không tìm thấy nhóm.')
    if (!hasPerm(g, meId.value, 'MANAGE_CHANNELS')) return fail('Bạn không có quyền tạo danh mục.')
    const clean = name.trim()
    if (!clean) return fail('Vui lòng nhập tên danh mục.')
    const id = uid('cat')
    g.categories.push({ id, name: clean })
    commit()
    return ok(id)
  }

  /* ----- Tin nhắn ----- */

  interface SendOptions {
    replyToId?: string | null
    threadParentId?: string | null
    attachments?: Attachment[]
  }

  function canPost(groupId: string, channelId: string): ActionResult<null> {
    const g = findGroup(groupId)
    const c = g?.channels.find((x) => x.id === channelId)
    if (!g || !c) return fail('Không tìm thấy kênh.')
    const me = findMember(g, meId.value)
    if (!me) return fail('Bạn không còn là thành viên của nhóm.')
    if (!canSee(g, c, meId.value)) return fail('Bạn không có quyền xem kênh này.')
    if (isTimedOut(me)) return fail('Bạn đang bị tạm khoá chat trong nhóm này.')
    if (!hasPerm(g, meId.value, 'SEND_MESSAGES')) return fail('Bạn không có quyền gửi tin nhắn.')
    if (c.type === 'announcement' && !hasPerm(g, meId.value, 'MANAGE_CHANNELS')) return fail('Chỉ người quản lý kênh mới đăng được thông báo.')
    return ok(null)
  }

  function sendMessage(groupId: string, channelId: string, rawText: string, opts: SendOptions = {}): ActionResult<Message> {
    const allowed = canPost(groupId, channelId)
    if (!allowed.ok) return allowed
    const g = findGroup(groupId)!
    const c = g.channels.find((x) => x.id === channelId)!
    const text = rawText.trim()
    const attachments = opts.attachments ?? []
    if (!text && !attachments.length) return fail('Tin nhắn trống.')
    if (text.length > 2000) return fail('Tin nhắn tối đa 2000 ký tự.')
    if (attachments.length && !hasPerm(g, meId.value, 'ATTACH_FILES')) return fail('Bạn không có quyền đính kèm tệp.')
    if (text.includes('@everyone') && !hasPerm(g, meId.value, 'MENTION_EVERYONE')) return fail('Bạn không có quyền nhắc @everyone.')

    // Tự động kiểm duyệt
    const mod = g.automod
    if (mod.enabled) {
      const lower = text.toLocaleLowerCase('vi')
      const word = mod.blockedWords.find((w) => w && lower.includes(w.toLocaleLowerCase('vi')))
      if (word) return fail(`Tin nhắn bị chặn bởi bộ lọc: chứa từ “${word}”.`)
      if (mod.blockLinks && /(https?:\/\/|www\.)\S+/i.test(text)) return fail('Nhóm này không cho phép gửi liên kết.')
      const mentionCount = (text.match(/@\S/g) ?? []).length
      if (mentionCount > mod.maxMentions) return fail(`Tối đa ${mod.maxMentions} lượt nhắc trong một tin.`)
    }

    const message = newMessage(channelId, meId.value, text, {
      replyToId: opts.replyToId ?? null,
      threadParentId: opts.threadParentId ?? null,
      attachments,
    })
    state.value.messages.push(message)
    markRead(channelId)
    commit()

    const aiMember = findMember(g, AI_BOT_ID)
    if (aiMember && c.aiAccess && hasPerm(g, meId.value, 'USE_AI') && (AI_MENTION.test(text) || isAIChannel(c))) {
      scheduleAIReply(g, c, text, opts.threadParentId ?? null)
    }
    return ok(message)
  }

  function editMessage(messageId: string, text: string): ActionResult<Message> {
    const m = findMessage(messageId)
    if (!m) return fail('Không tìm thấy tin nhắn.')
    if (m.authorId !== meId.value) return fail('Bạn chỉ sửa được tin của mình.')
    const clean = text.trim()
    if (!clean) return fail('Tin nhắn trống.')
    m.text = clean
    m.edited = true
    commit()
    return ok(m)
  }

  function groupOfChannel(channelId: string): Group | undefined {
    return state.value.groups.find((g) => g.channels.some((c) => c.id === channelId))
  }

  function canModerateMessage(message: Message): boolean {
    const g = groupOfChannel(message.channelId)
    return message.authorId === meId.value || (!!g && hasPerm(g, meId.value, 'MANAGE_CHANNELS'))
  }

  function deleteMessage(messageId: string): ActionResult<null> {
    const m = findMessage(messageId)
    if (!m) return fail('Không tìm thấy tin nhắn.')
    if (!canModerateMessage(m)) return fail('Bạn không có quyền xoá tin nhắn này.')
    state.value.messages = state.value.messages.filter((x) => x.id !== messageId && x.threadParentId !== messageId)
    commit()
    return ok(null)
  }

  function togglePin(messageId: string): ActionResult<boolean> {
    const m = findMessage(messageId)
    if (!m) return fail('Không tìm thấy tin nhắn.')
    if (!canModerateMessage(m)) return fail('Bạn không có quyền ghim tin nhắn này.')
    m.pinned = !m.pinned
    commit()
    return ok(m.pinned)
  }

  function toggleReaction(messageId: string, emoji: string): void {
    const m = findMessage(messageId)
    if (!m) return
    const reaction = m.reactions.find((r) => r.emoji === emoji)
    if (!reaction) m.reactions.push({ emoji, userIds: [meId.value] })
    else if (reaction.userIds.includes(meId.value)) {
      reaction.userIds = reaction.userIds.filter((x) => x !== meId.value)
      if (!reaction.userIds.length) m.reactions = m.reactions.filter((r) => r !== reaction)
    } else reaction.userIds.push(meId.value)
    commit()
  }

  function pinnedMessages(channelId: string): Message[] {
    return state.value.messages.filter((m) => m.channelId === channelId && m.pinned)
  }

  /** Biến kế hoạch của AI thành công việc thật trong mục Công việc. */
  function createPlanTasks(messageId: string): ActionResult<number> {
    const m = findMessage(messageId)
    if (!m || m.embed?.type !== 'plan') return fail('Không tìm thấy kế hoạch.')
    if (m.embed.createdTaskCount) return fail('Kế hoạch này đã được tạo công việc.')
    const g = groupOfChannel(m.channelId)
    if (!g || !hasPerm(g, meId.value, 'EDIT_TASKS')) return fail('Bạn không có quyền tạo công việc.')
    const { addTask } = useWorkspace()
    const projectId = ensureProject(g).id
    for (const item of m.embed.items) addTask({ title: item.title, projectId, priority: item.priority, due: item.due, assigneeId: null })
    m.embed.createdTaskCount = m.embed.items.length
    audit(g, 'đã tạo công việc từ kế hoạch AI', m.embed.title, 'check-square')
    commit()
    return ok(m.embed.items.length)
  }

  /** Đăng thẻ sự kiện (từ Lịch) vào kênh chung của nhóm. */
  function postEventCard(groupId: string, event: { id: string; title: string; date: string; start: string; end: string }): void {
    const g = findGroup(groupId)
    const c = g && firstTextChannel(g)
    if (!c) return
    state.value.messages.push(
      newMessage(c.id, AI_BOT_ID, 'Sự kiện mới đã được thêm vào Lịch của nhóm:', {
        embed: { type: 'event', eventId: event.id, title: event.title, date: event.date, start: event.start, end: event.end },
      }),
    )
    commit()
  }

  /** Gửi thẻ công việc (từ mục Công việc) vào kênh chung của nhóm. Trả về kênh đã gửi. */
  function postTaskCard(groupId: string, card: { title: string; status: string; due: string; note?: string }): ActionResult<Channel> {
    const g = findGroup(groupId)
    const c = g && firstTextChannel(g)
    if (!g || !c) return fail('Nhóm không có kênh văn bản để gửi.')
    if (!hasPerm(g, meId.value, 'SEND_MESSAGES') || isTimedOut(findMember(g, meId.value))) return fail('Bạn không có quyền gửi tin trong nhóm này.')
    const msg = newMessage(c.id, meId.value, card.note ?? 'Mình chia sẻ công việc này với nhóm:', {
      embed: { type: 'task', title: card.title, status: card.status, due: card.due },
    })
    state.value.messages.push(msg)
    state.value.readState[c.id] = msg.at
    commit()
    return ok(c)
  }

  /* ----- Vai trò ----- */

  /** Có thể chỉnh vai trò này không: cần MANAGE_ROLES và vai trò phải thấp hơn vai trò cao nhất của mình. */
  function canManageRole(groupId: string, roleId: string): boolean {
    const g = findGroup(groupId)
    if (!g || !hasPerm(g, meId.value, 'MANAGE_ROLES')) return false
    return rolePosition(g, roleId) > topPosition(g, meId.value)
  }

  function createRole(groupId: string, input: Partial<Pick<Role, 'name' | 'color' | 'permissions'>> = {}): ActionResult<Role> {
    const g = findGroup(groupId)
    if (!g) return fail('Không tìm thấy nhóm.')
    if (!hasPerm(g, meId.value, 'MANAGE_ROLES')) return fail('Bạn không có quyền tạo vai trò.')
    const role: Role = {
      id: uid('r'),
      name: input.name?.trim() || 'Vai trò mới',
      color: input.color ?? '#94a4bf',
      permissions: [...(input.permissions ?? ['VIEW_CHANNELS', 'SEND_MESSAGES'])],
      hoist: false,
      mentionable: true,
    }
    // Vai trò mới nằm ngay trên @everyone (và dưới các vai trò của bot)
    const defaultIndex = g.roles.findIndex((r) => r.isDefault)
    g.roles.splice(defaultIndex === -1 ? g.roles.length : defaultIndex, 0, role)
    audit(g, 'đã tạo vai trò', role.name, 'shield')
    commit()
    return ok(role)
  }

  function updateRole(groupId: string, roleId: string, patch: Partial<Omit<Role, 'id' | 'isDefault' | 'managed'>>): ActionResult<Role> {
    const g = findGroup(groupId)
    const role = g?.roles.find((r) => r.id === roleId)
    if (!g || !role) return fail('Không tìm thấy vai trò.')
    if (!canManageRole(groupId, roleId)) return fail('Bạn chỉ chỉnh được vai trò thấp hơn vai trò cao nhất của mình.')
    if (patch.name !== undefined) {
      const name = patch.name.trim()
      if (!name) return fail('Tên vai trò không được trống.')
      if (role.isDefault && name !== role.name) return fail('Không thể đổi tên @everyone.')
      patch = { ...patch, name }
    }
    if (patch.permissions?.includes('ADMINISTRATOR') && !hasPerm(g, meId.value, 'ADMINISTRATOR')) {
      return fail('Chỉ quản trị viên mới cấp được quyền Quản trị viên.')
    }
    Object.assign(role, patch)
    if (patch.permissions) role.permissions = [...patch.permissions]
    audit(g, 'đã cập nhật vai trò', role.name, 'shield')
    commit()
    return ok(role)
  }

  function deleteRole(groupId: string, roleId: string): ActionResult<null> {
    const g = findGroup(groupId)
    const role = g?.roles.find((r) => r.id === roleId)
    if (!g || !role) return fail('Không tìm thấy vai trò.')
    if (role.isDefault || role.managed) return fail('Không thể xoá vai trò hệ thống.')
    if (!canManageRole(groupId, roleId)) return fail('Bạn không có quyền xoá vai trò này.')
    g.roles = g.roles.filter((r) => r.id !== roleId)
    for (const m of g.members) m.roleIds = m.roleIds.filter((id) => id !== roleId)
    for (const c of g.channels) c.allowedRoleIds = c.allowedRoleIds.filter((id) => id !== roleId)
    audit(g, 'đã xoá vai trò', role.name, 'trash')
    commit()
    return ok(null)
  }

  /** Đổi thứ tự vai trò (-1: lên, +1: xuống). @everyone luôn ở cuối. */
  function moveRole(groupId: string, roleId: string, direction: -1 | 1): ActionResult<null> {
    const g = findGroup(groupId)
    if (!g) return fail('Không tìm thấy nhóm.')
    const index = g.roles.findIndex((r) => r.id === roleId)
    const target = index + direction
    const other = g.roles[target]
    if (index === -1 || !other || other.isDefault || g.roles[index].isDefault) return fail('Không thể di chuyển vai trò.')
    if (!canManageRole(groupId, roleId) || !canManageRole(groupId, other.id)) return fail('Bạn không thể vượt quá vai trò cao nhất của mình.')
    ;[g.roles[index], g.roles[target]] = [other, g.roles[index]]
    commit()
    return ok(null)
  }

  function toggleMemberRole(groupId: string, userId: string, roleId: string): ActionResult<boolean> {
    const g = findGroup(groupId)
    const m = g && findMember(g, userId)
    const role = g?.roles.find((r) => r.id === roleId)
    if (!g || !m || !role) return fail('Không tìm thấy thành viên hoặc vai trò.')
    if (role.isDefault || role.managed) return fail('Vai trò này được quản lý tự động.')
    if (!canManageRole(groupId, roleId)) return fail('Bạn không có quyền gán vai trò này.')
    const has = m.roleIds.includes(roleId)
    m.roleIds = has ? m.roleIds.filter((id) => id !== roleId) : [...m.roleIds, roleId]
    audit(g, has ? `đã gỡ vai trò ${role.name} khỏi` : `đã gán vai trò ${role.name} cho`, personOf(userId).name, 'shield')
    commit()
    return ok(!has)
  }

  /* ----- Thành viên ----- */

  /** Có thể quản lý (kick/ban/tạm khoá/biệt danh) người này không. */
  function canModerate(groupId: string, userId: string): boolean {
    const g = findGroup(groupId)
    if (!g || userId === meId.value || userId === g.ownerId || !findMember(g, userId)) return false
    if (!hasPerm(g, meId.value, 'MANAGE_MEMBERS')) return false
    return topPosition(g, userId) > topPosition(g, meId.value)
  }

  function addMembers(groupId: string, userIds: string[], via: JoinMethod = 'added'): ActionResult<number> {
    const g = findGroup(groupId)
    if (!g) return fail('Không tìm thấy nhóm.')
    if (!hasPerm(g, meId.value, 'MANAGE_MEMBERS')) return fail('Bạn không có quyền thêm thành viên.')
    const memberRole = g.roles.find((r) => r.name === 'Thành viên' && !r.isDefault)
    const now = new Date().toISOString()
    let added = 0
    for (const userId of new Set(userIds)) {
      if (findMember(g, userId) || userId === meId.value) continue
      g.bans = g.bans.filter((b) => b.userId !== userId)
      g.members.push({ userId, roleIds: memberRole ? [memberRole.id] : [], joinedAt: now, joinedVia: via, timeoutUntil: null })
      audit(g, 'đã thêm thành viên', personOf(userId).name, 'user-plus')
      added++
    }
    if (added) {
      const c = firstTextChannel(g)
      const names = userIds.filter((id) => id !== meId.value).map((id) => personOf(id).name)
      if (c) state.value.messages.push(newMessage(c.id, meId.value, `${names.join(', ')} đã được thêm vào nhóm.`, { system: true }))
    }
    commit()
    return ok(added)
  }

  function kickMember(groupId: string, userId: string): ActionResult<null> {
    const g = findGroup(groupId)
    if (!g || !canModerate(groupId, userId)) return fail('Bạn không có quyền mời thành viên này ra khỏi nhóm.')
    g.members = g.members.filter((m) => m.userId !== userId)
    audit(g, 'đã mời ra khỏi nhóm', personOf(userId).name, 'log-out')
    commit()
    return ok(null)
  }

  function banMember(groupId: string, userId: string, reason = ''): ActionResult<null> {
    const g = findGroup(groupId)
    if (!g || !canModerate(groupId, userId)) return fail('Bạn không có quyền cấm thành viên này.')
    g.members = g.members.filter((m) => m.userId !== userId)
    g.bans.push({ userId, reason: reason.trim(), at: new Date().toISOString(), by: meId.value })
    audit(g, 'đã cấm', personOf(userId).name, 'ban')
    commit()
    return ok(null)
  }

  function unban(groupId: string, userId: string): ActionResult<null> {
    const g = findGroup(groupId)
    if (!g || !hasPerm(g, meId.value, 'MANAGE_MEMBERS')) return fail('Bạn không có quyền gỡ cấm.')
    g.bans = g.bans.filter((b) => b.userId !== userId)
    audit(g, 'đã gỡ cấm', personOf(userId).name, 'check')
    commit()
    return ok(null)
  }

  /** Tạm khoá chat `minutes` phút; 0 để gỡ. */
  function timeoutMember(groupId: string, userId: string, minutes: number): ActionResult<null> {
    const g = findGroup(groupId)
    const m = g && findMember(g, userId)
    if (!g || !m || !canModerate(groupId, userId)) return fail('Bạn không có quyền tạm khoá thành viên này.')
    m.timeoutUntil = minutes > 0 ? new Date(Date.now() + minutes * 60_000).toISOString() : null
    audit(g, minutes > 0 ? `đã tạm khoá ${minutes} phút` : 'đã gỡ tạm khoá', personOf(userId).name, 'clock')
    commit()
    return ok(null)
  }

  function setNickname(groupId: string, userId: string, nickname: string): ActionResult<null> {
    const g = findGroup(groupId)
    const m = g && findMember(g, userId)
    if (!g || !m) return fail('Không tìm thấy thành viên.')
    if (userId !== meId.value && !canModerate(groupId, userId)) return fail('Bạn không có quyền đổi biệt danh người này.')
    m.nickname = nickname.trim().slice(0, 32) || undefined
    commit()
    return ok(null)
  }

  /* ----- Lời mời ----- */

  function createInvite(groupId: string, opts: { hours: number | null; maxUses: number | null }): ActionResult<string> {
    const g = findGroup(groupId)
    if (!g) return fail('Không tìm thấy nhóm.')
    if (!hasPerm(g, meId.value, 'MANAGE_MEMBERS')) return fail('Bạn không có quyền tạo lời mời.')
    const prefix = stripDiacritics(g.name).replace(/[^a-z0-9]/g, '').slice(0, 6).toUpperCase() || 'GROUP'
    const code = `${prefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    g.invites.unshift({
      code,
      createdBy: meId.value,
      createdAt: new Date().toISOString(),
      expiresAt: opts.hours ? new Date(Date.now() + opts.hours * 3_600_000).toISOString() : null,
      maxUses: opts.maxUses,
      uses: 0,
    })
    audit(g, 'đã tạo lời mời', code, 'link')
    commit()
    return ok(code)
  }

  function revokeInvite(groupId: string, code: string): ActionResult<null> {
    const g = findGroup(groupId)
    if (!g || !hasPerm(g, meId.value, 'MANAGE_MEMBERS')) return fail('Bạn không có quyền thu hồi lời mời.')
    g.invites = g.invites.filter((i) => i.code !== code)
    audit(g, 'đã thu hồi lời mời', code, 'x')
    commit()
    return ok(null)
  }

  function updateAutomod(groupId: string, patch: Partial<Group['automod']>): ActionResult<null> {
    const g = findGroup(groupId)
    if (!g || !hasPerm(g, meId.value, 'ADMINISTRATOR')) return fail('Chỉ quản trị viên mới đổi được kiểm duyệt.')
    Object.assign(g.automod, patch)
    commit()
    return ok(null)
  }

  /* ----- Thoại ----- */

  function joinVoice(groupId: string, channelId: string): ActionResult<null> {
    const g = findGroup(groupId)
    const c = g?.channels.find((x) => x.id === channelId && x.type === 'voice')
    if (!g || !c) return fail('Không tìm thấy kênh thoại.')
    if (!FEATURES.voice) return fail(VOICE_SOON_MESSAGE)
    if (!hasPerm(g, meId.value, 'JOIN_VOICE')) return fail('Bạn không có quyền tham gia kênh thoại.')
    voice.value = { groupId, channelId, muted: false, deafened: false, sharing: false }
    return ok(null)
  }

  function leaveVoice(): void {
    voice.value = null
  }

  function toggleVoice(key: 'muted' | 'deafened' | 'sharing'): void {
    if (!voice.value) return
    voice.value = { ...voice.value, [key]: !voice.value[key] }
    // Tắt nghe thì tự tắt mic
    if (key === 'deafened' && voice.value.deafened) voice.value.muted = true
  }

  function voiceParticipants(groupId: string, channelId: string): string[] {
    if (!FEATURES.voice) return []
    const g = findGroup(groupId)
    const seeded = (VOICE_SEED[channelId] ?? []).filter((id) => g && findMember(g, id))
    return voice.value?.channelId === channelId ? [meId.value, ...seeded] : seeded
  }

  /* ----- Mention ----- */

  /** Tách văn bản thành các đoạn thường/mention để hiển thị. */
  function splitMentions(groupId: string, text: string): { text: string; mention: boolean; me: boolean }[] {
    const g = findGroup(groupId)
    if (!g) return [{ text, mention: false, me: false }]
    const names = new Set<string>(['everyone', 'Trợ lý AI'])
    for (const m of g.members) {
      names.add(personOf(m.userId).name)
      if (m.nickname) names.add(m.nickname)
    }
    for (const r of g.roles) if (!r.isDefault) names.add(r.name)
    const sorted = [...names].sort((a, b) => b.length - a.length).map(escapeRegExp)
    const alternatives = sorted.join('|')
    const splitter = new RegExp(`(@(?:${alternatives}))(?![\\p{L}\\p{N}])`, 'u')
    const exact = new RegExp(`^@(?:${alternatives})$`, 'u')
    const myNames = new Set([`@${personOf(meId.value).name}`, `@${displayName(groupId, meId.value)}`, '@everyone'])
    for (const r of memberRoles(groupId, meId.value)) myNames.add(`@${r.name}`)
    // split với nhóm bắt giữ: các phần tử lẻ là mention
    return text
      .split(splitter)
      .map((part, i) => ({ text: part, mention: i % 2 === 1 && exact.test(part), me: i % 2 === 1 && myNames.has(part) }))
      .filter((part) => part.text)
  }

  return {
    meId,
    groups,
    messages,
    voice,
    typing,
    totalUnread,
    person: personOf,
    group,
    can,
    visibleChannels,
    canSeeChannel,
    member,
    memberRoles,
    displayName,
    nameColor,
    isTimedOutIn,
    channelMessages,
    threadReplies,
    findMessage,
    pinnedMessages,
    mentionsMe,
    unreadCount,
    groupUnread,
    markRead,
    markGroupRead,
    createGroup,
    updateGroup,
    deleteGroup,
    leaveGroup,
    joinByCode,
    createChannel,
    updateChannel,
    deleteChannel,
    createCategory,
    canPost,
    sendMessage,
    editMessage,
    deleteMessage,
    canModerateMessage,
    togglePin,
    toggleReaction,
    createPlanTasks,
    postEventCard,
    postTaskCard,
    canManageRole,
    createRole,
    updateRole,
    deleteRole,
    moveRole,
    toggleMemberRole,
    canModerate,
    addMembers,
    kickMember,
    banMember,
    unban,
    timeoutMember,
    setNickname,
    createInvite,
    revokeInvite,
    updateAutomod,
    joinVoice,
    leaveVoice,
    toggleVoice,
    voiceParticipants,
    splitMentions,
  }
}

/** Chỉ dùng cho kiểm thử: nạp lại dữ liệu mẫu và chỉnh độ trễ của AI. */
export function __resetGroups(options: { aiDelay?: number } = {}): void {
  loadedFor = null
  if (options.aiDelay !== undefined) aiDelay = options.aiDelay
  try {
    localStorage.removeItem(storageKey(meId.value))
  } catch {
    /* bỏ qua */
  }
  load(meId.value)
}
