<script setup lang="ts">
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseModal from './BaseModal.vue'

const open = defineModel<boolean>('open', { required: true })
withDefaults(
  defineProps<{ title: string; description?: string; confirmLabel?: string; danger?: boolean }>(),
  { description: '', confirmLabel: 'Xác nhận', danger: false },
)
const emit = defineEmits<{ confirm: [] }>()

function confirm(): void {
  emit('confirm')
  open.value = false
}
</script>

<template>
  <BaseModal v-model:open="open" :title="title" :description="description">
    <slot />
    <template #footer>
      <BaseButton variant="secondary" class="ws-btn-auto" @click="open = false">Huỷ</BaseButton>
      <BaseButton :variant="danger ? 'danger' : 'primary'" class="ws-btn-auto" data-test="confirm" @click="confirm">
        {{ confirmLabel }}
      </BaseButton>
    </template>
  </BaseModal>
</template>
