// 能拿起来翻看的东西：每个交互点背后是一样真东西，拿到眼前转一转，背面写着正面没写的事。
// 尺寸都是真实的（米）：500 mL 方形血清瓶、2 mL 冻存管、英国牛耳标（每片至少 45 × 55 mm）、A5 三联单、4 × 6 英寸面单。
// 字全是英文（场景里的字），手写的用圆珠笔 / 记号笔字体。
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { pbr } from './assets.js';
import { meatGeometry, meatMaterial } from './meat.js';
import { write, circled, scan, fontsReady, surface } from './office-paper.js';

const INK = '#1c2f66', RED = '#a3221e', BLACK = '#202226';
const SANS = '"Inter", sans-serif', MONO = '"IBM Plex Mono", monospace';
const pen = (px) => `400 ${px}px "Nanum Pen Script", "Caveat", cursive`;
const marker = (px) => `600 ${px}px "Caveat Brush", "Caveat", cursive`;
const paperImg = scan('assets/ph/tex/Paper005/diff.jpg');

// 一张印好字的贴纸 / 纸：先铺纸纹，再画内容；字体到了才画
function sheet(w, h, ppm, draw, { tint = '#efe9da', paper = true, alpha = false } = {}) {
  const W = Math.round(w * ppm), H = Math.round(h * ppm), s = surface(W, H, 8);
  Promise.all([paper ? paperImg : null, fontsReady()]).then(([img]) => {
    const g = s.g;
    if (!alpha) { g.fillStyle = tint; g.fillRect(0, 0, W, H); }
    if (img && !alpha) { g.save(); g.globalAlpha = 0.5; g.globalCompositeOperation = 'multiply'; g.filter = 'grayscale(.7) brightness(1.25)'; g.drawImage(img, 0, 0, W * 1.6, H * 1.6); g.restore(); }
    g.textBaseline = 'alphabetic';
    draw(g, W, H);
    s.t.needsUpdate = true;
  });
  return s.t;
}
const text = (g, t, x, y, px, { font = SANS, weight = 600, color = BLACK, align = 'left' } = {}) => {
  g.font = `${weight} ${px}px ${font}`; g.fillStyle = color; g.textAlign = align; g.fillText(t, x, y); g.textAlign = 'left';
};
const barcode = (g, x, y, w, h, seed = 7) => {
  let s = seed; g.fillStyle = BLACK;
  for (let cx = x; cx < x + w;) { s = (s * 16807) % 2147483647; const bw = 1 + (s % 4); if (s % 3) g.fillRect(cx, y, bw, h); cx += bw + 1 + (s % 2); }
};
const plane = (w, h, map, opts = {}) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.75, ...opts }));

