# DriveGo

Monorepo nền tảng học lái xe — frontend React, backend NestJS, database schema riêng.

## Cấu trúc

```text
DriveGo/
├── frontend/    # React + Vite + Tailwind
├── backend/     # NestJS REST API
├── database/    # Schema SQL, migrations, seeds (placeholder)
└── docs/        # Tài liệu dùng chung
```

## Chạy local

```bash
npm install
npm run dev          # FE :5173 + BE :3000
npm run dev:fe       # chỉ frontend
npm run dev:be       # chỉ backend
```

## Scripts root

| Lệnh | Mô tả |
|------|--------|
| `npm run dev` | Frontend + backend song song |
| `npm run build` | Build cả hai package |
| `npm run lint` | Lint frontend + typecheck backend |

## Env

- `frontend/.env.example` — `VITE_API_URL`
- `backend/.env.example`
  - **Required:** `PORT`, `CORS_ORIGIN`, `DATABASE_URL`, `JWT_SECRET` (strong secret, no default)
  - **Payments:** `SEPAY_*` + `SEPAY_WEBHOOK_HMAC_SECRET` (recommended for webhook auth)
  - **Email:** prefer `RESEND_API_KEY` + `RESEND_FROM` on the verified domain; SMTP is only fallback
  - **AI Chat:** `GEMINI_API_KEY`, `GEMINI_MODEL`
- `database/.env.example` — `DATABASE_URL` (khi có DB)

## Security notes

- Không commit file `.env` hoặc bất kỳ API key/secret thật lên Git.
- Nếu key đã lộ (chat/screenshot/log), hãy rotate ngay trên nhà cung cấp.
- Webhook SePay nên bật HMAC (`SEPAY_WEBHOOK_HMAC_SECRET`) ở môi trường non-local.

## Tài liệu

- **[Cài đặt đầy đủ & test SePay](docs/SETUP-DAY-DU.md)** (clone GitHub, thanh toán, ngrok)
- **[Hướng dẫn cài đặt & seed database](docs/HUONG-DAN-CAI-DAT.md)** (tiếng Việt)
- [Kiến trúc](docs/architecture.md)
- [Domain từ UI](docs/domain-from-ui.md)
- [Figma map](docs/figma-map.md)

## Database

```bash
npm run setup:env    # tạo .env từ example
npm run test:db      # kiểm tra kết nối PostgreSQL
npm run parse:b2-pdf # PDF 600 câu (B2) ở thư mục gốc
npm run parse:motor-pdf # PDF 250 câu (A1/A2) ở thư mục gốc
npm run seed:db      # tài khoản demo + dữ liệu mẫu
npm run bootstrap:content
npm run migrate:exam-rules
npm run import:content:all
npm run reset:db     # truncate + migrations + seed + bootstrap + import
```

Quy tắc thi: A1/A2 — 25 câu, 19 phút, đạt 21/25; B1/B2 — 30 câu, 22 phút, đạt 26/30. Xem [database/content/README.md](database/content/README.md).

Chi tiết: [docs/HUONG-DAN-CAI-DAT.md](docs/HUONG-DAN-CAI-DAT.md), [database/seeds/README.md](database/seeds/README.md).

Tích hợp bên thứ ba (Firebase, thanh toán, AI): [docs/integrations.md](docs/integrations.md)
