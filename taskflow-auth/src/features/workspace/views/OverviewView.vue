<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import CreateTaskModal from '../components/CreateTaskModal.vue'
import FocusLineChart from '../components/FocusLineChart.vue'
import PanelCard from '../components/PanelCard.vue'
import StatCard from '../components/StatCard.vue'
import StatusDonut from '../components/StatusDonut.vue'
import { PRIORITY_LABELS, STATUS_LABELS } from '../data/constants'
import { useProfile } from '../composables/useProfile'
import { useWorkspace } from '../composables/useWorkspace'
import { formatNumber, formatPercent, formatToday, greeting } from '../utils/format'

const { firstName } = useProfile()
const {
  statusCounts,
  totalTasks,
  completionRate,
  focusHours,
  weeklyFocus,
  projectStats,
  todayTasks,
  projectName,
  toggleTask,
} = useWorkspace()

const creating = ref(false)

const activeProjects = computed(() => projectStats.value.filter((p) => p.open > 0).length)

/** Nhãn 7 ngày gần nhất, kết thúc ở hôm nay: T2…T7, CN. */
const dayLabels = computed(() =>
  focusHours.map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (focusHours.length - 1 - i))
    return d.getDay() === 0 ? 'CN' : `T${d.getDay() + 1}`
  }),
)

const todayFocus = computed(() => focusHours[focusHours.length - 1])
</script>

<template>
  <div class="ws-page overview">
    <header class="ws-page-header">
      <div>
        <p class="ws-eyebrow">{{ formatToday() }} · Không gian làm việc</p>
        <h1 class="ws-title">{{ greeting() }}, {{ firstName }}</h1>
        <p class="ws-subtitle">Tổng quan công việc của bạn. Bắt đầu ngày mới thật hiệu quả.</p>
      </div>
      <BaseButton class="ws-btn-auto overview__create" @click="creating = true">
        <AppIcon name="plus" :size="18" :stroke-width="2.5" />
        Tạo công việc
      </BaseButton>
    </header>

    <section class="overview__stats" aria-label="Chỉ số chính">
      <StatCard
        label="Đã hoàn thành"
        :value="String(statusCounts.done)"
        :hint="`trong ${totalTasks} công việc`"
        icon="check-square"
      />
      <StatCard
        label="Thời gian tập trung"
        :value="`${formatNumber(weeklyFocus)} h`"
        :hint="`hôm nay ${formatNumber(todayFocus)} giờ`"
        icon="clock"
      />
      <StatCard
        label="Dự án đang chạy"
        :value="String(activeProjects).padStart(2, '0')"
        :hint="`trên tổng ${projectStats.length} dự án`"
        icon="grid"
      />
      <StatCard label="Mục tiêu tuần" :value="formatPercent(completionRate)" hint="tỷ lệ hoàn thành" icon="target" />
    </section>

    <div class="overview__row overview__row--charts">
      <PanelCard title="Năng suất theo tuần" subtitle="Số giờ tập trung trong 7 ngày gần nhất">
        <template #actions>
          <span class="overview__chip">7 ngày gần nhất</span>
        </template>
        <FocusLineChart
          :values="focusHours"
          :labels="dayLabels"
          unit="giờ"
          caption="Số giờ tập trung mỗi ngày trong 7 ngày gần nhất"
        />
      </PanelCard>

      <PanelCard title="Phân bổ công việc" :subtitle="`${totalTasks} công việc theo trạng thái`">
        <StatusDonut :counts="statusCounts" />
      </PanelCard>
    </div>

    <div class="overview__row overview__row--lists">
      <PanelCard title="Ưu tiên hôm nay" subtitle="Các công việc có hạn trong hôm nay">
        <p v-if="!todayTasks.length" class="overview__empty">Hôm nay chưa có việc nào. Tạo công việc mới để bắt đầu.</p>
        <ul v-else class="tasks">
          <li v-for="task in todayTasks" :key="task.id" class="task" :class="{ 'is-done': task.status === 'done' }">
            <label class="task__check">
              <input type="checkbox" :checked="task.status === 'done'" @change="toggleTask(task.id)" />
              <span class="task__box"><AppIcon name="check" :size="14" :stroke-width="3" /></span>
              <span class="visually-hidden">Đánh dấu hoàn thành: {{ task.title }}</span>
            </label>
            <div class="task__text">
              <RouterLink :to="{ name: 'tasks', query: { task: `TF-${task.key}` } }" class="task__title">{{ task.title }}</RouterLink>
              <span class="task__project">{{ projectName(task.projectId) }}</span>
            </div>
            <span class="task__time">{{ task.time ?? 'Cả ngày' }}</span>
            <span
              class="task__tag"
              :class="task.status === 'done' ? 'tag--done' : task.priority === 'high' ? 'tag--high' : 'tag--normal'"
            >
              {{ task.status === 'todo' ? PRIORITY_LABELS[task.priority] : task.status === 'done' ? 'Đã xong' : STATUS_LABELS[task.status] }}
            </span>
          </li>
        </ul>
      </PanelCard>

      <PanelCard title="Tiến độ dự án" subtitle="Tỷ lệ công việc đã hoàn thành trong mỗi dự án">
        <ul class="progress">
          <li v-for="project in projectStats" :key="project.id" class="progress__item">
            <div class="progress__head">
              <span>{{ project.name }}</span>
              <strong>{{ formatPercent(project.progress) }}</strong>
            </div>
            <div
              class="progress__track"
              role="progressbar"
              :aria-label="project.name"
              :aria-valuenow="Math.round(project.progress * 100)"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <span class="progress__fill" :style="{ width: `${project.progress * 100}%` }" />
            </div>
          </li>
        </ul>
      </PanelCard>
    </div>

    <CreateTaskModal v-model:open="creating" />
  </div>
