import { CONFIG } from './config.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;
    this.currentPreset = 'marimba';
    this.difficultyProgress = 0; // 0.0 ~ 1.0
  }

  // 必須在用戶互動後呼叫
  init() {
    if (this.isInitialized) return;

    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.isInitialized = true;
  }

  // 設定音色
  setPreset(presetName) {
    if (CONFIG.soundPresets[presetName]) {
      this.currentPreset = presetName;
    }
  }

  // 設定難度進度 (0.0 ~ 1.0)
  setDifficultyProgress(progress) {
    this.difficultyProgress = Math.max(0, Math.min(1, progress));
  }

  // 取得當前音色設定
  getPreset() {
    return CONFIG.soundPresets[this.currentPreset];
  }

  // 根據難度調整參數
  getAdjustedParams() {
    const preset = this.getPreset();
    const p = this.difficultyProgress;

    return {
      attack: preset.attack * (1 - p * 0.5),      // 最多縮短 50%
      decay: preset.decay * (1 - p * 0.6),        // 最多縮短 60%
      pitchMultiplier: 1 + p * 0.1,               // 最高提升 10%
      delayTime: 0.1 * (1 - p * 0.5),             // 延遲縮短
      delayFeedback: 0.3 * (1 - p * 0.3),         // 回饋減少
      burstDuration: 0.05 * (1 - p * 0.4),        // burst 更短
    };
  }

  // 根據權重隨機選擇和弦中的一個音
  getRandomNote() {
    const { chord, weights } = CONFIG.audio;

    const weightedNotes = [];
    for (let i = 0; i < chord.length; i++) {
      for (let j = 0; j < weights[i]; j++) {
        weightedNotes.push(chord[i]);
      }
    }

    return weightedNotes[Math.floor(Math.random() * weightedNotes.length)];
  }

  // 播放音符
  playNote(combo = 1) {
    if (!this.isInitialized) return;

    const preset = this.getPreset();
    const adjusted = this.getAdjustedParams();
    const baseFreq = this.getRandomNote() * adjusted.pitchMultiplier;
    const now = this.ctx.currentTime;

    // 根據 combo 調整音量
    let volume = CONFIG.audio.baseVolume;
    if (combo >= 6) {
      volume *= 1.1;
    }

    // 建立主振盪器
    const osc1 = this.ctx.createOscillator();
    osc1.type = preset.osc1Type;
    osc1.frequency.value = baseFreq;

    // 建立副振盪器（泛音）
    const osc2 = this.ctx.createOscillator();
    osc2.type = preset.osc2Type;
    osc2.frequency.value = baseFreq * preset.osc2Ratio;

    // 主振盪器音量包絡
    const gain1 = this.ctx.createGain();
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(volume, now + adjusted.attack);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + adjusted.attack + adjusted.decay);

    // 副振盪器音量包絡
    const gain2 = this.ctx.createGain();
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(volume * preset.osc2Volume, now + adjusted.attack);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + adjusted.attack + adjusted.decay);

    // 連接振盪器到增益
    osc1.connect(gain1);
    osc2.connect(gain2);

    // 濾波器（如果有設定）
    let output1 = gain1;
    let output2 = gain2;

    if (preset.filterFreq) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = preset.filterFreq;

      // 濾波器掃頻效果
      if (preset.filterSweep) {
        filter.frequency.setValueAtTime(preset.filterFreq * 2, now);
        filter.frequency.exponentialRampToValueAtTime(
          preset.filterFreq * 0.5,
          now + adjusted.decay
        );
      }

      gain1.connect(filter);
      gain2.connect(filter);
      output1 = filter;
      output2 = null; // 已經透過 filter 連接
    }

    // Reverb/Delay（如果有設定，且 combo >= 3）
    if (preset.useReverb || combo >= 3) {
      const delay = this.createDelay(adjusted);
      output1.connect(delay);
      if (output2) output2.connect(delay);
      delay.connect(this.ctx.destination);
    }

    // 連接到輸出
    output1.connect(this.ctx.destination);
    if (output2) output2.connect(this.ctx.destination);

    // 播放
    const duration = adjusted.attack + adjusted.decay + 0.1;
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  }

  // 建立延遲效果
  createDelay(adjusted) {
    const delay = this.ctx.createDelay();
    delay.delayTime.value = adjusted.delayTime;

    const feedback = this.ctx.createGain();
    feedback.gain.value = adjusted.delayFeedback;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;

    delay.connect(feedback);
    feedback.connect(filter);
    filter.connect(delay);

    return delay;
  }

  // 播放白噪音 burst
  playBurst() {
    if (!this.isInitialized) return;

    const adjusted = this.getAdjustedParams();
    const now = this.ctx.currentTime;
    const duration = adjusted.burstDuration;

    // 建立白噪音
    const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // 音量包絡
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // 高通濾波讓聲音更清脆
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3000;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  // 同時播放音符和爆破音
  playCatch(combo) {
    this.playNote(combo);
    this.playBurst();
  }

  // 預覽音色（用於選擇時）
  playPreview() {
    if (!this.isInitialized) {
      this.init();
    }

    // 暫時重置難度，播放原始音色
    const originalProgress = this.difficultyProgress;
    this.difficultyProgress = 0;

    // 播放一個音
    this.playNote(1);

    // 恢復難度
    this.difficultyProgress = originalProgress;
  }
}
