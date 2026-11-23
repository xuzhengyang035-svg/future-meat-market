// 玻璃前那排台子上的另外两台培养罐：每种动物的设备、罐子大小、里面的结构、肉的样子都不一样。
//   BR-01 鸡：细高的夹套玻璃柱（填充床），铁架台夹着；柱里一层层多孔筛板，每层挂着几小团浅色的肉；旁边一台蠕动泵在转，泵顶上是培养液瓶。
//   BR-03 猪：矮胖的夹套罐，下半截包着不锈钢水套，坐在磁力搅拌器上；罐里一个不锈钢丝架托着一整块带肥膘的肉，液面一层浮油；
//             PTFE 盖子上插着取样针筒，两根黑胶管接到旁边的温控器（37.1 °C）。
//   都用旧了：液面上方一圈干掉的培养液往下挂、外壁的指纹、台面上洇开的印子、胶带手写标签。
import * as THREE from 'three';
import { canvasTexture } from './textures.js';
import { meatGeometry, meatMaterial } from './meat.js';
import { decal, decalMat } from './assets.js';
import { tapeLabel, grimeMap } from './materials.js';

const MONO = '"IBM Plex Mono", Consolas, monospace';
let sd = 9;
const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;

const perfAlpha = () => { const t = canvasTexture(128, 128, (g, W) => { g.fillStyle = '#fff'; g.fillRect(0, 0, W, W); g.fillStyle = '#000'; for (let y = 6; y < W; y += 12) for (let x = (y / 12) % 2 ? 6 : 12; x < W; x += 12) { g.beginPath(); g.arc(x, y, 3.6, 0, 7); g.fill(); } }, { repeat: [3, 3] }); t.colorSpace = THREE.NoColorSpace; return t; };
// 液面上方干掉的一圈：上沿不齐，往下挂几道
const crustTex = (col, seed) => {
  const t = canvasTexture(1024, 96, (g, W, H) => {
    sd = seed; g.clearRect(0, 0, W, H);
    for (let x = 0; x < W; x += 4) { const top = 20 + R() * 10 + Math.sin(x * 0.02) * 4, bot = 46 + R() * 8; g.fillStyle = `rgba(${col},${0.35 + R() * 0.25})`; g.fillRect(x, top, 4, bot - top); }
    for (let i = 0; i < 26; i++) { const x = R() * W, len = 10 + R() * 40; const gr = g.createLinearGradient(0, 50, 0, 50 + len); gr.addColorStop(0, `rgba(${col},.5)`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(x, 48, 2 + R() * 3, len); }
    g.fillStyle = 'rgba(255,255,255,.25)'; for (let x = 0; x < W; x += 3) if (R() < 0.3) g.fillRect(x, 26 + R() * 18, 2, 2);
  });
  t.wrapS = THREE.RepeatWrapping; return t;
};
// 一台罐子都会有的旧痕迹
export function wearVessel(g, r, y, h, col, seed) {
  const band = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.05, 48, 1, true), new THREE.MeshStandardMaterial({ map: crustTex(col, seed), transparent: true, depthWrite: false, roughness: 0.8, side: THREE.DoubleSide }));
  band.position.y = y; band.renderOrder = 3; g.add(band);
  const fp = decalMat('Fingerprints002', { color: 0xffffff, opacity: 0.32, roughness: 0.5 }).clone(); fp.side = THREE.DoubleSide;
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.004, r + 0.004, h, 48, 1, true, -1.3, 2.6), fp);
  sleeve.position.y = y - h / 2; sleeve.renderOrder = 4; g.add(sleeve);
}
export function benchStain(parent, x, y, z, w, seed) { decal('Smear005', parent, { pos: [x, y, z], rot: [-Math.PI / 2, 0, seed], w, h: w, color: 0x4a221c, opacity: 0.4 }); }

const cyl = (rt, rb, h, m, x, y, z, p, seg = 32, open = false) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), m); o.position.set(x, y, z); p.add(o); return o; };
const box = (w, h, d, m, x, y, z, p) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); p.add(o); return o; };
const tube = (pts, r, m, p) => { const o = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q))), 40, r, 8), m); p.add(o); return o; };
const tag = (lines, w, h, x, y, z, ry, p) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tapeLabel(lines), roughness: 0.8 })); o.position.set(x, y, z); o.rotation.set(0, ry, 0.04); o.renderOrder = 5; p.add(o); return o; };
const lcd = (lines, color = '#b8ff6a', bg = '#071009') => canvasTexture(256, 150, (g, W, H) => { g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = color; g.font = `500 34px ${MONO}`; lines.forEach((l, i) => g.fillText(l, 16, 48 + i * 48)); });

