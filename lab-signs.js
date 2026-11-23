// 参观廊右墙一侧：品牌展板、参观须知、宣传册架、提问终端。
//   须知：鼠标指到哪一条，那一条旁边就画出对应的禁止标志（红杠一笔划过去），时钟那条指针转一圈；点一下标志会“盖章”一样弹一下。
//   终端：屏幕就是界面——指到问题那一行会亮，点了就在屏幕上逐字打出回答；也可以直接打字问（隐藏的输入框，中文输入法也能用）。
//   屏幕前面是一层旧玻璃：划痕、指纹，只叠加反光（不挡屏幕的光）。
import * as THREE from 'three';
import { canvasTexture } from './textures.js';
import { pbr, decal, decalMat } from './assets.js';
import { ageCanvas } from './materials.js';
import { ASK, ASK_FALLBACK, ASK_ANIMAL, ASK_DONOR } from './data.js';

const MONO = '"IBM Plex Mono", Consolas, monospace', SANS = '"Inter", "Helvetica Neue", Arial, sans-serif';
const GREEN = '#b8ff6a';
let sd = 3;
const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;

// ------------------------------------------------------------------ 品牌展板（泡沫板，四角钉在墙上）
function poster(root) {
  const tex = canvasTexture(1200, 550, (g, W, H) => {
    g.fillStyle = '#efece4'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#b3262d'; g.fillRect(0, 0, W, H * 0.06);
    g.fillStyle = '#8a8580'; g.font = `500 22px ${MONO}`; g.fillText("FUTURE MEAT MARKET · PROCESSING HALL · MEMBERS' VIEWING", W * 0.06, H * 0.16);
    g.fillStyle = '#141414'; g.font = `300 112px ${SANS}`; g.fillText('SEE IT GROW.', W * 0.06, H * 0.5);
    g.font = `400 46px ${SANS}`; g.fillText('Seeing is believing.', W * 0.06, H * 0.71);
    g.fillStyle = '#6b6762'; g.font = `400 24px ${SANS}`; g.fillText('Every order grows right here, behind this glass.', W * 0.06, H * 0.85);
    ageCanvas(g, W, H, { amount: 0.8, seed: 12 });
  });
  const board = new THREE.Group(); board.position.set(4.985, 1.95, 0.6); board.rotation.y = -Math.PI / 2; root.add(board);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }));
  face.position.z = 0.006; board.add(face);
  board.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 0.01), new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.8 })), {}));
  const screw = new THREE.MeshStandardMaterial({ color: 0x9a9a92, metalness: 0.9, roughness: 0.4 });
  for (const [x, y] of [[-1.17, 0.52], [1.17, 0.52], [-1.17, -0.52], [1.17, -0.52]]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.006, 10), screw); s.rotation.x = Math.PI / 2; s.position.set(x, y, 0.011); board.add(s); }
  decal('Fingerprints008', board, { pos: [0.9, -0.42, 0.0075], w: 0.5, h: 0.3, color: 0x3a3630, opacity: 0.45 });
}

