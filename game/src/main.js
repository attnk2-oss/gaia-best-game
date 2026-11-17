// Emberlight — boot, the game loop and the state machine.
// Wires canvas, input, sound, world and rendering together, and keeps the
// arena at its logical 960 x 600 while the window scales around it.

import { ARENA } from './config.js';
import { Input } from './input.js';
import { SoundEngine } from './audio.js';
import { Particles } from './particles.js';
import { World } from './world.js';
import { Mote } from './entities.js';
import { render } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const sound = new SoundEngine();
const particles = new Particles();
const world = new World(sound, particles);
const input = new Input(canvas);
input.onFirstGesture = () => sound.unlock();

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = ARENA.width * dpr;
  canvas.height = ARENA.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

let lastTime = performance.now();
let time = 0;
let lastAnnounced = '';

function announce(text) {
  if (text === lastAnnounced) return;
  lastAnnounced = text;
  statusEl.textContent = text;
}

function frame(now) {
  const rawDt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  time += rawDt;

  // Title screen: keep the night alive behind the text.
  if (world.state === 'title') {
    particles.update(rawDt);
    if (world.motes.length < 6 && Math.random() < 0.02) {
      world.motes.push(new Mote(
        60 + Math.random() * (ARENA.width - 120),
        -10,
        Math.random() < 0.15,
      ));
    }
    for (let i = world.motes.length - 1; i >= 0; i--) {
      const mote = world.motes[i];
      mote.update(rawDt, null, { x: ARENA.lanternX, y: ARENA.lanternY });
      if (mote.y > ARENA.height + 20 || mote.reachedLantern) world.motes.splice(i, 1);
    }
  }

  if (world.state === 'playing') {
    const move = input.moveVector();
    const dashWanted = input.wasPressed('Shift');
    const dashResult = world.player.update(rawDt, move, dashWanted);
    if (dashResult === 'dash') sound.dash();
    if (input.wasPressed(' ') || input.clicked) world.tryFlash();
    if (input.wasPressed('p') || input.wasPressed('Escape')) world.togglePause();
    world.update(rawDt);
    announce(
      `Lantern ${Math.floor(world.charge)} percent. Score ${world.score}. `
      + `${world.player.hearts} hearts. Dawn in ${Math.ceil(world.timeLeft)} seconds.`,
    );
  } else if (world.state === 'paused') {
    if (input.wasPressed('p') || input.wasPressed('Escape') || input.clicked) {
      world.togglePause();
    }
  } else if (world.state === 'title') {
    if (input.wasPressed('Enter') || input.clicked) {
      world.start();
      announce('The night begins. Catch embers, dodge the wisps.');
    }
  } else if (world.state === 'won' || world.state === 'lost') {
    particles.update(rawDt);
    if (input.wasPressed('r') || input.wasPressed('Enter') || input.clicked) {
      world.start();
    }
  }

  if (input.wasPressed('m')) {
    const muted = sound.toggleMute();
    announce(muted ? 'Sound muted.' : 'Sound on.');
  }
  if (input.wasPressed('r') && (world.state === 'playing' || world.state === 'paused')) {
    world.start();
  }

  render(ctx, world, time);
  input.consumeFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// A small handle for play-testing and screenshots: it only reaches into
// the live game object, never into the page, and ships in the game itself.
window.__emberlight = {
  world,
  sound,
  start: () => world.start(),
  // Jump the lantern to the edge of dawn for a win-screen shot.
  debugWin() {
    world.start();
    world.charge = 99.4;
    world.score = 1240;
    world.stats.motes = 58;
    world.stats.banished = 11;
    world.stats.bestCombo = 8;
    world.wave = 5;
    world.elapsed = 78;
    world.timeLeft = 22;
  },
  // Drop the moth to its last heart with wisps closing in.
  debugDanger() {
    world.start();
    world.player.hearts = 1;
    world.charge = 62;
    world.score = 860;
    world.combo = 7;
    world.comboTimer = 2.5;
    world.elapsed = 46;
    world.wave = 3;
    world.timeLeft = 54;
  },
  debugLose() {
    world.start();
    world.player.hearts = 1;
    world.score = 540;
    world.stats.motes = 31;
    world.stats.banished = 6;
    world.stats.bestCombo = 5;
    world.wave = 2;
    world.charge = 41;
    world.lose('The wisps snuffed out the little light.');
  },
};
