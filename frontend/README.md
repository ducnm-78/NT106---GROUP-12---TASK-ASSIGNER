# TaskFlow – Đồ án NT106 Nhóm 12 (Vue 3 + TypeScript)

Hai khu vực tách riêng:

- **Xác thực** (`features/auth`): Đăng nhập, Đăng kí, Quên mật khẩu, Đặt mật khẩu mới.
- **Không gian làm việc** (`features/workspace`): Tổng quan, Lịch, Công việc, Nhóm, Hồ sơ cá nhân, Cài đặt; Thống kê đang là trang "Sắp ra mắt".

## Chạy dự án

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # kiểm tra kiểu (vue-tsc) rồi build
npm test           # unit test (vitest) cho kho dữ liệu Công việc, Nhóm và Lịch
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

## Không gian làm việc

- **Tổng quan**: số liệu chính, biểu đồ giờ tập trung 7 ngày (rê chuột xem từng ngày), biểu đồ phân bổ trạng thái, danh sách việc hôm nay (tích để hoàn thành), tiến độ dự án, nút **Tạo công việc**.
- **Hồ sơ cá nhân**: bấm vào avatar để đổi ảnh (JPG/PNG ≤ 5 MB, kéo thả hoặc chọn tệp; ảnh được cắt vuông và thu nhỏ), **Chỉnh sửa hồ sơ** để đổi tên, chức danh, múi giờ.
- **Cài đặt** (`/settings?tab=...`): Tài khoản, Giao diện (theme tối/sáng, 5 màu chủ đạo), Thông báo, Bảo mật, Kết nối. Thay đổi chỉ áp dụng khi bấm **Lưu thay đổi**.
- Topbar: tìm việc/dự án (không phân biệt dấu), thông báo, menu tài khoản (Hồ sơ, Cài đặt, Đăng xuất).
- Dưới 1024px sidebar thành ngăn kéo mở bằng nút menu.
- Dữ liệu công việc là dữ liệu mẫu (`features/workspace/tasks/seed.ts`), lưu thay đổi vào `localStorage` theo từng tài khoản.

## Công việc (`/tasks`)

- 4 trạng thái **Cần làm → Đang làm → Chờ duyệt → Hoàn tất**; mỗi việc có mã `TF-xxx`, ưu tiên, nhãn, người phụ trách, người duyệt, hạn chót, việc con, bình luận và lịch sử thay đổi.
- **Bảng (Kanban)**: gom làn theo Nhóm / Người phụ trách / Ưu tiên / Không gom; làn có tiến độ, avatar thành viên, nút mở kênh nhóm, thu gọn (nhớ sau khi tải lại).
  **Kéo thả** thẻ sang cột khác để đổi trạng thái, sang làn khác để đổi nhóm/người/ưu tiên, kéo lên xuống để sắp thứ tự; trang tự cuộn khi kéo gần mép; `Esc` huỷ.
  Bàn phím: `Enter` mở thẻ, `Alt + ←/→` chuyển cột. Thêm nhanh ngay trong ô hoặc bằng nút `+` trên cột.
- **Danh sách**: sắp xếp theo cột, đổi trạng thái/ưu tiên/hạn/người phụ trách ngay trên dòng, ẩn/hiện việc đã hoàn tất theo nhóm.
  **Chọn nhiều** để đổi trạng thái, giao cho, đặt hạn chót, đổi ưu tiên, chuyển nhóm hoặc xoá cùng lúc.
- **Bộ lọc**: tìm theo tên (không dấu), mã `TF-128` hoặc nhãn (phím `/`); phạm vi nhóm; ưu tiên; avatar người phụ trách; **Chỉ việc của tôi** (gồm việc chờ mình duyệt).
- **Chi tiết** (`/tasks?task=TF-128`): sửa tên/mô tả tại chỗ, đổi thuộc tính, nhãn, việc con; **Duyệt và hoàn tất / Yêu cầu sửa** (người duyệt) hoặc **Nhắc duyệt**;
  bình luận có `@nhắc tên`; tab Hoạt động; sao chép liên kết, nhân bản, **gửi thẻ công việc vào kênh nhóm**, **Mở trong #chung**.
- Mọi thay đổi trạng thái/hàng loạt/xoá đều có nút **Hoàn tác**. Phím `N` tạo việc mới.
- Liên kết: mỗi nhóm bên mục Nhóm có một dự án tương ứng (tạo/đổi tên/xoá nhóm tự cập nhật); kế hoạch AI tạo việc vào đúng nhóm;
  sidebar hiện số việc cần bạn xử lý, bấm dự án để lọc; thanh tìm kiếm trên cùng và mục "Ưu tiên hôm nay" mở thẳng chi tiết việc.

## Nhóm (`/team`)

