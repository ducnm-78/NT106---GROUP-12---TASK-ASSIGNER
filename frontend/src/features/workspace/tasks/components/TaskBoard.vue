<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/shared/components/AppIcon.vue'
import { useToast } from '../../composables/useToast'
import { STATUS_LABELS, STATUS_ORDER } from '../../data/constants'
import { useGroups } from '../../groups/useGroups'
import type { Task, TaskStatus } from '../../types'
import { dayFromToday } from '../taskFormat'
import { taskCode, useTasks, type MoveTarget } from '../taskStore'
import { useTaskActions } from '../useTaskActions'
import { type CreateDefaults, type Lane, useTaskView } from '../useTaskView'
import TaskAvatar from './TaskAvatar.vue'
import TaskCard from './TaskCard.vue'

defineProps<{ activeId: string | null }>()
const emit = defineEmits<{ open: [task: Task]; create: [defaults: CreateDefaults] }>()

const view = useTaskView()
const store = useTasks()
const actions = useTaskActions()
const groups = useGroups()
const toast = useToast()
const router = useRouter()

const root = ref<HTMLElement | null>(null)
const scroller = ref<HTMLElement | null>(null)

const EMPTY_TEXT: Record<TaskStatus, [string, string]> = {
  todo: ['Chưa có việc cần làm', 'Bấm + để thêm việc mới'],
  doing: ['Chưa có việc đang làm', 'Kéo thẻ vào đây khi bắt đầu'],
  review: ['Chưa có việc chờ duyệt', 'Kéo thẻ vào đây khi cần duyệt'],
  done: ['Chưa có việc hoàn tất', 'Kéo thẻ vào đây khi xong'],
}

/** Số thẻ mỗi cột (theo bộ lọc hiện tại). */
const columnCounts = computed(() => {
  const counts: Record<TaskStatus, number> = { todo: 0, doing: 0, review: 0, done: 0 }
  for (const t of view.filtered.value) counts[t.status]++
  return counts
})

const showProjectOnCard = computed(() => view.prefs.groupBy !== 'project' && !view.filters.projectId)

function groupLink(lane: Lane) {
  if (!lane.groupId || !groups.group(lane.groupId)) return null
  return { name: 'team-channel', params: { groupId: lane.groupId } }
}

/* =============================================================
 * Kéo thả bằng pointer events (chuột/bút). Cảm ứng dùng menu trạng thái trong chi tiết.
 * ============================================================= */

interface Over {
  lane: string
  status: TaskStatus
  index: number
  beforeId: string | null
}

const drag = reactive({
  id: null as string | null,
  active: false,
  x: 0,
  y: 0,
  offX: 0,
  offY: 0,
  w: 0,
  over: null as Over | null,
})
let pending: { task: Task; el: HTMLElement } | null = null
let start = { x: 0, y: 0 }
let raf = 0
let suppressClick = false

const dragTask = computed(() => (drag.id ? store.taskById(drag.id) : undefined))

function onPointerDown(event: PointerEvent, task: Task): void {
  if (event.button !== 0 || event.pointerType === 'touch') return
  if ((event.target as HTMLElement).closest('button, a, input, textarea')) return
  pending = { task, el: event.currentTarget as HTMLElement }
  start = { x: event.clientX, y: event.clientY }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('keydown', onDragKey, true)
}

function onPointerMove(event: PointerEvent): void {
  if (!pending) return
  if (!drag.active) {
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < 6) return
    const r = pending.el.getBoundingClientRect()
    Object.assign(drag, { id: pending.task.id, active: true, offX: start.x - r.left, offY: start.y - r.top, w: r.width })
    document.documentElement.classList.add('tk-is-dragging')
  }
  event.preventDefault()
  drag.x = event.clientX
  drag.y = event.clientY
  hitTest()
  autoScroll()
}

function hitTest(): void {
  const cell = document.elementFromPoint(drag.x, drag.y)?.closest<HTMLElement>('[data-drop-cell]')
  if (!cell || !root.value?.contains(cell)) {
    drag.over = null
    return
  }
  const cards = Array.from(cell.querySelectorAll<HTMLElement>('[data-card-id]')).filter((c) => c.dataset.cardId !== drag.id)
  let index = cards.length
  for (let i = 0; i < cards.length; i++) {
    const r = cards[i].getBoundingClientRect()
    if (drag.y < r.top + r.height / 2) {
      index = i
      break
    }
  }
  drag.over = {
    lane: cell.dataset.lane!,
    status: cell.dataset.status as TaskStatus,
    index,
    beforeId: cards[index]?.dataset.cardId ?? null,
  }
}

