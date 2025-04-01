/**
 * 部署と作業タイプ管理モジュール
 */
const Departments = (function () {
    // 現在選択されている部署ID
    let currentDepartmentId = null;

    // 編集中の部署/作業タイプID
    let editingDepartmentId = null;
    let editingTaskId = null;

    /**
     * 部署一覧を読み込んで表示
     */
    async function loadDepartments() {
        try {
            const departments = await API.call('departments');
            displayDepartments(departments);
        } catch (error) {
            console.error('部署読み込みエラー:', error);
            alert('部署の読み込みに失敗しました: ' + error.message);
        }
    }

    /**
     * 部署一覧を画面に表示
     */
    function displayDepartments(departments) {
        const departmentsList = document.getElementById('departments-list');
        departmentsList.innerHTML = '';

        if (departments.length === 0) {
            departmentsList.innerHTML = '<li class="list-group-item text-center">部署がありません</li>';
            return;
        }

        departments.forEach(dept => {
            const item = document.createElement('li');
            item.className = 'list-group-item d-flex justify-content-between align-items-center';
            if (dept.id == currentDepartmentId) {
                item.classList.add('active');
            }

            item.innerHTML = `
                <span>${escapeHtml(dept.name)}</span>
                <div>
                    <button class="btn btn-sm btn-outline-primary edit-department" data-id="${dept.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-department" data-id="${dept.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            departmentsList.appendChild(item);

            // 部署選択イベント
            item.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    selectDepartment(dept.id);
                }
            });

            // 編集ボタンイベント
            item.querySelector('.edit-department').addEventListener('click', () => {
                openDepartmentModal(dept);
            });

            // 削除ボタンイベント
            item.querySelector('.delete-department').addEventListener('click', () => {
                confirmDeleteDepartment(dept.id, dept.name);
            });
        });
    }

    /**
     * 部署を選択
     */
    function selectDepartment(departmentId) {
        currentDepartmentId = departmentId;

        // 選択状態の更新
        const items = document.querySelectorAll('#departments-list .list-group-item');
        items.forEach(item => {
            item.classList.remove('active');
            if (item.querySelector(`[data-id="${departmentId}"]`)) {
                item.classList.add('active');
            }
        });

        // 作業タイプを表示
        loadTasks(departmentId);

        // 作業タイプコンテナを表示
        document.getElementById('no-department-selected').style.display = 'none';
        document.getElementById('tasks-container').style.display = 'block';
    }

    async function loadTasks(departmentId) {
        if (!departmentId) return;

        try {
            const tasks = await API.call(`departments/${departmentId}/tasks`);
            console.log('API response:', tasks); // デバッグ用ログ
            console.log('Type of tasks:', typeof tasks); // 型の確認
            console.log('Is Array?', Array.isArray(tasks)); // 配列かどうか

            displayTasks(tasks);
        } catch (error) {
            console.error('作業タイプ読み込みエラー:', error);
            alert('作業タイプの読み込みに失敗しました: ' + error.message);
        }
    }

    /**
     * 作業タイプ一覧を画面に表示
     */
    function displayTasks(tasks) {
        const tasksList = document.getElementById('tasks-list');
        tasksList.innerHTML = '';

        // 入力チェックを追加
        if (!tasks || !Array.isArray(tasks)) {
            console.error('無効なタスクデータ:', tasks);
            tasksList.innerHTML = '<li class="list-group-item text-center">作業タイプデータの形式が不正です</li>';
            return;
        }

        if (tasks.length === 0) {
            tasksList.innerHTML = '<li class="list-group-item text-center">作業タイプがありません</li>';
            return;
        }

        tasks.forEach(task => {
            const item = document.createElement('li');
            item.className = 'list-group-item d-flex justify-content-between align-items-center';

            item.innerHTML = `
                <span>${escapeHtml(task.name)}</span>
                <div>
                    <button class="btn btn-sm btn-outline-primary edit-task" data-id="${task.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-task" data-id="${task.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            tasksList.appendChild(item);

            // 編集ボタンイベント
            item.querySelector('.edit-task').addEventListener('click', () => {
                openTaskModal(task);
            });

            // 削除ボタンイベント
            item.querySelector('.delete-task').addEventListener('click', () => {
                confirmDeleteTask(task.id, task.name);
            });
        });
    }

    /**
     * 部署作成/編集モーダルを開く
     */
    function openDepartmentModal(department = null) {
        const modal = document.getElementById('department-modal');
        const title = document.getElementById('department-modal-title');
        const nameInput = document.getElementById('department-name');
        const descInput = document.getElementById('department-description');

        if (department) {
            // 編集モード
            title.textContent = '部署編集';
            nameInput.value = department.name;
            descInput.value = department.description || '';
            editingDepartmentId = department.id;
        } else {
            // 新規作成モード
            title.textContent = '新規部署';
            nameInput.value = '';
            descInput.value = '';
            editingDepartmentId = null;
        }

        // モーダルを表示
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    /**
     * 作業タイプ作成/編集モーダルを開く
     */
    function openTaskModal(task = null) {
        if (!currentDepartmentId) {
            alert('部署を選択してください。');
            return;
        }

        const modal = document.getElementById('task-modal');
        const title = document.getElementById('task-modal-title');
        const nameInput = document.getElementById('task-name');
        const descInput = document.getElementById('task-description');

        if (task) {
            // 編集モード
            title.textContent = '作業タイプ編集';
            nameInput.value = task.name;
            descInput.value = task.description || '';
            editingTaskId = task.id;
        } else {
            // 新規作成モード
            title.textContent = '新規作業タイプ';
            nameInput.value = '';
            descInput.value = '';
            editingTaskId = null;
        }

        // モーダルを表示
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    /**
     * 部署削除の確認
     */
    function confirmDeleteDepartment(departmentId, departmentName) {
        const modal = document.getElementById('confirm-modal');
        const title = document.getElementById('confirm-modal-title');
        const body = document.getElementById('confirm-modal-body');
        const confirmBtn = document.getElementById('btn-confirm');

        title.textContent = '部署削除の確認';
        body.textContent = `部署「${departmentName}」を削除します。関連するすべての作業タイプも削除されます。よろしいですか？`;

        // 確認ボタンのイベントリスナーをクリア
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        document.getElementById('btn-confirm').addEventListener('click', async () => {
            try {
                await API.call(`departments/${departmentId}`, 'DELETE');
                bootstrap.Modal.getInstance(modal).hide();
                if (currentDepartmentId == departmentId) {
                    currentDepartmentId = null;
                    document.getElementById('no-department-selected').style.display = 'block';
                    document.getElementById('tasks-container').style.display = 'none';
                }
                loadDepartments();
            } catch (error) {
                console.error('部署削除エラー:', error);
                alert('部署の削除に失敗しました: ' + error.message);
            }
        });

        // モーダルを表示
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    /**
     * 作業タイプ削除の確認
     */
    function confirmDeleteTask(taskId, taskName) {
        const modal = document.getElementById('confirm-modal');
        const title = document.getElementById('confirm-modal-title');
        const body = document.getElementById('confirm-modal-body');
        const confirmBtn = document.getElementById('btn-confirm');

        title.textContent = '作業タイプ削除の確認';
        body.textContent = `作業タイプ「${taskName}」を削除します。よろしいですか？`;

        // 確認ボタンのイベントリスナーをクリア
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        document.getElementById('btn-confirm').addEventListener('click', async () => {
            try {
                await API.call(`tasks/${taskId}`, 'DELETE');
                bootstrap.Modal.getInstance(modal).hide();
                loadTasks(currentDepartmentId);
            } catch (error) {
                console.error('作業タイプ削除エラー:', error);
                alert('作業タイプの削除に失敗しました: ' + error.message);
            }
        });

        // モーダルを表示
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    /**
     * 部署を保存
     */
    async function saveDepartment() {
        const nameInput = document.getElementById('department-name');
        const descInput = document.getElementById('department-description');

        // バリデーション
        if (!nameInput.value.trim()) {
            alert('部署名を入力してください。');
            return;
        }

        const data = {
            name: nameInput.value.trim(),
            description: descInput.value.trim()
        };

        try {
            if (editingDepartmentId) {
                // 更新
                await API.call(`departments/${editingDepartmentId}`, 'PUT', data);
            } else {
                // 新規作成
                await API.call('departments', 'POST', data);
            }

            // モーダルを閉じる
            bootstrap.Modal.getInstance(document.getElementById('department-modal')).hide();

            // 部署一覧を再読み込み
            loadDepartments();
        } catch (error) {
            console.error('部署保存エラー:', error);
            alert('部署の保存に失敗しました: ' + error.message);
        }
    }

    /**
     * 作業タイプを保存
     */
    async function saveTask() {
        const nameInput = document.getElementById('task-name');
        const descInput = document.getElementById('task-description');

        // バリデーション
        if (!nameInput.value.trim()) {
            alert('作業タイプ名を入力してください。');
            return;
        }

        if (!currentDepartmentId) {
            alert('部署を選択してください。');
            return;
        }

        const data = {
            name: nameInput.value.trim(),
            description: descInput.value.trim(),
            department_id: currentDepartmentId
        };

        try {
            if (editingTaskId) {
                // 更新
                await API.call(`tasks/${editingTaskId}`, 'PUT', data);
            } else {
                // 新規作成
                await API.call('tasks', 'POST', data);
            }

            // モーダルを閉じる
            bootstrap.Modal.getInstance(document.getElementById('task-modal')).hide();

            // 作業タイプ一覧を再読み込み
            loadTasks(currentDepartmentId);
        } catch (error) {
            console.error('作業タイプ保存エラー:', error);
            alert('作業タイプの保存に失敗しました: ' + error.message);
        }
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

    // イベントリスナー登録
    function setupEventListeners() {
        // ナビゲーションの部署管理リンク
        document.getElementById('nav-departments').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('projects-container').style.display = 'none';
            document.getElementById('departments-container').style.display = 'block';
            document.getElementById('project-editor-container').style.display = 'none';
            document.getElementById('users-container').style.display = 'none';
            loadDepartments();
        });

        // 新規部署ボタン
        document.getElementById('btn-new-department').addEventListener('click', () => {
            openDepartmentModal();
        });

        // 新規作業タイプボタン
        document.getElementById('btn-new-task').addEventListener('click', () => {
            openTaskModal();
        });

        // 部署保存ボタン
        document.getElementById('btn-save-department').addEventListener('click', () => {
            saveDepartment();
        });

        // 作業タイプ保存ボタン
        document.getElementById('btn-save-task').addEventListener('click', () => {
            saveTask();
        });
    }

    // 公開API
    return {
        loadDepartments,
        setupEventListeners
    };
})();