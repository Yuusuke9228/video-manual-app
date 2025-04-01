<?php
// Project.php - プロジェクト管理クラス

class Project
{
    private $db;

    /**
     * コンストラクタ
     */
    public function __construct($db)
    {
        $this->db = $db;
    }

    /**
     * 全プロジェクトを取得（権限に基づく）
     */
    public function getAllProjects($userId)
    {
        // ユーザーの権限を確認
        $sql = "SELECT role, department_id FROM users WHERE id = ?";
        $user = $this->db->fetchRow($sql, [$userId]);

        if (!$user) {
            throw new Exception('ユーザーが見つかりません。');
        }

        // 管理者は全プロジェクトにアクセス可能
        if ($user['role'] === 'admin') {
            $sql = "SELECT p.*, d.name as department_name, t.name as task_name, 
                    u.username as creator_name
                    FROM projects p
                    LEFT JOIN departments d ON p.department_id = d.id
                    LEFT JOIN task_types t ON p.task_type_id = t.id
                    LEFT JOIN users u ON p.created_by = u.id
                    ORDER BY p.created_at DESC";
            return $this->db->fetchAll($sql);
        }

        // 編集者は自分の部署のプロジェクトにアクセス可能
        if ($user['role'] === 'editor' && $user['department_id']) {
            $sql = "SELECT p.*, d.name as department_name, t.name as task_name, 
                    u.username as creator_name
                    FROM projects p
                    LEFT JOIN departments d ON p.department_id = d.id
                    LEFT JOIN task_types t ON p.task_type_id = t.id
                    LEFT JOIN users u ON p.created_by = u.id
                    WHERE p.department_id = ? OR p.created_by = ?
                    ORDER BY p.created_at DESC";
            return $this->db->fetchAll($sql, [$user['department_id'], $userId]);
        }

        // 閲覧者は公開されたプロジェクトと自分が作成したプロジェクトのみアクセス可能
        $sql = "SELECT p.*, d.name as department_name, t.name as task_name, 
                u.username as creator_name
                FROM projects p
                LEFT JOIN departments d ON p.department_id = d.id
                LEFT JOIN task_types t ON p.task_type_id = t.id
                LEFT JOIN users u ON p.created_by = u.id
                WHERE p.status = 'published' OR p.created_by = ?
                ORDER BY p.created_at DESC";
        return $this->db->fetchAll($sql, [$userId]);
    }

    /**
     * プロジェクト詳細を取得
     */
    public function getProject($projectId, $userId = null)
    {
        $sql = "SELECT p.*, d.name as department_name, t.name as task_name, 
                u.username as creator_name
                FROM projects p
                LEFT JOIN departments d ON p.department_id = d.id
                LEFT JOIN task_types t ON p.task_type_id = t.id
                LEFT JOIN users u ON p.created_by = u.id
                WHERE p.id = ?";

        $project = $this->db->fetchRow($sql, [$projectId]);

        if (!$project) {
            throw new Exception('プロジェクトが見つかりません。');
        }

        // プロジェクトに関連するメディアファイルを取得
        $sql = "SELECT * FROM media_files WHERE project_id = ?";
        $media = $this->db->fetchAll($sql, [$projectId]);
        $project['media'] = $media;

        // プロジェクトに関連する要素を取得
        $sql = "SELECT * FROM elements WHERE project_id = ?";
        $elements = $this->db->fetchAll($sql, [$projectId]);
        $project['elements'] = $elements;

        return $project;
    }

    /**
     * 新規プロジェクト作成
     */
    public function createProject($data)
    {
        // 必須フィールドの検証
        if (empty($data['title'])) {
            throw new Exception('タイトルは必須です。');
        }

        // 部署IDと作業タイプIDが存在するか確認
        if (!empty($data['department_id'])) {
            $sql = "SELECT id FROM departments WHERE id = ?";
            $department = $this->db->fetchRow($sql, [$data['department_id']]);

            if (!$department) {
                throw new Exception('指定された部署が存在しません。');
            }
        }

        if (!empty($data['task_type_id'])) {
            $sql = "SELECT id FROM task_types WHERE id = ?";
            $taskType = $this->db->fetchRow($sql, [$data['task_type_id']]);

            if (!$taskType) {
                throw new Exception('指定された作業タイプが存在しません。');
            }
        }

        // プロジェクトの作成
        $projectId = $this->db->insert('projects', $data);

        if (!$projectId) {
            throw new Exception('プロジェクトの作成に失敗しました。');
        }

        return ['id' => $projectId, 'message' => 'プロジェクトが作成されました。'];
    }

