// 前台上的一本黄色横线便签本（美式 legal pad，22.3 × 30.7 cm），最上面一页是店员手写的今日菜单。
// 做法参考了 felixrieseberg.com 桌上那本便签的思路：纸、横线、红色双竖线画在 canvas 上，字用手写字体逐行写上去，
// 每一行都不完全水平、不完全压在线上，再描一遍边让墨迹更重；圈、划线、荧光笔都是手抖的折线。
// 中文用 Long Cang（Google Fonts 的手写体），英文和数字用 Caveat。
import * as THREE from 'three';

const rng = (seed) => { let s = (Math.abs(seed) % 2147483646) + 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const hash = (t) => { let h = 7; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) | 0; return h; };

const CW = 1024, CH = 1410;                  // 纸的比例 22.3 : 30.7
const TOP = 320, RULE = 58, MARGIN = 150, LEFT = MARGIN + 30, RIGHT = CW - 64;   // 顶上 6.9 cm 不画横线（胶装封条和标题）
const INK = '#1b2a5a', RED = '#b3402c';
const FONT = (px) => `600 ${px}px Caveat, "Long Cang", "Segoe Print", cursive`;

// 纸：黄色底、几块深浅不一的斑、纸纤维的小点、蓝色横线、红色双竖线、顶上装订处的阴影
function paper(g) {
  const r = rng(7);
  g.fillStyle = '#f2d466'; g.fillRect(0, 0, CW, CH);
  for (let i = 0; i < 46; i++) { const x = r() * CW, y = r() * CH, rr = 80 + r() * 260, gr = g.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, r() < 0.5 ? `rgba(255,244,196,${0.05 + r() * 0.04})` : `rgba(186,146,40,${0.035 + r() * 0.03})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  for (let i = 0; i < 14000; i++) { const l = r() < 0.55; g.fillStyle = l ? `rgba(255,250,222,${0.12 + r() * 0.14})` : `rgba(120,86,18,${0.05 + r() * 0.08})`; g.fillRect(r() * CW, r() * CH, 1 + r() * 2.4, 0.8 + r() * 1.1); }
  for (let y = TOP; y < CH - 6; y += RULE) { g.fillStyle = 'rgba(60,90,128,.42)'; g.fillRect(0, y - 1.1, CW, 2.2); }
  g.fillStyle = 'rgba(204,50,38,.56)'; g.fillRect(MARGIN - 5, 0, 2.3, CH); g.fillRect(MARGIN + 3, 0, 2.3, CH);
  const gt = g.createLinearGradient(0, 0, 0, 50); gt.addColorStop(0, 'rgba(110,70,0,.22)'); gt.addColorStop(1, 'rgba(110,70,0,0)'); g.fillStyle = gt; g.fillRect(0, 0, CW, 50);
  // 生活痕迹：右下角一个咖啡杯底的圈（只印了大半圈）、左下一个油手指印、纸边一点卷皱的阴影
  g.save(); g.strokeStyle = 'rgba(120,70,20,.28)'; g.lineWidth = 7; g.beginPath(); g.arc(810, 1310, 105, 0.4, 5.3); g.stroke();
  g.strokeStyle = 'rgba(120,70,20,.12)'; g.lineWidth = 22; g.beginPath(); g.arc(810, 1310, 96, 0.9, 4.6); g.stroke(); g.restore();
  { const gr = g.createRadialGradient(130, 1290, 0, 130, 1290, 60); gr.addColorStop(0, 'rgba(150,110,40,.22)'); gr.addColorStop(1, 'rgba(150,110,40,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(130, 1290, 45, 60, 0.4, 0, 7); g.fill(); }
}

// 一行手写：不完全水平、不完全在线上；写完再描一遍边，像用力写的圆珠笔
function hand(g, text, x, y, px, { color = INK, alpha = 0.94, align = 'left', seed = text } = {}) {
  const r = rng(hash(seed)); g.save(); g.font = FONT(px); g.fillStyle = g.strokeStyle = color; g.globalAlpha = alpha; g.textAlign = align; g.lineWidth = px * 0.02; g.lineJoin = 'round';
  g.translate(x + (r() - 0.5) * 5, y + (r() - 0.5) * 4); g.rotate((r() - 0.5) * 0.014); g.fillText(text, 0, 0); g.strokeText(text, 0, 0);
  const w = g.measureText(text).width; g.restore(); return w;
}
function stroke(g, pts, { color = RED, w = 3.6, alpha = 0.8 } = {}) { g.save(); g.strokeStyle = color; g.globalAlpha = alpha; g.lineWidth = w; g.lineCap = g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.restore(); }
function line(g, xa, xb, y, o = {}) { const r = rng(o.seed || hash(xa + ',' + y)), n = Math.max(2, Math.round((xb - xa) / 70)), pts = []; for (let i = 0; i <= n; i++) pts.push([xa + (xb - xa) * i / n, y + (r() - 0.5) * 3.6 + (i / n - 0.5) * (o.slope || 0)]); stroke(g, pts, o); }
function ring(g, cx, cy, rx, ry, seed, o = {}) { const r = rng(seed), a0 = -2.3 + r() * 0.5, pts = []; for (let k = 0; k <= 54; k++) { const a = a0 + k / 54 * Math.PI * 2 * 1.1, j = 1 + (r() - 0.5) * 0.035 + k / 54 * 0.08; pts.push([cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]); } stroke(g, pts, { w: 4, alpha: 0.85, ...o }); }
function marker(g, xa, xb, y, h) { const r = rng(hash(xa + ':' + y)); g.save(); g.fillStyle = 'rgba(255,138,70,.5)'; g.beginPath(); g.moveTo(xa + r() * 6, y - h + r() * 5); g.lineTo(xb, y - h - 2 + r() * 5); g.lineTo(xb + 8, y - h * 0.4); g.lineTo(xb - 2, y + h * 0.22 + r() * 4); g.lineTo(xa, y + h * 0.25 - r() * 4); g.closePath(); g.fill(); g.restore(); }
function arrow(g, x, y, s) { stroke(g, [[x, y], [x + s, y - s]], { color: INK, w: 4, alpha: 0.9 }); stroke(g, [[x + s * 0.3, y - s], [x + s, y - s], [x + s, y - s * 0.7]], { color: INK, w: 4, alpha: 0.9 }); }

// 菜单内容（英文，价格跟后墙黑板一致）。每一行可以点：
//   go: 'beef' 之类 → 去冷柜打开这件培养肉（下单、定制）；go: 'tasting' → 去吧台试吃；out → 今天卖完了
//   hi 荧光笔“special”、was 原价划掉改价、circle 编号画圈
export const MENU = {
  title: "Today's Menu", date: 'Sun · Nov 16',
  sections: [
    { head: 'In the fridge · per 200 g', rows: [['Beef steak', '¥168', { go: 'beef' }], ['Pork chop', '¥98', { go: 'pork' }], ['Chicken breast', '¥68', { go: 'chicken' }], ['Yellow croaker', '¥128', { go: 'fish' }]] },
    { head: 'Kitchen', rows: [['Pan-seared steak', '¥58', { go: 'tasting' }], ['Pork chop rice', '¥32', { go: 'tasting', hi: true, was: '¥36' }], ['Chicken salad', '¥28', { go: 'tasting' }], ['Fish soup', '¥18', { out: 'sold out' }], ['Soup of the day', '¥8', { go: 'tasting' }], ['Rice', '¥2', { go: 'tasting' }]] },
  ],
  notes: ['Steak & pork: order 14 days ahead', 'Referrals: ¥30 off first order'],
  sign: '— Zhou',
};

// 写一整页；state.hover 是指针下面那一行（荧光笔涂上），state.current 是刚在冷柜里看过的那件（编号画圈、名字划线）
function ink(g, M, state, regions) {
  regions.length = 0;
  const base = (k) => TOP + k * RULE - 12;                                     // 第 k 行的字落在第 k 条线上
  const tw = hand(g, M.title, LEFT - 6, TOP - 52, 112, { seed: 'title' });
  line(g, LEFT - 12, LEFT + tw + 14, TOP - 30, { seed: 3, slope: -3 }); line(g, LEFT - 2, LEFT + tw - 2, TOP - 17, { seed: 4, w: 3, alpha: 0.6, slope: -2 });
  hand(g, M.date, RIGHT, TOP - 58, 52, { align: 'right', alpha: 0.8, seed: 'date' });
  let k = 1, n = 0;
  for (const sec of M.sections) {
    const w = hand(g, sec.head, LEFT, base(k), 64, { color: RED, alpha: 0.88, seed: 's' + sec.head }); line(g, LEFT - 2, LEFT + w + 4, base(k) + 12, { seed: hash(sec.head), w: 3, alpha: 0.6 }); k++;
    for (const [name, price, f = {}] of sec.rows) {
      const idx = n++; const y = base(k), num = String(n).padStart(2, '0');
      g.font = FONT(70); const nameW = g.measureText(name).width;
      if (f.hi || state.hover === idx) marker(g, LEFT - 16, Math.min(RIGHT + 10, LEFT + nameW + 34), y, 44);
      hand(g, num, MARGIN - 18, y, 58, { align: 'right', alpha: 0.55, seed: 'n' + n });
      const nw = hand(g, name, LEFT, y, 70, { seed: 'r' + name });
      const pw = hand(g, price, RIGHT, y, 62, { align: 'right', alpha: 0.75, seed: 'p' + price + name });
      if (f.go && f.go === state.current) { ring(g, MARGIN - 47, y - 20, 42, 32, hash('ring' + n)); line(g, LEFT - 4, LEFT + nw + 8, y + 11, { seed: hash('u' + n), w: 3.2, alpha: 0.7 }); }
      if (f.out) { line(g, LEFT - 8, LEFT + nw + 10, y - 20, { color: INK, w: 4.4, alpha: 0.85, seed: hash('o' + name), slope: 4 }); line(g, RIGHT - pw - 8, RIGHT + 6, y - 18, { color: INK, w: 4.4, alpha: 0.85, seed: hash('op' + name) }); hand(g, f.out, LEFT + nw + 36, y, 58, { color: RED, alpha: 0.9, seed: 'out' + name }); }
      if (f.was) { const ww = hand(g, f.was, RIGHT - pw - 36, y, 54, { align: 'right', alpha: 0.6, seed: 'was' + name }); line(g, RIGHT - pw - 42 - ww, RIGHT - pw - 30, y - 18, { color: INK, w: 3.6, alpha: 0.8, seed: hash('w' + name) }); }
      if (f.hi) hand(g, 'special!', LEFT + nw + 26, y - 4, 52, { color: RED, alpha: 0.85, seed: 'rec' });
      regions.push({ i: idx, x0: MARGIN - 100, x1: RIGHT + 30, y0: y - RULE + 14, y1: y + 16, go: f.go, out: f.out, name, mx0: LEFT - 16, mx1: Math.min(RIGHT + 10, LEFT + nameW + 34), my0: y - 48, my1: y + 16 });
      k++;
    }
    k++;
  }
  for (const [i, t] of M.notes.entries()) {
    const y = base(k); hand(g, t, LEFT, y, 60, { alpha: 0.88, seed: 'note' + t });
    if (i === 0) arrow(g, LEFT - 70, y - 4, 30);
    if (i === 1) { g.font = FONT(60); const a = t.indexOf('¥'), x = LEFT + g.measureText(t.slice(0, a)).width, w2 = g.measureText('¥30').width; ring(g, x + w2 / 2, y - 18, w2 / 2 + 16, 30, hash('r30')); }
    k++;
  }
  hand(g, M.sign, RIGHT - 20, base(k) + 6, 60, { align: 'right', alpha: 0.7, seed: 'sign' });
}

// 便签本：一摞纸（侧面是一页页的纸边）、顶上一条红棕色的胶装封条、最上面一页写着菜单，右下角微微翘起
export function legalPad() {
  const PW = 0.223, PL = 0.307, PT = 0.011;
  const g = new THREE.Group();
  const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  // 纸只画一次，每次重写字的时候先把纸贴回去（悬停时要反复重画）
  const paperCv = document.createElement('canvas'); paperCv.width = CW; paperCv.height = CH; paper(paperCv.getContext('2d'));
  const state = { hover: -1, current: null }, regions = [];
  const draw = () => { const c = cv.getContext('2d'); c.clearRect(0, 0, CW, CH); c.drawImage(paperCv, 0, 0); ink(c, MENU, { hover: -1, current: state.current }, regions); tex.needsUpdate = true; placeHi(); };
  document.fonts.load(FONT(60), MENU.title + '¥').then(draw).catch(() => {});   // Caveat 到了再写一遍

  const edge = document.createElement('canvas'); edge.width = 8; edge.height = 64;
  { const c = edge.getContext('2d'); for (let y = 0; y < 64; y++) { c.fillStyle = y % 2 ? '#d8bc58' : '#efd77a'; c.fillRect(0, y, 8, 1); } }
  const edgeTex = new THREE.CanvasTexture(edge); edgeTex.colorSpace = THREE.SRGBColorSpace;
  const sideM = new THREE.MeshStandardMaterial({ map: edgeTex, roughness: 0.95 });
  const block = new THREE.Mesh(new THREE.BoxGeometry(PW, PT, PL), sideM); block.position.y = PT / 2; g.add(block);
  // 最上面一页：微微起伏，右下角翘起 8 mm
  const sg = new THREE.PlaneGeometry(PW, PL, 12, 16), p = sg.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const u = Math.max(0, x / (PW / 2) - 0.3) / 0.7, v = Math.max(0, -y / (PL / 2) - 0.45) / 0.55; p.setZ(i, 0.008 * (u * v) ** 1.6 + Math.sin(x * 40 + y * 20) * 0.0004); }
  sg.computeVertexNormals();
  const sheet = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide })); sheet.name = 'menuSheet';
  sheet.rotation.x = -Math.PI / 2; sheet.position.y = PT + 0.0004; g.add(sheet);
  // 指针下那一行的荧光笔：一块贴着纸面起伏的小贴片（正片叠底），移动时只挪它，不重画、不重新上传 1024×1410 的整页贴图
  const hc = document.createElement('canvas'); hc.width = 256; hc.height = 64;
  { const c = hc.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, 256, 64); c.fillStyle = 'rgba(255,138,70,.5)'; c.beginPath(); c.moveTo(3, 6); c.lineTo(250, 3); c.lineTo(256, 38); c.lineTo(249, 60); c.lineTo(0, 58); c.closePath(); c.fill(); }
  const hTex = new THREE.CanvasTexture(hc); hTex.colorSpace = THREE.SRGBColorSpace;
  const hi = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 10, 2), new THREE.MeshBasicMaterial({ map: hTex, transparent: true, premultipliedAlpha: true, blending: THREE.MultiplyBlending, depthWrite: false, toneMapped: false }));
  hi.visible = false; hi.renderOrder = 2; hi.userData.keep = true; sheet.add(hi);
  const zAt = (x, y) => { const u = Math.max(0, x / (PW / 2) - 0.3) / 0.7, v = Math.max(0, -y / (PL / 2) - 0.45) / 0.55; return 0.008 * (u * v) ** 1.6 + Math.sin(x * 40 + y * 20) * 0.0004; };
  function placeHi() {
    const r = regions.find((q) => q.i === state.hover); hi.visible = !!r; if (!r) return;
    const hp = hi.geometry.attributes.position, uv = hi.geometry.attributes.uv;
    for (let i = 0; i < hp.count; i++) { const cx = r.mx0 + (r.mx1 - r.mx0) * uv.getX(i), cy = r.my1 - (r.my1 - r.my0) * uv.getY(i), x = (cx / CW - 0.5) * PW, y = (0.5 - cy / CH) * PL; hp.setXYZ(i, x, y, zAt(x, y) + 0.0005); }
    hp.needsUpdate = true; hi.geometry.computeBoundingSphere();
  }
  draw();
  // 顶上的胶装封条和被撕掉的几页留下的纸茬
  const glue = new THREE.Mesh(new THREE.BoxGeometry(PW + 0.002, 0.004, 0.026), new THREE.MeshStandardMaterial({ color: 0x6a2a22, roughness: 0.6 }));
  glue.position.set(0, PT + 0.001, -PL / 2 + 0.012); g.add(glue);
  const stub = new THREE.MeshStandardMaterial({ color: 0xe8cc68, roughness: 0.95 });
  for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(PW * (0.4 + i * 0.2), 0.0006, 0.006 + i * 0.002), stub); s.position.set(-PW * 0.25 + i * 0.05, PT + 0.0035, -PL / 2 + 0.026 + (0.006 + i * 0.002) / 2); g.add(s); }
  // 交互：uv → 哪一行（像参考网站那样，点一行就是“放进这盘带子”）
  const pick = (uv) => { if (!uv) return null; const x = uv.x * CW, y = (1 - uv.y) * CH; return regions.find((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) || null; };
  const setHover = (i) => { if (state.hover !== i) { state.hover = i; placeHi(); } };
  const setCurrent = (k) => { if (state.current !== k) { state.current = k; draw(); } };
  return { group: g, sheet, redraw: draw, size: [PW, PL], pick, setHover, setCurrent };
}

// 一支用过的铅笔（六棱、黄漆、削过的笔尖、铁箍和磨掉一半的橡皮）
export function pencil() {
  const g = new THREE.Group(), L = 0.15, r = 0.0036;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 6), new THREE.MeshStandardMaterial({ color: 0xd8a62a, roughness: 0.45 })); g.add(body);
  const wood = new THREE.Mesh(new THREE.ConeGeometry(r, 0.018, 6), new THREE.MeshStandardMaterial({ color: 0xd8b888, roughness: 0.8 })); wood.position.y = L / 2 + 0.009; g.add(wood);
  const lead = new THREE.Mesh(new THREE.ConeGeometry(0.0012, 0.005, 8), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.4, metalness: 0.4 })); lead.position.y = L / 2 + 0.0155; g.add(lead);
  const fer = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.05, r * 1.05, 0.012, 12), new THREE.MeshStandardMaterial({ color: 0xb8b0a0, roughness: 0.3, metalness: 0.9 })); fer.position.y = -L / 2 - 0.006; g.add(fer);
  const er = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.98, r * 0.98, 0.006, 12), new THREE.MeshStandardMaterial({ color: 0xd88a8a, roughness: 0.9 })); er.position.y = -L / 2 - 0.015; g.add(er);
  g.rotation.z = Math.PI / 2;                                                   // 躺平：轴线沿 x
  const wrap = new THREE.Group(); body.rotation.y = Math.PI / 6; g.position.y = r * Math.cos(Math.PI / 6); wrap.add(g);   // 六棱有一个面贴着桌面
  return wrap;
}

// ------------------------------------------------------------------ 电子版：冷柜触摸屏上显示同一页手写菜单（店员写好拍下来传到屏上的样子）
// 屏幕 42 × 74 cm：顶上一条状态栏，中间是那页黄色便签，底下一行提示。点一行：培养肉在冷柜里打开下单，堂食去吧台试吃。
export function menuScreen() {
  const SW = 600, SH = 1057, PX = 24, PY = 104, PWd = SW - 48, PHt = Math.round((SW - 48) * CH / CW);
  const cv = document.createElement('canvas'); cv.width = SW; cv.height = SH;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const sheet = document.createElement('canvas'); sheet.width = CW; sheet.height = CH;
  const paperCv = document.createElement('canvas'); paperCv.width = CW; paperCv.height = CH; paper(paperCv.getContext('2d'));
  const state = { hover: -1, current: null }, regions = [];
  const MONO = '"IBM Plex Mono", Consolas, monospace', SANS = '"Inter", "Noto Sans SC", sans-serif';
  const draw = () => {
    const s = sheet.getContext('2d'); s.drawImage(paperCv, 0, 0); ink(s, MENU, state, regions);
    const g = cv.getContext('2d');
    g.fillStyle = '#121315'; g.fillRect(0, 0, SW, SH);
    g.fillStyle = '#d8d4cc'; g.font = `500 22px ${MONO}`; g.textAlign = 'left'; g.fillText('FUTURE MEAT', PX, 46);
    g.fillStyle = '#8a8680'; g.font = `400 18px ${MONO}`; g.textAlign = 'right'; g.fillText('MENU · 11/16  14:32', SW - PX, 46);
    g.fillStyle = '#2a2b2e'; g.fillRect(PX, 66, SW - 2 * PX, 2);
    g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 18; g.drawImage(sheet, PX, PY, PWd, PHt); g.restore();
    const fy = PY + PHt + 52;
    g.fillStyle = '#b3262d'; g.beginPath(); g.arc(PX + 12, fy - 7, 7, 0, 7); g.fill();
    g.fillStyle = '#e4e0d8'; g.font = `500 24px ${SANS}`; g.textAlign = 'left'; g.fillText('Tap a line · cultivated meat at the fridge', PX + 32, fy);
    g.fillStyle = '#7a7670'; g.font = `400 18px ${MONO}`; g.fillText('TAP A LINE TO ORDER', PX + 32, fy + 32);
    for (let y = 0; y < SH; y += 3) { g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(0, y, SW, 1); }   // 液晶屏的细横纹
    tex.needsUpdate = true;
  };
  draw();
  document.fonts.load(FONT(60), MENU.title + '¥').then(draw).catch(() => {});
  const pick = (uv) => { if (!uv) return null; const x = (uv.x * SW - PX) / PWd * CW, y = ((1 - uv.y) * SH - PY) / PHt * CH; return regions.find((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) || null; };
  const setHover = (i) => { if (state.hover !== i) { state.hover = i; draw(); } };
  const setCurrent = (k) => { if (state.current !== k) { state.current = k; draw(); } };
  return { tex, pick, setHover, setCurrent, redraw: draw };
}

// ------------------------------------------------------------------ 冷柜上的触摸屏：正经的点单界面（不再是拍下来的那页便签）
// 上半是四种培养肉的卡片，下半是堂食的单子；行号和纸菜单（legalPad）一一对应，指到哪一行两边一起亮、看过的那件两边一起圈出来
export function menuKiosk() {
  const SW = 600, SH = 1057, P = 26;
  const cv = document.createElement('canvas'); cv.width = SW; cv.height = SH;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const state = { hover: -1, current: null }, regions = [];
  const MONO = '"IBM Plex Mono", Consolas, monospace', SANS = '"Inter", "Helvetica Neue", Arial, sans-serif';
  const LINE = { beef: 'B-0417', pork: 'P-0932', chicken: 'G-0221', fish: 'F-1180' };
  const TONE = { beef: ['#8e2a2a', '#c8505a'], pork: ['#c97a78', '#ecb2a8'], chicken: ['#d9a48c', '#f1d0bc'], fish: ['#d8c2a8', '#f3e6d4'] };
  const rows = MENU.sections.flatMap((s, si) => s.rows.map((r) => ({ si, name: r[0], price: r[1], ...r[2] })));
  const draw = () => {
    const g = cv.getContext('2d'); regions.length = 0;
    g.fillStyle = '#0e1012'; g.fillRect(0, 0, SW, SH);
    g.fillStyle = '#e8e4dc'; g.font = `600 24px ${MONO}`; g.textAlign = 'left'; g.fillText('FUTURE MEAT', P, 50);
    g.fillStyle = '#8a8680'; g.font = `400 18px ${MONO}`; g.textAlign = 'right'; g.fillText(`ORDER · ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`, SW - P, 50);
    g.fillStyle = '#26292c'; g.fillRect(P, 70, SW - 2 * P, 2);
    g.textAlign = 'left'; g.fillStyle = '#b3262d'; g.font = `600 17px ${MONO}`; g.fillText('IN THE FRIDGE · READY TODAY · PER 200 g', P, 112);
    const TW = (SW - 2 * P - 18) / 2, TH = 200;
    rows.filter((r) => r.si === 0).forEach((r, k) => {
      const i = rows.indexOf(r), x = P + (k % 2) * (TW + 18), y = 130 + Math.floor(k / 2) * (TH + 18), hot = state.hover === i, cur = state.current === r.go;
      g.fillStyle = hot ? '#24282c' : '#181b1e'; g.fillRect(x, y, TW, TH);
      if (hot || cur) { g.strokeStyle = cur ? '#d4343c' : '#6c7276'; g.lineWidth = cur ? 4 : 2; g.strokeRect(x + 1, y + 1, TW - 2, TH - 2); }
      const [a, b] = TONE[r.go], gr = g.createLinearGradient(x, y, x + TW, y + 110); gr.addColorStop(0, a); gr.addColorStop(1, b);
      g.fillStyle = gr; g.beginPath(); g.ellipse(x + TW / 2, y + 58, TW * 0.34, 36, -0.08, 0, 7); g.fill();
      g.strokeStyle = 'rgba(255,240,230,.55)'; g.lineWidth = 2; for (let s = 0; s < 5; s++) { g.beginPath(); g.moveTo(x + TW * 0.24 + s * 22, y + 38 + s * 6); g.quadraticCurveTo(x + TW / 2, y + 62 + s * 4, x + TW * 0.78 - s * 12, y + 44 + s * 9); g.stroke(); }
      g.fillStyle = '#f0ece4'; g.font = `600 26px ${SANS}`; g.fillText(r.name, x + 16, y + 130);
      g.fillStyle = '#8f949a'; g.font = `400 15px ${MONO}`; g.fillText(`CELL LINE ${LINE[r.go]}`, x + 16, y + 154);
      g.fillStyle = '#e0474e'; g.font = `600 30px ${SANS}`; g.fillText(r.price, x + 16, y + 188);
      if (cur) { g.fillStyle = '#d4343c'; g.font = `600 14px ${MONO}`; g.textAlign = 'right'; g.fillText('VIEWED', x + TW - 14, y + 26); g.textAlign = 'left'; }
      regions.push({ i, x0: x, x1: x + TW, y0: y, y1: y + TH, go: r.go, name: r.name });
    });
    // 另一种买法：不拿现成的，从细胞系开始为你长一份（可定制）
    { const y0 = 130 + 2 * (TH + 18) - 4, hot = state.hover === 100;
      g.fillStyle = hot ? '#c22f36' : '#9e2229'; g.fillRect(P, y0, SW - 2 * P, 66);
      g.fillStyle = '#fff'; g.font = `600 24px ${SANS}`; g.fillText('GROW YOUR OWN  ›', P + 18, y0 + 30);
      g.fillStyle = 'rgba(255,255,255,.75)'; g.font = `400 14px ${MONO}`; g.fillText('choose fat · texture · colour — ready in 14–28 days', P + 18, y0 + 52);
      regions.push({ i: 100, x0: P, x1: SW - P, y0, y1: y0 + 66, go: 'grow', name: 'Grow your own' }); }
    let y = 130 + 2 * (TH + 18) + 98;
    g.fillStyle = '#b3262d'; g.font = `600 17px ${MONO}`; g.fillText('KITCHEN', P, y); y += 18;
    for (const r of rows.filter((q) => q.si === 1)) {
      const i = rows.indexOf(r), hot = state.hover === i && !r.out, RH = 50;
      if (hot) { g.fillStyle = '#24282c'; g.fillRect(P - 8, y, SW - 2 * P + 16, RH); }
      g.fillStyle = r.out ? '#5a5e62' : '#e8e4dc'; g.font = `500 24px ${SANS}`; g.fillText(r.name, P, y + 34);
      g.textAlign = 'right'; g.fillStyle = r.out ? '#5a5e62' : '#e8e4dc'; g.fillText(r.price, SW - P, y + 34);
      if (r.was) { g.fillStyle = '#6a6e72'; g.font = `400 18px ${SANS}`; const w = g.measureText(r.was).width; g.fillText(r.was, SW - P - 72, y + 33); g.fillRect(SW - P - 72 - w, y + 27, w, 2); }
      g.textAlign = 'left';
      if (r.hi) { g.font = `500 24px ${SANS}`; const w = g.measureText(r.name).width; g.fillStyle = '#d4343c'; g.font = `600 13px ${MONO}`; g.fillText('SPECIAL', P + w + 14, y + 32); }
      if (r.out) { g.font = `500 24px ${SANS}`; const w = g.measureText(r.name).width; g.fillStyle = '#5a5e62'; g.fillRect(P, y + 26, w, 2); g.font = `600 13px ${MONO}`; g.fillText('SOLD OUT', P + w + 14, y + 32); }
      g.fillStyle = '#1e2124'; g.fillRect(P, y + RH, SW - 2 * P, 1);
      regions.push({ i, x0: P - 8, x1: SW - P + 8, y0: y, y1: y + RH, go: r.go, out: r.out, name: r.name });
      y += RH;
    }
    g.fillStyle = '#5c6064'; g.font = `400 16px ${MONO}`; g.fillText('TAP TO ORDER', P, SH - 30);
    for (let yy = 0; yy < SH; yy += 3) { g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(0, yy, SW, 1); }   // 液晶的细横纹
    tex.needsUpdate = true;
  };
  draw();
  document.fonts.ready.then(draw).catch(() => {});
  const pick = (uv) => { if (!uv) return null; const x = uv.x * SW, y = (1 - uv.y) * SH; return regions.find((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) || null; };
  const setHover = (i) => { if (state.hover !== i) { state.hover = i; draw(); } };
  const setCurrent = (k) => { if (state.current !== k) { state.current = k; draw(); } };
  return { tex, pick, setHover, setCurrent, redraw: draw };
}
