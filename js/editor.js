/**
 * 動画マニュアルエディタモジュール
 */
const Editor = (function () {
    // プロジェクトデータ
    let projectData = null;

    // メディアリスト
    let mediaList = [];

    // 要素リスト
    let elementsList = [];

    // 現在選択中の要素ID
    let selectedElementId = null;

    // 現在選択中のメディアID
    let selectedMediaId = null;

    // 現在のプレビュー再生状態
    let isPlaying = false;

    // 現在の再生時間（秒）
    let currentTime = 0;

    // タイマーID
    let playbackTimer = null;

    // タイムラインの1秒あたりの幅（ピクセル）
    const TIMELINE_SECOND_WIDTH = 50;

    /**
     * エディタの初期化
     */
    function init(project) {
        // プロジェクトデータを保存
        projectData = project;

        // メディアリストを保存
        mediaList = project.media || [];

        // 要素リストを保存
        elementsList = project.elements || [];

        // プレビューを初期化
        initPreview();

        // タイムラインを初期化
        initTimeline();

        // メディア一覧を表示
        displayMediaList();

        // 要素一覧を表示
        displayElements();

        // ドラッグ＆ドロップ機能を初期化
        initDragAndDrop();

        // 初期状態ではメディアも要素も選択されていない
        selectedMediaId = null;
        selectedElementId = null;
        document.getElementById('btn-delete-element').disabled = true;
        document.getElementById('element-properties').style.display = 'none';
        document.getElementById('users-container').style.display = 'none';
    }

    /**
     * プレビュー部分の初期化
     */
    function initPreview() {
        const videoContainer = document.getElementById('video-container');
        const imageContainer = document.getElementById('image-container');
        const videoElement = document.getElementById('preview-video');
        const imageElement = document.getElementById('preview-image');

        // コンテナをクリア
        videoElement.src = '';
        imageElement.src = '';
        videoContainer.style.display = 'none';
        imageContainer.style.display = 'none';

        // 最初のメディアがあれば表示
        if (mediaList.length > 0) {
            const firstMedia = mediaList[0];
            selectedMediaId = firstMedia.id;

            if (firstMedia.file_type === 'video') {
                videoElement.src = firstMedia.file_path;
                videoContainer.style.display = 'block';
            } else if (firstMedia.file_type === 'image') {
                imageElement.src = firstMedia.file_path;
                imageContainer.style.display = 'block';
            }
        }
    }

    /**
     * タイムラインの初期化
     */
    function initTimeline() {
        // タイムラインの長さを計算（最も遅い終了時間に基づく）
        let maxEndTime = 10; // デフォルト長さは10秒

        mediaList.forEach(media => {
            if (media.duration && media.duration > maxEndTime) {
                maxEndTime = media.duration;
            }
        });

        elementsList.forEach(element => {
            if (element.end_time && element.end_time > maxEndTime) {
                maxEndTime = element.end_time;
            }
        });

        // タイムラインルーラーの生成
        const ruler = document.getElementById('timeline-ruler');
        ruler.innerHTML = '';
        ruler.style.width = `${maxEndTime * TIMELINE_SECOND_WIDTH}px`;

        // 1秒ごとの目盛りを作成
        for (let i = 0; i <= maxEndTime; i++) {
            const mark = document.createElement('div');
            mark.className = 'timeline-mark';
            mark.style.left = `${i * TIMELINE_SECOND_WIDTH}px`;
            mark.textContent = formatTime(i);
            ruler.appendChild(mark);
        }

        // タイムライントラックの生成
        const tracksContainer = document.getElementById('timeline-tracks');
        tracksContainer.innerHTML = '';

        // メディアトラック
        const mediaTrack = document.createElement('div');
        mediaTrack.className = 'timeline-track';
        mediaTrack.innerHTML = '<div class="timeline-track-label">メディア</div>';
        mediaTrack.style.width = `${maxEndTime * TIMELINE_SECOND_WIDTH + 80}px`;
        tracksContainer.appendChild(mediaTrack);

        // メディアアイテムの表示
        mediaList.forEach(media => {
            const startTime = 0;
            const endTime = media.duration || 10;

            const item = document.createElement('div');
            item.className = 'timeline-item media';
            item.dataset.id = media.id;
            item.dataset.type = 'media';
            item.textContent = media.file_name;
            item.style.left = `${startTime * TIMELINE_SECOND_WIDTH + 80}px`;
            item.style.width = `${(endTime - startTime) * TIMELINE_SECOND_WIDTH}px`;

            mediaTrack.appendChild(item);

            // クリックイベント
            item.addEventListener('click', () => {
                selectMedia(media.id);
            });
        });

        // 要素トラック
        const elementsTrack = document.createElement('div');
        elementsTrack.className = 'timeline-track';
        elementsTrack.innerHTML = '<div class="timeline-track-label">要素</div>';
        elementsTrack.style.width = `${maxEndTime * TIMELINE_SECOND_WIDTH + 80}px`;
        tracksContainer.appendChild(elementsTrack);

        // 要素アイテムの表示
        elementsList.forEach(element => {
            const startTime = element.start_time || 0;
            const endTime = element.end_time || 10;

            const item = document.createElement('div');
            item.className = `timeline-item ${element.element_type}`;
            item.dataset.id = element.id;
            item.dataset.type = 'element';
            item.textContent = getElementName(element);
            item.style.left = `${startTime * TIMELINE_SECOND_WIDTH + 80}px`;
            item.style.width = `${(endTime - startTime) * TIMELINE_SECOND_WIDTH}px`;

            elementsTrack.appendChild(item);

            // クリックイベント
            item.addEventListener('click', () => {
                selectElement(element.id);
            });
        });
    }

    /**
     * メディア一覧の表示
     */
    function displayMediaList() {
        const container = document.getElementById('media-list');
        container.innerHTML = '';

        if (mediaList.length === 0) {
            container.innerHTML = '<div class="col-12 text-center">メディアがありません。ファイルをアップロードしてください。</div>';
            return;
        }

        mediaList.forEach(media => {
            const mediaItem = document.createElement('div');
            mediaItem.className = 'col';

            const thumbnailClass = media.id === selectedMediaId ? 'media-thumbnail selected' : 'media-thumbnail';

            let thumbnailContent;
            if (media.file_type === 'video') {
                thumbnailContent = `<video src="${media.file_path}"></video>`;
            } else {
                thumbnailContent = `<img src="${media.file_path}" alt="${media.file_name}">`;
            }

            mediaItem.innerHTML = `
                <div class="${thumbnailClass}" data-id="${media.id}">
                    ${thumbnailContent}
                    <div class="media-name">${escapeHtml(media.file_name)}</div>
                    <div class="media-delete" data-id="${media.id}">
                        <i class="fas fa-times"></i>
                    </div>
                </div>
            `;

            container.appendChild(mediaItem);

            // サムネイルクリックイベント
            mediaItem.querySelector('.media-thumbnail').addEventListener('click', () => {
                selectMedia(media.id);
            });

            // 削除ボタンクリックイベント
            mediaItem.querySelector('.media-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                confirmDeleteMedia(media.id, media.file_name);
            });
        });
    }

    /**
     * 要素の表示
     */
    function displayElements() {
        const container = document.getElementById('elements-container');
        container.innerHTML = '';

        console.log('要素表示開始、数量:', elementsList.length);

        elementsList.forEach(element => {
            // 選択中のメディアに対応する要素のみ表示
            // （TODO: 複数メディア対応の場合は時間に基づいて表示）

            const elementDiv = document.createElement('div');
            elementDiv.className = `element ${element.element_type}`;
            elementDiv.dataset.id = element.id;

            // 位置とサイズを設定（デフォルト値を設定して、undefinedを回避）
            elementDiv.style.left = `${element.position_x !== undefined ? element.position_x : 10}%`;
            elementDiv.style.top = `${element.position_y !== undefined ? element.position_y : 10}%`;
            elementDiv.style.width = `${element.width || 100}px`;
            elementDiv.style.height = `${element.height || 100}px`;

            console.log(`要素表示: id=${element.id}, type=${element.element_type}, x=${elementDiv.style.left}, y=${elementDiv.style.top}`);

            // 回転を設定
            if (element.rotation) {
                elementDiv.style.transform = `rotate(${element.rotation}deg)`;
            }

            // 要素タイプに応じたスタイルを設定
            switch (element.element_type) {
                case 'text':
                    elementDiv.textContent = element.content || 'テキスト';
                    elementDiv.style.color = element.color || '#000000';
                    elementDiv.style.backgroundColor = element.background || 'rgba(255,255,255,0.7)';
                    elementDiv.style.fontSize = `${element.font_size || 16}px`;
                    elementDiv.style.fontFamily = element.font_family || 'sans-serif';
                    break;

                case 'rectangle':
                    elementDiv.style.backgroundColor = element.background || 'rgba(0, 123, 255, 0.5)';
                    elementDiv.style.borderWidth = element.border_width ? `${element.border_width}px` : '0';
                    elementDiv.style.borderColor = element.border_color || 'transparent';
                    break;

                case 'circle':
                    elementDiv.style.backgroundColor = element.background || 'rgba(220, 53, 69, 0.5)';
                    elementDiv.style.borderWidth = element.border_width ? `${element.border_width}px` : '0';
                    elementDiv.style.borderColor = element.border_color || 'transparent';
                    break;

                case 'arrow':
                    elementDiv.style.backgroundColor = element.color || '#dc3545';
                    elementDiv.style.height = `${element.height || 2}px`;
                    elementDiv.style.width = `${element.width || 100}px`;

                    // 矢印用の疑似要素をスタイルシートで定義しているため、色を設定
                    const arrowColor = element.color || '#dc3545';
                    elementDiv.style.setProperty('--arrow-color', arrowColor);
                    break;

                case 'image':
                    // TODO: 画像要素の実装
                    break;
            }

            // 透明度の設定
            if (element.opacity) {
                elementDiv.style.opacity = element.opacity;
            }

            // 選択状態の設定
            if (element.id === selectedElementId) {
                elementDiv.classList.add('selected');
            }

            container.appendChild(elementDiv);

            // クリックイベント
            elementDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                selectElement(element.id);
            });
        });

        // 背景クリックイベント（選択解除）
        container.addEventListener('click', (e) => {
            if (e.target === container) {
                deselectElement();
            }
        });

        // ドラッグ＆ドロップを再初期化
        initDragAndDrop();
    }

    /**
     * ドラッグ＆ドロップ機能の初期化
     */
    function initDragAndDrop() {
        // 既存の設定をクリア
        interact('.element').unset();

        // interact.jsを使用して要素のドラッグと変形を可能にする
        interact('.element')
            .draggable({
                inertia: false, // 慣性をオフに（より正確な位置制御のため）
                modifiers: [
                    interact.modifiers.restrictRect({
                        restriction: 'parent',
                        endOnly: true
                    })
                ],
                autoScroll: true,
                listeners: {
                    start: function (event) {
                        // ドラッグ開始時のスタイルなど
                        event.target.classList.add('dragging');
                        console.log('ドラッグ開始:', event.target.dataset.id);
                    },
                    move: dragMoveListener,
                    end: function (event) {
                        // ドラッグ終了時のスタイルをリセット
                        event.target.classList.remove('dragging');

                        const elementId = event.target.dataset.id;
                        const element = getElementById(elementId);
                        if (element) {
                            // 位置情報を更新
                            updateElementPosition(elementId, element);
                        }
                        console.log('ドラッグ終了:', elementId);
                    }
                }
            })
            .resizable({
                edges: { left: true, right: true, bottom: true, top: true },
                listeners: {
                    start: function (event) {
                        event.target.classList.add('resizing');
                        console.log('リサイズ開始:', event.target.dataset.id);
                    },
                    move: resizeMoveListener,
                    end: function (event) {
                        event.target.classList.remove('resizing');

                        const elementId = event.target.dataset.id;
                        const element = getElementById(elementId);
                        if (element) {
                            // サイズ情報を更新
                            updateElementSize(elementId, element);
                        }
                        console.log('リサイズ終了:', elementId);
                    }
                },
                modifiers: [
                    interact.modifiers.restrictEdges({
                        outer: 'parent'
                    }),
                    interact.modifiers.restrictSize({
                        min: { width: 20, height: 20 }
                    })
                ]
            });

        console.log('ドラッグ＆ドロップ機能初期化完了');
    }

    /**
     * ドラッグ移動イベントリスナー
     */
    function dragMoveListener(event) {
        const target = event.target;

        // 親要素に対する相対位置を計算
        const parent = target.parentElement;
        const parentRect = parent.getBoundingClientRect();

        // 現在の位置（パーセンテージ）
        const x = parseFloat(target.style.left) || 0;
        const y = parseFloat(target.style.top) || 0;

        // 移動量（ピクセル→パーセンテージに変換）
        const deltaX = (event.dx / parentRect.width) * 100;
        const deltaY = (event.dy / parentRect.height) * 100;

        // 新しい位置（パーセンテージ）
        const newX = x + deltaX;
        const newY = y + deltaY;

        // スタイルを更新
        target.style.left = `${newX}%`;
        target.style.top = `${newY}%`;

        // デバッグログ
        console.log(`位置更新: x=${newX}%, y=${newY}%, dx=${deltaX}%, dy=${deltaY}%`);
    }


    /**
     * リサイズ移動イベントリスナー
     */
    function resizeMoveListener(event) {
        const target = event.target;

        // 現在のサイズと位置
        let x = parseFloat(target.style.left) || 0;
        let y = parseFloat(target.style.top) || 0;
        let width = parseFloat(target.style.width) || 100;
        let height = parseFloat(target.style.height) || 100;

        // 親要素のサイズ
        const parent = target.parentElement;
        const parentRect = parent.getBoundingClientRect();

        // 変更量をピクセルで計算
        const deltaX = event.deltaRect.left;
        const deltaY = event.deltaRect.top;
        const deltaWidth = event.deltaRect.width;
        const deltaHeight = event.deltaRect.height;

        // 位置の変更量をパーセンテージに変換
        const deltaXPercent = deltaX / parentRect.width * 100;
        const deltaYPercent = deltaY / parentRect.height * 100;

        // 新しい位置とサイズを設定
        target.style.width = `${width + deltaWidth}px`;
        target.style.height = `${height + deltaHeight}px`;
        target.style.left = `${x + deltaXPercent}%`;
        target.style.top = `${y + deltaYPercent}%`;
    }

    /**
     * メディアを選択
     */
    function selectMedia(mediaId) {
        selectedMediaId = mediaId;

        // メディア一覧の選択状態を更新
        const thumbnails = document.querySelectorAll('.media-thumbnail');
        thumbnails.forEach(thumbnail => {
            if (thumbnail.dataset.id == mediaId) {
                thumbnail.classList.add('selected');
            } else {
                thumbnail.classList.remove('selected');
            }
        });

        // タイムラインの選択状態を更新
        const timelineItems = document.querySelectorAll('.timeline-item');
        timelineItems.forEach(item => {
            if (item.dataset.type === 'media' && item.dataset.id == mediaId) {
                item.classList.add('selected');
            } else if (item.dataset.type === 'media') {
                item.classList.remove('selected');
            }
        });

        // 選択したメディアを表示
        const media = getMediaById(mediaId);
        if (media) {
            const videoContainer = document.getElementById('video-container');
            const imageContainer = document.getElementById('image-container');
            const videoElement = document.getElementById('preview-video');
            const imageElement = document.getElementById('preview-image');

            videoElement.src = '';
            imageElement.src = '';
            videoContainer.style.display = 'none';
            imageContainer.style.display = 'none';

            if (media.file_type === 'video') {
                videoElement.src = media.file_path;
                videoContainer.style.display = 'block';
            } else if (media.file_type === 'image') {
                imageElement.src = media.file_path;
                imageContainer.style.display = 'block';
            }
        }
    }

    /**
     * 要素を選択
     */
    function selectElement(elementId) {
        selectedElementId = elementId;

        // 要素表示の選択状態を更新
        const elementDivs = document.querySelectorAll('.element');
        elementDivs.forEach(div => {
            if (div.dataset.id == elementId) {
                div.classList.add('selected');
            } else {
                div.classList.remove('selected');
            }
        });

        // タイムラインの選択状態を更新
        const timelineItems = document.querySelectorAll('.timeline-item');
        timelineItems.forEach(item => {
            if (item.dataset.type === 'element' && item.dataset.id == elementId) {
                item.classList.add('selected');
            } else if (item.dataset.type === 'element') {
                item.classList.remove('selected');
            }
        });

        // 削除ボタンを有効化
        document.getElementById('btn-delete-element').disabled = false;

        // プロパティパネルを表示
        showElementProperties(elementId);
    }

    /**
     * 要素の選択を解除
     */
    function deselectElement() {
        selectedElementId = null;

        // 要素表示の選択状態を更新
        const elementDivs = document.querySelectorAll('.element');
        elementDivs.forEach(div => {
            div.classList.remove('selected');
        });

        // タイムラインの選択状態を更新
        const timelineItems = document.querySelectorAll('.timeline-item');
        timelineItems.forEach(item => {
            if (item.dataset.type === 'element') {
                item.classList.remove('selected');
            }
        });

        // 削除ボタンを無効化
        document.getElementById('btn-delete-element').disabled = true;

        // プロパティパネルを非表示
        document.getElementById('element-properties').style.display = 'none';
    }

    /**
     * 要素のプロパティを表示
     */
    function showElementProperties(elementId) {
        const element = getElementById(elementId);
        if (!element) return;

        const propertiesPanel = document.getElementById('element-properties');
        propertiesPanel.style.display = 'block';

        // フォームに値を設定
        document.getElementById('element-content').value = element.content || '';
        document.getElementById('element-color').value = element.color || '#000000';
        document.getElementById('element-background').value = element.background || '#ffffff';
        document.getElementById('element-font-size').value = element.font_size || 16;
        document.getElementById('element-width').value = element.width || 100;
        document.getElementById('element-height').value = element.height || 100;
        document.getElementById('element-start-time').value = element.start_time || 0;
        document.getElementById('element-end-time').value = element.end_time || 10;

        // 要素タイプによってフィールドの表示/非表示を切り替え
        const contentField = document.getElementById('element-content').parentNode;
        const colorField = document.getElementById('element-color').parentNode;
        const backgroundField = document.getElementById('element-background').parentNode;
        const fontSizeField = document.getElementById('element-font-size').parentNode;

        // デフォルトですべて表示
        contentField.style.display = 'block';
        colorField.style.display = 'block';
        backgroundField.style.display = 'block';
        fontSizeField.style.display = 'block';

        // 要素タイプによって非表示にする
        switch (element.element_type) {
            case 'text':
                // すべて表示
                break;

            case 'rectangle':
            case 'circle':
                // テキストと文字サイズは非表示
                contentField.style.display = 'none';
                fontSizeField.style.display = 'none';
                break;

            case 'arrow':
                // テキスト、背景、文字サイズは非表示
                contentField.style.display = 'none';
                backgroundField.style.display = 'none';
                fontSizeField.style.display = 'none';
                break;
        }
    }
    /**
     * 要素のプロパティを更新
     */
    async function updateElementProperties() {
        if (!selectedElementId) return;

        const element = getElementById(selectedElementId);
        if (!element) return;

        // フォームから値を取得
        const formData = {
            content: document.getElementById('element-content').value,
            color: document.getElementById('element-color').value,
            background: document.getElementById('element-background').value,
            font_size: parseInt(document.getElementById('element-font-size').value) || 16,
            width: parseInt(document.getElementById('element-width').value) || 100,
            height: parseInt(document.getElementById('element-height').value) || 100,
            start_time: parseFloat(document.getElementById('element-start-time').value) || 0,
            end_time: parseFloat(document.getElementById('element-end-time').value) || 10
        };

        try {
            // APIで要素を更新
            await API.call(`elements/${selectedElementId}`, 'PUT', formData);

            // ローカルデータも更新
            Object.assign(element, formData);

            // 表示を更新
            displayElements();
            initTimeline();

            alert('要素を更新しました。');
        } catch (error) {
            console.error('要素更新エラー:', error);
            alert('要素の更新に失敗しました: ' + error.message);
        }
    }

    /**
     * 要素の位置情報を更新
     */
    async function updateElementPosition(elementId, element) {
        const elementDiv = document.querySelector(`.element[data-id="${elementId}"]`);
        if (!elementDiv) return;

        // 現在の位置を取得（パーセンテージ）
        const positionX = parseFloat(elementDiv.style.left);
        const positionY = parseFloat(elementDiv.style.top);

        console.log(`位置保存: id=${elementId}, x=${positionX}%, y=${positionY}%`);

        try {
            // APIで要素を更新
            await API.call(`elements/${elementId}`, 'PUT', {
                position_x: positionX,
                position_y: positionY
            });

            // ローカルデータも更新
            element.position_x = positionX;
            element.position_y = positionY;

            console.log(`位置更新成功: id=${elementId}`);
        } catch (error) {
            console.error('要素位置更新エラー:', error);

            // エラー時は元の位置に戻す
            elementDiv.style.left = `${element.position_x}%`;
            elementDiv.style.top = `${element.position_y}%`;

            alert('要素位置の更新に失敗しました: ' + error.message);
        }
    }

    /**
     * 要素のサイズ情報を更新
     */
    async function updateElementSize(elementId, element) {
        const elementDiv = document.querySelector(`.element[data-id="${elementId}"]`);
        if (!elementDiv) return;

        // 現在のサイズを取得（ピクセル）
        const width = parseInt(elementDiv.style.width);
        const height = parseInt(elementDiv.style.height);

        try {
            // APIで要素を更新
            await API.call(`elements/${elementId}`, 'PUT', {
                width: width,
                height: height
            });

            // ローカルデータも更新
            element.width = width;
            element.height = height;

            // プロパティパネルも更新（選択中の場合）
            if (selectedElementId === elementId) {
                document.getElementById('element-width').value = width;
                document.getElementById('element-height').value = height;
            }
        } catch (error) {
            console.error('要素サイズ更新エラー:', error);

            // エラー時は元のサイズに戻す
            elementDiv.style.width = `${element.width}px`;
            elementDiv.style.height = `${element.height}px`;
        }
    }

    /**
     * 新しいテキスト要素を追加
     */
    async function addTextElement() {
        if (!selectedMediaId) {
            alert('メディアを選択してください。');
            return;
        }

        // プレビューコンテナの中央に配置
        const previewContainer = document.getElementById('preview-container');
        const containerRect = previewContainer.getBoundingClientRect();

        const data = {
            project_id: Projects.getCurrentProjectId(),
            element_type: 'text',
            content: 'テキストを入力',
            position_x: 40, // デフォルトX座標（パーセンテージ）
            position_y: 40, // デフォルトY座標（パーセンテージ）
            width: 100,
            height: 30,
            color: '#000000',
            background: 'rgba(255,255,255,0.7)',
            font_size: 16,
            start_time: 0,
            end_time: 10
        };

        try {
            const response = await API.call('elements', 'POST', data);

            // 要素リストに追加
            data.id = response.id;
            elementsList.push(data);

            // 表示を更新
            displayElements();
            initTimeline();

            // 新しい要素を選択
            selectElement(data.id);
        } catch (error) {
            console.error('要素作成エラー:', error);
            alert('要素の作成に失敗しました: ' + error.message);
        }
    }

    /**
     * 新しい矩形要素を追加
     */
    async function addRectangleElement() {
        if (!selectedMediaId) {
            alert('メディアを選択してください。');
            return;
        }

        const data = {
            project_id: Projects.getCurrentProjectId(),
            element_type: 'rectangle',
            position_x: 30,
            position_y: 30,
            width: 100,
            height: 60,
            background: 'rgba(0,123,255,0.5)',
            start_time: 0,
            end_time: 10
        };

        try {
            const response = await API.call('elements', 'POST', data);

            // 要素リストに追加
            data.id = response.id;
            elementsList.push(data);

            // 表示を更新
            displayElements();
            initTimeline();

            // 新しい要素を選択
            selectElement(data.id);
        } catch (error) {
            console.error('要素作成エラー:', error);
            alert('要素の作成に失敗しました: ' + error.message);
        }
    }

    /**
     * 新しい円形要素を追加
     */
    async function addCircleElement() {
        if (!selectedMediaId) {
            alert('メディアを選択してください。');
            return;
        }

        const data = {
            project_id: Projects.getCurrentProjectId(),
            element_type: 'circle',
            position_x: 40,
            position_y: 40,
            width: 50,
            height: 50,
            background: 'rgba(220,53,69,0.5)',
            start_time: 0,
            end_time: 10
        };

        try {
            const response = await API.call('elements', 'POST', data);

            // 要素リストに追加
            data.id = response.id;
            elementsList.push(data);

            // 表示を更新
            displayElements();
            initTimeline();

            // 新しい要素を選択
            selectElement(data.id);
        } catch (error) {
            console.error('要素作成エラー:', error);
            alert('要素の作成に失敗しました: ' + error.message);
        }
    }

    /**
     * 新しい矢印要素を追加
     */
    async function addArrowElement() {
        if (!selectedMediaId) {
            alert('メディアを選択してください。');
            return;
        }

        const data = {
            project_id: Projects.getCurrentProjectId(),
            element_type: 'arrow',
            position_x: 25,
            position_y: 50,
            width: 100,
            height: 2,
            color: '#dc3545',
            start_time: 0,
            end_time: 10
        };

        try {
            const response = await API.call('elements', 'POST', data);

            // 要素リストに追加
            data.id = response.id;
            elementsList.push(data);

            // 表示を更新
            displayElements();
            initTimeline();

            // 新しい要素を選択
            selectElement(data.id);
        } catch (error) {
            console.error('要素作成エラー:', error);
            alert('要素の作成に失敗しました: ' + error.message);
        }
    }

    /**
     * 要素を削除
     */
    async function deleteElement() {
        if (!selectedElementId) return;

        if (!confirm('この要素を削除します。よろしいですか？')) {
            return;
        }

        try {
            await API.call(`elements/${selectedElementId}`, 'DELETE');

            // 要素リストから削除
            const index = elementsList.findIndex(el => el.id == selectedElementId);
            if (index !== -1) {
                elementsList.splice(index, 1);
            }

            // 選択解除
            deselectElement();

            // 表示を更新
            displayElements();
            initTimeline();

            alert('要素を削除しました。');
        } catch (error) {
            console.error('要素削除エラー:', error);
            alert('要素の削除に失敗しました: ' + error.message);
        }
    }

    /**
     * メディアを削除するか確認
     */
    function confirmDeleteMedia(mediaId, fileName) {
        if (!confirm(`メディア「${fileName}」を削除します。よろしいですか？`)) {
            return;
        }

        deleteMedia(mediaId);
    }

    /**
     * メディアを削除
     */
    async function deleteMedia(mediaId) {
        try {
            await API.call(`media/${mediaId}`, 'DELETE');

            // メディアリストから削除
            const index = mediaList.findIndex(media => media.id == mediaId);
            if (index !== -1) {
                mediaList.splice(index, 1);
            }

            // 表示を更新
            displayMediaList();
            initTimeline();

            // もし選択中のメディアが削除された場合
            if (selectedMediaId == mediaId) {
                selectedMediaId = null;

                // 他のメディアがあれば、最初のものを選択
                if (mediaList.length > 0) {
                    selectMedia(mediaList[0].id);
                } else {
                    // プレビューをクリア
                    document.getElementById('video-container').style.display = 'none';
                    document.getElementById('image-container').style.display = 'none';
                    document.getElementById('preview-video').src = '';
                    document.getElementById('preview-image').src = '';
                }
            }

            alert('メディアを削除しました。');
        } catch (error) {
            console.error('メディア削除エラー:', error);
            alert('メディアの削除に失敗しました: ' + error.message);
        }
    }

    /**
     * ファイルをアップロード
     */
    async function uploadMedia(file) {
        const projectId = Projects.getCurrentProjectId();
        if (!projectId) {
            alert('プロジェクトが見つかりません。');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('project_id', projectId);

        // プログレスバーを表示
        const progressBar = document.querySelector('#upload-progress .progress-bar');
        document.getElementById('upload-progress').style.display = 'block';
        progressBar.style.width = '0%';

        try {
            const response = await API.uploadFile('media', formData, (percent) => {
                progressBar.style.width = `${percent}%`;
            });

            // メディアリストに追加
            const newMedia = {
                id: response.id,
                project_id: projectId,
                file_name: response.file_name,
                file_type: response.file_type,
                file_path: response.file_path,
                duration: response.duration
            };

            mediaList.push(newMedia);

            // 表示を更新
            displayMediaList();
            initTimeline();

            // 新しいメディアを選択
            selectMedia(newMedia.id);

            // フォームをリセット
            document.getElementById('media-upload-form').reset();

            alert('メディアをアップロードしました。');
        } catch (error) {
            console.error('アップロードエラー:', error);
            alert('アップロードに失敗しました: ' + error.message);
        } finally {
            // プログレスバーを非表示
            document.getElementById('upload-progress').style.display = 'none';
        }
    }

    /**
     * プレビュー再生
     */
    function playPreview() {
        if (!selectedMediaId) return;

        const media = getMediaById(selectedMediaId);
        if (!media) return;

        if (media.file_type === 'video') {
            const video = document.getElementById('preview-video');
            video.play();

            // 動画の再生状態を監視
            video.ontimeupdate = () => {
                currentTime = video.currentTime;
                updateElementsVisibility();
            };

            isPlaying = true;
        } else if (media.file_type === 'image') {
            // 画像の場合は時間経過をシミュレート
            startPlaybackTimer();
        }
    }

    /**
     * プレビュー一時停止
     */
    function pausePreview() {
        if (!selectedMediaId) return;

        const media = getMediaById(selectedMediaId);
        if (!media) return;

        if (media.file_type === 'video') {
            const video = document.getElementById('preview-video');
            video.pause();
        } else if (media.file_type === 'image') {
            // タイマーを停止
            stopPlaybackTimer();
        }

        isPlaying = false;
    }

    /**
     * プレビュー停止
     */
    function stopPreview() {
        if (!selectedMediaId) return;

        const media = getMediaById(selectedMediaId);
        if (!media) return;

        if (media.file_type === 'video') {
            const video = document.getElementById('preview-video');
            video.pause();
            video.currentTime = 0;
        } else if (media.file_type === 'image') {
            // タイマーを停止して時間をリセット
            stopPlaybackTimer();
            currentTime = 0;
            updateElementsVisibility();
        }

        isPlaying = false;
    }

    /**
     * 画像用の再生タイマーを開始
     */
    function startPlaybackTimer() {
        // 既存のタイマーがあれば停止
        stopPlaybackTimer();

        // 100ミリ秒ごとに時間を進める
        playbackTimer = setInterval(() => {
            currentTime += 0.1;

            // 最大時間に達したら停止
            const media = getMediaById(selectedMediaId);
            if (media && media.duration && currentTime >= media.duration) {
                stopPlaybackTimer();
                currentTime = 0;
            }

            updateElementsVisibility();
        }, 100);

        isPlaying = true;
    }

    /**
     * 再生タイマーを停止
     */
    function stopPlaybackTimer() {
        if (playbackTimer) {
            clearInterval(playbackTimer);
            playbackTimer = null;
        }
    }

    /**
     * 現在の時間に基づいて要素の表示/非表示を更新
     */
    function updateElementsVisibility() {
        elementsList.forEach(element => {
            const elementDiv = document.querySelector(`.element[data-id="${element.id}"]`);
            if (!elementDiv) return;

            const startTime = element.start_time || 0;
            const endTime = element.end_time || 10;

            if (currentTime >= startTime && currentTime <= endTime) {
                elementDiv.style.display = 'block';
            } else {
                elementDiv.style.display = 'none';
            }
        });
    }

    /**
     * IDで要素を取得
     */
    function getElementById(elementId) {
        return elementsList.find(el => el.id == elementId);
    }

    /**
     * IDでメディアを取得
     */
    function getMediaById(mediaId) {
        return mediaList.find(media => media.id == mediaId);
    }

    /**
     * 要素の種類に基づいた名前を取得
     */
    function getElementName(element) {
        switch (element.element_type) {
            case 'text':
                return element.content ? truncateString(element.content, 10) : 'テキスト';
            case 'rectangle':
                return '四角形';
            case 'circle':
                return '円';
            case 'arrow':
                return '矢印';
            case 'image':
                return '画像';
            default:
                return element.element_type;
        }
    }

    /**
     * 文字列を切り詰める
     */
    function truncateString(str, maxLength) {
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength) + '...';
    }

    /**
     * 秒を MM:SS 形式にフォーマット
     */
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
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
        // ファイルアップロードフォーム
        document.getElementById('media-upload-form').addEventListener('submit', function (e) {
            e.preventDefault();
            const fileInput = document.getElementById('media-file');
            if (fileInput.files.length > 0) {
                uploadMedia(fileInput.files[0]);
            } else {
                alert('ファイルを選択してください。');
            }
        });

        // 要素プロパティフォーム
        document.getElementById('element-properties-form').addEventListener('submit', function (e) {
            e.preventDefault();
            updateElementProperties();
        });

        // 要素追加ボタン
        document.getElementById('btn-add-text').addEventListener('click', () => {
            addTextElement();
        });

        document.getElementById('btn-add-rectangle').addEventListener('click', () => {
            addRectangleElement();
        });

        document.getElementById('btn-add-circle').addEventListener('click', () => {
            addCircleElement();
        });

        document.getElementById('btn-add-arrow').addEventListener('click', () => {
            addArrowElement();
        });

        // 要素削除ボタン
        document.getElementById('btn-delete-element').addEventListener('click', () => {
            deleteElement();
        });

        // 再生コントロール
        document.getElementById('btn-play').addEventListener('click', () => {
            playPreview();
        });

        document.getElementById('btn-pause').addEventListener('click', () => {
            pausePreview();
        });

        document.getElementById('btn-stop').addEventListener('click', () => {
            stopPreview();
        });
    }

    // 公開API
    return {
        init,
        setupEventListeners
    };
})();