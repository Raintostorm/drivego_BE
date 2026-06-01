# DriveGo Backend (NestJS)

This folder is the REST API for DriveGo (`/api/*`).

## Requirements

- Node.js 20+
- PostgreSQL 14+

## Environment variables

Create `backend/.env` (do not commit it). Start from `backend/.env.example`.

**Required**

- `DATABASE_URL`
- `JWT_SECRET` (min 16 chars, cannot be `change-me`)
- `CORS_ORIGIN` (set to your frontend domain)

**Optional (features)**

- **Google Sign-in (Firebase Admin)**: `FIREBASE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS`
- **SePay**: `SEPAY_*` (and `SEPAY_WEBHOOK_API_KEY` or `SEPAY_WEBHOOK_HMAC_SECRET` for webhook auth in non-dev)
- **AI Chat**: `GEMINI_API_KEY`, `GEMINI_MODEL`

## Install & run

```bash
npm install
npm run build
npm run start:prod
```

For local dev (watch mode):

```bash
npm run start:dev
```

## Notes for deployment

- The current implementation stores application uploads on local disk under `backend/uploads/`.
  - For serverless platforms (ephemeral filesystem), this is not reliable.
  - For production, consider migrating uploads to object storage (S3/R2/Firebase Storage) and store file URLs/keys in the DB.