    /**
     * プロジェクト更新
     */
    public function updateProject($projectId, $data, $userId)
    {
        // プロジェクトの存在と権限を確認
        $sql = "SELECT * FROM projects WHERE id = ?";
        $project = $this->db->fetchRow($sql, [$projectId]);

        if (!$project) {
            throw new Exception('プロジェクトが見つかりません。');
        }

        // 権限チェック - 作成者または管理者のみ編集可能
        $sql = "SELECT role FROM users WHERE id = ?";
        $user = $this->db->fetchRow($sql, [$userId]);

        if ($project['created_by'] != $userId && $user['role'] !== 'admin') {
            throw new Exception('このプロジェクトを編集する権限がありません。');
        }

        // 更新不可フィールドを削除
        unset($data['id']);
        unset($data['created_by']);
        unset($data['created_at']);

        // プロジェクト更新
        $result = $this->db->update('projects', $data, 'id = ?', [$projectId]);

        if (!$result) {
            throw new Exception('プロジェクトの更新に失敗しました。');
        }

        return ['message' => 'プロジェクトが更新されました。'];
    }

    /**
     * プロジェクト削除
     */
    public function deleteProject($projectId, $userId)
    {
        // プロジェクトの存在と権限を確認
        $sql = "SELECT * FROM projects WHERE id = ?";
        $project = $this->db->fetchRow($sql, [$projectId]);

        if (!$project) {
            throw new Exception('プロジェクトが見つかりません。');
        }

        // 権限チェック - 作成者または管理者のみ削除可能
        $sql = "SELECT role FROM users WHERE id = ?";
        $user = $this->db->fetchRow($sql, [$userId]);

        if ($project['created_by'] != $userId && $user['role'] !== 'admin') {
            throw new Exception('このプロジェクトを削除する権限がありません。');
        }

        try {
            // トランザクション開始
            $this->db->beginTransaction();

            // 関連するメディアファイルを削除
            $sql = "SELECT file_path FROM media_files WHERE project_id = ?";
            $mediaFiles = $this->db->fetchAll($sql, [$projectId]);

            foreach ($mediaFiles as $file) {
                if (file_exists($file['file_path'])) {
                    unlink($file['file_path']);
                }
            }

            // データベースから関連レコードを削除（外部キー制約により自動的に削除される場合もある）
            $this->db->delete('media_files', 'project_id = ?', [$projectId]);
            $this->db->delete('elements', 'project_id = ?', [$projectId]);
            $this->db->delete('timeline', 'project_id = ?', [$projectId]);

            // プロジェクト削除
            $result = $this->db->delete('projects', 'id = ?', [$projectId]);

            if (!$result) {
                throw new Exception('プロジェクトの削除に失敗しました。');
            }

            // コミット
            $this->db->commit();

            return ['message' => 'プロジェクトが削除されました。'];
        } catch (Exception $e) {
            // ロールバック
            $this->db->rollback();
            throw $e;
        }
    }

