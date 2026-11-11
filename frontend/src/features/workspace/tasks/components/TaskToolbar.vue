<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import ToggleSwitch from '../../components/ToggleSwitch.vue'
import { PRIORITY_ORDER, PRIORITY_SHORT } from '../../data/constants'
import { useTasks } from '../taskStore'
import { GROUP_BY_LABELS, type GroupBy, useTaskView, type ViewMode } from '../useTaskView'
import PriorityBadge from './PriorityBadge.vue'
import TaskAvatar from './TaskAvatar.vue'
import TaskMenu from './TaskMenu.vue'

const view = useTaskView()
const { projects } = useTasks()
const search = ref<HTMLInputElement | null>(null)

const VIEWS: { id: ViewMode; label: string; icon: 'kanban' | 'list' }[] = [
  { id: 'board', label: 'Bảng', icon: 'kanban' },
  { id: 'list', label: 'Danh sách', icon: 'list' },
]

const scopeName = computed(() => projects.find((p) => p.id === view.filters.projectId)?.name ?? 'Tất cả nhóm')
const shownPeople = computed(() => view.assigneeOptions.value.slice(0, 5))
const extraPeople = computed(() => view.assigneeOptions.value.slice(5))

/** Phím "/" để tìm nhanh (khi không gõ trong ô nhập khác). */
function onKey(event: KeyboardEvent): void {
  const t = event.target as HTMLElement
  if (event.key !== '/' || event.ctrlKey || event.metaKey || t.closest('input, textarea, select, [contenteditable]')) return
  event.preventDefault()
  search.value?.focus()
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="tb" role="toolbar" aria-label="Công cụ công việc">
    <div class="seg" role="group" aria-label="Chế độ xem">
      <button
        v-for="v in VIEWS"
        :key="v.id"
        type="button"
        class="seg__btn"
        :class="{ 'is-on': view.prefs.view === v.id }"
        :aria-pressed="view.prefs.view === v.id"
        :data-test="`view-${v.id}`"
        @click="view.prefs.view = v.id"
      >
        <AppIcon :name="v.icon" :size="18" />
        {{ v.label }}
      </button>
    </div>

    <slot v-if="$slots.bulk" name="bulk" />

    <template v-else>
      <label class="search">
        <AppIcon name="search" :size="17" />
        <input
          ref="search"
          v-model="view.filters.query"
          type="search"
          placeholder="Tìm công việc hoặc mã TF-…"
          aria-label="Tìm công việc"
          data-test="task-search"
          @keydown.esc="view.filters.query = ''"
        />
        <kbd v-if="!view.filters.query" class="search__kbd" aria-hidden="true">/</kbd>
      </label>

      <TaskMenu label="Phạm vi">
        <template #trigger="{ toggle, open }">
          <button type="button" class="drop" :class="{ 'is-set': view.filters.projectId }" :aria-expanded="open" data-test="filter-scope" @click="toggle">
            <AppIcon name="users" :size="17" />
            <span class="drop__key">Phạm vi:</span>
            <strong>{{ scopeName }}</strong>
            <AppIcon name="chevron-down" :size="15" />
          </button>
        </template>
        <template #default="{ close }">
          <button
            type="button"
            class="tk-menu__item"
            role="menuitemradio"
            :aria-checked="!view.filters.projectId"
            @click="view.filters.projectId = null; close()"
          >
            <AppIcon name="layers" :size="16" /> Tất cả nhóm
          </button>
          <div class="tk-menu__sep" />
          <button
            v-for="p in projects"
            :key="p.id"
            type="button"
            class="tk-menu__item"
            role="menuitemradio"
            :aria-checked="view.filters.projectId === p.id"
            :data-test="`scope-${p.id}`"
            @click="view.filters.projectId = p.id; close()"
          >
            <span class="tk-code tb__code" :style="{ '--c': p.color }">{{ p.code }}</span>
            {{ p.name }}
          </button>
        </template>
      </TaskMenu>

      <TaskMenu label="Gom theo">
        <template #trigger="{ toggle, open }">
          <button type="button" class="drop" :aria-expanded="open" data-test="group-by" @click="toggle">
            <AppIcon name="layers" :size="17" />
            <span class="drop__key">Gom theo:</span>
            <strong>{{ GROUP_BY_LABELS[view.prefs.groupBy] }}</strong>
            <AppIcon name="chevron-down" :size="15" />
          </button>
        </template>
        <template #default="{ close }">
          <button
            v-for="(label, key) in GROUP_BY_LABELS"
            :key="key"
            type="button"
            class="tk-menu__item"
            role="menuitemradio"
            :aria-checked="view.prefs.groupBy === key"
            :data-test="`group-by-${key}`"
            @click="view.prefs.groupBy = key as GroupBy; close()"
          >
            {{ label }}
          </button>
        </template>
      </TaskMenu>

      <TaskMenu label="Lọc theo ưu tiên">
        <template #trigger="{ toggle, open }">
          <button type="button" class="drop" :class="{ 'is-set': view.filters.priority }" :aria-expanded="open" data-test="filter-priority" @click="toggle">
            <AppIcon name="bar-chart" :size="17" />
            <span class="drop__key">Ưu tiên:</span>
            <strong>{{ view.filters.priority ? PRIORITY_SHORT[view.filters.priority] : 'Tất cả' }}</strong>
            <AppIcon name="chevron-down" :size="15" />
          </button>
        </template>
        <template #default="{ close }">
          <button type="button" class="tk-menu__item" role="menuitemradio" :aria-checked="!view.filters.priority" @click="view.filters.priority = null; close()">
            Tất cả mức ưu tiên
          </button>
          <button
            v-for="p in PRIORITY_ORDER"
            :key="p"
            type="button"
            class="tk-menu__item"
            role="menuitemradio"
            :aria-checked="view.filters.priority === p"
            :data-test="`filter-priority-${p}`"
            @click="view.filters.priority = p; close()"
          >
            <PriorityBadge :priority="p" />
          </button>
        </template>
      </TaskMenu>

      <div class="people" role="group" aria-label="Lọc theo người phụ trách">
        <button
          v-for="id in shownPeople"
          :key="id"
          type="button"
          class="people__btn"
          :class="{ 'is-on': view.filters.assignees.includes(id) }"
          :aria-pressed="view.filters.assignees.includes(id)"
          :aria-label="`Lọc việc của ${view.nameOf(id === 'none' ? null : id)}`"
          :title="view.nameOf(id === 'none' ? null : id)"
          :data-test="`filter-person-${id}`"
          @click="view.toggleAssignee(id)"
        >
          <TaskAvatar :id="id === 'none' ? null : id" :size="32" ring="var(--ws-bg)" />
        </button>
        <TaskMenu v-if="extraPeople.length" label="Người khác">
          <template #trigger="{ toggle, open }">
            <button
              type="button"
              class="people__more"
              :class="{ 'is-on': extraPeople.some((id) => view.filters.assignees.includes(id)) }"
              :aria-expanded="open"
              :aria-label="`${extraPeople.length} người khác`"
              @click="toggle"
            >
              +{{ extraPeople.length }}
            </button>
          </template>
          <button
            v-for="id in extraPeople"
            :key="id"
            type="button"
            class="tk-menu__item"
            role="menuitemcheckbox"
            :aria-checked="view.filters.assignees.includes(id)"
            @click="view.toggleAssignee(id)"
          >
            <TaskAvatar :id="id === 'none' ? null : id" :size="26" />
            {{ view.nameOf(id === 'none' ? null : id) }}
            <AppIcon v-if="view.filters.assignees.includes(id)" name="check" :size="16" class="tk-menu__check" />
          </button>
        </TaskMenu>
      </div>

      <label class="mine" :class="{ 'is-on': view.filters.mine }">
        <span>Chỉ việc của tôi</span>
        <ToggleSwitch v-model="view.filters.mine" label="Chỉ việc của tôi" data-test="filter-mine" />
      </label>

      <button v-if="view.filtersActive.value" type="button" class="tk-btn tk-btn--ghost tk-btn--sm tb__clear" data-test="clear-filters" @click="view.clearFilters()">
        <AppIcon name="x" :size="15" /> Xoá lọc
      </button>
      <span class="visually-hidden" aria-live="polite">{{ view.filtersActive.value ? `${view.filtered.value.length} công việc phù hợp` : '' }}</span>
    </template>
  </div>
</template>

<style scoped>
.tb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.625rem;
}

