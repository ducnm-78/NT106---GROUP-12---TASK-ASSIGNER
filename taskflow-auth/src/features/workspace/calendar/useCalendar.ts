import { computed, ref, watch } from 'vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import { loadJSON, saveJSON } from '../composables/storage'
import { isoDay, uid } from '../groups/data'
import { useGroups, type ActionResult } from '../groups/useGroups'

/* =============================================================
 * Lịch: sự kiện lưu theo người dùng. Tạo sự kiện kèm thành viên
 * có thể đồng thời tạo một Nhóm (Nhóm ↔ sự kiện liên kết qua id).
 * ============================================================= */

export interface CalendarEvent {
  id: string
  title: string
  /** YYYY-MM-DD */
  date: string
  /** HH:mm */
  start: string
  end: string
  color: string
  description: string
  location: string
  memberIds: string[]
  /** Nhóm được tạo cùng sự kiện */
  groupId: string | null
}

export interface EventInput {
  title: string
  date: string
  start: string
  end: string
  color?: string
  description?: string
  location?: string
  memberIds: string[]
}

export const EVENT_COLORS = ['#7060fa', '#38bdf8', '#f28fc0', '#4fd1a5', '#f5b65b', '#ff8a65']

function seedEvents(): CalendarEvent[] {
  return [
    {
      id: 'ev-pricing',
      title: 'Họp chốt bảng giá',
      date: isoDay(1),
      start: '10:00',
      end: '11:00',
      color: '#7060fa',
      description: 'Chốt 3 gói giá trước khi ra mắt.',
      location: 'Phòng họp',
      memberIds: ['anh-minh', 'mai-phuong', 'huy-nguyen'],
      groupId: 'g-launch',
    },
    {
      id: 'ev-review',
      title: 'Review thiết kế màn hình nhóm',
      date: isoDay(2),
      start: '14:00',
      end: '15:30',
      color: '#38bdf8',
      description: '',
      location: 'Online',
      memberIds: ['thao-linh', 'lan-anh'],
      groupId: 'g-design',
    },
    {
      id: 'ev-nt106',
      title: 'Nộp báo cáo giữa kỳ NT106',
      date: isoDay(4),
      start: '08:00',
      end: '09:00',
      color: '#f28fc0',
      description: '',
      location: 'UIT',
      memberIds: ['anh-minh', 'huy-nguyen', 'minh-khoa'],
      groupId: 'g-nt106',
    },
    {
      id: 'ev-gym',
      title: 'Tập luyện',
      date: isoDay(0),
      start: '18:00',
      end: '19:00',
      color: '#4fd1a5',
      description: '',
      location: '',
      memberIds: [],
      groupId: null,
    },
  ]
}

const events = ref<CalendarEvent[]>([])
let loadedFor: string | null = null
const meId = computed(() => useAuth().user.value?.id ?? 'guest')
const key = (id: string) => `taskflow:calendar:${id}`

function load(id: string): void {
  if (loadedFor === id) return
  loadedFor = id
  const stored = loadJSON<CalendarEvent[] | null>(key(id), null)
  events.value = Array.isArray(stored) ? stored : seedEvents()
}

function commit(): void {
  if (loadedFor) saveJSON(key(loadedFor), events.value)
}

watch(meId, load, { immediate: true })

function validate(input: EventInput): string | null {
  if (!input.title.trim()) return 'Vui lòng nhập tên sự kiện.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return 'Ngày không hợp lệ.'
  if (!/^\d{2}:\d{2}$/.test(input.start) || !/^\d{2}:\d{2}$/.test(input.end)) return 'Giờ không hợp lệ.'
  if (input.end <= input.start) return 'Giờ kết thúc phải sau giờ bắt đầu.'
  return null
}