// ---------------------------------------------------------------- 胎牛血清：500 mL 方形 PETG 瓶，冻着，琥珀色
function fbs() {
  const g = new THREE.Group(), W = 0.068, H = 0.165;
  const serum = new THREE.MeshPhysicalMaterial({ color: 0xb98a3c, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25, sheen: 0.3, sheenColor: new THREE.Color(0xfff2d8) });
  const frost = pbr('Snow006', W, H, { size: 0.12, color: 0xf2f0ea, roughness: 0.9 });
  frost.transparent = true; frost.opacity = 0.32; frost.depthWrite = false;
  const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, W, 4, 0.009), serum);
  body.position.y = H / 2; g.add(body);
  const rime = new THREE.Mesh(new RoundedBoxGeometry(W + 0.001, H + 0.001, W + 0.001, 4, 0.0095), frost); rime.position.y = H / 2; g.add(rime);
  const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.031, 0.016, 32), serum); shoulder.position.y = H + 0.008; g.add(shoulder);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0215, 0.0215, 0.022, 40), pbr('Plastic010', 0.14, 0.022, { size: 0.05, color: 0xe8e6e0, roughness: 0.55 }));
  cap.position.y = H + 0.027; g.add(cap);
  const front = sheet(0.062, 0.1, 6000, (c, w, h) => {
    c.fillStyle = '#7a1f22'; c.fillRect(0, 0, w, 72);
    text(c, 'FETAL BOVINE SERUM', 18, 48, 30, { color: '#fff', weight: 700 });
    text(c, 'Heat inactivated · Sterile filtered', 18, 112, 19, { weight: 500 });
    text(c, '500 mL', 18, 170, 46, { weight: 700 });
    text(c, 'LOT FB-2611-07', 18, 222, 19, { font: MONO, weight: 500 });
    text(c, 'EXP 11 / 2027', 18, 250, 19, { font: MONO, weight: 500 });
    c.fillStyle = BLACK; c.fillRect(18, 278, w - 36, 2);
    text(c, 'Origin: blood collected from bovine', 18, 314, 17, { weight: 500 });
    text(c, 'fetuses at slaughter.', 18, 338, 17, { weight: 500 });
    text(c, 'Store at −20 °C. Thaw at 2–8 °C.', 18, 378, 17, { weight: 500 });
    text(c, 'For cell culture use only.', 18, 402, 17, { weight: 500 });
    barcode(c, 18, 440, w - 36, 90, 11);
    text(c, '0 74811 26110 7', w / 2, 560, 18, { font: MONO, weight: 500, align: 'center' });
  });
  const fl = plane(0.062, 0.1, front); fl.position.set(0, 0.085, W / 2 + 0.0012); g.add(fl);
  const back = sheet(0.06, 0.07, 6000, (c, w, h) => {
    write(c, 'B-0417 line only', 14, 70, { size: 44, font: marker, color: BLACK, tilt: -0.04 });
    write(c, 'order 6 more —', 14, 140, { size: 40, font: marker, color: BLACK, tilt: -0.03 });
    write(c, 'Wed, dock 01', 24, 205, { size: 40, font: marker, color: BLACK, tilt: -0.02 });
    write(c, 'R.M.', 250, 290, { size: 44, font: marker, color: RED, tilt: -0.05 });
  }, { tint: '#e9e3cf' });
  const bl = plane(0.06, 0.07, back); bl.position.set(0, 0.095, -W / 2 - 0.0012); bl.rotation.y = Math.PI; g.add(bl);
  return { group: g, center: new THREE.Vector3(0, H / 2 + 0.01, 0), view: [0.12, -0.35, 0] };
}

// ---------------------------------------------------------------- 冻存管：2 mL，外旋盖，管底一小团冻住的细胞
function vial() {
  const g = new THREE.Group(), R = 0.00625, H = 0.04;
  const label = sheet(0.04, 0.026, 12000, (c, w, h) => {
    c.fillStyle = 'rgba(214,210,198,.95)'; c.fillRect(0, 0, w, h);
    for (let i = 0; i <= 10; i++) { c.fillStyle = BLACK; c.fillRect(w * 0.47, h - 20 - i * 24, i % 5 ? 14 : 26, 2); }
    write(c, 'B-0417', 16, 70, { size: 64, color: INK });
    write(c, 'P3', 16, 140, { size: 56, color: INK });
    write(c, 'MCB-07', 16, 205, { size: 48, color: INK });
    write(c, '14·11·24', 16, 270, { size: 44, color: INK });
    write(c, 'live donor —', w * 0.56, 90, { size: 44, color: RED });
    write(c, 'biopsy #14', w * 0.56, 150, { size: 44, color: RED });
    write(c, 'R.M.', w * 0.62, 240, { size: 48, color: INK });
  }, { paper: false });
  label.wrapS = THREE.RepeatWrapping;
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.9, H, 40, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xbfc6c6, roughness: 0.35, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
  tube.position.y = H / 2 + 0.004; g.add(tube);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.0002, R * 0.94 + 0.0002, 0.026, 48, 1, true), new THREE.MeshStandardMaterial({ map: label, roughness: 0.8, transparent: true }));
  band.position.y = 0.026; g.add(band);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(R * 0.9, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), tube.material); tip.position.y = 0.004; g.add(tip);
  const pellet = new THREE.Mesh(new THREE.SphereGeometry(R * 0.75, 20, 10), new THREE.MeshStandardMaterial({ color: 0xd8b2a8, roughness: 0.6 })); pellet.scale.y = 0.6; pellet.position.y = 0.006; g.add(pellet);
  const frozen = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.85, R * 0.8, 0.012, 24), pbr('Snow011', 0.04, 0.012, { size: 0.02, color: 0xf4eeec, roughness: 0.7 })); frozen.position.y = 0.011; g.add(frozen);
  const capM = pbr('Plastic010', 0.04, 0.012, { size: 0.02, color: 0xcfccc4, roughness: 0.5 });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.0012, R + 0.0012, 0.011, 32), capM); cap.position.y = H + 0.0095; g.add(cap);
  const insert = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.7, R * 0.7, 0.0012, 24), new THREE.MeshStandardMaterial({ color: 0xa3221e, roughness: 0.5 })); insert.position.y = H + 0.0152; g.add(insert);
  return { group: g, center: new THREE.Vector3(0, 0.026, 0), view: [0.1, 0.3, 0] };
}

