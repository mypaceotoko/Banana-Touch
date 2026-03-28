/**
 * save.js - セーブ・ロード処理
 * localStorage を使って自動保存・自動ロードする
 * ※ ミュート状態は sound.js が直接 localStorage を管理
 */

const SAVE_KEY      = 'banana-touch-save';
const SAVE_INTERVAL = 5000; // 5秒ごとに自動保存
let _autoSaveTimer = null;
let _isResetting = false; // リセット中フラグ

// =====================================================
// セーブ
// =====================================================
function saveGame() {
  if (_isResetting) return; // リセット中は保存しない
  try {
    const data = {
      bananas:      GameState.bananas,
      clickPower:   GameState.clickPower,
      bps:          GameState.bps,
      upgrades:     { ...GameState.upgrades },
      totalClicks:  GameState.totalClicks,
      totalBananas: GameState.totalBananas,
      savedAt:      Date.now()
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('セーブに失敗しました:', e);
  }
}

// =====================================================
// ロード
// =====================================================
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;

    const data = JSON.parse(raw);

    GameState.bananas      = typeof data.bananas      === 'number' ? data.bananas      : 0;
    GameState.clickPower   = typeof data.clickPower   === 'number' ? data.clickPower   : 1;
    GameState.bps          = typeof data.bps          === 'number' ? data.bps          : 0;
    GameState.totalClicks  = typeof data.totalClicks  === 'number' ? data.totalClicks  : 0;
    GameState.totalBananas = typeof data.totalBananas === 'number' ? data.totalBananas : 0;

    if (data.upgrades && typeof data.upgrades === 'object') {
      GameState.upgrades.click = typeof data.upgrades.click === 'number' ? data.upgrades.click : 0;
      GameState.upgrades.auto  = typeof data.upgrades.auto  === 'number' ? data.upgrades.auto  : 0;
    }

    // オフライン放置分のバナナを加算（最大24時間分）
    if (data.savedAt && GameState.bps > 0) {
      const offlineSec = Math.min((Date.now() - data.savedAt) / 1000, 86400);
      if (offlineSec > 5) {
        const earned = Math.floor(GameState.bps * offlineSec);
        if (earned > 0) {
          GameState.bananas      += earned;
          GameState.totalBananas += earned;
          window._offlineEarned   = earned;
          window._offlineSec      = Math.floor(offlineSec);
        }
      }
    }

    return true;
  } catch (e) {
    console.warn('ロードに失敗しました:', e);
    return false;
  }
}

// =====================================================
// 自動保存
// =====================================================
function startAutoSave() {
  if (_autoSaveTimer) clearInterval(_autoSaveTimer);
  _autoSaveTimer = setInterval(saveGame, SAVE_INTERVAL);
}

function stopAutoSave() {
  _isResetting = true; // 保存を完全にブロック
  if (_autoSaveTimer) clearInterval(_autoSaveTimer);
  _autoSaveTimer = null;
  window.removeEventListener('beforeunload', saveGame);
  localStorage.removeItem(SAVE_KEY); // ここでも明示的に削除
}

// ページ離脱時・非表示時にも保存
window.addEventListener('beforeunload', saveGame);
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveGame();
});
