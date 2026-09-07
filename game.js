'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Skins ─────────────────────────────────────────────────────────────────────
const SKINS = [
  { id: 'classic', name: 'CLÁSICA',
    verts: [[20, 0], [-12, -9], [-7, 0], [-12, 9]],
    stroke: '#fff', fill: null, glow: null,
    flame: 'rgba(255, 130, 0, 0.85)', scale: 1 },
  { id: 'viper', name: 'VÍBORA',
    verts: [[24, 0], [-11, -5], [-4, 0], [-11, 5]],
    stroke: '#39ff88', fill: 'rgba(57, 255, 136, 0.18)', glow: '#39ff88',
    flame: 'rgba(120, 255, 0, 0.85)', scale: 1 },
  { id: 'phoenix', name: 'FÉNIX',
    verts: [[21, 0], [-9, -15], [3, 0], [-9, 15]],
    stroke: '#ff6b35', fill: 'rgba(255, 107, 53, 0.22)', glow: '#ff6b35',
    flame: 'rgba(255, 60, 0, 0.85)', scale: 1 },
  { id: 'cosmic', name: 'CÓSMICA',
    verts: [[23, 0], [-9, -7], [0, 0], [-9, 7]],
    stroke: '#0ff', fill: 'rgba(0, 255, 255, 0.2)', glow: '#0ff',
    flame: 'rgba(0, 255, 255, 0.85)', scale: 1 },
  { id: 'neon', name: 'NEÓN',
    verts: [[21, 0], [-13, -11], [-6, 0], [-13, 11]],
    stroke: '#ff3df0', fill: 'rgba(255, 61, 240, 0.25)', glow: '#ff3df0',
    flame: 'rgba(255, 120, 0, 0.85)', scale: 1 },
];

let skinIndex;
let currentSkin;

function traceShip(verts, scale, skin, lineWidth = 1.5) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = lineWidth;
  if (skin.glow) { ctx.shadowColor = skin.glow; ctx.shadowBlur = 8; }
  ctx.beginPath();
  ctx.moveTo(verts[0][0] * scale, verts[0][1] * scale);
  for (let i = 1; i < verts.length; i++)
    ctx.lineTo(verts[i][0] * scale, verts[i][1] * scale);
  ctx.closePath();
  if (skin.fill) { ctx.fillStyle = skin.fill; ctx.fill(); }
  ctx.strokeStyle = skin.stroke;
  ctx.stroke();
  ctx.restore();
}

function cycleSkin() {
  skinIndex = (skinIndex + 1) % SKINS.length;
  currentSkin = SKINS[skinIndex];
  try { localStorage.setItem('asteroids-skin', currentSkin.id); } catch (e) {}
}

