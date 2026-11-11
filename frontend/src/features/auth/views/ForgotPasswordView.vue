<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import FormAlert from '@/features/auth/components/FormAlert.vue'
import FormField from '@/features/auth/components/FormField.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useCountdown } from '@/features/auth/composables/useCountdown'
import { useForm } from '@/features/auth/composables/useForm'
import { email, required } from '@/features/auth/utils/validators'

interface ForgotPasswordForm {
  email: string
}

const RESEND_COOLDOWN_SECONDS = 60

const auth = useAuth()
const cooldown = useCountdown()

const sentTo = ref('')
const devToken = ref<string>()

const { values, errors, formError, submitting, touch, handleSubmit } = useForm<ForgotPasswordForm>(
  { email: '' },
  { email: [required('Nhập địa chỉ email của tài khoản.'), email()] },
)

const buttonLabel = computed(() => {
  if (cooldown.remaining.value > 0) return `Gửi lại sau ${cooldown.remaining.value} giây`
  return sentTo.value ? 'Gửi lại liên kết' : 'Gửi liên kết khôi phục'
})

const onSubmit = handleSubmit(async (data) => {
  const result = await auth.requestPasswordReset(data.email)
  sentTo.value = data.email.trim()
  devToken.value = result.devToken
  cooldown.start(RESEND_COOLDOWN_SECONDS)
})
</script>

<template>
  <div class="auth-view">
    <header class="auth-header">
      <h1 class="auth-title">QUÊN MẬT KHẨU</h1>
      <FormAlert v-if="formError" tone="error">{{ formError }}</FormAlert>
      <FormAlert v-else-if="sentTo" tone="success">
        Nếu {{ sentTo }} đã đăng kí TaskFlow, liên kết đặt lại mật khẩu đã được gửi tới hộp thư này.
        Liên kết có hiệu lực trong 15 phút.
        <template v-if="devToken">
          <br />
          Bản demo:
          <RouterLink :to="{ name: 'reset-password', query: { token: devToken } }">mở liên kết khôi phục</RouterLink>
        </template>
      </FormAlert>
    </header>

    <form class="auth-form" novalidate @submit.prevent="onSubmit">
      <FormField
        v-model="values.email"
        label="Địa chỉ email"
        type="email"
        name="email"
        autocomplete="email"
        :error="errors.email"
        @blur="touch('email')"
      />

      <BaseButton
        type="submit"
        class="auth-form__submit--nudge"
        :loading="submitting"
        :disabled="cooldown.remaining.value > 0"
      >
        {{ buttonLabel }}
      </BaseButton>

      <RouterLink :to="{ name: 'login' }" class="auth-link auth-back">
        <AppIcon name="arrow-left" :size="22" />
        Quay lại đăng nhập
      </RouterLink>
    </form>
  </div>
</template>
