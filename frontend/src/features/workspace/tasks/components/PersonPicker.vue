<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import { useGroups } from '../../groups/useGroups'
import { meId } from '../taskStore'
import { normalize } from '../taskFormat'
import TaskAvatar from './TaskAvatar.vue'

/** Nội dung menu chọn người (đặt trong TaskMenu). */
const props = withDefaults(
  defineProps<{ people: string[]; selected?: string | null; noneLabel?: string | null; alwaysNone?: boolean }>(),
  { selected: undefined, noneLabel: 'Bỏ giao', alwaysNone: false },
)
const emit = defineEmits<{ pick: [id: string | null] }>()

const groups = useGroups()
const query = ref('')
const list = computed(() => {
  const q = normalize(query.value.trim())
  return props.people.filter((id) => !q || normalize(groups.person(id).name).includes(q))
})
</script>

<template>
  <input
    v-if="people.length > 6"
    v-model="query"
    class="ws-input tk-menu__search"
    placeholder="Tìm thành viên…"
    aria-label="Tìm thành viên"
    autofocus
    @keydown.enter.prevent="list[0] && emit('pick', list[0])"
  />
  <button
    v-for="id in list"
    :key="id"
    type="button"
    class="tk-menu__item"
    role="menuitemradio"
    :aria-checked="id === selected"
    :data-test="`person-option-${id}`"
    @click="emit('pick', id)"
  >
    <TaskAvatar :id="id" :size="26" />
    <span>{{ groups.person(id).name }}<small v-if="id === meId" class="pp-you"> (bạn)</small></span>
    <AppIcon v-if="id === selected" name="check" :size="16" class="tk-menu__check" />
  </button>
  <p v-if="!list.length" class="tk-menu__empty">Không tìm thấy thành viên.</p>
  <template v-if="noneLabel && (selected || alwaysNone)">
    <div class="tk-menu__sep" />
    <button type="button" class="tk-menu__item" role="menuitem" data-test="person-option-none" @click="emit('pick', null)">
      <TaskAvatar :id="null" :size="26" />
      {{ noneLabel }}
    </button>
  </template>
</template>

<style scoped>
.pp-you {
  color: var(--ws-text-3);
  font-size: 0.8125rem;
}
</style>
