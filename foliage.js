// Foliage built from leaf cards: every leaf is a cut-out of a real leaf shape (ivy, plane tree, small shrub leaves,
// grass blades) drawn once into an alpha texture, then scattered as instances with their own size, tilt and colour.
// Sizes are real: ivy leaves 4–9 cm, plane-tree leaves 12–22 cm, a street plane tree 7–9 m tall.
import * as THREE from 'three';

const R = (n) => () => (n = (n * 16807) % 2147483647) / 2147483647;

function leafTexture(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), W = 256, cx = 128;
  g.clearRect(0, 0, W, W);
  const path = new Path2D();
  if (kind === 'ivy' || kind === 'plane') {
    // palmate leaf: five lobes, stem at the bottom centre
    const lobes = kind === 'ivy' ? [[-1.25, .62], [-.62, .9], [0, 1], [.62, .9], [1.25, .62]] : [[-1.35, .7], [-.68, .92], [0, 1], [.68, .92], [1.35, .7]];
    const base = [cx, 236], pts = [];
    lobes.forEach(([a, r], i) => {
      const ang = -Math.PI / 2 + a * .78, L = 112 * r;
      const tip = [cx + Math.cos(ang) * L, 150 + Math.sin(ang) * L];
      const nxt = lobes[i + 1];
      pts.push({ tip, sinus: nxt ? (() => { const am = -Math.PI / 2 + (a + nxt[0]) / 2 * .78, Ls = L * (kind === 'ivy' ? .55 : .42); return [cx + Math.cos(am) * Ls, 150 + Math.sin(am) * Ls]; })() : null });
    });
    path.moveTo(...base);
    path.quadraticCurveTo(cx - 70, 220, pts[0].tip[0], pts[0].tip[1]);
    pts.forEach((p, i) => { if (p.sinus) { path.quadraticCurveTo(p.sinus[0], p.sinus[1] + 6, pts[i + 1].tip[0], pts[i + 1].tip[1]); } });
    path.quadraticCurveTo(cx + 70, 220, ...base);
  } else if (kind === 'grass') {
    let n = 7; const r = R(n);
    for (let i = 0; i < 9; i++) { const x = 40 + r() * 176, lean = (r() - .5) * 120, h = 140 + r() * 110; path.moveTo(x - 5, 256); path.quadraticCurveTo(x + lean * .3, 256 - h * .6, x + lean, 256 - h); path.quadraticCurveTo(x + lean * .3 + 3, 256 - h * .6, x + 5, 256); }
  } else {
    // small elliptic leaf (box, geranium-ish shrub)
    path.moveTo(cx, 240); path.bezierCurveTo(cx - 95, 190, cx - 80, 40, cx, 14); path.bezierCurveTo(cx + 80, 40, cx + 95, 190, cx, 240);
  }
  g.save(); g.clip(path);
  const gr = g.createLinearGradient(0, 0, W, W);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#b8b8b8');
  g.fillStyle = gr; g.fillRect(0, 0, W, W);
  if (kind !== 'grass') {
    g.strokeStyle = kind === 'ivy' ? 'rgba(255,255,240,.75)' : 'rgba(255,255,230,.45)'; g.lineWidth = 3;
    const veins = kind === 'small' ? [[cx, 14]] : [[cx, 40], [40, 110], [216, 110], [70, 60], [186, 60]];
    for (const [x, y] of veins) { g.beginPath(); g.moveTo(cx, 236); g.lineTo(x, y); g.stroke(); }
    let n = kind.length * 31; const r = R(n);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(0,0,0,${r() * .08})`; g.fillRect(r() * W, r() * W, 2 + r() * 6, 2 + r() * 6); }
  }
  g.restore();
  g.lineWidth = 3; g.strokeStyle = 'rgba(40,40,40,.5)'; g.stroke(path);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const MATS = {};
function leafMat(kind) {
  if (MATS[kind]) return MATS[kind];
  const m = new THREE.MeshStandardMaterial({ map: leafTexture(kind), alphaTest: 0.45, side: THREE.DoubleSide, roughness: kind === 'ivy' ? 0.42 : 0.75, metalness: 0, envMapIntensity: kind === 'ivy' ? 1.2 : 0.6 });
  return (MATS[kind] = m);
}
// a leaf card with a gentle cup, pivot at the stalk
const LEAF = (() => { const g = new THREE.PlaneGeometry(1, 1, 2, 2); g.translate(0, 0.5, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, -Math.abs(p.getX(i)) * 0.25 + p.getY(i) * 0.08); g.computeVertexNormals(); return g; })();
const GRASS = (() => { const a = new THREE.PlaneGeometry(1, 1); a.translate(0, 0.5, 0); const b = a.clone(); b.rotateY(Math.PI / 2); const m = new THREE.BufferGeometry(); m.copy(a); return { a, b }; })();

// Collect leaves, then turn them into one InstancedMesh per material.
class Leaves {
  constructor(kind) { this.kind = kind; this.list = []; }
  add(pos, size, rot, color) { this.list.push([pos, size, rot, color]); }
  build(parent, geo = LEAF) {
    if (!this.list.length) return null;
    const m = new THREE.InstancedMesh(geo, leafMat(this.kind), this.list.length), o = new THREE.Object3D(), c = new THREE.Color();
    this.list.forEach(([p, s, r, col], i) => { o.position.copy(p); o.rotation.copy(r); o.scale.setScalar(s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, c.set(col)); });
    m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; m.computeBoundingSphere();
    m.castShadow = false; m.userData.keep = true; parent.add(m); return m;
  }
}
const IVY_COL = ['#2c4a22', '#34552a', '#3e5e2e', '#2a3f20', '#4a6a34', '#24381c'];
const stemMat = new THREE.MeshStandardMaterial({ color: 0x3a3020, roughness: 0.9 });

// Ivy trailing from a planter or a balcony: several strands hang and sway in front of the wall (+z).
export function ivy(parent, { x, y, z, len = 0.9, strands = 4, spread = 0.6, seed = 1, wallZ = null }) {
  const r = R(seed * 977 + 3), L = new Leaves('ivy'), tubes = [];
  for (let k = 0; k < strands; k++) {
    const ox = (r() - .5) * spread, l = len * (.5 + r() * .7), pts = [];
    const n = Math.max(3, Math.round(l / .12));
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push(new THREE.Vector3(x + ox + Math.sin(t * 5 + k) * .05 + (r() - .5) * .02, y - t * l, z + .02 + t * .03 * (wallZ === null ? 1 : 0) + Math.sin(t * 3 + k) * .02)); }
    const curve = new THREE.CatmullRomCurve3(pts);
    tubes.push(new THREE.Mesh(new THREE.TubeGeometry(curve, n * 3, .0035, 4, false), stemMat));
    const count = Math.round(l / .035);
    for (let i = 0; i < count; i++) {
      const t = i / count, p = curve.getPoint(t), side = i % 2 ? 1 : -1;
      p.x += side * .015; p.z += .01;
      const s = (.045 + r() * .045) * (1.15 - t * .5);
      L.add(p, s, new THREE.Euler(-.25 - r() * .7, side * (.3 + r() * .6), side * (.4 + r() * .9) + Math.PI), IVY_COL[Math.floor(r() * IVY_COL.length)]);
    }
  }
  for (const t of tubes) parent.add(t);
  return L.build(parent);
}

// A mounded planting: shrub leaves filling a trough or pot, with optional flower heads.
export function shrub(parent, { x, y, z, w = 1, d = .3, h = .35, n = 160, seed = 1, kind = 'small', flowers = 0, tone = ['#2e4a24', '#3a5a2c', '#466a34', '#2a4020'] }) {
  const r = R(seed * 613 + 7), L = new Leaves(kind);
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1, v = r() * 2 - 1, mound = 1 - (u * u + v * v) * .5;
    const p = new THREE.Vector3(x + u * w / 2, y + r() * h * Math.max(.2, mound), z + v * d / 2);
    L.add(p, (kind === 'ivy' ? .06 : .05) + r() * .04, new THREE.Euler(-Math.PI / 2 + r() * 1.2, r() * 6.28, (r() - .5) * .8), tone[Math.floor(r() * tone.length)]);
  }
  const m = L.build(parent);
  if (flowers) {
    const F = new Leaves('small'), cols = ['#c8302a', '#d84a3a', '#b02424', '#e8d8c8'];
    for (let i = 0; i < flowers; i++) {
      const cx = x + (r() - .5) * w * .9, cy = y + h * (.7 + r() * .4), cz = z + (r() - .5) * d * .8, col = cols[Math.floor(r() * 4)];
      for (let k = 0; k < 6; k++) F.add(new THREE.Vector3(cx + (r() - .5) * .03, cy + (r() - .5) * .02, cz + (r() - .5) * .03), .022 + r() * .01, new THREE.Euler(-Math.PI / 2 + (r() - .5), k * 1.05, 0), col);
    }
    F.build(parent);
  }
  return m;
}

// Tufts of grass and weeds in pavement joints, at the kerb and the foot of walls.
export function weeds(parent, points, seed = 1) {
  const r = R(seed * 331 + 11), A = new Leaves('grass'), B = new Leaves('grass');
  const cols = ['#4a5a2a', '#5a6a30', '#6a6a38', '#3a4a22', '#7a7040'];
  for (const [x, y, z, s = 1] of points) {
    const k = 1 + Math.floor(r() * 3);
    for (let i = 0; i < k; i++) {
      const p = new THREE.Vector3(x + (r() - .5) * .08 * s, y, z + (r() - .5) * .08 * s), sz = (.08 + r() * .12) * s, rot = new THREE.Euler(0, r() * 6.28, (r() - .5) * .3), col = cols[Math.floor(r() * cols.length)];
      A.add(p, sz, rot, col); B.add(p, sz, rot, col);
    }
  }
  A.build(parent, GRASS.a); B.build(parent, GRASS.b);
}

// Mottled London-plane bark: grey-olive and cream patches where the bark has flaked.
let barkTex = null;
function bark() {
  if (barkTex) return barkTex;
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d'), r = R(41);
  g.fillStyle = '#6a6a58'; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 140; i++) { const col = ['#8a8a70', '#b8b08a', '#5a5a48', '#9a9478', '#c8c09a', '#4a4a3c'][Math.floor(r() * 6)]; g.fillStyle = col; g.beginPath();
    const x = r() * 256, y = r() * 512, w = 12 + r() * 40, h = 20 + r() * 70; g.moveTo(x, y); for (let k = 1; k < 8; k++) { const a = k / 8 * Math.PI * 2; g.lineTo(x + Math.cos(a) * w * (.6 + r() * .5), y + Math.sin(a) * h * (.6 + r() * .5)); } g.fill(); }
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${r() * .12})`; g.fillRect(r() * 256, r() * 512, 1 + r() * 3, 2 + r() * 8); }
  barkTex = new THREE.CanvasTexture(c); barkTex.colorSpace = THREE.SRGBColorSpace; barkTex.wrapS = barkTex.wrapT = THREE.RepeatWrapping;
  return barkTex;
}
const NOV = ['#5a6a2a', '#6a7a30', '#8a8a34', '#a8902e', '#b87a2a', '#7a5a24', '#4a5a26', '#9a6a2a'];   // late November: still green inside, yellow-brown outside

