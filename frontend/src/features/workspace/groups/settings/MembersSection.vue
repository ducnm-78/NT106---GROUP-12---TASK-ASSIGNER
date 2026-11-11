<script setup lang="ts">
import { normalizeText as normalize } from '@/shared/utils/text'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseModal from '../../components/BaseModal.vue'
import { useToast } from '../../composables/useToast'
import { formatDate, JOIN_LABELS } from '../format'
import { useGroups } from '../useGroups'
import type { Group } from '../types'
import InviteModal from '../components/InviteModal.vue'
import PersonAvatar from '../components/PersonAvatar.vue'

const props = defineProps<{ group: Group }>()
const route = useRoute()
const store = useGroups()
const toast = useToast()

const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
const roleFilter = ref('')
const menuFor = ref<string | null>(null)
// Đóng menu thao tác khi bấm ra ngoài hoặc nhấn Escape
const onPointer = (e: PointerEvent) => {
  if (!(e.target as Element | null)?.closest?.('.menu-wrap')) menuFor.value = null
}
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') menuFor.value = null
}
onMounted(() => {
  document.addEventListener('pointerdown', onPointer)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointer)
  document.removeEventListener('keydown', onKey)
})
const inviteOpen = ref(false)

const rows = computed(() => {
  const q = normalize(query.value.trim())
  return props.group.members
    .filter((m) => !roleFilter.value || m.roleIds.includes(roleFilter.value))
    .filter((m) => {
      if (!q) return true
      const p = store.person(m.userId)
      return normalize(`${p.name} ${p.username} ${m.nickname ?? ''}`).includes(q)
    })
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))
})

const assignableRoles = computed(() => props.group.roles.filter((r) => !r.isDefault && !r.managed && store.canManageRole(props.group.id, r.id)))

function addRole(userId: string, event: Event): void {
  const select = event.target as HTMLSelectElement
  if (!select.value) return
  const r = store.toggleMemberRole(props.group.id, userId, select.value)
  if (!r.ok) toast.show(r.error, 'error')
  select.value = ''
}

function removeRole(userId: string, roleId: string): void {
  const r = store.toggleMemberRole(props.group.id, userId, roleId)
  if (!r.ok) toast.show(r.error, 'error')
}

/* ----- Hộp thoại hành động ----- */
type Action = { kind: 'nickname' | 'kick' | 'ban'; userId: string }
const action = ref<Action | null>(null)
const actionOpen = computed({
  get: () => !!action.value,
  set: (v) => {
    if (!v) action.value = null
  },
})
const nickname = ref('')
const reason = ref('')

function openAction(kind: Action['kind'], userId: string): void {
  menuFor.value = null
  nickname.value = store.member(props.group.id, userId)?.nickname ?? ''
  reason.value = ''
  action.value = { kind, userId }
}

function timeout(userId: string, minutes: number): void {
  menuFor.value = null
  const r = store.timeoutMember(props.group.id, userId, minutes)
  if (r.ok) toast.show(minutes ? `Đã tạm khoá ${store.person(userId).name} ${minutes >= 60 ? `${minutes / 60} giờ` : `${minutes} phút`}.` : 'Đã gỡ tạm khoá.')
  else toast.show(r.error, 'error')
}

function confirmAction(): void {
  const a = action.value
  if (!a) return
  const name = store.person(a.userId).name
  const r =
    a.kind === 'nickname'
      ? store.setNickname(props.group.id, a.userId, nickname.value)
      : a.kind === 'kick'
        ? store.kickMember(props.group.id, a.userId)
        : store.banMember(props.group.id, a.userId, reason.value)
  if (!r.ok) {
    toast.show(r.error, 'error')
    return
  }
  toast.show(a.kind === 'nickname' ? 'Đã cập nhật biệt danh.' : a.kind === 'kick' ? `Đã mời ${name} ra khỏi nhóm.` : `Đã cấm ${name}.`)
  action.value = null
}

const ACTION_TITLE = { nickname: 'Đổi biệt danh', kick: 'Mời ra khỏi nhóm', ban: 'Cấm khỏi nhóm' }
</script>

