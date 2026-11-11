<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import { PRIORITY_ORDER, PRIORITY_SHORT, STATUS_LABELS, STATUS_ORDER } from '../data/constants'
import { dayFromToday } from '../tasks/taskFormat'
import { useTasks } from '../tasks/taskStore'
import { type CreateDefaults, useTaskView } from '../tasks/useTaskView'
import type { Task, TaskPriority, TaskStatus } from '../types'
import BaseModal from './BaseModal.vue'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ defaults?: CreateDefaults }>()
const emit = defineEmits<{ created: [task: Task] }>()

const { projects, meId, createTask, labelsInUse } = useTasks()
const view = useTaskView()

const blank = () => ({
  title: '',
  description: '',
  projectId: props.defaults?.projectId ?? projects.find((p) => p.id === 'personal')?.id ?? projects[0]?.id ?? '',
  status: (props.defaults?.status ?? 'todo') as TaskStatus,
  assigneeId: (props.defaults?.assigneeId === undefined ? meId.value : props.defaults.assigneeId) as string | null,
  priority: (props.defaults?.priority ?? 'medium') as TaskPriority,
  due: dayFromToday(3),
  time: '',
  labels: '',
})
const form = reactive(blank())
const error = ref('')

const people = computed(() => view.peopleFor(form.projectId))

watch(open, (isOpen) => {
  if (isOpen) {
    Object.assign(form, blank())
    error.value = ''
  }
})

// Đổi nhóm mà người đang chọn không thuộc nhóm đó → chuyển về "Chưa giao"
watch(
  () => form.projectId,
  () => {
    if (form.assigneeId && !people.value.includes(form.assigneeId)) form.assigneeId = people.value.includes(meId.value) ? meId.value : null
  },
)

function submit(): void {
  const r = createTask({
    title: form.title,
    description: form.description,
    projectId: form.projectId,
    status: form.status,
    assigneeId: form.assigneeId,
    priority: form.priority,
    due: form.due,
    time: form.time || undefined,
    labels: form.labels.split(','),
  })
  if (!r.ok) {
    error.value = r.error
    return
  }
  emit('created', r.value)
  open.value = false
}
</script>

<template>
  <BaseModal v-model:open="open" wide title="Tạo công việc" description="Việc mới hiện ngay trên bảng; việc có hạn hôm nay xuất hiện ở mục Ưu tiên hôm nay.">
    <form id="create-task" class="form" novalidate @submit.prevent="submit">
      <div class="form__full">
        <label class="ws-label" for="task-title">Tên công việc</label>
        <input
          id="task-title"
          v-model="form.title"
          class="ws-input"
          maxlength="200"
          placeholder="VD: Viết báo cáo chương 2"
          autofocus
          :aria-invalid="error ? 'true' : undefined"
          aria-describedby="task-title-error"
          data-test="create-title"
        />
        <p v-if="error" id="task-title-error" class="form__error" role="alert">{{ error }}</p>
      </div>

      <div class="form__full">
        <label class="ws-label" for="task-desc">Mô tả (không bắt buộc)</label>
        <textarea id="task-desc" v-model="form.description" class="ws-input form__area" rows="2" maxlength="4000" placeholder="Mục tiêu, cách làm, tiêu chí hoàn thành…" />
      </div>

      <div>
        <label class="ws-label" for="task-project">Nhóm</label>
        <select id="task-project" v-model="form.projectId" class="ws-input" data-test="create-project">
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
      <div>
        <label class="ws-label" for="task-status">Trạng thái</label>
        <select id="task-status" v-model="form.status" class="ws-input" data-test="create-status">
          <option v-for="s in STATUS_ORDER" :key="s" :value="s">{{ STATUS_LABELS[s] }}</option>
        </select>
      </div>

      <div>
        <label class="ws-label" for="task-assignee">Người phụ trách</label>
        <select id="task-assignee" v-model="form.assigneeId" class="ws-input" data-test="create-assignee">
          <option :value="null">Chưa giao</option>
          <option v-for="id in people" :key="id" :value="id">{{ view.nameOf(id) }}{{ id === meId ? ' (bạn)' : '' }}</option>
        </select>
      </div>
      <fieldset class="prio">
        <legend class="ws-label">Mức ưu tiên</legend>
        <div class="prio__group">
          <label v-for="p in PRIORITY_ORDER" :key="p" class="prio__opt" :class="[`is-${p}`, { 'is-on': form.priority === p }]">
            <input v-model="form.priority" type="radio" name="task-priority" :value="p" class="visually-hidden" :data-test="`create-priority-${p}`" />
            {{ PRIORITY_SHORT[p] }}
          </label>
        </div>
      </fieldset>

      <div>
        <label class="ws-label" for="task-due">Hạn chót</label>
        <input id="task-due" v-model="form.due" type="date" class="ws-input" data-test="create-due" />
      </div>
      <div>
        <label class="ws-label" for="task-time">Giờ (không bắt buộc)</label>
        <input id="task-time" v-model="form.time" type="time" class="ws-input" />
      </div>

      <div class="form__full">
        <label class="ws-label" for="task-labels">Nhãn (phân cách bằng dấu phẩy)</label>
        <input id="task-labels" v-model="form.labels" class="ws-input" list="task-label-list" placeholder="VD: Backend, Báo cáo" data-test="create-labels" />
        <datalist id="task-label-list">
          <option v-for="l in labelsInUse" :key="l" :value="l" />
        </datalist>
      </div>
    </form>
    <template #footer>
      <BaseButton variant="secondary" class="ws-btn-auto" @click="open = false">Huỷ</BaseButton>
      <BaseButton type="submit" form="create-task" class="ws-btn-auto" data-test="create-submit">Tạo công việc</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.form__full {
  grid-column: 1 / -1;
}

.form__area {
  height: auto;
  min-height: 4.5rem;
  padding-block: 0.625rem;
  resize: vertical;
  font: inherit;
  line-height: 1.5;
}

.form__error {
  margin: 0.375rem 0 0;
  color: var(--ws-danger);
  font-size: 0.8125rem;
}

.prio {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.prio__group {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.375rem;
  height: 2.75rem;
  padding: 0.25rem;
  border: 1px solid var(--ws-border-strong);
  border-radius: var(--ws-radius-sm);
  background: var(--ws-surface-2);
}

.prio__opt {
  display: grid;
  place-items: center;
  border-radius: 0.5rem;
  color: var(--ws-text-2);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.prio__opt:hover {
  color: var(--ws-text);
}

.prio__opt.is-on.is-high {
  background: color-mix(in srgb, var(--pr-high) 20%, transparent);
  color: var(--pr-high);
}

.prio__opt.is-on.is-medium {
  background: color-mix(in srgb, var(--pr-medium) 20%, transparent);
  color: var(--pr-medium);
}

.prio__opt.is-on.is-low {
  background: color-mix(in srgb, var(--pr-low) 22%, transparent);
  color: var(--ws-text);
}

.prio__opt:has(input:focus-visible) {
  outline: 2px solid var(--ws-accent);
  outline-offset: 1px;
}

@media (max-width: 30rem) {
  .form {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
