// 办公室里两样写了字的东西：供体动物登记簿（能一页一页翻）和细胞系周计划白板。全部英文。
//   登记簿照英国牲畜 holding register 的格式分栏（A 在场动物 / B 操作记录 / C 离场与死亡）；纸是扫描的纸纹，字是圆珠笔手写。
//   白板照细胞培养室的周计划：细胞系 × 星期（换液、传代、收获），代次写在最前面，格子是细的黑胶带贴出来的。
import * as THREE from 'three';

const FORM = '"Inter", sans-serif', MONO = '"IBM Plex Mono", monospace';
const INK = '#1c2f66', RED = '#a3221e', BLACK = '#23262b';
const pen = (px) => `400 ${px}px "Nanum Pen Script", "Caveat", cursive`;
const marker = (px, w = 600) => `${w} ${px}px "Caveat Brush", "Caveat", cursive`;

export function scan(src) {
  return new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
}
export const fontsReady = () => Promise.all(['24px "Nanum Pen Script"', '24px "Caveat Brush"', '600 24px "Caveat"', '600 24px "Inter"', '500 24px "IBM Plex Mono"']
  .map((f) => document.fonts.load(f).catch(() => null)));

export function surface(w, h, aniso = 8) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return { t, g: c.getContext('2d') };
}

// 一笔一笔的手写：每个词的高低、斜度都差一点
export function write(g, text, x, y, { size = 30, color = INK, font = pen, tilt = 0, strike = false } = {}) {
  g.save();
  g.translate(x, y);
  g.rotate(tilt);
  g.font = font(size);
  g.fillStyle = color;
  g.textAlign = 'left';
  let cx = 0;
  String(text).split(' ').forEach((word, i) => {
    const n = (word.length * 7 + i * 13 + Math.round(x + y)) % 5;
    g.save();
    g.translate(cx, (n - 2) * 0.7);
    g.rotate((n - 2) * 0.004);
    g.globalAlpha = 0.86 + n * 0.03;
    g.fillText(word, 0, 0);
    g.restore();
    cx += g.measureText(word + ' ').width;
  });
  if (strike) { g.strokeStyle = color; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-4, -size * 0.25); g.lineTo(cx * 0.5, -size * 0.31); g.lineTo(cx, -size * 0.22); g.stroke(); }
  g.restore();
  return cx;
}
export function circled(g, x, y, w, h, color = RED) {
  g.save();
  g.strokeStyle = color; g.lineWidth = 2.6; g.beginPath();
  for (let i = 0; i <= 44; i++) {
    const a = (i / 44) * Math.PI * 2.15 - 2.2, wob = 1 + Math.sin(a * 3) * 0.03 + i * 0.0012;
    g.lineTo(x + Math.cos(a) * w * wob, y + Math.sin(a) * h * wob);
  }
  g.stroke();
  g.restore();
}

// ---------------------------------------------------------------- 登记簿
const PW = 760, PH = 1075;

