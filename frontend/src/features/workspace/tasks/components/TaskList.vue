<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import { useToast } from '../../composables/useToast'
import { PRIORITY_SHORT } from '../../data/constants'
import type { Task } from '../../types'
import { fullDate } from '../taskFormat'
import { taskCode, useTasks } from '../taskStore'
import { useTaskActions } from '../useTaskActions'
import { type CreateDefaults, type Lane, type SortKey, useTaskView } from '../useTaskView'
import DueChip from './DueChip.vue'
import DuePicker from './DuePicker.vue'
import PersonPicker from './PersonPicker.vue'
import PriorityMenu from './PriorityMenu.vue'
import StatusMenu from './StatusMenu.vue'
import TaskAvatar from './TaskAvatar.vue'
import TaskMenu from './TaskMenu.vue'

defineProps<{ activeId: string | null }>()
const selected = defineModel<string[]>('selected', { required: true })
const emit = defineEmits<{ open: [task: Task]; create: [defaults: CreateDefaults]; remove: [ids: string[]] }>()

const view = useTaskView()
const store = useTasks()
const actions = useTaskActions()
const toast = useToast()

const COLUMNS: { key: SortKey | null; label: string; cls: string }[] = [
  { key: 'title', label: 'Công việc', cls: 'col-title' },
  { key: null, label: 'Nhãn', cls: 'col-labels' },
  { key: 'assignee', label: 'Người phụ trách', cls: 'col-person' },
  { key: 'priority', label: 'Ưu tiên', cls: 'col-prio' },
  { key: 'due', label: 'Hạn chót', cls: 'col-due' },
  { key: 'status', label: 'Trạng thái', cls: 'col-status' },
]

/** Các việc đang hiển thị (để chọn tất cả). */
const visibleIds = computed(() => view.lanes.value.flatMap((lane) => (view.prefs.collapsed.includes(lane.key) ? [] : view.rows(lane).visible.map((t) => t.id))))
const allChecked = computed(() => visibleIds.value.length > 0 && visibleIds.value.every((id) => selected.value.includes(id)))
const someChecked = computed(() => !allChecked.value && visibleIds.value.some((id) => selected.value.includes(id)))

function toggleAll(): void {
  selected.value = allChecked.value ? [] : [...visibleIds.value]
}

function toggleOne(id: string): void {
  selected.value = selected.value.includes(id) ? selected.value.filter((x) => x !== id) : [...selected.value, id]
}

function ariaSort(key: SortKey | null): 'ascending' | 'descending' | 'none' | undefined {
  if (!key) return undefined
  return view.sort.key === key ? (view.sort.dir === 1 ? 'ascending' : 'descending') : 'none'
}

function onRowClick(event: MouseEvent, task: Task): void {
  if ((event.target as HTMLElement).closest('button, a, input, label')) return
  emit('open', task)
}

function setPriority(task: Task, priority: Task['priority']): void {
  actions.undoable(`Đã đổi ưu tiên ${taskCode(task)} thành ${PRIORITY_SHORT[priority]}.`, () => store.updateTask(task.id, { priority }).ok)
}

function setDue(task: Task, due: string, close: () => void): void {
  close()
  if (due === task.due) return
  actions.undoable(`Đã đặt hạn ${taskCode(task)}: ${fullDate(due)}.`, () => store.updateTask(task.id, { due }).ok)
}

function setAssignee(task: Task, id: string | null, close: () => void): void {
  close()
  if (id === task.assigneeId) return
  actions.undoable(
    id ? `Đã giao ${taskCode(task)} cho ${view.nameOf(id)}.` : `Đã bỏ người phụ trách ${taskCode(task)}.`,
    () => store.updateTask(task.id, { assigneeId: id }).ok,
  )
}

async function copyLink(task: Task): Promise<void> {
  const url = `${location.origin}/tasks?task=${taskCode(task)}`
  try {
    await navigator.clipboard.writeText(url)
    toast.show('Đã sao chép liên kết công việc.')
  } catch {
    toast.show(url, 'info')
  }
}

function duplicate(task: Task): void {
  const r = store.duplicateTask(task.id)
  if (r.ok) toast.show(`Đã nhân bản thành ${taskCode(r.value)}.`, 'success', { label: 'Mở', run: () => emit('open', r.value) })
}

