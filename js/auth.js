/**
 * 認証関連の処理を行うモジュール
 */
const Auth = (function () {
    // ユーザー情報
    let currentUser = null;

    // ローカルストレージのキー
    const TOKEN_KEY = 'video_manual_token';
    const USER_KEY = 'video_manual_user';

    /**
     * 初期化処理
     */
    function init() {
        // ローカルストレージからユーザー情報とトークンを取得
        const savedToken = localStorage.getItem(TOKEN_KEY);
        const savedUser = localStorage.getItem(USER_KEY);

        if (savedToken && savedUser) {
            try {
                currentUser = JSON.parse(savedUser);

                // トークンをAPIに設定
                API.setToken(savedToken);

                // ユーザー情報を表示
                updateUserInfo();

                return true;
            } catch (error) {
                console.error('ユーザー情報の解析に失敗しました:', error);
                logout();
                return false;
            }
        }

        return false;
    }

    /**
     * ログイン処理
     */
    async function login(username, password) {
        try {
            const response = await API.call('login', 'POST', { username, password });

            // ユーザー情報とトークンを保存
            currentUser = response.user;
            const token = response.token;

            localStorage.setItem(TOKEN_KEY, token);
            localStorage.setItem(USER_KEY, JSON.stringify(currentUser));

            // トークンをAPIに設定
            API.setToken(token);

            // ユーザー情報を表示
            updateUserInfo();

            return true;
        } catch (error) {
            console.error('ログインに失敗しました:', error);
            throw error;
        }
    }

    /**
     * 新規ユーザー登録処理
     */
    async function register(userData) {
        try {
            const response = await API.call('register', 'POST', userData);

            // ユーザー情報とトークンを保存
            currentUser = response.user;
            const token = response.token;

            localStorage.setItem(TOKEN_KEY, token);
            localStorage.setItem(USER_KEY, JSON.stringify(currentUser));

            // トークンをAPIに設定
            API.setToken(token);

            // ユーザー情報を表示
            updateUserInfo();

            return true;
        } catch (error) {
            console.error('ユーザー登録に失敗しました:', error);
            throw error;
        }
    }

    /**
     * ログアウト処理
     */
    function logout() {
        // ユーザー情報とトークンをクリア
        currentUser = null;
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);

        // APIトークンをクリア
        API.clearToken();

        // ログイン画面を表示
        document.getElementById('login-container').style.display = 'flex';
        document.getElementById('user-menu').style.display = 'none';
        document.getElementById('projects-container').style.display = 'none';
        document.getElementById('departments-container').style.display = 'none';
        document.getElementById('project-editor-container').style.display = 'none';

        // フォームをリセット
        document.getElementById('login-form').reset();
        document.getElementById('register-form').reset();
        document.getElementById('login-error').style.display = 'none';
        document.getElementById('register-error').style.display = 'none';
    }

    /**
     * ユーザー情報を画面に表示
     */
    function updateUserInfo() {
        if (currentUser) {
            // ユーザー名を表示
            document.getElementById('username').textContent = currentUser.username;

            // ユーザーメニューを表示
            document.getElementById('user-menu').style.display = 'block';

            // ログイン画面を非表示
            document.getElementById('login-container').style.display = 'none';

            // 管理者機能の表示/非表示
            const adminElements = document.querySelectorAll('.admin-only');
            if (currentUser.role === 'admin') {
                adminElements.forEach(el => el.style.display = 'block');
            } else {
                adminElements.forEach(el => el.style.display = 'none');
            }
        }
    }

    /**
     * 現在のユーザーを取得
     */
    function getCurrentUser() {
        return currentUser;
    }

    /**
     * ユーザーが管理者かどうかをチェック
     */
    function isAdmin() {
        return currentUser && currentUser.role === 'admin';
    }

    /**
     * ユーザーが編集権限を持っているかチェック
     */
    function canEdit() {
        return currentUser && (currentUser.role === 'admin' || currentUser.role === 'editor');
    }

    /**
     * ユーザーIDを取得
     */
    function getUserId() {
        return currentUser ? currentUser.id : null;
    }

    // イベントリスナー登録
    function setupEventListeners() {
        // ログインフォームの送信
        document.getElementById('login-form').addEventListener('submit', async function (e) {
            e.preventDefault();

            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            const errorElement = document.getElementById('login-error');

            try {
                errorElement.style.display = 'none';
                await login(username, password);

                // プロジェクト一覧を表示
                Projects.loadProjects();
                document.getElementById('projects-container').style.display = 'block';
            } catch (error) {
                errorElement.textContent = error.message || 'ログインに失敗しました。';
                errorElement.style.display = 'block';
            }
        });

        // 新規登録フォームの送信
        document.getElementById('register-form').addEventListener('submit', async function (e) {
            e.preventDefault();

            const username = document.getElementById('register-username').value;
            const email = document.getElementById('register-email').value;
            const fullName = document.getElementById('register-fullname').value;
            const password = document.getElementById('register-password').value;
            const passwordConfirm = document.getElementById('register-password-confirm').value;
            const errorElement = document.getElementById('register-error');

            // パスワード一致チェック
            if (password !== passwordConfirm) {
                errorElement.textContent = 'パスワードが一致しません。';
                errorElement.style.display = 'block';
                return;
            }

            try {
                errorElement.style.display = 'none';
                await register({
                    username,
                    email,
                    full_name: fullName,
                    password
                });

                // プロジェクト一覧を表示
                Projects.loadProjects();
                document.getElementById('projects-container').style.display = 'block';
            } catch (error) {
                errorElement.textContent = error.message || 'ユーザー登録に失敗しました。';
                errorElement.style.display = 'block';
            }
        });

        // ログアウトボタンのクリック
        document.getElementById('btn-logout').addEventListener('click', function (e) {
            e.preventDefault();
            logout();
        });
    }

    // 公開API
    return {
        init,
        login,
        register,
        logout,
        getCurrentUser,
        isAdmin,
        canEdit,
        getUserId,
        setupEventListeners
    };
})();