// ------------------------------------------------------------------ BR-01 鸡：夹套填充床柱 + 蠕动泵
export function columnVessel(parent, x, z, M, chickenMat) {
  const g = new THREE.Group(); g.position.set(x, 0.936, z); parent.add(g);
  box(0.18, 0.014, 0.24, M.frame, 0, 0.007, -0.03, g);
  cyl(0.0065, 0.0065, 0.74, M.steel, -0.06, 0.384, -0.11, g, 12);
  for (let k = 0; k < 3; k++) { const a = k * 2.09 + 0.4; cyl(0.004, 0.004, 0.072, M.steelDark, Math.cos(a) * 0.05, 0.05, Math.sin(a) * 0.05, g, 8); }
  cyl(0.072, 0.072, 0.03, M.steel, 0, 0.099, 0, g, 40); cyl(0.072, 0.072, 0.03, M.steel, 0, 0.609, 0, g, 40);
  for (const [px, pz] of [[0.025, 0], [-0.02, 0.02]]) cyl(0.006, 0.006, 0.035, M.steelDark, px, 0.64, pz, g, 10);
  const inner = cyl(0.062, 0.062, 0.48, M.vesselGlass, 0, 0.354, 0, g, 40, true); inner.renderOrder = 3;
  const jacket = cyl(0.079, 0.079, 0.42, M.vesselGlass, 0, 0.354, 0, g, 40, true); jacket.renderOrder = 3;
  cyl(0.081, 0.081, 0.012, M.steelDark, 0, 0.145, 0, g, 40); cyl(0.081, 0.081, 0.012, M.steelDark, 0, 0.563, 0, g, 40);
  for (const y of [0.22, 0.5]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.084, 0.006, 6, 32), M.steelDark); ring.rotation.x = Math.PI / 2; ring.position.y = y; g.add(ring);
    const arm = box(0.05, 0.014, 0.014, M.steelDark, -0.04, y, -0.083, g); arm.rotation.y = Math.atan2(0.11, 0.06) - Math.PI / 2;
    cyl(0.012, 0.012, 0.03, M.frame, -0.06, y, -0.11, g, 10);
  }
  const medium = cyl(0.058, 0.058, 0.44, new THREE.MeshPhysicalMaterial({ color: 0xf0c08a, roughness: 0.12, transparent: true, opacity: 0.42, depthWrite: false }), 0, 0.345, 0, g, 40); medium.renderOrder = 2;
  const perf = new THREE.MeshStandardMaterial({ color: 0xc7cbc6, metalness: 0.9, roughness: 0.4, alphaMap: perfAlpha(), alphaTest: 0.5, side: THREE.DoubleSide });
  sd = 31;
  const geo = meatGeometry('chicken');
  for (let i = 0; i < 6; i++) {
    const y = 0.15 + i * 0.072; cyl(0.057, 0.057, 0.0025, perf, 0, y, 0, g, 36);
    for (let k = 0; k < 3 + (i % 2); k++) {
      const s = 0.028 + R() * 0.016, a = R() * 6.28, rr = R() * 0.03, m = new THREE.Mesh(geo, chickenMat);
      m.scale.set(s, s * (1.6 + R()), s * (0.8 + R() * 0.4)); m.position.set(Math.cos(a) * rr, y + 0.0013 + 0.1 * m.scale.y * 0.9, Math.sin(a) * rr); m.rotation.y = R() * 6; g.add(m);
    }
  }
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0032, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }), 18);
  bubbles.renderOrder = 2; g.add(bubbles);
  const bub = Array.from({ length: 18 }, () => ({ a: R() * 6.28, r: 0.01 + R() * 0.036, y: R(), v: 0.6 + R() }));
  // 水套的进出水口和两根胶管
  const rubber = new THREE.MeshStandardMaterial({ color: 0x2a2624, roughness: 0.75 });
  for (const y of [0.17, 0.53]) { const b = cyl(0.006, 0.006, 0.03, M.steelDark, 0, y, -0.092, g, 8); b.rotation.x = Math.PI / 2; }
  tube([[0, 0.17, -0.105], [0.02, 0.12, -0.17], [0.1, 0.02, -0.23], [0.22, 0.012, -0.26]], 0.006, rubber, g);
  tube([[0, 0.53, -0.105], [0.03, 0.56, -0.17], [0.12, 0.3, -0.24], [0.24, 0.02, -0.27]], 0.006, rubber, g);
  // 蠕动泵：泵头的三个滚轮一直在转，管子绕在泵头上
  box(0.15, 0.12, 0.17, M.white, 0.27, 0.06, 0.02, g);
  const head = new THREE.Group(); head.position.set(0.29, 0.07, 0.118); g.add(head);
  cyl(0.04, 0.04, 0.018, M.frame, 0, 0, 0, head, 28).rotation.x = Math.PI / 2;
  const rotor = new THREE.Group(); rotor.position.z = 0.014; head.add(rotor);
  for (let k = 0; k < 3; k++) { const a = k * 2.094; const rl = cyl(0.008, 0.008, 0.02, M.steel, Math.cos(a) * 0.024, Math.sin(a) * 0.024, 0, rotor, 12); rl.rotation.x = Math.PI / 2; }
  const silicone = new THREE.MeshStandardMaterial({ color: 0xefe0c8, roughness: 0.3, transparent: true, opacity: 0.82 });
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.033, 0.0045, 8, 32, Math.PI * 1.3), silicone); loop.position.z = 0.016; loop.rotation.z = Math.PI * 0.85; head.add(loop);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.03), new THREE.MeshBasicMaterial({ map: lcd(['24 rpm', 'CW']), toneMapped: false })); scr.position.set(0.225, 0.085, 0.1055); g.add(scr);
  cyl(0.035, 0.035, 0.12, M.vesselGlass, 0.27, 0.18, -0.01, g, 24).renderOrder = 3;
  cyl(0.032, 0.032, 0.075, new THREE.MeshStandardMaterial({ color: 0xf0c08a, roughness: 0.2, transparent: true, opacity: 0.6, depthWrite: false }), 0.27, 0.16, -0.01, g, 24).renderOrder = 2;
  cyl(0.022, 0.022, 0.025, M.cap, 0.27, 0.252, -0.01, g, 18);
  tube([[0.26, 0.07, 0.14], [0.17, 0.03, 0.15], [0.06, 0.035, 0.1], [0.02, 0.1, 0.07]], 0.0045, silicone, g);
  tube([[0.02, 0.655, 0.0], [0.07, 0.71, 0.0], [0.22, 0.6, -0.01], [0.27, 0.265, -0.01]], 0.0045, silicone, g);
  tube([[0.25, 0.262, 0.0], [0.2, 0.2, 0.1], [0.25, 0.11, 0.15], [0.29, 0.1, 0.135]], 0.0045, silicone, g);
  tag(['BR-01 G-0221', 'D14  P41'], 0.085, 0.028, -0.025, 0.45, 0.077, -0.3, g);
  wearVessel(g, 0.0615, 0.585, 0.42, '214,170,120', 4);
  benchStain(parent, x + 0.05, 0.9362, z + 0.04, 0.42, 1.2);
  return {
    group: g,
    tick(t, dt) {
      rotor.rotation.z -= dt * 2.5;
      bub.forEach((p, i) => { p.y += dt * 0.14 * p.v; if (p.y > 1) p.y = 0; bubbles.setMatrixAt(i, m4.makeTranslation(Math.cos(p.a + p.y * 3) * p.r, 0.13 + p.y * 0.44, Math.sin(p.a + p.y * 3) * p.r)); });
      bubbles.instanceMatrix.needsUpdate = true;
    },
  };
}
const m4 = new THREE.Matrix4();

