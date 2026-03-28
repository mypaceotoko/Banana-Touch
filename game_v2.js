/**
 * game.js - ゲームロジック
 * 状態管理・クリック・コンボ・クリティカル・アップグレード・ゲームループ
 */

// =====================================================
// ゲーム状態
// =====================================================
const GameState = {
  bananas: 0,
  clickPower: 1,
  bps: 0,
  upgrades: {
    click: 0,
    auto: 0
  },
  totalClicks: 0,
  totalBananas: 0,

  // コンボ
  combo: 0,
  lastClickTime: 0,
  comboTimer: null,

  // クリティカル
  criticalChance: 0.05,       // 5% の確率
  criticalMultiplier: 10,     // 10倍

  // ステージ
  currentStageIndex: 0
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
// バナナステージ定義（累計バナナ数で段階が上がる）
// =====================================================
const BANANA_STAGES = [
  {
    threshold: 0,
    name: '🍌 バナナ',
    cssClass: 'stage-0',
    imgSrc: 'assets/banana-stage1.svg'
  },
  {
    threshold: 100,
    name: '🍌 きいろバナナ',
    cssClass: 'stage-1',
    imgSrc: 'assets/banana-stage2.svg'
  },
  {
    threshold: 1_000,
    name: '✨ つやつやバナナ',
    cssClass: 'stage-2',
    imgSrc: 'assets/banana-stage3.svg'
  },
  {
    threshold: 10_000,
    name: '🌟 ゴールドバナナ',
    cssClass: 'stage-3',
    imgSrc: 'assets/banana-stage4.svg'
  },
  {
    threshold: 100_000,
    name: '👑 黄金バナナ',
    cssClass: 'stage-4',
    imgSrc: 'assets/banana-stage5.svg'
  },
  {
    threshold: 1_000_000,
    name: '🚀 レジェンドバナナ',
    cssClass: 'stage-5',
    imgSrc: 'assets/banana-stage6.svg'
  }
];

// コンボタイムアウト（ms）
const COMBO_TIMEOUT = 1500;

// =====================================================
// ゲームロジック関数
// =====================================================

function addBanana(amount) {
  GameState.bananas += amount;
  GameState.totalBananas += amount;
}

/**
 * コンボ倍率を返す
 * combo 5 未満: ×1 / 5+: ×1.5 / 10+: ×2 / 20+: ×3
 */
function getComboMultiplier() {
  if (GameState.combo >= 20) return 3;
  if (GameState.combo >= 10) return 2;
  if (GameState.combo >= 5)  return 1.5;
  return 1;
}

/**
 * バナナクリック処理
 * @returns {{ amount: number, isCritical: boolean, combo: number, comboMult: number }}
 */
function handleClick() {
  const now = Date.now();
  const elapsed = now - GameState.lastClickTime;

  // コンボ更新
  if (GameState.lastClickTime > 0 && elapsed < COMBO_TIMEOUT) {
    GameState.combo = Math.min(GameState.combo + 1, 50);
  } else {
    GameState.combo = 1;
  }
  GameState.lastClickTime = now;

  // コンボタイマーリセット
  if (GameState.comboTimer) clearTimeout(GameState.comboTimer);
  GameState.comboTimer = setTimeout(() => {
    GameState.combo = 0;
    // ui.js に通知（コンボ表示を消す）
    if (typeof onComboReset === 'function') onComboReset();
  }, COMBO_TIMEOUT);

  // クリティカル判定
  const isCritical = Math.random() < GameState.criticalChance;
  const critMult   = isCritical ? GameState.criticalMultiplier : 1;
  const comboMult  = getComboMultiplier();

  const amount = Math.ceil(GameState.clickPower * critMult * comboMult);
  addBanana(amount);
  GameState.totalClicks++;

  return { amount, isCritical, combo: GameState.combo, comboMult };
}

/**
 * アップグレードの現在価格を計算する
 */
function getUpgradePrice(type) {
  const upg = UPGRADES[type];
  if (!upg) return Infinity;
  return Math.floor(upg.basePrice * Math.pow(upg.priceMultiplier, GameState.upgrades[type]));
}

/**
 * アップグレードを購入する
 */
function buyUpgrade(type) {
  const price = getUpgradePrice(type);
  if (GameState.bananas < price) return false;

  const upg = UPGRADES[type];
  GameState.bananas -= price;
  GameState.upgrades[type]++;

  if (upg.effect.type === 'click') {
    GameState.clickPower += upg.effect.value;
  } else if (upg.effect.type === 'bps') {
    updateBPS();
  }
  return true;
}

function updateBPS() {
  GameState.bps = GameState.upgrades.auto * UPGRADES.auto.effect.value;
}

/**
 * 現在のバナナステージを返す
 */
function getCurrentStage() {
  let stage = BANANA_STAGES[0];
  for (const s of BANANA_STAGES) {
    if (GameState.totalBananas >= s.threshold) stage = s;
  }
  return stage;
}

// =====================================================
// ゲームループ（requestAnimationFrame ベース）
// =====================================================
let lastTimestamp = null;

function gameLoop(timestamp) {
  if (lastTimestamp === null) lastTimestamp = timestamp;
  const delta = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  if (GameState.bps > 0) addBanana(GameState.bps * delta);
  if (typeof updateUI === 'function') updateUI();

  requestAnimationFrame(gameLoop);
}

function startGame() {
  updateBPS();
  requestAnimationFrame(gameLoop);
}