// ------------------------------------------------------------------ 参观须知：纸贴在墙上，指到哪条，哪条旁边亮出标志
const RULES = [
  { lines: ['No photos or video'], icon: 'camera' },
  { lines: ['Do not tap the glass'], icon: 'hand' },
  { lines: ['Staff cannot discuss', 'process or cell origin'], icon: 'talk' },
  { lines: ['Visits last about', '15 minutes'], icon: 'clock' },
];
const NW = 500, NH = 700;
const ROW_Y = [250, 340, 430, 545];
function drawIcon(g, kind, x, y, s, k, spin) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.lineWidth = 3; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#1b1b1b';
  g.beginPath(); g.arc(0, 0, 30, 0, 7); g.stroke();
  if (kind === 'camera') { g.strokeRect(-16, -9, 32, 21); g.beginPath(); g.arc(0, 1, 7, 0, 7); g.stroke(); g.beginPath(); g.moveTo(-7, -9); g.lineTo(-4, -14); g.lineTo(4, -14); g.lineTo(7, -9); g.stroke(); }
  if (kind === 'hand') { g.beginPath(); g.moveTo(-9, 14); g.lineTo(-9, -6); g.moveTo(-3, 10); g.lineTo(-3, -14); g.moveTo(3, 10); g.lineTo(3, -12); g.moveTo(9, 12); g.lineTo(9, -6); g.moveTo(-9, 14); g.quadraticCurveTo(0, 22, 9, 12); g.moveTo(-9, 4); g.lineTo(-16, -3); g.stroke(); }
  if (kind === 'talk') { g.beginPath(); g.moveTo(-17, -12); g.lineTo(17, -12); g.lineTo(17, 8); g.lineTo(-2, 8); g.lineTo(-10, 16); g.lineTo(-10, 8); g.lineTo(-17, 8); g.closePath(); g.stroke(); g.font = `700 16px ${SANS}`; g.fillStyle = '#1b1b1b'; g.textAlign = 'center'; g.fillText('?', 0, 4); }
  if (kind === 'clock') { g.beginPath(); g.arc(0, 0, 18, 0, 7); g.stroke(); g.save(); g.rotate(spin); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -12); g.stroke(); g.restore(); g.beginPath(); g.moveTo(0, 0); g.lineTo(8, 0); g.stroke(); }
  if (kind !== 'clock') {                                                    // 红杠：随 k 从左上一笔划到右下
    g.strokeStyle = '#c4262e'; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 30, 0, 7); g.globalAlpha = Math.min(1, k * 1.5); g.stroke();
    g.beginPath(); g.moveTo(-21, -21); g.lineTo(-21 + 42 * k, -21 + 42 * k); g.stroke(); g.globalAlpha = 1;
  }
  g.restore();
}
function createNotice(root) {
  const tex = canvasTexture(NW, NH, () => {});
  const g = tex.userData.ctx;
  const base = document.createElement('canvas'); base.width = NW; base.height = NH;
  const b = base.getContext('2d');
  b.fillStyle = '#f1eee6'; b.fillRect(0, 0, NW, NH); b.fillStyle = '#141414'; b.fillRect(0, 0, NW, 26);
  b.fillStyle = '#141414'; b.font = `600 50px ${SANS}`; b.fillText('VISITOR', 34, 100); b.fillText('NOTICE', 34, 152);
  b.fillStyle = '#8a8580'; b.font = `500 17px ${MONO}`; b.fillText('PROCESSING HALL · PLEASE READ', 36, 186);
  b.strokeStyle = '#141414'; b.lineWidth = 2; b.beginPath(); b.moveTo(34, 206); b.lineTo(NW - 34, 206); b.stroke();
  b.fillStyle = '#8a8580'; b.font = `400 15px ${MONO}`; b.fillText('Thank you for growing with us.', 36, NH - 40);
  ageCanvas(b, NW, NH, { amount: 0.7, seed: 5 });
  const st = RULES.map(() => ({ k: 0, to: 0, kick: 0, spin: 0 }));
  let dirty = true;
  function draw() {
    g.drawImage(base, 0, 0);
    RULES.forEach((r, i) => {
      const s = st[i], y = ROW_Y[i];
      if (s.k > 0.01) { g.fillStyle = `rgba(246,214,72,${0.55 * s.k})`; g.fillRect(28, y - 34, (NW - 150) * s.k, 32 + (r.lines.length - 1) * 34); }   // 荧光笔涂过去
      g.fillStyle = '#141414'; g.font = `600 24px ${MONO}`; g.fillText(String(i + 1), 36, y - 8);
      g.fillStyle = '#2a2a2a'; g.font = `400 26px ${SANS}`; r.lines.forEach((l, j) => g.fillText(l, 72, y - 8 + j * 34));
      if (s.k > 0.01) drawIcon(g, r.icon, NW - 66, y - 18 + (r.lines.length - 1) * 17, 0.6 + 0.4 * s.k + s.kick * 0.25, s.k, s.spin);
    });
    tex.needsUpdate = true;
  }
  const paper = pbr('Paper004', 0.5, 0.7, { size: 0.5 });
  const geo = new THREE.PlaneGeometry(0.5, 0.7, 8, 10), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getY(i) * 9 + 1) * 0.0018 + Math.max(0, Math.abs(p.getX(i)) - 0.2) * 0.02 * (p.getY(i) < 0 ? 1 : 0.4));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, normalMap: paper.normalMap, roughness: 0.82 }));
  mesh.position.set(4.99, 1.45, 2.45); mesh.rotation.y = -Math.PI / 2; root.add(mesh);
  const tape = pbr('Tape001', 1, 1, { size: 1, roughness: 0.6, color: 0xe8e2c8 }); tape.transparent = true;
  for (const [x, y, a] of [[-0.24, 0.34, 0.7], [0.24, 0.34, -0.6], [-0.24, -0.34, -0.7], [0.24, -0.34, 0.5]]) {
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.026), tape); t.position.set(x, y, 0.003); t.rotation.z = a; mesh.add(t);
  }
  const rowAt = (uv) => { if (!uv) return -1; const y = (1 - uv.y) * NH; return ROW_Y.findIndex((ry, i) => y > ry - 52 && y < ry + 4 + (RULES[i].lines.length - 1) * 34); };
  let hoverRow = -1;
  return {
    mesh,
    hover(uv) { hoverRow = rowAt(uv); st.forEach((s, i) => { s.to = i === hoverRow ? 1 : 0; }); return hoverRow >= 0; },
    click(uv) { const i = rowAt(uv); if (i < 0) return false; st[i].to = 1; st[i].kick = 1; if (RULES[i].icon === 'clock') st[i].spin += Math.PI * 2; return true; },
    leave() { hoverRow = -1; st.forEach((s) => { s.to = 0; }); },
    tick(dt) {
      for (const s of st) {
        const k0 = s.k, kick0 = s.kick;
        s.k += (s.to - s.k) * Math.min(1, dt * 9);
        s.kick *= Math.exp(-dt * 7);
        if (s.to && RULES[st.indexOf(s)].icon === 'clock') s.spin += dt * 1.6;
        if (Math.abs(s.k - k0) > 0.002 || Math.abs(s.kick - kick0) > 0.002 || (s.to && s.spin)) dirty = true;
      }
      if (dirty) { draw(); dirty = false; }
    },
  };
}

