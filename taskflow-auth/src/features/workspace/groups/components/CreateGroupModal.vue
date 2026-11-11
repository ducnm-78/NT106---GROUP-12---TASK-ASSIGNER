<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseModal from '../../components/BaseModal.vue'
import { DISCOVER_GROUPS, GROUP_COLORS, GROUP_TEMPLATES } from '../data'
import { useGroups } from '../useGroups'
import type { Group, GroupTemplate } from '../types'
import GroupIcon from './GroupIcon.vue'
import MemberSelect from './MemberSelect.vue'

const open = defineModel<boolean>('open', { required: true })
const props = withDefaults(defineProps<{ initialTab?: 'create' | 'join' }>(), { initialTab: 'create' })
const emit = defineEmits<{ created: [group: Group] }>()

const store = useGroups()
const tab = ref<'create' | 'join'>(props.initialTab)
const template = ref<GroupTemplate>('project')
const name = ref('')
const description = ref('')
const color = ref(GROUP_COLORS[0])
const members = ref<string[]>([])
const code = ref('')
const error = ref('')

watch(open, (isOpen) => {
  if (!isOpen) return
  tab.value = props.initialTab
  template.value = 'project'
  name.value = ''
  description.value = ''
  color.value = GROUP_COLORS[store.groups.value.length % GROUP_COLORS.length]
  members.value = []
  code.value = ''
  error.value = ''
})
watch(tab, () => (error.value = ''))

const joined = computed(() => new Set(store.groups.value.map((g) => g.id)))

function submit(): void {
  error.value = ''
  if (tab.value === 'create') {
    const r = store.createGroup({ name: name.value, description: description.value, color: color.value, template: template.value, memberIds: members.value })
    if (!r.ok) {
      error.value = r.error
      return
    }
    emit('created', r.value)
  } else {
    joinWith(code.value)
    return
  }
  open.value = false
}

function joinWith(value: string): void {
  const r = store.joinByCode(value)
  if (!r.ok) {
    error.value = r.error
    return
  }
  emit('created', r.value)
  open.value = false
}
</script>

<template>
  <BaseModal
    v-model:open="open"
    wide
    :title="tab === 'create' ? 'Tạo nhóm mới' : 'Tham gia nhóm'"
    :description="tab === 'create' ? 'Nhóm là nơi bạn và mọi người trò chuyện, chia việc và họp.' : 'Nhập mã mời hoặc chọn một nhóm công khai.'"
  >
    <div class="tabs" role="tablist" aria-label="Tạo hoặc tham gia">
      <button type="button" role="tab" :aria-selected="tab === 'create'" class="tabs__btn" :class="{ 'is-active': tab === 'create' }" @click="tab = 'create'">
        <AppIcon name="plus" :size="16" /> Tạo nhóm
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="tab === 'join'"
        class="tabs__btn"
        :class="{ 'is-active': tab === 'join' }"
        data-test="tab-join"
        @click="tab = 'join'"
      >
        <AppIcon name="compass" :size="16" /> Tham gia
      </button>
    </div>

    <form id="group-form" class="form" novalidate @submit.prevent="submit">
      <template v-if="tab === 'create'">
        <fieldset class="templates">
          <legend class="ws-label">Chọn mẫu</legend>
          <label v-for="t in GROUP_TEMPLATES" :key="t.id" class="tpl" :class="{ 'is-on': template === t.id }">
            <input v-model="template" type="radio" name="tpl" :value="t.id" class="visually-hidden" />
            <span class="tpl__icon"><AppIcon :name="t.icon" :size="20" /></span>
            <span class="tpl__text">
              <strong>{{ t.label }}</strong>
              <small>{{ t.description }}</small>
            </span>
          </label>
        </fieldset>

        <div class="row">
          <GroupIcon :group="{ name: name || 'Nhóm', color, icon: null }" :size="56" />
          <div class="row__field">
            <label class="ws-label" for="g-name">Tên nhóm</label>
            <input id="g-name" v-model="name" class="ws-input" maxlength="60" placeholder="VD: Đồ án NT106" autofocus data-test="group-name" />
          </div>
        </div>

        <div>
          <span class="ws-label">Màu nhóm</span>
          <div class="colors" role="radiogroup" aria-label="Màu nhóm">
            <button
              v-for="c in GROUP_COLORS"
              :key="c"
              type="button"
              role="radio"
              class="colors__swatch"
              :class="{ 'is-on': color === c }"
              :aria-checked="color === c"
              :aria-label="`Màu ${c}`"
              :style="{ background: c }"
              @click="color = c"
            >
              <AppIcon v-if="color === c" name="check" :size="14" :stroke-width="3" />
            </button>
          </div>
        </div>

        <div>
          <label class="ws-label" for="g-desc">Mô tả (không bắt buộc)</label>
          <input id="g-desc" v-model="description" class="ws-input" maxlength="160" placeholder="Nhóm này dùng để làm gì?" />
        </div>

        <MemberSelect v-model="members" label="Thêm thành viên" />
      </template>

      <template v-else>
        <div>
          <label class="ws-label" for="g-code">Mã mời hoặc liên kết</label>
          <div class="code">
            <input
              id="g-code"
              v-model="code"
              class="ws-input"
              placeholder="VD: UIT-CODE hoặc taskflow.app/invite/UIT-CODE"
              autofocus
              data-test="join-code"
            />
          </div>
        </div>
        <div>
          <span class="ws-label">Khám phá nhóm công khai</span>
          <ul class="discover">
            <li v-for="d in DISCOVER_GROUPS" :key="d.code" class="discover__item">
              <GroupIcon :group="{ name: d.name, color: d.color, icon: null }" :size="44" />
              <span class="discover__text">
                <strong>{{ d.name }}</strong>
                <small>{{ d.description }} · {{ d.memberIds.length + 1 }} thành viên</small>
              </span>
              <span v-if="joined.has(`g-${d.code.toLowerCase()}`)" class="ws-chip">Đã tham gia</span>
              <button v-else type="button" class="discover__btn" :data-test="`join-${d.code}`" @click="joinWith(d.code)">Tham gia</button>
            </li>
          </ul>
        </div>
      </template>

      <p v-if="error" class="error" role="alert" data-test="group-error">{{ error }}</p>
    </form>

    <template #footer>
      <BaseButton variant="secondary" class="ws-btn-auto" @click="open = false">Huỷ</BaseButton>
      <BaseButton type="submit" form="group-form" class="ws-btn-auto" data-test="group-submit">
        {{ tab === 'create' ? 'Tạo nhóm' : 'Tham gia' }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.tabs {
  display: inline-flex;
  gap: 0.25rem;
  margin-bottom: 1.25rem;
  padding: 0.25rem;
  border-radius: 999px;
  background: var(--ws-surface-2);
}

.tabs__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  height: 2.25rem;
  padding: 0 1rem;
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--ws-text-2);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.tabs__btn.is-active {
  background: var(--ws-accent-grad);
  color: #fff;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
}

