<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import { useToast } from '../../composables/useToast'
import { formatBytes } from '../format'
import { useGroups } from '../useGroups'
import type { Attachment, Channel, Message } from '../types'
import PersonAvatar from './PersonAvatar.vue'

const props = withDefaults(
  defineProps<{ groupId: string; channel: Channel; replyTo?: Message | null; threadParentId?: string | null; compact?: boolean }>(),
  { replyTo: null, threadParentId: null, compact: false },
)
const emit = defineEmits<{ cancelReply: []; sent: [message: Message] }>()

const store = useGroups()
const toast = useToast()

/** Bản nháp theo từng kênh/luồng: chuyển kênh không làm mất hay lẫn nội dung đang gõ. */
const drafts = new Map<string, string>()
const draftKey = () => `${props.channel.id}:${props.threadParentId ?? ''}`

const text = ref('')
const files = ref<Attachment[]>([])
const input = ref<HTMLTextAreaElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const emojiOpen = ref(false)

/* ----- Quyền gửi ----- */
const permission = computed(() => store.canPost(props.groupId, props.channel.id))
const placeholder = computed(() => {
  if (!permission.value.ok) return permission.value.error
  if (props.threadParentId) return 'Trả lời trong luồng…'
  return `Nhắn tin tới #${props.channel.name}`
})

/* ----- Gợi ý @mention ----- */
const mentionQuery = ref<string | null>(null)
const mentionIndex = ref(0)

interface Suggestion {
  key: string
  label: string
  insert: string
  hint: string
  personId?: string
  color?: string
}

const suggestions = computed<Suggestion[]>(() => {
  if (mentionQuery.value === null) return []
  const g = store.group(props.groupId)
  if (!g) return []
  const q = mentionQuery.value.toLocaleLowerCase('vi')
  const list: Suggestion[] = g.members.map((m) => {
    const name = store.displayName(g.id, m.userId)
    return { key: m.userId, label: name, insert: name, hint: `@${store.person(m.userId).username}`, personId: m.userId }
  })
  for (const r of g.roles) {
    if (!r.isDefault && r.mentionable) list.push({ key: r.id, label: r.name, insert: r.name, hint: 'Vai trò', color: r.color })
  }
  if (store.can(g.id, 'MENTION_EVERYONE')) list.push({ key: 'everyone', label: 'everyone', insert: 'everyone', hint: 'Thông báo cho tất cả' })
  return list.filter((s) => s.label.toLocaleLowerCase('vi').includes(q)).slice(0, 8)
})

function updateMention(): void {
  const el = input.value
  if (!el) return
  const before = text.value.slice(0, el.selectionStart ?? text.value.length)
  const match = before.match(/(?:^|\s)@([\p{L}\p{N} ]{0,20})$/u)
  // Không gợi ý nếu đã gõ quá 2 từ sau @
  mentionQuery.value = match && match[1].split(' ').length <= 3 ? match[1] : null
  mentionIndex.value = 0
}

function pickMention(s: Suggestion): void {
  const el = input.value
  if (!el) return
  const caret = el.selectionStart ?? text.value.length
  const before = text.value.slice(0, caret).replace(/@([\p{L}\p{N} ]{0,20})$/u, `@${s.insert} `)
  text.value = before + text.value.slice(caret)
  mentionQuery.value = null
  nextTick(() => {
    el.focus()
    el.setSelectionRange(before.length, before.length)
    autoGrow()
  })
}

/* ----- Gửi ----- */
function send(): void {
  if (!permission.value.ok) return
  const result = store.sendMessage(props.groupId, props.channel.id, text.value, {
    replyToId: props.replyTo?.id ?? null,
    threadParentId: props.threadParentId,
    attachments: files.value,
  })
  if (!result.ok) {
    toast.show(result.error, 'error')
    return
  }
  text.value = ''
  files.value = []
  emit('sent', result.value)
  emit('cancelReply')
  nextTick(autoGrow)
}

function onKeydown(event: KeyboardEvent): void {
  if (suggestions.value.length) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const n = suggestions.value.length
      mentionIndex.value = (mentionIndex.value + (event.key === 'ArrowDown' ? 1 : n - 1)) % n
      return
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      pickMention(suggestions.value[mentionIndex.value])
      return
    }
    if (event.key === 'Escape') {
      mentionQuery.value = null
      return
    }
  }
  if (event.key === 'Escape' && props.replyTo) emit('cancelReply')
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    send()
  }
}

