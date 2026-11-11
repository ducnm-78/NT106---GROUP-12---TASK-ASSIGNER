<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon, { type IconName } from '@/shared/components/AppIcon.vue'
import ConfirmModal from '../../components/ConfirmModal.vue'
import ToggleSwitch from '../../components/ToggleSwitch.vue'
import { useToast } from '../../composables/useToast'
import { useGroups } from '../useGroups'
import type { Channel, Group } from '../types'
import CreateChannelModal from '../components/CreateChannelModal.vue'

const props = defineProps<{ group: Group }>()
const store = useGroups()
const toast = useToast()

const createOpen = ref(false)
const createCategory = ref<string | null>(null)
const editing = ref<string | null>(null)
const draft = ref({ name: '', topic: '', private: false, allowedRoleIds: [] as string[] })
const deleting = ref<Channel | null>(null)
const deleteOpen = computed({
  get: () => !!deleting.value,
  set: (v) => {
    if (!v) deleting.value = null
  },
})
const newCategory = ref('')

const canManage = computed(() => store.can(props.group.id, 'MANAGE_CHANNELS'))
const sections = computed(() => [
  ...props.group.categories.map((c) => ({ id: c.id, name: c.name, channels: props.group.channels.filter((x) => x.categoryId === c.id) })),
  { id: null, name: 'Không có danh mục', channels: props.group.channels.filter((x) => !x.categoryId) },
].filter((s) => s.id !== null || s.channels.length))
const roleOptions = computed(() => props.group.roles.filter((r) => !r.isDefault && !r.managed))

function iconOf(c: Channel): IconName {
  return c.type === 'voice' ? 'volume' : c.type === 'announcement' ? 'megaphone' : 'hash'
}

function edit(c: Channel): void {
  editing.value = c.id
  draft.value = { name: c.name, topic: c.topic, private: c.private, allowedRoleIds: [...c.allowedRoleIds] }
}

function save(c: Channel): void {
  const r = store.updateChannel(props.group.id, c.id, { ...draft.value })
  if (!r.ok) {
    toast.show(r.error, 'error')
    return
  }
  toast.show('Đã lưu kênh.')
  editing.value = null
}

function toggleAI(c: Channel, on: boolean): void {
  const r = store.updateChannel(props.group.id, c.id, { aiAccess: on })
  if (!r.ok) toast.show(r.error, 'error')
}

