import { computed, ref } from 'vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import type { ProfileData } from '../types'
import { loadJSON, saveJSON } from './storage'

const PROFILES_KEY = 'taskflow:profiles'

/** Thông tin hồ sơ bổ sung (tên hiển thị, chức danh, ảnh…) lưu theo id người dùng. */
const profiles = ref<Record<string, Partial<ProfileData>>>(loadJSON(PROFILES_KEY, {}))

const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

export function useProfile() {
  const { user, isGuest } = useAuth()

  const profile = computed<ProfileData>(() => ({
    displayName: user.value?.username ?? '',
    jobTitle: '',
    timezone: localTimezone,
    avatar: null,
    ...(user.value ? profiles.value[user.value.id] : {}),
  }))

  const initials = computed(() => {
    const words = profile.value.displayName.trim().split(/\s+/).filter(Boolean)
    if (!words.length) return '?'
    const first = words[0][0]
    const last = words.length > 1 ? words[words.length - 1][0] : ''
    return (first + last).toUpperCase()
  })

  /** Tên ngắn để chào (từ cuối của họ tên tiếng Việt). */
  const firstName = computed(() => profile.value.displayName.trim().split(/\s+/).pop() ?? '')

  function update(patch: Partial<ProfileData>): void {
    const id = user.value?.id
    if (!id) return
    profiles.value = { ...profiles.value, [id]: { ...profiles.value[id], ...patch } }
    saveJSON(PROFILES_KEY, profiles.value)
  }

  return { user, isGuest, profile, initials, firstName, update }
}
