// 纸箱生成器：仓库里所有纸箱共用一张 2048×2048 的贴图集（每种箱子占三格：正面、侧面、顶面）和一个材质，
// 每个箱子的尺寸、凹痕、鼓包、塌角、朝向都不一样；最后把同一个父节点下的纸箱合并成一个网格（一次绘制）。
// 参考 three-best-practices：material-texture-atlas、geometry-merge-static、material-reuse、2 的幂次方贴图。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SANS = '"Inter", "Noto Sans SC", "Microsoft YaHei", sans-serif';
const HAND = '"Caveat", "Segoe Print", "Noto Sans SC", cursive';
const N = 8, CELL = 256, ATLAS = N * CELL, PAD = 6;

// ------------------------------------------------------------------ 画图的小工具
const rng = (seed) => { let s = seed * 9301 + 49297; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const BASES = { kraft: [176, 132, 86], light: [200, 164, 118], white: [226, 222, 212], grey: [150, 138, 120], eps: [236, 234, 228], dark: [120, 88, 56] };
function base(g, kind, r) {
  const [R, G, B] = BASES[kind];
  g.fillStyle = `rgb(${R},${G},${B})`; g.fillRect(0, 0, CELL, CELL);
  if (kind === 'eps') { for (let i = 0; i < 900; i++) { const x = r() * CELL, y = r() * CELL, s = 3 + r() * 4; g.strokeStyle = `rgba(160,158,150,${0.15 + r() * 0.2})`; g.beginPath(); g.arc(x, y, s, 0, 7); g.stroke(); } return; }   // 泡沫颗粒
  for (let i = 0; i < 2200; i++) { const v = (r() - 0.5) * 40; g.fillStyle = `rgba(${R + v | 0},${G + v | 0},${B + v | 0},.35)`; g.fillRect(r() * CELL, r() * CELL, 1 + r() * 3, 1); }   // 纸纤维
  g.fillStyle = 'rgba(0,0,0,.035)'; for (let y = 0; y < CELL; y += 5) g.fillRect(0, y, CELL, 2);                          // 瓦楞透出来的一道道
}
function wear(g, r, amt = 1) {
  const e = g.createLinearGradient(0, 0, CELL, 0); e.addColorStop(0, `rgba(60,40,20,${0.18 * amt})`); e.addColorStop(0.08, 'rgba(0,0,0,0)'); e.addColorStop(0.92, 'rgba(0,0,0,0)'); e.addColorStop(1, `rgba(60,40,20,${0.18 * amt})`);
  g.fillStyle = e; g.fillRect(0, 0, CELL, CELL);
  for (let i = 0; i < 6 * amt; i++) { g.strokeStyle = `rgba(70,50,30,${0.08 + r() * 0.12})`; g.lineWidth = 1 + r() * 2; g.beginPath(); const x = r() * CELL, y = r() * CELL; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 20); g.stroke(); }   // 擦痕
  if (r() < 0.4 * amt) { const x = 40 + r() * 170, y = 60 + r() * 150, s = 20 + r() * 40; g.strokeStyle = 'rgba(90,60,30,.25)'; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y, s, s * 0.8, r(), 0, 7); g.stroke(); g.fillStyle = 'rgba(90,60,30,.08)'; g.fill(); }   // 水渍圈
}
const TAPES = { tan: 'rgba(196,160,96,.75)', white: 'rgba(238,236,228,.92)', red: 'rgba(196,40,32,.9)', blue: 'rgba(40,80,150,.9)', clear: 'rgba(230,220,190,.35)' };
function tapeTop(g, t) { if (t === 'none') return; g.fillStyle = TAPES[t]; g.fillRect(0, CELL / 2 - 22, CELL, 44); if (t === 'red') { g.fillStyle = '#fff'; g.font = `800 20px ${SANS}`; g.textAlign = 'center'; g.fillText('FRAGILE · 易碎', CELL / 2, CELL / 2 + 7); g.textAlign = 'left'; } }
function tapeFront(g, t) { if (t === 'none') return; g.fillStyle = TAPES[t]; g.fillRect(CELL / 2 - 22, 0, 44, 46); }
function txt(g, s, x, y, size, col = '#222', w = 700, align = 'left', font = SANS) { g.fillStyle = col; g.font = `${w} ${size}px ${font}`; g.textAlign = align; g.fillText(s, x, y); g.textAlign = 'left'; }
function diamond(g, x, y, s, fill, stroke, label, sub) {
  g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillStyle = fill; g.fillRect(-s / 2, -s / 2, s, s); g.strokeStyle = stroke; g.lineWidth = 3; g.strokeRect(-s / 2 + 4, -s / 2 + 4, s - 8, s - 8); g.restore();
  txt(g, label, x, y + 4, s * 0.2, stroke, 800, 'center'); if (sub) txt(g, sub, x, y + s * 0.32, s * 0.13, stroke, 700, 'center');
}
function arrows(g, x, y, col = '#222') { g.strokeStyle = col; g.lineWidth = 4; for (const dx of [0, 18]) { g.beginPath(); g.moveTo(x + dx, y + 26); g.lineTo(x + dx, y); g.moveTo(x + dx - 6, y + 8); g.lineTo(x + dx, y); g.lineTo(x + dx + 6, y + 8); g.stroke(); } g.beginPath(); g.moveTo(x - 6, y + 30); g.lineTo(x + 24, y + 30); g.stroke(); }
function umbrella(g, x, y, col = '#222') { g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(x, y + 12, 14, Math.PI, 0); g.lineTo(x - 14, y + 12); g.moveTo(x, y + 12); g.lineTo(x, y + 28); g.arc(x - 4, y + 28, 4, 0, Math.PI); g.stroke(); }
function glass(g, x, y, col = '#222') { g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 10, y); g.lineTo(x + 10, y); g.lineTo(x + 6, y + 14); g.lineTo(x - 6, y + 14); g.closePath(); g.moveTo(x, y + 14); g.lineTo(x, y + 26); g.moveTo(x - 8, y + 28); g.lineTo(x + 8, y + 28); g.stroke(); }
function thermo(g, x, y, lo, hi, col = '#1a3a7a') { g.strokeStyle = col; g.lineWidth = 3; g.strokeRect(x, y, 8, 26); g.beginPath(); g.arc(x + 4, y + 30, 6, 0, 7); g.stroke(); txt(g, hi, x + 14, y + 8, 12, col, 700); txt(g, lo, x + 14, y + 32, 12, col, 700); }
function barcode(g, x, y, w, h, r, lines = []) {
  g.fillStyle = '#f4f2ec'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(0,0,0,.15)'; g.strokeRect(x, y, w, h);
  lines.forEach((l, i) => txt(g, l, x + 6, y + 14 + i * 13, 11, '#222', i ? 500 : 700));
  const by = y + h - 30; let bx = x + 6; g.fillStyle = '#111'; while (bx < x + w - 8) { const bw = 1 + (r() * 3 | 0); g.fillRect(bx, by, bw, 22); bx += bw + 1 + (r() * 2 | 0); }
}
function marker(g, s, x, y, rot = -0.06, col = '#1a1a1a', size = 30) { g.save(); g.translate(x, y); g.rotate(rot); txt(g, s, 0, 0, size, col, 700, 'left', HAND); g.restore(); }
function band(g, y, h, col) { g.fillStyle = col; g.fillRect(0, y, CELL, h); }

