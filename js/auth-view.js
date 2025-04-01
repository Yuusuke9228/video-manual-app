/**
 * 閲覧ページ用の認証関連処理を行うモジュール
 */
const Auth = (function () {
    // ユーザー情報
    let currentUser = null;

    // ローカルストレージのキー
    const TOKEN_KEY = 'video_manual_token';
    const USER_KEY = 'video_manual_user';

    /**
     * 初期化処理 (簡易版)
     */
    function init() {
        try {
            // ローカルストレージからユーザー情報とトークンを取得
            const savedToken = localStorage.getItem(TOKEN_KEY);
            const savedUser = localStorage.getItem(USER_KEY);

            if (savedToken && savedUser) {
                try {
                    currentUser = JSON.parse(savedUser);

                    // トークンをAPIに設定
                    API.setToken(savedToken);

                    return true;
                } catch (error) {
                    console.error('ユーザー情報の解析に失敗しました:', error);
                    return false;
                }
            }
        } catch (error) {
            console.error('認証初期化エラー:', error);
        }

        return false;
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

    // 公開API
    return {
        init,
        getCurrentUser,
        isAdmin,
        canEdit,
        getUserId
    };
})();