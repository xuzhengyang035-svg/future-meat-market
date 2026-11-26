// 布置：桌布（真实的垂坠、折痕、被人推皱的地方）和桌上、台面上的日常杂物。
// 所有东西都按真实尺寸做，放在表面上（不悬空、不穿模），角度、位置都带一点随机。
import * as THREE from 'three';
import { pbr, decal, decalMat, model, userTex, userMat } from './assets.js';
import { canvasTexture } from './textures.js';

const rng = (seed) => { let s = (seed * 7919) % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

// ------------------------------------------------------------------ 桌布
// 一块平铺的布盖在 w×d 的桌面上（桌面中心在原点、高度 top），四边垂下 drop。
//   slip：布相对桌子没放正（米）；twist：转了一点角度；push：某处被手推出的一团皱褶 [x, z, 强度]
//   stiff：0 = 软棉布（褶子多、垂得直），1 = 硬塑料台布（褶子少、四角翘）
export function tablecloth({ w, d, drop = 0.22, top = 0.75, mat, seed = 1, slip = [0, 0], twist = 0, push = null, stiff = 0.3, crease = true, floorY = 0, cw, cd }) {
  const r = rng(seed);
  const FW = cw ?? w + 2 * drop, FD = cd ?? d + 2 * drop;   // cw / cd：布的实际尺寸（比如一条窄的桌旗）
  const res = 0.02, nx = Math.ceil(FW / res), nz = Math.ceil(FD / res);
  const g = new THREE.PlaneGeometry(FW, FD, nx, nz); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  // 每条边的褶子：几组不同波长的正弦叠加（相位随机），越往下越深
  const folds = Array.from({ length: 4 }, () => Array.from({ length: 4 }, (_, k) => ({ f: (6 + r() * 10) * (k + 1) * (1 - stiff * 0.5), p: r() * 6.28, a: (0.6 + r()) / (k + 1.5) })));
  const fold = (side, t) => folds[side].reduce((s, o) => s + Math.sin(t * o.f + o.p) * o.a, 0);
  const R = 0.012 + stiff * 0.01;                                              // 桌沿处布弯过去的半径
  const cs = Math.cos(twist), sn = Math.sin(twist);
  const soft = 1 - stiff;
  const bumps = Array.from({ length: 9 }, () => [(r() - 0.5) * w, (r() - 0.5) * d, 0.05 + r() * 0.14, (0.5 + r()) * 0.0035 * soft]);
  // 布被拉扯出的长条斜皱：沿某个方向的细长鼓包
  const ridges = Array.from({ length: Math.round(2 + soft * 4) }, () => ({ x: (r() - 0.5) * w * 0.9, z: (r() - 0.5) * d * 0.9, a: r() * Math.PI, len: 0.15 + r() * 0.35, h: (0.002 + r() * 0.004) * soft }));
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i), lz = pos.getZ(i);
    // 布上这一点在桌子坐标里的位置（布没放正）
    const px = lx * cs - lz * sn + slip[0], pz = lx * sn + lz * cs + slip[1];
    const ex = Math.max(Math.abs(px) - w / 2, 0), ez = Math.max(Math.abs(pz) - d / 2, 0);
    let X = px, Z = pz, Y = top;
    if (ex === 0 && ez === 0) {
      // 桌面上：细小的起伏 + 叠过的折痕（布是叠好收着的）+ 几处被压出的鼓包
      let h = 0;
      for (const [bx, bz, br, ba] of bumps) { const q = ((px - bx) ** 2 + (pz - bz) ** 2) / (br * br); h += ba * Math.exp(-q); }
      for (const q of ridges) { const dx = px - q.x, dz = pz - q.z, u = dx * Math.cos(q.a) + dz * Math.sin(q.a), v = -dx * Math.sin(q.a) + dz * Math.cos(q.a); h += q.h * Math.exp(-(u * u) / (q.len * q.len) - (v * v) / 0.0003); }
      if (crease) for (const c of [0, -0.25, 0.25]) { h += 0.0022 * Math.exp(-((lx - c * FW) ** 2) / 0.00005) * (c ? 0.6 : 1); h += 0.0018 * Math.exp(-((lz - c * FD) ** 2) / 0.00005) * (c ? 0.6 : 1); }
      if (push) { const [qx, qz, k] = push; const dd = Math.hypot(px - qx, pz - qz); if (dd < 0.3) h += k * 0.014 * Math.max(0, Math.sin(dd * 38 + Math.atan2(pz - qz, px - qx) * 2)) * (1 - dd / 0.3); }
      Y = top + 0.002 + h;
    } else {
      // 桌边外：先沿半径 R 的圆弧弯下去，再竖直垂下；褶子往外鼓
      const corner = ex > 0 && ez > 0;
      const rr = corner ? Math.hypot(ex, ez) : ex + ez;
      const th = corner ? Math.atan2(ez, ex) : ex > 0 ? 0 : Math.PI / 2;
      const arc = R * Math.PI / 2;
      let out, down;
      if (rr < arc) { const a = rr / R; out = R * Math.sin(a); down = R * (1 - Math.cos(a)); }
      else { out = R; down = R + (rr - arc); }
      const side = ex > 0 ? (px > 0 ? 0 : 1) : (pz > 0 ? 2 : 3);
      const along = ex > 0 && !corner ? pz : ez > 0 && !corner ? px : (px + pz);
      const depth = Math.min(1, (rr - arc) / Math.max(drop, 0.05));
      out += Math.max(0, depth) * (0.012 + (1 - stiff) * 0.018) * (fold(side, along) + 0.6) + (corner ? depth * (0.02 + stiff * 0.05) : 0);
      if (corner) down *= 0.92 + stiff * -0.25;                                 // 硬台布的角会往外翘、垂得少
      X = Math.sign(px) * (w / 2) + (ex > 0 ? Math.sign(px) * out * Math.cos(th) : 0);
      Z = Math.sign(pz) * (d / 2) + (ez > 0 ? Math.sign(pz) * out * Math.sin(th) : 0);
      if (ex > 0 && ez === 0) Z = pz;
      if (ez > 0 && ex === 0) X = px;
      Y = Math.max(top - down, floorY + 0.004);
    }
    pos.setXYZ(i, X, Y, Z);
  }
  g.computeVertexNormals();
  g.setAttribute('uv1', g.attributes.uv);
  const m = new THREE.Mesh(g, mat);
  m.material.side = THREE.DoubleSide;
  return m;
}
// 几种桌布：红白格子塑料台布、白色亚麻（洗得发灰、有污渍）、花布、蓝灰格子棉布
//   red / blue / green：大格子棉布（洗旧了，颜色压暗一点）；tartan1-3：米色细格子；oilcloth：绿白格子塑料台布（有反光）；linen：浅蓝亚麻
export function clothMat(kind, FW, FD) {
  const fp7 = { red: '01', blue: '02', green: '03' }, fp5 = { tartan1: '01', tartan2: '02', tartan3: '03' };
  if (fp7[kind]) return pbr('fabric_pattern_07', FW, FD, { size: 0.7, variant: fp7[kind], color: 0xc8c0b4 });
  if (fp5[kind]) return pbr('fabric_pattern_05', FW, FD, { size: 0.6, variant: fp5[kind], color: 0xc4bcae });
  if (kind === 'oilcloth') return pbr('gingham_check', FW, FD, { size: 0.45, roughness: 0.5, color: 0xd0ccc4, envMapIntensity: 1.3, normalScale: 0.4 });
  if (kind === 'linen') return pbr('rough_linen', FW, FD, { size: 0.6, color: 0xc8ccc8 });
  if (kind === 'floral') return pbr('floral_jacquard', FW, FD, { size: 0.5, color: 0xb0a898 });
  return pbr('waffle_pique_cotton', FW, FD, { size: 0.35, color: 0xd0cabc });
}

// ------------------------------------------------------------------ 杂物（真实尺寸）
const MAT = {};
const mat = (k, f) => MAT[k] || (MAT[k] = f());
const chinaTex = () => mat('chinaTex', () => canvasTexture(64, 512, (g, W, H) => {      // 车削体的 v 方向 = 从盘心到盘沿：沿着它画一圈绿线、一点发黄和细裂纹
  g.fillStyle = '#ece6d8'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(160,140,100,.10)'; g.fillRect(0, H * 0.35, W, H * 0.25);          // 盘子中间（常被刀叉划、被酱汁泡）的地方发黄一点
  g.fillStyle = '#3a5a46'; g.fillRect(0, H * 0.555, W, H * 0.018); g.fillRect(0, H * 0.585, W, H * 0.006);   // 盘沿两道墨绿细线（老式餐厅瓷）
  g.strokeStyle = 'rgba(90,80,60,.12)'; g.lineWidth = 0.6; for (let i = 0; i < 40; i++) { const x = Math.random() * W, y = Math.random() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 30); g.stroke(); }   // 釉下细裂纹、刀叉划痕
}));
const ceramic = () => mat('ceramic', () => new THREE.MeshPhysicalMaterial({ map: chinaTex(), color: 0xffffff, roughness: 0.18, clearcoat: 0.8, clearcoatRoughness: 0.12, side: THREE.DoubleSide }));
const glassM = () => mat('glass', () => new THREE.MeshPhysicalMaterial({ color: 0xf4f8f4, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.26, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.6 }));
const steelM = () => mat('steel', () => new THREE.MeshStandardMaterial({ color: 0xc8c8c4, roughness: 0.28, metalness: 1 }));
const paperM = () => mat('paper', () => new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.95, side: THREE.DoubleSide, flatShading: true }));   // 平面着色：纸团的折面
const drinkM = (c) => mat('drink' + c, () => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.05, transparent: true, opacity: 0.75, depthWrite: false }));