function formPage(g, { head, sub, cols, rows, no, rowH = 72, top = 214 }) {
  g.fillStyle = '#33433c';
  g.font = `700 29px ${FORM}`; g.fillText(head, 44, 78);
  g.font = `400 16px ${FORM}`; g.fillText(sub, 44, 106);
  g.font = `500 14px ${MONO}`; g.textAlign = 'right'; g.fillText('CPH 14/286/0071', PW - 40, 78); g.fillText(`Folio ${no}`, PW - 40, PH - 38); g.textAlign = 'left';
  const bottom = PH - 72, x0 = 40, x1 = PW - 36, at = [x0];
  for (const [, w] of cols) at.push(at[at.length - 1] + w * (x1 - x0));
  g.fillStyle = 'rgba(70,110,92,.14)'; g.fillRect(x0, top - 76, x1 - x0, 76);
  g.fillStyle = '#33433c'; g.font = `600 14px ${FORM}`;
  cols.forEach(([label], i) => label.split('/').forEach((line, k) => g.fillText(line.trim(), at[i] + 7, top - 46 + k * 18)));
  g.strokeStyle = 'rgba(52,86,72,.42)'; g.lineWidth = 1;
  for (let y = top; y <= bottom; y += rowH) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); }
  g.strokeStyle = 'rgba(52,86,72,.7)'; g.lineWidth = 1.5;
  for (const x of at) { g.beginPath(); g.moveTo(x, top - 76); g.lineTo(x, bottom); g.stroke(); }
  g.beginPath(); g.moveTo(x0, top - 76); g.lineTo(x1, top - 76); g.moveTo(x0, top); g.lineTo(x1, top); g.stroke();
  rows.forEach((row, r) => row.forEach((cell, c) => {
    if (cell === null || cell === undefined) return;
    const o = typeof cell === 'string' ? { t: cell } : cell;
    g.font = pen(o.size || 32);
    const size = (o.size || 32) * Math.min(1, (at[c + 1] - at[c] - 16) / (g.measureText(o.t).width || 1));   // 写不下就写小一点，不压到隔壁栏
    write(g, o.t, at[c] + 8 + ((r * 7 + c) % 4), top + (r + 1) * rowH - 22 + ((r + c) % 3), { size, color: o.color || INK, strike: o.strike, tilt: ((r % 3) - 1) * 0.007 });
    if (o.ring) circled(g, at[c] + (at[c + 1] - at[c]) / 2, top + (r + 1) * rowH - 32, (at[c + 1] - at[c]) / 2 + 6, 26);
  }));
}

