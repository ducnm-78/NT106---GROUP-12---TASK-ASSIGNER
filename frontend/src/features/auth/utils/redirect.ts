import type { LocationQueryValue } from 'vue-router'

/** Chỉ chấp nhận đường dẫn nội bộ để tránh open redirect. */
export function safeRedirect(
  value: LocationQueryValue | LocationQueryValue[] | undefined,
  fallback = '/overview',
): string {
  const target = Array.isArray(value) ? value[0] : value
  if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')) {
    return target
  }
  return fallback
}
