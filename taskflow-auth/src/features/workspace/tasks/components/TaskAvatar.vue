<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import PersonAvatar from '../../groups/components/PersonAvatar.vue'
import { useGroups } from '../../groups/useGroups'

const props = withDefaults(defineProps<{ id: string | null | undefined; size?: number; ring?: string }>(), {
  size: 24,
  ring: 'var(--ws-surface)',
})
const groups = useGroups()
const person = computed(() => (props.id ? groups.person(props.id) : null))
</script>

<template>
  <PersonAvatar v-if="person" :person="person" :size="size" :ring="ring" :title="person.name" />
  <span v-else class="tk-unassigned" :style="{ '--s': `${size}px` }" title="Chưa giao">
    <AppIcon name="user" :size="Math.round(size * 0.55)" />
  </span>
</template>