export function useCalendar() {
  load(meId.value)
  const groups = useGroups()

  const sorted = computed(() =>
    [...events.value].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)),
  )

  function eventsOn(date: string): CalendarEvent[] {
    return sorted.value.filter((e) => e.date === date)
  }

  /** Sự kiện sắp tới (từ hôm nay) của một nhóm. */
  function upcomingForGroup(groupId: string): CalendarEvent[] {
    const today = isoDay(0)
    return sorted.value.filter((e) => e.groupId === groupId && e.date >= today)
  }

  /**
   * Tạo sự kiện. Nếu `withGroup` = true sẽ tạo luôn Nhóm cùng tên với các thành viên
   * đã chọn, đăng thẻ sự kiện vào kênh #chung và liên kết hai bên.
   */
  function createEvent(input: EventInput, withGroup: boolean): ActionResult<{ event: CalendarEvent; groupId: string | null }> {
    const error = validate(input)
    if (error) return { ok: false, error }
    const event: CalendarEvent = {
      id: uid('ev'),
      title: input.title.trim(),
      date: input.date,
      start: input.start,
      end: input.end,
      color: input.color ?? EVENT_COLORS[0],
      description: input.description?.trim() ?? '',
      location: input.location?.trim() ?? '',
      memberIds: [...new Set(input.memberIds)],
      groupId: null,
    }
    if (withGroup) {
      const created = groups.createGroup({
        name: event.title,
        memberIds: event.memberIds,
        color: event.color,
        description: event.description || `Nhóm cho sự kiện ngày ${event.date.split('-').reverse().join('/')}.`,
        eventId: event.id,
        joinedVia: 'calendar',
        template: 'project',
      })
      if (!created.ok) return created
      event.groupId = created.value.id
      groups.postEventCard(created.value.id, event)
    }
    events.value.push(event)
    commit()
    return { ok: true, value: { event, groupId: event.groupId } }
  }

  /** Cập nhật sự kiện; thành viên mới được thêm vào nhóm đã liên kết. */
  function updateEvent(id: string, input: EventInput): ActionResult<CalendarEvent> {
    const event = events.value.find((e) => e.id === id)
    if (!event) return { ok: false, error: 'Không tìm thấy sự kiện.' }
    const error = validate(input)
    if (error) return { ok: false, error }
    const added = input.memberIds.filter((m) => !event.memberIds.includes(m))
    Object.assign(event, {
      title: input.title.trim(),
      date: input.date,
      start: input.start,
      end: input.end,
      color: input.color ?? event.color,
      description: input.description?.trim() ?? event.description,
      location: input.location?.trim() ?? event.location,
      memberIds: [...new Set(input.memberIds)],
    })
    if (event.groupId && added.length && groups.group(event.groupId)) {
      groups.addMembers(event.groupId, added, 'calendar')
    }
    commit()
    return { ok: true, value: event }
  }

  /** Tạo nhóm cho một sự kiện đã có (chưa liên kết nhóm). */
  function createGroupForEvent(id: string): ActionResult<string> {
    const event = events.value.find((e) => e.id === id)
    if (!event) return { ok: false, error: 'Không tìm thấy sự kiện.' }
    if (event.groupId && groups.group(event.groupId)) return { ok: false, error: 'Sự kiện đã có nhóm.' }
    const created = groups.createGroup({
      name: event.title,
      memberIds: event.memberIds,
      color: event.color,
      description: event.description,
      eventId: event.id,
      joinedVia: 'calendar',
      template: 'project',
    })
    if (!created.ok) return created
    event.groupId = created.value.id
    groups.postEventCard(created.value.id, event)
    commit()
    return { ok: true, value: created.value.id }
  }

  function deleteEvent(id: string): void {
    events.value = events.value.filter((e) => e.id !== id)
    commit()
  }

  return { events: sorted, eventsOn, upcomingForGroup, createEvent, updateEvent, createGroupForEvent, deleteEvent }
}

/** Chỉ dùng cho kiểm thử. */
export function __resetCalendar(): void {
  loadedFor = null
  try {
    localStorage.removeItem(key(meId.value))
  } catch {
    /* bỏ qua */
  }
  load(meId.value)
}