<template>
  <div>
    <header class="gs-head">
      <div>
        <h1 class="gs-title">Thành viên</h1>
        <p class="gs-desc">{{ group.members.length }} thành viên · quản lý vai trò, biệt danh và kiểm duyệt.</p>
      </div>
      <button type="button" class="gs-btn gs-btn--primary" :disabled="!store.can(group.id, 'MANAGE_MEMBERS')" @click="inviteOpen = true">
        <AppIcon name="user-plus" :size="16" /> Mời thành viên
      </button>
    </header>

    <div class="gs-toolbar">
      <div class="gs-search">
        <AppIcon name="search" :size="16" />
        <input v-model="query" class="ws-input" type="search" placeholder="Tìm theo tên, tên người dùng, biệt danh" aria-label="Tìm thành viên" data-test="members-search" />
      </div>
      <label class="filter">
        <AppIcon name="filter" :size="16" />
        <span class="visually-hidden">Lọc theo vai trò</span>
        <select v-model="roleFilter" class="ws-input" data-test="members-filter">
          <option value="">Tất cả vai trò</option>
          <option v-for="r in group.roles.filter((x) => !x.isDefault)" :key="r.id" :value="r.id">{{ r.name }}</option>
        </select>
      </label>
    </div>

    <div class="table gs-card">
      <div class="table__head" role="presentation">
        <span>Thành viên</span>
        <span>Tham gia</span>
        <span>Vai trò</span>
        <span class="visually-hidden">Thao tác</span>
      </div>
      <ul class="table__body" data-test="members-table">
        <li v-for="m in rows" :key="m.userId" class="table__row" :data-test="`row-${m.userId}`">
          <div class="cell-user">
            <PersonAvatar :person="store.person(m.userId)" :size="38" status ring="var(--ws-surface)" />
            <span class="cell-user__text">
              <strong>
                {{ store.displayName(group.id, m.userId) }}
                <span v-if="group.ownerId === m.userId" title="Chủ nhóm">👑</span>
                <span v-if="store.person(m.userId).bot" class="gs-badge">BOT</span>
                <span v-if="store.isTimedOutIn(group.id, m.userId)" class="gs-badge gs-badge--danger" data-test="timeout-badge">
                  <AppIcon name="clock" :size="11" /> Tạm khoá
                </span>
              </strong>
              <small>@{{ store.person(m.userId).username }}<template v-if="m.nickname"> · {{ store.person(m.userId).name }}</template></small>
            </span>
          </div>
          <div class="cell-join">
            <span>{{ formatDate(m.joinedAt) }}</span>
            <small :class="{ 'is-cal': m.joinedVia === 'calendar' }">{{ JOIN_LABELS[m.joinedVia] }}</small>
          </div>
          <div class="cell-roles">
            <span v-for="r in store.memberRoles(group.id, m.userId)" :key="r.id" class="gs-role-chip" :style="{ '--rc': r.color }">
              {{ r.name }}
              <button
                v-if="store.canManageRole(group.id, r.id) && !r.managed"
                type="button"
                class="chip-x"
                :aria-label="`Gỡ ${r.name}`"
                @click="removeRole(m.userId, r.id)"
              >
                <AppIcon name="x" :size="11" :stroke-width="2.6" />
              </button>
            </span>
            <select
              v-if="assignableRoles.length && !store.person(m.userId).bot"
              class="add-role"
              aria-label="Thêm vai trò"
              :data-test="`add-role-${m.userId}`"
              @change="addRole(m.userId, $event)"
            >
              <option value="">+</option>
              <option v-for="r in assignableRoles.filter((x) => !m.roleIds.includes(x.id))" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </div>
          <div class="cell-actions">
            <div v-if="store.canModerate(group.id, m.userId) || m.userId === store.meId.value" class="menu-wrap">
              <button
                type="button"
                class="gs-icon-btn"
                :aria-label="`Thao tác với ${store.person(m.userId).name}`"
                :aria-expanded="menuFor === m.userId"
                :data-test="`actions-${m.userId}`"
                @click="menuFor = menuFor === m.userId ? null : m.userId"
              >
                <AppIcon name="more" :size="18" />
              </button>
              <div v-if="menuFor === m.userId" class="menu" role="menu">
                <button type="button" role="menuitem" @click="openAction('nickname', m.userId)"><AppIcon name="pencil" :size="15" /> Đổi biệt danh</button>
                <template v-if="store.canModerate(group.id, m.userId)">
                  <template v-if="!store.isTimedOutIn(group.id, m.userId)">
                    <button type="button" role="menuitem" data-test="timeout-10" @click="timeout(m.userId, 10)"><AppIcon name="clock" :size="15" /> Tạm khoá 10 phút</button>
                    <button type="button" role="menuitem" @click="timeout(m.userId, 60)"><AppIcon name="clock" :size="15" /> Tạm khoá 1 giờ</button>
                  </template>
                  <button v-else type="button" role="menuitem" @click="timeout(m.userId, 0)"><AppIcon name="check" :size="15" /> Gỡ tạm khoá</button>
                  <span class="menu__sep" />
                  <button type="button" role="menuitem" class="is-danger" data-test="kick" @click="openAction('kick', m.userId)">
                    <AppIcon name="log-out" :size="15" /> Mời ra khỏi nhóm
                  </button>
                  <button type="button" role="menuitem" class="is-danger" data-test="ban" @click="openAction('ban', m.userId)"><AppIcon name="ban" :size="15" /> Cấm</button>
                </template>
              </div>
            </div>
          </div>
        </li>
        <li v-if="!rows.length" class="gs-empty">Không tìm thấy thành viên phù hợp.</li>
      </ul>
    </div>

    <BaseModal
      v-model:open="actionOpen"
      :title="action ? `${ACTION_TITLE[action.kind]}: ${store.person(action.userId).name}` : ''"
      :description="
        action?.kind === 'kick'
          ? 'Người này có thể tham gia lại nếu được mời.'
          : action?.kind === 'ban'
            ? 'Người này sẽ bị xoá khỏi nhóm và không thể tham gia lại cho đến khi được gỡ cấm.'
            : 'Biệt danh chỉ hiển thị trong nhóm này.'
      "
    >
      <form id="member-action" novalidate @submit.prevent="confirmAction">
        <template v-if="action?.kind === 'nickname'">
          <label class="ws-label" for="nick">Biệt danh</label>
          <input id="nick" v-model="nickname" class="ws-input" maxlength="32" :placeholder="action ? store.person(action.userId).name : ''" autofocus data-test="nickname" />
        </template>
        <template v-else-if="action?.kind === 'ban'">
          <label class="ws-label" for="reason">Lý do (không bắt buộc)</label>
          <input id="reason" v-model="reason" class="ws-input" maxlength="120" autofocus />
        </template>
      </form>
      <template #footer>
        <BaseButton variant="secondary" class="ws-btn-auto" @click="action = null">Huỷ</BaseButton>
        <BaseButton
          type="submit"
          form="member-action"
          :variant="action?.kind === 'nickname' ? 'primary' : 'danger'"
          class="ws-btn-auto"
          data-test="action-confirm"
        >
          {{ action?.kind === 'nickname' ? 'Lưu' : action?.kind === 'kick' ? 'Mời ra' : 'Cấm' }}
        </BaseButton>
      </template>
    </BaseModal>

    <InviteModal v-model:open="inviteOpen" :group-id="group.id" />
  </div>