</template>

<style scoped>
.overview__create :deep(.btn__label) {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.overview__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--ws-gap);
}

.overview__row {
  display: grid;
  gap: var(--ws-gap);
}

.overview__row--charts {
  grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
}

.overview__row--charts > :first-child {
  min-height: clamp(14rem, 24vh, 19rem);
}

.overview__row--lists {
  grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr);
}

.overview__chip {
  flex: none;
  padding: 0.375rem 0.75rem;
  border-radius: 999px;
  background: var(--ws-surface-2);
  color: var(--ws-text-2);
  font-size: 0.8125rem;
  font-weight: 600;
}

.overview__empty {
  margin: 0;
  color: var(--ws-text-2);
  font-size: 0.9375rem;
}

/* ----- Danh sách ưu tiên ----- */
.tasks {
  margin: 0;
  padding: 0;
  list-style: none;
}

.task {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto 7.5rem;
  align-items: center;
  gap: 1rem;
  padding: 0.625rem 0;
}

.task + .task {
  border-top: 1px solid var(--ws-border);
}

.task__check {
  position: relative;
  display: grid;
  cursor: pointer;
}

.task__check input {
  position: absolute;
  opacity: 0;
}

.task__box {
  display: grid;
  place-items: center;
  width: 1.375rem;
  height: 1.375rem;
  border: 2px solid var(--ws-text-3);
  border-radius: 0.375rem;
  color: transparent;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.task__check input:focus-visible + .task__box {
  outline: 2px solid var(--ws-accent);
  outline-offset: 2px;
}

.task.is-done .task__box {
  border-color: var(--ws-accent);
  background: var(--ws-accent);
  color: var(--ws-on-accent);
}

.task__text {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.task__title {
  overflow: hidden;
  color: var(--ws-text);
  font-size: 0.9375rem;
  font-weight: 600;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task__title:hover {
  color: var(--ws-accent-text);
}

.task.is-done .task__title {
  color: var(--ws-text-3);
  text-decoration: line-through;
}

.task__project {
  color: var(--ws-text-3);
  font-size: 0.8125rem;
}

.task__time {
  color: var(--ws-text-2);
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
}

.task__tag {
  padding: 0.375rem 0.625rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-align: center;
  white-space: nowrap;
}

.tag--high {
  background: rgb(245 182 91 / 0.15);
  color: #f5b65b;
}

.tag--normal {
  background: var(--ws-accent-soft);
  color: var(--ws-accent-text);
}

.tag--done {
  background: var(--ws-surface-2);
  color: var(--ws-text-3);
}

.ws[data-theme='light'] .tag--high {
  color: #9a5b06;
}

/* ----- Tiến độ dự án ----- */
.progress {
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.progress__head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
  font-size: 0.9375rem;
}

.progress__head strong {
  font-variant-numeric: tabular-nums;
}

.progress__track {
  height: 0.5rem;
  overflow: hidden;
  border-radius: 999px;
  background: var(--ws-surface-2);
}

.progress__fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--ws-accent);
  transition: width 0.4s ease;
}

@media (max-width: 80rem) {
  .overview__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 64rem) {
  .overview__row--charts,
  .overview__row--lists {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 22rem) {
  .overview__stats {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 36rem) {

  .task {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .task__time {
    display: none;
  }
}
</style>
