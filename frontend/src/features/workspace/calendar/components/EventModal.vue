<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseModal from '../../components/BaseModal.vue'
import ToggleSwitch from '../../components/ToggleSwitch.vue'
import { useToast } from '../../composables/useToast'
import MemberSelect from '../../groups/components/MemberSelect.vue'
import { useGroups } from '../../groups/useGroups'
import { EVENT_COLORS, useCalendar, type CalendarEvent } from '../useCalendar'

const open = defineModel<boolean>('open', { required: true })
const props = withDefaults(defineProps<{ event?: CalendarEvent | null; defaultDate: string }>(), { event: null })

const router = useRouter()
const toast = useToast()
const calendar = useCalendar()
const groups = useGroups()

const title = ref('')
const date = ref('')
const start = ref('09:00')
const end = ref('10:00')
const color = ref(EVENT_COLORS[0])
const location = ref('')
const description = ref('')
const members = ref<string[]>([])
const withGroup = ref(true)
const error = ref('')

const editing = computed(() => !!props.event)
const linkedGroup = computed(() => (props.event?.groupId ? groups.group(props.event.groupId) : undefined))
const newcomers = computed(() => (props.event ? members.value.filter((m) => !props.event!.memberIds.includes(m)).length : 0))

watch(open, (isOpen) => {
  if (!isOpen) return
  const e = props.event
  title.value = e?.title ?? ''
  date.value = e?.date ?? props.defaultDate
  start.value = e?.start ?? '09:00'
  end.value = e?.end ?? '10:00'
  color.value = e?.color ?? EVENT_COLORS[0]
  location.value = e?.location ?? ''
  description.value = e?.description ?? ''
  members.value = [...(e?.memberIds ?? [])]
  withGroup.value = true
  error.value = ''
})

function openGroup(groupId: string): void {
  router.push({ name: 'team-channel', params: { groupId } })
}

function submit(): void {
  error.value = ''
  const input = {
    title: title.value,
    date: date.value,
    start: start.value,
    end: end.value,
    color: color.value,
    location: location.value,
    description: description.value,
    memberIds: members.value,
  }
  if (props.event) {
    const r = calendar.updateEvent(props.event.id, input)
    if (!r.ok) {
      error.value = r.error
      return
    }
    toast.show(newcomers.value && linkedGroup.value ? `Đã lưu và thêm ${newcomers.value} người vào nhóm.` : 'Đã lưu sự kiện.')
  } else {
    const r = calendar.createEvent(input, withGroup.value && members.value.length > 0)
    if (!r.ok) {
      error.value = r.error
      return
    }
    const groupId = r.value.groupId
    if (groupId) {
      toast.show(`Đã tạo sự kiện và nhóm “${r.value.event.title}” với ${members.value.length} thành viên.`, 'success', {
        label: 'Mở nhóm',
        run: () => openGroup(groupId),
      })
    } else toast.show('Đã tạo sự kiện.')
  }
  open.value = false
}
</script>

