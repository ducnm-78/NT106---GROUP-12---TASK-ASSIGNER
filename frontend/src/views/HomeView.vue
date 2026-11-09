<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppLogo from '@/components/AppLogo.vue'
import BaseButton from '@/components/BaseButton.vue'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { user, isGuest, logout } = useAuth()
const loggingOut = ref(false)

async function onLogout(): Promise<void> {
  loggingOut.value = true
  await logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <main class="home">
    <section class="home__card">
      <AppLogo />
      <h1 class="home__title">Xin chào, {{ user?.username }}</h1>
      <p v-if="isGuest" class="home__note">
        Bạn đang dùng chế độ Khách. Công việc sẽ không được lưu sau khi đăng xuất.
      </p>
      <p v-else class="home__note">Đã đăng nhập bằng {{ user?.email }}.</p>
      <BaseButton :loading="loggingOut" @click="onLogout">Đăng xuất</BaseButton>
    </section>
  </main>
</template>

<style scoped>
.home {
  display: grid;
  place-items: center;
  min-height: 100dvh;
  padding: 1.5rem;
}

.home__card {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: min(100%, 32rem);
  padding: clamp(1.75rem, 4vw, 3rem);
  border-radius: 2.5rem;
  background: var(--color-surface);
}

.home__title {
  margin: 0.5rem 0 0;
  font-size: var(--fs-title);
  line-height: 1.2;
}

.home__note {
  margin: 0;
  font-size: var(--fs-body);
  color: var(--color-ink-muted);
  line-height: 1.5;
}
</style>
