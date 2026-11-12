<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/shared/components/AppIcon.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseCheckbox from '@/features/auth/components/BaseCheckbox.vue'
import FormAlert from '@/features/auth/components/FormAlert.vue'
import FormField from '@/features/auth/components/FormField.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import { authProvider } from '@/features/auth/services'
import { useForm } from '@/features/auth/composables/useForm'
import { getErrorMessage } from '@/features/auth/utils/errors'
import { safeRedirect } from '@/features/auth/utils/redirect'
import { required } from '@/features/auth/utils/validators'

interface LoginForm {
  username: string
  password: string
  remember: boolean
}

const STATUS_MESSAGES: Record<string, string> = {
  registered: 'Đã tạo tài khoản. Hãy xác nhận email trước khi đăng nhập.',
  'password-reset': 'Đã lưu mật khẩu mới. Đăng nhập bằng mật khẩu vừa đặt.',
}

const route = useRoute()
const router = useRouter()
const auth = useAuth()

const { values, errors, formError, submitting, touch, handleSubmit } = useForm<LoginForm>(
  { username: '', password: '', remember: true },
  {
    username: [required('Nhập email.')],
    password: [required('Nhập mật khẩu.')],
  },
)

const guestLoading = ref(false)
const statusMessage = computed(() => STATUS_MESSAGES[String(route.query.status ?? '')] ?? '')

const goToApp = () => router.replace(safeRedirect(route.query.redirect))

const onSubmit = handleSubmit(async (data) => {
  await auth.login(data)
  await goToApp()
})

async function onGuestLogin(): Promise<void> {
  guestLoading.value = true
  formError.value = ''
  try {
    await auth.loginAsGuest()
    await goToApp()
  } catch (error) {
    formError.value = getErrorMessage(error)
  } finally {
    guestLoading.value = false
  }
}
</script>

<template>
  <div class="auth-view">
    <header class="auth-header">
      <h1 class="auth-title">ĐĂNG NHẬP</h1>
      <p class="auth-subtitle">
        Chưa có tài khoản?&nbsp;
        <RouterLink :to="{ name: 'register' }" class="auth-link">Đăng kí ngay</RouterLink>
      </p>
      <FormAlert v-if="formError" tone="error">{{ formError }}</FormAlert>
      <FormAlert v-else-if="statusMessage" tone="success">{{ statusMessage }}</FormAlert>
    </header>

    <form class="auth-form" novalidate @submit.prevent="onSubmit">
      <FormField
        v-model="values.username"
        :label="authProvider === 'supabase' ? 'Email' : 'Tên tài khoản hoặc email'"
        name="username"
        :autocomplete="authProvider === 'supabase' ? 'email' : 'username'"
        autocapitalize="off"
        spellcheck="false"
        :error="errors.username"
        @blur="touch('username')"
      />
      <FormField
        v-model="values.password"
        label="Mật khẩu"
        type="password"
        name="password"
        autocomplete="current-password"
        :error="errors.password"
        @blur="touch('password')"
      />

      <div class="auth-form__row">
        <BaseCheckbox v-model="values.remember">Ghi nhớ tôi</BaseCheckbox>
        <RouterLink :to="{ name: 'forgot-password' }" class="auth-link">Quên mật khẩu?</RouterLink>
      </div>

      <BaseButton type="submit" :loading="submitting" :disabled="guestLoading">ĐĂNG NHẬP</BaseButton>

      <BaseButton
        variant="secondary"
        class="guest-button"
        :loading="guestLoading"
        :disabled="submitting"
        @click="onGuestLogin"
      >
        <template #icon><AppIcon name="user-circle" :size="36" :stroke-width="1.6" /></template>
        Đăng nhập bằng Khách
      </BaseButton>
    </form>
  </div>
</template>

<style scoped>
.guest-button {
  margin-top: 0.25rem;
}
</style>