function crumple(r, seed, flat = 0.5) {                                          // 揉成团的纸
  const g = new THREE.IcosahedronGeometry(r, 4), p = g.attributes.position, q = rng(seed);
  const fq = 2 + q() * 3, k = Array.from({ length: 9 }, (_, i) => [q() * 6, q() * 6, q() * 6, (0.05 + q() * 0.1) / (1 + i * 0.15)]);   // 大块的凹凸 + 细碎的折棱；每团的褶皱密度不同
  const sx = 0.75 + q() * 0.5, sz = 0.75 + q() * 0.5, dent = q() * 6.28;          // 有的揉得扁长，有的一边被踩瘪
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i), n = v.clone().normalize();
    let s = 1; for (const [a, b, c, amp] of k) s += Math.sin(n.x * a * fq + n.y * b * fq + n.z * c * fq) * amp * 0.5;
    s -= Math.max(0, n.x * Math.cos(dent) + n.z * Math.sin(dent) - 0.4) * 0.35 * q();
    v.multiplyScalar(s); v.x *= sx; v.z *= sz; v.y *= flat; p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); g.translate(0, r * flat * 0.8, 0);
  return g;
}
function curledPaper(w, h, curl, tex) {                                          // 卷边的小票、单据
  const g = new THREE.PlaneGeometry(w, h, 2, 16); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const z = p.getZ(i), t = (z / h + 0.5); p.setY(i, curl * t * t * h + 0.0008); }
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, side: THREE.DoubleSide }));
}
const receiptTex = (seed) => canvasTexture(160, 420, (g, W, H) => {
  g.fillStyle = '#ece8dc'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(40,40,48,.75)'; g.font = '600 15px monospace'; g.textAlign = 'center';
  g.fillText('BUTCHER · DINE-IN', W / 2, 30); g.font = '11px monospace'; g.fillText(`No.${(seed * 7331) % 9000 + 1000}`, W / 2, 48);
  g.textAlign = 'left';
  const items = [['Beef rib 200g', '68.00'], ['Pork belly 300g', '54.00'], ['Rice x2', '4.00'], ['Soup', '6.00'], ['Chicken leg', '32.00']];
  for (let i = 0; i < 3 + (seed % 3); i++) { g.fillText(items[(i + seed) % 5][0], 12, 80 + i * 18); g.fillText(items[(i + seed) % 5][1], 112, 80 + i * 18); }
  g.fillRect(12, 160, W - 24, 1); g.font = '600 13px monospace'; g.fillText('TOTAL', 12, 182); g.fillText('¥' + (90 + seed * 7 % 60) + '.00', 100, 182);
  for (let y = 210; y < 300; y += 3) g.fillRect(20 + (y * 13 % 5), y, (y * 17 % 3) + 1.5, 2.4);   // 条形码
  g.globalAlpha = 0.25; g.fillStyle = '#8a7a5a'; g.beginPath(); g.ellipse(W * 0.6, H * 0.7, 30, 22, 0.3, 0, 7); g.fill();   // 油点
});

