// 加工间里“用过的痕迹”：
//   病床区：两头猪盖上手术单，只在取样那块开窗（剃毛、碘伏、一排旧针眼和缝线、今天这一针还在渗血），窗边引出一根引流管接着负压球；
//           大白猪那张床的隔帘拉上了一大半，只露出床尾一截；牛脖子上留置针贴着胶布、后腿上是取样的疤；鸡翅下贴着纱布。
//   参观廊：墙上的水渍、踢脚线一圈的脏、撕掉海报留下的胶带印；玻璃上贴着几张不挡视线的小贴纸；显微镜台上一摞歪歪斜斜的单子。
// 依据：猪耳缘静脉最好扎、要镇静或保定，留置针用胶布和纱布固定（https://open.lib.umn.edu/largeanimalsurgery/chapter/swine-sedation-and-anesthesia）。
import * as THREE from 'three';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { canvasTexture } from './textures.js';
import { pbr, decal } from './assets.js';
import { bloodSplatter, dripStreak } from './materials.js';

let sd = 11;
const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
const rr = (a, b) => a + R() * (b - a);
const MONO = '"IBM Plex Mono", Consolas, monospace', SANS = '"Inter", "Helvetica Neue", Arial, sans-serif', HAND = '"Segoe Print", "Comic Sans MS", cursive';
const UP = new THREE.Vector3(0, 1, 0);

function blob(g, x, y, r, k = 0.35, n = 10) {
  const pts = Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2, q = r * (1 + (R() - 0.5) * k); return [x + Math.cos(a) * q, y + Math.sin(a) * q]; });
  g.beginPath();
  pts.forEach((p, i) => { const q = pts[(i + 1) % n], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2; i ? g.quadraticCurveTo(p[0], p[1], mx, my) : g.moveTo(mx, my); });
  g.closePath();
}
const clear = (draw, w = 512, h = w) => canvasTexture(w, h, (g, W, H) => { g.clearRect(0, 0, W, H); draw(g, W, H); });
const decalMat = (map, o = {}) => new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, roughness: 0.55, ...o });

