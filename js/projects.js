/**
 * プロジェクト管理モジュール（フィルター機能付き）
 */
const Projects = (function () {
    // 現在のプロジェクトID
    let currentProjectId = null;

    // プロジェクトデータ保存用
    let allProjects = [];

    // フィルター条件
    let filters = {
        department: "",
        task: "",
        title: ""
    };

    /**
     * プロジェクト一覧を読み込んで表示
     */
    async function loadProjects() {
        try {
            const projects = await API.call('projects');
            allProjects = projects; // すべてのプロジェクトを保存

            // フィルターセレクトボックスの更新
            updateFilterOptions();

            // プロジェクト表示
            displayProjects();
        } catch (error) {
            console.error('プロジェクト読み込みエラー:', error);
            alert('プロジェクトの読み込みに失敗しました: ' + error.message);
        }
    }

    /**
     * フィルターセレクトボックスの選択肢を更新
     */
    function updateFilterOptions() {
        // 部署フィルターの選択肢を更新
        const departmentSelect = document.getElementById('filter-department');
        departmentSelect.innerHTML = '<option value="">すべての部署</option>';

        // 部署リストの取得と重複排除
        const departments = {};
        allProjects.forEach(project => {
            if (project.department_id && project.department_name) {
                departments[project.department_id] = project.department_name;
            }
        });

        // 部署選択肢の追加
        for (const [id, name] of Object.entries(departments)) {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = name;
            departmentSelect.appendChild(option);
        }
    }

    /**
     * フィルター条件に基づいてプロジェクトをフィルタリング
     */
    function filterProjects() {
        // フィルター条件がすべて空の場合はすべてのプロジェクトを表示
        if (!filters.department && !filters.task && !filters.title) {
            return allProjects;
        }

        return allProjects.filter(project => {
            // 部署フィルター
            if (filters.department && project.department_id != filters.department) {
                return false;
            }

            // 作業内容フィルター（部分一致）
            if (filters.task && !(project.task_name && project.task_name.toLowerCase().includes(filters.task.toLowerCase()))) {
                return false;
            }

            // プロジェクト名フィルター（部分一致）
            if (filters.title && !project.title.toLowerCase().includes(filters.title.toLowerCase())) {
                return false;
            }

            return true;
        });
    }

    /**
     * プロジェクトの件数表示を更新
     */
    function updateProjectCount(count) {
        const badge = document.getElementById('projects-count-badge');
        badge.textContent = count;
    }

    /**
     * プロジェクト一覧を画面に表示
     */
    function displayProjects() {
        const projectsList = document.getElementById('projects-list');
        const noProjectsMessage = document.getElementById('no-projects-message');

        // フィルタリング
        const filteredProjects = filterProjects();

        // 件数表示の更新
        updateProjectCount(filteredProjects.length);

        // リストをクリア
        projectsList.innerHTML = '';

        // プロジェクトが0件の場合
        if (filteredProjects.length === 0) {
            projectsList.style.display = 'none';
            noProjectsMessage.style.display = 'block';
            return;
        }

        // プロジェクトがある場合
        projectsList.style.display = 'flex';
        noProjectsMessage.style.display = 'none';

        // プロジェクトを表示
        filteredProjects.forEach(project => {
            const card = document.createElement('div');
            card.className = 'col-md-4 mb-4';
            card.innerHTML = `
                <div class="card project-card h-100">
                    <div class="card-img-top d-flex align-items-center justify-content-center bg-light">
                        <i class="fas fa-film fa-3x text-muted"></i>
                    </div>
                    <div class="card-body">
                        <h5 class="card-title">${escapeHtml(project.title)}</h5>
                        <p class="card-text small text-muted">
                            ${project.department_name ? `部署: ${escapeHtml(project.department_name)}` : ''}
                            ${project.task_name ? `<br>作業: ${escapeHtml(project.task_name)}` : ''}
                        </p>
                        <p class="card-text">${project.description ? escapeHtml(project.description) : '説明はありません。'}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge ${getStatusBadgeClass(project.status)}">${getStatusLabel(project.status)}</span>
                            <small class="text-muted">作成者: ${escapeHtml(project.creator_name)}</small>
                        </div>
                    </div>
                    <div class="card-footer text-end">
                        <button class="btn btn-primary btn-sm edit-project" data-id="${project.id}">
                            <i class="fas fa-edit"></i> 編集
                        </button>
                    </div>
                </div>
            `;

            projectsList.appendChild(card);

            // 編集ボタンにイベントリスナーを追加
            card.querySelector('.edit-project').addEventListener('click', () => {
                openProjectEditor(project.id);
            });
        });
    }

    /**
     * プロジェクト状態に応じたバッジクラスを取得
     */
    function getStatusBadgeClass(status) {
        switch (status) {
            case 'published':
                return 'bg-success';
            case 'draft':
                return 'bg-warning text-dark';
            case 'archived':
                return 'bg-secondary';
            default:
                return 'bg-light text-dark';
        }
    }

    /**
     * プロジェクト状態のラベルを取得
     */
    function getStatusLabel(status) {
        switch (status) {
            case 'published':
                return '公開';
            case 'draft':
                return '下書き';
            case 'archived':
                return 'アーカイブ';
            default:
                return status;
        }
    }

    /**
     * フィルター条件の更新
     */
    function updateFilters() {
        filters.department = document.getElementById('filter-department').value;
        filters.task = document.getElementById('filter-task').value.trim();
        filters.title = document.getElementById('filter-title').value.trim();

        // プロジェクト表示を更新
        displayProjects();
    }

    /**
     * フィルターをクリア
     */
    function clearFilters() {
        // フィルター入力をリセット
        document.getElementById('filter-department').value = '';
        document.getElementById('filter-task').value = '';
        document.getElementById('filter-title').value = '';

        // フィルター条件をリセット
        filters = {
            department: "",
            task: "",
            title: ""
        };

        // プロジェクト表示を更新
        displayProjects();
    }

    /**
    * プロジェクトエディタを開く
    */
    async function openProjectEditor(projectId = null) {
        // 画面表示を切り替え
        document.getElementById('projects-container').style.display = 'none';
        document.getElementById('project-editor-container').style.display = 'block';

        // 部署リストを読み込む
        await loadDepartmentsForProject();

        // 共有カードを初期状態では非表示
        document.getElementById('share-options-card').style.display = 'none';

        if (projectId) {
            // 既存プロジェクトを編集
            try {
                currentProjectId = projectId;
                const project = await API.call(`projects/${projectId}`);
                displayProjectData(project);

                // エディターを表示
                document.getElementById('editor-container').style.display = 'block';
                document.getElementById('media-upload-card').style.display = 'block';
                document.getElementById('btn-delete-project').style.display = 'block';

                // 共有状態を確認して表示
                await checkShareStatus();

                // エディタ初期化
                Editor.init(project);
            } catch (error) {
                console.error('プロジェクト読み込みエラー:', error);
                alert('プロジェクトの読み込みに失敗しました: ' + error.message);
                closeProjectEditor();
            }
        } else {
            // 新規プロジェクト作成
            currentProjectId = null;
            document.getElementById('project-editor-title').textContent = '新規プロジェクト';
            document.getElementById('project-form').reset();

            // エディターを非表示
            document.getElementById('editor-container').style.display = 'none';
            document.getElementById('media-upload-card').style.display = 'none';
            document.getElementById('btn-delete-project').style.display = 'none';
        }
    }

    /**
     * プロジェクトデータをフォームに表示
     */
    function displayProjectData(project) {
        document.getElementById('project-editor-title').textContent = `プロジェクト編集: ${project.title}`;
        document.getElementById('project-title').value = project.title;
        document.getElementById('project-description').value = project.description || '';
        document.getElementById('project-status').value = project.status;

        // 部署と作業タイプの選択
        if (project.department_id) {
            document.getElementById('project-department').value = project.department_id;
            loadTasksForProject(project.department_id, project.task_type_id);
        } else {
            document.getElementById('project-task').innerHTML = '<option value="">選択してください</option>';
        }
    }

    /**
     * プロジェクトエディタを閉じる
     */
    function closeProjectEditor() {
        document.getElementById('project-editor-container').style.display = 'none';
        document.getElementById('projects-container').style.display = 'block';
        loadProjects();
    }

    /**
     * プロジェクト用の部署リストを読み込む
     */
    async function loadDepartmentsForProject() {
        try {
            const departments = await API.call('departments');
            const select = document.getElementById('project-department');
            select.innerHTML = '<option value="">選択してください</option>';

            departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.id;
                option.textContent = dept.name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('部署読み込みエラー:', error);
            alert('部署リストの読み込みに失敗しました: ' + error.message);
        }
    }

    /**
     * 部署に対応する作業タイプリストを読み込む
     */
    async function loadTasksForProject(departmentId, selectedTaskId = null) {
        if (!departmentId) {
            document.getElementById('project-task').innerHTML = '<option value="">選択してください</option>';
            return;
        }

        try {
            const tasks = await API.call(`departments/${departmentId}/tasks`);
            const select = document.getElementById('project-task');
            select.innerHTML = '<option value="">選択してください</option>';

            tasks.forEach(task => {
                const option = document.createElement('option');
                option.value = task.id;
                option.textContent = task.name;
                if (selectedTaskId && task.id == selectedTaskId) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        } catch (error) {
            console.error('作業タイプ読み込みエラー:', error);
            alert('作業タイプリストの読み込みに失敗しました: ' + error.message);
        }
    }

    /**
     * プロジェクトを保存
     */
    async function saveProject() {
        const formData = {
            title: document.getElementById('project-title').value,
            description: document.getElementById('project-description').value,
            department_id: document.getElementById('project-department').value || null,
            task_type_id: document.getElementById('project-task').value || null,
            status: document.getElementById('project-status').value
        };

        // バリデーション
        if (!formData.title) {
            alert('タイトルを入力してください。');
            return;
        }

        try {
            let response;

            if (currentProjectId) {
                // 既存プロジェクト更新
                response = await API.call(`projects/${currentProjectId}`, 'PUT', formData);
                showToast('プロジェクトを更新しました');
            } else {
                // 新規プロジェクト作成
                response = await API.call('projects', 'POST', formData);
                currentProjectId = response.id;
                showToast('プロジェクトを作成しました');

                // エディターを表示
                document.getElementById('editor-container').style.display = 'block';
                document.getElementById('media-upload-card').style.display = 'block';
                document.getElementById('btn-delete-project').style.display = 'block';

                // 共有オプションを表示
                document.getElementById('share-options-card').style.display = 'block';

                // エディタ初期化
                const project = await API.call(`projects/${currentProjectId}`);
                Editor.init(project);
            }
        } catch (error) {
            console.error('プロジェクト保存エラー:', error);
            alert('プロジェクトの保存に失敗しました: ' + error.message);
        }
    }

    /**
     * プロジェクトを削除
     */
    async function deleteProject() {
        if (!currentProjectId) return;

        if (!confirm('このプロジェクトを削除します。この操作は元に戻せません。よろしいですか？')) {
            return;
        }

        try {
            await API.call(`projects/${currentProjectId}`, 'DELETE');
            alert('プロジェクトを削除しました。');
            closeProjectEditor();
        } catch (error) {
            console.error('プロジェクト削除エラー:', error);
            alert('プロジェクトの削除に失敗しました: ' + error.message);
        }
    }

    /**
 * 共有リンク表示を更新
 */
    async function checkShareStatus() {
        try {
            // 既存の共有リンクがあるか確認
            const project = await API.call(`projects/${currentProjectId}`);
            const shareCard = document.getElementById('share-options-card');
            const shareLinkContainer = document.getElementById('share-link-container');
            const generateButton = document.getElementById('btn-generate-share');

            shareCard.style.display = 'block';

            if (project.share_info) {
                // 共有情報があれば表示
                shareLinkContainer.style.display = 'block';
                document.getElementById('share-link').value = project.share_info.share_url;
                document.getElementById('share-link-expiry').textContent = `有効期限: ${formatDate(project.share_info.expiry_date)}`;
                generateButton.style.display = 'none';
            } else {
                // 共有情報がなければ非表示
                shareLinkContainer.style.display = 'none';
                generateButton.style.display = 'block';
            }
        } catch (error) {
            console.error('共有情報取得エラー:', error);
        }
    }

    /**
     * 日付のフォーマット
     */
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * 共有リンクを生成
     */
    async function generateShareLink() {
        if (!currentProjectId) return;

        try {
            const response = await API.call(`share/${currentProjectId}`, 'POST');

            // 共有リンク表示を更新
            document.getElementById('share-link-container').style.display = 'block';
            document.getElementById('share-link').value = response.share_url;
            document.getElementById('share-link-expiry').textContent = `有効期限: ${formatDate(response.expiry_date)}`;
            document.getElementById('btn-generate-share').style.display = 'none';

            // 成功メッセージ
            showToast('共有リンクを生成しました');
        } catch (error) {
            console.error('共有リンク生成エラー:', error);
            alert('共有リンクの生成に失敗しました: ' + error.message);
        }
    }

    /**
     * 共有リンクをコピー
     */
    function copyShareLink() {
        const shareLink = document.getElementById('share-link');
        shareLink.select();
        document.execCommand('copy');

        // コピー成功メッセージ
        showToast('共有リンクをコピーしました');
    }

    /**
     * 共有を停止
     */
    async function removeShareLink() {
        if (!currentProjectId) return;

        if (!confirm('共有リンクを削除すると、このリンクを持っている人はアクセスできなくなります。よろしいですか？')) {
            return;
        }

        try {
            await API.call(`share/${currentProjectId}`, 'DELETE');

            // 共有リンク表示を更新
            document.getElementById('share-link-container').style.display = 'none';
            document.getElementById('btn-generate-share').style.display = 'block';

            // 成功メッセージ
            showToast('共有を停止しました');
        } catch (error) {
            console.error('共有リンク削除エラー:', error);
            alert('共有リンクの削除に失敗しました: ' + error.message);
        }
    }

    /**
     * HTMLとしてダウンロード
     */
    function downloadAsHTML() {
        if (!currentProjectId) return;

        // 認証問題を回避するために共有キーを取得して渡す
        let sharedKey = '';
        const shareLink = document.getElementById('share-link');

        if (shareLink && shareLink.value) {
            // 共有リンクからキーを抽出
            const urlParts = shareLink.value.split('/');
            sharedKey = urlParts[urlParts.length - 1];
        }

        // ダウンロードURLを生成してリダイレクト
        let downloadUrl = `${API.getBaseUrl()}?type=download&id=${currentProjectId}`;

        // 共有キーがあれば追加
        if (sharedKey) {
            downloadUrl += `&shared_key=${sharedKey}`;
        } else {
            // 共有キーがない場合は、一時的な共有キーを生成
            // これは理想的な方法ではないが、一時的な対応として
            generateTempShareKeyAndDownload(currentProjectId);
            return;
        }

        window.open(downloadUrl, '_blank');
    }

    /**
     * 一時的な共有キーを生成してダウンロード
     */
    async function generateTempShareKeyAndDownload(projectId) {
        try {
            // 共有キーを生成
            const response = await API.call(`share/${projectId}`, 'POST');

            // 生成された共有キーでダウンロード
            const downloadUrl = `${API.getBaseUrl()}?type=download&id=${projectId}&shared_key=${response.share_key}`;
            window.open(downloadUrl, '_blank');
        } catch (error) {
            console.error('共有キー生成エラー:', error);
            alert('ダウンロードの準備中にエラーが発生しました: ' + error.message);
        }
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

    // イベントリスナー登録 (openProjectEditor 関数の後ろに追加するコード)
    function setupShareEventListeners() {
        // 共有リンク生成ボタン
        document.getElementById('btn-generate-share').addEventListener('click', generateShareLink);

        // 共有リンクコピーボタン
        document.getElementById('btn-copy-link').addEventListener('click', copyShareLink);

        // 共有停止ボタン
        document.getElementById('btn-remove-share').addEventListener('click', removeShareLink);

        // HTMLダウンロードボタン
        document.getElementById('btn-download-html').addEventListener('click', downloadAsHTML);
    }

    /**
     * 現在のプロジェクトIDを取得
     */
    function getCurrentProjectId() {
        return currentProjectId;
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
        // 新規プロジェクトボタン
        document.getElementById('btn-new-project').addEventListener('click', () => {
            openProjectEditor();
        });

        // プロジェクト一覧へ戻るボタン
        document.getElementById('btn-back-to-projects').addEventListener('click', () => {
            closeProjectEditor();
        });

        // 部署変更時に作業タイプリストを更新
        document.getElementById('project-department').addEventListener('change', (e) => {
            const departmentId = e.target.value;
            loadTasksForProject(departmentId);
        });

        // プロジェクト保存ボタン
        document.getElementById('project-form').addEventListener('submit', (e) => {
            e.preventDefault();
            saveProject();
        });

        // プロジェクト削除ボタン
        document.getElementById('btn-delete-project').addEventListener('click', () => {
            deleteProject();
        });

        // ナビゲーションのプロジェクトリンク
        document.getElementById('nav-projects').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('projects-container').style.display = 'block';
            document.getElementById('departments-container').style.display = 'none';
            document.getElementById('project-editor-container').style.display = 'none';
            document.getElementById('users-container').style.display = 'none';
            loadProjects();
        });

        // 共有リンク生成ボタン
        document.getElementById('btn-generate-share').addEventListener('click', function (e) {
            e.preventDefault();
            console.log('共有リンク生成ボタンがクリックされました');
            generateShareLink();
        });

        // 共有リンクコピーボタン
        document.getElementById('btn-copy-link').addEventListener('click', function (e) {
            e.preventDefault();
            console.log('リンクコピーボタンがクリックされました');
            copyShareLink();
        });

        // 共有停止ボタン
        document.getElementById('btn-remove-share').addEventListener('click', function (e) {
            e.preventDefault();
            console.log('共有停止ボタンがクリックされました');
            removeShareLink();
        });

        // HTMLダウンロードボタン
        document.getElementById('btn-download-html').addEventListener('click', function (e) {
            e.preventDefault();
            console.log('HTMLダウンロードボタンがクリックされました');
            downloadAsHTML();
        });

        // フィルター関連イベントリスナー
        document.getElementById('filter-department').addEventListener('change', updateFilters);

        // 入力フィールドは入力後少し待ってから検索（タイピング中の過剰な検索を防ぐ）
        const taskInput = document.getElementById('filter-task');
        const titleInput = document.getElementById('filter-title');

        let taskTimeout;
        taskInput.addEventListener('input', () => {
            clearTimeout(taskTimeout);
            taskTimeout = setTimeout(() => {
                updateFilters();
            }, 300); // 300ms後に検索実行
        });

        let titleTimeout;
        titleInput.addEventListener('input', () => {
            clearTimeout(titleTimeout);
            titleTimeout = setTimeout(() => {
                updateFilters();
            }, 300); // 300ms後に検索実行
        });

        // フィルタークリアボタン
        document.getElementById('btn-clear-filters').addEventListener('click', clearFilters);
    }

    // 公開API
    return {
        loadProjects,
        openProjectEditor,
        closeProjectEditor,
        getCurrentProjectId,
        setupEventListeners
    };
})();