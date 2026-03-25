/**
 * game.js - ゲームロジック
 * 状態管理・クリック処理・アップグレード・ゲームループ
 */

// =====================================================
// ゲーム状態
// =====================================================
const GameState = {
  bananas: 0,        // 所持バナナ数
  clickPower: 1,     // 1クリックで増えるバナナ数
  bps: 0,            // バナナ毎秒（Bananas Per Second）
  upgrades: {
    click: 0,        // クリック強化の購入回数
    auto: 0          // 自動バナナの購入回数
  },
  totalClicks: 0,    // 累計クリック数（実績用）
  totalBananas: 0    // 累計バナナ数（実績用）
};

// =====================================================
// アップグレード定義
// =====================================================
const UPGRADES = {
  click: {
    id: 'click',
    name: '👆 クリック強化',
    description: 'クリック力 +1',
    basePrice: 10,
    priceMultiplier: 1.15,
    effect: { type: 'click', value: 1 }
  },
  auto: {
    id: 'auto',
    name: '🐒 バナナモンキー',
    description: '毎秒バナナ +1',
    basePrice: 50,
    priceMultiplier: 1.15,
    effect: { type: 'bps', value: 1 }
  }
};

// =====================================================
// ゲームロジック関数
// =====================================================

/**
 * バナナを追加する
 * @param {number} amount - 追加するバナナ数
 */
function addBanana(amount) {
  GameState.bananas += amount;
  GameState.totalBananas += amount;
}

/**
 * バナナをクリックしたときの処理
 */
function handleClick() {
  addBanana(GameState.clickPower);
  GameState.totalClicks++;
}

/**
 * アップグレードの現在価格を計算する
 * price = basePrice * multiplier^count（四捨五入）
 * @param {string} type - アップグレードID
 * @returns {number}
 */
function getUpgradePrice(type) {
  const upg = UPGRADES[type];
  if (!upg) return Infinity;
  return Math.floor(upg.basePrice * Math.pow(upg.priceMultiplier, GameState.upgrades[type]));
}

/**
 * アップグレードを購入する
 * @param {string} type - アップグレードID ('click' | 'auto')
 * @returns {boolean} 購入成功かどうか
 */
function buyUpgrade(type) {
  const price = getUpgradePrice(type);
  if (GameState.bananas < price) return false;

  const upg = UPGRADES[type];
  GameState.bananas -= price;
  GameState.upgrades[type]++;

  // 効果を適用
  if (upg.effect.type === 'click') {
    GameState.clickPower += upg.effect.value;
  } else if (upg.effect.type === 'bps') {
    updateBPS();
  }

  return true;
}

/**
 * BPS（毎秒バナナ生産量）を再計算する
 */
function updateBPS() {
  // autoアップグレード1個につき +1 BPS
  GameState.bps = GameState.upgrades.auto * UPGRADES.auto.effect.value;
}

// =====================================================
// ゲームループ
// =====================================================

let lastTimestamp = null;

/**
 * メインゲームループ（requestAnimationFrame ベース）
 * BPS を毎フレーム積算してバナナを増やす
 * @param {DOMHighResTimeStamp} timestamp
 */
function gameLoop(timestamp) {
  if (lastTimestamp === null) {
    lastTimestamp = timestamp;
  }

  const delta = (timestamp - lastTimestamp) / 1000; // 秒単位
  lastTimestamp = timestamp;

  if (GameState.bps > 0) {
    addBanana(GameState.bps * delta);
  }

  // UI更新（ui.js で定義）
  if (typeof updateUI === 'function') {
    updateUI();
  }

  requestAnimationFrame(gameLoop);
}

/**
 * ゲームを開始する
 */
function startGame() {
  updateBPS();
  requestAnimationFrame(gameLoop);
}
