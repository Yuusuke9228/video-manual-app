<?php
// UserManager.php - ユーザー管理クラス

class UserManager
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
     * 全ユーザーを取得（パスワードは除外）
     */
    public function getAllUsers()
    {
        $sql = "SELECT id, username, email, full_name, department_id, role, created_at, updated_at 
                FROM users ORDER BY username";

        $users = $this->db->fetchAll($sql);

        // 部署名を追加
        foreach ($users as &$user) {
            if ($user['department_id']) {
                $sql = "SELECT name FROM departments WHERE id = ?";
                $department = $this->db->fetchRow($sql, [$user['department_id']]);
                $user['department_name'] = $department ? $department['name'] : null;
            } else {
                $user['department_name'] = null;
            }
        }

        return $users;
    }

    /**
     * ユーザー詳細を取得（パスワードは除外）
     */
    public function getUser($userId)
    {
        $sql = "SELECT id, username, email, full_name, department_id, role, created_at, updated_at 
                FROM users WHERE id = ?";

        $user = $this->db->fetchRow($sql, [$userId]);

        if (!$user) {
            throw new Exception('ユーザーが見つかりません。');
        }

        // 部署名を追加
        if ($user['department_id']) {
            $sql = "SELECT name FROM departments WHERE id = ?";
            $department = $this->db->fetchRow($sql, [$user['department_id']]);
            $user['department_name'] = $department ? $department['name'] : null;
        } else {
            $user['department_name'] = null;
        }

        return $user;
    }

    /**
     * 新規ユーザーを作成
     */
    public function createUser($userData)
    {
        // 必須フィールドの検証
        if (empty($userData['username']) || empty($userData['email'])) {
            throw new Exception('ユーザー名とメールアドレスは必須です。');
        }

        // パスワードが指定されていない場合はランダムに生成
        if (empty($userData['password'])) {
            $userData['password'] = $this->generateRandomPassword();
            $generatedPassword = $userData['password']; // 生成したパスワードを記録
        }

        // ユーザー名の重複チェック
        $sql = "SELECT id FROM users WHERE username = ?";
        $existingUser = $this->db->fetchRow($sql, [$userData['username']]);

        if ($existingUser) {
            throw new Exception('このユーザー名は既に使用されています。');
        }

        // メールアドレスの重複チェック
        $sql = "SELECT id FROM users WHERE email = ?";
        $existingEmail = $this->db->fetchRow($sql, [$userData['email']]);

        if ($existingEmail) {
            throw new Exception('このメールアドレスは既に使用されています。');
        }

        // パスワードのハッシュ化
        $userData['password'] = password_hash($userData['password'], PASSWORD_DEFAULT);

        // デフォルトの権限を設定（指定がなければビューア）
        if (empty($userData['role'])) {
            $userData['role'] = 'viewer';
        }

        // ユーザーデータの挿入
        $userId = $this->db->insert('users', $userData);

        if (!$userId) {
            throw new Exception('ユーザー登録に失敗しました。');
        }

        // 生成したパスワードを応答に含める
        $response = ['id' => $userId, 'message' => 'ユーザーを作成しました。'];
        if (isset($generatedPassword)) {
            $response['generated_password'] = $generatedPassword;
            $response['message'] .= ' 生成されたパスワードをユーザーに通知してください。';
        }

        return $response;
    }

    /**
     * ユーザー情報を更新
     */
    public function updateUser($userId, $userData)
    {
        // ユーザーの存在確認
        $sql = "SELECT * FROM users WHERE id = ?";
        $user = $this->db->fetchRow($sql, [$userId]);

        if (!$user) {
            throw new Exception('ユーザーが見つかりません。');
        }

        // ユーザー名の重複チェック（自分自身は除く）
        if (!empty($userData['username']) && $userData['username'] !== $user['username']) {
            $sql = "SELECT id FROM users WHERE username = ? AND id != ?";
            $existingUser = $this->db->fetchRow($sql, [$userData['username'], $userId]);

            if ($existingUser) {
                throw new Exception('このユーザー名は既に使用されています。');
            }
        }

        // メールアドレスの重複チェック（自分自身は除く）
        if (!empty($userData['email']) && $userData['email'] !== $user['email']) {
            $sql = "SELECT id FROM users WHERE email = ? AND id != ?";
            $existingEmail = $this->db->fetchRow($sql, [$userData['email'], $userId]);

            if ($existingEmail) {
                throw new Exception('このメールアドレスは既に使用されています。');
            }
        }

        // パスワード変更の場合
        $passwordChanged = false;
        if (!empty($userData['password'])) {
            $userData['password'] = password_hash($userData['password'], PASSWORD_DEFAULT);
            $passwordChanged = true;
        } else {
            // パスワードフィールドを更新対象から除外
            unset($userData['password']);
        }

        // 更新不可のフィールドを除外
        unset($userData['id']);
        unset($userData['created_at']);

        // データが空でないことを確認
        if (empty($userData)) {
            throw new Exception('更新するデータがありません。');
        }

        // ユーザーデータの更新
        $result = $this->db->update('users', $userData, 'id = ?', [$userId]);

        if (!$result) {
            throw new Exception('ユーザー情報の更新に失敗しました。');
        }

        $message = 'ユーザー情報を更新しました。';
        if ($passwordChanged) {
            $message .= ' パスワードも変更されました。';
        }

        return ['message' => $message];
    }

    /**
     * ユーザーを削除
     */
    public function deleteUser($userId)
    {
        // ユーザーの存在確認
        $sql = "SELECT * FROM users WHERE id = ?";
        $user = $this->db->fetchRow($sql, [$userId]);

        if (!$user) {
            throw new Exception('ユーザーが見つかりません。');
        }

        // 最後の管理者は削除不可
        if ($user['role'] === 'admin') {
            $sql = "SELECT COUNT(*) as count FROM users WHERE role = 'admin'";
            $adminCount = $this->db->fetchRow($sql);

            if ($adminCount['count'] <= 1) {
                throw new Exception('最後の管理者ユーザーは削除できません。');
            }
        }

        // ユーザーの削除
        $result = $this->db->delete('users', 'id = ?', [$userId]);

        if (!$result) {
            throw new Exception('ユーザーの削除に失敗しました。');
        }

        return ['message' => 'ユーザーを削除しました。'];
    }

    /**
     * ランダムパスワードを生成
     */
    private function generateRandomPassword($length = 12)
    {
        $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_';
        $password = '';

        for ($i = 0; $i < $length; $i++) {
            $password .= $chars[random_int(0, strlen($chars) - 1)];
        }

        return $password;
    }
}
