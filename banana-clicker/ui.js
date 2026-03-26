/**
 * ui.js - 表示処理
 * DOM更新・コンボ/クリティカルエフェクト・バナナステージ・ショップUI
 */

// =====================================================
// DOM参照キャッシュ
// =====================================================
const UI = {
  bananaCount:  null,
  bps:          null,
  clickPower:   null,
  banana:       null,
  bananaBody:   null,
  effectLayer:  null,
  shopItems:    null,
  comboDisplay: null,
  stageLabel:   null,
  muteBtn:      null,
  resetBtn:     null,
  resetModal:   null
};

// 現在適用中のステージクラス
let _activeStageClass = '';

// =====================================================
// 初期化
// =====================================================
function initUI() {
  UI.bananaCount  = document.getElementById('banana-count');
  UI.bps          = document.getElementById('bps');
  UI.clickPower   = document.getElementById('click-power');
  UI.banana       = document.getElementById('banana');
  UI.bananaBody   = document.getElementById('banana-body');
  UI.effectLayer  = document.getElementById('effect-layer');
  UI.shopItems    = document.getElementById('shop-items');
  UI.comboDisplay = document.getElementById('combo-display');
  UI.stageLabel   = document.getElementById('stage-label');
  UI.muteBtn      = document.getElementById('mute-btn');
  UI.resetBtn     = document.getElementById('reset-btn');
  UI.resetModal   = document.getElementById('reset-modal');

  // バナナクリックイベント
  UI.banana.addEventListener('click',      onBananaClick);
  UI.banana.addEventListener('touchstart', onBananaClick, { passive: true });

  // ミュートボタン
  if (UI.muteBtn) {
    // 初期アイコンをサウンド状態に合わせる
    if (typeof getMuted === 'function' && getMuted()) {
      UI.muteBtn.textContent = '🔇';
    }
    UI.muteBtn.addEventListener('click', () => {
      if (typeof toggleMute === 'function') {
        const muted = toggleMute();
        UI.muteBtn.textContent = muted ? '🔇' : '🔊';
      }
    });
  }

  // リセットボタン
  if (UI.resetBtn) {
    UI.resetBtn.addEventListener('click', () => {
      if (UI.resetModal) UI.resetModal.hidden = false;
    });
  }

  // リセット確認モーダルのボタン
  const confirmBtn = document.getElementById('reset-confirm-btn');
  const cancelBtn  = document.getElementById('reset-cancel-btn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      if (UI.resetModal) UI.resetModal.hidden = true;
      if (typeof resetGame === 'function') resetGame();
    });
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (UI.resetModal) UI.resetModal.hidden = true;
    });
  }
  // モーダル外クリックで閉じる
  if (UI.resetModal) {
    UI.resetModal.addEventListener('click', (e) => {
      if (e.target === UI.resetModal) UI.resetModal.hidden = true;
    });
  }

  renderShop();
  updateBananaStage(true); // 初回はアニメーションなし
}

// =====================================================
// 数値フォーマット
// =====================================================
function formatNumber(num) {
  const n = Math.floor(num);
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)         return (n / 1_000).toFixed(2) + 'K';
  return n.toString();
}

// =====================================================
// UI更新（毎フレーム）
// =====================================================
function updateUI() {
  if (UI.bananaCount) UI.bananaCount.textContent = formatNumber(GameState.bananas);
  if (UI.bps)         UI.bps.textContent         = formatNumber(GameState.bps);
  if (UI.clickPower)  UI.clickPower.textContent   = formatNumber(GameState.clickPower);
  updateShopButtons();
  updateBananaStage();
}

// =====================================================
// バナナステージ
// =====================================================

/**
 * 現在のステージに応じてバナナの見た目を更新する
 * @param {boolean} silent - true のときステージアップ演出をスキップ
 */
function updateBananaStage(silent = false) {
  const stage = getCurrentStage();
  if (stage.cssClass === _activeStageClass) return;

  const isFirst = _activeStageClass === '';
  _activeStageClass = stage.cssClass;

  // クラス付け替え
  BANANA_STAGES.forEach(s => UI.banana.classList.remove(s.cssClass));
  UI.banana.classList.add(stage.cssClass);

  // ステージラベル更新
  if (UI.stageLabel) UI.stageLabel.textContent = stage.name;

  // ステージアップ演出
  if (!silent && !isFirst) {
    showStageUpNotice(stage.name);
    if (typeof playStageUpSound === 'function') playStageUpSound();
  }
}

/** ステージアップのフルスクリーン通知 */
function showStageUpNotice(stageName) {
  const el = document.createElement('div');
  el.className = 'stage-up-notice';
  el.innerHTML = `✨ STAGE UP!<br><span>${stageName}</span>`;
  document.body.appendChild(el);
  // フェードアウト
  setTimeout(() => { el.style.opacity = '0'; }, 2200);
  setTimeout(() => el.remove(), 2800);
}

// =====================================================
// コンボ
// =====================================================

/** コンボタイムアウト時に game.js から呼ばれる */
function onComboReset() {
  if (!UI.comboDisplay) return;
  UI.comboDisplay.textContent = '';
  UI.comboDisplay.className   = 'combo-display';
}

/** コンボ表示を更新する */
function updateComboDisplay(combo, comboMult) {
  if (!UI.comboDisplay) return;
  if (combo < 2) { onComboReset(); return; }

  // レベル別クラス
  let lvClass = '';
  if      (combo >= 20) lvClass = 'combo-lv3';
  else if (combo >= 10) lvClass = 'combo-lv2';
  else if (combo >= 5)  lvClass = 'combo-lv1';

  const multStr = comboMult > 1 ? ` ×${comboMult}` : '';
  UI.comboDisplay.textContent = `🔥 COMBO ${combo}${multStr}`;
  UI.comboDisplay.className   = `combo-display ${lvClass}`;

  // パルスアニメーションをリセット（再トリガー）
  UI.comboDisplay.classList.remove('combo-pulse');
  void UI.comboDisplay.offsetWidth;
  UI.comboDisplay.classList.add('combo-pulse');
}

