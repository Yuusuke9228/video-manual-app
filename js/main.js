/**
 * アプリケーションのメイン初期化処理
 */
document.addEventListener('DOMContentLoaded', function () {
    // 認証モジュールの初期化
    const isAuthenticated = Auth.init();

    // イベントリスナーの設定
    Auth.setupEventListeners();
    Projects.setupEventListeners();
    Departments.setupEventListeners();
    Editor.setupEventListeners();
    Users.setupEventListeners(); 

    // 管理者権限チェック（ユーザー管理メニューの表示制御）
    function updateAdminFeatures() {
        const currentUser = Auth.getCurrentUser();
        if (currentUser && currentUser.role === 'admin') {
            // 管理者権限を持つ場合、管理者用機能を表示
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'block';
            });
        } else {
            // 管理者権限がない場合は非表示
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'none';
            });
        }
    }

    // 認証状態変更時に管理者権限チェックを実行
    window.addEventListener('auth-state-changed', updateAdminFeatures);

    // 初期状態でも実行
    updateAdminFeatures();

    // 認証済みの場合はプロジェクト一覧を表示
    if (isAuthenticated) {
        Projects.loadProjects();
        document.getElementById('projects-container').style.display = 'block';
    } else {
        // 未認証の場合はログイン画面を表示
        document.getElementById('login-container').style.display = 'flex';
    }

    // カスタムイベントの生成
    window.dispatchEvent(new Event('app-loaded'));
});

// すべてのコンテナを非表示にする関数
function hideAllContainers() {
    const containers = [
        'projects-container',
        'departments-container',
        'project-editor-container',
        'users-container',
        'login-container'
    ];

    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'none';
        }
    });
}

// グローバルに公開する
window.hideAllContainers = hideAllContainers;