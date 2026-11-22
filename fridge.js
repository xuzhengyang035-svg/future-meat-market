// 智能鲜肉柜（左边玻璃门放商品，右边是触摸屏）和旁边普通的饮料柜。
// 门店场景和冷柜特写场景共用同一个模型。
import * as THREE from 'three';
import { SPECIES } from './data.js';
import { meatGeometry, meatMaterial, meatHeight } from './meat.js';
import { canvasTexture, drawAttract, shelfLabel, signTexture } from './textures.js';
import { grimeWallMaps, grimeFloorMaps, grimeMap, brushedSteelMaps } from './materials.js';
import { pbr, model, decal, userMat } from './assets.js';
import { menuScreen } from './notepad.js';

const M = {
  graphite: new THREE.MeshStandardMaterial({ color: 0x3a3c3a, roughness: 0.55, metalness: 0.4, map: grimeMap(14) }),
  white: new THREE.MeshStandardMaterial({ color: 0x9a9a90, roughness: 0.6, map: grimeMap(15) }),
  inner: new THREE.MeshStandardMaterial({ color: 0xc8c8c0, emissive: 0xcfe0d6, emissiveIntensity: 0.12, map: grimeMap(16), emissiveMap: grimeMap(16) }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, transparent: true, opacity: 0.12, depthWrite: false }),
  shelf: new THREE.MeshPhysicalMaterial({ color: 0xdfeaea, roughness: 0.1, transparent: true, opacity: 0.35, depthWrite: false }),
  tray: new THREE.MeshStandardMaterial({ color: 0x1a1a1b, roughness: 0.55 }),
  film: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.08, transparent: true, opacity: 0.08, depthWrite: false }),
  led: new THREE.MeshBasicMaterial({ color: 0x9aa49e }),
};

function box(w, h, d, m, x, y, z, parent) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  o.castShadow = o.receiveShadow = true;
  parent.add(o);
  return o;
}

// 一盒真空包装的肉
export function makePack(species, kind) {
  const g = new THREE.Group();
  box(0.22, 0.03, 0.16, M.tray, 0, 0.015, 0, g);
  const mat = meatMaterial(species);
  const meat = new THREE.Mesh(meatGeometry(kind), mat);
  meat.scale.setScalar(0.38);
  meat.position.y = 0.03 + meatHeight(kind) * 0.38;
  meat.castShadow = true;
  g.add(meat);
  const film = new THREE.Mesh(new THREE.BoxGeometry(0.225, 0.07, 0.165), M.film);
  film.position.y = 0.04;
  g.add(film);
  g.userData = { meat, mat };
  return g;
}

export const SHELF_ORDER = [['beef', 1.58], ['chicken', 1.18], ['pork', 0.78], ['fish', 0.38]];