// ------------------------------------------------------------------ 箱子种类（尺寸单位：米，w × h × d；正面朝 +z）
// 每种：base 纸色、tape 胶带、front / side / top 三个面怎么画；kind 是货架上用来挑箱子的分类
const D = [
  { id: 'brand', kind: ['pkg', 'brand'], size: [0.40, 0.26, 0.30], base: 'white', tape: 'white',
    front: (g, r) => { band(g, 150, 56, '#9a2422'); txt(g, 'FUTURE MEAT', 20, 70, 34, '#9a2422', 800); txt(g, '未来肉类 · 冷链配送箱', 20, 104, 18, '#333', 600); txt(g, 'CULTIVATED · NO SLAUGHTER', 20, 186, 16, '#fff', 700); thermo(g, 200, 40, '0℃', '4℃'); },
    side: (g, r) => { band(g, 150, 56, '#9a2422'); arrows(g, 30, 40, '#9a2422'); umbrella(g, 100, 40, '#9a2422'); barcode(g, 140, 30, 100, 92, r, ['FM-OUT', 'BATCH 1120']); } },
  { id: 'media', kind: ['supply', 'media'], size: [0.45, 0.30, 0.34], base: 'kraft', tape: 'tan',
    front: (g, r) => { txt(g, 'DMEM', 20, 70, 50, '#1d3a7a', 800); txt(g, '基础培养基 · 粉剂', 20, 104, 20, '#1d3a7a', 700); txt(g, '10 L × 10 袋 · 2–8 ℃ 避光保存', 20, 132, 15, '#1d3a7a', 500); band(g, 210, 10, '#1d3a7a'); thermo(g, 210, 150, '2℃', '8℃'); },
    side: (g, r) => { barcode(g, 20, 30, 150, 96, r, ['CELL CULTURE MEDIUM', 'LOT 2611-07', 'EXP 2027-11']); arrows(g, 190, 40, '#1d3a7a'); umbrella(g, 210, 120, '#1d3a7a'); marker(g, '→ 培养间', 30, 200, -0.05, '#1a1a1a', 30); } },
  { id: 'dryice', kind: ['fbs', 'supply'], size: [0.40, 0.38, 0.40], base: 'white', tape: 'clear',
    front: (g, r) => { diamond(g, 70, 90, 92, '#fff', '#111', 'UN1845', 'DRY ICE'); diamond(g, 186, 90, 80, '#fff', '#111', 'UN3373', ''); txt(g, 'BIOLOGICAL SUBSTANCE', 20, 190, 15, '#111', 800); txt(g, 'CATEGORY B · 干冰 4 kg', 20, 210, 15, '#111', 700); band(g, 226, 14, '#111'); },
    side: (g, r) => { txt(g, 'FBS 胎牛血清', 20, 60, 28, '#9a2422', 800); txt(g, '500 mL × 12 · −20 ℃', 20, 90, 16, '#333', 600); barcode(g, 20, 120, 160, 96, r, ['SHIP TO: FUTURE MEAT', 'WAYBILL 7738 2201 9', 'KEEP FROZEN']); thermo(g, 210, 130, '−80', '−20'); } },
  { id: 'glove', kind: ['glove', 'supply'], size: [0.38, 0.25, 0.24], base: 'kraft', tape: 'tan',
    front: (g, r) => { g.fillStyle = '#5a3a8a'; g.beginPath(); g.ellipse(60, 120, 34, 48, 0, 0, 7); g.fill(); txt(g, 'NITRILE', 110, 100, 34, '#5a3a8a', 800); txt(g, '丁腈手套 · 无粉', 110, 130, 18, '#5a3a8a', 700); txt(g, 'M · 100 × 10', 110, 160, 18, '#333', 600); },
    side: (g, r) => { txt(g, 'S  [M]  L  XL', 30, 80, 26, '#5a3a8a', 700); barcode(g, 30, 110, 140, 86, r, ['EN 455 · EN 374', 'LOT G-2609']); } },
  { id: 'tips', kind: ['supply'], size: [0.50, 0.30, 0.40], base: 'white', tape: 'clear',
    front: (g, r) => { band(g, 0, 60, '#2a7a5a'); txt(g, 'STERILE', 20, 42, 30, '#fff', 800); txt(g, 'PIPETTE TIPS 1000 µL', 20, 100, 22, '#2a7a5a', 800); txt(g, '无菌吸头 · 96 孔 × 50 盒', 20, 130, 17, '#333', 600); txt(g, 'γ-IRRADIATED · DNase/RNase FREE', 20, 160, 13, '#2a7a5a', 700); },
    side: (g, r) => { band(g, 0, 60, '#2a7a5a'); arrows(g, 30, 90, '#2a7a5a'); barcode(g, 90, 80, 140, 96, r, ['REF T1000-S', 'LOT 2610-15']); } },
  { id: 'biobag', kind: ['media', 'supply'], size: [0.80, 0.20, 0.60], base: 'light', tape: 'tan',
    front: (g, r) => { txt(g, 'SINGLE-USE BIOPROCESS BAG', 14, 70, 20, '#1a1a1a', 800); txt(g, '一次性生物反应袋 · 200 L', 14, 104, 20, '#9a2422', 700); txt(g, '伽马射线灭菌 · 勿用刀片开箱', 14, 140, 15, '#333', 600); glass(g, 220, 160); },
    side: (g, r) => { barcode(g, 20, 40, 150, 96, r, ['BAG-200L-3D', 'LOT B-2608']); arrows(g, 200, 50); } },
  { id: 'trays', kind: ['pkg'], size: [0.60, 0.40, 0.40], base: 'kraft', tape: 'tan',
    front: (g, r) => { g.strokeStyle = '#222'; g.lineWidth = 4; g.strokeRect(24, 40, 90, 60); g.strokeRect(34, 50, 70, 40); txt(g, 'PET 托盘', 130, 70, 30, '#222', 800); txt(g, 'FOOD TRAYS 1000 pcs', 130, 100, 16, '#222', 700); txt(g, '食品级 · 230×150×30 mm', 24, 150, 16, '#333', 600); },
    side: (g, r) => { umbrella(g, 40, 40); arrows(g, 90, 40); marker(g, '牛排用', 40, 160, -0.08, '#1a1a1a', 40); } },
  { id: 'pouch', kind: ['pkg'], size: [0.50, 0.22, 0.35], base: 'light', tape: 'tan',
    front: (g, r) => { txt(g, '真空包装袋', 20, 70, 32, '#1d3a7a', 800); txt(g, 'VACUUM POUCHES 25×35 cm', 20, 102, 16, '#1d3a7a', 700); txt(g, '5000 只 · 耐低温 −40 ℃', 20, 132, 16, '#333', 600); },
    side: (g, r) => { barcode(g, 30, 40, 150, 90, r, ['VP-2535', '5000 PCS']); } },
  { id: 'soy', kind: ['soy', 'media'], size: [0.40, 0.34, 0.30], base: 'kraft', tape: 'white',
    front: (g, r) => { band(g, 30, 50, '#3a6a2a'); txt(g, 'SOY PROTEIN ISOLATE', 18, 64, 18, '#fff', 800); txt(g, '大豆分离蛋白', 18, 120, 30, '#3a6a2a', 800); txt(g, '20 kg · 支架原料 · 非转基因', 18, 152, 15, '#333', 600); },
    side: (g, r) => { umbrella(g, 40, 40, '#3a6a2a'); barcode(g, 90, 40, 140, 90, r, ['SPI-90 FOOD GRADE', 'NET 20 kg']); } },
  { id: 'ethanol', kind: ['clean'], size: [0.42, 0.32, 0.32], base: 'white', tape: 'red',
    front: (g, r) => { diamond(g, 196, 80, 74, '#c8281e', '#fff', '3', 'FLAMMABLE'); txt(g, '75% 乙醇', 20, 80, 34, '#c8281e', 800); txt(g, '消毒液 · 4 L × 4 桶', 20, 112, 17, '#333', 700); txt(g, 'UN1170 · 远离火源', 20, 140, 15, '#333', 600); },
    side: (g, r) => { arrows(g, 30, 40, '#c8281e'); barcode(g, 90, 40, 140, 90, r, ['ETHANOL 75% v/v', 'LOT E-2611']); } },
  { id: 'towel', kind: ['clean'], size: [0.55, 0.40, 0.40], base: 'light', tape: 'tan',
    front: (g, r) => { txt(g, '擦手纸', 20, 80, 40, '#2a5a8a', 800); txt(g, 'PAPER TOWELS · 20 包', 20, 112, 18, '#2a5a8a', 700); for (let i = 0; i < 5; i++) { g.strokeStyle = '#2a5a8a'; g.lineWidth = 2; g.strokeRect(20 + i * 30, 140, 24, 40); } },
    side: (g, r) => { umbrella(g, 40, 40, '#2a5a8a'); marker(g, '后厨', 40, 170, -0.06, '#1a1a1a', 40); } },
  { id: 'banana', kind: ['reuse'], size: [0.50, 0.24, 0.40], base: 'light', tape: 'none',
    front: (g, r) => { band(g, 0, CELL, 'rgba(200,170,40,.35)'); txt(g, 'TROPIC', 20, 70, 40, '#2a5a2a', 900); txt(g, 'BANANAS · 18 kg', 20, 104, 18, '#2a5a2a', 700); g.fillStyle = '#3a2614'; g.beginPath(); g.ellipse(CELL / 2, 190, 40, 14, 0, 0, 7); g.fill(); marker(g, 'B-0417 样品管', 30, 150, -0.07, '#1a1a1a', 32); },   // 回收的香蕉箱，手提孔，改成装样品管
    side: (g, r) => { band(g, 0, CELL, 'rgba(200,170,40,.35)'); g.fillStyle = '#3a2614'; g.beginPath(); g.ellipse(CELL / 2, 190, 40, 14, 0, 0, 7); g.fill(); txt(g, 'PRODUCE OF ECUADOR', 20, 80, 16, '#2a5a2a', 700); } },
  { id: 'noodle', kind: ['reuse'], size: [0.45, 0.30, 0.30], base: 'kraft', tape: 'clear',
    front: (g, r) => { band(g, 30, 110, '#b8281e'); txt(g, '红烧牛肉面', 20, 92, 34, '#f4d23a', 900); txt(g, '整箱 24 袋', 20, 126, 18, '#fff', 700); g.strokeStyle = '#111'; g.lineWidth = 6; g.beginPath(); g.moveTo(20, 60); g.lineTo(240, 130); g.stroke(); marker(g, '旧单据 2025', 30, 200, -0.04, '#1a1a1a', 36); },   // 回收的方便面箱，划掉了重写
    side: (g, r) => { band(g, 30, 110, '#b8281e'); txt(g, '老坛风味', 20, 100, 28, '#f4d23a', 900); } },
  { id: 'plain', kind: ['reuse', 'supply', 'pkg'], size: [0.40, 0.30, 0.30], base: 'kraft', tape: 'tan',
    front: (g, r) => { marker(g, '杂物', 50, 110, -0.05, '#1a1a1a', 54); marker(g, '勿扔！', 70, 170, 0.04, '#9a2422', 40); },
    side: (g, r) => { arrows(g, 30, 40); } },
  { id: 'thermal', kind: ['pkg', 'supply'], size: [0.35, 0.22, 0.25], base: 'white', tape: 'clear',
    front: (g, r) => { for (let i = 0; i < 3; i++) { g.strokeStyle = '#2a2a2a'; g.lineWidth = 3; g.beginPath(); g.arc(50 + i * 60, 90, 22, 0, 7); g.stroke(); g.beginPath(); g.arc(50 + i * 60, 90, 6, 0, 7); g.stroke(); } txt(g, '热敏纸 80 mm × 50 卷', 20, 160, 20, '#222', 800); txt(g, 'THERMAL ROLLS · 收银 / 标签', 20, 186, 14, '#555', 600); },
    side: (g, r) => { barcode(g, 30, 40, 150, 90, r, ['TP-8080', '50 ROLLS']); } },
  { id: 'coverall', kind: ['clean', 'supply'], size: [0.60, 0.35, 0.40], base: 'white', tape: 'blue',
    front: (g, r) => { txt(g, '一次性防护服', 20, 70, 30, '#1d4a8a', 800); txt(g, 'DISPOSABLE COVERALLS · L', 20, 100, 16, '#1d4a8a', 700); txt(g, '25 件 · 进洁净区必须穿戴', 20, 130, 15, '#333', 600); g.strokeStyle = '#1d4a8a'; g.lineWidth = 3; g.strokeRect(200, 140, 34, 70); },
    side: (g, r) => { arrows(g, 30, 40, '#1d4a8a'); barcode(g, 90, 40, 140, 90, r, ['CAT III TYPE 5/6', 'SIZE L']); } },
  { id: 'casing', kind: ['reuse'], size: [0.40, 0.20, 0.30], base: 'dark', tape: 'tan',
    front: (g, r) => { txt(g, '天然肠衣', 20, 80, 32, '#2a1a10', 800); txt(g, 'NATURAL CASINGS · 盐渍', 20, 110, 16, '#2a1a10', 700); txt(g, '老店存货 · 2019', 20, 140, 15, '#2a1a10', 600); for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(220,210,190,.12)'; g.fillRect(Math.random() * CELL, Math.random() * CELL, 2, 2); } },   // 以前肉铺的存货，落了一层灰
    side: (g, r) => { umbrella(g, 40, 40, '#2a1a10'); } },
  { id: 'eps', kind: ['fbs', 'cooler'], size: [0.55, 0.35, 0.40], base: 'eps', tape: 'none',
    front: (g, r) => { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, 52, CELL, 4); barcode(g, 120, 120, 120, 80, r, ['KEEP FROZEN', '−20 ℃']); marker(g, 'FBS ×6', 20, 180, -0.04, '#1a3a8a', 40); },   // 泡沫保温箱：盖子那一道缝
    side: (g, r) => { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, 52, CELL, 4); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(70, 120, 110, 30); } },
];
const INSIDE = D.length;                                                          // 额外两格：打开的箱子里面、箱底

