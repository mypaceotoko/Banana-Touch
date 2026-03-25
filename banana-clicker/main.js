/**
 * main.js - エントリーポイント
 * 各モジュールを初期化してゲームを開始する
 * 読み込み順: game.js → ui.js → save.js → main.js
 */

document.addEventListener('DOMContentLoaded', () => {

  // 1. セーブデータをロード
  const hasSave = loadGame();

  // 2. UI を初期化（DOM参照・イベントリスナー設定）
  initUI();

  // 3. BPS を再計算（ロードしたアップグレード数から）
  updateBPS();

  // 4. ゲームループ開始
  startGame();

  // 5. 自動保存開始
  startAutoSave();

  // 6. オフライン報告（あれば）
  if (window._offlineEarned) {
    showOfflineNotice(window._offlineEarned, window._offlineSec);
  }

});

/**
 * オフライン放置で稼いだバナナを通知する
 * @param {number} earned  - 稼いだバナナ数
 * @param {number} seconds - 離れていた秒数
 */
function showOfflineNotice(earned, seconds) {
  const minutes = Math.floor(seconds / 60);
  const timeStr = minutes >= 1 ? `${minutes}分` : `${seconds}秒`;

  const notice = document.createElement('div');
  notice.style.cssText = `
    position: fixed;
    top: 70px;
    left: 50%;
    transform: translateX(-50%);
    background: #ff8f00;
    color: #fff;
    padding: 12px 20px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 0.95rem;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    z-index: 9999;
    text-align: center;
    max-width: 300px;
    width: 90%;
  `;
  notice.textContent = `🍌 おかえり！ ${timeStr}の間に ${formatNumber(earned)} バナナゲット！`;

  document.body.appendChild(notice);
  setTimeout(() => {
    notice.style.transition = 'opacity 0.5s';
    notice.style.opacity = '0';
    setTimeout(() => notice.remove(), 500);
  }, 4000);
}
