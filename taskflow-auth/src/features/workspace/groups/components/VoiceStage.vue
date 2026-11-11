<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import { useToast } from '../../composables/useToast'
import { useGroups } from '../useGroups'
import { FEATURES } from '../features'
import type { Channel } from '../types'
import PersonAvatar from './PersonAvatar.vue'

const props = defineProps<{ groupId: string; channel: Channel }>()
const emit = defineEmits<{ openChannels: [] }>()

const store = useGroups()
const toast = useToast()
const connected = computed(() => store.voice.value?.channelId === props.channel.id)
const SOON_ITEMS = [
  { icon: 'mic', text: 'Họp nhanh bằng giọng nói, bật/tắt mic' },
  { icon: 'monitor', text: 'Chia sẻ màn hình khi thuyết trình' },
  { icon: 'headphones', text: 'Tắt âm thanh, xem ai đang nói' },
] as const
const people = computed(() => store.voiceParticipants(props.groupId, props.channel.id))

function join(): void {
  const r = store.joinVoice(props.groupId, props.channel.id)
  if (!r.ok) toast.show(r.error, 'error')
}
</script>

<template>
  <section class="stage" :aria-label="`Kênh thoại ${channel.name}`" data-test="voice-stage">
    <header class="stage__head">
      <button type="button" class="stage__menu ws-icon-btn" aria-label="Danh sách kênh" @click="emit('openChannels')">
        <AppIcon name="menu" :size="20" />
      </button>
      <AppIcon name="volume" :size="22" />
      <h1>{{ channel.name }}</h1>
      <span v-if="FEATURES.voice" class="stage__count">{{ people.length }} người</span>
    </header>

    <!-- Gọi thoại: tính năng mở rộng (xem groups/features.ts) -->
    <div v-if="!FEATURES.voice" class="soon" data-test="voice-coming-soon">
      <span class="soon__icon"><AppIcon name="volume" :size="34" /></span>
      <span class="soon__badge">Tính năng mở rộng</span>
      <h2 class="soon__title">Gọi thoại sắp ra mắt</h2>
      <p class="soon__desc">Kênh <strong>{{ channel.name }}</strong> đã sẵn sàng. Tính năng gọi thoại sẽ được bổ sung trong phiên bản sau.</p>
      <ul class="soon__list">
        <li v-for="it in SOON_ITEMS" :key="it.icon"><AppIcon :name="it.icon" :size="18" /> {{ it.text }}</li>
      </ul>
    </div>

    <div v-else class="stage__grid">
      <div v-for="id in people" :key="id" class="stage__tile" :class="{ 'is-me': id === store.meId.value }">
        <PersonAvatar :person="store.person(id)" :size="88" />
        <span class="stage__name">
          {{ store.displayName(groupId, id) }}
          <AppIcon v-if="id === store.meId.value && store.voice.value?.muted" name="mic-off" :size="15" />
        </span>
        <span v-if="id === store.meId.value && store.voice.value?.sharing" class="stage__live">ĐANG CHIA SẺ</span>
      </div>
      <p v-if="!people.length" class="stage__empty">Chưa có ai trong kênh. Hãy là người đầu tiên tham gia!</p>
    </div>

    <footer v-if="FEATURES.voice" class="stage__bar">
      <template v-if="connected && store.voice.value">
        <button
          type="button"
          class="stage__btn"
          :class="{ 'is-off': store.voice.value.muted }"
          :aria-pressed="store.voice.value.muted"
          @click="store.toggleVoice('muted')"
        >
          <AppIcon :name="store.voice.value.muted ? 'mic-off' : 'mic'" :size="20" />
          {{ store.voice.value.muted ? 'Bật mic' : 'Tắt mic' }}
        </button>
        <button
          type="button"
          class="stage__btn"
          :class="{ 'is-share': store.voice.value.sharing }"
          :aria-pressed="store.voice.value.sharing"
          @click="store.toggleVoice('sharing')"
        >
          <AppIcon name="monitor" :size="20" /> {{ store.voice.value.sharing ? 'Dừng chia sẻ' : 'Chia sẻ màn hình' }}
        </button>
        <button type="button" class="stage__btn stage__btn--leave" data-test="stage-leave" @click="store.leaveVoice()">
          <AppIcon name="phone-off" :size="20" /> Rời kênh
        </button>
      </template>
      <button v-else type="button" class="stage__btn stage__btn--join" data-test="stage-join" @click="join">
        <AppIcon name="volume" :size="20" /> Tham gia kênh thoại
      </button>
    </footer>
  </section>
