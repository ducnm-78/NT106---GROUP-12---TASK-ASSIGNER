<script setup lang="ts">
import { useRoute } from 'vue-router'
import AuthLayout from '@/components/AuthLayout.vue'

const route = useRoute()
</script>

<template>
  <AuthLayout v-if="route.meta.layout === 'auth'" />
  <RouterView v-else />
</template>
