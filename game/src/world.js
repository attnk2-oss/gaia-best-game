// Emberlight — the world: state machine, spawning, collisions, scoring.
// The world owns one night: waves of wisps, drifting motes, power-ups,
// the lantern's charge and the dawn timer. Rendering lives in render.js;
// this file only decides what happens.

import {
  ARENA, NIGHT, PLAYER, MOTES, WISPS, POWERUPS, SCORE,
} from './config.js';
import { Player, Mote, Wisp, PowerUp } from './entities.js';

function rand(lo, hi) {
  return lo + Math.random() * (hi - lo);
}

function pickEdgePoint() {
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { x: rand(30, ARENA.width - 30), y: -16 };
  if (side === 1) return { x: rand(30, ARENA.width - 30), y: ARENA.height + 16 };
  if (side === 2) return { x: -16, y: rand(110, ARENA.height - 30) };
  return { x: ARENA.width + 16, y: rand(110, ARENA.height - 30) };
}

export class World {
  constructor(sound, particles) {
    this.sound = sound;
    this.particles = particles;
    this.player = new Player();
    this.state = 'title'; // title | playing | paused | won | lost
    this.best = 0;
    try {
      this.best = Number(window.localStorage.getItem('emberlight-best') || 0) || 0;
    } catch {
      this.best = 0;
    }
    this.resetRun();
  }

  resetRun() {
    this.player.reset();
    this.motes = [];
    this.wisps = [];
    this.powerups = [];
    this.particles.clear();
    this.charge = 0;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.elapsed = 0;
    this.wave = 1;
    this.moteTimer = 0.4;
    this.wispTimer = 2.2;
    this.powerupTimer = POWERUPS.dropInterval;
    this.powerupKinds = ['shield', 'magnet', 'slow', 'heart'];
    this.powerupIndex = 0;
    this.shake = 0;
    this.flashPulse = 0;
    this.timeLeft = NIGHT.duration;
    this.winBonus = 0;
    this.hintTimer = 7;
    this.stats = { motes: 0, banished: 0, flashes: 0, bestCombo: 0 };
    this.endReason = '';
  }

  start() {
    this.resetRun();
    this.state = 'playing';
    this.sound.click();
  }

  togglePause() {
    if (this.state === 'playing') this.state = 'paused';
    else if (this.state === 'paused') this.state = 'playing';
  }

  get timeScale() {
    return this.player.slow > 0 ? POWERUPS.slowFactor : 1;
  }

  get dawnFraction() {
    return Math.max(0, this.timeLeft / NIGHT.duration);
  }

  get waveInterval() {
    return Math.max(
      WISPS.spawnIntervalMin,
      WISPS.spawnIntervalStart - (this.wave - 1) * 0.38,
    );
  }

  get moteInterval() {
    return Math.max(
      MOTES.spawnIntervalMin,
      MOTES.spawnIntervalStart - (this.wave - 1) * 0.08,
    );
  }

  update(dt) {
    if (this.state !== 'playing') return;
    const sdt = dt * this.timeScale;
    this.elapsed += sdt;
    this.timeLeft = Math.max(0, NIGHT.duration - this.elapsed);
    this.shake = Math.max(0, this.shake - dt * 2.2);
    this.flashPulse = Math.max(0, this.flashPulse - dt * 2.5);
    this.hintTimer = Math.max(0, this.hintTimer - dt);

    const wave = Math.floor(this.elapsed / NIGHT.waveLength) + 1;
    if (wave !== this.wave) {
      this.wave = wave;
      this.score += SCORE.waveBonus;
      this.particles.floatText(
        ARENA.width / 2, 180, `WAVE ${wave}  +${SCORE.waveBonus}`, '#f5ecd7', true,
      );
      this.sound.waveHorn();
    }

    this.spawnMotes(sdt);
    this.spawnWisps(sdt);
    this.spawnPowerups(sdt);

    // Combo decays when the player stops collecting.
    this.comboTimer -= sdt;
    if (this.comboTimer <= 0) this.combo = 0;

    this.updateMotes(sdt);
    this.updateWisps(sdt);
    this.updatePowerups(sdt);
    this.particles.update(sdt);

    if (this.charge >= NIGHT.chargeGoal) this.win();
    else if (this.timeLeft <= 0) this.lose('Dawn came before the lantern was lit.');
  }