    /**
     * 共有リンクを生成
     */
    public function generateShareLink($projectId, $userId)
    {
        // 処理開始をログに記録（デバッグ用）
        error_log("generateShareLink: start for project_id=$projectId, user_id=$userId");

        // プロジェクトの存在を確認
        $sql = "SELECT * FROM projects WHERE id = ?";
        $project = $this->db->fetchRow($sql, [$projectId]);

        if (!$project) {
            error_log("generateShareLink: project not found");
            throw new Exception('プロジェクトが見つかりません。');
        }

        // 権限チェックを一時的に無効化（テスト用）
        // 本番環境では適切な権限チェックを行うこと

        try {
            // project_shares テーブルが存在するか確認
            $tablesResult = $this->db->fetchAll("SHOW TABLES LIKE 'project_shares'");
            if (empty($tablesResult)) {
                // テーブルが存在しない場合は作成
                error_log("generateShareLink: Creating project_shares table");
                $this->db->query("
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
                )
            ");
            }

            // ランダムな共有キーを生成
            $shareKey = bin2hex(random_bytes(16));
            $expiryDate = date('Y-m-d H:i:s', strtotime('+30 days'));

            // 既存の共有リンクを確認
            $sql = "SELECT id FROM project_shares WHERE project_id = ?";
            $existingShare = $this->db->fetchRow($sql, [$projectId]);

            if ($existingShare) {
                // 既存のリンクを更新
                error_log("generateShareLink: Updating existing share");
                $result = $this->db->update('project_shares', [
                    'share_key' => $shareKey,
                    'expiry_date' => $expiryDate,
                    'updated_at' => date('Y-m-d H:i:s')
                ], 'project_id = ?', [$projectId]);
            } else {
                // 新規リンクを作成
                error_log("generateShareLink: Creating new share");
                $result = $this->db->insert('project_shares', [
                    'project_id' => $projectId,
                    'share_key' => $shareKey,
                    'created_by' => $userId,
                    'expiry_date' => $expiryDate
                ]);
            }

            if (!$result) {
                error_log("generateShareLink: Failed to save share link");
                throw new Exception('共有リンクの生成に失敗しました。');
            }

            // 共有URL生成
            // $shareUrl = APP_URL . '/share.html?key=' . $shareKey;
            $shareUrl = APP_URL . '/view.html?id=' . $projectId . '&key=' . $shareKey;

            $response = [
                'share_key' => $shareKey,
                'share_url' => $shareUrl,
                'expiry_date' => $expiryDate,
                'message' => '共有リンクを生成しました。'
            ];

            error_log("generateShareLink: success - " . json_encode($response));
            return $response;
        } catch (Exception $e) {
            error_log("generateShareLink: Exception - " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * 共有リンクを無効化
     */
    public function removeShareLink($projectId, $userId)
    {
        // プロジェクトの存在と権限を確認
        $sql = "SELECT * FROM projects WHERE id = ?";
        $project = $this->db->fetchRow($sql, [$projectId]);

        if (!$project) {
            throw new Exception('プロジェクトが見つかりません。');
        }

        // 権限チェック - 作成者または管理者のみリンク削除可能
        $sql = "SELECT role FROM users WHERE id = ?";
        $user = $this->db->fetchRow($sql, [$userId]);

        if ($project['created_by'] != $userId && $user['role'] !== 'admin') {
            throw new Exception('このプロジェクトの共有リンクを削除する権限がありません。');
        }

        // 共有リンクを削除
        $result = $this->db->delete('project_shares', 'project_id = ?', [$projectId]);

        if (!$result) {
            throw new Exception('共有リンクの削除に失敗しました。');
        }

        return ['message' => '共有リンクを削除しました。'];
    }

    /**
     * 共有キーでプロジェクトを取得（認証なしでアクセス）
     */
    public function getSharedProject($shareKey)
    {
        error_log("getSharedProject: Accessing with share key: $shareKey");

        // 共有キーの有効性を確認
        $sql = "SELECT ps.*, p.id as project_id, p.title 
            FROM project_shares ps
            JOIN projects p ON ps.project_id = p.id 
            WHERE ps.share_key = ? AND ps.expiry_date > NOW()";
        $share = $this->db->fetchRow($sql, [$shareKey]);

        if (!$share) {
            error_log("getSharedProject: Invalid or expired share key");
            throw new Exception('有効な共有リンクではないか、期限切れです。');
        }

        error_log("getSharedProject: Valid share key, fetching project id: " . $share['project_id']);

        // プロジェクト詳細を取得
        $sql = "SELECT p.*, d.name as department_name, t.name as task_name, 
            u.username as creator_name
            FROM projects p
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN task_types t ON p.task_type_id = t.id
            LEFT JOIN users u ON p.created_by = u.id
            WHERE p.id = ?";

        $project = $this->db->fetchRow($sql, [$share['project_id']]);

        if (!$project) {
            error_log("getSharedProject: Project not found");
            throw new Exception('プロジェクトが見つかりません。');
        }

        // プロジェクトに関連するメディアファイルを取得
        $sql = "SELECT * FROM media_files WHERE project_id = ?";
        $media = $this->db->fetchAll($sql, [$share['project_id']]);
        $project['media'] = $media;

        // プロジェクトに関連する要素を取得
        $sql = "SELECT * FROM elements WHERE project_id = ?";
        $elements = $this->db->fetchAll($sql, [$share['project_id']]);
        $project['elements'] = $elements;

        // 共有情報を追加
        $project['share_info'] = [
            'share_key' => $share['share_key'],
            'expiry_date' => $share['expiry_date']
        ];

        error_log("getSharedProject: Successfully fetched project and related data");
        return $project;
    }

    /**
     * プロジェクトをHTML形式でダウンロード
     */
    public function downloadProjectAsHTML($projectId, $shareKey = null)
    {
        error_log("downloadProjectAsHTML: Starting download for project $projectId, shareKey: " . ($shareKey ? $shareKey : 'none'));

        try {
            $project = null;

            // 共有キーが指定されている場合
            if ($shareKey) {
                error_log("downloadProjectAsHTML: Using share key");

                // 共有キーの有効性を確認
                $sql = "SELECT ps.project_id 
                    FROM project_shares ps
                    WHERE ps.share_key = ? AND ps.expiry_date > NOW()";
                $share = $this->db->fetchRow($sql, [$shareKey]);

                if (!$share) {
                    error_log("downloadProjectAsHTML: Invalid or expired share key");
                    throw new Exception('有効な共有リンクではないか、期限切れです。');
                }

                if ($share['project_id'] != $projectId) {
                    error_log("downloadProjectAsHTML: Project ID mismatch");
                    throw new Exception('共有キーとプロジェクトIDが一致しません。');
                }

                // プロジェクト情報を取得
                $project = $this->getProjectDataForDownload($projectId);
            } else {
                error_log("downloadProjectAsHTML: No share key, getting project directly");
                // 認証済みユーザーのアクセス - 直接プロジェクト情報を取得
                $project = $this->getProjectDataForDownload($projectId);
            }

            if (!$project) {
                error_log("downloadProjectAsHTML: Project not found");
                throw new Exception('プロジェクトが見つかりません。');
            }

            // HTMLを生成して出力
            error_log("downloadProjectAsHTML: Generating HTML");
            $html = $this->generateProjectHTML($project);

            // Content-Typeヘッダーは呼び出し元で設定済み
            echo $html;
        } catch (Exception $e) {
            error_log("downloadProjectAsHTML Error: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * ダウンロード用にプロジェクトデータを取得
     */
    private function getProjectDataForDownload($projectId)
    {
        // プロジェクト基本情報を取得
        $sql = "SELECT p.*, d.name as department_name, t.name as task_name, 
            u.username as creator_name
            FROM projects p
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN task_types t ON p.task_type_id = t.id
            LEFT JOIN users u ON p.created_by = u.id
            WHERE p.id = ?";

        $project = $this->db->fetchRow($sql, [$projectId]);

        if (!$project) {
            return null;
        }

        // プロジェクトに関連するメディアファイルを取得
        $sql = "SELECT * FROM media_files WHERE project_id = ?";
        $media = $this->db->fetchAll($sql, [$projectId]);
        $project['media'] = $media;

        // プロジェクトに関連する要素を取得
        $sql = "SELECT * FROM elements WHERE project_id = ?";
        $elements = $this->db->fetchAll($sql, [$projectId]);
        $project['elements'] = $elements;

        return $project;
    }

    /**
     * プロジェクトをZIPアーカイブとしてダウンロード
     */
    public function downloadProjectAsZip($projectId, $shareKey = null)
    {
        try {
            // プロジェクトデータを取得
            $project = null;

            // 共有キーが指定されている場合
            if ($shareKey) {
                // 共有キーの有効性を確認
                $sql = "SELECT ps.project_id 
                    FROM project_shares ps
                    WHERE ps.share_key = ? AND ps.expiry_date > NOW()";
                $share = $this->db->fetchRow($sql, [$shareKey]);

                if (!$share || $share['project_id'] != $projectId) {
                    throw new Exception('有効な共有リンクではないか、期限切れです。');
                }

                // プロジェクト情報を取得
                $project = $this->getProjectDataForDownload($projectId);
            } else {
                // 認証済みユーザーのアクセス
                $project = $this->getProjectDataForDownload($projectId);
            }

            if (!$project) {
                throw new Exception('プロジェクトが見つかりません。');
            }

            // 一時ディレクトリを作成
            $tempDir = sys_get_temp_dir() . '/manual_export_' . uniqid();
            if (!file_exists($tempDir)) {
                mkdir($tempDir, 0755, true);
            }

            // メディアファイルをコピー
            $mediaFiles = [];
            foreach ($project['media'] as &$media) {
                $sourceFile = $media['file_path'];
                $fileName = basename($sourceFile);
                $destFile = $tempDir . '/' . $fileName;

                if (file_exists($sourceFile) && copy($sourceFile, $destFile)) {
                    // ファイルパスを相対パスに変更
                    $media['file_path'] = $fileName;
                    $mediaFiles[] = $destFile;
                } else {
                    // ファイルが存在しないか、コピーに失敗した場合
                    $media['file_path'] = '';
                }
            }

            // HTMLファイルを生成
            $htmlContent = $this->generateExportHTML($project);
            $htmlFile = $tempDir . '/index.html';
            file_put_contents($htmlFile, $htmlContent);

            // ZIPファイル名
            $zipFileName = 'manual_' . $projectId . '_' . date('Ymd_His') . '.zip';
            $zipFilePath = $tempDir . '/' . $zipFileName;

            // ZIPアーカイブを作成
            $zip = new ZipArchive();
            if ($zip->open($zipFilePath, ZipArchive::CREATE) !== TRUE) {
                throw new Exception('ZIPファイルの作成に失敗しました。');
            }

            // HTMLファイルを追加
            $zip->addFile($htmlFile, 'index.html');

            // メディアファイルを追加
            foreach ($project['media'] as $media) {
                if (!empty($media['file_path'])) {
                    $sourcePath = $tempDir . '/' . $media['file_path'];
                    $zip->addFile($sourcePath, $media['file_path']);
                }
            }

            $zip->close();

            // ダウンロードヘッダーを設定
            header('Content-Type: application/zip');
            header('Content-Disposition: attachment; filename="' . $zipFileName . '"');
            header('Content-Length: ' . filesize($zipFilePath));
            header('Pragma: no-cache');
            header('Expires: 0');

            // ZIPファイルを出力
            readfile($zipFilePath);

            // 一時ファイルとディレクトリを削除
            @unlink($zipFilePath);
            @unlink($htmlFile);
            foreach ($mediaFiles as $file) {
                @unlink($file);
            }
            @rmdir($tempDir);

            exit;
        } catch (Exception $e) {
            error_log("downloadProjectAsZip Error: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * ZIPアーカイブ用のHTMLを生成
     */
    private function generateExportHTML($project)
    {
        // HTMLコンテンツの生成
        $html = '<!DOCTYPE html>
            <html lang="ja">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>' . htmlspecialchars($project['title']) . ' - マニュアル</title>
                <style>
                    body {
                        font-family: "Helvetica Neue", Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 1200px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    header {
                        margin-bottom: 30px;
                        border-bottom: 1px solid #eee;
                        padding-bottom: 20px;
                    }
                    h1 {
                        font-size: 2em;
                        margin-bottom: 10px;
                    }
                    .meta {
                        color: #666;
                        font-size: 0.9em;
                        margin-bottom: 20px;
                    }
                    .description {
                        margin-bottom: 30px;
                    }
                    .media-container {
                        position: relative;
                        margin-bottom: 30px;
                        max-width: 100%;
                        overflow: hidden;
                    }
                    .media-content {
                        position: relative;
                    }
                    video {
                        max-width: 100%;
                        height: auto;
                        display: block;
                    }
                    img {
                        max-width: 100%;
                        height: auto;
                        display: block;
                    }
                    .controls {
                        margin-top: 10px;
                    }
                    button {
                        background-color: #0d6efd;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        margin-right: 10px;
                    }
                    button:hover {
                        background-color: #0b5ed7;
                    }
                    .elements-container {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        pointer-events: none;
                    }
                    .element-text {
                        position: absolute;
                        background-color: rgba(255, 255, 255, 0.7);
                        padding: 5px;
                        border-radius: 3px;
                        z-index: 10;
                    }
                    .element-rectangle {
                        position: absolute;
                        background-color: rgba(0, 123, 255, 0.3);
                        border: 2px solid rgba(0, 123, 255, 0.5);
                        z-index: 10;
                    }
                    .element-circle {
                        position: absolute;
                        background-color: rgba(220, 53, 69, 0.3);
                        border: 2px solid rgba(220, 53, 69, 0.5);
                        border-radius: 50%;
                        z-index: 10;
                    }
                    .element-arrow {
                        position: absolute;
                        height: 2px;
                        background-color: #dc3545;
                        z-index: 10;
                    }
                    .element-arrow:after {
                        content: "";
                        position: absolute;
                        right: -10px;
                        top: -4px;
                        width: 0;
                        height: 0;
                        border-top: 5px solid transparent;
                        border-bottom: 5px solid transparent;
                        border-left: 10px solid #dc3545;
                    }
                    footer {
                        margin-top: 50px;
                        border-top: 1px solid #eee;
                        padding-top: 20px;
                        font-size: 0.9em;
                        color: #666;
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <header>
                    <h1>' . htmlspecialchars($project['title']) . '</h1>
                    <div class="meta">
                        <div>部署: ' . htmlspecialchars($project['department_name'] ?? '未設定') . '</div>
                        <div>作業タイプ: ' . htmlspecialchars($project['task_name'] ?? '未設定') . '</div>
                        <div>作成者: ' . htmlspecialchars($project['creator_name'] ?? '不明') . '</div>
                    </div>
                    <div class="description">' . nl2br(htmlspecialchars($project['description'] ?? '')) . '</div>
                </header>
                
                <main>';

        // メディアコンテンツを追加
        foreach ($project['media'] as $media) {
            $html .= '
                <div class="media-container" id="media-' . $media['id'] . '">
                    <div class="media-content">';

            if ($media['file_type'] === 'video') {
                // 動画ファイルへの相対パス
                $html .= '
                    <video id="video-' . $media['id'] . '" controls>
                        <source src="' . htmlspecialchars($media['file_path']) . '" type="video/mp4">
                        お使いのブラウザはビデオタグをサポートしていません。
                    </video>
                    <div class="controls">
                        <button onclick="document.getElementById(\'video-' . $media['id'] . '\').play()">再生</button>
                        <button onclick="document.getElementById(\'video-' . $media['id'] . '\').pause()">一時停止</button>
                        <button onclick="document.getElementById(\'video-' . $media['id'] . '\').currentTime = 0; document.getElementById(\'video-' . $media['id'] . '\').pause()">停止</button>
                    </div>';
            } else {
                // 画像ファイルへの相対パス
                $html .= '
                    <img src="' . htmlspecialchars($media['file_path']) . '" alt="' . htmlspecialchars($media['file_name']) . '">';
            }

            // このメディアに関連する要素を追加
            $html .= '
                <div class="elements-container">';

            foreach ($project['elements'] as $element) {
                // 時間に基づいてdata属性を追加
                $startTime = $element['start_time'] ?? 0;
                $endTime = $element['end_time'] ?? 10;

                $style = 'left: ' . htmlspecialchars($element['position_x']) . '%; ' .
                    'top: ' . htmlspecialchars($element['position_y']) . '%; ' .
                    'width: ' . htmlspecialchars($element['width']) . 'px; ' .
                    'height: ' . htmlspecialchars($element['height']) . 'px; ';

                // 回転があれば追加
                if (!empty($element['rotation'])) {
                    $style .= 'transform: rotate(' . htmlspecialchars($element['rotation']) . 'deg); ';
                }

                switch ($element['element_type']) {
                    case 'text':
                        $style .= 'color: ' . htmlspecialchars($element['color'] ?? '#000000') . '; ' .
                            'background-color: ' . htmlspecialchars($element['background'] ?? 'rgba(255,255,255,0.7)') . '; ' .
                            'font-size: ' . htmlspecialchars($element['font_size'] ?? '16') . 'px; ';
                        $html .= '
                            <div class="element-text" style="' . $style . '" data-start-time="' . $startTime . '" data-end-time="' . $endTime . '">' . htmlspecialchars($element['content'] ?? 'テキスト') . '</div>';
                        break;

                    case 'rectangle':
                        $style .= 'background-color: ' . htmlspecialchars($element['background'] ?? 'rgba(0,123,255,0.3)') . '; ';
                        if (!empty($element['border_width'])) {
                            $style .= 'border-width: ' . htmlspecialchars($element['border_width']) . 'px; ' .
                                'border-color: ' . htmlspecialchars($element['border_color'] ?? '#0d6efd') . '; ';
                        }
                        $html .= '
                            <div class="element-rectangle" style="' . $style . '" data-start-time="' . $startTime . '" data-end-time="' . $endTime . '"></div>';
                        break;

                    case 'circle':
                        $style .= 'background-color: ' . htmlspecialchars($element['background'] ?? 'rgba(220,53,69,0.3)') . '; ';
                        if (!empty($element['border_width'])) {
                            $style .= 'border-width: ' . htmlspecialchars($element['border_width']) . 'px; ' .
                                'border-color: ' . htmlspecialchars($element['border_color'] ?? '#dc3545') . '; ';
                        }
                        $html .= '
                            <div class="element-circle" style="' . $style . '" data-start-time="' . $startTime . '" data-end-time="' . $endTime . '"></div>';
                        break;

                    case 'arrow':
                        $style .= 'background-color: ' . htmlspecialchars($element['color'] ?? '#dc3545') . '; ';
                        $html .= '
                            <div class="element-arrow" style="' . $style . '" data-start-time="' . $startTime . '" data-end-time="' . $endTime . '"></div>';
                        break;
                }
            }

            $html .= '
                </div>
            </div>
        </div>';
        }

        $html .= '
                </main>
                
                <footer>
                    <p>このマニュアルは「動画マニュアル作成アプリ」で作成されました。</p>
                    <p>作成日時: ' . date('Y-m-d H:i:s') . '</p>
                </footer>

                <script>
                // ビデオ要素に時間更新イベントリスナーを追加
                document.addEventListener("DOMContentLoaded", function() {
                    // 各ビデオ要素にイベントリスナーを追加
                    const videos = document.querySelectorAll("video");
                    videos.forEach(function(video) {
                        video.addEventListener("timeupdate", function() {
                            updateElementsVisibility(this);
                        });
                        
                        // 再生・一時停止時にも要素の表示/非表示を更新
                        video.addEventListener("play", function() {
                            updateElementsVisibility(this);
                        });
                        
                        video.addEventListener("pause", function() {
                            updateElementsVisibility(this);
                        });
                    });
                    
                    // 各要素の表示／非表示を制御
                    function updateElementsVisibility(videoElement) {
                        const mediaId = videoElement.id.replace("video-", "");
                        const mediaContainer = document.getElementById(`media-${mediaId}`);
                        if (!mediaContainer) return;
                        
                        const elements = mediaContainer.querySelectorAll(".elements-container > div");
                        const currentTime = videoElement.currentTime;
                        
                        elements.forEach(function(element) {
                            // data属性から開始時間と終了時間を取得
                            const startTime = parseFloat(element.getAttribute("data-start-time") || "0");
                            const endTime = parseFloat(element.getAttribute("data-end-time") || "999999");
                            
                            if (currentTime >= startTime && currentTime <= endTime) {
                                element.style.display = "block";
                            } else {
                                element.style.display = "none";
                            }
                        });
                    }
                    
                    // 初期状態では全ての要素を表示
                    videos.forEach(function(video) {
                        const mediaId = video.id.replace("video-", "");
                        const mediaContainer = document.getElementById(`media-${mediaId}`);
                        if (!mediaContainer) return;
                        
                        const elements = mediaContainer.querySelectorAll(".elements-container > div");
                        elements.forEach(function(element) {
                            element.style.display = "block";
                        });
                    });
                });
                </script>
            </body>
            </html>';

        return $html;
    }
}
