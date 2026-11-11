<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { formatNumber } from '../utils/format'

const props = defineProps<{ values: number[]; labels: string[]; unit: string; caption: string }>()

const box = ref<HTMLElement | null>(null)
const width = ref(600)
const height = ref(220)
const hover = ref<number | null>(null)

const PAD = { top: 12, right: 14, bottom: 28, left: 34 }

let observer: ResizeObserver | null = null
onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    width.value = Math.max(240, entry.contentRect.width)
    height.value = Math.max(160, entry.contentRect.height)
  })
  if (box.value) observer.observe(box.value)
})
onBeforeUnmount(() => observer?.disconnect())

/** Trục y làm tròn lên bội số của 2 giờ. */
const yMax = computed(() => Math.max(2, Math.ceil(Math.max(...props.values) / 2) * 2))
const yTicks = computed(() => Array.from({ length: yMax.value / 2 + 1 }, (_, i) => i * 2))

const plotW = computed(() => width.value - PAD.left - PAD.right)
const plotH = computed(() => height.value - PAD.top - PAD.bottom)

const x = (i: number) => PAD.left + (props.values.length > 1 ? (i / (props.values.length - 1)) * plotW.value : plotW.value / 2)
const y = (v: number) => PAD.top + plotH.value - (v / yMax.value) * plotH.value

const points = computed(() => props.values.map((v, i) => ({ x: x(i), y: y(v), v })))
const linePath = computed(() => points.value.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' '))
const areaPath = computed(() => {
  const pts = points.value
  if (!pts.length) return ''
  const base = PAD.top + plotH.value
  return `${linePath.value} L${pts[pts.length - 1].x},${base} L${pts[0].x},${base} Z`
})

function onMove(event: PointerEvent): void {
  const rect = (event.currentTarget as SVGElement).getBoundingClientRect()
  const px = event.clientX - rect.left
  let nearest = 0
  for (let i = 1; i < points.value.length; i++) {
    if (Math.abs(points.value[i].x - px) < Math.abs(points.value[nearest].x - px)) nearest = i
  }
  hover.value = nearest
}

const tooltip = computed(() => {
  if (hover.value === null) return null
  const p = points.value[hover.value]
  const left = Math.min(Math.max(p.x, 60), width.value - 60)
  return { left, top: p.y, label: props.labels[hover.value], value: `${formatNumber(p.v)} ${props.unit}` }
})
</script>

<template>
  <figure class="chart">
    <div ref="box" class="chart__box">
      <svg
        :width="width"
        :height="height"
        :viewBox="`0 0 ${width} ${height}`"
        role="img"
        :aria-label="caption"
        @pointermove="onMove"
        @pointerleave="hover = null"
      >
        <defs>
          <linearGradient id="focus-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="var(--ws-accent)" stop-opacity="0.32" />
            <stop offset="100%" stop-color="var(--ws-accent)" stop-opacity="0" />
          </linearGradient>
        </defs>

        <g class="chart__grid">
          <g v-for="tick in yTicks" :key="tick">
            <line :x1="PAD.left" :x2="width - PAD.right" :y1="y(tick)" :y2="y(tick)" />
            <text :x="PAD.left - 10" :y="y(tick)" text-anchor="end" dominant-baseline="middle">{{ tick }}h</text>
          </g>
          <text
            v-for="(label, i) in labels"
            :key="label"
            :x="x(i)"
            :y="height - 6"
            text-anchor="middle"
            :class="{ 'is-active': hover === i }"
          >
            {{ label }}
          </text>
        </g>

        <path :d="areaPath" fill="url(#focus-area)" />
        <line
          v-if="tooltip"
          class="chart__crosshair"
          :x1="points[hover!].x"
          :x2="points[hover!].x"
          :y1="PAD.top"
          :y2="PAD.top + plotH"
        />
        <path :d="linePath" class="chart__line" />
        <circle
          v-for="(p, i) in points"
          :key="i"
          :cx="p.x"
          :cy="p.y"
          :r="hover === i ? 6 : 4.5"
          class="chart__dot"
        />
      </svg>

      <div v-if="tooltip" class="chart__tip" :style="{ left: `${tooltip.left}px`, top: `${tooltip.top}px` }">
        <span class="chart__tip-label">{{ tooltip.label }}</span>
        <strong>{{ tooltip.value }}</strong>
      </div>
    </div>

    <!-- Bảng dữ liệu cho trình đọc màn hình -->
    <div class="visually-hidden">
      <table>
        <caption>{{ caption }}</caption>
        <tbody>
          <tr v-for="(label, i) in labels" :key="label">
            <th scope="row">{{ label }}</th>
            <td>{{ formatNumber(values[i]) }} {{ unit }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </figure>
</template>

<style scoped>
.chart {
  position: relative;
  flex: 1;
  min-height: 11rem;
  margin: 0;
}

.chart__box {
  position: absolute;
  inset: 0;
}

svg {
  display: block;
  overflow: visible;
  touch-action: pan-y;
}

.chart__grid line {
  stroke: var(--ws-border-strong);
  stroke-dasharray: 4 6;
}

.chart__grid text {
  fill: var(--ws-text-3);
  font-size: 12px;
}

.chart__grid text.is-active {
  fill: var(--ws-text);
  font-weight: 600;
}

.chart__line {
  fill: none;
  stroke: var(--ws-accent);
  stroke-width: 2.5;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.chart__crosshair {
  stroke: var(--ws-text-3);
  stroke-width: 1;
}

.chart__dot {
  fill: var(--ws-surface);
  stroke: var(--ws-accent);
  stroke-width: 2.5;
  transition: r 0.12s ease;
}

.chart__tip {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--ws-border-strong);
  border-radius: 0.625rem;
  background: var(--ws-surface-2);
  box-shadow: var(--ws-shadow);
  color: var(--ws-text);
  font-size: 0.8125rem;
  white-space: nowrap;
  pointer-events: none;
  transform: translate(-50%, calc(-100% - 14px));
}

.chart__tip-label {
  color: var(--ws-text-2);
}
</style>
