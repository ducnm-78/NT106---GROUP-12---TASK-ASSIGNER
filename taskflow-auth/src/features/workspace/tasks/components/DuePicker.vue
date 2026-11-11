<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import { dayFromToday, fullDate, nextMonday } from '../taskFormat'

/** Nội dung menu chọn hạn chót: lựa chọn nhanh + chọn ngày cụ thể. */
const props = defineProps<{ value?: string }>()
const emit = defineEmits<{ pick: [iso: string] }>()

const custom = ref(props.value ?? dayFromToday(0))
const QUICK = [
  { label: 'Hôm nay', value: () => dayFromToday(0) },
  { label: 'Ngày mai', value: () => dayFromToday(1) },
  { label: 'Thứ Hai tuần sau', value: nextMonday },
  { label: 'Sau 1 tuần', value: () => dayFromToday(7) },
]
</script>

<template>
  <div class="tk-menu__label">Hạn chót</div>
  <button
    v-for="q in QUICK"
    :key="q.label"
    type="button"
    class="tk-menu__item"
    role="menuitemradio"
    :aria-checked="q.value() === value"
    @click="emit('pick', q.value())"
  >
    <AppIcon name="calendar" :size="16" />
    {{ q.label }}
    <span class="dp-date">{{ fullDate(q.value()) }}</span>
  </button>
  <div class="tk-menu__sep" />
  <form class="dp-custom" @submit.prevent="custom && emit('pick', custom)">
    <input v-model="custom" type="date" class="ws-input" aria-label="Chọn ngày" data-test="due-input" />
    <button type="submit" class="tk-btn tk-btn--primary tk-btn--sm" :disabled="!custom" data-test="due-apply">Đặt</button>
  </form>
</template>

<style scoped>
.dp-date {
  margin-left: auto;
  color: var(--ws-text-3);
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
}

.dp-custom {
  display: flex;
  gap: 0.375rem;
  padding: 0.25rem;
}

.dp-custom .ws-input {
  height: 2.25rem;
  font-size: 0.875rem;
}

.dp-custom .tk-btn {
  height: 2.25rem;
}
</style>