.templates {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.625rem;
  margin: 0;
  padding: 0;
  border: 0;
}

.templates legend {
  float: left;
  width: 100%;
  padding: 0;
}

.tpl {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1.5px solid var(--ws-border-strong);
  border-radius: 0.875rem;
  background: var(--ws-surface-2);
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.tpl:hover {
  border-color: color-mix(in srgb, var(--ws-accent) 60%, transparent);
}

.tpl.is-on {
  border-color: var(--ws-accent);
  background: color-mix(in srgb, var(--ws-accent) 10%, var(--ws-surface-2));
}

.tpl:focus-within {
  outline: 2px solid var(--ws-accent);
  outline-offset: 2px;
}

.tpl__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  background: var(--ws-accent-soft);
  color: var(--ws-accent-text);
}

.tpl__text {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.tpl__text strong {
  font-size: 0.9375rem;
}

.tpl__text small {
  color: var(--ws-text-3);
  font-size: 0.75rem;
  line-height: 1.35;
}

.row {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
}

.row__field {
  flex: 1;
}

.colors {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.colors__swatch {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
}

.colors__swatch.is-on {
  box-shadow: 0 0 0 2px var(--ws-surface), 0 0 0 4px var(--ws-text);
}

.discover {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.discover__item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--ws-border);
  border-radius: 0.875rem;
  background: var(--ws-surface-2);
}

.discover__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.discover__text strong {
  font-size: 0.9375rem;
}

.discover__text small {
  color: var(--ws-text-3);
  font-size: 0.8125rem;
}

.discover__btn {
  height: 2.125rem;
  padding: 0 1rem;
  border: 0;
  border-radius: 999px;
  background: var(--ws-online);
  color: #06261a;
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
}

.discover__btn:hover {
  filter: brightness(1.08);
}

.error {
  margin: 0;
  padding: 0.625rem 0.875rem;
  border-radius: 0.625rem;
  background: color-mix(in srgb, var(--ws-danger) 14%, transparent);
  color: var(--ws-danger);
  font-size: 0.875rem;
}

@media (max-width: 36rem) {
  .templates {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
