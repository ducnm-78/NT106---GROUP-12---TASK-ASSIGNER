<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import { useToast } from '../../composables/useToast'
import { formatDate, JOIN_LABELS } from '../format'
import { useGroups } from '../useGroups'
import PersonAvatar from './PersonAvatar.vue'

const props = defineProps<{ groupId: string; userId: string; anchor: HTMLElement }>()
const emit = defineEmits<{ close: []; mention: [name: string] }>()

const store = useGroups()
const toast = useToast()
const root = ref<HTMLElement | null>(null)
const pos = ref({ top: 0, left: 0 })
const pickerOpen = ref(false)
const roleQuery = ref('')

const person = computed(() => store.person(props.userId))
const member = computed(() => store.member(props.groupId, props.userId))
const roles = computed(() => store.memberRoles(props.groupId, props.userId))
const group = computed(() => store.group(props.groupId))
const assignable = computed(() =>
  (group.value?.roles ?? []).filter(
    (r) => !r.isDefault && !r.managed && r.name.toLocaleLowerCase('vi').includes(roleQuery.value.trim().toLocaleLowerCase('vi')),
  ),
)
const canAssignAny = computed(() => (group.value?.roles ?? []).some((r) => !r.isDefault && !r.managed && store.canManageRole(props.groupId, r.id)))
const bannerColor = computed(() => roles.value[0]?.color ?? person.value.color)
const STATUS = { online: 'Trực tuyến', idle: 'Vắng mặt', dnd: 'Không làm phiền', offline: 'Ngoại tuyến' }

/** Đặt thẻ cạnh phần tử được bấm, giữ trong khung nhìn. */
function place(): void {
  const rect = props.anchor.getBoundingClientRect()
  const el = root.value
  const w = el?.offsetWidth ?? 340
  const h = el?.offsetHeight ?? 420
  let left = rect.left - w - 12
  if (left < 12) left = Math.min(rect.right + 12, window.innerWidth - w - 12)
  const top = Math.max(12, Math.min(rect.top, window.innerHeight - h - 12))
  pos.value = { top, left: Math.max(12, left) }
}

function toggle(roleId: string): void {
  const r = store.toggleMemberRole(props.groupId, props.userId, roleId)
  if (!r.ok) toast.show(r.error, 'error')
  nextTick(place)
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') emit('close')
}

function onPointer(e: PointerEvent): void {
  if (root.value && !root.value.contains(e.target as Node) && !props.anchor.contains(e.target as Node)) emit('close')
}

onMounted(() => {
  nextTick(() => {
    place()
    root.value?.focus()
  })
  document.addEventListener('keydown', onKey)
  document.addEventListener('pointerdown', onPointer)
  window.addEventListener('resize', place)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  document.removeEventListener('pointerdown', onPointer)
  window.removeEventListener('resize', place)
})
watch(() => [props.userId, props.anchor], () => nextTick(place))
watch(pickerOpen, () => nextTick(place))
</script>