function toggleDraftRole(id: string): void {
  const list = draft.value.allowedRoleIds
  draft.value.allowedRoleIds = list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

function remove(): void {
  const c = deleting.value
  if (!c) return
  const r = store.deleteChannel(props.group.id, c.id)
  if (r.ok) toast.show('Đã xoá kênh.')
  else toast.show(r.error, 'error')
}

function addCategory(): void {
  const r = store.createCategory(props.group.id, newCategory.value)
  if (!r.ok) {
    toast.show(r.error, 'error')
    return
  }
  newCategory.value = ''
  toast.show('Đã tạo danh mục.')
}

function openCreate(categoryId: string | null): void {
  createCategory.value = categoryId
  createOpen.value = true
}
</script>

<template>
  <div>
    <header class="gs-head">
      <div>
        <h1 class="gs-title">Kênh & tích hợp AI</h1>
        <p class="gs-desc">Sắp xếp kênh theo danh mục, đặt quyền riêng tư và bật Trợ lý AI cho từng kênh.</p>
      </div>
      <button type="button" class="gs-btn gs-btn--primary" :disabled="!canManage" data-test="settings-create-channel" @click="openCreate(null)">
        <AppIcon name="plus" :size="16" /> Tạo kênh
      </button>
    </header>

    <section class="gs-card ai">
      <span class="ai__icon"><AppIcon name="sparkles" :size="22" /></span>
      <div class="gs-row__text">
        <strong>Trợ lý AI</strong>
        <small>Nhắc “@Trợ lý AI” trong kênh đã bật AI để nhờ tóm tắt hoặc lập kế hoạch. Kế hoạch có thể chuyển thành công việc.</small>
      </div>
      <span class="gs-badge gs-badge--ok">{{ group.channels.filter((c) => c.aiAccess).length }} kênh đã bật</span>
    </section>

    <section v-for="s in sections" :key="s.id ?? 'none'" class="gs-card">
      <div class="cat">
        <h2 class="cat__name">{{ s.name }}</h2>
        <button v-if="canManage" type="button" class="gs-btn gs-btn--sm" @click="openCreate(s.id)"><AppIcon name="plus" :size="14" /> Kênh</button>
      </div>
      <ul class="list">
        <li v-for="c in s.channels" :key="c.id" class="item" :data-test="`ch-row-${c.name}`">
          <div class="item__main">
            <AppIcon :name="iconOf(c)" :size="18" class="item__icon" />
            <div class="gs-row__text">
              <strong>
                {{ c.name }}
                <span v-if="c.private" class="gs-badge gs-badge--warn"><AppIcon name="lock" :size="10" /> Riêng tư</span>
              </strong>
              <small v-if="c.private && c.allowedRoleIds.length">
                Chỉ: {{ c.allowedRoleIds.map((id) => group.roles.find((r) => r.id === id)?.name).filter(Boolean).join(', ') }}
              </small>
              <small v-else-if="c.topic">{{ c.topic }}</small>
            </div>
            <label v-if="c.type !== 'voice'" class="item__ai" :title="'Trợ lý AI trong #' + c.name">
              <AppIcon name="sparkles" :size="14" /> AI
              <ToggleSwitch
                :model-value="c.aiAccess"
                :label="`Bật AI cho ${c.name}`"
                :disabled="!canManage"
                :data-test="`ai-${c.name}`"
                @update:model-value="toggleAI(c, $event)"
              />
            </label>
            <button v-if="canManage" type="button" class="gs-icon-btn" :aria-label="`Sửa ${c.name}`" @click="editing === c.id ? (editing = null) : edit(c)">
              <AppIcon name="pencil" :size="16" />
            </button>
            <button v-if="canManage" type="button" class="gs-icon-btn gs-icon-btn--danger" :aria-label="`Xoá ${c.name}`" @click="deleting = c">
              <AppIcon name="trash" :size="16" />
            </button>
          </div>

          <form v-if="editing === c.id" class="edit" novalidate @submit.prevent="save(c)">
            <div class="edit__grid">
              <div>
                <label class="ws-label" :for="`n-${c.id}`">Tên kênh</label>
                <input :id="`n-${c.id}`" v-model="draft.name" class="ws-input" maxlength="40" />
              </div>
              <div v-if="c.type !== 'voice'">
                <label class="ws-label" :for="`t-${c.id}`">Chủ đề</label>
                <input :id="`t-${c.id}`" v-model="draft.topic" class="ws-input" maxlength="120" />
              </div>
            </div>
            <div class="gs-row">
              <div class="gs-row__text"><strong>Kênh riêng tư</strong></div>
              <ToggleSwitch v-model="draft.private" label="Kênh riêng tư" />
            </div>
            <div v-if="draft.private" class="edit__roles">
              <button
                v-for="r in roleOptions"
                :key="r.id"
                type="button"
                class="gs-role-chip edit__role"
                :class="{ 'is-on': draft.allowedRoleIds.includes(r.id) }"
                :style="{ '--rc': r.color }"
                :aria-pressed="draft.allowedRoleIds.includes(r.id)"
                @click="toggleDraftRole(r.id)"
              >
                {{ r.name }}
              </button>
            </div>
            <div class="edit__actions">
              <button type="button" class="gs-btn gs-btn--sm" @click="editing = null">Huỷ</button>
              <button type="submit" class="gs-btn gs-btn--primary gs-btn--sm">Lưu</button>
            </div>
          </form>
        </li>
        <li v-if="!s.channels.length" class="gs-empty">Danh mục trống.</li>
      </ul>
    </section>

    <form v-if="canManage" class="gs-card newcat" novalidate @submit.prevent="addCategory">
      <label class="ws-label" for="newcat">Tạo danh mục mới</label>
      <div class="newcat__row">
        <input id="newcat" v-model="newCategory" class="ws-input" maxlength="30" placeholder="VD: Tài nguyên" @keydown.enter.prevent="addCategory" />
        <button type="submit" class="gs-btn" :disabled="!newCategory.trim()">Tạo danh mục</button>
      </div>
    </form>

    <CreateChannelModal v-model:open="createOpen" :group-id="group.id" :category-id="createCategory" @created="toast.show('Đã tạo kênh.')" />
    <ConfirmModal
      v-model:open="deleteOpen"
      :title="`Xoá kênh “${deleting?.name}”?`"
      description="Mọi tin nhắn trong kênh sẽ bị xoá vĩnh viễn."
      confirm-label="Xoá kênh"
      danger
      @confirm="remove"
    />
  </div>
</template>

<style scoped>
.ai {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  background: linear-gradient(120deg, color-mix(in srgb, var(--ws-accent) 16%, var(--ws-surface)), var(--ws-surface));
}

.ai__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.875rem;
  background: var(--ws-accent-grad);
  color: #fff;
}

.cat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.cat__name {
  margin: 0;
  color: var(--ws-text-3);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.item + .item {
  border-top: 1px solid var(--ws-border);
}

.item__main {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
}

.item__main .gs-row__text strong {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.item__icon {
  color: var(--ws-text-3);
}

.item__ai {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--ws-accent-text);
  font-size: 0.75rem;
  font-weight: 700;
}

.edit {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 0.875rem;
  padding: 1rem;
  border-radius: 0.875rem;
  background: var(--ws-surface-2);
}

.edit__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.edit__roles {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.edit__role {
  cursor: pointer;
  opacity: 0.6;
}

.edit__role.is-on {
  opacity: 1;
  box-shadow: 0 0 0 1px var(--rc);
}

.edit__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.newcat__row {
  display: flex;
  gap: 0.5rem;
}

@media (max-width: 40rem) {
  .edit__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
