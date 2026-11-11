<script setup lang="ts">
import AppIcon from './AppIcon.vue'
</script>

<template>
  <span class="logo">
    <span class="logo__mark">
      <AppIcon name="check-square" :size="30" :stroke-width="1.8" />
    </span>
    <span class="logo__text">TaskFlow</span>
  </span>
</template>

<style scoped>
.logo {
  display: inline-flex;
  align-items: center;
  gap: clamp(0.5rem, 0.55vw, 0.625rem);
}

.logo__mark {
  display: grid;
  place-items: center;
  width: clamp(2.75rem, 1.5rem + 1.7vw, 3.625rem);
  aspect-ratio: 1;
  border-radius: 25%;
  background: var(--color-brand-mark);
  color: #16172e;
}

.logo__text {
  font-family: var(--font-brand);
  font-size: clamp(1.5rem, 1rem + 0.85vw, 2rem);
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-ink);
}
</style>
