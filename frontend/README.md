# TaskFlow – Giao diện xác thực (Vue 3 + TypeScript)

Bốn màn hình theo thiết kế: **Đăng nhập**, **Đăng kí**, **Quên mật khẩu** (nhập email) và **Đặt mật khẩu mới**.

## Chạy dự án

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # kiểm tra kiểu (vue-tsc) rồi build
```

Tài khoản demo có sẵn: `demo` / `Demo1234` (hoặc đăng nhập bằng `demo@taskflow.vn`).

## Chức năng

- **Đăng nhập** bằng tên tài khoản hoặc email; "Ghi nhớ tôi" lưu phiên vào `localStorage`, bỏ chọn thì lưu vào `sessionStorage` (mất khi đóng tab); đăng nhập bằng Khách.
- **Đăng kí** kiểm tra định dạng tên tài khoản, email, độ mạnh mật khẩu, mật khẩu xác nhận; báo trùng tên/email ngay dưới ô nhập.
- **Quên mật khẩu** gửi liên kết khôi phục, có đếm ngược 60 giây trước khi gửi lại. Ở chế độ giả lập, thông báo có sẵn đường dẫn để mở trang đặt lại mật khẩu.
- **Đặt mật khẩu mới** kiểm tra token trong URL (`/reset-password?token=...`), hết hạn sau 15 phút.
- Hiện/ẩn mật khẩu, kiểm tra lỗi khi rời ô, tự focus vào ô lỗi đầu tiên, trạng thái loading trên nút.
- Router guard: trang cần đăng nhập chuyển về `/login?redirect=...`; người đã đăng nhập không vào lại được trang đăng nhập/đăng kí.
- Khối màu tím trượt sang trái/phải khi chuyển giữa Đăng nhập và Đăng kí; trên màn hẹp (< 900px) khối tím được ẩn.

## Cấu trúc

```
src/
├─ components/      AuthLayout, FormField, BaseButton, BaseCheckbox, FormAlert, AppLogo, AppIcon
├─ composables/     useAuth (phiên đăng nhập), useForm (form + validate), useCountdown
├─ services/        AuthService (interface), mockAuthService, httpAuthService, AuthError
├─ router/          định nghĩa route + guard
├─ types/           kiểu dữ liệu User, AuthSession, payload…
├─ utils/           validators, xử lí lỗi, redirect an toàn
├─ views/           LoginView, RegisterView, ForgotPasswordView, ResetPasswordView, HomeView
└─ styles/main.css  biến màu, cỡ chữ, class dùng chung
```

## Nối với API thật

Mặc định app dùng `mockAuthService` (lưu dữ liệu giả trong trình duyệt). Để gọi backend:

```bash
cp .env.example .env
# sửa trong .env:
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=https://api.cua-ban.vn
```

Danh sách endpoint mà `httpAuthService` gọi nằm ở đầu file `src/services/httpAuthService.ts`; đổi đường dẫn cho khớp backend. Lỗi từ server dạng `{ "message": "...", "field": "email" }` sẽ hiện ngay dưới ô tương ứng.