<template>
  <Teleport to=".ws">
    <div
      ref="root"
      class="pop"
      role="dialog"
      :aria-label="`Hồ sơ ${person.name}`"
      tabindex="-1"
      :style="{ top: `${pos.top}px`, left: `${pos.left}px`, '--banner': bannerColor }"
      data-test="member-popout"
    >
      <div class="pop__banner" />
      <div class="pop__avatar">
        <PersonAvatar :person="person" :size="80" status ring="var(--ws-surface-2)" />
      </div>
      <div class="pop__body">
        <h2 class="pop__name">
          {{ store.displayName(groupId, userId) }}
          <span v-if="person.bot" class="pop__bot">AI</span>
        </h2>
        <p class="pop__user">
          @{{ person.username }}
          <span v-if="member?.nickname"> · {{ person.name }}</span>
        </p>
        <p class="pop__status">
          <span class="pop__dot" :class="`is-${person.status}`" />{{ person.activity || STATUS[person.status] }}
        </p>

        <div class="pop__section">
          <h3>Thành viên từ</h3>
          <p>
            {{ member ? formatDate(member.joinedAt) : '—' }}
            <span v-if="member" class="pop__via">· {{ JOIN_LABELS[member.joinedVia] }}</span>
          </p>
        </div>

        <div class="pop__section">
          <h3>Vai trò</h3>
          <ul class="pop__roles" data-test="popout-roles">
            <li v-for="r in roles" :key="r.id" class="pop__role" :style="{ '--rc': r.color }">
              <button
                v-if="store.canManageRole(groupId, r.id) && !r.managed"
                type="button"
                class="pop__role-x"
                :aria-label="`Gỡ vai trò ${r.name}`"
                @click="toggle(r.id)"
              >
                <AppIcon name="x" :size="10" :stroke-width="3" />
              </button>
              <span v-else class="pop__role-dot" />
              {{ r.name }}
            </li>
            <li v-if="!roles.length" class="pop__none">Chưa có vai trò</li>
            <li v-if="canAssignAny && !person.bot">
              <button
                type="button"
                class="pop__role-add"
                :aria-expanded="pickerOpen"
                aria-label="Thêm vai trò"
                title="Thêm vai trò"
                data-test="role-add"
                @click="pickerOpen = !pickerOpen"
              >
                <AppIcon name="plus" :size="14" :stroke-width="2.6" />
              </button>
            </li>
          </ul>

          <!-- Bộ chọn vai trò -->
          <div v-if="pickerOpen" class="picker" data-test="role-picker">
            <input v-model="roleQuery" class="picker__search" type="search" placeholder="Tìm vai trò" aria-label="Tìm vai trò" />
            <ul class="picker__list">
              <li v-for="r in assignable" :key="r.id">
                <label class="picker__item" :class="{ 'is-locked': !store.canManageRole(groupId, r.id) }">
                  <input
                    type="checkbox"
                    :checked="member?.roleIds.includes(r.id)"
                    :disabled="!store.canManageRole(groupId, r.id)"
                    :data-test="`pick-${r.name}`"
                    @change="toggle(r.id)"
                  />
                  <span class="picker__dot" :style="{ background: r.color }" />
                  <span class="picker__name">{{ r.name }}</span>
                  <AppIcon v-if="!store.canManageRole(groupId, r.id)" name="lock" :size="13" />
                </label>
              </li>
              <li v-if="!assignable.length" class="pop__none">Không có vai trò phù hợp</li>
            </ul>
            <p class="picker__hint">Chỉ gán được vai trò thấp hơn vai trò cao nhất của bạn.</p>
          </div>
        </div>

        <div class="pop__actions">
          <button type="button" class="pop__btn" @click="emit('mention', store.displayName(groupId, userId))">
            <AppIcon name="at" :size="16" /> Nhắc tên
          </button>
          <RouterLink
            v-if="store.can(groupId, 'MANAGE_MEMBERS')"
            :to="{ name: 'team-settings', params: { groupId, section: 'members' }, query: { q: person.name } }"
            class="pop__btn"
            @click="emit('close')"
          >
            <AppIcon name="settings" :size="16" /> Quản lý
          </RouterLink>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.pop {
  position: fixed;
  z-index: 60;
  width: 21rem;
  max-height: calc(100dvh - 24px);
  overflow: hidden auto;
  border: 1px solid var(--ws-border-strong);
  border-radius: 1rem;
  background: var(--ws-surface-2);
  box-shadow: var(--ws-shadow);
  outline: none;
}

.pop__banner {
  height: 4.5rem;
  background: linear-gradient(120deg, var(--banner), color-mix(in srgb, var(--banner) 45%, var(--ws-surface-2)));
}

.pop__avatar {
  position: absolute;
  top: 1.75rem;
  left: 1rem;
  padding: 5px;
  border-radius: 50%;
  background: var(--ws-surface-2);
}

.pop__body {
  padding: 3rem 1rem 1rem;
}

.pop__name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.25rem;
}

