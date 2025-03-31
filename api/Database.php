<?php
// Database.php - データベース接続とクエリ処理を行うクラス

class Database
{
    private $conn;
    private static $instance = null;

    /**
     * シングルトンパターン - 単一のデータベース接続を保証する
     */
    public static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * コンストラクタ - データベース接続を確立
     */
    private function __construct()
    {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            $this->conn = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            error_log("データベース接続エラー: " . $e->getMessage());
            exit('データベースへの接続に失敗しました。管理者にお問い合わせください。');
        }
    }

    /**
     * プリペアドステートメントを使用してクエリを実行
     */
    public function query($sql, $params = [])
    {
        try {
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            error_log("クエリ実行エラー: " . $e->getMessage() . " - SQL: " . $sql);
            return false;
        }
    }

    /**
     * 単一行を取得
     */
    public function fetchRow($sql, $params = [])
    {
        $stmt = $this->query($sql, $params);
        return $stmt ? $stmt->fetch() : false;
    }

    /**
     * 複数行を取得
     */
    public function fetchAll($sql, $params = [])
    {
        $stmt = $this->query($sql, $params);
        return $stmt ? $stmt->fetchAll() : false;
    }

    /**
     * 指定テーブルにデータを挿入
     */
    public function insert($table, $data)
    {
        $columns = implode(', ', array_keys($data));
        $placeholders = implode(', ', array_fill(0, count($data), '?'));
        $sql = "INSERT INTO {$table} ({$columns}) VALUES ({$placeholders})";

        $stmt = $this->query($sql, array_values($data));
        if ($stmt) {
            return $this->conn->lastInsertId();
        }
        return false;
    }

    /**
     * 指定テーブルのデータを更新
     */
    public function update($table, $data, $where, $whereParams = [])
    {
        $setParts = [];
        $params = [];

        foreach ($data as $key => $value) {
            $setParts[] = "{$key} = ?";
            $params[] = $value;
        }

        $setClause = implode(', ', $setParts);
        $sql = "UPDATE {$table} SET {$setClause} WHERE {$where}";

        return $this->query($sql, array_merge($params, $whereParams));
    }

    /**
     * 指定テーブルからデータを削除
     */
    public function delete($table, $where, $params = [])
    {
        $sql = "DELETE FROM {$table} WHERE {$where}";
        return $this->query($sql, $params);
    }

    /**
     * トランザクション開始
     */
    public function beginTransaction()
    {
        return $this->conn->beginTransaction();
    }

    /**
     * トランザクションコミット
     */
    public function commit()
    {
        return $this->conn->commit();
    }

    /**
     * トランザクションロールバック
     */
    public function rollback()
    {
        return $this->conn->rollBack();
    }
}