// ------------------------------------------------------------------ 宣传册架：深灰喷塑铁板 + 六个亚克力插袋，有的空了
function brochureRack(root) {
  const rack = new THREE.Group(); rack.position.set(4.83, 0, 1.5); rack.rotation.y = -Math.PI / 2; root.add(rack);
  const paint = pbr('PaintedMetal008', 0.55, 1.3, { size: 0.6, color: 0x3b3f42, metalness: 0.4, roughness: 1 });
  const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); rack.add(o); return o; };
  box(0.5, 1.22, 0.018, paint, 0, 0.66, -0.12);
  box(0.46, 0.025, 0.3, paint, 0, 0.0125, -0.02);
  box(0.04, 0.06, 0.04, paint, 0, 0.055, -0.12);
  const acrylic = new THREE.MeshStandardMaterial({ color: 0xeef4f2, transparent: true, opacity: 0.2, roughness: 0.06, depthWrite: false });
  const cover = canvasTexture(240, 320, (g, W, H) => {
    g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, W, H); g.fillStyle = '#b3262d'; g.fillRect(0, 0, W, 14);
    g.fillStyle = '#141414'; g.font = `300 42px ${SANS}`; g.fillText('SEE IT', 16, 90); g.fillText('GROW.', 16, 136);
    g.font = `400 14px ${SANS}`; g.fillStyle = '#6b6762'; g.fillText("A visitor's guide to", 16, 176); g.fillText('cultivated meat', 16, 194);
    g.fillStyle = '#b3262d'; g.font = `600 13px ${MONO}`; g.fillText('TAKE ONE · FREE', 16, H - 22);
    ageCanvas(g, W, H, { amount: 0.6, seed: 8 });
  });
  const pamph = new THREE.MeshStandardMaterial({ map: cover, roughness: 0.7 });
  const fill = [3, 2, 0, 1, 2, 3];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
    const x = c ? 0.12 : -0.12, y = 0.3 + r * 0.33, i = r * 2 + c;
    const front = box(0.22, 0.15, 0.004, acrylic, x, y + 0.075, -0.06); front.rotation.x = -0.08; front.renderOrder = 4;
    box(0.22, 0.004, 0.06, acrylic, x, y, -0.09).renderOrder = 4;
    for (let k = 0; k < fill[i]; k++) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.26), pamph);
      b.position.set(x + (k - 1) * 0.004, y + 0.13, -0.105 + k * 0.012); b.rotation.x = -0.12 - k * 0.04; b.rotation.z = (k - 1) * 0.02; rack.add(b);
    }
  }
  decal('Scratches001', rack, { pos: [0, 0.4, -0.11], w: 0.5, h: 0.6, color: 0x9a9890, opacity: 0.5 });
}

