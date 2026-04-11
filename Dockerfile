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

# Copy Railway predeploy script
COPY docker/railway/predeploy.sh /usr/local/bin/railway-predeploy
RUN chmod +x /usr/local/bin/railway-predeploy

# Expose Railway port
EXPOSE 8080

# Run predeploy + start Laravel
CMD /usr/local/bin/railway-predeploy && php artisan serve --host=0.0.0.0 --port=${PORT:-8080}
