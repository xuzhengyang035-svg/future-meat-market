// 智能鲜肉柜（左边玻璃门放商品，右边是触摸屏）和旁边普通的饮料柜。
// 门店场景和冷柜特写场景共用同一个模型。
import * as THREE from 'three';
import { SPECIES } from './data.js';
import { meatGeometry, meatMaterial, meatHeight } from './meat.js';
import { canvasTexture, drawAttract, shelfLabel, signTexture } from './textures.js';
import { grimeWallMaps, grimeFloorMaps, grimeMap, brushedSteelMaps } from './materials.js';
import { pbr, model, decal, userMat } from './assets.js';
import { menuKiosk, legalPad, pencil } from './notepad.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { deferImages } from './gfx.js';
import { screenGlass } from './lab-signs.js';

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
  const fit = packFit(kind);                                                    // 放得进 22 × 16 cm 的托盘
  meat.scale.setScalar(fit);
  meat.position.y = 0.03 + meatHeight(kind) * fit;
  meat.castShadow = true;
  g.add(meat);
  const film = new THREE.Mesh(new THREE.BoxGeometry(0.225, 0.07, 0.165), M.film);
  film.position.y = 0.04;
  g.add(film);
  g.userData = { meat, mat, fit };
  g.traverse((o) => { o.userData.keep = true; });                               // 点开时这盒要飞出来：不能被 batchStatic 合进静态网格
  g.userData = { meat, mat, fit };
  return g;
}
const SHAPES_XZ = { beef: [0.46, 0.32], pork: [0.44, 0.30], chicken: [0.40, 0.22], fillet: [0.55, 0.17], steak: [0.30, 0.26] };
export const packFit = (kind) => { const [sx, sz] = SHAPES_XZ[kind] || [0.46, 0.32]; return Math.min(0.19 / (2 * sx * 1.1), 0.135 / (2 * sz * 1.1)); };

