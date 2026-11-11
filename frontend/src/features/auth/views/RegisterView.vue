<script setup lang="ts">
import { useRouter } from 'vue-router'
import BaseButton from '@/shared/components/BaseButton.vue'
import FormAlert from '@/features/auth/components/FormAlert.vue'
import FormField from '@/features/auth/components/FormField.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useForm } from '@/features/auth/composables/useForm'
import { email, required, sameAs, strongPassword, username } from '@/features/auth/utils/validators'

interface RegisterForm {
  username: string
  email: string
  password: string
  confirmPassword: string
}

const router = useRouter()
const auth = useAuth()

const { values, errors, formError, submitting, touch, handleSubmit } = useForm<RegisterForm>(
  { username: '', email: '', password: '', confirmPassword: '' },
  {
    username: [required('Nhập tên tài khoản.'), username()],
    email: [required('Nhập email.'), email()],
    password: [required('Nhập mật khẩu.'), strongPassword()],
    confirmPassword: [
      required('Nhập lại mật khẩu.'),
      sameAs<RegisterForm>('password', 'Mật khẩu xác nhận chưa khớp.'),
    ],
  },
)

const onSubmit = handleSubmit(async ({ username, email, password }) => {
  await auth.register({ username: username.trim(), email: email.trim(), password })
  await router.push({ name: 'login', query: { status: 'registered' } })
})
</script>

<template>
  <div class="auth-view">
    <header class="auth-header auth-header--compact">
      <h1 class="auth-title">ĐĂNG KÍ</h1>
      <FormAlert v-if="formError" tone="error">{{ formError }}</FormAlert>
    </header>

    <form class="auth-form" novalidate @submit.prevent="onSubmit">
      <FormField
        v-model="values.username"
        label="Tên tài khoản"
        name="username"
        autocomplete="username"
        autocapitalize="off"
        spellcheck="false"
        :error="errors.username"
        @blur="touch('username')"
      />
      <FormField
        v-model="values.email"
        label="Email"
        type="email"
        name="email"
        autocomplete="email"
        :error="errors.email"
        @blur="touch('email')"
      />
      <FormField
        v-model="values.password"
        label="Mật khẩu"
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

      <BaseButton type="submit" :loading="submitting">ĐĂNG KÍ</BaseButton>

      <p class="auth-subtitle switch-link">
        Đã có tài khoản?&nbsp;
        <RouterLink :to="{ name: 'login' }" class="auth-link">Đăng nhập</RouterLink>
      </p>
    </form>
  </div>
</template>

<style scoped>
.switch-link {
  text-align: center;
}
</style>
