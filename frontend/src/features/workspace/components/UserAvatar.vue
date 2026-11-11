<script setup lang="ts">
withDefaults(defineProps<{ initials: string; src?: string | null; size?: string }>(), {
  src: null,
  size: '2.5rem',
})
</script>

<template>
  <span class="avatar" :style="{ '--size': size }">
    <img v-if="src" :src="src" alt="" class="avatar__img" />
    <span v-else class="avatar__text">{{ initials }}</span>
  </span>
</template>

<style scoped>
.avatar {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: var(--size);
  height: var(--size);
  overflow: hidden;
  border-radius: 50%;
  background: linear-gradient(135deg, #4b6a92, #36506f);
  color: #fff;
  font-size: calc(var(--size) * 0.38);
  font-weight: 700;
  line-height: 1;
}

.avatar__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
