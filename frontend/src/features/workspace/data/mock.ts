import type { AppNotification } from '../types'

/**
 * Dữ liệu mẫu cho khu vực làm việc khi chưa có backend.
 * Ngày hạn được tính tương đối so với hôm nay để giao diện luôn có dữ liệu.
 */

/** Số giờ tập trung 7 ngày gần nhất, phần tử cuối là hôm nay. */
export const MOCK_FOCUS_HOURS = [3, 4.5, 4, 6, 5.5, 7, 6.2]

/** Số liệu hoạt động chưa có nguồn tính (sẽ lấy từ backend). */
export const MOCK_ACTIVITY = {
  streakDays: 7,
  bestStreakDays: 12,
  onTimeRate: 0.92,
}

export function createMockNotifications(): AppNotification[] {
  const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()
  return [
    { id: 'n1', title: 'Sắp đến hạn', body: '“Hoàn thiện luồng giới thiệu” bắt đầu lúc 09:30.', at: ago(20), read: false },
    { id: 'n2', title: 'Bình luận mới', body: 'Minh đã bình luận trong “Thiết kế UI/UX”.', at: ago(95), read: false },
    { id: 'n3', title: 'Tổng kết tuần', body: 'Bạn đã tập trung 36,2 giờ trong 7 ngày qua.', at: ago(60 * 26), read: true },
  ]
}