// ---------------------------------------------------------------- 冻肉：真空袋里的一块，表面结霜，正反两张标签
function frozen() {
  const g = new THREE.Group();
  const meat = new THREE.Mesh(meatGeometry('beef'), meatMaterial('beef'));
  meat.scale.set(0.27, 0.22, 0.27); meat.position.y = 0.022; g.add(meat);
  const film = new THREE.Mesh(new RoundedBoxGeometry(0.27, 0.05, 0.19, 5, 0.022), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.22, depthWrite: false }));
  film.position.y = 0.024; g.add(film);
  const frost = pbr('Snow006', 0.27, 0.19, { size: 0.16, color: 0xdde8ec, roughness: 0.95 });
  frost.transparent = true; frost.opacity = 0.16; frost.depthWrite = false;
  const rime = new THREE.Mesh(new RoundedBoxGeometry(0.272, 0.052, 0.192, 5, 0.023), frost); rime.position.y = 0.024; g.add(rime);
  const top = sheet(0.1, 0.06, 4800, (c, w, h) => {
    c.fillStyle = '#1d4f86'; c.fillRect(0, 0, w, 50);
    text(c, 'FROZEN', 16, 36, 30, { color: '#fff', weight: 700 });
    text(c, 'BEEF TRIM · 2.5 kg', 16, 92, 24);
    text(c, 'PACKED 03/11  · BATCH BR-02', 16, 128, 17, { font: MONO, weight: 500 });
    text(c, 'Keep at −18 °C or below', 16, 160, 17, { weight: 500 });
    barcode(c, 16, 186, w - 32, 70, 23);
  });
  const tl = plane(0.1, 0.06, top); tl.rotation.x = -Math.PI / 2; tl.position.set(0.04, 0.0505, 0.02); tl.rotation.z = 0.06; g.add(tl);
  const bottom = sheet(0.09, 0.05, 4800, (c, w, h) => {
    c.strokeStyle = RED; c.lineWidth = 6; c.strokeRect(8, 8, w - 16, h - 16);
    text(c, 'REFERENCE TISSUE', w / 2, 70, 26, { color: RED, weight: 700, align: 'center' });
    text(c, 'DONOR B-0417 · LIVE BIOPSY', w / 2, 110, 18, { color: RED, align: 'center' });
    text(c, 'NOT FOR SALE', w / 2, 150, 22, { color: RED, weight: 700, align: 'center' });
    write(c, 'same cow again?', 40, 205, { size: 34, color: INK, tilt: -0.04 });
  });
  const bt = plane(0.09, 0.05, bottom); bt.rotation.x = Math.PI / 2; bt.position.set(-0.03, -0.0015, -0.01); g.add(bt);
  return { group: g, center: new THREE.Vector3(0, 0.024, 0), view: [1.15, -0.25, 0] };
}