// 在 parent 上、高度 y 处摆一套东西；kind 决定是什么。返回大致占地半径
export const ITEM = {
  plate(p, x, y, z, o = {}) {                                                     // 浅瓷盘 Ø24 cm，盘里可能有剩菜和刀叉
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = o.ry || 0; p.add(g);
    const pts = [[0, 0], [0.085, 0], [0.09, 0.004], [0.1, 0.012], [0.118, 0.018], [0.121, 0.016], [0.105, 0.008], [0.088, 0.006], [0, 0.006]].map(([a, b]) => new THREE.Vector2(a, b));
    g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 40), ceramic()));
    if (o.sauce) { decal('SurfaceImperfections013', g, { pos: [0.01, 0.0072, 0.005], rot: [-Math.PI / 2, 0, (o.ry || 1) * 2], w: 0.16, h: 0.16, color: 0x4a1a08, opacity: 0.95, roughness: 0.3 }); decal('Smear005', g, { pos: [-0.01, 0.0074, -0.01], rot: [-Math.PI / 2, 0, o.ry || 1], w: 0.14, h: 0.1, color: 0x5a2810, opacity: 0.9, roughness: 0.3 }); }
    if (o.fork) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.003, 0.014), steelM()); f.position.set(0.02, 0.012, 0.03); f.rotation.set(0, 0.6, 0.06); g.add(f); }
    if (o.knife) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.003, 0.016), steelM()); k.position.set(-0.01, 0.012, -0.03); k.rotation.set(0, 0.45, -0.05); g.add(k); }
    if (o.bone) { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.06, 4, 8), mat('bone', () => new THREE.MeshStandardMaterial({ color: 0xc8b89a, roughness: 0.6 }))); b.rotation.set(Math.PI / 2, 0, 0.7); b.position.set(-0.03, 0.016, 0.02); g.add(b); }
    return g;
  },
  glass(p, x, y, z, o = {}) {                                                     // 玻璃水杯，剩半杯水 / 茶 / 啤酒
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const h = o.h || 0.11, r0 = 0.03, r1 = 0.036;
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, 24, 1, true), glassM()); shell.position.y = h / 2; g.add(shell);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(r0, r0 * 0.97, 0.012, 24), mat('glassBase', () => new THREE.MeshPhysicalMaterial({ color: 0xdfe8e2, roughness: 0.05, transparent: true, opacity: 0.55, clearcoat: 1, depthWrite: false }))); base.position.y = 0.006; g.add(base);   // 厚杯底
    const lip = new THREE.Mesh(new THREE.TorusGeometry(r1, 0.0015, 6, 32), mat('glassLip', () => new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, transparent: true, opacity: 0.7, clearcoat: 1 }))); lip.rotation.x = Math.PI / 2; lip.position.y = h; g.add(lip);   // 杯口亮边
    { const fp = new THREE.Mesh(new THREE.CylinderGeometry(r1 + 0.0005, r0 + 0.0005, h * 0.7, 24, 1, true, 0, Math.PI), decalMat('Fingerprints005', { color: 0xe8e8e0, opacity: 0.5, roughness: 0.6 })); fp.position.y = h * 0.45; fp.rotation.y = (o.ry || x * 7); g.add(fp); }   // 杯壁上的手印
    const lv = (o.level ?? 0.5) * h;
    if (lv > 0.01) { const li = new THREE.Mesh(new THREE.CylinderGeometry(r0 + (r1 - r0) * lv / h - 0.002, r0 - 0.002, lv - 0.008, 20), drinkM(o.color ?? 0xd8dcd4)); li.position.y = 0.008 + (lv - 0.008) / 2; g.add(li); }
    if (o.ring) decal('SurfaceImperfections007', p, { pos: [x + 0.03, y + 0.0006, z + 0.01], rot: [-Math.PI / 2, 0, x * 10], w: 0.12, h: 0.12, color: 0x8a8070, opacity: 0.5 });
    return g;
  },
  mug(p, x, y, z, o = {}) {                                                       // 搪瓷/陶瓷杯，里面有茶渍
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = o.ry || 0; p.add(g);
    const m = o.enamel ? mat('enamel', () => new THREE.MeshPhysicalMaterial({ color: 0xe0dccc, roughness: 0.3, clearcoat: 0.5 })) : ceramic();
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.038, 0.095, 24, 1, true), m); b.position.y = 0.0475; m.side = THREE.DoubleSide; g.add(b);
    const bt = new THREE.Mesh(new THREE.CircleGeometry(0.038, 24), m); bt.rotation.x = -Math.PI / 2; bt.position.y = 0.004; g.add(bt);
    const tea = new THREE.Mesh(new THREE.CircleGeometry(0.039, 24), drinkM(0x3a2010)); tea.rotation.x = -Math.PI / 2; tea.position.y = 0.035 + (o.level ?? 0.3) * 0.05; g.add(tea);
    const hd = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.006, 8, 16, Math.PI * 1.1), m); hd.position.set(0.045, 0.05, 0); hd.rotation.z = -Math.PI * 0.55; g.add(hd);
    if (o.enamel) { const rim = new THREE.Mesh(new THREE.TorusGeometry(0.041, 0.0018, 6, 32), mat('enamelRim', () => new THREE.MeshStandardMaterial({ color: 0x2a3a5a, roughness: 0.4 }))); rim.rotation.x = Math.PI / 2; rim.position.y = 0.095; g.add(rim); }
    return g;
  },
  napkin(p, x, y, z, o = {}) {                                                    // 用过揉成团的纸巾
    const m = new THREE.Mesh(crumple(0.03 + (o.s || 0) * 0.015, o.seed || 3, 0.55), paperM()); m.position.set(x, y, z); m.rotation.y = (o.seed || 1) * 1.7; p.add(m); return m;
  },
  napkinFlat(p, x, y, z, o = {}) {                                                // 叠着的餐巾纸，最上面一张翘起来
    for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.0015, 0.12), paperM()); s.position.set(x + (i % 2) * 0.002, y + i * 0.0018, z); s.rotation.y = (o.ry || 0) + i * 0.03; p.add(s); }
  },
  receipt(p, x, y, z, o = {}) { const m = curledPaper(0.08, 0.16, 0.18 + ((o.seed || 1) % 3) * 0.06, userTex('receipt.webp', 'none')); m.position.set(x, y, z); m.rotation.y = o.ry || 0; p.add(m); return m; },   // 小票：用你生成的贴图（8 × 16 cm 热敏纸，卷边程度不一样）
  ashtray(p, x, y, z, o = {}) {                                                   // 铝烟灰缸 + 烟头
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const pts = [[0, 0], [0.05, 0], [0.055, 0.02], [0.05, 0.02], [0.045, 0.004], [0, 0.004]].map(([a, b]) => new THREE.Vector2(a, b));
    g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 20), mat('alu', () => new THREE.MeshStandardMaterial({ color: 0x9a9a96, roughness: 0.45, metalness: 0.9 }))));
    const ash = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), mat('ash', () => new THREE.MeshStandardMaterial({ color: 0x5a5854, roughness: 1 }))); ash.rotation.x = -Math.PI / 2; ash.position.y = 0.006; g.add(ash);
    const q = rng(o.seed || 5);
    for (let i = 0; i < (o.n ?? 4); i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.025 + q() * 0.015, 8), mat('butt', () => new THREE.MeshStandardMaterial({ color: 0xd8b070, roughness: 0.9 }))); b.rotation.set(Math.PI / 2 + (q() - 0.5) * 0.3, q() * 6, 0); b.position.set((q() - 0.5) * 0.05, 0.01, (q() - 0.5) * 0.05); g.add(b); }
    return g;
  },
  bottle(p, x, y, z, o = {}) {                                                    // 酱料瓶、啤酒瓶
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const h = o.h || 0.2, r = o.r || 0.028;
    const pts = [[0, 0], [r, 0], [r, h * 0.62], [r * 0.45, h * 0.78], [r * 0.4, h * 0.95], [r * 0.45, h], [0, h]].map(([a, b]) => new THREE.Vector2(a, b));
    g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 20), drinkM(o.color ?? 0x3a5a22)));
    if (o.label) { const l = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.0005, r + 0.0005, h * 0.3, 20, 1, true), new THREE.MeshStandardMaterial({ color: o.label, roughness: 0.8 })); l.position.y = h * 0.35; g.add(l); }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.47, r * 0.47, 0.012, 12), mat('cap', () => new THREE.MeshStandardMaterial({ color: 0xa8a8a0, metalness: 0.8, roughness: 0.4 }))); cap.position.y = h + 0.006; g.add(cap);
    if (o.lying) { g.rotation.z = Math.PI / 2; g.position.y = y + r; }
    return g;
  },
  coins(p, x, y, z, o = {}) {
    const q = rng(o.seed || 9), m = mat('coin', () => new THREE.MeshStandardMaterial({ color: 0xb8a878, metalness: 0.9, roughness: 0.35 }));
    for (let i = 0; i < (o.n || 4); i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.002, 16), m); c.position.set(x + (q() - 0.5) * 0.05, y + 0.001 + (i % 2) * 0.002, z + (q() - 0.5) * 0.05); c.rotation.set((q() - 0.5) * 0.08, 0, (q() - 0.5) * 0.08); p.add(c); }
  },
  crumbs(p, x, y, z, o = {}) {                                                    // 饭粒、面包屑
    const q = rng(o.seed || 11), n = o.n || 24;
    const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.0025, 0), mat('crumb', () => new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 0.8 })), n);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) { const a = q() * 6.28, rr = Math.sqrt(q()) * (o.r || 0.08); m4.makeTranslation(x + Math.cos(a) * rr, y + 0.0015, z + Math.sin(a) * rr); im.setMatrixAt(i, m4); }
    p.add(im);
  },
  toothpicks(p, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); const h = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.055, 14), glassM()); h.position.y = 0.0275; g.add(h); for (let i = 0; i < 9; i++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.001, 0.001, 0.065, 4), mat('wood', () => new THREE.MeshStandardMaterial({ color: 0xd8c09a, roughness: 0.9 }))); t.position.set((i % 3 - 1) * 0.006, 0.036, (Math.floor(i / 3) - 1) * 0.006); t.rotation.set((i % 3 - 1) * 0.12, 0, (Math.floor(i / 3) - 1) * 0.12); g.add(t); } return g; },
  // 挤压酱瓶：半透明软塑料瓶身（看得到里面酱的高度）、白色尖嘴盖、一圈印着字的标签、瓶身上流下来干掉的酱
  squeeze(p, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = o.ry || 0; p.add(g);
    const c = o.color ?? 0xb02018, h = o.h || 0.19, r = 0.03;
    const pts = [[0, 0], [r * 0.9, 0], [r, 0.01], [r, h * 0.8], [r * 0.85, h * 0.88], [r * 0.45, h * 0.92], [r * 0.4, h * 0.95]].map(([a, b]) => new THREE.Vector2(a, b));
    g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 24), mat('sq' + c, () => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.3, clearcoat: 0.6, transparent: true, opacity: 0.88 }))));
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.42, 0.032, 16), mat('sqCap', () => new THREE.MeshStandardMaterial({ color: 0xe8e6e0, roughness: 0.4 }))); cap.position.y = h * 0.95 + 0.016; g.add(cap);
    const lb = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.0006, r + 0.0006, h * 0.32, 24, 1, true), new THREE.MeshStandardMaterial({ roughness: 0.6, map: canvasTexture(256, 64, (cg, W, H) => { cg.fillStyle = '#f0ece0'; cg.fillRect(0, 0, W, H); cg.fillStyle = o.labelColor || '#7a2420'; cg.font = '700 26px Inter, sans-serif'; cg.fillText(o.label || 'KETCHUP', 14, 40); cg.fillRect(0, 50, W, 5); }) }));
    lb.position.y = h * 0.42; g.add(lb);
    decal('Leaking010A', g, { pos: [0, h * 0.72, r + 0.001], w: 0.02, h: 0.06, color: c, opacity: 0.8, roughness: 0.3 });   // 瓶口流下来干掉的一道
    return g;
  },
  // 玻璃调味瓶：盐（白色细粒）/ 胡椒（黑灰色），镀铬旋盖上有小孔
  shaker(p, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const h = 0.075, r = 0.019;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.92, r, h, 12, 1, true), mat('shGlass', () => new THREE.MeshPhysicalMaterial({ color: 0xf0f4f0, roughness: 0.05, transparent: true, opacity: 0.3, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }))); body.position.y = h / 2; g.add(body);
    const fill = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.88, r * 0.94, h * (o.level ?? 0.55), 12), mat('sh' + (o.pepper ? 'p' : 's'), () => new THREE.MeshStandardMaterial({ color: o.pepper ? 0x3a3530 : 0xf2f0ea, roughness: 1, bumpMap: canvasTexture(64, 64, (cg) => { for (let i = 0; i < 900; i++) { cg.fillStyle = `rgba(${Math.random() * 255 | 0},0,0,1)`; cg.fillRect(Math.random() * 64, Math.random() * 64, 2, 2); } }), bumpScale: 2 })));
    fill.position.y = h * (o.level ?? 0.55) / 2 + 0.002; g.add(fill);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r * 0.93, 0.022, 16), mat('chromeCap', () => new THREE.MeshStandardMaterial({ color: 0xd8d8d4, metalness: 1, roughness: 0.18 }))); cap.position.y = h + 0.011; g.add(cap);
    return g;
  },
  // 一套调料：不锈钢丝调料架、番茄酱、芥末酱、酱油瓶、盐、胡椒、一个塞满纸巾的不锈钢纸巾盒
  condiments(p, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = o.ry || 0; p.add(g);
    const wire = mat('wire', () => new THREE.MeshStandardMaterial({ color: 0xc0c0bc, metalness: 1, roughness: 0.3 }));
    for (const [dx, dz] of [[-0.11, -0.05], [0.11, -0.05], [-0.11, 0.05], [0.11, 0.05]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.12, 6), wire); l.position.set(dx, 0.06, dz); g.add(l); }
    for (const yy of [0.004, 0.06]) for (const dz of [-0.05, 0.05]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.22, 6), wire); b.rotation.z = Math.PI / 2; b.position.set(0, yy, dz); g.add(b); }
    const hd = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.003, 6, 20, Math.PI), wire); hd.position.set(0, 0.12, 0); g.add(hd);   // 提手
    ITEM.squeeze(g, -0.07, 0.006, 0, { color: 0xa81c14, label: 'KETCHUP', ry: 0.3 });
    ITEM.squeeze(g, 0.0, 0.006, 0, { color: 0xd8a818, label: 'MUSTARD', labelColor: '#5a4a10', ry: -0.4 });
    { const sb = new THREE.Group(); sb.position.set(0.07, 0.006, 0); g.add(sb);              // 酱油：深色玻璃瓶 + 红色盖
      const pts = [[0, 0], [0.024, 0], [0.024, 0.1], [0.012, 0.13], [0.01, 0.15], [0, 0.15]].map(([a, b]) => new THREE.Vector2(a, b));
      sb.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 20), mat('soyGlass', () => new THREE.MeshPhysicalMaterial({ color: 0x2a1408, roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.92 }))));
      const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 12), mat('soyCap', () => new THREE.MeshStandardMaterial({ color: 0xb01818, roughness: 0.4 }))); sc.position.y = 0.155; sb.add(sc); }
    ITEM.shaker(g, -0.16, 0, 0.09, {}); ITEM.shaker(g, -0.115, 0, 0.1, { pepper: true, level: 0.35 });
    { const nb = new THREE.Group(); nb.position.set(0.17, 0, 0.06); nb.rotation.y = 0.2; g.add(nb);   // 纸巾盒：旧不锈钢，上面开一道口，露出一张纸巾
      const st = userMat('steel_worn.webp', 1, 1, { size: 0.3, metalness: 0.45, roughness: 0.4, color: 0xd8d8d4 });
      const bx = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.07), st); bx.position.y = 0.045; nb.add(bx);
      const tissue = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.05, 4, 4), mat('tissueM', () => new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 1, side: THREE.DoubleSide })));
      const tp = tissue.geometry.attributes.position; for (let i = 0; i < tp.count; i++) tp.setZ(i, Math.sin(tp.getX(i) * 60) * 0.004); tissue.position.set(0, 0.105, 0); nb.add(tissue); }
    return g;
  },
  // 汤碗：厚瓷碗，碗底剩一点汤
  bowl(p, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const pts = [[0, 0], [0.04, 0], [0.042, 0.006], [0.07, 0.045], [0.074, 0.06], [0.07, 0.06], [0.064, 0.047], [0.036, 0.012], [0, 0.012]].map(([a, b]) => new THREE.Vector2(a, b));
    g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 36), ceramic()));
    if (o.soup !== false) { const sp = new THREE.Mesh(new THREE.CircleGeometry(0.045, 24), drinkM(0x8a5a2a)); sp.rotation.x = -Math.PI / 2; sp.position.y = 0.02; g.add(sp); }
    const sp2 = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.004, 0.03), steelM()); sp2.position.set(0.04, 0.055, 0.01); sp2.rotation.set(0, 0.5, -0.3); g.add(sp2);   // 搭在碗沿上的勺子
    return g;
  },
  cutlery(p, x, y, z, o = {}) {                                                   // 餐具筒：旧不锈钢筒（有底，开口），里面插着叉子、勺子、餐刀和几双竹筷，头朝上斜靠在筒沿上
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); const q = rng(o.seed || 3);
    const tin = userMat('steel_worn.webp', 1, 1, { size: 0.25, metalness: 0.3, roughness: 0.42, color: 0xe4e4e0, side: THREE.DoubleSide });
    const R = 0.045, H = 0.12;
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.94, H, 28, 1, true), tin); wall.position.y = H / 2; g.add(wall);
    const bot = new THREE.Mesh(new THREE.CircleGeometry(R * 0.94, 28), tin); bot.rotation.x = -Math.PI / 2; bot.position.y = 0.004; g.add(bot);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(R, 0.0022, 6, 32), tin); lip.rotation.x = Math.PI / 2; lip.position.y = H; g.add(lip);   // 卷边
    const steel = new THREE.MeshPhysicalMaterial({ color: 0xd6d7d4, metalness: 1, roughness: 0.2, clearcoat: 0.3, side: THREE.DoubleSide });   // 抛光不锈钢
    const bamboo = new THREE.MeshStandardMaterial({ color: 0xc9a86a, roughness: 0.7 });
    // 平面轮廓（x 宽、y 长，从柄尾 y=0 到头部）→ 挤出成薄片 → 沿长度方向弯一点（叉子、勺子的柄和头都是翘的）
    const flat = (pts, thick, bend) => {
      const sh = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
      const geo = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: true, bevelThickness: thick * 0.3, bevelSize: 0.0005, bevelSegments: 2, curveSegments: 4 });
      geo.translate(0, 0, -thick / 2); const P = geo.attributes.position;
      for (let i = 0; i < P.count; i++) P.setZ(i, P.getZ(i) + bend(P.getY(i))); geo.computeVertexNormals(); return geo;
    };
    const side = (prof) => { const r = prof.map(([y, w]) => [w / 2, y]); return [...r, ...r.slice().reverse().map(([x, y]) => [-x, y])]; };   // 按“高度-宽度”表生成左右对称的外轮廓
    const handleProf = (L) => Array.from({ length: 14 }, (_, i) => { const y = i / 13 * L, t = y / L; return [y, 0.006 + 0.016 * Math.sin(Math.min(1, (1 - t) * 1.25) * Math.PI / 2) * (1 - 0.15 * t) - (t < 0.04 ? (0.04 - t) * 0.25 : 0)]; });
    const GEO = {};
    GEO.fork = (() => {                                                          // 餐叉：柄尾宽、脖子细、叉头四个齿
      const prof = [...handleProf(0.115), [0.125, 0.0065], [0.135, 0.016], [0.145, 0.023], [0.15, 0.025]];
      const right = prof.map(([y, w]) => [w / 2, y]); const pts = [...right];
      const tw = 0.0046, gap = 0.0022, x0 = 0.0125;                            // 四个齿，从右往左
      for (let t = 0; t < 4; t++) { const xr = x0 - t * (tw + gap), xl = xr - tw; pts.push([xr, 0.188 - (t % 3 ? 0 : 0.002)], [xr - tw * 0.3, 0.192], [xl + tw * 0.3, 0.192], [xl, 0.188]); if (t < 3) pts.push([xl, 0.158], [xl - gap, 0.158]); }
      pts.push(...right.slice().reverse().map(([x, y]) => [-x, y]));
      return flat(pts, 0.0018, (y) => (y > 0.12 ? ((y - 0.12) / 0.07) ** 2 * 0.012 : 0) + (y < 0.06 ? ((0.06 - y) / 0.06) ** 2 * 0.004 : 0));
    })();
    GEO.knife = flat(side([...handleProf(0.1).map(([y, w]) => [y, w * 0.85]), [0.104, 0.012], [0.11, 0.019], [0.17, 0.0185], [0.195, 0.014], [0.208, 0.006], [0.212, 0.001]]), 0.0024, () => 0);
    GEO.spoonH = flat(side([...handleProf(0.12), [0.128, 0.0065]]), 0.0018, (y) => (y < 0.06 ? ((0.06 - y) / 0.06) ** 2 * 0.004 : 0) + (y > 0.1 ? ((y - 0.1) / 0.03) ** 2 * 0.002 : 0));
    const make = (kind) => {                                                      // 每件都从 y=0 往上长；kind 末尾带 ! 的是柄朝上插着
      const u = new THREE.Group(), flip = kind.endsWith('!'); kind = kind.replace('!', '');
      if (kind === 'chop') { for (const dx of [-0.004, 0.004]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0035, 0.23, 6), bamboo); c.position.set(dx, 0.115, 0); u.add(c); } return u; }
      const inner = new THREE.Group(); u.add(inner);
      if (kind === 'spoon') {
        inner.add(new THREE.Mesh(GEO.spoonH, steel));
        const bowl = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), steel);   // 勺头：一个很浅的椭圆壳
        bowl.scale.set(0.017, 0.007, 0.026); bowl.rotation.x = -Math.PI / 2; bowl.position.set(0, 0.152, 0.0055); inner.add(bowl);
      } else inner.add(new THREE.Mesh(GEO[kind], steel));
      if (flip) { inner.rotation.z = Math.PI; inner.position.y = kind === 'knife' ? 0.212 : 0.19; }
      return u;
    };
    const kinds = ['fork', 'spoon', 'knife!', 'fork', 'spoon', 'chop', 'knife!', 'fork!', 'spoon', 'knife!', 'fork', 'chop'];
    kinds.forEach((k, i) => {
      const a = i / kinds.length * Math.PI * 2 + q() * 0.35, r0 = 0.01 + q() * 0.018;
      const holder = new THREE.Group(); holder.rotation.y = -a; g.add(holder);
      const u = make(k); u.position.set(r0, 0.005 - q() * 0.004, 0);
      u.rotation.order = 'ZYX'; u.rotation.z = -Math.min(0.32, (R - 0.006 - r0) / H + 0.02);   // 往外倒，靠在筒沿上
      u.rotation.y = Math.PI / 2 + (q() - 0.5) * 0.9; holder.add(u);                         // 大致让平面朝外，各自再扭一点
    });
    return g;
  },
  rag(p, x, y, z, o = {}) {                                                       // 抹布：皱巴巴地摊着，或搭在边上
    const g = new THREE.PlaneGeometry(0.3, 0.3, 24, 24); g.rotateX(-Math.PI / 2);
    const P = g.attributes.position, q = rng(o.seed || 4);
    const k = Array.from({ length: 5 }, () => [q() * 30, q() * 30, q() * 6]);
    for (let i = 0; i < P.count; i++) { const a = P.getX(i), b = P.getZ(i); let h = 0; for (const [f1, f2, ph] of k) h += Math.max(0, Math.sin(a * f1 + b * f2 + ph)) * 0.006; P.setY(i, h + 0.001); P.setX(i, a * 0.85 + Math.sin(b * 12) * 0.01); }
    g.computeVertexNormals(); g.setAttribute('uv1', g.attributes.uv);
    const m = new THREE.Mesh(g, o.mat || pbr('waffle_pique_cotton', 0.3, 0.3, { size: 0.3, color: o.color ?? 0x9a9488 })); m.position.set(x, y, z); m.rotation.y = o.ry || 0; p.add(m);
    return m;
  },
};