const PAGES = [
  (g) => {
    g.strokeStyle = '#33433c'; g.lineWidth = 2; g.strokeRect(84, 150, PW - 168, 430);
    g.lineWidth = 0.8; g.strokeRect(94, 160, PW - 188, 410);
    g.fillStyle = '#33433c'; g.textAlign = 'center';
    g.font = `700 50px ${FORM}`; g.fillText('DONOR ANIMAL', PW / 2, 268); g.fillText('REGISTER', PW / 2, 326);
    g.font = `500 18px ${MONO}`; g.fillText('BOVINE · PORCINE · AVIAN · PISCINE', PW / 2, 376);
    g.font = `400 16px ${FORM}`; g.fillText('Holding number', PW / 2, 432); g.fillText('Keeper', PW / 2, 508);
    g.fillText('Retain for ten years after the last entry', PW / 2, PH - 90);
    g.textAlign = 'left';
    write(g, '14 / 286 / 0071', PW / 2 - 100, 470, { size: 44 });
    write(g, 'Future Meat Ltd.', PW / 2 - 104, 548, { size: 44 });
    write(g, 'Vol. III', 108, 690, { size: 60 });
    write(g, 'Mar 2024 —', 108, 752, { size: 48 });
    write(g, 'do NOT leave open on the desk', 190, 866, { size: 40, color: RED, tilt: -0.035 });
    g.save(); g.translate(PW - 176, 760); g.rotate(0.2); g.globalAlpha = 0.55; g.strokeStyle = g.fillStyle = RED; g.lineWidth = 4;
    g.strokeRect(-104, -40, 208, 80); g.font = `700 27px ${FORM}`; g.textAlign = 'center'; g.fillText('OFFICE COPY', 0, 10); g.restore();
  },
  (g) => formPage(g, { no: '01', head: 'A — ANIMALS ON THE HOLDING', sub: 'Enter within 36 hours of arrival',
    cols: [['Ear tag /leg band', 0.28], ['Breed', 0.17], ['Sex', 0.07], ['Born', 0.11], ['Arrived', 0.17], ['Cell line /taken', 0.2]],
    rows: [
      ['UK 286071 00417', 'Holstein', 'M', '04/21', '11/03/24', 'B-0417'],
      ['UK 286071 00932', 'Duroc', 'F', '01/22', '02/06/24', 'P-0932'],
      ['UK 286071 01077', 'Lg White', 'F', '07/23', '19/10/24', 'P-1077'],
      ['band 0221', 'Broiler', 'F', '09/24', '19/01/25', { t: 'G-0221', color: RED }],
      ['pen 7 / cage 3', 'Croaker', '?', '—', '07/04/25', 'F-1180'],
      [{ t: 'UK 286071 00101', strike: true }, { t: 'Duroc', strike: true }, 'F', '03/21', '11/03/24', { t: 'see sect. C', color: RED }],
      [null, null, null, null, null, { t: 'replacement?', color: BLACK }],
    ] }),
  (g) => {
    formPage(g, { no: '14', head: 'B — PROCEDURES', sub: 'Biopsy, blood draw, anaesthesia', rowH: 64,
      cols: [['Date', 0.15], ['Animal', 0.2], ['Site', 0.22], ['Core /mm', 0.12], ['Anaes.', 0.15], ['By', 0.16]],
      rows: [
        ['02/11', 'B-0417', 'L. rump', '8', 'local', 'R.M.'],
        ['05/11', 'P-0932', 'R. ham', '6', 'local', 'R.M.'],
        ['09/11', 'B-0417', 'R. rump', '8', 'local', 'J.K.'],
        ['11/11', 'P-1077', 'L. loin', '6', { t: 'none?', color: RED, ring: true }, 'J.K.'],
        ['14/11', 'B-0417', 'L. rump', '8', 'local', 'R.M.'],
        ['14/11', 'P-0932', 'R. ham', '6', 'local', 'R.M.'],
        ['16/11', 'F-1180', 'fin', '2', '—', 'temp'],
        ['18/11', 'B-0417', { t: 'L. rump again', color: RED }, '10', 'local', 'R.M.'],
        ['20/11', 'P-1077', 'R. loin', '6', 'local', 'J.K.'],
        ['21/11', 'P-0932', 'L. ham', '6', 'local', 'R.M.'],
        ['22/11', 'B-0417', 'R. rump', { t: '8', strike: true }, null, null],
      ] });
    write(g, 'scar tissue — go 3 cm lower', 150, PH - 104, { size: 38, color: RED, tilt: -0.02 });
  },
  (g) => {
    formPage(g, { no: '15', head: 'B — AUTHORISATION', sub: 'All parties to each procedure must sign', rowH: 96,
      cols: [['Date', 0.16], ['Farm', 0.24], ['Vet', 0.2], ['Company', 0.2], ['Animal', 0.2]],
      rows: [
        ['02/11', 'T. Hale', 'R.M.', 'FMM', null],
        ['05/11', 'T. Hale', 'R.M.', 'FMM', null],
        ['09/11', 'T. Hale', 'J.K.', 'FMM', null],
        ['11/11', 'p.p. Hale', 'J.K.', 'FMM', null],
        ['14/11', 'T. Hale', 'R.M.', 'FMM', null],
        ['16/11', '—', 'temp', 'FMM', null],
        ['18/11', 'T. Hale', 'R.M.', 'FMM', { t: 'n/a', color: RED, ring: true }],
      ] });
    write(g, 'why is this column still printed?', 250, PH - 100, { size: 40, color: BLACK, tilt: 0.02 });
  },
  (g) => {
    formPage(g, { no: '31', head: 'C — OFF THE HOLDING / DEATHS', sub: 'Enter deaths within 7 days', rowH: 86,
      cols: [['Date', 0.16], ['Animal', 0.2], ['Destination /cause', 0.38], ['Line kept?', 0.26]],
      rows: [
        ['04/08', { t: 'P-0101' }, 'euth. — infection', { t: 'YES', color: RED }],
        ['04/08', null, 'bed left empty', null],
        ['30/10', { t: 'G-0221' }, 'sent to market', { t: 'YES', color: RED, ring: true }],
        ['12/11', 'F-1180 ?', 'not seen in pen', 'yes'],
      ] });
    write(g, 'animal gone,', 130, 700, { size: 62, color: RED, tilt: -0.04 });
    write(g, 'cells still growing', 160, 770, { size: 62, color: RED, tilt: -0.04 });
  },
  (g) => {
    formPage(g, { no: '32', head: 'C — CONTINUED', sub: 'Enter deaths within 7 days', rowH: 86,
      cols: [['Date', 0.16], ['Animal', 0.2], ['Destination /cause', 0.38], ['Line kept?', 0.26]], rows: [] });
    write(g, 'B-0417', 110, 384, { size: 44, color: 'rgba(28,47,102,.45)', strike: true });
    write(g, 'not yet.', 300, 388, { size: 44, color: BLACK });
  },
];

