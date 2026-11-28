// 生长观察室：参考真实培养肉工厂的参观廊 (例如 UPSIDE Foods 的 EPIC 工厂：
// 一进门就能隔着玻璃看到Cultivation hall，车间里是一排排像啤酒厂一样的不锈钢Bioreactors）.
// 观众站在参观廊里;玻璃前的展台上是“Your batch”——一个台式灌流Bioreactors，里面的肉在长大.
// 左墙是Growth data wall;玻璃最左边是一扇磨砂门：细胞库，非参观区域.
import * as THREE from 'three';
import { canvasTexture } from './textures.js';
import { meatGeometry, meatMaterial, meatHeight, kindFor } from './meat.js';
import { SPECIES } from './data.js';
import { curve } from './growth.js';
import { grimeWallMaps, grimeFloorMaps, grimeMap } from './materials.js';
import { steelMaps, concreteMaps, epoxyMaps, wallMaps, slatMaps, smudgeMap, gratingAlpha, blobShadow, graduationMap, tapeLabel, gaugeMap } from './materials.js';

const MONO = '"IBM Plex Mono", Consolas, monospace';
const SANS = '"Inter", "Noto Sans SC", "Microsoft YaHei", sans-serif';
const GREEN = '#b8ff6a';

const M = {
  steel: new THREE.MeshStandardMaterial({ color: 0xdfe3e6, metalness: 1, roughness: 0.24 }),
  steelDark: new THREE.MeshStandardMaterial({ color: 0xa3a9ad, metalness: 1, roughness: 0.36 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xa8a6a1, roughness: 0.92 }),
  hallWall: new THREE.MeshStandardMaterial({ color: 0xf1f2f2, roughness: 0.85 }),
  frame: new THREE.MeshStandardMaterial({ color: 0x26282b, roughness: 0.4, metalness: 0.6 }),
  white: new THREE.MeshStandardMaterial({ color: 0xc9c7bc, roughness: 0.45, map: grimeMap(20) }),
  top: new THREE.MeshStandardMaterial({ color: 0x2c2e31, roughness: 0.3, metalness: 0.2 }),
  suit: new THREE.MeshStandardMaterial({ color: 0xd2d4d0, roughness: 0.8 }),
  visor: new THREE.MeshStandardMaterial({ color: 0x29445c, roughness: 0.12, metalness: 0.6 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xeaf4f6, roughness: 0.03, transparent: true, opacity: 0.08, depthWrite: false }),
  vesselGlass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1, envMapIntensity: 1.6 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xe2b934, roughness: 0.6 }),
  tube: new THREE.MeshStandardMaterial({ color: 0xe9a8ad, roughness: 0.25, transparent: true, opacity: 0.8 }),
  scaffold: new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.9 }),
  light: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  warmLight: new THREE.MeshBasicMaterial({ color: 0xfff1df }),
  sight: new THREE.MeshBasicMaterial({ color: 0xf0788a }),
  ledRed: new THREE.MeshBasicMaterial({ color: 0xff2a2a }),
  ledGreen: new THREE.MeshBasicMaterial({ color: 0x7dff6a }),
  red: new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.45 }),
  drum: new THREE.MeshStandardMaterial({ color: 0xbdbcb2, roughness: 0.6, map: grimeMap(21) }),
  cap: new THREE.MeshStandardMaterial({ color: 0x2f62b8, roughness: 0.5 }),
  fabric: new THREE.MeshStandardMaterial({ color: 0x55585c, roughness: 0.95 }),
};

function box(w, h, d, m, x, y, z, parent) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}
function cyl(rt, rb, h, m, x, y, z, parent, seg = 32, open = false) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), m);
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}
function plane(w, h, tex, x, y, z, ry, parent, basic = true) {
  const mat = basic ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
    : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
  const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  o.position.set(x, y, z);
  o.rotation.y = ry;
  parent.add(o);
  return o;
}

let seed = 7;
const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

