// Emberlight — everything the player sees.
// Background night, the Great Lantern, the arena, the HUD and every screen
// (title, pause, win, loss) are drawn here from the world's state.

import { ARENA, NIGHT, PLAYER, PALETTE } from './config.js';

// Stars and fireflies are placed once, then twinkle for the whole night.
const stars = [];
for (let i = 0; i < 130; i++) {
  stars.push({
    x: Math.random() * ARENA.width,
    y: Math.random() * 340,
    r: 0.5 + Math.random() * 1.4,
    phase: Math.random() * Math.PI * 2,
    speed: 0.5 + Math.random() * 1.6,
  });
}
const fireflies = [];
for (let i = 0; i < 16; i++) {
  fireflies.push({
    x: Math.random() * ARENA.width,
    y: 120 + Math.random() * (ARENA.height - 160),
    phase: Math.random() * Math.PI * 2,
    speed: 0.3 + Math.random() * 0.5,
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawHeart(ctx, x, y, size, filled, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 10, size / 10);
  ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.bezierCurveTo(-7, -4, -11, 1, -5, 6);
  ctx.bezierCurveTo(-2, 8, 0, 9, 0, 9);
  ctx.bezierCurveTo(0, 9, 2, 8, 5, 6);
  ctx.bezierCurveTo(11, 1, 7, -4, 0, 3);
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = color || '#ff5d6c';
    ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(245, 236, 215, 0.4)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  ctx.restore();
}

function drawLantern(ctx, world, time) {
  const charge = world.charge / NIGHT.chargeGoal;
  const glowR = 60 + charge * 90 + Math.sin(time * 2) * 4;
  ctx.save();
  ctx.translate(ARENA.lanternX, ARENA.lanternY);
  // Halo grows as the lantern charges.
  const halo = ctx.createRadialGradient(0, 0, 6, 0, 0, glowR);
  halo.addColorStop(0, `rgba(255, 214, 120, ${0.35 + charge * 0.45})`);
  halo.addColorStop(1, 'rgba(255, 214, 120, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, glowR, 0, Math.PI * 2);
  ctx.fill();
  // Chain and frame.
  ctx.strokeStyle = '#4a3a22';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -ARENA.lanternY);
  ctx.lineTo(0, -24);
  ctx.stroke();
  ctx.fillStyle = '#2c2110';
  roundRect(ctx, -20, -24, 40, 10, 4);
  ctx.fill();
  // Glass body, brighter with charge.
  const body = ctx.createLinearGradient(-14, -14, 14, 22);
  body.addColorStop(0, `rgba(255, 232, 160, ${0.55 + charge * 0.45})`);
  body.addColorStop(1, `rgba(255, 150, 60, ${0.5 + charge * 0.5})`);
  ctx.fillStyle = body;
  roundRect(ctx, -16, -14, 32, 38, 8);
  ctx.fill();
  ctx.strokeStyle = '#6b5228';
  ctx.lineWidth = 2;
  roundRect(ctx, -16, -14, 32, 38, 8);
  ctx.stroke();
  // Flame inside.
  ctx.fillStyle = '#fff8dd';
  ctx.beginPath();
  ctx.ellipse(0, 6, 4.5 + charge * 2, 7 + charge * 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2c2110';
  roundRect(ctx, -20, 24, 40, 8, 4);
  ctx.fill();
  ctx.restore();
}

function drawBackground(ctx, time) {
  const sky = ctx.createLinearGradient(0, 0, 0, ARENA.height);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.55, PALETTE.skyMid);
  sky.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);

  // Moon, top right.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const moonGlow = ctx.createRadialGradient(860, 70, 8, 860, 70, 90);
  moonGlow.addColorStop(0, 'rgba(240, 230, 200, 0.35)');
  moonGlow.addColorStop(1, 'rgba(240, 230, 200, 0)');
  ctx.fillStyle = moonGlow;
  ctx.beginPath();
  ctx.arc(860, 70, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#efe6c8';
  ctx.beginPath();
  ctx.arc(860, 70, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(190, 175, 140, 0.35)';
  ctx.beginPath();
  ctx.arc(852, 64, 5, 0, Math.PI * 2);
  ctx.arc(872, 80, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Stars.
  for (const s of stars) {
    const a = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(time * s.speed + s.phase));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#e8e2ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Far and near hills.
  ctx.fillStyle = PALETTE.hillFar;
  ctx.beginPath();
  ctx.moveTo(0, 470);
  ctx.quadraticCurveTo(200, 400, 420, 462);
  ctx.quadraticCurveTo(640, 520, 960, 448);
  ctx.lineTo(960, ARENA.height);
  ctx.lineTo(0, ARENA.height);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.hillNear;
  ctx.beginPath();
  ctx.moveTo(0, 520);
  ctx.quadraticCurveTo(260, 470, 520, 516);
  ctx.quadraticCurveTo(760, 556, 960, 510);
  ctx.lineTo(960, ARENA.height);
  ctx.lineTo(0, ARENA.height);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(0, 556, ARENA.width, ARENA.height - 556);

  // Drifting fireflies.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const f of fireflies) {
    const x = f.x + Math.sin(time * f.speed + f.phase) * 26;
    const y = f.y + Math.cos(time * f.speed * 0.7 + f.phase) * 14;
    const a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(time * 1.4 + f.phase * 3));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#cfe89a';
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawHud(ctx, world) {
  const p = world.player;
  ctx.save();
  // Top bar.
  ctx.fillStyle = 'rgba(8, 6, 18, 0.55)';
  ctx.fillRect(0, 0, ARENA.width, 44);
  ctx.fillStyle = 'rgba(245, 236, 215, 0.14)';
  ctx.fillRect(0, 44, ARENA.width, 1);

  // Hearts.
  for (let i = 0; i < 5; i++) {
    drawHeart(ctx, 30 + i * 26, 24, 11, i < p.hearts, '#ff5d6c');
  }

  // Lantern charge bar, centre.
  const barX = 300;
  const barW = 360;
  ctx.fillStyle = 'rgba(245, 236, 215, 0.16)';
  roundRect(ctx, barX, 14, barW, 16, 8);
  ctx.fill();
  const chargeW = barW * (world.charge / NIGHT.chargeGoal);
  const chargeGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  chargeGrad.addColorStop(0, '#ff7a2f');
  chargeGrad.addColorStop(1, '#ffe08a');
  ctx.fillStyle = chargeGrad;
  if (chargeW > 0) {
    roundRect(ctx, barX, 14, chargeW, 16, 8);
    ctx.fill();
  }
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1c1408';
  ctx.fillText(
    `LANTERN ${Math.floor(world.charge)}%`,
    barX + barW / 2, 22,
  );

  // Dawn timer, right of the charge bar.
  const mm = Math.floor(world.timeLeft / 60);
  const ss = Math.floor(world.timeLeft % 60).toString().padStart(2, '0');
  ctx.font = 'bold 18px Georgia, serif';
  ctx.fillStyle = world.timeLeft < 15 ? PALETTE.danger : PALETTE.text;
  ctx.textAlign = 'left';
  ctx.fillText(`DAWN ${mm}:${ss}`, 700, 23);

  // Score, top right.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText(String(world.score), ARENA.width - 20, 19);
  ctx.font = '12px Georgia, serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(`BEST ${world.best}`, ARENA.width - 20, 36);

  // Wave, under the hearts.
  ctx.textAlign = 'left';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(`WAVE ${world.wave}`, 18, 62);

  // Combo, when it is alive.
  if (world.combo >= 2) {
    ctx.font = 'bold 18px Georgia, serif';
    ctx.fillStyle = PALETTE.ember;
    ctx.fillText(`COMBO x${world.combo}`, 18, 86);
    ctx.fillStyle = 'rgba(255, 179, 71, 0.35)';
    ctx.fillRect(18, 94, 90 * (world.comboTimer / 2.5), 4);
  }

  // Flash energy, bottom left.
  const fx = 18;
  const fy = ARENA.height - 34;
  ctx.fillStyle = 'rgba(245, 236, 215, 0.16)';
  roundRect(ctx, fx, fy, 150, 10, 5);
  ctx.fill();
  ctx.fillStyle = '#ffe08a';
  roundRect(ctx, fx, fy, 150 * (p.flashEnergy / PLAYER.flashEnergyMax), 10, 5);
  ctx.fill();
  ctx.font = '12px Georgia, serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.textAlign = 'left';
  ctx.fillText('FLASH  [SPACE / CLICK]', fx, fy - 8);

  // Dash cooldown, bottom left next to flash.
  const dx = 190;
  ctx.fillStyle = 'rgba(245, 236, 215, 0.16)';
  roundRect(ctx, dx, fy, 90, 10, 5);
  ctx.fill();
  const dashFrac = 1 - p.dashCooldown / PLAYER.dashCooldown;
  ctx.fillStyle = '#9fd8ff';
  roundRect(ctx, dx, fy, 90 * dashFrac, 10, 5);
  ctx.fill();
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('DASH  [SHIFT]', dx, fy - 8);

  // Active power-up timers, bottom right.
  let py = ARENA.height - 26;
  ctx.textAlign = 'right';
  ctx.font = 'bold 13px Georgia, serif';
  if (p.magnet > 0) {
    ctx.fillStyle = PALETTE.good;
    ctx.fillText(`MAGNET ${Math.ceil(p.magnet)}s`, ARENA.width - 18, py);
    py -= 18;
  }
  if (p.slow > 0) {
    ctx.fillStyle = PALETTE.good;
    ctx.fillText(`SLOW NIGHT ${Math.ceil(p.slow)}s`, ARENA.width - 18, py);
    py -= 18;
  }
  if (p.shield) {
    ctx.fillStyle = PALETTE.good;
    ctx.fillText('SHIELD READY', ARENA.width - 18, py);
  }

  // Early hints.
  if (world.hintTimer > 0 && world.state === 'playing') {
    ctx.textAlign = 'center';
    ctx.globalAlpha = Math.min(1, world.hintTimer);
    ctx.font = '15px Georgia, serif';
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(
      'Catch embers to charge the lantern — don\'t let the wisps touch you',
      ARENA.width / 2, ARENA.height - 56,
    );
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawTitle(ctx, world, time) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 6, 18, 0.45)';
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  ctx.textAlign = 'center';
  const bob = Math.sin(time * 1.6) * 6;
  ctx.fillStyle = PALETTE.ember;
  ctx.font = 'bold 64px Georgia, serif';
  ctx.shadowColor = 'rgba(255, 179, 71, 0.7)';
  ctx.shadowBlur = 28;
  ctx.fillText('EMBERLIGHT', ARENA.width / 2, 190 + bob);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'italic 20px Georgia, serif';
  ctx.fillText('Keep the last lantern lit until dawn.', ARENA.width / 2, 232 + bob);
  ctx.font = '16px Georgia, serif';
  ctx.fillStyle = PALETTE.textDim;
  const lines = [
    'WASD or arrows — fly      SPACE or click — FLASH (banishes wisps, costs light)',
    'SHIFT — dash through danger      P — pause      M — mute',
    'Catch ember motes to charge the lantern to 100% before dawn breaks.',
    'Motes that reach the lantern feed it a little — but catching them yourself',
    'builds your combo and your score. Three touches from a wisp end the night.',
  ];
  lines.forEach((line, i) => {
    ctx.fillText(line, ARENA.width / 2, 292 + i * 26);
  });
  const pulse = 0.65 + 0.35 * Math.sin(time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.emberHot;
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillText('— Click or press ENTER to begin —', ARENA.width / 2, 452);
  ctx.globalAlpha = 1;
  if (world.best > 0) {
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '15px Georgia, serif';
    ctx.fillText(`Best score: ${world.best}`, ARENA.width / 2, 492);
  }
  ctx.restore();
}

function drawPause(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 6, 18, 0.6)';
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText('PAUSED', ARENA.width / 2, 270);
  ctx.font = '17px Georgia, serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('Press P or click to keep flying', ARENA.width / 2, 312);
  ctx.restore();
}

function drawEnd(ctx, world, won, time) {
  ctx.save();
  ctx.fillStyle = won ? 'rgba(30, 22, 8, 0.62)' : 'rgba(10, 6, 20, 0.68)';
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  ctx.textAlign = 'center';
  const title = won ? 'DAWN BREAKS' : 'THE LIGHT FADES';
  ctx.fillStyle = won ? PALETTE.emberHot : PALETTE.wispCore;
  ctx.font = 'bold 56px Georgia, serif';
  ctx.shadowColor = won ? 'rgba(255, 179, 71, 0.8)' : 'rgba(143, 123, 255, 0.7)';
  ctx.shadowBlur = 26;
  ctx.fillText(title, ARENA.width / 2, 180);
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'italic 19px Georgia, serif';
  ctx.fillText(
    won
      ? 'The lantern burns bright — the Hollow wakes to a new day.'
      : world.endReason,
    ARENA.width / 2, 224,
  );
  // Results card.
  ctx.fillStyle = 'rgba(245, 236, 215, 0.08)';
  roundRect(ctx, ARENA.width / 2 - 190, 258, 380, 168, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 236, 215, 0.25)';
  ctx.lineWidth = 1;
  roundRect(ctx, ARENA.width / 2 - 190, 258, 380, 168, 12);
  ctx.stroke();
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '15px Georgia, serif';
  const rows = [
    [`SCORE`, String(world.score)],
    [`MOTES CAUGHT`, String(world.stats.motes)],
    [`WISPS BANISHED`, String(world.stats.banished)],
    [`BEST COMBO`, `x${world.stats.bestCombo}`],
    [`WAVE REACHED`, String(world.wave)],
  ];
  if (won) rows.push(['DAWN BONUS', `+${world.winBonus}`]);
  rows.forEach(([label, value], i) => {
    const y = 288 + i * 26;
    ctx.textAlign = 'left';
    ctx.fillText(label, ARENA.width / 2 - 168, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(value, ARENA.width / 2 + 168, y);
    ctx.fillStyle = PALETTE.textDim;
  });
  ctx.textAlign = 'center';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.fillStyle = world.score >= world.best && world.score > 0 ? PALETTE.ember : PALETTE.textDim;
  ctx.fillText(
    world.score >= world.best && world.score > 0 ? '★ NEW BEST SCORE ★' : `Best score: ${world.best}`,
    ARENA.width / 2, 458,
  );
  const pulse = 0.65 + 0.35 * Math.sin(time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.emberHot;
  ctx.font = 'bold 21px Georgia, serif';
  ctx.fillText('Press R or click to fly again', ARENA.width / 2, 500);
  ctx.restore();
}

export function render(ctx, world, time) {
  ctx.save();
  // Screen shake on a hit.
  if (world.shake > 0) {
    const mag = world.shake * 7;
    ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
  }
  drawBackground(ctx, time);
  drawLantern(ctx, world, time);

  for (const mote of world.motes) mote.draw(ctx, time);
  for (const p of world.powerups) p.draw(ctx, time);
  for (const wisp of world.wisps) wisp.draw(ctx, time);
  // The moth rests on the end screens: the results card owns the stage.
  if (world.state !== 'title' && world.state !== 'won' && world.state !== 'lost') {
    world.player.draw(ctx, time);
  }
  world.particles.draw(ctx);

  // Flash pulse: a warm wash over the whole arena.
  if (world.flashPulse > 0) {
    ctx.fillStyle = `rgba(255, 224, 138, ${world.flashPulse * 0.22})`;
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  }

  // Slow-night tint.
  if (world.player.slow > 0) {
    ctx.fillStyle = 'rgba(120, 160, 255, 0.08)';
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  }

  // Vignette: the night closes in at the edges.
  const vig = ctx.createRadialGradient(
    ARENA.width / 2, ARENA.height / 2, ARENA.height * 0.45,
    ARENA.width / 2, ARENA.height / 2, ARENA.height * 0.95,
  );
  vig.addColorStop(0, 'rgba(6, 4, 14, 0)');
  vig.addColorStop(1, 'rgba(6, 4, 14, 0.5)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  ctx.restore();

  if (world.state === 'playing' || world.state === 'paused') drawHud(ctx, world);
  if (world.state === 'title') drawTitle(ctx, world, time);
  if (world.state === 'paused') drawPause(ctx);
  if (world.state === 'won') drawEnd(ctx, world, true, time);
  if (world.state === 'lost') drawEnd(ctx, world, false, time);
}
