// 加工间参观廊：熟客可以隔着玻璃看。玻璃后面不是光鲜的大罐车间，而是一个地下作坊——
// 正对玻璃的一排采样床用蓝帘隔开，后面是工作区和回收角，顶上吊着三座高位罐。
// 观众站在参观廊里；玻璃前的展台上是“你的批次”——一个台式灌流培养罐，里面的肉在长大。
// 左墙是生长数据墙；玻璃最左边是一扇磨砂门：细胞库，非参观区域。
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { deferImages } from './gfx.js';
import { canvasTexture } from './textures.js';
import { meatGeometry, meatMaterial, meatHeight, kindFor } from './meat.js';
import { SPECIES, LAB_DEEP } from './data.js';
import { pbr, model, decal, userDecal } from './assets.js';
import { ITEM } from './dress.js';
import { curve } from './growth.js';
import { createCurtain } from './curtain.js';
import { lightCone, glowColumn, hazeLayer, dustMotes } from './atmosphere.js';
import { dressWard, dirtyCorridor, glassStickers, paperStack, dirtyHall } from './lab-dress.js';
import { createSigns, screenGlass } from './lab-signs.js';
import { columnVessel, jacketVessel, wearVessel, benchStain } from './lab-vessels.js';
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
    g.fillText('STAFF ONLY · NO VISITORS', W / 2, H * 0.46 + 46);
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
  g.fillText(`${Math.floor(t * 2) % 2 ? '●' : '○'} LIVE  ${new Date().toLocaleString('en-GB', { hour12: false })}`, W - 40, 52);
  g.textAlign = 'left';
  g.fillStyle = 'rgba(184,255,106,.35)'; g.fillRect(40, 70, W - 80, 1);

  // 左：关键数字
  const kpi = [
    ['ACTIVE BATCHES', (3412 + Math.floor(t / 6) % 9).toLocaleString('en-GB')],
    ['OUTPUT TODAY', (1284.6 + t * 0.03).toFixed(1) + ' kg'],
    ['MEAN DOUBLING TIME', '21.8 h'],
    ['ANIMALS SLAUGHTERED', '0'],
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

  // 中下：你的批次的生长曲线
  const gx = cx - 300, gy = H * 0.74, gw = 600, gh = 150;
  g.font = `400 15px ${MONO}`; g.fillStyle = GREEN;
  g.fillText(`BATCH ${b.no} · GROWTH N/K · DAY ${String(r.day).padStart(2, '0')}/${b.cycle}`, gx, gy - 16);
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
  g.font = `400 17px ${MONO}`; g.fillStyle = GREEN; g.fillText('BATCH LOG', tx, 150);
  const cols = [['BATCH', 0], ['LINE', 110], ['DAY', 220], ['VIAB.', 290], ['DONOR*', 380]];
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
  g.fillText('REFRESH 5s · EVERY CELL ON RECORD', 40, H - 24);
  g.textAlign = 'right';
  g.fillText('* DONOR DATA IS OUTSIDE THE SCOPE OF THIS SYSTEM', W - 40, H - 24);
  g.textAlign = 'left';
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
  wearVessel(g, 0.1535, 0.395, 0.32, '176,92,84', 2);
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
  scene.background = new THREE.Color(0x041514);
  scene.environment = env;
  scene.environmentIntensity = 0.3;
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
  M.light.color.setRGB(1.5, 2.9, 2.6); M.warmLight.color.setRGB(0.5, 1.15, 0.98);
  M.sight.color.multiplyScalar(1.4); M.ledRed.color.setRGB(4, 0.3, 0.3);
  scene.fog = new THREE.FogExp2(0x051a21, 0.05);                          // 越往里越沉进青绿色的雾里
  // 墙：参观廊是发黄的旧瓷砖 + 绿漆墙裙；车间是刷漆的大墙，墙裙更高，满是锈水痕
  const wallMat = (w, h, o = {}) => pbr('long_white_tiles', w, h, { size: 2.6, rotate: Math.PI / 2, roughness: 0.75, color: 0xcfcac0 });   // 真实的旧白瓷砖
  const hallWallMat = (w, h) => new THREE.MeshStandardMaterial({ ...grimeWallMaps(w, h, { tile: false, dado: 1.6, ppm: 40, upper: [138, 142, 134], paint: [62, 76, 68], seed: 9, ao: 0.6 }) });

  // 参观廊：x -5..5，z -1..4，层高 3m，偏暗
  const gFloor = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), pbr('worn_tile_floor', 10, 5, { size: 2.4, roughness: 0.33, envMapIntensity: 2.2, color: 0xbcd8d2 }));
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
  plane(0.14, 0.14, noPhotoSticker(), -3.15, 2.5, -0.99, 0, root);
  plane(0.14, 0.14, noPhotoSticker(), 4.75, 2.5, -0.99, 0, root);

  // 细胞库：磨砂玻璃门、红色标牌、读卡器
  box(1.12, 2.2, 0.06, M.frame, -4.25, 1.1, -0.88, root);
  plane(1.0, 2.1, frostedTexture(), -4.25, 1.07, -0.845, 0, root, false);
  plane(1.3, 0.24, textSign([['CELL BANK · NO VISITORS', 30, '#ffffff', 0.62, 500, SANS, 'center']], 640, 118, { bg: '#b3262d' }), -4.25, 2.42, -0.89, 0, root);
  box(0.08, 0.13, 0.03, M.frame, -3.6, 1.2, -0.87, root);
  const led = box(0.014, 0.014, 0.01, M.ledRed, -3.6, 1.24, -0.853, root);

  // 玻璃里面第一排：左边是显微镜台和留样托盘（模型里），右边一条瓷砖台——三台台式培养罐里长着肉，其中一台是你的批次
  const tileTop = (w, d) => pbr('long_white_tiles', w, d, { size: 1.6, roughness: 0.45, color: 0xb8b0a2, envMapIntensity: 1.2 });
  const FZ = -1.78;                                                        // 这一排台子的中线
  box(4.5, 0.92, 0.62, wallMat(4.5, 0.92, { dado: 0, size: 0.1, ppm: 120 }), 2.4, 0.46, FZ, root);
  { const tt = new THREE.Mesh(new THREE.PlaneGeometry(4.54, 0.68), tileTop(4.54, 0.68)); tt.rotation.x = -Math.PI / 2; tt.position.set(2.4, 0.935, FZ); root.add(tt); }
  box(4.54, 0.04, 0.04, M.frame, 2.4, 0.915, FZ + 0.33, root);
  const vesL = columnVessel(root, 0.5, FZ, M, matFor('chicken'));
  const vesC = vessel('beef', 0.3, root, ['BR-02 sample', '11/08  P37']); vesC.group.position.set(1.35, 0.936, FZ);
  benchStain(root, 1.37, 0.9362, FZ + 0.03, 0.55, 0.7);
  const vesR = jacketVessel(root, 2.15, FZ, M);
  const plate = (txt, sub, x, hi) => plane(0.5, 0.09, textSign([[txt, 30, hi ? '#ffffff' : '#1d1f22', 0.48, 500, SANS], [sub, 20, hi ? 'rgba(255,255,255,.75)' : '#6b6762', 0.85, 400, MONO]], 400, 72, { bg: hi ? '#b3262d' : '#ebe9e4' }), x, 0.83, FZ + 0.336, 0, root, false);
  plate('CULTIVATED CHICKEN', 'BR-01 · G-0221', 0.55, false);
  const myPlate = plate('YOUR BATCH', 'BR-02 · DEMO', 1.35, true);
  plate('CULTIVATED PORK', 'BR-03 · P-0932', 2.15, false);
  for (const [x, i] of [[0.55, 7], [1.35, 12], [2.15, 7]]) {
    const s = new THREE.SpotLight(x > 1 && x < 2 ? 0xd6ffd8 : 0xffb868, i, 3.4, 0.36, 0.6, 1.4);
    s.position.set(x, 2.8, FZ + 0.4); s.target.position.set(x, 1.0, FZ);
    root.add(s, s.target);
    lightCone(root, [x, 2.8, FZ + 0.4], [0, -1.8, -0.4], { length: 1.75, radius: 0.5, top: 0.05, color: x > 1 && x < 2 ? 0xc8ffd0 : 0xffb868, strength: x > 1 && x < 2 ? 0.3 : 0.2 });
    dustMotes(root, [x, 2.8, FZ + 0.4], [0, -1.8, -0.4], { length: 1.7, radius: 0.42, top: 0.05, count: 110, color: x > 1 && x < 2 ? 0xd8ffe0 : 0xffd2a0, strength: 0.8 });
  }
  { const wl = new THREE.Group(); wl.position.set(-3.75, 2.25, -0.86); root.add(wl);                 // 铁丝罩壁灯
    box(0.12, 0.12, 0.04, M.frame, 0, 0, -0.04, wl); cyl(0.07, 0.07, 0.18, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.2, 1.2) }), 0, 0, 0.08, wl, 14).rotation.x = Math.PI / 2;
    for (let k = 0; k < 6; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.004, 4, 16), M.frame); r.position.set(0, 0, 0.02 + k * 0.035); wl.add(r); }
    const wlp = new THREE.PointLight(0xffb060, 4, 4, 1.6); wlp.position.set(0, 0, 0.3); wl.add(wlp); }
  // 真实模型：右头的试剂套装、台灯、记录夹；参观廊里一张铁凳和地上的提示牌
  model('chemistry_set', { pos: [4.15, 0.936, FZ - 0.06], rot: -0.1, scale: 0.72, parent: root });
  model('clipboard', { pos: [3.86, 0.937, FZ + 0.16], rot: 0.35, parent: root });
  model('desk_lamp_arm_01', { pos: [2.66, 0.936 + 0.088 * 0.85, FZ - 0.12], rot: 1.77, scale: 0.85, parent: root });   // 底座坐在台面上，灯头照着台面（原来陷进台面 7 cm、灯头朝墙）
  model('metal_stool_01', { pos: [-2.2, 0, 3.6], rot: 0.6, tilt: 0.04, parent: root });
  model('WetFloorSign_01', { pos: [-3.6, 0, 3.4], rot: -0.4, scale: 1.25, parent: root });
  // 参观廊：门口到玻璃前踩出来的脏印、拖地的湿痕；墙角返潮
  decal('SurfaceImperfections017', root, { pos: [1.2, 0.003, 1.6], rot: [-Math.PI / 2, 0, 0.3], w: 5.0, h: 2.6, color: 0x2e2a24, opacity: 0.45 });
  decal('Smear007', root, { pos: [2.2, 0.0035, 0.9], rot: [-Math.PI / 2, 0, 1.9], w: 2.2, h: 1.3, color: 0x2a2a24, opacity: 0.22, roughness: 0.1 });
  decal('Leaking009', root, { pos: [-4.99, 0.45, 2.9], rot: [0, Math.PI / 2, 0], w: 2.0, h: 0.9, color: 0x5a5040, opacity: 0.6 });
  decal('Leaking004', root, { pos: [4.99, 2.55, 3.2], rot: [0, -Math.PI / 2, 0], w: 1.0, h: 1.2, color: 0x6a5a44, opacity: 0.6 });

  // 左墙：生长数据墙
  const dataTex = canvasTexture(1600, 900, (g, W, H) => { g.fillStyle = '#06080a'; g.fillRect(0, 0, W, H); });
  box(0.06, 1.56, 2.74, M.frame, -4.97, 1.75, 1.6, root);
  plane(2.6, 1.4625, dataTex, -4.935, 1.75, 1.6, Math.PI / 2, root);
  screenGlass(root, 2.6, 1.4625, { x: -4.935, y: 1.75, z: 1.6, ry: Math.PI / 2, seed: 2 });

  // 右墙：品牌展板、参观须知（指上去有反应）、宣传册架；提问终端（屏幕就是界面）
  const signs = createSigns(root);
  for (const x of [-2.6, 1.0]) { const l = new THREE.PointLight(0xffcf9a, 2.2, 5.5, 1.8); l.position.set(x, 2.75, 2.2); root.add(l); }   // 参观廊顶上的灯条：只给地面留一点暖色，不把整条廊照亮
  for (const [from, to, i, ang] of [[[3.55, 2.95, 0.95], [3.9, 1.0, 0.35], 7, 0.42], [[4.35, 2.95, 2.0], [4.99, 1.4, 2.4], 5, 0.36], [[4.3, 2.95, 0.4], [4.99, 1.8, 0.6], 6, 0.6]]) {   // 右墙这一段：终端、须知、展板头顶各一盏暖色射灯
    const l = new THREE.SpotLight(0xffc48a, i, 4.5, ang, 0.55, 1.6); l.position.set(...from); l.target.position.set(...to); root.add(l, l.target);
    const d = new THREE.Vector3(...to).sub(new THREE.Vector3(...from));
    lightCone(root, from, d.toArray(), { length: d.length() * 0.9, radius: Math.tan(ang) * d.length() * 0.8, top: 0.05, color: 0xffc08a, strength: 0.16 });
  }
  dirtyCorridor(root);
  glassStickers(root);
  // 显微镜台上：交班单底下压着一摞，旁边又一摞，都歪着
  paperStack(root, { x: -0.66, z: -1.62, y: 0.9346, n: 5, seed: 2, spread: 0.03, turn: 0.32 });
  paperStack(root, { x: -0.32, z: -1.8, y: 0.9346, n: 9, seed: 5, spread: 0.028, turn: 0.4 });

  // 后墙：回门店的门
  box(1.1, 2.2, 0.06, M.frame, 3.6, 1.1, 3.98, root);
  plane(1.0, 2.1, textSign([['←  STORE', 60, '#ffffff', 0.12, 500, SANS, 'center'], ['BACK TO THE SHOP', 24, 'rgba(255,255,255,.6)', 0.17, 500, MONO, 'center']], 400, 840, { bg: '#3a3c40' }), 3.6, 1.07, 3.945, Math.PI, root, false);
  plane(0.42, 0.14, textSign([['EXIT', 40, '#ffffff', 0.7, 600, SANS, 'center']], 300, 100, { bg: '#1f8a4c' }), 3.6, 2.42, 3.99, Math.PI, root);
  box(1.8, 0.42, 0.45, M.frame, -0.6, 0.21, 2.9, root);
  box(1.76, 0.06, 0.42, M.fabric, -0.6, 0.45, 2.9, root);

  // ================================================================ 玻璃后面：夜班的加工间（FMM Laboratory Kit：assets/lab/lab_kit.glb）
  // 参观廊正对着一排用蓝帘隔开的采样床（四只动物 + 一张停用的空床）；PVC 门帘后面是工作区、靠右墙的医疗废品回收角、三台 200 L 反应器；
  // 再往上是 6.5 m 高的设备层：三座吊在钢梁上的高位罐。模型怎么修、怎么压的见 tools/blender/lab_kit.py
  const hall = new THREE.Group();
  root.add(hall);
  const blobMat = new THREE.MeshBasicMaterial({ map: blobShadow(), transparent: true, depthWrite: false, opacity: 0.85 });
  const blob = (x, z, sz, parent = hall, y = 0.006) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), blobMat); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); parent.add(p); return p; };
  gFloor.userData.walk = true;                                             // 参观廊地上的箭头只落在这块地上

  // 一整道帘子：实验台在前，病床和动物都在帘子后面，拉开才看得见
  const cloth = pbr('Fabric045', 1, 1, { size: 0.38, roughness: 0.96, color: 0x2d6a74, emissive: 0x02100f, side: THREE.DoubleSide, normalScale: 0.6 });
  const ward = new THREE.Group(); ward.position.z = -LAB_DEEP; hall.add(ward);     // 帘子后面的东西都往里让了 LAB_DEEP（模型在 lab_kit.py 里已经推过）
  const curtain = createCurtain({ x0: -8.85, x1: 8.85, split: 0.8, z: -3.05, top: 3.52, bottom: 0.14,
    fabric: cloth, metal: pbr('Metal009', 1, 1, { size: 0.3, metalness: 0.8, roughness: 0.6 }) });
  hall.add(curtain.group);
  const WARD = -0.55;                                                      // 病床整体往里让了这么多（和 lab_kit.py 里一致）

  // 监护仪上的心跳：一张横向平铺的贴图，tick 里让它滚动（盖在模型屏幕原来那条静止的波形上；停用床的那台不动）
  const ecgTex = canvasTexture(512, 80, (g, Wt, Ht) => {
    g.fillStyle = '#0d211e'; g.fillRect(0, 0, Wt, Ht);
    g.strokeStyle = '#8fce98'; g.lineWidth = 4; g.beginPath();
    for (let x = 0; x <= Wt; x += 2) { const p = (x % 128) / 128; g.lineTo(x, p > 0.42 && p < 0.46 ? 8 : p > 0.46 && p < 0.5 ? 72 : p > 0.6 && p < 0.7 ? 38 : 48); }
    g.stroke();
  });
  ecgTex.wrapS = THREE.RepeatWrapping;
  const ecgMat = new THREE.MeshBasicMaterial({ map: ecgTex });
  for (const [x, y, z] of [[-7.523, 1.248, -4.981], [-4.963, 1.309, -5.441], [3.559, 1.248, -4.779], [6.394, 1.248, -4.623]]) plane(0.33, 0.056, ecgMat, x, y + 0.037, z + WARD + 0.002, 0, ward);

  const beds = [['P-0932', 'duroc', -6.8], ['B-0417', 'holstein', -4.1], ['P-0101', null, 0], ['P-1077', 'white', 4.1], ['G-0221', 'hen', 6.8]]
    .map(([id, animal, x]) => ({ id, animal, x, pose: null }));
  const v = (x, y, z) => new THREE.Vector3(x, y, z - LAB_DEEP);
  const tankList = [
    { name: 'HT-01', size: '高位罐', tissue: ['融合片层', 'LM-04'], pos: v(-1.95, 2.9, -9.3) },
    { name: 'HT-02', size: '高位罐', tissue: ['富脂褶皱', 'FT-02'], pos: v(1.59, 3.1, -9.1) },
    { name: 'HT-03', size: '高位罐', tissue: ['定向纤维', 'FB-07'], pos: v(5.48, 2.7, -9.5) },
    { name: 'BR-04', size: '200 L', pos: v(0.8, 1.6, -7.95) }, { name: 'BR-05', size: '200 L', pos: v(3.0, 1.6, -7.95) }, { name: 'BR-06', size: '200 L', pos: v(5.2, 1.6, -7.95) },
  ];

  let pending = null;                                                      // 第一次走进实验室才下载模型
  const load = () => pending ??= new Promise((resolve) => {
    const draco = new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/libs/draco/gltf/');
    deferImages(new GLTFLoader()).setDRACOLoader(draco).load('assets/lab/lab_kit.glb', ({ scene: kit }) => {
      const meshes = [];
      kit.updateMatrixWorld(true);
      kit.traverse((o) => { if (o.isMesh) meshes.push(o); });
      const pivots = {};
      for (const b of beds) if (b.animal) {                                 // 每只动物的支点在床垫面上：呼吸时蹄子和身子底下不离开床垫
        const g = new THREE.Group(); g.position.set(b.x, b.animal === 'holstein' ? 0.8985 : 0.84, -3.9 + WARD - LAB_DEEP); g.updateMatrixWorld(); hall.add(g);
        pivots[b.animal] = g; b.pose = { o: g, rate: { duroc: 1.5, holstein: 1.1, white: 1.8, hen: 3.2 }[b.animal] };
      }
      for (const o of meshes) {
        const m = o.material, name = m.name || '';
        m.envMapIntensity = 0.5;
        if (name.startsWith('Grouted ceramic / floor')) { m.roughness = 0.42; m.envMapIntensity = 1.4; m.color.set(0x5b7672); }   // 冲洗过的湿地：灯都拖出倒影；底色压暗，不发灰
        if (name.startsWith('Grouted ceramic / wall')) m.color.set(0x506967);
        if (name.startsWith('High bay limewash')) m.color.set(0x3f5653);
        if (name.startsWith('Internal instrument strip')) m.emissiveIntensity = 5.2;
        if (name.startsWith('Amber inspection lamp')) m.emissiveIntensity = 4.2;
        if (name.startsWith('Heater inspection glow')) m.emissiveIntensity = 3;
        if (name.startsWith('Opal fluorescent diffuser')) m.emissive.setRGB(0.55, 1.45, 1.3);
        if (/^(us|pump|ecg)$/.test(name) && m.map) { m.emissive.set(0xffffff); m.emissiveMap = m.map; m.emissiveIntensity = 0.55; }   // 床尾设备的屏幕：暗处也看得清
        for (const k of ['map', 'normalMap', 'roughnessMap']) if (m[k]) m[k].anisotropy = 8;
        if (m.transparent) {
          m.depthWrite = false;                                            // 玻璃、培养液、门帘后面的东西不能被它们挡掉
          if (/rinse film|contact marks/i.test(name)) { m.polygonOffset = true; m.polygonOffsetFactor = -4; m.polygonOffsetUnits = -4; }
          else if (/glass|fluid/i.test(name)) o.renderOrder = 2;
        }
        const animal = /^A_([a-z]+)/.exec(o.name) || /^A_([a-z]+)/.exec(o.parent?.name || '');
        (animal ? pivots[animal[1]] : hall).attach(o);
      }
      draco.dispose();
      dressWard({ hall, pivots, beds, kit: meshes.filter((o) => !/^A_/.test(o.name)), curtainMat: cloth });   // 盖单子、针眼和血、拉了一半的隔帘
      resolve(true);
    }, undefined, (e) => { console.error('实验室模型没有加载出来', e); resolve(false); });
  });

  // 打光分三层：远处沉在青色的雾里，中景是三座罐子的绿光，近处是几摊暖黄的台灯。暗的地方就让它暗（不开阴影）
  for (const [x, y, z] of [[-1.73, 3.98, -9.78], [1.81, 4.18, -9.59], [5.7, 3.91, -9.91]]) { const l = new THREE.PointLight(0x62f0a0, 9, 6, 1.8); l.position.set(x, y - 0.7, z + 0.7); ward.add(l); }
  for (const [x, y, z] of [[-1.95, 3.85, -10.0], [1.59, 4.05, -9.83], [5.48, 3.65, -10.15]]) {
    glowColumn(ward, [x, y, z], { radius: 1.05, height: 3.2, color: 0x43d97a, strength: 0.15 });
    lightCone(ward, [x, y - 1.35, z], [0, -1, 0.12], { length: 2.5, radius: 1.15, top: 0.4, color: 0x4fe8a0, strength: 0.26 });   // 罐底漏下来的光
    dustMotes(ward, [x, y - 1.35, z], [0, -1, 0.12], { length: 2.4, radius: 1.0, top: 0.4, count: 160, color: 0xa8ffc8, strength: 0.6 });
  }
  hazeLayer(ward, [0, 2.2, -6.75], { width: 18, height: 4.6, color: 0x0e3c4a, strength: 0.05 });
  hazeLayer(ward, [0, 2.5, -11.0], { width: 18, height: 5.2, color: 0x175c84, strength: 0.11 });
  lightCone(hall, [-1.55, 2.66, -1.62], [0, -1, -0.07], { length: 1.75, radius: 0.95, color: 0xffb25e, strength: 0.3 });
  dustMotes(hall, [-1.55, 2.66, -1.62], [0, -1, -0.07], { length: 1.7, radius: 0.8, count: 140, color: 0xffd6a0, strength: 0.7 });
  for (const [from, dir, o] of [
    [[-5.55, 3.3, -3.57], [0.04, -0.88, -0.47], { length: 2.7, radius: 1.3, color: 0x6fe6dc, strength: 0.3 }],
    [[4.25, 3.3, -3.69], [0.04, -0.93, -0.37], { length: 2.7, radius: 1.3, color: 0x5fd0d8, strength: 0.28 }],
    [[0.1, 3.3, -4.51], [0, -1, -0.04], { length: 2.4, radius: 0.85, color: 0xd8ffe8, strength: 0.34 }],
    [[8.16, 2.98, -8.86], [-0.03, -0.98, -0.18], { length: 2.5, radius: 0.9, color: 0xff9c4a, strength: 0.3 }],
  ]) { lightCone(ward, from, dir, o); dustMotes(ward, from, dir, { ...o, top: 0.1, count: 170, strength: 0.65 }); }
  dirtyHall(ward, -12.4);                                                  // 车间后墙和两侧墙上的水痕、墙根的脏
  for (const [col, i, dist, outer, inner, [x, y, z], [dx, dy, dz]] of [
    [0xffb468, 34, 5, 0.82, 0.4, [-1.55, 2.7, -1.6], [0, -1, -0.07]],          // 显微镜台：一摊暖黄
    [0x7fe0d2, 52, 7, 0.95, 0.42, [-5.55, 3.05, -3.57], [0.04, -0.88, -0.47]], // 左边两张床
    [0x62c8d4, 54, 7, 0.95, 0.42, [4.25, 3.16, -3.69], [0.04, -0.93, -0.37]],  // 右边两张床
    [0x2a88cc, 64, 9, 1.0, 0.5, [-6.7, 3.13, -6.92], [0.78, -0.39, -0.49]],    // 工作区：冷青的侧光
    [0xff9440, 38, 5, 0.8, 0.4, [8.16, 2.98, -8.86], [-0.03, -0.98, -0.18]],   // 回收角：钠灯一样的橙
    [0xdcffe6, 30, 5, 0.58, 0.3, [0.1, 2.88, -4.51], [0, -1, -0.04]],          // 停用的空床：单独一束，垫子上擦过的血痕要看得见
  ]) {
    const l = new THREE.SpotLight(col, i, dist, outer, 1 - inner / outer, 2);
    l.position.set(x, y, z); l.target.position.set(x + dx, y + dy, z + dz); (z > -2 ? hall : ward).add(l, l.target);
  }

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
  plane(1.16, 0.05, textSign([['NO VISITORS BEYOND THIS POINT', 22, '#ffffff', 0.78, 500, SANS, 'center']], 600, 30, { bg: '#b3262d' }), -4.25, 0.88, -0.2, 0, root);
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
  plane(0.2, 0.26, textSign([['FIRE', 44, '#fff', 0.45, 600, SANS, 'center'], ['EXTINGUISHER', 18, '#fff', 0.8, 500, MONO, 'center']], 200, 260, { bg: '#c8211f' }), 4.55, 1.05, 3.99, Math.PI, root);
  plane(1.0, 0.35, canvasTexture(400, 140, (g, W, H) => { g.fillStyle = '#a4a29d'; g.fillRect(0, 0, W, H); g.fillStyle = '#34353a'; for (let y = 10; y < H - 6; y += 12) g.fillRect(8, y, W - 16, 6); }), -2.4, 2.6, 3.99, Math.PI, root, false);
  scene.add(new THREE.HemisphereLight(0x4a9aa0, 0x040c0d, 0.17));

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
    g.fillText(b.demo ? 'DEMO BATCH' : (b.name ? `“${b.name}”` : 'YOUR BATCH'), W * 0.06, H * 0.48);
    g.font = `400 20px ${MONO}`; g.fillStyle = 'rgba(255,255,255,.75)';
    g.fillText(`BR-02 · ${b.demo ? 'DEMO' : b.no} · ${SPECIES[sp].id}`, W * 0.06, H * 0.85);
    tx.needsUpdate = true;
  }

  function tick(t, dt, b, r) {
    // 你的批次：肉的大小跟随细胞密度；培养基颜色跟随酸碱度（酚红指示剂：偏酸时由粉变橙）
    setTissue(vesC, r.f);
    vesC.mediumMat.color.copy(PINK).lerp(ORANGE, r.acid);
    vesC.tissue.rotation.y = t * 0.05;
    vesL.tick(t, dt); vesR.tick(t, dt); signs.notice.tick(dt); signs.kiosk.tick(dt);
    for (const v of [vesC]) {
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
    curtain.tick(dt);
    led.material = Math.floor(t * 1.5) % 2 ? M.ledRed : M.frame;
    ecgTex.offset.x = (t * 0.25) % 1;                                      // 监护仪上的心跳一直在走
    for (const b of beds) if (b.pose) {                                    // 床上的动物在呼吸：只有背往上起伏一点
      const k = Math.sin(t * b.pose.rate + b.x);
      b.pose.o.scale.set(1, 1 + k * 0.009, 1);
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

  return { scene, tick, setBatch, setScan, anchor, tanks: tankList, beds, load, curtain, setCurtain: curtain.set, notice: signs.notice, kiosk: signs.kiosk };
}
