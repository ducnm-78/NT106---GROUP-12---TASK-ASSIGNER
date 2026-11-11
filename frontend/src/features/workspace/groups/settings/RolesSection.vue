<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import ConfirmModal from '../../components/ConfirmModal.vue'
import ToggleSwitch from '../../components/ToggleSwitch.vue'
import { useToast } from '../../composables/useToast'
import { PERMISSION_META, ROLE_COLORS } from '../data'
import { useGroups } from '../useGroups'
import { PERMISSIONS, type Group, type Permission } from '../types'
import PersonAvatar from '../components/PersonAvatar.vue'

const props = defineProps<{ group: Group }>()
const store = useGroups()
const toast = useToast()

const selectedId = ref<string>(props.group.roles[0]?.id ?? '')
const tab = ref<'display' | 'perms' | 'members'>('display')
const roleQuery = ref('')
const permQuery = ref('')
const addMemberId = ref('')
const deleteOpen = ref(false)

const role = computed(() => props.group.roles.find((r) => r.id === selectedId.value))
const editable = computed(() => !!role.value && store.canManageRole(props.group.id, role.value.id))
const filteredRoles = computed(() =>
  props.group.roles.filter((r) => r.name.toLocaleLowerCase('vi').includes(roleQuery.value.trim().toLocaleLowerCase('vi'))),
)

const memberCount = (roleId: string) => props.group.members.filter((m) => m.roleIds.includes(roleId)).length

/* ----- Bản nháp chỉnh sửa ----- */
interface Draft {
  name: string
  color: string
  hoist: boolean
  mentionable: boolean
  permissions: Permission[]
}
const draft = ref<Draft | null>(null)

function resetDraft(): void {
  const r = role.value
  draft.value = r ? { name: r.name, color: r.color, hoist: r.hoist, mentionable: r.mentionable, permissions: [...r.permissions] } : null
}
watch(selectedId, resetDraft, { immediate: true })
watch(
  () => props.group.roles.length,
  () => {
    if (!role.value) selectedId.value = props.group.roles[0]?.id ?? ''
  },
)

const dirty = computed(() => {
  const r = role.value
  const d = draft.value
  if (!r || !d) return false
  return (
    r.name !== d.name ||
    r.color !== d.color ||
    r.hoist !== d.hoist ||
    r.mentionable !== d.mentionable ||
    [...r.permissions].sort().join() !== [...d.permissions].sort().join()
  )
})

function save(): void {
  if (!role.value || !draft.value) return
  const r = store.updateRole(props.group.id, role.value.id, { ...draft.value })
  if (r.ok) toast.show(`Đã lưu vai trò “${r.value.name}”.`)
  else toast.show(r.error, 'error')
}

function hasPerm(p: Permission): boolean {
  return !!draft.value?.permissions.includes(p)
}

function setPerm(p: Permission, on: boolean): void {
  if (!draft.value) return
  draft.value.permissions = on ? [...new Set([...draft.value.permissions, p])] : draft.value.permissions.filter((x) => x !== p)
}

const permGroups = computed(() => {
  const q = permQuery.value.trim().toLocaleLowerCase('vi')
  const map = new Map<string, Permission[]>()
  for (const p of PERMISSIONS) {
    const meta = PERMISSION_META[p]
    if (q && !`${meta.label} ${meta.description}`.toLocaleLowerCase('vi').includes(q)) continue
    map.set(meta.group, [...(map.get(meta.group) ?? []), p])
  }
  return [...map.entries()]
})

/* ----- Thao tác ----- */
function create(): void {
  const r = store.createRole(props.group.id, { name: 'Vai trò mới', color: ROLE_COLORS[props.group.roles.length % ROLE_COLORS.length] })
  if (!r.ok) {
    toast.show(r.error, 'error')
    return
  }
  selectedId.value = r.value.id
  tab.value = 'display'
  toast.show('Đã tạo vai trò mới.')
}

function move(roleId: string, dir: -1 | 1): void {
  const r = store.moveRole(props.group.id, roleId, dir)
  if (!r.ok) toast.show(r.error, 'error')
}

function remove(): void {
  const r = role.value
  if (!r) return
  const res = store.deleteRole(props.group.id, r.id)
  if (res.ok) toast.show(`Đã xoá vai trò “${r.name}”.`)
  else toast.show(res.error, 'error')
}