// ---------------------------------------------------------------- 牛耳标：黄色塑料旗标 + 背面的公扣，在空运输笼的垫草里捡到
function earTag() {
  const g = new THREE.Group(), w = 0.056, h = 0.072;
  const s = new THREE.Shape();
  const r = 0.008;
  s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - 0.02); s.quadraticCurveTo(w / 2, h / 2 - 0.012, 0.012, h / 2 - 0.004);
  s.lineTo(0.008, h / 2 + 0.006); s.absarc(0, h / 2 + 0.006, 0.008, 0, Math.PI, false);
  s.lineTo(-0.012, h / 2 - 0.004); s.quadraticCurveTo(-w / 2, h / 2 - 0.012, -w / 2, h / 2 - 0.02);
  s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.0018, bevelEnabled: true, bevelThickness: 0.0004, bevelSize: 0.0004, bevelSegments: 2 });
  geo.translate(0, 0, -0.0009);
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 0.04, uv.getY(i) / 0.04);
  const yellow = pbr('Plastic018B', 0.06, 0.08, { size: 0.04, color: 0xf2c21a, roughness: 0.55 });
  g.add(new THREE.Mesh(geo, yellow));
  const print = sheet(w, h, 9000, (c, W, H) => {
    text(c, 'UK', W / 2, 120, 64, { weight: 800, align: 'center' });
    text(c, '286071', W / 2, 250, 58, { font: MONO, weight: 600, align: 'center' });
    text(c, '00101', W / 2, 360, 92, { font: MONO, weight: 700, align: 'center' });
    barcode(c, 70, 410, W - 140, 120, 41);
    c.globalAlpha = 0.35; c.fillStyle = '#5a2a14';
    for (let i = 0; i < 40; i++) c.fillRect(30 + Math.random() * 120, 520 + Math.random() * 100, 2 + Math.random() * 6, 1 + Math.random() * 4);   // 泥
  }, { alpha: true, paper: false });
  const p = plane(w * 0.96, h * 0.96, print, { transparent: true, roughness: 0.6 }); p.position.z = 0.0014; g.add(p);
  const backPrint = sheet(w, h, 9000, (c, W, H) => {
    write(c, 'P-0101', 70, 230, { size: 96, font: marker, color: BLACK, tilt: -0.05 });
    write(c, 'euth. 04/08', 60, 360, { size: 70, font: marker, color: BLACK, tilt: -0.04 });
    c.globalAlpha = 0.5; c.fillStyle = '#5c1d12';
    c.beginPath(); c.ellipse(W * 0.66, H * 0.8, 90, 50, 0.4, 0, 7); c.fill();                       // 干了的血
  }, { alpha: true, paper: false });
  const bp = plane(w * 0.96, h * 0.96, backPrint, { transparent: true, roughness: 0.6 }); bp.position.z = -0.0014; bp.rotation.y = Math.PI; g.add(bp);
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0115, 0.004, 32), yellow); button.rotation.x = Math.PI / 2; button.position.set(0, h / 2 + 0.006, -0.0035); g.add(button);
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.012, 16), new THREE.MeshStandardMaterial({ color: 0xc8c8c4, metalness: 0.9, roughness: 0.35 })); pin.rotation.x = Math.PI / 2; pin.position.set(0, h / 2 + 0.006, -0.009); g.add(pin);
  return { group: g, center: new THREE.Vector3(0, 0.004, 0), view: [0.05, -0.25, 0] };
}

// ---------------------------------------------------------------- 三联收货单：白、粉、黄三层，稍稍错开
function grn() {
  const g = new THREE.Group(), w = 0.148, h = 0.21;
  const top = sheet(w, h, 3000, (c, W, H) => {
    text(c, 'GOODS RECEIVED NOTE', 28, 56, 26, { weight: 700 });
    text(c, 'No. 004417', W - 28, 56, 20, { font: MONO, weight: 500, align: 'right', color: RED });
    c.fillStyle = BLACK; c.fillRect(28, 72, W - 56, 2);
    const rows = [['Date', '21 / 11'], ['Supplier', 'Hale Farm, holding 14/286'], ['Item', '1 × porcine, live'], ['Tag', 'UK 286071 01077'], ['Purpose', 'biopsy donor'], ['Condition', 'stressed, cuts on flank'], ['Received by', 'J.K.']];
    rows.forEach(([k, v], i) => {
      const y = 126 + i * 64;
      text(c, k, 28, y, 15, { weight: 500, color: '#55605a' });
      c.fillStyle = 'rgba(40,50,46,.35)'; c.fillRect(150, y + 6, W - 178, 1);
      write(c, v, 156, y + 2, { size: 30, color: INK });
    });
    text(c, 'Animal welfare check', 28, 610, 15, { weight: 500, color: '#55605a' });
    c.strokeStyle = BLACK; c.lineWidth = 2; c.strokeRect(250, 592, 22, 22); c.strokeRect(340, 592, 22, 22);
    text(c, 'yes', 280, 610, 15, { weight: 500 }); text(c, 'no', 370, 610, 15, { weight: 500 });
    write(c, '?', 252, 612, { size: 34, color: RED });
    write(c, 'returned to farm Fri?', 40, 700, { size: 32, color: RED, tilt: -0.03 });
    text(c, 'WHITE — OFFICE   PINK — FARM   YELLOW — LAB', W / 2, H - 22, 12, { weight: 500, color: '#55605a', align: 'center' });
  }, { tint: '#f1ede2' });
  const tints = ['#f1ede2', '#efd8d6', '#efe2b0'];
  for (let i = 2; i >= 0; i--) {
    const map = i ? sheet(w, h, 600, () => {}, { tint: tints[i] }) : top;
    const p = plane(w, h, map, { side: THREE.DoubleSide, roughness: 0.9 });
    p.position.set(i * 0.004, i * -0.005, -i * 0.0006); p.rotation.z = i * -0.012; g.add(p);
  }
  return { group: g, center: new THREE.Vector3(0, 0, 0), view: [0.08, -0.2, 0] };
}