<template>
  <BaseModal
    v-model:open="open"
    wide
    :title="editing ? 'Sửa sự kiện' : 'Tạo sự kiện'"
    :description="editing ? '' : 'Chọn thành viên tham gia — có thể tạo luôn nhóm trò chuyện cho sự kiện.'"
  >
    <form id="event-form" class="form" novalidate @submit.prevent="submit">
      <div>
        <label class="ws-label" for="ev-title">Tên sự kiện</label>
        <input id="ev-title" v-model="title" class="ws-input" maxlength="60" placeholder="VD: Họp kick-off đồ án" autofocus data-test="event-title" />
      </div>

      <div class="grid3">
        <div>
          <label class="ws-label" for="ev-date">Ngày</label>
          <input id="ev-date" v-model="date" type="date" class="ws-input" data-test="event-date" />
        </div>
        <div>
          <label class="ws-label" for="ev-start">Bắt đầu</label>
          <input id="ev-start" v-model="start" type="time" class="ws-input" data-test="event-start" />
        </div>
        <div>
          <label class="ws-label" for="ev-end">Kết thúc</label>
          <input id="ev-end" v-model="end" type="time" class="ws-input" data-test="event-end" />
        </div>
      </div>

      <div class="grid2">
        <div>
          <label class="ws-label" for="ev-loc">Địa điểm</label>
          <input id="ev-loc" v-model="location" class="ws-input" maxlength="60" placeholder="Phòng họp, Online…" />
        </div>
        <div>
          <span class="ws-label">Màu</span>
          <div class="colors" role="radiogroup" aria-label="Màu sự kiện">
            <button
              v-for="c in EVENT_COLORS"
              :key="c"
              type="button"
              role="radio"
              class="swatch"
              :class="{ 'is-on': color === c }"
              :aria-checked="color === c"
              :aria-label="`Màu ${c}`"
              :style="{ background: c }"
              @click="color = c"
            >
              <AppIcon v-if="color === c" name="check" :size="13" :stroke-width="3" />
            </button>
          </div>
        </div>
      </div>

      <div>
        <label class="ws-label" for="ev-desc">Ghi chú</label>
        <textarea id="ev-desc" v-model="description" class="ws-input" rows="2" maxlength="300" />
      </div>

      <MemberSelect v-model="members" label="Thành viên tham gia" />

      <div v-if="!editing" class="group-opt" :class="{ 'is-on': withGroup }">
        <span class="group-opt__icon"><AppIcon name="users" :size="20" /></span>
        <div class="group-opt__text">
          <strong>Tạo nhóm cho sự kiện</strong>
          <small v-if="members.length">
            Tạo nhóm “{{ title.trim() || 'Sự kiện' }}” trong mục Nhóm với {{ members.length }} thành viên đã chọn và bạn.
          </small>
          <small v-else>Chọn ít nhất 1 thành viên để tạo nhóm.</small>
        </div>
        <ToggleSwitch v-model="withGroup" label="Tạo nhóm cho sự kiện" data-test="event-with-group" />
      </div>
      <p v-else-if="linkedGroup" class="linked">
        <AppIcon name="link" :size="15" /> Liên kết với nhóm <strong>{{ linkedGroup.name }}</strong>.
        <template v-if="newcomers"> {{ newcomers }} người mới sẽ được thêm vào nhóm.</template>
      </p>

      <p v-if="error" class="error" role="alert" data-test="event-error">{{ error }}</p>
    </form>

    <template #footer>
      <BaseButton variant="secondary" class="ws-btn-auto" @click="open = false">Huỷ</BaseButton>
      <BaseButton type="submit" form="event-form" class="ws-btn-auto" data-test="event-submit">
        {{ editing ? 'Lưu thay đổi' : withGroup && members.length ? 'Tạo sự kiện & nhóm' : 'Tạo sự kiện' }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.grid3 {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 0.75rem;
}

.grid2 {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0.75rem;
}

.colors {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 2.75rem;
}

.swatch {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
}

.swatch.is-on {
  box-shadow:
    0 0 0 2px var(--ws-surface),
    0 0 0 4px var(--ws-text);
}

.group-opt {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem 1rem;
  border: 1.5px solid var(--ws-border-strong);
  border-radius: 0.875rem;
  background: var(--ws-surface-2);
  transition: border-color 0.15s ease;
}

.group-opt.is-on {
  border-color: var(--ws-accent);
  background: color-mix(in srgb, var(--ws-accent) 10%, var(--ws-surface-2));
}

.group-opt__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  background: var(--ws-accent-grad);
  color: #fff;
}

.group-opt__text {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.group-opt__text strong {
  font-size: 0.9375rem;
}

.group-opt__text small {
  color: var(--ws-text-2);
  font-size: 0.8125rem;
}

.linked {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
  margin: 0;
  color: var(--ws-text-2);
  font-size: 0.875rem;
}

.error {
  margin: 0;
  padding: 0.625rem 0.875rem;
  border-radius: 0.625rem;
  background: color-mix(in srgb, var(--ws-danger) 14%, transparent);
  color: var(--ws-danger);
  font-size: 0.875rem;
}

@media (max-width: 36rem) {
  .grid3,
  .grid2 {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
