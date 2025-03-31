# 動画マニュアル作成アプリ

## 概要

このアプリケーションは、企業や組織内で利用する動画マニュアルを簡単に作成するためのツールです。動画と画像を組み合わせて、図形やテキストを追加し、部署や作業内容に応じたわかりやすいマニュアルを作成することができます。

## 主な機能

- **ユーザー管理**: 管理者、編集者、閲覧者の3つの権限レベル
- **部署管理**: 組織内の部署と作業タイプの管理
- **プロジェクト管理**: マニュアルプロジェクトの作成、編集、削除
- **メディア管理**: 動画や画像のアップロードと管理
- **エディタ機能**:
  - タイムライン編集
  - テキスト、四角形、円、矢印などの要素追加
  - 要素の位置、サイズ、色、フォントなどの編集
  - プレビュー再生
- **フィルター機能**:
  - 部署ごとのフィルタリング
  - 作業内容でのキーワード検索
  - プロジェクト名でのキーワード検索

## 技術スタック

- **フロントエンド**: HTML, CSS, JavaScript
- **バックエンド**: PHP
- **データベース**: MariaDB
- **ライブラリ**:
  - Bootstrap 5
  - Font Awesome
  - interact.js（ドラッグ＆ドロップ機能）

## セットアップ手順

### 前提条件

- PHP 7.4以上
- MariaDB または MySQL 5.7以上
- Webサーバー（Apache, Nginx など）

### 詳細なインストール手順

1. **ソースコードの配置**:
   - GitHubからリポジトリをクローンするか、ソースコードをダウンロードします。
   - ファイルをWebサーバーのドキュメントルート（例: `/var/www/html/`）または任意のディレクトリに配置します。

   ```bash
   # Gitを使用する場合
   git clone https://github.com/yourusername/video-manual-app.git /var/www/html/video-manual-app
   
   # または、ダウンロードしたZIPファイルを解凍
   unzip video-manual-app.zip -d /var/www/html/
   ```

2. **必要なディレクトリの作成**:
   - アップロードディレクトリとログディレクトリを作成します。

   ```bash
   cd /var/www/html/video-manual-app
   mkdir -p uploads logs
   chmod 755 uploads logs
   chown -R www-data:www-data uploads logs  # Apacheの場合
   ```

