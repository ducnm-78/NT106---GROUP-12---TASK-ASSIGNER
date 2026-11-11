<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ACCENTS } from '../data/constants'
import { usePreferences } from '../composables/usePreferences'
import WsSidebar from '../components/WsSidebar.vue'
import WsTopbar from '../components/WsTopbar.vue'
import ToastHost from '../components/ToastHost.vue'
import '../workspace.css'

const route = useRoute()
const { prefs } = usePreferences()
const menuOpen = ref(false)

const themeVars = computed(() => ({
  '--ws-accent': prefs.value.accent,
  '--ws-on-accent': ACCENTS.find((a) => a.value === prefs.value.accent)?.on ?? '#fff',
}))

// Đóng menu trên mobile khi chuyển trang
watch(() => route.fullPath, () => (menuOpen.value = false))
</script>

<template>
  <div class="ws" :data-theme="prefs.theme" :style="themeVars">
    <div class="ws__sidebar" :class="{ 'is-open': menuOpen }">
      <WsSidebar @navigate="menuOpen = false" />
    </div>
    <div v-if="menuOpen" class="ws__scrim" @click="menuOpen = false" />

    <div class="ws__main">
      <WsTopbar @toggle-menu="menuOpen = !menuOpen" />
      <main class="ws__content" :class="{ 'ws__content--fill': route.meta.fill }">
        <RouterView v-slot="{ Component }">
          <Transition name="ws-fade" mode="out-in">
            <!-- Các route cùng một màn (vd. đổi kênh chat) giữ nguyên component, không chạy hiệu ứng -->
            <component :is="Component" :key="route.meta.view ?? route.name" />
          </Transition>
        </RouterView>
      </main>
    </div>
    <ToastHost />
  </div>
</template>

<style scoped>
.ws {
  --topbar-h: 4.5rem;
  --sidebar-w: 16.5rem;
  display: grid;
  grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
  height: 100dvh;
  overflow: hidden;
}

.ws__sidebar {
  min-height: 0;
}

.ws__main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

/* Chỉ vùng nội dung cuộn; sidebar và topbar luôn cố định */
.ws__content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: clamp(1rem, min(2.2vw, 3vh), 2rem) clamp(1rem, 2.5vw, 2.5rem) clamp(1rem, 3vh, 2rem);
}

.ws__content > * {
  max-width: 100rem;
  margin-inline: auto;
}

/* Màn hình dạng ứng dụng (chat, cài đặt nhóm): chiếm trọn vùng nội dung, tự quản lý cuộn */
.ws__content--fill {
  overflow: hidden;
  padding: 0;
}

.ws__content--fill > * {
  max-width: none;
  height: 100%;
}

.ws__scrim {
  display: none;
}

.ws-fade-enter-active,
.ws-fade-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.ws-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.ws-fade-leave-to {
  opacity: 0;
}

/* Màn hẹp: sidebar thành ngăn kéo trượt từ trái */
@media (max-width: 64rem) {
  .ws {
    grid-template-columns: minmax(0, 1fr);
  }

  .ws__sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 40;
    width: min(var(--sidebar-w), 85vw);
    transform: translateX(-100%);
    transition: transform 0.25s ease;
  }

  .ws__sidebar.is-open {
    transform: none;
    box-shadow: var(--ws-shadow);
  }

  .ws__scrim {
    position: fixed;
    inset: 0;
    z-index: 35;
    display: block;
    background: var(--ws-overlay);
  }
}
</style>