export function createCartonKit({ normalMap } = {}) {
  // ---------------- 贴图集
  const cv = document.createElement('canvas'); cv.width = cv.height = ATLAS; const ctx = cv.getContext('2d');
  const cellOf = (i) => [i % N, Math.floor(i / N)];
  const paint = (idx, fn) => { const [cx, cy] = cellOf(idx); ctx.save(); ctx.translate(cx * CELL, cy * CELL); ctx.beginPath(); ctx.rect(0, 0, CELL, CELL); ctx.clip(); fn(ctx); ctx.restore(); };
  D.forEach((d, i) => {
    const r = rng(i + 3);
    d.cells = [i * 3, i * 3 + 1, i * 3 + 2];                                      // 正面、侧面、顶面
    paint(d.cells[0], (g) => { base(g, d.base, r); d.front(g, r); tapeFront(g, d.tape); if (d.base !== 'eps') wear(g, r, 1); });
    paint(d.cells[1], (g) => { base(g, d.base, r); d.side(g, r); tapeFront(g, d.tape); if (d.base !== 'eps') wear(g, r, 0.8); });
    paint(d.cells[2], (g) => { base(g, d.base, r); if (d.base === 'eps') { g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(14, 14, CELL - 28, CELL - 28); } tapeTop(g, d.tape); if (d.base !== 'eps') { wear(g, r, 1.2); if (r() < 0.5) barcode(g, 30, 150, 120, 76, r, ['FM-' + (1000 + i * 37), 'RCV 11/' + (10 + i % 18)]); } });
  });
  const inside = D.length * 3, bottom = inside + 1;
  paint(inside, (g) => { const r = rng(99); base(g, 'dark', r); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, CELL, CELL);   // 打开的箱子从上往下看：里面暗，塞着皱纸和几包东西
    for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(${200 + r() * 40 | 0},${190 + r() * 40 | 0},${170 + r() * 40 | 0},.8)`; g.beginPath(); g.ellipse(r() * CELL, r() * CELL, 14 + r() * 26, 10 + r() * 18, r() * 3, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(40,25,10,.8)'; g.lineWidth = 10; g.strokeRect(5, 5, CELL - 10, CELL - 10); });
  paint(bottom, (g) => { base(g, 'kraft', rng(7)); wear(g, rng(8), 1.5); });
  const atlas = new THREE.CanvasTexture(cv); atlas.colorSpace = THREE.SRGBColorSpace; atlas.anisotropy = 8;   // 颜色贴图：sRGB
  const nor = normalMap ? normalMap.clone() : null; if (nor) { nor.wrapS = nor.wrapT = THREE.RepeatWrapping; nor.repeat.set(N, N); nor.needsUpdate = true; }   // 真实瓦楞纸的法线（照片扫描），每格铺一遍
  const material = new THREE.MeshStandardMaterial({ map: atlas, normalMap: nor, roughness: 0.92, metalness: 0 });
  if (nor) material.normalScale.set(0.7, 0.7);

  // ---------------- 一个箱子的几何体：分段的盒子 → 按面映射到贴图集里对应的格子 → 凹痕、鼓包、塌角
  const uvCell = (idx, u, v) => { const [cx, cy] = cellOf(idx); const p = PAD / CELL; return [(cx + p + u * (1 - 2 * p)) / N, 1 - (cy + p + (1 - v) * (1 - 2 * p)) / N]; };
  function boxGeo(d, w, h, dd, r, { open = false, crush = 0 } = {}) {
    const g = new THREE.BoxGeometry(w, h, dd, 3, 3, 3);
    const P = g.attributes.position, Nn = g.attributes.normal, U = g.attributes.uv;
    const turned = r() < 0.5;                                                     // 一半的箱子转了 90°：正面和侧面对调
    for (let i = 0; i < P.count; i++) {
      const nx = Nn.getX(i), ny = Nn.getY(i), nz = Nn.getZ(i);
      let cell;
      if (ny > 0.5) cell = open ? inside : d.cells[2]; else if (ny < -0.5) cell = bottom;
      else if (Math.abs(nz) > 0.5) cell = turned ? d.cells[1] : d.cells[0]; else cell = turned ? d.cells[0] : d.cells[1];
      const [u, v] = uvCell(cell, U.getX(i), U.getY(i)); U.setXY(i, u, v);
    }
    if (d.base === 'eps') { g.computeVertexNormals(); return g; }               // 泡沫箱是硬的，不变形
    const sag = r() * 0.012, bulge = r() * 0.008, hw = w / 2, hh = h / 2, hd = dd / 2;
    const cc = [r() < 0.5 ? -1 : 1, r() < 0.5 ? -1 : 1];                          // 被压塌的那个上角
    for (let i = 0; i < P.count; i++) {
      let x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      const fx = 1 - (x / hw) ** 2, fy = 1 - (y / hh) ** 2, fz = 1 - (z / hd) ** 2;
      if (y > hh - 1e-4) y -= sag * fx * fz;                                       // 顶面中间塌下去一点
      x += Math.sign(x) * bulge * fy * fz; z += Math.sign(z) * bulge * fy * fx;    // 侧面装得太满鼓出来
      if (crush > 0) { const dx = x - cc[0] * hw, dy = y - hh, dz = z - cc[1] * hd, dist = Math.hypot(dx, dy, dz), k = Math.max(0, 1 - dist / 0.16); y -= crush * k * k; x -= cc[0] * crush * 0.4 * k * k; }   // 上角被压塌
      P.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals();
    return g;
  }
  // 打开的箱子：四片盖子往外翻
  function flapsGeo(d, w, h, dd, r) {
    const geos = [];
    [[0, 1], [0, -1], [1, 1], [1, -1]].forEach(([axis, s], k) => {
      const span = axis ? dd : w, len = (axis ? w : dd) / 2 * 0.95;
      const f = new THREE.BoxGeometry(axis ? 0.004 : span, len, axis ? span : 0.004);
      const U = f.attributes.uv; for (let i = 0; i < U.count; i++) { const [u, v] = uvCell(d.cells[1], U.getX(i), U.getY(i)); U.setXY(i, u, v); }
      f.translate(0, len / 2, 0);
      const ang = 1.9 + (r() - 0.5) * 0.5;                                          // 往外翻过 90° 多一点
      if (axis) f.rotateZ(-s * ang); else f.rotateX(s * ang);
      f.translate(axis ? s * w / 2 : 0, h / 2, axis ? 0 : s * dd / 2);
      geos.push(f);
    });
    return geos;
  }

  // ---------------- 收集：同一个父节点下的箱子最后合并
  const batches = new Map();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  function push(parent, geo, x, y, z, ry, tilt = 0) {
    e.set(0, ry, tilt); q.setFromEuler(e); m4.compose(new THREE.Vector3(x, y, z), q, one); geo.applyMatrix4(m4);
    if (!batches.has(parent)) batches.set(parent, []); batches.get(parent).push(geo);
  }
  let seed = 1;
  const pick = (kind, r) => { const list = D.filter((d) => d.kind.includes(kind)); return (list.length ? list : D)[Math.floor(r() * (list.length || D.length))]; };
  // 放一个箱子：底面中心在 (x, y, z)
  function add(parent, x, y, z, { design, kind = 'supply', size, ry = 0, open = false, crush = 0, jitter = 0.06 } = {}) {
    const r = rng(seed++);
    const d = design ? D.find((k) => k.id === design) || D[0] : pick(kind, r);
    const [w0, h0, d0] = size || d.size, j = () => 1 + (r() - 0.5) * jitter * 2;
    const w = w0 * j(), h = h0 * j(), dd = d0 * j();
    push(parent, boxGeo(d, w, h, dd, r, { open, crush }), x, y + h / 2, z, ry);
    if (open) for (const f of flapsGeo(d, w, h, dd, r)) push(parent, f, x, y + h / 2, z, ry);
    return { w, h, d: dd, design: d };
  }
  // 码一托：1.2 × 1.0 的托盘上按箱子尺寸排成网格，一层层往上码；有的托是混装的，最上面一层不满，个别箱子歪了、被压塌、开着口
  function stackPallet(parent, x, y, kind, { maxH = 1.15, mixed = 0.35, z0 = 0 } = {}) {
    const r = rng(seed++ * 7);
    let d = pick(kind, r), yy = y;
    for (let layer = 0; layer < 6; layer++) {
      if (layer > 0 && r() < mixed) d = pick(r() < 0.25 ? 'reuse' : kind, r);
      const [w0, h0, d0] = d.size, rot = r() < 0.5 && w0 < 0.98 && d0 < 1.18;    // 有时整层转 90° 码
      const fw = rot ? d0 : w0, fd = rot ? w0 : d0;
      const nx = Math.max(1, Math.floor(1.18 / (fw + 0.01))), nz = Math.max(1, Math.floor(0.98 / (fd + 0.01)));
      if (yy + h0 - y > maxH) break;
      const top = yy + h0 * 2 - y > maxH || layer >= 2 && r() < 0.3;
      for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
        if (top && r() < 0.35) continue;                                             // 最上面一层不满
        const px = x + (i - (nx - 1) / 2) * (fw + 0.01) + (r() - 0.5) * 0.02, pz = z0 + (k - (nz - 1) / 2) * (fd + 0.01) + (r() - 0.5) * 0.02;
        add(parent, px, yy, pz, { design: d.id, ry: (rot ? Math.PI / 2 : 0) + (r() - 0.5) * (top ? 0.18 : 0.04), open: top && r() < 0.1, crush: r() < 0.12 ? 0.02 + r() * 0.03 : 0, jitter: 0.03 });
      }
      yy += h0 * 1.0 + 0.002;
      if (top) break;
    }
  }
  function flush() {
    for (const [parent, geos] of batches) { const merged = mergeGeometries(geos); const mesh = new THREE.Mesh(merged, material); mesh.matrixAutoUpdate = false; parent.add(mesh); geos.forEach((g) => g.dispose()); }
    batches.clear();
  }
  return { add, stackPallet, flush, material, designs: D };
}
