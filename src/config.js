// 遊戲參數設定
export const CONFIG = {
  // 畫布設定
  canvas: {
    width: 800,
    height: 600,
  },

  // 難度曲線
  difficulty: {
    initialSpeed: 2,          // 初始下落速度
    maxSpeed: 8,              // 速度上限
    speedIncrement: 0.1,      // 每 10 秒增加

    initialSpawnRate: 1500,   // 初始生成間隔 (ms)
    minSpawnRate: 400,        // 最快生成間隔
    spawnDecrement: 50,       // 每 10 秒減少

    difficultyInterval: 10000, // 難度提升間隔 (ms)
  },

  // 音符設定
  note: {
    radius: 25,               // 視覺半徑
    hitRadiusMultiplier: 1.3, // 碰撞半徑 = 視覺半徑 * 1.3
    trailLength: 3,           // ghost trail 長度
    glowBlur: 20,             // 發光模糊度
    shapes: ['circle', 'diamond'], // 形狀種類
  },

  // 音符顏色（Tailwind 色票）
  colors: [
    '#22d3ee', // cyan-400
    '#a855f7', // purple-500
    '#f472b6', // pink-400
    '#34d399', // emerald-400
    '#fbbf24', // amber-400
  ],

  // 粒子設定
  particle: {
    baseCount: 12,            // 基礎粒子數
    baseSize: 4,              // 基礎大小
    speed: 6,                 // 初始速度
    friction: 0.95,           // 摩擦力
    lifeDecay: 0.02,          // 生命衰減速度
  },

  // 飄字設定
  floatingText: {
    duration: 300,            // 持續時間 (ms)
    speed: 2,                 // 往上飄的速度
    fontSize: 24,             // 字體大小
  },

  // 視覺 Juice（連擊加成）
  juice: {
    levels: [
      { combo: 1,  particles: 12, sizeMultiplier: 1.0, flash: false },
      { combo: 3,  particles: 20, sizeMultiplier: 1.2, flash: false },
      { combo: 6,  particles: 30, sizeMultiplier: 1.5, flash: 'dim' },
      { combo: 10, particles: 40, sizeMultiplier: 2.0, flash: 'bright' },
    ],
  },

  // 音效設定
  audio: {
    // C Major 7 和弦頻率
    chord: [261.63, 329.63, 392.00, 493.88], // C4, E4, G4, B4
    // 權重（根音和五度較高）
    weights: [3, 2, 3, 2],
    // 基礎音量
    baseVolume: 0.3,
  },

  // 音色預設
  soundPresets: {
    marimba: {
      name: '馬林琴',
      icon: '🪵',
      osc1Type: 'sine',
      osc2Type: 'triangle',
      osc2Ratio: 2,           // 高八度
      osc2Volume: 0.3,
      attack: 0.01,
      decay: 0.15,
      filterFreq: null,
      useReverb: false,
    },
    piano: {
      name: '鋼琴',
      icon: '🎹',
      osc1Type: 'triangle',
      osc2Type: 'sine',
      osc2Ratio: 3,           // 五度泛音
      osc2Volume: 0.4,
      attack: 0.005,
      decay: 0.4,
      filterFreq: 4000,
      useReverb: true,
    },
    chime: {
      name: '風鈴',
      icon: '🔔',
      osc1Type: 'sine',
      osc2Type: 'sine',
      osc2Ratio: 2.5,         // 非整數產生金屬感
      osc2Volume: 0.5,
      attack: 0.001,
      decay: 0.8,
      filterFreq: 8000,
      useReverb: true,
    },
    synth: {
      name: '電子',
      icon: '🎛️',
      osc1Type: 'sawtooth',
      osc2Type: 'square',
      osc2Ratio: 1,           // 同頻率疊加
      osc2Volume: 0.3,
      attack: 0.02,
      decay: 0.2,
      filterFreq: 2000,
      filterSweep: true,
      useReverb: false,
    },
    retro: {
      name: '8-bit',
      icon: '👾',
      osc1Type: 'square',
      osc2Type: 'square',
      osc2Ratio: 2,
      osc2Volume: 0.2,
      attack: 0.001,
      decay: 0.08,
      filterFreq: null,
      useReverb: false,
    },
  },

  // 動態偵測設定
  motion: {
    detectionWidth: 160,      // 偵測用縮小畫面寬度
    detectionHeight: 120,     // 偵測用縮小畫面高度
    threshold: 30,            // 像素變化閾值
    sampleSize: 20,           // 取樣區塊大小
  },
};
