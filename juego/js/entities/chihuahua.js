import { Dog } from './dog.js';
import { CroquetteBag, drawBag } from './items.js';

// Chihuahua con chompita (nivel 2): si Faby lleva croquetas para Morita, le roba una
// bolsita y sale huyendo. Se recupera llamando a Tofu (lo persigue y lo asusta) o
// tirándole un premio (lo prefiere y suelta la bolsita). Si escapa, la bolsita se pierde.
// Sin croquetas que robar, se comporta como el perro ladrador: provoca a Tofu.
// A los perros no se les pega (hereda eso de Dog).

const FLEE = 250;
const STEAL_DIST = 46;

export class Chihuahua extends Dog {
  constructor(stage, sheet, x, y) {
    super(stage, sheet, x, y);
    this.name = 'CHIHUAHUA CON CHOMPITA';
    this.hurtbox = { x: -18, w: 36, z: 0, h: 40 };
    this.shadowW = 34;
    this.carrying = false;
    this.tried = false;     // solo intenta robar una vez
  }

  get alive() {
    return this.state !== 'leaving' && this.state !== 'flee' && !this.removed;
  }

  takeHit(hit, from) {
    // Tofu lo alcanza: del susto suelta la bolsita y se va.
    if (from === this.stage.tofu && this.carrying) {
      this.drop('¡GUAU! ¡SUÉLTALA!');
      this.setState('scared');
      return true;
    }
    return super.takeHit(hit, from);
  }

  distract(prop) {
    if (this.carrying) this.drop('¡ÑAM! (mejor el premio)');
    if (this.state === 'flee') this.setState('approach');
    super.distract(prop);
  }

  drop(text) {
    this.carrying = false;
    this.stage.foods.push(new CroquetteBag(this.stage, this.x, this.y + 6, true));
    this.stage.fx.text(this.x, this.y - 70, text, '#7df9ff', 10);
    this.stage.sfx('pickup');
    if (this.stage.tofu?.chaseTarget === this) this.stage.tofu.chaseTarget = null;
  }

  think(dt) {
    const p = this.stage.player;
    const st = this.stage;
    switch (this.state) {
      case 'approach':
      case 'bark':
        // Va directo a Faby a robarle una bolsita.
        if (!this.tried && (st.croquettes ?? 0) > 0) {
          const dx = p.x - this.x;
          const dy = p.y - this.y;
          this.facing = Math.sign(dx) || this.facing;
          this.vx = Math.sign(dx) * 300;
          this.y += Math.sign(dy) * Math.min(Math.abs(dy), 200 * dt);
          this.anim.play('run');
          if (Math.abs(dx) < STEAL_DIST && Math.abs(dy) < 16) this.steal();
          return;
        }
        return super.think(dt);
      case 'flee': {
        this.anim.play('run');
        this.vx = this.facing * FLEE;
        const cam = st.camera;
        if (this.x < cam.left - 60 || this.x > cam.right + 60) {
          st.fx.text(p.x, p.y - 170, '¡SE LLEVÓ LAS CROQUETAS!', '#ff4040', 12);
          st.croquettesLost = (st.croquettesLost ?? 0) + 1;
          if (st.tofu?.chaseTarget === this) st.tofu.chaseTarget = null;
          this.removed = true;
        }
        return;
      }
      case 'scared':
        this.vx = 0;
        this.anim.play('scared');
        if (this.stateTime > 1) this.leave();
        return;
    }
    super.think(dt);
  }

  steal() {
    const st = this.stage;
    this.tried = true;
    this.carrying = true;
    st.croquettes--;
    st.fx.text(this.x, this.y - 80, '¡JE JE!', '#ffd23f', 12);
    st.fx.text(st.player.x, st.player.y - 170, '¡ME ROBÓ LAS CROQUETAS!', '#ff6b3d', 11);
    st.banner = { text: '¡LLAMA A TOFU!', sub: 'O TÍRALE UN PREMIO', time: 1.6 };
    st.sfx('dogBark');
    // Huye hacia el borde más lejano.
    const cam = st.camera;
    this.facing = this.x - cam.left > cam.right - this.x ? -1 : 1;
    this.setState('flee');
  }

  draw(ctx, camX) {
    super.draw(ctx, camX);
    if (this.carrying) drawBag(ctx, this.x - camX + this.facing * 20, this.y - this.z - 14, 0.6);
  }
}