// ------------------------------------------------------------------ 贴图
const floorTex = (base, speck, repeat) => canvasTexture(512, 512, (g, W) => {
  g.fillStyle = base; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = speck[i % speck.length];
    g.globalAlpha = 0.25 + Math.random() * 0.35;
    g.fillRect(Math.random() * W, Math.random() * W, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  g.globalAlpha = 1;
}, { repeat });

const textSign = (lines, w, h, o = {}) => canvasTexture(w, h, (g, W, H) => {
  g.fillStyle = o.bg || '#f4f3ef'; g.fillRect(0, 0, W, H);
  if (o.bar) { g.fillStyle = o.bar; g.fillRect(0, 0, W, H * 0.06); }
  for (const [txt, size, color, y, weight = 400, font = SANS, align = 'left', x = 0.06] of lines) {
    g.font = `${weight} ${size}px ${font}`;
    g.fillStyle = color; g.textAlign = align;
    g.fillText(txt, align === 'center' ? W / 2 : W * x, H * y);
  }
});

function noPhotoSticker() {
  return canvasTexture(256, 256, (g, W) => {
    g.clearRect(0, 0, W, W);
    g.fillStyle = 'rgba(255,255,255,.92)';
    g.beginPath(); g.arc(W / 2, W / 2, 120, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#c4262e'; g.lineWidth = 18;
    g.beginPath(); g.arc(W / 2, W / 2, 104, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#222';
    g.fillRect(70, 98, 116, 76); g.fillRect(104, 84, 40, 18);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(128, 136, 24, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#c4262e'; g.lineWidth = 18;
    g.beginPath(); g.moveTo(54, 54); g.lineTo(202, 202); g.stroke();
  });
}

function frostedTexture() {
  return canvasTexture(512, 1024, (g, W, H) => {
    g.fillStyle = '#c9d0d2'; g.fillRect(0, 0, W, H);
    g.filter = 'blur(22px)';
    g.fillStyle = 'rgba(60,70,76,.55)';
    for (const [x, w, h] of [[60, 120, 420], [210, 130, 460], [360, 110, 380]]) {
      g.beginPath(); g.roundRect(x, H - 140 - h, w, h, 40); g.fill();
    }
    g.fillStyle = 'rgba(40,46,50,.4)'; g.fillRect(0, 300, W, 30);
    g.fillStyle = 'rgba(120,200,255,.35)'; g.fillRect(80, 180, 60, 40);
    g.filter = 'none';
    g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(0, H * 0.46, W, 70);
    g.fillStyle = '#c4262e'; g.font = `600 30px ${SANS}`; g.textAlign = 'center';
    g.fillText('NO VISITORS', W / 2, H * 0.46 + 46);
  });
}

const screenTex = (title, rows) => canvasTexture(512, 320, (g, W, H) => {
  g.fillStyle = '#071009'; g.fillRect(0, 0, W, H);
  g.fillStyle = GREEN; g.font = `500 26px ${MONO}`;
  g.fillText(title, 22, 44);
  g.fillStyle = 'rgba(184,255,106,.25)'; g.fillRect(22, 60, W - 44, 2);
  g.font = `400 21px ${MONO}`;
  rows.forEach((r, i) => { g.fillStyle = i % 2 ? '#9fd0a0' : '#e6f2e6'; g.fillText(r, 22, 100 + i * 34); });
});

// ------------------------------------------------------------------ 数据墙 (生命数据化）
const CELLS = (() => {
  seed = 19;
  const a = [];
  for (let i = 0; i < 460; i++) {
    const ang = rand() * Math.PI * 2, rr = Math.sqrt(rand());
    const type = rand() < 0.14 ? 'fat' : rand() < 0.5 ? 'tube' : 'blast';
    a.push({ x: Math.cos(ang) * rr * 1.25, y: Math.sin(ang) * rr * 0.78, s: type === 'fat' ? 13 + rand() * 9 : 7 + rand() * 6, rot: -0.5 + (rand() - 0.5) * 0.5, type, ph: rand() * 6 });
  }
  return a.sort((p, q) => Math.hypot(p.x, p.y) - Math.hypot(q.x, q.y));
})();
const LOG = (() => {
  seed = 41;
  const ids = ['G-0221', 'B-0417', 'P-0932', 'F-1180'];
  return Array.from({ length: 13 }, (_, i) => ({ no: 'FM-' + Math.floor(1000 + rand() * 9000), cell: ids[Math.floor(rand() * 4)], day: 1 + Math.floor(rand() * 27), via: (96.2 + rand() * 2.6).toFixed(1) }));
})();

export function drawDataWall(g, W, H, t, b, r) {
  g.fillStyle = '#06080a'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke(); }
  for (let y = 0; y < H; y += 40) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
  const corner = (x, y, w, h) => {
    g.strokeStyle = 'rgba(184,255,106,.6)'; g.lineWidth = 2;
    for (const [cx, cy, dx, dy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
      g.beginPath(); g.moveTo(cx + dx * 16, cy); g.lineTo(cx, cy); g.lineTo(cx, cy + dy * 16); g.stroke();
    }
  };
  g.textAlign = 'left';
  // 顶栏
  g.font = `500 22px ${MONO}`; g.fillStyle = '#dfe8e0';
  g.fillText('FUTURE MEAT · CULTIVATION MONITOR · HALL 02', 40, 52);
  g.textAlign = 'right'; g.fillStyle = GREEN;
  g.fillText(`${Math.floor(t * 2) % 2 ? '●' : '○'} LIVE  ${new Date().toLocaleString('zh-CN', { hour12: false })}`, W - 40, 52);
  g.textAlign = 'left';
  g.fillStyle = 'rgba(184,255,106,.35)'; g.fillRect(40, 70, W - 80, 1);

  // 左：关键数字
  const kpi = [
    ['ACTIVE BATCHES', (3412 + Math.floor(t / 6) % 9).toLocaleString()],
    ['OUTPUT TODAY', (1284.6 + t * 0.03).toFixed(1) + ' kg'],
    ['DOUBLING', '21.8 h'],
    ['SLAUGHTERED', '0'],
  ];
  kpi.forEach(([l, v], i) => {
    const y = 150 + i * 168;
    g.font = `400 17px ${MONO}`; g.fillStyle = GREEN; g.fillText(l, 50, y);
    g.font = `300 62px ${MONO}`; g.fillStyle = '#f2f5f2'; g.fillText(v, 46, y + 70);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(50, y + 96, 380, 1);
  });

  // 中：标本式的细胞团 + 标注
  const cx = W * 0.5, cy = H * 0.4, R = 200;
  corner(cx - 330, cy - 250, 660, 500);
  g.font = `400 15px ${MONO}`; g.fillStyle = '#8fa592';
  g.fillText(`SPECIMEN · ${b.cell} · ${b.reactor} · ${b.name ? '"' + b.name + '"' : b.no}`, cx - 314, cy - 222);
  const n = Math.floor(60 + r.f * (CELLS.length - 60));
  for (let i = 0; i < n; i++) {
    const c = CELLS[i];
    const x = cx + c.x * R, y = cy + c.y * R;
    const pulse = 1 + Math.sin(t * 1.4 + c.ph) * 0.04;
    g.save(); g.translate(x, y); g.rotate(c.rot);
    g.beginPath();
    if (c.type === 'tube') g.ellipse(0, 0, c.s * 2.6 * pulse, c.s * 0.55, 0, 0, Math.PI * 2);
    else if (c.type === 'fat') g.arc(0, 0, c.s * pulse, 0, Math.PI * 2);
    else g.ellipse(0, 0, c.s * 1.2 * pulse, c.s * 0.8, 0, 0, Math.PI * 2);
    g.fillStyle = c.type === 'fat' ? 'rgba(255,240,210,.10)' : 'rgba(240,120,138,.14)';
    g.fill();
    g.strokeStyle = c.type === 'fat' ? 'rgba(255,240,210,.55)' : 'rgba(184,255,106,.55)';
    g.lineWidth = 1; g.stroke();
    g.fillStyle = 'rgba(230,240,230,.8)';
    g.fillRect(-1.5, -1.5, 3, 3);
    g.restore();
  }
  const callouts = [
    [CELLS[3], -1, 'MYOTUBE'], [CELLS[40], 1, 'MYOBLAST'],
    [CELLS.find((c) => c.type === 'fat'), 1, 'ADIPOCYTE'], [CELLS[22], -1, 'SCAFFOLD'],
  ];
  callouts.forEach(([c, side, text], i) => {
    const x = cx + c.x * R, y = cy + c.y * R;
    const ex = cx + side * 300, ey = cy - 150 + i * 90;
    g.strokeStyle = 'rgba(230,240,230,.7)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(ex - side * 40, ey); g.lineTo(ex, ey); g.stroke();
    g.strokeRect(x - 4, y - 4, 8, 8);
    g.font = `400 14px ${MONO}`; g.fillStyle = '#e6ece6'; g.textAlign = side > 0 ? 'right' : 'left';
    g.fillText(text, ex, ey - 8);
    g.textAlign = 'left';
  });

  // 中下：Your batch的生长曲线
  const gx = cx - 300, gy = H * 0.74, gw = 600, gh = 150;
  g.font = `400 15px ${MONO}`; g.fillStyle = GREEN;
  g.fillText(`BATCH ${b.no} · growth curve N/K · DAY ${String(r.day).padStart(2, '0')}/${b.cycle}`, gx, gy - 16);
  g.strokeStyle = 'rgba(255,255,255,.18)';
  g.strokeRect(gx, gy, gw, gh);
  const cv = curve(b, 60);
  g.beginPath();
  cv.forEach((v, i) => { const x = gx + (i / 60) * gw, y = gy + gh - v * (gh - 10); i ? g.lineTo(x, y) : g.moveTo(x, y); });
  g.strokeStyle = 'rgba(230,240,230,.4)'; g.lineWidth = 1.5; g.stroke();
  g.beginPath();
  const upto = Math.round(r.p * 60);
  for (let i = 0; i <= upto; i++) { const x = gx + (i / 60) * gw, y = gy + gh - cv[i] * (gh - 10); i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.strokeStyle = GREEN; g.lineWidth = 3; g.stroke();
  const px = gx + r.p * gw, py = gy + gh - r.f * (gh - 10);
  g.fillStyle = GREEN; g.fillRect(px - 5, py - 5, 10, 10);

  // 右：批次记录 (Donor一栏永远是空的）
  const tx = W - 470;
  g.font = `400 17px ${MONO}`; g.fillStyle = GREEN; g.fillText('BATCH LOG', tx, 150);
  const cols = [['Batch', 0], ['Cell line', 110], ['Days', 220], ['Viability', 290], ['Donor*', 380]];
  g.font = `400 14px ${MONO}`; g.fillStyle = '#8fa592';
  cols.forEach(([c, x]) => g.fillText(c, tx + x, 184));
  const rows = LOG.slice();
  rows.splice(2, 0, { no: b.no, cell: b.cell, day: r.day, via: r.viability.toFixed(1), mine: true });
  rows.forEach((row, i) => {
    const y = 218 + i * 31;
    if (row.mine) { g.fillStyle = 'rgba(184,255,106,.16)'; g.fillRect(tx - 10, y - 21, 460, 29); }
    g.fillStyle = row.mine ? GREEN : '#dfe8e0';
    g.font = `400 15px ${MONO}`;
    g.fillText(row.mine && b.name ? `"${b.name}"` : row.no, tx, y);
    g.fillText(row.cell, tx + 110, y);
    g.fillText(String(row.day).padStart(2, '0'), tx + 220, y);
    g.fillText(row.via + '%', tx + 290, y);
    g.fillStyle = '#56615a'; g.fillText('—', tx + 380, y);
  });
  // 反应器液位
  g.fillStyle = GREEN; g.font = `400 15px ${MONO}`; g.fillText('REACTORS BR-01 ~ BR-12', tx, 712);
  for (let i = 0; i < 12; i++) {
    const lvl = 0.55 + 0.4 * Math.abs(Math.sin(i * 1.7 + t * 0.05));
    const x = tx + i * 37;
    g.strokeStyle = 'rgba(255,255,255,.2)'; g.strokeRect(x, 728, 24, 90);
    g.fillStyle = i === 1 ? GREEN : 'rgba(230,240,230,.55)';
    g.fillRect(x + 3, 728 + 90 * (1 - lvl) + 3, 18, 90 * lvl - 6);
  }
  // 底栏
  g.fillStyle = 'rgba(184,255,106,.35)'; g.fillRect(40, H - 52, W - 80, 1);
  g.font = `400 14px ${MONO}`; g.fillStyle = '#8fa592';
  g.fillText('REFRESH 5s · every cell on record', 40, H - 24);
  g.textAlign = 'right';
  g.fillText('* Donor details are outside the scope of this system', W - 40, H - 24);
  g.textAlign = 'left';
}

// ------------------------------------------------------------------ Bioreactors (车间里的大罐子）
const legH = 0.6;
function tankGeometry(r, h) {
  const pts = [new THREE.Vector2(0.001, 0), new THREE.Vector2(r * 0.16, 0), new THREE.Vector2(r, h * 0.16), new THREE.Vector2(r, h * 0.86)];
  for (let i = 1; i <= 10; i++) { const a = (i / 10) * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(0.001, r * Math.cos(a)), h * 0.86 + Math.sin(a) * h * 0.14)); }
  return new THREE.LatheGeometry(pts, 56);
}
const TANK_GEO = { small: tankGeometry(0.85, 3.0), big: tankGeometry(1.2, 3.8) };
const ringGeo = new THREE.TorusGeometry(1, 0.025, 8, 64);
const legGeo = new THREE.CylinderGeometry(0.045, 0.045, 1, 10);

function tank(kind, name, parent) {
  const r = kind === 'big' ? 1.2 : 0.85, h = kind === 'big' ? 3.8 : 3.0;
  const g = new THREE.Group();
  const body = new THREE.Mesh(TANK_GEO[kind], M.steel);
  body.position.y = legH;
  g.add(body);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = new THREE.Mesh(legGeo, M.steelDark);
    leg.scale.y = legH + h * 0.2;
    leg.position.set(Math.cos(a) * r * 0.8, leg.scale.y / 2, Math.sin(a) * r * 0.8);
    g.add(leg);
  }
  for (const k of [0.3, 0.55, 0.8]) {
    const ring = new THREE.Mesh(ringGeo, M.steelDark);
    ring.scale.set(r + 0.01, r + 0.01, 1); ring.rotation.x = Math.PI / 2; ring.position.y = legH + h * k;
    g.add(ring);
  }
  cyl(0.2, 0.2, 0.14, M.steel, 0, legH + h + 0.04, 0, g);
  cyl(0.15, 0.15, 0.36, M.steelDark, 0.35, legH + h - 0.02, 0, g);
  // 视镜：能看到里面粉红色的培养液
  const sightY = legH + h * 0.48;
  const sight = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), M.sight);
  sight.position.set(0, sightY, r + 0.012);
  g.add(sight);
  const sightRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 24), M.steelDark);
  sightRing.position.copy(sight.position);
  g.add(sightRing);
  plane(0.42, 0.13, textSign([[name, 64, '#1d1f22', 0.7, 500, MONO, 'center']], 256, 80, { bg: '#e8eaeb' }), 0, legH + h * 0.66, r + 0.012, 0, g, false);
  for (const y of [0.32, 0.4]) {
    const port = cyl(0.04, 0.04, 0.16, M.steelDark, 0, 0, 0, g, 12);
    port.rotation.z = Math.PI / 2; port.position.set(r + 0.06, legH + h * y, 0);
  }
  // 压力表
  const ga = -0.55, gy = legH + h * 0.4;
  const stem = cyl(0.012, 0.012, 0.1, M.steelDark, Math.sin(ga) * (r + 0.05), gy, Math.cos(ga) * (r + 0.05), g, 8);
  stem.rotation.set(Math.PI / 2, ga, 0, 'YXZ');
  const gauge = new THREE.Mesh(new THREE.CircleGeometry(0.075, 24), new THREE.MeshBasicMaterial({ map: gaugeMap() }));
  gauge.position.set(Math.sin(ga) * (r + 0.105), gy, Math.cos(ga) * (r + 0.105)); gauge.rotation.y = ga;
  g.add(gauge);
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.012, 6, 24), M.steel);
  bezel.position.copy(gauge.position); bezel.rotation.y = ga;
  g.add(bezel);
  parent.add(g);
  return g;
}

