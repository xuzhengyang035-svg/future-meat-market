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
import { blobShadow, grimeWallMaps, grimeFloorMaps, stainedCeilingMaps, ageCanvas, grimeMap, tapeLabel, gaugeMap } from './materials.js';
import { meatGeometry, meatMaterial } from './meat.js';
import { makeAnimal } from './animals.js';
import { CERAMIC_BASE } from './data.js';

const SANS = '"Inter", "Noto Sans SC", "Microsoft YaHei", sans-serif';
const SERIF = '"Noto Serif SC", "Songti SC", "SimSun", serif';
const MONO = '"IBM Plex Mono", Consolas, monospace';
export const PALETTE = { cream: '#f3eee6', red: '#b3262d', sage: '#8fa38a', oak: '#c49a6c', ink: '#2a2b2d' };

const M = {
  // 整体用旧：木头发暗、白色发黄发灰、红色褪成暗红，表面都叠一层污垢贴图
  oak: new THREE.MeshStandardMaterial({ color: 0x7d6449, roughness: 0.8, map: grimeMap(5) }),
  oakDark: new THREE.MeshStandardMaterial({ color: 0x4f3f30, roughness: 0.8, map: grimeMap(6) }),
  cream: new THREE.MeshStandardMaterial({ color: 0xb4ae9d, roughness: 0.7, map: grimeMap(7) }),
  red: new THREE.MeshStandardMaterial({ color: 0x8a2a27, roughness: 0.6, map: grimeMap(8) }),
  sage: new THREE.MeshStandardMaterial({ color: 0x66766a, roughness: 0.8, map: grimeMap(9) }),
  pipe: new THREE.MeshStandardMaterial({ color: 0x6f6a5e, roughness: 0.6, metalness: 0.6, map: grimeMap(11) }),
  fixture: new THREE.MeshStandardMaterial({ color: 0x8c8e86, roughness: 0.5, metalness: 0.4, map: grimeMap(12) }),
  tube: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.3, 2.6, 2.4) }),
  deadTube: new THREE.MeshStandardMaterial({ color: 0x8a8c84, roughness: 0.4 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x9a9c96, roughness: 0.45, metalness: 0.75, map: grimeMap(22) }),
  steelDark: new THREE.MeshStandardMaterial({ color: 0x5e615e, roughness: 0.55, metalness: 0.6, map: grimeMap(25) }),
  carton: new THREE.MeshStandardMaterial({ color: 0x8a6e4e, roughness: 0.95, map: grimeMap(26) }),
  tape: new THREE.MeshStandardMaterial({ color: 0xa89a74, roughness: 0.5 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x1e201e, roughness: 0.8 }),
  sheet: new THREE.MeshStandardMaterial({ color: 0x9fa49a, roughness: 1, map: grimeMap(27) }),
  blanket: new THREE.MeshStandardMaterial({ color: 0x4a5246, roughness: 1, map: grimeMap(28) }),
  strap: new THREE.MeshStandardMaterial({ color: 0x2a2a26, roughness: 0.7 }),
  gauze: new THREE.MeshStandardMaterial({ color: 0xd0cbbd, roughness: 1 }),
  earTag: new THREE.MeshStandardMaterial({ color: 0xd8b02a, roughness: 0.5 }),
  ivBag: new THREE.MeshPhysicalMaterial({ color: 0xc8d4cc, roughness: 0.2, transparent: true, opacity: 0.6 }),
  ivTube: new THREE.MeshStandardMaterial({ color: 0x9a3a3a, roughness: 0.3, transparent: true, opacity: 0.85 }),
  screenDim: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.18, 0.5, 0.3) }),
  ledRed: new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.3, 0.3) }),
  bucket: new THREE.MeshStandardMaterial({ color: 0x9a8a3a, roughness: 0.6, map: grimeMap(29) }),
  drum: new THREE.MeshStandardMaterial({ color: 0x2f4a6a, roughness: 0.6, map: grimeMap(30) }),
  curtain: new THREE.MeshStandardMaterial({ color: 0x7f8b7c, roughness: 1, transparent: true, opacity: 0.9, side: THREE.DoubleSide, map: grimeMap(31) }),
  strip: new THREE.MeshPhysicalMaterial({ color: 0xa8b090, roughness: 0.3, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
  frost: new THREE.MeshStandardMaterial({ color: 0xd8dcd4, roughness: 0.4 }),
  lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.55, 2.3) }),
  bulb: new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.5, 1.6) }),
  white: new THREE.MeshStandardMaterial({ color: 0xa8a8a0, roughness: 0.6, map: grimeMap(33) }),
  sack: new THREE.MeshStandardMaterial({ color: 0x9a8a68, roughness: 1, map: grimeMap(32) }),
  leafDead: new THREE.MeshStandardMaterial({ color: 0x5a5032, roughness: 0.9, side: THREE.DoubleSide }),
  ink: new THREE.MeshStandardMaterial({ color: 0x2a2b2d, roughness: 0.55, metalness: 0.4, map: grimeMap(10) }),
  steel: new THREE.MeshStandardMaterial({ color: 0xcfd3d5, roughness: 0.3, metalness: 1 }),
  ceramic: new THREE.MeshPhysicalMaterial({ color: 0xf7f5f0, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }),
  plushCream: new THREE.MeshStandardMaterial({ color: 0xf2e6d4, roughness: 1 }),
  plushPink: new THREE.MeshStandardMaterial({ color: 0xf0b9b4, roughness: 1 }),
  plushWhite: new THREE.MeshStandardMaterial({ color: 0xfbf8f2, roughness: 1 }),
  pink: new THREE.MeshStandardMaterial({ color: 0xe9a3a0, roughness: 0.6 }),
  black: new THREE.MeshStandardMaterial({ color: 0x1d1d1f, roughness: 0.4 }),
  grass: new THREE.MeshStandardMaterial({ color: 0x6f8f5c, roughness: 0.95 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x4f7044, roughness: 0.8, side: THREE.DoubleSide }),
  pot: new THREE.MeshStandardMaterial({ color: 0x8f877a, roughness: 0.9, map: grimeMap(13) }),
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
function plane(w, h, tex, x, y, z, ry, parent, basic = false) {
  const mat = tex && tex.isMaterial ? tex : basic ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }) : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });   // 也可以直接传材质
  const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  o.position.set(x, y, z); o.rotation.y = ry;
  parent.add(o);
  return o;
}
const lit = (map, o = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.85, ...o });
const sign = (lines, w, h, o = {}) => canvasTexture(w, h, (g, W, H) => {
  g.fillStyle = o.bg || PALETTE.cream; g.fillRect(0, 0, W, H);
  if (o.border) { g.strokeStyle = o.border; g.lineWidth = 4; g.strokeRect(8, 8, W - 16, H - 16); }
  for (const [txt, size, color, y, weight = 400, font = SANS, align = 'center', x = 0.5] of lines) {
    g.font = `${weight} ${size}px ${font}`; g.fillStyle = color; g.textAlign = align;
    const room = (align === 'center' ? Math.min(x, 1 - x) * 2 : align === 'left' ? 1 - x : x) * W - 16; let s = size;   // English is longer than the Chinese was: shrink a line that wouldn't fit
    while (s > 8 && g.measureText(txt).width > room) { s -= 2; g.font = `${weight} ${s}px ${font}`; }
    g.fillText(txt, W * x, H * y);
  }
  if (!o.clean) ageCanvas(g, W, H, { amount: 0.55, seed: W + H, drips: H > 200 });   // 标牌也都旧了
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
    ageCanvas(g, W, H, { amount: 1.3, seed: 17 });   // 褪色、水渍、往下流的污痕
  });
}

