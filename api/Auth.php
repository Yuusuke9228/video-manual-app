<?php
// Auth.php - 認証管理クラス

class Auth {
    private $db;
    
    /**
     * コンストラクタ
     */
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * ユーザーログイン処理
     */
    public function login($username, $password) {
        $sql = "SELECT id, username, password, email, full_name, role FROM users WHERE username = ?";
        $user = $this->db->fetchRow($sql, [$username]);
        
        if (!$user) {
            throw new Exception('ユーザー名またはパスワードが正しくありません。');
        }
        
        if (!password_verify($password, $user['password'])) {
            throw new Exception('ユーザー名またはパスワードが正しくありません。');
        }
        
        // パスワードハッシュを削除
        unset($user['password']);
        
        // JWTトークンを生成
        $token = $this->generateToken($user['id']);
        
        return [
            'user' => $user,
            'token' => $token
        ];
    }
    
    /**
     * ユーザー登録処理
     */
    public function register($userData) {
        // 必須フィールドの検証
        if (empty($userData['username']) || empty($userData['password']) || empty($userData['email'])) {
            throw new Exception('ユーザー名、パスワード、メールアドレスは必須です。');
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
        
        // デフォルトの権限を設定
        $userData['role'] = 'viewer';
        
        // ユーザーデータの挿入
        $userId = $this->db->insert('users', $userData);
        
        if (!$userId) {
            throw new Exception('ユーザー登録に失敗しました。');
        }
        
        // 登録したユーザー情報を取得
        $sql = "SELECT id, username, email, full_name, role FROM users WHERE id = ?";
        $user = $this->db->fetchRow($sql, [$userId]);
        
        // JWTトークンを生成
        $token = $this->generateToken($userId);
        
        return [
            'user' => $user,
            'token' => $token
        ];
    }
    
    /**
     * JWTトークンを生成
     */
    private function generateToken($userId) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $header = base64_encode($header);
        
        $issuedAt = time();
        $expirationTime = $issuedAt + 3600; // 1時間の有効期限
        
        $payload = json_encode([
            'user_id' => $userId,
            'iat' => $issuedAt,
            'exp' => $expirationTime
        ]);
        $payload = base64_encode($payload);
        
        $signature = hash_hmac('sha256', "$header.$payload", CSRF_TOKEN_SECRET, true);
        $signature = base64_encode($signature);
        
        return "$header.$payload.$signature";
    }
    
    /**
     * トークンの検証
     */
    public function validateToken($token) {
        $parts = explode('.', $token);
        
        if (count($parts) !== 3) {
            return false;
        }
        
        list($header, $payload, $signature) = $parts;
        
        $verifySignature = base64_encode(hash_hmac('sha256', "$header.$payload", CSRF_TOKEN_SECRET, true));
        
        if ($signature !== $verifySignature) {
            return false;
        }
        
        $payload = json_decode(base64_decode($payload), true);
        
        // 有効期限切れチェック
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return false;
        }
        
        return true;
    }
    
    /**
     * トークンからユーザーIDを取得
     */
    public function getUserIdFromToken($token) {
        $parts = explode('.', $token);
        
        if (count($parts) !== 3) {
            return null;
        }
        
        $payload = json_decode(base64_decode($parts[1]), true);
        
        return $payload['user_id'] ?? null;
    }
    
    /**
     * ユーザーが管理者かどうか確認
     */
    public function isAdmin($userId) {
        $sql = "SELECT role FROM users WHERE id = ?";
        $user = $this->db->fetchRow($sql, [$userId]);
        
        return $user && $user['role'] === 'admin';
    }
    
    /**
     * ユーザーが編集者以上の権限を持っているか確認
     */
    public function canEdit($userId) {
        $sql = "SELECT role FROM users WHERE id = ?";
        $user = $this->db->fetchRow($sql, [$userId]);
        
        return $user && ($user['role'] === 'admin' || $user['role'] === 'editor');
    }
}