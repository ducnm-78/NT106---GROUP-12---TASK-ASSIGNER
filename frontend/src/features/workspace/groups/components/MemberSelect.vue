<script setup lang="ts">
import { normalizeText as normalize } from '@/shared/utils/text'
import { computed, ref } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import { PEOPLE } from '../data'
import PersonAvatar from './PersonAvatar.vue'

const selected = defineModel<string[]>({ required: true })
const props = withDefaults(defineProps<{ exclude?: string[]; label?: string }>(), { exclude: () => [], label: 'Thành viên' })

const query = ref('')

const options = computed(() => {
  const q = normalize(query.value.trim())
  return PEOPLE.filter((p) => !p.bot && !props.exclude.includes(p.id)).filter(
    (p) => !q || normalize(p.name).includes(q) || p.username.includes(q),
  )
})

function toggle(id: string): void {
  selected.value = selected.value.includes(id) ? selected.value.filter((x) => x !== id) : [...selected.value, id]
}

const person = (id: string) => PEOPLE.find((p) => p.id === id)!
</script>

<template>
  <div class="ms">
    <div class="ms__head">
      <span class="ws-label">{{ label }}</span>
      <span class="ms__count">Đã chọn {{ selected.length }}</span>
    </div>
    <ul v-if="selected.length" class="ms__chips">
      <li v-for="id in selected" :key="id" class="ms__chip">
        <PersonAvatar :person="person(id)" :size="20" />
        {{ person(id).name }}
        <button type="button" :aria-label="`Bỏ chọn ${person(id).name}`" @click="toggle(id)">
          <AppIcon name="x" :size="12" :stroke-width="2.6" />
        </button>
      </li>
    </ul>
    <div class="ms__search">
      <AppIcon name="search" :size="16" />
      <input v-model="query" type="search" placeholder="Tìm theo tên hoặc tên người dùng" aria-label="Tìm thành viên" data-test="member-search" />
    </div>
    <ul class="ms__list ws-scroll" role="listbox" aria-multiselectable="true" :aria-label="label">
      <li v-for="p in options" :key="p.id">
        <label class="ms__option" :class="{ 'is-on': selected.includes(p.id) }">
          <input type="checkbox" :checked="selected.includes(p.id)" :data-test="`pick-${p.id}`" @change="toggle(p.id)" />
          <PersonAvatar :person="p" :size="32" status ring="var(--ws-surface-2)" />
          <span class="ms__text">
            <strong>{{ p.name }}</strong>
            <small>@{{ p.username }}</small>
          </span>
          <span class="ms__check"><AppIcon name="check" :size="14" :stroke-width="3" /></span>
        </label>
      </li>
      <li v-if="!options.length" class="ms__empty">Không tìm thấy người phù hợp.</li>
    </ul>
  </div>
</template>

<style scoped>
.ms__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.ms__count {
  color: var(--ws-accent-text);
  font-size: 0.75rem;
  font-weight: 700;
}

.ms__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin: 0 0 0.5rem;
  padding: 0;
  list-style: none;
}

.ms__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  height: 1.875rem;
  padding: 0 0.25rem 0 0.25rem;
  border-radius: 999px;
  background: var(--ws-accent-soft);
  color: var(--ws-text);
  font-size: 0.8125rem;
  font-weight: 600;
}

.ms__chip button {
  display: grid;
  place-items: center;
  width: 1.375rem;
  height: 1.375rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ws-text-2);
  cursor: pointer;
}

.ms__chip button:hover {
  background: var(--ws-surface-3);
  color: var(--ws-text);
}

.ms__search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  height: 2.5rem;
  padding: 0 0.75rem;
  border: 1px solid var(--ws-border-strong);
  border-radius: 0.75rem 0.75rem 0 0;
  background: var(--ws-surface-2);
  color: var(--ws-text-3);
}

.ms__search input {
  flex: 1;
  height: 100%;
  border: 0;
  background: none;
  color: var(--ws-text);
  font: inherit;
  font-size: 0.875rem;
  outline: none;
}

.ms__list {
  max-height: 13rem;
  margin: 0;
  padding: 0.25rem;
  overflow-y: auto;
  border: 1px solid var(--ws-border-strong);
  border-top: 0;
  border-radius: 0 0 0.75rem 0.75rem;
  background: var(--ws-surface-2);
  list-style: none;
}

.ms__option {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.375rem 0.5rem;
  border-radius: 0.5rem;
  cursor: pointer;
}

.ms__option:hover {
  background: var(--ws-surface-3);
}

.ms__option input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.ms__option:focus-within {
  outline: 2px solid var(--ws-accent);
}

.ms__text {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.ms__text strong {
  font-size: 0.875rem;
}

.ms__text small {
  color: var(--ws-text-3);
  font-size: 0.75rem;
}

.ms__check {
  display: grid;
  place-items: center;
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid var(--ws-border-strong);
  border-radius: 0.375rem;
  color: transparent;
}

.ms__option.is-on .ms__check {
  border-color: var(--ws-accent);
  background: var(--ws-accent);
  color: #fff;
}

.ms__empty {
  padding: 0.75rem;
  color: var(--ws-text-3);
  font-size: 0.875rem;
}
</style>
