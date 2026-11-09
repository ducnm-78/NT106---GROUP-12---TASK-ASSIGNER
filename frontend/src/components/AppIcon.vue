<script setup lang="ts">
export type IconName = 'eye' | 'eye-off' | 'check' | 'user-circle' | 'arrow-left' | 'check-square'

withDefaults(defineProps<{ name: IconName; size?: number | string; strokeWidth?: number }>(), {
  size: 24,
  strokeWidth: 2,
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <template v-if="name === 'eye'">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </template>
    <template v-else-if="name === 'eye-off'">
      <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M6.6 6.6A13.5 13.5 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="m2 2 20 20" />
    </template>
    <path v-else-if="name === 'check'" d="m5 12.5 4.5 4.5L19 7" />
    <template v-else-if="name === 'user-circle'">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3.2" />
      <path d="M6.2 18.8a7 7 0 0 1 11.6 0" />
    </template>
    <template v-else-if="name === 'arrow-left'">
      <path d="M20 12H4" />
      <path d="m10 18-6-6 6-6" />
    </template>
    <template v-else-if="name === 'check-square'">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <path d="m8 12.3 2.8 2.8L16.2 9" />
    </template>
  </svg>
</template>