export function makeLedger({ pbr, RB }) {
  const W = 0.205, D = 0.292, BASE = 0.018, N = 22;
  const group = new THREE.Group();
  const cover = pbr('leather_red_02', 0.44, 0.31, { size: 0.35, color: 0x5a2420, roughness: 0.8 });
  cover.map = null;
  RB(0.44, 0.007, 0.31, 0.003, cover, 0, 0.0035, 0, group);
  const edge = pbr('Paper005', 0.42, 0.02, { size: 0.12, color: 0xe6ddc8 });
  for (const s of [-1, 1]) {                                                 // 两摞书页：一张张错开一点
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(W - i * 0.0012, 0.002, D - i * 0.001), edge);
      b.position.set(s * (W / 2 + 0.002), 0.008 + i * 0.0021, ((i * 7) % 3 - 1) * 0.0007);
      group.add(b);
    }
  }
  const pages = PAGES.map(() => surface(PW, PH, 12)), blank = surface(PW, PH, 4);
  Promise.all([scan('assets/ph/tex/Paper005/diff.jpg'), fontsReady()]).then(([paper]) => {
    pages.forEach(({ t, g }, i) => {
      g.fillStyle = '#e9e2cf'; g.fillRect(0, 0, PW, PH);
      if (paper) {
        g.save();
        g.filter = 'grayscale(.78) brightness(1.2) contrast(1.35)'; g.globalAlpha = 0.85;
        if (i % 2) { g.translate(PW, 0); g.scale(-1, 1); }
        g.drawImage(paper, -(i * 31), -(i * 17), PW * 1.55, PH * 1.3);
        g.restore();
      }
      const gutter = g.createLinearGradient(i % 2 ? 0 : PW, 0, i % 2 ? 70 : PW - 70, 0);
      gutter.addColorStop(0, 'rgba(50,38,22,.3)'); gutter.addColorStop(1, 'rgba(50,38,22,0)');
      g.fillStyle = gutter; g.fillRect(0, 0, PW, PH);
      PAGES[i](g);
      t.needsUpdate = true;
    });
    blank.g.drawImage(pages[1].g.canvas, 0, 0); blank.g.fillStyle = '#e9e2cf'; blank.g.globalAlpha = 1;
    blank.g.fillRect(0, 0, PW, PH);
    if (paper) { blank.g.save(); blank.g.filter = 'grayscale(.78) brightness(1.2) contrast(1.35)'; blank.g.globalAlpha = 0.85; blank.g.drawImage(paper, -40, -20, PW * 1.55, PH * 1.3); blank.g.restore(); }
    blank.t.needsUpdate = true;
  });

  // 一页纸：amount 0 = 摊在右边，1 = 翻到左边；中间是弯着立起来的
  function pageGeometry() {
    const g = new THREE.PlaneGeometry(1, 1, N, 2);
    return g;
  }
  function bend(geo, amount) {
    const p = geo.attributes.position, a = amount * Math.PI, sag = Math.sin(a);
    let x = 0, lift = 0;
    const row = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      row.push([x, BASE + lift + (1 - sag) * 0.007 * Math.sin(Math.min(1, u * 1.15) * Math.PI) * (1 - u * 0.35)]);
      const angle = a + sag * 0.75 * (0.5 - u);
      x += (Math.cos(angle) * W) / N;
      lift = Math.max(0, lift + (Math.sin(angle) * W) / N);
    }
    for (let j = 0, k = 0; j <= 2; j++) for (let i = 0; i <= N; i++, k++) p.setXYZ(k, row[i][0], row[i][1] + (amount > 0 && amount < 1 ? 0.0015 : 0), (j / 2 - 0.5) * D);
    p.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
  }
  const make = (amount, side, mirror) => {
    const geo = pageGeometry();
    if (mirror) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i)); }
    bend(geo, amount);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: pages[0].t, color: 0xb9b6ae, roughness: 0.95, side }));
    m.frustumCulled = false;
    group.add(m);
    return m;
  };
  // 左页 = 翻过去的一页的背面
  const left = make(1, THREE.BackSide, true), right = make(0, THREE.FrontSide, false);
  const front = make(0, THREE.FrontSide, false), back = make(0, THREE.BackSide, true);
  const LAST = pages.length / 2 - 1, state = { v: 0 };
  let spread = 0, flip = null, corner = 0, wanted = 0;

  function show() {
    left.material.map = pages[spread * 2].t;
    right.material.map = pages[spread * 2 + 1].t;
    front.visible = back.visible = false;
  }
  function turn(dir) {
    if (flip || spread + dir < 0 || spread + dir > LAST) return;
    const low = dir > 0 ? spread : spread - 1;                               // 翻动的是 low 这一摊的右页 / 下一摊的左页
    // 只看得见现在这一摊上的字：翻起来的那页背面、露出来的下一页先是空白，翻到底才换成内容
    front.material.map = dir > 0 ? pages[low * 2 + 1].t : blank.t;
    back.material.map = dir > 0 ? blank.t : pages[low * 2 + 2].t;
    left.material.map = dir > 0 ? pages[low * 2].t : blank.t;
    right.material.map = dir > 0 ? blank.t : pages[low * 2 + 3].t;
    front.visible = back.visible = true;
    corner = wanted = 0;
    state.v = dir > 0 ? 0 : 1;
    flip = gsap.to(state, { v: dir > 0 ? 1 : 0, duration: 1.15, ease: 'power1.inOut',
      onUpdate() { bend(front.geometry, state.v); bend(back.geometry, state.v); },
      onComplete() { flip = null; spread += dir; show(); } });
  }
  function hover(side) { wanted = side > 0 && spread < LAST ? 0.055 : side < 0 && spread > 0 ? -0.055 : 0; }
  function tick() {                                                          // 指到哪边，哪边那页先翘起来一点
    if (flip || Math.abs(wanted - corner) < 0.0005) return;
    corner += (wanted - corner) * 0.16;
    if (Math.abs(wanted - corner) < 0.0005) corner = wanted;
    bend(right.geometry, Math.max(0, corner));
    bend(left.geometry, 1 + Math.min(0, corner));
  }
  show();
  for (const m of pages) m.t.name = 'ledger page';
  group.traverse((o) => { o.userData.keep = true; });
  const local = new THREE.Vector3();
  return {
    group, turn, hover, tick, textures: pages.map((p) => p.t),
    side(ray) {                                                              // 指在左页还是右页
      const h = ray.intersectObjects([left, right, front, back].filter((m) => m.visible), false)[0];
      return h ? (group.worldToLocal(local.copy(h.point)).x >= 0 ? 1 : -1) : 0;
    },
  };
}

