<?php
// Media.php - メディアファイル管理クラス

class Media
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
     * メディアファイルの詳細を取得
     */
    public function getMedia($mediaId)
    {
        $sql = "SELECT * FROM media_files WHERE id = ?";
        $media = $this->db->fetchRow($sql, [$mediaId]);

        if (!$media) {
            throw new Exception('メディアファイルが見つかりません。');
        }

        return $media;
    }

    /**
     * プロジェクトに関連するメディアファイルを取得
     */
    public function getMediaByProject($projectId)
    {
        $sql = "SELECT * FROM media_files WHERE project_id = ? ORDER BY created_at";
        return $this->db->fetchAll($sql, [$projectId]);
    }

    /**
     * メディアファイルのアップロード
     */
    public function uploadMedia($file, $projectId, $userId)
    {
        // プロジェクトの存在確認
        $sql = "SELECT * FROM projects WHERE id = ?";
        $project = $this->db->fetchRow($sql, [$projectId]);

        if (!$project) {
            throw new Exception('プロジェクトが見つかりません。');
        }

        // 権限チェック - プロジェクト作成者または編集者以上の権限が必要
        $auth = new Auth($this->db);
        if ($project['created_by'] != $userId && !$auth->canEdit($userId)) {
            throw new Exception('このプロジェクトにファイルをアップロードする権限がありません。');
        }

        // ファイル情報の取得
        $fileName = $file['name'];
        $fileSize = $file['size'];
        $fileTmpName = $file['tmp_name'];
        $fileType = $file['type'];
        $fileError = $file['error'];

        // エラーチェック
        if ($fileError !== 0) {
            throw new Exception('ファイルのアップロードに失敗しました。エラーコード: ' . $fileError);
        }

        // ファイルサイズチェック
        if ($fileSize > MAX_FILE_SIZE) {
            throw new Exception('ファイルサイズが大きすぎます。最大' . (MAX_FILE_SIZE / 1024 / 1024) . 'MBまでです。');
        }

        // ファイルタイプの検証
        $fileTypeValid = false;
        $mediaType = '';

        if (in_array($fileType, ALLOWED_VIDEO_TYPES)) {
            $fileTypeValid = true;
            $mediaType = 'video';
        } else if (in_array($fileType, ALLOWED_IMAGE_TYPES)) {
            $fileTypeValid = true;
            $mediaType = 'image';
        }

        if (!$fileTypeValid) {
            throw new Exception('このファイル形式はサポートされていません。');
        }

        // ファイル名を一意にする
        $fileExtension = pathinfo($fileName, PATHINFO_EXTENSION);
        $newFileName = uniqid('media_') . '.' . $fileExtension;

        // アップロードディレクトリの作成
        $uploadDir = dirname(__DIR__) . '/uploads/project_' . $projectId . '/';
        if (!is_dir($uploadDir)) {
            if (!mkdir($uploadDir, 0755, true)) {
                error_log("Failed to create directory: $uploadDir");
                throw new Exception('アップロードディレクトリの作成に失敗しました。');
            }
        }

        $filePath = $uploadDir . $newFileName;

        // ファイルの移動
        if (!move_uploaded_file($fileTmpName, $filePath)) {
            error_log("Failed to move file to: $filePath");
            throw new Exception('ファイルの保存に失敗しました。');
        }

        // ファイルへのWebアクセスパスを生成
        $webPath = '/video-manual-app/uploads/project_' . $projectId . '/' . $newFileName;

        // ファイル情報の取得（動画の場合は長さも取得）
        $duration = null;
        if ($mediaType === 'video') {
            $duration = $this->getVideoDuration($filePath);
        }

        // データベースに登録
        $mediaData = [
            'project_id' => $projectId,
            'file_name' => $fileName,
            'file_path' => $webPath, 
            'file_type' => $mediaType,
            'file_size' => $fileSize,
            'duration' => $duration,
            'created_by' => $userId
        ];

        $mediaId = $this->db->insert('media_files', $mediaData);

        if (!$mediaId) {
            // 失敗した場合はファイルを削除
            unlink($filePath);
            throw new Exception('メディア情報の登録に失敗しました。');
        }

        // タイムラインにも追加（動画または画像によって開始/終了時間が異なる）
        $startTime = 0;
        $endTime = $duration ? $duration : 10; // 画像の場合はデフォルトで10秒表示

        $timelineData = [
            'project_id' => $projectId,
            'media_id' => $mediaId,
            'start_time' => $startTime,
            'end_time' => $endTime
        ];

        $this->db->insert('timeline', $timelineData);

        return [
            'id' => $mediaId,
            'file_name' => $fileName,
            'file_type' => $mediaType,
            'file_size' => $fileSize,
            'duration' => $duration,
            'message' => 'ファイルがアップロードされました。'
        ];
    }
    

    /**
     * メディアファイルの削除
     */
    public function deleteMedia($mediaId, $userId)
    {
        // メディアファイルの存在確認
        $sql = "SELECT m.*, p.created_by AS project_creator 
                FROM media_files m
                JOIN projects p ON m.project_id = p.id
                WHERE m.id = ?";
        $media = $this->db->fetchRow($sql, [$mediaId]);

        if (!$media) {
            throw new Exception('メディアファイルが見つかりません。');
        }

        // 権限チェック - プロジェクト作成者または管理者のみ削除可能
        $auth = new Auth($this->db);
        if ($media['project_creator'] != $userId && $media['created_by'] != $userId && !$auth->isAdmin($userId)) {
            throw new Exception('このファイルを削除する権限がありません。');
        }

        try {
            // トランザクション開始
            $this->db->beginTransaction();

            // ファイルの物理的な削除
            if (file_exists($media['file_path'])) {
                unlink($media['file_path']);
            }

            // タイムラインからの削除
            $this->db->delete('timeline', 'media_id = ?', [$mediaId]);

            // データベースからの削除
            $result = $this->db->delete('media_files', 'id = ?', [$mediaId]);

            if (!$result) {
                throw new Exception('メディアファイルの削除に失敗しました。');
            }

            // コミット
            $this->db->commit();

            return ['message' => 'メディアファイルが削除されました。'];
        } catch (Exception $e) {
            // ロールバック
            $this->db->rollback();
            throw $e;
        }
    }

    /**
     * 動画の長さを取得
     */
    private function getVideoDuration($filePath)
    {
        // FFmpeg等が利用可能な場合はそれを利用してより正確に取得可能
        try {
            if (function_exists('exec')) {
                $command = "ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 " . escapeshellarg($filePath);
                $output = [];
                exec($command, $output, $returnCode);

                if ($returnCode === 0 && !empty($output[0])) {
                    return floatval($output[0]);
                } else {
                    error_log("FFprobe command failed or not available. Return code: $returnCode");
                }
            }
        } catch (Exception $e) {
            error_log("Error getting video duration: " . $e->getMessage());
        }

        // FFmpegが利用できない場合はデフォルト値を返す
        error_log("Using default duration for video: 10 seconds");
        return 10.0; // デフォルトで10秒と設定
    }
}
