<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import { useToast } from '../../composables/useToast'
import { PRIORITY_LABELS } from '../../data/constants'
import { formatBytes, formatClock, formatMessageTime, shortDay } from '../format'
import { useGroups } from '../useGroups'
import type { Message } from '../types'
import PersonAvatar from './PersonAvatar.vue'

const props = withDefaults(defineProps<{ message: Message; groupId: string; compact?: boolean; inThread?: boolean }>(), {
  compact: false,
  inThread: false,
})
const emit = defineEmits<{
  reply: [message: Message]
  thread: [message: Message]
  profile: [userId: string, el: HTMLElement]
}>()

const QUICK_EMOJI = ['👍', '❤️', '😂', '🎉', '🚀', '👀']

const store = useGroups()
const toast = useToast()
const pickerOpen = ref(false)

const author = computed(() => store.person(props.message.authorId))
const name = computed(() => store.displayName(props.groupId, props.message.authorId))
const color = computed(() => store.nameColor(props.groupId, props.message.authorId))
const parts = computed(() => store.splitMentions(props.groupId, props.message.text))
const replyTo = computed(() => (props.message.replyToId ? store.findMessage(props.message.replyToId) : null))
const replies = computed(() => (props.inThread ? [] : store.threadReplies(props.message.id)))
const mentioned = computed(() => store.mentionsMe(props.groupId, props.message))
const canModerate = computed(() => store.canModerateMessage(props.message))
const isMine = computed(() => props.message.authorId === store.meId.value)

function react(emoji: string): void {
  store.toggleReaction(props.message.id, emoji)
  pickerOpen.value = false
}

function pin(): void {
  const r = store.togglePin(props.message.id)
  if (r.ok) toast.show(r.value ? 'Đã ghim tin nhắn.' : 'Đã bỏ ghim tin nhắn.')
  else toast.show(r.error, 'error')
}

function remove(): void {
  const r = store.deleteMessage(props.message.id)
  if (!r.ok) toast.show(r.error, 'error')
}

function createTasks(): void {
  const r = store.createPlanTasks(props.message.id)
  if (r.ok) toast.show(`Đã tạo ${r.value} công việc trong mục Công việc.`)
  else toast.show(r.error, 'error')
}

function profile(event: MouseEvent): void {
  emit('profile', props.message.authorId, event.currentTarget as HTMLElement)
}
</script>

