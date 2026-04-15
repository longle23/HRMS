# HRMS - Candidate Outreach Portal

Web nội bộ cho HR để:

- Đọc danh sách ứng viên từ NocoDB
- Gửi mail mẫu qua Outlook (Reject / Invite Interview)
- Lưu lịch sử thao tác (ai làm, khi nào, trạng thái sau thao tác)

## 1) Cài đặt

```bash
npm install
```

Tạo file `.env.local` từ `.env.example`:

```bash
copy .env.example .env.local
```

## 2) Cấu hình NocoDB

Thiết lập các biến:

- `NOCODB_BASE_URL`: URL NocoDB (ví dụ `http://localhost:8080`)
- `NOCODB_API_TOKEN`: API token của NocoDB
- `NOCODB_CANDIDATES_TABLE`: ID bảng ứng viên
- `NOCODB_ACTIONS_TABLE`: ID bảng log thao tác
- `NOCODB_ACCOUNTS_TABLE`: ID bảng tài khoản đăng nhập

### Gợi ý cột bảng ứng viên

- `full_name`
- `email`
- `apply_position`
- `Status`
- `LastActionBy`
- `LastActionAt`

### Gợi ý cột bảng log thao tác

- `CandidateName`
- `Actor`
- `Action`
- `ActionTime`
- `StatusAfter`

### Gợi ý cột bảng Account

- `username`
- `password`
- `full_name`
- `email`

## 3) Chạy local

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

## 4) Cách dùng

1. Đăng nhập bằng tài khoản trong bảng `Account`
2. Tìm kiếm ứng viên theo `full_name`, `email`, `apply_position`
3. Chọn ứng viên và bấm:
   - `Reject (Outlook)`: mở Outlook với mail từ chối prefill sẵn
   - `Invite Interview (Outlook)`: mở Outlook với mail mời phỏng vấn prefill sẵn
4. Hệ thống tự cập nhật trạng thái ứng viên và ghi log hành động theo user đăng nhập

## Lưu ý gửi mail

- Hệ thống chỉ mở ứng dụng mail mặc định trên máy qua `mailto:` (không mở Outlook Web).
- Để luôn gửi bằng `hr-support@sotransgroup.vn`, hãy đăng nhập tài khoản đó trong Outlook Desktop và đặt làm account gửi mặc định.
