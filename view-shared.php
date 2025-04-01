<?php
// view-shared.php - 共有プロジェクトビューア
$key = $_GET['key'] ?? '';

if (empty($key)) {
    echo "<h1>エラー: 共有キーが指定されていません</h1>";
    exit;
}

// APIの直接呼び出し
require_once 'api/config.php';
require_once 'api/Database.php';
require_once 'api/Auth.php';
require_once 'api/Project.php';
require_once 'api/Media.php';
require_once 'api/Element.php';
require_once 'api/Department.php';

try {
    $db = Database::getInstance();
    $project = new Project($db);

    // 共有情報を取得
    $sql = "SELECT * FROM project_shares WHERE share_key = ? AND expiry_date > NOW()";
    $share = $db->fetchRow($sql, [$key]);

    if (!$share) {
        echo "<h1>エラー: 無効な共有キーまたは期限切れです</h1>";
        exit;
    }

    // プロジェクト情報を取得
    $projectData = $project->getProject($share['project_id']);

    // プロジェクトが取得できない場合
    if (!$projectData) {
        echo "<h1>エラー: プロジェクトが見つかりません</h1>";
        exit;
    }
} catch (Exception $e) {
    echo "<h1>エラー: " . htmlspecialchars($e->getMessage()) . "</h1>";
    exit;
}
?>
<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($projectData['title']) ?> - 共有マニュアル</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="css/style.css" rel="stylesheet">
    <style>
        .media-container {
            position: relative;
            margin-bottom: 2rem;
        }

        .elements-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
        }

        .element {
            position: absolute;
        }

        .element.text {
            background-color: rgba(255, 255, 255, 0.7);
            padding: 5px;
            border-radius: 3px;
        }

        .element.rectangle {
            background-color: rgba(0, 123, 255, 0.3);
            border: 2px solid rgba(0, 123, 255, 0.5);
        }

        .element.circle {
            background-color: rgba(220, 53, 69, 0.3);
            border: 2px solid rgba(220, 53, 69, 0.5);
            border-radius: 50%;
        }

        .element.arrow {
            height: 2px;
            background-color: #dc3545;
        }

        .element.arrow:after {
            content: '';
            position: absolute;
            right: -10px;
            top: -4px;
            width: 0;
            height: 0;
            border-top: 5px solid transparent;
            border-bottom: 5px solid transparent;
            border-left: 10px solid #dc3545;
        }
    </style>
</head>