</template>

<style scoped>
.stage {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--ws-accent) 14%, var(--ws-bg)), var(--ws-bg) 60%);
}

.stage__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 3.5rem;
  padding: 0 1rem;
  border-bottom: 1px solid var(--ws-border);
  color: var(--ws-text-3);
}

.stage__head h1 {
  margin: 0;
  color: var(--ws-text);
  font-size: 1.0625rem;
}

.stage__menu {
  display: none;
  width: 2.25rem;
  height: 2.25rem;
}

.stage__count {
  margin-left: auto;
  font-size: 0.8125rem;
}

.stage__grid {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 16rem));
  align-content: center;
  justify-content: center;
  gap: 1rem;
  padding: 1.5rem;
  overflow-y: auto;
}

.stage__tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  aspect-ratio: 16 / 11;
  border: 1px solid var(--ws-border);
  border-radius: 1rem;
  background: var(--ws-surface);
}

.stage__tile.is-me {
  border-color: var(--ws-online);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ws-online) 25%, transparent);
}

.stage__name {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.9375rem;
  font-weight: 600;
}

.stage__name :deep(svg) {
  color: var(--ws-dnd);
}

.stage__live {
  position: absolute;
  top: 0.625rem;
  left: 0.625rem;
  padding: 0.125rem 0.5rem;
  border-radius: 0.375rem;
  background: var(--ws-dnd);
  color: #fff;
  font-size: 0.625rem;
  font-weight: 800;
}

.stage__empty {
  grid-column: 1 / -1;
  color: var(--ws-text-2);
  text-align: center;
}

.stage__bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem;
}

.stage__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 2.75rem;
  padding: 0 1.125rem;
  border: 0;
  border-radius: 999px;
  background: var(--ws-surface-2);
  color: var(--ws-text);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.stage__btn:hover {
  background: var(--ws-surface-3);
}

.stage__btn.is-off {
  background: color-mix(in srgb, var(--ws-dnd) 22%, var(--ws-surface-2));
  color: var(--ws-dnd);
}

.stage__btn.is-share {
  background: color-mix(in srgb, var(--ws-online) 22%, var(--ws-surface-2));
  color: var(--ws-online);
}

.stage__btn--leave {
  background: var(--ws-dnd);
  color: #fff;
}

.stage__btn--leave:hover {
  background: color-mix(in srgb, var(--ws-dnd) 85%, #000);
}

.stage__btn--join {
  background: var(--ws-online);
  color: #06261a;
}

.stage__btn--join:hover {
  background: color-mix(in srgb, var(--ws-online) 88%, #fff);
}

.soon {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem 1.5rem;
  overflow-y: auto;
  text-align: center;
}

.soon__icon {
  display: grid;
  place-items: center;
  width: 5rem;
  height: 5rem;
  border-radius: 1.5rem;
  background: var(--ws-accent-grad);
  box-shadow: 0 12px 32px color-mix(in srgb, var(--ws-accent) 35%, transparent);
  color: #fff;
}

.soon__badge {
  margin-top: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  background: var(--ws-accent-soft);
  color: var(--ws-accent-text);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.soon__title {
  margin: 0;
  color: var(--ws-text);
  font-size: 1.5rem;
}

.soon__desc {
  max-width: 28rem;
  margin: 0;
  color: var(--ws-text-2);
  line-height: 1.55;
}

.soon__list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0.75rem 0 0;
  padding: 1rem 1.25rem;
  border: 1px solid var(--ws-border);
  border-radius: 1rem;
  background: var(--ws-surface);
  color: var(--ws-text-2);
  font-size: 0.9rem;
  text-align: left;
  list-style: none;
}

.soon__list li {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.soon__list :deep(svg) {
  color: var(--ws-accent-text);
}

@container groupchat (max-width: 50rem) {
  .stage__menu {
    display: grid;
  }
}
</style>
