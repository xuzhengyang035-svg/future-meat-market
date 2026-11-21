// 加工间参观廊：熟客可以隔着玻璃看。玻璃后面不是光鲜的大罐车间，而是一个地下作坊——
// 正对玻璃的一排不锈钢采样床上躺着供体动物，后面用防水布隔出几台小型反应器。
// 观众站在参观廊里；玻璃前的展台上是“你的批次”——一个台式灌流培养罐，里面的肉在长大。
// 左墙是生长数据墙；玻璃最左边是一扇磨砂门：细胞库，非参观区域。
import * as THREE from 'three';
import { canvasTexture } from './textures.js';
import { makeAnimal } from './animals.js';
import { meatGeometry, meatMaterial, meatHeight, kindFor } from './meat.js';
import { SPECIES } from './data.js';
import { pbr, model, decal, userDecal } from './assets.js';
import { ITEM } from './dress.js';
import { curve } from './growth.js';
import { grimeWallMaps, grimeFloorMaps, grimeMap, ageCanvas, puddleDecal, bloodSplatter } from './materials.js';
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
  suit: new THREE.MeshStandardMaterial({ color: 0x9aa4a6, roughness: 0.85, map: grimeMap(85) }),
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
  const mat = tex && tex.isMaterial ? tex : basic ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
    : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });   // 也可以直接传材质
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

const lit = (map, o = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.85, ...o });
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
    g.fillText('禁止游客进入 NO VISITORS', W / 2, H * 0.46 + 46);
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