/* ---- Chuyển chế độ xem ---- */
.seg {
  display: inline-flex;
  padding: 0.25rem;
  border: 1px solid var(--ws-border-strong);
  border-radius: 0.875rem;
  background: var(--ws-surface-2);
}

.seg__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 2.25rem;
  padding: 0 0.875rem;
  border: 1px solid transparent;
  border-radius: 0.625rem;
  background: none;
  color: var(--ws-text-2);
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}

.seg__btn:hover {
  color: var(--ws-text);
}

.seg__btn.is-on {
  border-color: var(--ws-accent);
  background: var(--ws-accent-soft);
  color: var(--ws-text);
  font-weight: 600;
}

.seg__btn.is-on :deep(svg) {
  color: var(--ws-accent-text);
}

/* ---- Tìm kiếm ---- */
.search {
  display: flex;
  flex: 1 1 15rem;
  align-items: center;
  gap: 0.5rem;
  min-width: 12rem;
  max-width: 20rem;
  height: 2.75rem;
  padding: 0 0.75rem;
  border: 1px solid var(--ws-border-strong);
  border-radius: 0.75rem;
  background: var(--ws-surface-2);
  color: var(--ws-text-3);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.search:focus-within {
  border-color: var(--ws-accent);
  box-shadow: 0 0 0 3px var(--ws-accent-soft);
}

.search input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 0;
  background: none;
  color: var(--ws-text);
  font: inherit;
  font-size: 0.875rem;
  outline: none;
}