- **Trò chuyện**: thanh nhóm (badge chưa đọc / nhắc tên), danh sách kênh theo danh mục (văn bản, thông báo, thoại, kênh riêng tư), sự kiện sắp tới của nhóm.
  Tin nhắn có @mention (gợi ý khi gõ `@`), trả lời, luồng (thread), reaction, ghim, đính kèm tệp, tìm trong kênh, mốc "Tin nhắn mới", bản nháp riêng theo kênh.
- **Trợ lý AI**: nhắc `@Trợ lý AI lập kế hoạch …` (hoặc nhắn trong `#kế-hoạch-ai`) → AI trả về thẻ kế hoạch; bấm **Tạo N công việc** để thêm vào mục Công việc. "tóm tắt" → tóm tắt kênh hôm nay.
- **Thành viên**: danh sách theo vai trò hiển thị riêng, trạng thái online/vắng/không làm phiền/ngoại tuyến; bấm vào người để xem hồ sơ và **gán/gỡ vai trò**.
- **Kênh thoại** *(tính năng mở rộng – “Sắp có”)*: kênh thoại hiển thị nhưng chưa tham gia/tạo mới được. Giao diện mô phỏng (tắt mic, chia sẻ màn hình…) vẫn giữ trong code; bật lại bằng `FEATURES.voice = true` trong `src/features/workspace/groups/features.ts`.
- **Tạo nhóm** theo mẫu (Dự án, Học tập, Câu lạc bộ, Tự tạo) kèm thành viên; **Tham gia** bằng mã mời (vd. `UIT-CODE`, `VUE-VN`, `STUDY-AI`) hoặc từ danh sách khám phá.
- **Tạo kênh**: loại kênh, danh mục, chủ đề, riêng tư theo vai trò, bật/tắt AI.
- **Cài đặt nhóm** (`/team/:id/settings/:mục`): Tổng quan, Vai trò & quyền (thứ bậc, 14 quyền, ADMINISTRATOR), Kênh & AI, Thành viên (lọc, biệt danh, tạm khoá, mời ra, cấm), Lời mời, Kiểm duyệt tự động (từ cấm, chặn link, giới hạn nhắc), Danh sách cấm, Nhật ký.
  Mục không đủ quyền hiển thị thông báo khoá.

## Lịch (`/calendar`)

- Lịch tháng (bắt đầu thứ Hai), danh sách sự kiện của ngày và sự kiện sắp tới; tạo/sửa/xoá sự kiện.
- **Tạo sự kiện kèm thành viên** với tuỳ chọn **"Tạo nhóm cho sự kiện"** (bật sẵn): đồng thời tạo một Nhóm cùng tên với đúng các thành viên đã chọn (nguồn tham gia "Từ sự kiện Lịch"), đăng thẻ sự kiện vào `#chung` và liên kết hai chiều.
- Thêm người vào sự kiện đã liên kết → tự thêm vào nhóm. Sự kiện chưa có nhóm có nút **Tạo nhóm cho sự kiện**. Xoá sự kiện vẫn giữ nhóm.

## Cấu trúc

```
src/
├─ main.ts, App.vue
├─ router/index.ts            ghép route của các khu vực + guard đăng nhập
├─ shared/                    dùng chung cho cả hai khu vực
│  ├─ components/             AppIcon, AppLogo, BaseButton
│  └─ styles/base.css         biến màu gốc, reset
└─ features/
   ├─ auth/                   khu vực xác thực
   │  ├─ layouts/AuthLayout.vue
   │  ├─ views/               Login, Register, ForgotPassword, ResetPassword
   │  ├─ components/          FormField, BaseCheckbox, FormAlert
   │  ├─ composables/         useAuth (phiên đăng nhập), useForm, useCountdown
   │  ├─ services/            AuthService, mockAuthService, httpAuthService
   │  ├─ utils/, types.ts, routes.ts, auth.css
   └─ workspace/              khu vực làm việc sau khi đăng nhập
      ├─ layouts/WorkspaceLayout.vue   sidebar + topbar, chỉ vùng nội dung cuộn
      ├─ views/               Overview, Profile, Settings, ComingSoon
      ├─ groups/              Nhóm: types, data (dữ liệu mẫu, quyền), useGroups (kho + phân quyền),
      │                       components/ (chat, kênh, thành viên, modal), settings/, views/
      ├─ calendar/            Lịch: useCalendar (tạo nhóm từ sự kiện), CalendarView, EventModal
      ├─ tasks/               Công việc: taskStore (kho, hoàn tác), useTaskView (lọc, gom làn, sắp xếp),
      │                       seed, taskFormat, TasksView, components/ (Bảng, Danh sách, Chi tiết, menu chọn)
      ├─ components/          WsSidebar, WsTopbar, PanelCard, StatCard, biểu đồ, modal…
      ├─ composables/         useWorkspace (số liệu tổng quan), useProfile, usePreferences, useToast
      ├─ data/                hằng số, dữ liệu mẫu
      ├─ utils/, types.ts, routes.ts, workspace.css (theme tối/sáng)
tests/unit/                   vitest: tasks.spec.ts, groups.spec.ts, calendar.spec.ts
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
