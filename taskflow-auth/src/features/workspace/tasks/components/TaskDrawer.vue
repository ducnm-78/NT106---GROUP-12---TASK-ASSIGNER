<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/shared/components/AppIcon.vue'
import { useToast } from '../../composables/useToast'
import { PRIORITY_SHORT, STATUS_LABELS } from '../../data/constants'
import { useGroups } from '../../groups/useGroups'
import type { Task, TaskStatus } from '../../types'
import { activityText, dueInfo, formatStamp, fullDate, normalize } from '../taskFormat'
import { taskCode, useTasks } from '../taskStore'
import { useTaskActions } from '../useTaskActions'
import { useTaskView } from '../useTaskView'
import DuePicker from './DuePicker.vue'
import PersonPicker from './PersonPicker.vue'
import PriorityMenu from './PriorityMenu.vue'
import StatusMenu from './StatusMenu.vue'
import TaskAvatar from './TaskAvatar.vue'
import TaskMenu from './TaskMenu.vue'

const props = defineProps<{ taskId: string }>()
const emit = defineEmits<{ close: []; remove: [ids: string[]]; open: [task: Task] }>()

const store = useTasks()
const view = useTaskView()
const groups = useGroups()
const actions = useTaskActions()
const toast = useToast()
const router = useRouter()

const task = computed(() => store.taskById(props.taskId))
const project = computed(() => (task.value ? store.projectOf(task.value.projectId) : undefined))
const me = store.meId
const people = computed(() => {
  const list = view.peopleFor(task.value?.projectId)
  const extra = [task.value?.assigneeId, task.value?.reviewerId].filter((x): x is string => !!x && !list.includes(x))
  return [...list, ...extra]
})
const due = computed(() => (task.value ? dueInfo(task.value) : null))
const subDone = computed(() => task.value?.subtasks.filter((s) => s.done).length ?? 0)

/** Kênh chung của nhóm tương ứng — để mở trao đổi bên mục Nhóm. */
const channel = computed(() => {
  const gid = project.value?.groupId
  if (!gid || !groups.group(gid)) return null
  const list = groups.visibleChannels(gid).filter((c) => c.type !== 'voice')
  const c = list.find((x) => x.name === 'chung') ?? list[0]
  return c ? { groupId: gid, id: c.id, name: c.name } : null
})

const panel = ref<HTMLElement | null>(null)
let lastFocused: HTMLElement | null = null

/* ---------------- Tiêu đề & mô tả: sửa tại chỗ, tự lưu khi rời ô ---------------- */

const title = ref('')
const desc = ref('')
const tab = ref<'comments' | 'activity'>('comments')
const titleEl = ref<HTMLTextAreaElement | null>(null)
const descEl = ref<HTMLTextAreaElement | null>(null)

watch(
  () => props.taskId,
  () => {
    title.value = task.value?.title ?? ''
    desc.value = task.value?.description ?? ''
    tab.value = 'comments'
    nextTick(() => {
      fit(titleEl.value)
      fit(descEl.value)
    })
  },
  { immediate: true },
)