// 在一张桌面上随机摆一桌“刚吃完还没收”的样子；state: 'used' 吃完 / 'set' 刚摆好 / 'empty' 只剩调料
export function dressTable(p, { y, w, d, seed = 1, state = 'used', clear = [], food }) {
  const q = rng(seed);
  const spots = [];
  const free = (x, z, r) => Math.abs(x) < w / 2 - r && Math.abs(z) < d / 2 - r && spots.every(([a, b, c]) => Math.hypot(a - x, b - z) > c + r) && clear.every(([a, b, c]) => Math.hypot(a - x, b - z) > c + r);
  const place = (r, tries = 30) => { for (let i = 0; i < tries; i++) { const x = (q() - 0.5) * (w - 2 * r), z = (q() - 0.5) * (d - 2 * r); if (free(x, z, r)) { spots.push([x, z, r]); return [x, z]; } } return null; };
  let s;
  if (state !== 'empty') {
    const nPlates = state === 'set' ? 2 : 1 + Math.floor(q() * 3);
    for (let i = 0; i < nPlates; i++) if ((s = place(0.13))) { const pl = ITEM.plate(p, s[0], y, s[1], { ry: q() * 6, sauce: state === 'used' && q() < 0.85, fork: q() < 0.7, knife: q() < 0.5, bone: state === 'used' && q() < 0.4 }); if (state === 'used' && food && q() < 0.6) food(pl, 0.008, q); }
    for (let i = 0; i < 1 + Math.floor(q() * 3); i++) if ((s = place(0.045))) (q() < 0.4 ? ITEM.mug : ITEM.glass)(p, s[0], y, s[1], { level: q() * 0.7, ry: q() * 6, ring: q() < 0.6, enamel: q() < 0.5, color: [0xd8dcd4, 0x8a5a1a, 0xc8a040][Math.floor(q() * 3)] });
    if (state === 'used') {
      for (let i = 0; i < Math.floor(q() * 4); i++) if ((s = place(0.04))) ITEM.napkin(p, s[0], y, s[1], { seed: seed * 10 + i, s: q() });
      if (q() < 0.6 && (s = place(0.1))) ITEM.receipt(p, s[0], y, s[1], { seed: seed + 3, ry: q() * 6 });
      if (q() < 0.7 && (s = place(0.08))) ITEM.bowl(p, s[0], y, s[1], {});
      if (q() < 0.5 && (s = place(0.06))) ITEM.ashtray(p, s[0], y, s[1], { seed, n: 1 + Math.floor(q() * 5) });
      if (q() < 0.4 && (s = place(0.04))) ITEM.coins(p, s[0], y, s[1], { seed, n: 2 + Math.floor(q() * 4) });
      if (q() < 0.5 && (s = place(0.1))) ITEM.bottle(p, s[0], y, s[1], { h: 0.23, r: 0.03, color: 0x3a4a1a, label: 0xb8a070, lying: q() < 0.3 });
      for (let i = 0; i < 2; i++) if ((s = place(0.08))) ITEM.crumbs(p, s[0], y, s[1], { seed: seed * 3 + i });
      // 桌面上的水渍、油渍
      for (let i = 0; i < 2 + Math.floor(q() * 3); i++) decal(['SurfaceImperfections005', 'SurfaceImperfections007', 'SurfaceImperfections009', 'SurfaceImperfections011'][Math.floor(q() * 4)], p, { pos: [(q() - 0.5) * w * 0.8, y + 0.0004, (q() - 0.5) * d * 0.8], rot: [-Math.PI / 2, 0, q() * 6], w: 0.2 + q() * 0.2, h: 0.2 + q() * 0.2, color: [0x6a5a40, 0x8a8070, 0x5a3020][Math.floor(q() * 3)], opacity: 0.35 + q() * 0.3 });
    } else if ((s = place(0.07))) ITEM.napkinFlat(p, s[0], y, s[1], { ry: q() });
  }
  if ((s = place(0.035))) ITEM.toothpicks(p, s[0], y, s[1]);
  return spots;
}