// ------------------------------------------------------------------ 数据墙（生命数据化）
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
    ['在培批次 ACTIVE BATCHES', (3412 + Math.floor(t / 6) % 9).toLocaleString()],
    ['今日产出 OUTPUT TODAY', (1284.6 + t * 0.03).toFixed(1) + ' kg'],
    ['平均倍增时间 DOUBLING', '21.8 h'],
    ['屠宰动物 SLAUGHTERED', '0'],
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
  g.fillText(`SPECIMEN · ${b.cell} · ${b.reactor} · ${b.name ? '「' + b.name + '」' : b.no}`, cx - 314, cy - 222);
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
    [CELLS[3], -1, '肌管 MYOTUBE'], [CELLS[40], 1, '成肌细胞 MYOBLAST'],
    [CELLS.find((c) => c.type === 'fat'), 1, '脂肪细胞 ADIPOCYTE'], [CELLS[22], -1, '支架 SCAFFOLD'],
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

  // 中下：你的批次的生长曲线
  const gx = cx - 300, gy = H * 0.74, gw = 600, gh = 150;
  g.font = `400 15px ${MONO}`; g.fillStyle = GREEN;
  g.fillText(`BATCH ${b.no} · 生长曲线 N/K · DAY ${String(r.day).padStart(2, '0')}/${b.cycle}`, gx, gy - 16);
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

  // 右：批次记录（供体一栏永远是空的）
  const tx = W - 470;
  g.font = `400 17px ${MONO}`; g.fillStyle = GREEN; g.fillText('BATCH LOG · 批次记录', tx, 150);
  const cols = [['批次', 0], ['细胞系', 110], ['天数', 220], ['存活率', 290], ['供体*', 380]];
  g.font = `400 14px ${MONO}`; g.fillStyle = '#8fa592';
  cols.forEach(([c, x]) => g.fillText(c, tx + x, 184));
  const rows = LOG.slice();
  rows.splice(2, 0, { no: b.no, cell: b.cell, day: r.day, via: r.viability.toFixed(1), mine: true });
  rows.forEach((row, i) => {
    const y = 218 + i * 31;
    if (row.mine) { g.fillStyle = 'rgba(184,255,106,.16)'; g.fillRect(tx - 10, y - 21, 460, 29); }
    g.fillStyle = row.mine ? GREEN : '#dfe8e0';
    g.font = `400 15px ${MONO}`;
    g.fillText(row.mine && b.name ? `「${b.name}」` : row.no, tx, y);
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
  g.fillText('REFRESH 5s · 每个细胞都在记录之中', 40, H - 24);
  g.textAlign = 'right';
  g.fillText('* 供体信息不在本系统显示范围内', W - 40, H - 24);
  g.textAlign = 'left';
}

// ------------------------------------------------------------------ 培养罐（车间里的大罐子）
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

// ------------------------------------------------------------------ 台式培养罐（你的批次）
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
  // 数据化扫描层：点云 + 扫描环（只在聚焦时出现）
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
  scene.fog = new THREE.Fog(0x24272a, 12, 40);   // 车间里灰蒙蒙的，远处发暗
  // 墙：参观廊是发黄的旧瓷砖 + 绿漆墙裙；车间是刷漆的大墙，墙裙更高，满是锈水痕
  const wallMat = (w, h, o = {}) => pbr('long_white_tiles', w, h, { size: 2.6, rotate: Math.PI / 2, roughness: 0.75, color: 0xcfcac0 });   // 真实的旧白瓷砖
  const hallWallMat = (w, h) => new THREE.MeshStandardMaterial({ ...grimeWallMaps(w, h, { tile: false, dado: 1.6, ppm: 40, upper: [138, 142, 134], paint: [62, 76, 68], seed: 9, ao: 0.6 }) });

  // 参观廊：x -5..5，z -1..4，层高 3m，偏暗
  const gFloor = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), pbr('worn_tile_floor', 10, 5, { size: 2.4, roughness: 0.6, envMapIntensity: 1.4, color: 0xb0b0b0 }));
  gFloor.rotation.x = -Math.PI / 2; gFloor.position.set(0, 0, 1.5);
  root.add(gFloor);
  const gCeil = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), pbr('OfficeCeiling003', 10, 5, { size: 1.2, roughness: 0.9, color: 0x6a6a66 }));   // 矿棉板吊顶（照片扫描）
  gCeil.rotation.x = Math.PI / 2; gCeil.position.set(0, 3, 1.5);
  root.add(gCeil);
  for (const z of [0.3, 1.7, 3.1]) for (const x of [-3.2, -1.1, 1.0, 3.1]) box(1.3, 0.02, 0.08, M.warmLight, x, 2.985, z, root);
  for (const [w, d, x, z] of [[10, 0.02, 0, 3.99], [0.02, 5, -4.99, 1.5], [0.02, 5, 4.99, 1.5]]) box(w, 0.1, d, M.frame, x, 0.05, z, root);
  box(0.2, 3, 5.2, wallMat(5.2, 3), -5.1, 1.5, 1.5, root);
  box(0.2, 3, 5.2, wallMat(5.2, 3), 5.1, 1.5, 1.5, root);
  box(10.4, 3, 0.2, wallMat(10.4, 3), 0, 1.5, 4.1, root);
  // 左墙的木格栅（展厅常见的暖色背景）


  // 玻璃墙（x -3.4..5）+ 左侧实墙（细胞库门）
  box(8.4, 0.85, 0.2, wallMat(8.4, 0.85, { panel: 2.1, ao: 0.25 }), 0.8, 0.425, -1.0, root);
  box(10.4, 0.3, 0.2, wallMat(10.4, 0.3, { panel: 99, ao: 0 }), 0, 2.85, -1.0, root);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 1.85), M.glass);
  glass.position.set(0.8, 1.775, -1.0); glass.renderOrder = 6;
  root.add(glass);
  // 玻璃上手扶高度的手印和擦拭痕
  const smudge = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 1.85), new THREE.MeshStandardMaterial({ map: smudgeMap(8.4, 1.85, 0.12), transparent: true, depthWrite: false, roughness: 0.7, opacity: 0.6 }));
  smudge.position.set(0.8, 1.775, -0.985); smudge.renderOrder = 7;
  root.add(smudge);
  for (const x of [-3.4, -1.3, 0.8, 2.9, 5.0]) box(0.11, 1.9, 0.16, M.frame, x, 1.775, -1.0, root);
  box(8.5, 0.1, 0.16, M.frame, 0.8, 2.72, -1.0, root);
  box(8.4, 0.05, 0.3, M.frame, 0.8, 0.875, -0.95, root);
  box(1.8, 3, 0.2, wallMat(1.8, 3), -4.3, 1.5, -1.0, root);
  plane(0.16, 0.16, noPhotoSticker(), -2.3, 1.55, -0.99, 0, root);
  plane(0.16, 0.16, noPhotoSticker(), 3.9, 1.55, -0.99, 0, root);

  // 细胞库：磨砂玻璃门、红色标牌、读卡器
  box(1.12, 2.2, 0.06, M.frame, -4.25, 1.1, -0.88, root);
  plane(1.0, 2.1, frostedTexture(), -4.25, 1.07, -0.845, 0, root, false);
  plane(1.3, 0.24, textSign([['细胞库 · 禁止游客进入', 30, '#ffffff', 0.62, 500, SANS, 'center']], 640, 118, { bg: '#b3262d' }), -4.25, 2.42, -0.89, 0, root);
  box(0.08, 0.13, 0.03, M.frame, -3.6, 1.2, -0.87, root);
  const led = box(0.014, 0.014, 0.01, M.ledRed, -3.6, 1.24, -0.853, root);

  // 展台和三台台式培养罐
  const tileTop = (w, d) => pbr('long_white_tiles', w, d, { size: 1.6, roughness: 0.45, color: 0xb8b0a2, envMapIntensity: 1.2 });
  box(8.2, 0.92, 0.62, wallMat(8.2, 0.92, { dado: 0, size: 0.1, ppm: 120 }), 0.8, 0.46, -0.6, root);       // 整条瓷砖台面，沿着玻璃
  { const tt = new THREE.Mesh(new THREE.PlaneGeometry(8.3, 0.7), tileTop(8.3, 0.7, 77)); tt.rotation.x = -Math.PI / 2; tt.position.set(0.8, 0.935, -0.6); root.add(tt); }
  box(8.3, 0.04, 0.04, M.frame, 0.8, 0.915, -0.27, root);
  const vesL = vessel('chicken', 0.55, root, ['BR-01 G-0221', 'D14  P41']); vesL.group.position.set(-1.05, 0.95, -0.6);
  const vesC = vessel('beef', 0.3, root, ['BR-02 sample', '11/08  P37']); vesC.group.position.set(0.2, 0.95, -0.6);
  const vesR = vessel('pork', 0.85, root, ['BR-03 P-0932', 'D24  P52']); vesR.group.position.set(1.45, 0.95, -0.6);
  const plate = (txt, sub, x, hi) => plane(0.5, 0.09, textSign([[txt, 30, hi ? '#ffffff' : '#1d1f22', 0.48, 500, SANS], [sub, 20, hi ? 'rgba(255,255,255,.75)' : '#6b6762', 0.85, 400, MONO]], 400, 72, { bg: hi ? '#b3262d' : '#ebe9e4' }), x, 0.78, -0.274, 0, root, false);
  plate('展示批次 · 培养鸡胸肉', 'BR-01 · G-0221', -1.05, false);
  const myPlate = plate('你的批次', 'BR-02 · 演示', 0.2, true);
  plate('展示批次 · 培养猪排', 'BR-03 · P-0932', 1.45, false);
  const yTube = new THREE.MeshStandardMaterial({ color: 0xc8a030, roughness: 0.35, transparent: true, opacity: 0.85 });
  for (const x of [-1.05, 0.2, 1.45]) { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(x + 0.05, 1.6, -0.6), new THREE.Vector3(x + 0.12, 2.05, -0.7), new THREE.Vector3(x + 0.35, 2.15, -0.85), new THREE.Vector3(x + 0.5, 1.6, -0.95), new THREE.Vector3(x + 0.55, 0.96, -0.86)]); root.add(new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.009, 8), yTube)); }
  { const pot = cyl(0.16, 0.12, 0.3, new THREE.MeshStandardMaterial({ color: 0x8a7a66, roughness: 0.9, map: grimeMap(88) }), -2.4, 1.1, -0.6, root, 18);
    const lg = new THREE.SphereGeometry(0.07, 8, 5); lg.scale(1, 0.25, 1.4); const lm = new THREE.MeshStandardMaterial({ color: 0x3e5a32, roughness: 0.7, side: THREE.DoubleSide });
    let sd = 41; const rr = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 70; i++) { const a = rr() * 6.28, h = rr(); const l = new THREE.Mesh(lg, lm); l.position.set(-2.4 + Math.cos(a) * (0.1 + h * 0.25), 1.25 + h * 0.45 - (rr() < 0.3 ? rr() * 0.6 : 0), -0.6 + Math.sin(a) * (0.1 + h * 0.2)); l.rotation.set(rr() * 2, rr() * 6, rr()); root.add(l); } }
  { box(0.5, 0.03, 0.34, M.steel, -1.85, 0.955, -0.5, root); for (const [dx, dz, w, d] of [[0, -0.16, 0.5, 0.02], [0, 0.16, 0.5, 0.02], [-0.24, 0, 0.02, 0.34], [0.24, 0, 0.02, 0.34]]) box(w, 0.05, d, M.steel, -1.85 + dx, 0.975, -0.5 + dz, root); }
  { const ct = canvasTexture(256, 256, (g, W, H) => { g.fillStyle = '#d8ccc0'; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(160,60,60,.5)'; g.lineWidth = 4; for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(0, k * 32 + 10); g.lineTo(W, k * 32 + 10); g.stroke(); g.beginPath(); g.moveTo(k * 32 + 10, 0); g.lineTo(k * 32 + 10, H); g.stroke(); } const rr = ((n) => () => (n = (n * 16807) % 2147483647) / 2147483647)(5); bloodSplatter(g, 130, 120, 40, rr, { dry: 0.3, drops: 10 }); bloodSplatter(g, 80, 180, 22, rr, { dry: 0.7, drops: 6 }); });
    const cloth = ITEM.rag(root, -1.45, 0.936, -0.47, { seed: 5, ry: 0.4, mat: new THREE.MeshStandardMaterial({ map: ct, roughness: 1, side: THREE.DoubleSide }) });   // 皱巴巴的一块沾血纱布
    const hg = new THREE.PlaneGeometry(0.28, 0.25, 8, 8), hp = hg.attributes.position;      // 搭在台沿上垂下来的一角
    for (let i = 0; i < hp.count; i++) { const x = hp.getX(i), y = hp.getY(i); hp.setZ(i, Math.sin(x * 38) * 0.008 * (0.125 - y) * 6 + (0.125 - y) * 0.05); }
    hg.computeVertexNormals(); const hang = new THREE.Mesh(hg, cloth.material); hang.position.set(-1.35, 0.8, -0.27); hang.rotation.z = 0.06; root.add(hang); }
  { const amber = new THREE.MeshPhysicalMaterial({ color: 0x5a2a0a, roughness: 0.1, transparent: true, opacity: 0.85 }), clear = new THREE.MeshPhysicalMaterial({ color: 0xe8ece8, roughness: 0.05, transparent: true, opacity: 0.4, depthWrite: false });
    for (const [x, z, h, m] of [[-0.55, -0.75, 0.2, amber], [-0.45, -0.62, 0.24, clear], [-0.35, -0.72, 0.16, clear], [0.8, -0.6, 0.22, new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.5 })]]) { cyl(0.04, 0.04, h, m, x, 0.94 + h / 2, z, root, 14); cyl(0.018, 0.018, 0.04, M.frame, x, 0.96 + h, z, root, 10); } }
  { const cb = canvasTexture(256, 340, (g, W, H) => { g.fillStyle = '#e4dcc8'; g.fillRect(0, 0, W, H); g.fillStyle = '#222'; g.font = '600 18px sans-serif'; g.fillText('采样记录', 20, 40); g.font = '14px monospace'; for (let i = 0; i < 12; i++) { g.fillText(['11/15 06:02 P-0932', '11/14 22:00 B-0417', '11/14 14:10 P-0932', '11/14 14:00 B-0417', '11/14 06:00 P-1077'][i % 5], 20, 76 + i * 20); } ageCanvas(g, W, H, { amount: 1, seed: 71, drips: false }); });
    const clip = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.34), lit(cb)); clip.rotation.set(-Math.PI / 2, 0, -0.2); clip.position.set(2.35, 0.947, -0.5); root.add(clip);
    box(0.28, 0.008, 0.36, new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.7 }), 2.35, 0.94, -0.5, root).rotation.y = -0.2;
    box(0.1, 0.02, 0.04, M.steel, 2.39, 0.955, -0.67, root).rotation.y = -0.2;
    const pen = cyl(0.005, 0.005, 0.14, M.frame, 2.5, 0.955, -0.45, root, 6); pen.rotation.z = Math.PI / 2; pen.rotation.y = 0.5; }
  { box(0.3, 0.02, 0.1, M.steel, 3.1, 1.0, -0.62, root); box(0.3, 0.02, 0.1, M.steel, 3.1, 1.08, -0.62, root); for (const x of [-0.14, 0.14]) box(0.01, 0.12, 0.1, M.steel, 3.1 + x, 1.0, -0.62, root);
    const red = new THREE.MeshStandardMaterial({ color: 0x8a1a16, roughness: 0.3 }); for (let i = 0; i < 6; i++) { cyl(0.011, 0.011, 0.16, red, 2.98 + i * 0.05, 1.07, -0.62, root, 8); cyl(0.013, 0.013, 0.02, M.frame, 2.98 + i * 0.05, 1.16, -0.62, root, 8); } }
  { const wl = new THREE.Group(); wl.position.set(-3.75, 2.25, -0.86); root.add(wl);                 // 铁丝罩壁灯
    box(0.12, 0.12, 0.04, M.frame, 0, 0, -0.04, wl); cyl(0.07, 0.07, 0.18, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.2, 1.2) }), 0, 0, 0.08, wl, 14).rotation.x = Math.PI / 2;
    for (let k = 0; k < 6; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.004, 4, 16), M.frame); r.position.set(0, 0, 0.02 + k * 0.035); wl.add(r); }
    const wlp = new THREE.PointLight(0xffb060, 4, 4, 1.6); wlp.position.set(0, 0, 0.3); wl.add(wlp); }
  // 真实模型：台上的显微镜、记录夹板、化学试剂套装；一张被拉开的铁凳
  model('industrial_microscope', { pos: [-0.5, 0.935, -0.62], rot: 0.5, parent: root });
  model('chemistry_set', { pos: [3.85, 0.935, -0.65], rot: -0.1, scale: 0.8, parent: root });
  model('clipboard', { pos: [2.0, 0.937, -0.42], rot: 0.35, parent: root });
  model('metal_stool_01', { pos: [-1.6, 0, 0.0], rot: 0.6, tilt: 0.04, parent: root });
  model('WetFloorSign_01', { pos: [2.6, 0, 1.1], rot: -0.4, scale: 1.25, parent: root });
  model('desk_lamp_arm_01', { pos: [-0.12, 0.935, -0.78], rot: -0.6, scale: 0.85, parent: root });   // 显微镜旁的台灯
  model('binder_notebook', { pos: [3.15, 0.936, -0.42], rot: 0.25, parent: root });
  model('medical_box', { pos: [-2.95, 0.935, -0.62], rot: 0.08, scale: 0.8, parent: root });
  // 参观廊：门口到玻璃前踩出来的脏印、拖地的湿痕；墙角返潮
  decal('SurfaceImperfections017', root, { pos: [1.2, 0.003, 1.6], rot: [-Math.PI / 2, 0, 0.3], w: 5.0, h: 2.6, color: 0x2e2a24, opacity: 0.45 });
  decal('Smear007', root, { pos: [2.2, 0.0035, 0.9], rot: [-Math.PI / 2, 0, 1.9], w: 2.2, h: 1.3, color: 0x2a2a24, opacity: 0.22, roughness: 0.1 });
  decal('Leaking009', root, { pos: [-4.99, 0.45, 2.9], rot: [0, Math.PI / 2, 0], w: 2.0, h: 0.9, color: 0x5a5040, opacity: 0.6 });
  decal('Leaking004', root, { pos: [4.99, 2.55, 3.2], rot: [0, -Math.PI / 2, 0], w: 1.0, h: 1.2, color: 0x6a5a44, opacity: 0.6 });
  for (const [x, i] of [[-1.05, 3], [0.2, 9], [1.45, 3]]) {
    const s = new THREE.SpotLight(0xffe2b8, i, 3.4, 0.34, 0.65, 1.4);
    s.position.set(x, 2.95, -0.25); s.target.position.set(x, 1.0, -0.6);
    root.add(s, s.target);
  }

  // 左墙：生长数据墙
  const dataTex = canvasTexture(1600, 900, (g, W, H) => { g.fillStyle = '#06080a'; g.fillRect(0, 0, W, H); });
  box(0.06, 1.56, 2.74, M.frame, -4.97, 1.75, 1.6, root);
  plane(2.6, 1.4625, dataTex, -4.935, 1.75, 1.6, Math.PI / 2, root);

  // 右墙：品牌标语、参观须知、宣传册架
  plane(2.4, 1.1, textSign([
    ['FUTURE MEAT MARKET · 加工间 · 熟客参观', 22, '#8a8580', 0.16, 500, MONO],
    ['SEE IT GROW.', 112, '#141414', 0.5, 300],
    ['看得见，才安心。', 50, '#141414', 0.72, 400],
    ['每一份订单，都在这里长大。', 24, '#6b6762', 0.86, 400],
  ], 1200, 550, { bar: '#b3262d' }), 4.995, 1.95, 0.6, -Math.PI / 2, root);
  plane(0.5, 0.7, textSign([
    ['参观须知', 46, '#141414', 0.12, 500], ['VISITOR NOTICE', 20, '#8a8580', 0.18, 500, MONO],
    ['1  请勿拍照、录像', 24, '#333', 0.32], ['2  请勿拍打玻璃', 24, '#333', 0.42],
    ['3  工作人员不便回答', 24, '#333', 0.52], ['    工艺与细胞来源问题', 24, '#333', 0.6],
    ['4  参观时长约 15 分钟', 24, '#333', 0.7],
  ], 400, 560, { bar: '#141414' }), 4.995, 1.45, 2.45, -Math.PI / 2, root, false);
  box(0.25, 1.0, 0.7, M.frame, 4.86, 0.5, 1.5, root);
  for (let i = 0; i < 3; i++) plane(0.18, 0.24, textSign([['SEE IT', 30, '#141414', 0.3, 300], ['GROW', 30, '#141414', 0.5, 300], ['宣传册', 20, '#b3262d', 0.85, 500]], 180, 240, { bg: '#f4f1ea' }), 4.72, 0.75, 1.3 + i * 0.2, -Math.PI / 2, root, false);

  // 后墙：回门店的门
  box(1.1, 2.2, 0.06, M.frame, 3.6, 1.1, 3.98, root);
  plane(1.0, 2.1, textSign([['←  返回门店', 60, '#ffffff', 0.12, 500, SANS, 'center'], ['STORE', 28, 'rgba(255,255,255,.6)', 0.17, 500, MONO, 'center']], 400, 840, { bg: '#3a3c40' }), 3.6, 1.07, 3.945, Math.PI, root, false);
  plane(0.42, 0.14, textSign([['EXIT 出口', 40, '#ffffff', 0.7, 600, SANS, 'center']], 300, 100, { bg: '#1f8a4c' }), 3.6, 2.42, 3.99, Math.PI, root);
  box(1.8, 0.42, 0.45, M.frame, -0.6, 0.21, 2.9, root);
  box(1.76, 0.06, 0.42, M.fabric, -0.6, 0.45, 2.9, root);

  // ================================================================ 玻璃后面：加工间（参考帆布棚里的地下实验室 + 停尸房的一排床）
  // 一个地下作坊不会有 2000 升的大罐：这里是几台 200 升的一次性生物反应器，用防水布隔出来。
  // 玻璃正对面是一排不锈钢采样床——原代细胞传几十代就会衰老，所以供体动物就养在这里，定期活检。
  const hall = new THREE.Group();
  root.add(hall);
  const HC = 3.6;                                                         // 层高很低，压抑
  // 地面：老式八角形白瓷砖，砖缝里嵌着小方块（参考老医院、老实验室）
  const octTex = (() => {
    const S = 512, n = 4, cs = S / n, k = cs * 0.29;
    const draw = (g, mode) => {
      g.fillStyle = mode === 'map' ? '#5a625e' : mode === 'rough' ? '#e0e0e0' : '#000'; g.fillRect(0, 0, S, S);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const x0 = x * cs + 3, y0 = y * cs + 3, w = cs - 6;
        g.beginPath(); g.moveTo(x0 + k, y0); g.lineTo(x0 + w - k, y0); g.lineTo(x0 + w, y0 + k); g.lineTo(x0 + w, y0 + w - k); g.lineTo(x0 + w - k, y0 + w); g.lineTo(x0 + k, y0 + w); g.lineTo(x0, y0 + w - k); g.lineTo(x0, y0 + k); g.closePath();
        if (mode === 'map') { const v = 200 + ((x * 7 + y * 13) % 5) * 6; g.fillStyle = `rgb(${v},${v + 6},${v + 4})`; } else g.fillStyle = mode === 'rough' ? '#5a5a5a' : '#fff';
        g.fill();
      }
      for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) {           // 砖缝交叉处的小方块
        g.save(); g.translate(x * cs, y * cs); g.rotate(Math.PI / 4);
        g.fillStyle = mode === 'map' ? '#7d8783' : mode === 'rough' ? '#6a6a6a' : '#e8e8e8'; const q = k * 0.62; g.fillRect(-q / 2, -q / 2, q, q);
        g.restore();
      }
    };
    const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); draw(g, 'map');
    ageCanvas(g, S, S, { amount: 1.1, seed: 53, drips: false });
    const rc = document.createElement('canvas'); rc.width = rc.height = S; draw(rc.getContext('2d'), 'rough');
    const mk = (cv, srgb) => { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(16 / 1.2, 11 / 1.2); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
    return { map: mk(c, true), roughnessMap: mk(rc, false) };
  })();
  const hFloor = new THREE.Mesh(new THREE.PlaneGeometry(16, 11), pbr('worn_tile_floor', 16, 11, { size: 2.4, roughness: 0.55, envMapIntensity: 1.5, color: 0xa8a8a8 }));
  hFloor.rotation.x = -Math.PI / 2; hFloor.position.set(0, 0, -6.6);
  hall.add(hFloor);
  const hCeil = new THREE.Mesh(new THREE.PlaneGeometry(16, 11), new THREE.MeshStandardMaterial({ color: 0x3a3c38, roughness: 1, map: grimeMap(80) }));
  hCeil.rotation.x = Math.PI / 2; hCeil.position.set(0, HC, -6.6);
  hall.add(hCeil);
  const tileWall = (w, h) => pbr('long_white_tiles', w, h, { size: 2.6, rotate: Math.PI / 2, roughness: 0.75, color: 0xbab6ac });
  box(16, HC, 0.2, tileWall(16, HC), 0, HC / 2, -12.1, hall);
  box(0.2, 0.9, 11, tileWall(11, 0.9), -8.1, 0.45, -6.6, hall);
  {                                                                         // 玻璃砖墙：后面一排灯管，透出冷绿色的光
    const gb = canvasTexture(512, 512, (g, Wt, Ht) => {
      g.fillStyle = '#4a5a54'; g.fillRect(0, 0, Wt, Ht);
      const n = 8, cs = Wt / n;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const gr = g.createRadialGradient(x * cs + cs / 2, y * cs + cs / 2, 2, x * cs + cs / 2, y * cs + cs / 2, cs * 0.6);
        const v = 0.75 + ((x * 5 + y * 3) % 7) / 25;
        gr.addColorStop(0, `rgba(${Math.round(200 * v)},${Math.round(240 * v)},${Math.round(222 * v)},1)`); gr.addColorStop(1, `rgba(${Math.round(110 * v)},${Math.round(150 * v)},${Math.round(136 * v)},1)`);
        g.fillStyle = gr; g.fillRect(x * cs + 4, y * cs + 4, cs - 8, cs - 8);
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.strokeRect(x * cs + 10, y * cs + 10, cs - 20, cs - 20);
      }
      ageCanvas(g, Wt, Ht, { amount: 0.8, seed: 31, drips: false });
    });
    gb.wrapS = gb.wrapT = THREE.RepeatWrapping; gb.repeat.set(11 / 1.6, (HC - 0.9) / 1.6);
    const gm = new THREE.MeshStandardMaterial({ map: gb, emissiveMap: gb, emissive: new THREE.Color(0.55, 0.75, 0.68), emissiveIntensity: 0.5, roughness: 0.15, metalness: 0.1 });
    box(0.2, HC - 0.9, 11, gm, -8.1, 0.9 + (HC - 0.9) / 2, -6.6, hall);
    box(0.24, 0.08, 11, M.white, -8.0, 0.92, -6.6, hall);
  }
  box(0.2, HC, 11, tileWall(11, HC), 8.1, HC / 2, -6.6, hall);
  box(16, HC - 2.7, 0.2, M.frame, 0, 2.7 + (HC - 2.7) / 2, -1.2, hall);
  box(0.08, 0.02, 10, M.drum, 0, 0.004, -6.6, hall);                      // 地上的排水沟
  for (const z of [-2.2, -6.0, -9.8]) { const d = cyl(0.12, 0.12, 0.01, M.frame, 0, 0.006, z, hall, 16); }

  const W = {                                                             // 床、帘子、输液用的材质
    sheet: new THREE.MeshStandardMaterial({ color: 0x9aa098, roughness: 1, map: grimeMap(81) }),
    strap: new THREE.MeshStandardMaterial({ color: 0x2a2a26, roughness: 0.7 }),
    gauze: new THREE.MeshStandardMaterial({ color: 0xd0cbbd, roughness: 1 }),
    tag: new THREE.MeshStandardMaterial({ color: 0xd8b02a, roughness: 0.5 }),
    bag: new THREE.MeshPhysicalMaterial({ color: 0xc8d4cc, roughness: 0.2, transparent: true, opacity: 0.6 }),
    line: new THREE.MeshStandardMaterial({ color: 0x9a3a3a, roughness: 0.3, transparent: true, opacity: 0.85 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x1e201e, roughness: 0.8 }),
    curtain: new THREE.MeshStandardMaterial({ color: 0x6f7d72, roughness: 1, transparent: true, opacity: 0.92, side: THREE.DoubleSide, map: grimeMap(82) }),
    tarp: new THREE.MeshPhysicalMaterial({ color: 0xdfe8e4, roughness: 0.2, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false, map: grimeMap(83) }),
    duct: new THREE.MeshStandardMaterial({ color: 0xc8d2ce, roughness: 0.5, metalness: 0.3, map: grimeMap(84) }),
    enamel: new THREE.MeshStandardMaterial({ color: 0xd8e2de, roughness: 0.35, map: grimeMap(85) }),
    enamelDark: new THREE.MeshStandardMaterial({ color: 0x9aa8a4, roughness: 0.45, map: grimeMap(86) }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xb89a2a, roughness: 0.5, metalness: 0.3, map: grimeMap(87) }),
    cable: new THREE.MeshStandardMaterial({ color: 0x141616, roughness: 0.6 }),
    glow: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.6, 2.5) }),
    lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.55, 2.3) }),
    medium: new THREE.MeshStandardMaterial({ color: 0xc8506a, roughness: 0.25, transparent: true, opacity: 0.75 }),
  };
  const hose = (pts, r, mat = W.rubber, parent = hall) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 48, r, 8), mat); parent.add(m); return m; };
  const blobMat = new THREE.MeshBasicMaterial({ map: blobShadow(), transparent: true, depthWrite: false, opacity: 0.85 });
  const blob = (x, z, sz, parent = hall, y = 0.006) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), blobMat); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); parent.add(p); return p; };

  // ---------------------------------------------------------------- 一排采样床（头朝玻璃，观众正好看见动物的脸）
  // 心电监护的波形：一张横向平铺的贴图，tick 里让它滚动
  const ecgTex = canvasTexture(512, 128, (g, Wt, Ht) => {
    g.fillStyle = '#041008'; g.fillRect(0, 0, Wt, Ht);
    g.strokeStyle = '#6aff7a'; g.lineWidth = 3; g.beginPath();
    for (let x = 0; x <= Wt; x += 2) { const p = (x % 128) / 128; const y = p > 0.42 && p < 0.46 ? 20 : p > 0.46 && p < 0.5 ? 108 : p > 0.6 && p < 0.7 ? 56 : 70; g.lineTo(x, y); }
    g.stroke();
  });
  ecgTex.wrapS = THREE.RepeatWrapping;
  const flatTex = canvasTexture(512, 128, (g, Wt, Ht) => {                // 空床的监护仪：没有信号
    g.fillStyle = '#030604'; g.fillRect(0, 0, Wt, Ht);
    g.fillStyle = 'rgba(106,255,122,.45)'; g.fillRect(0, 70, Wt, 2);
    g.font = '600 22px monospace'; g.fillStyle = 'rgba(255,90,90,.85)'; g.fillText('NO SIGNAL', 16, 34);
  });
  const bedTop = 0.82;
  const beds = [];
  const ward = (x, kind, info) => {
    const g = new THREE.Group(); g.position.set(x, 0, -3.9); g.rotation.y = -Math.PI / 2; hall.add(g);   // 本地 +x（床头）朝向玻璃
    const L = (lx, ly, lz) => new THREE.Vector3(x - lz, ly, -3.9 + lx);        // 床的本地坐标 → 世界坐标（走近观察用的标注点）
    let pose = null, siteY = bedTop + 0.3;
    box(1.6, 0.04, 0.74, M.steel, 0, bedTop - 0.02, 0, g);
    for (const s of [-1, 1]) {
      box(1.6, 0.05, 0.02, M.steel, 0, bedTop + 0.13, s * 0.38, g);
      for (const xx of [-0.65, 0, 0.65]) cyl(0.008, 0.008, 0.15, M.steel, xx, bedTop + 0.05, s * 0.38, g, 6);
    }
    for (const [xx, zz] of [[-0.74, -0.33], [0.74, -0.33], [-0.74, 0.33], [0.74, 0.33]]) {
      cyl(0.016, 0.016, bedTop - 0.08, M.steel, xx, (bedTop - 0.08) / 2 + 0.06, zz, g, 8);
      cyl(0.035, 0.035, 0.03, W.rubber, xx, 0.035, zz, g, 12).rotation.x = Math.PI / 2;
    }
    box(1.5, 0.02, 0.64, M.steelDark, 0, 0.3, 0, g);
    box(1.52, 0.03, 0.68, W.sheet, 0, bedTop + 0.015, 0, g);
    box(0.04, 0.5, 0.74, M.steel, 0.8, bedTop + 0.1, 0, g);                  // 床头板
    // 床头挂的记录板（对着玻璃，看得清）
    const card = plane(0.34, 0.24, textSign([[info[0], 34, '#141414', 0.24, 600, MONO], [info[1], 22, '#333', 0.46, 400, SANS], [info[2], 22, '#333', 0.64, 400, SANS], [info[3], 22, '#b3262d', 0.84, 600, SANS]], 340, 240, { bg: '#e8e2cc' }), 0.83, bedTop + 0.12, 0, Math.PI / 2, g, false);
    // 输液架 + 采样机 + 监护仪
    cyl(0.012, 0.012, 1.9, M.steel, -0.7, 0.95, 0.46, g, 8);
    box(0.25, 0.012, 0.012, M.steel, -0.7, 1.88, 0.46, g);
    box(0.09, 0.16, 0.03, W.bag, -0.63, 1.75, 0.46, g);
    const sampler = new THREE.Group(); sampler.position.set(0.3, 0, -0.62); g.add(sampler);
    box(0.32, 0.95, 0.32, M.white, 0, 0.475, 0, sampler);
    cyl(0.012, 0.012, 0.02, M.ledRed, 0.1, 0.62, 0.165, sampler, 8).rotation.x = Math.PI / 2;
    const mon = new THREE.Group(); mon.position.set(0.55, 1.45, 0.5); mon.rotation.y = Math.PI / 2 - 0.4; g.add(mon);
    box(0.3, 0.22, 0.05, M.frame, 0, 0, -0.03, mon);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.18), new THREE.MeshBasicMaterial({ map: kind === 'empty' ? flatTex : ecgTex, color: new THREE.Color(1.4, 1.4, 1.4) })); mon.add(scr);
    cyl(0.01, 0.01, 0.6, M.steel, 0, -0.35, -0.03, mon, 6);
    // 头顶一盏无影灯
    const head = new THREE.Group(); head.position.set(0.1, HC - 0.75, 0); g.add(head);
    cyl(0.01, 0.01, 0.75, M.steel, 0, 0.37, 0, head, 6);
    cyl(0.22, 0.26, 0.09, M.frame, 0, 0, 0, head, 24);
    cyl(0.18, 0.18, 0.01, W.lamp, 0, -0.05, 0, head, 24);
    const sl = new THREE.SpotLight(0xf0eee2, 2.3, 3.4, 0.5, 0.55, 1.3); sl.position.set(0.1, HC - 0.82, 0); sl.target.position.set(0, bedTop, 0); g.add(sl, sl.target);
    let tubeEnd = [0.1, bedTop + 0.3, 0];
    if (kind === 'pig' || kind === 'cow') {                                   // 侧躺在床上，头朝床头
      const sc = kind === 'pig' ? 2.2 : 2.25;
      const lie = new THREE.Group(); lie.rotation.set(Math.PI / 2, 0, 0); g.add(lie);
      const half = (kind === 'pig' ? 0.095 : 0.078) * sc;
      lie.position.set(-0.02, bedTop + 0.03 + half * 0.92, 0);
      const a = makeAnimal(kind, 'photo'); a.scale.setScalar(sc); a.position.set(-0.04 * sc, -0.17 * sc, 0); lie.add(a);
      pose = { o: a, s: sc, rate: kind === 'cow' ? 1.1 : 1.7 };                 // 呼吸：镇静的牛慢一点
      siteY = bedTop + 0.03 + half * 1.84;
      for (const xx of [-0.3, 0.2]) box(0.06, 0.012, 0.76, W.strap, xx, bedTop + 0.03 + half * 1.85, 0, g);   // 约束带
      box(0.07, 0.004, 0.05, W.gauze, -0.05, bedTop + 0.03 + half * 1.84, 0.05, g);                         // 采样处的纱布
      if (info.length > 4) box(0.05, 0.004, 0.04, W.gauze, 0.15, bedTop + 0.03 + half * 1.82, -0.05, g);
      tubeEnd = [-0.05, bedTop + 0.03 + half * 1.8, 0.03];
      if (kind === 'cow') {                                                     // 小牛：身上盖着布，露出头和耳标
        const cover = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), W.sheet);
        cover.scale.set(0.5, half * 2.25, 0.37); cover.position.set(-0.22, bedTop + 0.02, 0); g.add(cover);
        box(0.025, 0.035, 0.006, W.tag, 0.4, bedTop + half * 1.55, 0.12, g);
      }
    } else if (kind === 'hen') {                                                // 鸡在铁丝笼里
      const cage = new THREE.Group(); cage.position.set(0, bedTop + 0.03, 0); g.add(cage);
      for (let i = 0; i <= 6; i++) for (const s of [-1, 1]) cyl(0.003, 0.003, 0.42, M.steel, -0.3 + i * 0.1, 0.21, s * 0.22, cage, 4);
      for (let i = 0; i <= 4; i++) for (const s of [-1, 1]) cyl(0.003, 0.003, 0.42, M.steel, s * 0.3, 0.21, -0.2 + i * 0.1, cage, 4);
      box(0.62, 0.006, 0.46, M.steel, 0, 0.42, 0, cage);
      const a = makeAnimal('hen', 'photo'); a.rotation.y = 0.5; cage.add(a);
      pose = { o: a, s: 1, hen: true };
    } else {                                                                     // 空床：床单皱着，约束带松开垂下来
      for (const xx of [-0.3, 0.2]) { box(0.06, 0.012, 0.3, W.strap, xx, bedTop + 0.04, 0.2, g); const d = box(0.06, 0.3, 0.012, W.strap, xx, bedTop - 0.12, 0.38, g); d.rotation.x = 0.1; }
      const lump = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), W.sheet); lump.scale.set(0.4, 0.06, 0.25); lump.position.set(-0.3, bedTop + 0.04, -0.05); g.add(lump);
    }
    hose([[-0.63, 1.66, 0.46], [-0.45, 1.3, 0.38], [-0.2, bedTop + 0.5, 0.2], tubeEnd], 0.004, W.line, g);
    if (kind !== 'empty') hose([[0.3, 0.88, -0.5], [0.2, bedTop + 0.35, -0.3], [tubeEnd[0] + 0.05, tubeEnd[1] + 0.02, tubeEnd[2] - 0.05]], 0.005, W.line, g);
    blob(x, -3.9, 1.9);
    // 走近观察：站在床侧（靠中间走道那边、避开采样机），从斜上方看下去
    const s = x > 0.5 ? -1 : 1;
    const pts = {
      card: L(0.83, bedTop + 0.12, 0), mon: L(0.55, 1.45, 0.5), samp: L(0.3, 0.72, -0.62), iv: L(-0.63, 1.75, 0.46),
      site: kind === 'hen' ? L(0, bedTop + 0.24, 0) : kind === 'empty' ? L(-0.3, bedTop + 0.06, -0.05) : L(-0.05, siteY, 0.05),
      strap: kind === 'empty' ? L(-0.3, bedTop - 0.12, 0.38) : L(-0.3, siteY, -0.25),
      tag: L(0.4, bedTop + 0.12, 0.12),
    };
    beds.push({ id: info[0], kind, x, pose, pts, eye: kind === 'hen' ? [x - 1.2, 1.8, -3.7] : [x + s * 1.65, 1.95, -4.4], at: [x, kind === 'hen' ? 1.08 : 1.0, -3.9] });
    return g;
  };
  ward(-6.8, 'pig', ['P-0932', '杜洛克 · 母 · 4 岁', '活检 865 次', '下次：明早 06:00']);
  ward(-4.1, 'cow', ['B-0417', '荷斯坦 · 公', '活检 1,312 次', '下次：今晚 22:00', 2]);
  ward(0.0, 'empty', ['P-0101', '——', '活检 2,040 次', '已停用 11/09']);
  ward(4.1, 'pig', ['P-1077', '大白 · 母 · 8 月龄', '活检 6 次', '新到 11/13']);
  ward(6.8, 'hen', ['G-0221', '白羽 · 母', '活检 412 次', '状态：观察']);
  // 床与床之间的布帘（挂在顶上的轨道上，有的拉开、有的拉上一半）
  for (const x of [-5.45, -2.05, 2.05, 5.45]) {
    box(0.03, 0.03, 2.2, M.steel, x, HC - 0.3, -3.9, hall);
    const n = x === 2.05 ? 12 : x === -5.45 ? 4 : 8;
    for (let k = 0; k < n; k++) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 2.0), W.curtain);
      s.position.set(x + (k % 2) * 0.04, HC - 1.32, -4.95 + k * 0.11); s.rotation.y = (k % 2 ? 0.5 : -0.5); hall.add(s);
    }
  }
  // 地上：接水桶、一卷软管、几块沾了碘伏的纱布
  for (const x of [-5.9, 3.1]) cyl(0.16, 0.13, 0.3, M.drum, x, 0.15, -2.6, hall, 18);
  for (let i = 0; i < 6; i++) { const p = plane(0.08, 0.06, null, -3 + i * 1.2, 0.007, -2.5 - (i % 3) * 0.3, 0, hall, false); p.material = W.gauze; p.rotation.set(-Math.PI / 2, 0, i); }
  hose([[-7.9, 0.3, -2.0], [-7.0, 0.02, -2.6], [-3.5, 0.02, -2.4], [-1.2, 0.02, -2.9]], 0.02);

  // ---------------------------------------------------------------- 后半间：塑料隔断后面的生产区（白色反应器、手套箱工作台、培养箱、液氮罐）
  for (const [x, w] of [[-5.5, 4.4], [1.4, 4.6], [6.5, 2.4]]) {                 // 半透明的白色塑料隔断，留着几道缝
    for (let k = 0; k < Math.round(w / 0.2); k++) { const t = new THREE.Mesh(new THREE.PlaneGeometry(0.22, HC - 0.25), W.tarp); t.position.set(x - w / 2 + 0.11 + k * 0.2, (HC - 0.25) / 2 + 0.03, -6.6 + (k % 2) * 0.02); t.rotation.y = (Math.sin(k * 7.1 + x) * 0.15); hall.add(t); }   // 透明 PVC 门帘条
  }
  hose([[-8, HC - 0.1, -6.6], [8, HC - 0.1, -6.6]], 0.01, M.frame);
  const bioTex = canvasTexture(128, 112, (g, Wt, Ht) => {                       // 黄色三角警示牌：生物危害
    g.clearRect(0, 0, Wt, Ht); g.fillStyle = '#d8b82a'; g.strokeStyle = '#141414'; g.lineWidth = 7;
    g.beginPath(); g.moveTo(Wt / 2, 6); g.lineTo(Wt - 6, Ht - 6); g.lineTo(6, Ht - 6); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#141414'; g.font = '700 46px sans-serif'; g.textAlign = 'center'; g.fillText('☣', Wt / 2, Ht - 22);
  });
  const bioMat = new THREE.MeshBasicMaterial({ map: bioTex, transparent: true, color: new THREE.Color(0.8, 0.8, 0.8) });
  const crt = (rows, seed) => canvasTexture(256, 192, (g, Wt, Ht) => {          // 绿色单色显示器
    g.fillStyle = '#031208'; g.fillRect(0, 0, Wt, Ht);
    g.fillStyle = '#5aff7a'; g.font = '600 16px monospace';
    rows.forEach((r, i) => g.fillText(r, 12, 26 + i * 22));
    g.strokeStyle = '#5aff7a'; g.lineWidth = 2; g.beginPath();
    for (let x = 0; x < Wt; x += 4) g.lineTo(x, Ht - 30 + Math.sin(x * 0.08 + seed) * 10 + Math.sin(x * 0.31 + seed) * 4); g.stroke();
    g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 0; y < Ht; y += 3) g.fillRect(0, y, Wt, 1);
  });
  const tankList = [];
  const reactor = (x, z, name, fill) => {                                      // 200 L 一次性袋式反应器：不锈钢外壳 + 观察窗 + 控制箱
    const g = new THREE.Group(); g.position.set(x, 0, z); hall.add(g);
    box(0.8, 0.5, 0.8, M.steelDark, 0, 0.25, 0, g);
    for (const [xx, zz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) cyl(0.03, 0.03, 0.03, W.rubber, xx, 0.015, zz, g, 10).rotation.z = Math.PI / 2;
    cyl(0.34, 0.34, 1.0, M.steel, 0, 1.0, 0, g, 32);
    cyl(0.35, 0.35, 0.04, M.steel, 0, 0.52, 0, g, 32); cyl(0.35, 0.35, 0.04, M.steel, 0, 1.49, 0, g, 32);
    { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.12), bioMat); b.position.set(-0.2, 1.25, 0.29); b.rotation.y = -0.6; g.add(b); }
    const win = new THREE.Mesh(new THREE.CylinderGeometry(0.345, 0.345, 0.7, 24, 1, true, -0.35, 0.7), W.medium); win.position.y = 0.95; win.rotation.y = Math.PI / 2 - 0.05; g.add(win);
    cyl(0.3, 0.3, 0.02, M.steelDark, 0, 1.51, 0, g, 24);
    for (const a of [0, 2, 4]) hose([[Math.cos(a) * 0.15, 1.52, Math.sin(a) * 0.15], [Math.cos(a) * 0.3, 1.9, Math.sin(a) * 0.3], [Math.cos(a) * 0.6, HC - 0.1, -0.3]], 0.012, a ? W.line : W.rubber, g);
    box(0.3, 0.4, 0.2, W.enamel, 0.55, 1.1, 0, g);
    plane(0.22, 0.14, screenTex(name, [`T 37.0`, `pH 7.${1 + (fill % 3)}`, `DO ${36 + fill}%`]), 0.55, 1.18, 0.101, 0, g);
    plane(0.3, 0.09, textSign([[name, 52, '#1d1f22', 0.72, 600, MONO, 'center']], 256, 76, { bg: '#d8d6cc' }), 0, 1.35, 0.342, 0, g, false);
    blob(x, z, 1.4);
    tankList.push({ name, size: '200 L', pos: new THREE.Vector3(x, 1.75, z + 0.3) });
  };
  [[-5.8, -8.4], [-3.6, -8.4], [-1.4, -8.4], [0.8, -8.4], [3.0, -8.4], [5.2, -8.4]].forEach(([x, z], i) => reactor(x, z, 'BR-' + String(i + 1).padStart(2, '0'), i * 7));
  // 后墙：一排白色手套箱工作台（窗口里亮着白光、两只手套口、侧面一台绿色显示器、上面贴着生物危害标识）
  const station = (x, name, rows) => {
    const g = new THREE.Group(); g.position.set(x, 0, -11.55); hall.add(g);
    box(2.0, 0.9, 0.85, W.enamel, 0, 0.45, 0, g);                              // 下柜
    box(2.0, 0.05, 0.95, W.enamelDark, 0, 0.92, 0.05, g);                       // 台面
    for (let i = 0; i < 3; i++) box(0.6, 0.6, 0.01, W.enamelDark, -0.65 + i * 0.65, 0.45, 0.43, g);
    box(2.0, 1.3, 0.8, W.enamel, 0, 1.6, -0.05, g);                             // 上箱
    const winM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 2.1, 2.05) });
    const w = plane(1.5, 0.75, winM, -0.12, 1.62, 0.352, 0, g); w.rotation.x = -0.12;   // 亮着的观察窗
    box(1.6, 0.08, 0.06, W.enamelDark, -0.12, 2.04, 0.37, g); box(1.6, 0.08, 0.06, W.enamelDark, -0.12, 1.2, 0.4, g);
    for (const dx of [-0.45, 0.2]) { const r = cyl(0.09, 0.09, 0.05, M.frame, dx, 1.45, 0.4, g, 18); r.rotation.x = Math.PI / 2 - 0.12; const gl = cyl(0.075, 0.06, 0.25, W.rubber, dx, 1.45, 0.52, g, 14); gl.rotation.x = Math.PI / 2 - 0.12; }
    for (let i = 0; i < 4; i++) cyl(0.03, 0.03, 0.08, W.medium, -0.6 + i * 0.25, 1.06, 0.1, g, 12);   // 窗里几只培养瓶
    box(0.45, 0.42, 0.42, W.enamelDark, 0.82, 2.48, 0.0, g);                    // 顶上的风机
    const mon = new THREE.Group(); mon.position.set(0.85, 1.55, 0.36); g.add(mon);   // 侧面一台小显示器
    box(0.3, 0.25, 0.2, W.enamelDark, 0, 0, -0.08, mon);
    plane(0.24, 0.18, new THREE.MeshBasicMaterial({ map: crt(rows, x), color: new THREE.Color(1.3, 1.3, 1.3) }), 0, 0, 0.022, 0, mon);
    { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.17), bioMat); b.position.set(0.85, 2.05, 0.37); g.add(b); }
    plane(0.4, 0.09, textSign([[name, 40, '#1d1f22', 0.72, 600, MONO, 'center']], 256, 60, { bg: '#d8ded8' }), -0.12, 2.15, 0.36, 0, g, false);
    const l = new THREE.PointLight(0xe6fff6, 1.6, 2.4, 2); l.position.set(-0.1, 1.6, 0.8); g.add(l);
    blob(x, -11.4, 2.3);
    return g;
  };
  station(-5.9, 'GB-01', ['CELL LINE B-0417', 'PASSAGE P38', 'VIAB 96.2%', 'O2 0.4 ppm']);
  station(-3.4, 'GB-02', ['CELL LINE P-0932', 'PASSAGE P52', 'VIAB 94.8%', 'O2 0.6 ppm']);
  station(-0.9, 'GB-03', ['BIOPSY INTAKE', 'P-1077  11/15', 'DIGEST 45 MIN', 'TRYPSIN 0.25%']);
  station(1.6, 'GB-04', ['CELL LINE G-0221', 'PASSAGE P41', 'VIAB 91.0%', 'O2 0.5 ppm']);
  // 两台叠起来的 CO₂ 培养箱（白色）
  for (let i = 0; i < 2; i++) { box(0.8, 0.8, 0.7, W.enamel, 4.0, 0.45 + i * 0.82, -11.5, hall); plane(0.12, 0.07, screenTex('CO₂ 5.0%', ['37.0 C']), 4.25, 0.62 + i * 0.82, -11.14, 0, hall); box(0.04, 0.3, 0.03, M.frame, 3.65, 0.45 + i * 0.82, -11.14, hall); }
  // 液氮罐、CO₂ 气瓶挪到右后角
  for (const [x, z] of [[5.6, -11.3], [6.3, -11.5]]) { cyl(0.3, 0.3, 1.1, M.steel, x, 0.6, z, hall, 24); const d = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.steel); d.position.set(x, 1.15, z); hall.add(d); }
  for (let i = 0; i < 3; i++) cyl(0.11, 0.11, 1.35, M.frame, 7.4, 0.68, -9.4 + i * 0.3, hall, 14);
  // 反应器前面一圈黄色护栏
  { const rz = -7.55, x0 = -6.6, x1 = 6.0;
    const r1 = cyl(0.025, 0.025, x1 - x0, W.yellow, (x0 + x1) / 2, 1.0, rz, hall, 10); r1.rotation.z = Math.PI / 2;
    const r2 = cyl(0.02, 0.02, x1 - x0, W.yellow, (x0 + x1) / 2, 0.55, rz, hall, 10); r2.rotation.z = Math.PI / 2;
    for (let x = x0; x <= x1 + 0.01; x += 1.4) { cyl(0.03, 0.03, 1.0, W.yellow, x, 0.5, rz, hall, 10); cyl(0.07, 0.07, 0.02, W.yellow, x, 0.01, rz, hall, 14); }
  }
  model('wooden_ladder', { pos: [-4.6, 0, -7.6], rot: 0.5, parent: hall });
  model('steel_frame_shelves_02', { pos: [-7.6, 0, -9.6], rot: Math.PI / 2, parent: hall }); model('steel_frame_shelves_02', { pos: [-7.6, 0, -8.95], rot: Math.PI / 2, parent: hall });
  model('plastic_container', { pos: [-7.3, 0.0, -10.6], rot: 1.4, parent: hall });
  model('industrial_storage_cart', { pos: [6.2, 0, -8.2], rot: -0.4, parent: hall });
  model('Barrel_01', { pos: [7.4, 0, -5.4], parent: hall });
  { const ld = new THREE.Group(); ld.position.set(-4.5, 0, -8.0); ld.rotation.set(0, 0.4, -0.18); ld.visible = false; hall.add(ld);    // （原来的铝梯，换成真实模型后隐藏）
    const al = new THREE.MeshStandardMaterial({ color: 0xb8bab4, roughness: 0.4, metalness: 0.8 });
    for (const x of [-0.22, 0.22]) box(0.05, 2.2, 0.03, al, x, 1.1, 0, ld); for (let k = 0; k < 7; k++) box(0.44, 0.03, 0.06, al, 0, 0.25 + k * 0.3, 0, ld); }
  // 地上：积水、几滴血（从采样床那边拖过来）
  for (const [x, z, w, d, r, sd] of [[-1.5, -5.2, 2.4, 1.4, 0.4, 41], [3.5, -9.5, 2, 1.2, 1.4, 42], [-5.5, -2.6, 1.6, 1.0, 2.2, 43]]) { const pd = puddleDecal(sd); const m = new THREE.MeshStandardMaterial({ map: pd.map, roughnessMap: pd.roughnessMap, roughness: 0.08, metalness: 0.3, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }); const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); p.rotation.set(-Math.PI / 2, 0, r); p.position.set(x, 0.004, z); hall.add(p); }
  for (const [x, z, sz, sd] of [[-4.1, -2.9, 0.9, 51], [-6.8, -2.8, 0.7, 52], [0.4, -3.0, 0.6, 53]]) { const pd = puddleDecal(sd, { kind: 'blood' }); const p = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), new THREE.MeshStandardMaterial({ map: pd.map, roughness: 0.4, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); p.rotation.set(-Math.PI / 2, 0, sd); p.position.set(x, 0.005, z); hall.add(p); }
  // 真实的警示牌、工具柜、监控、清洁用品；后墙的漏水痕、地上拖地的湿痕和锈圈
  for (const [n, x, y] of [['Sign010', 5.95, 1.85], ['Sign005', -1.4, 2.4], ['Sign008', -7.2, 1.9], ['Sign023', 3.1, 2.75]]) decal(n, hall, { pos: [x, y, -11.995], w: 0.34, h: 0.34, roughness: 0.6, opacity: 0.95 });
  model('metal_tool_chest', { pos: [7.35, 0, -7.0], rot: -Math.PI / 2, parent: hall });
  model('security_camera_02', { pos: [-7.6, 3.15, -11.99], rot: 0.5, parent: hall });
  model('medical_box', { pos: [4.0, 1.67, -11.5], rot: 0.1, scale: 0.9, parent: hall });
  model('plastic_jerrycan', { pos: [-7.0, 0, -8.2], rot: 0.6, parent: hall }); model('plastic_jerrycan', { pos: [-6.7, 0, -8.35], rot: 2.2, parent: hall });
  model('bleach_bottle', { pos: [2.85, 0.945, -11.25], rot: 0.4, parent: hall }); model('multi_cleaner_bottle', { pos: [-4.55, 0.945, -11.2], rot: 1.4, parent: hall });
  model('plastic_broom', { pos: [6.9, 0, -6.5], rot: 1.2, parent: hall });
  for (const [x, w, k] of [[-3.0, 1.2, 'Leaking003'], [3.1, 1.0, 'Leaking004'], [6.9, 1.1, 'Leaking005']]) decal(k, hall, { pos: [x, 2.7, -11.995], w, h: 1.6, color: 0x5a4a34, opacity: 0.6 });
  decal('Smear007', hall, { pos: [-1.5, 0.004, -4.6], rot: [-Math.PI / 2, 0, 0.5], w: 3.0, h: 1.8, color: 0x2a2a24, opacity: 0.22, roughness: 0.1 });
  decal('Smear006', hall, { pos: [2.6, 0.004, -8.6], rot: [-Math.PI / 2, 0, 2.3], w: 2.6, h: 1.6, color: 0x2a2a24, opacity: 0.18, roughness: 0.12 });
  decal('SurfaceImperfections017', hall, { pos: [0, 0.0035, -6.6], rot: [-Math.PI / 2, 0, 0], w: 12, h: 4, color: 0x2e2a24, opacity: 0.4 });
  userDecal('blood_smear.webp', hall, { pos: [-3.3, 0.0045, -3.3], rot: [-Math.PI / 2, 0, 0.3], w: 1.6, h: 0.52, color: 0x7a4a46, roughness: 0.55 });   // 采样床那边拖过来的血
  decal('Rust001', hall, { pos: [7.4, 0.005, -5.4], rot: [-Math.PI / 2, 0, 0.7], w: 0.9, h: 0.9, opacity: 0.8 });   // 铁桶底下的锈圈
  // 两根白色方柱（塑料隔断的两头）
  for (const x of [-3.3, 3.7]) { box(0.5, HC, 0.5, W.enamel, x, HC / 2, -6.6, hall); box(0.6, 0.18, 0.6, W.enamelDark, x, 0.09, -6.6, hall); box(0.6, 0.12, 0.6, W.enamelDark, x, HC - 0.06, -6.6, hall); }
  // 头顶：一条条银色软风管（像帆布棚实验室里那样），日光灯管
  hose([[-8, 3.2, -10], [-5, 3.0, -8], [-2, 3.35, -5], [2, 3.0, -4.5], [6, 3.3, -9], [8, 3.2, -10]], 0.2, W.duct);
  hose([[8, 3.3, -3], [4, 3.1, -2.5], [0, 3.35, -3.5], [-4, 3.1, -2.6], [-8, 3.3, -3]], 0.14, W.duct);
  for (const [x, z] of [[-4, -6.0], [0, -6.0], [4, -6.0], [-3, -10], [3, -10]]) {
    box(1.3, 0.05, 0.14, M.frame, x, HC - 0.03, z, hall);
    box(1.22, 0.03, 0.05, M.light, x, HC - 0.07, z, hall);
  }
  for (const [x, z] of [[-3, -6.5], [3, -6.5], [0, -10], [-5, -10], [5, -10]]) { const l = new THREE.PointLight(0xd4f0ea, 7, 9, 1.6); l.position.set(x, HC - 0.2, z); hall.add(l); }
  // 顶上垂着一圈圈黑色电缆（从一台设备牵到另一台）
  for (const [a, b, sag] of [[[-7.9, HC - 0.1, -11.8], [-2.0, HC - 0.1, -9.0], 0.6], [[-4.0, HC - 0.1, -12], [4.5, HC - 0.1, -10.5], 0.8], [[7.9, HC - 0.1, -11.0], [1.0, HC - 0.1, -8.0], 0.5], [[-6.0, HC - 0.1, -7.0], [2.0, HC - 0.1, -6.8], 0.45], [[0.5, HC - 0.1, -12], [6.0, HC - 0.1, -7.5], 0.7]]) {
    const m = [(a[0] + b[0]) / 2, HC - 0.1 - sag, (a[2] + b[2]) / 2];
    hose([a, [(a[0] + m[0]) / 2, HC - 0.1 - sag * 0.75, (a[2] + m[2]) / 2], m, [(b[0] + m[0]) / 2, HC - 0.1 - sag * 0.75, (b[2] + m[2]) / 2], b], 0.018, W.cable);
  }
  for (const [x, z] of [[-6, -9.5], [-1, -9.5], [4, -9.5]]) { cyl(0.012, 0.012, 0.5, W.cable, x, HC - 0.25, z, hall, 6); const sh = cyl(0.28, 0.32, 0.18, W.enamel, x, HC - 0.58, z, hall, 20); cyl(0.24, 0.24, 0.01, W.glow, x, HC - 0.675, z, hall, 20); }   // 吊着的工矿灯
  // 墙上：一张手写的排班表、一个“无菌区”的旧牌子
  plane(1.4, 0.45, textSign([['采样排班', 46, '#141414', 0.42, 600, SANS, 'center'], ['B-0417 22:00 · P-0932 06:00 · P-1077 14:00', 20, '#444', 0.8, 400, MONO, 'center']], 800, 260, { bg: '#ddd6c0' }), -4.6, 3.0, -11.99, 0, hall, false);
  plane(1.2, 0.36, textSign([['无菌区 · 请穿戴防护服', 40, '#1d1f22', 0.48, 500, SANS, 'center'], ['ASEPTIC AREA', 20, '#6b6762', 0.82, 500, MONO, 'center']], 800, 240, { bg: '#d8e0d8', bar: '#1f8a4c' }), 7.99, 2.4, -4.0, -Math.PI / 2, hall, false);

  // 参观廊：扶手、隔离带、轨道射灯、监控探头、灭火器、回风口、地贴、展台提示牌
  const rail = (x0, x1) => {
    const len = x1 - x0, cx = (x0 + x1) / 2;
    const r = cyl(0.022, 0.022, len, M.steel, cx, 1.0, -0.86, root, 16); r.rotation.z = Math.PI / 2;
    for (let x = x0 + 0.15; x <= x1 - 0.1; x += 1.1) cyl(0.012, 0.012, 0.12, M.steelDark, x, 0.94, -0.86, root, 8);
  };
  const post = (x, z) => {
    cyl(0.15, 0.17, 0.03, M.frame, x, 0.015, z, root, 24);
    cyl(0.028, 0.028, 0.9, M.steel, x, 0.46, z, root, 12);
    cyl(0.042, 0.042, 0.06, M.frame, x, 0.93, z, root, 16);
  };
  post(-4.85, -0.2); post(-3.65, -0.2);
  plane(1.16, 0.05, textSign([['禁止游客进入', 22, '#ffffff', 0.78, 500, SANS, 'center']], 600, 30, { bg: '#b3262d' }), -4.25, 0.88, -0.2, 0, root);
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
  plane(0.2, 0.26, textSign([['灭火器', 44, '#fff', 0.45, 600, SANS, 'center'], ['FIRE', 26, '#fff', 0.8, 500, MONO, 'center']], 200, 260, { bg: '#c8211f' }), 4.55, 1.05, 3.99, Math.PI, root);
  plane(1.0, 0.35, canvasTexture(400, 140, (g, W, H) => { g.fillStyle = '#a4a29d'; g.fillRect(0, 0, W, H); g.fillStyle = '#34353a'; for (let y = 10; y < H - 6; y += 12) g.fillRect(8, y, W - 16, 6); }), -2.4, 2.6, 3.99, Math.PI, root, false);
  // 提问终端：观众可以向品牌提问
  const kiosk = new THREE.Group(); kiosk.position.set(3.9, 0, 0.35); kiosk.rotation.y = -0.5; root.add(kiosk);
  box(0.42, 1.0, 0.34, M.white, 0, 0.5, 0, kiosk);
  box(0.46, 0.04, 0.38, M.frame, 0, 1.02, 0, kiosk);
  const ks = plane(0.4, 0.28, textSign([['有问题？', 54, '#ffffff', 0.38, 400, SANS, 'center'], ['问问我们', 54, '#ffffff', 0.62, 400, SANS, 'center'], ['ASK US ANYTHING', 22, '#b8ff6a', 0.86, 500, MONO, 'center']], 400, 280, { bg: '#101214' }), 0, 1.25, 0.06, 0, kiosk);
  ks.rotation.x = -0.3;
  box(0.44, 0.31, 0.03, M.frame, 0, 1.25, 0.04, kiosk).rotation.x = -0.3;
  blob(3.9, 0.35, 0.9, root, 0.003);
  for (const x of [-0.42, 0.85]) {
    const sg = plane(0.12, 0.078, textSign([['请勿触摸', 34, '#141414', 0.5, 500, SANS, 'center'], ['DO NOT TOUCH', 18, '#6b6762', 0.84, 500, MONO, 'center']], 200, 130, { bg: '#f5f3ee' }), x, 0.995, -0.4, 0, root, false);
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
    g.fillText(b.demo ? '演示批次' : (b.name ? `「${b.name}」` : '你的批次'), W * 0.06, H * 0.48);
    g.font = `400 20px ${MONO}`; g.fillStyle = 'rgba(255,255,255,.75)';
    g.fillText(`BR-02 · ${b.demo ? 'DEMO' : b.no} · ${SPECIES[sp].id}`, W * 0.06, H * 0.85);
    tx.needsUpdate = true;
  }

  function tick(t, dt, b, r) {
    // 你的批次：肉的大小跟随细胞密度；培养基颜色跟随酸碱度（酚红指示剂：偏酸时由粉变橙）
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
    ecgTex.offset.x = (t * 0.25) % 1;                                      // 监护仪上的心跳一直在走
    for (const b of beds) {                                                // 床上的动物在呼吸
      const p = b.pose;
      if (!p) continue;
      if (p.hen) p.o.rotation.y = 0.5 + Math.sin(t * 0.7) * 0.18 + Math.sin(t * 2.3) * 0.04;
      else p.o.scale.setScalar(p.s * (1 + Math.sin(t * p.rate + b.x) * 0.012));
    }
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

  return { scene, tick, setBatch, setScan, anchor, tanks: tankList, beds };
}