function fit(el: HTMLTextAreaElement | null): void {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

function saveTitle(): void {
  const t = task.value
  if (!t || title.value.trim() === t.title) return
  const r = store.updateTask(t.id, { title: title.value })
  if (!r.ok) {
    toast.show(r.error, 'error')
    title.value = t.title
    nextTick(() => fit(titleEl.value))
  }
}

function saveDesc(): void {
  const t = task.value
  if (t && desc.value.trim() !== t.description) store.updateTask(t.id, { description: desc.value })
}

function cancelEdit(event: KeyboardEvent, kind: 'title' | 'desc'): void {
  event.stopPropagation()
  if (kind === 'title') title.value = task.value?.title ?? ''
  else desc.value = task.value?.description ?? ''
  ;(event.target as HTMLElement).blur()
}

/* ---------------- Trạng thái & duyệt ---------------- */

function setStatus(s: TaskStatus): void {
  if (task.value) actions.changeStatus(task.value, s)
}

function approve(): void {
  const t = task.value
  if (!t) return
  actions.undoable(`Đã duyệt và hoàn tất ${taskCode(t)}.`, () => store.approveTask(t.id).ok)
}

async function requestChanges(): Promise<void> {
  const t = task.value
  if (!t) return
  actions.undoable(`Đã trả ${taskCode(t)} về Đang làm để sửa.`, () => store.requestChanges(t.id).ok)
  // Gợi ý ghi rõ cần sửa gì cho người phụ trách
  tab.value = 'comments'
  comment.value = t.assigneeId && t.assigneeId !== me.value ? `@${groups.person(t.assigneeId).name} cần sửa: ` : 'Cần sửa: '
  await nextTick()
  composer.value?.focus()
}

function nudgeReviewer(): void {
  const t = task.value
  if (!t?.reviewerId) return
  const r = store.addComment(t.id, `@${groups.person(t.reviewerId).name} nhờ bạn duyệt giúp việc này nhé.`)
  if (r.ok) {
    tab.value = 'comments'
    toast.show(`Đã nhắc ${groups.person(t.reviewerId).name} duyệt.`)
  }
}

const isReviewer = computed(() => !task.value?.reviewerId || task.value.reviewerId === me.value)

/* ---------------- Thuộc tính ---------------- */

function setPerson(field: 'assigneeId' | 'reviewerId', id: string | null, close: () => void): void {
  close()
  const t = task.value
  if (!t || t[field] === id) return
  store.updateTask(t.id, { [field]: id })
}

function setDue(iso: string, close: () => void): void {
  close()
  if (task.value) store.updateTask(task.value.id, { due: iso })
}

function setProject(projectId: string, close: () => void): void {
  close()
  const t = task.value
  if (!t || t.projectId === projectId) return
  actions.undoable(`Đã chuyển ${taskCode(t)} sang ${store.projectOf(projectId)?.name}.`, () => store.updateTask(t.id, { projectId }).ok)
}

const labelDraft = ref('')
const labelSuggestions = computed(() => {
  const q = normalize(labelDraft.value.trim())
  return store.labelsInUse.value.filter((l) => !task.value?.labels.includes(l) && (!q || normalize(l).includes(q))).slice(0, 8)
})

function addLabel(label: string, close?: () => void): void {
  const t = task.value
  const name = label.trim()
  if (!t || !name) return
  if (t.labels.length >= 6) {
    toast.show('Mỗi việc tối đa 6 nhãn.', 'error')
    return
  }
  store.updateTask(t.id, { labels: [...t.labels, name] })
  labelDraft.value = ''
  close?.()
}

function removeLabel(label: string): void {
  const t = task.value
  if (t) store.updateTask(t.id, { labels: t.labels.filter((l) => l !== label) })
}

/* ---------------- Việc con ---------------- */

const subDraft = ref('')
const addingSub = ref(false)
const subInput = ref<HTMLInputElement | null>(null)
const editingSub = ref<string | null>(null)
const subEdit = ref('')

async function startSub(): Promise<void> {
  addingSub.value = true
  await nextTick()
  subInput.value?.focus()
}

function submitSub(): void {
  const t = task.value
  if (!t) return
  if (!subDraft.value.trim()) {
    addingSub.value = false
    return
  }
  const r = store.addSubtask(t.id, subDraft.value)
  if (!r.ok) toast.show(r.error, 'error')
  subDraft.value = ''
}

function editSub(id: string, current: string): void {
  editingSub.value = id
  subEdit.value = current
  nextTick(() => document.querySelector<HTMLInputElement>(`[data-sub-edit="${id}"]`)?.focus())
}

function saveSub(id: string): void {
  if (editingSub.value !== id || !task.value) return
  if (subEdit.value.trim()) store.renameSubtask(task.value.id, id, subEdit.value)
  editingSub.value = null
}

/* ---------------- Bình luận & hoạt động ---------------- */

const comment = ref('')
const composer = ref<HTMLTextAreaElement | null>(null)
const mention = ref<{ query: string; start: number } | null>(null)
const mentionIndex = ref(0)

const mentionList = computed(() => {
  if (!mention.value) return []
  const q = normalize(mention.value.query)
  return people.value.filter((id) => normalize(groups.person(id).name).includes(q)).slice(0, 6)
})

function onComposerInput(): void {
  const el = composer.value
  if (!el) return
  fit(el)
  const before = comment.value.slice(0, el.selectionStart)
  const m = before.match(/(^|\s)@([\p{L}\d]*)$/u)
  mention.value = m ? { query: m[2], start: before.length - m[2].length - 1 } : null
  mentionIndex.value = 0
}

function pickMention(id: string): void {
  const el = composer.value
  if (!el || !mention.value) return
  const name = groups.person(id).name
  const end = el.selectionStart
  comment.value = `${comment.value.slice(0, mention.value.start)}@${name} ${comment.value.slice(end)}`
  const caret = mention.value.start + name.length + 2
  mention.value = null
  nextTick(() => {
    el.focus()
    el.setSelectionRange(caret, caret)
  })
}

function onComposerKey(event: KeyboardEvent): void {
  if (mention.value && mentionList.value.length) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const n = mentionList.value.length
      mentionIndex.value = (mentionIndex.value + (event.key === 'ArrowDown' ? 1 : n - 1)) % n
      return
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      pickMention(mentionList.value[mentionIndex.value])
      return
    }
    if (event.key === 'Escape') {
      event.stopPropagation()
      mention.value = null
      return
    }
  }
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    sendComment()
  }
}

function sendComment(): void {
  const t = task.value
  if (!t || !comment.value.trim()) return
  const r = store.addComment(t.id, comment.value)
  if (!r.ok) {
    toast.show(r.error, 'error')
    return
  }
  comment.value = ''
  mention.value = null
  nextTick(() => {
    fit(composer.value)
    const list = panel.value?.querySelector('.drawer__body')
    list?.scrollTo({ top: list.scrollHeight, behavior: 'smooth' })
  })
}