// A street plane tree, pollarded the way councils keep them: trunk, a crown of limbs, twigs, leaf clusters at the tips.
export function planeTree(parent, { x, y = 0, z, h = 8, seed = 1, sparse = 0.75 }) {
  const r = R(seed * 1301 + 5), g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const bm = new THREE.MeshStandardMaterial({ map: bark(), roughness: .95, color: 0x8a8678 });
  const geos = [], tips = [];
  const limb = (a, b, r0, r1, depth) => {
    const mid = a.clone().lerp(b, .5).add(new THREE.Vector3((r() - .5) * .3, (r() - .5) * .2, (r() - .5) * .3));
    const curve = new THREE.CatmullRomCurve3([a, mid, b]);
    const tg = new THREE.TubeGeometry(curve, 8, 1, 7, false), p = tg.attributes.position, nrm = tg.attributes.normal;
    // taper: rebuild radius along the tube
    for (let i = 0; i < p.count; i++) { const seg = Math.floor(i / 8) / 8, cp = curve.getPoint(Math.min(1, seg)), rad = r0 + (r1 - r0) * seg; p.setXYZ(i, cp.x + nrm.getX(i) * rad, cp.y + nrm.getY(i) * rad, cp.z + nrm.getZ(i) * rad); }
    tg.computeVertexNormals(); const uv = tg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 4, uv.getY(i));
    geos.push(tg);
    if (depth === 0) { tips.push(b); return; }
    const dir = b.clone().sub(a).normalize(), n = depth === 3 ? 4 : 2 + Math.floor(r() * 2);
    for (let k = 0; k < n; k++) {
      const len = b.distanceTo(a) * (.55 + r() * .25), yaw = r() * 6.28, out = .5 + r() * .5;
      const d = dir.clone().add(new THREE.Vector3(Math.cos(yaw) * out, .45 + r() * .4, Math.sin(yaw) * out)).normalize();
      limb(b, b.clone().addScaledVector(d, len), r1, Math.max(.012, r1 * .6), depth - 1);
    }
  };
  const trunkTop = new THREE.Vector3((r() - .5) * .3, h * .38, (r() - .5) * .3);
  limb(new THREE.Vector3(0, 0, 0), trunkTop, .2, .15, 4);
  for (const geo of geos) g.add(new THREE.Mesh(geo, bm));
  const L = new Leaves('plane');
  for (const t of tips) {
    const n = Math.round(52 * sparse + r() * 16);
    for (let i = 0; i < n; i++) {
      const p = t.clone().add(new THREE.Vector3((r() - .5) * 1.1, (r() - .45) * .8, (r() - .5) * 1.1));
      L.add(p, .15 + r() * .1, new THREE.Euler(-.4 - r() * 1.4, r() * 6.28, (r() - .5) * 1.2), NOV[Math.floor(r() * NOV.length)]);
    }
  }
  L.build(g);
  // tree pit: cast-iron grate set in the pavement
  const grate = new THREE.MeshStandardMaterial({ color: 0x1e2020, metalness: .8, roughness: .55 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(.26, .6, 24, 1), grate); ring.rotation.x = -Math.PI / 2; ring.position.y = .004; g.add(ring);
  for (let k = 0; k < 16; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(.012, .01, .32), grate); const a = k / 16 * Math.PI * 2; s.position.set(Math.sin(a) * .43, .008, Math.cos(a) * .43); s.rotation.y = a; g.add(s); }
  const soil = new THREE.Mesh(new THREE.CircleGeometry(.6, 24), new THREE.MeshStandardMaterial({ color: 0x241c14, roughness: 1 })); soil.rotation.x = -Math.PI / 2; soil.position.y = .002; g.add(soil);
  return g;
}

// Fallen leaves stuck flat to wet ground.
export function fallenLeaves(parent, { x, y, z, rx = 1, rz = 1, n = 60, seed = 1, kind = 'plane' }) {
  const r = R(seed * 89 + 17), L = new Leaves(kind);
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28, d = Math.sqrt(r());
    L.add(new THREE.Vector3(x + Math.cos(a) * d * rx, y + .002 + i * .00002, z + Math.sin(a) * d * rz), (kind === 'plane' ? .1 : .05) + r() * .06, new THREE.Euler(-Math.PI / 2, 0, r() * 6.28), ['#7a5a24', '#9a6a2a', '#6a4a20', '#8a7a34', '#5a4018'][Math.floor(r() * 5)]);
  }
  const m = L.build(parent);
  if (m) { m.material = m.material.clone(); m.material.roughness = .35; m.material.polygonOffset = true; m.material.polygonOffsetFactor = -2; }
  return m;
}