// ------------------------------------------------------------------ BR-03 猪：夹套搅拌罐 + 温控器
export function jacketVessel(parent, x, z, M) {
  const g = new THREE.Group(); g.position.set(x, 0.936, z); parent.add(g);
  box(0.3, 0.06, 0.3, M.white, 0, 0.03, 0, g);
  for (const kx of [-0.08, 0.08]) cyl(0.013, 0.013, 0.016, M.frame, kx, 0.03, 0.155, g, 16).rotation.x = Math.PI / 2;
  const led = box(0.008, 0.008, 0.004, M.ledGreen, 0, 0.045, 0.151, g);
  cyl(0.207, 0.212, 0.14, M.steel, 0, 0.13, 0, g, 48);
  cyl(0.212, 0.212, 0.01, M.steelDark, 0, 0.2, 0, g, 48);
  const glass = cyl(0.19, 0.19, 0.34, M.vesselGlass, 0, 0.23, 0, g, 48, true); glass.renderOrder = 3;
  const medium = cyl(0.186, 0.186, 0.27, new THREE.MeshPhysicalMaterial({ color: 0xe8874e, roughness: 0.12, transparent: true, opacity: 0.46, depthWrite: false }), 0, 0.195, 0, g, 48); medium.renderOrder = 2;
  const film = new THREE.Mesh(new THREE.CircleGeometry(0.185, 48), new THREE.MeshBasicMaterial({ color: 0xf6d79a, transparent: true, opacity: 0.2, depthWrite: false }));
  film.rotation.x = -Math.PI / 2; film.position.y = 0.331; film.renderOrder = 2; g.add(film);
  for (let i = -3; i <= 3; i++) {
    cyl(0.0018, 0.0018, 0.27, M.steel, 0, 0.2, i * 0.04, g, 6).rotation.z = Math.PI / 2;
    cyl(0.0018, 0.0018, 0.27, M.steel, i * 0.04, 0.2, 0, g, 6).rotation.x = Math.PI / 2;
  }
  const pork = meatMaterial('pork');
  const u = pork.userData.uniforms; if (u) { u.uFat.value = 1; u.uColor.value = 0.6; }
  const slab = new THREE.Mesh(meatGeometry('pork'), pork); slab.scale.set(0.36, 0.36 * 1.7, 0.36); slab.position.set(-0.01, 0.2 + 0.075 * 0.36 * 1.7 * 0.92, -0.01); slab.rotation.y = 0.35; g.add(slab);
  const trim = new THREE.Mesh(meatGeometry('pork'), pork); trim.scale.set(0.15, 0.15 * 1.8, 0.13); trim.position.set(0.1, 0.2 + 0.075 * 0.15 * 1.8 * 0.9, 0.1); trim.rotation.y = -0.8; g.add(trim);
  const ptfe = new THREE.MeshStandardMaterial({ color: 0xe6e2d8, roughness: 0.5, map: grimeMap(23) });
  cyl(0.2, 0.2, 0.028, ptfe, 0, 0.414, 0, g, 48);
  for (let k = 0; k < 4; k++) { const a = k * 1.57 + 0.4; cyl(0.011, 0.011, 0.03, M.steel, Math.cos(a) * 0.12, 0.443, Math.sin(a) * 0.12, g, 12); }
  const syr = new THREE.Group(); syr.position.set(Math.cos(0.4) * 0.12, 0.46, Math.sin(0.4) * 0.12); syr.rotation.z = 0.22; g.add(syr);
  cyl(0.009, 0.009, 0.1, new THREE.MeshStandardMaterial({ color: 0xf2f4f2, roughness: 0.15, transparent: true, opacity: 0.55, depthWrite: false }), 0, 0.05, 0, syr, 16).renderOrder = 3;
  cyl(0.0085, 0.0085, 0.03, new THREE.MeshStandardMaterial({ color: 0xc86a4a, roughness: 0.2 }), 0, 0.016, 0, syr, 16);
  cyl(0.003, 0.003, 0.07, new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.5 }), 0, 0.12, 0, syr, 8);
  cyl(0.012, 0.012, 0.004, new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.5 }), 0, 0.155, 0, syr, 16);
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1c1a19, roughness: 0.7 });
  for (const y of [0.09, 0.17]) { const b = cyl(0.007, 0.007, 0.03, M.steelDark, 0.06, y, -0.215, g, 8); b.rotation.x = Math.PI / 2; }
  tube([[0.06, 0.09, -0.23], [0.15, 0.05, -0.25], [0.27, 0.03, -0.18], [0.3, 0.05, -0.15]], 0.007, rubber, g);
  tube([[0.06, 0.17, -0.23], [0.18, 0.2, -0.24], [0.3, 0.12, -0.17], [0.33, 0.08, -0.15]], 0.007, rubber, g);
  box(0.13, 0.1, 0.15, M.white, 0.31, 0.05, -0.08, g);
  const seg = canvasTexture(256, 96, (c, W, H) => { c.fillStyle = '#140504'; c.fillRect(0, 0, W, H); c.fillStyle = '#ff3a2a'; c.font = `500 64px ${MONO}`; c.fillText('37.1', 18, 70); c.font = `400 26px ${MONO}`; c.fillText('°C', 190, 46); });
  const sd7 = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.028), new THREE.MeshBasicMaterial({ map: seg, toneMapped: false })); sd7.position.set(0.31, 0.072, -0.0045); g.add(sd7);
  cyl(0.011, 0.011, 0.012, M.frame, 0.33, 0.03, -0.0045, g, 14).rotation.x = Math.PI / 2;
  tag(['BR-03 P-0932', 'D24  P52'], 0.1, 0.032, -0.07, 0.36, 0.178, -0.38, g);
  wearVessel(g, 0.1885, 0.352, 0.15, '186,112,66', 8);
  benchStain(parent, x - 0.02, 0.9362, z + 0.05, 0.6, 2.3);
  let tLed = 0;
  return { group: g, tick(t, dt) { tLed += dt; led.visible = Math.floor(tLed * 1.2) % 3 !== 0; film.rotation.z += dt * 0.05; } };
}
