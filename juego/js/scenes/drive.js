import { VIEW_W, VIEW_H, COLORS } from '../config.js';
import { Animator, drawSprite } from '../engine/sprite.js';
import { Cutscene } from './cutscene.js';
import { hudText as text, overlay } from './stage.js';
import { levelCode, prettyCode } from '../engine/codes.js';

// NIVEL 3: Carretera a Oruro. Modo de manejo con scroll vertical, vista 2.5D desde atrás.
// El Baleno de Faby acelera solo; el jugador esquiva a izquierda y derecha y toca la bocina.
// La pandilla del dueño de Corli tira piedras desde los cerros y bloquea la carretera en el altiplano.
// Coordenadas: "d" es la distancia recorrida; un objeto en la distancia od se ve en y = CAR_Y - (od - d).

const CAR_Y = 420;
const ROAD_W = 500;           // ancho del asfalto
const LENGTH = 56000;         // largo total del viaje (~2 minutos)
const CHECKPOINT = 28000;     // mitad: empieza el altiplano
const SPEED0 = 330;
const SPEED1 = 560;
const STEER = 460;
const CAR_SCALE = 1.5;        // el Baleno y la camioneta se ven más grandes (se distingue a Tofu)
const CAR_W = 76;
const CAR_H = 104;

const SECTIONS = [
  { at: 0, name: 'SALIENDO DE COCHABAMBA', sub: 'Rumbo a Oruro' },
  { at: 8400, name: 'LOS CERROS', sub: '¡Cuidado con las piedras!' },
  { at: CHECKPOINT, name: 'EL ALTIPLANO', sub: 'Pajas bravas y llamas' },
  { at: 42000, name: 'EL BLOQUEO', sub: 'Busca los huecos' },
];

function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Centro de la carretera (x en pantalla) para una distancia: curvas en los cerros, casi recta en el altiplano.
function roadX(d) {
  const k = d < CHECKPOINT ? 1 : Math.max(0.25, 1 - (d - CHECKPOINT) / 8000);
  return VIEW_W / 2 + k * (120 * Math.sin(d / 2700) + 50 * Math.sin(d / 950 + 1));
}

export class Drive {
  constructor(stage, save) {
    this.stage = stage;
    this.game = stage.game;
    this.img = stage.game.bgImages;
    this.resume = save?.zone > 0;
    this.d = this.resume ? CHECKPOINT : 0;
    this.carX = roadX(this.d);
    this.vx = 0;
    this.hp = 100;
    this.invuln = 0;
    this.objs = [];
    this.t = 0;
    this.score = save?.score ?? 0;
    this.lives = save?.lives ?? 3;
    this.state = 'drive';     // drive | finale | oruro | results | gameover
    this.stateTime = 0;
    this.next = { rock: 1.5, pothole: 1.2, pickup: 9, llama: 3, barrier: 2.5, thrower: 2 };
    this.r = rng(this.resume ? 99 : 7);
    this.section = -1;
    this.blocks = 0;          // barreras de "El bloqueo" (cada 2, una llave)
    this.hornCool = 0;
    this.player = { state: 'drive', x: 0, y: 0 };   // para el texto de depuración
    this.smoke = [];
    this.flash = 0;
    stage.mode = 'play';
    stage.cutscene = null;
    stage.music('road');
    if (this.resume) this.banner('¡CONTINUAMOS!', 'Desde el altiplano');
  }

  get speed() {
    return SPEED0 + (SPEED1 - SPEED0) * Math.min(1, this.d / LENGTH);
  }

  banner(text, sub, time = 2.2) {
    this.bannerMsg = { text, sub, time };
  }

  sfx(n) { this.stage.sfx(n); }

  // ---------- Simulación ----------

  update(dt, input) {
    this.t += dt;
    this.stateTime += dt;
    const st = this.stage;
    if (this.bannerMsg && (this.bannerMsg.time -= dt) <= 0) this.bannerMsg = null;
    if (st.cutscene) {
      st.cutscene.update(dt, input);
      if (st.cutscene.done) st.cutscene = null;
    }
    switch (this.state) {
      case 'gameover':
        if (this.stateTime > 0.8 && (input.pressed.attack || input.pressed.pause)) st.reset(this.game.save?.done ? null : this.game.save);
        else if (this.stateTime > 0.8 && input.pressed.jump) this.game.toTitle?.();
        return;
      case 'results':
        if (this.stateTime > 1.5 && (input.pressed.attack || input.pressed.pause || input.pressed.jump)) {
          if (this.next4 && !input.pressed.jump) this.game.startGame?.(this.game.slot, this.game.save);
          else this.game.toTitle?.();
        }
        return;
      case 'oruro':
        this.updateOruro(dt);
        return;
    }

    // Avance: el auto acelera solo.
    const v = this.state === 'finale' ? Math.max(0, this.speed * (1 - this.stateTime / 2.5)) : this.speed;
    this.d += v * dt;
    // Volante con un poco de inercia
    const steer = this.state === 'drive' ? input.moveVector().x : Math.sign(roadX(this.d) - this.carX) * 0.4;
    this.vx += (steer * STEER - this.vx) * Math.min(1, dt * 10);
    this.carX += this.vx * dt;
    const cx = roadX(this.d);
    const edge = ROAD_W / 2 - CAR_W / 2 + 18;
    if (Math.abs(this.carX - cx) > edge) {
      // Banquina: el auto vibra y se raspa un poquito.
      this.carX = cx + Math.sign(this.carX - cx) * edge;
      if (Math.floor(this.t * 8) !== Math.floor((this.t - dt) * 8)) this.damage(2, null, true);
    }
    if (this.invuln > 0) this.invuln -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.hornCool > 0) this.hornCool -= dt;
    if (input.pressed.attack && this.hornCool <= 0 && this.state === 'drive') this.horn();
    this.player.x = Math.round(this.carX);
    this.player.y = Math.round(this.d);

