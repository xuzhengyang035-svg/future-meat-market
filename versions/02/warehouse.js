// 仓库 (参考 Star Citizen 的货架仓库 + 帆布棚里的地下实验室）.
// 一个地下培养肉作坊真正需要的东西都在这里，但箱子上写的都是“速冻水饺”“冷冻海鲜”：
//   · 胎牛血清 (FBS）：从屠宰时怀孕母牛腹中的胎牛身上采集，要 −20 ℃ 冷冻保存
//   · 培养基、生长因子：一袋一袋的一次性培养袋
//   · 大豆蛋白支架原料：成吨的麻袋
//   · 细胞库：冷库里的液氮罐，−196 ℃
//   · CO₂ 气瓶 (培养箱要用）
//   · 角落里几个空的动物运输笼——原代细胞传几十代就会衰老，必须定期回到活体动物身上重新取样
import * as THREE from 'three';
import { canvasTexture } from './textures.js';
import { corrugatedMaps, grimeFloorMaps, grimeMap, ageCanvas, blobShadow } from './materials.js';

const SANS = '"Inter", "Noto Sans SC", "Microsoft YaHei", sans-serif';

function box(w, h, d, m, x, y, z, p) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); p.add(o); return o; }
function cyl(rt, rb, h, m, x, y, z, p, seg = 20) { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x, y, z); p.add(o); return o; }
function plane(w, h, mat, x, y, z, ry, p) { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); o.position.set(x, y, z); o.rotation.y = ry; p.add(o); return o; }
const lit = (map, o = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.85, ...o });

// 纸箱侧面的印字 (伪装成冻品）
const labelCache = {};
function cartonLabel(kind) {
  if (labelCache[kind]) return labelCache[kind];
  const L = {
    dumpling: ['#c4a032', '#9a2422', 'Frozen dumplings', 'Pork & cabbage · 20 kg/case · −18 °C'],
    seafood: ['#2a5a7a', '#fff', 'Frozen seafood', 'Hairtail pieces · 15 kg/case · −18 °C'],
    fbs: ['#d8d4c4', '#9a2422', 'FBS fetal bovine serum', '500 mL × 24 · −20 °C · keep upright'],
    soy: ['#8a7a5a', '#2a2420', 'Soy protein isolate', 'Food grade · 25 kg'],
    media: ['#e0e0d8', '#2a4a6a', 'Medium DMEM/F12', 'Single-use culture bags 50 L × 4'],
    gf: ['#e8e4d8', '#6a2a5a', 'Recombinant growth factor bFGF', 'Cold chain 2–8 °C · lab use'],
  }[kind];
  const t = canvasTexture(256, 160, (g, W, H) => {
    g.fillStyle = '#8a6e4e'; g.fillRect(0, 0, W, H);
    g.fillStyle = L[0]; g.fillRect(14, 22, W - 28, H - 44);
    g.fillStyle = L[1]; g.font = `700 36px ${SANS}`; g.textAlign = 'center'; g.fillText(L[2], W / 2, 76);
    g.font = `400 16px ${SANS}`; g.fillText(L[3], W / 2, 108);
    ageCanvas(g, W, H, { amount: 1.2, seed: kind.length * 7, drips: false });
  });
  labelCache[kind] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
  return labelCache[kind];
}