function worker(parent) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.9, 4, 12), M.suit);
  body.position.y = 0.75; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), M.suit);
  head.position.y = 1.55; g.add(head);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.09, 0.06), M.visor);
  visor.position.set(0, 1.56, 0.12); g.add(visor);
  for (const s of [-1, 1]) { const boot = box(0.12, 0.1, 0.22, M.steelDark, s * 0.09, 0.05, 0.03, g); boot.material = new THREE.MeshStandardMaterial({ color: 0x3c6fa0, roughness: 0.6 }); }
  parent.add(g);
  return g;
}

// ------------------------------------------------------------------ 台式Bioreactors (Your batch）
// 点云只取部分顶点，否则肉很小的时候会被绿点糊满
const sampleCache = new WeakMap();
function sampled(geo, step = 8) {
  if (sampleCache.has(geo)) return sampleCache.get(geo);
  const src = geo.attributes.position.array, out = [];
  for (let i = 0; i < src.length / 3; i += step) out.push(src[i * 3], src[i * 3 + 1], src[i * 3 + 2]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  sampleCache.set(geo, g);
  return g;
}
const meatMats = {};
const matFor = (sp) => (meatMats[sp] ||= meatMaterial(sp));

function vessel(species, frac, parent, label) {
  const g = new THREE.Group();
  cyl(0.19, 0.205, 0.07, M.steelDark, 0, 0.035, 0, g, 48);
  cyl(0.2, 0.2, 0.012, M.frame, 0, 0.074, 0, g, 48);
  const glass = cyl(0.155, 0.155, 0.44, M.vesselGlass, 0, 0.3, 0, g, 48, true);
  glass.renderOrder = 3;
  const ticks = new THREE.Mesh(new THREE.CylinderGeometry(0.1565, 0.1565, 0.44, 48, 1, true, -Math.PI, Math.PI * 2),
    new THREE.MeshBasicMaterial({ map: graduationMap(), transparent: true, depthWrite: false, opacity: 0.75 }));
  ticks.position.y = 0.3; ticks.renderOrder = 3;
  g.add(ticks);
  if (label) { const tp = plane(0.11, 0.033, tapeLabel(label), -0.055, 0.47, 0.152, -0.35, g, false); tp.rotation.z = 0.04; tp.renderOrder = 4; }
  const mediumMat = new THREE.MeshPhysicalMaterial({ color: 0xe25a70, roughness: 0.12, transparent: true, opacity: 0.5, depthWrite: false });
  const medium = cyl(0.149, 0.149, 0.3, mediumMat, 0, 0.23, 0, g, 48);
  medium.renderOrder = 2;
  const surface = new THREE.Mesh(new THREE.CircleGeometry(0.149, 48), new THREE.MeshBasicMaterial({ color: 0xf2a0aa, transparent: true, opacity: 0.35, depthWrite: false }));
  surface.rotation.x = -Math.PI / 2; surface.position.y = 0.38; surface.renderOrder = 2;
  g.add(surface);
  cyl(0.11, 0.11, 0.012, M.scaffold, 0, 0.115, 0, g, 40);
  const tissue = new THREE.Mesh(meatGeometry(kindFor(species, 'fillet')), matFor(species));
  tissue.position.y = 0.122;
  g.add(tissue);
  // 数据化扫描层：点云 + 扫描环 (只在聚焦时出现）
  const pts = new THREE.Points(sampled(tissue.geometry), new THREE.PointsMaterial({ color: 0xb8ff6a, size: 0.0026, transparent: true, opacity: 0, depthWrite: false, depthTest: false }));
  pts.renderOrder = 4;
  tissue.add(pts);
  const scan = new THREE.Mesh(new THREE.TorusGeometry(0.157, 0.0013, 6, 80), new THREE.MeshBasicMaterial({ color: 0xb8ff6a, transparent: true, opacity: 0, depthWrite: false }));
  scan.rotation.x = Math.PI / 2; scan.renderOrder = 5;
  g.add(scan);
  // 盖子、探头、管路、灌流泵
  cyl(0.172, 0.172, 0.045, M.steel, 0, 0.543, 0, g, 48);
  for (const [x, z, h] of [[0.08, 0, 0.06], [-0.06, 0.07, 0.05], [-0.05, -0.08, 0.08]]) cyl(0.012, 0.012, h, M.steelDark, x, 0.566 + h / 2, z, g, 12);
  for (const [x, z] of [[0.09, 0.06], [-0.085, -0.05]]) cyl(0.005, 0.005, 0.4, M.steelDark, x, 0.36, z, g, 8);
  const path = new THREE.CatmullRomCurve3([[0.08, 0.6, 0], [0.13, 0.7, 0], [0.27, 0.64, 0], [0.33, 0.3, 0], [0.34, 0.13, 0]].map((p) => new THREE.Vector3(...p)));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(path, 40, 0.0055, 8), M.tube));
  box(0.13, 0.12, 0.15, M.white, 0.36, 0.06, 0, g);
  plane(0.1, 0.05, screenTex('PERFUSION', ['1.2 mL/min', 'O2  42%']), 0.36, 0.08, 0.0755, 0, g);
  // 气泡
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0045, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }), 26);
  bubbles.renderOrder = 2;
  const bub = Array.from({ length: 26 }, () => ({ a: Math.random() * 6.28, r: 0.03 + Math.random() * 0.1, y: Math.random(), v: 0.5 + Math.random() }));
  g.add(bubbles);
  parent.add(g);
  const v = { group: g, tissue, medium, mediumMat, pts, scan, bubbles, bub, species, frac };
  setTissue(v, frac);
  return v;
}
function setTissue(v, f) {
  const s = 0.15 + 0.11 * f;
  v.tissue.scale.set(s, s * 2.2, s);
  v.tissue.position.y = 0.121 + meatHeight(kindFor(v.species, 'fillet')) * s * 2.2 * 0.9;
}
const PINK = new THREE.Color(0xe25a70), ORANGE = new THREE.Color(0xe8904a);
const m4 = new THREE.Matrix4();

