<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import { useGroups } from '../useGroups'
import type { Channel, Message } from '../types'
import MessageComposer from './MessageComposer.vue'
import MessageItem from './MessageItem.vue'

const props = defineProps<{ groupId: string; channel: Channel; parent: Message }>()
const emit = defineEmits<{ close: []; profile: [userId: string, el: HTMLElement] }>()

const store = useGroups()
const scroller = ref<HTMLElement | null>(null)
const replyTo = ref<Message | null>(null)
const replies = computed(() => store.threadReplies(props.parent.id))

watch(
  () => replies.value.length,
  () => nextTick(() => scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: 'smooth' })),
)
</script>

<template>
  <aside class="thread" aria-label="Luồng trả lời" data-test="thread-panel">
    <header class="thread__head">
      <AppIcon name="thread" :size="20" />
      <div class="thread__title">
        <h2>Luồng</h2>
        <small>#{{ channel.name }}</small>
      </div>
      <button type="button" class="ws-icon-btn thread__close" aria-label="Đóng luồng" data-test="thread-close" @click="emit('close')">
        <AppIcon name="x" :size="18" />
      </button>
    </header>
    <div ref="scroller" class="thread__scroll ws-scroll">
      <MessageItem :message="parent" :group-id="groupId" in-thread @profile="(id, el) => emit('profile', id, el)" />
      <div class="thread__count">{{ replies.length }} trả lời</div>
      <MessageItem
        v-for="(m, i) in replies"
        :key="m.id"
        :message="m"
        :group-id="groupId"
        :compact="i > 0 && replies[i - 1].authorId === m.authorId"
        in-thread
        @reply="replyTo = $event"
        @profile="(id, el) => emit('profile', id, el)"
      />
    </div>
    <MessageComposer :group-id="groupId" :channel="channel" :thread-parent-id="parent.id" :reply-to="replyTo" compact @cancel-reply="replyTo = null" />
  </aside>
</template>

<style scoped>
.thread {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  border-left: 1px solid var(--ws-border);
  background: color-mix(in srgb, var(--ws-surface) 50%, var(--ws-bg));
}

.thread__head {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  height: 3.5rem;
  padding: 0 0.75rem 0 1rem;
  border-bottom: 1px solid var(--ws-border);
  color: var(--ws-text-2);
}

.thread__title {
  display: flex;
  flex: 1;
  align-items: baseline;
  gap: 0.5rem;
}

.thread__title h2 {
  margin: 0;
  color: var(--ws-text);
  font-size: 1rem;
}

.thread__title small {
  color: var(--ws-text-3);
}

.thread__close {
  width: 2.25rem;
  height: 2.25rem;
  border-color: transparent;
  background: transparent;
}

.thread__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 1rem;
}

.thread__count {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.75rem 1rem 0;
  color: var(--ws-text-3);
  font-size: 0.75rem;
  font-weight: 700;
}

.thread__count::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--ws-border-strong);
}
</style>