    // Tramos del viaje
    const sec = SECTIONS.findLastIndex((s) => this.d >= s.at);
    if (sec !== this.section) {
      this.section = sec;
      const s = SECTIONS[sec];
      if (!(this.resume && sec === 2 && this.t < 1)) this.banner(s.name, s.sub);
      if (sec === 2 && !this.resume) this.checkpoint();
    }

    if (this.state === 'drive') this.spawn(dt);
    for (const o of this.objs) o.update?.(dt, this);
    this.objs = this.objs.filter((o) => !o.removed && this.screenY(o.d) < VIEW_H + 160);
    this.collide();
    this.updateSmoke(dt);

    if (this.state === 'drive' && this.d >= LENGTH) this.startFinale();
    if (this.state === 'drive' && this.hp <= 0) this.lose();
  }

  screenY(od) {
    return CAR_Y - (od - this.d);
  }

  // x en pantalla de algo que está a "off" del centro de la carretera, en la distancia od.
  sx(od, off) {
    return roadX(od) + off;
  }

  horn() {
    this.hornCool = 0.6;
    this.sfx('horn');
    this.stage.fx.text(this.carX, CAR_Y - 90, '¡PIIIP!', '#ffd23f', 10);
    for (const o of this.objs) if (o.kind === 'llama' && o.d - this.d < 520 && o.d > this.d) o.scare();
  }

  checkpoint() {
    this.game.saveProgress?.({ level: 3, zone: 1, score: this.score, lives: this.lives, done: false });
  }

  damage(n, what, quiet = false) {
    if (this.invuln > 0 && !quiet) return false;
    this.hp = Math.max(0, this.hp - n);
    if (!quiet) {
      this.invuln = 1;
      this.flash = 0.2;
      this.stage.camera.shake(6, 0.2);
      this.sfx('crash');
      if (what) this.stage.fx.text(this.carX, CAR_Y - 100, what, '#ff4040', 11);
    }
    return true;
  }

  heal(n, label) {
    this.hp = Math.min(100, this.hp + n);
    this.score += 300;
    this.sfx('pickup');
    this.stage.fx.text(this.carX, CAR_Y - 100, label, '#7dff8a', 11);
  }

  // Aparecen peligros y premios según el tramo. Los tiempos están en segundos.
  spawn(dt) {
    const r = this.r;
    const n = this.next;
    for (const k in n) n[k] -= dt;
    const ahead = this.d + CAR_Y + 120;   // justo arriba de la pantalla
    const lane = () => (r() * 2 - 1) * (ROAD_W / 2 - 40);
    const s = this.section;
    const busy = this.objs.some((o) => o.kind === 'barrier' && Math.abs(o.d - ahead) < 340);

    if (n.pothole <= 0 && !busy) {
      n.pothole = s >= 2 ? 3 + r() * 3 : 1.6 + r() * 2;
      this.objs.push(new Pothole(ahead, lane()));
    }
    if (n.pickup <= 0 && !busy) {
      n.pickup = 9 + r() * 6;
      this.objs.push(new Pickup(ahead, lane(), r() < 0.5 ? 'wrench' : 'fuel'));
    }
    // Cerros: derrumbes al principio; desde "Los cerros", la pandilla tira piedras.
    if (s <= 1 && n.rock <= 0) {
      n.rock = s === 0 ? 3.2 + r() * 2 : 1.3 + r() * 1.4 - Math.min(0.6, (this.d - 8400) / 35000);
      const side = r() < 0.5 ? -1 : 1;
      // Apunta cerca de donde va el auto, para que haya que esquivar.
      const target = Math.max(-ROAD_W / 2 + 34, Math.min(ROAD_W / 2 - 34, this.carX - roadX(this.d) + (r() * 2 - 1) * 70));
      const thrower = s === 1 ? this.objs.find((o) => o.kind === 'thrower' && o.side === side && Math.abs(this.screenY(o.d) - 200) < 200) : null;
      // Cae justo donde va a estar el auto cuando aterrice (si no esquiva, le pega).
      const T = Math.min(1.2, 400 / this.speed);
      this.objs.push(new Rock(this.d + this.speed * T - 6, target, side, thrower, T));
      if (thrower) thrower.throw();
    }
    if (s === 1 && n.thrower <= 0) {
      n.thrower = 2.4 + r() * 1.5;
      this.objs.push(new Thrower(ahead + 40, r() < 0.5 ? -1 : 1));
    }
    // Altiplano: llamas y barreras.
    if (s >= 2 && n.llama <= 0 && !busy) {
      n.llama = s === 2 ? 2.6 + r() * 2.5 : 4 + r() * 3;
      this.objs.push(new Llama(ahead, r() < 0.5 ? -1 : 1, r));
    }
    if (s >= 2 && n.barrier <= 0) {
      n.barrier = s === 2 ? 4 + r() * 2 : 2.8 + r() * 1.5;
      this.objs.push(new Barrier(ahead + 60, r, s === 3));
      // En "El bloqueo", después de cada 2 barreras aparece sí o sí una llave para reparar el auto.
      if (s === 3 && ++this.blocks % 2 === 0) this.objs.push(new Pickup(ahead + 330, lane(), 'wrench'));
    }
  }

  collide() {
    if (this.state !== 'drive') return;
    const cx = this.carX;
    for (const o of this.objs) {
      const y = this.screenY(o.d);
      if (Math.abs(y - CAR_Y) > CAR_H / 2 + (o.h ?? 20) / 2) continue;
      o.hitCar?.(this, cx, roadX(o.d));
    }
  }

  lose() {
    this.state = 'gameover';
    this.stateTime = 0;
    this.stage.mode = 'gameover';
    this.stage.music('gameover');
    this.sfx('lifeLost');
  }

  // ---------- Final: la camioneta de Corli y la llegada a Oruro ----------

  startFinale() {
    this.state = 'finale';
    this.stateTime = 0;
    this.objs = this.objs.filter((o) => this.screenY(o.d) > CAR_Y + 40);
    this.score += 5000 + this.hp * 20;
    const truck = { y: VIEW_H + 150, x: this.carX + 140 };
    this.truck = truck;
    this.stage.cutscene = new Cutscene(this.stage, [
      { until: (s, dt) => { truck.y -= 240 * dt; truck.x += (roadX(this.d) + 130 - truck.x) * dt * 2; return truck.y < CAR_Y - 90; }, timeout: 5 },
      { say: 'owner', text: '¡Te salvaste esta vez, Faby! ¡Pero ya nos veremos!' },
      { say: 'pug', text: '¡GUAU GUAU! (¡Ya verás, Tofu!)' },
      { say: 'tofu', text: '¡GRRR… GUAU! (¡Cuando quieras!)' },
      { until: (s, dt) => { truck.y -= 520 * dt; return truck.y < -140; }, timeout: 4 },
      { run: () => { this.truck = null; } },
      { wait: 0.8 },
      { run: () => this.startOruro() },
    ]);
  }

  startOruro() {
    this.state = 'oruro';
    this.stateTime = 0;
    this.carSideX = -160;
    this.stage.music('oruro');
    this.faby = new Animator(this.stage.sheets.faby, 'idle');
    this.tofu = new Animator(this.stage.sheets.tofu, 'happy');
    this.out = false;
    this.stage.cutscene = new Cutscene(this.stage, [
      { until: (s, dt) => { this.carSideX = Math.min(330, this.carSideX + Math.max(40, (330 - this.carSideX) * 2.2) * dt); return this.carSideX >= 329; }, timeout: 6 },
      { run: () => { this.sfx('land'); } },
      { wait: 0.5 },
      { run: () => { this.out = true; this.sfx('select'); } },
      { wait: 0.6 },
      { say: 'faby', text: '¡Siii! ¡Llegamos justo para el Carnaval!' },
      { say: 'tofu', text: '¡GUAU GUAU! (¡A bailar!)' },
      { wait: 0.4 },
      { run: () => this.finish() },
    ]);
  }

  updateOruro(dt) {
    this.faby?.update(dt);
    this.tofu?.update(dt);
  }

  finish() {
    this.state = 'results';
    this.stateTime = 0;
    this.stage.mode = 'ending';
    this.stage.music('ending');
    const last = 3 >= this.stage.lastLevel;
    this.next4 = !last;
    this.game.saveProgress?.(last
      ? { level: 3, zone: 0, score: this.score, lives: this.lives, done: true }
      : { level: 4, zone: 0, score: this.score, lives: this.lives, done: false });
  }

  updateSmoke(dt) {
    if (this.hp < 40 && this.state === 'drive' && this.r() < dt * (this.hp < 20 ? 30 : 14)) {
      this.smoke.push({ x: this.carX + (this.r() * 2 - 1) * 20, y: CAR_Y + 40, t: 0 });
    }
    for (const s of this.smoke) { s.t += dt; s.y += 120 * dt; s.x += Math.sin(s.t * 6) * 0.6; }
    this.smoke = this.smoke.filter((s) => s.t < 0.9);
  }

  // ---------- Dibujo ----------

  draw(ctx, debug) {
    const st = this.stage;
    if (this.state === 'oruro' || this.state === 'results') {
      this.drawOruro(ctx);
      if (this.state === 'results') this.drawResults(ctx);
      st.cutscene?.draw(ctx);
      return;
    }
    const cam = st.camera;
    ctx.save();
    ctx.translate(Math.round(cam.offsetX), Math.round(cam.offsetY));
    this.drawWorld(ctx);
    // Objetos del suelo primero, luego los que están en el aire
    const sorted = [...this.objs].sort((a, b) => (a.air ? 1 : 0) - (b.air ? 1 : 0) || b.d - a.d);
    for (const o of sorted) o.draw(ctx, this, this.screenY(o.d), roadX(o.d));
    if (this.truck) drawTruck(ctx, this.img.d_truck, this.truck.x, this.truck.y, this.stage, this.t);
    this.drawCar(ctx);
    st.fx.draw(ctx, 0);
    ctx.restore();
    st.fx.update?.(0);
    this.drawHud(ctx);
    if (this.bannerMsg) {
      const b = this.bannerMsg;
      ctx.fillStyle = 'rgba(20, 12, 40, 0.6)';
      ctx.fillRect(VIEW_W / 2 - 240, 150, 480, 62);
      text(ctx, b.text, VIEW_W / 2, 180, 20, '#ffd23f', 'center');
      text(ctx, b.sub, VIEW_W / 2, 202, 10, '#ffffff', 'center');
    }
    st.cutscene?.draw(ctx);
    if (this.state === 'gameover') overlay(ctx, '¡QUÉ LÁSTIMA!', 'Los bloqueadores te cerraron el paso · J: reintentar · K: menú');
  }

  // Carretera y paisaje, dibujados en franjas horizontales siguiendo las curvas.
  drawWorld(ctx) {
    const STEP_Y = 4;
    const alt = (od) => od >= CHECKPOINT - 1500;   // ¿altiplano?
    for (let y = 0; y < VIEW_H; y += STEP_Y) {
      const od = this.d + (CAR_Y - y);
      const cx = roadX(od);
      const hw = ROAD_W / 2;
      const plain = alt(od);
      // Paisaje a los costados
      const band = Math.floor(od / 36) % 2;
      ctx.fillStyle = plain ? (band ? '#c9a25a' : '#c29a52') : (band ? '#6f9c3f' : '#679438');
      ctx.fillRect(0, y, VIEW_W, STEP_Y);
      // Banquina de tierra/grava
      ctx.fillStyle = plain ? '#a88a5a' : '#9b8466';
      ctx.fillRect(Math.round(cx - hw - 26), y, ROAD_W + 52, STEP_Y);
      // Asfalto
      ctx.fillStyle = Math.floor(od / 24) % 2 ? '#4a4a54' : '#47474f';
      ctx.fillRect(Math.round(cx - hw), y, ROAD_W, STEP_Y);
      // Bordes blancos
      ctx.fillStyle = '#f2ede4';
      ctx.fillRect(Math.round(cx - hw + 6), y, 4, STEP_Y);
      ctx.fillRect(Math.round(cx + hw - 10), y, 4, STEP_Y);
      // Línea central amarilla discontinua y divisorias de carril
      if (Math.floor(od / 48) % 2 === 0) {
        ctx.fillStyle = '#ffd23f';
        ctx.fillRect(Math.round(cx - 3), y, 6, STEP_Y);
        ctx.fillStyle = 'rgba(242, 237, 228, 0.55)';
        ctx.fillRect(Math.round(cx - hw / 2 - 2), y, 4, STEP_Y);
        ctx.fillRect(Math.round(cx + hw / 2 - 2), y, 4, STEP_Y);
      }
    }
    // Decoración del paisaje: cerros con rocas y arbustos; altiplano con pajas bravas.
    this.drawScenery(ctx);
  }

  drawScenery(ctx) {
    const SP = 70;
    const first = Math.floor((this.d - (VIEW_H - CAR_Y) - 200) / SP);
    const last = Math.floor((this.d + CAR_Y + 200) / SP);
    for (let i = first; i <= last; i++) {
      const od = i * SP;
      const y = this.screenY(od);
      const r = rng(i * 7919 + 13);
      const plain = od >= CHECKPOINT - 1500;
      for (const side of [-1, 1, -1, 1]) {
        const dist = ROAD_W / 2 + 50 + r() * 230;
        const x = roadX(od) + side * dist;
        if (x < -60 || x > VIEW_W + 60) continue;
        const kind = r();
        if (plain) {
          const llama = this.img.d_llama;
          if (llama && kind < 0.025 && dist > ROAD_W / 2 + 110) {
            // Llama pastando a lo lejos
            ctx.save();
            ctx.translate(Math.round(x), Math.round(y));
            if (side > 0) ctx.scale(-1, 1);
            ctx.drawImage(llama, -llama.width / 2, -llama.height + 8);
            ctx.restore();
          } else if (kind < 0.6) drawPaja(ctx, x, y, 0.9 + r() * 0.7);
          else if (kind < 0.7) this.stone(ctx, x, y, 0.5 + r() * 0.3);
        } else {
          const img = this.img[i % 2 ? 'd_hill2' : 'd_hill'];
          if (img && kind < 0.18 && dist > ROAD_W / 2 + 120) {
            ctx.save();
            ctx.translate(Math.round(x), Math.round(y));
            if (side < 0) ctx.scale(-1, 1);
            ctx.drawImage(img, -img.width / 2, -img.height + 10);
            ctx.restore();
          } else if (kind < 0.45) drawBush(ctx, x, y, 10 + r() * 12);
          else if (kind < 0.7) this.stone(ctx, x, y, 0.7 + r() * 0.6);
        }
      }
    }
  }

  // Piedra del paisaje: la de PixelLab escalada, o el respaldo por código.
  stone(ctx, x, y, k) {
    const img = this.img.o_rock;
    if (!img) return drawStone(ctx, x, y, 14 * k);
    const w = Math.round(img.width * k), h = Math.round(img.height * k);
    ctx.drawImage(img, Math.round(x - w / 2), Math.round(y - h), w, h);
  }

  drawCar(ctx) {
    if (this.invuln > 0 && Math.floor(this.t * 16) % 2) return;
    const x = Math.round(this.carX);
    const tilt = (this.vx / STEER) * 0.08;
    // Sombra
    ctx.fillStyle = COLORS.shadow;
    ctx.beginPath();
    ctx.ellipse(x, CAR_Y + 44, 54, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const s of this.smoke) {
      ctx.fillStyle = `rgba(90, 90, 100, ${0.6 * (1 - s.t / 0.9)})`;
      const k = 6 + s.t * 14;
      ctx.fillRect(Math.round(s.x - k / 2), Math.round(s.y - k / 2), Math.round(k), Math.round(k));
    }
    ctx.save();
    ctx.translate(x, CAR_Y);
    ctx.rotate(tilt);
    const bump = Math.round(Math.sin(this.t * 30) * 0.6);
    const img = this.img.d_car;
    ctx.imageSmoothingEnabled = false;
    if (img) {
      const w = Math.round(img.width * CAR_SCALE), h = Math.round(img.height * CAR_SCALE);
      ctx.drawImage(img, -Math.round(w / 2), -Math.round(h / 2) + bump, w, h);
    } else {
      ctx.scale(CAR_SCALE, CAR_SCALE);
      drawCarFallback(ctx, bump);
    }
    ctx.restore();
    if (this.flash > 0) {
      ctx.fillStyle = 'rgba(255,80,80,0.35)';
      ctx.fillRect(x - 60, CAR_Y - 64, 120, 128);
    }
  }

  drawHud(ctx) {
    // Salud del auto
    ctx.fillStyle = 'rgba(20, 12, 40, 0.7)';
    ctx.fillRect(12, 12, 300, 74);
    text(ctx, 'BALENO', 24, 32, 12, '#ffffff');
    const k = this.hp / 100;
    const col = k > 0.5 ? '#7dff7a' : k > 0.25 ? '#ffd23f' : '#ff3040';
    ctx.fillStyle = '#140c1c';
    ctx.fillRect(22, 40, 264, 18);
    ctx.fillStyle = '#3a2a4a';
    ctx.fillRect(24, 42, 260, 14);
    ctx.fillStyle = col;
    ctx.fillRect(24, 42, Math.round(260 * k), 14);
    text(ctx, String(this.score).padStart(6, '0'), 24, 78, 10, '#ffd23f');
    text(ctx, `x${this.lives}`, 270, 78, 10, '#ffffff');
    // Avance: Cochabamba → Oruro
    const x0 = VIEW_W - 330, x1 = VIEW_W - 30, y = 40;
    ctx.fillStyle = 'rgba(20, 12, 40, 0.7)';
    ctx.fillRect(x0 - 16, 14, x1 - x0 + 32, 50);
    text(ctx, 'CBBA', x0, 30, 8, '#ffffff');
    text(ctx, 'ORURO', x1, 30, 8, '#ffffff', 'right');
    ctx.fillStyle = '#7df9ff';
    ctx.fillRect(x0, y + 4, x1 - x0, 4);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(Math.round(x0 + (CHECKPOINT / LENGTH) * (x1 - x0)) - 1, y, 3, 12);
    const px = x0 + Math.min(1, this.d / LENGTH) * (x1 - x0);
    ctx.fillStyle = '#140c1c';
    ctx.fillRect(Math.round(px) - 7, y - 2, 14, 16);
    ctx.fillStyle = '#8a8f99';
    ctx.fillRect(Math.round(px) - 5, y, 10, 12);
  }

  drawOruro(ctx) {
    // Cielo azul del altiplano con el casco de bienvenida y las letras ORURO.
    const sky = ctx.createLinearGradient(0, 0, 0, 380);
    sky.addColorStop(0, '#1f6fe0');
    sky.addColorStop(1, '#8fd0ff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#b99a74';
    ctx.fillRect(0, 300, VIEW_W, 80);
    ctx.fillStyle = '#5fbf4a';
    ctx.fillRect(0, 380, VIEW_W, 60);
    ctx.fillStyle = '#8f8a80';
    ctx.fillRect(0, 440, VIEW_W, VIEW_H - 440);
    ctx.fillStyle = '#f2ede4';
    for (let x = 0; x < VIEW_W; x += 80) ctx.fillRect(x, 500, 44, 4);
    const img = this.img.d_oruro;
    if (img) ctx.drawImage(img, Math.round(VIEW_W * 0.6 - img.width / 2), Math.round(452 - img.height));
    else drawOruroFallback(ctx);
    // El Baleno de costado se estaciona; bajan Faby y Tofu.
    const car = this.img.d_car_side;
    const cx = Math.round(this.carSideX ?? 330);
    if (car) ctx.drawImage(car, cx - Math.round(car.width / 2), 482 - car.height);
    else drawCarSideFallback(ctx, cx, 470);
    if (this.out) {
      drawSprite(ctx, this.faby, cx + 190, 484, 1);
      drawSprite(ctx, this.tofu, cx + 250, 486, 1);
    }
  }

  drawResults(ctx) {
    const k = Math.min(1, this.stateTime / 0.6);
    ctx.fillStyle = `rgba(20, 10, 40, ${0.55 * k})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = 'rgba(20, 12, 40, 0.85)';
    ctx.fillRect(250, 90, 460, 330);
    ctx.strokeStyle = '#ff2fa8';
    ctx.lineWidth = 3;
    ctx.strokeRect(251.5, 91.5, 457, 327);
    const last = !this.next4;
    text(ctx, last ? '¡GRACIAS POR JUGAR!' : '¡NIVEL 3 COMPLETADO!', 480, 132, 20, '#ff2fa8', 'center');
    text(ctx, 'FABY & TOFU', 480, 176, 16, '#7df9ff', 'center');
    text(ctx, 'Carretera a Oruro', 480, 202, 10, '#ffffff', 'center');
    text(ctx, `PUNTAJE  ${String(this.score).padStart(6, '0')}`, 480, 244, 14, '#ffd23f', 'center');
    text(ctx, `EL BALENO LLEGÓ CON ${Math.round(this.hp)} % DE SALUD`, 480, 276, 9, '#7dff8a', 'center');
    if (last) {
      text(ctx, 'PRÓXIMAMENTE · NIVEL 4', 480, 320, 12, '#ffd23f', 'center');
      text(ctx, '¡EL CARNAVAL DE ORURO!', 480, 346, 12, '#ff6fb5', 'center');
    } else {
      text(ctx, `CÓDIGO PARA EL NIVEL 4:  ${prettyCode(levelCode(4))}`, 480, 330, 11, '#ffd23f', 'center');
      text(ctx, '¡Anótalo! Solo sirve en este dispositivo', 480, 348, 7, '#ffffff', 'center');
    }
    if (this.stateTime > 1.5 && Math.floor(this.stateTime * 2) % 2 === 0) {
      text(ctx, last ? 'J / ENTER PARA VOLVER AL INICIO' : 'J / ENTER: ¡AL NIVEL 4! · K: MENÚ', 480, 396, 10, '#ffd23f', 'center');
    }
  }
}

// ---------- Peligros y premios ----------

class Pothole {
  constructor(d, off) { this.kind = 'pothole'; this.d = d; this.off = off; this.h = 20; }
  hitCar(dr, cx, rx) {
    if (this.done || Math.abs(cx - (rx + this.off)) > CAR_W / 2 + 16) return;
    this.done = true;
    dr.damage(6, '¡BACHE!');
  }
  draw(ctx, dr, y, rx) {
    const img = dr.img.o_pothole;
    const x = Math.round(rx + this.off);
    if (img) return ctx.drawImage(img, x - img.width / 2, Math.round(y - img.height / 2));
    ctx.fillStyle = '#2b2b33';
    ctx.beginPath(); ctx.ellipse(x, Math.round(y), 20, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b1b22';
    ctx.beginPath(); ctx.ellipse(x + 2, Math.round(y + 1), 13, 5, 0, 0, Math.PI * 2); ctx.fill();
  }
}

class Pickup {
  constructor(d, off, type) { this.kind = 'pickup'; this.d = d; this.off = off; this.type = type; this.h = 28; }
  hitCar(dr, cx, rx) {
    if (this.removed || Math.abs(cx - (rx + this.off)) > CAR_W / 2 + 14) return;
    this.removed = true;
    dr.heal(this.type === 'wrench' ? 25 : 15, this.type === 'wrench' ? '¡LLAVE! +25' : '¡GASOLINA! +15');
  }
  draw(ctx, dr, y, rx) {
    const x = Math.round(rx + this.off);
    const bob = Math.round(Math.sin(dr.t * 6 + this.d) * 3);
    const img = dr.img[this.type === 'wrench' ? 'o_wrench' : 'o_fuel'];
    if (img) return ctx.drawImage(img, x - img.width / 2, Math.round(y - img.height / 2) + bob);
    ctx.fillStyle = '#140c1c';
    ctx.fillRect(x - 13, y - 15 + bob, 26, 30);
    ctx.fillStyle = this.type === 'wrench' ? '#c0c6d0' : '#e83a3a';
    ctx.fillRect(x - 11, y - 13 + bob, 22, 26);
    text(ctx, this.type === 'wrench' ? 'W' : 'G', x, y + 6 + bob, 10, '#ffffff', 'center');
  }
}

// Piedra lanzada desde el costado (o derrumbe): vuela en arco hasta su sombra y queda en la carretera.
class Rock {
  constructor(d, off, side, thrower, T = 1.15) {
    this.kind = 'rock';
    this.d = d;
    this.off = off;
    this.side = side;
    this.from = side * (ROAD_W / 2 + 120);
    this.t = 0;
    this.T = T;
    this.air = true;
    this.h = 24;
    this.warned = false;
  }
  update(dt, dr) {
    this.t += dt;
    if (this.air && !this.warned && this.t > 0.15) {
      this.warned = true;
      // Tofu avisa si la piedra cae cerca del auto.
      if (Math.abs(dr.carX - (roadX(this.d) + this.off)) < 90) {
        dr.sfx('bark');
        dr.stage.fx.text(dr.carX + 40, CAR_Y - 80, '¡GUAU!', '#7df9ff', 10);
      }
    }
    if (this.air && this.t >= this.T) {
      this.air = false;
      dr.sfx('rock');
      dr.stage.camera.shake(2, 0.1);
    }
  }
  get z() { return this.air ? Math.sin(Math.min(1, this.t / this.T) * Math.PI) * 140 + (1 - this.t / this.T) * 60 : 0; }
  hitCar(dr, cx, rx) {
    if (this.air || this.done || Math.abs(cx - (rx + this.off)) > CAR_W / 2 + 14) return;
    this.done = true;
    dr.damage(14, '¡PIEDRA!');
  }
  draw(ctx, dr, y, rx) {
    const k = Math.min(1, this.t / this.T);
    const x = Math.round(rx + (this.air ? this.from + (this.off - this.from) * k : this.off));
    // Sombra que avisa dónde va a caer
    if (this.air) {
      ctx.fillStyle = `rgba(0,0,0,${0.2 + 0.3 * k})`;
      ctx.beginPath(); ctx.ellipse(Math.round(rx + this.off), Math.round(y), 10 + 10 * k, 4 + 4 * k, 0, 0, Math.PI * 2); ctx.fill();
    }
    const img = dr.img.o_rock;
    const ry = Math.round(y - this.z);
    if (img) return ctx.drawImage(img, x - img.width / 2, ry - img.height + 6);
    drawStone(ctx, x, ry + 4, 18);
  }
}

// Tirapiedras de la pandilla, al costado de la carretera en los cerros.
class Thrower {
  constructor(d, side) { this.kind = 'thrower'; this.d = d; this.side = side; this.throwT = 0; }
  throw() { this.throwT = 0.4; }
  update(dt) { if (this.throwT > 0) this.throwT -= dt; }
  draw(ctx, dr, y, rx) {
    const x = Math.round(rx + this.side * (ROAD_W / 2 + 70));
    const img = dr.img.d_thrower;
    if (img) {
      ctx.save();
      ctx.translate(x, Math.round(y));
      if (this.side > 0) ctx.scale(-1, 1);
      if (this.throwT > 0) ctx.rotate(-0.12);
      ctx.drawImage(img, -img.width / 2, -img.height + 6);
      ctx.restore();
      return;
    }
    drawPerson(ctx, x, y, this.side, this.throwT > 0);
  }
}

// Llama que cruza la carretera. No se le hace daño: se la esquiva o se la aparta con la bocina.
class Llama {
  constructor(d, side, r) {
    this.kind = 'llama';
    this.d = d;
    this.side = side;
    this.off = side * (ROAD_W / 2 + 60);
    this.vx = -side * (45 + r() * 35);
    this.h = 34;
    this.t = r() * 3;
    this.scared = false;
  }
  scare() {
    if (this.scared) return;
    this.scared = true;
    this.vx = Math.sign(this.off || 1) * 360;
    this.say = 1;
  }
  update(dt) {
    this.t += dt;
    this.off += this.vx * dt;
    if (this.say > 0) this.say -= dt;
    if (!this.scared && Math.abs(this.off) > ROAD_W / 2 + 80) this.removed = true;
    if (this.scared && Math.abs(this.off) > ROAD_W / 2 + 300) this.removed = true;
  }
  hitCar(dr, cx, rx) {
    if (this.done || Math.abs(cx - (rx + this.off)) > CAR_W / 2 + 20) return;
    this.done = true;
    dr.damage(12, '¡UNA LLAMA!');
    this.scare();
  }
  draw(ctx, dr, y, rx) {
    const x = Math.round(rx + this.off);
    ctx.fillStyle = COLORS.shadow;
    ctx.beginPath(); ctx.ellipse(x, Math.round(y) + 4, 26, 7, 0, 0, Math.PI * 2); ctx.fill();
    const walk = [1, 2, 3, 4].map((i) => dr.img['d_llama' + i]).filter(Boolean);
    const img = walk.length ? walk[Math.floor(this.t * (this.scared ? 14 : 7)) % walk.length] : dr.img.d_llama;
    if (img) {
      ctx.save();
      ctx.translate(x, Math.round(y));
      if (this.vx > 0) ctx.scale(-1, 1);
      ctx.drawImage(img, -img.width / 2, -img.height + 8);
      ctx.restore();
    } else drawLlamaFallback(ctx, x, y, this.vx > 0 ? -1 : 1, this.t);
    if (this.say > 0) text(ctx, '¡BEEE!', x, Math.round(y) - 48, 9, '#ffffff', 'center');
  }
}

// Barrera de la pandilla: llantas y conos a lo ancho de la carretera con uno o dos huecos.
// En "El bloqueo" los huecos se van moviendo.
class Barrier {
  constructor(d, r, moving) {
    this.kind = 'barrier';
    this.d = d;
    this.h = 30;
    this.gaps = [{ c: (r() * 2 - 1) * (ROAD_W / 2 - 95), w: 160 }];
    if (r() < 0.35) this.gaps.push({ c: -this.gaps[0].c * 0.8, w: 150 });
    this.moving = moving;
    this.phase = r() * 6;
    this.speed = 0.8 + r() * 0.6;
    this.t = 0;
    this.blockers = [-1, 1].map((s) => ({ side: s }));
  }
  update(dt) { this.t += dt; }
  gapCenter(g) {
    if (!this.moving) return g.c;
    const amp = ROAD_W / 2 - g.w / 2 - 20;
    return Math.max(-amp, Math.min(amp, g.c + Math.sin(this.t * this.speed + this.phase) * 110));
  }
  inGap(off) {
    return this.gaps.some((g) => Math.abs(off - this.gapCenter(g)) < g.w / 2 - CAR_W / 2 + 6);
  }
  hitCar(dr, cx, rx) {
    if (this.done) return;
    this.done = true;
    if (this.inGap(cx - rx)) {
      dr.score += 200;
      dr.stage.fx.text(cx, CAR_Y - 100, '¡PASASTE!', '#7dff8a', 10);
      return;
    }
    dr.damage(22, '¡BLOQUEO!');
    this.broken = cx - rx;
  }
  draw(ctx, dr, y, rx) {
    const hw = ROAD_W / 2;
    for (let off = -hw + 18; off <= hw - 18; off += 34) {
      if (this.inGap(off)) continue;
      if (this.broken !== undefined && Math.abs(off - this.broken) < 40) continue;
      const x = Math.round(rx + off);
      const cone = Math.floor((off + hw) / 34) % 3 === 2;
      const img = dr.img[cone ? 'o_cone' : 'o_tires'];
      if (img) ctx.drawImage(img, x - img.width / 2, Math.round(y - img.height + 10));
      else if (cone) drawCone(ctx, x, y);
      else drawTires(ctx, x, y);
    }
    // Bloqueadores parados a los costados
    for (const b of this.blockers) {
      const x = Math.round(rx + b.side * (hw + 46));
      const img = dr.img[b.side < 0 ? 'd_blocker' : 'd_blocker2'];
      if (img) {
        ctx.save();
        ctx.translate(x, Math.round(y));
        if (b.side > 0) ctx.scale(-1, 1);
        ctx.drawImage(img, -img.width / 2, -img.height + 6);
        ctx.restore();
      } else drawPerson(ctx, x, y, b.side, Math.floor(this.t * 2) % 2);
    }
  }
}

// ---------- Dibujos de respaldo por código (hasta tener el arte de PixelLab) ----------

function drawCarFallback(ctx, bump) {
  const y = bump;
  ctx.fillStyle = '#140c1c';
  ctx.fillRect(-30, -40 + y, 60, 76);
  ctx.fillStyle = '#6b6f78';
  ctx.fillRect(-27, -37 + y, 54, 70);
  ctx.fillStyle = '#8a8f99';
  ctx.fillRect(-22, -34 + y, 44, 20);
  ctx.fillStyle = '#2a2d36';
  ctx.fillRect(-20, -10 + y, 40, 18);
  ctx.fillStyle = '#e83a3a';
  ctx.fillRect(-26, 14 + y, 14, 6);
  ctx.fillRect(12, 14 + y, 14, 6);
  ctx.fillStyle = '#c38a55';
  ctx.fillRect(26, -14 + y, 10, 10);
}

function drawCarSideFallback(ctx, x, base) {
  ctx.fillStyle = '#140c1c';
  ctx.fillRect(x - 92, base - 62, 184, 48);
  ctx.fillStyle = '#6b6f78';
  ctx.fillRect(x - 88, base - 58, 176, 40);
  ctx.fillStyle = '#2a2d36';
  ctx.fillRect(x - 50, base - 76, 90, 20);
  for (const wx of [x - 56, x + 56]) {
    ctx.fillStyle = '#140c1c';
    ctx.beginPath(); ctx.arc(wx, base - 14, 16, 0, Math.PI * 2); ctx.fill();
  }
}

function drawOruroFallback(ctx) {
  ctx.fillStyle = '#8a6a3a';
  ctx.beginPath(); ctx.arc(600, 330, 90, Math.PI, 0); ctx.fill();
  text(ctx, 'ORURO', 600, 420, 40, '#e8d23a', 'center');
}

function drawTruck(ctx, img, x, y, stage, t) {
  x = Math.round(x);
  y = Math.round(y);
  ctx.imageSmoothingEnabled = false;
  if (img) {
    const w = Math.round(img.width * CAR_SCALE), h = Math.round(img.height * CAR_SCALE);
    return ctx.drawImage(img, x - Math.round(w / 2), y - Math.round(h / 2), w, h);
  }
  ctx.fillStyle = '#140c1c';
  ctx.fillRect(x - 34, y - 50, 68, 100);
  ctx.fillStyle = '#1f3a8a';
  ctx.fillRect(x - 31, y - 47, 62, 94);
  ctx.fillStyle = '#2a2d36';
  ctx.fillRect(x - 26, y - 40, 52, 22);
  ctx.fillStyle = '#e83a3a';
  ctx.fillRect(x - 30, y + 40, 12, 5);
  ctx.fillRect(x + 18, y + 40, 12, 5);
}

function drawPerson(ctx, x, y, side, arm) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = '#140c1c';
  ctx.fillRect(x - 10, y - 40, 20, 40);
  ctx.fillStyle = '#1f2f6a';
  ctx.fillRect(x - 8, y - 30, 16, 28);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 8, y - 30, 2, 28);
  ctx.fillRect(x + 6, y - 30, 2, 28);
  ctx.fillStyle = '#c68a5c';
  ctx.fillRect(x - 6, y - 40, 12, 10);
  ctx.fillStyle = '#e83a3a';
  ctx.fillRect(x - 7, y - 42, 14, 4);
  if (arm) { ctx.fillStyle = '#1f2f6a'; ctx.fillRect(x - side * 8, y - 46, 4, 16); }
}

function drawLlamaFallback(ctx, x, y, dir, t) {
  y = Math.round(y);
  const step = Math.floor(t * 6) % 2;
  ctx.fillStyle = '#140c1c';
  ctx.fillRect(x - 20, y - 26, 40, 18);
  ctx.fillRect(x + dir * 12 - 5, y - 46, 10, 24);
  ctx.fillStyle = '#f0e2c8';
  ctx.fillRect(x - 18, y - 24, 36, 14);
  ctx.fillRect(x + dir * 12 - 3, y - 44, 6, 22);
  ctx.fillStyle = '#5a4030';
  for (const lx of [-14, -6, 6, 14]) ctx.fillRect(x + lx, y - 10, 3, 10 - (step && lx > 0 ? 3 : 0));
}

function drawBush(ctx, x, y, r) {
  x = Math.round(x); y = Math.round(y); r = Math.round(r);
  ctx.fillStyle = '#2f5a24';
  ctx.beginPath(); ctx.arc(x, y - r * 0.6, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4d8a33';
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.8, r * 0.6, 0, Math.PI * 2); ctx.fill();
}

function drawStone(ctx, x, y, r) {
  x = Math.round(x); y = Math.round(y); r = Math.round(r);
  ctx.fillStyle = '#140c1c';
  ctx.fillRect(x - r - 2, y - r - 2, r * 2 + 4, r + 4);
  ctx.fillStyle = '#8f8a80';
  ctx.fillRect(x - r, y - r, r * 2, r);
  ctx.fillStyle = '#b9b4a8';
  ctx.fillRect(x - r, y - r, r, Math.max(2, Math.round(r / 3)));
}

function drawPaja(ctx, x, y, k) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = '#8a6a2a';
  for (let i = -4; i <= 4; i++) {
    const h = Math.round((16 - Math.abs(i) * 2) * k);
    ctx.fillRect(x + i * 3, y - h, 2, h);
  }
  ctx.fillStyle = '#e8c870';
  for (let i = -3; i <= 3; i += 2) ctx.fillRect(x + i * 3, y - Math.round((14 - Math.abs(i) * 2) * k), 2, 4);
}

function drawTires(ctx, x, y) {
  y = Math.round(y);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#140c1c';
    ctx.fillRect(x - 15, y - 10 - i * 8, 30, 9);
    ctx.fillStyle = '#2b2b33';
    ctx.fillRect(x - 13, y - 9 - i * 8, 26, 6);
  }
}

function drawCone(ctx, x, y) {
  y = Math.round(y);
  ctx.fillStyle = '#140c1c';
  ctx.fillRect(x - 10, y - 26, 20, 28);
  ctx.fillStyle = '#ff7a1a';
  ctx.fillRect(x - 8, y - 4, 16, 4);
  ctx.fillRect(x - 6, y - 14, 12, 10);
  ctx.fillRect(x - 3, y - 24, 6, 10);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 6, y - 12, 12, 3);
}
