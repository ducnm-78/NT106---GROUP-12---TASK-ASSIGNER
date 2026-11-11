import { beforeEach, describe, expect, it } from 'vitest'
import { __resetCalendar, useCalendar } from '@/features/workspace/calendar/useCalendar'
import { AI_BOT_ID, isoDay } from '@/features/workspace/groups/data'
import { __resetGroups, useGroups } from '@/features/workspace/groups/useGroups'

const ME = 'u-demo'
let cal: ReturnType<typeof useCalendar>
let groups: ReturnType<typeof useGroups>

beforeEach(() => {
  __resetGroups()
  __resetCalendar()
  cal = useCalendar()
  groups = useGroups()
})

const base = { title: 'Họp kick-off đồ án', date: isoDay(3), start: '09:00', end: '10:30', memberIds: ['anh-minh', 'thu-ha', 'lan-anh'] }

describe('Lịch → Nhóm', () => {
  it('tạo sự kiện kèm nhóm: nhóm có đúng thành viên, liên kết hai chiều, có thẻ sự kiện trong #chung', () => {
    const before = groups.groups.value.length
    const r = cal.createEvent(base, true)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const { event, groupId } = r.value
    expect(groupId).toBeTruthy()
    expect(groups.groups.value).toHaveLength(before + 1)

    const group = groups.group(groupId!)!
    expect(group.name).toBe('Họp kick-off đồ án')
    expect(group.eventId).toBe(event.id)
    expect(group.ownerId).toBe(ME)
    expect(group.members.map((m) => m.userId).sort()).toEqual([ME, 'anh-minh', 'thu-ha', 'lan-anh', AI_BOT_ID].sort())
    expect(group.members.filter((m) => m.userId !== ME && m.userId !== AI_BOT_ID).every((m) => m.joinedVia === 'calendar')).toBe(true)

    const general = group.channels.find((c) => c.name === 'chung')!
    const msgs = groups.channelMessages(general.id)
    expect(msgs.some((m) => m.system && m.text.includes('Nhóm được tạo từ sự kiện'))).toBe(true)
    const card = msgs.find((m) => m.embed?.type === 'event')
    expect(card?.embed).toMatchObject({ type: 'event', eventId: event.id, title: 'Họp kick-off đồ án' })

    expect(cal.events.value.find((e) => e.id === event.id)?.groupId).toBe(groupId)
    expect(cal.upcomingForGroup(groupId!).map((e) => e.id)).toEqual([event.id])
    // Nhóm mới không làm tăng số chưa đọc của chính người tạo do tin hệ thống
    expect(groups.groupUnread(groupId!).count).toBe(1) // chỉ thẻ sự kiện từ bot
  })

  it('không tạo nhóm khi tắt tuỳ chọn', () => {
    const before = groups.groups.value.length
    const r = cal.createEvent(base, false)
    expect(r.ok && r.value.groupId).toBe(null)
    expect(groups.groups.value).toHaveLength(before)
  })

  it('kiểm tra dữ liệu: tên trống, giờ kết thúc trước giờ bắt đầu', () => {
    expect(cal.createEvent({ ...base, title: ' ' }, true)).toEqual({ ok: false, error: 'Vui lòng nhập tên sự kiện.' })
    expect(cal.createEvent({ ...base, end: '08:00' }, true)).toMatchObject({ ok: false })
    expect(cal.createEvent({ ...base, date: '10/11/2026' }, true)).toMatchObject({ ok: false })
  })

  it('thêm người vào sự kiện thì tự thêm vào nhóm liên kết', () => {
    const r = cal.createEvent(base, true)
    if (!r.ok) throw new Error(r.error)
    const res = cal.updateEvent(r.value.event.id, { ...base, memberIds: [...base.memberIds, 'huy-nguyen'] })
    expect(res.ok).toBe(true)
    const m = groups.member(r.value.groupId!, 'huy-nguyen')
    expect(m?.joinedVia).toBe('calendar')
  })

  it('tạo nhóm sau cho sự kiện chưa có nhóm; không tạo lần hai', () => {
    const r = cal.createEvent(base, false)
    if (!r.ok) throw new Error(r.error)
    const linked = cal.createGroupForEvent(r.value.event.id)
    expect(linked.ok).toBe(true)
    expect(cal.createGroupForEvent(r.value.event.id).ok).toBe(false)
  })

  it('xoá sự kiện vẫn giữ nhóm', () => {
    const r = cal.createEvent(base, true)
    if (!r.ok) throw new Error(r.error)
    cal.deleteEvent(r.value.event.id)
    expect(cal.events.value.some((e) => e.id === r.value.event.id)).toBe(false)
    expect(groups.group(r.value.groupId!)).toBeDefined()
  })

  it('dữ liệu mẫu: sự kiện liên kết với nhóm có sẵn', () => {
    expect(cal.upcomingForGroup('g-launch').map((e) => e.title)).toContain('Họp chốt bảng giá')
    expect(cal.eventsOn(isoDay(0)).map((e) => e.title)).toContain('Tập luyện')
  })
})