/** Tách nội dung bình luận để tô sáng @nhắc tên. */
function commentParts(text: string): { text: string; mention: boolean }[] {
  const names = people.value.map((id) => groups.person(id).name).sort((x, y) => y.length - x.length)
  if (!names.length) return [{ text, mention: false }]
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`(@(?:${escaped.join('|')}))`, 'g')
  const mentions = new Set(names.map((n) => `@${n}`))
  return text
    .split(re)
    .filter(Boolean)
    .map((part) => ({ text: part, mention: mentions.has(part) }))
}

const activityLines = computed(() =>
  (task.value?.activity ?? []).map((a) => ({
    ...a,
    text: activityText(a, (id) => groups.person(id).name, (id) => store.projectOf(id)?.name ?? 'khác'),
  })),
)

/* ---------------- Khác ---------------- */

async function copyLink(): Promise<void> {
  if (!task.value) return
  const url = `${location.origin}/tasks?task=${taskCode(task.value)}`
  try {
    await navigator.clipboard.writeText(url)
    toast.show('Đã sao chép liên kết công việc.')
  } catch {
    toast.show(url, 'info')
  }
}

function duplicate(close: () => void): void {
  close()
  if (!task.value) return
  const r = store.duplicateTask(task.value.id)
  if (r.ok) {
    toast.show(`Đã nhân bản thành ${taskCode(r.value)}.`)
    emit('open', r.value)
  }
}

function share(close: () => void): void {
  close()
  const t = task.value
  if (!t || !channel.value) return
  const r = groups.postTaskCard(channel.value.groupId, {
    title: `${taskCode(t)} · ${t.title}`,
    status: STATUS_LABELS[t.status],
    due: fullDate(t.due),
  })
  if (!r.ok) {
    toast.show(r.error, 'error')
    return
  }
  const target = { name: 'team-channel', params: { groupId: channel.value.groupId, channelId: r.value.id } }
  toast.show(`Đã gửi vào #${r.value.name}.`, 'success', { label: 'Mở kênh', run: () => router.push(target) })
}

function openChannel(): void {
  if (channel.value) router.push({ name: 'team-channel', params: { groupId: channel.value.groupId, channelId: channel.value.id } })
}

function close(): void {
  saveTitle()
  saveDesc()
  emit('close')
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && !event.defaultPrevented) {
    const t = event.target as HTMLElement
    if (t.closest('.tk-menu')) return
    event.preventDefault()
    close()
  }
}

onMounted(() => {
  lastFocused = document.activeElement as HTMLElement | null
  document.addEventListener('keydown', onKeydown)
  nextTick(() => panel.value?.focus({ preventScroll: true }))
})

onBeforeUnmount(() => {
  saveTitle()
  saveDesc()
  document.removeEventListener('keydown', onKeydown)
  if (lastFocused && document.contains(lastFocused)) lastFocused.focus({ preventScroll: true })
})

// Việc bị xoá (vd. từ tab khác / hoàn tác) thì đóng ngăn
watch(task, (t) => !t && emit('close'))
</script>