// ------------------------------------------------------------------ 皮肤上的痕迹
// 取样的那块：剃过的皮、碘伏、两行旧的取样点（粉色的疤、褐色的痂、黑尼龙缝线），中间今天这一针还在渗，皮肤钉两颗
const biopsyTex = (skin, seed) => clear((g) => {
  sd = seed;
  g.filter = 'blur(9px)'; g.fillStyle = skin; blob(g, 256, 256, 200, 0.25, 14); g.fill(); g.filter = 'none';
  for (let i = 0; i < 1500; i++) { const a = R() * 6.28, d = Math.sqrt(R()) * 185; g.fillStyle = `rgba(60,38,30,${rr(0.12, 0.35)})`; g.fillRect(256 + Math.cos(a) * d, 256 + Math.sin(a) * d, 1.5, 1.5); }
  g.filter = 'blur(7px)'; g.fillStyle = 'rgba(158,76,20,.5)'; blob(g, 256, 262, 150, 0.4, 11); g.fill();
  g.strokeStyle = 'rgba(112,48,12,.45)'; g.lineWidth = 16; blob(g, 256, 262, 146, 0.4, 11); g.stroke(); g.filter = 'none';
  [[170, 186], [230, 176], [298, 190], [350, 214], [180, 318], [326, 312]].forEach(([x, y], i) => {
    if (i % 2) { g.fillStyle = 'rgba(206,124,122,.92)'; g.beginPath(); g.ellipse(x, y, 14, 4, rr(-0.3, 0.3), 0, 7); g.fill(); }
    else { g.fillStyle = 'rgba(120,40,30,.45)'; g.beginPath(); g.arc(x, y, 15, 0, 7); g.fill(); g.fillStyle = 'rgba(62,24,16,.95)'; g.beginPath(); g.ellipse(x, y, 9, 5, rr(-0.4, 0.4), 0, 7); g.fill(); }
    g.strokeStyle = '#141414'; g.lineWidth = 2.2;
    for (const o of [-6, 6]) { g.beginPath(); g.moveTo(x + o - 3, y - 9); g.lineTo(x + o + 3, y + 9); g.moveTo(x + o + 3, y + 9); g.lineTo(x + o + 7, y + 13); g.stroke(); }
  });
  bloodSplatter(g, 252, 252, 20, R, { dry: 0.15, smear: false, drops: 6 });
  g.fillStyle = '#160403'; g.beginPath(); g.arc(252, 252, 6.5, 0, 7); g.fill();
  for (let i = 0; i < 3; i++) dripStreak(g, 252 + rr(-9, 9), 258, rr(100, 190), rr(4, 8), R, '118,12,10', 0.8);
  for (const [x, y, a] of [[212, 250, 0.2], [292, 246, -0.15]]) { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = '#aeb3b6'; g.fillRect(-10, -2.2, 20, 4.4); g.fillStyle = '#eef2f4'; g.fillRect(-10, -2.2, 20, 1.2); g.restore(); }
});
// 一片针眼：每个周围一圈淤青（新的发紫，旧的发黄），最新那针冒着一颗血珠往下拖
const punctureTex = (seed, n = 7) => clear((g) => {
  sd = seed;
  for (let i = 0; i < n; i++) {
    const x = rr(60, 196), y = rr(60, 190), old = R() > 0.5, gr = g.createRadialGradient(x, y, 0, x, y, rr(14, 26));
    gr.addColorStop(0, old ? 'rgba(140,128,52,.45)' : 'rgba(104,40,86,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - 30, y - 30, 60, 60);
    g.fillStyle = 'rgba(54,8,8,.95)'; g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill();
  }
  g.fillStyle = '#6e0b0a'; g.beginPath(); g.arc(128, 116, 6, 0, 7); g.fill();
  dripStreak(g, 128, 120, 100, 5, R, '104,12,10', 0.85);
}, 256);
// 纱布 + 三条胶布，纱布中间洇出血
const tapeTex = (seed) => clear((g) => {
  sd = seed;
  g.fillStyle = 'rgba(238,236,228,.97)'; g.fillRect(80, 72, 98, 108);
  g.strokeStyle = 'rgba(0,0,0,.07)'; g.lineWidth = 1; for (let i = 80; i < 178; i += 4) { g.beginPath(); g.moveTo(i, 72); g.lineTo(i, 180); g.stroke(); }
  g.filter = 'blur(4px)'; g.fillStyle = 'rgba(150,22,18,.7)'; blob(g, 130, 128, 24, 0.6); g.fill(); g.fillStyle = 'rgba(84,10,10,.6)'; blob(g, 126, 124, 11, 0.6); g.fill(); g.filter = 'none';
  for (const [x, y, w, h, a] of [[128, 90, 210, 30, -0.08], [128, 166, 196, 28, 0.06], [96, 128, 28, 176, 0.04]]) {
    g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = 'rgba(232,231,222,.9)'; g.fillRect(-w / 2, -h / 2, w, h);
    g.strokeStyle = 'rgba(80,72,60,.35)'; g.lineWidth = 2; g.strokeRect(-w / 2, -h / 2, w, h); g.restore();
  }
}, 256);
const skinTex = (base, bristle, seed) => canvasTexture(256, 256, (g, W) => {
  sd = seed; g.fillStyle = base; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(90,40,30,${rr(0.04, 0.14)})`; g.fillRect(R() * W, R() * W, 1.3, 1.3); }
  g.strokeStyle = bristle; g.lineWidth = 0.8;
  for (let i = 0; i < 260; i++) { const x = R() * W, y = R() * W, a = 1.2 + rr(-0.3, 0.3); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7); g.stroke(); }
  for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(70,50,36,.06)'; blob(g, R() * W, R() * W, rr(14, 40)); g.fill(); }
}, { repeat: [3, 3] });

// 投影贴花：在 target 网格上 p 点、沿法线 n 贴一张，up 决定贴图的“上”朝哪边（血往贴图下方流）
const helper = new THREE.Object3D();
function stamp(target, p, n, size, mat, up = UP, lift = 0.0015) {
  helper.position.copy(p); helper.up.copy(up); helper.lookAt(p.clone().add(n));
  target.updateMatrixWorld(true);
  const geo = new DecalGeometry(target, p, helper.rotation.clone(), new THREE.Vector3(size, size, size));
  const pa = geo.attributes.position, na = geo.attributes.normal;              // 抬出皮面几毫米：牛、鸡的皮外面还有一层毛壳，贴在皮上会被毛盖住
  for (let i = 0; i < pa.count; i++) pa.setXYZ(i, pa.getX(i) + na.getX(i) * lift, pa.getY(i) + na.getY(i) * lift, pa.getZ(i) + na.getZ(i) * lift);
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 3;
  return m;
}
const ray = new THREE.Raycaster();
function hit(objects, from, dir) {
  ray.set(from, dir.clone().normalize());
  const h = ray.intersectObjects(objects, false)[0];
  if (!h) return null;
  return { p: h.point, n: h.face.normal.clone().transformDirection(h.object.matrixWorld).normalize(), o: h.object };
}

// ------------------------------------------------------------------ 盖着手术单的猪
// 侧躺（全麻下取样的姿势），身子用几个椭球拼出来，单子按“落在身上、在空处绷着”的方式算出高度；床边垂下去一圈
// 形状表：[沿身长（向头为正）, 横向（向肚子那边为正）, 中心离床面的高度, 半长, 半宽, 半高]
const PIG = [
  [0.0, 0.0, 0.18, 0.46, 0.24, 0.19], [-0.36, 0.0, 0.19, 0.27, 0.26, 0.2], [0.32, 0.0, 0.17, 0.22, 0.23, 0.18],
  [0.64, 0.03, 0.12, 0.2, 0.13, 0.12], [0.84, 0.05, 0.09, 0.1, 0.07, 0.07],
  [0.3, 0.28, 0.07, 0.06, 0.2, 0.05], [0.22, 0.3, 0.15, 0.06, 0.2, 0.05], [-0.36, 0.3, 0.08, 0.07, 0.22, 0.06], [-0.28, 0.33, 0.17, 0.07, 0.22, 0.06],
];
function drapedPig(parent, bed, { head = 1, side = 1, skin = '#d6a090', bristle = 'rgba(250,236,226,.55)', seed = 3, color = 0x2f5470, endDrop = 0.1, win = { a: -0.45, l: 0, dir: [0, 0.6, 1] } }) {
  const cx = (bed.x0 + bed.x1) / 2, cz = (bed.z0 + bed.z1) / 2, top = bed.top;
  const k = Math.min(1, (bed.z1 - bed.z0) / 2.1, (bed.x1 - bed.x0) / 1.05), L0 = -side * 0.1 * k;
  const E = PIG.map(([a, l, y, ra, rl, ry]) => ({ x: cx + L0 + side * l * k, z: cz + head * a * k, y: top + y * k, rx: rl * k, rz: ra * k, ry: ry * k }));
  const form = (x, z) => { let h = -1; for (const e of E) { const dx = (x - e.x) / e.rx, dz = (z - e.z) / e.rz, q = 1 - dx * dx - dz * dz; if (q > 0) h = Math.max(h, e.y + e.ry * Math.sqrt(q)); } return h; };
  const pose = new THREE.Group(); pose.position.set(cx, top, cz); parent.add(pose);
  // 露在窗口里的皮：只做躯干和后腿根两段（其余都在单子底下）；窗口开在朝着玻璃那一面，从参观廊看得见
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: skinTex(skin, bristle, seed), roughness: 0.62 });
  const forms = E.slice(0, 2).map((e) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), skinMat); m.position.set(e.x - cx, e.y - top, e.z - cz); m.scale.set(e.rx, e.ry, e.rz); pose.add(m); return m; });
  pose.updateMatrixWorld(true);
  const aim = new THREE.Vector3(cx + L0 + side * win.l * k, top + 0.16 * k, cz + head * win.a * k), wd = new THREE.Vector3(...win.dir).normalize();
  const w = hit(forms, aim.clone().addScaledVector(wd, 2), wd.clone().negate());

  // 单子的高度场：2 cm 一格，先贴着身子，再迭代“绷紧”——空处下垂一点但不穿进身子
  const S = 0.02, X0 = bed.x0 - 0.015, X1 = bed.x1 + 0.015, Z0 = bed.z0 - 0.015, Z1 = bed.z1 + 0.015;
  const nx = Math.round((X1 - X0) / S), nz = Math.round((Z1 - Z0) / S), n1 = nx + 1;
  const H0 = new Float32Array(n1 * (nz + 1)); let H = new Float32Array(H0.length), T = new Float32Array(H0.length);
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = X0 + (i / nx) * (X1 - X0), z = Z0 + (j / nz) * (Z1 - Z0), edge = i === 0 || j === 0 || i === nx || j === nz;
    H0[j * n1 + i] = edge ? top + 0.005 : Math.max(top + 0.005, form(x, z) + 0.012);
  }
  H.set(H0);
  for (let it = 0; it < 90; it++) {
    for (let j = 1; j < nz; j++) for (let i = 1; i < nx; i++) { const c = j * n1 + i; T[c] = Math.max(H0[c], (H[c - 1] + H[c + 1] + H[c - n1] + H[c + n1]) / 4 - 0.0007); }
    for (let i = 0; i <= nx; i++) { T[i] = H0[i]; T[nz * n1 + i] = H0[nz * n1 + i]; }
    for (let j = 0; j <= nz; j++) { T[j * n1] = H0[j * n1]; T[j * n1 + nx] = H0[j * n1 + nx]; }
    [H, T] = [T, H];
  }
  const heightAt = (x, z) => { const i = THREE.MathUtils.clamp(Math.round((x - X0) / (X1 - X0) * nx), 0, nx), j = THREE.MathUtils.clamp(Math.round((z - Z0) / (Z1 - Z0) * nz), 0, nz); return H[j * n1 + i]; };

  // 取样窗在单子上的“脚印”：坡越陡，脚印沿坡方向越窄
  const hx = w ? w.p.x : aim.x, hz = w ? w.p.z : aim.z, ny = w ? Math.max(0.35, Math.abs(w.n.y)) : 1;
  const hr = [0.07 * (w ? Math.max(ny, 1 - Math.abs(w.n.x)) : 1), 0.08 * (w ? Math.max(ny, 1 - Math.abs(w.n.z)) : 1)];
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = X0 + (i / nx) * (X1 - X0), z = Z0 + (j / nz) * (Z1 - Z0), c = j * n1 + i;
    const slack = THREE.MathUtils.clamp((H[c] - H0[c]) / 0.03, 0, 1), wave = Math.sin(x * 31 + Math.sin(z * 9) * 3) * Math.sin(z * 23 + x * 4);
    const y = H[c] + slack * 0.009 * wave + Math.max(0, wave) * 0.004 * (1 - slack);
    pos.push(x - cx, y - top, z - cz); uv.push(i / nx, 1 - j / nz);
    if (i < nx && j < nz) idx.push(c, c + n1, c + 1, c + 1, c + n1, c + n1 + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
  geo.computeVertexNormals();
  const W = X1 - X0, L = Z1 - Z0, PX = 256, PY = Math.round(256 * L / W);
  const toPx = (x, z) => [(x - X0) / W * PX, (z - Z0) / L * PY];
  const [px, py] = toPx(hx, hz), [rx, ry] = [hr[0] / W * PX, hr[1] / L * PY];
  const hole = canvasTexture(PX, PY, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, PX, PY); g.fillStyle = '#000'; g.beginPath(); g.ellipse(px, py, rx, ry, 0, 0, 7); g.fill(); });
  hole.colorSpace = THREE.NoColorSpace;
  const stain = canvasTexture(PX * 2, PY * 2, (g) => {
    sd = seed * 7; g.fillStyle = '#fff'; g.fillRect(0, 0, PX * 2, PY * 2);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${rr(0.02, 0.05)})`; blob(g, R() * PX * 2, R() * PY * 2, rr(10, 40)); g.fill(); }
    g.save(); g.scale(2, 2);
    g.strokeStyle = 'rgba(190,150,80,.75)'; g.lineWidth = 3.5; g.beginPath(); g.ellipse(px, py, rx + 2.5, ry + 2.5, 0, 0, 7); g.stroke();   // 切口膜的粘边
    bloodSplatter(g, px - side * rx * 0.4, py + ry * 0.6, 7, R, { dry: 0.3, drops: 9 });
    for (let i = 0; i < 3; i++) { g.save(); g.translate(px, py); g.rotate(side > 0 ? Math.PI / 2 : -Math.PI / 2); dripStreak(g, rr(-ry, ry) * 0.6, rx * 0.8, rr(20, 46), rr(2, 4), R, '96,10,10', 0.7); g.restore(); }
    bloodSplatter(g, rr(0.2, 0.8) * PX, rr(0.15, 0.85) * PY, 10, R, { dry: 0.9, drops: 4 });           // 上一次留下的，洗过一遍还是一块褐印
    g.restore();
  });
  const fab = pbr('cotton_jersey', W, L, { size: 0.32 });
  const mat = new THREE.MeshStandardMaterial({ color, map: stain, alphaMap: hole, alphaTest: 0.5, normalMap: fab.normalMap, roughnessMap: fab.roughnessMap, roughness: 1, side: THREE.DoubleSide });
  mat.normalScale.set(1.3, 1.3);
  pose.add(new THREE.Mesh(geo, mat));

  // 床边垂下去的一圈：两长边 30 cm，床头床尾短一点（床尾挂着床卡）
  const sk = { pos: [], uv: [], idx: [] };
  const skirt = (ax, az, bx, bz, ox, oz, drop) => {
    const len = Math.hypot(bx - ax, bz - az), ns = Math.max(2, Math.round(len / 0.02) + 2), nr = 9, base = sk.pos.length / 3, ph = rr(0, 6);
    for (let r = 0; r <= nr; r++) for (let s = 0; s <= ns; s++) {
      const t = r / nr, u = s / ns * (len + 0.04) - 0.02, fx = ax + (bx - ax) * u / len, fz = az + (bz - az) * u / len;
      const out = 0.004 + t * 0.016 + t * t * 0.022 * (0.5 + 0.5 * Math.sin(u / 0.11 * Math.PI * 2 + ph)), y = top + 0.005 - t * drop * (0.94 + 0.06 * Math.sin(u * 23 + ph));
      sk.pos.push(fx + ox * out - cx, y - top, fz + oz * out - cz); sk.uv.push(u / W, (1 - t) * drop / L);
      if (r < nr && s < ns) { const c = base + r * (ns + 1) + s; sk.idx.push(c, c + 1, c + ns + 1, c + 1, c + ns + 2, c + ns + 1); }
    }
  };
  skirt(X0, Z0, X0, Z1, -1, 0, 0.3); skirt(X1, Z0, X1, Z1, 1, 0, 0.3);
  skirt(X0, Z0, X1, Z0, 0, -1, head < 0 ? 0.22 : endDrop); skirt(X0, Z1, X1, Z1, 0, 1, head > 0 ? 0.22 : endDrop);
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sk.pos, 3)); sg.setAttribute('uv', new THREE.Float32BufferAttribute(sk.uv, 2)); sg.setIndex(sk.idx);
  sg.computeVertexNormals();
  const smat = mat.clone(); smat.map = null; smat.alphaMap = null; smat.alphaTest = 0;
  pose.add(new THREE.Mesh(sg, smat));

  if (w) pose.attach(stamp(w.o, w.p, w.n, 0.2, decalMat(biopsyTex(skin, seed), { roughness: 0.35 }), Math.abs(w.n.y) > 0.9 ? new THREE.Vector3(side, 0, 0) : UP));
  // 引流管：从窗口边上出来，贴着单子滑到肚子那侧的床沿，下面挂一只负压球，里面是淡红的血水
  const ex = side > 0 ? X1 : X0, tz = hz + 0.05 * head;
  const P = [[hx + side * 0.05, heightAt(hx + side * 0.05, hz) + 0.004, hz], [hx + side * 0.14, heightAt(hx + side * 0.14, tz) + 0.006, tz],
    [ex - side * 0.08, heightAt(ex - side * 0.08, tz) + 0.006, tz], [ex + side * 0.02, top + 0.0, tz + 0.01], [ex + side * 0.035, top - 0.1, tz + 0.02]]
    .map(([x, y, z]) => new THREE.Vector3(x - cx, y - top, z - cz));
  const tube = new THREE.MeshStandardMaterial({ color: 0xe9e4dc, roughness: 0.3, transparent: true, opacity: 0.7 });
  pose.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P), 40, 0.0032, 8), tube));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({ color: 0xece6dc, roughness: 0.25, transparent: true, opacity: 0.55, depthWrite: false }));
  bulb.scale.set(0.028, 0.044, 0.028); bulb.position.copy(P[4]).add(new THREE.Vector3(0, -0.05, 0)); bulb.renderOrder = 2;
  const fluid = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), new THREE.MeshStandardMaterial({ color: 0x5c0d0b, roughness: 0.15 }));
  fluid.scale.set(0.024, 0.04, 0.024); fluid.position.copy(bulb.position);
  pose.add(bulb, fluid);
  return { pose, heightAt };
}