// ---------------------------------------------------------------- 白板
const BW = 1536, BH = 1118;

function drawBoard(g) {
  g.fillStyle = '#eceeea'; g.fillRect(0, 0, BW, BH);
  write(g, 'harvest 19/10  —  donor P-0101', 170, 905, { size: 64, font: marker, color: 'rgba(40,60,90,.07)' });   // 上回擦过、还看得出来的旧字
  write(g, 'NO DEATHS TO REPORT', 590, 500, { size: 92, font: marker, color: 'rgba(40,60,90,.055)', tilt: -0.02 });

  write(g, 'CELL LINES', 56, 112, { size: 86, font: marker, color: BLACK });
  write(g, 'wk 47', 438, 110, { size: 70, font: marker, color: INK });
  write(g, '16 – 20 Nov', 640, 108, { size: 50, font: marker, color: INK });
  write(g, 'on call: J.K.', 1180, 104, { size: 50, font: marker, color: BLACK, tilt: -0.015 });

  const x = [50, 290, 400, 575, 750, 925, 1100, 1275, 1486], y = [146, 226, 352, 478, 604, 730];
  g.fillStyle = '#25272a';
  for (const v of x) g.fillRect(v - 2, y[0], 4, y[y.length - 1] - y[0]);
  for (const v of y) g.fillRect(x[0] - 2, v - 2, x[x.length - 1] - x[0] + 4, 4);
  ['LINE', 'P#', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'HARVEST'].forEach((t, i) => write(g, t, x[i] + 14, 202, { size: 42, font: marker, color: BLACK }));
  const rows = [
    [['B-0417', BLACK], ['37', INK], ['feed', INK], ['split 1:4', INK], ['feed', INK], ['biopsy', RED], ['seed', INK], ['Fri BR-02', '#1d6a3a']],
    [['P-0932', BLACK], ['52', RED], ['feed', INK], ['cloudy?', RED], ['contam.', RED], ['re-seed', RED], ['—', INK], ['lost', RED]],
    [['G-0221', BLACK], ['41', INK], ['split 1:4', INK], ['feed', INK], ['feed', INK], ['split', INK], ['feed', INK], ['donor gone', RED]],
    [['F-1180', BLACK], ['12', INK], ['wait FBS', INK], ['wait', INK], ['FBS in', '#1d6a3a'], ['thaw', INK], ['feed', INK], ['Dec?', INK]],
  ];
  rows.forEach((row, r) => row.forEach(([t, color], c) => write(g, t, x[c] + 12 + ((r + c) % 3) * 3, y[r + 1] + 80 + ((r * 2 + c) % 4) * 3, { size: c === 0 ? 56 : c === 1 ? 60 : 44, font: marker, color, tilt: ((r + c) % 3 - 1) * 0.025 })));
  circled(g, (x[1] + x[2]) / 2, y[2] + 64, 46, 42);
  circled(g, (x[7] + x[8]) / 2, y[3] + 64, 100, 46);

  write(g, 'THURSDAY 07:00', 66, 824, { size: 52, font: marker, color: RED });
  write(g, 'vet — B-0417 x 2', 66, 890, { size: 50, font: marker, color: INK });
  write(g, 'consent forms', 66, 958, { size: 50, font: marker, color: INK });
  write(g, '→ who signs for the animal?', 66, 1026, { size: 50, font: marker, color: RED, tilt: -0.012 });

  // 随手画的一条增殖曲线
  g.strokeStyle = BLACK; g.lineWidth = 4; g.beginPath(); g.moveTo(1128, 776); g.lineTo(1124, 1010); g.lineTo(1468, 1014); g.stroke();
  g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(1134, 998); g.bezierCurveTo(1240, 990, 1240, 826, 1326, 822); g.bezierCurveTo(1390, 819, 1420, 850, 1458, 930); g.stroke();
  g.setLineDash([14, 12]); g.strokeStyle = RED; g.lineWidth = 3; g.beginPath(); g.moveTo(1392, 790); g.lineTo(1396, 1010); g.stroke(); g.setLineDash([]);
  write(g, '~P50', 1398, 800, { size: 42, font: marker, color: RED });
  write(g, 'then back to the animal', 1120, 1064, { size: 40, font: marker, color: BLACK });
}

