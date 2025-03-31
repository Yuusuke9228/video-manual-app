<?php
// config.php - アプリケーション設定ファイル

// データベース設定
define('DB_HOST', 'localhost');
define('DB_NAME', 'video_manual_app');
define('DB_USER', 'root'); // 本番環境では適切なユーザー名に変更すること
define('DB_PASS', ''); // 本番環境では適切なパスワードに設定すること
define('DB_CHARSET', 'utf8mb4');

// アプリケーション設定
define('APP_NAME', '動画マニュアル作成アプリ');
define('APP_URL', 'http://localhost/video-manual-app'); // 実際のURLに変更すること

// ファイルアップロード設定
define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('MAX_FILE_SIZE', 100 * 1024 * 1024); // 100MB
define('ALLOWED_VIDEO_TYPES', ['video/mp4', 'video/webm', 'video/ogg']);
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml']);

// セッション設定
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_secure', 0); // HTTPS環境では1に設定

// エラー設定
ini_set('display_errors', 0); // 本番環境では0に設定
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/error.log');

// タイムゾーン設定
date_default_timezone_set('Asia/Tokyo');

// セキュリティ設定
define('CSRF_TOKEN_SECRET', 'your-secret-key'); // 実際の環境では変更すること