// 隔帘：一幅静止的褶子布挂在顶轨上，只拉开床尾那一截
function sideCurtain(parent, x0, x1, z, top, bottom, mat) {
  const w = x1 - x0, pleats = Math.round(w / 0.16), nu = pleats * 6, nv = 12;
  const geo = new THREE.PlaneGeometry(1, 1, nu, nv), p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const u = uv.getX(i), fall = 1 - uv.getY(i), a = u * pleats * Math.PI * 2;
    p.setXYZ(i, x0 + u * w + Math.sin(a * 0.5) * 0.01 * fall, top - fall * (top - bottom) + Math.sin(u * 9) * 0.01 * fall * fall, z + Math.sin(a) * (0.04 + 0.03 * fall) + Math.sin(u * 5) * 0.03 * fall);
    uv.setXY(i, u * w * 1.4, uv.getY(i) * (top - bottom));
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat); parent.add(m);
  const metal = new THREE.MeshStandardMaterial({ color: 0x8d9290, metalness: 0.9, roughness: 0.45 });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(w + 0.9, 0.03, 0.04), metal); rail.position.set(x0 + w / 2 + 0.35, top + 0.04, z); parent.add(rail);
  for (const x of [x0 - 0.05, x0 + w + 0.75]) { const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 3.6 - top - 0.05, 8), metal); rod.position.set(x, (3.6 + top + 0.05) / 2, z); parent.add(rod); }
  const rings = new THREE.InstancedMesh(new THREE.TorusGeometry(0.018, 0.004, 5, 10).rotateY(Math.PI / 2), metal, pleats + 1), mm = new THREE.Matrix4();
  for (let i = 0; i <= pleats; i++) rings.setMatrixAt(i, mm.makeTranslation(x0 + (i / pleats) * w, top + 0.015, z));
  parent.add(rings);
}