// ------------------------------------------------------------------ 挂着的布：毛巾搭在杆上、外套搭在椅背上、衣服挂在挂钩上
// drapeOver：布搭在一根沿 x 方向的杆上（杆心在原点，半径 r）。布的一头从 +z 一侧垂下（lenA），另一头从 −z 一侧垂下（lenB）。
//   贴着东西的一侧把褶子幅度设成 0（ampA / ampB），布就不会穿进墙或抽屉面里；leanA / leanB 让那一侧顺着斜面往下（每米下垂偏出多少）
export function drapeOver({ w = 0.3, lenA = 0.3, lenB = 0.3, r = 0.015, mat, seed = 1, ampA = 1, ampB = 1, leanA = 0, leanB = 0, floorY = -Infinity, foldAmp = 1 }) {
  const q = rng(seed), arc = Math.PI * r, L = lenA + lenB + arc;
  const nx = 18, ny = Math.max(24, Math.round(L / 0.012));
  const g = new THREE.PlaneGeometry(w, L, nx, ny), P = g.attributes.position;
  const folds = Array.from({ length: 3 }, (_, k) => ({ f: (14 + q() * 12) * (k + 1) / Math.sqrt(foldAmp), p: q() * 6.28, a: 0.012 * foldAmp / (k + 1) }));
  for (let i = 0; i < P.count; i++) {
    const u = P.getX(i), s = P.getY(i) + L / 2 - lenB - arc / 2;                    // s：沿布的弧长，0 在杆顶，正的往 +z 一侧
    let y, z;
    if (Math.abs(s) <= arc / 2) { const th = s / r; y = r * Math.cos(th); z = r * Math.sin(th); }
    else {
      const side = Math.sign(s), d = Math.abs(s) - arc / 2, amp = side > 0 ? ampA : ampB, lean = side > 0 ? leanA : leanB;
      const k = Math.min(1, d / 0.12);
      const fold = folds.reduce((a, o) => a + Math.sin(u * o.f + o.p + d * 3) * o.a, 0);
      y = -d + Math.sin(u * 9 + seed) * 0.012 * foldAmp * k * (d / 0.4); z = side * (r + lean * d + amp * k * (Math.abs(fold) + d * 0.03));       // 褶子只往外鼓，越往下越散开
      if (y < floorY) { z += side * (floorY - y); y = floorY; }                       // 碰到地面就铺开
    }
    P.setXYZ(i, u * (1 - 0.04 * Math.min(1, Math.abs(s) / 0.3)), y, z);              // 越往下微微收窄
  }
  g.computeVertexNormals(); g.setAttribute('uv1', g.attributes.uv);
  const m = new THREE.Mesh(g, mat); m.material.side = THREE.DoubleSide; m.userData.prop = 'drape';
  return m;
}
// hookGarment：挂在一个挂钩上的上衣（领口挂在钩上），原点在挂钩，贴墙一侧是 −z；sleeves 两只袖子从肩膀垂下来
export function hookGarment({ w = 0.5, h = 0.75, mat, seed = 1, sleeves = true, hood = false }) {
  const q = rng(seed), grp = new THREE.Group(); grp.userData.prop = 'garment';
  const g = new THREE.PlaneGeometry(w, h, 20, 30), P = g.attributes.position;
  const folds = Array.from({ length: 4 }, (_, k) => ({ f: (8 + q() * 8) * (k + 1), p: q() * 6.28, a: 0.02 / (k + 1) }));
  for (let i = 0; i < P.count; i++) {
    const u = P.getX(i) / w, v = Math.min(1, Math.max(0, 0.5 - P.getY(i) / h));   // 夹到 0..1：浮点误差出一点负数，开 0.7 次方会变 NaN，整个画面变黑                                 // u: −0.5..0.5，v: 0 领口 → 1 下摆
    const sm = (a, b, t) => { const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
    const gather = 0.1 + 0.9 * sm(0, 0.24, v);                                       // 领口被钩子收成一小撮，往下散开成肩膀
    // 褶子：从挂钩往下放射开（布的重量全吊在一个点上），到下摆再加几道竖褶
    const ang = Math.atan2(u * w, v * h + 0.03);
    const radial = folds.reduce((a, o, k) => a + Math.sin(ang * (7 + 3 * k) + o.p) * o.a, 0) * sm(0.02, 0.35, v) * (1.2 - v * 0.6);
    const hemF = Math.sin(u * w * 26 + seed) * 0.012 * v * v;
    const x = u * w * gather + radial * 0.25, y = -v * h + Math.sin(u * 11 + seed * 1.3) * 0.018 * v;   // 下摆不齐
    const z = 0.015 + 0.03 * Math.sin(Math.PI * Math.min(1, v * 1.25)) * (1 - 1.6 * u * u) + Math.abs(radial) * 1.2 + Math.abs(hemF);
    P.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals(); g.setAttribute('uv1', g.attributes.uv);
  const body = new THREE.Mesh(g, mat); mat.side = THREE.DoubleSide; grp.add(body);
  if (sleeves) for (const sx of [-1, 1]) {                                            // 袖子：从肩膀垂到身侧，略微在前面
    const pts = [[sx * w * 0.3, -0.11 * h / 0.7, 0.05], [sx * w * 0.42, -0.28 * h / 0.7, 0.07], [sx * w * 0.42, -0.5 * h / 0.7, 0.075 + q() * 0.02], [sx * w * (0.36 + q() * 0.05), -0.68 * h / 0.7, 0.065]].map((p) => new THREE.Vector3(...p));
    const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.04, 10), tp = tg.attributes.position;   // 袖子往袖口收细、压扁（空袖子是瘪的）
    const n = 11; for (let i = 0; i < tp.count; i++) { const seg = Math.floor(i / n) / 24, c = new THREE.Vector3(); new THREE.CatmullRomCurve3(pts).getPoint(seg, c); const d = new THREE.Vector3(tp.getX(i), tp.getY(i), tp.getZ(i)).sub(c); d.multiplyScalar(1 - seg * 0.3); d.z *= 0.55; tp.setXYZ(i, c.x + d.x, c.y + d.y, c.z + d.z); }
    tg.computeVertexNormals(); grp.add(new THREE.Mesh(tg, mat));
  }
  if (hood) { const hg = new THREE.PlaneGeometry(0.3, 0.26, 10, 10), hp = hg.attributes.position;   // 帽兜：一片布从领口翻下来盖在背上，中间凹一道
    for (let i = 0; i < hp.count; i++) { const x = hp.getX(i), y = hp.getY(i), t = 0.5 - y / 0.26; hp.setXYZ(i, x * (0.45 + 0.55 * Math.min(1, t * 2)), -t * 0.26 - 0.03, 0.06 + 0.03 * Math.cos(x * 10) * t + 0.02 * (1 - t)); }
    hg.computeVertexNormals(); grp.add(new THREE.Mesh(hg, mat)); }
  return grp;
}
// 墙上的挂钩板：一块木板 + 几个铁钩，返回每个钩尖的位置（板的本地坐标）
export function hookBoard(n = 4, w = 0.9) {
  const g = new THREE.Group(), wood = pbr('wood_table_worn', w, 0.1, { size: 0.8, color: 0x8a6a4a }), iron = mat('iron', () => new THREE.MeshStandardMaterial({ color: 0x2a2a28, roughness: 0.5, metalness: 0.7 }));
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.02), wood); b.position.z = 0.01; g.add(b);
  const tips = [];
  for (let i = 0; i < n; i++) { const x = -w / 2 + (i + 0.5) * w / n; const h = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.07, 6), iron); h.rotation.x = Math.PI / 2 - 0.35; h.position.set(x, -0.005, 0.05); g.add(h); const k = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), iron); k.position.set(x, 0.008, 0.083); g.add(k); tips.push([x, 0.0, 0.07]); }
  return { group: g, tips };
}

