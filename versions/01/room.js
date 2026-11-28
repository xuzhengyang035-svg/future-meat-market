// Shop：Future Meat Market 品牌概念店.
// 陈列按“买肉 → 搭配 → 试吃 → 了解品牌 → 结算”的动线来排，而不是把货架塞满：
//   正面主墙  智能鲜肉柜 (主角）+ 左边“搭配好物” (酱料、香料：买肉的人会顺手带走的东西）+ 右边品牌广告屏和礼盒
//   左墙      “阳光牧场”插画墙 + 陶瓷动物摆件 + 吉祥物周边 (品牌用动物形象卖东西，而动物本身不在场）
//   中间      试吃台：现煎一块培养牛排
//   右墙      透明工坊参观入口 + 免费食谱卡
//   入口      玻璃门面、自助结算机、告示栏、购物篮、绿植、开业立牌
// 配色只用四种：奶油白 (底）、品牌红 (重点）、鼠尾草绿 (“自然”的暗示）、橡木色 (温度），外加炭灰做线条.
// 如果 assets/room_pano.jpg (360° 全景照片）存在，就用全景照片代替这些模型.
import * as THREE from 'three';
import { buildSmartFridge } from './fridge.js';
import { canvasTexture, streetTexture, drawAd } from './textures.js';
import { concreteMaps, wallMaps, blobShadow } from './materials.js';
import { meatGeometry, meatMaterial } from './meat.js';
import { makeAnimal } from './animals.js';
import { CERAMIC_BASE } from './data.js';

const SANS = '"Inter", "Noto Sans SC", "Microsoft YaHei", sans-serif';
const SERIF = '"Noto Serif SC", "Songti SC", "SimSun", serif';
const MONO = '"IBM Plex Mono", Consolas, monospace';
export const PALETTE = { cream: '#f3eee6', red: '#b3262d', sage: '#8fa38a', oak: '#c49a6c', ink: '#2a2b2d' };

const M = {
  ceil: new THREE.MeshStandardMaterial({ color: 0xf6f3ee, roughness: 1 }),
  oak: new THREE.MeshStandardMaterial({ color: 0xc49a6c, roughness: 0.62 }),
  oakDark: new THREE.MeshStandardMaterial({ color: 0x9c7550, roughness: 0.6 }),
  cream: new THREE.MeshStandardMaterial({ color: 0xf1ece3, roughness: 0.55 }),
  red: new THREE.MeshStandardMaterial({ color: 0xb3262d, roughness: 0.5 }),
  sage: new THREE.MeshStandardMaterial({ color: 0x8fa38a, roughness: 0.7 }),
  ink: new THREE.MeshStandardMaterial({ color: 0x2a2b2d, roughness: 0.45, metalness: 0.4 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xcfd3d5, roughness: 0.3, metalness: 1 }),
  ceramic: new THREE.MeshPhysicalMaterial({ color: 0xf7f5f0, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }),
  plushCream: new THREE.MeshStandardMaterial({ color: 0xf2e6d4, roughness: 1 }),
  plushPink: new THREE.MeshStandardMaterial({ color: 0xf0b9b4, roughness: 1 }),
  plushWhite: new THREE.MeshStandardMaterial({ color: 0xfbf8f2, roughness: 1 }),
  pink: new THREE.MeshStandardMaterial({ color: 0xe9a3a0, roughness: 0.6 }),
  black: new THREE.MeshStandardMaterial({ color: 0x1d1d1f, roughness: 0.4 }),
  grass: new THREE.MeshStandardMaterial({ color: 0x6f8f5c, roughness: 0.95 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x4f7044, roughness: 0.8, side: THREE.DoubleSide }),
  pot: new THREE.MeshStandardMaterial({ color: 0xd9cdbd, roughness: 0.85 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, transparent: true, opacity: 0.12, depthWrite: false }),
  basket: new THREE.MeshStandardMaterial({ color: 0xb3262d, roughness: 0.6 }),
  cork: new THREE.MeshStandardMaterial({ color: 0xb48a5c, roughness: 0.95 }),
  warm: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.3, 1.9) }),
  neon: new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 0.5, 0.55) }),
};

function box(w, h, d, m, x, y, z, parent) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}
function cyl(rt, rb, h, m, x, y, z, parent, seg = 24) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}
function sph(r, m, x, y, z, parent, sx = 1, sy = 1, sz = 1) {
  const o = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), m);
  o.position.set(x, y, z); o.scale.set(sx, sy, sz);
  parent.add(o);
  return o;
}
function plane(w, h, tex, x, y, z, ry, parent, basic = true) {
  const mat = basic ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }) : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
  const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  o.position.set(x, y, z); o.rotation.y = ry;
  parent.add(o);
  return o;
}
const sign = (lines, w, h, o = {}) => canvasTexture(w, h, (g, W, H) => {
  g.fillStyle = o.bg || PALETTE.cream; g.fillRect(0, 0, W, H);
  if (o.border) { g.strokeStyle = o.border; g.lineWidth = 4; g.strokeRect(8, 8, W - 16, H - 16); }
  for (const [txt, size, color, y, weight = 400, font = SANS, align = 'center', x = 0.5] of lines) {
    g.font = `${weight} ${size}px ${font}`; g.fillStyle = color; g.textAlign = align;
    const room = (align === 'center' ? Math.min(x, 1 - x) * 2 : align === 'left' ? 1 - x : x) * W - 16; let s = size;   // English is longer than the Chinese was: shrink a line that wouldn't fit
    while (s > 8 && g.measureText(txt).width > room) { s -= 2; g.font = `${weight} ${s}px ${font}`; }
    g.fillText(txt, W * x, H * y);
  }
});