// ------------------------------------------------------------------ 绿植
function plant(parent, x, z, s = 1, leafMat = M.leaf) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g);
  cyl(0.2, 0.16, 0.42, M.pot, 0, 0.21, 0, g, 20);
  cyl(0.012, 0.018, 1.0, M.oakDark, 0, 0.8, 0, g, 6);
  const leafGeo = new THREE.SphereGeometry(0.12, 10, 6); leafGeo.scale(1, 0.18, 0.6);
  for (let i = 0; i < 22; i++) {
    const a = i * 2.4, y = 0.75 + (i / 22) * 0.8, r = 0.12 + Math.sin(i) * 0.05;
    const l = new THREE.Mesh(leafGeo, leafMat);
    l.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    l.rotation.set(Math.sin(i) * 0.6, -a, 0.5);
    g.add(l);
  }
}

// ------------------------------------------------------------------ 场景
// 店内 (重做）：前面是伪装用的普通杂货，真正的交易在后墙的取货窗口——
// 隔着铁栏和厚玻璃，柜台后面是一整墙写着Cell line编号的小抽屉 (参考老药铺）和冷藏抽屉 (参考停尸房）.
// 墙上到处是“零屠宰”“吃肉不必杀生”的宣传：隐秘的店，也要靠这套说法吸引熟客.
export function createRoom(env) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x161816);
  scene.environment = env;
  scene.environmentIntensity = 0.45;
  const room = new THREE.Group();
  scene.add(room);
  const blobMat = new THREE.MeshBasicMaterial({ map: blobShadow(), transparent: true, depthWrite: false, opacity: 0.7 });
  const blob = (x, z, sx, sz = sx) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), blobMat); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.004, z); room.add(p); };
  const wallMat = (w, h, o = {}) => new THREE.MeshStandardMaterial({ ...grimeWallMaps(w, h, { dado: 1.15, ...o }) });
  let rs = 11;
  const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;

  // ---------------------------------------------------------------- 地、墙、顶
  const fl = grimeFloorMaps('room');
  for (const t of [fl.map, fl.roughnessMap, fl.normalMap]) t.repeat.set(10 / 1.6, 9 / 1.6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 9), new THREE.MeshStandardMaterial({ ...fl, roughness: 1, metalness: 0.05, normalScale: new THREE.Vector2(0.5, 0.5) }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 0.5);
  room.add(floor);
  const cm = stainedCeilingMaps();
  cm.map.repeat.set(10 / 2.4, 9 / 2.4);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(10, 9), new THREE.MeshStandardMaterial({ map: cm.map, roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3.2, 0.5);
  room.add(ceil);
  const flickerTube = new THREE.MeshBasicMaterial({ color: M.tube.color.clone() });
  [[-2.6, -1.6], [2.6, -1.6], [-2.6, 1.4], [0.6, 1.4], [2.6, 3.6], [-2.6, 3.8]].forEach(([x, z], i) => {
    const g = new THREE.Group(); g.position.set(x, 3.2, z); room.add(g);
    box(1.32, 0.06, 0.24, M.fixture, 0, -0.03, 0, g);
    for (const dz of [-0.055, 0.055]) box(1.22, 0.026, 0.026, i === 3 ? flickerTube : i === 5 ? M.deadTube : M.tube, 0, -0.075, dz, g);
  });
  for (const [z, rr, y] of [[-3.82, 0.055, 2.98], [-3.68, 0.032, 3.04], [4.82, 0.045, 3.0]]) { const pp = cyl(rr, rr, 10, M.pipe, 0, y, z, room, 14); pp.rotation.z = Math.PI / 2; }
  for (const [x, rr] of [[4.82, 0.05], [-4.85, 0.04]]) { const pp = cyl(rr, rr, 9, M.pipe, x, 3.0, 0.5, room, 14); pp.rotation.x = Math.PI / 2; }
  box(0.12, 0.08, 9, M.fixture, -4.92, 3.12, 0.5, room);
  box(10, 3.2, 0.1, wallMat(10, 3.2), 0, 1.6, -4.05, room);
  box(0.1, 3.2, 9, wallMat(9, 3.2), -5.05, 1.6, 0.5, room);
  box(0.1, 3.2, 3.0, wallMat(3.0, 3.2), 5.05, 1.6, -2.6, room);
  box(0.1, 3.2, 4.5, wallMat(4.5, 3.2), 5.05, 1.6, 2.75, room);
  box(0.1, 0.7, 1.6, wallMat(1.6, 0.7, { dado: 0, ao: 0.2 }), 5.05, 2.85, -0.3, room);
  box(3.8, 3.2, 0.1, wallMat(3.8, 3.2), 3.1, 1.6, 5.05, room);
  box(6.2, 0.6, 0.1, wallMat(6.2, 0.6, { dado: 0, ao: 0.2 }), -1.9, 2.9, 5.05, room);

  // 小工具：单据、纸箱、软管
  const paperTex = (seed, o = {}) => canvasTexture(o.w || 200, o.h || 260, (g, W, H) => {
    g.fillStyle = o.bg || '#e9e4d2'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(30,30,40,.55)';
    if (o.head) { g.font = `600 ${Math.round(W * 0.09)}px ${SANS}`; g.fillText(o.head, W * 0.08, H * 0.12); }
    for (let y = H * 0.2; y < H * 0.92; y += H * 0.055) g.fillRect(W * 0.08, y, W * (0.4 + ((seed * 13 + y) % 7) / 14), 2);
    ageCanvas(g, W, H, { amount: 1, seed });
  });
  const paperMats = [0, 1, 2, 3].map((i) => new THREE.MeshStandardMaterial({ map: paperTex(i + 3, { head: ['Pickup slip', 'Handover slip', 'In stock', 'Batch'][i] }), roughness: 0.95, side: THREE.DoubleSide }));
  const floorPaper = (x, z, s = 0.22) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(s * 0.78, s), paperMats[Math.floor(rnd() * 4)]); p.rotation.set(-Math.PI / 2, 0, rnd() * 6); p.position.set(x, 0.006, z); room.add(p); };
  const carton = (x, y, z, w, h, d, ry = 0, parent = room) => { const b = box(w, h, d, M.carton, x, y + h / 2, z, parent); b.rotation.y = ry; box(w + 0.002, 0.004, 0.05, M.tape, 0, h / 2 + 0.001, 0, b); return b; };
  const hose = (pts, r, mat = M.rubber, parent = room) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 48, r, 8), mat); parent.add(m); return m; };
  const wireRack = (parent, w, d, h, levels) => {
    for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) cyl(0.012, 0.012, h, M.steel, x, h / 2, z, parent, 8);
    for (const y of levels) { box(w, 0.012, d, M.steel, 0, y, 0, parent); for (const z of [-d / 2, d / 2]) box(w, 0.025, 0.006, M.steel, 0, y + 0.01, z, parent); }
  };
  const neon = (text, w, h, size, color) => canvasTexture(w, h, (g, W, H) => {
    g.clearRect(0, 0, W, H); g.font = `700 ${size}px ${SERIF}`; const fit = g.measureText(text).width; if (fit > W * 0.9) { size = Math.floor(size * W * 0.9 / fit); g.font = `700 ${size}px ${SERIF}`; }   // English runs longer than the Chinese did: shrink to fit
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = size * 0.35; g.fillStyle = '#fff'; g.fillText(text, W / 2, H / 2);
    g.shadowBlur = 0; g.lineWidth = size * 0.06; g.strokeStyle = color; g.strokeText(text, W / 2, H / 2);
  });

  // ================================================================ 后墙中间：取货窗口 (参考当铺的铁栏窗口）
  const booth = new THREE.Group(); booth.position.set(1.0, 0, -2.5); room.add(booth);
  const BW = 3.8;
  box(0.12, 3.2, 1.5, wallMat(1.5, 3.2), -BW / 2, 1.6, -0.75, booth);          // 两侧隔墙
  box(0.12, 3.2, 1.5, wallMat(1.5, 3.2), BW / 2, 1.6, -0.75, booth);
  box(BW, 1.0, 0.12, M.steelDark, 0, 0.5, -0.06, booth);                       // 下半截：不锈钢挡板
  for (let i = 0; i < 6; i++) box(0.5, 0.02, 0.01, M.ink, -1.5 + i * 0.6, 0.6, 0.005, booth);
  box(BW + 0.1, 0.05, 0.5, M.steel, 0, 1.02, 0.15, booth);                     // 顾客一侧的台面
  box(BW, 0.85, 0.14, M.ink, 0, 2.78, -0.07, booth);                           // 窗口上方的面板
  for (const x of [-BW / 2 + 0.06, -0.62, 0.62, BW / 2 - 0.06]) box(0.08, 1.33, 0.12, M.steelDark, x, 1.7, -0.04, booth);
  box(BW, 0.06, 0.12, M.steelDark, 0, 1.06, -0.04, booth);
  const thick = new THREE.MeshPhysicalMaterial({ color: 0xb8c8c0, roughness: 0.12, transparent: true, opacity: 0.18, depthWrite: false, envMapIntensity: 1.2 });
  plane(BW - 0.1, 1.28, thick, 0, 1.7, -0.06, 0, booth);
  for (let x = -0.55; x <= 0.56; x += 0.11) cyl(0.008, 0.008, 1.26, M.steel, x, 1.7, 0.03, booth, 6);   // 中间窗口的铁栏
  for (const y of [1.25, 2.15]) box(1.2, 0.02, 0.02, M.steel, 0, y, 0.03, booth);
  // 递东西的抽拉托盘 (不开门，钱和肉都从这里过）
  box(0.56, 0.06, 0.5, M.steel, 0, 1.075, 0.12, booth);
  box(0.5, 0.02, 0.44, M.steelDark, 0, 1.105, 0.12, booth);
  box(0.12, 0.03, 0.03, M.ink, 0, 1.08, 0.38, booth);
  // 窗口上方的霓虹：零屠宰
  const neonMat = new THREE.MeshBasicMaterial({ map: neon('Zero slaughter · no killing', 1024, 200, 120, '#ff3a3a'), transparent: true, color: new THREE.Color(2.6, 2.2, 2.2), depthWrite: false });
  plane(2.6, 0.5, neonMat, 0, 2.86, 0.005, 0, booth);
  const neonLight = new THREE.PointLight(0xff3a3a, 2.2, 3.5, 2); neonLight.position.set(0, 2.8, 0.4); booth.add(neonLight);
  const tagSign = plane(0.7, 0.16, sign([['Pickup · Pay', 40, '#ddd', 0.68, 600]], 400, 90, { bg: '#2a2b2d' }), 1.25, 2.45, 0.005, 0, booth);
  // 玻璃上贴的小字
  const stick = (t1, t2, x, y, rz) => { const s = plane(0.32, 0.18, sign([[t1, 36, '#fff', 0.45, 700], [t2, 18, 'rgba(255,255,255,.8)', 0.8, 500]], 320, 180, { bg: '#8a2a27' }), x, y, 0.0, 0, booth); s.rotation.z = rz; };
  stick('Our meats', 'No slaughter · cell culture', -1.25, 1.45, 0.04);
  stick('Cash only', 'Or scan · no receipts', 1.3, 1.3, -0.05);
  stick('Regulars first', 'No photos', 1.3, 1.9, 0.03);
  // ---- 窗口里面：柜员的工作台
  box(BW - 0.3, 0.06, 0.5, M.steel, 0, 1.0, -0.4, booth);
  box(BW - 0.3, 0.96, 0.45, M.steelDark, 0, 0.48, -0.42, booth);
  box(0.5, 0.012, 0.36, M.black, -0.95, 1.035, -0.4, booth);                   // 电磁炉，煎着试吃的牛排
  cyl(0.13, 0.11, 0.04, M.ink, -0.95, 1.06, -0.4, booth, 32);
  box(0.2, 0.02, 0.03, M.ink, -0.95 + 0.22, 1.07, -0.4, booth);
  const steak = new THREE.Mesh(meatGeometry('beef'), meatMaterial('beef'));
  steak.scale.setScalar(0.22); steak.position.set(-0.95, 1.095, -0.4); booth.add(steak);
  steak.material.userData.uniforms.uColor.value = 0.95;
  box(0.18, 0.06, 0.18, M.white, 0.55, 1.06, -0.45, booth);                     // 电子秤
  box(0.3, 0.1, 0.22, M.ink, 1.15, 1.08, -0.45, booth);                         // 钱箱
  for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.28), paperMats[i % 4]); p.rotation.set(-Math.PI / 2, 0, (rnd() - 0.5) * 0.8); p.position.set(0.0 + (rnd() - 0.5) * 0.4, 1.034 + i * 0.002, -0.4); booth.add(p); }
  cyl(0.05, 0.05, 0.02, M.ceramic, 0.25, 1.04, -0.3, booth, 16);               // 烟灰缸
  { const st = new THREE.Group(); st.position.set(0.3, 0, -1.0); booth.add(st); cyl(0.17, 0.17, 0.04, M.rubber, 0, 0.62, 0, st, 20); cyl(0.02, 0.02, 0.6, M.steel, 0, 0.31, 0, st, 8); }
  const boothLamp = new THREE.SpotLight(0xffcf8a, 5, 3, 0.9, 0.6, 1.5); boothLamp.position.set(0.2, 2.25, -0.6); boothLamp.target.position.set(0, 1.0, -0.4); booth.add(boothLamp, boothLamp.target);
  hose([[0.2, 3.2, -0.6], [0.2, 2.3, -0.6]], 0.006, M.ink, booth); cyl(0.12, 0.2, 0.14, M.fixture, 0.2, 2.25, -0.6, booth, 16);
  // ---- 柜台后墙：一整墙写着编号的小抽屉 (参考老药铺），下面是冷藏抽屉 (参考停尸房）
  const drawerTex = canvasTexture(1536, 860, (g, W, H) => {
    g.fillStyle = '#2e2620'; g.fillRect(0, 0, W, H);
    const cols = 12, rows = 9, cw = W / cols, ch = H / rows;
    const ids = ['B-0417', 'P-0932', 'G-0221', 'F-1180', 'B-0388', 'P-0101', 'G-0350', 'B-0512'];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const k = 0.8 + ((r * 7 + c * 13) % 9) / 30;
      g.fillStyle = `rgb(${Math.round(92 * k)},${Math.round(70 * k)},${Math.round(50 * k)})`; g.fillRect(c * cw + 4, r * ch + 4, cw - 8, ch - 8);
      g.fillStyle = '#d8ceb0'; g.fillRect(c * cw + cw * 0.2, r * ch + ch * 0.18, cw * 0.6, ch * 0.3);
      g.fillStyle = '#2a2420'; g.font = `600 ${Math.round(ch * 0.18)}px monospace`; g.textAlign = 'center';
      g.fillText(ids[(r * cols + c) % ids.length], c * cw + cw / 2, r * ch + ch * 0.38);
      g.font = `400 ${Math.round(ch * 0.13)}px monospace`; g.fillText(`P${12 + ((r * 5 + c * 3) % 40)}`, c * cw + cw / 2, r * ch + ch * 0.44 + 2);
    }
    ageCanvas(g, W, H, { amount: 1.4, seed: 29 });
  });
  plane(3.4, 1.9, lit(drawerTex), 0, 2.0, -1.43, 0, booth);
  const knob = new THREE.InstancedMesh(new THREE.SphereGeometry(0.012, 8, 6), M.steel, 12 * 9);
  { const m4 = new THREE.Matrix4(); let i = 0; for (let r = 0; r < 9; r++) for (let c = 0; c < 12; c++) { m4.makeTranslation(-1.7 + (c + 0.5) * (3.4 / 12), 2.95 - (r + 0.5) * (1.9 / 9) - 0.03, -1.41); knob.setMatrixAt(i++, m4); } }
  booth.add(knob);
  for (const [c, r, out] of [[3, 4, 0.18], [8, 2, 0.12], [5, 6, 0.25]]) box(3.4 / 12 - 0.02, 1.9 / 9 - 0.02, 0.25, M.oakDark, -1.7 + (c + 0.5) * (3.4 / 12), 2.95 - (r + 0.5) * (1.9 / 9), -1.43 + out - 0.12, booth);   // 拉出来没关的几格
  for (let k = 0; k < 3; k++) {
    const x = -1.15 + k * 1.15;
    box(1.1, 0.8, 0.06, M.steel, x, 0.5, -1.4, booth);
    box(0.06, 0.16, 0.05, M.ink, x + 0.45, 0.5, -1.35, booth);
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.05), new THREE.MeshStandardMaterial({ map: tapeLabel([['−18 °C finished goods', '−18 °C finished goods', '4 °C awaiting pickup'][k]]), roughness: 0.9 })); t.position.set(x - 0.3, 0.75, -1.365); booth.add(t);
  }

  // ---- 顾客一侧的台面：试吃 (一托盘牙签插着的肉块）、评价平板、扫码结算的终端
  box(0.32, 0.01, 0.24, M.steelDark, -0.55, 1.05, 0.18, booth);
  for (let i = 0; i < 9; i++) {
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.02, 0.025), steak.material);
    const a = i / 9 * Math.PI * 2;
    cube.position.set(-0.55 + Math.cos(a) * 0.08, 1.066, 0.18 + Math.sin(a) * 0.06); cube.rotation.y = a; booth.add(cube);
    cyl(0.0015, 0.0015, 0.06, M.oak, cube.position.x, 1.093, cube.position.z, booth, 4);
  }
  const tl = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.07), new THREE.MeshStandardMaterial({ map: tapeLabel(['Tasting · 2 pieces each']), roughness: 0.9 }));
  tl.rotation.x = -Math.PI / 2; tl.position.set(-0.55, 1.047, 0.36); booth.add(tl);
  const tab = new THREE.Group(); tab.position.set(-1.3, 1.045, 0.2); booth.add(tab);
  box(0.1, 0.012, 0.08, M.ink, 0, 0.006, 0, tab);
  const arm = box(0.02, 0.1, 0.02, M.ink, 0, 0.055, -0.01, tab); arm.rotation.x = -0.35;
  const tabBody = new THREE.Group(); tabBody.position.set(0, 0.16, 0); tabBody.rotation.x = -0.45; tab.add(tabBody);
  box(0.28, 0.2, 0.012, M.ink, 0, 0, -0.007, tabBody);
  const tabScreen = plane(0.26, 0.18, sign([['Have a taste and tell us', 34, '#fff', 0.42, 500], ['Review for a £3 voucher', 26, '#f0b9b4', 0.66, 500]], 520, 360, { bg: '#6e2422' }), 0, 0, 0.0005, 0, tabBody, true);
  tabScreen.material.color.setScalar(0.75);
  const kiosk = new THREE.Group(); kiosk.position.set(2.35, 0, -2.3); room.add(kiosk);
  box(0.12, 0.2, 0.12, M.ink, 0, 1.14, -0.02, kiosk);
  box(0.44, 0.34, 0.03, M.ink, 0, 1.38, 0.0, kiosk).rotation.x = -0.35;
  const ks = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), new THREE.MeshBasicMaterial({ map: sign([['Scan to pay', 64, '#ccc', 0.48, 500], ['SCAN & PAY', 30, 'rgba(255,255,255,.5)', 0.72, 500, MONO]], 400, 300, { bg: PALETTE.ink }), toneMapped: false, color: new THREE.Color(0.7, 0.7, 0.7) }));
  ks.position.set(0, 1.38, 0.02); ks.rotation.x = -0.35;
  kiosk.add(ks);
  box(0.22, 0.04, 0.06, M.ink, 0, 1.065, 0.1, kiosk);
  const slot = new THREE.Object3D(); slot.position.set(0, 1.04, 0.14); kiosk.add(slot);
  blob(1.0, -2.0, 4.2, 1.2);

  // ================================================================ 后墙左：鲜肉柜 + 一台旧电视 (循环播放“零屠宰”宣传片）
  const smart = buildSmartFridge();
  smart.group.position.set(-2.5, 0, -3.62);
  room.add(smart.group);
  blob(-2.5, -3.4, 1.9, 1.2);
  const ad = canvasTexture(1024, 580, (g, W, H) => drawAd(g, W, H, 0));
  const tv = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.56), new THREE.MeshBasicMaterial({ map: ad, toneMapped: false, color: new THREE.Color(0.85, 0.85, 0.85) }));
  tv.position.set(-2.5, 2.62, -3.9);
  room.add(tv);
  box(1.08, 0.64, 0.16, M.ink, -2.5, 2.62, -3.99, room);
  box(0.3, 0.04, 0.3, M.steelDark, -2.5, 2.28, -3.9, room);
  hose([[-2.1, 3.0, -3.95], [-2.05, 2.7, -3.98], [-2.1, 2.4, -3.99]], 0.008, M.ink);
  hose([[-2.8, 3.0, -3.8], [-2.85, 2.5, -3.92], [-2.7, 2.06, -3.75]], 0.025);    // 冷柜顶上接下来的软管

  // ================================================================ 后墙右：熟客须知 / Meet our donors (告示栏）
  box(1.0, 0.76, 0.03, M.cork, 3.9, 1.45, -3.98, room);
  for (const [x, y, w, h] of [[3.9, 1.84, 1.04, 0.03], [3.9, 1.06, 1.04, 0.03], [3.39, 1.45, 0.03, 0.8], [4.41, 1.45, 0.03, 0.8]]) box(w, h, 0.04, M.oakDark, x, y, -3.975, room);
  const flyerTex = canvasTexture(400, 520, (g, W, H) => {
    g.fillStyle = '#d8d3c4'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#141414'; g.font = `500 34px ${SANS}`; g.fillText('Meet our donors', 30, 70);
    g.font = `400 20px ${SANS}`; g.fillStyle = '#6b6662'; g.fillText('MEET OUR DONORS', 30, 100);
    g.fillStyle = '#a7b39f';
    for (let i = 0; i < 4; i++) g.fillRect(30 + (i % 2) * 175, 130 + Math.floor(i / 2) * 170, 160, 150);
  });
  const flyer = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), new THREE.MeshStandardMaterial({ map: flyerTex, roughness: 0.9 }));
  flyer.position.set(4.0, 1.45, -3.955);
  room.add(flyer);
  const rules = plane(0.24, 0.32, sign([['For regulars', 36, '#222', 0.16, 700], ['1 Referrals only', 18, '#333', 0.32, 400], ['2 No photos in store', 18, '#333', 0.44, 400], ['3 Collect at the window', 18, '#333', 0.56, 400], ['4 Don\'t ask where the meat comes from', 18, '#9a2422', 0.68, 600], ['Zero slaughter · eat with ease', 18, '#9a2422', 0.88, 600]], 240, 320, { bg: '#e0d8c0' }), 3.6, 1.5, -3.955, 0, room);
  rules.rotation.z = 0.04;
  for (const [x, y] of [[4.0, 1.71], [3.6, 1.65]]) sph(0.008, M.red, x, y, -3.95, room);

  // ================================================================ 左墙：宣传 (大海报 + 褪色的阳光牧场插画）
  // 主海报：“一口肉，不必一条命.”——照片在 setPosters 里贴上
  const heroPoster = canvasTexture(800, 1100, (g, W, H) => {
    g.fillStyle = '#cfc6ae'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#8a2a27'; g.fillRect(0, 0, W, 14); g.fillRect(0, H - 14, W, 14);
    g.fillStyle = '#2a2420'; g.font = `700 104px ${SERIF}`; g.fillText('A bite of meat,', 60, 170); g.fillText('without a life.', 60, 300);
    g.fillStyle = '#8a2a27'; g.font = `600 40px ${SANS}`; g.fillText('Zero slaughter · cell cultured · the same taste', 64, 380);
    g.fillStyle = '#9fb094'; g.fillRect(60, 430, W - 120, 470);
    g.fillStyle = '#4b4844'; g.font = `400 30px ${SANS}`; g.fillText('Every piece of meat comes from an animal that lives a happy life*', 64, 960);
    g.font = `400 20px ${SANS}`; g.fillStyle = '#7a756e'; g.fillText('*Donor animal details are confidential by law. Image for illustration only.', 64, 1040);
    ageCanvas(g, W, H, { amount: 1.1, seed: 33 });
  });
  const hero = plane(1.6, 2.2, lit(heroPoster), -4.98, 1.65, -2.3, Math.PI / 2, room);
  box(0.04, 2.26, 1.66, M.ink, -5.0, 1.65, -2.3, room);
  plane(3.4, 1.36, new THREE.MeshStandardMaterial({ map: muralTexture(), roughness: 0.85 }), -4.99, 1.9, 0.9, Math.PI / 2, room);   // 褪色的阳光牧场
  for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.24), paperMats[i % 4]); p.position.set(-4.975, 1.2 + rnd() * 1.2, -0.6 + rnd() * 3.0); p.rotation.set(0, Math.PI / 2, (rnd() - 0.5) * 0.2); room.add(p); }
  // 一块手写的纸板宣传牌，用铁丝挂在管子下面
  const board = plane(1.4, 0.5, sign([['Meat, without killing', 64, '#2a2420', 0.5, 700, SERIF], ['Zero slaughter · cell cultured', 26, '#7a2420', 0.85, 500]], 700, 250, { bg: '#a8916a' }), -2.6, 2.55, 1.0, 0.25, room);
  board.rotation.z = -0.04;
  for (const x of [-3.2, -2.0]) hose([[x, 3.2, 1.0 + (x + 2.6) * 0.25], [x, 2.8, 1.0 + (x + 2.6) * 0.25]], 0.003, M.ink);

  // ================================================================ 前店：伪装用的普通杂货 (钢丝架、方便面、罐头、米袋、菜筐、冰柜）
  const grocery = (z) => {
    const g = new THREE.Group(); g.position.set(-4.62, 0, z); g.rotation.y = Math.PI / 2; room.add(g);
    wireRack(g, 1.5, 0.5, 1.8, [0.12, 0.6, 1.08, 1.56]);
    const cols = [0xb8402a, 0xd8a83a, 0x3a6a9a, 0x6a8a3a, 0xe0d8c0];
    for (const y of [0.6, 1.08, 1.56]) for (let x = -0.65; x < 0.66; x += 0.16 + rnd() * 0.04) {
      if (rnd() < 0.2) continue;
      const m = new THREE.MeshStandardMaterial({ color: cols[Math.floor(rnd() * cols.length)], roughness: 0.6, map: grimeMap(70 + Math.floor(rnd() * 3)) });
      if (rnd() < 0.5) box(0.14, 0.2, 0.2, m, x, y + 0.11, (rnd() - 0.5) * 0.1, g); else cyl(0.045, 0.045, 0.11, m, x, y + 0.065, (rnd() - 0.5) * 0.15, g, 12);
    }
    for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), M.sack); s.scale.set(1.2, 0.55, 0.8); s.position.set(-0.45 + i * 0.45, 0.25, 0); g.add(s); }
  };
  grocery(2.6); grocery(4.2);
  for (let i = 0; i < 3; i++) {                                                // 门口的菜筐
    const cx = -3.2 + i * 0.66;
    box(0.58, 0.24, 0.42, M.carton, cx, 0.12, 4.5, room);
    for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshStandardMaterial({ color: [0x4a6a2c, 0x9a4a24, 0xa8822a][i], roughness: 0.7 })); s.position.set(cx - 0.18 + (k % 3) * 0.18, 0.28, 4.4 + Math.floor(k / 3) * 0.18); room.add(s); }
  }
  const chest = new THREE.Group(); chest.position.set(3.2, 0, 4.4); room.add(chest);   // 卧式冰柜：上面写着“速冻水饺”
  box(1.4, 0.85, 0.7, M.white, 0, 0.425, 0, chest);
  box(1.36, 0.02, 0.66, new THREE.MeshPhysicalMaterial({ color: 0xc8d8d4, roughness: 0.1, transparent: true, opacity: 0.35 }), 0, 0.86, 0, chest);
  for (let i = 0; i < 6; i++) box(0.3, 0.12, 0.22, new THREE.MeshStandardMaterial({ color: i % 2 ? 0xc4a032 : 0x2a5a7a, roughness: 0.6 }), -0.45 + (i % 3) * 0.45, 0.78, -0.12 + Math.floor(i / 3) * 0.24, chest);
  plane(0.6, 0.2, sign([['Frozen dumplings · frozen', 40, '#9a2422', 0.62, 700]], 400, 130, { bg: '#d8d0bc' }), 0, 0.55, 0.352, 0, chest);
  // 开业立牌 (还在骗人：新客立减）
  const aframe = new THREE.Group(); aframe.position.set(-0.6, 0, 3.4); aframe.rotation.y = Math.PI + 0.25; room.add(aframe);
  for (const s of [-1, 1]) { const p = box(0.5, 0.8, 0.02, M.oak, 0, 0.4, s * 0.12, aframe); p.rotation.x = s * 0.15; }
  const af = plane(0.44, 0.7, sign([['Referred by a regular', 50, '#ddd', 0.2, 500, SERIF], ['First-order discount', 44, '#ddd', 0.36, 400, SERIF], ['¥30', 120, '#ddd', 0.6, 300], ['Zero slaughter · eat with ease', 24, 'rgba(255,255,255,.6)', 0.8, 400], ['NO KILL', 20, 'rgba(255,255,255,.5)', 0.9, 500, MONO]], 440, 700, { bg: PALETTE.ink }), 0, 0.42, 0.14, 0, aframe, false);
  af.rotation.x = -0.15;
  blob(-0.6, 3.4, 0.8);
  plant(room, 4.4, -3.4, 0.9, M.leafDead); blob(4.4, -3.4, 0.7);
  cyl(0.15, 0.13, 0.3, M.bucket, 2.2, 0.15, 4.6, room, 20);
  { const mop = cyl(0.012, 0.012, 1.3, M.oakDark, 2.25, 0.75, 4.65, room, 6); mop.rotation.z = 0.2; }

  // ================================================================ 右墙：加工间入口 (PVC 门帘）、灯箱海报、仓库门
  const hall = new THREE.Group(); hall.position.set(5.1, 0, -0.3); room.add(hall);
  box(2.4, 0.02, 1.6, M.ink, 1.2, 0.0, 0, hall);
  box(2.4, 2.5, 0.05, M.ink, 1.2, 1.25, -0.8, hall);
  box(2.4, 2.5, 0.05, M.ink, 1.2, 1.25, 0.8, hall);
  box(2.4, 0.05, 1.6, M.ink, 1.2, 2.5, 0, hall);
  plane(1.5, 2.45, canvasTexture(256, 400, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#9aa8a4'); gr.addColorStop(1, '#5e6a66');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.filter = 'blur(6px)'; g.fillStyle = '#3a4642';
    for (const x of [30, 120, 200]) { g.beginPath(); g.roundRect(x, 140, 50, 180, 20); g.fill(); }
    g.filter = 'none';
  }), 2.38, 1.23, 0, -Math.PI / 2, hall, true);
  for (let i = 0; i < 4; i++) box(0.4, 0.008, 0.06, i === 2 ? M.deadTube : M.tube, 0.4 + i * 0.55, 2.47, 0, hall);
  for (let i = 0; i < 7; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 2.3), M.strip); s.position.set(0.05, 1.18, -0.6 + i * 0.2); s.rotation.y = Math.PI / 2 + (rnd() - 0.5) * 0.15; hall.add(s); }
  plane(1.5, 0.3, sign([['Workshop · regulars\' visits by appointment', 40, '#ddd', 0.5, 500], ['WORKSHOP · BY APPOINTMENT', 20, 'rgba(255,255,255,.6)', 0.86, 500, MONO]], 750, 150, { bg: PALETTE.ink }), 4.985, 2.85, -0.3, -Math.PI / 2, room);
  box(0.06, 1.42, 1.06, M.ink, 5.0, 1.55, -2.6, room);
  const lightbox = plane(0.96, 1.28, canvasTexture(8, 8, (g) => { g.fillStyle = '#f3eee6'; g.fillRect(0, 0, 8, 8); }), 4.965, 1.55, -2.6, -Math.PI / 2, room, true);
  lightbox.material.color.setScalar(0.82);
  // 仓库门：一扇钢门，贴着“闲人免进”
  box(0.08, 2.2, 1.1, M.steelDark, 5.0, 1.1, 2.6, room);
  box(0.05, 0.2, 0.06, M.steel, 4.95, 1.1, 2.2, room);
  plane(0.6, 0.22, sign([['Storage · staff only', 36, '#fff', 0.55, 700], ['STORAGE', 18, 'rgba(255,255,255,.7)', 0.88, 500, MONO]], 400, 140, { bg: '#7a2420' }), 4.955, 1.75, 2.6, -Math.PI / 2, room);
  box(0.1, 0.06, 0.4, M.fixture, 4.95, 2.4, 2.6, room);
  box(0.04, 0.02, 0.36, M.tube, 4.93, 2.37, 2.6, room);
  for (let i = 0; i < 3; i++) carton(4.55, i * 0.32, 3.5 + (i % 2) * 0.04, 0.5, 0.32, 0.4, (rnd() - 0.5) * 0.3);

  // ================================================================ 入口：玻璃门内糊满报纸，卷帘门拉下一半，只有门开着
  const street = new THREE.Mesh(new THREE.PlaneGeometry(18, 7.8), new THREE.MeshBasicMaterial({ map: streetTexture(), toneMapped: false }));
  street.position.set(-1, 2.2, 9); street.rotation.y = Math.PI;
  street.material.color.setScalar(0.16);
  room.add(street);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 2.6), M.glass);
  glass.position.set(-1.9, 1.3, 5.02);
  room.add(glass);
  for (const x of [-5, -3.4, -1.7, -0.1, 1.2]) box(0.06, 2.6, 0.08, M.ink, x, 1.3, 5.02, room);
  box(6.2, 0.06, 0.08, M.ink, -1.9, 2.6, 5.02, room);
  box(6.2, 0.06, 0.08, M.ink, -1.9, 0.03, 5.02, room);
  const news = canvasTexture(512, 512, (g, W, H) => {
    g.fillStyle = '#b8b09a'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(30,30,30,.6)';
    for (let col = 0; col < 4; col++) for (let y = 60; y < H - 20; y += 9) g.fillRect(16 + col * 124, y, 108 - ((y * 7 + col * 31) % 30), 3);
    ageCanvas(g, W, H, { amount: 1.6, seed: 9 });
  });
  const newsMat = new THREE.MeshStandardMaterial({ map: news, roughness: 0.95 });
  for (let i = 0; i < 7; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.75 + rnd() * 0.15, 1.0 + rnd() * 0.2), newsMat);
    p.position.set(-4.6 + i * 0.66 + (rnd() - 0.5) * 0.05, 0.6 + (i % 2) * 0.85, 4.99); p.rotation.set(0, Math.PI, (rnd() - 0.5) * 0.08); room.add(p);
  }
  for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), newsMat); p.position.set(-4.4 + i * 1.1, 1.75 + rnd() * 0.2, 4.985); p.rotation.set(0, Math.PI, (rnd() - 0.5) * 0.1); room.add(p); }
  const doorG = new THREE.Group(); doorG.position.set(-0.07, 0, 5.0); doorG.rotation.y = -0.5; room.add(doorG);   // 开着的门
  box(0.05, 2.5, 0.05, M.ink, 0.02, 1.25, 0, doorG); box(0.05, 2.5, 0.05, M.ink, 1.22, 1.25, 0, doorG);
  box(1.24, 0.05, 0.05, M.ink, 0.62, 2.5, 0, doorG); box(1.24, 0.05, 0.05, M.ink, 0.62, 0.05, 0, doorG);
  plane(1.18, 2.4, M.glass, 0.62, 1.27, 0, 0, doorG);
  for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 2.4), M.strip); s.position.set(0.05 + i * 0.21, 1.25, 4.9); s.rotation.y = (rnd() - 0.5) * 0.2; room.add(s); }
  const decal = plane(1.6, 0.2, sign([['Chen\'s Fresh Meat · fresh · frozen', 56, '#8a2a27', 0.72, 700]], 800, 100, { bg: 'rgba(0,0,0,0)', clean: true }), -2.2, 2.4, 4.97, Math.PI, room);
  decal.material.transparent = true;

  // 地上散落的单据、电线、积水
  for (let i = 0; i < 18; i++) floorPaper(-4.4 + rnd() * 8.6, -1.6 + rnd() * 6.0, 0.18 + rnd() * 0.08);
  hose([[-4.95, 0.3, -3.9], [-4.2, 0.01, -3.5], [-3.2, 0.01, -3.3], [-2.6, 0.15, -3.3]], 0.008, M.ink);
  box(0.4, 0.01, 0.4, M.steelDark, 0.2, 0.006, 0.6, room);                     // 地漏

  // ================================================================ 灯光：冷绿的日光灯 (一盏坏、一盏闪）、窗口里一块暖光、红色霓虹
  scene.add(new THREE.HemisphereLight(0xa6b6ac, 0x1f211c, 0.26));
  const tubeLights = [];
  for (const [x, z] of [[-2.6, -1.6], [2.6, -1.6], [0.6, 1.4], [2.6, 3.6]]) {
    const l = new THREE.PointLight(0xd6e6dc, 5.5, 7, 1.8);
    l.position.set(x, 3.0, z);
    scene.add(l); tubeLights.push(l);
  }
  const flickerLight = tubeLights[2];
  for (const [x, y, z, tx, ty, tz, i] of [[-4.0, 3.1, -1.4, -5, 1.6, -2.3, 4], [-2.5, 3.1, -2.4, -2.5, 1.4, -3.8, 3.5], [3.9, 3.1, -2.6, 3.9, 1.4, -3.9, 2.5]]) {
    const s = new THREE.SpotLight(0xe4ece6, i, 6, 0.7, 0.6, 1.3);
    s.position.set(x, y, z); s.target.position.set(tx, ty, tz);
    scene.add(s, s.target);
  }

  let adIndex = 0, lastAd = 0, posterTex = [], posterIndex = 0, lastPoster = 0;
  function tick(t) {
    if (t - lastAd > 3.5) { lastAd = t; adIndex++; drawAd(ad.userData.ctx, 1024, 580, adIndex); ad.needsUpdate = true; }
    if (posterTex.length && t - lastPoster > 6) { lastPoster = t; posterIndex = (posterIndex + 1) % posterTex.length; lightbox.material.map = posterTex[posterIndex]; }
    steak.rotation.y = Math.sin(t * 0.3) * 0.05;
    const ph = t % 7.3;
    const on = ph > 6.6 ? (Math.sin(ph * 63) > 0.1 ? 0.25 : 1) : ph < 0.25 ? 0.6 + Math.random() * 0.4 : 1;
    flickerTube.color.setRGB(2.3 * on, 2.6 * on, 2.4 * on);
    flickerLight.intensity = 5.5 * (0.35 + 0.65 * on);
    neonMat.color.setScalar(t % 11 > 10.7 ? 0.8 : 2.4);                          // 霓虹偶尔暗一下
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
      const hg = heroPoster.image.getContext('2d');                              // 主海报里放一张快乐的牛
      hg.drawImage(imgs[1] || imgs[0], 60, 430, 680, 470);
      hg.save(); hg.globalCompositeOperation = 'multiply'; hg.fillStyle = 'rgba(206,196,160,.45)'; hg.fillRect(60, 430, 680, 470); hg.restore();
      heroPoster.needsUpdate = true;
    });
  }

  // 走近之后的机位
  room.updateMatrixWorld(true);
  const W = (o, x = 0, y = 0, z = 0) => o.localToWorld(new THREE.Vector3(x, y, z)).toArray();
  const spots = {
    brand: { eye: [-2.5, 2.25, -2.1], at: [-2.5, 2.62, -3.9], fov: 30, surface: { mesh: tv, w: 960, h: 538, size: 1.0 } },
    tasting: { eye: [0.4, 1.7, -0.9], at: [0.3, 1.12, -2.6], fov: 46 },
    survey: { eye: W(tabBody, 0, 0.02, 0.5), at: W(tabBody), fov: 34, surface: { mesh: tabScreen, w: 520, h: 360, size: 0.26 } },
    checkout: { eye: W(kiosk, 0, 1.6, 0.85), at: W(kiosk, 0, 1.2, 0.0), fov: 48, surface: { mesh: ks, w: 640, h: 480, size: 0.4 } },
    donor: { eye: [3.85, 1.5, -2.95], at: [3.85, 1.45, -3.97], fov: 38, surface: { mesh: flyer, w: 420, h: 560, size: 0.42 } },
  };

  return { scene, tick, smart, spots, figurines: [], slot, setPosters };
}