// ------------------------------------------------------------------ 病床区
//   beds：网页里的床位表（会改 pose 让呼吸作用在新的身子上）；pivots：模型里每只动物的支点；kit：病床区的静态网格（找床垫）
export function dressWard({ hall, pivots, beds, kit, curtainMat }) {
  const mattress = (code) => {
    const m = kit.find((o) => new RegExp(`Wiped vinyl.*/ ?${code}$`).test(o.material?.name || ''));
    if (!m) return null;
    const b = new THREE.Box3().setFromObject(m);
    return { x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z, top: b.max.y };
  };
  const byAnimal = Object.fromEntries(beds.filter((b) => b.animal).map((b) => [b.animal, b]));
  const pig = (animal, code, o) => {
    const bed = mattress(code), pv = pivots[animal];
    if (!bed || !pv) return null;
    pv.visible = false;
    const d = drapedPig(hall, bed, o);
    byAnimal[animal].pose.o = d.pose;
    return { bed, ...d };
  };
  // 杜洛克：头朝里，红棕的皮；大白猪：头朝外，浅粉的皮，背朝右（从帘缝里看到的就是背和取样窗）
  pig('duroc', 'p9', { head: -1, side: 1, skin: '#b56a4a', bristle: 'rgba(120,50,26,.6)', seed: 5, color: 0x2f5470, win: { a: -0.42, l: -0.05, dir: [0.25, 0.55, 1] } });
  const white = pig('white', 'p1', { head: 1, side: -1, skin: '#dba596', seed: 9, color: 0x36597a, endDrop: 0.08, win: { a: 0.05, l: -0.16, dir: [0.25, 0.8, 0.65] } });
  if (white) sideCurtain(hall, white.bed.x0 - 0.22, white.bed.x0 + (white.bed.x1 - white.bed.x0) * 0.4, white.bed.z1 + 0.12, 2.35, 0.32, curtainMat);

  // 牛：右侧脖子上留置针（纱布、胶布、一截封着帽的延长管），附近一片针眼；后腿前面是取样的那块
  const cow = pivots.holstein;
  if (cow) {
    const parts = cow.children.filter((o) => o.isMesh && /short coat|stocking/i.test(o.material?.name || ''));
    const box = new THREE.Box3(); parts.forEach((o) => box.expandByObject(o));
    const at = (f, fy) => new THREE.Vector3(box.max.x + 0.6, box.min.y + (box.max.y - box.min.y) * fy, box.max.z - (box.max.z - box.min.z) * f);
    const left = new THREE.Vector3(-1, 0, 0);
    const neck = hit(parts, at(0.16, 0.62), left), neck2 = hit(parts, at(0.13, 0.5), left), flank = hit(parts, at(0.42, 0.55), left);
    if (neck) {
      cow.attach(stamp(neck.o, neck.p, neck.n, 0.13, decalMat(tapeTex(21)), UP, 0.012));
      const hub = new THREE.Group(); hub.position.copy(neck.p).addScaledVector(neck.n, 0.012); hub.lookAt(neck.p.clone().addScaledVector(neck.n, 1));
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.03, 10), new THREE.MeshStandardMaterial({ color: 0xd9b23a, roughness: 0.4 }));
      cap.rotation.x = Math.PI / 2; cap.position.set(0, -0.03, 0.01); hub.add(cap);
      const ext = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.015, 0.01), new THREE.Vector3(0.01, -0.07, 0.03), new THREE.Vector3(-0.01, -0.13, 0.02)]), 12, 0.0025, 6), new THREE.MeshStandardMaterial({ color: 0xe6e8e4, roughness: 0.3, transparent: true, opacity: 0.8 }));
      hub.add(ext); hall.add(hub); cow.attach(hub);
    }
    if (neck2) cow.attach(stamp(neck2.o, neck2.p, neck2.n, 0.16, decalMat(punctureTex(33)), UP, 0.012));
    if (flank) cow.attach(stamp(flank.o, flank.p, flank.n, 0.24, decalMat(biopsyTex('#e3d2c4', 17), { roughness: 0.4 }), UP, 0.012));
  }
  // 鸡：朝外那侧翅下贴着纱布，胸口一小片针眼和干了的血
  const hen = pivots.hen;
  if (hen) {
    const parts = hen.children.filter((o) => o.isMesh);
    const box = new THREE.Box3(); parts.forEach((o) => box.expandByObject(o));
    const from = (fy, fz) => new THREE.Vector3(box.min.x - 0.5, box.min.y + (box.max.y - box.min.y) * fy, box.min.z + (box.max.z - box.min.z) * fz);
    const right = new THREE.Vector3(1, 0, 0);
    const wing = hit(parts, from(0.5, 0.45), right), breast = hit(parts, from(0.32, 0.8), right);
    if (wing) hen.attach(stamp(wing.o, wing.p, wing.n, 0.09, decalMat(tapeTex(41)), UP, 0.01));
    if (breast) hen.attach(stamp(breast.o, breast.p, breast.n, 0.11, decalMat(punctureTex(43, 5)), UP, 0.01));
    // 笼底垫子上几滴干了的血
    const drops = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), decalMat(clear((g) => { sd = 61; bloodSplatter(g, 256, 256, 40, R, { dry: 0.8, drops: 18 }); bloodSplatter(g, 330, 180, 18, R, { dry: 0.95, smear: false, drops: 6 }); })));
    drops.rotation.x = -Math.PI / 2; drops.position.set(box.min.x + 0.05, box.min.y + 0.004, (box.min.z + box.max.z) / 2 + 0.08); hall.add(drops);
  }
}

