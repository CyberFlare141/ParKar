FROM php:8.2-fpm

RUN apt-get update && apt-get install -y \
    git \
    curl \
    zip \
    unzip \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

# Copy entire project FIRST (important for Laravel)
COPY . .

# Install dependencies AFTER artisan exists
RUN composer install --no-interaction --prefer-dist --optimize-autoloader

RUN chown -R www-data:www-data /var/www
RUN { \
    echo "upload_max_filesize=10M"; \
    echo "post_max_size=25M"; \
    echo "max_file_uploads=20"; \
} > /usr/local/etc/php/conf.d/uploads.ini

EXPOSE 9000
CMD ["php-fpm"]
