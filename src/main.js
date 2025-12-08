import { CONFIG } from './config.js';
import { Webcam } from './webcam.js';
import { Note } from './note.js';
import { createParticles } from './particle.js';
import { FloatingText } from './floatingText.js';
import { AudioEngine } from './audio.js';

class Game {
  constructor() {
    // Canvas 設定
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = CONFIG.canvas.width;
    this.canvas.height = CONFIG.canvas.height;

    // 遊戲物件
    this.webcam = new Webcam();
    this.audio = new AudioEngine();
    this.notes = [];
    this.particles = [];
    this.floatingTexts = [];

    // 遊戲狀態
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.gameStartTime = 0;
    this.pausedTime = 0; // 記錄暫停時的時間戳

    // 難度相關
    this.currentSpeed = CONFIG.difficulty.initialSpeed;
    this.currentSpawnRate = CONFIG.difficulty.initialSpawnRate;
    this.lastSpawnTime = 0;
    this.lastDifficultyUpdate = 0;

    // 螢幕閃光效果
    this.flashAlpha = 0;
    this.flashType = null;

    // UI 元素
    this.startScreen = document.getElementById('startScreen');
    this.startBtn = document.getElementById('startBtn');
    this.scoreDisplay = document.getElementById('score');
    this.comboDisplay = document.getElementById('combo');
    this.pauseScreen = document.getElementById('pauseScreen');
    this.resumeBtn = document.getElementById('resumeBtn');
    this.pauseBtn = document.getElementById('pauseBtn');
    this.soundOptions = document.getElementById('soundOptions');

    this.bindEvents();
  }

  bindEvents() {
    this.startBtn.addEventListener('click', () => this.start());
    this.resumeBtn.addEventListener('click', () => this.resume());
    this.pauseBtn.addEventListener('click', () => this.togglePause());

    // 音色選擇事件
    this.soundOptions.addEventListener('click', (e) => {
      const option = e.target.closest('.sound-option');
      if (!option) return;

      // 更新 UI
      this.soundOptions.querySelectorAll('.sound-option').forEach(btn => {
        btn.classList.remove('active');
      });
      option.classList.add('active');

      // 設定音色並播放預覽
      const preset = option.dataset.preset;
      this.audio.setPreset(preset);
      this.audio.playPreview();
    });

    // 鍵盤事件：ESC 或空白鍵暫停
    document.addEventListener('keydown', (e) => {
      if (!this.isRunning) return;
      if (e.code === 'Escape' || e.code === 'Space') {
        e.preventDefault();
        this.togglePause();
      }
    });
  }

