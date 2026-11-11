<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon, { type IconName } from '@/shared/components/AppIcon.vue'
import { useClickOutside } from '../../composables/useClickOutside'
import { useCalendar } from '../../calendar/useCalendar'
import { useGroups } from '../useGroups'
import { FEATURES } from '../features'
import { shortDay } from '../format'
import type { Channel, Group } from '../types'
import PersonAvatar from './PersonAvatar.vue'

const props = defineProps<{ group: Group; activeChannelId: string | null }>()
const emit = defineEmits<{
  select: [channelId: string]
  createChannel: [categoryId: string | null]
  invite: []
  leave: []
  settings: []
}>()

const store = useGroups()
const { upcomingForGroup } = useCalendar()

const collapsed = ref<Set<string>>(new Set())
const menuOpen = ref(false)
const menuRoot = ref<HTMLElement | null>(null)
useClickOutside(menuRoot, () => (menuOpen.value = false))

const canManageChannels = computed(() => store.can(props.group.id, 'MANAGE_CHANNELS'))
const canInvite = computed(() => store.can(props.group.id, 'MANAGE_MEMBERS'))
const isAdmin = computed(() => store.can(props.group.id, 'ADMINISTRATOR'))
const events = computed(() => upcomingForGroup(props.group.id).slice(0, 2))

const sections = computed(() => {
  const visible = store.visibleChannels(props.group.id)
  const uncategorized = visible.filter((c) => !c.categoryId || !props.group.categories.some((k) => k.id === c.categoryId))
  const list = props.group.categories.map((cat) => ({ id: cat.id, name: cat.name, channels: visible.filter((c) => c.categoryId === cat.id) }))
  if (uncategorized.length) list.unshift({ id: '__none', name: '', channels: uncategorized })
  return list.filter((s) => s.channels.length || canManageChannels.value)
})

function iconOf(channel: Channel): IconName {
  if (channel.type === 'voice') return 'volume'
  if (channel.type === 'announcement') return 'megaphone'
  return 'hash'
}