// =====================================================
// バナナクリック処理
// =====================================================
let lastTouchId = null;

function onBananaClick(e) {
  // タッチとクリックの二重発火を防ぐ
  if (e.type === 'touchstart') {
    lastTouchId = Date.now();
  } else if (e.type === 'click' && Date.now() - lastTouchId < 300) {
    return;
  }

  const result = handleClick();

  // アニメーション
  triggerClickAnimation(result.isCritical);

  // コンボ表示更新
  updateComboDisplay(result.combo, result.comboMult);

  // ポップテキスト
  const pos   = getBananaCenter(e);
  const label = result.isCritical
    ? `💥 CRITICAL! +${formatNumber(result.amount)}`
    : `+${formatNumber(result.amount)}`;
  showPopText(label, pos.x, pos.y, result.isCritical);

  // サウンド
  if (typeof playClickSound === 'function') playClickSound(result.isCritical);
  // 5の倍数コンボでコンボ音
  if (result.combo > 1 && result.combo % 5 === 0) {
    if (typeof playComboSound === 'function') playComboSound(result.combo);
  }
}

/** クリック時のアニメーション（#banana-body に適用） */
function triggerClickAnimation(isCritical = false) {
  if (!UI.bananaBody) return;
  UI.bananaBody.classList.remove('clicked', 'critical-shake');
  void UI.bananaBody.offsetWidth; // 強制リフロー
  UI.bananaBody.classList.add(isCritical ? 'critical-shake' : 'clicked');
  const dur = isCritical ? 450 : 150;
  setTimeout(() => UI.bananaBody.classList.remove('clicked', 'critical-shake'), dur);
}

/** クリック座標（バナナ中心からの相対値）を返す */
function getBananaCenter(e) {
  const rect    = UI.banana.getBoundingClientRect();
  const centerX = rect.left + rect.width  / 2;
  const centerY = rect.top  + rect.height / 2;
  if (e.touches && e.touches.length > 0) {
    return { x: e.touches[0].clientX - centerX, y: e.touches[0].clientY - centerY };
  }
  return {
    x: (e.clientX || centerX) - centerX,
    y: (e.clientY || centerY) - centerY
  };
}

// =====================================================
// ポップアップエフェクト
// =====================================================

/**
 * +N や CRITICAL! テキストをアニメーション表示する
 */
function showPopText(text, offsetX, offsetY, isCritical = false) {
  const el = document.createElement('span');
  el.className = 'pop-text' + (isCritical ? ' pop-critical' : '');
  el.textContent = text;

  const layerRect = UI.effectLayer.getBoundingClientRect();
  const cx = (layerRect.width  / 2) + offsetX + (Math.random() - 0.5) * 40;
  const cy = (layerRect.height / 2) + offsetY + (Math.random() - 0.5) * 20;

  el.style.left      = cx + 'px';
  el.style.top       = cy + 'px';
  el.style.transform = 'translate(-50%, -50%)';

  UI.effectLayer.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

// =====================================================
// ショップ
// =====================================================

function renderShop() {
  if (!UI.shopItems) return;
  UI.shopItems.innerHTML = '';

  Object.values(UPGRADES).forEach(upg => {
    const card = document.createElement('div');
    card.className = 'shop-item';
    card.dataset.id = upg.id;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', upg.name);

    card.innerHTML = `
      <div class="item-info">
        <div class="item-name">${upg.name}</div>
        <div class="item-desc">${upg.description}</div>
        <div class="item-count" id="count-${upg.id}">所持: 0</div>
      </div>
      <div class="item-cost" id="cost-${upg.id}">?</div>
    `;

    card.addEventListener('click',      () => onBuyUpgrade(upg.id));
    card.addEventListener('touchstart', () => onBuyUpgrade(upg.id), { passive: true });
    UI.shopItems.appendChild(card);
  });

  updateShopButtons();
}

function updateShopButtons() {
  Object.values(UPGRADES).forEach(upg => {
    const price   = getUpgradePrice(upg.id);
    const costEl  = document.getElementById('cost-'  + upg.id);
    const countEl = document.getElementById('count-' + upg.id);
    const card    = UI.shopItems?.querySelector(`[data-id="${upg.id}"]`);

    if (costEl)  costEl.textContent  = formatNumber(price);
    if (countEl) countEl.textContent = `所持: ${GameState.upgrades[upg.id]}`;

    if (card) {
      const canAfford = GameState.bananas >= price;
      card.classList.toggle('affordable', canAfford);
      card.classList.toggle('disabled',  !canAfford);
    }
  });
}

// =====================================================
// リセット後のUI初期化
// =====================================================
function resetGameUI() {
  // ステージクラスをリセット（再描画を強制）
  _activeStageClass = '';

  // コンボ表示を消す
  onComboReset();

  // ショップ更新
  updateShopButtons();
}

function onBuyUpgrade(id) {
  if (!buyUpgrade(id)) return;
  const card = UI.shopItems?.querySelector(`[data-id="${id}"]`);
  if (card) {
    card.style.transition = 'background 0.15s';
    card.style.background = 'linear-gradient(90deg, #ffe082, #ffd54f)';
    setTimeout(() => { card.style.background = ''; }, 300);
  }
  updateShopButtons();
}