// ------------------------------------------------------------------ 参观廊：墙脏、玻璃贴纸
export function dirtyCorridor(root) {
  const L = [0, Math.PI / 2, 0], Rt = [0, -Math.PI / 2, 0], B = [0, Math.PI, 0], F = [0, 0, 0];
  const d = (name, pos, rot, w, h, color, opacity, o = {}) => decal(name, root, { pos, rot, w, h, color, opacity, ...o });
  // 左墙（数据墙那面）：顶上渗下来的水痕、踢脚线一圈黑、凳子靠墙蹭出来的道子、屏幕底下一排手摸的灰
  d('Leaking005', [-4.996, 1.75, -0.45], L, 0.9, 2.5, 0x4a3e30, 0.6);
  d('Leaking010A', [-4.996, 2.25, 3.45], L, 1.1, 1.5, 0x54442e, 0.55);
  d('SurfaceImperfections009', [-4.995, 0.32, 1.5], L, 5.0, 0.64, 0x221e18, 0.75);
  d('Scratches003', [-4.994, 0.5, 3.1], L, 1.1, 0.42, 0x2e2822, 0.7);
  d('Smear006', [-4.993, 0.84, 1.6], L, 2.6, 0.3, 0x2a2620, 0.45);
  d('Rust001', [-4.994, 2.88, 0.5], L, 0.35, 0.5, 0x6a4a2e, 0.55);
  // 右墙：水渍、墙根、撕掉一张旧海报剩下的四角胶带和一块没晒褪色的框
  d('Leaking003', [4.996, 2.1, -0.5], Rt, 0.8, 1.8, 0x4c4032, 0.6);
  d('SurfaceImperfections003', [4.995, 0.3, 1.6], Rt, 5.0, 0.6, 0x221e18, 0.75);
  d('Leaking008', [4.996, 2.4, 3.3], Rt, 0.9, 1.3, 0x50442e, 0.5);
  const ghost = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.62), new THREE.MeshStandardMaterial({ color: 0xf2eee4, transparent: true, opacity: 0.18, depthWrite: false, roughness: 0.9 }));
  ghost.position.set(4.994, 1.55, 3.45); ghost.rotation.y = -Math.PI / 2; root.add(ghost);
  const tape = pbr('Tape002', 1, 1, { size: 1, roughness: 0.7, color: 0xd8d0b4 }); tape.transparent = true; tape.alphaTest = 0;
  for (const [dz, dy, a] of [[-0.21, 0.29, 0.6], [0.22, 0.3, -0.5], [-0.22, -0.3, -0.7], [0.2, -0.29, 0.4]]) {
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.025), tape); t.position.set(4.992, 1.55 + dy, 3.45 + dz); t.rotation.set(a, -Math.PI / 2, 0, 'YXZ'); root.add(t);
  }
  // 后墙：顶上一大片水渍、出口门把手边一圈手印、墙根
  d('Leaking007', [-0.6, 2.3, 3.996], B, 1.6, 1.4, 0x4c4032, 0.55);
  d('SurfaceImperfections003', [0.0, 0.3, 3.995], B, 10.0, 0.6, 0x221e18, 0.75);
  d('Fingerprints005', [3.12, 1.05, 3.93], B, 0.32, 0.4, 0x3a3630, 0.6);
  d('Scratches001', [1.4, 0.45, 3.994], B, 1.6, 0.5, 0x2a2620, 0.55);
  // 细胞库门边：推车撞出来的黑道子
  d('Scratches003', [-4.6, 0.35, -0.894], F, 1.0, 0.4, 0x2a2620, 0.7);
  d('Leaking009', [-3.75, 2.6, -0.894], F, 0.5, 0.7, 0x4c4032, 0.6);
}

