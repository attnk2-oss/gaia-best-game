// Emberlight — the things that live in the arena.
// Player (Pip the lantern-moth), ember motes, shadow wisps and power-ups.
// Each one knows how it moves and how it is drawn; the world decides
// what happens when they meet.

import { ARENA, PLAYER, MOTES, WISPS, POWERUPS, PALETTE } from './config.js';

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = ARENA.width / 2;
    this.y = ARENA.height - 130;
    this.vx = 0;
    this.vy = 0;
    this.radius = PLAYER.radius;
    this.hearts = PLAYER.hearts;
    this.flashEnergy = PLAYER.flashEnergyMax;
    this.invuln = 0;
    this.dashTime = 0;
    this.dashCooldown = 0;
    this.dashX = 0;
    this.dashY = 0;
    this.shield = false;
    this.magnet = 0;
    this.slow = 0;
    this.facing = 1;
    this.flap = 0;
    this.trailTimer = 0;
  }

  get alive() {
    return this.hearts > 0;
  }

  update(dt, move, dashWanted) {
    this.invuln = Math.max(0, this.invuln - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.magnet = Math.max(0, this.magnet - dt);
    this.slow = Math.max(0, this.slow - dt);
    this.flashEnergy = Math.min(
      PLAYER.flashEnergyMax,
      this.flashEnergy + PLAYER.flashRegen * dt,
    );
    this.flap += dt * (this.dashTime > 0 ? 26 : 12);
    this.trailTimer -= dt;

    if (dashWanted && this.dashCooldown <= 0 && this.dashTime <= 0) {
      let dx = move.x;
      let dy = move.y;
      if (dx === 0 && dy === 0) {
        dx = this.facing;
        dy = 0;
      }
      const len = Math.hypot(dx, dy);
      this.dashX = dx / len;
      this.dashY = dy / len;
      this.dashTime = PLAYER.dashTime;
      this.dashCooldown = PLAYER.dashCooldown;
      this.invuln = Math.max(this.invuln, PLAYER.dashTime + 0.08);
      return 'dash';
    }

    if (this.dashTime > 0) {
      this.dashTime -= dt;
      this.vx = this.dashX * PLAYER.dashSpeed;
      this.vy = this.dashY * PLAYER.dashSpeed;
    } else {
      this.vx += move.x * PLAYER.accel * dt;
      this.vy += move.y * PLAYER.accel * dt;
      const damp = Math.max(0, 1 - PLAYER.friction * dt);
      this.vx *= damp;
      this.vy *= damp;
      const speed = Math.hypot(this.vx, this.vy);
      if (speed > PLAYER.maxSpeed) {
        this.vx = (this.vx / speed) * PLAYER.maxSpeed;
        this.vy = (this.vy / speed) * PLAYER.maxSpeed;
      }
    }

    this.x = clamp(this.x + this.vx * dt, 24, ARENA.width - 24);
    this.y = clamp(this.y + this.vy * dt, 96, ARENA.height - 24);
    if (Math.abs(this.vx) > 20) this.facing = this.vx > 0 ? 1 : -1;
    return null;
  }

  draw(ctx, time) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.invuln > 0 && this.dashTime <= 0) {
      ctx.globalAlpha = 0.45 + 0.3 * Math.sin(time * 22);
    }
    // Warm glow that follows the moth.
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 56);
    glow.addColorStop(0, 'rgba(255, 196, 90, 0.55)');
    glow.addColorStop(1, 'rgba(255, 196, 90, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0, Math.PI * 2);
    ctx.fill();
    // Wings: two flapping ellipses.
    const flap = Math.sin(this.flap) * 0.55;
    ctx.fillStyle = PALETTE.mothWing;
    ctx.globalAlpha *= 0.9;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      ctx.rotate(-0.5 - flap * 0.5);
      ctx.beginPath();
      ctx.ellipse(9, -6, 11, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // Body: a little lantern with a bright core.
    ctx.fillStyle = '#3a2a12';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.emberHot;
    ctx.beginPath();
    ctx.arc(0, 1, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff8dd';
    ctx.beginPath();
    ctx.arc(0, 1, 2.6, 0, Math.PI * 2);
    ctx.fill();
    // Shield ring when protected.
    if (this.shield) {
      ctx.strokeStyle = 'rgba(125, 255, 176, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 22 + Math.sin(time * 5) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

let moteId = 0;

export class Mote {
  constructor(x, y, bright) {
    this.id = moteId++;
    this.x = x;
    this.y = y;
    this.bright = bright;
    this.radius = bright ? 10 : 7.5;
    this.phase = Math.random() * Math.PI * 2;
    this.spin = Math.random() * 2 - 1;
    this.age = 0;
    this.vx = 0;
    this.vy = MOTES.driftSpeed * (0.8 + Math.random() * 0.5);
  }

  update(dt, player, lantern) {
    this.age += dt;
    this.phase += dt * 2.2;
    // Drift down, swaying, and curve gently toward the lantern.
    const dx = lantern.x - this.x;
    const dy = lantern.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const pull = MOTES.lanternPull / Math.max(120, dist);
    this.vx += (dx / dist) * pull * dt * 60 + Math.sin(this.phase) * 12 * dt;
    this.vy += (dy / dist) * pull * dt * 60;
    this.vx *= Math.max(0, 1 - 1.4 * dt);
    this.vy = clamp(this.vy, 8, 46);
    // A magnetised moth pulls nearby motes in.
    if (player && player.magnet > 0) {
      const pdx = player.x - this.x;
      const pdy = player.y - this.y;
      const pd = Math.hypot(pdx, pdy);
      if (pd < POWERUPS.magnetRadius && pd > 1) {
        this.vx += (pdx / pd) * 520 * dt;
        this.vy += (pdy / pd) * 520 * dt;
      }
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  get reachedLantern() {
    const dx = this.x - ARENA.lanternX;
    const dy = this.y - ARENA.lanternY;
    return Math.hypot(dx, dy) < ARENA.lanternRadius;
  }

  draw(ctx, time) {
    const bob = Math.sin(this.phase) * 2;
    const pulse = 0.75 + 0.25 * Math.sin(time * 4 + this.phase);
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, this.bright ? 32 : 23);
    glow.addColorStop(0, this.bright ? 'rgba(255, 224, 138, 0.9)' : 'rgba(255, 179, 71, 0.8)');
    glow.addColorStop(1, 'rgba(255, 122, 47, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, this.bright ? 32 : 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = this.bright ? PALETTE.emberHot : PALETTE.ember;
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.arc(0, 0, this.bright ? 6.5 : 4.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff8dd';
    ctx.beginPath();
    ctx.arc(0, 0, this.bright ? 2.8 : 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

let wispId = 0;

export class Wisp {
  constructor(kind, x, y) {
    this.id = wispId++;
    this.kind = kind; // 'drifter' | 'darter' | 'wraith'
    this.x = x;
    this.y = y;
    this.radius = kind === 'wraith' ? 12 : kind === 'darter' ? 15 : 17;
    this.phase = Math.random() * Math.PI * 2;
    this.state = 'chase';
    this.stateTime = 0;
    this.lungeX = 0;
    this.lungeY = 0;
    this.speed = kind === 'wraith'
      ? WISPS.wraithSpeed
      : kind === 'darter'
        ? WISPS.darterSpeed
        : WISPS.drifterSpeed;
  }

  update(dt, player) {
    this.phase += dt * 3;
    this.stateTime += dt;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    let vx = 0;
    let vy = 0;

    if (this.kind === 'darter') {
      if (this.state === 'chase') {
        vx = (dx / dist) * this.speed;
        vy = (dy / dist) * this.speed;
        if (this.stateTime > 1.4 && dist < 260) {
          this.state = 'aim';
          this.stateTime = 0;
        }
      } else if (this.state === 'aim') {
        // Tremble in place, telegraphing the lunge.
        vx = Math.sin(this.stateTime * 40) * 8;
        vy = Math.cos(this.stateTime * 40) * 8;
        if (this.stateTime > 0.55) {
          this.state = 'lunge';
          this.stateTime = 0;
          this.lungeX = dx / dist;
          this.lungeY = dy / dist;
        }
      } else if (this.state === 'lunge') {
        vx = this.lungeX * WISPS.darterLungeSpeed;
        vy = this.lungeY * WISPS.darterLungeSpeed;
        if (this.stateTime > 0.42) {
          this.state = 'chase';
          this.stateTime = 0;
        }
      }
    } else {
      // Drifters and wraiths chase with a lazy wobble.
      const wobble = Math.sin(this.phase) * 0.5;
      const px = -dy / dist;
      const py = dx / dist;
      vx = (dx / dist) * this.speed + px * wobble * this.speed * 0.4;
      vy = (dy / dist) * this.speed + py * wobble * this.speed * 0.4;
    }
    this.x += vx * dt;
    this.y += vy * dt;
  }

  draw(ctx, time) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const aiming = this.kind === 'darter' && this.state === 'aim';
    const flicker = 0.75 + 0.25 * Math.sin(time * 6 + this.phase);
    // Smoky body: layered translucent circles.
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, this.radius * 2.1);
    glow.addColorStop(0, aiming ? 'rgba(255, 93, 108, 0.55)' : 'rgba(143, 123, 255, 0.45)');
    glow.addColorStop(1, 'rgba(143, 123, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = flicker;
    ctx.fillStyle = '#241d4d';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#171233';
    ctx.beginPath();
    ctx.arc(0, 3, this.radius * 0.8, 0, Math.PI * 2);
    ctx.fill();
    // Two hollow eyes that watch the moth.
    ctx.fillStyle = aiming ? '#ff5d6c' : PALETTE.wispCore;
    const eyeY = -3;
    const eyeGap = this.radius * 0.42;
    ctx.beginPath();
    ctx.arc(-eyeGap, eyeY, 2.6, 0, Math.PI * 2);
    ctx.arc(eyeGap, eyeY, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class PowerUp {
  constructor(kind, x, y) {
    this.kind = kind; // 'shield' | 'magnet' | 'slow' | 'heart'
    this.x = x;
    this.y = y;
    this.radius = 13;
    this.phase = Math.random() * Math.PI * 2;
    this.age = 0;
    this.life = 14; // fades if ignored
  }

  update(dt) {
    this.age += dt;
    this.phase += dt * 2;
    this.y += Math.sin(this.phase) * 6 * dt;
  }

  get expired() {
    return this.age > this.life;
  }

  draw(ctx, time) {
    const blink = this.age > this.life - 3 ? (Math.sin(time * 12) > 0 ? 1 : 0.25) : 1;
    const bob = Math.sin(this.phase) * 3;
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    ctx.globalAlpha = blink;
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 30);
    glow.addColorStop(0, 'rgba(125, 255, 176, 0.5)');
    glow.addColorStop(1, 'rgba(125, 255, 176, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#0f2a1c';
    ctx.strokeStyle = PALETTE.good;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PALETTE.good;
    ctx.font = 'bold 13px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const glyph = { shield: 'S', magnet: 'M', slow: 'T', heart: '+' }[this.kind] || '?';
    ctx.fillText(glyph, 0, 1);
    ctx.restore();
  }
}
