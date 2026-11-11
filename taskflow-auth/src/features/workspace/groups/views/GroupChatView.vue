<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import ConfirmModal from '../../components/ConfirmModal.vue'
import { loadJSON, saveJSON } from '../../composables/storage'
import { useToast } from '../../composables/useToast'
import ChannelSidebar from '../components/ChannelSidebar.vue'
import ChatPanel from '../components/ChatPanel.vue'
import CreateChannelModal from '../components/CreateChannelModal.vue'
import CreateGroupModal from '../components/CreateGroupModal.vue'
import GroupRail from '../components/GroupRail.vue'
import InviteModal from '../components/InviteModal.vue'
import MemberPopout from '../components/MemberPopout.vue'
import MembersPanel from '../components/MembersPanel.vue'
import ThreadPanel from '../components/ThreadPanel.vue'
import VoiceStage from '../components/VoiceStage.vue'
import { useGroups } from '../useGroups'
import type { Channel, Group, Message } from '../types'

const LAST_KEY = 'taskflow:groups:last'
const MEMBERS_KEY = 'taskflow:groups:members-open'

const route = useRoute()
const router = useRouter()
const store = useGroups()
const toast = useToast()

/** Kênh mở gần nhất của từng nhóm (để quay lại đúng chỗ). */
const lastChannel = ref<Record<string, string>>(loadJSON(LAST_KEY, {}))
const membersWide = ref<boolean>(loadJSON(MEMBERS_KEY, true))
/** Màn hẹp: danh sách thành viên nổi đè lên chat → mặc định đóng, chỉ mở khi bấm. */
const membersNarrow = ref(false)
const wrap = ref<HTMLElement | null>(null)
const narrow = ref(false)
let observer: ResizeObserver | null = null
onMounted(() => {
  observer = new ResizeObserver(([entry]) => (narrow.value = entry.contentRect.width <= 68 * 16))
  if (wrap.value) observer.observe(wrap.value)
})
onBeforeUnmount(() => observer?.disconnect())
const membersOpen = computed({
  get: () => (narrow.value ? membersNarrow.value : membersWide.value),
  set: (v: boolean) => {
    if (narrow.value) membersNarrow.value = v
    else membersWide.value = v
  },
})
const navOpen = ref(false)
const threadId = ref<string | null>(null)
const popout = ref<{ userId: string; anchor: HTMLElement } | null>(null)
const chat = ref<InstanceType<typeof ChatPanel> | null>(null)

const createOpen = ref(false)
const createTab = ref<'create' | 'join'>('create')
const channelModal = ref(false)
const channelCategory = ref<string | null>(null)
const inviteOpen = ref(false)
const leaveOpen = ref(false)

const group = computed<Group | undefined>(() => store.group(String(route.params.groupId ?? '')))
const channel = computed<Channel | undefined>(() =>
  group.value ? store.visibleChannels(group.value.id).find((c) => c.id === route.params.channelId) : undefined,
)
const thread = computed<Message | undefined>(() => (threadId.value ? store.findMessage(threadId.value) : undefined))

function defaultChannel(g: Group): Channel | undefined {
  const visible = store.visibleChannels(g.id).filter((c) => c.type !== 'voice')
  return visible.find((c) => c.id === lastChannel.value[g.id]) ?? visible.find((c) => c.name === 'chung') ?? visible[0]
}

function go(groupId: string, channelId?: string): void {
  const g = store.group(groupId)
  if (!g) return
  const target = channelId ?? defaultChannel(g)?.id
  router.push({ name: 'team-channel', params: { groupId, channelId: target } })
}