function toggle(id: string): void {
  const next = new Set(collapsed.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  collapsed.value = next
}

function onChannel(channel: Channel): void {
  // Gọi thoại đang để dành cho bản mở rộng: vẫn mở màn hình kênh để hiện thông báo “Sắp có”.
  if (channel.type === 'voice' && FEATURES.voice) {
    const result = store.joinVoice(props.group.id, channel.id)
    if (!result.ok) return
  }
  emit('select', channel.id)
}

function menu(action: () => void): void {
  menuOpen.value = false
  action()
}

const voiceChannel = computed(() => {
  const v = store.voice.value
  if (!v) return null
  const g = store.group(v.groupId)
  return { group: g, channel: g?.channels.find((c) => c.id === v.channelId) }
})
</script>

<template>
  <aside class="cs" aria-label="Kênh của nhóm">
    <div ref="menuRoot" class="cs__head-wrap">
      <button
        type="button"
        class="cs__head"
        :aria-expanded="menuOpen"
        aria-haspopup="menu"
        data-test="group-menu"
        @click="menuOpen = !menuOpen"
      >
        <span class="cs__name">{{ group.name }}</span>
        <AppIcon :name="menuOpen ? 'x' : 'chevron-down'" :size="18" />
      </button>
      <Transition name="pop">
        <div v-if="menuOpen" class="cs__menu" role="menu">
          <button v-if="canInvite" type="button" role="menuitem" class="cs__menu-item is-accent" @click="menu(() => emit('invite'))">
            Mời thành viên <AppIcon name="user-plus" :size="17" />
          </button>
          <button type="button" role="menuitem" class="cs__menu-item" data-test="menu-settings" @click="menu(() => emit('settings'))">
            Cài đặt nhóm <AppIcon name="settings" :size="17" />
          </button>
          <button
            v-if="canManageChannels"
            type="button"
            role="menuitem"
            class="cs__menu-item"
            data-test="menu-create-channel"
            @click="menu(() => emit('createChannel', null))"
          >
            Tạo kênh <AppIcon name="plus" :size="17" />
          </button>
          <button
            type="button"
            role="menuitem"
            class="cs__menu-item"
            @click="menu(() => store.updateGroup(group.id, { muted: !group.muted }))"
          >
            {{ group.muted ? 'Bật thông báo' : 'Tắt thông báo' }} <AppIcon :name="group.muted ? 'bell' : 'bell-off'" :size="17" />
          </button>
          <button type="button" role="menuitem" class="cs__menu-item" @click="menu(() => store.markGroupRead(group.id))">
            Đánh dấu đã đọc <AppIcon name="check" :size="17" />
          </button>
          <template v-if="!isAdmin || group.ownerId !== store.meId.value">
            <span class="cs__menu-sep" />
            <button type="button" role="menuitem" class="cs__menu-item is-danger" data-test="menu-leave" @click="menu(() => emit('leave'))">
              Rời nhóm <AppIcon name="log-out" :size="17" />
            </button>
          </template>
        </div>
      </Transition>
    </div>

    <div class="cs__scroll ws-scroll">
      <section v-if="events.length" class="cs__events" aria-label="Sự kiện sắp tới">
        <RouterLink v-for="ev in events" :key="ev.id" :to="{ name: 'calendar', query: { date: ev.date } }" class="cs__event">
          <span class="cs__event-date" :style="{ '--c': ev.color }">{{ shortDay(ev.date) }}</span>
          <span class="cs__event-text">
            <strong>{{ ev.title }}</strong>
            <small>{{ ev.start }} – {{ ev.end }}</small>
          </span>
        </RouterLink>
      </section>

      <section v-for="section in sections" :key="section.id" class="cs__section">
        <div v-if="section.name" class="cs__cat">
          <button type="button" class="cs__cat-btn" :aria-expanded="!collapsed.has(section.id)" @click="toggle(section.id)">
            <AppIcon name="chevron-down" :size="12" :stroke-width="3" class="cs__chev" :class="{ 'is-collapsed': collapsed.has(section.id) }" />
            {{ section.name }}
          </button>
          <button
            v-if="canManageChannels"
            type="button"
            class="cs__cat-add"
            :aria-label="`Tạo kênh trong ${section.name}`"
            :title="`Tạo kênh trong ${section.name}`"
            @click="emit('createChannel', section.id)"
          >
            <AppIcon name="plus" :size="16" />
          </button>
        </div>
        <ul v-show="!collapsed.has(section.id)" class="cs__list">
          <li v-for="c in section.channels" :key="c.id">
            <button
              type="button"
              class="cs__channel"
              :class="{
                'is-active': c.id === activeChannelId,
                'is-unread': c.type !== 'voice' && store.unreadCount(c.id) > 0,
              }"
              :aria-current="c.id === activeChannelId ? 'page' : undefined"
              :data-test="`channel-${c.name}`"
              @click="onChannel(c)"
            >
              <AppIcon :name="iconOf(c)" :size="18" class="cs__channel-icon" />
              <span class="cs__channel-name">{{ c.name }}</span>
              <AppIcon v-if="c.private" name="lock" :size="13" class="cs__lock" />
              <span v-if="c.type === 'voice' && !FEATURES.voice" class="cs__soon" data-test="voice-soon">Sắp có</span>
              <span v-if="c.type !== 'voice' && store.unreadCount(c.id)" class="cs__count">{{ store.unreadCount(c.id) }}</span>
            </button>
            <ul v-if="c.type === 'voice' && store.voiceParticipants(group.id, c.id).length" class="cs__voice-users">
              <li v-for="userId in store.voiceParticipants(group.id, c.id)" :key="userId">
                <PersonAvatar :person="store.person(userId)" :size="22" />
                <span>{{ store.displayName(group.id, userId) }}</span>
                <AppIcon
                  v-if="userId === store.meId.value && store.voice.value?.muted"
                  name="mic-off"
                  :size="14"
                  class="cs__voice-muted"
                />
              </li>
            </ul>
          </li>
        </ul>
      </section>
    </div>

    <!-- Khung trạng thái thoại -->
    <div v-if="store.voice.value && voiceChannel?.channel" class="cs__voice" data-test="voice-panel">
      <div class="cs__voice-info">
        <span class="cs__voice-status"><AppIcon name="signal" :size="16" /> Đã kết nối thoại</span>
        <span class="cs__voice-where">{{ voiceChannel.channel.name }} / {{ voiceChannel.group?.name }}</span>
      </div>
      <div class="cs__voice-actions">
        <button
          type="button"
          class="cs__vbtn"
          :class="{ 'is-on': store.voice.value.muted }"
          :aria-pressed="store.voice.value.muted"
          :title="store.voice.value.muted ? 'Bật mic' : 'Tắt mic'"
          data-test="voice-mute"
          @click="store.toggleVoice('muted')"
        >
          <AppIcon :name="store.voice.value.muted ? 'mic-off' : 'mic'" :size="18" />
          <span class="visually-hidden">Tắt mic</span>
        </button>
        <button
          type="button"
          class="cs__vbtn"
          :class="{ 'is-on': store.voice.value.deafened }"
          :aria-pressed="store.voice.value.deafened"
          title="Tắt âm thanh"
          @click="store.toggleVoice('deafened')"
        >
          <AppIcon name="headphones" :size="18" />
          <span class="visually-hidden">Tắt âm thanh</span>
        </button>
        <button
          type="button"
          class="cs__vbtn"
          :class="{ 'is-share': store.voice.value.sharing }"
          :aria-pressed="store.voice.value.sharing"
          title="Chia sẻ màn hình"
          @click="store.toggleVoice('sharing')"
        >
          <AppIcon name="monitor" :size="18" />
          <span class="visually-hidden">Chia sẻ màn hình</span>
        </button>
        <button type="button" class="cs__vbtn cs__vbtn--leave" title="Ngắt kết nối" data-test="voice-leave" @click="store.leaveVoice()">
          <AppIcon name="phone-off" :size="18" />
          <span class="visually-hidden">Ngắt kết nối</span>
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.cs {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  border-right: 1px solid var(--ws-border);
  background: color-mix(in srgb, var(--ws-sidebar) 55%, var(--ws-surface));
}