<template>
  <Teleport to=".ws" defer>
    <div class="drawer-scrim" data-test="drawer-scrim" @click="close" />
    <aside
      v-if="task"
      ref="panel"
      class="drawer"
      role="dialog"
      aria-modal="false"
      :aria-label="`Chi tiết ${taskCode(task)}`"
      tabindex="-1"
      data-test="task-drawer"
    >
      <header class="drawer__top">
        <span v-if="project" class="tk-code" :style="{ '--c': project.color }">{{ project.code }}</span>
        <span class="drawer__crumb">
          {{ project?.name }}
          <span class="drawer__key" data-test="drawer-key">/ {{ taskCode(task) }}</span>
        </span>
        <span class="drawer__tools">
          <button type="button" class="tk-icon-btn" aria-label="Sao chép liên kết" title="Sao chép liên kết" data-test="drawer-copy" @click="copyLink">
            <AppIcon name="link" :size="17" />
          </button>
          <TaskMenu align="end" label="Thao tác khác">
            <template #trigger="{ toggle, open }">
              <button type="button" class="tk-icon-btn" :aria-expanded="open" aria-label="Thao tác khác" data-test="drawer-more" @click="toggle">
                <AppIcon name="more" :size="18" />
              </button>
            </template>
            <template #default="{ close: closeMenu }">
              <button type="button" class="tk-menu__item" role="menuitem" data-test="drawer-duplicate" @click="duplicate(closeMenu)">
                <AppIcon name="copy" :size="16" /> Nhân bản
              </button>
              <button
                type="button"
                class="tk-menu__item"
                role="menuitem"
                :disabled="!channel"
                data-test="drawer-share"
                @click="share(closeMenu)"
              >
                <AppIcon name="send" :size="16" /> Gửi vào kênh nhóm
              </button>
              <div class="tk-menu__sep" />
              <button
                type="button"
                class="tk-menu__item tk-menu__item--danger"
                role="menuitem"
                data-test="drawer-delete"
                @click="closeMenu(); emit('remove', [task.id])"
              >
                <AppIcon name="trash" :size="16" /> Xoá công việc
              </button>
            </template>
          </TaskMenu>
          <button type="button" class="tk-icon-btn" aria-label="Đóng (Esc)" title="Đóng (Esc)" data-test="drawer-close" @click="close">
            <AppIcon name="x" :size="18" :stroke-width="2.2" />
          </button>
        </span>
      </header>

      <div class="drawer__body ws-scroll">
        <textarea
          ref="titleEl"
          v-model="title"
          class="drawer__title"
          rows="1"
          maxlength="200"
          aria-label="Tên công việc"
          data-test="drawer-title"
          @input="fit(titleEl)"
          @blur="saveTitle"
          @keydown.enter.prevent="($event.target as HTMLElement).blur()"
          @keydown.esc="cancelEdit($event, 'title')"
        />

        <div class="drawer__actions">
          <StatusMenu :status="task.status" test-id="drawer-status" @change="setStatus" />
          <template v-if="task.status === 'todo'">
            <button type="button" class="tk-btn tk-btn--primary" data-test="action-start" @click="setStatus('doing')">
              <AppIcon name="play" :size="15" /> Bắt đầu làm
            </button>
          </template>
          <template v-else-if="task.status === 'doing'">
            <button v-if="task.reviewerId" type="button" class="tk-btn tk-btn--primary" data-test="action-submit" @click="setStatus('review')">
              <AppIcon name="eye-check" :size="16" /> Gửi duyệt
            </button>
            <button
              type="button"
              class="tk-btn"
              :class="{ 'tk-btn--primary': !task.reviewerId }"
              data-test="action-done"
              @click="setStatus('done')"
            >
              <AppIcon name="check" :size="16" /> Hoàn tất
            </button>
          </template>
          <template v-else-if="task.status === 'review'">
            <template v-if="isReviewer">
              <button type="button" class="tk-btn tk-btn--primary" data-test="action-approve" @click="approve">
                <AppIcon name="check" :size="16" /> Duyệt và hoàn tất
              </button>
              <button type="button" class="tk-btn" data-test="action-changes" @click="requestChanges">
                <AppIcon name="rotate" :size="15" /> Yêu cầu sửa
              </button>
            </template>
            <template v-else>
              <span class="drawer__waiting">
                <AppIcon name="clock" :size="15" /> Chờ {{ view.nameOf(task.reviewerId) }} duyệt
              </span>
              <button type="button" class="tk-btn" data-test="action-nudge" @click="nudgeReviewer">
                <AppIcon name="bell" :size="15" /> Nhắc duyệt
              </button>
            </template>
          </template>
          <button v-else type="button" class="tk-btn" data-test="action-reopen" @click="setStatus('doing')">
            <AppIcon name="rotate" :size="15" /> Mở lại
          </button>
        </div>

        <dl class="props">
          <dt>Người phụ trách</dt>
          <dd>
            <TaskMenu label="Người phụ trách">
              <template #trigger="{ toggle, open }">
                <button type="button" class="prop-btn" :aria-expanded="open" data-test="prop-assignee" @click="toggle">
                  <TaskAvatar :id="task.assigneeId" :size="26" />
                  <span :class="{ 'is-muted': !task.assigneeId }">{{ view.nameOf(task.assigneeId) }}</span>
                </button>
              </template>
              <template #default="{ close: c }">
                <PersonPicker :people="people" :selected="task.assigneeId" @pick="setPerson('assigneeId', $event, c)" />
              </template>
            </TaskMenu>
          </dd>

          <dt>Người duyệt</dt>
          <dd>
            <TaskMenu label="Người duyệt">
              <template #trigger="{ toggle, open }">
                <button type="button" class="prop-btn" :aria-expanded="open" data-test="prop-reviewer" @click="toggle">
                  <TaskAvatar :id="task.reviewerId" :size="26" />
                  <span :class="{ 'is-muted': !task.reviewerId }">{{ task.reviewerId ? view.nameOf(task.reviewerId) : 'Chưa chọn' }}</span>
                </button>
              </template>
              <template #default="{ close: c }">
                <PersonPicker :people="people" :selected="task.reviewerId" none-label="Không cần duyệt" @pick="setPerson('reviewerId', $event, c)" />
              </template>
            </TaskMenu>
          </dd>

          <dt>Ưu tiên</dt>
          <dd>
            <PriorityMenu
              :priority="task.priority"
              test-id="prop-priority"
              @change="store.updateTask(task.id, { priority: $event }); toast.show(`Đã đổi ưu tiên thành ${PRIORITY_SHORT[$event]}.`)"
            />
          </dd>

          <dt>Hạn chót</dt>
          <dd>
            <TaskMenu label="Hạn chót">
              <template #trigger="{ toggle, open }">
                <button type="button" class="prop-btn" :aria-expanded="open" data-test="prop-due" @click="toggle">
                  <AppIcon name="calendar" :size="17" class="prop-btn__icon" />
                  <span>{{ fullDate(task.due) }}</span>
                  <span v-if="due" class="prop-rel" :class="`is-${due.tone}`">{{ due.relative }}</span>
                </button>
              </template>
              <template #default="{ close: c }">
                <DuePicker :value="task.due" @pick="setDue($event, c)" />
              </template>
            </TaskMenu>
          </dd>

          <dt>Nhãn</dt>
          <dd class="labels">
            <span v-for="l in task.labels" :key="l" class="tk-label labels__chip">
              {{ l }}
              <button type="button" :aria-label="`Bỏ nhãn ${l}`" @click="removeLabel(l)"><AppIcon name="x" :size="11" :stroke-width="2.6" /></button>
            </span>
            <TaskMenu label="Thêm nhãn" @open="labelDraft = ''">
              <template #trigger="{ toggle, open }">
                <button type="button" class="labels__add" :aria-expanded="open" aria-label="Thêm nhãn" data-test="label-add" @click="toggle">
                  <AppIcon name="plus" :size="13" :stroke-width="2.6" />
                </button>
              </template>
              <template #default="{ close: c }">
                <form class="label-form" @submit.prevent="addLabel(labelDraft, c)">
                  <input
                    v-model="labelDraft"
                    class="ws-input tk-menu__search"
                    maxlength="24"
                    placeholder="Tên nhãn, Enter để thêm"
                    aria-label="Tên nhãn mới"
                    autofocus
                    data-test="label-input"
                  />
                </form>
                <button
                  v-for="l in labelSuggestions"
                  :key="l"
                  type="button"
                  class="tk-menu__item"
                  role="menuitem"
                  @click="addLabel(l, c)"
                >
                  <span class="tk-label">{{ l }}</span>
                </button>
              </template>
            </TaskMenu>
          </dd>

          <dt>Nhóm</dt>
          <dd>
            <TaskMenu label="Chuyển nhóm">
              <template #trigger="{ toggle, open }">
                <button type="button" class="prop-btn" :aria-expanded="open" data-test="prop-project" @click="toggle">
                  <span v-if="project" class="tk-code prop-code" :style="{ '--c': project.color }">{{ project.code }}</span>
                  <span>{{ project?.name }}</span>
                </button>
              </template>
              <template #default="{ close: c }">
                <button
                  v-for="p in store.projects"
                  :key="p.id"
                  type="button"
                  class="tk-menu__item"
                  role="menuitemradio"
                  :aria-checked="p.id === task.projectId"
                  @click="setProject(p.id, c)"
                >
                  <span class="tk-code prop-code" :style="{ '--c': p.color }">{{ p.code }}</span> {{ p.name }}
                </button>
              </template>
            </TaskMenu>
          </dd>
        </dl>

        <section class="sec">
          <h3 class="sec__title">Mô tả</h3>
          <textarea
            ref="descEl"
            v-model="desc"
            class="drawer__desc"
            rows="2"
            maxlength="4000"
            placeholder="Thêm mô tả: mục tiêu, cách làm, tiêu chí hoàn thành…"
            aria-label="Mô tả công việc"
            data-test="drawer-desc"
            @input="fit(descEl)"
            @blur="saveDesc"
            @keydown.esc="cancelEdit($event, 'desc')"
          />
        </section>

        <section class="sec" data-test="subtasks">
          <h3 class="sec__title">
            Việc con
            <span v-if="task.subtasks.length" class="sec__count" data-test="subtask-count">{{ subDone }}/{{ task.subtasks.length }}</span>
            <span v-if="task.subtasks.length" class="tk-bar sec__bar" aria-hidden="true">
              <span :style="{ width: `${(subDone / task.subtasks.length) * 100}%` }" />
            </span>
          </h3>
          <ul class="subs">
            <li v-for="s in task.subtasks" :key="s.id" class="sub" :class="{ 'is-done': s.done }">
              <label class="sub__check">
                <input type="checkbox" :checked="s.done" :aria-label="`Hoàn thành: ${s.title}`" @change="store.toggleSubtask(task.id, s.id)" />
                <span class="sub__box"><AppIcon name="check" :size="13" :stroke-width="3.2" /></span>
              </label>
              <input
                v-if="editingSub === s.id"
                v-model="subEdit"
                class="ws-input sub__edit"
                :data-sub-edit="s.id"
                maxlength="200"
                aria-label="Sửa tên việc con"
                @keydown.enter.prevent="saveSub(s.id)"
                @keydown.esc.stop="editingSub = null"
                @blur="saveSub(s.id)"
              />
              <button v-else type="button" class="sub__title" title="Bấm để sửa" @click="editSub(s.id, s.title)">{{ s.title }}</button>
              <TaskAvatar v-if="s.assigneeId" :id="s.assigneeId" :size="22" />
              <button type="button" class="sub__del" :aria-label="`Xoá việc con ${s.title}`" @click="store.removeSubtask(task.id, s.id)">
                <AppIcon name="x" :size="14" />
              </button>
            </li>
          </ul>
          <form v-if="addingSub" class="sub-add" @submit.prevent="submitSub">
            <input
              ref="subInput"
              v-model="subDraft"
              class="ws-input"
              maxlength="200"
              placeholder="Tên việc con, Enter để thêm tiếp"
              aria-label="Tên việc con"
              data-test="subtask-input"
              @keydown.esc.stop="addingSub = false"
              @blur="!subDraft.trim() && (addingSub = false)"
            />
          </form>
          <button v-else type="button" class="link-btn" data-test="subtask-add" @click="startSub">
            <AppIcon name="plus" :size="16" :stroke-width="2.4" /> Thêm việc con
          </button>
        </section>

        <section class="sec sec--discuss">
          <div class="tabs" role="tablist">
            <button
              type="button"
              role="tab"
              class="tabs__btn"
              :aria-selected="tab === 'comments'"
              data-test="tab-comments"
              @click="tab = 'comments'"
            >
              Bình luận ({{ task.comments.length }})
            </button>
            <button
              type="button"
              role="tab"
              class="tabs__btn"
              :aria-selected="tab === 'activity'"
              data-test="tab-activity"
              @click="tab = 'activity'"
            >
              Hoạt động
            </button>
            <button v-if="channel" type="button" class="tabs__link" data-test="open-channel" @click="openChannel">
              <AppIcon name="hash" :size="15" /> Mở trong #{{ channel.name }}
            </button>
          </div>

          <ul v-if="tab === 'comments'" class="comments" data-test="comment-list">
            <li v-for="c in task.comments" :key="c.id" class="comment">
              <TaskAvatar :id="c.authorId" :size="32" />
              <div class="comment__body">
                <div class="comment__head">
                  <strong>{{ groups.person(c.authorId).name }}</strong>
                  <time :datetime="c.at">{{ formatStamp(c.at) }}</time>
                </div>
                <p class="comment__text">
                  <template v-for="(p, i) in commentParts(c.text)" :key="i">
                    <span v-if="p.mention" class="comment__mention">{{ p.text }}</span>
                    <template v-else>{{ p.text }}</template>
                  </template>
                </p>
              </div>
            </li>
            <li v-if="!task.comments.length" class="comments__empty">Chưa có bình luận. Hãy là người đầu tiên trao đổi về việc này.</li>
          </ul>

          <ol v-else class="acts" data-test="activity-list">
            <li v-for="a in activityLines" :key="a.id" class="act">
              <TaskAvatar :id="a.actorId" :size="24" />
              <span class="act__text">
                <strong>{{ groups.person(a.actorId).name }}</strong> {{ a.text }}
              </span>
              <time class="act__time" :datetime="a.at">{{ formatStamp(a.at) }}</time>
            </li>
          </ol>
        </section>
      </div>

      <form class="composer" @submit.prevent="sendComment">
        <TaskAvatar :id="me" :size="32" />
        <div class="composer__box">
          <ul v-if="mention && mentionList.length" class="mentions" role="listbox" aria-label="Nhắc tên">
            <li
              v-for="(id, i) in mentionList"
              :key="id"
              role="option"
              :aria-selected="i === mentionIndex"
              class="mentions__item"
              :class="{ 'is-on': i === mentionIndex }"
              @mousedown.prevent="pickMention(id)"
            >
              <TaskAvatar :id="id" :size="22" /> {{ groups.person(id).name }}
            </li>
          </ul>
          <textarea
            ref="composer"
            v-model="comment"
            class="composer__input"
            rows="1"
            maxlength="2000"
            placeholder="Viết bình luận, gõ @ để nhắc ai đó"
            aria-label="Viết bình luận"
            data-test="comment-input"
            @input="onComposerInput"
            @keydown="onComposerKey"
          />
          <button type="submit" class="composer__send" :disabled="!comment.trim()" aria-label="Gửi bình luận" data-test="comment-send">
            <AppIcon name="send" :size="16" />
          </button>
        </div>
      </form>
    </aside>
  </Teleport>