// ------------------------------------------------------------------ 垃圾桶：塑料桶、套着黑色垃圾袋（袋口翻过桶沿）、里面塞着纸团和小票
export function bin(p, x, z, { r = 0.16, h = 0.5, color = 0x3a5a46, seed = 1, fill = 0.8 } = {}) {
  const q = rng(seed), g = new THREE.Group(); g.userData.prop = 'bin'; g.position.set(x, 0, z); g.rotation.y = q() * 6; p.add(g);
  const plastic = userMat('steel_worn.webp', 1, 1, { size: 0.6, color, metalness: 0.3, roughness: 0.55, bump: 0.15, side: THREE.DoubleSide });   // 镀锌铁皮桶：你给的旧不锈钢贴图，按桶的颜色压一点色
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.86, h, 32, 1, true), plastic); body.position.y = h / 2; g.add(body);
  const bt = new THREE.Mesh(new THREE.CircleGeometry(r * 0.86, 24), plastic); bt.rotation.x = -Math.PI / 2; bt.position.y = 0.004; g.add(bt);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r + 0.004, 0.008, 8, 40), plastic); rim.rotation.x = Math.PI / 2; rim.position.y = h; g.add(rim);
  // 垃圾袋：袋口翻出来盖住桶沿，往下垂一截，皱的
  const bagM = mat('bag', () => new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.3, metalness: 0.1, side: THREE.DoubleSide }));
  const skirt = new THREE.CylinderGeometry(r + 0.012, r + 0.016, 0.09, 40, 6, true), sp = skirt.attributes.position;
  for (let i = 0; i < sp.count; i++) { const a = Math.atan2(sp.getZ(i), sp.getX(i)), yy = sp.getY(i), k = 1 + (Math.sin(a * 9 + seed) * 0.03 + Math.sin(a * 23) * 0.015) * (0.5 - yy / 0.09); sp.setX(i, sp.getX(i) * k); sp.setZ(i, sp.getZ(i) * k); sp.setY(i, yy - Math.max(0, Math.sin(a * 3 + seed)) * 0.03 * (0.5 - yy / 0.09)); }
  skirt.computeVertexNormals(); const sk = new THREE.Mesh(skirt, bagM); sk.position.y = h - 0.035; g.add(sk);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(r + 0.01, 0.011, 8, 40), bagM); lip.rotation.x = Math.PI / 2; lip.position.y = h + 0.006; g.add(lip);
  // 里面的东西：堆到快满，几个纸团冒出桶口
  const top = h * fill;
  const inner = new THREE.Mesh(new THREE.CircleGeometry(r * 0.97, 24), bagM); inner.rotation.x = -Math.PI / 2; inner.position.y = top - 0.03; g.add(inner);
  for (let i = 0; i < 7; i++) { const a = q() * 6.28, rr = q() * r * 0.7; ITEM.napkin(g, Math.cos(a) * rr, top - 0.03 + q() * 0.05, Math.sin(a) * rr, { seed: seed * 13 + i, s: 0.5 + q() }); }
  if (q() < 0.8) { const rc = ITEM.receipt(g, (q() - 0.5) * r, top + 0.02, (q() - 0.5) * r, { seed: seed + 2, ry: q() * 6 }); rc.rotation.x = -0.6; }
  return g;
}

// ------------------------------------------------------------------ 地上的垃圾：被踩过的小票、纸团、烟头、瓶盖
const LITTER_M = {};
function litterMat(kind) {
  if (LITTER_M[kind]) return LITTER_M[kind];
  const m = {
    tissue: () => new THREE.MeshStandardMaterial({ color: 0xe0dcd2, roughness: 0.95, flatShading: true }),
    kraft: () => new THREE.MeshStandardMaterial({ color: 0x9a7a52, roughness: 0.95, flatShading: true }),
    news: () => new THREE.MeshStandardMaterial({ map: canvasTexture(256, 256, (g, W, H) => { g.fillStyle = '#c8c2b0'; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(30,30,30,.55)'; for (let c = 0; c < 3; c++) for (let y = 8; y < H; y += 7) g.fillRect(8 + c * 84, y, 70 - (y * 7 % 20), 2); }), roughness: 0.95, flatShading: true }),
    foil: () => new THREE.MeshStandardMaterial({ color: 0xc8c4bc, metalness: 0.9, roughness: 0.3, flatShading: true }),
    wrapper: () => new THREE.MeshStandardMaterial({ color: 0xb8302a, metalness: 0.5, roughness: 0.35, flatShading: true }),
    cup: () => new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.6, side: THREE.DoubleSide }),
    straw: () => new THREE.MeshStandardMaterial({ color: 0xd84a3a, roughness: 0.4 }),
    butt: () => new THREE.MeshStandardMaterial({ color: 0xd8b070, roughness: 0.9 }),
    cap: () => new THREE.MeshStandardMaterial({ color: 0x9a2a20, metalness: 0.7, roughness: 0.4 }),
  }[kind]();
  return (LITTER_M[kind] = m);
}
// 地上的垃圾：小票（你给的贴图）、白纸巾团、牛皮纸团、旧报纸团、锡纸团、糖纸、被踩扁的纸杯、吸管、烟头、瓶盖
export function litter(p, x, z, seed = 1) {
  const q = rng(seed), t = q(), ry = q() * 6.28;
  const ball = (kind, r, flat) => { const m = new THREE.Mesh(crumple(r, seed * 13 + 7, flat), litterMat(kind)); m.position.set(x, 0, z); m.rotation.y = ry; p.add(m); return m; };
  if (t < 0.24) { const m = ITEM.receipt(p, x, 0.0015, z, { seed, ry }); m.scale.setScalar(0.85 + q() * 0.3); return m; }
  if (t < 0.36) return ball('tissue', 0.025 + q() * 0.02, 0.45 + q() * 0.25);
  if (t < 0.45) return ball('kraft', 0.035 + q() * 0.025, 0.5 + q() * 0.2);
  if (t < 0.53) return ball('news', 0.05 + q() * 0.03, 0.55 + q() * 0.2);
  if (t < 0.6) return ball('foil', 0.018 + q() * 0.01, 0.6);
  if (t < 0.67) { const m = ball('wrapper', 0.025, 0.12); m.scale.set(1.6, 1, 0.7); return m; }   // 压扁的糖纸
  if (t < 0.74) { const g = new THREE.CylinderGeometry(0.04, 0.03, 0.09, 18, 4, true), P = g.attributes.position;   // 被踩扁的纸杯：侧放、一边压瘪
    for (let i = 0; i < P.count; i++) { const zz = P.getZ(i); P.setZ(i, zz * (0.35 + 0.25 * (P.getY(i) / 0.09 + 0.5))); } g.computeVertexNormals();
    const m = new THREE.Mesh(g, litterMat('cup')); m.rotation.set(Math.PI / 2, 0, ry); m.position.set(x, 0.016, z); p.add(m); return m; }
  if (t < 0.8) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.2, 6), litterMat('straw')); m.rotation.set(Math.PI / 2, 0, ry); m.position.set(x, 0.003, z); p.add(m); return m; }   // 吸管
  if (t < 0.93) { const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g);   // 一小撮烟头
    for (let i = 0; i < 1 + Math.floor(q() * 3); i++) { const L = 0.018 + q() * 0.017, b = new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0038, L, 8), litterMat('butt')); b.rotation.set(Math.PI / 2, q() * 6, 0); b.position.set((q() - 0.5) * 0.15, 0.0038, (q() - 0.5) * 0.15); g.add(b);
      const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.0039, 0.0039, 0.004, 8), mat('ashEnd', () => new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 1 }))); ash.position.y = L / 2; b.add(ash); }
    return g; }
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.006, 16), litterMat('cap')); c.position.set(x, 0.003, z); p.add(c); return c;   // 瓶盖
}

