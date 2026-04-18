#!/usr/bin/env bash
set -euo pipefail

cd /opt/render/project/src

if [ "${RAILWAY_SCHEMA_IMPORT:-true}" = "false" ]; then
  echo "Skipping schema import because RAILWAY_SCHEMA_IMPORT=false."
  exit 0
fi

if [ ! -f "schema.sql" ]; then
  echo "schema.sql not found; skipping database bootstrap."
  exit 0
fi

database_url="${DATABASE_URL:-}"

if [ -z "$database_url" ] && [ -n "${DB_CONNECTION:-}" ] && [ "${DB_CONNECTION}" = "mysql" ]; then
  if [ -z "${DB_HOST:-}" ] || [ -z "${DB_PORT:-}" ] || [ -z "${DB_DATABASE:-}" ] || [ -z "${DB_USERNAME:-}" ]; then
    echo "Database connection variables are incomplete; skipping schema bootstrap."
    exit 0
  fi

  db_password="${DB_PASSWORD:-}"
  database_url="mysql://${DB_USERNAME}:${db_password}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}"
fi

if [ -z "$database_url" ]; then
  echo "DATABASE_URL is not set; skipping schema bootstrap."
  exit 0
fi

existing_users_table="$(php -r '
$url = getenv(\"DATABASE_URL\");
if (!$url) {
    exit(1);
}
$parts = parse_url($url);
$host = $parts[\"host\"] ?? getenv(\"DB_HOST\") ?? \"127.0.0.1\";
$port = $parts[\"port\"] ?? getenv(\"DB_PORT\") ?? \"3306\";
$db = ltrim($parts[\"path\"] ?? (\"/\" . (getenv(\"DB_DATABASE\") ?: \"\")), \"/\");
$user = urldecode($parts[\"user\"] ?? getenv(\"DB_USERNAME\") ?? \"\");
$pass = urldecode($parts[\"pass\"] ?? getenv(\"DB_PASSWORD\") ?? \"\");
$pdo = new PDO(\"mysql:host={$host};port={$port};dbname={$db}\", $user, $pass);
$stmt = $pdo->query(\"SHOW TABLES LIKE \" . $pdo->quote(\"users\"));
echo $stmt && $stmt->fetchColumn() ? \"users\" : \"\";
' | tr -d '[:space:]')"

if [ "$existing_users_table" = "users" ]; then
  echo "Database schema already exists; skipping schema import."
  exit 0
fi

echo "Bootstrapping MySQL schema from schema.sql..."
php -r '
$url = getenv(\"DATABASE_URL\");
if (!$url) {
    exit(1);
}
$parts = parse_url($url);
$host = $parts[\"host\"] ?? getenv(\"DB_HOST\") ?? \"127.0.0.1\";
$port = $parts[\"port\"] ?? getenv(\"DB_PORT\") ?? \"3306\";
$db = ltrim($parts[\"path\"] ?? (\"/\" . (getenv(\"DB_DATABASE\") ?: \"\")), \"/\");
$user = urldecode($parts[\"user\"] ?? getenv(\"DB_USERNAME\") ?? \"\");
$pass = urldecode($parts[\"pass\"] ?? getenv(\"DB_PASSWORD\") ?? \"\");
$sql = file_get_contents(\"schema.sql\");
$pdo = new PDO(\"mysql:host={$host};port={$port};dbname={$db}\", $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$pdo->exec($sql);
'
echo "Schema import completed."
