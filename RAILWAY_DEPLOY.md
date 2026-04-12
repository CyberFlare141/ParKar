# Railway Backend Deploy

This repository can deploy the Laravel backend to Railway with the root `Dockerfile` and [`railway.json`](./railway.json).

## What is ready

- Dockerfile-based Railway build
- Health check at `/api/health`
- Dockerfile-based backend deploy
- MySQL-compatible Laravel config

## Important limits

- This project is database-first and uses `schema.sql` instead of Laravel migrations.
- Uploaded documents are stored on the local `public` disk. On Railway, files will be lost after redeploys unless you attach a persistent volume or move uploads to S3-compatible storage.
- The AI service is a separate service. `AI_SERVICE_URL` must point to a reachable deployed AI backend.

## Recommended Railway setup

1. Create a Railway service from this repo.
2. Use the root `Dockerfile`.
3. Attach a MySQL database.
4. Add a persistent volume if you want uploaded files to survive redeploys.
5. Set the required environment variables listed below.
6. Deploy once.
7. If the MySQL database is empty, import [`schema.sql`](./schema.sql) into it before using the app.

## Required environment variables

- `APP_NAME=ParKar`
- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_URL=https://your-backend-domain.up.railway.app`
- `APP_KEY`
- `LOG_CHANNEL=stderr`
- `LOG_LEVEL=info`
- `DB_CONNECTION=mysql`
- The full `DB_*` set
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

## Notes

- Railway health checks should use `/api/health`.
- Do not run `schema.sql` against a shared non-empty database unless you understand the reset risk, because the file starts with `DROP TABLE IF EXISTS`.
- If you later replace `schema.sql` with real Laravel migrations, you can switch to `php artisan migrate` during deploys instead.