// ------------------------------------------------------------------ 黄色拖把桶（带挤水器和轮子）+ 一把泡在桶里的拖把（你给的黄塑料、拖把布条贴图）
export function mopBucket(p, x, z, ry = 0) {
  const g = new THREE.Group(); g.userData.prop = 'mopBucket'; g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
  const yellow = userMat('plastic_yellow.webp', 1, 1, { size: 0.6, roughness: 0.42, bump: 0.08, side: THREE.DoubleSide });
  const grey = new THREE.MeshStandardMaterial({ color: 0x5a5c5a, roughness: 0.5 });
  const H = 0.3, Y0 = 0.06;                                                       // 桶身高 30 cm，底下轮子抬高 6 cm
  const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, H, 36, 1, true), yellow); tub.scale.x = 1.35; tub.position.y = Y0 + H / 2; g.add(tub);
  const base = new THREE.Mesh(new THREE.CircleGeometry(0.17, 32), yellow); base.scale.x = 1.35; base.rotation.x = -Math.PI / 2; base.position.y = Y0 + 0.002; g.add(base);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 8, 40), yellow); rim.scale.set(1.35, 1, 1); rim.rotation.x = Math.PI / 2; rim.position.y = Y0 + H; g.add(rim);
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.19, 32), new THREE.MeshPhysicalMaterial({ color: 0x4a4636, roughness: 0.05, transparent: true, opacity: 0.88 }));   // 用过的脏水
  water.scale.x = 1.35; water.rotation.x = -Math.PI / 2; water.position.y = Y0 + H * 0.62; g.add(water);
  for (const [cx, cz] of [[-0.2, -0.12], [0.2, -0.12], [-0.2, 0.12], [0.2, 0.12]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 14), grey); w.rotation.x = Math.PI / 2; w.position.set(cx, 0.025, cz); g.add(w); }   // 万向轮
  // 挤水器：卡在桶的一头，灰色压板 + 一根往上翘的压杆
  const wr = new THREE.Group(); wr.position.set(0.17, Y0 + H, 0); g.add(wr);
  const wb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.26), yellow); wb.position.y = 0.05; wr.add(wb);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.12, 0.22), grey); plate.position.set(-0.05, 0.06, 0); wr.add(plate);
  const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.62, 10), new THREE.MeshStandardMaterial({ color: 0xb8b8b4, metalness: 0.9, roughness: 0.3 })); lever.position.set(0.1, 0.38, 0); lever.rotation.z = -0.18; wr.add(lever);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 10), grey); grip.rotation.x = Math.PI / 2; grip.position.set(0.155, 0.68, 0); wr.add(grip);
  // 拖把：布条头泡在桶里的水下，杆子斜靠在挤水器上
  const head = new THREE.CylinderGeometry(0.035, 0.13, 0.32, 28, 8, true), hp = head.attributes.position, q = rng(5);
  for (let i = 0; i < hp.count; i++) { const a = Math.atan2(hp.getZ(i), hp.getX(i)), yy = hp.getY(i), k = 1 + (Math.sin(a * 13) * 0.08 + Math.sin(a * 5 + 1) * 0.1) * (0.5 - yy / 0.32); hp.setX(i, hp.getX(i) * k); hp.setZ(i, hp.getZ(i) * k); if (yy < -0.12) hp.setY(i, yy - Math.abs(Math.sin(a * 7)) * 0.03); }
  head.computeVertexNormals(); head.setAttribute('uv1', head.attributes.uv);
  const strings = new THREE.Mesh(head, userMat('mop_strings.webp', 1, 1, { size: 0.5, roughness: 1, bump: 0.6, side: THREE.DoubleSide }));
  const mop = new THREE.Group(); mop.position.set(-0.08, Y0 + 0.2, 0.02); mop.rotation.z = -0.42; g.add(mop);          // 拖把头在桶里偏向另一头，杆子往挤水器那边斜
  strings.position.y = 0; mop.add(strings);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.3, 10), new THREE.MeshStandardMaterial({ color: 0x3a6a8a, roughness: 0.4, metalness: 0.3 })); stick.position.y = 0.16 + 0.65; mop.add(stick);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.05, 14), grey); cap.position.y = 0.16; mop.add(cap);
  return g;
}

// ------------------------------------------------------------------ 盆栽：Poly Haven 的植物模型一个文件里摆了好几株（没有花盆），只取其中一株、挪回原点，配一个上釉陶瓷花盆和盆土
export function potPlant(p, name, part, { pos = [0, 0, 0], rot = 0, scale = 1, pot = { r: 0.15, h: 0.18, color: 0x3a4a3a } } = {}) {
  const g = new THREE.Group(); g.userData.prop = 'potPlant'; g.position.set(...pos); g.rotation.y = rot; p.add(g);
  const src = model(name, {}); src.updateMatrixWorld(true);
  const root = src.children.length === 1 && !src.children[0].isMesh ? src.children[0] : src;
  for (const c of [...root.children]) if (!c.name.endsWith('_' + part)) root.remove(c);   // 只留名字以 _a / _b … 结尾的那一株
  const b = new THREE.Box3().setFromObject(src), c = b.getCenter(new THREE.Vector3());
  const soil = pot ? pot.h - 0.025 : 0;
  src.position.set(-c.x * scale, soil - b.min.y * scale, -c.z * scale); src.scale.setScalar(scale); g.add(src);
  if (pot) {                                                                         // 花盆：上口略大、带一圈厚沿，釉面有光泽
    const { r, h, color } = pot;
    const pts = [[0, 0.004], [r * 0.72, 0], [r * 0.78, 0.01], [r * 0.95, h - 0.03], [r * 1.05, h - 0.028], [r * 1.06, h], [r * 0.93, h], [r * 0.9, h - 0.02]].map(([x, y]) => new THREE.Vector2(x, y));
    g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 36), new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25, side: THREE.DoubleSide })));
    const s = new THREE.Mesh(new THREE.CircleGeometry(r * 0.9, 28), pbr('garage_floor', r * 2, r * 2, { size: 0.4, color: 0x3a2a1c, roughness: 1 })); s.rotation.x = -Math.PI / 2; s.position.y = soil; g.add(s);   // 盆土
  }
  return g;
}