function autoGrow(): void {
  const el = input.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`
}

function onInput(): void {
  autoGrow()
  updateMention()
}

function onFiles(event: Event): void {
  const list = Array.from((event.target as HTMLInputElement).files ?? [])
  for (const f of list) {
    if (f.size > 25 * 1024 * 1024) {
      toast.show(`“${f.name}” vượt quá 25 MB.`, 'error')
      continue
    }
    files.value.push({ name: f.name, size: f.size, kind: f.type.startsWith('image/') ? 'image' : 'file' })
  }
  ;(event.target as HTMLInputElement).value = ''
}

function addEmoji(e: string): void {
  text.value += e
  emojiOpen.value = false
  input.value?.focus()
}

/* ----- Đang nhập ----- */
const typingText = computed(() => {
  const ids = store.typing.value[props.channel.id] ?? []
  if (!ids.length) return ''
  const names = ids.map((id) => store.displayName(props.groupId, id))
  return names.length === 1 ? `${names[0]} đang trả lời…` : `${names.join(', ')} đang nhập…`
})

watch(draftKey, (key, oldKey) => {
  if (oldKey) drafts.set(oldKey, text.value)
  text.value = drafts.get(key) ?? ''
  files.value = []
  mentionQuery.value = null
  nextTick(autoGrow)
})

watch(
  () => props.replyTo,
  (r) => r && input.value?.focus(),
)

function insertMention(name: string): void {
  const sep = text.value && !text.value.endsWith(' ') ? ' ' : ''
  text.value += `${sep}@${name} `
  nextTick(() => {
    input.value?.focus()
    autoGrow()
  })
}

defineExpose({ focus: () => input.value?.focus(), insertMention })
</script>

<template>
  <div class="composer" :class="{ 'composer--compact': compact }">
    <div v-if="replyTo" class="composer__reply" data-test="reply-bar">
      <span>
        Đang trả lời <strong>{{ store.displayName(groupId, replyTo.authorId) }}</strong>
      </span>
      <button type="button" class="composer__x" aria-label="Huỷ trả lời" @click="emit('cancelReply')">
        <AppIcon name="x" :size="16" />
      </button>
    </div>

    <ul v-if="files.length" class="composer__files">
      <li v-for="(f, i) in files" :key="f.name + i" class="composer__file">
        <AppIcon :name="f.kind === 'image' ? 'camera' : 'paperclip'" :size="16" />
        <span class="composer__file-name">{{ f.name }}</span>
        <small>{{ formatBytes(f.size) }}</small>
        <button type="button" class="composer__x" :aria-label="`Bỏ ${f.name}`" @click="files.splice(i, 1)">
          <AppIcon name="x" :size="14" />
        </button>
      </li>
    </ul>

    <div class="composer__box" :class="{ 'is-disabled': !permission.ok, 'has-top': replyTo || files.length }">
      <button
        type="button"
        class="composer__btn"
        title="Đính kèm tệp"
        :disabled="!permission.ok || !store.can(groupId, 'ATTACH_FILES')"
        @click="fileInput?.click()"
      >
        <AppIcon name="plus" :size="20" />
        <span class="visually-hidden">Đính kèm tệp</span>
      </button>
      <input ref="fileInput" type="file" multiple hidden data-test="file-input" @change="onFiles" />

      <label class="visually-hidden" :for="`composer-${channel.id}-${threadParentId ?? 'main'}`">Nội dung tin nhắn</label>
      <textarea
        :id="`composer-${channel.id}-${threadParentId ?? 'main'}`"
        ref="input"
        v-model="text"
        rows="1"
        class="composer__input"
        :placeholder="placeholder"
        :disabled="!permission.ok"
        :aria-autocomplete="'list'"
        :aria-expanded="suggestions.length > 0"
        data-test="composer-input"
        @input="onInput"
        @click="updateMention"
        @keydown="onKeydown"
      />

      <div class="composer__emoji-wrap">
        <button
          type="button"
          class="composer__btn"
          title="Biểu cảm"
          :disabled="!permission.ok"
          :aria-expanded="emojiOpen"
          @click="emojiOpen = !emojiOpen"
        >
          <AppIcon name="smile" :size="20" />
          <span class="visually-hidden">Chèn biểu cảm</span>
        </button>
        <div v-if="emojiOpen" class="composer__emoji">
          <button v-for="e in ['😀', '😂', '😍', '👍', '🙏', '🎉', '🚀', '🔥', '✅', '👀', '💡', '❤️']" :key="e" type="button" @click="addEmoji(e)">
            {{ e }}
          </button>
        </div>
      </div>
      <button
        type="button"
        class="composer__send"
        :disabled="!permission.ok || (!text.trim() && !files.length)"
        title="Gửi (Enter)"
        data-test="composer-send"
        @click="send"
      >
        <AppIcon name="send" :size="18" />
        <span class="visually-hidden">Gửi</span>
      </button>

      <ul v-if="suggestions.length" class="composer__suggest" role="listbox" data-test="mention-list">
        <li class="composer__suggest-title">Thành viên & vai trò khớp “@{{ mentionQuery }}”</li>
        <li
          v-for="(s, i) in suggestions"
          :key="s.key"
          role="option"
          :aria-selected="i === mentionIndex"
          class="composer__suggest-item"
          :class="{ 'is-active': i === mentionIndex }"
          @mousedown.prevent="pickMention(s)"
          @mouseenter="mentionIndex = i"
        >
          <PersonAvatar v-if="s.personId" :person="store.person(s.personId)" :size="24" />
          <span v-else class="composer__role-dot" :style="{ background: s.color ?? 'var(--ws-accent)' }">@</span>
          <span class="composer__suggest-label">{{ s.label }}</span>
          <small>{{ s.hint }}</small>
        </li>
      </ul>
    </div>
    <p class="composer__typing" aria-live="polite">
      <template v-if="typingText">
        <span class="composer__dots" aria-hidden="true"><i /><i /><i /></span>{{ typingText }}
      </template>
    </p>
  </div>
</template>

<style scoped>
.composer {
  padding: 0 1rem 0.25rem;
}

.composer__reply {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem 0.75rem 0 0;
  background: var(--ws-surface-3);
  color: var(--ws-text-2);
  font-size: 0.8125rem;
}

.composer__reply strong {
  color: var(--ws-text);
}

.composer__x {
  display: grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--ws-text-3);
  cursor: pointer;
}

.composer__x:hover {
  background: var(--ws-surface-2);
  color: var(--ws-text);
}

.composer__files {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0.625rem;
  border-radius: 0.75rem 0.75rem 0 0;
  background: var(--ws-surface-2);
  list-style: none;
}

.composer__reply + .composer__files {
  border-radius: 0;
}

.composer__file {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  max-width: 16rem;
  padding: 0.375rem 0.25rem 0.375rem 0.625rem;
  border-radius: 0.5rem;
  background: var(--ws-surface-3);
  color: var(--ws-text-2);
  font-size: 0.8125rem;
}

.composer__file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.composer__file small {
  flex: none;
  color: var(--ws-text-3);
}

.composer__box {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 0.25rem;
  padding: 0.375rem;
  border: 1px solid var(--ws-border-strong);
  border-radius: 0.875rem;
  background: var(--ws-surface-2);
  transition: border-color 0.15s ease;
}

.composer__box:focus-within {
  border-color: var(--ws-accent);
}

.composer__box.has-top {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

.composer__box.is-disabled {
  opacity: 0.7;
}

.composer__btn {
  display: grid;
  flex: none;
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

.composer__btn:hover:not(:disabled) {
  background: var(--ws-surface-3);
  color: var(--ws-text);
}

.composer__btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.composer__input {
  flex: 1;
  min-height: 2.25rem;
  max-height: 12.5rem;
  padding: 0.5rem 0.25rem;
  border: 0;
  background: transparent;
  color: var(--ws-text);
  font: inherit;
  font-size: 0.9375rem;
  line-height: 1.35;
  resize: none;
  outline: none;
}

.composer__input::placeholder {
  color: var(--ws-text-3);
}

.composer__input:focus-visible {
  outline: none;
}

.composer__send {
  display: grid;
  flex: none;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border: 0;
  border-radius: 0.625rem;
  background: var(--ws-accent-grad);
  color: #fff;
  cursor: pointer;
}

.composer__send:disabled {
  background: var(--ws-surface-3);
  color: var(--ws-text-3);
  cursor: not-allowed;
}

.composer__emoji-wrap {
  position: relative;
}

.composer__emoji {
  position: absolute;
  right: 0;
  bottom: calc(100% + 0.5rem);
  z-index: 5;
  display: grid;
  grid-template-columns: repeat(6, 2.125rem);
  gap: 0.125rem;
  padding: 0.5rem;
  border: 1px solid var(--ws-border-strong);
  border-radius: 0.75rem;
  background: var(--ws-surface-2);
  box-shadow: var(--ws-shadow);
}

.composer__emoji button {
  height: 2.125rem;
  padding: 0;
  border: 0;
  border-radius: 0.375rem;
  background: none;
  font-size: 1.25rem;
  cursor: pointer;
}

.composer__emoji button:hover {
  background: var(--ws-surface-3);
}

.composer__suggest {
  position: absolute;
  right: 0;
  bottom: calc(100% + 0.5rem);
  left: 0;
  z-index: 5;
  margin: 0;
  padding: 0.375rem;
  border: 1px solid var(--ws-border-strong);
  border-radius: 0.75rem;
  background: var(--ws-surface-2);
  box-shadow: var(--ws-shadow);
  list-style: none;
}

.composer__suggest-title {
  padding: 0.375rem 0.5rem;
  color: var(--ws-text-3);
  font-size: 0.6875rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.composer__suggest-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.375rem 0.5rem;
  border-radius: 0.5rem;
  cursor: pointer;
}

.composer__suggest-item.is-active {
  background: var(--ws-accent-soft);
}

.composer__suggest-label {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 600;
}

.composer__suggest-item small {
  color: var(--ws-text-3);
  font-size: 0.75rem;
}

.composer__role-dot {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: #10172a;
  font-size: 0.75rem;
  font-weight: 800;
}

.composer__typing {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  height: 1.375rem;
  margin: 0;
  padding: 0 0.25rem;
  color: var(--ws-text-2);
  font-size: 0.75rem;
}

.composer__dots {
  display: inline-flex;
  gap: 3px;
}

.composer__dots i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--ws-text-2);
  animation: blink 1.2s infinite ease-in-out;
}

.composer__dots i:nth-child(2) {
  animation-delay: 0.15s;
}

.composer__dots i:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes blink {
  0%,
  80%,
  100% {
    opacity: 0.25;
  }

  40% {
    opacity: 1;
  }
}
</style>
