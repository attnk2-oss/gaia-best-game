// Emberlight — all sound is synthesized live with WebAudio.
// No audio files ship with the game: every chime, whoosh and pad note is
// built from oscillators, so the game stays silent on the network and
// small on disk. Sound starts only after the player's first gesture.

const NOTE_NAMES = ['C', 'D', 'E', 'G', 'A']; // pentatonic, no wrong notes

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.started = false;
  }

  // Call from the first click / keypress. Browsers block audio before this.
  unlock() {
    if (this.started) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.16;
      this.musicBus.connect(this.master);
      this.started = true;
      this.startMusic();
    } catch {
      // No audio device: the game plays on silently.
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.55;
    return this.muted;
  }

  // A short pitched blip with a quick decay. The workhorse of every effect.
  blip(freq, seconds, type, volume, slideTo) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + seconds);
    gain.gain.setValueAtTime(volume || 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + seconds + 0.02);
  }

  // Filtered noise: whooshes, rustles and the flash burst.
  noise(seconds, volume, filterFreq) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq || 1200;
    filter.Q.value = 0.8;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume || 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(now);
  }

  pickup(combo) {
    // The chime climbs the pentatonic scale as the combo grows.
    const step = Math.min(combo, NOTE_NAMES.length * 2 - 1);
    const base = 72 + [0, 2, 4, 7, 9, 12, 14, 16, 19, 21][step];
    this.blip(midiToFreq(base), 0.28, 'sine', 0.22);
    this.blip(midiToFreq(base + 12), 0.18, 'triangle', 0.1);
  }

  brightPickup() {
    this.blip(midiToFreq(84), 0.35, 'sine', 0.22);
    this.blip(midiToFreq(88), 0.3, 'sine', 0.16);
    this.blip(midiToFreq(91), 0.4, 'triangle', 0.12);
  }

  flash() {
    this.noise(0.35, 0.3, 2400);
    this.blip(880, 0.25, 'sine', 0.14, 220);
  }

  dash() {
    this.noise(0.18, 0.16, 900);
  }

  hit() {
    this.blip(160, 0.3, 'sawtooth', 0.25, 60);
    this.noise(0.2, 0.22, 300);
  }

  banish() {
    this.blip(520, 0.22, 'triangle', 0.14, 1040);
  }

  powerup() {
    [72, 76, 79, 84].forEach((n, i) => {
      setTimeout(() => this.blip(midiToFreq(n), 0.22, 'sine', 0.16), i * 55);
    });
  }

  waveHorn() {
    this.blip(196, 0.5, 'triangle', 0.18, 147);
    this.blip(294, 0.5, 'sine', 0.12, 220);
  }

  win() {
    [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => {
      setTimeout(() => this.blip(midiToFreq(n), 0.6, 'sine', 0.2), i * 110);
    });
  }

  lose() {
    [64, 60, 57, 52].forEach((n, i) => {
      setTimeout(() => this.blip(midiToFreq(n), 0.7, 'triangle', 0.16), i * 160);
    });
  }

  click() {
    this.blip(660, 0.08, 'sine', 0.12);
  }

  // A slow generative pad: one low root drone and a wandering pentatonic
  // pluck, so the night never sounds the same twice but never clashes.
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const roots = [45, 41, 43, 40]; // A2 F2 G2 E2, one bar each
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.muted) return;
      const bar = Math.floor(this.musicStep / 4) % roots.length;
      const now = this.ctx.currentTime;
      if (this.musicStep % 4 === 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = midiToFreq(roots[bar]);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.5, now + 1.2);
        gain.gain.linearRampToValueAtTime(0.0001, now + 3.6);
        osc.connect(gain);
        gain.connect(this.musicBus);
        osc.start(now);
        osc.stop(now + 3.8);
      }
      if (Math.random() < 0.55) {
        const scale = [0, 3, 5, 7, 10, 12, 15];
        const note = 69 + scale[Math.floor(Math.random() * scale.length)];
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = midiToFreq(note);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
        osc.connect(gain);
        gain.connect(this.musicBus);
        osc.start(now);
        osc.stop(now + 1.5);
      }
      this.musicStep++;
    }, 620);
  }
}
