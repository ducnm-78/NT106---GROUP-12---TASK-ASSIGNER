<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import type { Group } from '../types'

const props = withDefaults(defineProps<{ group: Pick<Group, 'name' | 'color' | 'icon'>; size?: number }>(), { size: 48 })

const initials = computed(() =>
  props.group.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase(),
)
</script>

<template>
  <span class="gi" :style="{ '--s': `${size}px`, '--c': group.color }">
    <AppIcon v-if="group.icon" :name="group.icon" :size="Math.round(size * 0.46)" :stroke-width="2" />
    <template v-else>{{ initials }}</template>
  </span>
</template>

<style scoped>
.gi {
  display: grid;
  flex: none;
  place-items: center;
  width: var(--s);
  height: var(--s);
  border-radius: calc(var(--s) * 0.32);
  background: linear-gradient(140deg, color-mix(in srgb, var(--c) 72%, #fff), var(--c));
  color: #fff;
  font-size: calc(var(--s) * 0.34);
  font-weight: 800;
  letter-spacing: 0.02em;
  text-shadow: 0 1px 2px rgb(0 0 0 / 0.2);
}
</style>