export function makeWhiteboard({ pbr, M, box, cyl }) {
  const w = 1.1, h = 0.8, group = new THREE.Group(), board = surface(BW, BH, 12);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshPhysicalMaterial({ map: board.t, roughness: 0.24, clearcoat: 0.5, clearcoatRoughness: 0.2 }));
  face.position.z = 0.006;
  group.add(face);
  const alu = pbr('Metal009', 1.1, 0.03, { size: 0.4, metalness: 0.85, roughness: 0.5, color: 0xd0d4d4 });
  for (const s of [-1, 1]) { box(w + 0.04, 0.022, 0.018, alu, 0, s * (h / 2 + 0.008), 0.009, group); box(0.022, h, 0.018, alu, s * (w / 2 + 0.009), 0, 0.009, group); }
  box(0.52, 0.006, 0.062, alu, 0.2, -h / 2 - 0.024, 0.037, group); box(0.52, 0.018, 0.005, alu, 0.2, -h / 2 - 0.016, 0.066, group);   // 笔槽
  for (const [x, col, rot] of [[0.04, 0x1c2f66, 0.1], [0.14, 0xa3221e, -0.14], [0.22, 0x1b1c1e, 0.05]]) {
    const body = cyl(0.008, 0.008, 0.105, M.steel, x, -h / 2 - 0.012, 0.038, group, 12);
    body.material = new THREE.MeshStandardMaterial({ color: 0xe6e4da, roughness: 0.4 }); body.rotation.set(0, rot, Math.PI / 2);
    const cap = cyl(0.0092, 0.0092, 0.036, M.steel, x + 0.066 * Math.cos(rot), -h / 2 - 0.012, 0.038 - 0.066 * Math.sin(rot), group, 12);
    cap.material = new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 }); cap.rotation.copy(body.rotation);
  }
  box(0.125, 0.026, 0.044, pbr('Fabric045', 0.13, 0.05, { size: 0.2, color: 0x303438 }), 0.36, -h / 2 - 0.008, 0.038, group);          // 板擦

  // 磁铁压着的两张纸条：扫描纸纹，下角翘起来一点
  const notes = [
    [-0.09, -0.225, 0.15, 0.13, 0.035, ['FBS', '6 x 500 ml', 'Wed, dock 01']],
    [0.11, -0.26, 0.14, 0.145, -0.06, ['G-0221', 'stop saying', '“retired”']],
  ];
  const tags = notes.map(([x, y, nw, nh, rot, lines]) => {
    const s = surface(340, Math.round((340 * nh) / nw));
    const geo = new THREE.PlaneGeometry(nw, nh, 8, 8), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i) / nw + 0.5, v = 0.5 - p.getY(i) / nh; p.setZ(i, Math.max(0, v - 0.45) ** 2 * 0.045 * (0.4 + u)); }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: s.t, roughness: 0.95 }));
    m.position.set(x, y, 0.009); m.rotation.z = rot;
    group.add(m);
    const mag = cyl(0.011, 0.011, 0.008, M.steel, x + nw * 0.3, y + nh / 2 - 0.015, 0.015, group, 18);
    mag.rotation.x = Math.PI / 2;
    return { s, lines };
  });
  Promise.all([scan('assets/ph/tex/Paper005/diff.jpg'), fontsReady()]).then(([paper]) => {
    drawBoard(board.g);
    board.t.needsUpdate = true;
    tags.forEach(({ s, lines }, i) => {
      const { width: W, height: H } = s.g.canvas;
      s.g.fillStyle = i ? '#e6dfc9' : '#dfc98a'; s.g.fillRect(0, 0, W, H);
      if (paper) { s.g.save(); s.g.globalAlpha = 0.75; s.g.filter = i ? 'grayscale(.8) brightness(1.22)' : 'brightness(1.12)'; s.g.drawImage(paper, 0, 0, W * 1.8, H * 1.8); s.g.restore(); }
      lines.forEach((t, k) => write(s.g, t, 30, 92 + k * 68, { size: k ? 48 : 62, color: k === 2 && i ? RED : BLACK }));
      s.t.needsUpdate = true;
    });
  });
  group.traverse((o) => { o.userData.keep = true; });
  return { group };
}