<template>
  <div v-if="message.system" class="msg msg--system" data-test="msg-system">
    <span class="msg__sys-icon"><AppIcon name="user-plus" :size="16" /></span>
    <p>
      {{ message.text }} <time :datetime="message.at">{{ formatMessageTime(message.at) }}</time>
    </p>
  </div>

  <article
    v-else
    class="msg"
    :class="{ 'msg--compact': compact && !replyTo, 'msg--mention': mentioned, 'msg--pinned': message.pinned }"
    :data-test="`msg-${message.id}`"
    @mouseleave="pickerOpen = false"
  >
    <div v-if="replyTo" class="msg__reply-ref">
      <span class="msg__reply-line" aria-hidden="true" />
      <PersonAvatar :person="store.person(replyTo.authorId)" :size="16" />
      <strong>{{ store.displayName(groupId, replyTo.authorId) }}</strong>
      <span class="msg__reply-text">{{ replyTo.text || 'Tệp đính kèm' }}</span>
    </div>

    <div class="msg__row">
      <div class="msg__gutter">
        <button v-if="!compact || replyTo" type="button" class="msg__avatar" :aria-label="`Xem hồ sơ ${name}`" @click="profile">
          <PersonAvatar :person="author" :size="40" />
        </button>
        <time v-else class="msg__hover-time" :datetime="message.at">{{ formatClock(message.at) }}</time>
      </div>

      <div class="msg__body">
        <header v-if="!compact || replyTo" class="msg__head">
          <button type="button" class="msg__author ws-role-name" :style="color ? { '--name': color } : undefined" @click="profile">{{ name }}</button>
          <span v-if="author.bot" class="msg__bot">AI</span>
          <time class="msg__time" :datetime="message.at">{{ formatMessageTime(message.at) }}</time>
          <AppIcon v-if="message.pinned" name="pin" :size="13" class="msg__pin" />
        </header>

        <p v-if="message.text" class="msg__text">
          <template v-for="(part, i) in parts" :key="i">
            <span v-if="part.mention" class="msg__mention" :class="{ 'is-me': part.me }">{{ part.text }}</span>
            <template v-else>{{ part.text }}</template>
          </template>
          <span v-if="message.edited" class="msg__edited">(đã sửa)</span>
        </p>

        <ul v-if="message.attachments.length" class="msg__files">
          <li v-for="file in message.attachments" :key="file.name" class="msg__file">
            <span class="msg__file-icon"><AppIcon :name="file.kind === 'image' ? 'camera' : 'paperclip'" :size="18" /></span>
            <span class="msg__file-text">
              <strong>{{ file.name }}</strong>
              <small>{{ formatBytes(file.size) }}</small>
            </span>
          </li>
        </ul>

        <!-- Thẻ đính kèm: công việc / kế hoạch AI / sự kiện -->
        <div v-if="message.embed?.type === 'task'" class="embed embed--task">
          <AppIcon name="check-square" :size="18" />
          <div>
            <strong>{{ message.embed.title }}</strong>
            <span>{{ message.embed.status }} · Hạn: {{ message.embed.due }}</span>
          </div>
        </div>

        <div v-else-if="message.embed?.type === 'plan'" class="embed embed--plan" data-test="plan-card">
          <div class="embed__title"><AppIcon name="sparkles" :size="16" /> {{ message.embed.title }}</div>
          <ol class="embed__steps">
            <li v-for="item in message.embed.items" :key="item.title">
              <span class="embed__step-title">{{ item.title }}</span>
              <span class="embed__meta">
                <span class="embed__prio" :class="`is-${item.priority}`">{{ PRIORITY_LABELS[item.priority] }}</span>
                {{ shortDay(item.due) }}
              </span>
            </li>
          </ol>
          <p v-if="message.embed.createdTaskCount" class="embed__done" data-test="plan-done">
            <AppIcon name="check" :size="15" /> Đã tạo {{ message.embed.createdTaskCount }} công việc
          </p>
          <button
            v-else-if="store.can(groupId, 'EDIT_TASKS')"
            type="button"
            class="embed__btn"
            data-test="plan-create"
            @click="createTasks"
          >
            <AppIcon name="plus" :size="16" /> Tạo {{ message.embed.items.length }} công việc
          </button>
        </div>

        <RouterLink
          v-else-if="message.embed?.type === 'event'"
          :to="{ name: 'calendar', query: { date: message.embed.date } }"
          class="embed embed--event"
          data-test="event-card"
        >
          <span class="embed__cal">
            <small>Th{{ Number(message.embed.date.slice(5, 7)) }}</small>
            {{ Number(message.embed.date.slice(8)) }}
          </span>
          <div>
            <strong>{{ message.embed.title }}</strong>
            <span>{{ message.embed.start }} – {{ message.embed.end }} · Mở trong Lịch</span>
          </div>
        </RouterLink>

        <div v-if="message.reactions.length" class="msg__reactions">
          <button
            v-for="r in message.reactions"
            :key="r.emoji"
            type="button"
            class="msg__reaction"
            :class="{ 'is-mine': r.userIds.includes(store.meId.value) }"
            :aria-pressed="r.userIds.includes(store.meId.value)"
            :title="r.userIds.map((id) => store.displayName(groupId, id)).join(', ')"
            @click="react(r.emoji)"
          >
            {{ r.emoji }} <span>{{ r.userIds.length }}</span>
          </button>
        </div>

        <button v-if="replies.length" type="button" class="msg__thread" data-test="thread-link" @click="emit('thread', message)">
          <span class="msg__thread-avatars">
            <PersonAvatar
              v-for="id in [...new Set(replies.map((r) => r.authorId))].slice(0, 3)"
              :key="id"
              :person="store.person(id)"
              :size="20"
              ring="var(--ws-bg)"
            />
          </span>
          {{ replies.length }} trả lời
          <small>Mới nhất {{ formatMessageTime(replies[replies.length - 1].at).toLowerCase() }}</small>
        </button>
      </div>
    </div>

    <!-- Thanh thao tác khi rê chuột -->
    <div class="msg__tools" role="toolbar" :aria-label="`Thao tác với tin nhắn của ${name}`">
      <button v-for="e in QUICK_EMOJI.slice(0, 3)" :key="e" type="button" class="msg__tool msg__tool--emoji" :title="`Thả ${e}`" @click="react(e)">
        {{ e }}
      </button>
      <div class="msg__picker-wrap">
        <button type="button" class="msg__tool" title="Thêm biểu cảm" :aria-expanded="pickerOpen" @click="pickerOpen = !pickerOpen">
          <AppIcon name="smile-plus" :size="17" />
        </button>
        <div v-if="pickerOpen" class="msg__picker">
          <button v-for="e in QUICK_EMOJI" :key="e" type="button" :aria-label="`Thả ${e}`" @click="react(e)">{{ e }}</button>
        </div>
      </div>
      <button type="button" class="msg__tool" title="Trả lời" data-test="tool-reply" @click="emit('reply', message)">
        <AppIcon name="reply" :size="17" />
      </button>
      <button v-if="!inThread" type="button" class="msg__tool" title="Tạo luồng" data-test="tool-thread" @click="emit('thread', message)">
        <AppIcon name="thread" :size="17" />
      </button>
      <button v-if="canModerate" type="button" class="msg__tool" :title="message.pinned ? 'Bỏ ghim' : 'Ghim'" data-test="tool-pin" @click="pin">
        <AppIcon name="pin" :size="17" />
      </button>
      <button
        v-if="canModerate"
        type="button"
        class="msg__tool msg__tool--danger"
        :title="isMine ? 'Xoá tin nhắn' : 'Xoá (quản lý kênh)'"
        data-test="tool-delete"
        @click="remove"
      >
        <AppIcon name="trash" :size="17" />
      </button>
    </div>
  </article>