</template>

<style scoped>
.drawer-scrim {
  position: fixed;
  inset: var(--topbar-h) 0 0 var(--sidebar-w);
  z-index: 45;
  background: color-mix(in srgb, var(--ws-overlay) 85%, transparent);
  animation: fade 0.18s ease-out;
}

.drawer {
  position: fixed;
  top: var(--topbar-h);
  right: 0;
  bottom: 0;
  z-index: 46;
  display: flex;
  flex-direction: column;
  width: min(38.75rem, 100vw);
  border-left: 1px solid var(--ws-border-strong);
  background: var(--ws-sidebar);
  box-shadow: -24px 0 60px -30px rgb(0 0 0 / 0.6);
  outline: none;
  animation: slide 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes fade {
  from {
    opacity: 0;
  }
}

@keyframes slide {
  from {
    opacity: 0.4;
    transform: translateX(2.5rem);
  }
}

.drawer__top {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 1rem 1.5rem 0.5rem 2rem;
}

.drawer__crumb {
  min-width: 0;
  overflow: hidden;
  color: var(--ws-text-2);
  font-size: 0.875rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer__key {
  margin-left: 0.25rem;
  color: var(--ws-text-3);
  font-weight: 600;
}

.drawer__tools {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}

.drawer__body {
  flex: 1;
  min-height: 0;
  padding: 0.5rem 2rem 1.5rem;
  overflow-y: auto;
}

.drawer__title {
  display: block;
  width: calc(100% + 1rem);
  margin: 0 -0.5rem;
  padding: 0.375rem 0.5rem;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 0.625rem;
  background: none;
  color: var(--ws-text);
  font: inherit;
  font-size: 1.625rem;
  font-weight: 700;
  line-height: 1.3;
  resize: none;
  outline: none;
}

.drawer__title:hover {
  background: var(--ws-surface-2);
}

.drawer__title:focus {
  border-color: var(--ws-accent);
  background: var(--ws-surface-2);
}

.drawer__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.625rem;
  margin: 0.75rem 0 1.25rem;
}

.drawer__actions :deep(.pill) {
  height: 2.375rem;
  padding: 0 0.875rem;
  font-size: 0.875rem;
}

.drawer__waiting {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--st-review-text);
  font-size: 0.875rem;
  font-weight: 600;
}

