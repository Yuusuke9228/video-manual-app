<?php
// Element.php - エレメント（テキスト、図形など）管理クラス

class Element
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
     * エレメントの詳細を取得
     */
    public function getElement($elementId)
    {
        $sql = "SELECT * FROM elements WHERE id = ?";
        $element = $this->db->fetchRow($sql, [$elementId]);

        if (!$element) {
            throw new Exception('エレメントが見つかりません。');
        }

        return $element;
    }

    /**
     * プロジェクトに関連するエレメントを取得
     */
    public function getElementsByProject($projectId)
    {
        $sql = "SELECT * FROM elements WHERE project_id = ? ORDER BY z_index, created_at";
        return $this->db->fetchAll($sql, [$projectId]);
    }

    /**
     * 新規エレメント作成
     */
    public function createElement($data)
    {
        // 必須フィールドの検証
        if (empty($data['project_id']) || empty($data['element_type'])) {
            throw new Exception('プロジェクトIDとエレメントタイプは必須です。');
        }

        // プロジェクトの存在確認
        $sql = "SELECT * FROM projects WHERE id = ?";
        $project = $this->db->fetchRow($sql, [$data['project_id']]);

        if (!$project) {
            throw new Exception('プロジェクトが見つかりません。');
        }

        // 権限チェック - プロジェクト作成者または編集者以上の権限が必要
        $auth = new Auth($this->db);
        if ($project['created_by'] != $data['created_by'] && !$auth->canEdit($data['created_by'])) {
            throw new Exception('このプロジェクトにエレメントを追加する権限がありません。');
        }

        // エレメントタイプの検証
        $validTypes = ['text', 'rectangle', 'circle', 'arrow', 'image'];
        if (!in_array($data['element_type'], $validTypes)) {
            throw new Exception('無効なエレメントタイプです。');
        }

        // デフォルト値の設定
        if (!isset($data['position_x'])) $data['position_x'] = 0;
        if (!isset($data['position_y'])) $data['position_y'] = 0;
        if (!isset($data['start_time'])) $data['start_time'] = 0;
        if (!isset($data['end_time'])) $data['end_time'] = 10;

        // エレメントタイプに応じたデフォルト値
        switch ($data['element_type']) {
            case 'text':
                if (!isset($data['content'])) $data['content'] = 'テキストを入力';
                if (!isset($data['font_size'])) $data['font_size'] = 16;
                if (!isset($data['color'])) $data['color'] = '#000000';
                break;

            case 'rectangle':
                if (!isset($data['width'])) $data['width'] = 100;
                if (!isset($data['height'])) $data['height'] = 50;
                if (!isset($data['background'])) $data['background'] = 'rgba(0, 123, 255, 0.5)';
                break;

            case 'circle':
                if (!isset($data['width'])) $data['width'] = 50; // 直径
                if (!isset($data['height'])) $data['height'] = 50; // 直径
                if (!isset($data['background'])) $data['background'] = 'rgba(220, 53, 69, 0.5)';
                break;

            case 'arrow':
                if (!isset($data['width'])) $data['width'] = 100; // 長さ
                if (!isset($data['height'])) $data['height'] = 2; // 太さ
                if (!isset($data['color'])) $data['color'] = '#dc3545';
                break;

            case 'image':
                if (!isset($data['width'])) $data['width'] = 100;
                if (!isset($data['height'])) $data['height'] = 100;
                break;
        }

        // エレメントの作成
        $elementId = $this->db->insert('elements', $data);

        if (!$elementId) {
            throw new Exception('エレメントの作成に失敗しました。');
        }

        // タイムラインにも追加
        $timelineData = [
            'project_id' => $data['project_id'],
            'element_id' => $elementId,
            'start_time' => $data['start_time'],
            'end_time' => $data['end_time']
        ];

        $this->db->insert('timeline', $timelineData);

        return [
            'id' => $elementId,
            'element_type' => $data['element_type'],
            'message' => 'エレメントが作成されました。'
        ];
    }

    /**
     * エレメント更新
     */
    public function updateElement($elementId, $data, $userId)
    {
        // エレメントの存在確認
        $sql = "SELECT e.*, p.created_by AS project_creator 
            FROM elements e
            JOIN projects p ON e.project_id = p.id
            WHERE e.id = ?";
        $element = $this->db->fetchRow($sql, [$elementId]);

        if (!$element) {
            throw new Exception('エレメントが見つかりません。');
        }

        // 権限チェック - プロジェクト作成者、エレメント作成者、または編集者以上の権限が必要
        $auth = new Auth($this->db);
        if ($element['project_creator'] != $userId && $element['created_by'] != $userId && !$auth->canEdit($userId)) {
            throw new Exception('このエレメントを編集する権限がありません。');
        }

        // デバッグログ
        error_log("Element update data: " . json_encode($data));

        // 位置情報が数値であることを確認
        if (isset($data['position_x'])) {
            $data['position_x'] = floatval($data['position_x']);
            error_log("Position X set to: " . $data['position_x']);
        }

        if (isset($data['position_y'])) {
            $data['position_y'] = floatval($data['position_y']);
            error_log("Position Y set to: " . $data['position_y']);
        }

        // 更新不可フィールドを削除
        unset($data['id']);
        unset($data['project_id']);
        unset($data['created_by']);
        unset($data['created_at']);

        // エレメント更新
        $result = $this->db->update('elements', $data, 'id = ?', [$elementId]);

        if (!$result) {
            throw new Exception('エレメントの更新に失敗しました。');
        }

        // タイムラインの更新（開始時間または終了時間が変更された場合）
        if (isset($data['start_time']) || isset($data['end_time'])) {
            $timelineData = [];
            if (isset($data['start_time'])) {
                $timelineData['start_time'] = $data['start_time'];
            }
            if (isset($data['end_time'])) {
                $timelineData['end_time'] = $data['end_time'];
            }

            if (!empty($timelineData)) {
                $this->db->update('timeline', $timelineData, 'element_id = ?', [$elementId]);
            }
        }

        // 更新後のエレメント情報を取得
        $updatedElement = $this->getElement($elementId);
        return $updatedElement;
    }

    /**
     * エレメント削除
     */
    public function deleteElement($elementId, $userId)
    {
        // エレメントの存在確認
        $sql = "SELECT e.*, p.created_by AS project_creator 
                FROM elements e
                JOIN projects p ON e.project_id = p.id
                WHERE e.id = ?";
        $element = $this->db->fetchRow($sql, [$elementId]);

        if (!$element) {
            throw new Exception('エレメントが見つかりません。');
        }

        // 権限チェック - プロジェクト作成者、エレメント作成者、または管理者のみ削除可能
        $auth = new Auth($this->db);
        if ($element['project_creator'] != $userId && $element['created_by'] != $userId && !$auth->isAdmin($userId)) {
            throw new Exception('このエレメントを削除する権限がありません。');
        }

        try {
            // トランザクション開始
            $this->db->beginTransaction();

            // タイムラインからの削除
            $this->db->delete('timeline', 'element_id = ?', [$elementId]);

            // エレメントの削除
            $result = $this->db->delete('elements', 'id = ?', [$elementId]);

            if (!$result) {
                throw new Exception('エレメントの削除に失敗しました。');
            }

            // コミット
            $this->db->commit();

            return ['message' => 'エレメントが削除されました。'];
        } catch (Exception $e) {
            // ロールバック
            $this->db->rollback();
            throw $e;
        }
    }
}
