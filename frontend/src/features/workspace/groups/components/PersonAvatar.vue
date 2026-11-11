<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import type { Person } from '../types'

const props = withDefaults(defineProps<{ person: Person; size?: number; status?: boolean; ring?: string }>(), {
  size: 40,
  status: false,
  ring: 'var(--ws-surface)',
})

const initials = computed(() => {
  const words = props.person.name.trim().split(/\s+/)
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase()
})

const STATUS_LABEL = { online: 'Trực tuyến', idle: 'Vắng mặt', dnd: 'Không làm phiền', offline: 'Ngoại tuyến' }
</script>

<template>
  <span class="pa" :style="{ '--s': `${size}px`, '--c': person.color, '--ring': ring }">
    <span class="pa__img" :class="{ 'pa__img--bot': person.bot }">
      <img v-if="person.avatar" :src="person.avatar" alt="" />
      <AppIcon v-else-if="person.bot" name="sparkles" :size="Math.round(size * 0.5)" />
      <template v-else>{{ initials }}</template>
    </span>
    <span
      v-if="status"
      class="pa__status"
      :class="`pa__status--${person.status}`"
      :title="STATUS_LABEL[person.status]"
    >
      <span class="visually-hidden">{{ STATUS_LABEL[person.status] }}</span>
    </span>
  </span>
</template>

<style scoped>
.pa {
  position: relative;
  display: inline-block;
  flex: none;
  width: var(--s);
  height: var(--s);
}

.pa__img {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 50%;
  background: linear-gradient(140deg, color-mix(in srgb, var(--c) 78%, #fff), var(--c));
  color: #fff;
  font-size: calc(var(--s) * 0.36);
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.02em;
}

.pa__img--bot {
  background: linear-gradient(140deg, #8b7cff, #5f4eed);
}

.pa__img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pa__status {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: max(10px, calc(var(--s) * 0.32));
  height: max(10px, calc(var(--s) * 0.32));
  border: max(2px, calc(var(--s) * 0.07)) solid var(--ring);
  border-radius: 50%;
}

.pa__status--online {
  background: var(--ws-online);
}

.pa__status--idle {
  background: var(--ws-idle);
}

.pa__status--dnd {
  background: var(--ws-dnd);
}

.pa__status--offline {
  background: var(--ws-offline);
}
</style>