function loadSkin() {
  let saved = null;
  try { saved = localStorage.getItem('asteroids-skin'); } catch (e) {}
  skinIndex = SKINS.findIndex(s => s.id === saved);
  if (skinIndex < 0) skinIndex = 0;
  currentSkin = SKINS[skinIndex];
}

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella fugaz ────────────────────────────────────────────────────────────
class ShootingStar {
  constructor() {
    const fromSide = randInt(0, 3);
    if (fromSide === 0)      { this.x = rand(0, W); this.y = -20; }
    else if (fromSide === 1) { this.x = rand(0, W); this.y = H + 20; }
    else if (fromSide === 2) { this.x = -20;        this.y = rand(0, H); }
    else                     { this.x = W + 20;     this.y = rand(0, H); }

    const tx = rand(0, W);
    const ty = rand(0, H);
    const angle = Math.atan2(ty - this.y, tx - this.x);
    const speed = rand(200, 280);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 12;
    this.ttl = rand(3, 5);
    this.dead = false;
    this.trail = [];
    this.maxTrail = 12;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrail) this.trail.shift();
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Estela
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const alpha = (i / this.trail.length) * 0.5;
      ctx.strokeStyle = `rgba(255, 220, 80, ${alpha.toFixed(2)})`;
      ctx.lineWidth = 1.5 + (i / this.trail.length) * 2;
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x - this.vx * 0.04, t.y - this.vy * 0.04);
      ctx.stroke();
    }

    // Cuerpo: flecha direccional con glow
    const angle = Math.atan2(this.vy, this.vx);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);
    ctx.shadowColor = '#ffd050';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo( 12,  0);
    ctx.lineTo(-8, -6);
    ctx.lineTo(-4,  0);
    ctx.lineTo(-8,  6);
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;
    const speedMul = speedTimer > 0 ? 2 : 1;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * speedMul * dt;
      this.vy += Math.sin(this.angle) * THRUST * speedMul * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    traceShip(currentSkin.verts, currentSkin.scale, currentSkin);

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = currentSkin.flame;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── PowerUp (Velocidad) ───────────────────────────────────────────────────────
class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 70);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 10;
    this.ttl = 8;
    this.dead = false;
    this.rot = 0;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += 2.5 * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const blink = this.ttl < 2 && Math.floor(this.ttl * 6) % 2 === 0;
    if (blink) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);

    // Glow
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur = 12;

    // Rayo/relámpago
    ctx.fillStyle = '#0ff';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-2, -10);
    ctx.lineTo( 4, -3);
    ctx.lineTo( 0, -2);
    ctx.lineTo( 3,  10);
    ctx.lineTo(-3,  1);
    ctx.lineTo( 1,  0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups, shootingStars;
let score, lives, level, speedTimer;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  shootingStars = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  speedTimer = 0;
  state  = 'playing';
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerups  = [];
  shootingStars = [];
  speedTimer = 0;
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (pressed('KeyC')) cycleSkin();

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    powerups.forEach(p => p.update(dt));
    shootingStars.forEach(s => s.update(dt));
    powerups = powerups.filter(p => !p.dead);
    shootingStars = shootingStars.filter(s => !s.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerups.forEach(p => p.update(dt));
  shootingStars.forEach(s => s.update(dt));
  if (speedTimer > 0) speedTimer -= dt;

  // Spawn espontáneo de estrellas fugaces
  if (Math.random() < 0.003) shootingStars.push(new ShootingStar());

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerups  = powerups.filter(p => !p.dead);
  shootingStars = shootingStars.filter(s => !s.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        // 15% de probabilidad de soltar un power-up de velocidad
        if (Math.random() < 0.15) powerups.push(new PowerUp(a.x, a.y));
      }
    }
    // Bala vs estrella fugaz
    for (const s of shootingStars) {
      if (!s.dead && !b.dead && dist(b, s) < s.radius) {
        b.dead = true;
        s.dead = true;
        score += 200;
        explode(s.x, s.y, 10);
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);
  shootingStars = shootingStars.filter(s => !s.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
    // Nave vs estrella fugaz
    for (const s of shootingStars) {
      if (!s.dead && dist(ship, s) < ship.radius + s.radius) {
        killShip();
        break;
      }
    }
  }

  // Nave vs power-up
  if (!ship.dead) {
    for (const p of powerups) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        speedTimer = 5;
        explode(ship.x, ship.y, 6);
      }
    }
  }
  powerups = powerups.filter(p => !p.dead);

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  traceShip(currentSkin.verts, 0.45, currentSkin, 1.2);
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  ctx.textAlign = 'left';
  ctx.font = '12px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(`SKIN: ${currentSkin.name}  [C]`, 14, H - 14);

  // Barra de velocidad (power-up)
  if (speedTimer > 0) {
    const WIDTH = 150;
    const x = 14, y = 38;
    const frac = Math.max(0, speedTimer / 5);

    ctx.save();
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur  = 8;

    ctx.textAlign = 'left';
    ctx.font = '13px monospace';
    ctx.fillStyle = '#0ff';
    ctx.fillText('VELOCIDAD', x, y + 12);

    ctx.strokeStyle = 'rgba(0,255,255,0.5)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(x, y + 18, WIDTH, 6);

    ctx.fillStyle = '#0ff';
    ctx.fillRect(x, y + 18, WIDTH * frac, 6);

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  shootingStars.forEach(s => s.draw());
  powerups.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
loadSkin();
requestAnimationFrame(loop);
