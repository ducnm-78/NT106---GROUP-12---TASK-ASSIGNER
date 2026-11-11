<script setup lang="ts">
import { computed, ref } from 'vue'
import { STATUS_COLORS, STATUS_LABELS } from '../data/constants'
import type { TaskStatus } from '../types'
import { formatPercent } from '../utils/format'

const props = defineProps<{ counts: Record<TaskStatus, number> }>()

const ORDER: TaskStatus[] = ['done', 'review', 'doing', 'todo']
const R = 42
const CIRC = 2 * Math.PI * R
/** Khe hở 2px giữa các cung (tính theo đơn vị viewBox ~ 2/200 chu vi hiển thị). */
const GAP = 1.6

const hover = ref<TaskStatus | null>(null)

const total = computed(() => ORDER.reduce((sum, key) => sum + props.counts[key], 0))

const segments = computed(() => {
  let offset = 0
  const active = ORDER.filter((key) => props.counts[key] > 0)
  return ORDER.map((key) => {
    const share = total.value ? props.counts[key] / total.value : 0
    const length = share * CIRC
    const visible = Math.max(0, length - (active.length > 1 ? GAP : 0))
    const seg = { key, share, dash: `${visible} ${CIRC - visible}`, offset: -offset }
    offset += length
    return seg
  })
})

const center = computed(() => {
  const key = hover.value ?? 'done'
  const share = total.value ? props.counts[key] / total.value : 0
  return { value: formatPercent(share), label: STATUS_LABELS[key].toLowerCase() }
})
</script>

<template>
  <div class="donut">
    <div class="donut__chart">
      <svg viewBox="0 0 100 100" role="img" :aria-label="`Phân bổ ${total} công việc theo trạng thái`">
        <circle cx="50" cy="50" :r="R" class="donut__track" />
        <circle
          v-for="seg in segments"
          v-show="seg.share > 0"
          :key="seg.key"
          cx="50"
          cy="50"
          :r="R"
          class="donut__seg"
          :class="{ 'is-dim': hover && hover !== seg.key }"
          :stroke="STATUS_COLORS[seg.key]"
          :stroke-dasharray="seg.dash"
          :stroke-dashoffset="seg.offset"
          @pointerenter="hover = seg.key"
          @pointerleave="hover = null"
        />
      </svg>
      <div class="donut__center" aria-hidden="true">
        <strong>{{ center.value }}</strong>
        <span>{{ center.label }}</span>
      </div>
    </div>

    <ul class="donut__legend">
      <li
        v-for="key in ORDER"
        :key="key"
        :class="{ 'is-dim': hover && hover !== key }"
        @pointerenter="hover = key"
        @pointerleave="hover = null"
      >
        <span class="donut__swatch" :style="{ background: STATUS_COLORS[key] }" />
        <span class="donut__legend-text">
          <strong>{{ STATUS_LABELS[key] }}</strong>
          <span>{{ counts[key] }} công việc · {{ formatPercent(total ? counts[key] / total : 0) }}</span>
        </span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.donut {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-around;
  gap: 1.5rem;
}

.donut__chart {
  position: relative;
  width: clamp(8.5rem, min(10vw, 17vh), 11.5rem);
  aspect-ratio: 1;
}

svg {
  display: block;
  width: 100%;
  transform: rotate(-90deg);
}

.donut__track {
  fill: none;
  stroke: var(--ws-surface-2);
  stroke-width: 12;
}

.donut__seg {
  fill: none;
  stroke-width: 12;
  cursor: default;
  transition: opacity 0.15s ease;
}

.is-dim {
  opacity: 0.35;
}

.donut__center {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  text-align: center;
}

.donut__center strong {
  font-size: clamp(1.5rem, 1rem + 1vw, 2rem);
  font-variant-numeric: tabular-nums;
}

.donut__center span {
  color: var(--ws-text-2);
  font-size: 0.8125rem;
}

.donut__legend {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.donut__legend li {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  transition: opacity 0.15s ease;
}

.donut__swatch {
  flex: none;
  width: 0.75rem;
  height: 0.75rem;
  margin-top: 0.25rem;
  border-radius: 50%;
}

.donut__legend-text {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.donut__legend-text strong {
  font-size: 0.9375rem;
}

.donut__legend-text span {
  color: var(--ws-text-2);
  font-size: 0.8125rem;
}
</style>
