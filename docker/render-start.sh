#!/bin/bash
set -e
 
echo "==> Caching Laravel config..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
 
echo "==> Creating storage symlink..."
php artisan storage:link || true
 
echo "==> Running database setup..."
# This project uses a database-first PostgreSQL schema.
# Import schema.sql into a new Render PostgreSQL database before first use.
 
echo "==> Starting PHP-FPM and Nginx via Supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf
