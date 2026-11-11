<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import { useToast } from '../composables/useToast'
import GroupIcon from '../groups/components/GroupIcon.vue'
import PersonAvatar from '../groups/components/PersonAvatar.vue'
import { useGroups } from '../groups/useGroups'
import { todayISO } from '../utils/format'
import EventModal from './components/EventModal.vue'
import { useCalendar, type CalendarEvent } from './useCalendar'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const calendar = useCalendar()
const groups = useGroups()

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const monthFmt = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' })
const dayFmt = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })

const today = todayISO()
const selected = ref(typeof route.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(route.query.date) ? route.query.date : today)
const cursor = ref(selected.value.slice(0, 7)) // YYYY-MM đang xem

watch(
  () => route.query.date,
  (d) => {
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      selected.value = d
      cursor.value = d.slice(0, 7)
    }
  },
)

function iso(d: Date): string {
  return todayISO(d)
}

function parse(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const monthLabel = computed(() => {
  const [y, m] = cursor.value.split('-').map(Number)
  const label = monthFmt.format(new Date(y, m - 1, 1))
  return label.charAt(0).toUpperCase() + label.slice(1)
})

/** 6 tuần × 7 ngày, bắt đầu từ thứ Hai. */
const cells = computed(() => {
  const [y, m] = cursor.value.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(y, m - 1, 1 - offset)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const key = iso(d)
    return { key, day: d.getDate(), inMonth: d.getMonth() === m - 1, events: calendar.eventsOn(key) }
  })
})

function shiftMonth(delta: number): void {
  const [y, m] = cursor.value.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  cursor.value = iso(d).slice(0, 7)
}

function select(day: string): void {
  selected.value = day
  if (day.slice(0, 7) !== cursor.value) cursor.value = day.slice(0, 7)
  router.replace({ query: { ...route.query, date: day } })
}

function goToday(): void {
  select(today)
}

const dayEvents = computed(() => calendar.eventsOn(selected.value))
const selectedLabel = computed(() => {
  const label = dayFmt.format(parse(selected.value))
  return label.charAt(0).toUpperCase() + label.slice(1)
})
const upcoming = computed(() => calendar.events.value.filter((e) => e.date >= today).slice(0, 4))

/* ----- Hộp thoại ----- */
const modalOpen = ref(false)
const editingEvent = ref<CalendarEvent | null>(null)
const deleting = ref<CalendarEvent | null>(null)
const deleteOpen = computed({
  get: () => !!deleting.value,
  set: (v) => {
    if (!v) deleting.value = null
  },
})

function openCreate(day = selected.value): void {
  editingEvent.value = null
  selected.value = day
  modalOpen.value = true
}

function openEdit(e: CalendarEvent): void {
  editingEvent.value = e
  modalOpen.value = true
}

function remove(): void {
  if (!deleting.value) return
  calendar.deleteEvent(deleting.value.id)
  toast.show('Đã xoá sự kiện. Nhóm liên kết (nếu có) vẫn được giữ lại.')
}

function createGroup(e: CalendarEvent): void {
  const r = calendar.createGroupForEvent(e.id)
  if (!r.ok) {
    toast.show(r.error, 'error')
    return
  }
  toast.show(`Đã tạo nhóm “${e.title}”.`, 'success', { label: 'Mở nhóm', run: () => openGroup(r.value) })
}

function openGroup(groupId: string): void {
  router.push({ name: 'team-channel', params: { groupId } })
}
</script>