const roleMembers = computed(() => (role.value ? props.group.members.filter((m) => m.roleIds.includes(role.value!.id)) : []))
const addable = computed(() =>
  role.value && !role.value.isDefault ? props.group.members.filter((m) => !m.roleIds.includes(role.value!.id) && !store.person(m.userId).bot) : [],
)

function toggleMember(userId: string): void {
  if (!role.value) return
  const r = store.toggleMemberRole(props.group.id, userId, role.value.id)
  if (!r.ok) toast.show(r.error, 'error')
  addMemberId.value = ''
}
</script>

<template>
  <div>
    <header class="gs-head">
      <div>
        <h1 class="gs-title">Vai trò & quyền</h1>
        <p class="gs-desc">Dùng vai trò để nhóm thành viên và cấp quyền. Vai trò ở trên cao hơn vai trò ở dưới.</p>
      </div>
      <button type="button" class="gs-btn gs-btn--primary" :disabled="!store.can(group.id, 'MANAGE_ROLES')" data-test="role-create" @click="create">
        <AppIcon name="plus" :size="16" /> Tạo vai trò
      </button>
    </header>

    <div class="roles">
      <!-- Danh sách vai trò -->
      <aside class="roles__list gs-card">
        <div class="gs-search">
          <AppIcon name="search" :size="16" />
          <input v-model="roleQuery" class="ws-input" type="search" placeholder="Tìm vai trò" aria-label="Tìm vai trò" />
        </div>
        <ul class="roles__items">
          <li v-for="r in filteredRoles" :key="r.id">
            <div class="roles__item" :class="{ 'is-active': r.id === selectedId }">
              <button type="button" class="roles__pick" :data-test="`role-${r.name}`" @click="selectedId = r.id">
                <AppIcon name="grip" :size="14" class="roles__grip" />
                <span class="roles__dot" :style="{ background: r.color }" />
                <span class="roles__name">{{ r.name }}</span>
                <AppIcon v-if="!store.canManageRole(group.id, r.id)" name="lock" :size="12" class="roles__lock" />
                <span class="roles__count" :title="`${memberCount(r.id)} thành viên`">
                  {{ r.isDefault ? group.members.length : memberCount(r.id) }}
                </span>
              </button>
              <span v-if="!r.isDefault" class="roles__move">
                <button type="button" class="gs-icon-btn" :aria-label="`Đưa ${r.name} lên`" :disabled="!store.canManageRole(group.id, r.id)" @click="move(r.id, -1)">
                  <AppIcon name="chevron-down" :size="14" style="transform: rotate(180deg)" />
                </button>
                <button type="button" class="gs-icon-btn" :aria-label="`Đưa ${r.name} xuống`" :disabled="!store.canManageRole(group.id, r.id)" @click="move(r.id, 1)">
                  <AppIcon name="chevron-down" :size="14" />
                </button>
              </span>
            </div>
          </li>
        </ul>
      </aside>

      <!-- Trình chỉnh sửa vai trò -->
      <section v-if="role && draft" class="roles__editor gs-card" data-test="role-editor">
        <div class="editor__head">
          <span class="editor__swatch" :style="{ background: draft.color }" />
          <h2>{{ role.isDefault ? '@everyone' : draft.name || 'Vai trò' }}</h2>
          <span v-if="role.managed" class="gs-badge">Do hệ thống quản lý</span>
          <span v-if="!editable" class="gs-badge gs-badge--warn"><AppIcon name="lock" :size="11" /> Chỉ xem</span>
        </div>

        <div class="tabs" role="tablist">
          <button type="button" role="tab" :aria-selected="tab === 'display'" :class="{ 'is-active': tab === 'display' }" @click="tab = 'display'">
            Hiển thị
          </button>
          <button type="button" role="tab" :aria-selected="tab === 'perms'" :class="{ 'is-active': tab === 'perms' }" data-test="tab-perms" @click="tab = 'perms'">
            Quyền
          </button>
          <button
            v-if="!role.isDefault"
            type="button"
            role="tab"
            :aria-selected="tab === 'members'"
            :class="{ 'is-active': tab === 'members' }"
            data-test="tab-role-members"
            @click="tab = 'members'"
          >
            Thành viên ({{ memberCount(role.id) }})
          </button>
        </div>

        <fieldset class="editor__body" :disabled="!editable">
          <template v-if="tab === 'display'">
            <div>
              <label class="ws-label" for="role-name">Tên vai trò</label>
              <input id="role-name" v-model="draft.name" class="ws-input" maxlength="32" :disabled="role.isDefault" data-test="role-name" />
            </div>
            <div>
              <span class="ws-label">Màu vai trò</span>
              <div class="gs-colors">
                <button
                  v-for="c in ROLE_COLORS"
                  :key="c"
                  type="button"
                  class="gs-swatch"
                  :class="{ 'is-on': draft.color === c }"
                  :style="{ background: c }"
                  :aria-label="`Màu ${c}`"
                  :aria-pressed="draft.color === c"
                  @click="draft.color = c"
                >
                  <AppIcon v-if="draft.color === c" name="check" :size="14" :stroke-width="3" />
                </button>
                <input v-model="draft.color" type="color" class="gs-color-input" aria-label="Chọn màu tuỳ chỉnh" />
              </div>
            </div>
            <div>
              <div class="gs-row">
                <div class="gs-row__text">
                  <strong>Hiển thị riêng trong danh sách thành viên</strong>
                  <small>Thành viên có vai trò này được xếp thành nhóm riêng khi đang trực tuyến.</small>
                </div>
                <ToggleSwitch v-model="draft.hoist" label="Hiển thị riêng" />
              </div>
              <div class="gs-row">
                <div class="gs-row__text">
                  <strong>Cho phép mọi người @nhắc vai trò này</strong>
                  <small>Thành viên có thể gửi thông báo đến cả vai trò bằng @{{ draft.name }}.</small>
                </div>
                <ToggleSwitch v-model="draft.mentionable" label="Cho phép nhắc vai trò" />
              </div>
            </div>
          </template>

          <template v-else-if="tab === 'perms'">
            <div class="gs-search">
              <AppIcon name="search" :size="16" />
              <input v-model="permQuery" class="ws-input" type="search" placeholder="Tìm quyền" aria-label="Tìm quyền" />
            </div>
            <p v-if="hasPerm('ADMINISTRATOR')" class="gs-notice"><AppIcon name="shield" :size="16" /> Vai trò có quyền Quản trị viên được bỏ qua mọi giới hạn bên dưới.</p>
            <section v-for="[title, perms] in permGroups" :key="title" class="perm-group">
              <h3>{{ title }}</h3>
              <div v-for="p in perms" :key="p" class="gs-row">
                <div class="gs-row__text">
                  <strong>{{ PERMISSION_META[p].label }}</strong>
                  <small>{{ PERMISSION_META[p].description }}</small>
                </div>
                <ToggleSwitch
                  :model-value="hasPerm(p)"
                  :label="PERMISSION_META[p].label"
                  :data-test="`perm-${p}`"
                  @update:model-value="setPerm(p, $event)"
                />
              </div>
            </section>
            <p v-if="!permGroups.length" class="gs-empty">Không có quyền nào khớp “{{ permQuery }}”.</p>
          </template>

          <template v-else>
            <div class="add">
              <select v-model="addMemberId" class="ws-input" aria-label="Chọn thành viên để thêm vào vai trò" data-test="role-add-member">
                <option value="" disabled>Thêm thành viên vào vai trò…</option>
                <option v-for="m in addable" :key="m.userId" :value="m.userId">{{ store.displayName(group.id, m.userId) }}</option>
              </select>
              <button type="button" class="gs-btn" :disabled="!addMemberId" data-test="role-add-confirm" @click="toggleMember(addMemberId)">Thêm</button>
            </div>
            <ul class="rm">
              <li v-for="m in roleMembers" :key="m.userId" class="rm__item">
                <PersonAvatar :person="store.person(m.userId)" :size="32" />
                <span class="rm__name">{{ store.displayName(group.id, m.userId) }}</span>
                <small>@{{ store.person(m.userId).username }}</small>
                <button
                  v-if="!role.managed"
                  type="button"
                  class="gs-icon-btn gs-icon-btn--danger"
                  :aria-label="`Gỡ ${store.displayName(group.id, m.userId)} khỏi vai trò`"
                  @click="toggleMember(m.userId)"
                >
                  <AppIcon name="x" :size="16" />
                </button>
              </li>
              <li v-if="!roleMembers.length" class="gs-empty">Chưa có thành viên nào mang vai trò này.</li>
            </ul>
          </template>
        </fieldset>

        <div v-if="!role.isDefault && !role.managed && editable" class="editor__danger">
          <button type="button" class="gs-btn gs-btn--danger gs-btn--sm" data-test="role-delete" @click="deleteOpen = true">
            <AppIcon name="trash" :size="14" /> Xoá vai trò
          </button>
        </div>

        <Transition name="ws-fade">
          <div v-if="dirty" class="gs-savebar" data-test="role-savebar">
            <p>Bạn có thay đổi chưa lưu.</p>
            <button type="button" class="gs-btn gs-btn--sm" @click="resetDraft">Đặt lại</button>
            <button type="button" class="gs-btn gs-btn--primary gs-btn--sm" data-test="role-save" @click="save">Lưu thay đổi</button>
          </div>
        </Transition>
      </section>
    </div>

    <ConfirmModal
      v-model:open="deleteOpen"
      :title="`Xoá vai trò “${role?.name}”?`"
      description="Thành viên đang có vai trò này sẽ mất các quyền đi kèm. Không thể hoàn tác."
      confirm-label="Xoá vai trò"
      danger
      @confirm="remove"
    />
  </div>
