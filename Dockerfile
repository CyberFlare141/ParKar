FROM php:8.3-cli

ENV COMPOSER_ALLOW_SUPERUSER=1

RUN apt-get update && apt-get install -y \
    git \
    curl \
    zip \
    unzip \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    && docker-php-ext-install pdo_mysql mbstring exif bcmath gd zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /opt/render/project/src

COPY . .

RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader \
    && chown -R www-data:www-data storage bootstrap/cache

COPY docker/render/entrypoint.sh /usr/local/bin/render-entrypoint

RUN chmod +x /usr/local/bin/render-entrypoint

EXPOSE 10000

CMD ["render-entrypoint"]
