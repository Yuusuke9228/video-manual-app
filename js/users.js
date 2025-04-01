/**
 * ユーザー管理モジュール
 */
const Users = (function () {
    // 全ユーザーデータ
    let allUsers = [];

    // 編集中のユーザーID
    let editingUserId = null;

    // フィルター条件
    let filters = {
        username: "",
        role: "",
        department: ""
    };

    /**
     * ユーザー一覧を読み込んで表示
     */
    async function loadUsers() {
        try {
            const users = await API.call('users');
            allUsers = users;

            // 部署フィルターを更新
            updateDepartmentFilter();

            // ユーザー一覧を表示
            displayUsers();
        } catch (error) {
            console.error('ユーザー読み込みエラー:', error);
            alert('ユーザー一覧の読み込みに失敗しました: ' + error.message);
        }
    }

    /**
     * 部署フィルターの選択肢を更新
     */
    function updateDepartmentFilter() {
        const departmentSelect = document.getElementById('filter-user-department');
        const userDepartmentSelect = document.getElementById('user-department');

        // 部署一覧を取得（なければAPIから読み込む）
        const loadDepartments = async () => {
            try {
                const departments = await API.call('departments');

                // フィルター用セレクトボックスを更新
                departmentSelect.innerHTML = '<option value="">すべての部署</option>';
                departments.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.id;
                    option.textContent = dept.name;
                    departmentSelect.appendChild(option);
                });

                // ユーザー編集用セレクトボックスを更新
                userDepartmentSelect.innerHTML = '<option value="">選択してください</option>';
                departments.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.id;
                    option.textContent = dept.name;
                    userDepartmentSelect.appendChild(option);
                });
            } catch (error) {
                console.error('部署読み込みエラー:', error);
            }
        };

        loadDepartments();
    }

    /**
     * フィルター条件に基づいてユーザーをフィルタリング
     */
    function filterUsers() {
        // フィルター条件がすべて空の場合はすべてのユーザーを表示
        if (!filters.username && !filters.role && !filters.department) {
            return allUsers;
        }

        return allUsers.filter(user => {
            // ユーザー名フィルター（部分一致）
            if (filters.username && !user.username.toLowerCase().includes(filters.username.toLowerCase())) {
                return false;
            }

            // 権限フィルター
            if (filters.role && user.role !== filters.role) {
                return false;
            }

            // 部署フィルター
            if (filters.department && (!user.department_id || user.department_id != filters.department)) {
                return false;
            }

            return true;
        });
    }

    /**
     * ユーザー一覧を画面に表示
     */
    function displayUsers() {
        const usersList = document.getElementById('users-list');
        const noUsersMessage = document.getElementById('no-users-message');

        // フィルタリング
        const filteredUsers = filterUsers();

        // リストをクリア
        usersList.innerHTML = '';

        // ユーザーが0件の場合
        if (filteredUsers.length === 0) {
            noUsersMessage.style.display = 'block';
            return;
        } else {
            noUsersMessage.style.display = 'none';
        }

        // ユーザーを表示
        filteredUsers.forEach(user => {
            const row = document.createElement('tr');

            // 権限に応じた表示クラスを設定
            let roleClass;
            let roleLabel;
            switch (user.role) {
                case 'admin':
                    roleClass = 'bg-danger text-white';
                    roleLabel = '管理者';
                    break;
                case 'editor':
                    roleClass = 'bg-success text-white';
                    roleLabel = '編集者';
                    break;
                default:
                    roleClass = 'bg-info text-white';
                    roleLabel = '閲覧者';
            }

            row.innerHTML = `
                <td>${user.id}</td>
                <td>${escapeHtml(user.username)}</td>
                <td>${escapeHtml(user.email)}</td>
                <td>${escapeHtml(user.full_name || '')}</td>
                <td>${escapeHtml(user.department_name || '')}</td>
                <td><span class="badge ${roleClass}">${roleLabel}</span></td>
                <td>${formatDate(user.created_at)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary edit-user" data-id="${user.id}">
                        <i class="fas fa-edit"></i> 編集
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-user" data-id="${user.id}">
                        <i class="fas fa-trash"></i> 削除
                    </button>
                </td>
            `;

            usersList.appendChild(row);

            // 編集ボタンのイベントリスナー
            row.querySelector('.edit-user').addEventListener('click', () => {
                openUserModal(user.id);
            });

            // 削除ボタンのイベントリスナー
            row.querySelector('.delete-user').addEventListener('click', () => {
                confirmDeleteUser(user.id, user.username);
            });
        });
    }

    /**
     * ユーザー作成/編集モーダルを開く
     */
    async function openUserModal(userId = null) {
        // モーダルの要素を取得
        const modal = document.getElementById('user-modal');
        const modalTitle = document.getElementById('user-modal-title');
        const form = document.getElementById('user-form');
        const passwordField = document.getElementById('password-field');
        const generatedPasswordArea = document.getElementById('generated-password-area');

        // フォームをリセット
        form.reset();
        generatedPasswordArea.style.display = 'none';

        if (userId) {
            // 既存ユーザーの編集
            try {
                editingUserId = userId;
                modalTitle.textContent = 'ユーザー編集';

                // ユーザー情報を取得
                const user = await API.call(`users/${userId}`);

                // フォームに値を設定
                document.getElementById('user-username').value = user.username;
                document.getElementById('user-email').value = user.email;
                document.getElementById('user-fullname').value = user.full_name || '';
                document.getElementById('user-department').value = user.department_id || '';
                document.getElementById('user-role').value = user.role;
                document.getElementById('user-password').value = '';

                // パスワードフィールドの説明文を変更
                passwordField.querySelector('.form-text').textContent = '変更しない場合は空欄にしてください。';
            } catch (error) {
                console.error('ユーザー情報取得エラー:', error);
                alert('ユーザー情報の取得に失敗しました: ' + error.message);
                return;
            }
        } else {
            // 新規ユーザー作成
            editingUserId = null;
            modalTitle.textContent = '新規ユーザー';

            // パスワードフィールドの説明文をデフォルトに戻す
            passwordField.querySelector('.form-text').textContent = '新規ユーザーの場合、空欄にすると自動生成されます。';
        }

        // モーダルを表示
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    /**
     * ランダムパスワードを生成
     */
    function generateRandomPassword(length = 12) {
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_";
        let password = "";

        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
        }

        return password;
    }

    /**
     * パスワードの表示/非表示を切り替え
     */
    function togglePasswordVisibility() {
        const passwordInput = document.getElementById('user-password');
        const toggleButton = document.getElementById('btn-toggle-password');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleButton.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            passwordInput.type = 'password';
            toggleButton.innerHTML = '<i class="fas fa-eye"></i>';
        }
    }

    /**
     * ユーザーを保存
     */
    async function saveUser() {
        // フォームから値を取得
        const userData = {
            username: document.getElementById('user-username').value,
            email: document.getElementById('user-email').value,
            full_name: document.getElementById('user-fullname').value,
            department_id: document.getElementById('user-department').value || null,
            role: document.getElementById('user-role').value,
            password: document.getElementById('user-password').value || null
        };

        // バリデーション
        if (!userData.username || !userData.email) {
            alert('ユーザー名とメールアドレスは必須です。');
            return;
        }

        try {
            let response;

            if (editingUserId) {
                // 既存ユーザーの更新
                response = await API.call(`users/${editingUserId}`, 'PUT', userData);
                showToast(response.message || 'ユーザー情報を更新しました。');
            } else {
                // 新規ユーザーの作成
                response = await API.call('users', 'POST', userData);

                // 自動生成されたパスワードがあれば表示
                if (response.generated_password) {
                    document.getElementById('generated-password-text').textContent = response.generated_password;
                    document.getElementById('generated-password-area').style.display = 'block';
                }

                showToast('新規ユーザーを作成しました。');
            }

            // モーダルを閉じない（パスワード表示のため）
            if (!response.generated_password) {
                // 自動生成パスワードがない場合はモーダルを閉じる
                bootstrap.Modal.getInstance(document.getElementById('user-modal')).hide();
            }

            // ユーザー一覧を再読み込み
            loadUsers();
        } catch (error) {
            console.error('ユーザー保存エラー:', error);
            alert('ユーザーの保存に失敗しました: ' + error.message);
        }
    }

    /**
     * ユーザー削除の確認
     */
    function confirmDeleteUser(userId, username) {
        if (!confirm(`ユーザー "${username}" を削除します。この操作は元に戻せません。よろしいですか？`)) {
            return;
        }

        deleteUser(userId);
    }

    /**
     * ユーザーを削除
     */
    async function deleteUser(userId) {
        try {
            const response = await API.call(`users/${userId}`, 'DELETE');
            showToast(response.message || 'ユーザーを削除しました。');

            // ユーザー一覧を再読み込み
            loadUsers();
        } catch (error) {
            console.error('ユーザー削除エラー:', error);
            alert('ユーザーの削除に失敗しました: ' + error.message);
        }
    }

    /**
     * フィルター条件の更新
     */
    function updateFilters() {
        filters.username = document.getElementById('filter-username').value.trim();
        filters.role = document.getElementById('filter-user-role').value;
        filters.department = document.getElementById('filter-user-department').value;

        // ユーザー一覧を更新
        displayUsers();
    }

    /**
     * フィルターをクリア
     */
    function clearFilters() {
        // フィルター入力をリセット
        document.getElementById('filter-username').value = '';
        document.getElementById('filter-user-role').value = '';
        document.getElementById('filter-user-department').value = '';

        // フィルター条件をリセット
        filters = {
            username: "",
            role: "",
            department: ""
        };

        // ユーザー一覧を更新
        displayUsers();
    }

    /**
     * 日付をフォーマット
     */
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * HTMLエスケープ
     */
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * トースト通知を表示
     */
    function showToast(message) {
        // Bootstrap 5 トースト表示用のコード
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            // トーストコンテナがなければ作成
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'position-fixed bottom-0 end-0 p-3';
            container.style.zIndex = '5';
            document.body.appendChild(container);
        }

        const id = 'toast-' + Date.now();
        const toastHtml = `
            <div id="${id}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <strong class="me-auto">通知</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;

        document.getElementById('toast-container').insertAdjacentHTML('beforeend', toastHtml);
        const toastElement = document.getElementById(id);
        const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
        toast.show();

        // 一定時間後に要素を削除
        setTimeout(() => {
            toastElement.remove();
        }, 3500);
    }

    // イベントリスナー登録
    function setupEventListeners() {
        // ナビゲーションのユーザー管理リンク
        const navUserLink = document.createElement('li');
        navUserLink.className = 'nav-item admin-only';
        navUserLink.style.display = 'none'; // 管理者以外には表示しない
        navUserLink.innerHTML = '<a class="nav-link" href="#" id="nav-users">ユーザー管理</a>';

        // ナビゲーションに追加
        const navProjects = document.getElementById('nav-projects');
        navProjects.parentNode.parentNode.insertBefore(navUserLink, navProjects.parentNode.nextSibling);

        // ユーザー管理リンクのクリックイベント
        document.getElementById('nav-users').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('projects-container').style.display = 'none';
            document.getElementById('departments-container').style.display = 'none';
            document.getElementById('project-editor-container').style.display = 'none';
            document.getElementById('users-container').style.display = 'block';
            loadUsers();
        });

        // 新規ユーザーボタン
        document.getElementById('btn-new-user').addEventListener('click', () => {
            openUserModal();
        });

        // フィルター関連イベントリスナー
        document.getElementById('filter-username').addEventListener('input', debounce(updateFilters, 300));
        document.getElementById('filter-user-role').addEventListener('change', updateFilters);
        document.getElementById('filter-user-department').addEventListener('change', updateFilters);
        document.getElementById('btn-clear-user-filters').addEventListener('click', clearFilters);

        // パスワード自動生成ボタン
        document.getElementById('btn-generate-password').addEventListener('click', () => {
            const passwordInput = document.getElementById('user-password');
            passwordInput.value = generateRandomPassword();
            passwordInput.type = 'text'; // パスワードを表示
            document.getElementById('btn-toggle-password').innerHTML = '<i class="fas fa-eye-slash"></i>';
        });

        // パスワード表示切替ボタン
        document.getElementById('btn-toggle-password').addEventListener('click', togglePasswordVisibility);

        // ユーザー保存ボタン
        document.getElementById('btn-save-user').addEventListener('click', saveUser);
    }

    /**
     * デバウンス関数
     * 連続した呼び出しを一定時間後の1回にまとめる
     */
    function debounce(func, delay) {
        let timeout;
        return function () {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

    // 公開API
    return {
        loadUsers,
        openUserModal,
        setupEventListeners
    };
})();