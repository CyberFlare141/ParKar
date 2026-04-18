# Azure Deploy Notes

This project uses:

- `ParKar-Front` on Azure Static Web Apps
- `ParKar-Back` on Azure App Service (Linux, PHP)
- Aiven MySQL as the database

## Why the frontend loads but the app still breaks

There are two separate pieces to wire together:

1. The frontend build must know the backend API URL.
2. Laravel on Azure App Service must serve from `public/`, not the repo root.

If either piece is missing, the frontend may load while all API calls fail.

## Backend App Service settings

In Azure Portal for `ParKar-Back`, set these values in `Settings -> Environment variables`:

- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_URL=https://parkar-back-gzc7f9fbaebphjh4.eastasia-01.azurewebsites.net`
- `FRONTEND_URL=https://nice-field-0a1240800.7.azurestaticapps.net`
- `CORS_ALLOWED_ORIGINS=https://nice-field-0a1240800.7.azurestaticapps.net`
- `APP_KEY=<your Laravel app key>`
- `JWT_SECRET=<your JWT secret>`
- `DB_CONNECTION=mysql`
- `DB_HOST=<your Aiven host>`
- `DB_PORT=<your Aiven port>`
- `DB_DATABASE=defaultdb`
- `DB_USERNAME=<your Aiven username>`
- `DB_PASSWORD=<your Aiven password>`
- `MYSQL_ATTR_SSL_CA=/home/site/wwwroot/ca.pem`
- `LOG_CHANNEL=stderr`
- `LOG_LEVEL=info`

Optional if you use Google auth:

- `GOOGLE_CLIENT_ID=...`
- `GOOGLE_CLIENT_SECRET=...`
- `GOOGLE_REDIRECT_URI=https://parkar-back-gzc7f9fbaebphjh4.eastasia-01.azurewebsites.net/api/auth/google/callback`
- `GOOGLE_FRONTEND_REDIRECT_URI=https://nice-field-0a1240800.7.azurestaticapps.net/auth/google/success`

## Backend startup command

Laravel must be served from `public/`.

Set this in `Configuration -> General settings -> Startup Command`:

```sh
cp /home/site/wwwroot/default /etc/nginx/sites-available/default && service nginx reload
```

This repo already contains the matching `default` Nginx file.

The GitHub workflow now also reapplies that startup command during deploy.

## Frontend Static Web App setting

Add this GitHub repository secret:

- `VITE_API_URL=https://parkar-back-gzc7f9fbaebphjh4.eastasia-01.azurewebsites.net/api`

The frontend build uses `VITE_API_URL` if present. Without it, the app falls back to `/api`, which does not exist on the Static Web App and returns `404`.

## Quick verification

After redeploy:

- Backend health: `https://parkar-back-gzc7f9fbaebphjh4.eastasia-01.azurewebsites.net/api/health`
- Frontend site: `https://nice-field-0a1240800.7.azurestaticapps.net`

Open browser dev tools on the frontend and confirm API requests are going to the backend Azure App Service domain, not the Static Web App domain.
