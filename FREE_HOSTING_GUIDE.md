# Free Hosting Guide

## Recommended setup

- Frontend: Vercel free Hobby plan
- Backend API: Railway free/trial project using the root `Dockerfile`
- Database: Railway MySQL service

This fits the current repo better than Render because the frontend is a Vite React app and the backend already has Railway deployment files.

## Backend on Railway

1. Push the repo to GitHub.
2. In Railway, create a new project from the GitHub repo.
3. Deploy the root service with the root `Dockerfile`.
4. Add a MySQL service to the same Railway project.
5. In the backend service variables, set:
   - `APP_ENV=production`
   - `APP_DEBUG=false`
   - `APP_URL=https://<your-backend-domain>`
   - `APP_KEY=<your-app-key>`
   - `DB_CONNECTION=mysql`
   - `DB_HOST=<mysql host>`
   - `DB_PORT=<mysql port>`
   - `DB_DATABASE=<mysql database>`
   - `DB_USERNAME=<mysql user>`
   - `DB_PASSWORD=<mysql password>`
   - `JWT_SECRET=<your-jwt-secret>`
   - `GOOGLE_REDIRECT_URI=https://<your-backend-domain>/api/auth/google/callback`
   - `GOOGLE_FRONTEND_REDIRECT_URI=https://<your-frontend-domain>/auth/google/success`
   - `AI_SERVICE_URL=<reachable AI service URL>`
6. Redeploy the backend.
7. Visit `https://<your-backend-domain>/api/health`.
8. Import `schema.sql` into the MySQL database if the database is empty.

## Frontend on Vercel

1. In Vercel, import the same GitHub repo.
2. Set the root directory to `frontend`.
3. Set the framework preset to `Vite`.
4. Set `VITE_API_URL=https://<your-backend-domain>/api`.
5. Deploy.
6. Open `https://<your-frontend-domain>`.

## Final checks

- The frontend should load without route 404s because `frontend/vercel.json` rewrites requests to `index.html`.
- The backend should return `{"status":"ok"}` at `/api/health`.
- Update Google OAuth allowed callback URLs to the deployed domains before testing Google sign-in.