/** Chuẩn hoá URL: thiếu nhóm/kênh hoặc kênh không còn quyền xem → chuyển đến kênh hợp lệ. */
watch(
  () => [route.params.groupId, route.params.channelId, store.groups.value.length] as const,
  () => {
    if (route.meta.view !== 'group-chat') return
    const groups = store.groups.value
    if (!groups.length) return
    const g = group.value
    if (!g) {
      const fallback = groups.find((x) => x.id === lastChannel.value.__group) ?? groups[0]
      const c = defaultChannel(fallback)
      router.replace({ name: 'team-channel', params: { groupId: fallback.id, channelId: c?.id } })
      return
    }
    if (!channel.value) {
      const c = defaultChannel(g)
      if (c) router.replace({ name: 'team-channel', params: { groupId: g.id, channelId: c.id } })
      return
    }
    lastChannel.value = { ...lastChannel.value, [g.id]: channel.value.id, __group: g.id }
    saveJSON(LAST_KEY, lastChannel.value)
    navOpen.value = false
  },
  { immediate: true },
)

watch(
  () => route.params.channelId,
  () => {
    threadId.value = null
    popout.value = null
    membersNarrow.value = false
  },
)
watch(membersWide, (v) => saveJSON(MEMBERS_KEY, v))

function openProfile(userId: string, anchor: HTMLElement): void {
  popout.value = popout.value?.userId === userId && popout.value.anchor === anchor ? null : { userId, anchor }
}

function openCreate(tab: 'create' | 'join'): void {
  createTab.value = tab
  createOpen.value = true
}

function onCreated(g: Group): void {
  toast.show(`Đã vào nhóm “${g.name}”.`)
  go(g.id)
}

function onChannelCreated(c: Channel): void {
  toast.show(c.type === 'voice' ? `Đã tạo kênh thoại ${c.name}.` : `Đã tạo kênh #${c.name}.`)
  if (group.value) go(group.value.id, c.id)
}

function openChannelModal(categoryId: string | null): void {
  channelCategory.value = categoryId
  channelModal.value = true
}

function leave(): void {
  const g = group.value
  if (!g) return
  const r = store.leaveGroup(g.id)
  if (!r.ok) {
    toast.show(r.error, 'error')
    return
  }
  toast.show(`Bạn đã rời “${g.name}”.`)
  const next = store.groups.value[0]
  if (next) go(next.id)
  else router.push({ name: 'team' })
}

function mention(name: string): void {
  popout.value = null
  chat.value?.insertMention(name)
}
</script>

<template>
  <div ref="wrap" class="gc-wrap">
    <div v-if="!store.groups.value.length" class="gc-empty">
      <span class="gc-empty__icon"><AppIcon name="users" :size="36" /></span>
      <h1>Bạn chưa có nhóm nào</h1>
      <p>Tạo nhóm để trò chuyện, chia việc và họp cùng mọi người — hoặc tham gia bằng mã mời.</p>
      <div class="gc-empty__actions">
        <BaseButton class="ws-btn-auto" @click="openCreate('create')">Tạo nhóm</BaseButton>
        <BaseButton variant="secondary" class="ws-btn-auto" @click="openCreate('join')">Tham gia nhóm</BaseButton>
      </div>
    </div>

    <div v-else class="gc" :class="{ 'has-side': (membersOpen || thread) && channel?.type !== 'voice', 'is-thread': !!thread }">
      <div class="gc__nav" :class="{ 'is-open': navOpen }">
        <GroupRail :active-id="group?.id ?? null" @select="go" @create="openCreate('create')" @join="openCreate('join')" />
        <ChannelSidebar
          v-if="group"
          :group="group"
          :active-channel-id="channel?.id ?? null"
          @select="(id) => go(group!.id, id)"
          @create-channel="openChannelModal"
          @invite="inviteOpen = true"
          @settings="router.push({ name: 'team-settings', params: { groupId: group!.id } })"
          @leave="leaveOpen = true"
        />
      </div>
      <div v-if="navOpen" class="gc__scrim" @click="navOpen = false" />

      <div class="gc__main">
        <template v-if="group && channel">
          <VoiceStage v-if="channel.type === 'voice'" :group-id="group.id" :channel="channel" @open-channels="navOpen = true" />
          <ChatPanel
            v-else
            ref="chat"
            :group-id="group.id"
            :channel="channel"
            :members-open="membersOpen"
            @toggle-members="
              membersOpen = !membersOpen;
              threadId = null
            "
            @open-channels="navOpen = true"
            @thread="threadId = $event.id"
            @profile="openProfile"
          />
        </template>
      </div>

      <div v-if="group && channel && channel.type !== 'voice' && (thread || membersOpen)" class="gc__side">
        <ThreadPanel
          v-if="thread"
          :group-id="group.id"
          :channel="channel"
          :parent="thread"
          @close="threadId = null"
          @profile="openProfile"
        />
        <MembersPanel v-else :group="group" @profile="openProfile" />
      </div>
    </div>

    <MemberPopout
      v-if="popout && group"
      :group-id="group.id"
      :user-id="popout.userId"
      :anchor="popout.anchor"
      @close="popout = null"
      @mention="mention"
    />

    <CreateGroupModal v-model:open="createOpen" :initial-tab="createTab" @created="onCreated" />
    <template v-if="group">
      <CreateChannelModal v-model:open="channelModal" :group-id="group.id" :category-id="channelCategory" @created="onChannelCreated" />
      <InviteModal v-model:open="inviteOpen" :group-id="group.id" />
      <ConfirmModal
        v-model:open="leaveOpen"
        :title="`Rời “${group.name}”?`"
        description="Bạn sẽ không nhận được tin nhắn của nhóm nữa. Có thể tham gia lại bằng lời mời."
        confirm-label="Rời nhóm"
        danger
        @confirm="leave"
      />
    </template>
  </div>
