/**
 * Free Field: a small 2D map (Numberwood) drawn with shapes, no image assets yet.
 * Walk with arrow keys / WASD or tap where to go. Touching a monster starts a battle,
 * which React shows on top of the canvas.
 */
import Phaser from 'phaser';

export interface FieldMonster {
  id: number;
  level: number;
}

export interface FieldOptions {
  playerLevel: number;
  onEncounter: (monster: FieldMonster) => void;
}

export interface FieldHandle {
  /** Call after a battle. Pass the monster id if it was defeated. */
  resume(defeatedId: number | null): void;
  setPlayerLevel(level: number): void;
  destroy(): void;
}

const W = 960;
const H = 540;
/** Monster body colour per question tier (T1..T4). Chosen to stand out from grass and trees. */
const TIER_COLOURS = [0xffd166, 0xb794f6, 0xf08a4b, 0xe0566e];

class FieldScene extends Phaser.Scene {
  private opts: FieldOptions;
  private player!: Phaser.Physics.Arcade.Sprite;
  private monsters!: Phaser.Physics.Arcade.Group;
  private labels = new Map<number, Phaser.GameObjects.Text>();
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private target: Phaser.Math.Vector2 | null = null;
  private inBattle = false;
  private safeUntil = 0;
  private nextId = 1;

  constructor(opts: FieldOptions) {
    super('field');
    this.opts = opts;
  }

  create() {
    this.physics.world.setBounds(0, 0, W, H);
    this.makeTextures();
    this.drawGround();

    const trees = this.physics.add.staticGroup();
    const rnd = new Phaser.Math.RandomDataGenerator(['numberwood']);
    for (let i = 0; i < 16; i++) {
      const x = rnd.between(40, W - 40);
      const y = rnd.between(40, H - 40);
      if (Math.abs(x - W / 2) < 90 && Math.abs(y - H / 2) < 90) continue; // keep the start area free
      this.add.circle(x + 4, y + 6, 22, 0x000000, 0.15);
      const tree = this.add.circle(x, y, 22, 0x2e7d4f).setStrokeStyle(3, 0x1f5a37);
      this.add.circle(x - 7, y - 7, 7, 0x4caf74);
      trees.add(tree);
    }

    this.player = this.physics.add.sprite(W / 2, H / 2, 'player').setDepth(2);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCircle(16, 6, 14);
    body.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, trees);

    this.monsters = this.physics.add.group();
    for (let i = 0; i < 6; i++) this.spawnMonster();
    this.physics.add.collider(this.monsters, trees);
    this.physics.add.overlap(this.player, this.monsters, (_p, m) => this.encounter(m as Phaser.Physics.Arcade.Sprite));