  spawnMotes(dt) {
    this.moteTimer -= dt;
    if (this.moteTimer > 0) return;
    this.moteTimer = this.moteInterval * rand(0.8, 1.25);
    const bright = Math.random() < MOTES.brightChance;
    // Most motes kindle inside the arena so the night is alive at once;
    // a few still drift in from the edges.
    const p = Math.random() < 0.7
      ? { x: rand(50, ARENA.width - 50), y: rand(120, 430) }
      : pickEdgePoint();
    this.motes.push(new Mote(p.x, p.y, bright));
  }

  spawnWisps(dt) {
    this.wispTimer -= dt;
    if (this.wispTimer > 0) return;
    this.wispTimer = this.waveInterval * rand(0.75, 1.3);
    const p = pickEdgePoint();
    let kind = 'drifter';
    const roll = Math.random();
    if (this.wave >= WISPS.wraithFromWave && roll < 0.22) kind = 'wraith';
    else if (this.wave >= WISPS.darterFromWave && roll < 0.5) kind = 'darter';
    this.wisps.push(new Wisp(kind, p.x, p.y));
    this.particles.burst(p.x, p.y, 6, '#8f7bff', 60, 0.5, 2.5);
  }

  spawnPowerups(dt) {
    this.powerupTimer -= dt;
    if (this.powerupTimer > 0) return;
    this.powerupTimer = POWERUPS.dropInterval;
    const kind = this.powerupKinds[this.powerupIndex % this.powerupKinds.length];
    this.powerupIndex++;
    this.powerups.push(new PowerUp(
      kind,
      rand(90, ARENA.width - 90),
      rand(150, ARENA.height - 90),
    ));
  }

