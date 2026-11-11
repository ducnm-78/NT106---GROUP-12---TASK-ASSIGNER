<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/shared/components/AppIcon.vue'
import { NAV_ITEMS } from '../routes'

const route = useRoute()
const item = computed(() => NAV_ITEMS.find((nav) => nav.name === route.name))
</script>

<template>
  <div class="ws-page">
    <header>
      <h1 class="ws-title">{{ route.meta.title }}</h1>
      <p class="ws-subtitle">Trang này đang được phát triển.</p>
    </header>

    <section class="soon">
      <span class="soon__icon"><AppIcon :name="item?.icon ?? 'sparkles'" :size="32" :stroke-width="1.8" /></span>
      <h2 class="soon__title">Sắp ra mắt</h2>
      <p class="soon__text">
        Mục “{{ route.meta.title }}” sẽ có trong bản cập nhật tới. Trong lúc chờ, bạn có thể theo dõi công việc ở trang Tổng quan.
      </p>
      <RouterLink :to="{ name: 'overview' }" class="soon__link">Về trang Tổng quan</RouterLink>
    </section>
  </div>
</template>

<style scoped>
.soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: clamp(2.5rem, 8vh, 5rem) 1.5rem;
  border: 1px dashed var(--ws-border-strong);
  border-radius: var(--ws-radius);
  background: var(--ws-surface);
  text-align: center;
}

.soon__icon {
  display: grid;
  place-items: center;
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 1.25rem;
  background: var(--ws-accent-soft);
  color: var(--ws-accent-text);
}

.soon__title {
  margin: 0.5rem 0 0;
  font-size: 1.25rem;
}

.soon__text {
  max-width: 28rem;
  margin: 0;
  color: var(--ws-text-2);
  font-size: 0.9375rem;
  line-height: 1.6;
}

.soon__link {
  margin-top: 0.5rem;
  color: var(--ws-accent-text);
  font-weight: 600;
}
</style>
