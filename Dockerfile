FROM php:8.2-cli

ENV COMPOSER_ALLOW_SUPERUSER=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    postgresql-client \
    zip \
    unzip \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libpq-dev \
    libzip-dev \
    && docker-php-ext-install pdo_mysql pdo_pgsql mbstring exif bcmath gd zip \
    && rm -rf /var/lib/apt/lists/*

# Install composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /app

# Copy project
COPY . .

# Install dependencies
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader \
    && chown -R www-data:www-data storage bootstrap/cache

# Expose Railway port
EXPOSE 8080

# ✅ FINAL FIX: use PHP built-in server (NOT artisan serve)
CMD php -S 0.0.0.0:${PORT:-8080} -t public