// ------------------------------------------------------------------ 场景
export function createLab(env) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111312);
  scene.environment = env;
  scene.environmentIntensity = 0.55;
  const root = new THREE.Group();
  scene.add(root);

  // 材质：拉丝不锈钢的细纹、粗糙度不均
  const sm = steelMaps();
  for (const t of [sm.map, sm.roughnessMap, sm.normalMap]) t.repeat.set(3, 1);
  Object.assign(M.steel, { map: sm.map, roughnessMap: sm.roughnessMap, normalMap: sm.normalMap, roughness: 1 });
  M.steel.color.set(0xbfc0b8); M.steel.envMapIntensity = 0.65; M.steel.normalScale.set(0.3, 0.3);   // 用旧了：发灰、反光变弱
  M.steelDark.color.set(0x7d817f); M.steelDark.map = sm.map; M.steelDark.envMapIntensity = 0.6;
  Object.assign(M.steelDark, { roughnessMap: sm.roughnessMap, normalMap: sm.normalMap, roughness: 1.5 });
  M.steelDark.normalScale.set(0.3, 0.3);
  // 发光体调到高于 1，后期辉光只会作用在灯上
  M.light.color.setRGB(2.8, 3.1, 2.9); M.warmLight.color.setRGB(3, 2.75, 2.45);
  M.sight.color.multiplyScalar(1.4); M.ledRed.color.setRGB(4, 0.3, 0.3);
  scene.fog = new THREE.Fog(0x2a302c, 10, 46);   // 车间里灰蒙蒙的，远处发暗
  // 墙：参观廊是发黄的旧瓷砖 + 绿漆墙裙;车间是刷漆的大墙，墙裙更高，满是锈水痕
  const wallMat = (w, h, o = {}) => new THREE.MeshStandardMaterial({ ...grimeWallMaps(w, h, { dado: Math.min(1.15, h > 1 ? 1.15 : h), seed: 5, ...(h < 0.5 ? { dado: 0 } : {}) }) });
  const hallWallMat = (w, h) => new THREE.MeshStandardMaterial({ ...grimeWallMaps(w, h, { tile: false, dado: 1.6, ppm: 40, upper: [138, 142, 134], paint: [62, 76, 68], seed: 9, ao: 0.6 }) });

  // 参观廊：x -5..5，z -1..4，层高 3m，偏暗
  const gFloor = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), (() => { const c = grimeFloorMaps('lab', { base: [74, 80, 76], seed: 47 }); for (const t of [c.map, c.roughnessMap, c.normalMap]) t.repeat.set(10 / 1.6, 5 / 1.6); return new THREE.MeshStandardMaterial({ ...c, roughness: 1, normalScale: new THREE.Vector2(0.5, 0.5) }); })());
  gFloor.rotation.x = -Math.PI / 2; gFloor.position.set(0, 0, 1.5);
  root.add(gFloor);
  const gCeil = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), new THREE.MeshStandardMaterial({ color: 0x2a2b2e, roughness: 1 }));
  gCeil.rotation.x = Math.PI / 2; gCeil.position.set(0, 3, 1.5);
  root.add(gCeil);
  for (const z of [0.3, 1.7, 3.1]) for (const x of [-3.2, -1.1, 1.0, 3.1]) box(1.3, 0.02, 0.08, M.warmLight, x, 2.985, z, root);
  for (const [w, d, x, z] of [[10, 0.02, 0, 3.99], [0.02, 5, -4.99, 1.5], [0.02, 5, 4.99, 1.5]]) box(w, 0.1, d, M.frame, x, 0.05, z, root);
  box(0.2, 3, 5.2, wallMat(5.2, 3), -5.1, 1.5, 1.5, root);
  box(0.2, 3, 5.2, wallMat(5.2, 3), 5.1, 1.5, 1.5, root);
  box(10.4, 3, 0.2, wallMat(10.4, 3), 0, 1.5, 4.1, root);
  // 左墙的木格栅 (展厅常见的暖色背景）
  const slat = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3), new THREE.MeshStandardMaterial({ ...slatMaps(3.4, 3), color: 0x7a6e60 }));   // 木格栅也旧了、发暗
  slat.position.set(-4.99, 1.5, 1.6); slat.rotation.y = Math.PI / 2;
  root.add(slat);

  // 玻璃墙 (x -3.4..5）+ 左侧实墙 (细胞库门）
  box(8.4, 0.85, 0.2, wallMat(8.4, 0.85, { panel: 2.1, ao: 0.25 }), 0.8, 0.425, -1.0, root);
  box(10.4, 0.3, 0.2, wallMat(10.4, 0.3, { panel: 99, ao: 0 }), 0, 2.85, -1.0, root);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 1.85), M.glass);
  glass.position.set(0.8, 1.775, -1.0); glass.renderOrder = 6;
  root.add(glass);
  // 玻璃上手扶高度的手印和擦拭痕
  const smudge = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 1.85), new THREE.MeshStandardMaterial({ map: smudgeMap(8.4, 1.85, 0.12), transparent: true, depthWrite: false, roughness: 0.7, opacity: 0.6 }));
  smudge.position.set(0.8, 1.775, -0.985); smudge.renderOrder = 7;
  root.add(smudge);
  for (const x of [-3.4, -1.3, 0.8, 2.9, 5.0]) box(0.07, 1.85, 0.12, M.frame, x, 1.775, -1.0, root);
  box(8.4, 0.05, 0.3, M.frame, 0.8, 0.875, -0.95, root);
  box(1.8, 3, 0.2, wallMat(1.8, 3), -4.3, 1.5, -1.0, root);
  plane(0.16, 0.16, noPhotoSticker(), -2.3, 1.55, -0.99, 0, root);
  plane(0.16, 0.16, noPhotoSticker(), 3.9, 1.55, -0.99, 0, root);

  // 细胞库：磨砂玻璃门、红色标牌、读卡器
  box(1.12, 2.2, 0.06, M.frame, -4.25, 1.1, -0.88, root);
  plane(1.0, 2.1, frostedTexture(), -4.25, 1.07, -0.845, 0, root, false);
  plane(1.3, 0.24, textSign([['Cell bank · no visitors', 30, '#ffffff', 0.62, 500, SANS, 'center']], 640, 118, { bg: '#b3262d' }), -4.25, 2.42, -0.89, 0, root);
  box(0.08, 0.13, 0.03, M.frame, -3.6, 1.2, -0.87, root);
  const led = box(0.014, 0.014, 0.01, M.ledRed, -3.6, 1.24, -0.853, root);

  // 展台和三台台式Bioreactors
  box(3.6, 0.92, 0.55, wallMat(3.6, 0.92, { color: [226, 225, 221], panel: 1.2, ao: 0.32, ppm: 128 }), 0.2, 0.46, -0.55, root);
  box(3.56, 0.06, 0.5, M.frame, 0.2, 0.03, -0.53, root);
  box(3.66, 0.03, 0.6, M.top, 0.2, 0.935, -0.55, root);
  const vesL = vessel('chicken', 0.55, root, ['BR-01 G-0221', 'D14  P41']); vesL.group.position.set(-1.05, 0.95, -0.6);
  const vesC = vessel('beef', 0.3, root, ['BR-02 sample', '11/08  P37']); vesC.group.position.set(0.2, 0.95, -0.6);
  const vesR = vessel('pork', 0.85, root, ['BR-03 P-0932', 'D24  P52']); vesR.group.position.set(1.45, 0.95, -0.6);
  const plate = (txt, sub, x, hi) => plane(0.5, 0.09, textSign([[txt, 30, hi ? '#ffffff' : '#1d1f22', 0.48, 500, SANS], [sub, 20, hi ? 'rgba(255,255,255,.75)' : '#6b6762', 0.85, 400, MONO]], 400, 72, { bg: hi ? '#b3262d' : '#ebe9e4' }), x, 0.78, -0.274, 0, root, false);
  plate('Display batch · cultivated chicken breast', 'BR-01 · G-0221', -1.05, false);
  const myPlate = plate('Your batch', 'BR-02 · DEMO', 0.2, true);
  plate('Display batch · cultivated pork chop', 'BR-03 · P-0932', 1.45, false);
  for (const [x, i] of [[-1.05, 3], [0.2, 9], [1.45, 3]]) {
    const s = new THREE.SpotLight(0xfff3e4, i, 3.4, 0.34, 0.65, 1.4);
    s.position.set(x, 2.95, -0.25); s.target.position.set(x, 1.0, -0.6);
    root.add(s, s.target);
  }

  // 左墙：Growth data wall
  const dataTex = canvasTexture(1600, 900, (g, W, H) => { g.fillStyle = '#06080a'; g.fillRect(0, 0, W, H); });
  box(0.06, 1.56, 2.74, M.frame, -4.97, 1.75, 1.6, root);
  plane(2.6, 1.4625, dataTex, -4.935, 1.75, 1.6, Math.PI / 2, root);

  // 右墙：品牌标语、Visitor notice、宣传册架
  plane(2.4, 1.1, textSign([
    ['FUTURE MEAT MARKET · OPEN WORKSHOP GALLERY', 22, '#8a8580', 0.16, 500, MONO],
    ['SEE IT GROW.', 112, '#141414', 0.5, 300],
    ['Seeing is believing.', 50, '#141414', 0.72, 400],
    ['Every order grows up here.', 24, '#6b6762', 0.86, 400],
  ], 1200, 550, { bar: '#b3262d' }), 4.995, 1.95, 0.6, -Math.PI / 2, root);
  plane(0.5, 0.7, textSign([
    ['Visitor notice', 46, '#141414', 0.12, 500], ['VISITOR NOTICE', 20, '#8a8580', 0.18, 500, MONO],
    ['1  No photos or video', 24, '#333', 0.32], ['2  Do not tap the glass', 24, '#333', 0.42],
    ['3  Staff cannot answer questions', 24, '#333', 0.52], ['    Process and cell-source questions', 24, '#333', 0.6],
    ['4  Visits last about 15 minutes', 24, '#333', 0.7],
  ], 400, 560, { bar: '#141414' }), 4.995, 1.45, 2.45, -Math.PI / 2, root, false);
  box(0.25, 1.0, 0.7, M.frame, 4.86, 0.5, 1.5, root);
  for (let i = 0; i < 3; i++) plane(0.18, 0.24, textSign([['SEE IT', 30, '#141414', 0.3, 300], ['GROW', 30, '#141414', 0.5, 300], ['Brochure', 20, '#b3262d', 0.85, 500]], 180, 240, { bg: '#f4f1ea' }), 4.72, 0.75, 1.3 + i * 0.2, -Math.PI / 2, root, false);

  // 后墙：回Shop的门
  box(1.1, 2.2, 0.06, M.frame, 3.6, 1.1, 3.98, root);
  plane(1.0, 2.1, textSign([['←  Back to the shop', 60, '#ffffff', 0.12, 500, SANS, 'center'], ['STORE', 28, 'rgba(255,255,255,.6)', 0.17, 500, MONO, 'center']], 400, 840, { bg: '#3a3c40' }), 3.6, 1.07, 3.945, Math.PI, root, false);
  plane(0.42, 0.14, textSign([['EXIT', 40, '#ffffff', 0.7, 600, SANS, 'center']], 300, 100, { bg: '#1f8a4c' }), 3.6, 2.42, 3.99, Math.PI, root);
  box(1.8, 0.42, 0.45, M.frame, -0.6, 0.21, 2.9, root);
  box(1.76, 0.06, 0.42, M.fabric, -0.6, 0.45, 2.9, root);

  // Cultivation hall：x -10..10，z -1.2..-17，层高 6.5，明亮
  const hall = new THREE.Group();
  root.add(hall);
  const hFloor = new THREE.Mesh(new THREE.PlaneGeometry(20, 16), (() => { const e = grimeFloorMaps('hall', { base: [100, 104, 96], seed: 53, gloss: 1.6 }); for (const t of [e.map, e.roughnessMap, e.normalMap]) t.repeat.set(20 / 2.8, 16 / 2.8); return new THREE.MeshStandardMaterial({ ...e, roughness: 1, metalness: 0.05, normalScale: new THREE.Vector2(0.5, 0.5) }); })());
  hFloor.rotation.x = -Math.PI / 2; hFloor.position.set(0, 0, -9.1);
  hall.add(hFloor);
  const hCeil = new THREE.Mesh(new THREE.PlaneGeometry(20, 16), M.hallWall);
  hCeil.rotation.x = Math.PI / 2; hCeil.position.set(0, 6.5, -9.1);
  hall.add(hCeil);
  box(20, 6.5, 0.2, hallWallMat(20, 6.5), 0, 3.25, -17.1, hall);
  box(0.2, 6.5, 16, hallWallMat(16, 6.5), -10.1, 3.25, -9.1, hall);
  box(0.2, 6.5, 16, hallWallMat(16, 6.5), 10.1, 3.25, -9.1, hall);
  box(20, 3.5, 0.2, M.hallWall, 0, 4.75, -1.2, hall);
  for (let x = -8; x <= 8; x += 2.6) for (let z = -3; z >= -16; z -= 2.6) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.5), M.light);
    p.rotation.x = Math.PI / 2; p.position.set(x, 6.48, z);
    hall.add(p);
  }
  for (const z of [-2.5, -6.4, -10.9]) box(19, 0.004, 0.09, M.yellow, 0, 0.003, z, hall);
  plane(6, 1.1, textSign([['CULTIVATION HALL 02', 96, '#2b2d30', 0.52, 300, MONO, 'center'], ['Cultivation hall · clean zone ISO 7', 40, '#6b6762', 0.86, 400, SANS, 'center']], 1400, 260, { bg: '#f1f2f2' }), 0, 5.2, -16.99, 0, hall);
  const blobMat = new THREE.MeshBasicMaterial({ map: blobShadow(), transparent: true, depthWrite: false, opacity: 0.85 });
  const blob = (x, z, sz, parent = hall, y = 0.006) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), blobMat); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); parent.add(p); return p; };
  const tankList = [];
  let n = 1;
  for (const z of [-4.3, -8.6]) for (const x of [-6.6, -3.3, 0, 3.3, 6.6]) {
    const tk = tank('small', 'BR-' + String(n++).padStart(2, '0'), hall);
    tk.position.set(x, 0, z);
    blob(x, z, 2.7);
    tankList.push({ name: 'BR-' + String(n - 1).padStart(2, '0'), size: '2,000 L', pos: new THREE.Vector3(x, legH + 1.5, z + 0.9) });
    const panel = box(0.5, 0.75, 0.22, M.white, x + 1.25, 1.15, z + 0.55, hall);
    plane(0.4, 0.25, screenTex('BR-' + String(n - 1).padStart(2, '0'), [`T  37.0 C`, `pH 7.2${n % 7}`, `DO ${38 + n}%`]), x + 1.25, 1.27, z + 0.665, 0, hall);
    box(0.06, 0.8, 0.06, M.steelDark, x + 1.25, 0.4, z + 0.55, hall);
    panel.userData = {};
  }
  for (const x of [-5, 0, 5]) {
    tankList.push({ name: 'BR-' + String(n).padStart(2, '0'), size: '5,000 L', pos: new THREE.Vector3(x, legH + 1.9, -13.6 + 1.25) });
    tank('big', 'BR-' + String(n++).padStart(2, '0'), hall).position.set(x, 0, -13.6); blob(x, -13.6, 3.6);
  }
  // 管路
  const pipeGeo = new THREE.CylinderGeometry(0.06, 0.06, 1, 12);
  const pipe = (len, x, y, z, rotZ, m = M.steel, r = 1) => { const p = new THREE.Mesh(pipeGeo, m); p.scale.set(r, len, r); p.position.set(x, y, z); p.rotation.z = rotZ; hall.add(p); };
  for (const z of [-4.3, -8.6]) {
    pipe(18, 0, 5.4, z - 0.25, Math.PI / 2);
    pipe(18, 0, 5.75, z + 0.3, Math.PI / 2, M.white, 1.6);
    for (const x of [-6.6, -3.3, 0, 3.3, 6.6]) {
      pipe(5.4 - (legH + 3.0 + 0.1), x, (5.4 + legH + 3.1) / 2, z - 0.25, 0);
      box(0.13, 0.17, 0.13, M.steelDark, x, 4.75, z - 0.25, hall);
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.014, 8, 24), M.red);
      wheel.position.set(x, 4.75, z - 0.1); hall.add(wheel);
    }
    for (let x = -8; x <= 8; x += 4) { const sl = cyl(0.066, 0.066, 0.32, M.cap, x, 5.4, z - 0.25, hall, 12); sl.rotation.z = Math.PI / 2; }
  }
  pipe(18, 0, 6.0, -13.6, Math.PI / 2);
  const workers = [worker(hall), worker(hall)];
  workers[1].position.set(4.55, 0, -7.5); workers[1].rotation.y = Math.PI;
  for (const [x, z] of [[-4.5, -4.5], [4.5, -4.5], [-4.5, -11], [4.5, -11]]) {
    const l = new THREE.PointLight(0xd8e8de, 21, 16, 1.4);
    l.position.set(x, 6.1, z);
    hall.add(l);
  }
  // ---------------------------------------------------------------- 细节：让空间像真的有人在用
  // 车间：检修平台 (格栅）、风管、桥架、培养基桶、推车、通往细胞库的门、标识
  const grate = gratingAlpha(); grate.repeat.set(106, 7);
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(17, 1.1), new THREE.MeshStandardMaterial({ color: 0x9aa0a4, metalness: 0.85, roughness: 0.45, alphaMap: grate, alphaTest: 0.5, side: THREE.DoubleSide }));
  deck.rotation.x = -Math.PI / 2; deck.position.set(0, 2.9, -6.45);
  hall.add(deck);
  for (const s of [-1, 1]) {
    const zz = -6.45 + s * 0.56;
    box(17, 0.1, 0.01, M.steelDark, 0, 2.95, zz, hall);
    for (const y of [3.45, 3.95]) { const rr = cyl(0.022, 0.022, 17, M.steel, 0, y, zz, hall, 10); rr.rotation.z = Math.PI / 2; }
    for (let x = -8.5; x <= 8.5; x += 1.7) cyl(0.02, 0.02, 1.05, M.steel, x, 3.42, zz, hall, 8);
    for (const x of [-8.2, -4.95, -1.65, 1.65, 4.95, 8.2]) cyl(0.055, 0.055, 2.9, M.steelDark, x, 1.45, zz, hall, 12);
  }
  const duct = cyl(0.36, 0.36, 19, M.steel, 0, 5.85, -11.2, hall, 24); duct.rotation.z = Math.PI / 2;
  for (let x = -7.5; x <= 7.5; x += 3) cyl(0.22, 0.26, 0.16, M.white, x, 5.42, -11.2, hall, 20);
  box(18, 0.05, 0.36, M.steelDark, 0, 6.15, -2.6, hall);
  box(18, 0.1, 0.01, M.steelDark, 0, 6.18, -2.42, hall);
  for (const [x, z] of [[-9.1, -2.6], [-8.6, -2.5], [-9.0, -3.1], [-8.5, -3.05]]) {
    cyl(0.22, 0.22, 0.72, M.drum, x, 0.36, z, hall, 20);
    cyl(0.07, 0.07, 0.05, M.cap, x + 0.08, 0.745, z, hall, 12);
  }
  blob(-8.8, -2.8, 1.6);
  const cart = new THREE.Group(); cart.position.set(-2.0, 0, -6.0); hall.add(cart);
  for (const y of [0.3, 0.86]) box(0.9, 0.03, 0.55, M.steel, 0, y, 0, cart);
  for (const [x, z] of [[-0.42, -0.25], [0.42, -0.25], [-0.42, 0.25], [0.42, 0.25]]) {
    cyl(0.015, 0.015, 0.8, M.steel, x, 0.48, z, cart, 8);
    cyl(0.04, 0.04, 0.03, M.frame, x, 0.04, z, cart, 12).rotation.x = Math.PI / 2;
  }
  for (const x of [-0.25, 0.05]) { cyl(0.09, 0.09, 0.26, M.drum, x, 1.0, 0, cart, 16); cyl(0.04, 0.04, 0.04, M.cap, x, 1.15, 0, cart, 10); }
  blob(-2.0, -6.0, 1.2);
  const cbDoor = box(1.2, 2.4, 0.08, M.frame, -10.0, 1.2, -14.2, hall);
  cbDoor.rotation.y = Math.PI / 2;
  plane(1.0, 2.2, frostedTexture(), -9.95, 1.15, -14.2, Math.PI / 2, hall, false);
  plane(1.3, 0.24, textSign([['Cell bank · no visitors', 30, '#ffffff', 0.62, 500, SANS, 'center']], 640, 118, { bg: '#b3262d' }), -9.98, 2.6, -14.2, Math.PI / 2, hall);
  plane(1.6, 0.5, textSign([['Sterile zone · wear clean-room suits', 46, '#1d1f22', 0.48, 500, SANS, 'center'], ['ASEPTIC AREA · GOWNING REQUIRED', 22, '#6b6762', 0.82, 500, MONO, 'center']], 800, 250, { bg: '#e9f2ec', bar: '#1f8a4c' }), 9.98, 2.4, -4.4, -Math.PI / 2, hall);
  plane(0.5, 0.17, textSign([['EMERGENCY EXIT', 38, '#ffffff', 0.7, 600, SANS, 'center']], 300, 100, { bg: '#1f8a4c' }), 7.5, 2.9, -16.99, 0, hall);

  // 参观廊：扶手、隔离带、轨道射灯、监控探头、灭火器、回风口、地贴、展台提示牌
  const rail = (x0, x1) => {
    const len = x1 - x0, cx = (x0 + x1) / 2;
    const r = cyl(0.022, 0.022, len, M.steel, cx, 1.0, -0.86, root, 16); r.rotation.z = Math.PI / 2;
    for (let x = x0 + 0.15; x <= x1 - 0.1; x += 1.1) cyl(0.012, 0.012, 0.12, M.steelDark, x, 0.94, -0.86, root, 8);
  };
  rail(-3.3, -1.75); rail(2.15, 4.9);
  const post = (x, z) => {
    cyl(0.15, 0.17, 0.03, M.frame, x, 0.015, z, root, 24);
    cyl(0.028, 0.028, 0.9, M.steel, x, 0.46, z, root, 12);
    cyl(0.042, 0.042, 0.06, M.frame, x, 0.93, z, root, 16);
  };
  post(-4.85, -0.2); post(-3.65, -0.2);
  plane(1.16, 0.05, textSign([['No visitors', 22, '#ffffff', 0.78, 500, SANS, 'center']], 600, 30, { bg: '#b3262d' }), -4.25, 0.88, -0.2, 0, root);
  blob(-4.85, -0.2, 0.5, root, 0.003); blob(-3.65, -0.2, 0.5, root, 0.003);
  box(3.6, 0.03, 0.05, M.frame, 0.2, 2.975, -0.27, root);
  for (const x of [-1.05, 0.2, 1.45]) {
    cyl(0.01, 0.01, 0.08, M.frame, x, 2.93, -0.27, root, 6);
    const f = cyl(0.045, 0.036, 0.16, M.frame, x, 2.85, -0.3, root, 16); f.rotation.x = -0.5;
  }
  const domeMat = new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.08, metalness: 0.4 });
  for (const [x, z] of [[4.7, 3.7], [-4.6, -0.55]]) {
    cyl(0.085, 0.085, 0.02, M.white, x, 2.99, z, root, 20);
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), domeMat);
    d.position.set(x, 2.985, z); root.add(d);
  }
  cyl(0.075, 0.075, 0.5, new THREE.MeshStandardMaterial({ color: 0xc8211f, roughness: 0.35 }), 4.55, 0.4, 3.86, root, 20);
  cyl(0.03, 0.04, 0.09, M.frame, 4.55, 0.69, 3.86, root, 12);
  box(0.16, 0.1, 0.04, M.frame, 4.55, 0.2, 3.95, root);
  plane(0.2, 0.26, textSign([['Fire extinguisher', 44, '#fff', 0.45, 600, SANS, 'center'], ['FIRE', 26, '#fff', 0.8, 500, MONO, 'center']], 200, 260, { bg: '#c8211f' }), 4.55, 1.05, 3.99, Math.PI, root);
  plane(1.0, 0.35, canvasTexture(400, 140, (g, W, H) => { g.fillStyle = '#a4a29d'; g.fillRect(0, 0, W, H); g.fillStyle = '#34353a'; for (let y = 10; y < H - 6; y += 12) g.fillRect(8, y, W - 16, 6); }), -2.4, 2.6, 3.99, Math.PI, root, false);
  // 提问终端：观众可以向品牌提问
  const kiosk = new THREE.Group(); kiosk.position.set(3.9, 0, 0.35); kiosk.rotation.y = -0.5; root.add(kiosk);
  box(0.42, 1.0, 0.34, M.white, 0, 0.5, 0, kiosk);
  box(0.46, 0.04, 0.38, M.frame, 0, 1.02, 0, kiosk);
  const ks = plane(0.4, 0.28, textSign([['Questions?', 54, '#ffffff', 0.38, 400, SANS, 'center'], ['Ask us', 54, '#ffffff', 0.62, 400, SANS, 'center'], ['ASK US ANYTHING', 22, '#b8ff6a', 0.86, 500, MONO, 'center']], 400, 280, { bg: '#101214' }), 0, 1.25, 0.06, 0, kiosk);
  ks.rotation.x = -0.3;
  box(0.44, 0.31, 0.03, M.frame, 0, 1.25, 0.04, kiosk).rotation.x = -0.3;
  blob(3.9, 0.35, 0.9, root, 0.003);
  for (const x of [-0.42, 0.85]) {
    const sg = plane(0.12, 0.078, textSign([['Do not touch', 34, '#141414', 0.5, 500, SANS, 'center'], ['DO NOT TOUCH', 18, '#6b6762', 0.84, 500, MONO, 'center']], 200, 130, { bg: '#f5f3ee' }), x, 0.995, -0.4, 0, root, false);
    sg.rotation.x = -0.25;
    box(0.13, 0.008, 0.05, M.frame, x, 0.954, -0.42, root);
  }
  blob(0.2, -0.55, 4.4, root, 0.003).scale.set(1, 0.35, 1);

  scene.add(new THREE.HemisphereLight(0xa8b8ae, 0x262823, 0.34));

  // ---------------------------------------------------------------- 动画与数据
  let lastWall = -1, scanOn = 0;
  const scanT = { v: 0 };
  function setScan(on) { gsap.to(scanT, { v: on ? 1 : 0, duration: 0.8 }); }

  function setBatch(b, opts) {
    const sp = b.species;
    vesC.species = sp;
    vesC.tissue.material = matFor(sp);
    vesC.tissue.geometry = meatGeometry(kindFor(sp, opts?.form || 'fillet'));
    vesC.pts.geometry = sampled(vesC.tissue.geometry);
    if (opts) {
      const u = vesC.tissue.material.userData.uniforms;
      u.uFat.value = { low: 0, mid: 0.5, high: 1 }[opts.fat] ?? 0.5;
      u.uFirm.value = opts.firm === 'firm' ? 1 : 0;
      u.uColor.value = opts.shade === 'deep' ? 0.85 : 0.25;
      u.uSteak.value = opts.form === 'steak' ? 1 : 0;
    }
    const tx = myPlate.material.map;
    const g = tx.userData.ctx, W = 400, H = 72;
    g.fillStyle = '#b3262d'; g.fillRect(0, 0, W, H);
    g.font = `500 30px ${SANS}`; g.fillStyle = '#fff'; g.textAlign = 'left';
    g.fillText(b.demo ? 'Demo batch' : (b.name ? `"${b.name}"` : 'Your batch'), W * 0.06, H * 0.48);
    g.font = `400 20px ${MONO}`; g.fillStyle = 'rgba(255,255,255,.75)';
    g.fillText(`BR-02 · ${b.demo ? 'DEMO' : b.no} · ${SPECIES[sp].id}`, W * 0.06, H * 0.85);
    tx.needsUpdate = true;
  }

  function tick(t, dt, b, r) {
    // Your batch：肉的大小跟随Cell density;培养基颜色跟随酸碱度 (酚红指示剂：偏酸时由粉变橙）
    setTissue(vesC, r.f);
    vesC.mediumMat.color.copy(PINK).lerp(ORANGE, r.acid);
    vesC.tissue.rotation.y = t * 0.05;
    for (const v of [vesL, vesC, vesR]) {
      v.bub.forEach((p, i) => {
        p.y += dt * 0.12 * p.v;
        if (p.y > 1) p.y = 0;
        m4.makeTranslation(Math.cos(p.a + p.y) * p.r, 0.09 + p.y * 0.28, Math.sin(p.a + p.y) * p.r);
        v.bubbles.setMatrixAt(i, m4);
      });
      v.bubbles.instanceMatrix.needsUpdate = true;
    }
    scanOn = scanT.v;
    vesC.pts.material.opacity = scanOn * (0.45 + 0.35 * Math.sin(t * 2.2) ** 2);
    vesC.scan.material.opacity = scanOn * 0.9;
    vesC.scan.position.y = 0.1 + (0.5 + 0.5 * Math.sin(t * 1.3)) * 0.42;
    led.material = Math.floor(t * 1.5) % 2 ? M.ledRed : M.frame;
    // 车间工人
    const w = workers[0], px = Math.sin(t * 0.09) * 7.5;
    w.position.set(px, Math.abs(Math.sin(t * 3)) * 0.015, -6.45);
    w.rotation.y = Math.cos(t * 0.09) > 0 ? Math.PI / 2 : -Math.PI / 2;
    workers[1].rotation.y = Math.PI + Math.sin(t * 0.4) * 0.25;
    if (t - lastWall > 0.5) {
      lastWall = t;
      drawDataWall(dataTex.userData.ctx, 1600, 900, t, b, r);
      dataTex.needsUpdate = true;
    }
  }

  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const ANCHORS = {
    lid: v3(0, 0.6, 0), probe: v3(0.09, 0.48, 0.06), medium: v3(-0.1, 0.32, 0.1), tissue: v3(0.02, 0.15, 0.05),
    bubbles: v3(0.07, 0.22, 0.11), base: v3(0, 0.04, 0.2), pump: v3(0.36, 0.1, 0.08), center: v3(0, 0.29, 0),
  };
  const anchor = (k) => vesC.group.localToWorld(ANCHORS[k].clone());

  return { scene, tick, setBatch, setScan, anchor, tanks: tankList };
}