export function createWarehouse(env) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e100f);
  scene.fog = new THREE.FogExp2(0x2a2620, 0.05);                         // 仓库里灰蒙蒙的、带点暖色的尘雾
  scene.environment = env;
  scene.environmentIntensity = 0.22;
  const root = new THREE.Group(); scene.add(root);
  let rs = 9; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;

  const M = {
    rackRed: new THREE.MeshStandardMaterial({ color: 0x7a2a22, roughness: 0.55, metalness: 0.5, map: grimeMap(50) }),
    rackDark: new THREE.MeshStandardMaterial({ color: 0x2c2e2c, roughness: 0.55, metalness: 0.5, map: grimeMap(51) }),
    pallet: new THREE.MeshStandardMaterial({ color: 0x7a6448, roughness: 0.95, map: grimeMap(52) }),
    carton: new THREE.MeshStandardMaterial({ color: 0x8a6e4e, roughness: 0.95, map: grimeMap(53) }),
    tape: new THREE.MeshStandardMaterial({ color: 0xa89a74, roughness: 0.5 }),
    crateBlue: new THREE.MeshStandardMaterial({ color: 0x2a4a6a, roughness: 0.6, map: grimeMap(54) }),
    crateGrey: new THREE.MeshStandardMaterial({ color: 0x4a4c4a, roughness: 0.6, map: grimeMap(55) }),
    bag: new THREE.MeshPhysicalMaterial({ color: 0xd8dcd4, roughness: 0.25, clearcoat: 0.6, map: grimeMap(56) }),
    sack: new THREE.MeshStandardMaterial({ color: 0x9a8a68, roughness: 1, map: grimeMap(57) }),
    steel: new THREE.MeshStandardMaterial({ color: 0x9a9c96, roughness: 0.4, metalness: 0.85, map: grimeMap(58) }),
    co2: new THREE.MeshStandardMaterial({ color: 0x2e3a36, roughness: 0.5, metalness: 0.5, map: grimeMap(59) }),
    fork: new THREE.MeshStandardMaterial({ color: 0x8a2a20, roughness: 0.5, metalness: 0.4, map: grimeMap(60) }),
    straw: new THREE.MeshStandardMaterial({ color: 0x9a8448, roughness: 1 }),
    tarp: new THREE.MeshStandardMaterial({ color: 0x2a4a5a, roughness: 0.9, side: THREE.DoubleSide, map: grimeMap(61) }),
    strip: new THREE.MeshPhysicalMaterial({ color: 0xa8b090, roughness: 0.3, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }),
    tube: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.5, 2.2) }),
    deadTube: new THREE.MeshStandardMaterial({ color: 0x6a6a64, roughness: 0.4 }),
    paint: new THREE.MeshStandardMaterial({ color: 0xb8a030, roughness: 0.7 }),
    paintG: new THREE.MeshStandardMaterial({ color: 0x3a7a4a, roughness: 0.7 }),
    warn: new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.4, 0.2) }),
  };

  // ---------------------------------------------------------------- 地面、墙、顶：水泥地 + 地面标线，瓦楞铁皮墙，很高的顶
  const fl = grimeFloorMaps('warehouse', { base: [96, 92, 84], seed: 91, gloss: 1.4 });
  const fm = new THREE.MeshStandardMaterial({ map: fl.map.clone(), roughnessMap: fl.roughnessMap.clone(), normalMap: fl.normalMap.clone(), roughness: 1, normalScale: new THREE.Vector2(0.4, 0.4) });
  for (const t of [fm.map, fm.roughnessMap, fm.normalMap]) { t.repeat.set(16 / 3.2, 20 / 3.2); t.needsUpdate = true; }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 20), fm); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -5); floor.receiveShadow = true; root.add(floor);
  const line = (x, z, w, d, m = M.paint) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.004, z); root.add(l); };
  line(-2.2, -5, 0.1, 18); line(2.2, -5, 0.1, 18); line(0, -5, 0.08, 18, M.paintG);
  for (let z = 2; z > -14; z -= 1.2) line(0, z, 0.5, 0.08, M.paint);
  const arrow = canvasTexture(256, 128, (g, W, H) => { g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(200,180,80,.75)'; g.font = `700 44px ${SANS}`; g.textAlign = 'center'; g.fillText('IN ↑  OUT ↓', W / 2, 78); });
  const ar = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshStandardMaterial({ map: arrow, transparent: true, roughness: 0.9 })); ar.rotation.x = -Math.PI / 2; ar.position.set(1.1, 0.006, 0.3); root.add(ar);
  const cw = corrugatedMaps([88, 90, 86], 'whwall');
  const wallMat = (rep) => { const m = new THREE.MeshStandardMaterial({ map: cw.map.clone(), normalMap: cw.normalMap.clone(), roughness: 0.7, metalness: 0.35 }); for (const t of [m.map, m.normalMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, 1); t.needsUpdate = true; } return m; };
  box(16, 7, 0.2, wallMat(8), 0, 3.5, -15.1, root);
  box(0.2, 7, 20, wallMat(10), -8.1, 3.5, -5, root);
  box(0.2, 7, 20, wallMat(10), 8.1, 3.5, -5, root);
  box(16, 7, 0.2, wallMat(8), 0, 3.5, 5.1, root);
  box(16, 0.2, 20, new THREE.MeshStandardMaterial({ color: 0x1a1c1b, roughness: 1 }), 0, 7.1, -5, root);
  for (let z = 4; z > -15; z -= 3) box(16, 0.35, 0.25, M.rackDark, 0, 6.7, z, root);   // 屋顶钢梁
  // 顶上一排排的灯管 (有几根不亮）
  const lights = [];
  for (let z = 2; z > -14; z -= 3.2) for (const x of [-4.5, 0, 4.5]) {
    const dead = (x === 4.5 && z < -6) || (x === 0 && Math.abs(z + 4.4) < 0.1);
    box(1.4, 0.05, 0.12, M.rackDark, x, 6.3, z, root);
    box(1.3, 0.03, 0.05, dead ? M.deadTube : M.tube, x, 6.26, z, root);
    if (!dead && x !== 0) { const l = new THREE.PointLight(0xe8dcc0, 16, 12, 1.6); l.position.set(x, 6.0, z); root.add(l); lights.push(l); }
  }

  // ---------------------------------------------------------------- 重型货架：红色立柱、深色横梁，托盘上堆着伪装成冻品的箱子
  const pallet = (x, y, z, p = root) => { box(1.1, 0.12, 1.0, M.pallet, x, y + 0.06, z, p); };
  const carton = (x, y, z, w, h, d, kind, ry = 0, p = root) => {
    const b = box(w, h, d, M.carton, x, y + h / 2, z, p); b.rotation.y = ry;
    box(w + 0.002, 0.004, 0.06, M.tape, 0, h / 2 + 0.001, 0, b);
    if (kind) { const l = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, h * 0.8), cartonLabel(kind)); l.position.z = d / 2 + 0.002; b.add(l); }
    return b;
  };
  const rack = (x, z, ry, fill) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    const W = 3.4, D = 1.2, H = 5.2, levels = [0.15, 1.75, 3.35];
    for (const xx of [-W / 2, W / 2]) for (const zz of [-D / 2, D / 2]) box(0.1, H, 0.1, M.rackRed, xx, H / 2, zz, g);
    for (const xx of [-W / 2, W / 2]) for (let y = 0.6; y < H; y += 0.9) { const br = box(0.04, 0.04, D * 1.15, M.rackDark, xx, y, 0, g); br.rotation.x = 0.6; }
    for (const y of levels) for (const zz of [-D / 2, D / 2]) box(W, 0.12, 0.08, M.rackDark, 0, y + 0.06, zz, g);
    for (const y of levels) for (const xx of [-0.85, 0.85]) {
      pallet(xx, y, 0, g);
      fill(g, xx, y + 0.12);
    }
    return g;
  };
  const stack = (kinds) => (g, xx, y) => {
    const k = kinds[Math.floor(rnd() * kinds.length)];
    if (k === 'bag') {                                                     // 一次性培养袋 (白色、鼓from来的软袋）
      for (let i = 0; i < 2; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 10), M.bag); b.scale.set(0.95, 0.28, 0.85); b.position.set(xx, y + 0.14 + i * 0.26, 0); g.add(b); }
      const t = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.14), cartonLabel('media')); t.position.set(xx, y + 0.3, 0.44); g.add(t);
    } else if (k === 'sack') {
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), M.sack); s.scale.set(1.5, 0.45, 0.9); s.position.set(xx + (j - 0.5) * 0.5, y + 0.12 + i * 0.25, 0); s.rotation.y = rnd() * 0.3; g.add(s); }
    } else if (k === 'crate') {
      for (let i = 0; i < 2; i++) box(0.9, 0.5, 0.8, i ? M.crateGrey : M.crateBlue, xx, y + 0.25 + i * 0.5, 0, g);
    } else if (k === 'empty') {
      if (rnd() < 0.5) carton(xx + 0.2, y, 0.1, 0.45, 0.3, 0.4, 'dumpling', 0.3, g);
    } else {
      const n = 2 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) carton(xx + (j - 0.5) * 0.5, y + i * 0.36, (rnd() - 0.5) * 0.06, 0.48, 0.34, 0.9, (i + j) % 2 ? k : null, (rnd() - 0.5) * 0.08, g);
    }
  };
  rack(-5.6, -1.5, Math.PI / 2, stack(['dumpling', 'dumpling', 'seafood', 'empty']));
  rack(-5.6, -5.6, Math.PI / 2, stack(['fbs', 'fbs', 'dumpling', 'crate']));
  rack(-5.6, -9.7, Math.PI / 2, stack(['sack', 'soy', 'crate', 'empty']));
  rack(5.6, -2.5, -Math.PI / 2, stack(['bag', 'bag', 'gf', 'empty']));
  rack(5.6, -6.6, -Math.PI / 2, stack(['bag', 'media', 'seafood', 'crate']));
  // 一箱被拆开的“速冻水饺”：里面是一瓶瓶胎牛血清
  const opened = new THREE.Group(); opened.position.set(-3.6, 0, -5.0); opened.rotation.y = 0.4; root.add(opened);
  pallet(0, 0, 0, opened);
  carton(0.15, 0.12, 0.1, 0.5, 0.34, 0.9, 'dumpling', 0, opened);
  const ob = carton(-0.3, 0.12, -0.05, 0.5, 0.34, 0.9, 'fbs', 0.2, opened);
  const flap = box(0.5, 0.006, 0.3, M.carton, -0.3, 0.47, 0.42, opened); flap.rotation.x = -1.2;
  const fbsMat = new THREE.MeshPhysicalMaterial({ color: 0xc8962a, roughness: 0.2, transmission: 0.3, transparent: true, opacity: 0.9 });
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { cyl(0.04, 0.04, 0.16, fbsMat, -0.42 + i * 0.12, 0.54, 0.0 + j * 0.12, opened, 12); cyl(0.025, 0.025, 0.03, M.crateBlue, -0.42 + i * 0.12, 0.635, 0.0 + j * 0.12, opened, 10); }
  // 冷柜 (−20 ℃，放血清）
  for (let i = 0; i < 2; i++) {
    const fz = new THREE.Group(); fz.position.set(-6.9, 0, 2.2 - i * 1.0); fz.rotation.y = Math.PI / 2; root.add(fz);
    box(0.9, 0.9, 0.7, new THREE.MeshStandardMaterial({ color: 0xc8c8be, roughness: 0.5, map: grimeMap(62 + i) }), 0, 0.45, 0, fz);
    box(0.92, 0.04, 0.72, M.rackDark, 0, 0.92, 0, fz);
    const dl = canvasTexture(160, 60, (g, W, H) => { g.fillStyle = '#111'; g.fillRect(0, 0, W, H); g.fillStyle = '#e04030'; g.font = `700 40px monospace`; g.fillText('-20.4', 14, 44); });
    plane(0.16, 0.06, new THREE.MeshBasicMaterial({ map: dl }), 0.3, 0.75, 0.352, 0, fz);
  }

  // ---------------------------------------------------------------- 冷库 (细胞库）：PVC 门帘、液氮罐、温度表
  const cold = new THREE.Group(); cold.position.set(1.0, 0, -13.0); root.add(cold);
  box(6.5, 3.4, 4.0, new THREE.MeshStandardMaterial({ color: 0xb8bab4, roughness: 0.5, metalness: 0.2, map: grimeMap(64) }), 0, 1.7, 0, cold);
  box(1.8, 2.5, 0.05, new THREE.MeshStandardMaterial({ color: 0x0a0c0c, roughness: 1 }), 0, 1.25, 2.01, cold);
  for (let i = 0; i < 8; i++) { const s = plane(0.24, 2.45, M.strip, -0.84 + i * 0.24, 1.25, 2.06, (rnd() - 0.5) * 0.15, cold); }
  const coldSign = canvasTexture(512, 160, (g, W, H) => { g.fillStyle = '#d8d4c4'; g.fillRect(0, 0, W, H); g.fillStyle = '#1a3a6a'; g.font = `700 60px ${SANS}`; g.textAlign = 'center'; g.fillText('Cold room · staff only', W / 2, 78); g.font = `400 28px ${SANS}`; g.fillStyle = '#9a2422'; g.fillText('Cell bank MCB-07 · liquid nitrogen −196 °C · asphyxiation hazard', W / 2, 126); ageCanvas(g, W, H, { amount: 1.2, seed: 13, drips: false }); });
  plane(1.8, 0.56, lit(coldSign), 0, 2.85, 2.02, 0, cold);
  box(0.3, 0.04, 0.2, M.warn, 1.2, 2.7, 2.08, cold);                       // 门上的红色警示灯
  const warnL = new THREE.PointLight(0xff4020, 1.5, 3.5, 2); warnL.position.set(1.2, 2.6, 2.3); cold.add(warnL);
  const coldLight = new THREE.PointLight(0xb8e0ff, 3, 4, 2); coldLight.position.set(0, 1.4, 1.2); cold.add(coldLight);   // 门帘后面透出的冷光
  const dewar = (x, z, s = 1) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); root.add(g);
    cyl(0.32, 0.32, 1.2, M.steel, 0, 0.65, 0, g, 24);
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.steel); d.position.y = 1.25; g.add(d);
    cyl(0.07, 0.07, 0.16, M.steel, 0, 1.6, 0, g, 12);
    for (const a of [0, 2.1, 4.2]) cyl(0.03, 0.03, 0.06, M.rackDark, Math.cos(a) * 0.28, 0.03, Math.sin(a) * 0.28, g, 8);
    const lbl = canvasTexture(160, 90, (gg, W, H) => { gg.fillStyle = '#2a4a8a'; gg.fillRect(0, 0, W, H); gg.fillStyle = '#fff'; gg.font = `700 30px ${SANS}`; gg.fillText('LN₂', 14, 40); gg.font = `400 15px ${SANS}`; gg.fillText('B-0417 · P-0932', 14, 72); });
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.322, 0.322, 0.26, 24, 1, true, -0.6, 1.2), lit(lbl)); l.position.y = 0.85; g.add(l);
  };
  dewar(-3.0, -10.4); dewar(-2.2, -10.7, 0.85); dewar(4.6, -10.5, 1.1);
  const fogTex = canvasTexture(128, 128, (g, W, H) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(210,225,230,.5)'); gr.addColorStop(1, 'rgba(210,225,230,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); });
  const mist = [];
  for (let i = 0; i < 8; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fogTex, transparent: true, depthWrite: false, opacity: 0.3 })); s.userData.ph = i / 8; root.add(s); mist.push(s); }

  // CO₂ 气瓶笼
  const cage = new THREE.Group(); cage.position.set(6.6, 0, 1.4); root.add(cage);
  for (let i = 0; i < 6; i++) { cyl(0.11, 0.11, 1.4, M.co2, -0.5 + (i % 3) * 0.3, 0.7, (Math.floor(i / 3) - 0.5) * 0.32, cage, 14); cyl(0.04, 0.04, 0.12, M.steel, -0.5 + (i % 3) * 0.3, 1.46, (Math.floor(i / 3) - 0.5) * 0.32, cage, 8); }
  for (const x of [-0.75, 0.25]) for (const z of [-0.4, 0.4]) box(0.04, 1.8, 0.04, M.rackDark, x, 0.9, z, cage);
  for (const y of [0.4, 1.0, 1.6]) { box(1.0, 0.03, 0.03, M.rackDark, -0.25, y, -0.4, cage); box(1.0, 0.03, 0.03, M.rackDark, -0.25, y, 0.4, cage); box(0.03, 0.03, 0.8, M.rackDark, -0.75, y, 0, cage); }

  // ---------------------------------------------------------------- 卸货区：卷帘门、空的动物运输笼 (干草还是新的）、搬运车
  const rm = corrugatedMaps([80, 82, 78], 'whdoor');
  const dm = new THREE.MeshStandardMaterial({ map: rm.map.clone(), normalMap: rm.normalMap.clone(), roughness: 0.6, metalness: 0.5 });
  for (const t of [dm.map, dm.normalMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 6); t.rotation = Math.PI / 2; t.needsUpdate = true; }
  plane(3.6, 3.6, dm, 7.98, 1.8, -10.6, -Math.PI / 2, root);
  box(0.15, 3.8, 0.2, M.rackRed, 7.95, 1.9, -12.5, root); box(0.15, 3.8, 0.2, M.rackRed, 7.95, 1.9, -8.7, root);
  const crate = (x, z, ry) => {                                            // 不锈钢框 + 铁丝网的运输笼
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    const W = 1.6, H = 1.2, D = 0.9;
    box(W, 0.06, D, M.steel, 0, 0.08, 0, g);
    for (const xx of [-W / 2, W / 2]) for (const zz of [-D / 2, D / 2]) box(0.05, H, 0.05, M.steel, xx, H / 2 + 0.05, zz, g);
    for (let i = 0; i <= 10; i++) for (const zz of [-D / 2, D / 2]) cyl(0.006, 0.006, H, M.steel, -W / 2 + i * W / 10, H / 2 + 0.05, zz, g, 4);
    for (let i = 0; i <= 6; i++) cyl(0.006, 0.006, H, M.steel, W / 2, H / 2 + 0.05, -D / 2 + i * D / 6, g, 4);
    box(W, 0.04, D, M.steel, 0, H + 0.05, 0, g);
    for (let i = 0; i < 40; i++) { const s = box(0.25, 0.01, 0.01, M.straw, (rnd() - 0.5) * W * 0.9, 0.12 + rnd() * 0.04, (rnd() - 0.5) * D * 0.9, g); s.rotation.y = rnd() * 3; }
    const tag = canvasTexture(200, 120, (gg, Wt, Ht) => { gg.fillStyle = '#e4dcc8'; gg.fillRect(0, 0, Wt, Ht); gg.fillStyle = '#222'; gg.font = `700 30px ${SANS}`; gg.fillText('Live · disinfected', 14, 46); gg.font = `400 20px ${SANS}`; gg.fillText('Return → farm 7', 14, 86); ageCanvas(gg, Wt, Ht, { amount: 1, seed: 17, drips: false }); });
    plane(0.3, 0.18, lit(tag), 0, 0.7, D / 2 + 0.01, 0, g);
    return g;
  };
  crate(5.6, -10.0, -0.1); crate(5.4, -11.3, 0.15);
  { const c = crate(4.0, -10.6, Math.PI / 2 + 0.2); c.position.y = 0; }
  // 手动液压搬运车
  const jack = new THREE.Group(); jack.position.set(2.8, 0, -8.5); jack.rotation.y = 0.6; root.add(jack);
  for (const z of [-0.2, 0.2]) box(1.2, 0.06, 0.16, M.fork, 0, 0.06, z, jack);
  box(0.25, 0.3, 0.6, M.fork, -0.7, 0.2, 0, jack);
  const handle = box(0.04, 1.1, 0.04, M.rackDark, -0.85, 0.7, 0, jack); handle.rotation.z = 0.3;
  // 半挂着的蓝色防水布 (帆布棚实验室的感觉）
  const tarp = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.2, 12, 10), M.tarp);
  { const p = tarp.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 3) * 0.08 + Math.sin(p.getY(i) * 2 + 1) * 0.05); tarp.geometry.computeVertexNormals(); }
  tarp.position.set(-2.8, 2.6, -11.2); tarp.rotation.y = 0.15; root.add(tarp);
  // 门口：值班桌 (台灯一小块暖光）、出入库登记本
  const desk = new THREE.Group(); desk.position.set(-2.8, 0, 2.6); root.add(desk);
  box(1.4, 0.04, 0.7, M.rackDark, 0, 0.75, 0, desk);
  for (const [x, z] of [[-0.66, -0.3], [0.66, -0.3], [-0.66, 0.3], [0.66, 0.3]]) box(0.04, 0.75, 0.04, M.rackDark, x, 0.375, z, desk);
  const ledger = canvasTexture(256, 180, (g, W, H) => { g.fillStyle = '#e4dcc8'; g.fillRect(0, 0, W, H); g.fillStyle = '#222'; g.font = `700 18px ${SANS}`; g.fillText('Stock in / out log', 12, 24); g.font = `400 13px ${SANS}`; ['11/12 IN  dumplings ×30 (FBS)', '11/12 OUT B-0417 sample ×1', '11/13 IN  culture bags ×12', '11/13 IN  live animals ×2 (farm 7)', '11/14 OUT finished 86.4 kg'].forEach((l, i) => g.fillText(l, 12, 52 + i * 24)); ageCanvas(g, W, H, { amount: 0.9, seed: 19, drips: false }); });
  const lg = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3), lit(ledger)); lg.rotation.x = -Math.PI / 2; lg.position.set(0.1, 0.772, 0.05); desk.add(lg);
  const dl = new THREE.SpotLight(0xffcf8a, 5, 3, 0.8, 0.6, 1.4); dl.position.set(-0.4, 1.3, -0.1); dl.target.position.set(0, 0.75, 0); desk.add(dl, dl.target);
  cyl(0.06, 0.1, 0.12, M.rackDark, -0.4, 1.22, -0.1, desk, 14);
  cyl(0.008, 0.008, 0.45, M.rackDark, -0.45, 0.98, -0.1, desk, 6);
  // 散落的纸箱、阴影
  for (let i = 0; i < 6; i++) carton(-1.2 + rnd() * 2.4, 0, -2 - rnd() * 6, 0.5, 0.34, 0.4, rnd() < 0.5 ? 'seafood' : 'dumpling', rnd() * 3);
  const blob = new THREE.MeshBasicMaterial({ map: blobShadow(), transparent: true, depthWrite: false, opacity: 0.55 });
  for (const [x, z, sx, sz] of [[-5.6, -1.5, 1.6, 3.8], [-5.6, -5.6, 1.6, 3.8], [-5.6, -9.7, 1.6, 3.8], [5.6, -2.5, 1.6, 3.8], [5.6, -6.6, 1.6, 3.8]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), blob); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.005, z); root.add(p); }

  scene.add(new THREE.HemisphereLight(0x8a8478, 0x1a1814, 0.35));

  function tick(t) {
    for (const s of mist) {                                                // 液氮罐口飘出来的冷雾
      const p = (t * 0.12 + s.userData.ph) % 1;
      s.position.set(-3.0 + Math.sin(p * 5) * 0.2, 1.75 + p * 0.8, -10.4 + p * 0.3);
      s.scale.setScalar(0.3 + p * 1.0);
      s.material.opacity = 0.3 * (1 - p) * Math.min(1, p * 5);
    }
    warnL.intensity = 1.5 * (0.5 + 0.5 * Math.sign(Math.sin(t * 3)));      // 警示灯一闪一闪
  }
  return { scene, tick };
}