// ---------------------------------------------------------------- 待发的订单箱：面单上就是你下的那一单
function order({ order: o } = {}) {
  const g = new THREE.Group(), W = 0.3, H = 0.15, D = 0.2;
  const box = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), pbr('Cardboard001', W, D, { size: 0.3, color: 0xc8a878, roughness: 0.9 }));
  box.position.y = H / 2; g.add(box);
  const tape = pbr('Tape002', 0.05, D, { size: 0.05, color: 0xd8c8a0, roughness: 0.4 });
  const t = new THREE.Mesh(new THREE.PlaneGeometry(0.05, D + 0.002), tape); t.rotation.x = -Math.PI / 2; t.position.y = H + 0.0006; g.add(t);
  const no = o?.no || 'FM-7055', what = { beef: 'Cultivated beef', pork: 'Cultivated pork', chicken: 'Cultivated chicken', fish: 'Cultivated croaker' }[o?.species] || 'Cultivated beef';
  const line = { beef: 'B-0417', pork: 'P-0932', chicken: 'G-0221', fish: 'F-1180' }[o?.species] || 'B-0417';
  const lab = sheet(0.15, 0.1, 4000, (c, w, h) => {
    text(c, 'FUTURE MEAT MARKET', 22, 46, 26, { weight: 700 });
    text(c, 'CHILLED · 0–4 °C', w - 22, 46, 18, { weight: 600, align: 'right', color: '#1d4f86' });
    c.fillStyle = BLACK; c.fillRect(22, 62, w - 44, 3);
    text(c, `ORDER ${no}`, 22, 116, 40, { font: MONO, weight: 700 });
    text(c, `${what} · 200 g`, 22, 160, 22, { weight: 500 });
    text(c, `Cell line ${line}`, 22, 192, 22, { weight: 500 });
    text(c, 'Slaughter-free', 22, 224, 22, { weight: 500 });
    barcode(c, 22, 250, w - 44, 90, no.length * 13);
    text(c, `${no}  ·  PACKED BY J.K.`, 22, 372, 16, { font: MONO, weight: 500 });
  }, { tint: '#f6f3ea' });
  const lp = plane(0.15, 0.1, lab, { roughness: 0.6 }); lp.rotation.x = -Math.PI / 2; lp.rotation.z = 0.05; lp.position.set(0.06, H + 0.0011, 0.01); g.add(lp);
  const side = sheet(0.12, 0.07, 3000, (c, w, h) => {
    write(c, `donor biopsy for ${line}`, 20, 70, { size: 38, font: marker, color: BLACK, tilt: -0.03 });
    write(c, 'booked Thu 07:00', 20, 140, { size: 38, font: marker, color: BLACK, tilt: -0.02 });
  }, { alpha: true, paper: false });
  const sp = plane(0.12, 0.07, side, { transparent: true }); sp.position.set(0, H / 2, -D / 2 - 0.0008); sp.rotation.y = Math.PI; g.add(sp);
  return { group: g, center: new THREE.Vector3(0, H / 2, 0), view: [0.95, -0.45, 0] };
}