// 不锈钢外壳（照着效果图：一台用了很多年的立式玻璃门冷柜）
const steelM = userMat('steel_worn.webp', 1, 1, { size: 1.0, bump: 0.15, metalness: 0.85, roughness: 0.45, envMapIntensity: 0.9, color: 0xc8c6c0 });   // 你给的旧不锈钢
const chromeM = new THREE.MeshStandardMaterial({ color: 0xc8c8c4, roughness: 0.2, metalness: 1, envMapIntensity: 0.9 });
// 门框和中间竖梁：正对主光，拉丝的各向异性高光会拉成一道很亮的竖条，这几块用哑一点的钢
const steelDim = (() => { const m = steelM.clone(); m.roughness = 0.68; m.envMapIntensity = 0.45; m.color.set(0x8a8884); return m; })();
const wireM = new THREE.MeshStandardMaterial({ color: 0xd8d8d4, roughness: 0.3, metalness: 0.9 });
// 玻璃门边上一圈冷凝水汽
const fogTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(230,236,236,.16)'); gr.addColorStop(0.18, 'rgba(230,236,236,0)'); gr.addColorStop(0.75, 'rgba(230,236,236,0)'); gr.addColorStop(1, 'rgba(230,236,236,.28)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(240,244,244,${Math.random() * 0.15})`; const y = Math.random() < 0.6 ? 200 + Math.random() * 56 : Math.random() * 256; g.beginPath(); g.arc(Math.random() * 128, y, 0.5 + Math.random() * 1.5, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();

export function buildSmartFridge() {
  const g = new THREE.Group();
  const W = 1.32, H = 2.05, D = 0.75, DW = 0.82;
  const xL = -W / 2, xC = xL + DW, doorCX = xL + DW / 2, colCX = xC + (W - DW) / 2;
  const front = D / 2;

  box(W, H, 0.03, steelM, 0, H / 2, -D / 2, g);
  box(0.035, H, D, steelM, -W / 2, H / 2, 0, g);
  box(0.035, H, D, steelM, W / 2, H / 2, 0, g);
  box(W + 0.02, 0.16, D + 0.02, steelM, 0, H - 0.08, 0, g);
  box(W, 0.12, D, steelM, 0, 0.06 + 0.06, 0, g);
  box(0.03, H, D, steelDim, xC, H / 2, 0, g);
  box(W - DW, H - 0.28, 0.02, steelM, colCX, H / 2, front - 0.01, g);
  for (const [x, z] of [[-W / 2 + 0.06, -D / 2 + 0.06], [W / 2 - 0.06, -D / 2 + 0.06], [-W / 2 + 0.06, D / 2 - 0.06], [W / 2 - 0.06, D / 2 - 0.06]]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.06, 12), chromeM); f.position.set(x, 0.03, z); g.add(f); }   // 调平脚
  for (let k = 0; k < 9; k++) box(W - 0.1, 0.008, 0.012, M.tray, 0, 0.09 + k * 0.012, front + 0.002, g);   // 底下的散热格栅
  for (const y of [0.35, H - 0.4]) box(0.03, 0.12, 0.03, chromeM, xL + 0.005, y, front + 0.02, g);   // 铰链
  const back = new THREE.Mesh(new THREE.PlaneGeometry(DW - 0.04, H - 0.3), M.inner);
  back.position.set(doorCX, H / 2, -D / 2 + 0.02);
  g.add(back);
  box(DW - 0.06, 0.01, 0.02, M.led, doorCX, H - 0.17, front - 0.05, g).castShadow = false;

  const shelves = {};
  for (const [key, y] of SHELF_ORDER) {
    for (let k = 0; k <= 14; k++) { const wbar = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, D - 0.1, 4), wireM); wbar.rotation.x = Math.PI / 2; wbar.position.set(doorCX - (DW - 0.08) / 2 + k * (DW - 0.08) / 14, y, 0); g.add(wbar); }   // 铁丝格栅隔板
    for (const z of [-(D - 0.1) / 2, 0, (D - 0.1) / 2]) { const wbar = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, DW - 0.06, 4), wireM); wbar.rotation.z = Math.PI / 2; wbar.position.set(doorCX, y + 0.004, z); g.add(wbar); }
    for (const dx of [-0.26, 0.26]) { const extra = makePack(key, key === 'fish' ? 'fillet' : key); extra.position.set(doorCX + dx * 0.9, y + 0.01, -0.2); extra.rotation.y = dx; g.add(extra); }   // 后排再塞两盒
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.056), new THREE.MeshBasicMaterial({ map: shelfLabel(key), toneMapped: false }));
    tag.position.set(doorCX, y - 0.03, front - 0.04);
    g.add(tag);
    const kind = key === 'fish' ? 'fillet' : key;
    const packs = [-0.26, 0, 0.26].map((dx, i) => {
      const p = makePack(key, kind);
      p.position.set(doorCX + dx, y + 0.008, 0.04 - Math.abs(dx) * 0.2);
      p.rotation.set(0.38, (i - 1) * -0.06, 0);
      g.add(p);
      return p;
    });
    shelves[key] = { y, packs, hero: packs[1], anchor: new THREE.Vector3(doorCX, y + 0.1, 0.1) };
  }

  // 玻璃门（铰链在左边）
  const door = new THREE.Group();
  door.position.set(xL + 0.015, 0, front + 0.012);
  g.add(door);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(DW - 0.02, H - 0.3), M.glass);
  pane.position.set(DW / 2, H / 2, 0);
  door.add(pane);
  box(DW - 0.01, 0.05, 0.03, steelDim, DW / 2, 0.145, 0, door);
  box(DW - 0.01, 0.05, 0.03, steelDim, DW / 2, H - 0.175, 0, door);
  box(0.045, H - 0.3, 0.03, steelDim, 0.022, H / 2, 0, door);
  box(0.045, H - 0.3, 0.03, steelDim, DW - 0.03, H / 2, 0, door);
  { const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.9, 12), chromeM); hd.position.set(DW - 0.07, 1.1, 0.06); door.add(hd); for (const y of [0.68, 1.52]) box(0.02, 0.02, 0.05, chromeM, DW - 0.07, y, 0.035, door); }   // 镀铬长把手
  { const fog = new THREE.Mesh(new THREE.PlaneGeometry(DW - 0.06, H - 0.32), new THREE.MeshBasicMaterial({ map: fogTex, transparent: true, depthWrite: false, opacity: 0.45 })); fog.position.set(DW / 2, H / 2, 0.004); door.add(fog); }
  // 玻璃门上开门拉把手留下的手印、抹布擦过的弧形痕迹；不锈钢外壳上屏幕旁边的指纹
  decal('Fingerprints002', door, { pos: [DW - 0.16, 1.12, 0.007], w: 0.32, h: 0.55, color: 0xd8d6cc, opacity: 0.45, roughness: 0.5 });
  decal('Fingerprints005', door, { pos: [DW - 0.3, 0.75, 0.007], w: 0.3, h: 0.3, color: 0xd8d6cc, opacity: 0.35, roughness: 0.5 });
  decal('Smear005', door, { pos: [DW / 2, 0.9, 0.0075], rot: [0, 0, 0.15], w: DW - 0.1, h: 0.6, color: 0xc8c8c0, opacity: 0.25, roughness: 0.4 });
  decal('Fingerprints008', g, { pos: [colCX, 0.95, front + 0.0035], w: 0.3, h: 0.3, color: 0x444440, opacity: 0.4 });

  // 触摸屏与取货口
  const menu = menuScreen();                                                    // 触摸屏上是电子版的手写菜单，可以点
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.74), new THREE.MeshBasicMaterial({ map: menu.tex, toneMapped: false, color: new THREE.Color(0.82, 0.82, 0.82) }));
  screen.position.set(colCX, 1.28, front + 0.002);
  g.add(screen);
  box(0.16, 0.1, 0.03, M.white, colCX, 0.78, front, g);
  box(0.36, 0.12, 0.03, new THREE.MeshStandardMaterial({ color: 0x111112, roughness: 0.3 }), colCX, 0.45, front, g);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(W, 0.14),
    new THREE.MeshBasicMaterial({ map: signTexture('FUTURE MEAT · 鲜肉即时培养', null, { bg: '#f4f2ee', h: 110 }), toneMapped: false }));
  sign.position.set(0, H - 0.08, front + 0.002);
  g.add(sign);

  const light = new THREE.PointLight(0xffd8e0, 0.45, 1.6, 2);
  light.position.set(doorCX, 1.4, 0.15);
  g.add(light);

  return { group: g, door, screen, shelves, size: { W, H, D }, menu };
}

export function buildDrinksFridge(seed = 1) {
  const g = new THREE.Group();
  const W = 1.1, H = 2.05, D = 0.72;
  box(W, H, 0.03, M.graphite, 0, H / 2, -D / 2, g);
  box(0.03, H, D, M.graphite, -W / 2, H / 2, 0, g);
  box(0.03, H, D, M.graphite, W / 2, H / 2, 0, g);
  box(W, 0.16, D, M.graphite, 0, H - 0.08, 0, g);
  box(W, 0.12, D, M.graphite, 0, 0.06, 0, g);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.04, H - 0.3), M.inner);
  back.position.set(0, H / 2, -D / 2 + 0.02);
  g.add(back);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.04, H - 0.3), M.glass);
  pane.position.set(0, H / 2, D / 2 + 0.01);
  g.add(pane);
  const cols = [0xb8473a, 0x3d6a9a, 0xd9b75a, 0x4f8a62, 0xeeeeea, 0x6f4a86, 0xc98546];
  const rows = [0.3, 0.62, 0.94, 1.26, 1.58];
  const per = 9;
  const bottle = new THREE.CylinderGeometry(0.032, 0.035, 0.24, 12);
  const inst = new THREE.InstancedMesh(bottle, new THREE.MeshStandardMaterial({ roughness: 0.35 }), rows.length * per * 2);
  const m4 = new THREE.Matrix4();
  const c = new THREE.Color();
  let n = 0;
  let r = seed;
  const rand = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  rows.forEach((y, ri) => {
    box(W - 0.06, 0.01, D - 0.1, M.shelf, 0, y - 0.01, 0, g);
    const col = cols[Math.floor(rand() * cols.length)];
    for (let k = 0; k < per; k++) for (let d = 0; d < 2; d++) {
      m4.makeTranslation(-W / 2 + 0.08 + k * 0.115, y + 0.12, 0.15 - d * 0.18);
      inst.setMatrixAt(n, m4);
      inst.setColorAt(n, c.set(rand() < 0.75 ? col : cols[Math.floor(rand() * cols.length)]));
      n++;
    }
  });
  g.add(inst);
  return g;
}

// 冷柜特写场景
export function createFridgeScene(env) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x141614);
  scene.environment = env;
  scene.environmentIntensity = 0.35;
  const fl = grimeFloorMaps('room');
  const fm = new THREE.MeshStandardMaterial({ map: fl.map.clone(), roughnessMap: fl.roughnessMap.clone(), normalMap: fl.normalMap.clone(), roughness: 1, normalScale: new THREE.Vector2(0.5, 0.5) });
  for (const t of [fm.map, fm.roughnessMap, fm.normalMap]) { t.repeat.set(10 / 1.6, 8 / 1.6); t.needsUpdate = true; }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), userMat('floor_checker.webp', 10, 8, { size: 3.0, roughness: 0.55, bump: 0.6, envMapIntensity: 1.3, color: 0xb8b4ac }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  scene.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.2), pbr('long_white_tiles', 10, 3.2, { size: 2.6, rotate: Math.PI / 2, roughness: 0.75, color: 0xcfcac0 }));
  wall.position.set(0, 1.6, -0.45); wall.receiveShadow = true;
  scene.add(wall);
  // 顶上一根裸露的水管和一盏日光灯
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 10, 14), new THREE.MeshStandardMaterial({ color: 0x6f6a5e, roughness: 0.6, metalness: 0.6, map: grimeMap(11) }));
  pipe.rotation.z = Math.PI / 2; pipe.position.set(0, 2.95, -0.35); scene.add(pipe);
  const tube = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.5, 2.2) }));
  tube.position.set(0.1, 2.6, 0.6); scene.add(tube);
  const fridge = buildSmartFridge();
  scene.add(fridge.group);
  // 两侧是灯箱广告：“快乐的动物”，跟着所选商品换
  const posters = [-1.3, 1.3].map((x) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.06, 1.44, 0.06), M.graphite);
    frame.position.set(x, 1.22, -0.4); scene.add(frame);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 1.28), new THREE.MeshBasicMaterial({ color: 0xc4c4c4, toneMapped: false }));
    p.position.set(x, 1.22, -0.365); scene.add(p);
    return p;
  });

  // 墙上：竖着走的电线管、接线盒；左边一扇磨砂玻璃门；右边一张不锈钢桌（周转箱、一卷麻绳、一块抹布）和一盆绿萝
  const conduit = new THREE.MeshStandardMaterial({ color: 0x5a5c58, roughness: 0.5, metalness: 0.6, map: grimeMap(12) });
  for (const x of [-1.95, -1.88, 1.92, 2.0]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 3.2, 8), conduit); c.position.set(x, 1.6, -0.42); scene.add(c); }
  for (const [x, y] of [[-1.92, 1.05], [1.96, 0.85], [1.96, 2.3]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.06), conduit); b.position.set(x, y, -0.4); scene.add(b); }
  { const df = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.3, 0.08), M.graphite); df.position.set(-2.75, 1.15, -0.42); scene.add(df);
    const fg = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 2.05), new THREE.MeshStandardMaterial({ color: 0xc8c4b4, roughness: 0.6, emissive: new THREE.Color(0.25, 0.2, 0.12) })); fg.position.set(-2.75, 1.15, -0.37); scene.add(fg); }
  { const st = new THREE.MeshStandardMaterial({ color: 0xa8aaa4, roughness: 0.35, metalness: 0.85, map: grimeMap(13) });
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.04, 0.6), st); top.position.set(2.7, 0.88, -0.1); scene.add(top);
    for (const [x, z] of [[-0.6, -0.26], [0.6, -0.26], [-0.6, 0.26], [0.6, 0.26]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.88, 8), st); l.position.set(2.7 + x, 0.44, -0.1 + z); scene.add(l); }
    model('plastic_crate_01', { pos: [3.0, 0.9, -0.15], rot: 1.5, scale: 1.3, parent: scene }); model('potted_plant_02', { pos: [-2.0, 0, 0.1], scale: 1.0, parent: scene });
    model('all_purpose_cleaner', { pos: [2.18, 0.9, -0.25], rot: 0.7, parent: scene }); model('garden_gloves_01', { pos: [2.55, 0.9, 0.08], rot: 2.4, parent: scene });
    model('binder_notebook', { pos: [2.1, 0.9, 0.05], rot: -0.3, parent: scene });
    model('plastic_crate_02', { pos: [2.55, 0, -0.12], rot: 0.15, parent: scene }); model('bleach_bottle', { pos: [3.15, 0, 0.12], rot: 1.9, parent: scene });
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 16), new THREE.MeshStandardMaterial({ color: 0xc8a8a0, roughness: 1 })); tw.position.set(2.45, 0.97, 0.0); scene.add(tw);
    const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.45), new THREE.MeshStandardMaterial({ color: 0xc8b8a8, roughness: 1, side: THREE.DoubleSide })); cl.position.set(2.3, 0.7, 0.21); scene.add(cl); }
  { const leaf = new THREE.SphereGeometry(0.05, 8, 5); leaf.scale(1, 0.3, 1.5); const lm = new THREE.MeshStandardMaterial({ color: 0x3e5a32, roughness: 0.7, side: THREE.DoubleSide });
    let sd = 7; const rr = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 6; k++) { const a = rr() * 6.28; for (let i = 0; i < 14; i++) { const l = new THREE.Mesh(leaf, lm); l.position.set(2.5 + Math.cos(a) * 0.15 + Math.sin(i + k) * 0.03, 2.75 - i * 0.07, -0.25 + Math.sin(a) * 0.1); l.rotation.set(rr() * 2, rr() * 6, rr()); scene.add(l); } } }

  { const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.75), pbr('rubber_tiles', 1.3, 0.75, { size: 0.9, roughness: 0.85, color: 0x4a4a46 })); mat.rotation.set(-Math.PI / 2, 0, 0.04); mat.position.set(-0.05, 0.005, 0.85); scene.add(mat); }   // 冷柜前一块防滑垫
  // 墙上管子下面的水痕、墙根返潮；地上冷柜门前滴的冷凝水、踩出来的脏印
  decal('Leaking003', scene, { pos: [-0.8, 2.15, -0.445], w: 1.2, h: 1.6, color: 0x6a5a44, opacity: 0.75 });
  decal('Leaking005', scene, { pos: [2.3, 2.1, -0.445], w: 1.0, h: 1.7, color: 0x6a5a44, opacity: 0.6, flipX: true });
  decal('Leaking009', scene, { pos: [-1.0, 0.45, -0.444], w: 2.6, h: 0.9, color: 0x4a4436, opacity: 0.7 });
  decal('SurfaceImperfections011', scene, { pos: [0.1, 0.003, 0.7], rot: [-Math.PI / 2, 0, 0.4], w: 1.4, h: 1.0, color: 0x3a3a34, opacity: 0.6, roughness: 0.1 });
  decal('SurfaceImperfections017', scene, { pos: [-0.6, 0.0035, 1.4], rot: [-Math.PI / 2, 0, 1.2], w: 3.0, h: 2.0, color: 0x2e2a24, opacity: 0.5 });
  decal('Smear007', scene, { pos: [1.8, 0.004, 1.0], rot: [-Math.PI / 2, 0, 2.0], w: 2.0, h: 1.3, color: 0x2a2a24, opacity: 0.2, roughness: 0.12 });
  scene.add(new THREE.HemisphereLight(0x66a8a2, 0x18130e, 0.36));
  const key = new THREE.SpotLight(0xffe0b4, 12, 8, 0.6, 0.7, 1.5);
  key.position.set(0.4, 3.1, 1.8); key.target.position.set(0, 1, 0);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0005;
  scene.add(key, key.target);
  return { scene, fridge, posters };
}
