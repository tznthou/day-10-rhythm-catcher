import { CONFIG } from './config.js';

export class FloatingText {
  constructor(x, y, text, color = '#ffffff') {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;

    this.life = 1;
    this.maxLife = CONFIG.floatingText.duration / 16; // 約略的幀數
    this.speed = CONFIG.floatingText.speed;
    this.fontSize = CONFIG.floatingText.fontSize;
  }

  update() {
    // 往上飄
    this.y -= this.speed;

    // 減少生命值
    this.life -= 1 / this.maxLife;
  }

  draw(ctx) {
    ctx.save();

    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.font = `bold ${this.fontSize}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 文字陰影
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;

    ctx.fillText(this.text, this.x, this.y);

    ctx.restore();
  }

  isDead() {
    return this.life <= 0;
  }
}
