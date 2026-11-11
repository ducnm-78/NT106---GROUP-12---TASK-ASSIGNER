<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon, { type IconName } from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseModal from '../../components/BaseModal.vue'
import ToggleSwitch from '../../components/ToggleSwitch.vue'
import { normalizeChannelName, useGroups } from '../useGroups'
import { FEATURES } from '../features'
import type { Channel, ChannelType } from '../types'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ groupId: string; categoryId: string | null }>()
const emit = defineEmits<{ created: [channel: Channel] }>()

const store = useGroups()
const group = computed(() => store.group(props.groupId))

const TYPES: { id: ChannelType; label: string; hint: string; icon: IconName; soon?: boolean }[] = [
  { id: 'text', label: 'Văn bản', hint: 'Gửi tin nhắn, ảnh, tệp, ý kiến và chạy AI.', icon: 'hash' },
  { id: 'voice', label: 'Thoại', hint: 'Họp nhanh bằng giọng nói và chia sẻ màn hình.', icon: 'volume', soon: !FEATURES.voice },
  { id: 'announcement', label: 'Thông báo', hint: 'Chỉ người quản lý kênh được đăng; mọi người cùng đọc.', icon: 'megaphone' },
]

const type = ref<ChannelType>('text')
const name = ref('')
const topic = ref('')
const category = ref<string | null>(null)
const isPrivate = ref(false)
const roles = ref<string[]>([])
const ai = ref(true)
const error = ref('')

watch(open, (isOpen) => {
  if (!isOpen) return
  type.value = 'text'
  name.value = ''
  topic.value = ''
  category.value = props.categoryId ?? group.value?.categories[0]?.id ?? null
  isPrivate.value = false
  roles.value = []
  ai.value = true
  error.value = ''
})

const preview = computed(() => normalizeChannelName(name.value, type.value))
const roleOptions = computed(() => (group.value?.roles ?? []).filter((r) => !r.isDefault && !r.managed))

function toggleRole(id: string): void {
  roles.value = roles.value.includes(id) ? roles.value.filter((r) => r !== id) : [...roles.value, id]
}