</template>

<style scoped>
.gc-wrap {
  container: groupchat / inline-size;
  height: 100%;
  min-height: 0;
}

.gc {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.gc.has-side {
  grid-template-columns: auto minmax(0, 1fr) 15.5rem;
}

.gc.has-side.is-thread {
  grid-template-columns: auto minmax(0, 1fr) minmax(20rem, 24rem);
}

.gc__nav {
  display: grid;
  grid-template-columns: 4.5rem 15.5rem;
  min-height: 0;
}

.gc__main,
.gc__side {
  min-width: 0;
  min-height: 0;
}

.gc__scrim {
  display: none;
}

.gc-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  text-align: center;
}

.gc-empty__icon {
  display: grid;
  place-items: center;
  width: 5rem;
  height: 5rem;
  margin-bottom: 1rem;
  border-radius: 1.5rem;
  background: var(--ws-accent-soft);
  color: var(--ws-accent-text);
}

.gc-empty h1 {
  margin: 0;
  font-size: 1.5rem;
}

.gc-empty p {
  max-width: 28rem;
  margin: 0.5rem 0 1.5rem;
  color: var(--ws-text-2);
}

.gc-empty__actions {
  display: flex;
  gap: 0.75rem;
}

/* Hẹp: danh sách thành viên/luồng nổi lên trên khung chat */
@container groupchat (max-width: 68rem) {
  .gc.has-side,
  .gc.has-side.is-thread {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .gc__side {
    position: absolute;
    top: 3.5rem;
    right: 0;
    bottom: 0;
    z-index: 12;
    width: min(22rem, 90%);
    box-shadow: var(--ws-shadow);
  }

  .is-thread .gc__side {
    top: 0;
  }
}

/* Rất hẹp: thanh nhóm + kênh thành ngăn kéo */
@container groupchat (max-width: 50rem) {
  .gc,
  .gc.has-side,
  .gc.has-side.is-thread {
    grid-template-columns: minmax(0, 1fr);
  }

  .gc__nav {
    position: absolute;
    inset: 0 auto 0 0;
    z-index: 30;
    width: min(20rem, 92%);
    grid-template-columns: 4.5rem minmax(0, 1fr);
    background: var(--ws-sidebar);
    transform: translateX(-102%);
    transition: transform 0.22s ease;
  }

  .gc__nav.is-open {
    transform: none;
    box-shadow: var(--ws-shadow);
  }

  .gc__scrim {
    position: absolute;
    inset: 0;
    z-index: 25;
    display: block;
    background: var(--ws-overlay);
  }

  .gc__side {
    width: 100%;
  }
}
</style>
