/**
 * ui.js - 表示処理
 * DOM更新・エフェクト・ショップUI生成
 */

// =====================================================
// DOM参照キャッシュ
// =====================================================
const UI = {
  bananaCount:  null,
  bps:          null,
  clickPower:   null,
  banana:       null,
  effectLayer:  null,
  shopItems:    null
};

/**
 * DOM参照を初期化する（main.js から呼ぶ）
 */
function initUI() {
  UI.bananaCount = document.getElementById('banana-count');
  UI.bps         = document.getElementById('bps');
  UI.clickPower  = document.getElementById('click-power');
  UI.banana      = document.getElementById('banana');
  UI.effectLayer = document.getElementById('effect-layer');
  UI.shopItems   = document.getElementById('shop-items');

  // バナナクリックイベント
  UI.banana.addEventListener('click', onBananaClick);
  UI.banana.addEventListener('touchstart', onBananaClick, { passive: true });

  // ショップを生成
  renderShop();
}

// =====================================================
// 数値フォーマット
// =====================================================

/**
 * 大きな数値を K / M / B 表記に変換する
 * @param {number} num
 * @returns {string}
 */
function formatNumber(num) {
  const n = Math.floor(num);
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)         return (n / 1_000).toFixed(2) + 'K';
  return n.toString();
}

// =====================================================
// UI更新（毎フレーム呼ばれる）
// =====================================================

/**
 * 数値表示をゲーム状態に同期する
 */
function updateUI() {
  if (UI.bananaCount) UI.bananaCount.textContent = formatNumber(GameState.bananas);
  if (UI.bps)         UI.bps.textContent         = formatNumber(GameState.bps);
  if (UI.clickPower)  UI.clickPower.textContent   = formatNumber(GameState.clickPower);

  // ショップボタンの購入可否を更新
  updateShopButtons();
}

// =====================================================
// バナナクリック処理
// =====================================================

let lastTouchId = null; // タッチとクリックの二重発火を防ぐ

/**
 * バナナをクリック／タップしたときの処理
 * @param {MouseEvent|TouchEvent} e
 */
function onBananaClick(e) {
  // touch と click の二重発火を防ぐ
  if (e.type === 'touchstart') {
    lastTouchId = Date.now();
  } else if (e.type === 'click' && Date.now() - lastTouchId < 300) {
    return;
  }

  // ゲームロジック
  handleClick();

  // アニメーション
  triggerClickAnimation();

  // +N ポップ表示
  const pos = getBananaCenter(e);
  showPopText('+' + formatNumber(GameState.clickPower), pos.x, pos.y);
}

/**
 * バナナ押下アニメーション
 */
function triggerClickAnimation() {
  UI.banana.classList.remove('clicked');
  // 強制リフロー（アニメーションを再トリガーするため）
  void UI.banana.offsetWidth;
  UI.banana.classList.add('clicked');
  setTimeout(() => UI.banana.classList.remove('clicked'), 150);
}

/**
 * クリック座標（バナナ中心からの相対）を取得する
 * @param {MouseEvent|TouchEvent} e
 * @returns {{ x: number, y: number }}
 */
function getBananaCenter(e) {
  const rect = UI.banana.getBoundingClientRect();
  const centerX = rect.left + rect.width  / 2;
  const centerY = rect.top  + rect.height / 2;

  if (e.touches && e.touches.length > 0) {
    return {
      x: e.touches[0].clientX - centerX,
      y: e.touches[0].clientY - centerY
    };
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
 * +N テキストをアニメーション表示する
 * @param {string} text   - 表示するテキスト
 * @param {number} offsetX - バナナ中心からのX座標オフセット
 * @param {number} offsetY - バナナ中心からのY座標オフセット
 */
function showPopText(text, offsetX, offsetY) {
  const el = document.createElement('span');
  el.className = 'pop-text';
  el.textContent = text;

  // バナナ中心を基準に配置（effect-layerはborderradius:50%のバナナ上に重ねている）
  const wrapRect  = UI.effectLayer.parentElement.getBoundingClientRect();
  const layerRect = UI.effectLayer.getBoundingClientRect();
  const cx = (layerRect.width  / 2) + offsetX + (Math.random() - 0.5) * 40;
  const cy = (layerRect.height / 2) + offsetY + (Math.random() - 0.5) * 20;

  el.style.left = cx + 'px';
  el.style.top  = cy + 'px';
  el.style.transform = 'translate(-50%, -50%)';

  UI.effectLayer.appendChild(el);

  // アニメーション終了後に削除
  el.addEventListener('animationend', () => el.remove());
}

// =====================================================
// ショップ
// =====================================================

/**
 * ショップアイテムを初回レンダリングする
 */
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

/**
 * ショップボタンの価格・購入可否を更新する
 */
function updateShopButtons() {
  Object.values(UPGRADES).forEach(upg => {
    const price   = getUpgradePrice(upg.id);
    const costEl  = document.getElementById('cost-'  + upg.id);
    const countEl = document.getElementById('count-' + upg.id);
    const card    = UI.shopItems ? UI.shopItems.querySelector(`[data-id="${upg.id}"]`) : null;

    if (costEl)  costEl.textContent  = formatNumber(price);
    if (countEl) countEl.textContent = `所持: ${GameState.upgrades[upg.id]}`;

    if (card) {
      const canAfford = GameState.bananas >= price;
      card.classList.toggle('affordable', canAfford);
      card.classList.toggle('disabled',  !canAfford);
    }
  });
}

/**
 * アップグレード購入ボタンを押したとき
 * @param {string} id
 */
function onBuyUpgrade(id) {
  const success = buyUpgrade(id);
  if (success) {
    // 購入成功エフェクト
    const card = UI.shopItems ? UI.shopItems.querySelector(`[data-id="${id}"]`) : null;
    if (card) {
      card.style.transition = 'background 0.15s';
      card.style.background = 'linear-gradient(90deg, #ffe082, #ffd54f)';
      setTimeout(() => { card.style.background = ''; }, 300);
    }
    updateShopButtons();
  }
}
