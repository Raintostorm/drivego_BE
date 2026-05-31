# DriveGo — Cài đặt đầy đủ & test thanh toán SePay

Tài liệu này dành cho người **clone repo từ GitHub** và cần chạy được toàn bộ tính năng (đặc biệt **thanh toán SePay**).  
Xem thêm: [HUONG-DAN-CAI-DAT.md](./HUONG-DAN-CAI-DAT.md) (cài đặt cơ bản), [integrations.md](./integrations.md) (tích hợp).

---

## Yêu cầu hệ thống

| Thành phần | Ghi chú |
|------------|---------|
| **Node.js** | 20 LTS trở lên |
| **npm** | 10+ |
| **PostgreSQL** | 14+ |
| **Git** | Clone repo |
| **ngrok** (tuỳ chọn) | Chỉ khi test **webhook** SePay trên máy local |

---

## Phân biệt: hiện QR vs tự xác nhận thanh toán

| Mục tiêu | Cần gì | `npm run dev:all` / ngrok? |
|----------|--------|----------------------------|
| **Hiện mã QR** trên `/enroll` hoặc `/upgrade` | Backend chạy + `SEPAY_BANK_*` trong `backend/.env` | **Không** |
| **Tự chuyển trạng thái `paid`** sau chuyển khoản | Webhook SePay → backend + cấu hình [my.sepay.vn](https://my.sepay.vn) | **Có** (ngrok trên local) |

- `npm run dev` = frontend (:5173) + backend (:3000).
- `npm run dev:all` = `dev` **+** tunnel ngrok tới cổng 3000.
- `dev:all` **không thay** việc tạo database, seed, hay điền file `.env`.

---

## Checklist nhanh (clone → test thanh toán)

```text
[ ] Node 20+, PostgreSQL 14+, Git
[ ] git clone <repo> && cd <thư-mục> && npm install
[ ] npm run setup:env → chỉnh backend/.env, database/.env, frontend/.env
[ ] Tạo DB PostgreSQL tên DriveGo
[ ] npm run test:db
[ ] npm run reset:db   (lần đầu; hoặc schema + migrate thủ công — xem HUONG-DAN-CAI-DAT)
[ ] backend/.env: JWT_SECRET, DATABASE_URL, SEPAY_BANK_*, SEPAY_PAYMENT_CODE_PREFIX
[ ] frontend/.env: VITE_API_URL=http://localhost:3000/api
[ ] npm run dev
[ ] Đăng nhập student@drivego.demo / DriveGo123!
[ ] /enroll?class=A2 → "Tạo mã thanh toán SePay" → thấy QR

--- Chỉ khi test chuyển khoản thật + tự unlock khóa ---
[ ] Cài ngrok; (tuỳ chọn) NGROK_PATH trong .env gốc repo
[ ] npm run dev:all
[ ] Đăng ký webhook SePay: https://<ngrok-host>/api/payments/sepay/webhook
[ ] SEPAY_WEBHOOK_API_KEY hoặc SEPAY_WEBHOOK_HMAC_SECRET khớp SePay
[ ] Chuyển đúng số tiền + đúng nội dung CK (mã DH... / DG... theo prefix)
```

---

## Bước 1 — Clone và cài dependency

```bash
git clone https://github.com/Raintostorm/DriveGo.git
cd DriveGo
npm install
```

---

## Bước 2 — Biến môi trường

```bash
npm run setup:env
```

Script tạo `frontend/.env`, `backend/.env`, `database/.env` từ file `.env.example`. **Không commit** file `.env` lên Git.

### `backend/.env` (bắt buộc)

```env
PORT=3000
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://postgres:MAT_KHAU@localhost:5432/DriveGo
JWT_SECRET=<chuỗi-ngẫu-nhiên-ít-nhất-16-ký-tự-không-dùng-change-me>

# SePay — bắt buộc để hiện QR
SEPAY_PAYMENT_CODE_PREFIX=DH
SEPAY_BANK_NAME=<mã-ngân-hàng-theo-tài-liệu-SePay>
SEPAY_BANK_ACCOUNT=<số-tài-khoản>
SEPAY_ACCOUNT_HOLDER=<tên-chủ-tài-khoản>

# SePay — bắt buộc để webhook hoạt động (production/staging nên bật)
SEPAY_WEBHOOK_API_KEY=<từ-my.sepay.vn>
# hoặc
SEPAY_WEBHOOK_HMAC_SECRET=<secret-từ-SePay>
```

| Biến | Bắt buộc | Ghi chú |
|------|----------|---------|
| `JWT_SECRET` | Có | Backend **không khởi động** nếu thiếu hoặc &lt; 16 ký tự |
| `DATABASE_URL` | Có | Cùng chuỗi với `database/.env` |
| `SEPAY_BANK_ACCOUNT` | Có (QR) | Thiếu → API trả 503 *"SePay chưa cấu hình"* |
| `SEPAY_BANK_NAME` | Có (QR) | Sai mã → ảnh QR từ `qr.sepay.vn` có thể lỗi |
| `SEPAY_PAYMENT_CODE_PREFIX` | Có (webhook) | Phải **trùng** prefix mã CK (ví dụ `DH3892394D` → prefix `DH`) |
| `SEPAY_WEBHOOK_API_KEY` / `SEPAY_WEBHOOK_HMAC_SECRET` | Có (webhook) | Ở `NODE_ENV=development`, nếu **không** set cả hai → webhook local không bắt auth |

### `frontend/.env`

```env
VITE_API_URL=http://localhost:3000/api
```

### `database/.env`

```env
DATABASE_URL=<giống-backend>
```

### `.env` ở thư mục gốc repo (chỉ khi dùng `dev:all`)

```env
NGROK_PATH=C:\duong\dan\toi\ngrok.exe
```

---

## Bước 3 — Database

Tạo database trống:

```sql
CREATE DATABASE "DriveGo";
```

Kiểm tra kết nối:

```bash
npm run test:db
```

**Lần đầu (khuyến nghị):**

```bash
npm run reset:db
```

Lệnh này: truncate → migration `001`–`012` → seed demo → import nội dung học/thi A1–B2.

**Chỉ seed lại tài khoản demo** (đã có schema):

```bash
npm run seed:db
npm run import:content:all
```

---

## Bước 4 — Chạy ứng dụng

```bash
npm run dev
```

| Dịch vụ | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000/api |

Chỉ một phía:

```bash
npm run dev:fe   # frontend
npm run dev:be   # backend
```

**Kèm ngrok (webhook):**

```bash
npm run dev:all
```

Hoặc Windows: `start-dev.bat`.

---

## Bước 5 — Test thanh toán (chỉ hiện QR)

1. Mở http://localhost:5173/login  
2. Đăng nhập: `student@drivego.demo` / `DriveGo123!`  
3. Vào **Bảng giá** `/pricing` → **Đăng ký & thanh toán** (hạng A1/A2/B1/B2)  
   hoặc trực tiếp: `/enroll?class=A2`  
4. Bấm **Tạo mã thanh toán SePay**  
5. Phải thấy: QR, số TK, nội dung CK (ví dụ `DHxxxxxxxx`), số tiền ~5.000đ  

QR được backend tạo qua URL `https://qr.sepay.vn/img?...` (không cần ngrok).

---

## Bước 6 — Test tự xác nhận sau chuyển khoản (webhook)

1. Chạy `npm run dev:all`.  
2. Trong terminal ngrok, copy URL dạng `https://xxxx.ngrok-free.app`.  
3. Trên [my.sepay.vn](https://my.sepay.vn) → **Webhook** → URL:

   ```text
   https://xxxx.ngrok-free.app/api/payments/sepay/webhook
   ```

4. Đặt **API Key** hoặc **HMAC secret** trùng `backend/.env`.  
5. Cấu hình SePay lọc nội dung CK theo prefix (`SEPAY_PAYMENT_CODE_PREFIX`).  
6. Chuyển khoản **đúng số tiền** và **đúng nội dung** mã trên màn hình.  
7. Trang enroll/upgrade sẽ poll trạng thái; hoặc bấm **Tôi đã chuyển khoản** (chỉ kiểm tra DB — không gọi SePay).

**Lưu ý:** Mỗi lần chạy lại ngrok (bản free), URL đổi → **cập nhật lại** webhook trên SePay.

---

## Bước 7 — Bỏ qua SePay khi dev (không chuyển khoản)

**Premium (30 ngày):**

```bash
npm run extend-premium -- student@drivego.demo 365
```

**Đăng ký khóa (enrollment):** cần webhook thành công hoặc gán thủ công bảng `course_enrollments` trong DB / qua admin.

---

## Tài khoản demo

| Email | Mật khẩu | Vai trò |
|-------|----------|---------|
| `student@drivego.demo` | `DriveGo123!` | Học viên → `/student-dashboard` |
| `center@drivego.demo` | `DriveGo123!` | Quản trị trung tâm → `/admin-dashboard` |
| `admin@drivego.demo` | `DriveGo123!` | Quản trị hệ thống |

---

## Các tính năng khác (tuỳ chọn)

| Tính năng | Biến / lệnh |
|-----------|-------------|
| Học lý thuyết + thi thử | `npm run import:content:all` |
| Google đăng nhập | `FIREBASE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS`, biến `VITE_FIREBASE_*` |
| AI Chat | `GEMINI_API_KEY`, `GEMINI_MODEL` trong `backend/.env` |
| Tra cứu, lịch thi, hồ sơ | Sau `seed:db` |

---

## Xử lý sự cố thanh toán

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|-------------|------------------------|------------|
| Không có QR / lỗi khi tạo đơn | Thiếu `SEPAY_BANK_ACCOUNT` | Điền đủ `SEPAY_*` trong `backend/.env`, restart BE |
| `Failed to fetch` | Backend không chạy / `JWT_SECRET` / DB | Sửa `.env`, `npm run test:db`, chạy lại `dev` |
| QR vỡ / không load ảnh | `SEPAY_BANK_NAME` sai mã ngân hàng | Tra mã bank theo tài liệu SePay VietQR |
| Đã CK nhưng vẫn *"Chưa nhận được thanh toán"* | Webhook chưa tới BE | Bật `dev:all`, cấu hình URL ngrok trên SePay |
| Webhook 401 | Sai API key / HMAC | Khớp `SEPAY_WEBHOOK_*` với SePay |
| CK đúng nhưng không `paid` | Sai số tiền, sai nội dung, hết hạn 24h, sai prefix | Kiểm tra amount, mã `DH...`, `SEPAY_PAYMENT_CODE_PREFIX` |

---

## Lỗi UI đã xử lý (frontend)

| Hiện tượng | Cách xử lý |
|------------|------------|
| `/docs` trống khi chưa đăng nhập | `LicenseProvider` bọc toàn app trong `main.jsx` |
| Bảng giá vẫn hiện Đăng nhập sau khi login | `MarketingNav` hiện tên + nút **Vào học** / **Vào quản trị** |
| Sidebar học viên không cuộn được | `DashboardShell` tách vùng cuộn + footer cố định |
| Không về trang chủ từ dashboard | Thêm **Trang chủ** (`/`) trong `studentNav` |

---

## Script thường dùng

| Lệnh | Mô tả |
|------|--------|
| `npm run dev` | FE + BE |
| `npm run dev:all` | FE + BE + ngrok |
| `npm run setup:env` | Tạo `.env` từ example |
| `npm run test:db` | Kiểm tra PostgreSQL |
| `npm run reset:db` | DB sạch + migration + seed + import |
| `npm run seed:db` | Tài khoản + dữ liệu demo |
| `npm run extend-premium` | Gia hạn Premium không qua SePay |

---

## Luồng thanh toán (tham khảo)

```text
Học viên → POST /api/payments/checkout
         → Backend tạo payment pending + URL QR (qr.sepay.vn)
         → Học viên quét QR / chuyển khoản
         → SePay → POST /api/payments/sepay/webhook (cần URL public)
         → Backend mark paid → enrollment / premium_until
         → Frontend poll GET /api/payments/:id/status → chuyển trang học
```

API chi tiết: [project-recap.md](./project-recap.md) mục Payments.

---

## Tài liệu liên quan

- [HUONG-DAN-CAI-DAT.md](./HUONG-DAN-CAI-DAT.md) — Cài đặt & seed cơ bản  
- [integrations.md](./integrations.md) — Firebase, AI, thanh toán  
- [final-checklist.md](./final-checklist.md) — Checklist QA trước demo  
- [database/seeds/README.md](../database/seeds/README.md) — Dữ liệu seed  
