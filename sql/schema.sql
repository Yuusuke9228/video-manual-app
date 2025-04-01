-- データベース作成
CREATE DATABASE IF NOT EXISTS video_manual_app;

USE video_manual_app;

-- 部署テーブル
CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 作業タイプテーブル
CREATE TABLE IF NOT EXISTS task_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    department_id INT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(100),
    department_id INT,
    role ENUM('admin', 'editor', 'viewer') DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- プロジェクトテーブル
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    department_id INT,
    task_type_id INT,
    created_by INT NOT NULL,
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (task_type_id) REFERENCES task_types(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- メディアファイルテーブル
CREATE TABLE IF NOT EXISTS media_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_type ENUM('video', 'image') NOT NULL,
    file_size INT NOT NULL,
    duration FLOAT DEFAULT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- エレメントテーブル (テキスト、図形など)
CREATE TABLE IF NOT EXISTS elements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    element_type ENUM('text', 'rectangle', 'circle', 'arrow', 'image') NOT NULL,
    content TEXT,
    position_x FLOAT NOT NULL,
    position_y FLOAT NOT NULL,
    width FLOAT,
    height FLOAT,
    rotation FLOAT DEFAULT 0,
    color VARCHAR(30),
    background VARCHAR(30),
    font_size INT,
    font_family VARCHAR(100),
    border_width INT,
    border_color VARCHAR(30),
    opacity FLOAT DEFAULT 1,
    start_time FLOAT,
    end_time FLOAT,
    z_index INT DEFAULT 0,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- タイムラインテーブル
CREATE TABLE IF NOT EXISTS timeline (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    media_id INT,
    element_id INT,
    start_time FLOAT NOT NULL,
    end_time FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (media_id) REFERENCES media_files(id) ON DELETE CASCADE,
    FOREIGN KEY (element_id) REFERENCES elements(id) ON DELETE CASCADE
);

-- 共有リンク管理テーブル
CREATE TABLE IF NOT EXISTS project_shares (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    share_key VARCHAR(64) NOT NULL UNIQUE,
    created_by INT NOT NULL,
    expiry_date DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- インデックス追加
CREATE INDEX idx_project_shares_key ON project_shares(share_key);

CREATE INDEX idx_project_shares_project ON project_shares(project_id);

-- サンプルデータの挿入
INSERT INTO
    departments (name, description)
VALUES
    ('製造部', '製品の製造に関わる部署'),
    ('品質管理部', '製品の品質を管理する部署'),
    ('総務部', '社内の総務を担当する部署');

INSERT INTO
    task_types (department_id, name, description)
VALUES
    (1, '組立作業', '製品の組立に関する作業'),
    (1, '検査作業', '製造工程での検査作業'),
    (2, '品質チェック', '完成品の品質チェック作業'),
    (3, '書類作成', '社内文書の作成作業');

-- 管理者ユーザーの作成 (パスワード: admin123)
INSERT INTO
    users (username, password, email, full_name, role)
VALUES
    (
        'admin',
        '$2y$10$abcdefghijklmnopqrstuv.abcdefghijklmnopqrstuvwxyz123456',
        'admin@example.com',
        '管理者',
        'admin'
    );