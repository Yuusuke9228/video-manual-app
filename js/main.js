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

    // 認証済みの場合はプロジェクト一覧を表示
    if (isAuthenticated) {
        Projects.loadProjects();
        document.getElementById('projects-container').style.display = 'block';
    } else {
        // 未認証の場合はログイン画面を表示
        document.getElementById('login-container').style.display = 'flex';
    }
});