.cs__head-wrap {
  position: relative;
}

.cs__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  height: 3.5rem;
  padding: 0 1rem;
  border: 0;
  border-bottom: 1px solid var(--ws-border);
  background: transparent;
  color: var(--ws-text);
  font-size: 1rem;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.cs__head:hover {
  background: var(--ws-surface-2);
}

.cs__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cs__menu {
  position: absolute;
  top: calc(100% + 0.375rem);
  right: 0.5rem;
  left: 0.5rem;
  z-index: 20;
  display: flex;
  flex-direction: column;
  padding: 0.375rem;
  border: 1px solid var(--ws-border-strong);
  border-radius: var(--ws-radius-sm);
  background: var(--ws-surface-2);
  box-shadow: var(--ws-shadow);
}

.cs__menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5625rem 0.625rem;
  border: 0;
  border-radius: 0.5rem;
  background: none;
  color: var(--ws-text-2);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}

.cs__menu-item:hover {
  background: var(--ws-accent);
  color: #fff;
}

.cs__menu-item.is-accent {
  color: var(--ws-accent-text);
}

.cs__menu-item.is-danger {
  color: var(--ws-danger);
}

.cs__menu-item.is-danger:hover {
  background: var(--ws-danger);
  color: #fff;
}

.cs__menu-sep {
  height: 1px;
  margin: 0.25rem 0.375rem;
  background: var(--ws-border);
}

.cs__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.75rem 0.5rem 1rem;
}

.cs__events {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--ws-border);
}

.cs__event {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem;
  border-radius: 0.625rem;
  background: var(--ws-surface-2);
  color: inherit;
  text-decoration: none;
}

.cs__event:hover {
  background: var(--ws-surface-3);
}