</template>

<style scoped>
.filter {
  position: relative;
  display: flex;
  align-items: center;
  color: var(--ws-text-3);
}

.filter > svg {
  position: absolute;
  left: 0.875rem;
  pointer-events: none;
}

.filter select {
  width: auto;
  min-width: 12rem;
  padding-left: 2.5rem;
}

.table {
  padding: 0;
  overflow: visible;
}

.table__head,
.table__row {
  display: grid;
  grid-template-columns: minmax(14rem, 1.4fr) minmax(8rem, 0.7fr) minmax(12rem, 1.5fr) 3rem;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
}

.table__head {
  border-bottom: 1px solid var(--ws-border);
  color: var(--ws-text-3);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.table__body {
  margin: 0;
  padding: 0;
  list-style: none;
}

.table__row + .table__row {
  border-top: 1px solid var(--ws-border);
}

.table__row:hover {
  background: color-mix(in srgb, var(--ws-surface-2) 50%, transparent);
}

.cell-user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.cell-user__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.cell-user__text strong {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.9375rem;
}

.cell-user__text small,
.cell-join small {
  color: var(--ws-text-3);
  font-size: 0.8125rem;
}

.cell-join {
  display: flex;
  flex-direction: column;
  font-size: 0.875rem;
}

.cell-join small.is-cal {
  color: var(--ws-info);
  font-weight: 600;
}

.cell-roles {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
}

.chip-x {
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

.chip-x:hover {
  background: var(--ws-surface-3);
  color: var(--ws-text);
}

.add-role {
  width: 1.75rem;
  height: 1.625rem;
  padding: 0;
  border: 1px dashed var(--ws-border-strong);
  border-radius: 0.375rem;
  background: var(--ws-surface);
  color: var(--ws-text-2);
  font-weight: 700;
  text-align: center;
  cursor: pointer;
  appearance: none;
}

.add-role:hover {
  border-color: var(--ws-accent);
  color: var(--ws-accent-text);
}

.cell-actions {
  display: flex;
  justify-content: flex-end;
}

.menu-wrap {
  position: relative;
}

.menu {
  position: absolute;
  top: calc(100% + 0.25rem);
  right: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  min-width: 13rem;
  padding: 0.375rem;
  border: 1px solid var(--ws-border-strong);
  border-radius: var(--ws-radius-sm);
  background: var(--ws-surface-2);
  box-shadow: var(--ws-shadow);
}

.menu button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  border: 0;
  border-radius: 0.5rem;
  background: none;
  color: var(--ws-text-2);
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
}

.menu button:hover {
  background: var(--ws-surface-3);
  color: var(--ws-text);
}

.menu button.is-danger {
  color: var(--ws-danger);
}

.menu button.is-danger:hover {
  background: var(--ws-danger);
  color: #fff;
}

.menu__sep {
  height: 1px;
  margin: 0.25rem;
  background: var(--ws-border);
}

@media (max-width: 56rem) {
  .table__head {
    display: none;
  }

  .table__row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.5rem;
  }

  .cell-join,
  .cell-roles {
    grid-column: 1 / -1;
  }

  .cell-actions {
    grid-row: 1;
    grid-column: 2;
  }
}
</style>
