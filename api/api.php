<?php
// api.php - REST API エンドポイント

require_once 'config.php';
require_once 'Database.php';
require_once 'Auth.php';
require_once 'Project.php';
require_once 'Media.php';
require_once 'Element.php';
require_once 'Department.php';

// CORSヘッダー設定
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// OPTIONSリクエスト（プリフライトリクエスト）の処理
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('HTTP/1.1 200 OK');
    exit();
}

// リクエストの処理（URLパラメータを使用）
$resourceType = isset($_GET['type']) ? $_GET['type'] : '';
$resourceId = isset($_GET['id']) ? $_GET['id'] : null;
$action = isset($_GET['action']) ? $_GET['action'] : null;

// リクエストボディを取得
$requestBody = file_get_contents('php://input');
$data = json_decode($requestBody, true);

// データベース接続を取得
$db = Database::getInstance();

// 認証チェック (ログイン以外のエンドポイントでは認証必須)
$auth = new Auth($db);
if ($resourceType !== 'login' && $resourceType !== 'register') {
    $token = getBearerToken();
    if (!$token || !$auth->validateToken($token)) {
        http_response_code(401);
        echo json_encode(['error' => '認証が必要です。']);
        exit();
    }

    // ユーザーIDを取得
    $userId = $auth->getUserIdFromToken($token);
}

// エンドポイント処理
try {
    switch ($resourceType) {
        case 'login':
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $username = $data['username'] ?? '';
                $password = $data['password'] ?? '';

                if (empty($username) || empty($password)) {
                    throw new Exception('ユーザー名とパスワードを入力してください。');
                }

                $result = $auth->login($username, $password);
                echo json_encode($result);
            } else {
                throw new Exception('不正なメソッドです。');
            }
            break;

        case 'register':
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $result = $auth->register($data);
                echo json_encode($result);
            } else {
                throw new Exception('不正なメソッドです。');
            }
            break;

        case 'departments':
            $department = new Department($db);

            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                if ($resourceId && $action === 'tasks') {
                    // 作業タイプリストを取得（条件分岐を明確に）
                    error_log("Fetching tasks for department ID: $resourceId");
                    $result = $department->getTasksByDepartment($resourceId);
                    error_log("Tasks result: " . json_encode($result));
                } elseif ($resourceId) {
                    // 部署詳細を取得
                    $result = $department->getDepartment($resourceId);
                } else {
                    // 部署一覧を取得
                    $result = $department->getAllDepartments();
                }
                echo json_encode($result);
            } else if ($_SERVER['REQUEST_METHOD'] === 'POST' && $auth->isAdmin($userId)) {
                $result = $department->createDepartment($data);
                echo json_encode($result);
            } else if ($_SERVER['REQUEST_METHOD'] === 'PUT' && $resourceId && $auth->isAdmin($userId)) {
                $result = $department->updateDepartment($resourceId, $data);
                echo json_encode($result);
            } else if ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $resourceId && $auth->isAdmin($userId)) {
                $result = $department->deleteDepartment($resourceId);
                echo json_encode($result);
            } else {
                throw new Exception('不正なリクエストです。');
            }
            break;

        case 'tasks':
            $department = new Department($db);

            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                if ($resourceId) {
                    if ($action === 'tasks') {
                        $result = $department->getTasksByDepartment($resourceId);
                    } else {
                        $result = $department->getTask($resourceId);
                    }
                } else {
                    $result = $department->getAllTasks();
                }
                echo json_encode($result);
            } else if ($_SERVER['REQUEST_METHOD'] === 'POST' && $auth->isAdmin($userId)) {
                $result = $department->createTask($data);
                echo json_encode($result);
            } else if ($_SERVER['REQUEST_METHOD'] === 'PUT' && $resourceId && $auth->isAdmin($userId)) {
                $result = $department->updateTask($resourceId, $data);
                echo json_encode($result);
            } else if ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $resourceId && $auth->isAdmin($userId)) {
                $result = $department->deleteTask($resourceId);
                echo json_encode($result);
            } else {
                throw new Exception('不正なリクエストです。');
            }
            break;

        case 'projects':
            $project = new Project($db);

            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                if ($resourceId) {
                    $result = $project->getProject($resourceId);
                } else {
                    $result = $project->getAllProjects($userId);
                }
                echo json_encode($result);
            } else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $data['created_by'] = $userId;
                $result = $project->createProject($data);
                echo json_encode($result);
            } else if ($_SERVER['REQUEST_METHOD'] === 'PUT' && $resourceId) {
                $result = $project->updateProject($resourceId, $data, $userId);
                echo json_encode($result);
            } else if ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $resourceId) {
                $result = $project->deleteProject($resourceId, $userId);
                echo json_encode($result);
            } else {
                throw new Exception('不正なリクエストです。');
            }
            break;

        case 'media':
            $media = new Media($db);

            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                if ($resourceId) {
                    $result = $media->getMedia($resourceId);
                } else if (isset($_GET['project_id'])) {
                    $result = $media->getMediaByProject($_GET['project_id']);
                } else {
                    throw new Exception('プロジェクトIDが必要です。');
                }
                echo json_encode($result);
            } else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                if (!isset($_FILES['file'])) {
                    throw new Exception('ファイルがアップロードされていません。');
                }

                $projectId = $_POST['project_id'] ?? null;
                if (!$projectId) {
                    throw new Exception('プロジェクトIDが必要です。');
                }

                $result = $media->uploadMedia($_FILES['file'], $projectId, $userId);
                echo json_encode($result);
            } else if ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $resourceId) {
                $result = $media->deleteMedia($resourceId, $userId);
                echo json_encode($result);
            } else {
                throw new Exception('不正なリクエストです。');
            }
            break;

        case 'elements':
            $element = new Element($db);

            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                if ($resourceId) {
                    $result = $element->getElement($resourceId);
                } else if (isset($_GET['project_id'])) {
                    $result = $element->getElementsByProject($_GET['project_id']);
                } else {
                    throw new Exception('プロジェクトIDが必要です。');
                }
                echo json_encode($result);
            } else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $data['created_by'] = $userId;
                $result = $element->createElement($data);
                echo json_encode($result);
            } else if ($_SERVER['REQUEST_METHOD'] === 'PUT' && $resourceId) {
                $result = $element->updateElement($resourceId, $data, $userId);
                echo json_encode($result);
            } else if ($_SERVER['REQUEST_METHOD'] === 'DELETE' && $resourceId) {
                $result = $element->deleteElement($resourceId, $userId);
                echo json_encode($result);
            } else {
                throw new Exception('不正なリクエストです。');
            }
            break;

        default:
            http_response_code(404);
            echo json_encode(['error' => 'リソースが見つかりません。']);
            break;
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}

// Bearer トークンを取得するヘルパー関数
function getBearerToken()
{
    $headers = getallheaders();
    if (isset($headers['Authorization'])) {
        if (preg_match('/Bearer\s(\S+)/', $headers['Authorization'], $matches)) {
            return $matches[1];
        }
    }
    return null;
}