.cs__event-date {
  display: grid;
  flex: none;
  place-items: center;
  width: 2.5rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--c) 24%, transparent);
  color: color-mix(in srgb, var(--c) 70%, var(--ws-text));
  font-size: 0.75rem;
  font-weight: 800;
}

.cs__event-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.cs__event-text strong {
  overflow: hidden;
  font-size: 0.8125rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cs__event-text small {
  color: var(--ws-text-3);
  font-size: 0.75rem;
}

.cs__section + .cs__section {
  margin-top: 0.875rem;
}

.cs__cat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.25rem 0.25rem 0.125rem;
}

.cs__cat-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem;
  border: 0;
  background: none;
  color: var(--ws-text-3);
  font-size: 0.6875rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}

.cs__cat-btn:hover {
  color: var(--ws-text);
}

.cs__chev {
  transition: transform 0.15s ease;
}

.cs__chev.is-collapsed {
  transform: rotate(-90deg);
}

.cs__cat-add {
  display: grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: 0;
  border-radius: 0.375rem;
  background: none;
  color: var(--ws-text-3);
  cursor: pointer;
}

.cs__cat-add:hover {
  color: var(--ws-text);
}

.cs__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.cs__channel {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  height: 2.25rem;
  padding: 0 0.5rem;
  border: 0;
  border-radius: 0.5rem;
  background: none;
  color: var(--ws-text-3);
  font-size: 0.9375rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
}

.cs__channel:hover {
  background: var(--ws-surface-2);
  color: var(--ws-text-2);
}

.cs__channel.is-active {
  background: var(--ws-accent-soft);
  color: var(--ws-text);
}

.cs__channel.is-active .cs__channel-icon {
  color: var(--ws-accent-text);
}

.cs__channel.is-unread {
  color: var(--ws-text);
  font-weight: 700;
}

.cs__channel-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cs__lock {
  color: var(--ws-text-3);
}

.cs__count {
  min-width: 1.25rem;
  padding: 0.0625rem 0.375rem;
  border-radius: 999px;
  background: var(--ws-dnd);
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 800;
  text-align: center;
}

.cs__soon {
  flex: none;
  padding: 0.0625rem 0.4375rem;
  border-radius: 999px;
  background: var(--ws-accent-soft);
  color: var(--ws-accent-text);
  font-size: 0.625rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.cs__voice-users {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin: 0.125rem 0 0.375rem;
  padding: 0 0 0 1.75rem;
  list-style: none;
}

.cs__voice-users li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ws-text-2);
  font-size: 0.8125rem;
}

.cs__voice-muted {
  margin-left: auto;
  color: var(--ws-dnd);
}

.cs__voice {
  padding: 0.75rem;
  border-top: 1px solid var(--ws-border);
  background: var(--ws-sidebar);
}

.cs__voice-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  margin-bottom: 0.625rem;
}

.cs__voice-status {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--ws-online);
  font-size: 0.8125rem;
  font-weight: 700;
}

.cs__voice-where {
  overflow: hidden;
  color: var(--ws-text-3);
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cs__voice-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.375rem;
}

.cs__vbtn {
  display: grid;
  place-items: center;
  height: 2.25rem;
  padding: 0;
  border: 0;
  border-radius: 0.5rem;
  background: var(--ws-surface-2);
  color: var(--ws-text-2);
  cursor: pointer;
}

.cs__vbtn:hover {
  background: var(--ws-surface-3);
  color: var(--ws-text);
}

.cs__vbtn.is-on {
  background: color-mix(in srgb, var(--ws-dnd) 22%, transparent);
  color: var(--ws-dnd);
}

.cs__vbtn.is-share {
  background: color-mix(in srgb, var(--ws-online) 22%, transparent);
  color: var(--ws-online);
}

.cs__vbtn--leave {
  background: var(--ws-dnd);
  color: #fff;
}

.cs__vbtn--leave:hover {
  background: color-mix(in srgb, var(--ws-dnd) 85%, #000);
  color: #fff;
}

.pop-enter-active,
.pop-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
