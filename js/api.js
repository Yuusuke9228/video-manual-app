/**
 * APIとの通信を行うモジュール
 */
const API = (function () {
    // APIのベースURL（サーバー環境に合わせて変更）
    // const BASE_URL = '/api'; // 元のURL
    const BASE_URL = '/video-manual-app/api/api.php'; // 修正後のURL - api.phpに直接アクセス

    // 認証トークン
    let token = null;

    /**
     * APIコールを実行
     * @param {string} endpoint - APIエンドポイント
     * @param {string} method - HTTPメソッド（GET, POST, PUT, DELETE）
     * @param {Object} data - 送信データ
     * @returns {Promise} APIレスポンス
     */
    async function call(endpoint, method = 'GET', data = null) {
        let url;
        if (endpoint.includes('/')) {
            // endpoints/id/action 形式の場合
            const parts = endpoint.split('/');
            if (parts.length === 3) {
                // 部署ID + アクション (departments/2/tasks のような形式)
                url = `${BASE_URL}?type=${parts[0]}&id=${parts[1]}&action=${parts[2]}`;
            } else {
                // 単純なID (departments/2 のような形式)
                url = `${BASE_URL}?type=${parts[0]}&id=${parts[1]}`;
            }
        } else {
            // 単純なエンドポイント
            url = `${BASE_URL}?type=${endpoint}`;
        }

        console.log('API URL:', url); // デバッグ用

        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        // 認証トークンがあれば設定
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        // リクエストボディの設定
        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || 'APIリクエストに失敗しました。');
            }

            return responseData;
        } catch (error) {
            console.error('API呼び出しエラー:', error);
            throw error;
        }
    }

    /**
     * ファイルアップロード用APIコール
     * @param {string} endpoint - APIエンドポイント
     * @param {FormData} formData - フォームデータ（ファイル含む）
     * @param {function} progressCallback - 進捗コールバック関数
     * @returns {Promise} APIレスポンス
     */
    async function uploadFile(endpoint, formData, progressCallback = null) {
        const url = `${BASE_URL}?type=${endpoint}`;

        const options = {
            method: 'POST',
            headers: {},
            body: formData
        };

        // 認証トークンがあれば設定
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                // 進捗イベントのリスナー
                if (progressCallback && typeof progressCallback === 'function') {
                    xhr.upload.addEventListener('progress', (event) => {
                        if (event.lengthComputable) {
                            const percentComplete = Math.round((event.loaded / event.total) * 100);
                            progressCallback(percentComplete);
                        }
                    });
                }

                // リクエスト完了イベント
                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            resolve(response);
                        } catch (error) {
                            reject(new Error('レスポンスのパースに失敗しました。'));
                        }
                    } else {
                        try {
                            const errorData = JSON.parse(xhr.responseText);
                            reject(new Error(errorData.error || 'ファイルアップロードに失敗しました。'));
                        } catch (error) {
                            reject(new Error('ファイルアップロードに失敗しました。'));
                        }
                    }
                });

                // エラーイベント
                xhr.addEventListener('error', () => {
                    reject(new Error('ネットワークエラーが発生しました。'));
                });

                // 中止イベント
                xhr.addEventListener('abort', () => {
                    reject(new Error('アップロードが中止されました。'));
                });

                // リクエスト開始
                xhr.open('POST', url);

                // 認証ヘッダーの設定
                if (token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                }

                xhr.send(formData);
            });
        } catch (error) {
            console.error('ファイルアップロードエラー:', error);
            throw error;
        }
    }

    /**
     * 認証トークンを設定
     * @param {string} newToken - 認証トークン
     */
    function setToken(newToken) {
        token = newToken;
    }

    /**
     * 認証トークンをクリア
     */
    function clearToken() {
        token = null;
    }

    // 公開API
    return {
        call,
        uploadFile,
        setToken,
        clearToken
    };
})();