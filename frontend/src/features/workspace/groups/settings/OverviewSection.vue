<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/shared/components/AppIcon.vue'
import ConfirmModal from '../../components/ConfirmModal.vue'
import ToggleSwitch from '../../components/ToggleSwitch.vue'
import { useCalendar } from '../../calendar/useCalendar'
import { useToast } from '../../composables/useToast'
import { GROUP_COLORS } from '../data'
import { formatDate } from '../format'
import { useGroups } from '../useGroups'
import type { Group } from '../types'
import GroupIcon from '../components/GroupIcon.vue'

const props = defineProps<{ group: Group }>()
const router = useRouter()
const store = useGroups()
const toast = useToast()
const { events } = useCalendar()

const name = ref('')
const description = ref('')
const color = ref('')
const deleteOpen = ref(false)
const leaveOpen = ref(false)

function reset(): void {
  name.value = props.group.name
  description.value = props.group.description
  color.value = props.group.color
}
watch(() => props.group.id, reset, { immediate: true })

const isAdmin = computed(() => store.can(props.group.id, 'ADMINISTRATOR'))
const isOwner = computed(() => props.group.ownerId === store.meId.value)
const dirty = computed(() => name.value !== props.group.name || description.value !== props.group.description || color.value !== props.group.color)
const linkedEvent = computed(() => events.value.find((e) => e.id === props.group.eventId))
const muted = computed({
  get: () => !!props.group.muted,
  set: (v) => store.updateGroup(props.group.id, { muted: v }),
})

function save(): void {
  const r = store.updateGroup(props.group.id, { name: name.value, description: description.value, color: color.value })
  if (r.ok) toast.show('Đã lưu thông tin nhóm.')
  else toast.show(r.error, 'error')
}

function destroy(): void {
  const groupName = props.group.name
  const r = store.deleteGroup(props.group.id)
  if (!r.ok) {
    toast.show(r.error, 'error')
    return
  }
  toast.show(`Đã xoá nhóm “${groupName}”.`)
  router.push({ name: 'team' })
}

function leave(): void {
  const r = store.leaveGroup(props.group.id)
  if (!r.ok) {
    toast.show(r.error, 'error')
    return
  }
  router.push({ name: 'team' })
}
</script>

<template>
  <div>
    <header class="gs-head">
      <div>
        <h1 class="gs-title">Tổng quan nhóm</h1>
        <p class="gs-desc">Tạo ngày {{ formatDate(group.createdAt) }} · {{ group.members.length }} thành viên · {{ group.channels.length }} kênh</p>
      </div>
    </header>

    <section class="gs-card">
      <div class="ov">
        <GroupIcon :group="{ name: name || group.name, color, icon: group.icon }" :size="88" />
        <fieldset class="ov__fields" :disabled="!isAdmin">
          <div>
            <label class="ws-label" for="ov-name">Tên nhóm</label>
            <input id="ov-name" v-model="name" class="ws-input" maxlength="60" data-test="ov-name" />
          </div>
          <div>
            <label class="ws-label" for="ov-desc">Mô tả</label>
            <textarea id="ov-desc" v-model="description" class="ws-input" maxlength="160" rows="2" />
          </div>
          <div>
            <span class="ws-label">Màu nhóm</span>
            <div class="gs-colors">
              <button
                v-for="c in GROUP_COLORS"
                :key="c"
                type="button"
                class="gs-swatch"
                :class="{ 'is-on': color === c }"
                :style="{ background: c }"
                :aria-label="`Màu ${c}`"
                :aria-pressed="color === c"
                @click="color = c"
              >
                <AppIcon v-if="color === c" name="check" :size="14" :stroke-width="3" />
              </button>
            </div>
          </div>
        </fieldset>
      </div>
      <p v-if="!isAdmin" class="gs-notice" style="margin-top: 1rem"><AppIcon name="lock" :size="16" /> Chỉ quản trị viên mới sửa được thông tin nhóm.</p>
      <div v-if="dirty" class="gs-savebar" data-test="ov-savebar">
        <p>Bạn có thay đổi chưa lưu.</p>
        <button type="button" class="gs-btn gs-btn--sm" @click="reset">Đặt lại</button>
        <button type="button" class="gs-btn gs-btn--primary gs-btn--sm" data-test="ov-save" @click="save">Lưu thay đổi</button>
      </div>
    </section>

    <section v-if="linkedEvent" class="gs-card">
      <h2 class="gs-card__title">Sự kiện liên kết</h2>
      <p class="gs-card__desc">Nhóm này được tạo cùng một sự kiện trong Lịch. Thêm người vào sự kiện sẽ tự thêm họ vào nhóm.</p>
      <RouterLink :to="{ name: 'calendar', query: { date: linkedEvent.date } }" class="event">
        <AppIcon name="calendar" :size="18" />
        <strong>{{ linkedEvent.title }}</strong>
        <span>{{ linkedEvent.date.split('-').reverse().join('/') }} · {{ linkedEvent.start }} – {{ linkedEvent.end }}</span>
      </RouterLink>
    </section>

    <section class="gs-card">
      <div class="gs-row">
        <div class="gs-row__text">
          <strong>Tắt thông báo nhóm</strong>
          <small>Không hiện số tin chưa đọc của nhóm trên thanh bên.</small>
        </div>
        <ToggleSwitch v-model="muted" label="Tắt thông báo nhóm" />
      </div>
    </section>

    <section class="gs-card danger">
      <h2 class="gs-card__title">Vùng nguy hiểm</h2>
      <div class="gs-row">
        <div class="gs-row__text">
          <strong>{{ isOwner ? 'Xoá nhóm' : 'Rời nhóm' }}</strong>
          <small>{{ isOwner ? 'Xoá vĩnh viễn nhóm, mọi kênh và tin nhắn. Không thể hoàn tác.' : 'Bạn sẽ không còn thấy kênh và tin nhắn của nhóm.' }}</small>
        </div>
        <button v-if="isOwner" type="button" class="gs-btn gs-btn--danger" data-test="group-delete" @click="deleteOpen = true">
          <AppIcon name="trash" :size="15" /> Xoá nhóm
        </button>
        <button v-else type="button" class="gs-btn gs-btn--danger" @click="leaveOpen = true"><AppIcon name="log-out" :size="15" /> Rời nhóm</button>
      </div>
    </section>

    <ConfirmModal
      v-model:open="deleteOpen"
      :title="`Xoá “${group.name}”?`"
      description="Toàn bộ kênh, tin nhắn, vai trò và lời mời sẽ bị xoá vĩnh viễn."
      confirm-label="Xoá nhóm"
      danger
      @confirm="destroy"
    />
    <ConfirmModal v-model:open="leaveOpen" :title="`Rời “${group.name}”?`" confirm-label="Rời nhóm" danger @confirm="leave" />
  </div>
</template>

<style scoped>
.ov {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
}

.ov__fields {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.event {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.625rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  background: var(--ws-surface-2);
  color: var(--ws-text);
  text-decoration: none;
}

.event:hover {
  background: var(--ws-surface-3);
}

.event svg {
  color: var(--ws-idle);
}

.event span {
  color: var(--ws-text-3);
  font-size: 0.875rem;
}

.danger {
  border-color: color-mix(in srgb, var(--ws-danger) 35%, transparent);
}

@media (max-width: 40rem) {
  .ov {
    flex-direction: column;
  }
}
</style>