  updateMotes(dt) {
    const lantern = { x: ARENA.lanternX, y: ARENA.lanternY };
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const mote = this.motes[i];
      mote.update(dt, this.player, lantern);
      this.particles.trail(mote.x, mote.y, '#ffb347');
      const dx = mote.x - this.player.x;
      const dy = mote.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < mote.radius + this.player.radius + 4) {
        this.collectMote(mote);
        this.motes.splice(i, 1);
        continue;
      }
      if (mote.reachedLantern) {
        this.charge = Math.min(NIGHT.chargeGoal, this.charge + NIGHT.lanternTrickle);
        this.particles.burst(ARENA.lanternX, ARENA.lanternY, 4, '#ffe08a', 50, 0.4, 2);
        this.motes.splice(i, 1);
        continue;
      }
      if (mote.y > ARENA.height + 30 || mote.x < -30 || mote.x > ARENA.width + 30) {
        this.motes.splice(i, 1);
      }
    }
  }

  collectMote(mote) {
    this.combo = Math.min(MOTES.comboCap, this.combo + 1);
    this.comboTimer = MOTES.comboWindow;
    this.stats.motes++;
    this.stats.bestCombo = Math.max(this.stats.bestCombo, this.combo);
    const mult = 1 + (this.combo - 1) * 0.1;
    const charge = mote.bright ? MOTES.brightCharge : MOTES.emberCharge;
    const points = Math.round((mote.bright ? MOTES.brightScore : MOTES.emberScore) * mult);
    this.charge = Math.min(NIGHT.chargeGoal, this.charge + charge);
    this.score += points;
    this.particles.burst(mote.x, mote.y, mote.bright ? 16 : 9, '#ffb347', 130, 0.55, 3);
    this.particles.floatText(
      mote.x, mote.y - 10, `+${points}`, mote.bright ? '#ffe08a' : '#ffb347',
    );
    if (mote.bright) this.sound.brightPickup();
    else this.sound.pickup(this.combo);
  }

  updateWisps(dt) {
    for (let i = this.wisps.length - 1; i >= 0; i--) {
      const wisp = this.wisps[i];
      wisp.update(dt, this.player);
      const dx = wisp.x - this.player.x;
      const dy = wisp.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < wisp.radius + this.player.radius - 2) {
        this.hitPlayer(wisp);
        if (this.state !== 'playing') return;
        // The wisp that struck is spent; it dissolves either way.
        this.wisps.splice(i, 1);
        continue;
      }
      if (wisp.x < -60 || wisp.x > ARENA.width + 60 || wisp.y < -60 || wisp.y > ARENA.height + 60) {
        this.wisps.splice(i, 1);
      }
    }
  }

  hitPlayer(wisp) {
    if (this.player.invuln > 0) return;
    if (this.player.shield) {
      this.player.shield = false;
      this.player.invuln = 1.2;
      this.particles.burst(this.player.x, this.player.y, 18, '#7dffb0', 160, 0.6, 3);
      this.particles.floatText(this.player.x, this.player.y - 24, 'SHIELD!', '#7dffb0', true);
      this.sound.banish();
      return;
    }
    this.player.hearts--;
    this.player.invuln = PLAYER.invulnAfterHit;
    this.shake = 1;
    this.combo = 0;
    this.particles.burst(this.player.x, this.player.y, 22, '#ff5d6c', 200, 0.7, 3.5);
    this.sound.hit();
    if (this.player.hearts <= 0) this.lose('The wisps snuffed out the little light.');
  }

  updatePowerups(dt) {
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.update(dt);
      if (p.expired) {
        this.powerups.splice(i, 1);
        continue;
      }
      const dx = p.x - this.player.x;
      const dy = p.y - this.player.y;
      if (Math.hypot(dx, dy) < p.radius + this.player.radius + 4) {
        this.applyPowerup(p);
        this.powerups.splice(i, 1);
      }
    }
  }

  applyPowerup(p) {
    this.sound.powerup();
    this.particles.burst(p.x, p.y, 16, '#7dffb0', 140, 0.6, 3);
    if (p.kind === 'shield') {
      this.player.shield = true;
      this.particles.floatText(p.x, p.y - 16, 'SHIELD', '#7dffb0', true);
    } else if (p.kind === 'magnet') {
      this.player.magnet = POWERUPS.magnetTime;
      this.particles.floatText(p.x, p.y - 16, 'EMBER MAGNET', '#7dffb0', true);
    } else if (p.kind === 'slow') {
      this.player.slow = POWERUPS.slowTime;
      this.particles.floatText(p.x, p.y - 16, 'SLOW NIGHT', '#7dffb0', true);
    } else if (p.kind === 'heart') {
      this.player.hearts = Math.min(5, this.player.hearts + 1);
      this.particles.floatText(p.x, p.y - 16, '+1 HEART', '#7dffb0', true);
    }
  }

  // Flash: spend light to banish every wisp in the radius.
  tryFlash() {
    if (this.state !== 'playing') return;
    if (this.player.flashEnergy < PLAYER.flashCost) {
      this.sound.click();
      return;
    }
    this.player.flashEnergy -= PLAYER.flashCost;
    this.stats.flashes++;
    this.flashPulse = 1;
    this.sound.flash();
    this.particles.ring(this.player.x, this.player.y, '#ffe08a', PLAYER.flashRadius);
    let banished = 0;
    for (let i = this.wisps.length - 1; i >= 0; i--) {
      const wisp = this.wisps[i];
      const dist = Math.hypot(wisp.x - this.player.x, wisp.y - this.player.y);
      if (dist < PLAYER.flashRadius + wisp.radius) {
        const points = wisp.kind === 'darter'
          ? WISPS.darterScore
          : wisp.kind === 'wraith' ? WISPS.wraithScore : WISPS.banishScore;
        this.score += points;
        this.stats.banished++;
        this.particles.burst(wisp.x, wisp.y, 14, '#c9b8ff', 150, 0.6, 3);
        this.particles.floatText(wisp.x, wisp.y - 12, `+${points}`, '#c9b8ff');
        this.wisps.splice(i, 1);
        banished++;
      }
    }
    if (banished > 0) this.sound.banish();
  }

  win() {
    this.state = 'won';
    this.winBonus = this.player.hearts * SCORE.winHeartBonus
      + Math.round(this.timeLeft) * SCORE.winTimeBonusPerSecond;
    this.score += this.winBonus;
    this.finishRun();
    this.sound.win();
    this.particles.burst(ARENA.lanternX, ARENA.lanternY, 60, '#ffe08a', 260, 1.4, 4);
  }

  lose(reason) {
    this.state = 'lost';
    this.endReason = reason || '';
    this.finishRun();
    this.sound.lose();
  }

  finishRun() {
    if (this.score > this.best) {
      this.best = this.score;
      try {
        window.localStorage.setItem('emberlight-best', String(this.best));
      } catch {
        // Storage unavailable: the best score just lives for this visit.
      }
    }
  }
}