// 玻璃上的小贴纸：贴在窗角、立柱边上、台面以下或罐子顶以上，不挡里面
function sticker(draw, w, h) { return clear(draw, Math.round(w * 1400), Math.round(h * 1400)); }
const peel = (g, W, H, size = 0.18) => { const s = Math.min(W, H) * size; g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(W, H - s); g.lineTo(W, H); g.lineTo(W - s, H); g.fill(); g.restore();
  g.fillStyle = 'rgba(240,240,232,.9)'; g.beginPath(); g.moveTo(W - s, H); g.lineTo(W, H - s); g.lineTo(W - s * 0.55, H - s * 0.55); g.fill(); };
const wear = (g, W, H, n = 40) => { g.save(); g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < n; i++) { g.fillStyle = `rgba(0,0,0,${rr(0.3, 0.9)})`; g.fillRect(R() * W, R() * H, rr(1, 4), rr(1, 3)); } for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.beginPath(); const x = R() * W, y = R() * H; g.moveTo(x, y); g.lineTo(x + rr(-40, 40), y + rr(-10, 10)); g.stroke(); } g.restore(); };
export function glassStickers(root) {
  sd = 77;
  const items = [
    { at: [-3.05, 1.02], w: 0.15, h: 0.15, draw: (g, W, H) => {
      g.fillStyle = '#efe9d8'; g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 2, 0, 7); g.fill(); g.strokeStyle = '#2e6b3a'; g.lineWidth = 8; g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 14, 0, 7); g.stroke();
      g.fillStyle = '#2e6b3a'; g.textAlign = 'center'; g.font = `800 34px ${SANS}`; g.fillText('FRESH', W / 2, H * 0.44); g.fillText('TODAY', W / 2, H * 0.62); g.font = `600 15px ${MONO}`; g.fillText('GROWN ON SITE', W / 2, H * 0.78); wear(g, W, H, 60); } },
    { at: [-1.62, 2.55], w: 0.36, h: 0.075, draw: (g, W, H) => {
      g.fillStyle = '#b3262d'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.font = `800 52px ${SANS}`; g.textBaseline = 'middle'; g.fillText('ZERO SLAUGHTER*', 22, H * 0.5);
      g.font = `500 15px ${MONO}`; g.fillStyle = 'rgba(255,255,255,.75)'; g.textAlign = 'right'; g.fillText('*terms apply', W - 14, H - 14); peel(g, W, H, 0.5); wear(g, W, H, 50); } },
    { at: [0.96, 0.98], w: 0.13, h: 0.1, draw: (g, W, H) => {
      g.fillStyle = '#f6d34a'; g.fillRect(0, 0, W, H); g.fillStyle = '#1b1b1b'; g.font = `800 22px ${SANS}`; g.textAlign = 'center';
      g.fillText('PLEASE', W / 2, H * 0.3); g.fillText("DON'T TAP", W / 2, H * 0.52); g.font = `600 14px ${SANS}`; g.fillText("THEY'RE GROWING", W / 2, H * 0.76); wear(g, W, H, 40); } },
    { at: [2.62, 2.52], w: 0.24, h: 0.12, draw: (g, W, H) => {
      g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, W, H); g.fillStyle = '#b3262d'; g.fillRect(0, 0, 18, H);
      g.fillStyle = '#141414'; g.font = `700 30px ${SANS}`; g.fillText('LOYALTY CARD', 36, H * 0.38); g.font = `400 21px ${SANS}`; g.fillText('10th cut on us.', 36, H * 0.62);
      for (let i = 0; i < 10; i++) { g.strokeStyle = '#141414'; g.lineWidth = 2; g.beginPath(); g.arc(46 + i * 27, H * 0.82, 9, 0, 7); g.stroke(); } peel(g, W, H, 0.3); wear(g, W, H, 30); } },
    { at: [3.28, 0.99], w: 0.17, h: 0.07, draw: (g, W, H) => {
      g.fillStyle = 'rgba(220,226,228,.92)'; g.fillRect(0, 0, W, H); g.strokeStyle = '#38506a'; g.lineWidth = 4; g.strokeRect(6, 6, W - 12, H - 12);
      g.fillStyle = '#38506a'; g.font = `700 22px ${MONO}`; g.fillText('CLEAN ROOM', 20, H * 0.42); g.font = `500 15px ${MONO}`; g.fillText('ISO 14644-1 · CLASS 7', 20, H * 0.7); g.fillText('EXP 03/24', W - 112, H * 0.42); wear(g, W, H, 90); } },
    { at: [4.6, 1.1], w: 0.12, h: 0.12, draw: (g, W, H) => {
      g.fillStyle = '#141414'; g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 2, 0, 7); g.fill(); g.fillStyle = '#f4f1ea'; g.textAlign = 'center';
      g.font = `800 20px ${SANS}`; g.fillText('BULK', W / 2, H * 0.42); g.fillText('ORDERS', W / 2, H * 0.58); g.font = `500 12px ${MONO}`; g.fillText('ASK STAFF', W / 2, H * 0.74); wear(g, W, H, 50); } },
  ];
  for (const s of items) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), new THREE.MeshStandardMaterial({ map: sticker(s.draw, s.w, s.h), transparent: true, depthWrite: false, roughness: 0.45 }));
    m.position.set(s.at[0], s.at[1], -0.988); m.rotation.z = rr(-0.04, 0.04); m.renderOrder = 8;
    root.add(m);
  }
}