const laneCollapsed = (lane: Lane) => view.prefs.collapsed.includes(lane.key)
</script>

<template>
  <div class="list ws-scroll" data-test="task-list">
    <table class="tbl">
      <thead>
        <tr>
          <th class="col-check">
            <label class="chk" :title="allChecked ? 'Bỏ chọn tất cả' : 'Chọn tất cả'">
              <input
                type="checkbox"
                :checked="allChecked"
                :indeterminate="someChecked"
                aria-label="Chọn tất cả công việc đang hiển thị"
                data-test="select-all"
                @change="toggleAll"
              />
              <span class="chk__box"><AppIcon :name="someChecked ? 'x' : 'check'" :size="13" :stroke-width="3.2" /></span>
            </label>
          </th>
          <th v-for="c in COLUMNS" :key="c.label" :class="c.cls" :aria-sort="ariaSort(c.key)" scope="col">
            <button v-if="c.key" type="button" class="th-sort" :class="{ 'is-on': view.sort.key === c.key }" :data-test="`sort-${c.key}`" @click="view.toggleSort(c.key)">
              {{ c.label }}
              <AppIcon
                v-if="view.sort.key === c.key"
                :name="view.sort.dir === 1 ? 'arrow-up' : 'arrow-down'"
                :size="13"
                :stroke-width="2.6"
              />
            </button>
            <span v-else>{{ c.label }}</span>
          </th>
          <th class="col-more"><span class="visually-hidden">Thao tác</span></th>
        </tr>
      </thead>

      <tbody v-for="lane in view.lanes.value" :key="lane.key" :data-test="`group-${lane.key}`">
        <tr v-if="lane.kind !== 'none'" class="grp">
          <td colspan="8">
            <div class="grp__inner">
              <button
                type="button"
                class="grp__toggle"
                :aria-expanded="!laneCollapsed(lane)"
                :data-test="`group-toggle-${lane.key}`"
                @click="view.toggleLane(lane.key)"
              >
                <AppIcon name="chevron-down" :size="17" :stroke-width="2.4" class="grp__chev" />
                <TaskAvatar v-if="lane.kind === 'assignee'" :id="lane.personId" :size="26" />
                <span v-else class="tk-code" :style="{ '--c': lane.color }">{{ lane.code }}</span>
                <strong>{{ lane.title }}</strong>
              </button>
              <span class="grp__count">{{ lane.tasks.length }} việc</span>
              <span class="tk-bar" :style="{ '--c': lane.color, '--w': '6.25rem' }" aria-hidden="true">
                <span :style="{ width: `${Math.round(lane.progress * 100)}%` }" />
              </span>
              <span class="grp__pct">{{ Math.round(lane.progress * 100) }}% xong</span>
              <button
                type="button"
                class="grp__add"
                :data-test="`group-add-${lane.key}`"
                @click="emit('create', view.laneDefaults(lane, 'todo'))"
              >
                <AppIcon name="plus" :size="16" :stroke-width="2.4" /> Thêm việc
              </button>
            </div>
          </td>
        </tr>

        <template v-if="!laneCollapsed(lane)">
          <tr
            v-for="task in view.rows(lane).visible"
            :key="task.id"
            class="row"
            :class="{ 'is-selected': selected.includes(task.id), 'is-active': task.id === activeId, 'is-done': task.status === 'done' }"
            :data-test="`row-${taskCode(task)}`"
            @click="onRowClick($event, task)"
          >
            <td class="col-check">
              <label class="chk">
                <input
                  type="checkbox"
                  :checked="selected.includes(task.id)"
                  :aria-label="`Chọn ${taskCode(task)}`"
                  :data-test="`select-${taskCode(task)}`"
                  @change="toggleOne(task.id)"
                />
                <span class="chk__box"><AppIcon name="check" :size="13" :stroke-width="3.2" /></span>
              </label>
            </td>
            <td class="col-title">
              <button type="button" class="row__title" :data-test="`open-${taskCode(task)}`" @click="emit('open', task)">{{ task.title }}</button>
              <span class="row__meta">
                <span class="tk-key">{{ taskCode(task) }}</span>
                <span v-if="task.subtasks.length" title="Việc con">
                  <AppIcon name="list-checks" :size="14" /> {{ task.subtasks.filter((s) => s.done).length }}/{{ task.subtasks.length }}
                </span>
                <span v-if="task.comments.length" title="Bình luận"><AppIcon name="message" :size="13" /> {{ task.comments.length }}</span>
                <span v-if="view.prefs.groupBy !== 'project'" class="row__project">
                  <span class="tk-dot" :style="{ background: store.projectOf(task.projectId)?.color }" />
                  {{ store.projectOf(task.projectId)?.name }}
                </span>
              </span>
            </td>
            <td class="col-labels">
              <span class="row__labels">
                <span v-for="l in task.labels.slice(0, 2)" :key="l" class="tk-label">{{ l }}</span>
                <span v-if="task.labels.length > 2" class="row__more">+{{ task.labels.length - 2 }}</span>
              </span>
            </td>
            <td class="col-person">
              <TaskMenu label="Giao cho">
                <template #trigger="{ toggle, open }">
                  <button type="button" class="cellbtn" :aria-expanded="open" :aria-label="`Người phụ trách: ${view.nameOf(task.assigneeId)}`" @click="toggle">
                    <TaskAvatar :id="task.assigneeId" :size="26" />
                    <span class="cellbtn__text" :class="{ 'is-muted': !task.assigneeId }">{{ view.nameOf(task.assigneeId) }}</span>
                  </button>
                </template>
                <template #default="{ close }">
                  <PersonPicker
                    :people="view.peopleFor(task.projectId)"
                    :selected="task.assigneeId"
                    @pick="setAssignee(task, $event, close)"
                  />
                </template>
              </TaskMenu>
            </td>
            <td class="col-prio">
              <PriorityMenu :priority="task.priority" :test-id="`prio-${taskCode(task)}`" @change="setPriority(task, $event)" />
            </td>
            <td class="col-due">
              <TaskMenu label="Hạn chót">
                <template #trigger="{ toggle, open }">
                  <button type="button" class="cellbtn" :aria-expanded="open" aria-label="Đổi hạn chót" :data-test="`due-${taskCode(task)}`" @click="toggle">
                    <DueChip :task="task" long />
                  </button>
                </template>
                <template #default="{ close }">
                  <DuePicker :value="task.due" @pick="setDue(task, $event, close)" />
                </template>
              </TaskMenu>
            </td>
            <td class="col-status">
              <StatusMenu :status="task.status" :test-id="`status-${taskCode(task)}`" @change="actions.changeStatus(task, $event)" />
            </td>
            <td class="col-more">
              <TaskMenu align="end" label="Thao tác">
                <template #trigger="{ toggle, open }">
                  <button type="button" class="tk-icon-btn row__more-btn" :aria-expanded="open" :aria-label="`Thao tác với ${taskCode(task)}`" @click="toggle">
                    <AppIcon name="more" :size="18" />
                  </button>
                </template>
                <template #default="{ close }">
                  <button type="button" class="tk-menu__item" role="menuitem" @click="close(); emit('open', task)">
                    <AppIcon name="eye" :size="16" /> Mở chi tiết
                  </button>
                  <button type="button" class="tk-menu__item" role="menuitem" @click="close(); duplicate(task)">
                    <AppIcon name="copy" :size="16" /> Nhân bản
                  </button>
                  <button type="button" class="tk-menu__item" role="menuitem" @click="close(); copyLink(task)">
                    <AppIcon name="link" :size="16" /> Sao chép liên kết
                  </button>
                  <div class="tk-menu__sep" />
                  <button type="button" class="tk-menu__item tk-menu__item--danger" role="menuitem" @click="close(); emit('remove', [task.id])">
                    <AppIcon name="trash" :size="16" /> Xoá
                  </button>
                </template>
              </TaskMenu>
            </td>
          </tr>

          <tr v-if="view.rows(lane).hiddenDone" class="done-row">
            <td colspan="8">
              <button type="button" class="done-row__btn" :data-test="`show-done-${lane.key}`" @click="view.toggleShowDone(lane.key)">
                <AppIcon name="chevron-right" :size="16" :stroke-width="2.4" />
                Hiện {{ view.rows(lane).hiddenDone }} việc đã hoàn tất
              </button>
            </td>
          </tr>
          <tr v-else-if="view.prefs.showDone.includes(lane.key) && lane.counts.done && !view.filters.mine && !view.filters.query.trim()" class="done-row">
            <td colspan="8">
              <button type="button" class="done-row__btn" @click="view.toggleShowDone(lane.key)">
                <AppIcon name="chevron-down" :size="16" :stroke-width="2.4" />
                Ẩn việc đã hoàn tất
              </button>
            </td>
          </tr>
          <tr v-if="!lane.tasks.length" class="empty-row">
            <td colspan="8">Chưa có công việc nào trong nhóm này.</td>
          </tr>
        </template>
      </tbody>
    </table>

    <div v-if="!view.lanes.value.length" class="list__empty" data-test="list-empty">
      <AppIcon name="inbox" :size="40" :stroke-width="1.6" />
      <strong>Không có công việc phù hợp</strong>
      <span>Thử bỏ bớt bộ lọc hoặc đổi từ khoá tìm kiếm.</span>
      <button type="button" class="tk-btn" @click="view.clearFilters()">Xoá bộ lọc</button>
    </div>
  </div>