    this.keys = this.input.keyboard!.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      this.target = new Phaser.Math.Vector2(ptr.worldX, ptr.worldY);
    });
    this.time.addEvent({ delay: 1800, loop: true, callback: () => this.wander() });

    this.add
      .text(14, 12, 'Numberwood · โซนฝึกจำนวนเต็ม', { fontFamily: 'Noto Sans Thai, sans-serif', fontSize: '18px', color: '#ffffff' })
      .setShadow(1, 1, '#1b3d2a', 3);
  }

  /** Draws the wizard and the monsters once, as textures (no image files needed yet). */
  private makeTextures() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const ink = 0x222244;
    // player: 44 x 52, body centre at (22, 30)
    g.fillStyle(0xffffff).fillCircle(22, 30, 19);
    g.fillStyle(0x4f6bff).fillCircle(22, 30, 16);
    g.fillStyle(0xffe0bd).fillCircle(22, 27, 9);
    g.fillStyle(ink).fillCircle(18.5, 27, 1.6).fillCircle(25.5, 27, 1.6);
    g.fillStyle(0x6a3fd6).fillTriangle(7, 21, 37, 21, 22, 0);
    g.fillStyle(0xf5c04a).fillRect(10, 18, 24, 4);
    g.generateTexture('player', 44, 52);
    g.clear();
    // monsters: 40 x 42, body centre at (20, 22)
    TIER_COLOURS.forEach((colour, i) => {
      if (i >= 2) g.fillStyle(ink).fillTriangle(5, 12, 11, 2, 16, 11).fillTriangle(35, 12, 29, 2, 24, 11); // horns
      g.fillStyle(ink).fillCircle(20, 22, 18);
      g.fillStyle(colour).fillCircle(20, 22, 15);
      g.fillStyle(0xffffff).fillCircle(14, 19, 4.5).fillCircle(26, 19, 4.5);
      g.fillStyle(ink).fillCircle(15, 20, 2).fillCircle(27, 20, 2);
      g.fillRect(15, 28, 10, 2.5);
      g.generateTexture(`monster-${i}`, 40, 42);
      g.clear();
    });
    g.destroy();
  }

  private drawGround() {
    const g = this.add.graphics();
    g.fillStyle(0x86c46d).fillRect(0, 0, W, H);
    const rnd = new Phaser.Math.RandomDataGenerator(['grass']);
    for (let i = 0; i < 70; i++) {
      g.fillStyle(rnd.pick([0x7bb963, 0x93cf79, 0x8bc870]), 1);
      g.fillEllipse(rnd.between(0, W), rnd.between(0, H), rnd.between(30, 90), rnd.between(14, 40));
    }
    g.fillStyle(0xd9c48f, 1).fillRect(0, H / 2 - 18, W, 36); // path
    for (let i = 0; i < 25; i++) {
      g.fillStyle(rnd.pick([0xffffff, 0xffe066, 0xff8fab]), 1);
      g.fillCircle(rnd.between(0, W), rnd.between(0, H), 3);
    }
  }

  private spawnMonster() {
    const p = this.player;
    let x = 0;
    let y = 0;
    do {
      x = Phaser.Math.Between(40, W - 40);
      y = Phaser.Math.Between(40, H - 40);
    } while (p && Phaser.Math.Distance.Between(x, y, p.x, p.y) < 180);
    const level = Math.max(1, this.opts.playerLevel + Phaser.Math.Between(-1, 1));
    const tierIndex = level <= 5 ? 0 : level <= 10 ? 1 : level <= 15 ? 2 : 3;
    const m = this.monsters.create(x, y, `monster-${tierIndex}`) as Phaser.Physics.Arcade.Sprite;
    const id = this.nextId++;
    m.setData({ id, level });
    (m.body as Phaser.Physics.Arcade.Body).setCircle(15, 5, 7).setCollideWorldBounds(true).setBounce(1);
    this.labels.set(
      id,
      this.add
        .text(x, y - 30, `Lv.${level}`, { fontFamily: 'sans-serif', fontSize: '13px', color: '#ffffff', backgroundColor: '#222244' })
        .setPadding(4, 1, 4, 1)
        .setOrigin(0.5)
        .setDepth(3),
    );
  }

  private wander() {
    if (this.inBattle) return;
    this.monsters.getChildren().forEach((obj) => {
      const body = (obj as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.Body;
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.Between(0, 1) ? 45 : 0;
      body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    });
  }

  private encounter(m: Phaser.Physics.Arcade.Sprite) {
    if (this.inBattle || this.time.now < this.safeUntil) return;
    this.inBattle = true;
    this.target = null;
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.physics.pause();
    // let the answer box receive every key while the battle is open
    this.input.keyboard?.disableGlobalCapture();
    this.opts.onEncounter({ id: m.getData('id') as number, level: m.getData('level') as number });
  }

  resumeAfterBattle(defeatedId: number | null) {
    if (defeatedId !== null) {
      const m = this.monsters.getChildren().find((o) => (o as Phaser.Physics.Arcade.Sprite).getData('id') === defeatedId);
      if (m) {
        this.tweens.add({ targets: m, alpha: 0, scale: 1.8, duration: 300, onComplete: () => m.destroy() });
        this.labels.get(defeatedId)?.destroy();
        this.labels.delete(defeatedId);
        this.monsters.remove(m);
      }
      this.time.delayedCall(2500, () => this.spawnMonster());
    }
    this.safeUntil = this.time.now + 1500;
    this.inBattle = false;
    this.input.keyboard?.enableGlobalCapture();
    this.input.keyboard?.resetKeys();
    this.physics.resume();
  }

  setPlayerLevel(level: number) {
    this.opts.playerLevel = level;
  }

  update() {
    if (this.inBattle) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const k = this.keys;
    let vx = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
    let vy = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.W.isDown ? 1 : 0);
    if (vx || vy) {
      this.target = null;
    } else if (this.target) {
      const dx = this.target.x - this.player.x;
      const dy = this.target.y - this.player.y;
      if (Math.hypot(dx, dy) < 6) this.target = null;
      else {
        vx = dx;
        vy = dy;
      }
    }
    const len = Math.hypot(vx, vy) || 1;
    body.setVelocity((vx / len) * 190, (vy / len) * 190);

    this.monsters.getChildren().forEach((obj) => {
      const m = obj as Phaser.Physics.Arcade.Sprite;
      this.labels.get(m.getData('id') as number)?.setPosition(m.x, m.y - 30);
    });
  }
}

export function startField(parent: HTMLElement, opts: FieldOptions): FieldHandle {
  const scene = new FieldScene(opts);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W,
    height: H,
    backgroundColor: '#86c46d',
    physics: { default: 'arcade' },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene,
  });
  return {
    resume: (defeatedId) => scene.resumeAfterBattle(defeatedId),
    setPlayerLevel: (level) => scene.setPlayerLevel(level),
    destroy: () => game.destroy(true),
  };
}