.search__kbd {
  padding: 0 0.375rem;
  border: 1px solid var(--ws-border-strong);
  border-radius: 0.3125rem;
  color: var(--ws-text-3);
  font-family: inherit;
  font-size: 0.75rem;
}

/* ---- Nút thả xuống ---- */
.drop {
  display: inline-flex;
  align-items: center;
  gap: 0.4375rem;
  height: 2.75rem;
  padding: 0 0.75rem;
  border: 1px solid var(--ws-border-strong);
  border-radius: 0.75rem;
  background: var(--ws-surface-2);
  color: var(--ws-text-2);
  font: inherit;
  font-size: 0.84375rem;
  white-space: nowrap;
  cursor: pointer;
}

.drop:hover {
  background: var(--ws-surface-3);
}

.drop strong {
  color: var(--ws-text);
  font-weight: 600;
}

.drop.is-set {
  border-color: color-mix(in srgb, var(--ws-accent) 60%, transparent);
  background: var(--ws-accent-soft);
}

.drop__key {
  color: var(--ws-text-3);
}

.tb__code {
  width: 1.5rem;
  height: 1.5rem;
  font-size: 0.5625rem;
}

/* ---- Lọc theo người ---- */
.people {
  display: flex;
  align-items: center;
  margin-left: auto;
  padding-left: 0.25rem;
}

.people__btn,
.people__more {
  position: relative;
  display: inline-grid;
  place-items: center;
  margin-left: -0.375rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.people__btn:hover,
.people__more:hover {
  z-index: 2;
  transform: translateY(-2px);
}

.people__btn.is-on {
  z-index: 1;
  box-shadow: 0 0 0 2px var(--ws-accent);
}

.people__more {
  width: 2.25rem;
  height: 2.25rem;
  border: 2px solid var(--ws-bg);
  background: var(--ws-surface-3);
  color: var(--ws-text-2);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 700;
}

.people__more.is-on {
  box-shadow: 0 0 0 2px var(--ws-accent);
}

.mine {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  padding-left: 0.5rem;
  color: var(--ws-text-2);
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}

.mine.is-on {
  color: var(--ws-text);
}

@media (max-width: 47.99rem) {
  .search {
    flex-basis: 100%;
    max-width: none;
    order: -1;
  }

  .seg {
    order: -2;
  }

  .people {
    margin-left: 0;
  }

  .drop__key {
    display: none;
  }
}
</style>