// ---------------------------------------------------------------- 实验台上的交班单：夹在木夹板上
function handover() {
  const g = new THREE.Group(), w = 0.21, h = 0.297;
  const board = new THREE.Mesh(new RoundedBoxGeometry(0.23, 0.32, 0.004, 2, 0.006), pbr('wood_table_worn', 0.23, 0.32, { size: 0.4, color: 0x9a7a58, roughness: 0.7 }));
  g.add(board);
  const page = sheet(w, h, 2600, (c, W, H) => {
    text(c, 'SHIFT HANDOVER — CULTURE LAB', 28, 64, 22, { weight: 700 });
    text(c, '22 / 11   night → day', 28, 98, 16, { font: MONO, weight: 500 });
    c.fillStyle = BLACK; c.fillRect(28, 112, W - 56, 2);
    const rows = [['B-0417', 'P37', 'media change ok'], ['P-0932', 'P52', 'contaminated — binned'], ['G-0221', 'P41', 'donor gone, still growing'], ['F-1180', 'P12', 'waiting for FBS'], ['BR-02', 'd10', 'customer batch, on track']];
    rows.forEach(([a, b, n], i) => {
      const y = 170 + i * 74;
      text(c, a, 28, y, 18, { font: MONO, weight: 600 }); text(c, b, 160, y, 18, { font: MONO, weight: 500 });
      write(c, n, 230, y + 2, { size: 30, color: i === 1 ? RED : INK });
      c.fillStyle = 'rgba(40,50,46,.3)'; c.fillRect(28, y + 22, W - 56, 1);
    });
    write(c, 'Thu 07:00 — biopsy B-0417,', 30, 600, { size: 32, color: RED, tilt: -0.02 });
    write(c, 'vet booked. Same rump?', 30, 650, { size: 32, color: RED, tilt: -0.02 });
    circled(c, 165, 590, 140, 40);
  }, { tint: '#f2efe6' });
  const p = plane(w, h, page, { roughness: 0.85 }); p.position.set(0, -0.008, 0.0026); g.add(p);
  const clip = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.03, 0.008, 2, 0.003), new THREE.MeshStandardMaterial({ color: 0xc8c8c4, metalness: 0.9, roughness: 0.3 }));
  clip.position.set(0, 0.145, 0.006); g.add(clip);
  return { group: g, center: new THREE.Vector3(0, 0, 0), view: [0.08, -0.2, 0] };
}

// ---------------------------------------------------------------- 试吃块：牙签上插着一小块，旗子上写着细胞系和培养天数
function sample() {
  const g = new THREE.Group();
  // 煎过的一小块：上下两面焦褐、有烙痕，四个切面是粉色的芯、带肌纤维
  const face = (crust) => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    if (crust) { g.fillStyle = '#5e2c17'; g.fillRect(0, 0, 128, 128); g.fillStyle = 'rgba(25,10,4,.7)'; for (let i = 0; i < 4; i++) g.fillRect(0, 14 + i * 32, 128, 9); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${150 + Math.random() * 60},${70 + Math.random() * 30},30,.35)`; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); } }
    else { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#4a2010'); gr.addColorStop(0.16, '#9a4a32'); gr.addColorStop(0.3, '#d47a74'); gr.addColorStop(0.7, '#d47a74'); gr.addColorStop(0.84, '#9a4a32'); gr.addColorStop(1, '#4a2010'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      g.strokeStyle = 'rgba(120,40,40,.35)'; for (let i = 0; i < 30; i++) { g.beginPath(); const y = 24 + Math.random() * 80; g.moveTo(0, y); g.bezierCurveTo(40, y + 6, 80, y - 6, 128, y + 3); g.stroke(); } }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, roughness: crust ? 0.55 : 0.4 }); };
  const side = face(false), crust = face(true);
  const cube = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.018, 0.022), [side, side, crust, crust, side, side]);
  cube.position.y = 0.009; g.add(cube);
  const wood = pbr('wood_table_001', 0.004, 0.065, { size: 0.03, color: 0xe2cfa8, roughness: 0.8 });
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.001, 0.0011, 0.065, 10), wood); stick.position.y = 0.035; g.add(stick);
  const flag = sheet(0.03, 0.015, 12000, (c, w, h) => {
    text(c, 'B-0417 · d28', w / 2, h * 0.62, 38, { weight: 700, align: 'center' });
  }, { tint: '#f4f1e8', paper: false });
  const f = plane(0.03, 0.015, flag, { side: THREE.DoubleSide, roughness: 0.8 }); f.position.set(0.0155, 0.058, 0); g.add(f);
  return { group: g, center: new THREE.Vector3(0, 0.03, 0), view: [0.25, -0.5, 0] };
}

export const SPECIMENS = { fbs, vial, frozen, eartag: earTag, grn, order, handover, sample };