<template>
  <div class="ws-page cal">
    <header class="ws-page-header">
      <div>
        <p class="ws-eyebrow">Lịch</p>
        <h1 class="ws-title">{{ monthLabel }}</h1>
      </div>
      <div class="cal__actions">
        <div class="cal__nav">
          <button type="button" class="ws-icon-btn" aria-label="Tháng trước" data-test="cal-prev" @click="shiftMonth(-1)">
            <AppIcon name="chevron-left" :size="18" />
          </button>
          <button type="button" class="cal__today" data-test="cal-today" @click="goToday">Hôm nay</button>
          <button type="button" class="ws-icon-btn" aria-label="Tháng sau" data-test="cal-next" @click="shiftMonth(1)">
            <AppIcon name="chevron-right" :size="18" />
          </button>
        </div>
        <BaseButton class="ws-btn-auto cal__create" data-test="cal-create" @click="openCreate()">
          <AppIcon name="plus" :size="18" /> Tạo sự kiện
        </BaseButton>
      </div>
    </header>

    <div class="cal__body">
      <section class="month" aria-label="Lịch tháng">
        <div class="month__weekdays" aria-hidden="true">
          <span v-for="w in WEEKDAYS" :key="w">{{ w }}</span>
        </div>
        <div class="month__grid" role="grid" data-test="cal-grid">
          <button
            v-for="c in cells"
            :key="c.key"
            type="button"
            role="gridcell"
            class="day"
            :class="{ 'is-out': !c.inMonth, 'is-today': c.key === today, 'is-selected': c.key === selected }"
            :aria-selected="c.key === selected"
            :aria-label="`${c.day}${c.events.length ? `, ${c.events.length} sự kiện` : ''}`"
            :data-test="`day-${c.key}`"
            @click="select(c.key)"
            @dblclick="openCreate(c.key)"
          >
            <span class="day__num">{{ c.day }}</span>
            <span class="day__events">
              <span v-for="e in c.events.slice(0, 2)" :key="e.id" class="day__event" :style="{ '--c': e.color }">
                <AppIcon v-if="e.groupId" name="users" :size="10" />
                {{ e.start }} {{ e.title }}
              </span>
              <span v-if="c.events.length > 2" class="day__more">+{{ c.events.length - 2 }} sự kiện</span>
            </span>
          </button>
        </div>
      </section>

      <aside class="agenda">
        <section class="agenda__card">
          <div class="agenda__head">
            <h2>{{ selectedLabel }}</h2>
            <button type="button" class="ws-icon-btn agenda__add" aria-label="Thêm sự kiện vào ngày này" @click="openCreate()">
              <AppIcon name="plus" :size="18" />
            </button>
          </div>
          <ul class="agenda__list" data-test="agenda">
            <li v-for="e in dayEvents" :key="e.id" class="ev" :style="{ '--c': e.color }" :data-test="`ev-${e.title}`">
              <div class="ev__top">
                <span class="ev__time">{{ e.start }} – {{ e.end }}</span>
                <span class="ev__tools">
                  <button type="button" class="ev__tool" :aria-label="`Sửa ${e.title}`" @click="openEdit(e)"><AppIcon name="pencil" :size="15" /></button>
                  <button type="button" class="ev__tool ev__tool--danger" :aria-label="`Xoá ${e.title}`" @click="deleting = e">
                    <AppIcon name="trash" :size="15" />
                  </button>
                </span>
              </div>
              <h3 class="ev__title">{{ e.title }}</h3>
              <p v-if="e.location" class="ev__meta"><AppIcon name="target" :size="13" /> {{ e.location }}</p>
              <p v-if="e.description" class="ev__desc">{{ e.description }}</p>
              <div v-if="e.memberIds.length" class="ev__people">
                <PersonAvatar
                  v-for="id in e.memberIds.slice(0, 5)"
                  :key="id"
                  :person="groups.person(id)"
                  :size="26"
                  ring="var(--ws-surface-2)"
                  :title="groups.person(id).name"
                />
                <span>{{ e.memberIds.length }} thành viên</span>
              </div>
              <button
                v-if="e.groupId && groups.group(e.groupId)"
                type="button"
                class="ev__group"
                :data-test="`open-group-${e.id}`"
                @click="openGroup(e.groupId)"
              >
                <GroupIcon :group="groups.group(e.groupId)!" :size="24" />
                <span>Mở nhóm “{{ groups.group(e.groupId)!.name }}”</span>
                <AppIcon name="chevron-right" :size="16" />
              </button>
              <button v-else-if="e.memberIds.length" type="button" class="ev__group ev__group--new" @click="createGroup(e)">
                <AppIcon name="users" :size="16" />
                <span>Tạo nhóm cho sự kiện</span>
                <AppIcon name="plus" :size="16" />
              </button>
            </li>
            <li v-if="!dayEvents.length" class="agenda__empty">
              Không có sự kiện.
              <button type="button" @click="openCreate()">Tạo sự kiện</button>
            </li>
          </ul>
        </section>

        <section class="agenda__card">
          <h2 class="agenda__sub">Sắp tới</h2>
          <ul class="up">
            <li v-for="e in upcoming" :key="e.id">
              <button type="button" class="up__item" @click="select(e.date)">
                <span class="up__date" :style="{ '--c': e.color }">
                  <small>Th{{ Number(e.date.slice(5, 7)) }}</small>{{ Number(e.date.slice(8)) }}
                </span>
                <span class="up__text">
                  <strong>{{ e.title }}</strong>
                  <small>{{ e.start }} – {{ e.end }}<template v-if="e.groupId"> · có nhóm</template></small>
                </span>
              </button>
            </li>
            <li v-if="!upcoming.length" class="agenda__empty">Chưa có sự kiện sắp tới.</li>
          </ul>
        </section>
      </aside>
    </div>

    <EventModal v-model:open="modalOpen" :event="editingEvent" :default-date="selected" />
    <ConfirmModal
      v-model:open="deleteOpen"
      :title="`Xoá “${deleting?.title}”?`"
      description="Sự kiện sẽ bị xoá khỏi Lịch. Nhóm đã tạo từ sự kiện vẫn được giữ."
      confirm-label="Xoá sự kiện"
      danger
      @confirm="remove"
    />
  </div>
