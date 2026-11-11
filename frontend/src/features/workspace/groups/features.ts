/**
 * Công tắc tính năng của phần Nhóm.
 *
 * `voice` — Gọi thoại / chia sẻ màn hình: để dành cho bản mở rộng (cần backend WebRTC).
 * Khi tắt: kênh thoại vẫn hiển thị nhưng gắn nhãn “Sắp có”, không tham gia được,
 * và không tạo được kênh thoại mới. Đổi thành `true` để bật lại giao diện mô phỏng.
 */
export const FEATURES = {
  voice: false,
}

export const VOICE_SOON_MESSAGE = 'Gọi thoại là tính năng mở rộng, sẽ có trong phiên bản sau.'