/* ---- Thuộc tính ---- */
.props {
  display: grid;
  grid-template-columns: 9.5rem minmax(0, 1fr);
  align-items: center;
  gap: 0.375rem 1rem;
  margin: 0;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--ws-border-strong);
}

.props dt {
  color: var(--ws-text-3);
  font-size: 0.875rem;
}

.props dd {
  min-width: 0;
  margin: 0;
}

.prop-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 100%;
  min-height: 2.25rem;
  padding: 0.25rem 0.625rem 0.25rem 0.375rem;
  border: 0;
  border-radius: 0.625rem;
  background: none;
  color: var(--ws-text);
  font: inherit;
  font-size: 0.90625rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
}

.prop-btn:hover {
  background: var(--ws-surface-2);
}

.prop-btn .is-muted {
  color: var(--ws-text-3);
}

.prop-btn__icon {
  color: var(--ws-text-2);
}

.prop-rel {
  color: var(--ws-text-3);
  font-size: 0.84375rem;
  font-weight: 400;
}

.prop-rel.is-overdue {
  color: var(--ws-danger);
  font-weight: 600;
}

.prop-rel.is-today,
.prop-rel.is-soon {
  color: var(--st-todo-text);
  font-weight: 600;
}

.prop-code {
  width: 1.5rem;
  height: 1.5rem;
  font-size: 0.5625rem;
}

