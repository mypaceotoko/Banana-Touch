/**
 * sound.js - Web Audio API によるサウンドエフェクト
 * 外部ファイル不要・純粋に音を合成する
 */

// =====================================================
// 内部状態
// =====================================================
let _audioCtx = null;
// ミュート状態を localStorage から復元
let _isMuted = localStorage.getItem('banana-muted') === 'true';

// =====================================================
// AudioContext の取得（遅延初期化）
// =====================================================
function _getCtx() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // ブラウザの AutoPlay Policy で suspended になっている場合に再開
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

// =====================================================
// 公開 API
// =====================================================

/** ミュート状態を取得する */
function getMuted() { return _isMuted; }

/** ミュートをトグルし、新しい状態を返す */
function toggleMute() {
  _isMuted = !_isMuted;
  localStorage.setItem('banana-muted', String(_isMuted));
  return _isMuted;
}

// =====================================================
// 内部ユーティリティ：単音を鳴らす
// =====================================================

/**
 * @param {object} opts
 * @param {number}  opts.freq    - 開始周波数 (Hz)
 * @param {number}  [opts.freq2] - 終了周波数（glide）
 * @param {string}  [opts.type]  - OscillatorType ('sine'|'square'|'triangle'|'sawtooth')
 * @param {number}  [opts.vol]   - 音量 (0–1)
 * @param {number}  [opts.dur]   - 継続時間 (秒)
 * @param {number}  [opts.delay] - 開始遅延 (秒)
 */
function _tone({ freq = 440, freq2, type = 'sine', vol = 0.12, dur = 0.1, delay = 0 } = {}) {
  if (_isMuted) return;
  try {
    const ctx  = _getCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    if (freq2 != null) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(freq2, 1),
        ctx.currentTime + delay + dur
      );
    }
    gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + dur);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + dur + 0.01);
  } catch (_) { /* AudioContext 未対応ブラウザはスキップ */ }
}

// =====================================================
// サウンドエフェクト
// =====================================================

/**
 * 通常クリック音 / クリティカル音
 * @param {boolean} isCritical
 */
function playClickSound(isCritical = false) {
  if (isCritical) {
    // クリティカル：ドラマチックな上昇→炸裂音
    _tone({ freq: 200,  freq2: 800,  type: 'sine',     vol: 0.15, dur: 0.12 });
    _tone({ freq: 900,  freq2: 450,  type: 'square',   vol: 0.09, dur: 0.18, delay: 0.06 });
    _tone({ freq: 1400, freq2: 700,  type: 'sine',     vol: 0.12, dur: 0.25, delay: 0.10 });
    _tone({ freq: 500,  freq2: 250,  type: 'triangle', vol: 0.08, dur: 0.35, delay: 0.20 });
  } else {
    // 通常クリック：短くポップな音
    _tone({ freq: 520, freq2: 420, type: 'sine', vol: 0.10, dur: 0.07 });
  }
}

/**
 * コンボ達成音（コンボ数が大きいほど高音）
 * @param {number} combo
 */
function playComboSound(combo) {
  // combo 5 → 400Hz, 10 → 500Hz, 20 → 620Hz, 50 → 800Hz
  const base = Math.min(400 + combo * 8, 800);
  _tone({ freq: base, freq2: base * 1.5, type: 'sine', vol: 0.10, dur: 0.10 });
  // ハーモニーを重ねる
  _tone({ freq: base * 1.25, freq2: base * 1.8, type: 'sine', vol: 0.06, dur: 0.10, delay: 0.03 });
}

/**
 * ステージアップ音（ファンファーレ）
 * C5 → E5 → G5 → C6 の和音風
 */
function playStageUpSound() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    _tone({ freq, freq2: freq * 1.02, type: 'sine', vol: 0.14, dur: 0.28, delay: i * 0.11 });
  });
  // ベースも少し
  _tone({ freq: 262, type: 'triangle', vol: 0.08, dur: 0.55, delay: 0.0 });
}
