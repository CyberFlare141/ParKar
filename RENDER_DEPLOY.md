# Render Backend Deploy

This project's backend is ready to deploy to Render with the root [Dockerfile](/d:/New%20folder%20(2)/ParKar/Dockerfile) and [render.yaml](/d:/New%20folder%20(2)/ParKar/render.yaml).

## What this setup does

- Builds the Laravel backend as a Docker web service
- Starts Laravel on Render's runtime port
- Uses `/api/health` as the health check
- Adds a persistent disk for uploaded files in `storage`

## Important note about file uploads

This backend stores uploaded documents on the local filesystem. Render's filesystem is ephemeral by default, so files disappear after redeploys unless you attach a disk.

The included `render.yaml` uses a `starter` plan with a 1 GB disk because uploads need persistence.

## Before you deploy

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. Make sure `.env` is **not** committed.
3. Rotate any secrets that were exposed outside Render, especially database, mail, JWT, and Google OAuth credentials.

## Deploy with Blueprint

1. Open Render.
2. Click `New` -> `Blueprint`.
3. Connect the repository.
4. Render will detect [render.yaml](/d:/New%20folder%20(2)/ParKar/render.yaml).
5. Review the service name and plan.
6. Fill in all `sync: false` environment variables in Render.
7. Create the Blueprint.

## Required environment variables

Set these in Render from your current backend `.env` values:

- `APP_URL`
- `APP_KEY`
- `DB_HOST`
- `DB_PORT`
- `DB_DATABASE`
- `DB_USERNAME`
- `DB_PASSWORD`
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
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_FRONTEND_REDIRECT_URI`
- `AI_SERVICE_URL`

## Values to update for production

- `APP_URL` should be your Render backend URL, for example `https://parkar-backend.onrender.com`
- `GOOGLE_REDIRECT_URI` should be `https://your-backend-domain/api/auth/google/callback`
- `GOOGLE_FRONTEND_REDIRECT_URI` should point to your deployed frontend success route
- `AI_SERVICE_URL` must point to a reachable AI service URL, not `host.docker.internal`

## Database note

This repo uses a database-first setup with PostgreSQL `schema.sql`.

Point Render to your PostgreSQL instance with the `DB_*` variables.
If you create a new empty database, import `schema.sql` into that database before using the app.

## After deploy

Test these URLs:

- `/`
- `/api/health`

If the backend is only for API use, the most important one is:

- `https://your-backend-domain/api/health`
