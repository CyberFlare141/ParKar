# Railway Backend Deploy

This repository can now deploy the Laravel backend to Railway with the root `Dockerfile` and [`railway.json`](./railway.json).

## What is ready

- Dockerfile-based Railway build
- Health check at `/api/health`
- Pre-deploy schema bootstrap for a brand-new PostgreSQL database
- Safe no-op schema bootstrap on later deploys once tables already exist

## Important limits

- This project is database-first and uses `schema.sql` instead of Laravel migrations.
- Uploaded documents are stored on the local `public` disk. On Railway, files will be lost after redeploys unless you attach a persistent volume or move uploads to S3-compatible storage.
- The AI service is a separate service. `AI_SERVICE_URL` must point to a reachable deployed AI backend.

## Recommended Railway setup

1. Create a Railway service from this repo.
2. Use the root `Dockerfile`.
3. Attach a PostgreSQL database.
4. Add a persistent volume if you want uploaded files to survive redeploys.
5. Set the required environment variables listed below.
6. Deploy once. The pre-deploy command will import `schema.sql` only if the database is still empty.

## Required environment variables

- `APP_NAME=ParKar`
- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_URL=https://your-backend-domain.up.railway.app`
- `APP_KEY`
- `LOG_CHANNEL=stderr`
- `LOG_LEVEL=info`
- `DB_CONNECTION=pgsql`
- `DATABASE_URL` or the full `DB_*` set
- `FILESYSTEM_DISK=public`
- `MAIL_MAILER`
- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`
- `MAIL_ENCRYPTION`
- `MAIL_FROM_ADDRESS`
- `MAIL_FROM_NAME`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI=https://your-backend-domain.up.railway.app/api/auth/google/callback`
- `GOOGLE_FRONTEND_REDIRECT_URI=https://your-frontend-domain/auth/google/success`
- `AI_SERVICE_URL`
- `AI_SERVICE_TIMEOUT=30`
- `ADMIN_EMAILS`
- `TEACHER_EMAILS`

## Optional environment variables

- `RAILWAY_SCHEMA_IMPORT=true`
  Keeps the pre-deploy schema bootstrap enabled. Set it to `false` if you want to manage schema creation manually.

## Notes

- If the PostgreSQL database already contains your tables, the pre-deploy command skips `schema.sql`.
- Do not point the app at a shared non-empty database and then force-run `schema.sql`, because the file starts with `DROP TABLE IF EXISTS`.
- If you later replace `schema.sql` with real Laravel migrations, remove the schema bootstrap step from [`railway.json`](./railway.json).
