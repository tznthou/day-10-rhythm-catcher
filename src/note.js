import { CONFIG } from './config.js';

export class Note {
  constructor(x, speed) {
    this.x = x;
    this.y = -CONFIG.note.radius; // 從畫面上方開始
    this.radius = CONFIG.note.radius;
    this.hitRadius = this.radius * CONFIG.note.hitRadiusMultiplier;
    this.speed = speed;

    // 隨機選擇顏色和形狀
    this.color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
    this.shape = CONFIG.note.shapes[Math.floor(Math.random() * CONFIG.note.shapes.length)];

    // Ghost trail 軌跡紀錄（加長到 5 個）
    this.trail = [];
    this.maxTrail = 5;

    // 動畫用
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.rotationAngle = 0;
  }

  update() {
    // 記錄當前位置到軌跡
    this.trail.unshift({ x: this.x, y: this.y });

    // 限制軌跡長度
    if (this.trail.length > this.maxTrail) {
      this.trail.pop();
    }

    // 更新位置
    this.y += this.speed;

    // 更新動畫
    this.pulsePhase += 0.15;
    this.rotationAngle += 0.05;
  }

  draw(ctx) {
    // 繪製外層光暈（最底層）
    this.drawOuterGlow(ctx);

    // 繪製 ghost trail
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const pos = this.trail[i];
      const opacity = (1 - (i + 1) / (this.maxTrail + 1)) * 0.6;
      const size = this.radius * (1 - (i + 1) * 0.12);

      this.drawShape(ctx, pos.x, pos.y, size, opacity, false);
    }

    // 繪製主音符（帶脈動效果）
    const pulse = 1 + Math.sin(this.pulsePhase) * 0.15;
    const mainRadius = this.radius * pulse;

    // 主體發光
    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 30;

    this.drawShape(ctx, this.x, this.y, mainRadius, 1, true);

    ctx.restore();

    // 繪製內部高光
    this.drawInnerHighlight(ctx, mainRadius);

    // 繪製外圈光環
    this.drawRing(ctx, mainRadius);
  }

  // 外層大範圍光暈
  drawOuterGlow(ctx) {
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.radius * 2.5
    );
    gradient.addColorStop(0, this.hexToRgba(this.color, 0.3));
    gradient.addColorStop(0.5, this.hexToRgba(this.color, 0.1));
    gradient.addColorStop(1, this.hexToRgba(this.color, 0));

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 內部高光點（讓音符更立體）
  drawInnerHighlight(ctx, mainRadius) {
    const highlightSize = mainRadius * 0.4;
    const offsetX = -mainRadius * 0.25;
    const offsetY = -mainRadius * 0.25;

    const gradient = ctx.createRadialGradient(
      this.x + offsetX, this.y + offsetY, 0,
      this.x + offsetX, this.y + offsetY, highlightSize
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x + offsetX, this.y + offsetY, highlightSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 外圈旋轉光環
  drawRing(ctx, mainRadius) {
    const ringRadius = mainRadius * 1.4;
    const ringWidth = 2;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotationAngle);

    // 漸層光環（只畫部分弧線）
    ctx.strokeStyle = this.color;
    ctx.lineWidth = ringWidth;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 15;
    ctx.globalAlpha = 0.7;

    // 畫兩段弧線
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, 0, Math.PI * 0.7);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, Math.PI, Math.PI * 1.7);
    ctx.stroke();

    ctx.restore();
  }

  drawShape(ctx, x, y, size, opacity, withGradient = false) {
    ctx.save();
    ctx.globalAlpha = opacity;

    // 使用漸層填充讓主體更有層次
    if (withGradient) {
      const gradient = ctx.createRadialGradient(
        x - size * 0.3, y - size * 0.3, 0,
        x, y, size
      );
      gradient.addColorStop(0, this.lightenColor(this.color, 30));
      gradient.addColorStop(0.7, this.color);
      gradient.addColorStop(1, this.darkenColor(this.color, 20));
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = this.color;
    }

    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // 工具函數：hex 轉 rgba
  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // 工具函數：讓顏色變亮
  lightenColor(hex, percent) {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + percent);
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + percent);
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + percent);
    return `rgb(${r}, ${g}, ${b})`;
  }

  // 工具函數：讓顏色變暗
  darkenColor(hex, percent) {
    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - percent);
    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - percent);
    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - percent);
    return `rgb(${r}, ${g}, ${b})`;
  }

  // 檢查是否掉出畫面
  isOffScreen() {
    return this.y > CONFIG.canvas.height + this.radius;
  }

  // 取得碰撞偵測用的半徑
  getHitRadius() {
    return this.hitRadius;
  }
}