.labels {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0;
}

.labels__chip button {
  display: grid;
  place-items: center;
  width: 1rem;
  height: 1rem;
  margin-right: -0.25rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--ws-text-3);
  cursor: pointer;
}

.labels__chip button:hover {
  background: var(--ws-surface-3);
  color: var(--ws-text);
}

.labels__add {
  display: grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: 1px dashed var(--ws-border-strong);
  border-radius: 50%;
  background: var(--ws-surface-2);
  color: var(--ws-text-2);
  cursor: pointer;
}

.labels__add:hover {
  border-color: var(--ws-accent);
  color: var(--ws-accent-text);
}

.label-form {
  padding: 0.125rem;
}

/* ---- Khối nội dung ---- */
.sec {
  padding-top: 1.25rem;
}

.sec__title {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin: 0 0 0.625rem;
  color: var(--ws-text-3);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.sec__count {
  color: var(--ws-accent-text);
  letter-spacing: 0;
}

.sec__bar {
  flex: 1;
  width: auto;
}

.drawer__desc {
  display: block;
  width: calc(100% + 1rem);
  min-height: 3.25rem;
  margin: 0 -0.5rem;
  padding: 0.5rem;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 0.625rem;
  background: none;
  color: var(--ws-text-2);
  font: inherit;
  font-size: 0.90625rem;
  line-height: 1.6;
  resize: none;
  outline: none;
}

.drawer__desc:hover {
  background: var(--ws-surface-2);
}

.drawer__desc:focus {
  border-color: var(--ws-accent);
  background: var(--ws-surface-2);
  color: var(--ws-text);
}

/* ---- Việc con ---- */
.subs {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  margin: 0 0 0.375rem;
  padding: 0;
  list-style: none;
}

.sub {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 2.25rem;
  padding: 0 0.375rem;
  margin: 0 -0.375rem;
  border-radius: 0.5rem;
}

.sub:hover {
  background: var(--ws-surface-2);
}

.sub__check {
  position: relative;
  display: inline-grid;
  flex: none;
  place-items: center;
  cursor: pointer;
}

.sub__check input {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.sub__box {
  display: grid;
  place-items: center;
  width: 1.25rem;
  height: 1.25rem;
  border: 1.5px solid var(--ws-text-3);
  border-radius: 0.375rem;
  color: transparent;
}

.sub__check input:checked + .sub__box {
  border-color: var(--st-done);
  background: var(--st-done);
  color: #fff;
}

.sub__check input:focus-visible + .sub__box {
  outline: 2px solid var(--ws-accent);
  outline-offset: 2px;
}

.sub__title {
  flex: 1;
  min-width: 0;
  padding: 0.25rem 0;
  border: 0;
  background: none;
  color: var(--ws-text);
  font: inherit;
  font-size: 0.90625rem;
  text-align: left;
  cursor: text;
}

.sub.is-done .sub__title {
  color: var(--ws-text-3);
  text-decoration: line-through;
}

.sub__edit {
  flex: 1;
  height: 2rem;
  font-size: 0.875rem;
}

.sub__del {
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
  opacity: 0;
}

.sub:hover .sub__del,
.sub__del:focus-visible {
  opacity: 1;
}

.sub__del:hover {
  background: color-mix(in srgb, var(--ws-danger) 15%, transparent);
  color: var(--ws-danger);
}

@media (hover: none) {
  .sub__del {
    opacity: 1;
  }
}

.sub-add .ws-input {
  height: 2.375rem;
  font-size: 0.875rem;
}

.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  margin-left: -0.5rem;
  border: 0;
  border-radius: 0.5rem;
  background: none;
  color: var(--ws-accent-text);
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.link-btn:hover {
  background: var(--ws-accent-soft);
}

/* ---- Thảo luận ---- */
.sec--discuss {
  margin-top: 1.25rem;
  border-top: 1px solid var(--ws-border-strong);
}

.tabs {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 0.75rem;
}

.tabs__btn {
  position: relative;
  padding: 0.375rem 0 0.625rem;
  border: 0;
  background: none;
  color: var(--ws-text-2);
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
}

.tabs__btn[aria-selected='true'] {
  color: var(--ws-text);
  font-weight: 700;
}

.tabs__btn[aria-selected='true']::after {
  position: absolute;
  inset: auto 0 0;
  height: 3px;
  border-radius: 2px;
  background: var(--ws-accent);
  content: '';
}

.tabs__link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;
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

.tabs__link:hover {
  background: var(--ws-accent-soft);
}

.comments,
.acts {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.comment {
  display: flex;
  gap: 0.75rem;
}

.comment__body {
  min-width: 0;
}

.comment__head {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.comment__head time {
  color: var(--ws-text-3);
  font-size: 0.75rem;
}

.comment__text {
  margin: 0.125rem 0 0;
  color: var(--ws-text);
  font-size: 0.875rem;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.comment__mention {
  padding: 0 0.1875rem;
  border-radius: 0.25rem;
  background: var(--ws-accent-soft);
  color: var(--ws-accent-text);
  font-weight: 600;
}

.comments__empty {
  color: var(--ws-text-3);
  font-size: 0.875rem;
}

.act {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 0.84375rem;
}

.act__text {
  flex: 1;
  min-width: 0;
  color: var(--ws-text-2);
}

.act__text strong {
  color: var(--ws-text);
  font-weight: 600;
}

.act__time {
  flex: none;
  color: var(--ws-text-3);
  font-size: 0.75rem;
}

/* ---- Ô viết bình luận ---- */
.composer {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  padding: 0.875rem 1.5rem 1rem 2rem;
  border-top: 1px solid var(--ws-border-strong);
  background: var(--ws-sidebar);
}

.composer__box {
  position: relative;
  display: flex;
  flex: 1;
  align-items: flex-end;
  gap: 0.375rem;
  min-width: 0;
  padding: 0.375rem 0.375rem 0.375rem 0.875rem;
  border: 1px solid var(--ws-border-strong);
  border-radius: 0.75rem;
  background: var(--ws-surface-2);
}

.composer__box:focus-within {
  border-color: var(--ws-accent);
  box-shadow: 0 0 0 3px var(--ws-accent-soft);
}

.composer__input {
  flex: 1;
  max-height: 8rem;
  min-height: 2rem;
  padding: 0.375rem 0;
  border: 0;
  background: none;
  color: var(--ws-text);
  font: inherit;
  font-size: 0.875rem;
  line-height: 1.4;
  resize: none;
  outline: none;
}

.composer__send {
  display: grid;
  flex: none;
  place-items: center;
  width: 2.125rem;
  height: 2rem;
  padding: 0;
  border: 0;
  border-radius: 0.5625rem;
  background: var(--ws-accent-grad);
  color: #fff;
  cursor: pointer;
}

.composer__send:disabled {
  background: var(--ws-surface-3);
  color: var(--ws-text-3);
  cursor: not-allowed;
}

.mentions {
  position: absolute;
  bottom: calc(100% + 0.375rem);
  left: 0;
  z-index: 2;
  width: min(16rem, 100%);
  margin: 0;
  padding: 0.375rem;
  border: 1px solid var(--ws-border-strong);
  border-radius: 0.75rem;
  background: var(--ws-surface);
  box-shadow: var(--ws-shadow);
  list-style: none;
}

.mentions__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.mentions__item.is-on,
.mentions__item:hover {
  background: var(--ws-accent-soft);
}

@media (max-width: 64rem) {
  .drawer-scrim {
    left: 0;
  }
}

@media (max-width: 40rem) {
  .drawer__top,
  .drawer__body,
  .composer {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .props {
    grid-template-columns: 7.5rem minmax(0, 1fr);
  }

  .drawer__title {
    font-size: 1.375rem;
  }
}
</style>
