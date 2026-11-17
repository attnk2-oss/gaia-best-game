// Emberlight — keyboard and mouse input.
// One object owns every key and the pointer, translated into the game's
// logical arena coordinates, so the rest of the game never touches the DOM.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    // Edge-triggered actions, consumed by the game loop each frame.
    this.pressed = new Set();
    this.clicked = false;
    this.anyGesture = false;
    this.onFirstGesture = null;
    this._bind();
  }

  _bind() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      this._gesture();
      if (!e.repeat) {
        this.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
        this.pressed.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    });
    window.addEventListener('blur', () => this.keys.clear());

    this.canvas.addEventListener('pointermove', (e) => {
      const p = this._toLogical(e.clientX, e.clientY);
      this.mouseX = p.x;
      this.mouseY = p.y;
    });
    this.canvas.addEventListener('pointerdown', (e) => {
      this._gesture();
      const p = this._toLogical(e.clientX, e.clientY);
      this.mouseX = p.x;
      this.mouseY = p.y;
      this.mouseDown = true;
      this.clicked = true;
      e.preventDefault();
    });
    window.addEventListener('pointerup', () => {
      this.mouseDown = false;
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _gesture() {
    if (!this.anyGesture) {
      this.anyGesture = true;
      if (this.onFirstGesture) this.onFirstGesture();
    }
  }

  _toLogical(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / 960, rect.height / 600);
    const offX = (rect.width - 960 * scale) / 2;
    const offY = (rect.height - 600 * scale) / 2;
    return {
      x: (clientX - rect.left - offX) / scale,
      y: (clientY - rect.top - offY) / scale,
    };
  }

  // Held keys: WASD or arrows steer the moth.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('w') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('s') || this.keys.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.hypot(x, y);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  // True once per physical press, then cleared by the loop.
  wasPressed(...names) {
    return names.some((n) => this.pressed.has(n));
  }

  consumeFrame() {
    this.pressed.clear();
    this.clicked = false;
  }
}