</template>

<style scoped>
.msg {
  position: relative;
  padding: 0.375rem 1.25rem 0.375rem 1rem;
  border-left: 3px solid transparent;
}

.msg:not(.msg--compact) {
  margin-top: 0.75rem;
}

.msg:hover {
  background: color-mix(in srgb, var(--ws-surface-2) 55%, transparent);
}

.msg--mention {
  border-left-color: var(--ws-idle);
  background: color-mix(in srgb, var(--ws-idle) 9%, transparent);
}

.msg--mention:hover {
  background: color-mix(in srgb, var(--ws-idle) 14%, transparent);
}

.msg--system {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.75rem 0 0;
  color: var(--ws-text-3);
  font-size: 0.875rem;
}

.msg--system p {
  margin: 0;
}

.msg--system time {
  margin-left: 0.375rem;
  font-size: 0.75rem;
}

.msg__sys-icon {
  display: grid;
  place-items: center;
  width: 2.5rem;
  color: var(--ws-online);
}

.msg__row {
  display: flex;
  gap: 0.875rem;
}

.msg__gutter {
  flex: none;
  width: 2.5rem;
}

.msg__avatar {
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  cursor: pointer;
}

.msg__hover-time {
  display: block;
  padding-top: 0.25rem;
  color: var(--ws-text-3);
  font-size: 0.6875rem;
  text-align: right;
  opacity: 0;
}

.msg:hover .msg__hover-time {
  opacity: 1;
}

.msg__body {
  flex: 1;
  min-width: 0;
}

.msg__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 0.5rem;
}

.msg__author {
  padding: 0;
  border: 0;
  background: none;
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;
}

.msg__author:hover {
  text-decoration: underline;
}

