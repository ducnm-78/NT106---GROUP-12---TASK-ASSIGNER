<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import { useClickOutside } from '../../composables/useClickOutside'
import { formatDayDivider, formatMessageTime } from '../format'
import { useGroups } from '../useGroups'
import type { Channel, Message } from '../types'
import MessageComposer from './MessageComposer.vue'
import MessageItem from './MessageItem.vue'

const props = defineProps<{ groupId: string; channel: Channel; membersOpen: boolean }>()
const emit = defineEmits<{
  toggleMembers: []
  openChannels: []
  thread: [message: Message]
  profile: [userId: string, el: HTMLElement]
}>()

const store = useGroups()
const scroller = ref<HTMLElement | null>(null)
const composer = ref<InstanceType<typeof MessageComposer> | null>(null)
const replyTo = ref<Message | null>(null)
const query = ref('')
const searchOpen = ref(false)
const pinsOpen = ref(false)
const pinsRoot = ref<HTMLElement | null>(null)
useClickOutside(pinsRoot, () => (pinsOpen.value = false))

/** Mốc "tin mới" lấy tại thời điểm mở kênh (trước khi đánh dấu đã đọc). */
const firstUnreadId = ref<string | null>(null)

const all = computed(() => store.channelMessages(props.channel.id))
const list = computed(() => {
  const q = query.value.trim().toLocaleLowerCase('vi')
  return q ? all.value.filter((m) => m.text.toLocaleLowerCase('vi').includes(q)) : all.value
})
const pins = computed(() => store.pinnedMessages(props.channel.id))

interface Row {
  message: Message
  compact: boolean
  divider: string | null
  unread: boolean
}

const rows = computed<Row[]>(() =>
  list.value.map((message, i) => {
    const prev = list.value[i - 1]
    const newDay = !prev || new Date(prev.at).toDateString() !== new Date(message.at).toDateString()
    const compact =
      !!prev &&
      !newDay &&
      !prev.system &&
      !message.system &&
      prev.authorId === message.authorId &&
      new Date(message.at).getTime() - new Date(prev.at).getTime() < 7 * 60_000 &&
      message.id !== firstUnreadId.value
    return { message, compact, divider: newDay ? formatDayDivider(message.at) : null, unread: message.id === firstUnreadId.value }
  }),
)

function scrollToBottom(smooth = false): void {
  nextTick(() => {
    const el = scroller.value
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  })
}

function openChannel(): void {
  const unread = store.unreadCount(props.channel.id)
  firstUnreadId.value = unread ? (all.value[all.value.length - unread]?.id ?? null) : null
  replyTo.value = null
  query.value = ''
  searchOpen.value = false
  store.markRead(props.channel.id)
  scrollToBottom()
}

onMounted(openChannel)
watch(() => props.channel.id, openChannel)

// Tin mới đến khi đang xem kênh: đánh dấu đã đọc, cuộn xuống nếu đang ở gần cuối
watch(
  () => all.value.length,
  (n, old) => {
    if (n <= old) return
    const el = scroller.value
    const nearBottom = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 240
    const last = all.value[n - 1]
    store.markRead(props.channel.id)
    if (nearBottom || last?.authorId === store.meId.value) scrollToBottom(true)
  },
)

function jumpTo(message: Message): void {
  pinsOpen.value = false
  query.value = ''
  nextTick(() => {
    const el = scroller.value?.querySelector<HTMLElement>(`[data-test="msg-${message.id}"]`)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    el?.classList.add('is-flash')
    setTimeout(() => el?.classList.remove('is-flash'), 1400)
  })
}

defineExpose({ insertMention: (name: string) => composer.value?.insertMention(name) })

const isAnnouncement = computed(() => props.channel.type === 'announcement')
</script>

