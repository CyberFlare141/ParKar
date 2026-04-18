#!/bin/sh
set -eu

APP_ROOT="/home/site/wwwroot"

mkdir -p \
  "$APP_ROOT/storage/framework/cache/data" \
  "$APP_ROOT/storage/framework/sessions" \
  "$APP_ROOT/storage/framework/views" \
  "$APP_ROOT/storage/logs" \
  "$APP_ROOT/storage/app/public" \
  "$APP_ROOT/bootstrap/cache"

# Azure App Service can restore the app without these writable dirs.
# Laravel file cache, session handling, uploads, and compiled files need them.
chmod -R 0777 \
  "$APP_ROOT/storage" \
  "$APP_ROOT/bootstrap/cache"

cp "$APP_ROOT/default" /etc/nginx/sites-available/default
service nginx reload

php-fpm