.msg__bot {
  align-self: center;
  padding: 0.0625rem 0.375rem;
  border-radius: 0.3125rem;
  background: var(--ws-accent);
  color: #fff;
  font-size: 0.625rem;
  font-weight: 800;
}

.msg__time {
  color: var(--ws-text-3);
  font-size: 0.75rem;
}

.msg__pin {
  align-self: center;
  color: var(--ws-idle);
}

.msg__text {
  margin: 0.125rem 0 0;
  color: color-mix(in srgb, var(--ws-text) 88%, var(--ws-text-2));
  font-size: 0.9375rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.msg__mention {
  padding: 0 0.125rem;
  border-radius: 0.25rem;
  background: var(--ws-accent-soft);
  color: var(--ws-accent-text);
  font-weight: 600;
}

.msg__mention.is-me {
  background: color-mix(in srgb, var(--ws-idle) 22%, transparent);
  color: var(--ws-idle);
}

.msg__edited {
  margin-left: 0.25rem;
  color: var(--ws-text-3);
  font-size: 0.6875rem;
}

.msg__reply-ref {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0 0 0.25rem 1.25rem;
  color: var(--ws-text-3);
  font-size: 0.8125rem;
}

.msg__reply-line {
  width: 1.75rem;
  height: 0.625rem;
  margin-top: 0.5rem;
  border-top: 2px solid var(--ws-border-strong);
  border-left: 2px solid var(--ws-border-strong);
  border-top-left-radius: 0.375rem;
}

.msg__reply-ref strong {
  color: var(--ws-text-2);
}

.msg__reply-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.msg__files {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.5rem 0 0;
  padding: 0;
  list-style: none;
}

.msg__file {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 14rem;
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--ws-border);
  border-radius: 0.75rem;
  background: var(--ws-surface-2);
}

.msg__file-icon {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  background: var(--ws-accent-soft);
  color: var(--ws-accent-text);
}

.msg__file-text {
  display: flex;
  flex-direction: column;
}

.msg__file-text strong {
  color: var(--ws-info);
  font-size: 0.875rem;
}

.msg__file-text small {
  color: var(--ws-text-3);
  font-size: 0.75rem;
}

.embed {
  display: flex;
  gap: 0.75rem;
  max-width: 30rem;
  margin-top: 0.5rem;
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--ws-border);
  border-left: 4px solid var(--ws-info);
  border-radius: 0.625rem;
  background: var(--ws-surface-2);
  color: inherit;
  text-decoration: none;
}

.embed div {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.embed strong {
  font-size: 0.9375rem;
}

.embed span {
  color: var(--ws-text-2);
  font-size: 0.8125rem;
}

.embed--task {
  align-items: center;
  border-left-color: var(--ws-online);
  color: var(--ws-online);
}

.embed--task strong {
  color: var(--ws-text);
}

.embed--plan {
  flex-direction: column;
  border-left-color: var(--ws-accent);
  background: linear-gradient(160deg, color-mix(in srgb, var(--ws-accent) 12%, var(--ws-surface-2)), var(--ws-surface-2));
}

.embed__title {
  display: flex !important;
  flex-direction: row !important;
  align-items: center;
  gap: 0.375rem !important;
  color: var(--ws-accent-text);
  font-size: 0.875rem;
  font-weight: 700;
}

.embed__steps {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin: 0;
  padding-left: 1.25rem;
}

.embed__steps li {
  font-size: 0.875rem;
}

.embed__steps li > span {
  display: block;
}

.embed__step-title {
  color: var(--ws-text) !important;
  font-size: 0.875rem !important;
}

.embed__meta {
  display: flex !important;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem !important;
}

.embed__prio {
  padding: 0 0.375rem;
  border-radius: 999px;
  font-size: 0.6875rem !important;
  font-weight: 700;
}

.embed__prio.is-high {
  background: color-mix(in srgb, var(--ws-dnd) 20%, transparent);
  color: var(--ws-dnd) !important;
}

.embed__prio.is-medium {
  background: color-mix(in srgb, var(--ws-idle) 20%, transparent);
  color: var(--ws-idle) !important;
}

.embed__prio.is-low {
  background: color-mix(in srgb, var(--ws-online) 20%, transparent);
  color: var(--ws-online) !important;
}

.embed__btn {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 0.375rem;
  height: 2.125rem;
  margin-top: 0.25rem;
  padding: 0 0.875rem;
  border: 0;
  border-radius: 999px;
  background: var(--ws-accent-grad);
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
}

.embed__btn:hover {
  filter: brightness(1.1);
}

.embed__done {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0.25rem 0 0;
  color: var(--ws-online);
  font-size: 0.8125rem;
  font-weight: 700;
}

.embed--event {
  align-items: center;
  border-left-color: var(--ws-idle);
}

.embed--event:hover {
  background: var(--ws-surface-3);
}

.embed__cal {
  display: grid;
  flex: none;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border-radius: 0.625rem;
  background: color-mix(in srgb, var(--ws-idle) 18%, transparent);
  color: var(--ws-idle) !important;
  font-size: 1.125rem !important;
  font-weight: 800;
  line-height: 1;
}

.embed__cal small {
  font-size: 0.625rem;
  text-transform: uppercase;
}

.msg__reactions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.375rem;
}

.msg__reaction {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  height: 1.75rem;
  padding: 0 0.5rem;
  border: 1px solid transparent;
  border-radius: 0.5rem;
  background: var(--ws-surface-2);
  color: var(--ws-text-2);
  font-size: 0.875rem;
  cursor: pointer;
}

.msg__reaction span {
  font-size: 0.75rem;
  font-weight: 700;
}

.msg__reaction:hover {
  border-color: var(--ws-border-strong);
}

.msg__reaction.is-mine {
  border-color: var(--ws-accent);
  background: var(--ws-accent-soft);
  color: var(--ws-accent-text);
}

.msg__thread {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.375rem;
  padding: 0.25rem 0.625rem 0.25rem 0.375rem;
  border: 1px solid var(--ws-border);
  border-radius: 0.625rem;
  background: var(--ws-surface);
  color: var(--ws-accent-text);
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
}

.msg__thread:hover {
  border-color: var(--ws-accent);
}

.msg__thread small {
  color: var(--ws-text-3);
  font-weight: 400;
}

.msg__thread-avatars {
  display: flex;
}

.msg__thread-avatars > * + * {
  margin-left: -6px;
}

.msg__tools {
  position: absolute;
  top: -1rem;
  right: 1.25rem;
  z-index: 2;
  display: none;
  align-items: center;
  padding: 0.125rem;
  border: 1px solid var(--ws-border-strong);
  border-radius: 0.625rem;
  background: var(--ws-surface-2);
  box-shadow: 0 6px 18px -8px rgb(0 0 0 / 0.5);
}

.msg:hover .msg__tools,
.msg:focus-within .msg__tools {
  display: flex;
}

.msg__tool {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 0;
  border-radius: 0.5rem;
  background: none;
  color: var(--ws-text-2);
  font-size: 1rem;
  cursor: pointer;
}

.msg__tool:hover {
  background: var(--ws-surface-3);
  color: var(--ws-text);
}

.msg__tool--danger:hover {
  color: var(--ws-danger);
}

.msg__picker-wrap {
  position: relative;
}

.msg__picker {
  position: absolute;
  top: calc(100% + 0.375rem);
  right: 0;
  display: grid;
  grid-template-columns: repeat(6, 2rem);
  gap: 0.125rem;
  padding: 0.375rem;
  border: 1px solid var(--ws-border-strong);
  border-radius: 0.625rem;
  background: var(--ws-surface-2);
  box-shadow: var(--ws-shadow);
}

.msg__picker button {
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 0;
  border-radius: 0.375rem;
  background: none;
  font-size: 1.125rem;
  cursor: pointer;
}

.msg__picker button:hover {
  background: var(--ws-surface-3);
}
</style>