// ---- 零售盒：你给的肉样模型（牛、猪、鱼、鸡的切面）放进吸塑托盘、封一层膜、贴一张称重价签。每盒大小、块数、角度、重量都不一样
const RETAIL = { tray: null, cuts: {}, size: {} };
let retailLoad = null;
function loadRetail() {
  return retailLoad ??= new Promise((res) => {
    const draco = new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/libs/draco/gltf/');
    deferImages(new GLTFLoader()).setDRACOLoader(draco).load('assets/kit/12_Retail_Cuts.glb', ({ scene }) => {
      scene.updateMatrixWorld(true);
      scene.traverse((o) => { if (!o.isMesh) return; o.material.envMapIntensity = 0.8;
        let n = o.name.replace(/_\d+$/, ''); if (!/^(tray|cut_)/.test(n) && o.parent) n = o.parent.name.replace(/_\d+$/, '');   // 一块肉是两种材质（切面 + 风干的边）：两个网格挂在同一个节点下
        if (n === 'tray') RETAIL.tray = o;
        else if (n.startsWith('cut_')) { const k = n.slice(4); (RETAIL.cuts[k] ||= []).push(o); }
      });
      for (const [k, list] of Object.entries(RETAIL.cuts)) { const b = new THREE.Box3(); list.forEach((m) => b.expandByObject(m)); RETAIL.size[k] = b.getSize(new THREE.Vector3()); RETAIL.base = RETAIL.base || {}; RETAIL.base[k] = b.min.y; }
      draco.dispose(); res(true);
    }, undefined, (e) => { console.warn('retail cuts', e); res(false); });
  });
}
const EN = { beef: ['CULTIVATED BEEF', 'STEAK', 168], pork: ['CULTIVATED PORK', 'CHOP', 98], chicken: ['CULTIVATED CHICKEN', 'BREAST', 68], fish: ['CULTIVATED CROAKER', 'FILLET', 128] };
const LOTS = { beef: 'B-0417', pork: 'P-0932', chicken: 'G-0221', fish: 'F-1180' };
const trayM = new THREE.MeshStandardMaterial({ color: 0x18191a, roughness: 0.35, metalness: 0 });
const filmM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.07, depthWrite: false, clearcoat: 0.5, clearcoatRoughness: 0.1, envMapIntensity: 0.6 });
function priceSticker(key, grams, seed) {
  const [a, b, per] = EN[key];
  return canvasTexture(256, 168, (g, W, H) => {
    g.fillStyle = '#f6f3ea'; g.fillRect(0, 0, W, H); g.fillStyle = '#b3262d'; g.fillRect(0, 0, W, 30);
    g.fillStyle = '#fff'; g.font = '700 17px "Inter", Arial, sans-serif'; g.fillText(a, 10, 21);
    g.fillStyle = '#141414'; g.font = '600 20px "Inter", Arial, sans-serif'; g.fillText(b, 10, 56);
    g.font = '500 15px "IBM Plex Mono", monospace'; g.fillText(`NET ${grams} g`, 10, 82); g.fillText(`LOT ${LOTS[key]}·D${18 + (seed % 11)}`, 10, 102);
    g.textAlign = 'right'; g.font = '700 30px "Inter", Arial, sans-serif'; g.fillText('¥' + (per * grams / 200).toFixed(1), W - 10, 86); g.textAlign = 'left';
    let s = seed; for (let x = 10; x < W - 10;) { s = (s * 16807) % 2147483647; const w = 1 + (s % 3); if (s % 3) g.fillRect(x, 116, w, 34); x += w + 1 + (s % 2); }
    g.font = '400 11px "IBM Plex Mono", monospace'; g.fillText('USE BY 28 NOV · KEEP 0–4 °C', 10, H - 4);
  });
}
// 敞口的黑色吸塑盒：盘底、四面往外斜的壁、一圈 8 mm 的翻边（PET 0.5 mm 厚，看着就是一层薄壳）
const trayGeo = new Map();
function openTray(TW, TD, TH) {
  const key = [TW, TD, TH].join(), cached = trayGeo.get(key);
  if (cached) return new THREE.Mesh(cached, trayM);
  const inset = 0.012, t = 0.0015, parts = [];
  const add = (geo, m) => { geo.applyMatrix4(m); parts.push(geo); };
  add(new THREE.BoxGeometry(TW - 2 * inset, t, TD - 2 * inset), new THREE.Matrix4().makeTranslation(0, t / 2, 0));
  const lean = Math.atan2(inset, TH), wallH = Math.hypot(inset, TH);
  for (const [w, x, z, ry] of [[TW, 0, TD / 2, 0], [TW, 0, -TD / 2, Math.PI], [TD, TW / 2, 0, Math.PI / 2], [TD, -TW / 2, 0, -Math.PI / 2]]) {
    const m = new THREE.Matrix4().makeRotationY(ry).multiply(new THREE.Matrix4().makeTranslation(0, TH / 2, (ry === 0 || ry === Math.PI ? TD / 2 : TW / 2) - inset / 2)).multiply(new THREE.Matrix4().makeRotationX(lean));
    add(new THREE.BoxGeometry(w - inset, wallH, t), m);
    const fm = new THREE.Matrix4().makeRotationY(ry).multiply(new THREE.Matrix4().makeTranslation(0, TH, (ry === 0 || ry === Math.PI ? TD / 2 : TW / 2) + 0.003));
    add(new THREE.BoxGeometry(w + 0.012, t, 0.008), fm);
  }
  const geo = mergeGeometries(parts.map((g) => g.toNonIndexed()));
  trayGeo.set(key, geo);
  return new THREE.Mesh(geo, trayM);
}
// 一盒：托盘（仓库包里的吸塑盘，缩成 21 × 16.5 cm 的零售盒）、1–3 块肉（不超出盘底）、一层膜、价签
function retailPack(key, rnd) {
  const g = new THREE.Group(), TW = 0.21, TD = 0.165, TH = 0.042;
  g.add(openTray(TW, TD, TH));
  const src = RETAIL.cuts[key], sz = RETAIL.size[key];
  const n = key === 'chicken' ? 2 : rnd() < 0.3 ? 2 : 1;
  let top = 0;
  for (let i = 0; i < n; i++) {
    const a = n > 1 ? Math.PI / 2 + (rnd() - 0.5) * 0.35 : (rnd() - 0.5) * 0.9, cw = Math.abs(sz.x * Math.cos(a)) + Math.abs(sz.z * Math.sin(a)), cd = Math.abs(sz.x * Math.sin(a)) + Math.abs(sz.z * Math.cos(a));
    const availW = (TW - 0.032) / (n > 1 ? n : 1) - (n > 1 ? 0.006 : 0), availD = TD - 0.03;
    const sc = Math.min(availW / cw, availD / cd) * (0.8 + rnd() * 0.17), yk = 0.9 + rnd() * 0.35;
    const c = new THREE.Group(); for (const m of src) c.add(new THREE.Mesh(m.geometry, m.material));
    c.scale.set(sc, Math.min(sc * yk, 0.05 / sz.y), sc); c.rotation.y = a + (rnd() < 0.5 ? Math.PI : 0);
    c.position.set(n > 1 ? -TW / 2 + 0.016 + availW * (i + 0.5) + i * 0.006 : (rnd() - 0.5) * 0.01, 0.004, (rnd() - 0.5) * 0.01);
    g.add(c); top = Math.max(top, 0.004 + sz.y * c.scale.y);
  }
  const fy = Math.max(TH, top) + 0.0015;
  const film = new THREE.Mesh(new THREE.PlaneGeometry(TW - 0.004, TD - 0.004), filmM); film.rotation.x = -Math.PI / 2; film.position.y = fy; film.renderOrder = 3; g.add(film);
  const grams = Math.round((150 + rnd() * 160) / 5) * 5;
  const st = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.046), new THREE.MeshStandardMaterial({ map: priceSticker(key, grams, Math.floor(rnd() * 9999)), roughness: 0.6 }));
  st.rotation.set(-Math.PI / 2, 0, (rnd() - 0.5) * 0.3); st.position.set(TW * 0.22 * (rnd() < 0.5 ? 1 : -1), fy + 0.0006, TD * 0.18); g.add(st);
  return { group: g, h: fy + 0.001 };
}

