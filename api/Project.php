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
}