<template>
  <section class="chat" :aria-label="`Kênh ${channel.name}`">
    <header class="chat__head">
      <button type="button" class="chat__menu ws-icon-btn" aria-label="Danh sách kênh" @click="emit('openChannels')">
        <AppIcon name="menu" :size="20" />
      </button>
      <AppIcon :name="isAnnouncement ? 'megaphone' : 'hash'" :size="22" class="chat__hash" />
      <h1 class="chat__title">{{ channel.name }}</h1>
      <AppIcon v-if="channel.private" name="lock" :size="15" class="chat__lock" />
      <p v-if="channel.topic" class="chat__topic" :title="channel.topic">{{ channel.topic }}</p>

      <div class="chat__actions">
        <span v-if="channel.aiAccess" class="chat__ai" title="Trợ lý AI có thể đọc và trả lời trong kênh này">
          <AppIcon name="sparkles" :size="14" /> AI
        </span>
        <div ref="pinsRoot" class="chat__pins-wrap">
          <button
            type="button"
            class="chat__btn"
            :class="{ 'is-on': pinsOpen }"
            :aria-expanded="pinsOpen"
            title="Tin nhắn đã ghim"
            data-test="pins-btn"
            @click="pinsOpen = !pinsOpen"
          >
            <AppIcon name="pin" :size="19" />
            <span v-if="pins.length" class="chat__btn-count">{{ pins.length }}</span>
            <span class="visually-hidden">Tin nhắn đã ghim</span>
          </button>
          <div v-if="pinsOpen" class="chat__pins" data-test="pins-panel">
            <h2>Tin nhắn đã ghim</h2>
            <p v-if="!pins.length" class="chat__pins-empty">Chưa có tin nhắn nào được ghim trong kênh này.</p>
            <button v-for="p in pins" :key="p.id" type="button" class="chat__pin" @click="jumpTo(p)">
              <strong>{{ store.displayName(groupId, p.authorId) }}</strong>
              <small>{{ formatMessageTime(p.at) }}</small>
              <span>{{ p.text }}</span>
            </button>
          </div>
        </div>
        <button
          type="button"
          class="chat__btn"
          :class="{ 'is-on': searchOpen }"
          title="Tìm trong kênh"
          :aria-expanded="searchOpen"
          @click="searchOpen = !searchOpen"
        >
          <AppIcon name="search" :size="19" />
          <span class="visually-hidden">Tìm trong kênh</span>
        </button>
        <button
          type="button"
          class="chat__btn chat__members-btn"
          :class="{ 'is-on': membersOpen }"
          :aria-pressed="membersOpen"
          title="Danh sách thành viên"
          data-test="members-toggle"
          @click="emit('toggleMembers')"
        >
          <AppIcon name="users" :size="19" />
          <span class="visually-hidden">Danh sách thành viên</span>
        </button>
      </div>
    </header>

    <div v-if="searchOpen" class="chat__search">
      <AppIcon name="search" :size="16" />
      <input v-model="query" type="search" placeholder="Tìm tin nhắn trong kênh…" aria-label="Tìm tin nhắn trong kênh" autofocus />
      <span v-if="query" class="chat__search-count">{{ list.length }} kết quả</span>
    </div>

    <div ref="scroller" class="chat__scroll ws-scroll" data-test="chat-scroll">
      <div class="chat__welcome">
        <span class="chat__welcome-icon"><AppIcon :name="isAnnouncement ? 'megaphone' : 'hash'" :size="30" /></span>
        <h2>Chào mừng đến với #{{ channel.name }}!</h2>
        <p>Đây là khởi đầu của kênh #{{ channel.name }}. {{ channel.topic }}</p>
      </div>

      <p v-if="query && !list.length" class="chat__empty">Không có tin nhắn nào khớp “{{ query }}”.</p>

      <template v-for="row in rows" :key="row.message.id">
        <div v-if="row.divider" class="chat__divider" role="separator">
          <span>{{ row.divider }}</span>
        </div>
        <div v-if="row.unread" class="chat__divider chat__divider--new" role="separator" data-test="new-divider">
          <span>Tin nhắn mới</span>
        </div>
        <MessageItem
          :message="row.message"
          :group-id="groupId"
          :compact="row.compact"
          @reply="replyTo = $event"
          @thread="emit('thread', $event)"
          @profile="(id, el) => emit('profile', id, el)"
        />
      </template>
      <div class="chat__end" />
    </div>

    <MessageComposer ref="composer" :group-id="groupId" :channel="channel" :reply-to="replyTo" @cancel-reply="replyTo = null" />
  </section>
</template>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
  background: var(--ws-bg);
}

.chat__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 3.5rem;
  padding: 0 0.75rem 0 1rem;
  border-bottom: 1px solid var(--ws-border);
  background: color-mix(in srgb, var(--ws-surface) 40%, var(--ws-bg));
}

.chat__menu {
  display: none;
  width: 2.25rem;
  height: 2.25rem;
}

.chat__hash {
  flex: none;
  color: var(--ws-text-3);
}

.chat__title {
  flex: none;
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 700;
}

.chat__lock {
  color: var(--ws-text-3);
}

