import { CONFIG } from './config.js';

export class Particle {
  constructor(x, y, color, sizeMultiplier = 1) {
    this.x = x;
    this.y = y;
    this.color = color;

    // 隨機方向和速度
    const angle = Math.random() * Math.PI * 2;
    const speed = CONFIG.particle.speed * (0.5 + Math.random() * 0.5);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    // 大小和生命值
    this.size = CONFIG.particle.baseSize * sizeMultiplier * (0.5 + Math.random() * 0.5);
    this.life = 1;

    // 摩擦力和衰減
    this.friction = CONFIG.particle.friction;
    this.lifeDecay = CONFIG.particle.lifeDecay;
  }

  update() {
    // 更新位置
    this.x += this.vx;
    this.y += this.vy;

    // 套用摩擦力
    this.vx *= this.friction;
    this.vy *= this.friction;

    // 減少生命值
    this.life -= this.lifeDecay;
  }

  draw(ctx) {
    ctx.save();

    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;

    // 發光效果
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  isDead() {
    return this.life <= 0;
  }
}

// 粒子工廠：根據 combo 等級產生對應數量的粒子
export function createParticles(x, y, color, combo) {
  const particles = [];

  // 根據 combo 找到對應的 juice 等級
  const juiceLevels = CONFIG.juice.levels;
  let level = juiceLevels[0];

  for (const l of juiceLevels) {
    if (combo >= l.combo) {
      level = l;
    }
  }

  // 產生粒子
  const count = level.particles;
  const sizeMultiplier = level.sizeMultiplier;

  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color, sizeMultiplier));
  }

  return {
    particles,
    flash: level.flash,
  };
}
