/**
 * save.js - セーブ・ロード処理
 * localStorage を使って自動保存・自動ロードする
 */

const SAVE_KEY    = 'banana-touch-save';
const SAVE_INTERVAL = 5000; // 5秒ごとに自動保存

// =====================================================
// セーブ
// =====================================================

/**
 * ゲーム状態を localStorage に保存する
 */
function saveGame() {
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

/**
 * localStorage からゲーム状態を復元する
 * @returns {boolean} ロード成功かどうか
 */
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;

    const data = JSON.parse(raw);

    // 値を安全に復元（存在しない場合はデフォルト値）
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
          // オフライン報告（ui.js が読み込まれた後に表示）
          window._offlineEarned = earned;
          window._offlineSec    = Math.floor(offlineSec);
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

/**
 * 自動保存を開始する（5秒ごと）
 */
function startAutoSave() {
  setInterval(saveGame, SAVE_INTERVAL);
}

// ページ離脱時にも保存
window.addEventListener('beforeunload', saveGame);
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveGame();
});