/** Tự cuộn khi kéo gần mép trang / mép bảng. */
function autoScroll(): void {
  cancelAnimationFrame(raf)
  const page = root.value?.closest<HTMLElement>('.ws__content')
  const hs = scroller.value
  if (!page || !hs) return
  const pr = page.getBoundingClientRect()
  const hr = hs.getBoundingClientRect()
  const dy = drag.y < pr.top + 56 ? -14 : drag.y > pr.bottom - 56 ? 14 : 0
  const dx = hs.scrollWidth > hs.clientWidth ? (drag.x < hr.left + 48 ? -16 : drag.x > hr.right - 48 ? 16 : 0) : 0
  if (!dx && !dy) return
  const step = () => {
    page.scrollTop += dy
    hs.scrollLeft += dx
    hitTest()
    raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}

function endDrag(): void {
  cancelAnimationFrame(raf)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('keydown', onDragKey, true)
  document.documentElement.classList.remove('tk-is-dragging')
  if (drag.active) {
    suppressClick = true
    setTimeout(() => (suppressClick = false), 0)
  }
  pending = null
  Object.assign(drag, { id: null, active: false, over: null })
}

function onPointerUp(): void {
  const task = dragTask.value
  const over = drag.over
  const wasActive = drag.active
  endDrag()
  if (!wasActive || !task || !over) return

  const target: MoveTarget = { status: over.status, beforeId: over.beforeId }
  let laneChanged = false
  const g = view.prefs.groupBy
  if (g === 'project' && over.lane !== task.projectId) {
    target.projectId = over.lane
    laneChanged = true
  } else if (g === 'assignee' && over.lane !== (task.assigneeId ?? 'none')) {
    target.assigneeId = over.lane === 'none' ? null : over.lane
    laneChanged = true
  } else if (g === 'priority' && over.lane !== task.priority) {
    target.priority = over.lane as Task['priority']
    laneChanged = true
  }
  actions.drop(task, target, laneChanged)
}

function onDragKey(event: KeyboardEvent): void {
  if (event.key === 'Escape' && drag.active) {
    event.preventDefault()
    event.stopPropagation()
    endDrag()
    toast.show('Đã huỷ kéo thẻ.', 'info')
  }
}

/** Alt + ←/→: chuyển cột rồi giữ focus trên thẻ (thẻ được dựng lại ở cột mới). */
function shiftCard(task: Task, dir: -1 | 1): void {
  actions.shift(task, dir)
  nextTick(() => root.value?.querySelector<HTMLElement>(`[data-card-id="${task.id}"]`)?.focus())
}

function openCard(task: Task): void {
  if (suppressClick) return
  emit('open', task)
}

onBeforeUnmount(endDrag)

/* =============================================================
 * Thêm nhanh ngay trong ô
 * ============================================================= */

const adding = ref<{ lane: string; status: TaskStatus } | null>(null)
const draft = ref('')
const addInput = ref<HTMLInputElement[] | HTMLInputElement | null>(null)

async function startAdd(lane: Lane, status: TaskStatus): Promise<void> {
  adding.value = { lane: lane.key, status }
  draft.value = ''
  await nextTick()
  const el = Array.isArray(addInput.value) ? addInput.value[0] : addInput.value
  el?.focus()
}

function submitAdd(lane: Lane, status: TaskStatus): void {
  const title = draft.value.trim()
  if (!title) {
    adding.value = null
    return
  }
  const d = view.laneDefaults(lane, status)
  const r = store.createTask({ title, ...d, status, due: dayFromToday(3) })
  if (!r.ok) {
    toast.show(r.error, 'error')
    return
  }
  draft.value = ''
  toast.show(`Đã tạo ${taskCode(r.value)}.`, 'success', { label: 'Mở', run: () => emit('open', r.value) })
}

const isAdding = (lane: Lane, status: TaskStatus) => adding.value?.lane === lane.key && adding.value.status === status
const showPlaceholder = (lane: Lane, status: TaskStatus, index: number) =>
  drag.active && drag.over?.lane === lane.key && drag.over.status === status && drag.over.index === index
</script>

<template>
  <div ref="root" class="board" :class="{ 'is-dragging': drag.active }" data-test="board">
    <div ref="scroller" class="board__scroll ws-scroll">
      <div class="board__inner">
        <!-- Tiêu đề cột -->
        <div class="board__heads">
          <div v-for="s in STATUS_ORDER" :key="s" class="head" :data-test="`column-${s}`">
            <span class="tk-dot" :class="`tk-dot--${s}`" />
            <h2 class="head__name">{{ STATUS_LABELS[s] }}</h2>
            <span class="head__count" :data-test="`column-count-${s}`">{{ String(columnCounts[s]).padStart(2, '0') }}</span>
            <button
              v-if="s !== 'done'"
              type="button"
              class="head__add"
              :aria-label="`Tạo việc trong cột ${STATUS_LABELS[s]}`"
              :data-test="`column-add-${s}`"
              @click="emit('create', { status: s, projectId: view.filters.projectId ?? undefined })"
            >
              <AppIcon name="plus" :size="16" :stroke-width="2.4" />
            </button>
          </div>
        </div>

        <!-- Làn -->
        <section
          v-for="lane in view.lanes.value"
          :key="lane.key"
          class="lane"
          :class="{ 'is-collapsed': view.prefs.collapsed.includes(lane.key), 'is-flat': lane.kind === 'none' }"
          :data-test="`lane-${lane.key}`"
        >
          <header v-if="lane.kind !== 'none'" class="lane__head">
            <button
              type="button"
              class="lane__toggle"
              :aria-expanded="!view.prefs.collapsed.includes(lane.key)"
              :aria-label="`${view.prefs.collapsed.includes(lane.key) ? 'Mở rộng' : 'Thu gọn'} ${lane.title}`"
              :data-test="`lane-toggle-${lane.key}`"
              @click="view.toggleLane(lane.key)"
            >
              <AppIcon name="chevron-down" :size="18" :stroke-width="2.4" class="lane__chev" />
              <TaskAvatar v-if="lane.kind === 'assignee'" :id="lane.personId" :size="28" />
              <span v-else class="tk-code" :style="{ '--c': lane.color }">{{ lane.code }}</span>
              <span class="lane__title">{{ lane.title }}</span>
            </button>
            <span class="lane__count">{{ lane.tasks.length }} việc</span>
            <span class="tk-bar" :style="{ '--c': lane.color }" aria-hidden="true">
              <span :style="{ width: `${Math.round(lane.progress * 100)}%` }" />
            </span>
            <span class="lane__pct" :data-test="`lane-progress-${lane.key}`">{{ Math.round(lane.progress * 100) }}% xong</span>

            <ul v-if="view.prefs.collapsed.includes(lane.key)" class="lane__summary">
              <li v-for="s in STATUS_ORDER" :key="s" :class="{ 'is-zero': !lane.counts[s] }">
                <span class="tk-dot" :class="`tk-dot--${s}`" /> {{ lane.counts[s] }} {{ STATUS_LABELS[s].toLowerCase() }}
              </li>
            </ul>

            <div class="lane__end">
              <span v-if="lane.people.length && lane.kind !== 'assignee'" class="lane__people">
                <TaskAvatar v-for="id in lane.people.slice(0, 4)" :key="id" :id="id" :size="26" ring="var(--ws-surface)" />
                <span v-if="lane.people.length > 4" class="lane__more">+{{ lane.people.length - 4 }}</span>
              </span>
              <button
                v-if="groupLink(lane)"
                type="button"
                class="tk-icon-btn"
                :aria-label="`Mở kênh trao đổi của ${lane.title}`"
                title="Mở kênh trao đổi của nhóm"
                :data-test="`lane-chat-${lane.key}`"
                @click="router.push(groupLink(lane)!)"
              >
                <AppIcon name="message" :size="17" />
              </button>
            </div>
          </header>

          <div v-show="!view.prefs.collapsed.includes(lane.key)" class="lane__grid">
            <div
              v-for="s in STATUS_ORDER"
              :key="s"
              class="cell"
              :class="{ 'is-over': drag.active && drag.over?.lane === lane.key && drag.over.status === s }"
              data-drop-cell
              :data-lane="lane.key"
              :data-status="s"
              :data-test="`cell-${lane.key}-${s}`"
            >
              <template v-for="(task, i) in view.cell(lane, s)" :key="task.id">
                <div v-if="showPlaceholder(lane, s, i)" class="drop-ph" data-test="drop-placeholder">
                  <span v-if="dragTask?.status !== s">Thả vào đây để chuyển sang {{ STATUS_LABELS[s] }}</span>
                </div>
                <TaskCard
                  v-show="task.id !== drag.id"
                  :task="task"
                  :active="task.id === activeId"
                  :project="showProjectOnCard ? store.projectOf(task.projectId) : null"
                  @pointerdown="onPointerDown($event, task)"
                  @click="openCard(task)"
                  @open="emit('open', task)"
                  @shift="shiftCard(task, $event)"
                />
              </template>
              <div
                v-if="showPlaceholder(lane, s, view.cell(lane, s).filter((t) => t.id !== drag.id).length)"
                class="drop-ph"
                data-test="drop-placeholder"
              >
                <span v-if="dragTask?.status !== s">Thả vào đây để chuyển sang {{ STATUS_LABELS[s] }}</span>
              </div>

              <div
                v-if="!view.cell(lane, s).filter((t) => t.id !== drag.id).length && !(drag.active && drag.over?.lane === lane.key && drag.over.status === s) && !isAdding(lane, s)"
                class="cell__empty"
              >
                <strong>{{ EMPTY_TEXT[s][0] }}</strong>
                <span>{{ EMPTY_TEXT[s][1] }}</span>
              </div>

              <form v-if="isAdding(lane, s)" class="quick" @submit.prevent="submitAdd(lane, s)">
                <input
                  ref="addInput"
                  v-model="draft"
                  class="ws-input quick__input"
                  maxlength="200"
                  placeholder="Tên công việc, Enter để thêm"
                  aria-label="Tên công việc mới"
                  data-test="quick-add-input"
                  @keydown.esc.prevent="adding = null"
                  @blur="!draft.trim() && (adding = null)"
                />
              </form>
              <button
                v-else-if="s !== 'done'"
                type="button"
                class="cell__add"
                :data-test="`quick-add-${lane.key}-${s}`"
                @click="startAdd(lane, s)"
              >
                <AppIcon name="plus" :size="15" :stroke-width="2.4" /> Thêm việc
              </button>
            </div>
          </div>
        </section>

        <div v-if="!view.lanes.value.length" class="board__empty" data-test="board-empty">
          <AppIcon name="inbox" :size="40" :stroke-width="1.6" />
          <strong>Không có công việc phù hợp</strong>
          <span>Thử bỏ bớt bộ lọc hoặc đổi từ khoá tìm kiếm.</span>
          <button type="button" class="tk-btn" @click="view.clearFilters()">Xoá bộ lọc</button>
        </div>
      </div>
    </div>

    <!-- Thẻ đang kéo, bám theo con trỏ -->
    <div
      v-if="drag.active && dragTask"
      class="ghost"
      :style="{ width: `${drag.w}px`, transform: `translate(${drag.x - drag.offX}px, ${drag.y - drag.offY}px)` }"
      aria-hidden="true"
    >
      <TaskCard :task="dragTask" ghost />
    </div>
    <p class="visually-hidden" aria-live="polite">
      {{ drag.active && drag.over ? `Thả vào cột ${STATUS_LABELS[drag.over.status]}` : '' }}
    </p>
  </div>
</template>

<style scoped>
.board {
  position: relative;
  min-width: 0;
}

.board__scroll {
  min-width: 0;
}

.board__inner {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 60rem;
}

/* ---- Tiêu đề cột: dính trên cùng khi cuộn trang ---- */
.board__heads {
  position: sticky;
  top: 0;
  z-index: 5;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
  padding: 0.375rem 0.75rem;
  margin: -0.375rem 0 0;
  background: var(--ws-bg);
}

.head {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  height: 2.75rem;
  padding: 0 0.5rem 0 1rem;
  border: 1px solid var(--ws-border);
  border-radius: 0.75rem;
  background: var(--ws-surface);
}

.head__name {
  margin: 0;
  font-size: 0.96875rem;
  font-weight: 700;
}

.head__count {
  padding: 0.0625rem 0.5rem;
  border-radius: 999px;
  background: var(--ws-accent-soft);
  color: var(--ws-accent-text);
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.head__add {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  margin-left: auto;
  padding: 0;
  border: 0;
  border-radius: 0.5rem;
  background: var(--ws-surface-2);
  color: var(--ws-text-2);
  cursor: pointer;
}

.head__add:hover {
  background: var(--ws-accent);
  color: #fff;
}

/* ---- Làn ---- */
.lane {
  border: 1px solid var(--ws-border);
  border-radius: 1rem;
  background: var(--ws-surface);
}

.lane.is-flat {
  border: 0;
  background: none;
}

.lane__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  min-height: 3.25rem;
  padding: 0.5rem 0.75rem 0.5rem 0.5rem;
}

.lane__toggle {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;
  padding: 0.25rem 0.5rem 0.25rem 0.25rem;
  border: 0;
  border-radius: 0.625rem;
  background: none;
  color: var(--ws-text);
  cursor: pointer;
}

.lane__toggle:hover {
  background: var(--ws-surface-2);
}

.lane__chev {
  flex: none;
  color: var(--ws-text-2);
  transition: transform 0.2s ease;
}

.lane.is-collapsed .lane__chev {
  transform: rotate(-90deg);
}

.lane__title {
  overflow: hidden;
  font-size: 1rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lane__count {
  color: var(--ws-text-3);
  font-size: 0.84375rem;
}

.lane__pct {
  color: var(--ws-text-2);
  font-size: 0.8125rem;
  font-weight: 500;
}

.lane__summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  margin: 0 0 0 0.5rem;
  padding: 0 0 0 1rem;
  border-left: 1px solid var(--ws-border-strong);
  list-style: none;
  color: var(--ws-text-2);
  font-size: 0.8125rem;
  font-weight: 500;
}

.lane__summary li {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.lane__summary li.is-zero {
  color: var(--ws-text-3);
}

.lane__end {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-left: auto;
}

.lane__people {
  display: flex;
  align-items: center;
}

.lane__people > :not(:first-child) {
  margin-left: -0.4375rem;
}

.lane__more {
  display: grid;
  place-items: center;
  width: 1.625rem;
  height: 1.625rem;
  margin-left: -0.4375rem;
  border: 2px solid var(--ws-surface);
  border-radius: 50%;
  background: var(--ws-surface-3);
  color: var(--ws-text-2);
  font-size: 0.625rem;
  font-weight: 700;
}

.lane__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
  padding: 0 0.75rem 0.75rem;
}

.lane.is-flat .lane__grid {
  padding: 0;
}

/* ---- Ô ---- */
.cell {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 7.5rem;
  padding: 0.5rem;
  border: 1px solid transparent;
  border-radius: 0.875rem;
  background: var(--tk-cell);
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.cell.is-over {
  border-color: color-mix(in srgb, var(--ws-accent) 50%, transparent);
  background: color-mix(in srgb, var(--ws-accent) 7%, var(--tk-cell));
}

.cell__empty {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  min-height: 5.5rem;
  padding: 0.75rem;
  border: 1.5px dashed var(--ws-border-strong);
  border-radius: 0.75rem;
  color: var(--ws-text-3);
  font-size: 0.8125rem;
  text-align: center;
}

.cell__empty strong {
  color: var(--ws-text-2);
  font-weight: 600;
}

.cell__add {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  align-self: flex-start;
  height: 2rem;
  padding: 0 0.625rem;
  border: 0;
  border-radius: 0.5rem;
  background: none;
  color: var(--ws-text-3);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.cell:hover .cell__add,
.cell__add:focus-visible {
  opacity: 1;
}

.cell__add:hover {
  background: var(--ws-surface-2);
  color: var(--ws-accent-text);
}

/* Thiết bị cảm ứng không có hover: luôn hiện nút thêm */
@media (hover: none) {
  .cell__add {
    opacity: 1;
  }
}

.board.is-dragging .cell__add {
  visibility: hidden;
}

.quick__input {
  height: 2.5rem;
  font-size: 0.875rem;
}

.drop-ph {
  display: grid;
  place-items: center;
  min-height: 6.5rem;
  padding: 0.75rem;
  border: 1.5px dashed var(--ws-accent);
  border-radius: 0.875rem;
  background: color-mix(in srgb, var(--ws-accent) 9%, transparent);
  color: var(--ws-accent-text);
  font-size: 0.84375rem;
  font-weight: 600;
  text-align: center;
}

.ghost {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 60;
  pointer-events: none;
}

.board__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 3.5rem 1rem;
  border: 1.5px dashed var(--ws-border-strong);
  border-radius: 1rem;
  color: var(--ws-text-3);
  text-align: center;
}

.board__empty strong {
  color: var(--ws-text);
  font-size: 1.0625rem;
}

.board__empty .tk-btn {
  margin-top: 0.5rem;
}

/* Màn hẹp: bảng cuộn ngang trong khung riêng (tiêu đề cột cuộn theo) */
@media (max-width: 80rem) {
  .board__scroll {
    overflow-x: auto;
    padding-bottom: 0.5rem;
    scroll-snap-type: x proximity;
  }

  .board__heads {
    position: static;
    margin: 0;
    padding: 0;
  }
}
</style>

<style>
/* Khi đang kéo thẻ: con trỏ "nắm", không bôi đen chữ */
.tk-is-dragging,
.tk-is-dragging * {
  cursor: grabbing !important;
  user-select: none !important;
}
</style>
