<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from './AppIcon.vue'
import AppLogo from './AppLogo.vue'

const route = useRoute()
const panelSide = computed(() => route.meta.panel ?? 'right')
</script>

<template>
  <div class="auth-page">
    <main class="auth-card" :class="`auth-card--panel-${panelSide}`">
      <!-- Khối tím trượt sang trái/phải khi chuyển giữa Đăng nhập và Đăng kí -->
      <div class="auth-card__panel" aria-hidden="true">
        <span class="deco deco--blob deco--blob-a" />
        <span class="deco deco--blob deco--blob-b" />
        <span class="deco deco--ring deco--ring-a" />
        <span class="deco deco--ring deco--ring-b" />
        <span class="deco deco--dots deco--dots-a" />
        <span class="deco deco--dots deco--dots-b" />
        <span class="deco deco--plus deco--plus-a" />
        <span class="deco deco--plus deco--plus-b" />
        <span class="deco deco--spark deco--spark-a" />
        <span class="deco deco--spark deco--spark-b" />

        <!-- Minh hoạ bảng công việc -->
        <div class="art">
          <div class="art__board glass">
            <div class="art__board-head">
              <span class="bar bar--title" />
              <span class="art__avatars"><i /><i /><i /></span>
            </div>
            <div class="art__task art__task--done">
              <span class="art__check"><AppIcon name="check" :size="14" :stroke-width="3" /></span>
              <span class="bar" style="width: 62%" />
            </div>
            <div class="art__task art__task--done">
              <span class="art__check"><AppIcon name="check" :size="14" :stroke-width="3" /></span>
              <span class="bar" style="width: 48%" />
            </div>
            <div class="art__task">
              <span class="art__check" />
              <span class="bar" style="width: 70%" />
            </div>
            <div class="art__task">
              <span class="art__check" />
              <span class="bar" style="width: 40%" />
            </div>
          </div>

          <div class="art__progress glass">
            <svg viewBox="0 0 44 44" class="art__ring">
              <circle cx="22" cy="22" r="17" class="art__ring-track" />
              <circle cx="22" cy="22" r="17" class="art__ring-fill" />
            </svg>
            <span class="art__progress-lines">
              <span class="bar" style="width: 100%" />
              <span class="bar bar--soft" style="width: 65%" />
            </span>
          </div>

          <div class="art__chip glass">
            <AppIcon name="check-square" :size="22" :stroke-width="2" />
          </div>

          <div class="art__bars glass">
            <span style="height: 40%" />
            <span style="height: 70%" />
            <span style="height: 55%" />
            <span style="height: 90%" />
          </div>
        </div>
      </div>

      <section class="auth-card__form-side">
        <AppLogo />
        <div class="auth-card__content">
          <RouterView v-slot="{ Component, route: current }">
            <Transition name="auth-fade" mode="out-in">
              <component :is="Component" :key="current.name" />
            </Transition>
          </RouterView>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.auth-page {
  --page-pad-y: clamp(0.75rem, 5vh, 5.625rem);
  display: grid;
  place-items: center;
  min-height: 100dvh;
  padding: var(--page-pad-y) clamp(1rem, 8vw, 13rem);
}

.auth-card {
  position: relative;
  display: flex;
  width: 100%;
  max-width: 93.75rem;
  /* Cao theo màn hình; nếu nội dung dài hơn thì thẻ tự giãn thay vì hiện thanh cuộn bên trong */
  min-height: min(56.25rem, calc(100dvh - 2 * var(--page-pad-y)));
  overflow: hidden;
  border-radius: clamp(2.5rem, 4.7vw, 5.625rem);
  background: var(--color-surface);
}

.auth-card__panel,
.auth-card__form-side {
  width: 50%;
  transition: transform 0.65s var(--ease-swap);
}

.auth-card__panel {
  position: absolute;
  inset: 0 auto 0 0;
  z-index: 2;
  overflow: hidden;
  background:
    radial-gradient(120% 80% at 100% 0%, rgb(255 255 255 / 0.14), transparent 60%),
    radial-gradient(90% 70% at 0% 100%, rgb(40 30 160 / 0.45), transparent 65%),
    var(--color-primary);
  transform: translateX(100%);
}

.auth-card__form-side {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  padding: clamp(1.25rem, min(3.1vw, 4.5vh), 3.75rem) clamp(1.5rem, 2.6vw, 3.25rem)
    clamp(1.25rem, 4vh, 3rem) clamp(1.5rem, 3.1vw, 3.75rem);
}

.auth-card--panel-left .auth-card__panel {
  transform: translateX(0);
}

.auth-card--panel-left .auth-card__form-side {
  transform: translateX(100%);
}

.auth-card__content {
  width: 100%;
  max-width: 31.25rem;
  margin: clamp(1rem, 4vh, 3.875rem) auto auto;
}

/* ===== Hoạ tiết nền khối tím ===== */
.deco {
  position: absolute;
  pointer-events: none;
}

.deco--blob {
  border-radius: 50%;
  filter: blur(40px);
}

.deco--blob-a {
  top: -12%;
  left: -15%;
  width: 55%;
  aspect-ratio: 1;
  background: rgb(160 150 255 / 0.55);
  animation: drift 14s ease-in-out infinite alternate;
}

.deco--blob-b {
  right: -18%;
  bottom: -14%;
  width: 60%;
  aspect-ratio: 1;
  background: rgb(236 120 255 / 0.3);
  animation: drift 18s ease-in-out infinite alternate-reverse;
}

.deco--ring {
  border: 2px solid rgb(255 255 255 / 0.16);
  border-radius: 50%;
}

.deco--ring-a {
  top: 8%;
  right: -10%;
  width: 38%;
  aspect-ratio: 1;
}

