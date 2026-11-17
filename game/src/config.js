// Emberlight — tuning and constants.
// One place for every number that shapes how the game feels, so balancing
// never means hunting through the logic. All times are seconds, all sizes
// are in the game's logical 960 x 600 arena units.

export const ARENA = {
  width: 960,
  height: 600,
  // The Great Lantern hangs at the top centre of the arena. Motes drift
  // toward it; the player charges it by catching motes first.
  lanternX: 480,
  lanternY: 74,
  lanternRadius: 34,
};

export const NIGHT = {
  // How long one night lasts. Charge the lantern to 100 before dawn.
  duration: 100,
  chargeGoal: 100,
  // A mote that reaches the lantern on its own still feeds it a little.
  lanternTrickle: 0.6,
  // A new wave every 18 seconds; each wave raises the pressure.
  waveLength: 18,
};

export const PLAYER = {
  radius: 15,
  accel: 2600,
  maxSpeed: 300,
  friction: 6.5,
  hearts: 3,
  // Flash: a burst of light that banishes every wisp inside its radius.
  flashRadius: 135,
  flashCost: 25,
  flashEnergyMax: 100,
  flashRegen: 13,
  // Dash: a short burst with brief invulnerability.
  dashSpeed: 720,
  dashTime: 0.16,
  dashCooldown: 1.6,
  invulnAfterHit: 1.6,
};

export const MOTES = {
  // Seconds between mote spawns at wave 1; shrinks as waves rise.
  spawnIntervalStart: 0.8,
  spawnIntervalMin: 0.35,
  driftSpeed: 26,
  // Motes gently curve toward the lantern as they fall.
  lanternPull: 14,
  // A bright mote is worth more charge and score.
  brightChance: 0.14,
  emberCharge: 1.5,
  brightCharge: 4.0,
  emberScore: 10,
  brightScore: 30,
  // Pickups closer together than this keep the combo alive.
  comboWindow: 2.5,
  comboCap: 12,
};

export const WISPS = {
  // Seconds between wisp spawns at wave 1; shrinks as waves rise.
  spawnIntervalStart: 2.9,
  spawnIntervalMin: 0.8,
  // Drifter: slow, steady hunter. Darter: pauses, then lunges.
  // Wraith: fast and fragile, arrives from wave 4.
  drifterSpeed: 78,
  darterSpeed: 55,
  darterLungeSpeed: 330,
  wraithSpeed: 135,
  wraithFromWave: 4,
  darterFromWave: 2,
  // Banishing a wisp is worth score; a darter is worth more.
  banishScore: 25,
  darterScore: 40,
  wraithScore: 35,
};

export const POWERUPS = {
  // A power-up drops roughly every 22 seconds, cycling through the kinds.
  dropInterval: 22,
  magnetTime: 9,
  magnetRadius: 190,
  slowTime: 5,
  slowFactor: 0.45,
};

export const SCORE = {
  waveBonus: 60,
  winHeartBonus: 120,
  winTimeBonusPerSecond: 6,
};

// Deep indigo night, warm ember gold: the whole palette lives here.
export const PALETTE = {
  skyTop: '#0b1026',
  skyMid: '#171233',
  skyBottom: '#241a3d',
  hillFar: '#1b1430',
  hillNear: '#120d24',
  ground: '#0d0a1c',
  ember: '#ffb347',
  emberHot: '#ffe08a',
  emberDeep: '#ff7a2f',
  wisp: '#8f7bff',
  wispCore: '#c9b8ff',
  moth: '#ffd98a',
  mothWing: '#fff3c4',
  text: '#f5ecd7',
  textDim: '#b8aed6',
  danger: '#ff5d6c',
  good: '#7dffb0',
};