</template>

<style scoped>
.list {
  overflow-x: auto;
  border: 1px solid var(--ws-border);
  border-radius: 1.125rem;
  background: var(--ws-surface);
}

.tbl {
  width: 100%;
  min-width: 62rem;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.9375rem;
}

th {
  height: 2.875rem;
  padding: 0 0.75rem;
  border-bottom: 1px solid var(--ws-border);
  color: var(--ws-text-3);
  font-size: 0.71875rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

.th-sort {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.375rem;
  margin-left: -0.375rem;
  border: 0;
  border-radius: 0.375rem;
  background: none;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  cursor: pointer;
}

.th-sort:hover {
  background: var(--ws-surface-2);
  color: var(--ws-text);
}

.th-sort.is-on {
  color: var(--ws-accent-text);
}

td {
  padding: 0 0.75rem;
  vertical-align: middle;
}

.col-check {
  width: 3.25rem;
  padding-left: 1.25rem;
}

.col-labels {
  width: 11%;
}

.col-person {
  width: 15%;
}

.col-prio {
  width: 9.5rem;
}

.col-due {
  width: 10.5rem;
}

.col-status {
  width: 10.5rem;
}

.col-more {
  width: 3.5rem;
  padding-right: 1rem;
  text-align: right;
}

/* ---- Hàng nhóm ---- */
.grp td {
  padding: 0;
  border-top: 1px solid var(--ws-border);
  background: var(--tk-cell);
}

tbody:first-of-type .grp td {
  border-top: 0;
}

.grp__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  min-height: 2.875rem;
  padding: 0.375rem 1rem 0.375rem 1rem;
}

