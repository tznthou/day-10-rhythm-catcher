import { CONFIG } from './config.js';

export class Webcam {
  constructor() {
    this.video = null;
    this.stream = null;
    this.isReady = false;

    // 幀差偵測用
    this.detectionCanvas = null;
    this.detectionCtx = null;
    this.previousFrame = null;
    this.currentFrame = null;
  }

  async init() {
    // 建立 video 元素
    this.video = document.createElement('video');
    this.video.setAttribute('playsinline', '');
    this.video.setAttribute('autoplay', '');

    // 建立偵測用的隱藏 canvas（縮小尺寸省效能）
    this.detectionCanvas = document.createElement('canvas');
    this.detectionCanvas.width = CONFIG.motion.detectionWidth;
    this.detectionCanvas.height = CONFIG.motion.detectionHeight;
    this.detectionCtx = this.detectionCanvas.getContext('2d', {
      willReadFrequently: true,
    });

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: CONFIG.canvas.width },
          height: { ideal: CONFIG.canvas.height },
        },
        audio: false,
      });

      this.video.srcObject = this.stream;
      await this.video.play();
      this.isReady = true;

      return true;
    } catch (error) {
      console.error('Webcam 初始化失敗:', error);
      return false;
    }
  }

  // 繪製 webcam 畫面到主 canvas（水平翻轉 + 調暗）
  drawToCanvas(ctx) {
    if (!this.isReady) return;

    ctx.save();
    // 水平翻轉
    ctx.scale(-1, 1);
    ctx.translate(-CONFIG.canvas.width, 0);
    // 調暗背景
    ctx.filter = 'brightness(0.75)';
    ctx.drawImage(
      this.video,
      0, 0,
      CONFIG.canvas.width,
      CONFIG.canvas.height
    );
    ctx.filter = 'none';
    ctx.restore();
  }

  // 更新偵測幀（每幀呼叫一次）
  updateDetectionFrame() {
    if (!this.isReady) return;

    // 保存上一幀
    this.previousFrame = this.currentFrame;

    // 繪製縮小版畫面（水平翻轉）
    this.detectionCtx.save();
    this.detectionCtx.scale(-1, 1);
    this.detectionCtx.translate(-CONFIG.motion.detectionWidth, 0);
    this.detectionCtx.drawImage(
      this.video,
      0, 0,
      CONFIG.motion.detectionWidth,
      CONFIG.motion.detectionHeight
    );
    this.detectionCtx.restore();

    // 取得當前幀的像素資料
    this.currentFrame = this.detectionCtx.getImageData(
      0, 0,
      CONFIG.motion.detectionWidth,
      CONFIG.motion.detectionHeight
    );
  }

  // 檢測指定位置的動態變化
  // x, y 是主 canvas 上的座標
  detectMotionAt(x, y, radius) {
    if (!this.previousFrame || !this.currentFrame) return false;

    // 將主 canvas 座標轉換為偵測 canvas 座標
    const scaleX = CONFIG.motion.detectionWidth / CONFIG.canvas.width;
    const scaleY = CONFIG.motion.detectionHeight / CONFIG.canvas.height;
    const detectX = Math.floor(x * scaleX);
    const detectY = Math.floor(y * scaleY);
    const detectRadius = Math.floor(radius * scaleX);

    // 計算取樣區域
    const halfSize = Math.max(detectRadius, CONFIG.motion.sampleSize / 2);
    const startX = Math.max(0, detectX - halfSize);
    const endX = Math.min(CONFIG.motion.detectionWidth, detectX + halfSize);
    const startY = Math.max(0, detectY - halfSize);
    const endY = Math.min(CONFIG.motion.detectionHeight, detectY + halfSize);

    let totalDiff = 0;
    let pixelCount = 0;

    const prev = this.previousFrame.data;
    const curr = this.currentFrame.data;
    const width = CONFIG.motion.detectionWidth;

    // 計算區域內的像素差異
    for (let py = startY; py < endY; py++) {
      for (let px = startX; px < endX; px++) {
        const idx = (py * width + px) * 4;

        // RGB 差異的絕對值總和
        const diffR = Math.abs(curr[idx] - prev[idx]);
        const diffG = Math.abs(curr[idx + 1] - prev[idx + 1]);
        const diffB = Math.abs(curr[idx + 2] - prev[idx + 2]);

        totalDiff += (diffR + diffG + diffB) / 3;
        pixelCount++;
      }
    }

    // 計算平均差異
    const avgDiff = pixelCount > 0 ? totalDiff / pixelCount : 0;

    return avgDiff > CONFIG.motion.threshold;
  }

  // 停止 webcam
  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    this.isReady = false;
  }
}
