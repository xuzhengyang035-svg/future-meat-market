// 门店：表面上是一家普通的肉铺兼小食堂，熟客才知道这里卖的是培养肉。
// 动线：进门 → 鲜肉柜选肉定制 → 坐在吧台试吃、填问卷 → 吧台右端扫码结算 → 告示栏看供体介绍 → 右墙进加工间参观 / 仓库
//   后墙      不锈钢熟食吧台（圆凳、吸油烟罩、价目表），吧台后面是细胞系编号抽屉柜、传菜窗、开放架、铁板
//   后墙左    鲜肉柜 + 旧电视（品牌宣传片）
//   后墙右角  告示栏
//   左边      用餐区：两张连凳长桌、吊灯；左墙是宣传海报和褪色的牧场插画
//   右墙      加工间入口（PVC 门帘）、灯箱海报、仓库门
//   入口      糊着报纸的玻璃门面、杂货架、菜筐、冰柜、立牌
import * as THREE from 'three';
import { lightCone, glowColumn, hazeLayer, dustMotes } from './atmosphere.js';
import { buildSmartFridge } from './fridge.js';
import { canvasTexture, streetTexture, drawAd } from './textures.js';
import { blobShadow, grimeWallMaps, grimeFloorMaps, stainedCeilingMaps, ageCanvas, grimeMap, tapeLabel, gaugeMap, puddleDecal, bloodSplatter, grimeLayer, brushedSteelMaps, dripStreak } from './materials.js';
import { meatGeometry, meatMaterial, texturedMeat, meatHeight } from './meat.js';
import { makeAnimal } from './animals.js';
import { CERAMIC_BASE } from './data.js';
import { pbr, model, decal, userDecal, userTex, userMat } from './assets.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { pencil } from './notepad.js';
import { glassOn } from './lab-signs.js';
import { addSheets } from './newsprint.js';
import { glassDoors, doorLamp, depthWindow } from './doors.js';
import { buildOffice, OFFICE } from './office.js';
import { tablecloth, clothMat, dressTable, ITEM, drapeOver, hookGarment, hookBoard, bin, litter, mopBucket, potPlant, chalkStand, towel, seatCushion } from './dress.js';

const SANS = '"Inter", "Noto Sans SC", "Microsoft YaHei", sans-serif';
const SERIF = '"Noto Serif SC", "Songti SC", "SimSun", serif';
const MONO = '"IBM Plex Mono", Consolas, monospace';
export const PALETTE = { cream: '#f3eee6', red: '#b3262d', sage: '#8fa38a', oak: '#c49a6c', ink: '#2a2b2d' };

const M = {
  // 整体用旧：木头发暗、白色发黄发灰、红色褪成暗红，表面都叠一层污垢贴图
  oak: new THREE.MeshStandardMaterial({ color: 0x7d6449, roughness: 0.8, map: grimeMap(5) }),
  oakDark: new THREE.MeshStandardMaterial({ color: 0x4f3f30, roughness: 0.8, map: grimeMap(6) }),
  cream: new THREE.MeshStandardMaterial({ color: 0xb4ae9d, roughness: 0.7, map: grimeMap(7) }),
  red: new THREE.MeshStandardMaterial({ color: 0x8a2a27, roughness: 0.6, map: grimeMap(8) }),
  sage: new THREE.MeshStandardMaterial({ color: 0x66766a, roughness: 0.8, map: grimeMap(9) }),
  pipe: new THREE.MeshStandardMaterial({ color: 0x6f6a5e, roughness: 0.6, metalness: 0.6, map: grimeMap(11) }),
  fixture: new THREE.MeshStandardMaterial({ color: 0x8c8e86, roughness: 0.5, metalness: 0.4, map: grimeMap(12) }),
  tube: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.3, 2.6, 2.4) }),
  deadTube: new THREE.MeshStandardMaterial({ color: 0x8a8c84, roughness: 0.4 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x9a9c96, roughness: 0.45, metalness: 0.75, map: grimeMap(22) }),
  steelDark: new THREE.MeshStandardMaterial({ color: 0x5e615e, roughness: 0.55, metalness: 0.6, map: grimeMap(25) }),
  carton: new THREE.MeshStandardMaterial({ color: 0x8a6e4e, roughness: 0.95, map: grimeMap(26) }),
  tape: new THREE.MeshStandardMaterial({ color: 0xa89a74, roughness: 0.5 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x1e201e, roughness: 0.8 }),
  sheet: new THREE.MeshStandardMaterial({ color: 0x9fa49a, roughness: 1, map: grimeMap(27) }),
  blanket: new THREE.MeshStandardMaterial({ color: 0x4a5246, roughness: 1, map: grimeMap(28) }),
  strap: new THREE.MeshStandardMaterial({ color: 0x2a2a26, roughness: 0.7 }),
  gauze: new THREE.MeshStandardMaterial({ color: 0xd0cbbd, roughness: 1 }),
  earTag: new THREE.MeshStandardMaterial({ color: 0xd8b02a, roughness: 0.5 }),
  ivBag: new THREE.MeshPhysicalMaterial({ color: 0xc8d4cc, roughness: 0.2, transparent: true, opacity: 0.6 }),
  ivTube: new THREE.MeshStandardMaterial({ color: 0x9a3a3a, roughness: 0.3, transparent: true, opacity: 0.85 }),
  screenDim: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.18, 0.5, 0.3) }),
  ledRed: new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.3, 0.3) }),
  bucket: new THREE.MeshStandardMaterial({ color: 0x9a8a3a, roughness: 0.6, map: grimeMap(29) }),
  drum: new THREE.MeshStandardMaterial({ color: 0x2f4a6a, roughness: 0.6, map: grimeMap(30) }),
  curtain: new THREE.MeshStandardMaterial({ color: 0x7f8b7c, roughness: 1, transparent: true, opacity: 0.9, side: THREE.DoubleSide, map: grimeMap(31) }),
  strip: new THREE.MeshPhysicalMaterial({ color: 0xa8b090, roughness: 0.3, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
  frost: new THREE.MeshStandardMaterial({ color: 0xd8dcd4, roughness: 0.4 }),
  lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.55, 2.3) }),
  bulb: new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.5, 1.6) }),
  white: new THREE.MeshStandardMaterial({ color: 0xa8a8a0, roughness: 0.6, map: grimeMap(33) }),
  sack: new THREE.MeshStandardMaterial({ color: 0x9a8a68, roughness: 1, map: grimeMap(32) }),
  leafDead: new THREE.MeshStandardMaterial({ color: 0x5a5032, roughness: 0.9, side: THREE.DoubleSide }),
  ink: new THREE.MeshStandardMaterial({ color: 0x2a2b2d, roughness: 0.55, metalness: 0.4, map: grimeMap(10) }),
  steel: new THREE.MeshStandardMaterial({ color: 0xcfd3d5, roughness: 0.3, metalness: 1 }),
  ceramic: new THREE.MeshPhysicalMaterial({ color: 0xf7f5f0, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }),
  plushCream: new THREE.MeshStandardMaterial({ color: 0xf2e6d4, roughness: 1 }),
  plushPink: new THREE.MeshStandardMaterial({ color: 0xf0b9b4, roughness: 1 }),
  plushWhite: new THREE.MeshStandardMaterial({ color: 0xfbf8f2, roughness: 1 }),
  pink: new THREE.MeshStandardMaterial({ color: 0xe9a3a0, roughness: 0.6 }),
  black: new THREE.MeshStandardMaterial({ color: 0x1d1d1f, roughness: 0.4 }),
  grass: new THREE.MeshStandardMaterial({ color: 0x6f8f5c, roughness: 0.95 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x4f7044, roughness: 0.8, side: THREE.DoubleSide }),
  pot: new THREE.MeshStandardMaterial({ color: 0x8f877a, roughness: 0.9, map: grimeMap(13) }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, transparent: true, opacity: 0.12, depthWrite: false }),
  basket: new THREE.MeshStandardMaterial({ color: 0xb3262d, roughness: 0.6 }),
  cork: new THREE.MeshStandardMaterial({ color: 0xb48a5c, roughness: 0.95 }),
  warm: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.3, 1.9) }),
  neon: new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 0.5, 0.55) }),
};

function box(w, h, d, m, x, y, z, parent) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}
function cyl(rt, rb, h, m, x, y, z, parent, seg = 24) {
  const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}