function submit(): void {
  const r = store.createChannel(props.groupId, {
    name: name.value,
    type: type.value,
    categoryId: category.value,
    topic: topic.value,
    private: isPrivate.value,
    allowedRoleIds: roles.value,
    aiAccess: ai.value,
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
  <BaseModal v-model:open="open" wide title="Tạo kênh" :description="group ? `trong ${group.name}` : ''">
    <form id="channel-form" class="form" novalidate @submit.prevent="submit">
      <fieldset class="types">
        <legend class="ws-label">Loại kênh</legend>
        <label v-for="t in TYPES" :key="t.id" class="type" :class="{ 'is-on': type === t.id, 'is-soon': t.soon }">
          <input
            v-model="type"
            type="radio"
            name="ctype"
            :value="t.id"
            :disabled="t.soon"
            class="visually-hidden"
            :data-test="`type-${t.id}`"
          />
          <span class="type__icon"><AppIcon :name="t.icon" :size="22" /></span>
          <span class="type__text">
            <strong>{{ t.label }} <span v-if="t.soon" class="type__soon">Sắp có</span></strong>
            <small>{{ t.hint }}</small>
          </span>
          <span class="type__radio" aria-hidden="true" />
        </label>
      </fieldset>

      <div class="grid">
        <div>
          <label class="ws-label" for="c-name">Tên kênh</label>
          <div class="name">
            <AppIcon :name="type === 'voice' ? 'volume' : type === 'announcement' ? 'megaphone' : 'hash'" :size="18" />
            <input
              id="c-name"
              v-model="name"
              class="ws-input"
              maxlength="40"
              :placeholder="type === 'voice' ? 'Phòng họp' : 'kênh-mới'"
              autofocus
              data-test="channel-name"
            />
          </div>
          <p v-if="name && preview !== name.trim()" class="hint">Sẽ được lưu thành: <strong>{{ preview || '—' }}</strong></p>
        </div>
        <div>
          <label class="ws-label" for="c-cat">Danh mục</label>
          <select id="c-cat" v-model="category" class="ws-input">
            <option :value="null">Không có danh mục</option>
            <option v-for="c in group?.categories ?? []" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
      </div>

      <div v-if="type !== 'voice'">
        <label class="ws-label" for="c-topic">Chủ đề (không bắt buộc)</label>
        <input id="c-topic" v-model="topic" class="ws-input" maxlength="120" placeholder="Kênh này dùng để trao đổi gì?" />
      </div>

      <div class="opt">
        <span class="opt__icon"><AppIcon name="lock" :size="18" /></span>
        <div class="opt__text">
          <strong>Kênh riêng tư</strong>
          <small>Chỉ các vai trò được chọn (và quản trị viên) mới thấy kênh.</small>
        </div>
        <ToggleSwitch v-model="isPrivate" label="Kênh riêng tư" data-test="private-toggle" />
      </div>
      <div v-if="isPrivate" class="roles">
        <button
          v-for="r in roleOptions"
          :key="r.id"
          type="button"
          class="roles__chip"
          :class="{ 'is-on': roles.includes(r.id) }"
          :aria-pressed="roles.includes(r.id)"
          :style="{ '--rc': r.color }"
          @click="toggleRole(r.id)"
        >
          <span class="roles__dot" />{{ r.name }}
        </button>
      </div>

      <div v-if="type !== 'voice'" class="opt">
        <span class="opt__icon opt__icon--ai"><AppIcon name="sparkles" :size="18" /></span>
        <div class="opt__text">
          <strong>Cho phép Trợ lý AI</strong>
          <small>AI có thể đọc tin nhắn để tóm tắt, lập kế hoạch và trả lời khi được nhắc.</small>
        </div>
        <ToggleSwitch v-model="ai" label="Cho phép Trợ lý AI" />
      </div>

      <p v-if="error" class="error" role="alert" data-test="channel-error">{{ error }}</p>
    </form>

    <template #footer>
      <BaseButton variant="secondary" class="ws-btn-auto" @click="open = false">Huỷ</BaseButton>
      <BaseButton type="submit" form="channel-form" class="ws-btn-auto" data-test="channel-submit">Tạo kênh</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
}

.types {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  border: 0;
}

.type {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.75rem 1rem;
  border: 1.5px solid var(--ws-border-strong);
  border-radius: 0.875rem;
  background: var(--ws-surface-2);
  cursor: pointer;
}

.type:hover {
  border-color: color-mix(in srgb, var(--ws-accent) 60%, transparent);
}

.type.is-on {
  border-color: var(--ws-accent);
  background: color-mix(in srgb, var(--ws-accent) 10%, var(--ws-surface-2));
}

.type:focus-within {
  outline: 2px solid var(--ws-accent);
  outline-offset: 2px;
}

.type.is-soon {
  cursor: not-allowed;
  opacity: 0.55;
}

.type__soon {
  margin-left: 0.25rem;
  padding: 0.0625rem 0.4375rem;
  border-radius: 999px;
  background: var(--ws-accent-soft);
  color: var(--ws-accent-text);
  font-size: 0.625rem;
  font-weight: 800;
  vertical-align: middle;
}

.type__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  background: var(--ws-surface-3);
  color: var(--ws-text-2);
}

.type.is-on .type__icon {
  background: var(--ws-accent-soft);
  color: var(--ws-accent-text);
}

.type__text {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.type__text strong {
  font-size: 0.9375rem;
}

.type__text small {
  color: var(--ws-text-3);
  font-size: 0.8125rem;
}

.type__radio {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid var(--ws-border-strong);
  border-radius: 50%;
}

.type.is-on .type__radio {
  border: 6px solid var(--ws-accent);
}

.grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 1rem;
}

.name {
  position: relative;
  display: flex;
  align-items: center;
  color: var(--ws-text-3);
}

.name > :first-child {
  position: absolute;
  left: 0.75rem;
}

.name .ws-input {
  padding-left: 2.25rem;
}

.hint {
  margin: 0.375rem 0 0;
  color: var(--ws-text-3);
  font-size: 0.75rem;
}

.hint strong {
  color: var(--ws-text-2);
}

.opt {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.75rem 1rem;
  border-radius: 0.875rem;
  background: var(--ws-surface-2);
}

.opt__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.625rem;
  background: var(--ws-surface-3);
  color: var(--ws-text-2);
}

.opt__icon--ai {
  background: var(--ws-accent-soft);
  color: var(--ws-accent-text);
}

.opt__text {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.opt__text strong {
  font-size: 0.9375rem;
}

.opt__text small {
  color: var(--ws-text-3);
  font-size: 0.8125rem;
}

.roles {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: -0.5rem;
  padding: 0 0.25rem;
}

.roles__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  height: 2rem;
  padding: 0 0.75rem;
  border: 1.5px solid var(--ws-border-strong);
  border-radius: 999px;
  background: var(--ws-surface-2);
  color: var(--ws-text-2);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

.roles__chip.is-on {
  border-color: var(--rc);
  background: color-mix(in srgb, var(--rc) 16%, var(--ws-surface-2));
  color: var(--ws-text);
}

.roles__dot {
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 50%;
  background: var(--rc);
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
  .grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
