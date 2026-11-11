<script setup lang="ts">
import { computed } from 'vue'
import { useGroups } from '../useGroups'
import type { Group } from '../types'
import PersonAvatar from './PersonAvatar.vue'

const props = defineProps<{ group: Group }>()
const emit = defineEmits<{ profile: [userId: string, el: HTMLElement] }>()

const store = useGroups()

/** Nhóm thành viên đang hoạt động theo vai trò hiển thị riêng (hoist) cao nhất; ngoại tuyến xếp cuối. */
const sections = computed(() => {
  const g = props.group
  const buckets = new Map<string, { title: string; color: string | null; ids: string[] }>()
  for (const r of g.roles) if (r.hoist && !r.isDefault) buckets.set(r.id, { title: r.name, color: r.color, ids: [] })
  const online = { title: 'Trực tuyến', color: null, ids: [] as string[] }
  const offline = { title: 'Ngoại tuyến', color: null, ids: [] as string[] }

  for (const m of g.members) {
    const person = store.person(m.userId)
    if (person.status === 'offline') {
      offline.ids.push(m.userId)
      continue
    }
    const hoisted = store.memberRoles(g.id, m.userId).find((r) => r.hoist)
    ;(hoisted ? buckets.get(hoisted.id)! : online).ids.push(m.userId)
  }
  const byName = (a: string, b: string) => store.displayName(g.id, a).localeCompare(store.displayName(g.id, b), 'vi')
  return [...buckets.values(), online, offline].filter((s) => s.ids.length).map((s) => ({ ...s, ids: s.ids.sort(byName) }))
})
</script>

<template>
  <aside class="mp ws-scroll" aria-label="Thành viên nhóm" data-test="members-panel">
    <section v-for="s in sections" :key="s.title" class="mp__section">
      <h2 class="mp__title">{{ s.title }} — {{ s.ids.length }}</h2>
      <ul class="mp__list">
        <li v-for="id in s.ids" :key="id">
          <button
            type="button"
            class="mp__member"
            :class="{ 'is-offline': s.title === 'Ngoại tuyến' }"
            :data-test="`member-${id}`"
            @click="emit('profile', id, $event.currentTarget as HTMLElement)"
          >
            <PersonAvatar :person="store.person(id)" :size="34" status ring="var(--ws-sidebar)" />
            <span class="mp__text">
              <span class="mp__name ws-role-name" :style="{ '--name': store.nameColor(group.id, id) ?? undefined }">
                {{ store.displayName(group.id, id) }}
                <span v-if="store.person(id).bot" class="mp__bot">AI</span>
                <span v-if="group.ownerId === id" class="mp__owner" title="Chủ nhóm">👑</span>
              </span>
              <span v-if="store.person(id).activity" class="mp__activity">{{ store.person(id).activity }}</span>
            </span>
          </button>
        </li>
      </ul>
    </section>
  </aside>
</template>

<style scoped>
.mp {
  height: 100%;
  min-height: 0;
  padding: 1rem 0.5rem;
  overflow-y: auto;
  border-left: 1px solid var(--ws-border);
  background: var(--ws-sidebar);
}

.mp__section + .mp__section {
  margin-top: 1.25rem;
}

.mp__title {
  margin: 0 0 0.375rem;
  padding: 0 0.5rem;
  color: var(--ws-text-3);
  font-size: 0.6875rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.mp__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.mp__member {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  padding: 0.375rem 0.5rem;
  border: 0;
  border-radius: 0.5rem;
  background: none;
  color: var(--ws-text);
  text-align: left;
  cursor: pointer;
}

.mp__member:hover {
  background: var(--ws-surface-2);
}

.mp__member.is-offline {
  opacity: 0.5;
}

.mp__member.is-offline:hover {
  opacity: 1;
}

.mp__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.mp__name {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  overflow: hidden;
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
}

.mp__bot {
  padding: 0 0.3125rem;
  border-radius: 0.25rem;
  background: var(--ws-accent);
  color: #fff;
  font-size: 0.5625rem;
  font-weight: 800;
}

.mp__owner {
  font-size: 0.75rem;
}

.mp__activity {
  overflow: hidden;
  color: var(--ws-text-3);
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