// ------------------------------------------------------------------ 提问终端
const SW = 1000, SH = 700;
function createKiosk(root) {
  const kiosk = new THREE.Group(); kiosk.position.set(3.9, 0, 0.35); kiosk.rotation.y = -0.5; root.add(kiosk);
  const paint = pbr('PaintedMetal006', 0.4, 1.2, { size: 0.5, color: 0x6f7472, metalness: 0.3, roughness: 1 });
  const dark = pbr('PaintedMetal008', 0.5, 0.4, { size: 0.5, color: 0x2b2e30, metalness: 0.3, roughness: 1 });
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); kiosk.add(o); return o; };
  add(new THREE.BoxGeometry(0.44, 0.025, 0.38), dark, 0, 0.0125, 0);
  add(new THREE.BoxGeometry(0.3, 0.9, 0.2), paint, 0, 0.475, -0.02);
  add(new THREE.BoxGeometry(0.34, 0.04, 0.26), dark, 0, 0.94, -0.02);
  decal('Scratches003', kiosk, { pos: [0, 0.3, 0.081], w: 0.3, h: 0.5, color: 0x2a2a28, opacity: 0.7 });
  decal('SurfaceImperfections015', kiosk, { pos: [0, 0.55, 0.0805], w: 0.3, h: 0.8, color: 0x3a3a34, opacity: 0.6 });
  const head = new THREE.Group(); head.position.set(0, 1.18, 0.02); head.rotation.x = -0.35; kiosk.add(head);
  const hbox = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.35, 0.07), dark); head.add(hbox);
  const neck = add(new THREE.BoxGeometry(0.08, 0.2, 0.06), dark, 0, 1.02, -0.02); neck.rotation.x = -0.15;
  // 屏幕：画布就是界面
  const tex = canvasTexture(SW, SH, () => {});
  const screenMat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(0.82, 0.82, 0.82) });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.28), screenMat); screen.position.z = 0.0355; head.add(screen);
  // 旧玻璃：只把环境反光叠上去（加法混合，黑的地方不挡屏幕），粗糙度用划痕图——划过的地方反光是花的
  const scratch = decalMat('Scratches001', { color: 0xdfe6e2, opacity: 0.85, roughness: 0.4 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.08, metalness: 1, envMapIntensity: 1.6, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.43, 0.31), glassMat); glass.position.z = 0.0365; glass.renderOrder = 6; head.add(glass);
  for (const [m, z, o] of [[scratch, 0.037, 0.0], [decalMat('Fingerprints003', { color: 0xc8ccc8, opacity: 0.55, roughness: 0.6 }), 0.0372, 0.03]]) {
    const ov = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3), m); ov.position.set(o, -o, z); ov.renderOrder = 7; head.add(ov);
  }
  // 玻璃上斜着一道走廊灯的反光、边角一圈灰
  const glare = canvasTexture(512, 360, (c, W, H) => {
    c.clearRect(0, 0, W, H);
    const gr = c.createLinearGradient(0, 0, W, H); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.34, 'rgba(255,255,255,0)'); gr.addColorStop(0.4, 'rgba(230,240,236,.16)'); gr.addColorStop(0.47, 'rgba(230,240,236,.05)'); gr.addColorStop(0.55, 'rgba(255,255,255,0)'); gr.addColorStop(0.8, 'rgba(255,255,255,0)'); gr.addColorStop(0.86, 'rgba(230,240,236,.07)'); gr.addColorStop(0.9, 'rgba(255,255,255,0)');
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    const v = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.62); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(160,150,130,.12)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
  });
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3), new THREE.MeshBasicMaterial({ map: glare, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  gl.position.z = 0.0375; gl.renderOrder = 8; head.add(gl);
  // 屏幕下沿的小牌子、侧面一条蹭掉的漆、后面一根垂到地上的电源线
  const plate = canvasTexture(256, 40, (g, W, H) => { g.fillStyle = '#c9c5bc'; g.fillRect(0, 0, W, H); g.fillStyle = '#2b2e30'; g.font = `600 20px ${MONO}`; g.fillText('ASK-02 · VISITOR TERMINAL', 10, 27); ageCanvas(g, W, H, { amount: 1, seed: 4 }); });
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.025), new THREE.MeshStandardMaterial({ map: plate, metalness: 0.5, roughness: 0.5 })); pl.position.set(0, -0.158, 0.0352); head.add(pl);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, 1.05, -0.06], [0.02, 0.8, -0.14], [0.05, 0.12, -0.15], [0.1, 0.01, -0.3], [0.5, 0.008, -0.55]].map((q) => new THREE.Vector3(...q))), 40, 0.004, 6), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.6 }));
  kiosk.add(cable);

  // 界面状态
  const S = { focus: false, hover: -1, chat: [], typing: null, input: '', caret: 0, t: 0 };
  const field = document.createElement('input');
  Object.assign(field, { maxLength: 60, autocomplete: 'off', spellcheck: false });
  field.setAttribute('aria-label', 'Ask a question');
  Object.assign(field.style, { position: 'fixed', left: '-9999px', top: '0', opacity: '0' });
  document.body.appendChild(field);
  field.addEventListener('input', () => { S.input = field.value; draw(); });
  field.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); submit(field.value); } if (e.key === 'Escape') field.blur(); e.stopPropagation(); });
  const g = tex.userData.ctx;
  const QY = 150, QH = 56;
  function wrap(text, x, y, w, lh, font, color) {
    g.font = font; g.fillStyle = color; let line = '', n = 0;
    for (const word of text.split(/(\s+)/)) { const t = line + word; if (g.measureText(t).width > w && line) { g.fillText(line.trim(), x, y + n * lh); n++; line = word.trimStart(); } else line = t; }
    g.fillText(line.trim(), x, y + n * lh); return n + 1;
  }
  function draw() {
    g.fillStyle = '#0b100d'; g.fillRect(0, 0, SW, SH);
    g.fillStyle = 'rgba(184,255,106,.05)'; for (let y = 0; y < SH; y += 4) g.fillRect(0, y, SW, 1);
    g.font = `500 24px ${MONO}`; g.fillStyle = GREEN; g.fillText('ASK US · FUTURE MEAT MARKET', 36, 52);
    g.textAlign = 'right'; g.fillStyle = '#8fa592'; g.fillText(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), SW - 36, 52); g.textAlign = 'left';
    g.fillStyle = 'rgba(184,255,106,.3)'; g.fillRect(36, 72, SW - 72, 2);
    if (!S.focus && !S.chat.length) {
      g.textAlign = 'center'; g.fillStyle = '#f2f5f2'; g.font = `300 96px ${SANS}`; g.fillText('ANY', SW / 2, 300); g.fillText('QUESTIONS?', SW / 2, 410);
      g.fillStyle = GREEN; g.font = `500 30px ${MONO}`; g.fillText('ASK US ANYTHING' + (Math.floor(S.t * 2) % 2 ? '_' : ' '), SW / 2, 500); g.textAlign = 'left';
      tex.needsUpdate = true; return;
    }
    ASK.forEach(([q], i) => {
      const y = QY + i * QH;
      if (i === S.hover) { g.fillStyle = 'rgba(184,255,106,.16)'; g.fillRect(28, y - 38, SW / 2 - 40, QH - 6); }
      g.fillStyle = i === S.hover ? GREEN : '#dfe8e0'; g.font = `400 25px ${SANS}`; g.fillText('›  ' + q, 40, y);
    });
    // 右半边：对话
    let y = 130; const x = SW / 2 + 30, w = SW / 2 - 70;
    for (const m of S.chat.slice(-3)) {
      const shown = m.who === 'bot' && m === S.typing ? m.text.slice(0, Math.floor(m.n)) : m.text;
      g.fillStyle = m.who === 'me' ? '#8fa592' : '#f2f5f2';
      y += wrap((m.who === 'me' ? '> ' : '') + shown, x, y, w, 32, `${m.who === 'me' ? 400 : 400} 25px ${m.who === 'me' ? MONO : SANS}`, m.who === 'me' ? '#8fa592' : '#f2f5f2') * 32 + 16;
      if (m.fine && shown.length >= m.text.length) { y += wrap(m.fine, x, y - 6, w, 24, `400 18px ${MONO}`, '#6f8574') * 24 + 10; }
    }
    // 底下一行输入
    g.fillStyle = 'rgba(184,255,106,.3)'; g.fillRect(36, SH - 92, SW - 72, 2);
    g.font = `400 26px ${MONO}`;
    const caret = document.activeElement === field && Math.floor(S.t * 2) % 2 ? '▍' : ' ';
    if (S.input) { g.fillStyle = '#f2f5f2'; g.fillText('> ' + S.input + caret, 40, SH - 44); }
    else { g.fillStyle = '#56615a'; g.fillText('> Type a question…' + caret, 40, SH - 44); }
    tex.needsUpdate = true;
  }
  function answer(q) {
    const preset = ASK.find(([k]) => k.toLowerCase() === q.trim().toLowerCase());
    if (preset) return [preset[1], preset[2]];
    return [ASK_ANIMAL.test(q) ? ASK_DONOR : ASK_FALLBACK];
  }
  function submit(q) {
    q = q.trim(); if (!q) return;
    field.value = ''; S.input = '';
    const [a, fine] = answer(q);
    S.chat.push({ who: 'me', text: q });
    const bot = { who: 'bot', text: a, n: 0, fine }; S.chat.push(bot); S.typing = bot;
    draw();
  }
  const rowAt = (uv) => { if (!uv) return -1; const x = uv.x * SW, y = (1 - uv.y) * SH; if (x > SW / 2) return -1; const i = Math.floor((y - QY + 38) / QH); return i >= 0 && i < ASK.length ? i : -1; };
  const onInput = (uv) => uv && (1 - uv.y) * SH > SH - 100;
  draw();
  let lastDraw = 0;
  return {
    group: kiosk, screen, pick: [screen, glass, hbox],
    focus(on) { S.focus = on; S.hover = -1; if (on) setTimeout(() => field.focus({ preventScroll: true }), 50); else field.blur(); draw(); },
    hover(uv) { const i = S.focus ? rowAt(uv) : -1; if (i !== S.hover) { S.hover = i; draw(); } return i >= 0 || (S.focus && onInput(uv)); },
    click(uv) { if (!S.focus) return false; const i = rowAt(uv); if (i >= 0) { submit(ASK[i][0]); return true; } field.focus({ preventScroll: true }); return true; },
    tick(dt) {
      S.t += dt;
      if (S.typing) { S.typing.n += dt * 38; if (S.typing.n >= S.typing.text.length) S.typing = null; draw(); return; }
      if (S.t - lastDraw > 0.5) { lastDraw = S.t; draw(); }                   // 光标闪、钟走
    },
  };
}