// ------------------------------------------------------------------ “阳光牧场”插画墙
function muralTexture() {
  return canvasTexture(2400, 960, (g, W, H) => {
    const sky = g.createLinearGradient(0, 0, 0, H * 0.7);
    sky.addColorStop(0, '#dfe8e6'); sky.addColorStop(1, '#f3eee6');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = '#f2d9a8'; g.beginPath(); g.arc(W * 0.8, H * 0.24, 90, 0, Math.PI * 2); g.fill();
    const hill = (y0, amp, col, ph) => {
      g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= W; x += 20) g.lineTo(x, y0 + Math.sin(x / W * Math.PI * 2 + ph) * amp + Math.sin(x / W * 9 + ph) * amp * 0.25);
      g.lineTo(W, H); g.fill();
    };
    hill(H * 0.52, 40, '#b7c7ad', 0.5);
    hill(H * 0.62, 34, '#9fb394', 2.2);
    hill(H * 0.74, 26, '#8fa38a', 4.0);
    // 栅栏
    g.strokeStyle = '#f7f3ea'; g.lineWidth = 6;
    for (let x = 60; x < W * 0.6; x += 70) { g.beginPath(); g.moveTo(x, H * 0.7); g.lineTo(x, H * 0.62); g.stroke(); }
    g.beginPath(); g.moveTo(40, H * 0.645); g.lineTo(W * 0.6, H * 0.645); g.moveTo(40, H * 0.675); g.lineTo(W * 0.6, H * 0.675); g.stroke();
    // 卡通动物：都在笑
    const smile = (x, y, r) => { g.strokeStyle = '#2a2b2d'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, r, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); };
    const eye = (x, y) => { g.fillStyle = '#2a2b2d'; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); };
    // 牛
    const cow = (cx, cy, s) => {
      g.save(); g.translate(cx, cy); g.scale(s, s);
      g.fillStyle = '#fbf8f2'; g.beginPath(); g.ellipse(0, 0, 120, 70, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2a2b2d'; g.beginPath(); g.ellipse(-40, -20, 30, 22, 0.4, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(40, 20, 24, 18, -0.3, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fbf8f2'; for (const x of [-80, -40, 40, 80]) g.fillRect(x - 12, 40, 24, 70);
      g.beginPath(); g.ellipse(140, -40, 55, 50, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f0b9b4'; g.beginPath(); g.ellipse(160, -15, 40, 26, 0, 0, Math.PI * 2); g.fill();
      eye(130, -55); eye(160, -55); smile(160, -22, 14);
      g.restore();
    };
    const pig = (cx, cy, s) => {
      g.save(); g.translate(cx, cy); g.scale(s, s);
      g.fillStyle = '#f0b9b4'; g.beginPath(); g.ellipse(0, 0, 95, 65, 0, 0, Math.PI * 2); g.fill();
      for (const x of [-55, -20, 20, 55]) g.fillRect(x - 11, 40, 22, 50);
      g.beginPath(); g.arc(105, -20, 48, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e59a95'; g.beginPath(); g.ellipse(140, -12, 20, 15, 0, 0, Math.PI * 2); g.fill();
      eye(100, -35); eye(125, -38); smile(118, -8, 12);
      g.restore();
    };
    const hen = (cx, cy, s) => {
      g.save(); g.translate(cx, cy); g.scale(s, s);
      g.fillStyle = '#fbf8f2'; g.beginPath(); g.ellipse(0, 0, 55, 48, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(40, -45, 30, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#b3262d'; g.beginPath(); g.arc(35, -78, 10, 0, Math.PI * 2); g.arc(48, -76, 9, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e8b04a'; g.beginPath(); g.moveTo(68, -48); g.lineTo(88, -42); g.lineTo(68, -36); g.fill();
      eye(48, -52);
      g.restore();
    };
    cow(W * 0.2, H * 0.66, 1.0);
    pig(W * 0.45, H * 0.74, 0.9);
    hen(W * 0.62, H * 0.7, 1.0);
    hen(W * 0.68, H * 0.75, 0.75);
    // 池塘与鱼
    g.fillStyle = '#c9dde0'; g.beginPath(); g.ellipse(W * 0.85, H * 0.82, 200, 50, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8b04a'; g.beginPath(); g.ellipse(W * 0.84, H * 0.82, 30, 12, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(W * 0.84 + 28, H * 0.82); g.lineTo(W * 0.84 + 48, H * 0.82 - 12); g.lineTo(W * 0.84 + 48, H * 0.82 + 12); g.fill();
    // 文案
    g.fillStyle = '#2a2b2d'; g.textAlign = 'left';
    g.font = `500 96px ${SERIF}`; g.fillText('From Sunshine Farm', 90, 170);
    g.font = `400 34px ${SANS}`; g.fillStyle = '#5d5a57';
    g.fillText('Every delicious bite begins with a good life.', 94, 230);
    g.font = `500 22px ${MONO}`; g.fillStyle = PALETTE.red;
    g.fillText('FROM SUNNY PASTURES · SINCE 2021', 94, 280);
    g.font = `400 18px ${SANS}`; g.fillStyle = '#8a8580'; g.textAlign = 'right';
    g.fillText('*Illustration only', W - 40, H - 24);
  });
}

// ------------------------------------------------------------------ 绿植
function plant(parent, x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g);
  cyl(0.2, 0.16, 0.42, M.pot, 0, 0.21, 0, g, 20);
  cyl(0.012, 0.018, 1.0, M.oakDark, 0, 0.8, 0, g, 6);
  const leafGeo = new THREE.SphereGeometry(0.12, 10, 6); leafGeo.scale(1, 0.18, 0.6);
  for (let i = 0; i < 22; i++) {
    const a = i * 2.4, y = 0.75 + (i / 22) * 0.8, r = 0.12 + Math.sin(i) * 0.05;
    const l = new THREE.Mesh(leafGeo, M.leaf);
    l.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    l.rotation.set(Math.sin(i) * 0.6, -a, 0.5);
    g.add(l);
  }
}

// ------------------------------------------------------------------ 场景
export function createRoom(env) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe9e4dc);
  scene.environment = env;
  scene.environmentIntensity = 0.5;
  const room = new THREE.Group();
  scene.add(room);
  const blobMat = new THREE.MeshBasicMaterial({ map: blobShadow(), transparent: true, depthWrite: false, opacity: 0.7 });
  const blob = (x, z, sx, sz = sx) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), blobMat); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.004, z); room.add(p); };
  const wallMat = (w, h, o = {}) => new THREE.MeshStandardMaterial({ ...wallMaps(w, h, { color: [240, 235, 227], panel: 99, ao: 0.28, ...o }), roughness: 0.9 });

  // 地面：浅色水磨石;墙：奶油白;days花：嵌入式筒灯
  const fl = concreteMaps([214, 208, 198], 'terrazzo');
  for (const t of [fl.map, fl.roughnessMap, fl.normalMap]) t.repeat.set(4, 3.6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 9), new THREE.MeshStandardMaterial({ ...fl, roughness: 0.75, normalScale: new THREE.Vector2(0.3, 0.3) }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 0.5);
  room.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(10, 9), M.ceil);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3.2, 0.5);
  room.add(ceil);
  for (const x of [-3.6, -1.2, 1.2, 3.6]) for (const z of [-2.8, -0.6, 1.6, 3.8]) {
    const d = cyl(0.07, 0.07, 0.01, M.warm, x, 3.195, z, room, 20);
    d.renderOrder = 1;
  }
  box(10, 3.2, 0.1, wallMat(10, 3.2), 0, 1.6, -4.05, room);
  box(0.1, 3.2, 9, wallMat(9, 3.2), -5.05, 1.6, 0.5, room);
  box(0.1, 3.2, 3.0, wallMat(3.0, 3.2), 5.05, 1.6, -2.6, room);     // 右墙被参观入口分成两段
  box(0.1, 3.2, 4.5, wallMat(4.5, 3.2), 5.05, 1.6, 2.75, room);
  box(0.1, 0.7, 1.6, wallMat(1.6, 0.7, { ao: 0 }), 5.05, 2.85, -0.3, room);
  box(3.8, 3.2, 0.1, wallMat(3.8, 3.2), 3.1, 1.6, 5.05, room);
  box(6.2, 0.6, 0.1, wallMat(6.2, 0.6, { ao: 0 }), -1.9, 2.9, 5.05, room);
  for (const [w, d, x, z] of [[10, 0.02, 0, -3.99], [0.02, 9, -4.99, 0.5]]) box(w, 0.08, d, M.oakDark, x, 0.04, z, room);

  // ---------------------------------------------------------------- 正面主墙：鲜肉柜是主角
  const smart = buildSmartFridge();
  smart.group.position.set(0, 0, -3.62);
  room.add(smart.group);
  blob(0, -3.4, 1.9, 1.2);
  // 品牌标识墙 + 霓虹标志
  plane(3.4, 0.5, sign([['FUTURE MEAT MARKET', 92, PALETTE.ink, 0.62, 500, SANS], ['GROWN, NOT RAISED.', 30, PALETTE.red, 0.94, 500, MONO]], 1700, 260, { bg: '#f0ebe2' }), 0, 2.72, -3.99, 0, room, false);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.012, 10, 48), M.neon); ring.position.set(-2.0, 2.72, -3.97); room.add(ring);
  sph(0.05, M.neon, -2.0, 2.72, -3.97, room);
  const ring2 = ring.clone(); ring2.position.x = 2.0; room.add(ring2);
  sph(0.05, M.neon, 2.0, 2.72, -3.97, room);

  // 左：搭配好物 (橡木开放层架 + 统一包装的酱料、香料）
  const shelfX = -2.75;
  const unit = new THREE.Group(); unit.position.set(shelfX, 0, -3.78); room.add(unit);
  box(2.9, 0.06, 0.4, M.oak, 0, 0.08, 0, unit);
  for (const x of [-1.42, 1.42]) box(0.05, 2.1, 0.4, M.oak, x, 1.05, 0, unit);
  box(2.9, 2.1, 0.02, M.cream, 0, 1.05, -0.19, unit);
  const levels = [0.5, 0.92, 1.34, 1.76];
  for (const y of levels) box(2.84, 0.035, 0.38, M.oak, 0, y, 0, unit);
  const bottleGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.2, 16);
  const capGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.04, 12);
  const jarGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.1, 18);
  const bandGeo = new THREE.CylinderGeometry(0.037, 0.037, 0.07, 16);
  const N = 160;
  const bottles = new THREE.InstancedMesh(bottleGeo, new THREE.MeshPhysicalMaterial({ roughness: 0.15, clearcoat: 1 }), N);
  const caps = new THREE.InstancedMesh(capGeo, new THREE.MeshStandardMaterial({ roughness: 0.4 }), N);
  const bands = new THREE.InstancedMesh(bandGeo, new THREE.MeshStandardMaterial({ roughness: 0.7 }), N);
  const jars = new THREE.InstancedMesh(jarGeo, new THREE.MeshStandardMaterial({ roughness: 0.6 }), N);
  const m4 = new THREE.Matrix4(), c = new THREE.Color();
  const LINES = [  // 每一层一个系列，颜色统一
    { kind: 'bottle', body: 0x5b2a1e, cap: 0xb3262d, band: 0xf1ece3 },   // 烧烤酱
    { kind: 'jar', body: 0xf1ece3, cap: 0x8fa38a, band: 0x8fa38a },      // 香草盐
    { kind: 'bottle', body: 0xc59a3e, cap: 0x2a2b2d, band: 0xf1ece3 },   // 橄榄油
    { kind: 'jar', body: 0xb3262d, cap: 0xf1ece3, band: 0xb3262d },      // 辣椒酱
  ];
  let nb = 0, nj = 0;
  levels.forEach((y, li) => {
    const L = LINES[li];
    for (let x = -1.3; x <= 1.3; x += L.kind === 'jar' ? 0.11 : 0.085) {
      for (const z of [0.09, -0.02]) {
        if (L.kind === 'bottle') {
          m4.makeTranslation(x, y + 0.12, z); bottles.setMatrixAt(nb, m4); bottles.setColorAt(nb, c.set(L.body));
          m4.makeTranslation(x, y + 0.24, z); caps.setMatrixAt(nb, m4); caps.setColorAt(nb, c.set(L.cap));
          m4.makeTranslation(x, y + 0.1, z); bands.setMatrixAt(nb, m4); bands.setColorAt(nb, c.set(L.band));
          nb++;
        } else {
          m4.makeTranslation(x, y + 0.07, z); jars.setMatrixAt(nj, m4); jars.setColorAt(nj, c.set(L.body));
          nj++;
          m4.makeScale(2.4, 0.6, 2.4).setPosition(x, y + 0.13, z); caps.setMatrixAt(N - nj, m4); caps.setColorAt(N - nj, c.set(L.cap));
        }
      }
    }
  });
  bottles.count = nb; bands.count = nb; jars.count = nj;
  for (let i = nb; i < N - nj; i++) caps.setMatrixAt(i, m4.makeScale(0, 0, 0));
  unit.add(bottles, caps, bands, jars);
  ['BBQ sauce £3.20', 'Herb sea salt £2.80', 'Extra virgin olive oil £6.80', 'Chilli sauce £2.60'].forEach((t, i) =>
    plane(0.32, 0.05, sign([[t, 26, PALETTE.ink, 0.72, 500]], 320, 50, { bg: '#fbf8f2' }), -1.0 + (i % 2) * 2.0, levels[i] - 0.005, 0.2, 0, unit, false));
  plane(1.2, 0.18, sign([['PAIRINGS', 40, '#fff', 0.68, 500]], 600, 90, { bg: PALETTE.red }), 0, 2.28, -0.17, 0, unit);
  blob(shelfX, -3.6, 3.2, 0.9);

  // 右：品牌广告屏 + 礼盒陈列台
  const ad = canvasTexture(1024, 580, (g, W, H) => drawAd(g, W, H, 0));
  const tv = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.68), new THREE.MeshBasicMaterial({ map: ad, toneMapped: false }));
  tv.position.set(2.55, 2.0, -3.97);
  room.add(tv);
  box(1.26, 0.74, 0.04, M.ink, 2.55, 2.0, -4.0, room);
  const gift = new THREE.Group(); gift.position.set(2.75, 0, -3.35); room.add(gift);
  box(2.2, 0.62, 0.6, M.oak, 0, 0.31, 0, gift);
  box(2.24, 0.03, 0.64, M.cream, 0, 0.635, 0, gift);
  const giftBox = (x, y, z, w, h, d, m, ry = 0) => {
    const b = box(w, h, d, m, x, y + h / 2, z, gift); b.rotation.y = ry;
    const rib = m === M.red ? M.cream : M.red;
    box(w + 0.004, h + 0.004, 0.025, rib, 0, 0, 0, b); box(0.025, h + 0.004, d + 0.004, rib, 0, 0, 0, b);
  };
  giftBox(-0.6, 0.65, 0, 0.36, 0.16, 0.28, M.red, 0.1);
  giftBox(-0.6, 0.81, 0, 0.3, 0.14, 0.24, M.cream, -0.1);
  giftBox(-0.1, 0.65, 0.05, 0.4, 0.18, 0.3, M.cream, -0.05);
  giftBox(0.45, 0.65, -0.02, 0.36, 0.16, 0.28, M.red, 0.15);
  giftBox(0.45, 0.81, -0.02, 0.32, 0.12, 0.24, M.red, 0.0);
  const gs = plane(0.26, 0.16, sign([['Farm gift box', 40, PALETTE.ink, 0.42, 500], ['GIFT SET ¥398', 26, PALETTE.red, 0.8, 500, MONO]], 260, 160, { bg: '#fbf8f2' }), 0.85, 0.75, 0.15, -0.3, gift, false);
  gs.rotation.x = -0.2;
  blob(2.75, -3.3, 2.6, 1.0);

  // ---------------------------------------------------------------- 左墙：阳光牧场插画 + 动物摆件 + 吉祥物周边
  plane(6.4, 2.56, muralTexture(), -4.99, 1.72, -0.6, Math.PI / 2, room, false);
  box(0.4, 0.3, 4.0, M.oak, -4.78, 0.15, -1.6, room);                  // 草皮花槽
  const turf = box(0.36, 0.06, 3.96, M.grass, -4.78, 0.31, -1.6, room);
  turf.scale.y = 1;
  for (let i = 0; i < 70; i++) {                                         // 一丛丛小草
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.09 + (i % 5) * 0.02, 4), M.grass);
    b.position.set(-4.78 + Math.sin(i * 7.1) * 0.15, 0.37, -3.5 + (i / 70) * 3.8);
    room.add(b);
  }
  // 陶瓷动物摆件：手工釉面，像展品一样放在台座上;底座底部印着编号 (翻过来才看得到）
  const figurines = [];
  [['cow', -3.0], ['pig', -1.9], ['hen', -0.8]].forEach(([k, z], i) => {
    const h = 0.75 + (i % 2) * 0.2;
    box(0.46, h, 0.46, M.cream, -4.45, h / 2, z, room);
    box(0.48, 0.02, 0.48, M.oak, -4.45, h + 0.01, z, room);
    const fig = new THREE.Group(); fig.position.set(-4.45, h + 0.02, z); fig.rotation.y = 0.9; room.add(fig);
    const pivot = new THREE.Group(); pivot.position.y = 0.12; fig.add(pivot);
    const inner = new THREE.Group(); inner.position.y = -0.12; pivot.add(inner);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.175, 0.025, 48), M.ceramic);
    base.scale.set(k === 'hen' ? 0.7 : 1.15, 1, k === 'hen' ? 0.7 : 0.62); base.position.y = 0.0125; inner.add(base);
    const a = makeAnimal(k, 'ceramic'); a.position.set(k === 'hen' ? -0.01 : -0.03, 0.024, 0); a.scale.setScalar(k === 'hen' ? 0.95 : 0.78);
    inner.add(a);
    const [no, cell, date] = CERAMIC_BASE[i];
    const stamp = plane(0.2, 0.2, canvasTexture(400, 400, (g, W, H) => {
      g.fillStyle = '#f7f5f0'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#2f5d8a'; g.lineWidth = 5; g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 30, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#2f5d8a'; g.textAlign = 'center';
      g.font = `500 30px ${SERIF}`; g.fillText('This series', W / 2, 120);
      g.fillText('In honour of our first donors', W / 2, 160);
      g.font = `600 54px ${MONO}`; g.fillText(no, W / 2, 238);
      g.font = `500 26px ${MONO}`; g.fillText(`${cell} · ${date}`, W / 2, 284);
    }), 0, -0.001, 0, 0, inner, false);
    stamp.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
    stamp.scale.setScalar(k === 'hen' ? 0.62 : 0.85);
    figurines.push({ fig, pivot, kind: k });
    blob(-4.45, z, 0.8);
  });
  // 吉祥物周边：毛绒公仔和帆布袋
  const merch = new THREE.Group(); merch.position.set(-4.65, 0, 1.6); room.add(merch);
  box(0.04, 1.5, 1.6, M.oak, -0.28, 0.75, 0, merch);                      // 背板
  for (const z of [-0.8, 0.8]) box(0.6, 1.5, 0.04, M.oak, 0, 0.75, z, merch);
  box(0.6, 0.12, 1.6, M.oakDark, 0, 0.06, 0, merch);
  for (const y of [0.45, 0.9, 1.31]) box(0.58, 0.03, 1.56, M.cream, 0, y, 0, merch);
  [['cow', -0.5, 0.62], ['pig', 0, 0.62], ['hen', 0.5, 0.8]].forEach(([k, z, sc]) => {
    for (const [y, dz] of [[0.915, 0], [1.325, 0.05]]) {
      const a = makeAnimal(k, 'plush'); a.position.set(0.02, y, z + dz); a.rotation.y = -0.75; a.scale.setScalar(sc);
      merch.add(a);
    }
  });
  for (const z of [-0.5, 0, 0.5]) {
    const bag = box(0.05, 0.36, 0.3, M.cream, 0.05, 0.645, z, merch);
    plane(0.22, 0.22, sign([['GROWN', 44, PALETTE.ink, 0.42, 600], ['NOT RAISED', 30, PALETTE.red, 0.72, 600]], 200, 200, { bg: '#f1ece3' }), 0.026, 0, 0, Math.PI / 2, bag, false);
  }
  plane(0.9, 0.16, sign([['Mascot goods from £5.90', 38, '#fff', 0.68, 500]], 560, 100, { bg: PALETTE.sage }), -4.9, 1.78, 1.6, Math.PI / 2, room);
  blob(-4.6, 1.6, 1.0, 2.0);

  // ---------------------------------------------------------------- 中间：试吃台
  const island = new THREE.Group(); island.position.set(-2.1, 0, -0.5); island.rotation.y = Math.PI / 2; room.add(island);
  box(2.0, 0.88, 0.8, M.cream, 0, 0.44, 0, island);
  box(2.06, 0.05, 0.86, M.oak, 0, 0.905, 0, island);
  box(2.0, 0.08, 0.8, M.oakDark, 0, 0.04, 0, island);
  plane(0.9, 0.3, sign([['Free tasting', 64, PALETTE.ink, 0.5, 500, SERIF], ['FREE TASTING · seared cultivated steak', 26, PALETTE.red, 0.85, 500, MONO]], 900, 300, { bg: '#f1ece3' }), 0, 0.55, 0.401, 0, island, false);
  box(0.5, 0.012, 0.36, M.black, -0.45, 0.935, 0, island);              // 电磁炉
  for (const x of [-0.56, -0.34]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.003, 6, 32), new THREE.MeshBasicMaterial({ color: 0x555555 })); r.rotation.x = Math.PI / 2; r.position.set(x, 0.942, 0); island.add(r); }
  const pan = cyl(0.13, 0.11, 0.04, M.ink, -0.45, 0.96, 0, island, 32);
  const handle = box(0.2, 0.02, 0.03, M.ink, -0.45 + 0.22, 0.97, 0, island);
  const steak = new THREE.Mesh(meatGeometry('beef'), meatMaterial('beef'));
  steak.scale.setScalar(0.22); steak.position.set(-0.45, 0.995, 0); island.add(steak);
  steak.material.userData.uniforms.uColor.value = 0.95;
  const plate = cyl(0.14, 0.12, 0.015, M.ceramic, 0.25, 0.94, 0, island, 32);
  for (let i = 0; i < 9; i++) {
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.02, 0.025), steak.material);
    const a = i / 9 * Math.PI * 2;
    cube.position.set(0.25 + Math.cos(a) * 0.08, 0.958, Math.sin(a) * 0.08); cube.rotation.y = a;
    island.add(cube);
    cyl(0.0015, 0.0015, 0.06, M.oak, cube.position.x, 0.985, cube.position.z, island, 4);
  }
  cyl(0.05, 0.05, 0.1, M.cream, 0.6, 0.98, 0.15, island, 16);           // 牙签筒
  // 评价平板：放在台面靠顾客一侧，走近才能点
  const tab = new THREE.Group(); tab.position.set(0.62, 0.93, 0.2); island.add(tab);
  box(0.1, 0.012, 0.08, M.ink, 0, 0.006, 0, tab);
  const arm = box(0.02, 0.1, 0.02, M.ink, 0, 0.055, -0.01, tab); arm.rotation.x = -0.35;
  const tabBody = new THREE.Group(); tabBody.position.set(0, 0.16, 0); tabBody.rotation.x = -0.45; tab.add(tabBody);
  box(0.28, 0.2, 0.012, M.ink, 0, 0, -0.007, tabBody);
  const tabScreen = plane(0.26, 0.18, sign([['Have a taste and tell us', 34, '#fff', 0.42, 500], ['Review for a £3 voucher', 26, '#f0b9b4', 0.66, 500]], 520, 360, { bg: PALETTE.red }), 0, 0, 0.0005, 0, tabBody);
  for (const x of [-0.6, 0.6]) {                                         // 吊灯
    cyl(0.004, 0.004, 1.0, M.ink, x, 2.7, 0, island, 4);
    const shade = cyl(0.07, 0.2, 0.2, M.red, x, 2.12, 0, island, 24);
    shade.material = new THREE.MeshStandardMaterial({ color: 0xb3262d, roughness: 0.5, side: THREE.DoubleSide });
    cyl(0.06, 0.06, 0.01, M.warm, x, 2.03, 0, island, 16);
    const l = new THREE.SpotLight(0xffe2c0, 4.5, 3.2, 0.8, 0.6, 1.2);
    l.position.set(x, 2.02, 0); l.target.position.set(x, 0.9, 0);
    island.add(l, l.target);
  }
  for (const x of [-0.5, 0.5]) {                                         // 高脚凳
    cyl(0.17, 0.17, 0.05, M.oak, x, 0.68, 0.7, island, 24);
    cyl(0.02, 0.02, 0.66, M.ink, x, 0.33, 0.7, island, 8);
    cyl(0.18, 0.18, 0.015, M.ink, x, 0.008, 0.7, island, 24);
  }
  blob(-2.1, -0.5, 1.4, 2.6);

  // ---------------------------------------------------------------- 右墙：透明工坊参观入口 + 食谱卡
  const hall = new THREE.Group(); hall.position.set(5.1, 0, -0.3); room.add(hall);
  box(2.4, 0.02, 1.6, M.ink, 1.2, 0.0, 0, hall);
  box(2.4, 2.5, 0.05, M.ink, 1.2, 1.25, -0.8, hall);
  box(2.4, 2.5, 0.05, M.ink, 1.2, 1.25, 0.8, hall);
  box(2.4, 0.05, 1.6, M.ink, 1.2, 2.5, 0, hall);
  plane(1.5, 2.45, canvasTexture(256, 400, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#f4f7f8'); gr.addColorStop(1, '#cfd8dc');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.filter = 'blur(6px)'; g.fillStyle = '#9aa3a8';
    for (const x of [30, 120, 200]) { g.beginPath(); g.roundRect(x, 120, 50, 200, 24); g.fill(); }
    g.filter = 'none';
  }), 2.38, 1.23, 0, -Math.PI / 2, hall);
  for (let i = 0; i < 4; i++) box(0.4, 0.008, 0.06, M.warm, 0.4 + i * 0.55, 2.47, 0, hall);
  plane(1.5, 0.3, sign([['Open workshop · gallery entrance  →', 46, '#fff', 0.5, 500], ['TRANSPARENT WORKSHOP · FREE ENTRY', 20, 'rgba(255,255,255,.75)', 0.86, 500, MONO]], 750, 150, { bg: PALETTE.ink }), 4.985, 2.85, -0.3, -Math.PI / 2, room);
  const stand = new THREE.Group(); stand.position.set(4.35, 0, 0.75); stand.rotation.y = -Math.PI / 2 + 0.35; room.add(stand);
  cyl(0.18, 0.2, 0.03, M.ink, 0, 0.015, 0, stand, 24);
  cyl(0.015, 0.015, 1.0, M.ink, 0, 0.5, 0, stand, 8);
  const sb = plane(0.42, 0.56, sign([['Through the glass', 52, PALETTE.ink, 0.25, 500, SERIF], ['See your portion', 52, PALETTE.ink, 0.4, 500, SERIF], ['Growing slowly', 52, PALETTE.ink, 0.55, 500, SERIF],
    ['Free visits · daily 10:00–21:00', 22, PALETTE.red, 0.75, 500], ['FREE ENTRY', 22, '#8a8580', 0.86, 500, MONO]], 420, 560, { bg: '#fbf8f2', border: PALETTE.red }), 0, 1.25, 0.012, 0, stand, false);
  sb.rotation.x = -0.05;
  // 食谱卡架
  box(0.06, 0.9, 1.2, M.oak, 4.98, 1.45, 2.4, room);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) {
    plane(0.22, 0.26, sign([['Recipes', 34, PALETTE.ink, 0.3, 500, SERIF], [['Seared steak', 'Slow-roast pork chop', 'Chicken salad', 'Steamed croaker'][k], 24, PALETTE.ink, 0.55, 400], ['RECIPE', 18, PALETTE.red, 0.82, 500, MONO]], 220, 260, { bg: ['#f1ece3', '#e9efe6', '#f1ece3', '#f6e3e1'][k] }), 4.94, 1.12 + r * 0.3, 1.98 + k * 0.28, -Math.PI / 2, room, false);
  }
  plane(0.9, 0.14, sign([['Free recipes · take one', 36, '#fff', 0.68, 500]], 600, 90, { bg: PALETTE.sage }), 4.97, 2.08, 2.4, -Math.PI / 2, room);

  // 灯箱海报：“快乐的动物”，几张轮播
  box(0.06, 1.42, 1.06, M.ink, 5.0, 1.55, -2.6, room);
  const lightbox = plane(0.96, 1.28, canvasTexture(8, 8, (g) => { g.fillStyle = '#f3eee6'; g.fillRect(0, 0, 8, 8); }), 4.965, 1.55, -2.6, -Math.PI / 2, room);

  // ---------------------------------------------------------------- 入口：玻璃门面、结算、告示栏、购物篮、绿植、立牌
  const street = new THREE.Mesh(new THREE.PlaneGeometry(18, 7.8), new THREE.MeshBasicMaterial({ map: streetTexture(), toneMapped: false }));
  street.position.set(-1, 2.2, 9); street.rotation.y = Math.PI;
  room.add(street);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 2.6), M.glass);
  glass.position.set(-1.9, 1.3, 5.02);
  room.add(glass);
  for (const x of [-5, -3.4, -1.7, -0.1, 1.2]) box(0.06, 2.6, 0.08, M.ink, x, 1.3, 5.02, room);
  box(6.2, 0.06, 0.08, M.ink, -1.9, 2.6, 5.02, room);
  box(6.2, 0.06, 0.08, M.ink, -1.9, 0.03, 5.02, room);
  const decal = plane(1.6, 0.2, sign([['FUTURE MEAT MARKET', 60, PALETTE.red, 0.72, 600]], 800, 100, { bg: 'rgba(0,0,0,0)' }), -1.9, 2.25, 4.99, Math.PI, room);
  decal.material.transparent = true;

  const kiosk = new THREE.Group();
  kiosk.position.set(-3.0, 0, 3.0); kiosk.lookAt(0, 0, 0.6);
  room.add(kiosk);
  box(0.52, 1.0, 0.45, M.cream, 0, 0.5, 0, kiosk);
  box(0.6, 0.04, 0.5, M.oak, 0, 1.02, 0, kiosk);
  const ks = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), new THREE.MeshBasicMaterial({ map: sign([['Scan to pay', 64, '#fff', 0.48, 500], ['SCAN & PAY', 30, 'rgba(255,255,255,.6)', 0.72, 500, MONO]], 400, 300, { bg: PALETTE.ink }), toneMapped: false }));
  ks.position.set(0, 1.3, 0.12); ks.rotation.x = -0.35;
  kiosk.add(ks);
  box(0.44, 0.34, 0.03, M.ink, 0, 1.3, 0.1, kiosk).rotation.x = -0.35;
  box(0.06, 0.32, 0.06, M.ink, 0, 1.16, 0.0, kiosk);
  box(0.2, 0.05, 0.02, M.ink, 0, 0.93, 0.226, kiosk);                  // 小票出口
  box(0.16, 0.006, 0.01, M.black, 0, 0.925, 0.237, kiosk);
  const slot = new THREE.Object3D(); slot.position.set(0, 0.92, 0.24); kiosk.add(slot);
  blob(-3.0, 3.0, 0.9);

  // 门边的告示栏：信息一直在那里，只是不太容易被注意到
  box(1.0, 0.76, 0.03, M.cork, 1.95, 1.45, 4.98, room);
  for (const [x, y, w, h] of [[1.95, 1.84, 1.04, 0.03], [1.95, 1.06, 1.04, 0.03], [1.44, 1.45, 0.03, 0.8], [2.46, 1.45, 0.03, 0.8]]) box(w, h, 0.04, M.oak, x, y, 4.975, room);
  const flyerTex = canvasTexture(400, 520, (g, W, H) => {
    g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#141414'; g.font = `500 34px ${SANS}`; g.fillText('Meet our donors', 30, 70);
    g.font = `400 20px ${SANS}`; g.fillStyle = '#6b6662'; g.fillText('MEET OUR DONORS', 30, 100);
    g.fillStyle = '#a7b39f';
    for (let i = 0; i < 4; i++) g.fillRect(30 + (i % 2) * 175, 130 + Math.floor(i / 2) * 170, 160, 150);
  });
  const flyer = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), new THREE.MeshStandardMaterial({ map: flyerTex, roughness: 0.9 }));
  flyer.position.set(2.02, 1.45, 4.955); flyer.rotation.set(0, Math.PI, 0);
  room.add(flyer);
  const memo = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.12), new THREE.MeshStandardMaterial({ color: 0xf3e7a0, roughness: 0.9 }));
  memo.position.set(1.62, 1.68, 4.958); memo.rotation.set(0, Math.PI, -0.08);
  room.add(memo);
  const memo2 = plane(0.18, 0.12, sign([['New this week', 30, PALETTE.ink, 0.45, 500], ['Farm gift box £39.80', 22, PALETTE.red, 0.78, 500]], 240, 160, { bg: '#fbf8f2' }), 1.63, 1.25, 4.958, Math.PI, room, false);
  memo2.rotation.z = 0.06;
  for (const [x, y] of [[2.02, 1.71], [1.62, 1.73], [1.63, 1.3]]) sph(0.008, M.red, x, y, 4.95, room);
  for (let i = 0; i < 5; i++) {                                         // 叠from来的购物篮 (空心）
    const b = new THREE.Group(); b.position.set(2.75, 0.02 + i * 0.07, 4.7); b.rotation.y = (i % 2) * 0.04; room.add(b);
    box(0.44, 0.012, 0.3, M.basket, 0, 0.006, 0, b);
    for (const z of [-0.15, 0.15]) box(0.46, 0.2, 0.012, M.basket, 0, 0.1, z, b);
    for (const x of [-0.225, 0.225]) box(0.012, 0.2, 0.3, M.basket, x, 0.1, 0, b);
    if (i === 4) for (const z of [-0.08, 0.08]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.008, 6, 24, Math.PI), M.ink); h.position.set(0, 0.2, z); b.add(h); }
  }
  blob(2.75, 4.7, 0.8);
  plant(room, 4.4, 4.4, 1.1); blob(4.4, 4.4, 0.8);
  plant(room, -4.5, 4.4, 1.0); blob(-4.5, 4.4, 0.8);
  plant(room, 4.4, -3.5, 0.9); blob(4.4, -3.5, 0.7);
  // 开业立牌
  const aframe = new THREE.Group(); aframe.position.set(0.6, 0, 3.6); aframe.rotation.y = Math.PI + 0.3; room.add(aframe);
  for (const s of [-1, 1]) {
    const p = box(0.5, 0.8, 0.02, M.oak, 0, 0.4, s * 0.12, aframe); p.rotation.x = s * 0.15;
  }
  const af = plane(0.44, 0.7, sign([['First order', 52, '#fff', 0.2, 500, SERIF], ['Off', 44, '#fff', 0.36, 400, SERIF], ['¥30', 120, '#fff', 0.6, 300], ['First custom order · instant', 24, 'rgba(255,255,255,.75)', 0.8, 400], ['FIRST ORDER', 20, 'rgba(255,255,255,.6)', 0.9, 500, MONO]], 440, 700, { bg: PALETTE.ink }), 0, 0.42, 0.14, 0, aframe, false);
  af.rotation.x = -0.15;
  blob(0.6, 3.6, 0.8);

  // ---------------------------------------------------------------- 灯光：暖色、商业照明
  scene.add(new THREE.HemisphereLight(0xfff8ef, 0xcbbfae, 0.5));
  for (const [x, z] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.2], [2.4, 2.2]]) {
    const l = new THREE.PointLight(0xffefdc, 8, 8, 1.6);
    l.position.set(x, 3.0, z);
    scene.add(l);
  }
  for (const [x, y, z, tx, ty, tz, i] of [[-4.0, 3.1, -0.6, -5, 1.6, -0.6, 7], [-2.75, 3.1, -2.6, -2.75, 1.2, -3.8, 6], [2.6, 3.1, -2.6, 2.75, 0.8, -3.4, 5], [4.2, 3.1, 2.4, 5, 1.4, 2.4, 4]]) {
    const s = new THREE.SpotLight(0xfff0dc, i, 6, 0.7, 0.6, 1.3);
    s.position.set(x, y, z); s.target.position.set(tx, ty, tz);
    scene.add(s, s.target);
  }

  let adIndex = 0, lastAd = 0, posterTex = [], posterIndex = 0, lastPoster = 0;
  function tick(t) {
    if (t - lastAd > 3.5) {
      lastAd = t; adIndex++;
      drawAd(ad.userData.ctx, 1024, 580, adIndex); ad.needsUpdate = true;
    }
    if (posterTex.length && t - lastPoster > 6) {
      lastPoster = t; posterIndex = (posterIndex + 1) % posterTex.length;
      lightbox.material.map = posterTex[posterIndex];
    }
    steak.rotation.y = Math.sin(t * 0.3) * 0.05;
  }
  // 海报和“Donor照片”在主程序里渲染好之后再贴上来
  function setPosters(tex, photos) {
    posterTex = tex;
    lightbox.material.map = tex[0];
    lightbox.material.needsUpdate = true;
    const imgs = Object.values(photos).map((src) => { const im = new Image(); im.src = src; return im; });
    Promise.all(imgs.map((im) => im.decode())).then(() => {
      const g = flyerTex.image.getContext('2d');
      imgs.forEach((im, i) => g.drawImage(im, 30 + (i % 2) * 175, 130 + Math.floor(i / 2) * 170, 160, 150));
      flyerTex.needsUpdate = true;
    });
  }

  // 走近之后的机位：站在哪儿 (eye）、看哪儿 (at）、焦距 (fov）;以及可以贴网页内容的屏幕表面
  room.updateMatrixWorld(true);
  const W = (o, x = 0, y = 0, z = 0) => o.localToWorld(new THREE.Vector3(x, y, z)).toArray();
  const spots = {
    brand: { eye: [2.55, 1.85, -2.05], at: [2.55, 2.0, -3.97], fov: 30, surface: { mesh: tv, w: 960, h: 544, size: 1.2 } },
    pairings: { eye: [-2.75, 1.5, -1.5], at: [-2.75, 1.25, -3.78], fov: 56 },
    ceramic: { eye: [-2.3, 1.6, -1.9], at: [-4.45, 1.02, -1.9], fov: 62 },
    merch: { eye: [-2.35, 1.5, 1.6], at: [-4.6, 0.95, 1.6], fov: 58 },
    tasting: { eye: [-0.95, 1.6, -0.58], at: [-2.1, 0.92, -0.64], fov: 48 },
    survey: { eye: W(tabBody, 0, 0.02, 0.5), at: W(tabBody), fov: 34, surface: { mesh: tabScreen, w: 520, h: 360, size: 0.26 } },
    checkout: { eye: W(kiosk, 0, 1.55, 0.95), at: W(kiosk, 0, 1.12, 0.12), fov: 48, surface: { mesh: ks, w: 640, h: 480, size: 0.4 } },
    donor: { eye: [1.97, 1.5, 3.95], at: [1.97, 1.45, 4.97], fov: 38, surface: { mesh: flyer, w: 420, h: 560, size: 0.42 } },
  };

  return { scene, tick, smart, spots, figurines, slot, setPosters };

  // 有全景照片时替换占位模型
  new THREE.TextureLoader().load('../../assets/room_pano.jpg', (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(50, 64, 32), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide }));
    sphere.scale.x = -1;
    sphere.position.set(0, 1.6, 0.6);
    scene.add(sphere);
    room.visible = false;
  }, undefined, () => {});

}