  togglePause() {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  pause() {
    if (!this.isRunning || this.isPaused) return;

    this.isPaused = true;
    this.pausedTime = performance.now();
    this.pauseScreen.classList.remove('hidden');
    this.pauseBtn.classList.add('paused');
  }

  resume() {
    if (!this.isPaused) return;

    // 補償暫停期間的時間差
    const pauseDuration = performance.now() - this.pausedTime;
    this.lastSpawnTime += pauseDuration;
    this.lastDifficultyUpdate += pauseDuration;

    this.isPaused = false;
    this.pauseScreen.classList.add('hidden');
    this.pauseBtn.classList.remove('paused');

    // 繼續遊戲迴圈
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  async start() {
    // 初始化 webcam
    const webcamReady = await this.webcam.init();
    if (!webcamReady) {
      alert('無法存取 Webcam，請確認權限設定。');
      return;
    }

    // 初始化音效（需要用戶互動後才能啟動）
    this.audio.init();

    // 隱藏開始畫面
    this.startScreen.classList.add('hidden');

    // 重置遊戲狀態
    this.reset();

    // 開始遊戲迴圈
    this.isRunning = true;
    this.gameStartTime = performance.now();
    this.lastDifficultyUpdate = this.gameStartTime;
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  reset() {
    this.notes = [];
    this.particles = [];
    this.floatingTexts = [];
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.currentSpeed = CONFIG.difficulty.initialSpeed;
    this.currentSpawnRate = CONFIG.difficulty.initialSpawnRate;
    this.lastSpawnTime = 0;
    this.flashAlpha = 0;
    this.updateUI();
  }

  gameLoop(timestamp) {
    if (!this.isRunning || this.isPaused) return;

    // 更新偵測幀
    this.webcam.updateDetectionFrame();

    // 更新難度
    this.updateDifficulty(timestamp);

    // 生成新音符
    this.spawnNotes(timestamp);

    // 更新遊戲物件
    this.update();

    // 檢測碰撞
    this.checkCollisions();

    // 繪製
    this.draw();

    // 下一幀
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  updateDifficulty(timestamp) {
    const elapsed = timestamp - this.lastDifficultyUpdate;

    if (elapsed >= CONFIG.difficulty.difficultyInterval) {
      // 增加速度
      if (this.currentSpeed < CONFIG.difficulty.maxSpeed) {
        this.currentSpeed += CONFIG.difficulty.speedIncrement;
      }

      // 減少生成間隔
      if (this.currentSpawnRate > CONFIG.difficulty.minSpawnRate) {
        this.currentSpawnRate -= CONFIG.difficulty.spawnDecrement;
      }

      this.lastDifficultyUpdate = timestamp;
    }

    // 計算難度進度並同步到音效引擎
    const difficultyProgress = (this.currentSpeed - CONFIG.difficulty.initialSpeed) /
      (CONFIG.difficulty.maxSpeed - CONFIG.difficulty.initialSpeed);
    this.audio.setDifficultyProgress(difficultyProgress);
  }

  spawnNotes(timestamp) {
    if (timestamp - this.lastSpawnTime >= this.currentSpawnRate) {
      // 在畫面寬度範圍內隨機生成位置
      const margin = CONFIG.note.radius * 2;
      const x = margin + Math.random() * (CONFIG.canvas.width - margin * 2);

      const note = new Note(x, this.currentSpeed);
      this.notes.push(note);

      this.lastSpawnTime = timestamp;
    }
  }

  update() {
    // 更新音符
    this.notes.forEach(note => note.update());

    // 移除掉出畫面的音符（漏接）
    const beforeCount = this.notes.length;
    this.notes = this.notes.filter(note => !note.isOffScreen());
    const missedCount = beforeCount - this.notes.length;

    // 漏接重置 combo
    if (missedCount > 0) {
      this.combo = 0;
      this.updateUI();
    }

    // 更新粒子
    this.particles.forEach(p => p.update());
    this.particles = this.particles.filter(p => !p.isDead());

    // 更新飄字
    this.floatingTexts.forEach(t => t.update());
    this.floatingTexts = this.floatingTexts.filter(t => !t.isDead());

    // 更新閃光效果
    if (this.flashAlpha > 0) {
      this.flashAlpha -= 0.05;
    }
  }

  checkCollisions() {
    const toRemove = [];

    for (let i = 0; i < this.notes.length; i++) {
      const note = this.notes[i];

      // 檢測該音符位置的動態變化
      const hit = this.webcam.detectMotionAt(
        note.x,
        note.y,
        note.getHitRadius()
      );

      if (hit) {
        toRemove.push(i);
        this.onNoteCaught(note);
      }
    }

    // 移除被接住的音符（從後往前刪避免 index 問題）
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.notes.splice(toRemove[i], 1);
    }
  }

  onNoteCaught(note) {
    // 更新分數和連擊
    this.combo++;
    this.score += this.combo; // combo 越高分數越多
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }

    // 播放音效
    this.audio.playCatch(this.combo);

    // 產生粒子
    const { particles, flash } = createParticles(
      note.x,
      note.y,
      note.color,
      this.combo
    );
    this.particles.push(...particles);

    // 螢幕閃光
    if (flash) {
      this.flashType = flash;
      this.flashAlpha = flash === 'bright' ? 0.4 : 0.2;
    }

    // 飄字
    const text = this.combo >= 3 ? `+${this.combo} Combo!` : `+${this.combo}`;
    this.floatingTexts.push(
      new FloatingText(note.x, note.y, text, note.color)
    );

    this.updateUI();
  }

  draw() {
    // 清除畫布
    this.ctx.clearRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

    // 繪製 webcam 背景
    this.webcam.drawToCanvas(this.ctx);

    // 繪製音符
    this.notes.forEach(note => note.draw(this.ctx));

    // 繪製粒子
    this.particles.forEach(p => p.draw(this.ctx));

    // 繪製飄字
    this.floatingTexts.forEach(t => t.draw(this.ctx));

    // 繪製螢幕閃光
    if (this.flashAlpha > 0) {
      this.ctx.save();
      this.ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`;
      this.ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
      this.ctx.restore();
    }
  }

  updateUI() {
    this.scoreDisplay.textContent = this.score.toString().padStart(4, '0');
    this.comboDisplay.textContent = `x${this.combo}`;
  }
}

// 啟動遊戲
const game = new Game();