.pop__bot {
  padding: 0.0625rem 0.375rem;
  border-radius: 0.3125rem;
  background: var(--ws-accent);
  color: #fff;
  font-size: 0.625rem;
}

.pop__user {
  margin: 0.125rem 0 0;
  color: var(--ws-text-2);
  font-size: 0.875rem;
}

.pop__status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.75rem 0 0;
  padding: 0.5rem 0.625rem;
  border-radius: 0.5rem;
  background: var(--ws-surface);
  color: var(--ws-text-2);
  font-size: 0.8125rem;
}

.pop__dot {
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 50%;
}

.pop__dot.is-online {
  background: var(--ws-online);
}

.pop__dot.is-idle {
  background: var(--ws-idle);
}

.pop__dot.is-dnd {
  background: var(--ws-dnd);
}

.pop__dot.is-offline {
  background: var(--ws-offline);
}

.pop__section {
  margin-top: 0.875rem;
  padding-top: 0.875rem;
  border-top: 1px solid var(--ws-border);
}

.pop__section h3 {
  margin: 0 0 0.375rem;
  color: var(--ws-text-3);
  font-size: 0.6875rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.pop__section p {
  margin: 0;
  font-size: 0.875rem;
}

.pop__via {
  color: var(--ws-text-3);
}

.pop__roles {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pop__role {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  height: 1.625rem;
  padding: 0 0.5rem 0 0.375rem;
  border: 1px solid color-mix(in srgb, var(--rc) 45%, transparent);
  border-radius: 0.375rem;
  background: color-mix(in srgb, var(--rc) 12%, var(--ws-surface));
  font-size: 0.8125rem;
  font-weight: 600;
}

.pop__role-dot,
.pop__role-x {
  display: grid;
  place-items: center;
  width: 0.75rem;
  height: 0.75rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--rc);
  color: transparent;
}

.pop__role-x {
  cursor: pointer;
}

.pop__role-x:hover {
  color: #10172a;
}

.pop__role-add {
  display: grid;
  place-items: center;
  width: 1.625rem;
  height: 1.625rem;
  padding: 0;
  border: 1px dashed var(--ws-border-strong);
  border-radius: 0.375rem;
  background: var(--ws-surface);
  color: var(--ws-text-2);
  cursor: pointer;
}

.pop__role-add:hover {
  border-color: var(--ws-accent);
  color: var(--ws-accent-text);
}

.pop__none {
  color: var(--ws-text-3);
  font-size: 0.8125rem;
}

.picker {
  margin-top: 0.625rem;
  padding: 0.5rem;
  border: 1px solid var(--ws-border-strong);
  border-radius: 0.75rem;
  background: var(--ws-surface);
}

.picker__search {
  width: 100%;
  height: 2rem;
  padding: 0 0.625rem;
  border: 1px solid var(--ws-border);
  border-radius: 0.5rem;
  background: var(--ws-surface-2);
  color: var(--ws-text);
  font: inherit;
  font-size: 0.8125rem;
}

.picker__list {
  max-height: 11rem;
  margin: 0.375rem 0 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.picker__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem;
  border-radius: 0.375rem;
  color: var(--ws-text-2);
  font-size: 0.875rem;
  cursor: pointer;
}

.picker__item:hover {
  background: var(--ws-surface-2);
  color: var(--ws-text);
}

.picker__item.is-locked {
  cursor: not-allowed;
  opacity: 0.55;
}

.picker__item input {
  accent-color: var(--ws-accent);
}

.picker__dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
}

.picker__name {
  flex: 1;
}

.picker__hint {
  margin: 0.375rem 0 0 !important;
  color: var(--ws-text-3);
  font-size: 0.6875rem !important;
}

.pop__actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.pop__btn {
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  height: 2.25rem;
  border: 0;
  border-radius: 0.625rem;
  background: var(--ws-surface-3);
  color: var(--ws-text);
  font-size: 0.8125rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}

.pop__btn:hover {
  background: var(--ws-accent);
  color: #fff;
}
</style>