.grp__toggle {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.25rem 0.5rem 0.25rem 0.25rem;
  border: 0;
  border-radius: 0.5rem;
  background: none;
  color: var(--ws-text);
  font: inherit;
  cursor: pointer;
}

.grp__toggle:hover {
  background: var(--ws-surface-2);
}

.grp__toggle strong {
  font-size: 0.96875rem;
}

.grp__chev {
  color: var(--ws-text-2);
  transition: transform 0.2s ease;
}

.grp__toggle[aria-expanded='false'] .grp__chev {
  transform: rotate(-90deg);
}

.grp__count {
  color: var(--ws-text-3);
  font-size: 0.84375rem;
}

.grp__pct {
  color: var(--ws-text-2);
  font-size: 0.8125rem;
  font-weight: 500;
}

.grp__add {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  margin-left: auto;
  padding: 0.375rem 0.625rem;
  border: 0;
  border-radius: 0.5rem;
  background: none;
  color: var(--ws-accent-text);
  font: inherit;
  font-size: 0.84375rem;
  font-weight: 600;
  cursor: pointer;
}

.grp__add:hover {
  background: var(--ws-accent-soft);
}

/* ---- Hàng việc ---- */
.row {
  position: relative;
  height: 3.625rem;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.row td {
  border-top: 1px solid var(--ws-border);
}

.row:hover {
  background: color-mix(in srgb, var(--ws-surface-2) 60%, transparent);
}

.row.is-selected,
.row.is-active {
  background: color-mix(in srgb, var(--ws-accent) 12%, var(--ws-surface));
}

.row.is-selected td:first-child,
.row.is-active td:first-child {
  box-shadow: inset 3px 0 0 var(--ws-accent);
}

.row__title {
  display: block;
  max-width: 100%;
  padding: 0;
  overflow: hidden;
  border: 0;
  background: none;
  color: var(--ws-text);
  font: inherit;
  font-weight: 600;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.row__title:hover {
  color: var(--ws-accent-text);
}

.row.is-done .row__title {
  color: var(--ws-text-3);
  text-decoration: line-through;
}

.row__meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.125rem;
  color: var(--ws-text-3);
  font-size: 0.75rem;
  font-weight: 500;
}

.row__meta > span {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.row__project {
  max-width: 12rem;
  overflow: hidden;
  white-space: nowrap;
}

.row__project .tk-dot {
  width: 0.5rem;
  height: 0.5rem;
}

.row__labels {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.row__more {
  color: var(--ws-text-3);
  font-size: 0.75rem;
}

.cellbtn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 100%;
  min-height: 2rem;
  padding: 0.125rem 0.375rem 0.125rem 0.125rem;
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--ws-text);
  font: inherit;
  font-size: 0.875rem;
  cursor: pointer;
}

.cellbtn:hover {
  background: var(--ws-surface-2);
}

.cellbtn__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cellbtn__text.is-muted {
  color: var(--ws-text-3);
}

.row__more-btn {
  background: transparent;
}

/* ---- Ô chọn ---- */
.chk {
  position: relative;
  display: inline-grid;
  place-items: center;
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
}

.chk input {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.chk__box {
  display: grid;
  place-items: center;
  width: 1.25rem;
  height: 1.25rem;
  border: 1.5px solid var(--ws-text-3);
  border-radius: 0.375rem;
  color: transparent;
  transition:
    background-color 0.12s ease,
    border-color 0.12s ease;
}

.chk input:checked + .chk__box,
.chk input:indeterminate + .chk__box {
  border-color: var(--ws-accent);
  background: var(--ws-accent);
  color: #fff;
}

.chk input:focus-visible + .chk__box {
  outline: 2px solid var(--ws-accent);
  outline-offset: 2px;
}

/* ---- Hàng phụ ---- */
.done-row td,
.empty-row td {
  height: 2.75rem;
  border-top: 1px solid var(--ws-border);
}

.done-row__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  margin-left: 2.5rem;
  padding: 0.25rem 0.5rem;
  border: 0;
  border-radius: 0.5rem;
  background: none;
  color: var(--ws-accent-text);
  font: inherit;
  font-size: 0.84375rem;
  font-weight: 600;
  cursor: pointer;
}

.done-row__btn:hover {
  background: var(--ws-accent-soft);
}

.empty-row td {
  padding-left: 3.25rem;
  color: var(--ws-text-3);
  font-size: 0.875rem;
}

.list__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 3.5rem 1rem;
  color: var(--ws-text-3);
  text-align: center;
}