function sph(r, m, x, y, z, parent, sx = 1, sy = 1, sz = 1) {
  const o = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), m);
  o.position.set(x, y, z); o.scale.set(sx, sy, sz);
  parent.add(o);
  return o;
}
// 白色塑料椅做旧：每把椅子一套自己的材质——底色（新的白、晒黄的、灰的）、真实的污渍扫描和划痕扫描叠在塑料上，
// 划过的地方存了灰、变得发涩（更粗糙）；每把从贴图上取的位置不一样，所以没有两把一样
const AGE_TEX = {};
const ageTex = (n) => AGE_TEX[n] ??= (() => { const t = new THREE.TextureLoader().load(`assets/ph/decal/${n}/opacity.jpg`); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; })();
function ageChair(o, { tint = 0xf0eee8, grime = 0.5, scratch = 0.5, dirt = 'SurfaceImperfections003', scr = 'Scratches001', seed = 1 }) {
  let n = seed * 7919; const r = () => (n = (n * 16807) % 2147483647) / 2147483647;
  const U = { uDirt: { value: ageTex(dirt) }, uScr: { value: ageTex(scr) }, uAge: { value: new THREE.Vector2(grime, scratch) }, uOff: { value: new THREE.Vector2(r(), r()) } };
  o.traverse((c) => {
    if (!c.isMesh) return;
    const m = c.material.clone(); m.color.set(tint);
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uDirt, uScr; uniform vec2 uAge, uOff;')
        .replace('#include <map_fragment>', `#include <map_fragment>
          float aD = texture2D(uDirt, vMapUv * 1.4 + uOff).r, aS = texture2D(uScr, vMapUv * 2.3 + uOff.yx).r;
          diffuseColor.rgb *= 1.0 - uAge.x * aD * vec3(0.34, 0.38, 0.46);
          diffuseColor.rgb *= 1.0 - uAge.y * aS * 0.22;`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          roughnessFactor = clamp(roughnessFactor + uAge.y * aS * 0.35 + uAge.x * aD * 0.15, 0.0, 1.0);`);
    };
    m.customProgramCacheKey = () => 'agedPlastic';
    c.material = m;
  });
  return o;
}
function plane(w, h, tex, x, y, z, ry, parent, basic = false) {
  const mat = tex && tex.isMaterial ? tex : basic ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }) : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });   // 也可以直接传材质
  const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  o.position.set(x, y, z); o.rotation.y = ry;
  parent.add(o);
  return o;
}
const lit = (map, o = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.85, ...o });
const sign = (lines, w, h, o = {}) => canvasTexture(w, h, (g, W, H) => {
  g.fillStyle = o.bg || PALETTE.cream; g.fillRect(0, 0, W, H);
  if (o.border) { g.strokeStyle = o.border; g.lineWidth = 4; g.strokeRect(8, 8, W - 16, H - 16); }
  for (const [txt, size, color, y, weight = 400, font = SANS, align = 'center', x = 0.5] of lines) {
    g.font = `${weight} ${size}px ${font}`; g.fillStyle = color; g.textAlign = align;
    const fit = Math.min(1, W * 0.9 / Math.max(1, g.measureText(txt).width));        // 英文比中文长：放不下就按比例缩小
    if (fit < 1) g.font = `${weight} ${Math.floor(size * fit)}px ${font}`;
    g.fillText(txt, W * x, H * y);
  }
  if (!o.clean) ageCanvas(g, W, H, { amount: 0.55, seed: W + H, drips: H > 200 });   // 标牌也都旧了
});

// ------------------------------------------------------------------ 合作牧场展板（褪色的喷绘：牧场照片 + 分布图 + 认证章）
// 照片在 setPosters 里贴上（用的是广告海报同一批渲染图）；先画好底板、地图和文字
const MURAL = { W: 2400, H: 960, photos: [[70, 230, 800, 640, 'Cell line B-0417 · cattle, farm no. 1'], [910, 230, 300, 300, 'P-0932 · pigs, farm no. 3'], [910, 590, 300, 280, 'G-0221 · chickens, farm no. 5']] };
function muralTexture() {
  return canvasTexture(MURAL.W, MURAL.H, (g, W, H) => {
    g.fillStyle = '#d6d1c3'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#2a2b2d'; g.textAlign = 'left';
    g.font = `600 84px ${SANS}`; g.fillText('Cells from partner farms', 70, 130);
    g.font = `400 32px ${SANS}`; g.fillStyle = '#4b4844'; g.fillText('Donor animals live on partner farms and are sampled regularly.', 74, 186);
    g.font = `500 22px ${MONO}`; g.fillStyle = '#6b6662'; g.textAlign = 'right'; g.fillText('PARTNER FARMS · SINCE 2021', W - 70, 120);
    g.fillStyle = '#2a2b2d'; g.fillRect(70, 205, W - 140, 3);
    for (const [x, y, w, h, cap] of MURAL.photos) {                       // 照片位置先留灰色底
      g.fillStyle = '#9a9a92'; g.fillRect(x, y, w, h);
      g.fillStyle = '#3a3a38'; g.font = `400 24px ${SANS}`; g.textAlign = 'left'; g.fillText(cap, x, y + h + 34);
    }
    // 右边：牧场分布图（灰色地形、河流、7 个点；下面只列了 6 个）
    const mx = 1280, my = 230, mw = 1050, mh = 470;
    g.fillStyle = '#c4c0b2'; g.fillRect(mx, my, mw, mh);
    g.fillStyle = '#aaa898'; g.beginPath(); g.moveTo(mx, my + mh * 0.62);
    for (let k = 0; k <= 20; k++) g.lineTo(mx + mw * k / 20, my + mh * (0.55 + Math.sin(k * 1.3) * 0.06 + (k / 20) * 0.1));
    g.lineTo(mx + mw, my + mh); g.lineTo(mx, my + mh); g.fill();
    g.strokeStyle = '#8a9a9e'; g.lineWidth = 6; g.beginPath(); g.moveTo(mx + 40, my + 20);
    for (let k = 1; k <= 12; k++) g.lineTo(mx + 40 + k * 60, my + 20 + k * 34 + Math.sin(k) * 24); g.stroke();
    g.strokeStyle = 'rgba(60,60,58,.35)'; g.lineWidth = 2; for (let k = 1; k < 6; k++) { g.beginPath(); g.moveTo(mx, my + k * mh / 6); g.lineTo(mx + mw, my + k * mh / 6); g.stroke(); g.beginPath(); g.moveTo(mx + k * mw / 6, my); g.lineTo(mx + k * mw / 6, my + mh); g.stroke(); }
    const pins = [[0.18, 0.3], [0.32, 0.55], [0.5, 0.22], [0.62, 0.48], [0.76, 0.3], [0.44, 0.78], [0.88, 0.7]];
    pins.forEach(([px, py], k) => {
      const x = mx + px * mw, y = my + py * mh;
      g.fillStyle = '#7a2420'; g.beginPath(); g.arc(x, y, 14, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f0ece0'; g.font = `700 18px ${SANS}`; g.textAlign = 'center'; g.fillText(String(k + 1), x, y + 6);
    });
    g.fillStyle = '#2a2b2d'; g.font = `600 28px ${SANS}`; g.textAlign = 'left'; g.fillText('Our partner farms', mx, my + mh + 44);
    const rows = [['No. 1', 'cattle', '120 head'], ['No. 2', 'cattle', '86 head'], ['No. 3', 'pigs', '64 head'], ['No. 4', 'pigs', '40 head'], ['No. 5', 'chickens', '800 birds'], ['No. 6', 'croaker', '12 net pens']];
    g.font = `400 22px ${SANS}`; g.fillStyle = '#3a3a38';
    rows.forEach(([a, b, c], k) => { const x = mx + (k % 3) * 360, y = my + mh + 86 + Math.floor(k / 3) * 40; g.fillText(`${a}  ${b}`, x, y); g.textAlign = 'right'; g.fillText(c, x + 320, y); g.textAlign = 'left'; });
    // 认证章（盖歪了，褪色）
    g.save(); g.translate(2230, 830); g.rotate(-0.18); g.strokeStyle = 'rgba(140,40,36,.55)'; g.lineWidth = 6;
    g.beginPath(); g.arc(0, 0, 82, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(0, 0, 66, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(140,40,36,.55)'; g.font = `700 24px ${SANS}`; g.textAlign = 'center'; g.fillText('ANIMAL', 0, -6); g.fillText('WELFARE', 0, 26);
    g.restore();
    g.font = `400 18px ${SANS}`; g.fillStyle = '#8a8580'; g.textAlign = 'left'; g.fillText('*Photos show meat grown from each cell line, not the farms themselves.', 70, H - 24);
    ageCanvas(g, W, H, { amount: 1.3, seed: 17 });   // 褪色、水渍、往下流的污痕
  });
}
// 把渲染好的动物照片贴进展板：按框裁切、去饱和、压一层发黄的旧色，再做旧一次
function drawMuralPhotos(tx, imgs) {
  const g = tx.image.getContext('2d');
  MURAL.photos.forEach(([x, y, w, h], i) => {
    const im = imgs[i]; if (!im) return;
    const s = Math.max(w / im.width, h / im.height), sw = w / s, sh = h / s;
    g.save(); g.filter = 'saturate(0.55) contrast(0.9) brightness(0.92)';
    g.drawImage(im, (im.width - sw) / 2, (im.height - sh) * 0.5, sw, sh, x, y, w, h);
    g.restore();
    g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(214,200,160,.55)'; g.fillRect(x, y, w, h); g.restore();
    g.strokeStyle = '#ece8dc'; g.lineWidth = 8; g.strokeRect(x, y, w, h);
  });
  ageCanvas(g, MURAL.W, MURAL.H, { amount: 0.9, seed: 23 });
  tx.needsUpdate = true;
}

// ------------------------------------------------------------------ 绿植
function plant(parent, x, z, s = 1, leafMat = M.leaf) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g);
  cyl(0.2, 0.16, 0.42, M.pot, 0, 0.21, 0, g, 20);
  cyl(0.012, 0.018, 1.0, M.oakDark, 0, 0.8, 0, g, 6);
  const leafGeo = new THREE.SphereGeometry(0.12, 10, 6); leafGeo.scale(1, 0.18, 0.6);
  for (let i = 0; i < 22; i++) {
    const a = i * 2.4, y = 0.75 + (i / 22) * 0.8, r = 0.12 + Math.sin(i) * 0.05;
    const l = new THREE.Mesh(leafGeo, leafMat);
    l.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    l.rotation.set(Math.sin(i) * 0.6, -a, 0.5);
    g.add(l);
  }
}

// ------------------------------------------------------------------ 场景
// 店内（重做）：前面是伪装用的普通杂货，真正的交易在后墙的取货窗口——
// 隔着铁栏和厚玻璃，柜台后面是一整墙写着细胞系编号的小抽屉（参考老药铺）和冷藏抽屉（参考停尸房）。
// 墙上到处是“零屠宰”“吃肉不必杀生”的宣传：隐秘的店，也要靠这套说法吸引熟客。
export function createRoom(env) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x161816);
  scene.environment = env;
  scene.environmentIntensity = 0.32;                                              // 环境光压低：灯下的光斑和暗角拉开
  const room = new THREE.Group();
  scene.add(room);
  const blobMat = new THREE.MeshBasicMaterial({ map: blobShadow(), transparent: true, depthWrite: false, opacity: 0.7 });
  const blob = (x, z, sx, sz = sx) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), blobMat); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.004, z); room.add(p); };
  // 海报做旧：覆膜反光（清漆层）+ 照片扫描的水渍、划痕贴花 + 四个角贴发黄的胶带（有的翘起来）
  const tapeM = new THREE.MeshPhysicalMaterial({ color: 0xd8c898, roughness: 0.45, transparent: true, opacity: 0.75, clearcoat: 0.4 });
  const agePoster = (mesh, w, h, seed, { tape = true, glossy = 0.5, glow = 0 } = {}) => {
    const map = mesh.material.map;
    mesh.material = new THREE.MeshPhysicalMaterial({ map, roughness: 0.55, clearcoat: glossy, clearcoatRoughness: 0.18, emissive: glow ? 0xffffff : 0x000000, emissiveMap: glow ? map : null, emissiveIntensity: glow });
    let n = seed; const r = () => (n = (n * 16807) % 2147483647) / 2147483647;
    decal(['SurfaceImperfections009', 'SurfaceImperfections011', 'SurfaceImperfections001'][seed % 3], mesh, { pos: [(r() - 0.5) * w * 0.5, (r() - 0.5) * h * 0.5, 0.0008], w: w * (0.35 + r() * 0.3), h: w * (0.35 + r() * 0.3), color: 0x8a7040, opacity: 0.4 });
    decal('Scratches003', mesh, { pos: [0, 0, 0.0009], w, h, color: 0xffffff, opacity: 0.25, roughness: 0.4 });
    decal('Leaking010A', mesh, { pos: [w * (r() - 0.5) * 0.7, h * 0.25, 0.001], w: w * 0.08, h: h * 0.5, color: 0x6a5a3a, opacity: 0.5 });
    if (tape) for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { if (r() < 0.15) continue;   // 偶尔少一块胶带
      const t = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.03), tapeM); t.position.set(sx * w / 2 * 0.97, sy * h / 2 * 0.97, 0.0015 + (r() < 0.25 ? 0.004 : 0)); t.rotation.set(r() < 0.25 ? -0.3 : 0, 0, sx * sy * 0.78 + (r() - 0.5) * 0.3); mesh.add(t); }
    return mesh;
  };
  const wallMat = (w, h, o = {}) => pbr('long_white_tiles', w, h, { size: 2.6, rotate: Math.PI / 2, roughness: 0.8, envMapIntensity: 0.8, color: 0xd6d2c8 });   // 真实的旧白瓷砖（照片扫描，横贴）   // 真实的脏白瓷砖（照片扫描）
  let rs = 11;
  const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;

  // ---------------------------------------------------------------- 地、墙、顶
  // 层高 4.4 m（老厂房改的店，顶上走着管子）；左墙退到 x = −7，留出用餐区
  const HT = 4.4, LX = -7.0, RW = 5 - LX, RCX = (5 + LX) / 2;
  const fl = grimeFloorMaps('room', { checker: [[62, 62, 58], [150, 144, 130]], n: 8, seed: 44, gloss: 3 });   // 冷柜特写还在用
  for (const t of [fl.map, fl.roughnessMap, fl.normalMap]) t.repeat.set(RW / 1.6, 9 / 1.6);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(RW, 9), userMat('floor_checker.webp', RW, 9, { size: 3.0, roughness: 0.55, bump: 0.6, envMapIntensity: 1.3, color: 0xb8b4ac }));   // 你给的绿、米色格子旧地砖（12 块 = 3 m）
  floor.rotation.x = -Math.PI / 2; floor.position.set(RCX, 0, 0.5);
  room.add(floor);
  const cm = stainedCeilingMaps();
  cm.map.repeat.set(RW / 2.4, 9 / 2.4);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(RW, 9), pbr('damaged_plaster', RW, 9, { size: 2.2, color: 0x8a8880 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(RCX, HT, 0.5);
  room.add(ceil);
  for (let x = LX + 1.5; x < 5; x += 3) box(0.18, 0.4, 9, M.ink, x, HT - 0.2, 0.5, room);   // 顶上的混凝土梁
  const flickerTube = new THREE.MeshBasicMaterial({ color: M.tube.color.clone() });
  [[0.6, 1.4], [2.6, 3.6], [-2.6, 3.8], [-5.2, 3.6], [-2.4, -2.4]].forEach(([x, z], i) => {
    const g = new THREE.Group(); g.position.set(x, HT - 0.8, z); room.add(g);
    for (const dx of [-0.5, 0.5]) cyl(0.004, 0.004, 0.8, M.ink, dx, 0.4, 0, g, 4);
    box(1.32, 0.06, 0.24, M.fixture, 0, -0.03, 0, g);
    for (const dz of [-0.055, 0.055]) box(1.22, 0.026, 0.026, i === 0 ? flickerTube : i === 2 ? M.deadTube : M.tube, 0, -0.075, dz, g);
  });
  for (const [z, rr, y, x0, x1] of [[-3.82, 0.055, HT - 0.35, LX, 5], [-3.68, 0.032, HT - 0.25, LX, 5], [4.82, 0.045, HT - 0.3, LX, 5], [0.2, 0.2, HT - 0.55, LX, 5], [-1.0, 0.07, HT - 0.75, LX, 5]]) { const pp = cyl(rr, rr, x1 - x0, M.pipe, (x0 + x1) / 2, y, z, room, 18); pp.rotation.z = Math.PI / 2; }
  for (const [x, rr] of [[4.82, 0.05], [LX + 0.15, 0.04]]) { const pp = cyl(rr, rr, 9, M.pipe, x, HT - 0.3, 0.5, room, 14); pp.rotation.x = Math.PI / 2; }
  box(0.12, 0.08, 9, M.fixture, LX + 0.08, HT - 0.1, 0.5, room);
  { const { DZ0, DZ1, DH } = OFFICE;                                              // 左墙靠门口那段开一道门，进办公室
    box(0.1, HT, DZ0 + 4, wallMat(DZ0 + 4, HT), LX - 0.05, HT / 2, (DZ0 - 4) / 2, room);
    box(0.1, HT, 5 - DZ1, wallMat(5 - DZ1, HT), LX - 0.05, HT / 2, (DZ1 + 5) / 2, room);
    box(0.1, HT - DH, DZ1 - DZ0, wallMat(DZ1 - DZ0, HT - DH, { dado: 0, ao: 0.2 }), LX - 0.05, (HT + DH) / 2, (DZ0 + DZ1) / 2, room); }
  box(0.1, HT, 3.0, wallMat(3.0, HT), 5.05, HT / 2, -2.6, room);
  box(0.1, HT, 4.5, wallMat(4.5, HT), 5.05, HT / 2, 2.75, room);
  box(0.1, HT - 2.5, 1.6, wallMat(1.6, HT - 2.5, { dado: 0, ao: 0.2 }), 5.05, (HT + 2.5) / 2, -0.3, room);
  box(3.55, HT, 0.1, wallMat(3.55, HT), 3.225, HT / 2, 5.05, room);
  box(6.45, HT - 2.6, 0.1, wallMat(6.45, HT - 2.6, { dado: 0, ao: 0.2 }), -1.775, (HT + 2.6) / 2, 5.05, room);
  box(-5 - LX, HT, 0.1, wallMat(-5 - LX, HT), (LX - 5) / 2, HT / 2, 5.05, room);

  // 小工具：单据、纸箱、软管
  const paperTex = (seed, o = {}) => canvasTexture(o.w || 200, o.h || 260, (g, W, H) => {
    g.fillStyle = o.bg || '#e9e4d2'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(30,30,40,.55)';
    if (o.head) { g.font = `600 ${Math.round(W * 0.09)}px ${SANS}`; g.fillText(o.head, W * 0.08, H * 0.12); }
    for (let y = H * 0.2; y < H * 0.92; y += H * 0.055) g.fillRect(W * 0.08, y, W * (0.4 + ((seed * 13 + y) % 7) / 14), 2);
    ageCanvas(g, W, H, { amount: 1, seed });
  });
  const paperMats = [0, 1, 2, 3].map((i) => new THREE.MeshStandardMaterial({ map: paperTex(i + 3, { head: ['PICK-UP', 'HANDOVER', 'STOCK', 'BATCH'][i] }), roughness: 0.95, side: THREE.DoubleSide }));
  const floorPaper = (x, z, s = 0.22) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(s * 0.78, s), paperMats[Math.floor(rnd() * 4)]); p.rotation.set(-Math.PI / 2, 0, rnd() * 6); p.position.set(x, 0.006, z); room.add(p); };
  const carton = (x, y, z, w, h, d, ry = 0, parent = room) => { const b = box(w, h, d, M.carton, x, y + h / 2, z, parent); b.rotation.y = ry; box(w + 0.002, 0.004, 0.05, M.tape, 0, h / 2 + 0.001, 0, b); return b; };
  const hose = (pts, r, mat = M.rubber, parent = room) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 48, r, 8), mat); parent.add(m); return m; };
  const wireRack = (parent, w, d, h, levels) => {
    for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) cyl(0.012, 0.012, h, M.steel, x, h / 2, z, parent, 8);
    for (const y of levels) { box(w, 0.012, d, M.steel, 0, y, 0, parent); for (const z of [-d / 2, d / 2]) box(w, 0.025, 0.006, M.steel, 0, y + 0.01, z, parent); }
  };
  const neon = (text, w, h, size, color) => canvasTexture(w, h, (g, W, H) => {
    g.clearRect(0, 0, W, H); g.font = `700 ${size}px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = size * 0.35; g.fillStyle = '#fff'; g.fillText(text, W / 2, H / 2);
    g.shadowBlur = 0; g.lineWidth = size * 0.06; g.strokeStyle = color; g.strokeText(text, W / 2, H / 2);
  });

  // ================================================================ 后墙：熟食柜台（参考老式快餐店的不锈钢吧台）
  // 客人坐在吧台前试吃、看价目表；厨师在后面的铁板上煎肉；结算终端在吧台右端。
  // 吧台后墙：左边一柜写着细胞系编号的小抽屉，中间是通往后厨的传菜窗，右边是放调料和餐具的开放架。
  const CT = 1.05;                                                               // 台面高度
  const brushed = new THREE.MeshStandardMaterial({ color: 0xb8b4aa, roughness: 0.3, metalness: 0.9, envMapIntensity: 1.2, map: grimeMap(41) });
  const brushedDark = new THREE.MeshStandardMaterial({ color: 0x5f5d56, roughness: 0.5, metalness: 0.7, map: grimeMap(42) });
  // 凳面：真实的皮革纹理（法线、粗糙度来自扫描），暗红色；镀铬件很亮
  const lthPath = 'assets/ph/tex/leather_red_02/', lthLoader = new THREE.TextureLoader();
  const lt = (f, srgb) => { const t = lthLoader.load(lthPath + f); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.6, 0.6); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  const vinyl = new THREE.MeshStandardMaterial({ color: 0x6a1a18, roughness: 1, roughnessMap: lt('rough.jpg'), normalMap: lt('nor.jpg'), aoMap: lt('ao.jpg'), envMapIntensity: 0.8 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe0e0dc, roughness: 0.14, metalness: 1, envMapIntensity: 1.4, map: grimeMap(44) });
  // 拉丝不锈钢：每块板用不同的种子，磨损、手印都不一样
  const steelVariants = [[0, 0], [0.37, 0.21], [0.66, 0.53]].map((offset) => userMat('steel_worn.webp', 1, 1, { size: 1.2, offset, bump: 0.15, metalness: 0.85, roughness: 0.42, envMapIntensity: 1.6, color: 0xe8e6e0 }));
  const steelMat = (seed) => steelVariants[seed % 3];                         // 你给的旧不锈钢：指纹、划痕、锈点
  const counter = new THREE.Group(); room.add(counter);
  // ---- 前台：一块块拉丝不锈钢板拼成（板缝、铆钉、上下两道圆包边、凹进去的黑色踢脚），左端半圆，右端回转到墙
  const FX0 = -0.9, FX1 = 3.45, FZ = -1.75, FD = 0.55;
  box(FX1 - FX0, CT - 0.07, FD - 0.04, brushedDark, (FX0 + FX1) / 2, (CT - 0.07) / 2, FZ - FD / 2 - 0.02, counter);   // 柜体
  const NP = 6, PW = (FX1 - FX0) / NP, PY0 = 0.13, PY1 = CT - 0.08;
  for (let k = 0; k < NP; k++) {
    const p = box(PW - 0.006, PY1 - PY0, 0.018, steelMat(31 + k), FX0 + (k + 0.5) * PW, (PY0 + PY1) / 2, FZ - 0.009, counter);
    p.rotation.y = (k % 2 ? 1 : -1) * 0.0015;                                   // 板子没装得那么平
  }
  { const rv = new THREE.InstancedMesh(new THREE.SphereGeometry(0.006, 8, 4), chrome, (NP + 1) * 4); const m4 = new THREE.Matrix4(); let n = 0;
    for (let k = 0; k <= NP; k++) for (const y of [0.2, 0.45, 0.7, 0.93]) { m4.makeTranslation(FX0 + k * PW + (k === 0 ? 0.02 : k === NP ? -0.02 : 0), y, FZ + 0.002); rv.setMatrixAt(n++, m4); } counter.add(rv); }
  const roll = (r, y, z, x0, x1, mat = chrome) => { const c = cyl(r, r, x1 - x0, mat, (x0 + x1) / 2, y, z, counter, 16); c.rotation.z = Math.PI / 2; return c; };
  roll(0.026, PY1 + 0.012, FZ + 0.006, FX0, FX1);                              // 上面的圆包边
  roll(0.018, PY0 - 0.004, FZ + 0.004, FX0, FX1);                              // 下面的圆包边
  box(FX1 - FX0, 0.11, 0.02, M.ink, (FX0 + FX1) / 2, 0.055, FZ - 0.06, counter); // 凹进去的踢脚
  { const end = new THREE.Mesh(new THREE.CylinderGeometry(FD / 2, FD / 2, PY1 - PY0, 40, 1, true, Math.PI, Math.PI), steelMat(37)); end.position.set(FX0, (PY0 + PY1) / 2, FZ - FD / 2); counter.add(end);
    const kick = new THREE.Mesh(new THREE.CylinderGeometry(FD / 2 - 0.05, FD / 2 - 0.05, 0.11, 32, 1, true, Math.PI, Math.PI), M.ink); kick.position.set(FX0, 0.055, FZ - FD / 2); counter.add(kick);
    for (const [y, r] of [[PY1 + 0.012, 0.026], [PY0 - 0.004, 0.018]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(FD / 2 + 0.002, r, 10, 40, Math.PI), chrome); t.rotation.set(Math.PI / 2, 0, Math.PI / 2); t.position.set(FX0, y, FZ - FD / 2); counter.add(t); } }
  box(0.55, CT - 0.07, 1.0, steelMat(38), FX1 - 0.275, (CT - 0.07) / 2, FZ - FD - 0.5, counter);
  // 台面：4 cm 厚的不锈钢，前沿包一道圆边，左端是半圆
  const topMat = steelMat(40, false);
  box(FX1 - FX0, 0.04, FD + 0.17, topMat, (FX0 + FX1) / 2, CT - 0.02, FZ - FD / 2 + 0.06, counter);
  roll(0.022, CT - 0.02, FZ + 0.145, FX0, FX1, topMat);
  { const c = new THREE.Mesh(new THREE.CylinderGeometry(FD / 2 + 0.085, FD / 2 + 0.085, 0.04, 40, 1, false, Math.PI, Math.PI), topMat); c.position.set(FX0, CT - 0.02, FZ - FD / 2 + 0.06); counter.add(c);
    const t = new THREE.Mesh(new THREE.TorusGeometry(FD / 2 + 0.085, 0.022, 10, 40, Math.PI), topMat); t.rotation.set(Math.PI / 2, 0, Math.PI / 2); t.position.set(FX0, CT - 0.02, FZ - FD / 2 + 0.06); counter.add(t); }
  box(0.62, 0.04, 1.0, topMat, FX1 - 0.275, CT - 0.02, FZ - FD - 0.5, counter);
  box(0.6, 0.004, 0.5, brushedDark, FX1 - 0.275, CT + 0.001, FZ - FD - 0.75, counter);   // 掀板的合页缝
  box(FX1 - FX0, 0.022, 0.012, vinyl, (FX0 + FX1) / 2, 0.12, FZ + 0.012, counter);       // 暗红色防撞条
  { const fl = new THREE.PointLight(0xffc890, 2.2, 3.2, 1.6); fl.position.set(1.2, 0.55, FZ + 1.4); counter.add(fl); }   // 店里的暖光照在吧台正面
  // 脚踏杆
  { const r = cyl(0.016, 0.016, FX1 - FX0 - 0.1, chrome, (FX0 + FX1) / 2, 0.21, FZ + 0.13, counter, 12); r.rotation.z = Math.PI / 2; }
  for (const x of [-0.6, 0.6, 1.8, 3.0]) box(0.02, 0.02, 0.13, chrome, x, 0.21, FZ + 0.065, counter);
  // 吧台前面贴着几张贴纸
  const sticker = (lines, w, h, bg, x, y, rz) => { const s = plane(w, h, sign(lines, Math.round(w * 800), Math.round(h * 800), { bg }), x, y, FZ + 0.013, 0, counter); s.rotation.z = rz; return s; };
  sticker([['NO KILL', 46, '#fff', 0.45, 700], ['cultivated meat', 26, 'rgba(255,255,255,.85)', 0.78, 500]], 0.26, 0.15, '#7a2420', -0.35, 0.48, 0.05);
  sticker([['REFER A FRIEND', 30, '#222', 0.4, 700], ['¥30 off first order', 26, '#7a2420', 0.75, 600]], 0.22, 0.13, '#e2dac2', 2.75, 0.5, -0.04);
  sticker([['NO PHOTOS INSIDE', 28, '#222', 0.6, 600]], 0.24, 0.07, '#d8c070', 1.75, 0.82, 0.02);
  // 圆凳：镀铬立柱 + 暗红色人造革坐垫
  // 圆凳：底座 Ø38 cm、坐垫 Ø38 cm、总高 0.771 m（底座和坐垫一样宽，所以倒下以后会像圆柱一样滚）
  const SR = 0.19, SH = 0.771;
  const stool = (parent) => {
    const s = new THREE.Group(); parent.add(s);
    cyl(0.17, SR, 0.03, chrome, 0, 0.015, 0, s, 24);
    cyl(0.028, 0.028, 0.64, chrome, 0, 0.35, 0, s, 12);
    cyl(0.12, 0.12, 0.012, chrome, 0, 0.3, 0, s, 20);
    cyl(0.185, 0.18, 0.025, chrome, 0, 0.68, 0, s, 28);
    cyl(SR, SR, 0.07, vinyl, 0, 0.725, 0, s, 28);
    cyl(0.175, SR, 0.012, vinyl, 0, 0.765, 0, s, 28);
    // 翻过来才看得见的底面：底座下面一圈黑色橡胶垫，坐垫下面是黑漆钢板和四颗螺丝
    { const pad = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.185, 32), M.rubber); pad.rotation.x = Math.PI / 2; pad.position.y = -0.0005; s.add(pad);
      const under = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), M.ink); under.rotation.x = Math.PI / 2; under.position.y = 0.0005; s.add(under);
      const plate = new THREE.Mesh(new THREE.CircleGeometry(0.175, 32), M.ink); plate.rotation.x = Math.PI / 2; plate.position.y = 0.667; s.add(plate);
      for (let k = 0; k < 4; k++) cyl(0.008, 0.008, 0.006, chrome, Math.cos(k * Math.PI / 2 + 0.78) * 0.09, 0.664, Math.sin(k * Math.PI / 2 + 0.78) * 0.09, s, 8); }
    return s;
  };
  for (const x of [-0.4, 2.15]) { stool(counter).position.set(x, 0, FZ + 0.45); blob(x, FZ + 0.45, 0.55); }
  // 歪斜的一把：底座靠吧台一侧的边缘着地当支点，往吧台倒，坐垫边缘靠在吧台正面的不锈钢板上（重心在支点和靠点之间，靠摩擦力站住）。
  //   支点离吧台面板 d = 0.26 m，坐垫最外沿离支点高 0.765 m → 倾角 θ = asin(d / 0.765) ≈ 20°；
  //   这时坐垫碰到面板的高度是 0.72 m（面板 0.13–0.97 m 之间），立柱离脚踏杆还有 20 cm，不会碰到。
  { const d = 0.26, th = Math.asin(d / 0.765);
    const pv = new THREE.Group(); pv.position.set(0.47, 0, FZ + d); pv.rotation.set(-th, 0.0, 0); counter.add(pv);
    const s = stool(pv); s.position.z = SR; s.rotation.y = 0.7;                           // 绕自己的轴转一点（圆的，看不出来，但坐垫的纹理会转）
    blob(0.47, FZ + d + 0.08, 0.5, 0.7); }
  // 倒下的一把：躺在地上，底座边缘和坐垫边缘同时着地，所以立柱轴线离地正好 0.19 m；
  //   倒下后滚向吧台，直到两头的圆边都顶住脚踏杆（杆心 y 0.21、离面板 0.13 m、半径 1.6 cm）：
  //   圆心到杆心的距离 = 0.19 + 0.016 → 轴线离面板 0.13 + √(0.206² − 0.02²) ≈ 0.335 m。
  { const zc = FZ + 0.13 + Math.sqrt(0.206 ** 2 - 0.02 ** 2), x0 = 0.92;
    const s = stool(counter); s.position.set(x0, SR, zc); s.rotation.set(0.9, 0, -Math.PI / 2);   // 轴线沿 +x，绕轴滚过的角度随意
    blob(x0 + SH / 2, zc, SH + 0.25, 0.45); }
  blob(1.2, -2.4, 5.0, 1.6);

  // ---- 后墙：要开一个传菜窗的洞，所以后墙拆成几块
  const WX0 = 0.55, WX1 = 1.85, WY0 = 1.2, WY1 = 2.0;
  box(WX0 - LX, HT, 0.1, wallMat(WX0 - LX, HT), (WX0 + LX) / 2, HT / 2, -4.05, room);
  box(5 - WX1, HT, 0.1, wallMat(5 - WX1, HT), (WX1 + 5) / 2, HT / 2, -4.05, room);
  box(WX1 - WX0, WY0, 0.1, wallMat(WX1 - WX0, WY0), (WX0 + WX1) / 2, WY0 / 2, -4.05, room);
  box(WX1 - WX0, HT - WY1, 0.1, wallMat(WX1 - WX0, HT - WY1, { dado: 0 }), (WX0 + WX1) / 2, (HT + WY1) / 2, -4.05, room);
  { const band = (w, x, z, ry) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, 0.02), pbr('long_white_tiles', w, 0.15, { size: 2.6, rotate: Math.PI / 2, color: 0x3e7458, roughness: 0.5 })); b.position.set(x, 1.15, z); b.rotation.y = ry; room.add(b); };
    band(OFFICE.DZ0 + 4, LX + 0.01, (OFFICE.DZ0 - 4) / 2, Math.PI / 2); band(5 - OFFICE.DZ1, LX + 0.01, (OFFICE.DZ1 + 5) / 2, Math.PI / 2); band(WX0 - LX, (WX0 + LX) / 2, -3.99, 0); band(5 - WX1, (WX1 + 5) / 2, -3.99, 0); band(3.0, 4.99, -2.6, -Math.PI / 2); band(4.5, 4.99, 2.75, -Math.PI / 2); }
  // 绿色腰线以下：深色的旧木护墙板（竖条企口板，每条截取木纹的不同位置），底下踢脚线，上沿一道木压条托住绿线；以上仍是白瓷砖
  { const BH = 1.075, BW = 0.096, T = 0.018;
    const wood = pbr('wood_table_worn', 1, 1, { size: 1.0, rotate: Math.PI / 2, roughness: 0.62, color: 0xc4ad98 });
    const trim = pbr('wood_table_worn', 1, 1, { size: 0.6, roughness: 0.55, color: 0x8a7462 });
    const r = (() => { let n = 4242; return () => (n = (n * 16807) % 2147483647) / 2147483647; })();
    const run = (a0, a1, axis, plane, dir) => {            // axis 'x' or 'z' along the wall; plane = wall face coordinate; dir = +1/-1 into the room
      const L = a1 - a0, n = Math.floor(L / BW), bw = L / n;
      for (let i = 0; i < n; i++) {
        const g = new THREE.BoxGeometry(axis === 'x' ? bw - 0.004 : T, BH - 0.12, axis === 'x' ? T : bw - 0.004), uv = g.attributes.uv, du = r() * 3, dv = r() * 3;
        for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * 0.1 + du, uv.getY(k) + dv);
        const c = a0 + (i + 0.5) * bw, o = new THREE.Mesh(g, wood);
        o.position.set(axis === 'x' ? c : plane + dir * T / 2, 0.12 + (BH - 0.12) / 2, axis === 'x' ? plane + dir * T / 2 : c); room.add(o);
      }
      const mid = (a0 + a1) / 2;
      box(axis === 'x' ? L : 0.026, 0.12, axis === 'x' ? 0.026 : L, trim, axis === 'x' ? mid : plane + dir * 0.013, 0.06, axis === 'x' ? plane + dir * 0.013 : mid, room);        // skirting
      box(axis === 'x' ? L : 0.034, 0.032, axis === 'x' ? 0.034 : L, trim, axis === 'x' ? mid : plane + dir * 0.017, BH - 0.006, axis === 'x' ? plane + dir * 0.017 : mid, room);   // cap rail under the green band
    };
    run(-4, OFFICE.DZ0, 'z', LX, 1); run(OFFICE.DZ1, 5, 'z', LX, 1);                                    // left wall, broken by the office door
    run(LX, -4.95, 'x', -4.0, 1); run(-3.85, 5, 'x', -4.0, 1);                                            // back wall, broken by the staff door
    run(-4.1, -1.1, 'z', 5.0, -1); run(0.5, 5, 'z', 5.0, -1);                                             // right wall, broken by the processing-room curtain
    run(1.5, 5, 'x', 5.0, -1); run(LX, -5.05, 'x', 5.0, -1);                                            // front wall: the solid stretches either side of the glass
    for (const [w, x] of [[3.5, 3.25], [-5.05 - LX, (LX - 5.05) / 2]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, 0.02), pbr('long_white_tiles', w, 0.15, { size: 2.6, rotate: Math.PI / 2, color: 0x3e7458, roughness: 0.5 })); b.position.set(x, 1.15, 4.99); room.add(b); }
  }
  // 传菜窗的不锈钢圆角框
  {
    const sh = new THREE.Shape(); sh.moveTo(-0.82, -0.56); sh.lineTo(0.82, -0.56); sh.lineTo(0.82, 0.56); sh.lineTo(-0.82, 0.56); sh.lineTo(-0.82, -0.56);
    const hole = new THREE.Path(), hw = (WX1 - WX0) / 2, hh = (WY1 - WY0) / 2, r = 0.13;
    hole.moveTo(-hw + r, -hh); hole.lineTo(hw - r, -hh); hole.quadraticCurveTo(hw, -hh, hw, -hh + r); hole.lineTo(hw, hh - r); hole.quadraticCurveTo(hw, hh, hw - r, hh);
    hole.lineTo(-hw + r, hh); hole.quadraticCurveTo(-hw, hh, -hw, hh - r); hole.lineTo(-hw, -hh + r); hole.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
    sh.holes.push(hole);
    const fr = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 8 }), brushed);
    fr.position.set((WX0 + WX1) / 2, (WY0 + WY1) / 2, -4.0); room.add(fr);
    box(WX1 - WX0 + 0.3, 0.04, 0.3, M.steel, (WX0 + WX1) / 2, WY0 + 0.02, -3.9, room);   // 出菜台
  }
  // 后厨（只从窗口里看到一角）：暖光、挂着的锅、汤桶、蒸汽；最里面是 PVC 门帘，门帘后面透出蓝色防水布
  {
    const k = new THREE.Group(); k.position.set((WX0 + WX1) / 2, 0, -4.1); room.add(k);
    const kw = pbr('Tiles133B', 2.2, 3.2, { size: 1.4, roughness: 0.6, color: 0xd8c4a4 });          // 后厨：脏的白色小方砖（照片扫描）
    box(2.2, 0.05, 1.4, kw, 0, 0.0, -0.7, k); box(2.2, 0.05, 1.4, kw, 0, 3.2, -0.7, k);
    box(0.05, 3.2, 1.4, kw, -1.1, 1.6, -0.7, k); box(0.05, 3.2, 1.4, kw, 1.1, 1.6, -0.7, k);
    box(2.2, 3.2, 0.05, kw, 0, 1.6, -1.4, k);
    box(2.0, 0.9, 0.6, brushedDark, 0, 0.45, -1.05, k); box(2.0, 0.04, 0.62, M.steel, 0, 0.92, -1.05, k);
    // ---- 锅具：都用车床旋转体做（有壁厚、卷边、平底），按材质分：铸铁、熟铁炒锅（锅心发蓝发褐）、不锈钢、铝（底下熏黑）
    const potTex = (inside, outside, soot) => canvasTexture(64, 256, (g, W, H) => {   // 沿旋转体轮廓（v）上色：外底→外壁→卷边→内壁→锅心
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, soot || outside); gr.addColorStop(0.28, outside); gr.addColorStop(0.5, outside); gr.addColorStop(0.52, inside[0]); gr.addColorStop(0.85, inside[1]); gr.addColorStop(1, inside[2]);
      g.fillStyle = gr; g.fillRect(0, 0, W, H); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.06})`; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); } });
    const potMat = (o) => new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, bumpScale: 0.2, ...o });
    const PM = {
      iron: potMat({ map: potTex(['#2a2826', '#242220', '#1e1b18'], '#1c1c1d'), metalness: 0.55, roughness: 0.72 }),                      // 铸铁
      wok: potMat({ map: potTex(['#2c2a2a', '#3a3440', '#5a4030'], '#1a1a1c'), metalness: 0.7, roughness: 0.48 }),                          // 熟铁炒锅：锅心烧出蓝紫、褐色
      steel: potMat({ map: potTex(['#c8cac8', '#bcbeba', '#b0b0aa'], '#c4c6c4', '#6a645a'), metalness: 0.92, roughness: 0.3 }),              // 不锈钢：底上一圈火烧的黄褐
      alu: potMat({ map: potTex(['#b8b8b2', '#aaa8a0', '#9a968c'], '#a8a8a2', '#2a2622'), metalness: 0.8, roughness: 0.5 }),                // 铝：底下熏黑
    };
    const woodH = userMat('wood_dark.webp', 1, 1, { size: 0.2, roughness: 0.6 });
    // 轮廓：半径 R、高 Hh、底的圆角 rb、壁厚 t、round=true 是圆底（炒锅）；UV 的 v 从外底中心 0 走到内底中心 1
    const potGeo = (R, Hh, { rb = 0.02, t = 0.004, round = false } = {}) => {
      const out = [];
      if (round) for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI / 2; out.push(new THREE.Vector2(Math.sin(a) * R, Hh - Math.cos(a) * Hh)); }
      else { out.push(new THREE.Vector2(0.0001, 0)); for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI / 2; out.push(new THREE.Vector2(R - rb + Math.sin(a) * rb, rb - Math.cos(a) * rb)); } out.push(new THREE.Vector2(R + 0.003, Hh)); }
      const lip = [new THREE.Vector2(R + 0.003 + t * 0.6, Hh + t * 0.4), new THREE.Vector2(R + 0.003, Hh + t)];
      const inn = out.slice().reverse().map((v) => new THREE.Vector2(Math.max(0.0001, v.x - t), v.y + t));
      return new THREE.LatheGeometry([...out, ...lip, ...inn], 48);
    };
    // 一口锅（开口朝 +y，柄朝 +x），返回 { g, hole }：hole 是柄上挂孔的位置
    const makePot = (kind) => {
      const g = new THREE.Group(); let hole = null;
      const handle = (len, mat, y, r = 0.011, wood = false) => {                 // 长柄：从锅沿往外斜一点，末端有个挂孔
        const h = new THREE.Group(); h.position.set(0, y, 0); h.rotation.z = 0.18; g.add(h);
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.75, r, len, 12), wood ? woodH : mat); sh.rotation.z = -Math.PI / 2; sh.position.x = len / 2; sh.scale.z = 0.6; h.add(sh);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.0025, 6, 16), mat); ring.position.set(len - 0.01, 0, 0); ring.rotation.x = Math.PI / 2; if (!wood) h.add(ring);
        const hp = new THREE.Object3D(); hp.position.set(len - 0.01, 0, 0); h.add(hp); hole = hp; return h;
      };
      const ears = (R, y, mat) => { for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.005, 6, 16, Math.PI), mat); e.position.set(sx * (R + 0.006), y, 0); e.rotation.set(Math.PI / 2, 0, sx > 0 ? -Math.PI / 2 : Math.PI / 2); g.add(e); } };
      const body = (R, Hh, mat, o) => { const m = new THREE.Mesh(potGeo(R, Hh, o), mat); g.add(m); return m; };
      if (kind === 'wok') { body(0.17, 0.085, PM.wok, { round: true, t: 0.003 }); const h = handle(0.24, PM.wok, 0.082, 0.013, true); h.position.x = 0.17;   // 炒锅：木把 + 对面一个小耳朵
        const e = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 6, 16, Math.PI), PM.wok); e.position.set(-0.183, 0.075, 0); e.rotation.set(Math.PI / 2, 0, Math.PI / 2); g.add(e);
        hole = new THREE.Object3D(); hole.position.set(0.17 + 0.23 * Math.cos(0.18), 0.082 + 0.23 * Math.sin(0.18), 0); g.add(hole); }
      if (kind === 'skillet') { body(0.13, 0.045, PM.iron, { rb: 0.012, t: 0.005 }); handle(0.17, PM.iron, 0.04, 0.012).position.x = 0.13;
        const sp = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.004, 6, 10, Math.PI), PM.iron); sp.position.set(-0.13, 0.042, 0); sp.rotation.set(-Math.PI / 2, 0, Math.PI / 2); g.add(sp); }   // 铸铁平底锅，对面一个倒油嘴
      if (kind === 'fry') { body(0.11, 0.04, PM.alu, { rb: 0.015, t: 0.003 }); handle(0.18, PM.steel, 0.036, 0.01).position.x = 0.11; }           // 铝的小平底锅
      if (kind === 'sauce') { body(0.08, 0.09, PM.steel, { rb: 0.012, t: 0.003 }); handle(0.17, PM.steel, 0.085, 0.009).position.x = 0.08; }      // 不锈钢奶锅
      if (kind === 'stock' || kind === 'stockAlu') { const R = kind === 'stock' ? 0.15 : 0.11, Hh = kind === 'stock' ? 0.24 : 0.13, mat = kind === 'stock' ? PM.steel : PM.alu;   // 汤桶 / 铝锅：两只耳朵 + 盖子
        body(R, Hh, mat, { rb: 0.01, t: 0.003 }); ears(R, Hh - 0.03, mat);
        const lid = new THREE.Mesh(new THREE.SphereGeometry(R + 0.006, 32, 6, 0, Math.PI * 2, 0, 0.35), mat); lid.scale.y = 0.6; lid.position.y = Hh + 0.003 - (R + 0.006) * Math.cos(0.35) * 0.6; g.add(lid);
        const kn = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.02, 12), kind === 'stock' ? M.ink : mat); kn.position.y = Hh + 0.003 + (R + 0.006) * (1 - Math.cos(0.35)) * 0.6 + 0.008; g.add(kn); }
      return { g, hole: () => hole };
    };
    // 工作台上：大汤桶冒着热气，旁边一口铝锅
    { const a = makePot('stock'); a.g.position.set(-0.45, 0.94, -1.05); k.add(a.g); const b = makePot('stockAlu'); b.g.position.set(0.3, 0.94, -1.0); b.g.rotation.y = 0.5; k.add(b.g); }
    box(1.8, 0.02, 0.02, M.steel, 0, 2.15, -0.9, k);
    // 挂杆上的锅：用 S 钩挂着柄上的孔，柄朝上、锅口朝外，各自稍微转一点角度
    const sHook = (x) => { const h = new THREE.Group(); h.position.set(x, 2.15, -0.9); k.add(h);
      for (const [y, a0] of [[-0.012, 0], [-0.042, Math.PI]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0022, 6, 14, Math.PI * 1.4), M.steel); t.position.y = y; t.rotation.set(0, Math.PI / 2, a0 - 0.2); h.add(t); }
      return new THREE.Vector3(x, 2.15 - 0.056, -0.9); };
    const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0));   // 锅的 +x（柄）→ 朝上，+y（锅口）→ 朝外
    for (const [kind, x, sw, tw] of [['wok', -0.66, 0.05, -0.6], ['skillet', -0.22, -0.04, 0.55], ['sauce', 0.1, 0.03, -0.5], ['fry', 0.38, -0.05, 0.65], ['skillet', 0.68, 0.02, -0.5]]) {
      const pt = sHook(x), pot = makePot(kind); pot.g.updateMatrixWorld(true);
      const hp = pot.hole().getWorldPosition(new THREE.Vector3());                 // 挂孔在锅自己坐标里的位置
      const hang = new THREE.Group(); hang.position.copy(pt); k.add(hang);
      const orient = new THREE.Group(); orient.quaternion.setFromRotationMatrix(basis); orient.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), sw); orient.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), tw); hang.add(orient);
      pot.g.position.copy(hp).multiplyScalar(-1); orient.add(pot.g);
    }
    for (const y of [1.55, 1.95]) box(1.6, 0.025, 0.25, M.steel, -0.1, y, -1.25, k);         // 后厨墙上的架子：锅、保鲜盒
    for (let i = 0; i < 6; i++) box(0.16, 0.12, 0.16, i % 2 ? M.white : M.frost, -0.75 + i * 0.26, 1.625, -1.25, k);
    model('pot_enamel_01', { pos: [0.65, 0.94, -1.0], rot: 0.4, parent: k }); model('wooden_bowl_01', { pos: [-0.05, 0.94, -1.15], rot: 1.0, parent: k });
    // 上层架子：一口带盖的铝锅、两层竹蒸笼、一摞不锈钢盆、一口小奶锅
    { const a = makePot('stockAlu'); a.g.scale.setScalar(0.95); a.g.position.set(-0.62, 1.9625, -1.25); a.g.rotation.y = 0.3; k.add(a.g);
      const bam = new THREE.MeshStandardMaterial({ map: canvasTexture(256, 64, (g, W, H) => { g.fillStyle = '#c4a46a'; g.fillRect(0, 0, W, H); for (let x = 0; x < W; x += 6) { g.fillStyle = `rgba(90,60,20,${0.15 + Math.random() * 0.2})`; g.fillRect(x, 0, 1.5, H); } g.fillStyle = 'rgba(80,50,20,.5)'; g.fillRect(0, 4, W, 3); g.fillRect(0, H - 7, W, 3); }), roughness: 0.8 });
      for (let i = 0; i < 2; i++) cyl(0.11, 0.11, 0.065, bam, -0.22, 1.9625 + 0.0325 + i * 0.066, -1.25, k, 32);
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.112, 32, 4, 0, Math.PI * 2, 0, 0.5), bam); top.scale.y = 0.5; top.position.y = 1.9625 + 0.132 - 0.112 * Math.cos(0.5) * 0.5; top.position.x = -0.22; top.position.z = -1.25; k.add(top);   // 蒸笼盖
      for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(potGeo(0.1 - i * 0.004, 0.07, { rb: 0.04, t: 0.002 }), PM.steel); b.position.set(0.14, 1.9625 + i * 0.014, -1.25); k.add(b); }   // 一摞不锈钢盆
      const s2 = makePot('sauce'); s2.g.rotation.y = -2.3; s2.g.position.set(0.46, 1.9625, -1.27); k.add(s2.g); }   // 一口小奶锅，柄朝外伸出架子一点
    const dark = new THREE.MeshBasicMaterial({ color: 0x0c100e });                           // 右边一道门，挂着 PVC 门帘，里面黑着
    plane(0.5, 2.0, dark, 0.98, 1.0, -0.7, -Math.PI / 2, k);
    for (let i = 0; i < 3; i++) plane(0.17, 1.95, M.strip, 1.06, 1.0, -0.88 + i * 0.17, -Math.PI / 2 + (rnd() - 0.5) * 0.2, k);
    const kl = new THREE.PointLight(0xffb468, 9, 3.6, 1.4); kl.position.set(0, 2.5, -0.5); k.add(kl);
    box(0.5, 0.05, 0.12, M.warm, 0, 3.12, -0.6, k);
    for (const x of [-0.3, 0.3]) { cyl(0.05, 0.07, 0.1, M.ink, x, WY1 - 0.08, 0.02, k, 14); cyl(0.045, 0.045, 0.01, M.bulb, x, WY1 - 0.135, 0.02, k, 14); }   // 窗口上沿的保温灯
  }
  // 窗口上的单据夹
  box(WX1 - WX0 - 0.1, 0.015, 0.03, M.steel, (WX0 + WX1) / 2, WY1 - 0.05, -3.95, room);
  for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.16), paperMats[i]); p.position.set(WX0 + 0.22 + i * 0.27, WY1 - 0.14, -3.93); p.rotation.z = (rnd() - 0.5) * 0.12; room.add(p); }

  // ---- 后墙左：细胞系编号的小抽屉柜（参考老药铺）
  const DC = 5, DR = 7, DW = 1.05, DH = 1.0, DX = -0.2, DY = 1.68;
  // 灰色钢制档案抽屉柜（照着效果图）：每格一块微微凸出的钢面板、一个镀铬标签框（细胞系编号）、一个杯形拉手
  const cabSteel = steelMat(55).clone(); cabSteel.color.set(0xa8aaa6); cabSteel.roughness = 0.55;
  box(DW + 0.08, DH + 0.1, 0.4, cabSteel, DX, DY, -3.82, room);
  const ids = ['B-0417', 'P-0932', 'G-0221', 'F-1180', 'P-1077', 'P-0101', 'G-0350', 'B-0512'];
  const cw = DW / DC, ch = DH / DR;
  const holder = new THREE.InstancedMesh(new THREE.BoxGeometry(cw * 0.5, ch * 0.26, 0.006), chrome, DC * DR);
  const pull = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.022, 0.022, cw * 0.32, 12, 1, true, 0, Math.PI), chrome, DC * DR);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), one = new THREE.Vector3(1, 1, 1);
  let ii = 0;
  for (let r = 0; r < DR; r++) for (let c = 0; c < DC; c++) {
    const x = DX - DW / 2 + (c + 0.5) * cw, y = DY + DH / 2 - (r + 0.5) * ch, open = (c === 1 && r === 3) ? 0.16 : (c === 3 && r === 1) ? 0.1 : 0;
    const d = box(cw - 0.012, ch - 0.012, 0.03, cabSteel, x, y, -3.6 + open, room);
    const lbl = canvasTexture(96, 32, (g) => { g.fillStyle = '#e4dcc4'; g.fillRect(0, 0, 96, 32); g.fillStyle = '#2a2420'; g.font = '600 18px monospace'; g.textAlign = 'center'; g.fillText(ids[(r * DC + c) % ids.length], 48, 23); });
    plane(cw * 0.46, ch * 0.22, lit(lbl), x, y + ch * 0.18, -3.582 + open, 0, room);
    m4.makeTranslation(x, y + ch * 0.18, -3.585 + open); holder.setMatrixAt(ii, m4);
    m4.compose(new THREE.Vector3(x, y - ch * 0.18, -3.575 + open), q, one); pull.setMatrixAt(ii, m4); ii++;
    if (open) box(cw - 0.03, ch - 0.03, open + 0.2, cabSteel, x, y, -3.72 + open / 2, room);
  }
  room.add(holder, pull);

  // ---- 后墙右：开放架（调料罐、餐盘、外卖盒）和一台小监控屏
  const shelf = new THREE.Group(); shelf.position.set(2.55, 0, -3.88); room.add(shelf);
  for (const y of [1.35, 1.8]) { box(1.1, 0.025, 0.28, M.steel, 0, y, 0, shelf); for (const x of [-0.53, 0.53]) box(0.02, 0.12, 0.26, M.steel, x, y - 0.06, 0, shelf); }
  const jarCols = [0x7a3a22, 0xa8822a, 0x4a5a2c, 0x8a2a20, 0xd8ceb0];
  for (let i = 0; i < 7; i++) { const m = new THREE.MeshStandardMaterial({ color: jarCols[i % 5], roughness: 0.4, map: grimeMap(46 + (i % 3)) }); cyl(0.045, 0.045, 0.13, m, -0.45 + i * 0.15, 1.43, (rnd() - 0.5) * 0.08, shelf, 14); cyl(0.047, 0.047, 0.02, M.ink, -0.45 + i * 0.15, 1.505, 0, shelf, 14); }
  for (let i = 0; i < 9; i++) cyl(0.11, 0.1, 0.012, M.ceramic, -0.32, 1.82 + i * 0.014, 0, shelf, 24);
  { const pp = new THREE.MeshPhysicalMaterial({ color: 0xf0f0ea, roughness: 0.35, transparent: true, opacity: 0.78, side: THREE.DoubleSide });   // 一摞半透明的打包盒（PP 塑料，盖子边缘一圈凸起）
    for (let i = 0; i < 4; i++) { const y = 1.8125 + i * 0.058; box(0.16, 0.05, 0.115, pp, 0.1 + (i % 2) * 0.004, y + 0.025, (i % 2) * 0.003, shelf); box(0.172, 0.006, 0.127, pp, 0.1, y + 0.053, 0, shelf); } }
  { const plast = new THREE.MeshStandardMaterial({ color: 0x2a2a28, roughness: 0.55 });   // 监控显示器：塑料外壳、屏幕四周一圈边框、底座，后面鼓出来
    box(0.24, 0.17, 0.05, plast, 0.4, 1.915, 0.065, shelf); box(0.2, 0.13, 0.1, plast, 0.4, 1.91, -0.01, shelf);
    box(0.1, 0.012, 0.08, plast, 0.4, 1.818, 0.03, shelf); box(0.03, 0.02, 0.02, plast, 0.4, 1.83, 0.03, shelf);
    cyl(0.004, 0.004, 0.006, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 1.4, 0.4) }), 0.5, 1.84, 0.091, shelf, 6).rotation.x = Math.PI / 2; }   // 电源指示灯
  const cctv = canvasTexture(240, 180, (g, W, H) => { g.fillStyle = '#1a201c'; g.fillRect(0, 0, W, H); g.fillStyle = '#4a5a50'; for (let i = 0; i < 3; i++) g.fillRect(30 + i * 70, 70, 40, 90); g.fillStyle = '#9fb'; g.font = '14px monospace'; g.fillText('CAM-02 BR-01~03', 10, 20); });
  glassOn(plane(0.2, 0.14, new THREE.MeshBasicMaterial({ map: cctv, color: new THREE.Color(0.8, 0.9, 0.85) }), 0.4, 1.905, 0.091, 0, shelf), { seed: 21, wear: 1.2 });   // 监控屏：油烟熏过的旧玻璃

  // ---- 吧台里面：靠后墙的操作台（冷藏抽屉 + 台面上的铁板）
  { const mat = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.7), pbr('rubber_tiles', 3.6, 0.7, { size: 0.9, roughness: 0.85, color: 0x5a5a56 })); mat.rotation.x = -Math.PI / 2; mat.position.set(1.4, 0.006, -3.0); room.add(mat); }   // 地上的防滑橡胶垫
  const BC0 = -0.75, BC1 = 3.45, BZ = -3.72;
  box(BC1 - BC0, 0.88, 0.6, brushedDark, (BC0 + BC1) / 2, 0.44, BZ, room);
  box(BC1 - BC0, 0.05, 0.64, M.steel, (BC0 + BC1) / 2, 0.905, BZ, room);
  for (let kk = 0; kk < 3; kk++) {
    const x = BC0 + 0.75 + kk * 1.3;
    box(1.1, 0.62, 0.02, M.steel, x, 0.45, BZ + 0.305, room);
    box(0.3, 0.03, 0.03, M.ink, x, 0.7, BZ + 0.33, room);
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.05), new THREE.MeshStandardMaterial({ map: tapeLabel([['−18℃ FINISHED', '4℃ FOR PICK-UP', '−18℃ FINISHED'][kk]]), roughness: 0.9 })); t.position.set(x - 0.35, 0.68, BZ + 0.317); room.add(t);
  }
  // 铁板：煎着试吃用的牛排
  box(0.7, 0.05, 0.45, M.black, 0.1, 0.955, BZ, room);
  box(0.72, 0.08, 0.02, M.steel, 0.1, 1.0, BZ - 0.23, room);
  const steak = new THREE.Mesh(meatGeometry('beef'), meatMaterial('beef'));
  steak.scale.setScalar(0.22); steak.position.set(0.1, 0.99, BZ + 0.02); room.add(steak);
  steak.material.userData.uniforms.uColor.value = 0.95;
  box(0.1, 0.004, 0.14, M.steel, 0.36, 0.983, BZ + 0.1, room).rotation.y = 0.4;          // 铲子
  ITEM.squeeze(room, 0.6, 0.93, BZ + 0.12, { color: 0xa81c14, label: 'BBQ', ry: 0.4 }); ITEM.squeeze(room, 0.68, 0.93, BZ + 0.14, { color: 0x3a2a18, label: 'STEAK', labelColor: '#222', ry: -0.6 });   // 铁板旁边的酱料挤瓶
  const RB = (w, h, d, r, m, x, y, z, par, seg = 4) => { const o = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, r), m); o.position.set(x, y, z); par.add(o); return o; };
  const grain = canvasTexture(128, 128, (g) => { g.fillStyle = '#808080'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 5000; i++) { const v = 100 + Math.random() * 60 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * 128, Math.random() * 128, 1, 1); } });
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(3, 3);
  const cblob = (x, z, sx, sz, ry = 0, op = 0.55) => { const m = blobMat.clone(); m.opacity = op; const p = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), m); p.rotation.set(-Math.PI / 2, 0, ry); p.position.set(x, CT + 0.0015, z); room.add(p); };
  // 电子秤：发黄的米白塑料机身，顶上一块不锈钢秤盘（四个小脚撑着），前面斜着的液晶屏显示 0.000 kg
  { const sc = new THREE.Group(); sc.position.set(1.5, 0.93, BZ + 0.02); sc.rotation.y = 0.1; room.add(sc);
    const shell = new THREE.MeshPhysicalMaterial({ color: 0xd2ccbc, roughness: 0.5, clearcoat: 0.25 });
    RB(0.24, 0.06, 0.26, 0.012, shell, 0, 0.03, 0, sc, 3);
    for (const [x, z] of [[-0.08, -0.08], [0.08, -0.08], [-0.08, 0.06], [0.08, 0.06]]) cyl(0.006, 0.006, 0.01, M.ink, x, 0.064, z - 0.01, sc, 8);
    const panM = userMat('steel_worn.webp', 1, 1, { size: 0.2, metalness: 0.75, roughness: 0.3, color: 0xd4d4d0 });
    RB(0.23, 0.006, 0.2, 0.0025, panM, 0, 0.072, -0.01, sc, 2);
    const fp = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.035, 0.04, 2, 0.006), shell); fp.position.set(0, 0.045, 0.135); fp.rotation.x = -0.5; sc.add(fp);   // 前面斜着的显示面板
    const lcd = canvasTexture(256, 64, (g, W, H) => { g.fillStyle = '#9fb09a'; g.fillRect(0, 0, W, H); g.fillStyle = '#1f2a1e'; g.font = 'bold 40px "Courier New", monospace'; g.textBaseline = 'middle'; g.fillText('0.000', 40, H / 2 + 2); g.font = 'bold 18px Arial'; g.fillText('kg', 200, H / 2 + 6); });
    const lp = plane(0.12, 0.024, new THREE.MeshStandardMaterial({ map: lcd, roughness: 0.3, emissive: 0xffffff, emissiveMap: lcd, emissiveIntensity: 0.25 }), 0, 0, 0, 0, fp); lp.position.set(-0.025, 0, 0.0201);
    for (const [i, c] of [[0, '#c03028'], [1, '#2f7a3a'], [2, '#d8d4c8']]) RB(0.016, 0.006, 0.01, 0.002, new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }), 0.055 + i * 0.02, 0, 0.02, fp, 2); }
  for (let i = 0; i < 10; i++) rnd();                                              // 原来这里摆纸用掉 10 个随机数，保留住，后面东西的位置不变
  // ---- 两块砧板 + 一把中式菜刀（照着你发的参考）
  // 竹砧板：1.8 cm 厚，四角圆，一头有个长圆的提手孔；竹条顺着长边，每根竹条深浅不一，有一节一节的竹节；用旧了，中间有刀痕和水渍
  { const W = 0.38, D = 0.28, T = 0.018;
    const sh = new THREE.Shape(); const rr = 0.012; sh.moveTo(-W / 2 + rr, -D / 2); sh.lineTo(W / 2 - rr, -D / 2); sh.quadraticCurveTo(W / 2, -D / 2, W / 2, -D / 2 + rr); sh.lineTo(W / 2, D / 2 - rr); sh.quadraticCurveTo(W / 2, D / 2, W / 2 - rr, D / 2);
    sh.lineTo(-W / 2 + rr, D / 2); sh.quadraticCurveTo(-W / 2, D / 2, -W / 2, D / 2 - rr); sh.lineTo(-W / 2, -D / 2 + rr); sh.quadraticCurveTo(-W / 2, -D / 2, -W / 2 + rr, -D / 2);
    const hole = new THREE.Path(); const hx = -W / 2 + 0.045, hl = 0.03, hw = 0.1; hole.absarc(hx, hw / 2 - 0.012, 0.012, 0, Math.PI, false); hole.absarc(hx, -hw / 2 + 0.012, 0.012, Math.PI, Math.PI * 2, false); hole.closePath(); sh.holes.push(hole);   // 提手孔：竖着的长圆
    const geo = new THREE.ExtrudeGeometry(sh, { depth: T - 0.003, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 2, curveSegments: 10 });
    geo.rotateX(-Math.PI / 2); geo.translate(0, 0.0015, 0);
    const bam = canvasTexture(800, 600, (g, Wc, Hc) => {
      let sd = 21; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      for (let y = 0; y < Hc;) { const h = 14 + r() * 14, v = r(); g.fillStyle = `rgb(${196 + v * 30 | 0},${146 + v * 30 | 0},${80 + v * 26 | 0})`; g.fillRect(0, y, Wc, h);
        g.fillStyle = 'rgba(120,80,30,.25)'; g.fillRect(0, y, Wc, 1);                                   // 竹条之间的拼缝
        for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(150,100,40,${0.08 + r() * 0.12})`; g.fillRect(0, y + r() * h, Wc, 0.6); }   // 顺纹的细纤维
        for (let x = r() * 120; x < Wc; x += 90 + r() * 140) { g.fillStyle = 'rgba(110,70,25,.55)'; g.fillRect(x, y + 1, 3, h - 2); g.fillStyle = 'rgba(230,190,120,.5)'; g.fillRect(x + 3, y + 1, 2, h - 2); }   // 竹节
        y += h; }
      g.strokeStyle = 'rgba(90,60,30,.22)'; for (let i = 0; i < 120; i++) { const x = 200 + r() * 450, y = 100 + r() * 400, l = 20 + r() * 80, a = (r() - 0.5) * 0.7 + Math.PI / 2; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }   // 刀痕（横着切的）
      const st = g.createRadialGradient(470, 300, 20, 470, 300, 260); st.addColorStop(0, 'rgba(110,60,30,.28)'); st.addColorStop(1, 'rgba(110,60,30,0)'); g.fillStyle = st; g.fillRect(0, 0, Wc, Hc); });   // 中间用得多，颜色深一点
    bam.repeat.set(1 / 0.4, 1 / 0.3); bam.offset.set(0.5, 0.5);
    const bb = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: bam, bumpMap: bam, bumpScale: 0.6, roughness: 0.55, color: 0xe6dccb }));
    bb.position.set(0.95, 0.93, BZ + 0.04); bb.rotation.y = 0.15; room.add(bb); }
  cblob(0.95, BZ + 0.04, 0.46, 0.36, 0.15, 0.45);
  // 绿色塑料砧板（切生肉用的那种）：1.5 cm 厚，圆角，表面全是发白的刀痕，中间一片血水；上面放着菜刀和几块碎肉
  { const cb = new THREE.Group(); cb.position.set(2.25, 0.93, BZ + 0.02); cb.rotation.y = -0.08; room.add(cb);
    const hd = canvasTexture(512, 360, (g, Wc, Hc) => {
      let sd = 5; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      g.fillStyle = '#2f8a4c'; g.fillRect(0, 0, Wc, Hc); for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},.04)`; g.fillRect(r() * Wc, r() * Hc, 2, 2); }
      for (let i = 0; i < 260; i++) { const x = 40 + r() * 430, y = 30 + r() * 300, l = 10 + r() * 70, a = (r() - 0.5) * 1.2; g.strokeStyle = `rgba(220,240,225,${0.15 + r() * 0.3})`; g.lineWidth = 0.6 + r(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }   // 发白的刀痕
      const c = g.createRadialGradient(230, 180, 10, 230, 180, 170); c.addColorStop(0, 'rgba(120,20,16,.55)'); c.addColorStop(0.7, 'rgba(110,30,20,.2)'); c.addColorStop(1, 'rgba(110,30,20,0)'); g.fillStyle = c; g.fillRect(0, 0, Wc, Hc);
      for (let i = 0; i < 4; i++) bloodSplatter(g, 140 + r() * 200, 110 + r() * 140, 14 + r() * 22, r, { dry: 0.2 + r() * 0.4, drops: 8 }); });
    const plasticM = new THREE.MeshPhysicalMaterial({ map: hd, bumpMap: hd, bumpScale: 0.3, roughness: 0.6, clearcoat: 0.15 });
    const side = new THREE.MeshStandardMaterial({ color: 0x2c8448, roughness: 0.55 });
    const pb = new THREE.Mesh(new RoundedBoxGeometry(0.45, 0.015, 0.3, 3, 0.005), [side, side, plasticM, side, side, side]); pb.position.y = 0.0075; cb.add(pb);
    // 中式菜刀：长方形刀身（前上角一个挂孔），刃口一条亮的开刃线，黑色刀柄 + 三颗铆钉 + 钢枕；平放时刀柄比刀身厚，刀柄那头被垫起一点
    const blade = new THREE.Shape(); blade.moveTo(0, 0.004); blade.quadraticCurveTo(0.1, -0.002, 0.2, 0.0); blade.lineTo(0.2, 0.088); blade.quadraticCurveTo(0.2, 0.096, 0.192, 0.096); blade.lineTo(0, 0.096); blade.lineTo(0, 0.004);
    const bh = new THREE.Path(); bh.absarc(0.178, 0.078, 0.006, 0, Math.PI * 2, true); blade.holes.push(bh);
    const bg = new THREE.ExtrudeGeometry(blade, { depth: 0.0018, bevelEnabled: true, bevelThickness: 0.0007, bevelSize: 0.0006, bevelSegments: 2, curveSegments: 12 });
    const bladeM = new THREE.MeshPhysicalMaterial({ color: 0xdcdcda, metalness: 1, roughness: 0.26, clearcoat: 0.4, bumpMap: grain, bumpScale: 0.05 });
    const kn = new THREE.Group(); kn.position.set(0.17, 0.0155, 0.03); kn.rotation.set(0, 0.45, 0); cb.add(kn);
    const tilt = new THREE.Group(); tilt.rotation.z = -0.034; kn.add(tilt);           // 以刀尖为支点，刀柄那头翘起来
    const bm = new THREE.Mesh(bg, bladeM); bm.rotation.x = -Math.PI / 2; bm.position.set(-0.2, 0.0012, 0.048); tilt.add(bm);   // 刀身平放：刃口朝 +z
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.198, 0.01), new THREE.MeshPhysicalMaterial({ color: 0xf2f2f0, metalness: 1, roughness: 0.1 })); edge.rotation.x = -Math.PI / 2; edge.position.set(-0.1, 0.0039, 0.042); tilt.add(edge);   // 开刃线
    const hM = new THREE.MeshPhysicalMaterial({ color: 0x141414, roughness: 0.35, clearcoat: 0.6 });
    const bol = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.0095, 0.02, 16), bladeM); bol.rotation.z = Math.PI / 2; bol.scale.z = 0.8; bol.position.set(-0.21, 0.002, -0.04); tilt.add(bol);   // 钢枕
    const hdl = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.022, 0.03, 3, 0.009), hM); hdl.position.set(-0.28, 0.002, -0.04); tilt.add(hdl);
    for (const x of [-0.25, -0.28, -0.31]) { const rv = cyl(0.003, 0.003, 0.0225, bladeM, x, 0.002, -0.04, tilt, 10); }   // 三颗铆钉
    for (const [x, z, sc, sd] of [[-0.12, -0.08, 0.07, 3], [-0.07, -0.1, 0.055, 9], [0.15, -0.09, 0.05, 14]]) { const m = texturedMeat(sd % 8, sd); m.scale.setScalar(sc); m.position.set(x, 0.015 + meatHeight(m.userData.kind) * sc * 0.85, z); m.rotation.y = sd; cb.add(m); }   // 碎肉
    userDecal('blood_smear.webp', room, { pos: [2.3, 0.9312, BZ + 0.21], rot: [-Math.PI / 2, 0, 0.3], w: 0.2, h: 0.07, color: 0x5a1610, opacity: 0.75, roughness: 0.3 }); }   // 砧板边上淌到台面的一小摊
  cblob(2.25, BZ + 0.02, 0.52, 0.38, -0.08, 0.45);
  // 吸油烟罩上垂下来的照明灯：照着铁板
  const boothLamp = new THREE.SpotLight(0xffcf8a, 4, 3, 0.8, 0.6, 1.5); boothLamp.position.set(0.1, 2.6, -3.4); boothLamp.target.position.set(0.1, 0.95, BZ); room.add(boothLamp, boothLamp.target);

  // ---- 顶上：不锈钢吸油烟罩（侧面是梯形：后面贴墙、顶平、前面一道斜面、再一截竖的前沿），下面一排挡油板，前面压着店名和一行霓虹
  const HX0 = -1.3, HX1 = 3.6, HZ0 = -1.55, HY = 2.62, HTOP = 3.45, HSL = -2.3;
  const hoodMat = steelMat(50, false);
  { const sh = new THREE.Shape(); sh.moveTo(-4.0, HY); sh.lineTo(-4.0, HTOP); sh.lineTo(HSL, HTOP); sh.lineTo(HZ0, 3.0); sh.lineTo(HZ0, HY); sh.lineTo(-4.0, HY);
    const hg = new THREE.ExtrudeGeometry(sh, { depth: HX1 - HX0, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 });
    const hood = new THREE.Mesh(hg, hoodMat); hood.rotation.y = -Math.PI / 2; hood.position.set(HX1, 0, 0); room.add(hood);
    // 斜面、前沿上的板缝和铆钉
    const ang = Math.atan2(HTOP - 3.0, HSL - HZ0);
    for (let x = HX0 + 1.225; x < HX1 - 0.1; x += 1.225) { box(0.006, 0.38, 0.006, brushedDark, x, (HY + 3.0) / 2, HZ0 + 0.012, room); const sl = box(0.006, Math.hypot(HTOP - 3.0, HSL - HZ0), 0.006, brushedDark, x, (HTOP + 3.0) / 2, (HSL + HZ0) / 2 + 0.01, room); sl.rotation.x = -Math.atan2(HZ0 - HSL, HTOP - 3.0); }
    const rv = new THREE.InstancedMesh(new THREE.SphereGeometry(0.007, 8, 4), chrome, 160); const m4 = new THREE.Matrix4(); let n = 0;
    for (let x = HX0 + 0.08; x < HX1 - 0.05 && n < 158; x += 0.16) { m4.makeTranslation(x, 2.99, HZ0 + 0.014); rv.setMatrixAt(n++, m4); m4.makeTranslation(x, HTOP + 0.012, HSL + 0.05); rv.setMatrixAt(n++, m4); } rv.count = n; room.add(rv); }
  { const lip = cyl(0.024, 0.024, HX1 - HX0 + 0.02, hoodMat, (HX0 + HX1) / 2, HY, HZ0 + 0.012, room, 16); lip.rotation.z = Math.PI / 2; }   // 前沿卷边
  // 下面一排挡油板（斜着的薄钢片，积着油泥）
  { const baffleMat = new THREE.MeshStandardMaterial({ color: 0x6a645a, roughness: 0.45, metalness: 0.8, map: grimeMap(53) });
    const bf = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.004, 2.2), baffleMat, 100); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1); let n = 0;
    for (let x = HX0 + 0.1; x < HX1 - 0.05 && n < 100; x += 0.05) { q.setFromEuler(new THREE.Euler(0, 0, n % 2 ? 0.7 : -0.7)); m4.compose(new THREE.Vector3(x, HY + 0.03, -2.85), q, sc); bf.setMatrixAt(n++, m4); } bf.count = n; room.add(bf);
    for (const z of [-3.95, -1.7]) box(HX1 - HX0, 0.03, 0.04, brushedDark, (HX0 + HX1) / 2, HY + 0.01, z, room);
    for (let x = HX0; x <= HX1 + 0.01; x += 0.98) box(0.03, 0.03, 2.3, brushedDark, x, HY + 0.01, -2.85, room); }
  // 顶上接排烟管、几根吊杆
  for (const x of [HX0 + 0.3, HX1 - 0.3]) for (const z of [HSL + 0.2, -3.7]) cyl(0.012, 0.012, HT - HTOP, M.ink, x, (HT + HTOP) / 2, z, room, 6);
  { cyl(0.3, 0.3, HT - HTOP, hoodMat, 0.1, (HT + HTOP) / 2, -3.2, room, 28); box(0.8, 0.08, 0.8, hoodMat, 0.1, HTOP + 0.04, -3.2, room); for (const y of [3.8, 4.15]) cyl(0.31, 0.31, 0.03, brushedDark, 0.1, y, -3.2, room, 28); }
  box(HX1 - HX0 - 0.2, 0.02, 0.05, M.tube, (HX0 + HX1) / 2, HY - 0.025, HZ0 - 0.1, room);   // 罩子下沿一条灯带
  // 前沿下面挂着几道油垢流痕
  { const dr = canvasTexture(1024, 96, (g, W, H) => { g.clearRect(0, 0, W, H); const rr = ((n) => () => (n = (n * 16807) % 2147483647) / 2147483647)(91); for (let i = 0; i < 40; i++) dripStreak(g, rr() * W, 0, 20 + rr() * 70, 2 + rr() * 5, rr, '70,56,30', 0.25 + rr() * 0.25); });
    plane(HX1 - HX0, 0.36, new THREE.MeshStandardMaterial({ map: dr, transparent: true, depthWrite: false, roughness: 0.3, metalness: 0.5 }), (HX0 + HX1) / 2, HY + 0.2, HZ0 + 0.016, 0, room); }
  const nameTex = canvasTexture(1600, 170, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    g.font = `800 92px ${SANS}`; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillStyle = 'rgba(30,30,28,.75)'; g.fillText('FUTURE MEAT  FRESH · DELI', 60, H / 2 + 3);
    g.fillStyle = 'rgba(200,198,190,.35)'; g.fillText('FUTURE MEAT  FRESH · DELI', 58, H / 2);
  });
  const slopeRot = -Math.atan2(HSL - HZ0 < 0 ? (HZ0 - HSL) : 1, HTOP - 3.0);
  const neonMat = new THREE.MeshBasicMaterial({ map: neon('NO KILL', 640, 200, 130, '#ff3a3a'), transparent: true, color: new THREE.Color(2.6, 2.2, 2.2), depthWrite: false });
  // 罩子正面（顾客站着平视就能看见的那一截竖板）装一排塑料立体字：左边奶白色面 + 红色侧边的店名，右边红色的一句 NO SLAUGHTER NEEDED
  //（原来斜面上那行红色霓虹“无需屠宰”在头顶，没人看得见，去掉）
  new FontLoader().load('https://cdn.jsdelivr.net/npm/three@0.169.0/examples/fonts/helvetiker_bold.typeface.json', (font) => {
    const plastic = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.2, emissive: c, emissiveIntensity: 0.12, ...o });
    const word = (text, size, depth, face, sideM, x, y) => {
      const g = new TextGeometry(text, { font, size, depth, curveSegments: 6, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 2 });
      g.computeBoundingBox(); const bb = g.boundingBox; g.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, 0);
      const m = new THREE.Mesh(g, [face, sideM]); m.position.set(x, y, HZ0 + 0.012 + 0.012); room.add(m);   // 离板面 1.2 cm（后面有支脚顶着）
      const w = bb.max.x - bb.min.x;
      for (let i = 0; i < Math.max(2, Math.round(w / 0.35)); i++) cyl(0.004, 0.004, 0.014, M.steel, x - w / 2 + 0.05 + i * (w - 0.1) / Math.max(1, Math.round(w / 0.35) - 1), y, HZ0 + 0.017, room, 6).rotation.x = Math.PI / 2;   // 支脚
      return m; };
    const midY = (HY + 3.0) / 2 + 0.005;
    word('FUTURE MEAT', 0.2, 0.035, plastic(0xf0e6d2), plastic(0xa8241c, { emissiveIntensity: 0.05 }), HX0 + 1.35, midY);
    word('NO SLAUGHTER NEEDED', 0.115, 0.03, plastic(0xc0261e), plastic(0x7a1812, { emissiveIntensity: 0.05 }), HX1 - 1.2, midY);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.022, 20), plastic(0xc0261e)); dot.position.set((HX0 + 2.6 + HX1 - 2.25) / 2, midY, HZ0 + 0.03); room.add(dot);
  });
  // 价目表：挂在罩子下面的三块黑板，粉笔手写 + 画了几笔（牛的分割图、香肠、牛排）
  const CHALK = '"Segoe Print", "Comic Sans MS", "Noto Sans SC", cursive';
  const CF = (px) => `600 ${px}px Caveat, "Segoe Print", cursive`;
  const chalkImg = new Image(); chalkImg.src = 'assets/user/beefcuts_1918.jpg';   // 第一块黑板上临摹的牛：用那张老分割图描成粉笔线
  const chalkBoard = (paint, seed) => {
    const W = 1280, H = 680;
    const draw = (g) => {
      g.fillStyle = '#1c2220'; g.fillRect(0, 0, W, H);
      let n = seed; const r = () => (n = (n * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${r() * 0.05})`; g.fillRect(r() * W, r() * H, 2, 2); }   // 板面本身的颗粒
      g.filter = 'blur(14px)'; for (let i = 0; i < 22; i++) { g.fillStyle = `rgba(210,215,208,${0.02 + r() * 0.035})`; g.beginPath(); g.ellipse(r() * W, r() * H, 80 + r() * 200, 14 + r() * 30, (r() - 0.5) * 0.4, 0, 7); g.fill(); } g.filter = 'none';   // 擦过的灰印
      const C = 'rgba(238,236,226,.94)', Y = 'rgba(242,212,100,.94)', P = 'rgba(238,150,150,.94)';
      const t = (txt, x, y, px, col = C, align = 'left', rot = 0) => { g.save(); g.translate(x, y); g.rotate(rot + (r() - 0.5) * 0.02); g.font = CF(px); g.textAlign = align; g.fillStyle = col; g.fillText(txt, 0, 0); g.restore(); };
      const ln = (pts, col = C, w = 4) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x + (r() - 0.5) * 3, y + (r() - 0.5) * 3) : g.moveTo(x, y))); g.stroke(); };
      paint(g, W, H, t, ln, { C, Y, P }, r);
      g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 14000; i++) { g.fillStyle = `rgba(0,0,0,${0.1 + r() * 0.4})`; g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2); }   // 粉笔颗粒：字和线上随机缺一点
      g.globalCompositeOperation = 'destination-over'; g.fillStyle = '#1c2220'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
    };
    const tx = canvasTexture(W, H, draw); tx.userData.redraw = () => { draw(tx.userData.ctx); tx.needsUpdate = true; };
    return tx;
  };
  const MENUS = [
    chalkBoard((g, W, H, t, ln, { C, Y, P }) => {
      t('READY TODAY', 50, 95, 74, Y); t('cultivated · per 200 g', 54, 140, 40, C);
      ln([[50, 160], [560, 154]], Y, 4);
      [['Beef steak', '¥168'], ['Pork chop', '¥98'], ['Chicken breast', '¥68'], ['Yellow croaker', '¥128']].forEach(([a, b], i) => { t(a, 60, 240 + i * 82, 58); t(b, 600, 240 + i * 82, 58, C, 'right'); });
      t('In the fridge today · grab a pack', 60, 600, 40, P);
      if (chalkImg.complete && chalkImg.naturalWidth) {                         // 老分割图：深色线 → 粉笔白线
        const c = document.createElement('canvas'); c.width = 600; c.height = 450; const cg = c.getContext('2d'); cg.drawImage(chalkImg, 0, 0, 600, 450);
        const d = cg.getImageData(0, 0, 600, 450), px = d.data; for (let i = 0; i < px.length; i += 4) { const k = 1 - (px[i] + px[i + 1] + px[i + 2]) / 765; px[i] = px[i + 1] = px[i + 2] = 238; px[i + 3] = Math.max(0, (k - 0.25) * 1.6) * 255; }
        cg.putImageData(d, 0, 0); g.drawImage(c, 0, 0, 600, 400, 650, 120, 600, 400);
      }
    }, 7),
    chalkBoard((g, W, H, t, ln, { C, Y, P }) => {
      t('KITCHEN', 50, 95, 80, Y); ln([[50, 115], [330, 110]], Y, 4);
      [['Pan-seared steak', '¥58'], ['Pork chop rice', '¥32'], ['Chicken salad', '¥28'], ['Soup of the day', '¥8'], ['Rice', '¥2']].forEach(([a, b], i) => { t(a, 60, 200 + i * 72, 54); t(b, 640, 200 + i * 72, 54, C, 'right'); });
      ln([[740, 150], [1220, 145], [1225, 470], [735, 475], [740, 150]], P, 4);   // 右边框出今日套餐
      t("TODAY'S SET", 980, 225, 60, P, 'center'); t('pork chop rice', 980, 300, 50, C, 'center'); t('+ soup of the day', 980, 360, 46, C, 'center'); t('¥32', 980, 440, 70, Y, 'center');
      t('Lunch 11:30 - 14:00', 60, 600, 40, P);
    }, 13),
    chalkBoard((g, W, H, t, ln, { C, Y, P }) => {
      t('GROWN TO ORDER', 50, 95, 74, Y); ln([[50, 115], [560, 110]], Y, 4);
      [['Texture', 'tender / firm'], ['Aroma', 'plain / grilled'], ['Color', 'light / deep'], ['Fat', 'low / mid / high']].forEach(([a, b], i) => { t(a, 60, 210 + i * 80, 56, P); t(b, 360, 210 + i * 80, 56); });
      t('Grown from one cell line, cut to your order.', 60, 560, 40);
      t('Order at the fridge screen · 14 - 28 days', 60, 625, 42, Y);
      t('Regulars only', 1220, 625, 40, C, 'right', -0.06);
    }, 29),
  ];
  Promise.all([document.fonts.load(CF(60), 'MENU'), new Promise((r) => { chalkImg.complete ? r() : (chalkImg.onload = r, chalkImg.onerror = r); })]).then(() => MENUS.forEach((m) => m.userData.redraw())).catch(() => {});
  const woodFrame = userMat('wood_dark.webp', 1, 1, { size: 1, roughness: 0.6, bump: 0.3 });   // 黑板框：你给的深色旧木头
  MENUS.forEach((tx, i) => {
    const x = 0.05 + i * 1.18;
    const g = new THREE.Group(); g.position.set(x, 2.28, -2.45); g.rotation.x = -0.12; room.add(g);
    box(1.12, 0.62, 0.04, woodFrame, 0, 0, -0.025, g);
    plane(1.04, 0.55, new THREE.MeshStandardMaterial({ map: tx, roughness: 0.95 }), 0, 0, 0.0, 0, g);
    for (const s of [-0.45, 0.45]) cyl(0.004, 0.004, 0.32, M.ink, s, 0.46, -0.03, g, 4);
    // 板面的旧痕：真实的划痕扫描（板擦和指甲划的，白里带灰）+ 一块没擦干净的粉笔雾，每块位置不一样
    decal(['Scratches001', 'Scratches003', 'Scratches001'][i], g, { pos: [0, 0, 0.001], rot: [0, 0, i * 1.3], w: 1.0, h: 0.53, color: 0xd8d8d0, opacity: 0.18, roughness: 0.9 });
    decal(['Smear006', 'Smear007', 'Smear005'][i], g, { pos: [(i - 1) * 0.25, -0.08 + i * 0.05, 0.0012], rot: [0, 0, 0.4 - i * 0.5], w: 0.5, h: 0.32, color: 0xe0e0d8, opacity: 0.1, roughness: 1, order: 1 });
  });
  // 罩子下沿垂下来的三盏保温灯（暖光）
  for (const x of [0.15, 1.35, 2.55]) {
    cyl(0.006, 0.006, 0.45, M.ink, x, HY - 0.22, -2.95, room, 4);
    cyl(0.05, 0.13, 0.14, M.steel, x, HY - 0.5, -2.95, room, 20);
    cyl(0.1, 0.1, 0.01, M.bulb, x, HY - 0.575, -2.95, room, 16);
    const hl = new THREE.PointLight(0xffa858, 1.6, 1.8, 2); hl.position.set(x, HY - 0.62, -2.95); room.add(hl);
  }
  // 罩子下面的两盏射灯：照台面
  for (const x of [0.3, 2.3]) {
    const s = new THREE.SpotLight(0xf2ead8, 5, 3.6, 0.75, 0.6, 1.4); s.position.set(x, HY - 0.05, -1.9); s.target.position.set(x, CT, -2.0); room.add(s, s.target);
  }

  // ---- 顾客一侧的台面：试吃托盘、评价平板、扫码结算的终端
  const TRX = 0.45, TRZ = FZ - 0.2;
  box(0.32, 0.01, 0.24, brushedDark, TRX, CT + 0.005, TRZ, room);
  for (let i = 0; i < 9; i++) {
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.02, 0.025), steak.material);
    const a = i / 9 * Math.PI * 2;
    cube.position.set(TRX + Math.cos(a) * 0.08, CT + 0.021, TRZ + Math.sin(a) * 0.06); cube.rotation.y = a; room.add(cube);
    cyl(0.0015, 0.0015, 0.06, M.oak, cube.position.x, CT + 0.048, cube.position.z, room, 4);
  }
  const tl = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.07), new THREE.MeshStandardMaterial({ map: tapeLabel(['SAMPLES · 2 EACH']), roughness: 0.9 }));
  tl.rotation.x = -Math.PI / 2; tl.position.set(TRX, CT + 0.002, TRZ + 0.17); room.add(tl);
  cyl(0.04, 0.035, 0.09, M.ceramic, TRX + 0.3, CT + 0.045, TRZ + 0.05, room, 16);        // 牙签筒
  ITEM.condiments(room, -0.9, CT, FZ - 0.24, { ry: 0.5 });                                 // 吧台左端一套调料
  const tab = new THREE.Group(); tab.position.set(-0.35, CT, FZ - 0.18); room.add(tab);
  box(0.1, 0.012, 0.08, M.ink, 0, 0.006, 0, tab);
  const arm = box(0.02, 0.1, 0.02, M.ink, 0, 0.055, -0.01, tab); arm.rotation.x = -0.35;
  const tabBody = new THREE.Group(); tabBody.position.set(0, 0.16, 0); tabBody.rotation.x = -0.45; tab.add(tabBody);
  box(0.28, 0.2, 0.012, M.ink, 0, 0, -0.007, tabBody);
  const tabScreen = plane(0.26, 0.18, sign([['RATE OUR STEAK', 40, '#fff', 0.42, 500], ['fill in the survey · ¥30 coupon', 24, '#f0b9b4', 0.66, 500]], 520, 360, { bg: '#6e2422' }), 0, 0, 0.0005, 0, tabBody, true);
  tabScreen.material.color.setScalar(0.75);
  glassOn(tabScreen, { seed: 22, wear: 1.1 });                                    // 平板：被很多人点过，指纹多
  const kiosk = new THREE.Group(); kiosk.position.set(2.85, CT - 1.045, FZ - 0.2); room.add(kiosk);
  // 收银：国外小店常见的一套 —— 铝合金转台上一块平板收银屏（朝顾客）、旁边一台热敏小票机、台面上一台带键盘的刷卡机，用线连着；钱箱在柜台下面
  const absM = new THREE.MeshPhysicalMaterial({ color: 0x1c1d1f, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.4, bumpMap: grain, bumpScale: 0.25 });   // 黑色 ABS 塑料，细磨砂纹 + 一点亮
  const alu = new THREE.MeshPhysicalMaterial({ color: 0xb4b6b6, metalness: 0.85, roughness: 0.32, bumpMap: grain, bumpScale: 0.08 });                         // 阳极氧化铝
  const rubber = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const glassBlack = new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03 });
  // 平板收银屏
  { const base = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.086, 0.016, 48), alu); base.position.set(0, 1.053, -0.06); kiosk.add(base);
    cyl(0.084, 0.084, 0.003, rubber, 0, 1.0465, -0.06, kiosk, 48);                                                     // 橡胶垫
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.017, 0.22, 20), alu); neck.position.set(0, 1.17, -0.065); neck.rotation.x = -0.05; kiosk.add(neck);   // 往后斜的支杆
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.06, 20), alu); hinge.rotation.z = Math.PI / 2; hinge.position.set(0, 1.285, -0.07); kiosk.add(hinge); }
  const padG = new THREE.Group(); padG.position.set(0, 1.3, -0.04); padG.rotation.x = -0.35; kiosk.add(padG);
  RB(0.29, 0.22, 0.014, 0.012, alu, 0, 0, -0.008, padG, 5);                                                              // 铝背壳
  RB(0.284, 0.214, 0.004, 0.01, glassBlack, 0, 0, 0.0005, padG, 4);                                                      // 黑色玻璃面板（边框）
  cyl(0.0025, 0.0025, 0.001, glassBlack, 0, 0.1, 0.003, padG, 10).rotation.x = Math.PI / 2;                              // 前置摄像头
  const posScreen = canvasTexture(640, 480, (g, W, H) => {                        // 英文收银界面：左边商品格子，右边当前这单
    const F = (w, px) => `${w} ${px}px "Helvetica Neue", Arial, sans-serif`;
    g.fillStyle = '#f3f3f1'; g.fillRect(0, 0, W, H); g.textBaseline = 'middle';
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, 48); g.fillStyle = '#e2e2df'; g.fillRect(0, 47, W, 1);
    g.fillStyle = '#222'; g.font = F(600, 18); g.fillText('Future Meat · Register 2', 18, 25); g.fillStyle = '#888'; g.font = F(400, 15); g.fillText('7:42 PM', W - 80, 25);
    const tiles = [['Beef', '#8c2f2a'], ['Pork', '#b46a5a'], ['Chicken', '#c99a52'], ['Croaker', '#4f6f7a'], ['Culture fee', '#55605a'], ['Bag', '#9a9a92'], ['Gift card', '#3d5a8a'], ['Custom', '#6a6a66'], ['Discount', '#7a5a8a']];
    tiles.forEach(([t, c], i) => { const x = 16 + (i % 3) * 122, y = 64 + (i / 3 | 0) * 122; g.fillStyle = c; g.fillRect(x, y, 112, 112); g.fillStyle = 'rgba(255,255,255,.92)'; g.font = F(600, 16); g.fillText(t, x + 10, y + 96); });
    g.fillStyle = '#ffffff'; g.fillRect(392, 48, W - 392, H - 48); g.fillStyle = '#e2e2df'; g.fillRect(392, 48, 1, H - 48);
    g.fillStyle = '#222'; g.font = F(600, 18); g.fillText('Current Sale', 410, 78); g.fillStyle = '#999'; g.font = F(400, 15); g.fillText('No items', 410, 118);
    g.fillStyle = '#e8e8e5'; for (const y of [300, 336]) g.fillRect(410, y, W - 430, 1);
    g.fillStyle = '#666'; g.font = F(400, 15); g.fillText('Subtotal', 410, 318); g.fillText('¥0.00', W - 70, 318); g.fillText('Tax', 410, 354); g.fillText('¥0.00', W - 70, 354);
    g.fillStyle = '#1f6fd1'; g.fillRect(410, 396, W - 430, 60); g.fillStyle = '#fff'; g.font = F(600, 22); g.fillText('Charge ¥0.00', 440, 427);
    g.fillStyle = '#2f9a5a'; g.beginPath(); g.arc(24, H - 18, 4, 0, 7); g.fill(); g.fillStyle = '#888'; g.font = F(400, 12); g.fillText('Card reader connected', 34, H - 18); });
  const ks = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.195), new THREE.MeshPhysicalMaterial({ color: 0x030303, emissive: 0xffffff, emissiveMap: posScreen, emissiveIntensity: 0.62, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04 }));   // 屏幕本身是亮的，表面是反光的玻璃
  ks.position.set(0, 1.3, -0.04); ks.rotation.x = -0.35; ks.translateZ(0.003); kiosk.add(ks);
  glassOn(ks, { seed: 23, wear: 1.0 });                                           // 收银屏：划痕、指印、油膜
  // 热敏小票机：深灰圆角机身，顶上翻盖缝和出纸口，前面一个绿灯；小票从出纸口垂下来
  { const pr = new THREE.Group(); pr.position.set(0.28, 1.045, 0.0); pr.rotation.y = -0.12; kiosk.add(pr);
    const prM = absM.clone(); prM.color.set(0x2e3033);
    RB(0.13, 0.115, 0.135, 0.012, prM, 0, 0.0575, 0, pr, 4);
    box(0.122, 0.002, 0.002, M.black, 0, 0.1155, -0.02, pr);                                                            // 翻盖缝
    box(0.09, 0.003, 0.006, M.black, 0, 0.1155, 0.05, pr);                                                              // 出纸口
    { const pg = new THREE.PlaneGeometry(0.08, 0.035, 1, 8); const P = pg.attributes.position; for (let i = 0; i < P.count; i++) { const t = (P.getY(i) + 0.0175) / 0.035; P.setXYZ(i, P.getX(i), t * 0.03, Math.sin(t * 1.4) * 0.018); } pg.computeVertexNormals();
      const paper = new THREE.Mesh(pg, new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.85, side: THREE.DoubleSide })); paper.position.set(0, 0.116, 0.05); pr.add(paper); }   // 一截没撕掉的小票，往前卷
    const led = cyl(0.002, 0.002, 0.002, new THREE.MeshBasicMaterial({ color: 0x5cff8a }), -0.045, 0.09, 0.0676, pr, 8); led.rotation.x = Math.PI / 2;
    box(0.03, 0.006, 0.002, M.black, 0.035, 0.09, 0.068, pr);                                                            // FEED 键
    const ps = new THREE.Object3D(); ps.position.set(0, 0.117, 0.07); pr.add(ps); pr.userData.slot = ps; }
  const slot = kiosk.children.find((c) => c.userData.slot).userData.slot;
  // 台面上的东西底下加一圈很淡的接触阴影，东西才像是压在台面上，不是飘着的
  cblob(2.6, FZ - 0.3, 0.14, 0.26, 0.2); cblob(2.85, FZ - 0.26, 0.24, 0.24); cblob(3.13, FZ - 0.2, 0.2, 0.2, -0.12); cblob(2.3, FZ - 0.36, 0.14, 0.14, 0, 0.6); cblob(1.85, FZ - 0.3, 0.46, 0.46, 0, 0.45);
  // 刷卡机：桌面款，后面高起的屏幕仓 + 前面一块凸起的橡胶键盘，最前面是插卡口，右侧刷磁条的槽
  { const ct = new THREE.Group(); ct.position.set(2.6, CT, FZ - 0.3); ct.rotation.y = 0.2; room.add(ct);
    RB(0.084, 0.026, 0.19, 0.009, absM, 0, 0.013, 0, ct, 4);                                                            // 底座机身
    RB(0.084, 0.024, 0.085, 0.009, absM, 0, 0.032, -0.05, ct, 4).rotation.x = 0.12;                                   // 后面的屏幕仓，微微仰起
    const lcd = canvasTexture(160, 120, (g, W, H) => { g.fillStyle = '#c9d9d2'; g.fillRect(0, 0, W, H); g.fillStyle = '#1b2a26'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '600 15px Arial'; g.fillText('¥ 0.00', W / 2, 22); g.font = '12px Arial'; g.fillText('INSERT, TAP', W / 2, 80); g.fillText('OR SWIPE CARD', W / 2, 96);
      g.lineWidth = 3; g.strokeStyle = '#1b2a26'; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(W / 2 - 16, 50, 6 + k * 6, -0.7, 0.7); g.stroke(); } });
    const scr = plane(0.058, 0.044, new THREE.MeshPhysicalMaterial({ color: 0x0a0a0a, emissive: 0xffffff, emissiveMap: lcd, emissiveIntensity: 0.45, roughness: 0.15, clearcoat: 0.8 }), 0, 0.0448, -0.052, 0, ct);
    scr.rotation.x = -Math.PI / 2 + 0.12; glassOn(scr, { seed: 24, wear: 1.3 });
    box(0.003, 0.012, 0.075, M.black, 0.041, 0.04, -0.05, ct);                                                         // 磁条槽
    box(0.062, 0.003, 0.004, M.black, 0, 0.012, 0.0951, ct);                                                           // 插卡口
    const keyTex = (t, bg, fg) => canvasTexture(32, 24, (g, W, H) => { g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = fg; g.font = '600 15px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, W / 2, H / 2 + 1); });
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
    keys.forEach((t, i) => RB(0.019, 0.006, 0.012, 0.0022, new THREE.MeshStandardMaterial({ map: keyTex(t, '#3a3b3d', '#e8e8e4'), roughness: 0.75 }), -0.023 + (i % 3) * 0.023, 0.0275, 0.004 + (i / 3 | 0) * 0.016, ct, 2));
    [['X', '#b3302a'], ['<', '#d0a72a'], ['O', '#3a8a4a']].forEach(([t, c], i) => RB(0.019, 0.006, 0.012, 0.0022, new THREE.MeshStandardMaterial({ map: keyTex(t, c, '#fff'), roughness: 0.6 }), -0.023 + i * 0.023, 0.0275, 0.072, ct, 2));
    // 线：从刷卡机屁股后面绕到收银屏底座，在台面上弯一下
    const cw = (x, y, z) => new THREE.Vector3(x, y, z);
    const curve = new THREE.CatmullRomCurve3([cw(2.6 - Math.sin(0.2) * 0.095, CT + 0.012, FZ - 0.3 - Math.cos(0.2) * 0.095), cw(2.57, CT + 0.003, FZ - 0.45), cw(2.7, CT + 0.003, FZ - 0.47), cw(2.79, CT + 0.003, FZ - 0.38), cw(2.85, CT + 0.008, FZ - 0.34)]);
    room.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.0025, 6), rubber)); }

  // ================================================================ 后墙左：鲜肉柜 + 一台旧电视（循环播放品牌宣传片）
  const smart = buildSmartFridge();
  smart.group.position.set(-2.5, 0, -3.62);
  room.add(smart.group);
  blob(-2.5, -3.4, 1.9, 1.2);
  const ad = canvasTexture(1024, 580, (g, W, H) => drawAd(g, W, H, 0));
  const tv = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.56), new THREE.MeshBasicMaterial({ map: ad, toneMapped: false, color: new THREE.Color(0.85, 0.85, 0.85) }));
  tv.position.set(-2.5, 2.62, -3.9);
  room.add(tv);
  glassOn(tv, { seed: 25, wear: 0.8 });                                            // 电视屏：灰和几道划痕
  box(1.08, 0.64, 0.16, M.ink, -2.5, 2.62, -3.99, room);
  box(0.3, 0.04, 0.3, M.steelDark, -2.5, 2.28, -3.9, room);
  hose([[-2.1, 3.0, -3.95], [-2.05, 2.7, -3.98], [-2.1, 2.4, -3.99]], 0.008, M.ink);

  // ================================================================ 后墙右角：告示栏（熟客须知 / 供体介绍）
  const NBX = 4.25;
  { const corkTex = canvasTexture(512, 400, (g, W, H) => {
      g.fillStyle = '#5a412c'; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 26000; i++) { const v = 40 + Math.random() * 70; g.fillStyle = `rgba(${v + 30},${v + 10},${v - 10},${0.25 + Math.random() * 0.35})`; g.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1 + Math.random() * 2); }   // 软木颗粒
      g.fillStyle = 'rgba(150,120,80,.18)'; for (const [x, y, w, h] of [[40, 30, 120, 160], [300, 230, 140, 110], [60, 260, 90, 100]]) g.fillRect(x, y, w, h);   // 撕掉的纸留下的浅色方块
      g.fillStyle = 'rgba(15,10,6,.8)'; for (let i = 0; i < 70; i++) { g.beginPath(); g.arc(Math.random() * W, Math.random() * H, 1.2, 0, 7); g.fill(); }   // 钉孔
      const v = g.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 320); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(20,12,6,.45)'); g.fillStyle = v; g.fillRect(0, 0, W, H); });
    box(1.0, 0.76, 0.03, new THREE.MeshStandardMaterial({ map: corkTex, bumpMap: corkTex, bumpScale: 1.5, roughness: 0.95 }), NBX - 0.1, 1.45, -3.98, room); }
  for (const [x, y, w, h] of [[NBX - 0.1, 1.84, 1.04, 0.03], [NBX - 0.1, 1.06, 1.04, 0.03], [NBX - 0.61, 1.45, 0.03, 0.8], [NBX + 0.41, 1.45, 0.03, 0.8]]) box(w, h, 0.04, userMat('wood_dark.webp', 1, 1, { size: 0.5, roughness: 0.6 }), x, y, -3.975, room);   // 框：深色旧木头
  const flyerTex = canvasTexture(400, 520, (g, W, H) => {
    g.fillStyle = '#d8d3c4'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#141414'; g.font = `500 34px ${SANS}`; g.fillText('Our donor animals', 30, 70);
    g.font = `400 20px ${SANS}`; g.fillStyle = '#6b6662'; g.fillText('OUR DONORS', 30, 100);
    g.fillStyle = '#a7b39f';
    for (let i = 0; i < 4; i++) g.fillRect(30 + (i % 2) * 175, 130 + Math.floor(i / 2) * 170, 160, 150);
  });
  const flyer = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), new THREE.MeshStandardMaterial({ map: flyerTex, roughness: 0.9 }));
  flyer.position.set(NBX, 1.45, -3.955);
  room.add(flyer); agePoster(flyer, 0.42, 0.56, 3, { tape: false, glossy: 0.15 });
  // （“熟客须知”那张拿掉了）
  sph(0.008, M.red, NBX, 1.71, -3.95, room);
  { const rc = plane(0.08, 0.16, new THREE.MeshStandardMaterial({ map: userTex('receipt.webp', 'none'), roughness: 0.95 }), NBX - 0.43, 1.5, -3.958, 0, room); rc.rotation.z = 0.08;   // 钉在告示栏上的一张小票
    const note = plane(0.17, 0.12, sign([['DELIVERY', 26, '#222', 0.3, 700], ['Tue / Fri  6 am', 22, '#333', 0.6, 500], ['back door, ring twice', 18, '#7a2420', 0.85, 500]], 300, 210, { bg: '#e8d870' }), NBX - 0.45, 1.72, -3.957, 0, room); note.rotation.z = -0.05;
    sph(0.008, M.red, NBX - 0.43, 1.57, -3.95, room); sph(0.008, 0x2a5a8a ? M.ink : M.red, NBX - 0.45, 1.775, -3.95, room); }

  // ================================================================ 左墙：宣传（大海报 + 褪色的阳光牧场插画）
  // 主海报：“一口肉，不必一条命。”——照片在 setPosters 里贴上
  const heroPoster = canvasTexture(800, 1100, (g, W, H) => {
    g.fillStyle = '#cfc6ae'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#8a2a27'; g.fillRect(0, 0, W, 14); g.fillRect(0, H - 14, W, 14);
    g.fillStyle = '#2a2420'; g.font = `700 112px ${SERIF}`; g.fillText('Cultivated.', 60, 170); g.fillText('No kill.', 60, 300);
    g.fillStyle = '#8a2a27'; g.font = `600 40px ${SANS}`; g.fillText('Grown from animal cells', 64, 380);
    g.fillStyle = '#9fb094'; g.fillRect(60, 430, W - 120, 470);
    g.fillStyle = '#4b4844'; g.font = `400 30px ${SANS}`; g.fillText('Beef · pork · chicken · croaker   from ¥68 / 200 g', 64, 960);
    g.font = `400 20px ${SANS}`; g.fillStyle = '#7a756e'; g.fillText('Image for illustration only.', 64, 1040);
    ageCanvas(g, W, H, { amount: 1.1, seed: 33 });
  });
  // 左墙从里到外排开，彼此留 15 cm 以上：主海报 z −3.13…−1.47 | 画框、老照片 −1.35…0.18 | 展板 0.35…3.35 | 杂货架 3.45 起
  const hero = agePoster(plane(1.6, 2.2, lit(heroPoster), LX + 0.026, 1.75, -2.3, Math.PI / 2, room), 1.6, 2.2, 4, { tape: false, glossy: 0.7 });   // 装在黑框里的大海报：覆膜，反光更明显   // 比后面黑框的正面（LX+0.02）再往外一点，不然两个面重合会闪斜条纹
  box(0.04, 2.26, 1.66, M.ink, LX, 1.75, -2.3, room);
  const mural = muralTexture();
  agePoster(plane(3.0, 1.2, new THREE.MeshStandardMaterial({ map: mural, roughness: 0.85 }), LX + 0.01, 2.2, 1.85, Math.PI / 2, room), 3.0, 1.2, 7, { glossy: 0.35 });   // 合作牧场展板（缩小，不再压着画框和老照片）
  // （原来随手贴在墙上的 5 张单据会压住展板和照片，去掉了）
  // 一块手写的纸板宣传牌，用铁丝挂在管子下面
  const board = plane(1.4, 0.5, sign([['MEAT, NO KILL', 60, '#2a2420', 0.5, 700, SERIF], ['cultivated · in stock today', 26, '#7a2420', 0.85, 500]], 700, 250, { bg: '#a8916a' }), -1.5, 2.5, 2.7, 0.2, room);
  board.rotation.z = -0.04;
  for (const x of [-2.1, -0.9]) hose([[x, 3.2, 2.7 - (x + 1.5) * 0.2], [x, 2.75, 2.7 - (x + 1.5) * 0.2]], 0.003, M.ink);

  // ================================================================ 左边：用餐区（两张连凳餐桌、吊灯；参考快餐店的长条桌）
  const enamelShade = new THREE.MeshStandardMaterial({ color: 0x3e4a40, roughness: 0.35, metalness: 0.2, side: THREE.DoubleSide, map: grimeMap(48) });
  const varnish = new THREE.MeshPhysicalMaterial({ color: 0x6a4428, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3, map: grimeMap(49) });
  // 木桌（照片扫描模型）：桌面 2.9 × 1.25 m，高 0.741 m（量过的）；两边连着长凳
  // 每张桌子的布不一样：红格子棉布、绿白格子塑料台布、只铺一条格子桌旗、一张没铺；桌上是不同时刻的样子（刚吃完 / 刚摆好）
  const TT = 0.741, TW = 2.9, TD = 1.25;
  const darkWood = userMat('wood_dark.webp', 1, 1, { size: 0.9 }).map;
  const table = (x, z, ry, o) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; room.add(g);
    model('wooden_picnic_table', { pos: [0, 0, 0], rot: Math.PI / 2, scale: 1, parent: g }).traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.map = darkWood; m.material.color.set(0xd8ccc0); } });
    if (o.cloth) {
      const drop = o.drop ?? 0.22, cw = o.cw, cd = o.cd, FW = cw ?? TW + 2 * drop, FD = cd ?? TD + 2 * drop;
      g.add(tablecloth({ w: TW, d: TD, drop, top: TT, mat: clothMat(o.cloth, FW, FD), seed: o.seed, slip: o.slip || [0, 0], twist: o.twist || 0, push: o.push, stiff: o.stiff ?? 0.3, cw, cd }));
    }
    const y = TT + (o.cloth ? 0.004 : 0.001);
    o.items?.(g, y);
    dressTable(g, { y, w: TW - 0.1, d: TD - 0.1, seed: o.seed, state: o.state, clear: o.clear || [],
      food: (pl, py, q) => { const sp = q() < 0.6 ? 'beef' : 'pork'; const m = new THREE.Mesh(meatGeometry(sp), meatMaterial(sp)); m.scale.setScalar(0.06 + q() * 0.04); m.position.set((q() - 0.5) * 0.06, py + 0.004, (q() - 0.5) * 0.06); m.rotation.y = q() * 6; pl.add(m); } });   // 盘子里吃剩的一块肉
    blob(x, z, 2.4, 2.0);
    model('hanging_industrial_lamp', { pos: [0.15, 3.75, 0.05], parent: g });                    // 工业吊灯
    cyl(0.004, 0.004, HT - 3.75, M.ink, 0.15, (HT + 3.75) / 2, 0.05, g, 4);
    const l = new THREE.PointLight(0xffa657, 10, 5.5, 1.7); l.position.set(0.15, 2.2, 0.05); g.add(l);
    dustMotes(g, [0.15, 3.1, 0.05], [0, -1, 0], { length: 2.2, radius: 1.0, top: 0.22, count: 160, color: 0xffd6a8, strength: 0.7 });
  };
  // 调料架：不锈钢架子里一瓶辣酱、一瓶芥末，旁边盐和胡椒
  const condiments = (g, x, y, z) => ITEM.condiments(g, x, y, z, { ry: x * 3 });   // 调料架：番茄酱、芥末、酱油、盐、胡椒、纸巾盒
  const tent = (g, x, y, z, lines) => { for (const s of [-1, 1]) { const p = plane(0.12, 0.09, sign(lines, 240, 180, { bg: '#e2dac2' }), x, y + 0.044, z + s * 0.018, s > 0 ? 0 : Math.PI, g); p.rotation.x = s * 0.2; } };
  table(-5.0, -1.4, 0, { cloth: 'red', seed: 3, slip: [0.06, -0.05], twist: 0.03, push: [0.7, 0.15, 1], stiff: 0.25, state: 'used', clear: [[0.55, -0.15, 0.2], [0.2, -0.2, 0.1]],
    items: (g, y) => { condiments(g, 0.55, y, -0.15); tent(g, 0.2, y, -0.2, [['RATE US', 30, '#222', 0.4, 700], ['get a ¥30 coupon', 24, '#7a2420', 0.72, 600]]); } });
  table(-5.0, 1.0, 0, { cloth: 'oilcloth', seed: 8, slip: [-0.09, 0.03], twist: -0.015, stiff: 0.85, drop: 0.17, state: 'set', clear: [[-0.05, 0, 0.2], [0.3, 0.2, 0.2]],
    items: (g, y) => { condiments(g, -0.05, y, 0.0); box(0.34, 0.012, 0.26, M.red, 0.3, y + 0.006, 0.2, g); } });
  table(-2.1, 0.7, Math.PI / 2, { cloth: 'tartan2', cw: 0.62, cd: TD + 0.5, drop: 0.25, seed: 12, slip: [0.45, 0.02], twist: 0.04, stiff: 0.2, state: 'used', clear: [[0.4, -0.05, 0.2], [-0.1, -0.2, 0.1]],
    items: (g, y) => { condiments(g, 0.4, y, -0.05); tent(g, -0.1, y, -0.2, [['REFER A FRIEND', 26, '#222', 0.4, 700], ['¥30 off first order', 24, '#7a2420', 0.72, 600]]); } });
  // 前面靠窗一张小方桌：钢腿、蓝格子布垂得长一点，桌上只有烟灰缸和一杯没喝完的茶；两把塑料椅
  { const g = new THREE.Group(); g.position.set(-4.3, 0, 3.05); g.rotation.y = 0.12; room.add(g);
    const leg = new THREE.MeshStandardMaterial({ color: 0x2a2a28, roughness: 0.5, metalness: 0.6, map: grimeMap(58) });
    cyl(0.025, 0.025, 0.72, leg, 0, 0.36, 0, g, 10); for (const a of [0, 1, 2, 3]) { const f = box(0.36, 0.02, 0.04, leg, 0, 0.012, 0, g); f.rotation.y = a * Math.PI / 4 + 0.4; }
    box(0.72, 0.025, 0.72, userMat('wood_dark.webp', 1, 1, { size: 0.8, roughness: 0.55 }), 0, 0.7375, 0, g);
    g.add(tablecloth({ w: 0.72, d: 0.72, drop: 0.32, top: 0.75, mat: clothMat('blue', 1.36, 1.36), seed: 21, twist: 0.35, slip: [0.03, -0.04], stiff: 0.15 }));
    ITEM.ashtray(g, 0.12, 0.754, -0.1, { seed: 4, n: 6 }); ITEM.mug(g, -0.15, 0.754, 0.12, { enamel: true, level: 0.15, ry: 2 });
    ITEM.napkin(g, -0.05, 0.754, -0.2, { seed: 77 });
    model('cigarette_pack', { pos: [0.2, 0.754, 0.14], rot: 1.1, parent: g }); model('vintage_lighter', { pos: [0.27, 0.754, 0.05], rot: 0.3, sit: true, parent: g });
    blob(-4.3, 3.05, 1.2);
    const c1 = ageChair(model('plastic_monobloc_chair_01', { pos: [-4.25, 0, 4.23], rot: Math.PI + 0.3, parent: room }), { tint: 0xf2f1ec, grime: 0.25, scratch: 0.3, seed: 1 });   // 座位前沿离垂下的桌布还有 20 cm；比较新的一把
    { const cu = seatCushion({ mat: pbr('gingham_check', 0.38, 0.36, { size: 0.32, color: 0xf0e4dc }), seed: 3, sag: 0.8, dirt: 0.45, h: 0.045 }); cu.position.set(0.01, 0.445, 0.06); cu.rotation.y = 0.06; c1.add(cu); }   // 红格子坐垫
    ageChair(model('plastic_monobloc_chair_01', { pos: [-3.4, 0, 2.75], rot: -1.2, parent: room }), { tint: 0xe4d8ba, grime: 0.7, scratch: 0.8, dirt: 'SurfaceImperfections009', scr: 'Scratches003', seed: 2 }); }   // 晒黄、划得很花
  model('ceiling_fan', { pos: [-4.6, HT, 2.4], rot: 0.3, parent: room });                    // 用餐区上面的吊扇
  model('ceiling_fan', { pos: [-1.5, HT, 1.6], rot: 0.9, parent: room });                    // 第二台：第三张桌子和门口之间（避开管子、灯管和吊灯）

  // ================================================================ 前店：伪装用的普通杂货（钢丝架、方便面、罐头、米袋、菜筐、冰柜）
  const grocery = (x) => {
    const g = new THREE.Group(); g.position.set(x, 0, 5.0 - 0.27); g.rotation.y = Math.PI; room.add(g);   // 背靠门面左边那段墙，朝店里
    wireRack(g, 1.5, 0.5, 1.8, [0.12, 0.6, 1.08, 1.56]);
    const cols = [0xb8402a, 0xd8a83a, 0x3a6a9a, 0x6a8a3a, 0xe0d8c0];
    for (const y of [0.6, 1.08, 1.56]) for (let x = -0.65; x < 0.66; x += 0.16 + rnd() * 0.04) {
      if (rnd() < 0.2) continue;
      if ((y === 1.08 && x < -0.05) || (y === 1.56 && x > 0.0)) continue;            // 这两处放了真实的罐头和长保质期食品
      const m = new THREE.MeshStandardMaterial({ color: cols[Math.floor(rnd() * cols.length)], roughness: 0.6, map: grimeMap(70 + Math.floor(rnd() * 3)) });
      if (rnd() < 0.5) box(0.14, 0.2, 0.2, m, x, y + 0.11, (rnd() - 0.5) * 0.1, g); else cyl(0.045, 0.045, 0.11, m, x, y + 0.065, (rnd() - 0.5) * 0.15, g, 12);
    }
    for (let i = 0; i < 4; i++) model('russian_food_cans_01', { pos: [-0.6 + i * 0.16, 1.086, 0.1], rot: (rnd() - 0.5) * 0.4, parent: g });
    model('long_life_food', { pos: [0.35, 1.566, 0.05], rot: 0.1, scale: 0.9, parent: g });
    for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), M.sack); s.scale.set(1.2, 0.55, 0.8); s.position.set(-0.45 + i * 0.45, 0.25, 0); g.add(s); }
  };
  grocery(-6.1);
  const office = buildOffice({ room, box, cyl, plane, M, pbr, userMat, model, decal, canvasTexture, ITEM, bin, litter, hookGarment, wireRack, pencil, rnd });   // 办公室（office.js）
  // 门口的菜筐：三只开口的木板条箱，柠檬、橙子（几个包着薄纸）、带泥的土豆；果皮上有油胞小坑、颜色深浅不一，堆成两层
  { const peel = (base, spot, pores, seed) => { const c = canvasTexture(256, 128, (g, W, H) => { let n = seed; const r = () => (n = (n * 16807) % 2147483647) / 2147483647;
        g.fillStyle = base; g.fillRect(0, 0, W, H);
        for (let i = 0; i < 40; i++) { g.fillStyle = spot[Math.floor(r() * spot.length)]; g.globalAlpha = 0.25 + r() * 0.35; g.beginPath(); g.ellipse(r() * W, r() * H, 6 + r() * 30, 4 + r() * 16, r() * 3, 0, 7); g.fill(); }
        g.globalAlpha = 1; for (let i = 0; i < pores; i++) { g.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.12})`; g.beginPath(); g.arc(r() * W, r() * H, 0.6 + r() * 1.1, 0, 7); g.fill(); } }); return c; };
    const citrus = (base, spot, seed, rough) => { const t = peel(base, spot, 2600, seed); return new THREE.MeshPhysicalMaterial({ map: t, bumpMap: t, bumpScale: 1.6, roughness: rough, clearcoat: 0.35, clearcoatRoughness: 0.5 }); };
    const lemonM = [citrus('#d8b42a', ['#e8c838', '#b89a20', '#a8a030'], 3, 0.5), citrus('#e0c03a', ['#f0d050', '#c0a028'], 4, 0.45)];
    const orangeM = [citrus('#d8761a', ['#e88a24', '#c0621a', '#b07a20'], 5, 0.5), citrus('#e0821e', ['#f09a30', '#c86a18'], 6, 0.5)];
    const potT = peel('#8a6a44', ['#6a5034', '#a08058', '#5a4a30'], 900, 7), potM = new THREE.MeshStandardMaterial({ map: potT, bumpMap: potT, bumpScale: 3, roughness: 0.95 });
    const fruitTag = new THREE.MeshStandardMaterial({ color: 0x2a6a3a, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 });
    const calyx = new THREE.MeshStandardMaterial({ color: 0x5a6a2a, roughness: 0.8 });
    const lemonG = (() => { const g = new THREE.SphereGeometry(0.032, 20, 14), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i) / 0.032; p.setZ(i, p.getZ(i) * 1.32 + Math.sign(z) * Math.pow(Math.abs(z), 8) * 0.012); } g.computeVertexNormals(); return g; })();   // 两头尖的柠檬
    const orangeG = (() => { const g = new THREE.SphereGeometry(0.038, 22, 16); g.scale(1, 0.9, 1); return g; })();
    const potG = (seed) => { const g = new THREE.SphereGeometry(0.035, 14, 10), p = g.attributes.position; let n = seed; const r = () => (n = (n * 16807) % 2147483647) / 2147483647; const a = 1.2 + r() * 0.5, b = 0.75 + r() * 0.15;
      for (let i = 0; i < p.count; i++) { const k = 1 + Math.sin(p.getX(i) * 90 + seed) * 0.05 + Math.sin(p.getZ(i) * 70) * 0.04; p.setXYZ(i, p.getX(i) * a * k, p.getY(i) * b * k, p.getZ(i) * k); } g.computeVertexNormals(); return g; };
    const slats = pbr('wood_table_001', 1, 1, { size: 0.5, color: 0xc8b088, roughness: 0.85 });
    [['lemon', -3.2], ['orange', -2.54], ['potato', -1.88]].forEach(([kind, cx], ci) => {
      const g = new THREE.Group(); g.position.set(cx, 0, 4.5); g.rotation.y = (ci - 1) * 0.06; room.add(g);
      const W = 0.56, D = 0.38, H = 0.22;                                                   // 板条箱：四周三道板条、四根角柱、底板，里面是空的
      for (const sz of [-1, 1]) for (let k = 0; k < 3; k++) box(W, 0.045, 0.012, slats, 0, 0.03 + k * 0.075, sz * D / 2, g);
      for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) box(0.012, 0.045, D, slats, sx * W / 2, 0.03 + k * 0.075, 0, g);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.03, H, 0.03, slats, sx * (W / 2 - 0.015), H / 2, sz * (D / 2 - 0.015), g);
      box(W, 0.012, D, slats, 0, 0.11, 0, g);                                               // 假底：东西堆在半高的位置，看起来是满的
      let n = 91 + ci * 17; const r = () => (n = (n * 16807) % 2147483647) / 2147483647;
      const rad = kind === 'orange' ? 0.038 : kind === 'lemon' ? 0.034 : 0.036;
      for (let layer = 0; layer < 2; layer++) for (let ix = 0; ix < 6; ix++) for (let iz = 0; iz < 4; iz++) {
        if (layer && r() < 0.35) continue;
        const x = -W / 2 + 0.05 + ix * (W - 0.1) / 5 + (r() - 0.5) * 0.02 + (layer ? 0.04 : 0), z = -D / 2 + 0.05 + iz * (D - 0.1) / 3 + (r() - 0.5) * 0.02 + (layer ? 0.03 : 0);
        if (layer && (Math.abs(x) > W / 2 - 0.06 || Math.abs(z) > D / 2 - 0.06)) continue;
        const y = 0.117 + rad * 0.9 + layer * rad * 1.45;
        let m;
        if (kind === 'lemon') m = new THREE.Mesh(lemonG, lemonM[(ix + iz) % 2]);
        else if (kind === 'orange') m = new THREE.Mesh(orangeG, orangeM[(ix + iz + layer) % 2]);
        else m = new THREE.Mesh(potG(ix * 7 + iz * 3 + layer * 31), potM);
        m.position.set(x, y, z); m.rotation.set(r() * 6, r() * 6, r() * 6); m.scale.setScalar(0.88 + r() * 0.24); g.add(m);
        if (kind !== 'potato' && r() < 0.5) { const c = new THREE.Mesh(new THREE.CircleGeometry(0.006, 6), calyx); c.position.set(0, kind === 'orange' ? 0.0343 : 0, kind === 'lemon' ? 0.0425 : 0); if (kind === 'orange') c.rotation.x = -Math.PI / 2; m.add(c); }
        if (kind !== 'potato' && r() < 0.18) { const st = new THREE.Mesh(new THREE.CircleGeometry(0.0075, 12), fruitTag); st.position.set(0, kind === 'orange' ? 0.0335 : 0.0322, 0); st.rotation.x = -Math.PI / 2; m.add(st); }   // 果标贴纸
      }
      const price = plane(0.1, 0.07, sign([[{ lemon: 'LEMONS', orange: 'ORANGES', potato: 'POTATOES' }[kind], 30, '#222', 0.38, 700], [{ lemon: '4 for ¥10', orange: '¥3 each', potato: '¥6 / kg' }[kind], 28, '#9a2422', 0.8, 600]], 200, 140, { bg: '#ece6d6' }), 0, 0.2, -D / 2 - 0.008, Math.PI, g);   // 价签朝店里
      price.rotation.z = (r() - 0.5) * 0.12;
    }); }
  const chest = new THREE.Group(); chest.position.set(3.2, 0, 4.4); room.add(chest);   // 卧式冰柜：冷冻肉品
  box(1.4, 0.85, 0.7, steelMat(0), 0, 0.425, 0, chest);                           // 不锈钢外壳（你给的旧不锈钢贴图）
  box(1.42, 0.05, 0.72, M.rubber, 0, 0.025, 0, chest);                              // 底下一圈黑色踢脚
  for (let k = 0; k < 9; k++) box(0.3, 0.012, 0.01, M.ink, 0.45, 0.12 + k * 0.025, 0.352, chest);   // 压缩机散热格栅
  box(0.5, 0.025, 0.04, M.steel, 0, 0.82, 0.37, chest);                             // 拉门把手
  plane(0.12, 0.05, sign([['-18°C', 34, '#1a3a6a', 0.75, 700]], 160, 70, { bg: '#e8e4d8' }), -0.5, 0.75, 0.352, 0, chest);
  box(1.36, 0.02, 0.66, new THREE.MeshPhysicalMaterial({ color: 0xc8d8d4, roughness: 0.1, transparent: true, opacity: 0.35 }), 0, 0.86, 0, chest);
  for (let i = 0; i < 6; i++) box(0.3, 0.12, 0.22, new THREE.MeshStandardMaterial({ color: i % 2 ? 0xc4a032 : 0x2a5a7a, roughness: 0.6 }), -0.45 + (i % 3) * 0.45, 0.78, -0.12 + Math.floor(i / 3) * 0.24, chest);
  plane(0.6, 0.2, sign([['FROZEN MEAT', 40, '#9a2422', 0.62, 700]], 400, 130, { bg: '#d8d0bc' }), 0, 0.55, 0.352, 0, chest);
  // 立牌：熟客介绍，首单立减
  // 进门左手边：黑板立牌（和店外那块同一款），正面朝店里写给熟客看，背面朝门口
  chalkStand(room, { pos: [-1.2, 0, 3.75], rot: Math.PI + 0.4, seed: 63,
    front: (g, W, H, t, line, { C, Y, P, dim }) => {
      t('WELCOME BACK', W / 2, 110, 76, Y); line([[100, 135], [560, 130]], Y, 4);
      t('Regulars:', 70, 230, 52, C, 'left');
      t('first custom order', 70, 290, 50, C, 'left');
      t('¥30 off', 600, 375, 92, P, 'right', -0.05);
      line([[60, 430], [600, 425]], 'rgba(240,238,228,.35)', 3);
      t('Tasting at the counter', W / 2, 500, 50); t('2 pieces each, free', W / 2, 550, 38, dim);
      t('Custom cuts', W / 2, 640, 54, Y); t('texture · aroma · color · fat', W / 2, 690, 38); t('ready in 14 - 28 days', W / 2, 735, 38, dim);
      t("Today's set  ¥32", W / 2, 840, 52, P);
      line([[150, 915], [250, 915]], C, 5); line([[175, 897], [148, 915], [175, 933]], C, 5); t('counter behind you', 270, 928, 40, C, 'left');   // 看牌子的人背对吧台，吧台在左后方
    },
    back: (g, W, H, t, line, { C, Y, P, dim }) => {
      t('THANK YOU', W / 2, 130, 84, Y); t('see you next time', W / 2, 190, 44);
      line([[130, 225], [530, 220]], Y, 3);
      t('Open', W / 2, 320, 56, P); t('Mon - Sat  11:00 - 22:00', W / 2, 380, 44); t('Sun  12:00 - 20:00', W / 2, 430, 44);
      t('Orders ready?', W / 2, 560, 52, Y); t('we will text you', W / 2, 615, 40);
      t('Cash · card · mobile', W / 2, 740, 42);
      t('Mind the step', W / 2, 860, 46, P, 'center', -0.04);
    } });
  blob(-1.2, 3.75, 0.9);
  potPlant(room, 'pachira_aquatica_01', 'd', { pos: [4.5, 0, 4.5], rot: 0.6, scale: 0.8, pot: { r: 0.24, h: 0.34, color: 0x2e3a34 } }); blob(4.5, 4.5, 0.8);   // 门口右边角落一盆发财树（真实模型，原来自己画的叶子去掉了）
  mopBucket(room, 2.05, 4.5, 0.3);                                                 // 门口：黄色拖把桶，拖把泡在脏水里

  // ================================================================ 右墙：加工间入口（PVC 门帘）、灯箱海报、仓库门
  const hall = new THREE.Group(); hall.position.set(5.1, 0, -0.3); room.add(hall);
  // 门洞后面是一段 2.4 m 的短走廊：白色地铁砖墙、旧地砖、顶上两盏灯管（一盏坏了），尽头一扇带圆窗的钢门，窗里透出加工间的冷光
  { const wallT = pbr('Tiles036', 2.4, 2.5, { size: 1.0, roughness: 0.4, color: 0xd8d8d0 });
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), pbr('worn_tile_floor', 2.4, 1.6, { size: 1.2, roughness: 0.5, color: 0xa8a8a0 })); fl.rotation.x = -Math.PI / 2; fl.position.set(1.2, 0.002, 0); hall.add(fl);
    box(2.4, 2.5, 0.05, wallT, 1.2, 1.25, -0.82, hall); box(2.4, 2.5, 0.05, wallT, 1.2, 1.25, 0.82, hall);
    box(2.4, 0.05, 1.6, pbr('damaged_plaster', 2.4, 1.6, { size: 1.5, color: 0x9a9a92 }), 1.2, 2.52, 0, hall);
    box(0.05, 2.5, 1.6, wallT, 2.42, 1.25, 0, hall);
    const sd = new THREE.Group(); sd.position.set(2.39, 0, 0); sd.rotation.y = -Math.PI / 2; hall.add(sd);   // 尽头的钢门
    box(0.96, 2.1, 0.05, steelMat(1), 0, 1.05, 0, sd); box(1.04, 2.16, 0.03, new THREE.MeshStandardMaterial({ color: 0x3a3c3a, metalness: 0.6, roughness: 0.5 }), 0, 1.08, -0.02, sd);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 10, 32), M.steel); ring.position.set(0, 1.5, 0.03); sd.add(ring);
    const port = new THREE.Mesh(new THREE.CircleGeometry(0.16, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 1.0, 0.95) })); port.position.set(0, 1.5, 0.028); sd.add(port);   // 圆窗里加工间的冷光
    box(0.04, 0.3, 0.05, M.steel, 0.38, 1.05, 0.05, sd); box(0.3, 0.06, 0.005, M.ink, 0, 0.3, 0.027, sd);
    plane(0.44, 0.16, sign([['WORKSHOP', 34, '#f3eee6', 0.5, 700], ['authorised staff only', 18, 'rgba(243,238,230,.75)', 0.85, 500]], 440, 160, { bg: '#2a6a4a' }), 0, 1.92, 0.028, 0, sd);
    decal('Sign023', sd, { pos: [0.3, 1.5, 0.029], w: 0.16, h: 0.16, roughness: 0.6 });
    decal('SurfaceImperfections017', hall, { pos: [1.2, 0.004, 0], rot: [-Math.PI / 2, 0, 0], w: 2.4, h: 1.5, color: 0x2e2a24, opacity: 0.5 });   // 走廊地上被推车压出来的脏道
    for (const [x, dead] of [[0.7, false], [1.8, true]]) { box(0.7, 0.04, 0.12, M.fixture, x, 2.47, 0, hall); box(0.62, 0.02, 0.05, dead ? M.deadTube : M.tube, x, 2.445, 0, hall); }   // 顶上两盏灯管，里面那盏坏了
    const pl = new THREE.PointLight(0xd8f0e8, 1.2, 3, 2); pl.position.set(1.8, 2.2, 0); hall.add(pl); }
  // 门洞：不锈钢包边门框 + 和大门一样的透明软门帘（下半截被推车蹭得发黄）
  { const jamb = steelMat(0);
    for (const z of [-0.82, 0.82]) box(0.12, 2.52, 0.06, jamb, 0.02, 1.26, z, hall); box(0.12, 0.08, 1.7, jamb, 0.02, 2.5, 0, hall);
    const stripTex2 = canvasTexture(64, 512, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(225,235,228,.16)'); gr.addColorStop(0.6, 'rgba(220,226,210,.24)'); gr.addColorStop(1, 'rgba(150,140,110,.55)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 30; i++) { g.strokeStyle = `rgba(255,255,255,${0.04 + Math.random() * 0.1})`; const x = Math.random() * W, y = H * (0.45 + Math.random() * 0.55); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 8, y - 20 - Math.random() * 60); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(2, 0, 1, H); g.fillRect(W - 3, 0, 1, H); });
    const stripM2 = new THREE.MeshPhysicalMaterial({ map: stripTex2, transparent: true, roughness: 0.25, side: THREE.DoubleSide, depthWrite: false, color: 0xe8f0ea });
    for (let i = 0; i < 9; i++) { const sg = new THREE.PlaneGeometry(0.2, 2.38, 1, 10), sp = sg.attributes.position; for (let k = 0; k < sp.count; k++) { const y = sp.getY(k); sp.setZ(k, Math.max(0, -y) ** 2 * 0.03 * (i % 2 ? 1 : -0.6)); } sg.computeVertexNormals();
      const st = new THREE.Mesh(sg, stripM2); st.position.set(0.06 + (i % 2) * 0.006, 1.24, -0.72 + i * 0.18); st.rotation.y = Math.PI / 2 + (rnd() - 0.5) * 0.1; st.renderOrder = 5; hall.add(st); }
    const bar = cyl(0.012, 0.012, 1.7, M.steel, 0.06, 2.44, 0, hall, 10); bar.rotation.x = Math.PI / 2; }
  plane(1.5, 0.3, sign([['PROCESSING ROOM', 40, '#ddd', 0.5, 500], ['REGULARS · VISITS BY APPOINTMENT', 20, 'rgba(255,255,255,.6)', 0.86, 500, MONO]], 750, 150, { bg: PALETTE.ink }), 4.985, 2.85, -0.3, -Math.PI / 2, room);
  box(0.06, 1.42, 1.06, M.ink, 5.0, 1.55, -1.72, room);                         // 灯箱往前挪，给围裙挂杆让地方
  const lightbox = plane(0.96, 1.28, canvasTexture(8, 8, (g) => { g.fillStyle = '#f3eee6'; g.fillRect(0, 0, 8, 8); }), 4.965, 1.55, -1.72, -Math.PI / 2, room, true);
  lightbox.material.color.setScalar(0.82);
  const lightboxAge = () => agePoster(lightbox, 0.96, 1.28, 12, { tape: false, glossy: 0.8, glow: 0.35 });   // 灯箱：亚克力面板反光，背后的灯透出来一点
  { const W = 960, H = 1280, mp = canvasTexture(W, H, (g) => { g.fillStyle = '#efe9dc'; g.fillRect(0, 0, W, H); });
    const paint = (imgs) => { const g = mp.image.getContext('2d');
      g.fillStyle = '#efe9dc'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#7a2420'; g.fillRect(0, 0, W, 150); g.fillStyle = '#f3eee6'; g.font = `700 76px ${SANS}`; g.textAlign = 'left'; g.fillText('FUTURE MEAT', 56, 98); g.font = `500 26px ${MONO}`; g.textAlign = 'right'; g.fillText('MENU · 2026', W - 56, 96);
      g.textAlign = 'left'; g.fillStyle = '#2a2420'; g.font = `600 40px ${SANS}`; g.fillText('Cultivated meat  ·  per 200 g', 56, 222);
      [['Beef steak', 168, 'B-0417'], ['Pork chop', 98, 'P-0932'], ['Chicken breast', 68, 'G-0221'], ['Yellow croaker', 128, 'F-1180']].forEach(([n, p, id], i) => {
        const x = 56 + (i % 2) * 432, y = 260 + Math.floor(i / 2) * 330;
        if (imgs[i]) g.drawImage(imgs[i], imgs[i].width * 0.2, imgs[i].height * 0.2, imgs[i].width * 0.5, imgs[i].height * 0.36, x, y, 416, 220); else { g.fillStyle = '#8a3a30'; g.fillRect(x, y, 416, 220); }
        g.fillStyle = '#2a2420'; g.font = `600 34px ${SANS}`; g.fillText(n, x, y + 266); g.fillStyle = '#7a2420'; g.textAlign = 'right'; g.fillText('¥' + p, x + 416, y + 266); g.textAlign = 'left';
        g.fillStyle = '#7a756e'; g.font = `400 20px ${MONO}`; g.fillText('cell line ' + id, x, y + 298); });
      g.fillStyle = '#2a2420'; g.fillRect(56, 935, W - 112, 3);
      g.font = `600 36px ${SANS}`; g.fillText('Kitchen', 56, 990);
      g.font = `400 28px ${SANS}`; [['Pan-seared steak', '¥58'], ['Pork chop rice + soup', '¥32'], ['Chicken salad', '¥28'], ['Soup of the day', '¥8']].forEach(([a, b], i) => { const x = 56 + (i % 2) * 432, y = 1040 + Math.floor(i / 2) * 48; g.fillText(a, x, y); g.textAlign = 'right'; g.fillText(b, x + 400, y); g.textAlign = 'left'; });
      g.fillStyle = '#7a756e'; g.font = `400 20px ${SANS}`; g.fillText('Made to order, ready in 14 - 28 days.  No slaughter involved.  Prices include tax.', 56, 1220);
      ageCanvas(g, W, H, { amount: 0.5, seed: 91, drips: false }); mp.needsUpdate = true; };
    Promise.all([1, 3, 5, 7].map((n) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = `assets/user/meat_${n}.webp`; }))).then(paint);
    lightbox.material.map = mp; lightbox.material.needsUpdate = true; lightboxAge(); }   // 印刷的英文菜单：四张真实生肉照片 + 价格
  // （右墙原来的仓库门删掉了，给冷藏肉柜留地方；仓库门改到后墙左边，冷柜旁边）

  // ================================================================ 入口：玻璃门内糊满报纸，卷帘门拉下一半，只有门开着
  // Outside the glass is the real street (street.js), rendered once from in here with an off-axis camera and baked:
  // street = room − (1.65, 0, 5); picture plane 0.26 m outside the glass, framed for an eye at (−1.5, 1.6, 1.5).
  { const bc = new THREE.PerspectiveCamera(); bc.position.set(-3.15, 1.6, -3.5); bc.lookAt(-3.15, 1.6, 100); bc.updateMatrixWorld();   // bake camera, street coordinates
    const street = new THREE.Mesh(new THREE.PlaneGeometry(6.71, 2.79), depthWindow('assets/room/street.jpg', 'assets/room/street_depth.png', {
      view: bc.matrixWorldInverse.clone().multiply(new THREE.Matrix4().makeTranslation(-1.65, 0, -5)), proj: new THREE.Matrix4().makePerspective(-2.95, 3.76, 1.07, -1.72, 3.76, 60), near: 3.76, far: 60, maxT: 30, tint: 0.9 }));
    street.position.set(-1.905, 1.275, 5.26); street.rotation.y = Math.PI; room.add(street);
    const far = new THREE.Mesh(new THREE.PlaneGeometry(18, 7.8), new THREE.MeshBasicMaterial({ color: 0x05070a }));   // anything outside that frame: night
    far.position.set(-1, 2.2, 9); far.rotation.y = Math.PI; room.add(far); }
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(4.65, 2.6), M.glass);
  glass.position.set(-2.675, 1.3, 5.02);
  room.add(glass);
  for (const x of [-5, -3.4, -1.7, -0.35, 1.45]) box(0.06, 2.6, 0.08, M.ink, x, 1.3, 5.02, room);
  box(6.45, 0.06, 0.08, M.ink, -1.775, 2.6, 5.02, room);
  box(4.65, 0.06, 0.08, M.ink, -2.675, 0.03, 5.02, room);
  // 玻璃上糊的旧报纸：newsprint.js（店里看到每张的背面那一版，外面街上看到头版）
  for (let i = 0; i < 36; i++) rnd();                                                                    // keep the random sequence the rest of the room was laid out with
  addSheets(room, 'back', { glassZ: 5.02 });                                        // newsprint.js: the same sheets the street sees from outside; in here, their back pages
  // 玻璃：外面雨水流下来的痕迹、里面的手印，玻璃本身反光更强
  M.glass.envMapIntensity = 1.6; M.glass.clearcoat = 1; M.glass.opacity = 0.16;
  for (let i = 0; i < 5; i++) decal(['Leaking010A', 'Leaking011A', 'decal_10'][i % 3], room, { pos: [-4.7 + i * 1.3 + rnd() * 0.3, 1.6, 5.03], rot: [0, Math.PI, 0], w: 0.3, h: 1.8, color: 0xb8c0c0, opacity: 0.16, roughness: 0.1 });
  // 门口：和街上同一款双开玻璃门（doors.js），往店里半开；门头上一盏笼罩灯照着进门的地方
  const { left: doorG } = glassDoors(room, { x0: -0.35, x1: 1.45, y0: 0, z: 5.0, h: 2.55 });
  doorLamp(room, [0.55, 2.78, 4.94], { face: -1, light: 2.2 });
  // （门口原来挂的透明软门帘去掉了：一扇真玻璃门就够了）
  const winText = plane(1.8, 0.32, new THREE.MeshPhysicalMaterial({ transparent: true, roughness: 0.35, clearcoat: 0.5, map: canvasTexture(900, 160, (g, W, H) => {   // 红色即时贴字（从里面看是镜像的），边缘有剥落
    g.clearRect(0, 0, W, H); g.save(); g.translate(W, 0); g.scale(-1, 1); g.fillStyle = '#9a1e1a'; g.textAlign = 'center';
    g.font = `800 64px ${SANS}`; g.fillText('FRESH · FROZEN · DELI', W / 2, 70); g.font = `700 34px ${SANS}`; g.fillText('FUTURE MEAT MARKET', W / 2, 130); g.restore();
    g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 40; i++) { g.beginPath(); g.ellipse(Math.random() * W, Math.random() * H, 3 + Math.random() * 12, 2 + Math.random() * 6, Math.random() * 3, 0, 7); g.fill(); } g.globalCompositeOperation = 'source-over'; }) }), -2.2, 2.35, 4.97, Math.PI, room);
  winText.material.transparent = true;

  // 地上散落的单据、电线、积水
  { const solid = [[3.45, 4.45, 0.55, 3.95], [2.45, 3.95, 4.0, 4.8], [LX, -6.3, 3.3, 4.6], [-6.9, -5.3, 4.4, 5.0], [-3.55, -1.55, 4.25, 4.75], [-1.65, -0.75, 3.3, 4.2], [-4.75, -3.85, 2.6, 3.5]];
    const ok = (x, z) => !solid.some(([a, b, c, d]) => x > a && x < b && z > c && z < d);
    let n = 0, seed = 300;
    while (n < 26) { const x = -6.6 + rnd() * 10.8, z = -1.2 + rnd() * 5.9; seed++; if (!ok(x, z)) continue; litter(room, x, z, seed); n++; }
    for (const [x, z] of [[-5.3, -1.6], [-4.6, -1.0], [-5.6, 0.8], [-4.2, 1.4], [-2.4, 0.2], [-1.8, 1.5]]) litter(room, x + (rnd() - 0.5) * 0.4, z + (rnd() - 0.5) * 0.4, 400 + Math.round(x * 10 + z));   // 桌子底下掉的
  }
  hose([[LX + 0.05, 0.3, -3.9], [LX + 1.2, 0.01, -3.5], [-3.2, 0.01, -3.3], [-2.6, 0.15, -3.3]], 0.008, M.ink);
  box(0.4, 0.01, 0.4, M.steelDark, 0.2, 0.006, 0.6, room);                     // 地漏

  // ================================================================ 细节：员工门、挂着的围裙、冷藏肉柜、老照片、垂下来的绿萝、地上的水和血
  // 后墙左边：一扇黑色的员工门，门上一块磨砂玻璃，里面透出暖光
  { const d = new THREE.Group(); d.position.set(-4.4, 0, -3.99); room.add(d);
    box(1.06, 2.2, 0.08, M.ink, 0, 1.1, 0, d); box(0.92, 2.1, 0.05, new THREE.MeshStandardMaterial({ color: 0x1a1c1b, roughness: 0.5, map: grimeMap(50) }), 0, 1.06, 0.04, d);
    plane(0.5, 0.75, new THREE.MeshStandardMaterial({ color: 0x2a2c2a, roughness: 0.15, metalness: 0.3 }), 0, 1.55, 0.07, 0, d);   // 门上的夹丝玻璃，后面是暗的仓库
    box(0.54, 0.04, 0.03, M.ink, 0, 1.94, 0.075, d); box(0.54, 0.04, 0.03, M.ink, 0, 1.16, 0.075, d);
    box(0.03, 0.12, 0.05, M.steel, 0.38, 1.02, 0.09, d); box(0.12, 0.25, 0.02, M.steel, 0.38, 1.02, 0.07, d);
    plane(0.6, 0.22, sign([['STAFF ONLY', 36, '#fff', 0.55, 700], ['STORAGE', 18, 'rgba(255,255,255,.7)', 0.88, 500, MONO]], 400, 140, { bg: '#7a2420' }), 0, 2.075, 0.076, 0, d);   // 这扇门通往仓库（牌子在玻璃窗框上面，不压窗框）
    box(0.4, 0.06, 0.1, M.fixture, 0, 2.32, 0.08, d); box(0.36, 0.02, 0.04, M.tube, 0, 2.29, 0.1, d); }
  // 后墙右角：一根挂钩横杆，挂着两条沾了血的围裙和一条毛巾
  const apronTex = (seed) => canvasTexture(220, 420, (g, W, H) => {
    g.fillStyle = '#d8d2c2'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(0,0,0,.08)'; for (let x = 0; x < W; x += 3) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    const rr = ((n) => () => (n = (n * 16807) % 2147483647) / 2147483647)(seed);
    for (let i = 0; i < 5; i++) bloodSplatter(g, W * (0.25 + rr() * 0.5), H * (0.35 + rr() * 0.5), 10 + rr() * 22, rr, { dry: rr(), drops: 8 });
    for (let i = 0; i < 4; i++) { g.strokeStyle = `rgba(90,30,22,${0.15 + rr() * 0.2})`; g.lineWidth = 6 + rr() * 10; g.beginPath(); const x = W * (0.2 + rr() * 0.6); g.moveTo(x, H * 0.45); g.lineTo(x + (rr() - 0.5) * 30, H * (0.7 + rr() * 0.25)); g.stroke(); }   // 擦手留下的竖条
    ageCanvas(g, W, H, { amount: 0.8, seed, drips: false });
  });
  { const rx = 5.0, rz = -3.25;
    const bar = cyl(0.012, 0.012, 1.1, M.steel, rx - 0.06, 2.0, rz, room, 8); bar.rotation.x = Math.PI / 2;
    for (const z of [-0.5, 0.5]) box(0.05, 0.02, 0.02, M.steel, rx - 0.03, 2.0, rz + z, room);   // 杆的两个墙码
    const linen = (c = 0xd8d0c0) => new THREE.MeshStandardMaterial({ map: userTex('linen_blood.webp', 'none'), color: c, roughness: 1, side: THREE.DoubleSide });
    // 两头织出来的边带：亚麻茶巾一道红条、华夫格毛巾一道深一点的同色带、格子布一道素色布边
    const bands = { 3: pbr('rough_linen', 0.28, 0.05, { size: 0.3, color: 0x8a2e26 }), 7: pbr('waffle_pique_cotton', 0.3, 0.05, { size: 0.3, color: 0x8a7650 }), 11: pbr('cotton_jersey', 0.26, 0.05, { size: 0.3, color: 0x55604a }) };
    // 毛巾直接搭在杆上：两头垂下来的长短不一样，贴墙那一头不起褶（不会穿进墙），朝外那一头褶子多
    // 两个墙码在 ±0.5，三条毛巾都在墙码之间，互相留两三厘米的缝
    for (const [z, w, la, lb, mtl, sd] of [[-0.33, 0.28, 0.3, 0.46, linen(0xd8d0c0), 3], [-0.01, 0.3, 0.36, 0.3, pbr('waffle_pique_cotton', 0.3, 0.8, { size: 0.3, color: 0xc8c0a8 }), 7],
      [0.33, 0.26, 0.24, 0.4, pbr('fabric_pattern_05', 0.26, 0.7, { size: 0.35, variant: '03', color: 0xc0b8a8 }), 11]]) {
      const tg = new THREE.Group(); tg.position.set(rx - 0.06, 2.0, rz + z); tg.rotation.y = Math.PI / 2; room.add(tg);   // 本地 +z → 世界 +x（墙那边）
      tg.add(towel({ w, lenA: la, lenB: lb, r: 0.013, ampA: 0, ampB: 1, seed: sd, mat: mtl, bandMat: bands[sd], thick: sd === 7 ? 0.005 : 0.003, skew: (sd % 3 - 1) * 0.03, dirt: sd === 3 ? 0.7 : 0.45 })); }
  }
  // 右前方：冷藏肉柜（弧形玻璃、红色柜身、不锈钢包边）。右墙原来的仓库门删了，柜子加长到 3.2 m。
  // 里面分四格：牛、猪、鸡、鱼，每格一个不锈钢托盘放两块（你给的 8 张贴图，按 1–8 的顺序），格子之间是绿色塑料隔草，前面插价签
  { const CZ = 2.25, L = 3.2;
    const caseRed = userMat('steel_worn.webp', 1, 1, { size: 0.8, color: 0x9a3a32, metalness: 0.35, roughness: 0.5, bump: 0.12 });   // 柜身：红漆钢板（你给的旧不锈钢贴图压红，指纹、划痕、锈点透出来）
    const caseSteel = steelMat(1), caseDark = steelMat(2).clone(); caseDark.color.set(0x6a6a66);
    const dc = new THREE.Group(); dc.position.set(3.95, 0, CZ); dc.rotation.y = -Math.PI / 2; room.add(dc);   // 本地 x 沿墙（世界 +z），本地 +z 朝店里
    box(L, 0.75, 0.85, caseRed, 0, 0.375, 0, dc);
    box(L, 0.06, 0.95, caseSteel, 0, 0.78, 0, dc);
    box(L - 0.1, 0.02, 0.75, caseDark, 0, 0.82, -0.02, dc);                    // 柜内底板，顶面 0.83
    const glassC = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, L, 32, 1, true, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.07, envMapIntensity: 0.4, depthWrite: false, side: THREE.DoubleSide }));
    glassC.rotation.z = Math.PI / 2; glassC.position.set(0, 0.8, 0.0); dc.add(glassC);
    box(L, 0.03, 0.4, caseSteel, 0, 1.22, -0.25, dc);
    for (const x of [-L / 2, L / 2]) box(0.03, 0.44, 0.9, caseSteel, x, 1.0, 0, dc);
    box(L - 0.1, 0.02, 0.03, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 1.0, 0.95) }), 0, 1.2, -0.1, dc);
    for (const x of [-1.2, 0, 1.2]) { const pl = new THREE.PointLight(0xfff0e4, 0.7, 1.2, 2); pl.position.set(x, 1.12, -0.15); dc.add(pl); }   // 灯藏在顶板下面靠里，玻璃和包边上不会反出大光斑   // 偏暖的白光，肉的颜色不被染粉
    const trayM = new THREE.MeshStandardMaterial({ color: 0xd8d8d4, roughness: 0.25, metalness: 0.9 });
    const grass = new THREE.MeshStandardMaterial({ color: 0x3a7a3a, roughness: 0.6 });
    const SECT = [['BEEF', 168], ['PORK', 98], ['CHICKEN', 68], ['CROAKER', 128]];
    SECT.forEach(([name, price], k) => {
      const cx = -1.2 + k * 0.8;
      box(0.72, 0.012, 0.62, trayM, cx, 0.836, -0.02, dc);                         // 托盘，顶面 0.842
      for (const sx of [-1, 1]) box(0.012, 0.025, 0.62, trayM, cx + sx * 0.36, 0.848, -0.02, dc);
      // 每格四块，前后两排：前排是这一格的第一种（比如浅色牛肉），后排是第二种（雪花牛肉），左右错开一点
      for (const [n, dx, dz] of [[0, -0.17, 0.13], [1, 0.17, 0.12], [2, -0.15, -0.17], [3, 0.18, -0.18]]) {
        const idx = k * 2 + (n < 2 ? 0 : 1), m = texturedMeat(idx, 11 + k * 17 + n * 5);
        const sc = { beef: 0.23, steak: 0.25, pork: 0.23, chicken: 0.26, fillet: 0.26 }[m.userData.kind];
        m.scale.setScalar(sc); m.position.set(cx + dx, 0.842 + meatHeight(m.userData.kind) * sc * 0.9, -0.02 + dz);
        m.rotation.y = (n % 2 ? -0.18 : 0.14) + (k === 3 ? 0.5 : 0); dc.add(m);
      }
      if (k < 3) { const d = box(0.04, 0.035, 0.66, grass, cx + 0.4, 0.85, -0.02, dc); d.scale.y = 1; }   // 塑料隔草
      const tag = plane(0.14, 0.07, sign([[name, 30, '#222', 0.42, 700], [`¥${price} / 200 g`, 24, '#9a2422', 0.82, 600]], 280, 140, { bg: '#f0ece0' }), cx, 0.875, 0.31, 0, dc);
      tag.rotation.x = -0.5; cyl(0.0015, 0.0015, 0.05, caseSteel, cx, 0.85, 0.3, dc, 4);   // 价签插在托盘前面
    });
    for (const y of [0.76, 0.06]) box(L + 0.02, 0.03, 0.97, caseSteel, 0, y, 0, dc);   // 上下两道不锈钢包边
    for (const x of [-L / 2, L / 2]) box(0.03, 0.75, 0.9, caseSteel, x, 0.375, 0, dc);
    blob(3.95, CZ, 1.2, L + 0.3);
  }
  // 左墙：两张旧照片（店的老样子），镜框发黑
  // 三张老照片（维基共享资源上的公有领域照片，1900 年代的肉铺）：大小、横竖、相框都不一样，挂得不完全齐、略有点歪
  //   A 两个伙计牵着两头牛（黑框带白卡纸）  B 河边的赫里福德牛群（深褐色木框）  C 农场上的一群猪（小一点，旧银框）
  { const oldPhoto = (file, w, h, crop) => { const W = Math.round(w * 1200), H = Math.round(h * 1200);
      const tx = canvasTexture(W, H, (g) => { g.fillStyle = '#6a5e4c'; g.fillRect(0, 0, W, H); });
      const im = new Image(); im.onload = () => { const g = tx.image.getContext('2d'); const [cx, cy, cw, ch] = crop || [0, 0, 1, 1];
        g.filter = 'sepia(0.55) contrast(0.88) brightness(0.95)'; g.drawImage(im, cx * im.width, cy * im.height, cw * im.width, ch * im.height, 0, 0, W, H); g.filter = 'none';
        ageCanvas(g, W, H, { amount: 0.9, seed: W + H, drips: false }); tx.needsUpdate = true; };
      im.src = 'assets/user/' + file; return tx; };
    const frameM = { black: M.ink, brown: new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.55 }), silver: new THREE.MeshStandardMaterial({ color: 0x9a968c, roughness: 0.35, metalness: 0.8 }) };
    const matM = new THREE.MeshStandardMaterial({ color: 0xd8d0bc, roughness: 0.95 });
    for (const [file, z, y, w, h, tilt, fr, mat, crop] of [
      ['oldphoto_1.jpg', -0.42, 1.8, 0.3, 0.205, 0.02, 'black', 0.03, null],
      ['oldphoto_2.jpg', 0.0, 1.76, 0.26, 0.2, -0.025, 'brown', 0, [0, 0.02, 1, 0.96]],
      ['oldphoto_3.jpg', -0.33, 1.43, 0.24, 0.185, -0.012, 'silver', 0, [0.02, 0.02, 0.96, 0.96]]]) {
      const g = new THREE.Group(); g.position.set(LX, y, z); g.rotation.set(0, Math.PI / 2, tilt); room.add(g);   // 本地 +z = 离开墙面
      const fw = w + 2 * mat + 0.05, fh = h + 2 * mat + 0.05;
      box(fw, fh, 0.022, frameM[fr], 0, 0, 0.011, g);
      if (mat) plane(w + 2 * mat, h + 2 * mat, matM, 0, 0, 0.024, 0, g);
      plane(w, h, lit(oldPhoto(file, w, h, crop)), 0, 0, 0.027, 0, g);
      plane(w + 2 * mat + 0.01, h + 2 * mat + 0.01, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.09, clearcoat: 1, depthWrite: false }), 0, 0, 0.03, 0, g);   // 相框玻璃   // 照片、卡纸、相框各差 2–3 mm，不会闪
    } }
  // 垂下来的绿萝：一串串小叶子
  const vineLeaf = new THREE.SphereGeometry(0.035, 8, 5); vineLeaf.scale(1, 0.25, 1.3);
  const vine = (x, y, z, n, len) => {
    const g = new THREE.Group(); g.position.set(x, y, z); room.add(g);
    cyl(0.1, 0.08, 0.14, M.pot, 0, 0.07, 0, g, 16);
    let s0 = x * 31 + z * 17;
    const rr = () => (s0 = (s0 * 16807 + 1) % 2147483647, (s0 % 10000) / 10000);
    for (let k = 0; k < n; k++) {
      const a = rr() * 6.28, L = len * (0.4 + rr() * 0.6);
      for (let i = 0; i < L / 0.05; i++) {
        const t = i * 0.05, l = new THREE.Mesh(vineLeaf, M.leaf);
        l.position.set(Math.cos(a) * (0.1 + t * 0.05) + Math.sin(t * 7 + k) * 0.02, 0.1 - t, Math.sin(a) * (0.1 + t * 0.05));
        l.rotation.set(rr() * 1.5, rr() * 6, rr() * 1.2); l.scale.setScalar(0.6 + rr() * 0.7); g.add(l);
      }
    }
    return g;
  };
  // 冷柜左边地上一盆（原来放在冷柜顶上，叶子挡在电视前面）
  potPlant(room, 'calathea_orbifolia_01', 'b', { pos: [-3.52, 0, -3.5], rot: 2.0, scale: 1.35, pot: { r: 0.17, h: 0.3, color: 0x7a3a2a } });
  // 地上：门口和吧台前的积水、吧台后面地上几滴血、冷藏柜下面的一小滩水
  const floorDecal = (x, z, w, d, rot, dd, rough = true) => {
    const m = new THREE.MeshStandardMaterial({ map: dd.map, roughnessMap: rough ? dd.roughnessMap : null, roughness: rough ? 0.15 : 1, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); p.rotation.set(-Math.PI / 2, 0, rot); p.position.set(x, 0.003, z); room.add(p); return p;
  };
  // 积水和血迹：照片扫描的贴花（原来是程序画的形状，边缘太规整）
  const WET = ['SurfaceImperfections011', 'SurfaceImperfections009', 'SurfaceImperfections001', 'SurfaceImperfections003'];
  const wet = (x, z, w, d, rot, n) => decal(WET[n % 4], room, { pos: [x, 0.0035, z], rot: [-Math.PI / 2, 0, rot], w, h: d, color: 0x24221e, opacity: 0.7, roughness: 0.04 });   // 很低的粗糙度：积水反光
  const bloodSpot = (x, z, w, d, rot) => userDecal('blood_smear.webp', room, { pos: [x, 0.0038, z], rot: [-Math.PI / 2, 0, rot], w: w * 1.6, h: d * 0.6, color: 0x7a4a46, opacity: 0.85, roughness: 0.5 });
  wet(-0.6, 4.2, 2.2, 1.6, 0.3, 3);
  wet(1.6, -1.1, 1.6, 1.0, 1.2, 5);
  wet(-3.6, 2.6, 1.2, 0.9, 2.0, 8);
  wet(3.9, 1.0, 1.0, 0.8, 0.4, 11);
  bloodSpot(0.5, -3.2, 0.7, 0.7, 0.8);
  bloodSpot(2.4, -3.0, 0.5, 0.5, 2.4);
  // 吧台上：老式电子秤、肉罩子（玻璃罩里一块肉）、餐具筒
  { const sc = new THREE.Group(); sc.position.set(-0.75, CT, FZ - 0.35); room.add(sc);
    const enamel = new THREE.MeshPhysicalMaterial({ color: 0xe8e4d8, roughness: 0.25, clearcoat: 0.6, map: grimeMap(57) });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.3), enamel); body.position.y = 0.045; sc.add(body);
    for (const sx of [-1, 1]) cyl(0.045, 0.045, 0.3, enamel, sx * 0.17, 0.045, 0, sc, 16).rotation.x = Math.PI / 2;
    const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.02, 40), steelMat(58, false)); pan.scale.z = 0.8; pan.position.set(0, 0.11, 0.03); sc.add(pan);
    const neck = cyl(0.025, 0.03, 0.14, enamel, 0, 0.16, -0.12, sc, 12);
    const head = new THREE.Group(); head.position.set(0, 0.26, -0.12); head.rotation.x = -0.35; sc.add(head);
    head.add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.11, 0.07), enamel));
    const lcd = canvasTexture(200, 60, (g) => { g.fillStyle = '#0a1a10'; g.fillRect(0, 0, 200, 60); g.fillStyle = '#8aff9a'; g.font = '700 34px monospace'; g.fillText('0.286', 20, 44); g.font = '600 14px monospace'; g.fillText('kg', 160, 44); });
    const sp = plane(0.18, 0.055, new THREE.MeshBasicMaterial({ map: lcd, color: new THREE.Color(1.4, 1.4, 1.4) }), 0, 0, 0.036, 0, head); }
  { const dm = new THREE.Group(); dm.position.set(1.85, CT, FZ - 0.3); room.add(dm);
    { const board = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.025, 40), userMat('wood_dark.webp', 1, 1, { size: 0.4, roughness: 0.5, bump: 0.3 })); board.position.y = 0.0125; dm.add(board); }   // 深色木底板
    const m = texturedMeat(1, 77); m.scale.setScalar(0.25); m.position.y = 0.025 + meatHeight('steak') * 0.25 * 0.9; m.rotation.y = 0.6; dm.add(m);   // 一块雪花牛排（你给的贴图）
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.18, depthWrite: false })); dome.position.y = 0.02; dome.scale.y = 1.2; dm.add(dome);
    dome.material = new THREE.MeshPhysicalMaterial({ color: 0xf4f8f4, roughness: 0.04, transparent: true, opacity: 0.16, clearcoat: 1, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.004, 8, 48), dome.material); rim.rotation.x = Math.PI / 2; rim.position.y = 0.028; dm.add(rim);   // 罩子底沿
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 10), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.5, clearcoat: 1 })); knob.position.y = 0.21; dm.add(knob);   // 玻璃把手
    cyl(0.012, 0.016, 0.02, M.steel, 0, 0.19, 0, dm, 12); }
  ITEM.cutlery(room, 2.3, CT, FZ - 0.36, { seed: 4 });                                // 餐具筒：旧不锈钢筒里插着刀叉勺

  // 生活痕迹：几把被拉开、歪着的塑料椅，一把靠在墙边；地上湿了立着警示牌；门边一袋垃圾
  // 塑料椅（占地 0.64 × 0.63 m，坐高 0.44 m）：都放在桌子、长凳的占地范围外面，四条腿着地；
  //   被拉开、转了个角度的两把，墙角叠起来的一摞（同款塑料椅可以套叠，每把比下面一把高 6 cm 左右）
  { const c3 = ageChair(model('plastic_monobloc_chair_01', { pos: [-2.92, 0, -1.38], rot: 2.4, parent: room }), { tint: 0xd6d4cc, grime: 0.8, scratch: 0.5, dirt: 'SurfaceImperfections013', seed: 3 });      // 第一张桌子尽头（让出冷柜前面站人的地方）；发灰、脏
    const cu = seatCushion({ mat: pbr('floral_jacquard', 0.38, 0.36, { size: 0.4, color: 0xfff4e8 }), seed: 7, sag: 1.2, dirt: 0.55, h: 0.05 }); cu.position.set(-0.015, 0.445, 0.07); cu.rotation.y = -0.1; c3.add(cu); }   // 褪色的提花布垫，塌得厉害
  ageChair(model('plastic_monobloc_chair_01', { pos: [-6.2, 0, 2.72], rot: -0.6, parent: room }), { tint: 0xece8de, grime: 0.45, scratch: 0.55, dirt: 'SurfaceImperfections005', scr: 'Scratches003', seed: 4 });      // 第二张桌子长凳后面
  { const c5 = ageChair(model('plastic_monobloc_chair_01', { pos: [-0.42, 0, 1.3], rot: 0.9, parent: room }), { tint: 0xe8dcc0, grime: 0.55, scratch: 0.7, dirt: 'SurfaceImperfections009', seed: 5 });       // 第三张桌子尽头，被拉开；晒黄
    const cu = seatCushion({ mat: pbr('denim_fabric_03', 0.38, 0.36, { size: 0.35, color: 0xd0d8e0 }), seed: 11, sag: 1, dirt: 0.55, h: 0.04 }); cu.position.set(0.02, 0.445, 0.05); cu.rotation.y = 0.12; c5.add(cu); }   // 旧牛仔布垫
  ageChair(model('plastic_monobloc_chair_01', { pos: [-6.5, 0, -3.5], rot: 0.25, parent: room }), { tint: 0xd2ccbc, grime: 1, scratch: 0.9, dirt: 'SurfaceImperfections003', scr: 'Scratches003', seed: 6 });   // 墙角一把（这款椅子的模型不能套叠，摞起来一定穿插，所以不摞）；最旧、最脏
  model('WetFloorSign_01', { pos: [1.3, 0, -0.75], rot: 0.5, scale: 1.25, parent: room });
  model('trashbag', { pos: [-3.5, 0, -3.62], rot: 1, parent: room }); model('trashbag', { pos: [-3.62, 0, -3.05], rot: 2.2, scale: 0.85, parent: room });   // 冷柜左边，不贴着冷柜
  model('korean_fire_extinguisher_01', { pos: [4.78, 0, -2.05], rot: -Math.PI / 2, parent: room });   // 挪开，不再和右墙的盆栽重叠
  model('wall_clock', { pos: [-2.5, 3.3, -3.98], parent: room });
  model('hanging_picture_frame_01', { pos: [LX + 0.02, 2.15, -1.05], rot: Math.PI / 2, parent: room });   // 59 × 84 cm，z −1.35…−0.75
  model('hanging_picture_frame_02', { pos: [LX + 0.02, 2.35, -0.2], rot: Math.PI / 2, parent: room });      // 75 × 50 cm，z −0.58…0.18，下沿 2.07，在老照片上面
  // 画框里的内容：竖框挂食品经营许可证（店里必须挂），横框挂一张手绘的牛肉分割图
  { const cert = canvasTexture(440, 680, (g, W, H) => {
      g.fillStyle = '#e8e0c8'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#9a7a3a'; g.lineWidth = 10; g.strokeRect(18, 18, W - 36, H - 36); g.lineWidth = 2; g.strokeRect(32, 32, W - 64, H - 64);
      g.fillStyle = '#7a2420'; g.textAlign = 'center'; g.font = `700 38px ${SERIF}`; g.fillText('FOOD BUSINESS', W / 2, 100); g.fillText('LICENCE', W / 2, 142);
      g.fillStyle = '#2a2420'; g.font = `400 17px ${SANS}`; g.textAlign = 'left';
      [['Operator', 'Future Meat Market'], ['Premises', '17 Old Street, G/F'], ['Category', 'Food retailer'], ['Scope', 'Pre-packed food, deli'], ['', 'Cultivated meat (pilot)'], ['Licence no.', 'JY13101060047721'], ['Valid until', '30 JUN 2029']]
        .forEach(([k, v], i) => { g.fillStyle = '#6a625a'; g.fillText(k, 56, 200 + i * 52); g.fillStyle = '#1a1a1a'; g.fillText(v, 160, 200 + i * 52); });
      g.save(); g.translate(W - 120, H - 130); g.rotate(-0.12); g.strokeStyle = 'rgba(180,40,36,.75)'; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 66, 0, 7); g.stroke();
      g.fillStyle = 'rgba(180,40,36,.75)'; g.font = `700 20px ${SANS}`; g.textAlign = 'center'; g.fillText('MARKET', 0, -4); g.fillText('REGULATOR', 0, 22); g.restore();
      ageCanvas(g, W, H, { amount: 1.0, seed: 81, drips: false });
    });
    plane(0.44, 0.68, lit(cert), LX + 0.02 + 0.012, 2.15, -1.05, Math.PI / 2, room);
    const frameGlass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, transparent: true, opacity: 0.1, clearcoat: 1, envMapIntensity: 1.4, depthWrite: false });
    plane(0.48, 0.72, frameGlass, LX + 0.02 + 0.016, 2.15, -1.05, Math.PI / 2, room);   // 镜框玻璃
    const chart = canvasTexture(960, 720, (g, W, H) => { g.fillStyle = '#d8d0b8'; g.fillRect(0, 0, W, H); });
    { const im = new Image(); im.onload = () => { const g = chart.image.getContext('2d'); g.filter = 'sepia(0.35) contrast(0.95)'; g.drawImage(im, 0, 0, 960, 720); g.filter = 'none'; ageCanvas(g, 960, 720, { amount: 1.0, seed: 82, drips: false }); chart.needsUpdate = true; }; im.src = 'assets/user/beefcuts_1918.jpg'; }
    plane(0.56, 0.32, new THREE.MeshStandardMaterial({ color: 0xc8bea4, roughness: 0.95 }), LX + 0.02 + 0.02, 2.35 - 0.03, -0.2, Math.PI / 2, room);   // 发黄的底纸
    plane(0.42, 0.315, lit(chart), LX + 0.02 + 0.023, 2.35 - 0.03, -0.2, Math.PI / 2, room);
    plane(0.6, 0.36, frameGlass, LX + 0.02 + 0.03, 2.35 - 0.03, -0.2, Math.PI / 2, room);   // 1918 年 Swift & Company 的“标准批发牛肉分割图”（美国国家档案馆，公有领域）
  }
  model('potted_plant_01', { pos: [-0.4, 2.23, -3.86], scale: 0.5, parent: room });         // 抽屉柜顶上（效果图里柜顶有绿植），不再挤在台面的秤旁边
  model('potted_plant_02', { pos: [4.55, 0, -3.72], scale: 0.7, parent: room });
  model('potted_plant_02', { pos: [-6.6, 0, 3.05], scale: 0.9, parent: room });   // 挪到办公室门旁边，不挡门
  model('CashRegister_01', { pos: [3.05, 0.93, -3.7], rot: 0.15, scale: 0.6, parent: room });
  // 原来架子上的水壶、酒瓶和调料罐、盘子挤在一起，拿掉了
  for (const [x, z] of [[-4.6, 3.6], [1.2, 3.4]]) model('mounted_fluorescent_lights', { pos: [x, HT - 0.02, z], parent: room });

  // ================================================================ 吧台上的日常杂物（台面高 CT）
  { const y = CT + 0.001;
    ITEM.rag(room, -0.72, y, FZ - 0.12, { seed: 7, ry: 0.4, mat: userMat('linen_blood.webp', 0.3, 0.3, { size: 0.5, roughness: 1, color: 0xb0a898 }) });   // 擦台面的抹布
    ITEM.mug(room, 0.02, y, FZ - 0.16, { level: 0.2, ry: 2.6 }); ITEM.glass(room, 0.95, y, FZ - 0.11, { level: 0.35, ring: true });
    ITEM.mug(room, 1.6, y, FZ - 0.11, { enamel: true, level: 0.5, ry: -0.8 });
    { const pc = pencil(); pc.position.set(1.3, y, FZ - 0.25); pc.rotation.y = 0.4; room.add(pc); }   // 菜单搬到了冷柜的屏幕上，台面上只剩一支铅笔   // 铅笔放在本子右边的台面上
    ITEM.receipt(room, 2.35, y, FZ - 0.22, { seed: 4, ry: 0.5 }); ITEM.receipt(room, 2.42, y + 0.001, FZ - 0.18, { seed: 9, ry: 1.2 });
    ITEM.coins(room, 2.6, y, FZ - 0.12, { seed: 3, n: 5 }); ITEM.napkin(room, 0.85, y, FZ - 0.3, { seed: 31 }); ITEM.napkin(room, -0.15, y, FZ - 0.35, { seed: 32, s: 0.5 });
    model('cigarette_pack', { pos: [3.25, y, FZ - 0.12], rot: 0.4, parent: room }); model('vintage_lighter', { pos: [3.33, y, FZ - 0.08], rot: 1.6, sit: true, parent: room });
    // 台面上：杯印、抹布擦过的弧形水痕
    for (const [x, z, k, sz] of [[0.2, -0.14, 'SurfaceImperfections007', 0.3], [1.15, -0.2, 'SurfaceImperfections005', 0.35], [2.0, -0.12, 'SurfaceImperfections009', 0.5]]) decal(k, room, { pos: [x, CT + 0.0006, FZ + z], rot: [-Math.PI / 2, 0, x * 3], w: sz, h: sz, color: 0x6a6458, opacity: 0.55 });
    decal('Smear005', room, { pos: [0.6, CT + 0.0008, FZ - 0.25], rot: [-Math.PI / 2, 0, 0.1], w: 1.6, h: 0.45, color: 0x8a8a84, opacity: 0.35, roughness: 0.25 });
    // 后面操作台：电水壶、清洁剂、量杯
    model('vintage_electric_kettle', { pos: [-0.6, 0.93, -3.44], rot: 0.6, scale: 0.8, parent: room });   // 抽屉柜底下放不下，往前挪
    model('multi_cleaner_bottle', { pos: [3.32, 0.93, BZ + 0.15], rot: 2.2, parent: room }); model('bleach_bottle', { pos: [3.38, 0.93, BZ - 0.12], rot: 0.9, parent: room });
    model('metal_jug', { pos: [1.92, 0.93, BZ + 0.05], rot: 1.0, scale: 0.8, parent: room });
    ITEM.rag(room, 2.85, 0.931, BZ + 0.1, { seed: 11, ry: 1.2, color: 0x8a7a6a });
    model('alarm_clock_01', { pos: [2.62, 0.93, BZ - 0.17], rot: 0.35, parent: room });            // 操作台上的旧闹钟
    for (const [x, rot, sc] of [[-2.55, 0.3, 1.3], [-2.12, -0.2, 1.1]]) model('pot_enamel_01', { pos: [x, 2.05, -3.62], rot, scale: sc, parent: room });   // 冷柜顶上两只汤锅（照效果图），左边是绿萝盆
    model('dustpan', { pos: [-1.12, 0, -3.45], rot: 2.6, parent: room });                        // 簸箕和扫把挪到冷柜和后操作台之间的墙角
    model('plastic_broom', { pos: [-1.08, 0, -3.95], rot: 0.2, parent: room })?.rotation.set(0.12, 0.2, 0.0);   // 冷柜右边现在是放菜单的小边柜
  }
  // ---- 你生成的贴图：油锈流痕、拖拽的血迹、撕掉海报后剩下的纸边
  userDecal('drips.webp', room, { pos: [-5.6, 3.62, -3.994], w: 2.0, h: 1.0 });                          // 后墙左上：顶上管子漏下来的锈水
  userDecal('drips.webp', room, { pos: [2.55, 1.06, -3.993], w: 1.1, h: 0.55, opacity: 0.85 });           // 后墙右边的不锈钢架子底下往下流的油
  userDecal('drips.webp', room, { pos: [LX + 0.006, 3.55, -0.9], rot: [0, Math.PI / 2, 0], w: 1.8, h: 0.9 });   // 左墙顶上管子接头
  userDecal('blood_smear.webp', room, { pos: [0.9, 0.0045, -3.2], rot: [-Math.PI / 2, 0, 0.12], w: 1.3, h: 0.43, color: 0x7a4a46, roughness: 0.55 });   // 吧台里面，砧板前的地上拖过的血
  userDecal('blood_smear.webp', room, { pos: [-3.7, 0.0045, -3.25], rot: [-Math.PI / 2, 0, -0.25], w: 1.5, h: 0.5, opacity: 0.85, color: 0x7a4a46, roughness: 0.55 });   // 员工门出来往冷柜去
  userDecal('poster_residue.webp', room, { pos: [-6.1, 2.6, 4.993], rot: [0, Math.PI, 0], w: 0.95, h: 0.64, mode: 'cut', roughness: 0.95 });   // 左墙杂货架上方：一张被撕掉的海报
  userDecal('poster_residue.webp', room, { pos: [3.2, 2.15, -3.993], w: 0.6, h: 0.4, mode: 'cut', roughness: 0.95 });

  // ================================================================ 生活气息：挂钩上的衣服、椅背上的外套、抽屉把手上的毛巾、门边的雨靴、垃圾桶、水渍
  // 员工门左边：一双沾泥的雨靴，底下一摊水
  {
    { const b = model('rubber_boots', { pos: [-5.45, 0, -3.75], rot: 0.25, parent: room });          // 模型里有两双，只留沾泥的那双，并排放
      for (const c of b.children) { if (!/dirt/.test(c.name)) c.visible = false; else { c.position.x = /_l$/.test(c.name) ? -0.08 : 0.1; c.rotation.y = /_l$/.test(c.name) ? 0.05 : -0.3; } } }
    decal('SurfaceImperfections011', room, { pos: [-5.45, 0.0042, -3.7], rot: [-Math.PI / 2, 0, 0.3], w: 0.6, h: 0.45, color: 0x3a3a34, opacity: 0.55, roughness: 0.1 });   // 雨靴底下一摊水
  }
  // 吧台里面：操作台中间抽屉的把手上搭着一条格子茶巾
  { const tg = new THREE.Group(); tg.position.set(1.3, 0.7, BZ + 0.33); room.add(tg);
    tg.add(drapeOver({ w: 0.28, lenA: 0.27, lenB: 0.27, r: 0.017, ampA: 1, ampB: 0, seed: 15, mat: userMat('linen_blood.webp', 0.28, 0.6, { size: 0.5, roughness: 1, color: 0xd0c8b8 }) })); }
  // 垃圾桶：吧台左端、门口、用餐区墙边各一个；旁边有没扔进去的纸团，底下一圈水印
  for (const [x, z, c, sd] of [[-1.5, -2.55, 0xb8bab4, 3], [1.35, 4.55, 0x9a9c94, 7], [-6.75, 0.1, 0xa8a49a, 11]]) {
    bin(room, x, z, { color: c, seed: sd, fill: 0.85 + (sd % 3) * 0.05 });
    litter(room, x + 0.28, z + 0.12, sd * 31 + 2); litter(room, x - 0.2, z + 0.25, sd * 31 + 5);
    decal('SurfaceImperfections007', room, { pos: [x + 0.05, 0.0041, z + 0.04], rot: [-Math.PI / 2, 0, sd], w: 0.55, h: 0.55, color: 0x4a4438, opacity: 0.5 });
  }
  // 水渍：水桶底下一摊、往门口去的一串水点；卧式冰柜前面滴的冷凝水；冷藏肉柜底下
  wet(2.25, 4.45, 0.9, 0.7, 0.5, 14);
  for (let i = 0; i < 7; i++) decal('SurfaceImperfections011', room, { pos: [2.0 - i * 0.28 + (rnd() - 0.5) * 0.1, 0.0043, 4.2 - i * 0.05 + (rnd() - 0.5) * 0.15], rot: [-Math.PI / 2, 0, rnd() * 6], w: 0.22 + rnd() * 0.12, h: 0.2 + rnd() * 0.1, color: 0x2a2a26, opacity: 0.6, roughness: 0.08 });
  wet(3.2, 3.95, 1.2, 0.5, 0.1, 15);
  decal('SurfaceImperfections009', room, { pos: [3.35, 0.0042, 2.4], rot: [-Math.PI / 2, 0, 1.2], w: 1.4, h: 0.7, color: 0x2e2e2a, opacity: 0.55, roughness: 0.12 });

  { const T = 0.25, cx = (i) => LX + (i + 0.5) * T, cz = (j) => -4 + (j + 0.5) * T;
    const conc = pbr('concrete_floor_worn_001', T, T, { size: 0.8, color: 0x5a564e, roughness: 0.9 });
    const crackTex = (seed) => canvasTexture(256, 256, (g, W, H) => { g.clearRect(0, 0, W, H); let n = seed; const r = () => (n = (n * 16807) % 2147483647) / 2147483647;
      const branch = (x, y, a, len, w) => { g.strokeStyle = `rgba(20,16,12,${0.6 + r() * 0.3})`; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < len; k++) { a += (r() - 0.5) * 0.7; x += Math.cos(a) * 9; y += Math.sin(a) * 9; g.lineTo(x, y); if (w > 1.2 && r() < 0.12) { const sx = x, sy = y; g.stroke(); branch(sx, sy, a + (r() - 0.5) * 2, len / 2, w * 0.6); g.beginPath(); g.moveTo(sx, sy); } } g.stroke(); };
      branch(r() < 0.5 ? 0 : W, r() * H, r() * 6.28, 30, 3); branch(r() * W, 0, Math.PI / 2 + (r() - 0.5), 22, 2.2); });
    const crackM = (seed) => new THREE.MeshStandardMaterial({ map: crackTex(seed), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, roughness: 0.9 });
    const flat = (w, d, m, x, z, y, rz = 0) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); p.rotation.set(-Math.PI / 2, 0, rz); p.position.set(x, y, z); room.add(p); return p; };
    const grit = new THREE.MeshStandardMaterial({ color: 0x6a6258, roughness: 1 });
    for (const [i, j] of [[25, 31], [30, 15], [16, 26]]) {                          // 整块砖掉了：露出水泥底，边上一圈碎渣
      flat(T - 0.004, T - 0.004, conc, cx(i), cz(j), 0.0012);
      const edge = new THREE.MeshStandardMaterial({ color: 0x3e362a, roughness: 0.9 });   // 掉了砖的坑：四边露出相邻砖的侧面（砖厚 8 mm），边缘磕得不齐
      for (const [dx, dz, w, d] of [[0, -T / 2, T, 0.012], [0, T / 2, T, 0.012], [-T / 2, 0, 0.012, T], [T / 2, 0, 0.012, T]]) { const e = box(w, 0.005, d, edge, cx(i) + dx, 0.0028, cz(j) + dz, room); e.scale.x = 1 - rnd() * 0.15; }
      decal('SurfaceImperfections018', room, { pos: [cx(i), 0.0016, cz(j)], rot: [-Math.PI / 2, 0, i], w: 0.45, h: 0.45, color: 0x2a241c, opacity: 0.7 });
      for (let k = 0; k < 7; k++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.006 + rnd() * 0.01, 0), grit); c.position.set(cx(i) + (rnd() - 0.5) * 0.3, 0.004, cz(j) + (rnd() - 0.5) * 0.3); c.rotation.set(rnd() * 3, rnd() * 3, 0); room.add(c); } }
    for (const [i, j, w, sd] of [[28, 17, 1, 3], [12, 30, 2, 5], [36, 25, 1, 9], [20, 6, 2, 11], [6, 9, 1, 13]]) flat(T * w, T, crackM(sd), cx(i) + (w - 1) * T / 2, cz(j), 0.0014);   // 裂开的砖（有的一条缝跨两块）
    for (const [i, j, c, sd] of [[24, 20, 0, 1], [33, 32, 1, 2], [10, 18, 2, 3], [40, 12, 3, 4]]) {          // 缺了一个角
      const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.07 + (sd % 2) * 0.03, 0); sh.lineTo(0.02, 0.03); sh.lineTo(0, 0.08 - (sd % 2) * 0.02); sh.lineTo(0, 0);
      const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), conc); m.rotation.set(-Math.PI / 2, 0, c * Math.PI / 2); const ox = [-1, 1, 1, -1][c] * T / 2, oz = [1, 1, -1, -1][c] * T / 2;
      m.position.set(cx(i) + ox, 0.0012, cz(j) + oz); room.add(m); }
  }

  // ================================================================ 墙、地、玻璃上的痕迹（照片扫描的贴花，CC0）
  // 墙：管子底下往下流的水痕、墙根返潮；后墙的水痕跟着管子位置
  const wallD = (name, x, y, z, ry, w, h, o = {}) => decal(name, room, { pos: [x, y, z], rot: [0, ry, 0], w, h, color: 0x7a6a50, opacity: 0.8, ...o });
  wallD('Leaking003', 4.35, 3.35, -3.995, 0, 1.0, 1.6);                          // 后墙右：管子漏水
  wallD('Leaking004', -4.9, 3.25, -3.995, 0, 1.2, 1.9, { flipX: true });          // 后墙左：员工门上方
  wallD('Leaking006', -6.35, 2.9, -3.995, 0, 0.5, 2.4, { color: 0x5a4a34 });      // 墙角一道细长的漏水
  wallD('Leaking009', -3.4, 0.45, -3.995, 0, 1.6, 0.9, { color: 0x5a5040 });      // 墙根返潮（垃圾袋后面）
  wallD('Leaking008', LX + 0.004, 0.5, -1.8, Math.PI / 2, 2.6, 1.0, { color: 0x5a5040 });
  wallD('Leaking007', LX + 0.004, 0.45, 2.6, Math.PI / 2, 2.2, 0.9, { color: 0x5a5040, opacity: 0.6 });
  wallD('Leaking005', LX + 0.004, 3.5, 3.4, Math.PI / 2, 1.2, 1.6);               // 左墙顶上管子接头
  wallD('Leaking004', 4.995, 3.25, 4.0, -Math.PI / 2, 1.1, 1.8);                   // 右墙
  wallD('Leaking008', 4.995, 0.45, 4.2, -Math.PI / 2, 1.5, 0.9, { color: 0x5a5040, opacity: 0.6 });
  wallD('decal_10', 3.2, 3.4, -3.995, 0, 0.9, 1.4, { color: 0x6a5a40, opacity: 0.35 });
  // 吧台正面的不锈钢：手印、擦拭的痕迹（凳子前面最多）
  for (const x of [-0.4, 0.45, 1.3, 2.15]) decal('Fingerprints002', counter, { pos: [x + 0.05, 0.78, FZ + 0.0015], w: 0.5, h: 0.4, color: 0x3a3a38, opacity: 0.45 });
  decal('Smear006', counter, { pos: [1.2, 0.6, FZ + 0.0018], w: 2.6, h: 0.5, color: 0x6a6a64, opacity: 0.18 });
  // 地面：从门口到吧台被踩出来的一条脏路、拖过地还没干的弧形水痕、冷柜前面的污渍
  const floorD = (name, x, z, w, h, rz, o = {}) => decal(name, room, { pos: [x, 0.0035, z], rot: [-Math.PI / 2, 0, rz], w, h, ...o });
  floorD('SurfaceImperfections017', -0.6, 3.2, 2.6, 3.2, 0.2, { color: 0x3a3228, opacity: 0.55 });
  floorD('SurfaceImperfections017', 0.6, 0.0, 3.4, 2.6, 1.4, { color: 0x3a3228, opacity: 0.45 });
  floorD('SurfaceImperfections018', -2.5, -2.9, 2.0, 1.6, 0.6, { color: 0x2e2a24, opacity: 0.5 });
  floorD('Smear007', 1.5, -0.55, 2.4, 1.5, 0.3, { color: 0x2a2a24, opacity: 0.22, roughness: 0.12 });   // 拖把的湿痕，反光
  floorD('Smear006', -1.0, 1.8, 2.0, 1.2, 2.1, { color: 0x2a2a24, opacity: 0.15, roughness: 0.15 });
  floorD('decal_20', -5.0, -0.2, 3.0, 2.2, 0.0, { color: 0x2a2620, opacity: 0.5 });   // 餐桌下面
  // 玻璃门上推门的手印
  decal('Fingerprints003', doorG, { pos: [0.72, 1.12, 0.004], w: 0.35, h: 0.45, color: 0xd8d8d0, opacity: 0.5, roughness: 0.6 });
  decal('Fingerprints003', doorG, { pos: [0.72, 1.12, -0.004], rot: [0, Math.PI, 0], w: 0.35, h: 0.45, color: 0xd8d8d0, opacity: 0.4, roughness: 0.6 });

  // ================================================================ 灯光：暖黄的灯泡为主，几支日光灯（一盏坏、一盏闪），红色霓虹
  scene.add(new THREE.HemisphereLight(0x5fa8a0, 0x16120d, 0.17));
  // 店里的空气：铁板上的油烟在抽油烟罩下面打着卷，用餐区天花板下压着一层很淡的烟，吊灯下面最亮
  scene.userData.fog = { min: [LX, 0, -4], max: [5, HT, 5], floor: 1.8, up: 0.6, even: 0.6, density: 0.1, scale: 0.5, color: 0x6a645a, light: 0xffb878, lightK: 1.0,
    lights: [[-4.85, 3.15, -1.35, 0, -1, 0, 0.45], [-4.85, 3.15, 1.05, 0, -1, 0, 0.45], [-1.95, 3.15, 0.75, 0, -1, 0, 0.45], [1.3, 3.0, -2.9]], wind: [0.04, 0.03, 0.02], maxDist: 18 };
  const tubeLights = [];
  for (const [x, z] of [[0.6, 1.4], [2.6, 3.6]]) {
    const l = new THREE.PointLight(0x9fd8cc, 4.2, 10, 1.6);
    l.position.set(x, HT - 1.0, z);
    scene.add(l); tubeLights.push(l);
  }
  const flickerLight = tubeLights[0];
  const counterFill = new THREE.PointLight(0xffb56a, 5.5, 5, 1.8); counterFill.position.set(1.2, 2.4, -1.2); scene.add(counterFill);
  for (const [x, y, z, tx, ty, tz, i] of [[-5.6, HT - 0.4, -1.2, LX, 1.7, -2.3, 6], [-2.5, HT - 0.4, -2.2, -2.5, 1.4, -3.8, 5], [4.2, HT - 0.4, -2.5, 4.2, 1.4, -3.9, 4], [-5.4, HT - 0.4, 2.0, LX, 2.2, 1.3, 5]]) {
    const s = new THREE.SpotLight(0xffdcae, i, 6, 0.7, 0.6, 1.3);
    s.position.set(x, y, z); s.target.position.set(tx, ty, tz);
    scene.add(s, s.target);
  }

  let adIndex = 0, lastAd = 0, posterTex = [], posterIndex = 0, lastPoster = 0;
  function tick(t) {
    if (t - lastAd > 3.5) { lastAd = t; adIndex++; drawAd(ad.userData.ctx, 1024, 580, adIndex); ad.needsUpdate = true; }
    if (posterTex.length && t - lastPoster > 6) { lastPoster = t; posterIndex = (posterIndex + 1) % posterTex.length; lightbox.material.map = posterTex[posterIndex]; }
    steak.rotation.y = Math.sin(t * 0.3) * 0.05;
    const ph = t % 7.3;
    const on = ph > 6.6 ? (Math.sin(ph * 63) > 0.1 ? 0.25 : 1) : ph < 0.25 ? 0.6 + Math.random() * 0.4 : 1;
    flickerTube.color.setRGB(2.3 * on, 2.6 * on, 2.4 * on);
    flickerLight.intensity = 4.5 * (0.35 + 0.65 * on);
    neonMat.color.setScalar(t % 11 > 10.7 ? 0.8 : 2.4);                          // 霓虹偶尔暗一下
  }
  // 海报和“供体照片”在主程序里渲染好之后再贴上来
  function setPosters(tex, photos) {
    // （右墙灯箱现在是固定的英文菜单，不再轮播动物海报）
    const imgs = Object.values(photos).map((src) => { const im = new Image(); im.src = src; return im; });
    Promise.all(imgs.map((im) => im.decode())).then(() => {
      // （供体介绍上的照片改用下面的老照片）
    });
    Promise.all(['oldphoto_1.jpg', 'oldphoto_2.jpg', 'oldphoto_3.jpg'].map((f) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = 'assets/user/' + f; }))).then((ph) => {
      const g = flyerTex.image.getContext('2d'); g.save(); g.filter = 'sepia(0.4) contrast(0.95)';
      ph.forEach((im, i) => { if (!im) return; const x = 30 + (i % 2) * 175, y = 130 + Math.floor(i / 2) * 170, s = Math.max(160 / im.width, 150 / im.height); g.drawImage(im, (im.width - 160 / s) / 2, (im.height - 150 / s) / 2, 160 / s, 150 / s, x, y, 160, 150); });
      g.restore(); g.fillStyle = '#e8e2d2'; g.fillRect(205, 300, 160, 150); g.fillStyle = '#2a2a2a'; g.font = `500 15px ${SANS}`;
      ['B-0417  cattle · farm 1', 'P-0932  pig · farm 3', 'G-0221  chicken · farm 5', 'F-1180  croaker · pen 7'].forEach((l, i) => g.fillText(l, 212, 330 + i * 30));
      flyerTex.needsUpdate = true; });
    // 主海报和合作牧场展板上的照片：用真实的生肉照片（你给的贴图），不再用卡通动物
    const meatImg = (n) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = `assets/user/meat_${n}.webp`; });
    Promise.all([2, 1, 4, 6].map(meatImg)).then(([hero2, beef, pork, chicken]) => {
      const hg = heroPoster.image.getContext('2d');
      if (hero2) { hg.save(); hg.filter = 'saturate(0.85) contrast(1.05)'; hg.drawImage(hero2, 0, 0, hero2.width * 0.62, hero2.height * 0.62 * 470 / 680, 60, 430, 680, 470); hg.restore(); }   // 一块雪花牛肉的特写
      hg.save(); hg.globalCompositeOperation = 'multiply'; hg.fillStyle = 'rgba(214,204,176,.35)'; hg.fillRect(60, 430, 680, 470); hg.restore();
      ageCanvas(hg, 800, 1100, { amount: 0.6, seed: 34, drips: false });
      heroPoster.needsUpdate = true;
      drawMuralPhotos(mural, [beef, pork, chicken]);
    });
  }

  // 走近之后的机位
  room.updateMatrixWorld(true);
  const W = (o, x = 0, y = 0, z = 0) => o.localToWorld(new THREE.Vector3(x, y, z)).toArray();
  const spots = {
    brand: { eye: [-2.5, 2.25, -2.1], at: [-2.5, 2.62, -3.9], fov: 30, surface: { mesh: tv, w: 960, h: 538, size: 1.0 } },
    tasting: { eye: [0.55, 1.68, -0.45], at: [0.35, 1.0, -2.7], fov: 50 },
    survey: { eye: W(tabBody, 0, 0.02, 0.5), at: W(tabBody), fov: 34, surface: { mesh: tabScreen, w: 520, h: 360, size: 0.26 } },
    checkout: { eye: W(kiosk, 0, 1.49, 0.48), at: W(kiosk, 0, 1.3, -0.04), fov: 40, surface: { mesh: ks, w: 640, h: 480, size: 0.26 } },
    ...office.spots,
    donor: { eye: [NBX - 0.1, 1.5, -2.95], at: [NBX - 0.1, 1.45, -3.97], fov: 38, surface: { mesh: flyer, w: 420, h: 560, size: 0.42 } },
  };

  // 会动、会换贴图、要往上贴网页的这几件不参与合并（batch.js）
  for (const o of [steak, lightbox, slot, tv, tabScreen, ks, flyer, ...Object.values(spots).map((p) => p.surface?.mesh)]) o?.traverse((c) => { c.userData.keep = true; });
  return { scene, tick, smart, spots, figurines: [], slot, setPosters, ledger: office.ledger, load: smart.load };   // load：冷柜里的零售盒模型
}