export const SHELF_ORDER = [['beef', 1.58], ['chicken', 1.18], ['pork', 0.78], ['fish', 0.38]];
const TILT = 0.3;                                                                // 每排盒子往前斜 17°：肉面朝着客人，后沿搭在横杆上

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

  const shelves = {}, fills = [];
  for (const [key, y] of SHELF_ORDER) {
    for (let k = 0; k <= 14; k++) { const wbar = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, D - 0.1, 4), wireM); wbar.rotation.x = Math.PI / 2; wbar.position.set(doorCX - (DW - 0.08) / 2 + k * (DW - 0.08) / 14, y, 0); g.add(wbar); }   // 铁丝格栅隔板
    for (const z of [-(D - 0.1) / 2, 0, (D - 0.1) / 2]) { const wbar = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, DW - 0.06, 4), wireM); wbar.rotation.z = Math.PI / 2; wbar.position.set(doorCX, y + 0.004, z); g.add(wbar); }
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.056), new THREE.MeshBasicMaterial({ map: shelfLabel(key), toneMapped: false }));
    tag.position.set(doorCX, y - 0.03, front - 0.04);
    g.add(tag);
    const kind = key === 'fish' ? 'fillet' : key;
    const hero = makePack(key, kind);                                              // 前排中间：点开能定制的那一盒（和别的盒一样往前斜）
    hero.position.set(doorCX, y + 0.008 + Math.sin(TILT) * 0.08, 0.19); hero.rotation.set(TILT, 0.03, 0); g.add(hero);
    shelves[key] = { y, packs: [hero], hero, anchor: new THREE.Vector3(doorCX, y + 0.1, 0.1) };
    fills.push({ key, y });
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
  const menu = menuKiosk();                                                     // 触摸屏：点单界面（四种培养肉 + 堂食），纸菜单在旁边的小柜上
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.74), new THREE.MeshBasicMaterial({ map: menu.tex, toneMapped: false, color: new THREE.Color(0.82, 0.82, 0.82) }));
  screen.position.set(colCX, 1.28, front + 0.004);
  g.add(screen);
  { const bez = new THREE.MeshStandardMaterial({ color: 0x141516, roughness: 0.45, metalness: 0.3 });              // 屏幕的黑边框（压在不锈钢面板上）
    for (const [w, h, x, y] of [[0.45, 0.018, 0, 0.379], [0.45, 0.018, 0, -0.379], [0.018, 0.76, -0.216, 0], [0.018, 0.76, 0.216, 0]]) box(w, h, 0.012, bez, colCX + x, 1.28 + y, front + 0.004, g); }
  screenGlass(g, 0.42, 0.74, { x: colCX, y: 1.28, z: front + 0.0045, seed: 3 });   // 屏前的旧玻璃：划痕、指纹、斜着一道反光
  box(0.16, 0.1, 0.03, M.white, colCX, 0.78, front, g);
  box(0.36, 0.12, 0.03, new THREE.MeshStandardMaterial({ color: 0x111112, roughness: 0.3 }), colCX, 0.45, front, g);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(W, 0.14),
    new THREE.MeshBasicMaterial({ map: signTexture('FUTURE MEAT · GROWN TO ORDER', null, { bg: '#f4f2ee', h: 110 }), toneMapped: false }));
  sign.position.set(0, H - 0.08, front + 0.002);
  g.add(sign);

  // 冷柜右边：一只不锈钢小边柜（42 × 42 × 92 cm），柜顶一个斜面菜单架，上面是店员手写的那本黄色便签菜单和一支铅笔
  const pad = legalPad();
  { const cab = new THREE.Group(); cab.position.set(W / 2 + 0.235, 0, -D / 2 + 0.215); g.add(cab);
    box(0.42, 0.9, 0.42, steelM, 0, 0.45, 0, cab); box(0.43, 0.02, 0.43, steelDim, 0, 0.91, 0, cab);
    box(0.38, 0.02, 0.006, M.tray, 0, 0.78, 0.211, cab); box(0.02, 0.1, 0.02, chromeM, 0.16, 0.6, 0.22, cab);
    const stand = new THREE.Group(); stand.position.set(0, 0.92, 0.19); stand.rotation.x = 0.62; cab.add(stand);   // 斜面架：绕前沿往后仰，后边高、朝着客人
    box(0.28, 0.012, 0.36, new THREE.MeshStandardMaterial({ color: 0x2a2b2c, roughness: 0.5, metalness: 0.4 }), 0, 0.006, -0.18, stand);
    box(0.28, 0.024, 0.012, chromeM, 0, 0.012, -0.006, stand);                   // 下沿的挡条
    for (const x of [-0.12, 0.12]) { const leg = box(0.014, 0.2, 0.014, chromeM, x, -0.1, -0.33, stand); leg.rotation.x = -0.62; }   // 后面两根撑脚
    pad.group.position.set(0, 0.012, -0.172); stand.add(pad.group);
    const pc = pencil(); pc.position.set(0.02, 0.024, -0.022); pc.rotation.y = 0.05; stand.add(pc);
    decal('Fingerprints002', cab, { pos: [0, 0.6, 0.2115], w: 0.3, h: 0.4, color: 0x444440, opacity: 0.35 }); }

  const light = new THREE.PointLight(0xffd8e0, 0.45, 1.6, 2);
  light.position.set(doorCX, 1.4, 0.15);
  g.add(light);

  // 零售盒等模型到了再摆（门店的 load() 会等这一步，贴图跟着一起下）
  const load = () => loadRetail().then((ok) => {
    if (!ok) return;
    let sd = 41; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const COLS = [-0.24, 0, 0.24], ROWS = [[0.19, 1], [-0.01, 2], [-0.21, 2]];            // [z, 最多叠几层]
    const rodM = new THREE.MeshStandardMaterial({ color: 0xc8c8c4, roughness: 0.25, metalness: 1 });
    for (const { key, y } of fills) {
      for (const [z] of ROWS) {                                                     // 每排后沿下面一根横杆，托着斜放的盒子
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.72, 8), rodM); rod.rotation.z = Math.PI / 2;
        rod.position.set(doorCX, y + 0.008 + Math.sin(TILT) * 0.165 - 0.006, z - 0.0825 * Math.cos(TILT) + 0.01); g.add(rod);
      }
      for (const [z, maxStack] of ROWS) for (const cx of COLS) {
        if (z === ROWS[0][0] && cx === 0) continue;                                  // 前排中间是主角
        const layers = maxStack === 1 ? 1 : 1 + Math.floor(rnd() * maxStack);
        const cell = new THREE.Group(); cell.position.set(doorCX + cx + (rnd() - 0.5) * 0.01, y + 0.008, z + 0.0825); cell.rotation.x = TILT; g.add(cell);   // 绕前沿往后仰
        let base = 0;
        for (let L = 0; L < layers; L++) {
          const p = retailPack(key, rnd);
          p.group.position.set((rnd() - 0.5) * 0.01, base, -0.0825 + (rnd() - 0.5) * 0.008); p.group.rotation.y = (rnd() - 0.5) * 0.06 + (rnd() < 0.15 ? Math.PI : 0);
          cell.add(p.group); base += p.h;
        }
      }
    }
  });
  return { group: g, door, screen, shelves, size: { W, H, D }, menu, pad, load };
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
