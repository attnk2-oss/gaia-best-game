// Emberlight — sparks, glows and floating score text.
// A tiny pooled particle system: every flash, pickup, banish and hit
// is a burst of light that fades, plus numbers that float up and away.

export class Particles {
  constructor() {
    this.list = [];
    this.texts = [];
  }

  burst(x, y, count, color, speed, life, size) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const v = (speed || 120) * (0.3 + Math.random() * 0.7);
      this.list.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - 20,
        life: (life || 0.7) * (0.6 + Math.random() * 0.7),
        age: 0,
        size: (size || 3) * (0.6 + Math.random() * 0.8),
        color,
        drag: 2.2,
        gravity: 30,
      });
    }
  }

  // A soft ring that expands and fades: the flash's shockwave.
  ring(x, y, color, maxRadius) {
    this.list.push({
      ring: true, x, y,
      life: 0.45, age: 0,
      size: maxRadius || 140,
      color,
    });
  }

  // Ember motes leave a faint trail as they drift.
  trail(x, y, color) {
    if (Math.random() > 0.35) return;
    this.list.push({
      x, y, vx: 0, vy: 6,
      life: 0.5, age: 0,
      size: 2.2, color,
      drag: 0, gravity: 0,
    });
  }

  floatText(x, y, text, color, big) {
    this.texts.push({ x, y, text, color, age: 0, life: 1.1, big: !!big });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.list.splice(i, 1);
        continue;
      }
      if (!p.ring) {
        const d = Math.max(0, 1 - (p.drag || 0) * dt);
        p.vx *= d;
        p.vy = p.vy * d + (p.gravity || 0) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.age += dt;
      t.y -= 34 * dt;
      if (t.age >= t.life) this.texts.splice(i, 1);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.list) {
      const a = 1 - p.age / p.life;
      if (p.ring) {
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = a * 0.8;
        ctx.lineWidth = 3 * a + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.age / p.life), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a + 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.save();
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      const a = 1 - t.age / t.life;
      ctx.globalAlpha = a;
      ctx.font = t.big
        ? 'bold 22px Georgia, serif'
        : 'bold 15px Georgia, serif';
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }

  clear() {
    this.list.length = 0;
    this.texts.length = 0;
  }
}