// ------------------------------------------------------------------ 黑板立牌（Poly Haven 的 standing_chalkboard_01）+ 两面粉笔字
// 板面往后仰 12°（量过：顶部 z 0.07、y 1.4，底部 z 0.24、y 0.6），可写区域约 64 × 97 cm；字贴在板面前 4 mm
// front / back：(g, W, H, t, line, col) => {}，t(文字, x, y, 字号, 颜色, 对齐, 旋转)、line(点列, 颜色, 粗细)
export function chalkStand(p, { pos, rot = 0, front, back, seed = 41 }) {
  const cb = model('standing_chalkboard_01', { pos, rot, parent: p });
  const F = (px) => `600 ${px}px Caveat, "Segoe Print", "Comic Sans MS", cursive`;
  const col = { C: 'rgba(240,238,228,.95)', Y: 'rgba(244,214,96,.95)', P: 'rgba(240,150,150,.95)', dim: 'rgba(240,238,228,.7)' };
  const side = (draw, sd) => {
    const W = 660, H = 1000;
    const paint = (g) => {
      g.clearRect(0, 0, W, H);
      let n = sd; const r = () => (n = (n * 16807) % 2147483647) / 2147483647;
      g.filter = 'blur(10px)'; for (let i = 0; i < 16; i++) { g.fillStyle = `rgba(220,224,218,${0.015 + r() * 0.03})`; g.beginPath(); g.ellipse(r() * W, r() * H, 50 + r() * 110, 10 + r() * 22, (r() - 0.5) * 0.6, 0, 7); g.fill(); } g.filter = 'none';   // 擦过的灰印
      const t = (txt, x, y, px, c = col.C, align = 'center', rr = 0) => { g.save(); g.translate(x, y); g.rotate(rr + (r() - 0.5) * 0.03); g.font = F(px); g.textAlign = align; g.fillStyle = c; g.fillText(txt, 0, 0); g.restore(); };
      const line = (pts, c = col.C, w = 4) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x + (r() - 0.5) * 3, y + (r() - 0.5) * 3) : g.moveTo(x, y))); g.stroke(); };
      draw(g, W, H, t, line, col);
      g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(0,0,0,${0.15 + r() * 0.5})`; g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2); }   // 粉笔颗粒
      g.globalCompositeOperation = 'source-over';
    };
    const tx = canvasTexture(W, H, paint); tx.userData.redraw = () => { paint(tx.userData.ctx); tx.needsUpdate = true; };
    return tx;
  };
  const TILT = Math.atan2(0.24 - 0.07, 1.4 - 0.6), cy = 0.89, cz = 0.24 - (cy - 0.6) * Math.tan(TILT);
  const M = (map) => new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
  const texs = [];
  if (front) { const tx = side(front, seed); texs.push(tx); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.97), M(tx)); m.position.set(0.015, cy, cz + 0.004); m.rotation.x = -TILT; cb.add(m); }
  if (back) { const tx = side(back, seed + 16); texs.push(tx); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.97), M(tx)); m.position.set(0.015, cy, -cz - 0.004); m.rotation.set(TILT, Math.PI, 0); cb.add(m); }
  document.fonts.load(F(60), 'Aa').then(() => texs.forEach((tx) => tx.userData.redraw())).catch(() => {});
  return cb;
}

// ------------------------------------------------------------------ 毛巾（比 drapeOver 更像一条真毛巾）
// 有厚度（正反两面 + 一圈布边，3–5 mm）；两头各有一道织出来的边带（bandColor）；挂在杆上往下：
//   竖褶越往下越深，布被褶子收窄；两个下角往外翘、往下坠；下摆一头长一头短（skew）；侧边微微卷；
//   手擦过的地方和下摆发灰（顶点色，dirt 控制）。贴墙那一侧 amp 设 0，不会穿墙。
export function towel({ w = 0.3, lenA = 0.3, lenB = 0.4, r = 0.013, mat, bandMat, seed = 1, ampA = 0, ampB = 1, thick = 0.004, band = 0.045, skew = 0.025, dirt = 0.5 }) {
  const q = rng(seed), arc = Math.PI * r, L = lenA + lenB + arc;
  const nx = 24, ny = Math.max(48, Math.round(L / 0.008));
  const folds = Array.from({ length: 4 }, (_, k) => ({ f: (10 + q() * 10) * (k * 0.7 + 1), p: q() * 6.28, a: (0.016 + q() * 0.008) / (k * 0.8 + 1) }));
  const blot = Array.from({ length: 5 }, () => [q() - 0.5, q(), 0.04 + q() * 0.08, 0.1 + q() * 0.25]);
  const sm = (a, b, t) => { const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
  const front = [], uvs = [], cols = [];
  for (let iy = 0; iy <= ny; iy++) for (let ix = 0; ix <= nx; ix++) {
    const u = ix / nx - 0.5, s = (1 - iy / ny) * L - lenB - arc / 2;              // s：0 在杆顶，正的往 +z（lenA）一侧
    let x = u * w, y, z;
    if (Math.abs(s) <= arc / 2) { const th = s / r; y = r * Math.cos(th); z = r * Math.sin(th); }
    else {
      const side = Math.sign(s), d = Math.abs(s) - arc / 2, len = side > 0 ? lenA : lenB, amp = side > 0 ? ampA : ampB;
      const k = sm(0, 0.18, d), t = d / len;
      const fold = folds.reduce((a, o) => a + Math.sin(u * w * o.f + o.p + d * 2.5) * o.a, 0);
      x = u * w * (1 - amp * k * 0.07) + amp * k * Math.sin(u * 7 + seed) * 0.004;          // 褶子把布收窄一点
      const corner = Math.max(0, Math.abs(u) - 0.3) / 0.2;                                    // 下角：往外翘、往下坠
      y = -d - u * skew * t - corner * corner * 0.012 * t;
      z = side * (r + amp * k * (Math.abs(fold) * (0.6 + t) + d * 0.025) + amp * corner * corner * 0.012 * t + amp * Math.max(0, Math.abs(u) - 0.42) * 0.12 * k);
    }
    front.push(x, y, z); uvs.push(ix / nx, iy / ny);
    // 脏：越往下摆越灰，中间手擦的地方几块发黄发灰
    const v = iy / ny, hem = Math.max(sm(0.12, 0, v), sm(0.88, 1, v));
    let g = 1 - dirt * (0.16 * hem + blot.reduce((a, [bu, bv, br, ba]) => a + ba * Math.max(0, 1 - Math.hypot(u - bu, v - bv) / br), 0) * 0.6);
    cols.push(g, g * 0.985, g * 0.95);
  }
  const cnt = (nx + 1) * (ny + 1);
  const base = new THREE.BufferGeometry(); base.setAttribute('position', new THREE.Float32BufferAttribute(front, 3));
  const idx = []; for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) { const a = iy * (nx + 1) + ix, b = a + 1, c = a + nx + 1, dd = c + 1; idx.push(a, c, b, b, c, dd); }
  base.setIndex(idx); base.computeVertexNormals();
  const N = base.attributes.normal.array;
  // 正面 + 反面（沿法线退一个厚度）+ 四条布边
  const pos = front.slice(), uv = uvs.slice(), col = cols.slice();
  for (let i = 0; i < cnt; i++) { pos.push(front[i * 3] - N[i * 3] * thick, front[i * 3 + 1] - N[i * 3 + 1] * thick, front[i * 3 + 2] - N[i * 3 + 2] * thick); uv.push(uvs[i * 2], uvs[i * 2 + 1]); col.push(cols[i * 3] * 0.92, cols[i * 3 + 1] * 0.92, cols[i * 3 + 2] * 0.92); }
  const main = [], bandI = [], nb = Math.max(1, Math.round(band / L * ny));
  const isBand = (iy) => iy < nb || iy >= ny - nb;
  for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) {
    const a = iy * (nx + 1) + ix, b = a + 1, c = a + nx + 1, dd = c + 1, T = isBand(iy) ? bandI : main;
    T.push(a, c, b, b, c, dd, a + cnt, b + cnt, c + cnt, b + cnt, dd + cnt, c + cnt);
  }
  const loop = [];                                                                       // 外圈：上边、右边、下边、左边
  for (let ix = 0; ix <= nx; ix++) loop.push(ix);
  for (let iy = 1; iy <= ny; iy++) loop.push(iy * (nx + 1) + nx);
  for (let ix = nx - 1; ix >= 0; ix--) loop.push(ny * (nx + 1) + ix);
  for (let iy = ny - 1; iy >= 1; iy--) loop.push(iy * (nx + 1));
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length], o = pos.length / 3;
    for (const [vi, back] of [[a, 0], [b, 0], [a, 1], [b, 1]]) { const j = vi + back * cnt; pos.push(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]); uv.push(uv[vi * 2], uv[vi * 2 + 1]); col.push(cols[vi * 3] * 0.85, cols[vi * 3 + 1] * 0.85, cols[vi * 3 + 2] * 0.85); }
    main.push(o, o + 2, o + 1, o + 1, o + 2, o + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex([...main, ...bandI]); geo.addGroup(0, main.length, 0); geo.addGroup(main.length, bandI.length, 1);
  geo.computeVertexNormals(); geo.setAttribute('uv1', geo.attributes.uv);
  const m0 = mat.clone(); m0.vertexColors = true; m0.side = THREE.DoubleSide;
  const m1 = (bandMat || mat).clone(); m1.vertexColors = true; m1.side = THREE.DoubleSide;
  const m = new THREE.Mesh(geo, [m0, m1]); m.userData.prop = 'drape';
  return m;
}

// ------------------------------------------------------------------ 塑料椅上的旧坐垫（扁的海绵垫 + 布套，中间被坐塌，后面两根系带垂下来）
// 原点在座面中心的高度（塑料椅座面约 0.445 m，中间略凹）；w × dp 是坐垫大小
export function seatCushion({ w = 0.38, dp = 0.36, h = 0.035, mat, seed = 1, sag = 1, dirt = 0.6 }) {
  const q = rng(seed), grp = new THREE.Group();
  const g = new THREE.BoxGeometry(w, h, dp, 20, 4, 20), P = g.attributes.position;
  const wr = Array.from({ length: 3 }, () => [q() * 6.28, 8 + q() * 10]);
  const cols = [];
  for (let i = 0; i < P.count; i++) {
    let x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const ex = Math.abs(x) / (w / 2), ez = Math.abs(z) / (dp / 2), e = Math.max(ex, ez), top = y > 0;
    const puff = 1 - Math.pow(e, 6);                                                     // 边上收圆，像塞了海绵的布套
    const seat = Math.exp(-((x / (w * 0.32)) ** 2 + ((z - dp * 0.08) / (dp * 0.3)) ** 2));   // 屁股坐过的地方塌下去
    if (top) y = -h / 2 + h * (0.25 + 0.75 * puff) - seat * h * 0.35 * sag + wr.reduce((a, [p, f]) => a + Math.sin(x * f + z * f * 0.7 + p) * 0.0012, 0);
    else y = -h / 2 + 0.02 * ((x / 0.2) ** 2) * 0.5;                                    // 底面顺着凹的座面
    x *= 1 - 0.04 * (1 - puff) * (top ? 1 : 0.5); z *= 1 - 0.04 * (1 - puff) * (top ? 1 : 0.5);
    P.setXYZ(i, x, y + h / 2, z);
    const c = 1 - dirt * (0.18 * seat + 0.1 * Math.pow(e, 3) + (q() - 0.5) * 0.02);   // 坐的地方和边沿发暗
    cols.push(c, c * 0.98, c * 0.94);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals(); g.setAttribute('uv1', g.attributes.uv);
  const m = mat.clone(); m.vertexColors = true;
  const pad = new THREE.Mesh(g, m); grp.add(pad);
  // 一圈包边（滚边条）
  const tint = (geo, c) => { geo.setAttribute('color', new THREE.Float32BufferAttribute(new Array(geo.attributes.position.count * 3).fill(c), 3)); geo.setAttribute('uv1', geo.attributes.uv); return geo; };   // 用了顶点色的材质：没有颜色的几何体会变黑
  const edge = new THREE.Mesh(tint(new THREE.TorusGeometry(1, 0.004, 5, 48), 1 - dirt * 0.12), m); edge.scale.set(w / 2 - 0.004, dp / 2 - 0.004, 1); edge.rotation.x = Math.PI / 2; edge.position.y = h * 0.28; grp.add(edge);
  // 系带：后面两个角各一根布条，没系上，搭在座面后面（扁的）
  for (const sx of [-1, 1]) {
    const pts = [[sx * (w / 2 - 0.03), h * 0.3, -dp / 2 + 0.01], [sx * (w / 2 - 0.035), 0.012, -dp / 2 - 0.012], [sx * (w / 2 - 0.05 - q() * 0.02), 0.008, -dp / 2 - 0.03], [sx * (w / 2 - 0.09 - q() * 0.03), 0.008, -dp / 2 - 0.038]].map((p) => new THREE.Vector3(...p));
    const t = new THREE.Mesh(tint(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.005, 5), 1 - dirt * 0.15), m); t.scale.y = 0.5; grp.add(t);
  }
  grp.userData.prop = 'cushion';
  return grp;
}