</template>

<style scoped>
.roles {
  display: grid;
  grid-template-columns: minmax(15rem, 19rem) minmax(0, 1fr);
  align-items: start;
  gap: 1rem;
}

.roles__list {
  position: sticky;
  top: 0;
  padding: 0.75rem;
}

.roles__items {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0.625rem 0 0;
  padding: 0;
  list-style: none;
}

.roles__item {
  display: flex;
  align-items: center;
  border-radius: 0.625rem;
}

.roles__item:hover {
  background: var(--ws-surface-2);
}

.roles__item.is-active {
  background: var(--ws-accent-soft);
}

.roles__pick {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  height: 2.5rem;
  padding: 0 0.5rem;
  border: 0;
  background: none;
  color: var(--ws-text);
  font-size: 0.875rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.roles__grip {
  color: var(--ws-text-3);
}

.roles__dot {
  flex: none;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
}

.roles__name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.roles__lock {
  color: var(--ws-text-3);
}

.roles__count {
  color: var(--ws-text-3);
  font-size: 0.75rem;
}

.roles__move {
  display: flex;
  padding-right: 0.25rem;
  opacity: 0;
}

.roles__item:hover .roles__move,
.roles__item.is-active .roles__move,
.roles__move:focus-within {
  opacity: 1;
}

.roles__move .gs-icon-btn {
  width: 1.5rem;
  height: 1.5rem;
}

.roles__editor {
  min-width: 0;
}

.editor__head {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.editor__head h2 {
  margin: 0;
  font-size: 1.25rem;
}

.editor__swatch {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
}

.tabs {
  display: flex;
  gap: 1.25rem;
  margin: 1rem 0 1.25rem;
  border-bottom: 1px solid var(--ws-border);
}

.tabs button {
  margin-bottom: -1px;
  padding: 0.5rem 0;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--ws-text-2);
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
}

.tabs button.is-active {
  border-bottom-color: var(--ws-accent);
  color: var(--ws-text);
}

.editor__body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.editor__body:disabled {
  opacity: 0.75;
}

.perm-group h3 {
  margin: 0;
  color: var(--ws-text-3);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.add {
  display: flex;
  gap: 0.5rem;
}

.rm {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rm__item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 0.625rem;
}

.rm__item:hover {
  background: var(--ws-surface-2);
}

.rm__name {
  font-size: 0.9375rem;
  font-weight: 600;
}

.rm__item small {
  flex: 1;
  color: var(--ws-text-3);
}

.editor__danger {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--ws-border);
}

@media (max-width: 60rem) {
  .roles {
    grid-template-columns: minmax(0, 1fr);
  }

  .roles__list {
    position: static;
  }
}
</style>