.chat__topic {
  min-width: 0;
  margin: 0 0 0 0.5rem;
  padding-left: 0.75rem;
  overflow: hidden;
  border-left: 1px solid var(--ws-border-strong);
  color: var(--ws-text-3);
  font-size: 0.875rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat__actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;
}

.chat__ai {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-right: 0.375rem;
  padding: 0.1875rem 0.5rem;
  border-radius: 999px;
  background: var(--ws-accent-soft);
  color: var(--ws-accent-text);
  font-size: 0.6875rem;
  font-weight: 800;
}

.chat__btn {
  position: relative;
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border: 0;
  border-radius: 0.625rem;
  background: none;
  color: var(--ws-text-2);
  cursor: pointer;
}

.chat__btn:hover,
.chat__btn.is-on {
  background: var(--ws-surface-2);
  color: var(--ws-text);
}

.chat__btn-count {
  position: absolute;
  top: 0.125rem;
  right: 0.125rem;
  min-width: 0.875rem;
  height: 0.875rem;
  border-radius: 999px;
  background: var(--ws-idle);
  color: #2b1a04;
  font-size: 0.5625rem;
  font-weight: 800;
  line-height: 0.875rem;
  text-align: center;
}

.chat__pins-wrap {
  position: relative;
}

.chat__pins {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  z-index: 15;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  width: min(22rem, 80vw);
  max-height: 24rem;
  padding: 0.75rem;
  overflow-y: auto;
  border: 1px solid var(--ws-border-strong);
  border-radius: var(--ws-radius-sm);
  background: var(--ws-surface-2);
  box-shadow: var(--ws-shadow);
}

.chat__pins h2 {
  margin: 0 0 0.25rem;
  font-size: 0.9375rem;
}

.chat__pins-empty {
  margin: 0;
  color: var(--ws-text-3);
  font-size: 0.875rem;
}

.chat__pin {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.125rem 0.5rem;
  padding: 0.625rem;
  border: 1px solid var(--ws-border);
  border-radius: 0.625rem;
  background: var(--ws-surface);
  color: var(--ws-text);
  text-align: left;
  cursor: pointer;
}

.chat__pin:hover {
  border-color: var(--ws-accent);
}

.chat__pin strong {
  font-size: 0.8125rem;
}

.chat__pin small {
  align-self: center;
  color: var(--ws-text-3);
  font-size: 0.6875rem;
}

.chat__pin span {
  grid-column: 1 / -1;
  display: -webkit-box;
  overflow: hidden;
  color: var(--ws-text-2);
  font-size: 0.8125rem;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.chat__search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--ws-border);
  color: var(--ws-text-3);
}

.chat__search input {
  flex: 1;
  height: 2rem;
  border: 0;
  background: none;
  color: var(--ws-text);
  font: inherit;
  font-size: 0.875rem;
  outline: none;
}

.chat__search-count {
  font-size: 0.75rem;
}

.chat__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 1rem;
}

.chat__welcome {
  padding: 2rem 1.25rem 0.5rem;
}

.chat__welcome-icon {
  display: grid;
  place-items: center;
  width: 4rem;
  height: 4rem;
  margin-bottom: 0.75rem;
  border-radius: 50%;
  background: var(--ws-accent-soft);
  color: var(--ws-accent-text);
}

.chat__welcome h2 {
  margin: 0;
  font-size: 1.5rem;
}

.chat__welcome p {
  margin: 0.375rem 0 0;
  color: var(--ws-text-2);
  font-size: 0.9375rem;
}

.chat__empty {
  padding: 1rem 1.25rem;
  color: var(--ws-text-3);
}

.chat__divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.25rem 1.25rem 0.25rem;
  color: var(--ws-text-3);
  font-size: 0.75rem;
  font-weight: 700;
}

.chat__divider::before,
.chat__divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--ws-border-strong);
}

.chat__divider--new {
  color: var(--ws-dnd);
}

.chat__divider--new::before,
.chat__divider--new::after {
  background: var(--ws-dnd);
}

.chat__end {
  height: 0.5rem;
}

.chat :deep(.msg.is-flash) {
  animation: flash 1.4s ease;
}

@keyframes flash {
  0%,
  60% {
    background: color-mix(in srgb, var(--ws-idle) 22%, transparent);
  }
}

@container groupchat (max-width: 50rem) {
  .chat__menu {
    display: grid;
  }

  .chat__topic {
    display: none;
  }
}
</style>
