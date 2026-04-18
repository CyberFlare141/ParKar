#!/bin/bash
set -e
 
echo "==> Caching Laravel config..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
 
echo "==> Creating storage symlink..."
php artisan storage:link || true
 
echo "==> Running database migrations..."
php artisan migrate --force
 
echo "==> Starting PHP-FPM and Nginx via Supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf