<?php
// Department.php - 部署と作業タイプ管理クラス

class Department
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
     * 全部署を取得
     */
    public function getAllDepartments()
    {
        $sql = "SELECT * FROM departments ORDER BY name";
        return $this->db->fetchAll($sql);
    }

    /**
     * 部署詳細を取得
     */
    public function getDepartment($departmentId)
    {
        $sql = "SELECT * FROM departments WHERE id = ?";
        $department = $this->db->fetchRow($sql, [$departmentId]);

        if (!$department) {
            throw new Exception('部署が見つかりません。');
        }

        return $department;
    }

    /**
     * 新規部署作成
     */
    public function createDepartment($data)
    {
        // 必須フィールドの検証
        if (empty($data['name'])) {
            throw new Exception('部署名は必須です。');
        }

        // 部署名の重複チェック
        $sql = "SELECT id FROM departments WHERE name = ?";
        $existingDepartment = $this->db->fetchRow($sql, [$data['name']]);

        if ($existingDepartment) {
            throw new Exception('この部署名は既に使用されています。');
        }

        // 部署の作成
        $departmentId = $this->db->insert('departments', $data);

        if (!$departmentId) {
            throw new Exception('部署の作成に失敗しました。');
        }

        return ['id' => $departmentId, 'message' => '部署が作成されました。'];
    }

    /**
     * 部署更新
     */
    public function updateDepartment($departmentId, $data)
    {
        // 部署の存在確認
        $sql = "SELECT * FROM departments WHERE id = ?";
        $department = $this->db->fetchRow($sql, [$departmentId]);

        if (!$department) {
            throw new Exception('部署が見つかりません。');
        }

        // 部署名の重複チェック（自分自身は除く）
        if (!empty($data['name']) && $data['name'] !== $department['name']) {
            $sql = "SELECT id FROM departments WHERE name = ? AND id != ?";
            $existingDepartment = $this->db->fetchRow($sql, [$data['name'], $departmentId]);

            if ($existingDepartment) {
                throw new Exception('この部署名は既に使用されています。');
            }
        }

        // 更新不可フィールドを削除
        unset($data['id']);
        unset($data['created_at']);

        // 部署更新
        $result = $this->db->update('departments', $data, 'id = ?', [$departmentId]);

        if (!$result) {
            throw new Exception('部署の更新に失敗しました。');
        }

        return ['message' => '部署が更新されました。'];
    }

    /**
     * 部署削除
     */
    public function deleteDepartment($departmentId)
    {
        // 部署の存在確認
        $sql = "SELECT * FROM departments WHERE id = ?";
        $department = $this->db->fetchRow($sql, [$departmentId]);

        if (!$department) {
            throw new Exception('部署が見つかりません。');
        }

        // 関連するプロジェクトの確認
        $sql = "SELECT COUNT(*) as count FROM projects WHERE department_id = ?";
        $result = $this->db->fetchRow($sql, [$departmentId]);

        if ($result && $result['count'] > 0) {
            throw new Exception('この部署に関連するプロジェクトが存在するため削除できません。');
        }

        // 関連するユーザーの確認
        $sql = "SELECT COUNT(*) as count FROM users WHERE department_id = ?";
        $result = $this->db->fetchRow($sql, [$departmentId]);

        if ($result && $result['count'] > 0) {
            throw new Exception('この部署に所属するユーザーが存在するため削除できません。');
        }

        try {
            // トランザクション開始
            $this->db->beginTransaction();

            // 関連する作業タイプの削除
            $this->db->delete('task_types', 'department_id = ?', [$departmentId]);

            // 部署の削除
            $result = $this->db->delete('departments', 'id = ?', [$departmentId]);

            if (!$result) {
                throw new Exception('部署の削除に失敗しました。');
            }

            // コミット
            $this->db->commit();

            return ['message' => '部署が削除されました。'];
        } catch (Exception $e) {
            // ロールバック
            $this->db->rollback();
            throw $e;
        }
    }

    /**
     * 全作業タイプを取得
     */
    public function getAllTasks()
    {
        $sql = "SELECT t.*, d.name as department_name 
                FROM task_types t
                LEFT JOIN departments d ON t.department_id = d.id
                ORDER BY d.name, t.name";
        return $this->db->fetchAll($sql);
    }

    /**
     * 部署に関連する作業タイプを取得
     */
    public function getTasksByDepartment($departmentId)
    {
        $sql = "SELECT * FROM task_types WHERE department_id = ? ORDER BY name";
        return $this->db->fetchAll($sql, [$departmentId]);
    }

    /**
     * 作業タイプ詳細を取得
     */
    public function getTask($taskId)
    {
        $sql = "SELECT t.*, d.name as department_name 
                FROM task_types t
                LEFT JOIN departments d ON t.department_id = d.id
                WHERE t.id = ?";
        $task = $this->db->fetchRow($sql, [$taskId]);

        if (!$task) {
            throw new Exception('作業タイプが見つかりません。');
        }

        return $task;
    }

    /**
     * 新規作業タイプ作成
     */
    public function createTask($data)
    {
        // 必須フィールドの検証
        if (empty($data['name']) || empty($data['department_id'])) {
            throw new Exception('作業タイプ名と部署IDは必須です。');
        }

        // 部署の存在確認
        $sql = "SELECT id FROM departments WHERE id = ?";
        $department = $this->db->fetchRow($sql, [$data['department_id']]);

        if (!$department) {
            throw new Exception('指定された部署が存在しません。');
        }

        // 作業タイプ名の重複チェック（同じ部署内で）
        $sql = "SELECT id FROM task_types WHERE name = ? AND department_id = ?";
        $existingTask = $this->db->fetchRow($sql, [$data['name'], $data['department_id']]);

        if ($existingTask) {
            throw new Exception('この作業タイプ名は既に同じ部署内で使用されています。');
        }

        // 作業タイプの作成
        $taskId = $this->db->insert('task_types', $data);

        if (!$taskId) {
            throw new Exception('作業タイプの作成に失敗しました。');
        }

        return ['id' => $taskId, 'message' => '作業タイプが作成されました。'];
    }

    /**
     * 作業タイプ更新
     */
    public function updateTask($taskId, $data)
    {
        // 作業タイプの存在確認
        $sql = "SELECT * FROM task_types WHERE id = ?";
        $task = $this->db->fetchRow($sql, [$taskId]);

        if (!$task) {
            throw new Exception('作業タイプが見つかりません。');
        }

        // 部署の変更がある場合は存在確認
        if (!empty($data['department_id']) && $data['department_id'] !== $task['department_id']) {
            $sql = "SELECT id FROM departments WHERE id = ?";
            $department = $this->db->fetchRow($sql, [$data['department_id']]);

            if (!$department) {
                throw new Exception('指定された部署が存在しません。');
            }
        }

        // 作業タイプ名の重複チェック（同じ部署内で、自分自身は除く）
        if (!empty($data['name']) && !empty($data['department_id'])) {
            $departmentId = $data['department_id'];
            $sql = "SELECT id FROM task_types WHERE name = ? AND department_id = ? AND id != ?";
            $existingTask = $this->db->fetchRow($sql, [$data['name'], $departmentId, $taskId]);

            if ($existingTask) {
                throw new Exception('この作業タイプ名は既に同じ部署内で使用されています。');
            }
        } else if (!empty($data['name'])) {
            $departmentId = $task['department_id'];
            $sql = "SELECT id FROM task_types WHERE name = ? AND department_id = ? AND id != ?";
            $existingTask = $this->db->fetchRow($sql, [$data['name'], $departmentId, $taskId]);

            if ($existingTask) {
                throw new Exception('この作業タイプ名は既に同じ部署内で使用されています。');
            }
        }

        // 更新不可フィールドを削除
        unset($data['id']);
        unset($data['created_at']);

        // 作業タイプ更新
        $result = $this->db->update('task_types', $data, 'id = ?', [$taskId]);

        if (!$result) {
            throw new Exception('作業タイプの更新に失敗しました。');
        }

        return ['message' => '作業タイプが更新されました。'];
    }

    /**
     * 作業タイプ削除
     */
    public function deleteTask($taskId)
    {
        // 作業タイプの存在確認
        $sql = "SELECT * FROM task_types WHERE id = ?";
        $task = $this->db->fetchRow($sql, [$taskId]);

        if (!$task) {
            throw new Exception('作業タイプが見つかりません。');
        }

        // 関連するプロジェクトの確認
        $sql = "SELECT COUNT(*) as count FROM projects WHERE task_type_id = ?";
        $result = $this->db->fetchRow($sql, [$taskId]);

        if ($result && $result['count'] > 0) {
            throw new Exception('この作業タイプに関連するプロジェクトが存在するため削除できません。');
        }

        // 作業タイプの削除
        $result = $this->db->delete('task_types', 'id = ?', [$taskId]);

        if (!$result) {
            throw new Exception('作業タイプの削除に失敗しました。');
        }

        return ['message' => '作業タイプが削除されました。'];
    }
}