.deco--ring-a::after {
  content: '';
  position: absolute;
  inset: 18%;
  border: 2px dashed rgb(255 255 255 / 0.14);
  border-radius: 50%;
  animation: spin 40s linear infinite;
}

.deco--ring-b {
  bottom: 6%;
  left: -8%;
  width: 26%;
  aspect-ratio: 1;
}

.deco--dots {
  width: 22%;
  aspect-ratio: 1.3;
  background-image: radial-gradient(rgb(255 255 255 / 0.35) 1.6px, transparent 1.8px);
  background-size: 16px 16px;
}

.deco--dots-a {
  top: 6%;
  left: 8%;
}

.deco--dots-b {
  right: 7%;
  bottom: 9%;
}

.deco--plus {
  width: 18px;
  height: 18px;
  background:
    linear-gradient(rgb(255 255 255 / 0.55), rgb(255 255 255 / 0.55)) center / 100% 2px no-repeat,
    linear-gradient(rgb(255 255 255 / 0.55), rgb(255 255 255 / 0.55)) center / 2px 100% no-repeat;
  animation: float 6s ease-in-out infinite;
}

.deco--plus-a {
  top: 22%;
  left: 18%;
}

.deco--plus-b {
  right: 16%;
  bottom: 28%;
  animation-delay: -3s;
}

.deco--spark {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgb(255 255 255 / 0.7);
  box-shadow: 0 0 12px 3px rgb(255 255 255 / 0.35);
  animation: twinkle 3.2s ease-in-out infinite;
}

.deco--spark-a {
  top: 34%;
  right: 22%;
}

.deco--spark-b {
  bottom: 20%;
  left: 24%;
  animation-delay: -1.6s;
}

/* Minh hoạ */
.art {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(62%, 26rem);
  aspect-ratio: 1 / 0.95;
  transform: translate(-50%, -50%);
}

.glass {
  position: absolute;
  border: 1px solid rgb(255 255 255 / 0.35);
  border-radius: 1.25rem;
  background: rgb(255 255 255 / 0.16);
  box-shadow: 0 20px 40px -12px rgb(20 10 90 / 0.45);
  backdrop-filter: blur(10px);
}

.bar {
  display: block;
  height: 0.55rem;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.75);
}

.bar--soft {
  background: rgb(255 255 255 / 0.4);
}

.bar--title {
  width: 40%;
  height: 0.75rem;
  background: #fff;
}

.art__board {
  inset: 8% 14% 14% 6%;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  padding: 6% 8%;
  animation: float 7s ease-in-out infinite;
}

.art__board-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.art__avatars {
  display: flex;
}

.art__avatars i {
  width: 1.4rem;
  height: 1.4rem;
  margin-left: -0.4rem;
  border: 2px solid var(--color-primary);
  border-radius: 50%;
  background: #ffd38a;
}

.art__avatars i:nth-child(2) {
  background: #8ee6c8;
}

.art__avatars i:nth-child(3) {
  background: #ff9fb8;
}

.art__task {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.art__check {
  display: grid;
  flex: none;
  place-items: center;
  width: 1.4rem;
  height: 1.4rem;
  border: 2px solid rgb(255 255 255 / 0.8);
  border-radius: 0.4rem;
  color: var(--color-primary);
}

.art__task--done .art__check {
  border-color: #fff;
  background: #fff;
}

.art__task--done .bar {
  opacity: 0.45;
}

.art__progress {
  right: 0;
  bottom: 2%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 52%;
  padding: 0.85rem 1rem;
  border-radius: 1rem;
  background: rgb(255 255 255 / 0.22);
  animation: float 8s ease-in-out infinite;
  animation-delay: -2s;
}

.art__ring {
  flex: none;
  width: 2.75rem;
  transform: rotate(-90deg);
}

.art__ring-track,
.art__ring-fill {
  fill: none;
  stroke-width: 5;
}

.art__ring-track {
  stroke: rgb(255 255 255 / 0.25);
}

.art__ring-fill {
  stroke: #fff;
  stroke-linecap: round;
  stroke-dasharray: 107;
  stroke-dashoffset: 30;
}

.art__progress-lines {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.45rem;
}

.art__chip {
  top: 0;
  right: 4%;
  display: grid;
  place-items: center;
  width: 3.25rem;
  height: 3.25rem;
  border-radius: 1rem;
  background: #fff;
  color: var(--color-primary);
  animation: float 6s ease-in-out infinite;
  animation-delay: -4s;
}

.art__bars {
  bottom: 0;
  left: -6%;
  display: flex;
  align-items: flex-end;
  gap: 0.35rem;
  width: 22%;
  height: 24%;
  padding: 0.7rem;
  border-radius: 1rem;
  animation: float 9s ease-in-out infinite;
  animation-delay: -1s;
}

.art__bars span {
  flex: 1;
  border-radius: 0.25rem;
  background: rgb(255 255 255 / 0.8);
}

@keyframes float {
  0%,
  100% {
    translate: 0 0;
  }
  50% {
    translate: 0 -10px;
  }
}

@keyframes drift {
  to {
    translate: 8% 6%;
  }
}

@keyframes spin {
  to {
    rotate: 360deg;
  }
}

@keyframes twinkle {
  0%,
  100% {
    opacity: 0.3;
    scale: 0.7;
  }
  50% {
    opacity: 1;
    scale: 1;
  }
}

@media (max-width: 56.25rem) {
  .auth-card {
    min-height: 0;
    border-radius: 2rem;
  }

  .auth-card__panel {
    display: none;
  }

  .auth-card__form-side {
    width: 100%;
    transform: none !important;
    padding: 1.75rem 1.375rem 2.25rem;
  }

  .auth-card__content {
    margin-top: 2rem;
  }
}
</style>