// 屏幕前的一层旧玻璃：斜着的一道反光 + 划痕 + 指纹（叠加，不挡屏幕的光）
export function screenGlass(parent, w, h, { x = 0, y = 0, z = 0, ry = 0, seed = 1 } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  const glare = canvasTexture(512, Math.round(512 * h / w), (c, W, H) => {
    const gr = c.createLinearGradient(0, 0, W, H); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.3, 'rgba(255,255,255,0)'); gr.addColorStop(0.36, 'rgba(230,240,236,.1)'); gr.addColorStop(0.44, 'rgba(230,240,236,.03)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)');
    c.clearRect(0, 0, W, H); c.fillStyle = gr; c.fillRect(0, 0, W, H);
  });
  const add = (m, dz, o) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(o, -o * 0.5, dz); p.renderOrder = 8; g.add(p); };
  add(new THREE.MeshBasicMaterial({ map: glare, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), 0.003, 0);
  add(decalMat('Scratches003', { color: 0xc8d0cc, opacity: 0.45, roughness: 0.4 }), 0.0025, 0.1 * seed);
  add(decalMat('Fingerprints002', { color: 0xb8bcb8, opacity: 0.35, roughness: 0.6 }), 0.0028, -0.05 * seed);
  return g;
}

export function createSigns(root) {
  poster(root);
  brochureRack(root);
  return { notice: createNotice(root), kiosk: createKiosk(root) };
}