<body>
    <div class="container mt-4">
        <header class="mb-4">
            <h1><?= htmlspecialchars($projectData['title']) ?></h1>
            <div class="text-muted mb-3">
                <?php if (!empty($projectData['department_name'])): ?>
                    <div>部署: <?= htmlspecialchars($projectData['department_name']) ?></div>
                <?php endif; ?>

                <?php if (!empty($projectData['task_name'])): ?>
                    <div>作業タイプ: <?= htmlspecialchars($projectData['task_name']) ?></div>
                <?php endif; ?>

                <?php if (!empty($projectData['creator_name'])): ?>
                    <div>作成者: <?= htmlspecialchars($projectData['creator_name']) ?></div>
                <?php endif; ?>
            </div>

            <?php if (!empty($projectData['description'])): ?>
                <div class="mb-4 p-3 bg-light">
                    <?= nl2br(htmlspecialchars($projectData['description'])) ?>
                </div>
            <?php endif; ?>
        </header>

        <main>
            <?php if (empty($projectData['media'])): ?>
                <div class="alert alert-info">このマニュアルにはメディアが含まれていません。</div>
            <?php else: ?>
                <?php foreach ($projectData['media'] as $media): ?>
                    <div class="media-container mb-4">
                        <?php if ($media['file_type'] === 'video'): ?>
                            <div class="ratio ratio-16x9 mb-2">
                                <video id="video-<?= $media['id'] ?>" controls>
                                    <source src="<?= htmlspecialchars($media['file_path']) ?>" type="video/mp4">
                                    お使いのブラウザは動画の再生をサポートしていません。
                                </video>
                            </div>
                            <div class="btn-group">
                                <button class="btn btn-primary btn-sm" onclick="document.getElementById('video-<?= $media['id'] ?>').play()">
                                    <i class="fas fa-play"></i> 再生
                                </button>
                                <button class="btn btn-secondary btn-sm" onclick="document.getElementById('video-<?= $media['id'] ?>').pause()">
                                    <i class="fas fa-pause"></i> 一時停止
                                </button>
                                <button class="btn btn-secondary btn-sm" onclick="document.getElementById('video-<?= $media['id'] ?>').currentTime = 0; document.getElementById('video-<?= $media['id'] ?>').pause()">
                                    <i class="fas fa-stop"></i> 停止
                                </button>
                            </div>
                        <?php else: ?>
                            <img src="<?= htmlspecialchars($media['file_path']) ?>" class="img-fluid" alt="<?= htmlspecialchars($media['file_name']) ?>">
                        <?php endif; ?>

                        <div class="elements-container">
                            <?php foreach ($projectData['elements'] as $element): ?>
                                <?php
                                // スタイル構築
                                $style = sprintf(
                                    'left: %F%%; top: %F%%; width: %Fpx; height: %Fpx;',
                                    $element['position_x'],
                                    $element['position_y'],
                                    $element['width'],
                                    $element['height']
                                );

                                if (!empty($element['rotation'])) {
                                    $style .= sprintf('transform: rotate(%Fdeg);', $element['rotation']);
                                }

                                // 要素タイプ別のスタイル
                                switch ($element['element_type']) {
                                    case 'text':
                                        $style .= sprintf(
                                            'color: %s; background-color: %s; font-size: %Fpx;',
                                            $element['color'] ?? '#000000',
                                            $element['background'] ?? 'rgba(255,255,255,0.7)',
                                            $element['font_size'] ?? 16
                                        );
                                        break;
                                    case 'rectangle':
                                    case 'circle':
                                        $style .= sprintf(
                                            'background-color: %s;',
                                            $element['background'] ?? 'rgba(0,123,255,0.3)'
                                        );
                                        break;
                                    case 'arrow':
                                        $style .= sprintf(
                                            'background-color: %s;',
                                            $element['color'] ?? '#dc3545'
                                        );
                                        break;
                                }
                                ?>

                                <div class="element <?= $element['element_type'] ?>"
                                    style="<?= $style ?>"
                                    data-start-time="<?= $element['start_time'] ?? 0 ?>"
                                    data-end-time="<?= $element['end_time'] ?? 10 ?>">
                                    <?php if ($element['element_type'] === 'text'): ?>
                                        <?= htmlspecialchars($element['content'] ?? 'テキスト') ?>
                                    <?php endif; ?>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </main>
        <!--
        <div class="text-center mb-5">
            <a href="api/api.php?type=download&id=<?= $projectData['id'] ?>&shared_key=<?= $key ?>" class="btn btn-primary" target="_blank">
                <i class="fas fa-download"></i> HTMLでダウンロード
            </a>
        </div>
                                    -->
        <footer class="text-center text-muted border-top pt-3 mt-5">
            <p>このマニュアルは「動画マニュアル作成アプリ」で作成されました。</p>
            <p>共有有効期限: <?= date('Y年m月d日 H:i', strtotime($share['expiry_date'])) ?></p>
        </footer>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // ビデオ要素のイベントリスナー設定
            const videos = document.querySelectorAll('video');
            videos.forEach(function(video) {
                video.addEventListener('timeupdate', function() {
                    updateElementsVisibility(this);
                });
            });

            // 要素の表示/非表示を制御
            function updateElementsVisibility(videoElement) {
                const currentTime = videoElement.currentTime;
                const elements = document.querySelectorAll('.element');

                elements.forEach(function(element) {
                    const startTime = parseFloat(element.getAttribute('data-start-time') || 0);
                    const endTime = parseFloat(element.getAttribute('data-end-time') || 10);

                    if (currentTime >= startTime && currentTime <= endTime) {
                        element.style.display = 'block';
                    } else {
                        element.style.display = 'none';
                    }
                });
            }
        });
    </script>
</body>

</html>