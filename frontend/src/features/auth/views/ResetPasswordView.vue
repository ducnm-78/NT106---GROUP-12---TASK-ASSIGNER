<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseButton from '@/shared/components/BaseButton.vue'
import FormAlert from '@/features/auth/components/FormAlert.vue'
import FormField from '@/features/auth/components/FormField.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useForm } from '@/features/auth/composables/useForm'
import { required, sameAs, strongPassword } from '@/features/auth/utils/validators'

interface ResetPasswordForm {
  password: string
  confirmPassword: string
}

type TokenState = 'checking' | 'valid' | 'invalid'

const route = useRoute()
const router = useRouter()
const auth = useAuth()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const tokenState = ref<TokenState>('checking')

const { values, errors, formError, submitting, touch, handleSubmit } = useForm<ResetPasswordForm>(
  { password: '', confirmPassword: '' },
  {
    password: [required('Nhập mật khẩu mới.'), strongPassword()],
    confirmPassword: [
      required('Nhập lại mật khẩu mới.'),
      sameAs<ResetPasswordForm>('password', 'Mật khẩu xác nhận chưa khớp.'),
    ],
  },
)

onMounted(async () => {
  if (!token.value) {
    tokenState.value = 'invalid'
    return
  }
  try {
    tokenState.value = (await auth.verifyResetToken(token.value)) ? 'valid' : 'invalid'
  } catch {
    tokenState.value = 'invalid'
  }
})

const onSubmit = handleSubmit(async ({ password }) => {
  await auth.resetPassword({ token: token.value, password })
  await router.replace({ name: 'login', query: { status: 'password-reset' } })
})
</script>

<template>
  <div class="auth-view">
    <header class="auth-header">
      <h1 class="auth-title">QUÊN MẬT KHẨU</h1>
      <FormAlert v-if="tokenState === 'checking'" tone="info">Đang kiểm tra liên kết khôi phục…</FormAlert>
      <FormAlert v-else-if="tokenState === 'invalid'" tone="error">
        Liên kết khôi phục không hợp lệ hoặc đã hết hạn.
        <RouterLink :to="{ name: 'forgot-password' }">Gửi liên kết mới</RouterLink>
      </FormAlert>
      <FormAlert v-else-if="formError" tone="error">{{ formError }}</FormAlert>
    </header>

    <form novalidate @submit.prevent="onSubmit">
      <fieldset class="auth-form auth-fieldset" :disabled="tokenState !== 'valid'">
        <legend class="visually-hidden">Đặt mật khẩu mới</legend>
        <FormField
          v-model="values.password"
          label="Mật khẩu mới"
          type="password"
          name="new-password"
          autocomplete="new-password"
          :error="errors.password"
          @blur="touch('password')"
        />
        <FormField
          v-model="values.confirmPassword"
          label="Xác nhận mật khẩu"
          type="password"
          name="confirm-password"
          autocomplete="new-password"
          :error="errors.confirmPassword"
          @blur="touch('confirmPassword')"
        />

        <BaseButton type="submit" class="auth-form__submit--spaced" :loading="submitting">
          Lưu mật khẩu
        </BaseButton>
      </fieldset>
    </form>
  </div>
</template>