.list__empty strong {
  color: var(--ws-text);
  font-size: 1.0625rem;
}

/* ---- Màn hẹp: mỗi việc thành một khối gọn ---- */
@media (max-width: 47.99rem) {
  .list {
    border-radius: 1rem;
  }

  .tbl,
  .tbl tbody,
  .tbl tr,
  .tbl td {
    display: block;
    min-width: 0;
  }

  .tbl thead {
    display: none;
  }

  .row {
    display: grid !important;
    grid-template-columns: 2.25rem minmax(0, 1fr) auto;
    grid-template-areas:
      'check title more'
      'check meta meta';
    gap: 0.375rem 0.5rem;
    height: auto;
    padding: 0.75rem 0.75rem 0.75rem 0.25rem;
    border-top: 1px solid var(--ws-border);
  }

  .row td {
    padding: 0;
    border: 0;
  }

  .row .col-check {
    grid-area: check;
    width: auto;
    padding: 0.125rem 0 0 0.5rem;
  }

  .row .col-title {
    grid-area: title;
  }

  .row .col-more {
    grid-area: more;
    width: auto;
    padding: 0;
  }

  .row .col-labels,
  .row .col-prio {
    display: none;
  }

  .row .col-person,
  .row .col-due,
  .row .col-status {
    display: inline-flex;
    grid-area: meta;
    width: auto;
  }

  .row .col-person {
    justify-self: start;
  }

  .row .col-due {
    justify-self: center;
  }

  .row .col-status {
    justify-self: end;
  }

  .row .col-person .cellbtn__text {
    display: none;
  }

  .row__title {
    white-space: normal;
  }
}
</style>
