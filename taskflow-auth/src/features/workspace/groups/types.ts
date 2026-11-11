import type { IconName } from '@/shared/components/AppIcon.vue'

/** Quyền trong nhóm. ADMINISTRATOR bao gồm mọi quyền khác. */
export const PERMISSIONS = [
  'VIEW_CHANNELS',
  'MANAGE_CHANNELS',
  'MANAGE_ROLES',
  'MANAGE_MEMBERS',
  'SEND_MESSAGES',
  'ATTACH_FILES',
  'MENTION_EVERYONE',
  'VIEW_TASKS',
  'EDIT_TASKS',
  'ASSIGN_TASKS',
  'DELETE_TASKS',
  'JOIN_VOICE',
  'USE_AI',
  'ADMINISTRATOR',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export type PresenceStatus = 'online' | 'idle' | 'dnd' | 'offline'

/** Người dùng trong danh bạ (bạn bè, đồng nghiệp, bot). */
export interface Person {
  id: string
  name: string
  username: string
  color: string
  status: PresenceStatus
  /** Dòng trạng thái tuỳ chỉnh, ví dụ "Đang thiết kế màn hình chat" */
  activity?: string
  bot?: boolean
  avatar?: string | null
}

export interface Role {
  id: string
  name: string
  color: string
  permissions: Permission[]
  /** Hiển thị thành viên mang vai trò này thành nhóm riêng trong danh sách */
  hoist: boolean
  mentionable: boolean
  /** Vai trò @everyone: áp dụng cho mọi thành viên, không xoá được */
  isDefault?: boolean
  /** Vai trò do hệ thống quản lý (bot), không gán thủ công */
  managed?: boolean
}

export type JoinMethod = 'owner' | 'invite' | 'calendar' | 'added' | 'code'

export interface GroupMember {
  userId: string
  roleIds: string[]
  joinedAt: string
  joinedVia: JoinMethod
  nickname?: string
  /** ISO timestamp: không thể gửi tin nhắn đến thời điểm này */
  timeoutUntil?: string | null
}

export type ChannelType = 'text' | 'voice' | 'announcement'

export interface ChannelCategory {
  id: string
  name: string
}

export interface Channel {
  id: string
  name: string
  type: ChannelType
  categoryId: string | null
  topic: string
  /** Kênh riêng tư: chỉ các vai trò trong allowedRoleIds (và quản trị) nhìn thấy */
  private: boolean
  allowedRoleIds: string[]
  /** Cho phép Trợ lý AI đọc và trả lời trong kênh */
  aiAccess: boolean
  /** Chỉ dùng cho kênh văn bản: thời gian chờ giữa hai tin (giây) */
  slowmode?: number
}

export interface Reaction {
  emoji: string
  userIds: string[]
}

export interface Attachment {
  name: string
  size: number
  kind: 'image' | 'file'
}

export interface PlanItem {
  title: string
  due: string
  priority: 'high' | 'medium' | 'low'
}

export type MessageEmbed =
  | { type: 'task'; title: string; status: string; due: string }
  | { type: 'plan'; title: string; items: PlanItem[]; createdTaskCount?: number }
  | { type: 'event'; eventId: string; title: string; date: string; start: string; end: string }

export interface Message {
  id: string
  channelId: string
  authorId: string
  at: string
  text: string
  replyToId?: string | null
  reactions: Reaction[]
  attachments: Attachment[]
  embed?: MessageEmbed | null
  /** Tin nhắn thuộc luồng (thread) của tin này */
  threadParentId?: string | null
  pinned: boolean
  edited?: boolean
  /** Tin hệ thống: "X đã tham gia nhóm" */
  system?: boolean
}

export interface Invite {
  code: string
  createdBy: string
  createdAt: string
  /** ISO timestamp, null = không hết hạn */
  expiresAt: string | null
  maxUses: number | null
  uses: number
}

export interface Ban {
  userId: string
  reason: string
  at: string
  by: string
}

export interface AuditEntry {
  id: string
  at: string
  actorId: string
  action: string
  target: string
  icon: IconName
}

export interface AutomodSettings {
  enabled: boolean
  blockedWords: string[]
  blockLinks: boolean
  maxMentions: number
}

export interface Group {
  id: string
  name: string
  /** Màu biểu tượng nhóm */
  color: string
  icon?: IconName | null
  description: string
  ownerId: string
  createdAt: string
  roles: Role[]
  members: GroupMember[]
  categories: ChannelCategory[]
  channels: Channel[]
  invites: Invite[]
  bans: Ban[]
  auditLog: AuditEntry[]
  automod: AutomodSettings
  /** Sự kiện trong Lịch đã tạo ra nhóm này */
  eventId?: string | null
  muted?: boolean
}

export interface VoiceState {
  groupId: string
  channelId: string
  muted: boolean
  deafened: boolean
  sharing: boolean
}

export type GroupTemplate = 'blank' | 'project' | 'study' | 'club'

export interface CreateGroupInput {
  name: string
  memberIds?: string[]
  template?: GroupTemplate
  color?: string
  description?: string
  eventId?: string | null
  joinedVia?: JoinMethod
}

export interface CreateChannelInput {
  name: string
  type: ChannelType
  categoryId: string | null
  topic?: string
  private?: boolean
  allowedRoleIds?: string[]
  aiAccess?: boolean
}
