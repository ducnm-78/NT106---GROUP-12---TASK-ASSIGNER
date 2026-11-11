<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQuery } from 'vue-router'
import AppIcon from '@/shared/components/AppIcon.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import CreateTaskModal from '../components/CreateTaskModal.vue'
import { useToast } from '../composables/useToast'
import { useGroups } from '../groups/useGroups'
import type { Task } from '../types'
import BulkBar from './components/BulkBar.vue'
import TaskBoard from './components/TaskBoard.vue'
import TaskDrawer from './components/TaskDrawer.vue'
import TaskList from './components/TaskList.vue'
import TaskToolbar from './components/TaskToolbar.vue'
import { ensureProject, taskCode, useTasks } from './taskStore'
import { useTaskActions } from './useTaskActions'
import { type CreateDefaults, useTaskView } from './useTaskView'
import './tasks.css'

const route = useRoute()
const router = useRouter()
const store = useTasks()
const view = useTaskView()
const groups = useGroups()
const actions = useTaskActions()
const toast = useToast()

// Nhóm tạo trước khi có mục Công việc (vd. từ Lịch) cũng cần một dự án tương ứng
for (const g of groups.groups.value) ensureProject(g)

const subtitle = computed(() =>
  view.prefs.view === 'board'
    ? 'Kéo thẻ sang cột khác để đổi trạng thái. Gom theo nhóm để xem việc của từng đội.'
    : 'Chọn nhiều việc để đổi trạng thái, giao việc hoặc đặt hạn chót cùng lúc.',
)

/* ---------------- Đồng bộ với URL: ?task=TF-128 · ?view=list · ?scope=launch ---------------- */

function setQuery(patch: Record<string, string | undefined>): void {
  const query: LocationQuery = { ...route.query }
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete query[k]
    else query[k] = v
  }
  router.replace({ query })
}

const activeTask = computed(() => {
  const code = route.query.task
  return typeof code === 'string' ? store.taskByCode(code) : undefined
})

watch(
  () => route.query.task,
  (code) => {
    if (typeof code === 'string' && !store.taskByCode(code)) {
      toast.show(`Không tìm thấy công việc ${code}.`, 'error')
      setQuery({ task: undefined })
    }
  },
  { immediate: true },
)

watch(
  () => route.query.view,
  (v) => {
    if (v === 'list' || v === 'board') view.prefs.view = v
  },
  { immediate: true },
)
watch(
  () => view.prefs.view,
  (v) => {
    if ((route.query.view ?? 'board') !== v) setQuery({ view: v === 'board' ? undefined : v })
    if (v === 'board') selected.value = []
  },
)

watch(
  () => route.query.scope,
  (s) => {
    const id = typeof s === 'string' && store.projects.some((p) => p.id === s) ? s : null
    if (view.filters.projectId !== id) view.filters.projectId = id
  },
  { immediate: true },
)
watch(
  () => view.filters.projectId,
  (id) => {
    if ((route.query.scope ?? null) !== id) setQuery({ scope: id ?? undefined })
  },
)

function openTask(task: Task): void {
  setQuery({ task: taskCode(task) })
}

function closeTask(): void {
  setQuery({ task: undefined })
}

/* ---------------- Tạo ---------------- */

const creating = ref(false)
const createDefaults = ref<CreateDefaults | undefined>(undefined)

function openCreate(defaults?: CreateDefaults): void {
  createDefaults.value = defaults ?? { projectId: view.filters.projectId ?? undefined }
  creating.value = true
}

function onCreated(task: Task): void {
  toast.show(`Đã tạo ${taskCode(task)}: ${task.title}.`, 'success', { label: 'Mở', run: () => openTask(task) })
}

/* ---------------- Chọn nhiều & xoá ---------------- */

const selected = ref<string[]>([])

// Bỏ chọn những việc không còn (đã xoá / bị lọc mất)
watch(view.filtered, (list) => {
  const ids = new Set(list.map((t) => t.id))
  if (selected.value.some((id) => !ids.has(id))) selected.value = selected.value.filter((id) => ids.has(id))
})

const removing = ref<string[]>([])
const removeOpen = computed({
  get: () => removing.value.length > 0,
  set: (v) => {
    if (!v) removing.value = []
  },
})
const removeTitle = computed(() => {
  if (removing.value.length !== 1) return `Xoá ${removing.value.length} công việc?`
  const t = store.taskById(removing.value[0])
  return t ? `Xoá ${taskCode(t)}?` : 'Xoá công việc?'
})

function confirmRemove(): void {
  const ids = [...removing.value]
  if (activeTask.value && ids.includes(activeTask.value.id)) closeTask()
  actions.undoable(ids.length === 1 ? 'Đã xoá công việc.' : `Đã xoá ${ids.length} công việc.`, () => {
    store.deleteTasks(ids)
  })
  selected.value = selected.value.filter((id) => !ids.includes(id))
}

/* ---------------- Phím tắt ---------------- */

function onKey(event: KeyboardEvent): void {
  const t = event.target as HTMLElement
  // Ô tích (chọn dòng) không phải ô nhập chữ: vẫn nhận phím tắt
  const typing = t instanceof HTMLInputElement ? t.type !== 'checkbox' : !!t.closest('textarea, select, [contenteditable]')
  if (typing || t.closest('.tk-menu, [role="dialog"]')) return
  if (event.key === 'n' && !event.ctrlKey && !event.metaKey && !event.altKey && !creating.value) {
    event.preventDefault()
    openCreate()
  } else if (event.key === 'Escape' && selected.value.length && !activeTask.value) {
    selected.value = []
  }
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="ws-page tasks">
    <header class="ws-page-header">
      <div>
        <p class="ws-eyebrow" data-test="tasks-eyebrow">
          Không gian làm việc / {{ store.projects.length }} nhóm, {{ store.tasks.value.length }} công việc
        </p>
        <h1 class="ws-title">Công việc</h1>
        <p class="ws-subtitle">{{ subtitle }}</p>
      </div>
      <button type="button" class="tk-btn tk-btn--primary tasks__create" title="Tạo công việc (phím N)" data-test="create-task" @click="openCreate()">
        <AppIcon name="plus" :size="19" :stroke-width="2.4" />
        Tạo công việc
      </button>
    </header>

    <TaskToolbar>
      <template v-if="view.prefs.view === 'list' && selected.length" #bulk>
        <BulkBar v-model:selected="selected" @remove="removing = $event" />
      </template>
    </TaskToolbar>

    <TaskBoard v-if="view.prefs.view === 'board'" :active-id="activeTask?.id ?? null" @open="openTask" @create="openCreate" />
    <TaskList
      v-else
      v-model:selected="selected"
      :active-id="activeTask?.id ?? null"
      @open="openTask"
      @create="openCreate"
      @remove="removing = $event"
    />

    <TaskDrawer v-if="activeTask" :task-id="activeTask.id" @close="closeTask" @remove="removing = $event" @open="openTask" />

    <CreateTaskModal v-model:open="creating" :defaults="createDefaults" @created="onCreated" />
    <ConfirmModal
      v-model:open="removeOpen"
      :title="removeTitle"
      description="Công việc cùng việc con và bình luận sẽ bị xoá. Bạn có thể hoàn tác ngay sau khi xoá."
      confirm-label="Xoá"
      danger
      @confirm="confirmRemove"
    />
  </div>
</template>

<style scoped>
.tasks__create {
  height: 3.25rem;
  padding: 0 1.5rem;
  border-radius: 0.875rem;
  font-size: 1rem;
}

@media (max-width: 40rem) {
  .tasks__create {
    width: 100%;
  }
}
</style>