// ------------------------------------------------------------------ 一摞单子：每张转一点、错开一点，有几张卷了角
const FORMS = [
  ['DAILY BIOPSY LOG', ['DONOR', 'SITE', 'NEEDLE', 'g', 'BY']], ['MEDIA PREP · BATCH SHEET', ['LOT', 'VOL', 'FBS %', 'pH', 'INIT']],
  ['CELL COUNT / VIABILITY', ['FLASK', 'P#', 'x10⁶', 'VIAB', 'NOTE']], ['SAMPLE TRANSFER NOTE', ['FROM', 'TO', 'TIME', 'TEMP', 'SIGN']],
  ['DONOR WEIGHT CHART', ['ID', 'MON', 'WED', 'FRI', 'Δ kg']], ['CLEANING ROTA · WARD', ['AREA', 'AGENT', 'TIME', 'DONE', 'INIT']],
];
const IDS = ['P-0932', 'B-0417', 'P-1077', 'G-0221', 'P-0101'];
function formTex(i, seed) {
  return canvasTexture(420, 594, (g, W, H) => {
    sd = seed; const [title, cols] = FORMS[i % FORMS.length];
    g.fillStyle = `rgb(${236 + rr(-6, 4)},${232 + rr(-6, 4)},${220 + rr(-8, 4)})`; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1d1f22'; g.font = `700 19px ${SANS}`; g.fillText(title, 26, 44); g.font = `400 10px ${MONO}`; g.fillStyle = '#6b6762'; g.fillText('FUTURE MEAT MARKET · PROCESSING · FORM ' + (12 + i), 26, 62);
    g.strokeStyle = 'rgba(30,30,30,.55)'; g.lineWidth = 1;
    for (let r = 0; r < 16; r++) { const y = 90 + r * 28; g.beginPath(); g.moveTo(26, y); g.lineTo(W - 26, y); g.stroke(); }
    cols.forEach((c, k) => { const x = 26 + k * (W - 52) / cols.length; g.beginPath(); g.moveTo(x, 90); g.lineTo(x, 90 + 15 * 28); g.stroke(); g.fillStyle = '#333'; g.font = `600 10px ${MONO}`; g.fillText(c, x + 4, 84); });
    g.fillStyle = 'rgba(28,38,110,.85)'; g.font = `400 13px ${HAND}`;
    for (let r = 0; r < 6 + (seed % 7); r++) { const y = 110 + r * 28; g.fillText(IDS[(r + i) % 5], 32, y); g.fillText(String(Math.floor(rr(1, 99))), 32 + (W - 52) / cols.length * 2, y); g.fillText(R() > 0.5 ? '✓' : 'JD', W - 70, y); }
    if (R() > 0.5) { g.strokeStyle = 'rgba(110,70,30,.35)'; g.lineWidth = 5; g.beginPath(); g.arc(rr(120, 320), rr(200, 480), 34, 0, 7); g.stroke(); }   // 杯底印
    if (R() > 0.6) bloodSplatter(g, rr(60, 360), rr(120, 560), 5, R, { dry: 0.9, smear: false, drops: 3 });
    for (let k = 0; k < 2; k++) { g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(14, 200 + k * 200, 5, 0, 7); g.fill(); }      // 打孔
  });
}
export function paperStack(root, { x, z, y, n = 7, seed = 1, spread = 0.035, turn = 0.25, base = 0 }) {
  sd = seed * 13;
  const paper = pbr('Paper005', 0.21, 0.297, { size: 0.3, roughness: 0.85 });
  for (let i = 0; i < n; i++) {
    const geo = new THREE.PlaneGeometry(0.21, 0.297, 6, 8).rotateX(-Math.PI / 2), p = geo.attributes.position;
    const curl = R() < 0.45 ? rr(0.004, 0.016) : 0, corner = R() < 0.5 ? 1 : -1;
    for (let k = 0; k < p.count; k++) { const u = (p.getX(k) / 0.21 + 0.5) * corner, v = p.getZ(k) / 0.297 + 0.5; p.setY(k, curl * Math.max(0, u + v - 1.1) ** 2 * 4 + Math.sin(v * 3 + i) * 0.0006); }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: formTex(i + seed, seed * 31 + i), normalMap: paper.normalMap, roughness: 0.85 }));
    m.position.set(x + rr(-spread, spread), y + base + i * 0.0009, z + rr(-spread, spread)); m.rotation.y = rr(-turn, turn);
    root.add(m);
  }
}

// 车间墙上的水痕和墙根的脏（后墙往里推过，z 用的是推过以后的位置）
export function dirtyHall(hall, backZ) {
  sd = 5;
  for (const x of [-6.2, -2.4, 1.6, 5.3]) decal(['Leaking004', 'Leaking006', 'Leaking011A', 'Leaking007'][Math.floor(R() * 4)], hall, { pos: [x, 2.6, backZ + 0.01], w: rr(1.0, 1.6), h: rr(1.6, 2.4), color: 0x3a3226, opacity: 0.65 });
  decal('SurfaceImperfections009', hall, { pos: [0, 0.4, backZ + 0.012], w: 17.5, h: 0.8, color: 0x1a1812, opacity: 0.75 });
  for (const [x, ry] of [[-8.995, Math.PI / 2], [8.995, -Math.PI / 2]]) {
    decal('Leaking010A', hall, { pos: [x, 2.3, -7.5], rot: [0, ry, 0], w: 1.4, h: 2.0, color: 0x3a3226, opacity: 0.6 });
    decal('SurfaceImperfections003', hall, { pos: [x, 0.35, -7.5], rot: [0, ry, 0], w: 10, h: 0.7, color: 0x1a1812, opacity: 0.7 });
  }
}
