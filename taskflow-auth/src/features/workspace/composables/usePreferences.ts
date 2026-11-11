import { readonly, ref } from 'vue'
import { DEFAULT_ACCENT } from '../data/constants'
import type { Preferences } from '../types'
import { loadJSON, saveJSON } from './storage'

const PREFS_KEY = 'taskflow:preferences'

const DEFAULTS: Preferences = {
  theme: 'dark',
  accent: DEFAULT_ACCENT,
  notifications: { taskReminders: true, weeklySummary: true, mentions: true, email: false },
}

function load(): Preferences {
  const stored = loadJSON<Partial<Preferences>>(PREFS_KEY, {})
  return {
    ...DEFAULTS,
    ...stored,
    notifications: { ...DEFAULTS.notifications, ...stored.notifications },
  }
}

const prefs = ref<Preferences>(load())

/** Bản sao thuần (không phải proxy reactive) để làm bản nháp hoặc lưu. */
export function clonePreferences(source: Preferences): Preferences {
  return { ...source, notifications: { ...source.notifications } }
}

export function usePreferences() {
  /** Lưu cài đặt đã chỉnh (form Cài đặt giữ bản nháp, chỉ áp dụng khi bấm Lưu). */
  function save(next: Preferences): void {
    prefs.value = clonePreferences(next)
    saveJSON(PREFS_KEY, prefs.value)
  }

  return { prefs: readonly(prefs), save }
}
