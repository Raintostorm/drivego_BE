# Hướng dẫn cài đặt DriveGo

Tài liệu này mô tả cách clone project, cấu hình môi trường, tạo database PostgreSQL, seed dữ liệu demo và chạy ứng dụng local.

## Yêu cầu

| Thành phần | Phiên bản gợi ý |
|------------|------------------|
| **Node.js** | 20 LTS trở lên |
| **npm** | 10+ (đi kèm Node) |
| **PostgreSQL** | 14+ |
| **Git** | Bất kỳ bản mới |

Tùy chọn (chỉ khi dùng đăng nhập Google / thanh toán / AI):

- Firebase project + file service account (`*firebase-adminsdk*.json` ở thư mục gốc repo)
- Cấu hình SePay, OpenAI… — xem [integrations.md](./integrations.md)

---

## 1. Clone và cài dependency

```bash
git clone https://github.com/Raintostorm/DriveGo.git
cd DriveGo
npm install
```

---

## 2. Cấu hình biến môi trường

### Cách nhanh (khuyến nghị)

```bash
npm run setup:env
```

Script tạo/cập nhật `frontend/.env`, `backend/.env`, `database/.env` từ file `.env.example`. Nếu có `firebase.txt` hoặc JSON service account ở thư mục gốc, các biến Firebase sẽ được điền tự động.

### Cách thủ công

Sao chép và chỉnh sửa:

| File | Biến quan trọng |
|------|------------------|
| `backend/.env` | `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `PORT` |
| `frontend/.env` | `VITE_API_URL` (mặc định `http://localhost:3000/api`) |
| `database/.env` | `DATABASE_URL` (cùng chuỗi với backend) |

**Ví dụ `DATABASE_URL`:**

```env
DATABASE_URL=postgresql://postgres:MAT_KHAU@localhost:5432/DriveGo
```

Tạo database trống trong PostgreSQL (tên ví dụ `DriveGo`):

```sql
CREATE DATABASE "DriveGo";
```

---

## 3. Kiểm tra kết nối database

```bash
npm run test:db
```

Nếu lỗi: kiểm tra PostgreSQL đang chạy, user/password, tên database và `DATABASE_URL` trong `backend/.env` hoặc `database/.env`.

---

## 4. Schema và migration

### Lần đầu (chưa có bảng)

1. Áp schema gốc:

```bash
psql "postgresql://postgres:MAT_KHAU@localhost:5432/DriveGo" -f database/schema/drivego.schema.sql
```

2. Chạy migration bổ sung (theo thứ tự, hoặc dùng `reset:db` ở bước 5 nếu đã có schema).

Các file migration nằm trong `database/migrations/` (`001` … `012`). Script root hỗ trợ từng file, ví dụ:

```bash
npm run migrate:applications
npm run migrate:admin-ops
npm run migrate:content-admin
npm run migrate:class-sessions
```

### Reset toàn bộ dữ liệu (giữ schema, làm sạch + seed + import nội dung)

Khi **đã có bảng** trong DB (đã chạy schema ít nhất một lần):

```bash
npm run reset:db
```

Lệnh này sẽ:

1. `TRUNCATE` tất cả bảng `public`
2. Áp lại migration `001`–`012` (idempotent)
3. `npm run seed:db` — tài khoản demo + dữ liệu mẫu
4. `npm run import:content:all` — chương lý thuyết + đề thi A1–B2

---

## 5. Seed database (không reset toàn bộ)

Chỉ seed demo (xóa và tạo lại user `@drivego.demo` và dữ liệu liên quan):

```bash
npm run seed:db
```

Import nội dung học/thi (sau khi đã có schema + license classes):

```bash
npm run import:content:all
```

Chi tiết dữ liệu seed: [database/seeds/README.md](../database/seeds/README.md).

---

## 6. Tài khoản demo

| Email | Mật khẩu | Vai trò |
|-------|----------|---------|
| `student@drivego.demo` | `DriveGo123!` | Học viên |
| `center@drivego.demo` | `DriveGo123!` | Quản trị trung tâm |
| `admin@drivego.demo` | `DriveGo123!` | Quản trị hệ thống |

- Học viên → `/student-dashboard`, hồ sơ tại `/application`
- Admin/Center → `/admin-dashboard` (đăng nhập email + mật khẩu, không dùng Google cho tài khoản demo)

---

## 7. Chạy ứng dụng

```bash
npm run dev
```

| Dịch vụ | URL |
|---------|-----|
| Frontend (Vite) | http://localhost:5173 |
| Backend API | http://localhost:3000/api |

Chỉ một phía:

```bash
npm run dev:fe   # frontend
npm run dev:be   # backend
```

Build production:

```bash
npm run build
```

---

## 8. Scripts database thường dùng

| Lệnh | Mô tả |
|------|--------|
| `npm run test:db` | Kiểm tra kết nối PostgreSQL |
| `npm run seed:db` | Seed tài khoản + dữ liệu demo |
| `npm run reset:db` | Truncate + migration + seed + import content |
| `npm run import:content:all` | Bootstrap + import A1, A2, B1, B2 |
| `npm run setup:env` | Tạo file `.env` từ example |

---

## 9. Xử lý sự cố

**`DATABASE_URL is required` khi chạy backend**  
→ Tạo `backend/.env` và điền `DATABASE_URL`.

**Frontend báo thiếu `VITE_API_URL`**  
→ Chạy `npm run setup:env` hoặc tạo `frontend/.env` với `VITE_API_URL=http://localhost:3000/api`.

**`reset:db` báo “No tables in public schema”**  
→ Chạy `database/schema/drivego.schema.sql` trước (mục 4).

**Đăng nhập Google lỗi**  
→ Cấu hình `FIREBASE_PROJECT_ID` và `GOOGLE_APPLICATION_CREDENTIALS` trong `backend/.env`. Có thể bỏ qua và dùng tài khoản demo email/mật khẩu.

**Hồ sơ `/application` không sửa được**  
→ Hard refresh; kiểm tra `GET /api/applications/me` (nếu `application: null` thì `POST /api/applications` phải tạo nháp). User Google mới không có hàng `license_applications` cho đến khi vào trang hồ sơ lần đầu.

---

## 10. Tài liệu liên quan

- **[Cài đặt đầy đủ & test thanh toán SePay](./SETUP-DAY-DU.md)** (ngrok, webhook, checklist clone repo)
- [Kiến trúc](./architecture.md)
- [Tích hợp bên thứ ba](./integrations.md)
- [Tóm tắt dự án / QA](./project-recap.md)
- [README database](../database/README.md)
