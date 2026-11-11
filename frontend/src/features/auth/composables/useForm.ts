import { nextTick, reactive, ref, shallowRef, watch } from 'vue'
import { AuthError } from '@/features/auth/services/AuthError'
import { getErrorMessage } from '@/features/auth/utils/errors'
import type { ValidationResult } from '@/features/auth/utils/validators'

export type FieldRule<T, K extends keyof T> = (value: T[K], values: T) => ValidationResult
export type FormRules<T> = { [K in keyof T]?: ReadonlyArray<FieldRule<T, K>> }
export type FormErrors<T> = Partial<Record<keyof T, string>>

/**
 * Quản lý giá trị, lỗi và trạng thái gửi của một form.
 * - Kiểm tra từng ô khi rời ô (blur), sau đó kiểm tra lại mỗi khi giá trị đổi.
 * - Lỗi từ server có `field` sẽ hiện dưới đúng ô đó; lỗi chung hiện ở `formError`.
 */
export function useForm<T extends object>(initial: T, rules: FormRules<T> = {}) {
  const values = reactive({ ...initial }) as T
  const errors = shallowRef<FormErrors<T>>({})
  const formError = ref('')
  const submitting = ref(false)
  const touched = new Set<keyof T>()
  const ruledFields = Object.keys(rules) as Array<keyof T>

  function runRules<K extends keyof T>(field: K): string {
    for (const rule of rules[field] ?? []) {
      const result = rule(values[field], values)
      if (result !== true) return result
    }
    return ''
  }

  function setFieldError(field: keyof T, message: string): void {
    const next: FormErrors<T> = { ...errors.value }
    if (message) next[field] = message
    else delete next[field]
    errors.value = next
  }

  function validateField(field: keyof T): boolean {
    const message = runRules(field)
    setFieldError(field, message)
    return !message
  }

  function touch(field: keyof T): void {
    touched.add(field)
    validateField(field)
  }

  function focusFirstInvalid(): void {
    void nextTick(() => {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    })
  }

  function validate(): boolean {
    let valid = true
    for (const field of ruledFields) {
      touched.add(field)
      if (!validateField(field)) valid = false
    }
    if (!valid) focusFirstInvalid()
    return valid
  }

  // Khi người dùng sửa, xoá lỗi chung và kiểm tra lại các ô đã chạm (kể cả ô phụ thuộc như "xác nhận mật khẩu")
  watch(
    () => ({ ...values }),
    () => {
      formError.value = ''
      for (const field of touched) validateField(field)
    },
  )

  function handleSubmit(onValid: (data: T) => unknown) {
    return async (): Promise<void> => {
      if (submitting.value) return
      formError.value = ''
      if (!validate()) return

      submitting.value = true
      try {
        await onValid({ ...values })
      } catch (error) {
        if (error instanceof AuthError && error.field && error.field in values) {
          setFieldError(error.field as keyof T, error.message)
          focusFirstInvalid()
        } else {
          formError.value = getErrorMessage(error)
        }
      } finally {
        submitting.value = false
      }
    }
  }

  return { values, errors, formError, submitting, touch, validate, setFieldError, handleSubmit }
}