3. **データベースのセットアップ**:
   - MariaDBにデータベースとユーザーを作成します。

   ```sql
   CREATE DATABASE video_manual_app;
   CREATE USER 'video_user'@'localhost' IDENTIFIED BY 'your_secure_password';
   GRANT ALL PRIVILEGES ON video_manual_app.* TO 'video_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

   - スキーマファイルを実行してテーブルを作成します。

   ```bash
   mysql -u video_user -p video_manual_app < database-schema.sql
   ```

4. **設定ファイルの編集**:
   - `config.php`ファイルを環境に合わせて編集します。

   ```bash
   cp config.example.php config.php
   nano config.php  # または任意のエディタで編集
   ```

   - 以下の設定を変更します。

   ```php
   // データベース設定
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'video_manual_app');
   define('DB_USER', 'video_user');
   define('DB_PASS', 'your_secure_password');
   
   // アプリケーション設定
   define('APP_URL', 'http://yourserver.com/video-manual-app'); // 実際のURLに変更
   
   // ファイルアップロード設定
   define('UPLOAD_DIR', __DIR__ . '/uploads/');
   
   // セキュリティ設定
   define('CSRF_TOKEN_SECRET', 'generate_random_string_here'); // 安全なランダム文字列に変更
   ```

5. **Webサーバーの設定**:
   - Apache の場合、.htaccess ファイルが正しく動作するように mod_rewrite モジュールを有効にします。

   ```bash
   a2enmod rewrite
   ```

   - 以下の内容の .htaccess ファイルをアプリケーションのルートディレクトリに作成します（必要な場合）。

   ```apache
   <IfModule mod_rewrite.c>
       RewriteEngine On
       RewriteBase /
       
       # API リクエストの処理
       RewriteCond %{REQUEST_URI} ^/api/(.*)$ [NC]
       RewriteRule ^api/(.*)$ api.php?path=$1 [QSA,L]
       
       # フロントエンドのルーティング
       RewriteCond %{REQUEST_FILENAME} !-f
       RewriteCond %{REQUEST_FILENAME} !-d
       RewriteRule ^(.*)$ index.html [QSA,L]
   </IfModule>
   ```

6. **初期管理者ユーザーの作成**:
   - 以下のSQLコマンドを実行して初期管理者ユーザーを作成します。

   ```sql
   -- 'admin123'のパスワードハッシュを使用
   INSERT INTO users (username, password, email, full_name, role) 
   VALUES ('admin', '$2y$10$kHk3uwvXYPzPNuQ9Fy6yW.S1eAzBUlZXpFNcVAJbVEcxKPQK.rM9W', 'admin@example.com', '管理者', 'admin');
   ```

7. **パーミッションの確認**:
   - PHPがファイルを書き込めるように適切な権限を設定します。

   ```bash
   find /var/www/html/video-manual-app -type d -exec chmod 755 {} \;
   find /var/www/html/video-manual-app -type f -exec chmod 644 {} \;
   chown -R www-data:www-data /var/www/html/video-manual-app  # Apacheの場合
   ```

8. **PHP依存関係の確認**:
   - 必要なPHP拡張機能が有効になっていることを確認します。

   ```bash
   php -m | grep -E 'pdo|json|mbstring|gd'
   ```

   - 不足している拡張機能があれば、インストールします。

   ```bash
   apt-get install php-pdo php-mysql php-json php-mbstring php-gd  # Debian/Ubuntuの場合
   ```

9. **テスト用スクリプトの実行**:
   - `test_api.php`ファイルにアクセスして、設定が正しく機能しているか確認します。

   ```
   http://yourserver.com/video-manual-app/test_api.php
   ```

10. **アプリケーションへのアクセス**:
    - ブラウザでアプリケーションURLにアクセスします。

    ```
    http://yourserver.com/video-manual-app/
    ```

    - 初期管理者アカウントでログインします。
      - ユーザー名: admin
      - パスワード: admin123

    - **重要**: 初回ログイン後、必ずパスワードを変更してください。

## 使用方法

### 1. ログイン

管理者アカウントでログインします。初回ログイン後、必要に応じて新規ユーザーを作成してください。

### 2. 部署と作業タイプの設定

1. 管理者アカウントでログインし、「部署管理」メニューを選択します。
2. 「新規部署」ボタンをクリックして、部署を作成します。
3. 作成した部署を選択し、「新規作業タイプ」ボタンをクリックして作業タイプを追加します。

### 3. マニュアルの作成

1. 「プロジェクト」メニューに戻り、「新規プロジェクト」ボタンをクリックします。
2. プロジェクト情報（タイトル、部署、作業タイプなど）を入力して保存します。
3. 動画や画像をアップロードします。
4. エディタ画面で要素（テキスト、図形など）を追加します。
5. タイムラインで要素の表示タイミングを設定します。
6. 「保存」ボタンをクリックしてマニュアルを保存します。

### 4. マニュアルの検索とフィルタリング

1. プロジェクト一覧画面のフィルターセクションを使用します。
2. 部署ドロップダウンから特定の部署を選択できます。
3. 作業内容やプロジェクト名のテキストボックスにキーワードを入力すると、リアルタイムで検索結果が更新されます。

## ファイル構造

```
video-manual-app/
├── api.php             # APIエンドポイント
├── config.php          # 設定ファイル
├── Database.php        # データベース接続クラス
├── Auth.php            # 認証クラス
├── Project.php         # プロジェクト管理クラス
├── Media.php           # メディア管理クラス
├── Element.php         # エレメント管理クラス
├── Department.php      # 部署管理クラス
├── index.html          # メインHTMLファイル
├── css/
│   └── style.css       # スタイルシート
├── js/
│   ├── auth.js         # 認証処理
│   ├── api.js          # API通信
│   ├── projects.js     # プロジェクト管理
│   ├── departments.js  # 部署管理
│   ├── editor.js       # エディタ機能
│   └── main.js         # メイン初期化処理
├── uploads/            # アップロードファイル保存ディレクトリ
└── logs/               # ログファイル保存ディレクトリ
```

## モバイル対応

このアプリケーションはモバイルデバイスにも対応しています。スマートフォンやタブレットからアクセスして、マニュアルの閲覧や編集が可能です。

## 注意事項

- アップロードする動画や画像のサイズには制限があります（デフォルトでは100MB）。
- サポートされている動画形式は MP4、WebM、Ogg です。
- サポートされている画像形式は JPEG、PNG、GIF、SVG です。
- エディタでの編集は、ドラッグ＆ドロップで要素の位置やサイズを変更できます。

## トラブルシューティング

- **API接続エラー（404 Not Found）**:
  - `api.php`ファイルがwebサーバーのルートディレクトリに正しく配置されているか確認してください。
  - URLパスが正しく設定されているか`config.php`を確認してください。
  - `.htaccess`ファイルが正しく設定されているか確認してください。

- **データベース接続エラー**:
  - `config.php`の接続情報が正しいか確認してください。
  - MariaDBサーバーが実行中かどうかを確認してください。
  - データベースユーザーに適切な権限が付与されているか確認してください。

- **アップロードエラー**:
  - `uploads`ディレクトリの権限を確認してください。
  - PHPの`upload_max_filesize`と`post_max_size`の設定を確認してください。

- **その他のエラー**:
  - `logs/error.log`ファイルを確認して詳細なエラーメッセージを調査してください。
  - PHPエラー表示を一時的に有効にして詳細情報を確認する:

    ```php
    ini_set('display_errors', 1);
    error_reporting(E_ALL);
    ```

## サーバー要件

- **PHP**: 7.4以上
  - 必要な拡張機能: PDO, MySQL, JSON, mbstring, GD
- **MariaDB**: 10.3以上または**MySQL**: 5.7以上
- **Webサーバー**: Apache（mod_rewrite有効）またはNginx
- **ディスク容量**: アップロードするファイルに応じて十分な空き容量

## ライセンス

このアプリケーションは [MIT License](LICENSE) の下で公開されています。

## 連絡先

- 作者: Yuusuke9228
- GitHub: [github.com/Yuusuke9228](https://github.com/Yuusuke9228)

---