</template>

<style scoped>
.cal {
  height: 100%;
  min-height: 0;
}

.cal__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.cal__nav {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.cal__today {
  height: 2.75rem;
  padding: 0 1rem;
  border: 1px solid var(--ws-border);
  border-radius: var(--ws-radius-sm);
  background: var(--ws-surface);
  color: var(--ws-text);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.cal__today:hover {
  background: var(--ws-surface-2);
}

.cal__create :deep(.btn__label) {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.cal__body {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) minmax(18rem, 23rem);
  gap: var(--ws-gap);
  min-height: 0;
}

.month {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0.75rem;
  border: 1px solid var(--ws-border);
  border-radius: var(--ws-radius);
  background: var(--ws-surface);
}

.month__weekdays {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  padding: 0.25rem 0 0.5rem;
  color: var(--ws-text-3);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-align: center;
}

.month__grid {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  grid-auto-rows: minmax(4.75rem, 1fr);
  gap: 0.375rem;
}

.day {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
  padding: 0.375rem;
  border: 1.5px solid transparent;
  border-radius: 0.75rem;
  background: var(--ws-surface-2);
  color: var(--ws-text);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.day:hover {
  border-color: var(--ws-border-strong);
}

.day.is-out {
  background: transparent;
  color: var(--ws-text-3);
}

.day.is-selected {
  border-color: var(--ws-accent);
  background: color-mix(in srgb, var(--ws-accent) 12%, var(--ws-surface-2));
}

.day__num {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  font-size: 0.8125rem;
  font-weight: 700;
}

.day.is-today .day__num {
  background: var(--ws-accent-grad);
  color: #fff;
}

.day__events {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.day__event {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  overflow: hidden;
  padding: 0.125rem 0.375rem;
  border-left: 3px solid var(--c);
  border-radius: 0.3125rem;
  background: color-mix(in srgb, var(--c) 20%, transparent);
  font-size: 0.6875rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.day__event :deep(svg) {
  flex: none;
}

.day__more {
  padding-left: 0.375rem;
  color: var(--ws-text-3);
  font-size: 0.6875rem;
}

.agenda {
  display: flex;
  flex-direction: column;
  gap: var(--ws-gap);
  min-height: 0;
  overflow-y: auto;
}

.agenda__card {
  padding: 1rem;
  border: 1px solid var(--ws-border);
  border-radius: var(--ws-radius);
  background: var(--ws-surface);
}

.agenda__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.agenda__head h2,
.agenda__sub {
  margin: 0;
  font-size: 1.0625rem;
}

.agenda__sub {
  margin-bottom: 0.75rem;
}

.agenda__add {
  width: 2.25rem;
  height: 2.25rem;
}

.agenda__list,
.up {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.agenda__empty {
  color: var(--ws-text-3);
  font-size: 0.875rem;
}

.agenda__empty button {
  padding: 0;
  border: 0;
  background: none;
  color: var(--ws-accent-text);
  font-weight: 700;
  cursor: pointer;
}

.ev {
  padding: 0.75rem 0.875rem;
  border-left: 4px solid var(--c);
  border-radius: 0.75rem;
  background: var(--ws-surface-2);
}

.ev__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ev__time {
  color: color-mix(in srgb, var(--c) 65%, var(--ws-text));
  font-size: 0.8125rem;
  font-weight: 700;
}

.ev__tools {
  display: flex;
  gap: 0.125rem;
}

.ev__tool {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: 0;
  border-radius: 0.375rem;
  background: none;
  color: var(--ws-text-3);
  cursor: pointer;
}

.ev__tool:hover {
  background: var(--ws-surface-3);
  color: var(--ws-text);
}

.ev__tool--danger:hover {
  color: var(--ws-danger);
}

.ev__title {
  margin: 0.25rem 0 0;
  font-size: 1rem;
}

.ev__meta,
.ev__desc {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0.25rem 0 0;
  color: var(--ws-text-2);
  font-size: 0.8125rem;
}

.ev__people {
  display: flex;
  align-items: center;
  margin-top: 0.625rem;
}

.ev__people > * + * {
  margin-left: -6px;
}

.ev__people span {
  margin-left: 0.625rem;
  color: var(--ws-text-3);
  font-size: 0.75rem;
}

.ev__group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.5rem 0.625rem;
  border: 1px solid var(--ws-border-strong);
  border-radius: 0.625rem;
  background: var(--ws-surface);
  color: var(--ws-text);
  font-size: 0.8125rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.ev__group span {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ev__group:hover {
  border-color: var(--ws-accent);
}

.ev__group--new {
  border-style: dashed;
  color: var(--ws-accent-text);
}

.up__item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.375rem;
  border: 0;
  border-radius: 0.625rem;
  background: none;
  color: var(--ws-text);
  text-align: left;
  cursor: pointer;
}

.up__item:hover {
  background: var(--ws-surface-2);
}

.up__date {
  display: grid;
  flex: none;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--c) 20%, transparent);
  color: color-mix(in srgb, var(--c) 65%, var(--ws-text));
  font-size: 1rem;
  font-weight: 800;
  line-height: 1;
}

.up__date small {
  font-size: 0.5625rem;
  text-transform: uppercase;
}

.up__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.up__text strong {
  overflow: hidden;
  font-size: 0.875rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.up__text small {
  color: var(--ws-text-3);
  font-size: 0.75rem;
}

@media (max-width: 72rem) {
  .cal {
    height: auto;
  }

  .cal__body {
    grid-template-columns: minmax(0, 1fr);
  }

  .agenda {
    overflow: visible;
  }
}

@media (max-width: 40rem) {
  .month {
    padding: 0.375rem;
  }

  .month__grid {
    grid-auto-rows: minmax(3.25rem, 1fr);
    gap: 0.25rem;
  }

  .day__event {
    padding: 0;
    border-left-width: 0;
    background: var(--c);
    color: transparent;
    height: 4px;
    font-size: 0;
  }
}
</style>
