// 仓库：门店后面租下的一整间旧厂房（参考物流仓库：高货架、宽通道、地面标线、叉车）。
// 24 m 宽、34 m 深、9 m 高。从门店的后门进来，正对着主通道：
//   右边     三排重型货架：无菌耗材、包装、消毒液、一次性培养袋、大豆蛋白、硅胶管
//   左边     沿墙一条 1.1 m 高的卸货平台，两扇卷帘门通后街；平台上是空的动物运输笼
//   左前     −20 ℃ 冷柜和刚到的胎牛血清（干冰运输箱）
//   最里面   冷库（细胞库，液氮），门口几只液氮罐；右后角是 CO₂ 气瓶笼
import * as THREE from 'three';
import { canvasTexture } from './textures.js';
import { createCartonKit } from './cartons.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { pbr, model, decal, userDecal } from './assets.js';
import { corrugatedMaps, grimeFloorMaps, grimeMap, ageCanvas, blobShadow, puddleDecal, grimeLayer } from './materials.js';

const SANS = '"Inter", "Noto Sans SC", "Microsoft YaHei", sans-serif';
const MONO = '"IBM Plex Mono", Consolas, monospace';

function box(w, h, d, m, x, y, z, p) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); p.add(o); return o; }
function cyl(rt, rb, h, m, x, y, z, p, seg = 20) { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x, y, z); p.add(o); return o; }
function plane(w, h, mat, x, y, z, ry, p) { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); o.position.set(x, y, z); o.rotation.y = ry; p.add(o); return o; }
const lit = (map, o = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.85, ...o });

// 放不下就把字号缩小（英文比中文长）
function fitText(g, txt, x, y, maxW) { const m = g.measureText(txt).width; if (m > maxW) { const f = g.font.match(/(\d+(?:\.\d+)?)px/); if (f) g.font = g.font.replace(f[0], `${Math.floor(+f[1] * maxW / m)}px`); } g.fillText(txt, x, y); }
// 纸箱侧面的印字
const labelCache = {};
function cartonLabel(kind) {
  if (labelCache[kind]) return labelCache[kind];
  const L = {
    supply: ['#dcdcd4', '#2a4a6a', 'STERILE SUPPLIES', 'PIPETTES · TUBES · FLASKS'],
    pkg: ['#d8d0bc', '#3a3a3a', 'VACUUM POUCHES', 'FOOD GRADE · 200×300 mm · 5000 PCS'],
    clean: ['#e8e4d8', '#1a5a3a', '75% ETHANOL', 'DISINFECTANT · 5 L × 4 · FLAMMABLE'],
    fbs: ['#d8d4c4', '#9a2422', 'FETAL BOVINE SERUM', '500 mL × 12 · DRY ICE · −20 ℃'],
    soy: ['#8a7a5a', '#2a2420', 'SOY PROTEIN ISOLATE', 'FOOD GRADE · 25 kg'],
    media: ['#e0e0d8', '#2a4a6a', 'SINGLE-USE CULTURE BAG', '200 L · GAMMA STERILIZED'],
    tube: ['#e4e4dc', '#2a2a2a', 'SILICONE TUBING', 'FOOD GRADE · ID 6.4 mm · 25 m'],
    glove: ['#d4dce4', '#2a3a6a', 'NITRILE GLOVES', 'SIZE M · 100 × 10 BOXES'],
  }[kind];
  const t = canvasTexture(256, 160, (g, W, H) => {
    g.fillStyle = '#8a6e4e'; g.fillRect(0, 0, W, H);
    g.fillStyle = L[0]; g.fillRect(14, 22, W - 28, H - 44);
    g.fillStyle = L[1]; g.font = `700 30px ${SANS}`; g.textAlign = 'center'; fitText(g, L[2], W / 2, 76, W - 44);
    g.font = `500 15px ${SANS}`; fitText(g, L[3], W / 2, 108, W - 44);
    ageCanvas(g, W, H, { amount: 1.2, seed: kind.length * 7, drips: false });
  });
  labelCache[kind] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
  return labelCache[kind];
}
// 墙上、地上的字
const textTex = (lines, w, h, o = {}) => canvasTexture(w, h, (g, W, H) => {
  if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, W, H); } else g.clearRect(0, 0, W, H);
  for (const [txt, size, color, y, weight = 700, font = SANS, align = 'center', x = 0.5] of lines) {
    g.font = `${weight} ${size}px ${font}`; g.fillStyle = color; g.textAlign = align; fitText(g, txt, W * x, H * y, align === 'center' ? W * 0.92 : W * (0.96 - x));
  }
  if (o.age) ageCanvas(g, W, H, { amount: o.age, seed: w + h, drips: false });
});
// 黄黑斜纹
const hazardTex = (rep = 4) => { const t = canvasTexture(256, 64, (g, W, H) => { g.fillStyle = '#c8a028'; g.fillRect(0, 0, W, H); g.fillStyle = '#1a1a18'; for (let x = -H; x < W + H; x += 48) { g.beginPath(); g.moveTo(x, H); g.lineTo(x + 24, H); g.lineTo(x + 24 + H, 0); g.lineTo(x + H, 0); g.fill(); } ageCanvas(g, W, H, { amount: 1.4, seed: 5, drips: false }); }); t.wrapS = THREE.RepeatWrapping; t.repeat.set(rep, 1); return t; };

export function createWarehouse(env) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14120f);
  scene.fog = new THREE.FogExp2(0x2c2822, 0.03);                         // 灰蒙蒙、偏暖的尘雾，让纵深出来
  scene.environment = env;
  scene.environmentIntensity = 0.3;
  const root = new THREE.Group(); scene.add(root);
  let rs = 9; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;

  const M = {
    rackRed: pbr('rusty_painted_metal', 1, 1, { size: 0.6, roughness: 0.6, metalness: 0.3, color: 0xe8784a }),
    rackDark: new THREE.MeshStandardMaterial({ color: 0x2c2e2c, roughness: 0.55, metalness: 0.5, map: grimeMap(51) }),
    beam: new THREE.MeshStandardMaterial({ color: 0x3a3c3a, roughness: 0.5, metalness: 0.55, map: grimeMap(49) }),
    pallet: pbr('wood_table_worn', 1, 1, { size: 0.5, roughness: 0.95, color: 0xe2d4b8 }),                   // 旧托盘：真实的风化木头（照片扫描）
    carton: pbr('Cardboard001', 1, 1, { size: 0.9, roughness: 0.95, color: 0xb8a890 }),          // 真实的瓦楞纸（照片扫描）
    tape: new THREE.MeshStandardMaterial({ color: 0xa89a74, roughness: 0.5 }),
    crateBlue: null, crateGrey: null,
    case: new THREE.MeshStandardMaterial({ color: 0x1c1d1c, roughness: 0.6, map: grimeMap(48) }),
    latch: new THREE.MeshStandardMaterial({ color: 0xc8a028, roughness: 0.5 }),
    bag: new THREE.MeshPhysicalMaterial({ color: 0xe6eae6, roughness: 0.45, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.4, envMapIntensity: 0.6 }),   // 一次性培养袋：哑光白色塑料膜
    sack: null,
    steel: new THREE.MeshStandardMaterial({ color: 0x9a9c96, roughness: 0.4, metalness: 0.85, map: grimeMap(58) }),
    co2: new THREE.MeshStandardMaterial({ color: 0x2e3a36, roughness: 0.5, metalness: 0.5, map: grimeMap(59) }),
    fork: new THREE.MeshStandardMaterial({ color: 0x9a2c20, roughness: 0.45, metalness: 0.4, map: grimeMap(60) }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.9 }),
    straw: new THREE.MeshStandardMaterial({ color: 0x9a8448, roughness: 1 }),
    tarp: new THREE.MeshStandardMaterial({ color: 0x2e3032, roughness: 0.75, side: THREE.DoubleSide, map: grimeMap(61) }),
    tarpBlue: new THREE.MeshStandardMaterial({ color: 0x2a4a5a, roughness: 0.85, side: THREE.DoubleSide, map: grimeMap(62) }),
    strip: new THREE.MeshPhysicalMaterial({ color: 0xa8b090, roughness: 0.3, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }),
    tube: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.5, 2.2) }),
    deadTube: new THREE.MeshStandardMaterial({ color: 0x5a5a54, roughness: 0.4 }),
    paint: new THREE.MeshStandardMaterial({ color: 0xb09a38, roughness: 0.75, transparent: true, opacity: 0.85 }),
    paintG: new THREE.MeshStandardMaterial({ color: 0x3a7a4a, roughness: 0.75, transparent: true, opacity: 0.85 }),
    paintW: new THREE.MeshStandardMaterial({ color: 0xb8b4a8, roughness: 0.75, transparent: true, opacity: 0.6 }),
    yellow: pbr('PaintedMetal016', 1, 1, { size: 0.7, roughness: 0.6, metalness: 0.3, color: 0xd8c8a0 }),   // 黄漆掉了、起锈的钢管
    warn: new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.4, 0.2) }),
    concrete: pbr('concrete_wall_008', 8, 1, { size: 1.0, roughness: 0.95, color: 0xb4b0a6 }),
    drumBlue: new THREE.MeshStandardMaterial({ color: 0x24508a, roughness: 0.5, map: grimeMap(65) }),
    panel: new THREE.MeshStandardMaterial({ color: 0xb4b6b0, roughness: 0.5, metalness: 0.2, map: grimeMap(66) }),
    wrap: new THREE.MeshPhysicalMaterial({ color: 0xdfe8ec, roughness: 0.2, transparent: true, opacity: 0.2, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide }),   // 拉伸膜：半透明、发亮
    film: new THREE.MeshStandardMaterial({ color: 0xe8ece8, roughness: 0.5, metalness: 0, envMapIntensity: 0.6 }),   // 白色半透明感的塑料膜卷
    pail: new THREE.MeshStandardMaterial({ color: 0xe6e4dc, roughness: 0.45, map: grimeMap(68) }),
    galv: new THREE.MeshStandardMaterial({ color: 0xc4c6c0, roughness: 0.42, metalness: 0.75, map: grimeMap(72) }),   // 镀锌铁（运输笼）：发白、有锌花和脏
  };
  // 周转箱：注塑塑料，侧面一道道加强筋、上沿一圈翻边、两头提手孔（画出来的）
  const toteTex = (col) => canvasTexture(256, 128, (g, W, H) => { g.fillStyle = col; g.fillRect(0, 0, W, H);
    for (let x = 8; x < W; x += 22) { g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(x, 18, 5, H - 30); g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x + 5, 18, 3, H - 30); }
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, 12, W, 4); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, 8, W, 4);
    g.fillStyle = '#0c0c0c'; g.beginPath(); g.ellipse(W / 2, 30, 26, 8, 0, 0, 7); g.fill();
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; g.fillRect(Math.random() * W, Math.random() * H, 3 + Math.random() * 10, 1 + Math.random() * 2); } });
  M.crateBlue = new THREE.MeshStandardMaterial({ map: toteTex('#2a5288'), roughness: 0.5 });
  M.crateGrey = new THREE.MeshStandardMaterial({ map: toteTex('#4e504c'), roughness: 0.55 });
  // 编织袋：PP 编织纹（经纬线），淡淡的印字
  { const t = canvasTexture(256, 256, (g, W, H) => { g.fillStyle = '#d6ccb2'; g.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += 4) { g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, y, W, 2); } for (let x = 0; x < W; x += 4) { g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x, 0, 2, H); }
      g.fillStyle = 'rgba(40,90,40,.6)'; g.font = `800 34px ${SANS}`; g.fillText('SOY PROTEIN', 20, 110); g.font = `700 26px ${SANS}`; g.fillText('ISOLATE · 25 kg', 20, 150);
      for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(90,70,40,${Math.random() * 0.12})`; g.fillRect(Math.random() * W, Math.random() * H, 6 + Math.random() * 20, 2 + Math.random() * 6); } }, { repeat: [1, 1] });
    M.sack = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }); }
  // ---- 自己画的做旧贴图（canvas，不下载素材）：之前是纯色的部分都换成有磨损、掉漆、污渍的
  const R = (seed) => { let n = seed * 7919 + 13; return () => (n = (n * 16807) % 2147483647) / 2147483647; };
  const chips = (g, W, H, r, n, col, s = 1) => { for (let i = 0; i < n; i++) { g.fillStyle = col(r()); g.beginPath(); g.ellipse(r() * W, r() * H, (1 + r() * 5) * s, (1 + r() * 3) * s, r() * 3, 0, 7); g.fill(); } };
  const grime = (g, W, H, r, a = 0.25) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.75, 'rgba(30,24,16,0)'); gr.addColorStop(1, `rgba(30,24,16,${a})`); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(40,32,22,${r() * 0.08})`; g.fillRect(r() * W, r() * H, 4 + r() * 30, 1 + r() * 4); } };
  // 地上的油漆线：一块块掉漆、被叉车轮压出一道道淡的横带、沾了灰和鞋印
  const paintTex = (rgb, seed) => canvasTexture(64, 256, (g, W, H) => { const r = R(seed); g.fillStyle = `rgba(${rgb},0.92)`; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'destination-out'; chips(g, W, H, r, 220, () => `rgba(0,0,0,${0.4 + r() * 0.6})`, 1.6); for (let i = 0; i < 7; i++) { g.fillStyle = `rgba(0,0,0,${0.25 + r() * 0.3})`; g.fillRect(0, r() * H, W, 8 + r() * 24); }
    g.globalCompositeOperation = 'source-over'; chips(g, W, H, r, 260, () => `rgba(40,34,26,${r() * 0.3})`); });
  const paintMat = (rgb, seed) => { const m = new THREE.MeshStandardMaterial({ map: paintTex(rgb, seed), transparent: true, depthWrite: false, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -2 }); m.userData.tile = 0.9; return m; };
  M.paint = paintMat('206,178,64', 1); M.paintG = paintMat('62,138,82', 2); M.paintW = paintMat('214,210,198', 3);
  // 实心橡胶轮胎：深灰、表面磨毛
  M.tyre = new THREE.MeshStandardMaterial({ roughness: 0.92, map: canvasTexture(128, 64, (g, W, H) => { const r = R(5); g.fillStyle = '#1c1c1c'; g.fillRect(0, 0, W, H); chips(g, W, H, r, 300, () => `rgba(${r() < 0.5 ? '0,0,0' : '70,66,60'},.35)`, 0.6); g.fillStyle = 'rgba(120,116,108,.25)'; g.fillRect(0, H * 0.45, W, 3); }) });
  // 干草
  M.straw = new THREE.MeshStandardMaterial({ roughness: 1, map: canvasTexture(64, 64, (g, W, H) => { const r = R(6); g.fillStyle = '#9a8248'; g.fillRect(0, 0, W, H); for (let i = 0; i < 120; i++) { g.strokeStyle = `rgba(${200 + r() * 40 | 0},${170 + r() * 30 | 0},${90 + r() * 30 | 0},.7)`; g.beginPath(); const x = r() * W, y = r() * H; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 8); g.stroke(); } }) });
  // 手动搬运车：红漆掉了露出灰铁和锈
  M.fork = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.35, map: canvasTexture(128, 128, (g, W, H) => { const r = R(7); g.fillStyle = '#9a2a1e'; g.fillRect(0, 0, W, H); chips(g, W, H, r, 90, () => r() < 0.6 ? 'rgba(120,118,112,.9)' : 'rgba(110,60,28,.85)'); grime(g, W, H, r, 0.4); }) });
  // 蓝色塑料桶（200 L）：吹塑的竖纹、一张白标签、底下脏
  M.drumBlue = new THREE.MeshStandardMaterial({ roughness: 0.5, map: canvasTexture(256, 256, (g, W, H) => { const r = R(8); g.fillStyle = '#22508c'; g.fillRect(0, 0, W, H); for (let x = 0; x < W; x += 9) { g.fillStyle = `rgba(255,255,255,${0.03 + r() * 0.04})`; g.fillRect(x, 0, 3, H); }
    g.fillStyle = '#e8e4d8'; g.fillRect(20, 90, 110, 70); g.fillStyle = '#222'; g.font = `700 16px ${SANS}`; g.fillText('MEDIA BASE', 28, 112); g.font = `500 12px ${SANS}`; g.fillText('200 L · LOT 2610', 28, 132); g.fillText('KEEP SEALED', 28, 150); grime(g, W, H, r, 0.5); chips(g, W, H, r, 40, () => 'rgba(255,255,255,.12)'); }) });
  // 白色塑料提桶：发黄、印着字、桶口一圈脏
  M.pail = new THREE.MeshStandardMaterial({ roughness: 0.48, map: canvasTexture(256, 128, (g, W, H) => { const r = R(9); g.fillStyle = '#e4e0d4'; g.fillRect(0, 0, W, H); g.fillStyle = '#2a5a8a'; g.fillRect(0, 44, W, 30); g.fillStyle = '#fff'; g.font = `700 18px ${SANS}`; g.fillText('BUFFER SALTS · 20 L', 12, 65); g.fillText('PBS 10×', 196, 65);
    g.fillStyle = 'rgba(120,100,60,.25)'; g.fillRect(0, 0, W, 8); grime(g, W, H, r, 0.35); }) });
  // 拉伸膜：一圈圈缠出来的横纹、有厚有薄、发皱
  { const ft = canvasTexture(128, 256, (g, W, H) => { const r = R(10); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 6 + r() * 10) { g.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.5})`; g.fillRect(0, y, W, 2 + r() * 6); }
      for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1; g.beginPath(); const x = r() * W, y = r() * H; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 40, y + (r() - 0.5) * 6); g.stroke(); } });
    ft.colorSpace = THREE.NoColorSpace;
    M.wrap = new THREE.MeshPhysicalMaterial({ color: 0xd4dee2, roughness: 0.3, transparent: true, alphaMap: ft, opacity: 0.32, clearcoat: 0.35, envMapIntensity: 0.6, depthWrite: false, side: THREE.DoubleSide }); }
  { const wood = canvasTexture(256, 64, (g, W, H) => { const r = R(11); g.fillStyle = '#9c8a70'; g.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += 2) { g.fillStyle = `rgba(${r() < 0.5 ? '70,58,42' : '190,176,150'},${0.06 + r() * 0.12})`; g.fillRect(0, y + Math.sin(y) * 0.5, W, 1 + r() * 1.5); }   // 木纹
      for (let i = 0; i < 3; i++) { const x = r() * W, y = r() * H; g.strokeStyle = 'rgba(60,44,28,.55)'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, 5 + r() * 4, 2 + r() * 2, 0, 0, 7); g.stroke(); }   // 节疤
      g.fillStyle = 'rgba(150,150,145,.28)'; g.fillRect(0, 0, W, H);                                                 // 晒灰了
      for (const x of [14, W / 2, W - 14]) for (const y of [H * 0.3, H * 0.7]) { g.fillStyle = 'rgba(90,50,24,.55)'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); g.fillStyle = '#3a3632'; g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); }   // 钉子 + 锈印
      g.fillStyle = 'rgba(40,30,20,.35)'; g.fillRect(0, 0, 6, H); g.fillRect(W - 6, 0, 6, H); grime(g, W, H, r, 0.2); });
    M.pallet = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.92 }); }
  const kit = createCartonKit({ normalMap: M.carton.normalMap });
  // ---- 仓库道具包（Blender 做的 8 个 GLB，地面为原点、单位米、正面朝 +z）。贴图事先压到 512（带字的到 1024）并按内容哈希命名，
  //      这里跨文件共用同一张贴图——同一张旧钢板、旧木头不会重复上传显存（three-best-practices：material-reuse / 显存）
  const gltf = new GLTFLoader(), texCache = new Map();
  const shareTex = (mat) => { for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap']) { const t = mat[k]; if (!t || !t.name) continue;
    const key = t.name + '|' + t.colorSpace, c = texCache.get(key); if (c) mat[k] = c; else { t.anisotropy = 8; texCache.set(key, t); } } };
  const placeKit = (file, x, y, z, ry = 0, after, sc = 1) => gltf.load('assets/kit/' + file, (g) => {
    const o = g.scene; o.traverse((m) => { if (m.isMesh) { shareTex(m.material); m.material.envMapIntensity = 0.9; } });
    o.position.set(x, y, z); o.rotation.y = ry; o.scale.setScalar(sc); o.updateMatrixWorld(true); o.matrixAutoUpdate = false; root.add(o); after?.(o);
  }, undefined, (e) => console.warn('kit', file, e));                // 纸箱：贴图集 + 合并网格（cartons.js）
  const blobMat = new THREE.MeshBasicMaterial({ map: blobShadow(), transparent: true, depthWrite: false, opacity: 0.6 });
  const blob = (x, z, sx, sz = sx, y = 0.005) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), blobMat); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); root.add(p); return p; };

  // ---------------------------------------------------------------- 厂房：水泥地、瓦楞铁皮墙（下半截水泥墙裙）、红色壁柱、钢桁架屋顶
  const X0 = -12, X1 = 12, Z0 = 4, Z1 = -30, HT = 9;
  const CX = (X0 + X1) / 2, CZ = (Z0 + Z1) / 2, WD = X1 - X0, DP = Z0 - Z1;
  const fl = grimeFloorMaps('warehouse', { base: [96, 92, 84], seed: 91, gloss: 1.4 });
  let fm = pbr('concrete_floor_worn_001', WD, DP, { size: 3.0, roughness: 0.6, envMapIntensity: 1.6, color: 0xc8c4ba });   // 真实的旧水泥地
  { const W = 768, H = Math.round(768 * DP / WD); let n = 77; const r = () => (n = (n * 16807) % 2147483647) / 2147483647;
    const toPx = (x, z) => [(x - X0) / WD * W, (Z0 - z) / DP * H];
    const wetDraw = (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, W, H);                    // 黑 = 干；白 = 湿（下面再反过来当粗糙度用）
      const blot = (x, z, rx, rz, a) => { const [px, pz] = toPx(x, z); const gr = g.createRadialGradient(px, pz, 0, px, pz, rx / WD * W); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(0.6, `rgba(255,255,255,${a * 0.6})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.save(); g.translate(px, pz); g.scale(1, rz / rx); g.translate(-px, -pz); g.fillStyle = gr; g.beginPath(); g.arc(px, pz, rx / WD * W, 0, 7); g.fill(); g.restore(); };
      for (let i = 0; i < 70; i++) blot(X0 + 1 + r() * (WD - 2), Z0 - 1 - r() * (DP - 2), 0.4 + r() * 1.8, 0.3 + r() * 1.2, 0.35 + r() * 0.5);   // 一片片返潮、积水
      for (const x of [-2.6, -0.2]) for (let z = Z0 - 1; z > Z1 + 2; z -= 0.6) blot(x + (r() - 0.5) * 0.3, z, 0.45, 0.6, 0.18 + r() * 0.12);   // 叉车轮胎碾出来的两道亮痕
      for (let z = Z0 - 2; z > Z1 + 2; z -= 0.8) blot(-9.0 + (r() - 0.5) * 0.4, z, 0.7, 0.9, 0.3);   // 卸货平台根下一直是湿的
      for (const [x, z, s] of [[-2.0, -3.0, 2.0], [0.2, -11, 1.6], [-3.0, -17.5, 2.2], [4.6, -9, 1.2], [-6.2, -14, 1.4], [1.5, -21, 1.6]]) blot(x, z, s, s * 0.6, 0.95); };   // 原来那几摊积水的位置
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; wetDraw(cv.getContext('2d'));
    const coatAmt = new THREE.CanvasTexture(cv);                                     // clearcoatMap 读红通道：湿的地方有清漆
    const cv2 = document.createElement('canvas'); cv2.width = W; cv2.height = H; const g2 = cv2.getContext('2d'); g2.filter = 'invert(1)'; g2.drawImage(cv, 0, 0);
    const coatRough = new THREE.CanvasTexture(cv2);                                  // clearcoatRoughnessMap 读绿通道：湿 = 光滑
    for (const t of [coatAmt, coatRough]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8; }   // 数据贴图不做 sRGB 转换
    const old = fm; fm = new THREE.MeshPhysicalMaterial({ map: old.map, normalMap: old.normalMap, normalScale: old.normalScale, roughnessMap: old.roughnessMap, aoMap: old.aoMap, roughness: 0.75, color: old.color,
      clearcoat: 1, clearcoatMap: coatAmt, clearcoatRoughness: 0.9, clearcoatRoughnessMap: coatRough, envMapIntensity: 1.6 }); }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(WD, DP), fm); floor.rotation.x = -Math.PI / 2; floor.position.set(CX, 0, CZ); root.add(floor);
  for (let x = X0 + 6; x < X1; x += 6) { const j = new THREE.Mesh(new THREE.PlaneGeometry(0.012, DP), M.rackDark); j.rotation.x = -Math.PI / 2; j.position.set(x, 0.002, CZ); root.add(j); }   // 地坪伸缩缝
  for (let z = Z0 - 6; z > Z1; z -= 6) { const j = new THREE.Mesh(new THREE.PlaneGeometry(WD, 0.012), M.rackDark); j.rotation.x = -Math.PI / 2; j.position.set(CX, 0.002, z); root.add(j); }
  const cw = corrugatedMaps([88, 90, 86], 'whwall');
  const wallMat = (rep) => pbr('concrete_wall_008', rep * 2, 7.4, { size: 3.0, roughness: 0.9, color: 0xe2e0da });   // 真实的旧水泥墙（灰、有水渍）
  const WB = 1.6;                                                          // 水泥墙裙高度
  box(WD, HT - WB, 0.2, wallMat(12), CX, WB + (HT - WB) / 2, Z1 - 0.1, root);
  box(WD, HT - WB, 0.2, wallMat(12), CX, WB + (HT - WB) / 2, Z0 + 0.1, root);
  const ironMat = pbr('corrugated_iron', DP, HT - WB, { size: 2.4, roughness: 0.72, metalness: 0.3, color: 0xb0aea6 });   // 两侧墙上半截：镀锌瓦楞铁皮
  box(0.2, HT - WB, DP, ironMat, X0 - 0.1, WB + (HT - WB) / 2, CZ, root);
  box(0.2, HT - WB, DP, ironMat, X1 + 0.1, WB + (HT - WB) / 2, CZ, root);
  box(WD, WB, 0.24, M.concrete, CX, WB / 2, Z1 - 0.08, root);
  box(WD, WB, 0.24, M.concrete, CX, WB / 2, Z0 + 0.08, root);
  box(0.24, WB, DP, M.concrete, X0 - 0.08, WB / 2, CZ, root);
  box(0.24, WB, DP, M.concrete, X1 + 0.08, WB / 2, CZ, root);
  box(WD, 0.2, DP, pbr('corrugated_iron', WD, DP, { size: 3.0, rotate: Math.PI / 2, roughness: 0.6, metalness: 0.4, color: 0x7a7a74 }), CX, HT + 0.1, CZ, root);   // 屋面：底下看得见的压型钢板
  for (let z = Z0 - 3; z > Z1; z -= 6) {                                   // 两侧墙上的红色壁柱
    for (const x of [X0 + 0.15, X1 - 0.15]) { box(0.3, HT, 0.5, M.rackRed, x, HT / 2, z, root); box(0.34, 0.3, 0.6, M.rackDark, x, WB, z, root); }
  }
  for (let x = X0 + 3; x < X1; x += 6) box(0.5, HT, 0.3, M.rackRed, x, HT / 2, Z1 + 0.15, root);
  // 屋顶钢桁架：上下弦 + 斜腹杆，桁架之间几根檩条
  for (let z = Z0 - 3; z > Z1; z -= 6) {
    box(WD, 0.16, 0.16, M.rackDark, CX, HT - 0.9, z, root);
    box(WD, 0.12, 0.12, M.rackDark, CX, HT - 0.08, z, root);
    for (let x = X0 + 0.5; x < X1; x += 1.0) { const d = box(0.05, 0.95, 0.05, M.rackDark, x, HT - 0.48, z, root); d.rotation.z = (Math.round((x - X0) / 1.0) % 2 ? 1 : -1) * 0.5; }
  }
  for (const x of [-9, -3, 3, 9]) box(0.1, 0.18, DP, M.rackDark, x, HT - 0.15, CZ, root);
  // 顶灯：一排排短灯管（有几根不亮）；配几盏点光源
  for (let z = Z0 - 1.5; z > Z1 + 1; z -= 3) for (const x of [-7.5, -1.5, 4.5, 9.5]) {
    const dead = (x === 9.5 && z < -14) || (x === -1.5 && Math.abs(z + 13.5) < 0.1) || (x === -7.5 && Math.abs(z + 22.5) < 0.1);
    box(1.5, 0.06, 0.14, M.rackDark, x, HT - 1.02, z, root);
    box(1.4, 0.03, 0.06, dead ? M.deadTube : M.tube, x, HT - 1.06, z, root);
    for (const dx of [-0.6, 0.6]) cyl(0.004, 0.004, 0.12, M.rackDark, x + dx, HT - 0.94, z, root, 4);
  }
  for (const [x, z, i] of [[-10, -6, 14], [-10, -18, 14], [-6, -2, 26], [3, -2, 26], [-6, -11, 22], [3, -11, 26], [9, -11, 18], [-3, -20, 24], [6, -20, 20]]) { const l = new THREE.PointLight(0xe8dcc0, i, 16, 1.5); l.position.set(x, HT - 1.3, z); root.add(l); }

  // ---------------------------------------------------------------- 地面标线：主通道两条黄线、中间绿色虚线、出入库字样、斑马线
  const line = (x, z, w, d, m = M.paint, ry = 0) => { if (m.userData.tile) { const t = m.map.clone(); t.repeat.set(1, Math.max(1, d / m.userData.tile)); t.needsUpdate = true; m = m.clone(); m.map = t; } const l = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); l.rotation.set(-Math.PI / 2, 0, ry); l.position.set(x, 0.004, z); root.add(l); return l; };
  line(-4.2, -9.5, 0.12, 26); line(1.6, -9.5, 0.12, 26);                    // 主通道 x −4.2 … 1.6
  for (let z = 2.5; z > -22; z -= 1.6) line(-1.3, z, 0.1, 0.8, M.paintG);
  line(-1.3, -22.6, 5.8, 0.12);                                           // 冷库前的停止线
  for (const [x, z, txt, rot] of [[0.2, 1.0, 'INBOUND  →', 0], [-2.8, -1.2, '←  OUTBOUND', 0]]) {
    line(x, z, 2.2, 0.55, new THREE.MeshStandardMaterial({ map: textTex([[txt, 60, 'rgba(210,190,90,.8)', 0.75]], 440, 110), transparent: true, roughness: 0.9 }), rot);
  }
  for (let i = 0; i < 4; i++) { const c = line(-6.2, -6 - i * 0.7, 0.9, 0.12, M.paintW); c.rotation.z = 0.6; const c2 = line(-6.9, -6 - i * 0.7, 0.9, 0.12, M.paintW); c2.rotation.z = -0.6; }   // 去卸货平台方向的箭头
  { const hz = new THREE.MeshStandardMaterial({ map: hazardTex(6), roughness: 0.8, transparent: true, opacity: 0.85 }); line(-1.5, -23.4, 4, 1.2, hz); }   // 冷库门口的斜纹禁停区
  for (const [x0, z0, w, d] of [[2.1, -3.5, 0.08, 8.3], [2.1, -13.2, 0.08, 8.3]]) line(x0 - 0.15, z0, w, d, M.paintW);   // 货架前的白色边线

  // ---------------------------------------------------------------- 重型货架
  const palletGeo = (() => { const parts = [];                                   // 一个托盘：五块面板（有缝）+ 三根垫木 + 三块底板，合并成一个几何体
    const add = (w, h, d, x, y, z) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(x, y, z); parts.push(b); };
    for (let k = 0; k < 5; k++) add(1.2, 0.022, 0.15, 0, 0.139, -0.425 + k * 0.2125);
    for (const dz of [-0.42, 0, 0.42]) { add(1.2, 0.1, 0.1, 0, 0.078, dz); add(1.2, 0.022, 0.12, 0, 0.011, dz); }
    return mergeGeometries(parts); })();
  const pallet = (x, y, z, p = root) => { const m = new THREE.Mesh(palletGeo, M.pallet); m.position.set(x, y, z); p.add(m); return m; };
  // 单个纸箱：种类按 kind 挑，尺寸用那种箱子自己的尺寸（每个再随机差一点），返回 { w, h, d }
  const carton = (x, y, z, w, h, d, kind, ry = 0, p = root, o = {}) => kit.add(p, x, y, z, { kind: kind || 'reuse', ry, ...o });

  // 盖着防水布的一垛货：平面网格往下“搭”在一个看不见的盒子上
  const drape = (w, h, d, mat, x, y, z, ry, p = root) => {
    const g = new THREE.PlaneGeometry(w + h * 1.6, d + h * 1.6, 36, 30); g.rotateX(-Math.PI / 2);
    const ps = g.attributes.position;
    for (let i = 0; i < ps.count; i++) {
      let px = ps.getX(i), pz = ps.getZ(i);
      const ox = Math.max(0, Math.abs(px) - w / 2), oz = Math.max(0, Math.abs(pz) - d / 2), o = Math.hypot(ox, oz);
      let py = h + Math.sin(px * 9) * 0.01 + Math.sin(pz * 7) * 0.01;
      if (o > 0) {
        py = h - o * 1.1;
        px = Math.sign(px) * (Math.min(Math.abs(px), w / 2) + 0.02 + Math.max(0, o - 0.05) * 0.05 + Math.sin(pz * 13 + px) * 0.015 * o);
        pz = Math.sign(pz) * (Math.min(Math.abs(pz), d / 2) + 0.02 + Math.max(0, o - 0.05) * 0.05 + Math.sin(px * 11) * 0.015 * o);
      }
      ps.setXYZ(i, px, Math.max(0.01, py), pz);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.rotation.y = ry; p.add(m); return m;
  };
  const tote = (x, y, z, m, p) => { const b = box(0.6, 0.32, 0.4, m, x, y + 0.16, z, p); for (const yy of [-0.08, 0.06]) box(0.61, 0.012, 0.41, M.rackDark, 0, yy, 0, b); return b; };
  const loads = {
    cartons: (g, x, y, kind) => kit.stackPallet(g, x, y, kind || 'supply', { maxH: 0.5 + rnd() * 0.65, mixed: 0.5 }),
    bags: (g, x, y) => { for (let i = 0; i < 2; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 10), M.bag); b.scale.set(1.15, 0.28, 0.9); b.position.set(x, y + 0.14 + i * 0.27, 0); g.add(b); } const t = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.15), cartonLabel('media')); t.position.set(x, y + 0.32, 0.47); g.add(t); },
    sacks: (g, x, y) => { for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), M.sack); s.scale.set(1.6, 0.42, 0.95); s.position.set(x + (j - 0.5) * 0.55, y + 0.12 + i * 0.24, 0); s.rotation.y = rnd() * 0.3; g.add(s); } const t = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.14), cartonLabel('soy')); t.position.set(x, y + 0.5, 0.31); g.add(t); },
    totes: (g, x, y) => { for (let j = 0; j < 2; j++) { const n = 1 + Math.floor(rnd() * 3); for (let i = 0; i < n; i++) { const t = tote(x + (j - 0.5) * 0.62 + (rnd() - 0.5) * 0.04, y + i * 0.33, (rnd() - 0.5) * 0.1, rnd() < 0.7 ? M.crateBlue : M.crateGrey, g); t.rotation.y = (rnd() - 0.5) * 0.14; } } },
    cases: (g, x, y) => { for (let i = 0; i < 2; i++) { const b = box(1.0, 0.36, 0.7, M.case, x, y + 0.18 + i * 0.37, 0, g); for (const dx of [-0.3, 0.3]) box(0.08, 0.06, 0.02, M.latch, dx, 0.06, 0.36, b); } },
    spool: (g, x, y) => { for (const dx of [-0.32, 0.32]) { const s = new THREE.Group(); s.position.set(x + dx, y + 0.42, 0); s.rotation.z = Math.PI / 2; g.add(s); cyl(0.4, 0.4, 0.03, M.pallet, 0, -0.22, 0, s, 24); cyl(0.4, 0.4, 0.03, M.pallet, 0, 0.22, 0, s, 24); cyl(0.32, 0.32, 0.42, new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.5, map: grimeMap(67) }), 0, 0, 0, s, 24); } const t = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.14), cartonLabel('tube')); t.position.set(x, y + 0.16, 0.42); g.add(t); },
    drums: (g, x, y) => { for (const dx of [-0.28, 0.28]) for (const dz of [-0.22, 0.22]) { cyl(0.22, 0.22, 0.85, M.drumBlue, x + dx, y + 0.43, dz, g, 18); cyl(0.05, 0.05, 0.03, M.rackDark, x + dx + 0.1, y + 0.87, dz, g, 10); } },
    tarp: (g, x, y) => { box(1.0, 0.7, 0.8, M.crateGrey, x, y + 0.36, 0, g); drape(1.05, 0.74, 0.85, M.tarp, x, y, 0, rnd() * 0.2, g); },
    wrapped: (g, x, y) => { const h = 0.6 + rnd() * 0.4; kit.stackPallet(g, x, y, ['pkg', 'supply', 'media', 'clean'][Math.floor(rnd() * 4)], { maxH: h - 0.05, mixed: 0 }); box(1.17, h, 1.0, M.wrap, x, y + h / 2, 0, g);
      if (rnd() < 0.5) { const f = plane(0.45, 0.32, M.wrap, x + 0.25, y + h - 0.22, 0.52, 0, g); f.rotation.x = 0.35; f.rotation.z = 0.2; } },   // 整托缠了拉伸膜，有的撕开一角垂下来
    rolls: (g, x, y) => { const pts = [[-0.32, 0], [0, 0], [0.32, 0], [-0.16, 0.28], [0.16, 0.28], [0, 0.56]], n = 3 + Math.floor(rnd() * 4);
      for (let i = 0; i < n; i++) { const [dz, yy] = pts[i], L = 0.92 + rnd() * 0.28, r = cyl(0.15, 0.15, L, M.film, x + (rnd() - 0.5) * 0.2, y + 0.15 + yy, dz, g, 20); r.rotation.z = Math.PI / 2; r.rotation.y = (rnd() - 0.5) * 0.12; cyl(0.05, 0.05, L + 0.01, M.rackDark, 0, 0, 0, r, 10); } },   // 膜卷：长短不一、有的伸出来
    buckets: (g, x, y) => { for (const [dx, dz] of [[-0.28, -0.22], [0.28, -0.22], [-0.28, 0.22], [0.28, 0.22]]) { const n = rnd() < 0.15 ? 0 : 1 + (rnd() < 0.6 ? 1 : 0);
      for (let i = 0; i < n; i++) { const px = x + dx + (rnd() - 0.5) * 0.05, pz = dz + (rnd() - 0.5) * 0.05; cyl(0.16, 0.14, 0.36, M.pail, px, y + 0.18 + i * 0.37, pz, g, 16); cyl(0.165, 0.165, 0.02, M.pail, px, y + 0.37 + i * 0.37, pz, g, 16); } } },
    empty: (g, x, y) => { if (rnd() < 0.7) carton(x + 0.2, y, 0.1, 0, 0, 0, rnd() < 0.5 ? 'reuse' : 'supply', 0.3, g, { open: rnd() < 0.4 }); },
  };
  const LEVELS = [0, 1.6, 3.15, 4.7], RH = 6.3, BAY = 2.7, RD = 1.1;
  const holeTex = canvasTexture(32, 32, (g, W, H) => { g.fillStyle = '#d8692a'; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(90,40,20,.25)'; for (let i = 0; i < 30; i++) g.fillRect(Math.random() * W, Math.random() * H, 2, 1);
    g.fillStyle = '#1a120c'; g.beginPath(); g.ellipse(W / 2, H / 2 - 3, 4, 7, 0, 0, Math.PI * 2); g.fill(); g.fillRect(W / 2 - 2, H / 2, 4, 9); g.fillStyle = 'rgba(120,116,108,.6)'; for (let i = 0; i < 3; i++) g.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 4, 1); }, { repeat: [1, RH / 0.05] });   // 立柱上一列列水滴形冲孔
  const uprightM = new THREE.MeshStandardMaterial({ map: holeTex, roughness: 0.5, metalness: 0.35 });
  const orangeM = new THREE.MeshStandardMaterial({ map: canvasTexture(64, 64, (g, W, H) => { g.fillStyle = '#d8692a'; g.fillRect(0, 0, W, H); for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '90,40,20' : '240,170,110'},.25)`; g.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 3, 1); } }), roughness: 0.5, metalness: 0.15 });   // 横梁、斜撑：和立柱同一种橙漆（不带冲孔的那一格）   // 橙漆，有磨损和灰
  const labelMat = (txt) => new THREE.MeshStandardMaterial({ map: textTex([[txt, 34, '#1a1a18', 0.72, 700, MONO]], 160, 48, { bg: '#d8b838', age: 0.7 }), roughness: 0.6 });
  // fill[bay][level] = [load, kind]
  const rack = (name, x, z, ry, fill, guards = true) => {
    const bays = fill.length, W = bays * BAY;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    for (let k = 0; k <= bays; k++) {
      const fx = -W / 2 + k * BAY;
      for (const fz of [-RD / 2, RD / 2]) { box(0.09, RH, 0.07, uprightM, fx, RH / 2, fz, g); box(0.18, 0.012, 0.14, M.rackDark, fx, 0.006, fz, g); }
      for (let y = 0.35; y < RH - 0.3; y += 0.85) { const d = box(0.03, 0.03, Math.hypot(RD, 0.85), orangeM, fx, y + 0.42, 0, g); d.rotation.x = Math.atan2(0.85, RD) * (Math.round(y / 0.85) % 2 ? 1 : -1); }
      for (const y of [0.15, RH - 0.1]) box(0.04, 0.04, RD, orangeM, fx, y, 0, g);
      if (guards && (k === 0 || k === bays)) box(0.2, 0.42, 0.18, M.yellow, fx, 0.21, RD / 2 + 0.1, g);
      if (rnd() < 0.6) decal(rnd() < 0.5 ? 'Scratches001' : 'Rust001', g, { pos: [fx, 0.35, RD / 2 + 0.04], w: 0.12, h: 0.6, color: 0x8a7a6a, opacity: 0.7 });   // 叉车蹭的、返潮锈的
    }
    for (let b = 0; b < bays; b++) {
      const bx = -W / 2 + (b + 0.5) * BAY;
      LEVELS.forEach((y, li) => {
        if (li > 0) {
          for (const fz of [-RD / 2, RD / 2]) box(BAY - 0.1, 0.13, 0.06, orangeM, bx, y - 0.065, fz, g);
          const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.06), labelMat(`${name}-${String(b + 1).padStart(2, '0')}-${li + 1}`)); tag.position.set(bx - 0.6, y - 0.065, RD / 2 + 0.032); g.add(tag);
        }
        const [kind, label] = fill[b][li] || ['empty'];
        for (const px of [-0.64, 0.64]) {
          if (kind === 'none') continue;
          if (li > 0 && rnd() < 0.1) { if (rnd() < 0.6) carton(bx + px + (rnd() - 0.5) * 0.4, y, (rnd() - 0.5) * 0.3, 0, 0, 0, 'reuse', rnd() * 0.8, g, { open: rnd() < 0.5 }); continue; }   // 空出来的位置：只剩一个散箱子
          const slot = new THREE.Group(); slot.position.set(bx + px + (rnd() - 0.5) * 0.1, y, 0.03 + (rnd() - 0.5) * 0.14); slot.rotation.y = (rnd() - 0.5) * 0.07; slot.userData.batchTo = g; g.add(slot);
          pallet(0, 0, 0, slot);
          (loads[kind] || loads.empty)(slot, 0, 0.15, label);
        }
      });
    }
    blob(x, z, ry ? 1.8 : W + 0.6, ry ? W + 0.6 : 1.8);
    return g;
  };
  const F = (...a) => a;                                                   // 每格：[货物, 标签]
  const C = (k) => ['cartons', k];
  const facing = -Math.PI / 2;                                             // 货架正面朝向 −x（朝主通道）
  // 第一排（主通道右边）
  rack('A', 2.75, -3.5, facing, [
    [C('supply'), C('glove'), ['totes'], ['wrapped']],
    [['bags'], ['rolls'], C('pkg'), ['wrapped']],
    [C('clean'), ['buckets'], ['totes'], ['rolls']],
  ]);
  rack('A', 2.75, -13.2, facing, [
    [['drums'], C('pkg'), ['wrapped'], ['rolls']],
    [C('supply'), ['totes'], ['buckets'], ['wrapped']],
    [['rolls'], ['bags'], C('glove'), ['tarp']],
  ]);
  // 靠右墙一排（背靠墙）
  rack('C', 11.3, -8.3, facing, [
    [['rolls'], C('pkg'), ['wrapped'], ['totes']],
    [C('supply'), ['totes'], ['buckets'], ['wrapped']],
    [['bags'], ['wrapped'], C('glove'), ['rolls']],
    [['drums'], ['buckets'], ['totes'], ['wrapped']],
    [C('clean'), C('pkg'), ['rolls'], ['tarp']],
  ], false);
  // 区域牌
  for (const [txt, x, z] of [['A', 2.75, 0.75], ['C', 11.3, -1.3]]) {
    const s = plane(0.9, 0.9, lit(textTex([[txt, 150, '#1a1a18', 0.72, 800, SANS]], 200, 200, { bg: '#d8b838', age: 0.8 })), x, RH + 0.55, z, 0, root);
    box(0.95, 0.95, 0.04, M.rackDark, x, RH + 0.55, z - 0.03, root);
  }
  plane(3.2, 0.8, lit(textTex([['ZONES A · C — CONSUMABLES / PACKAGING / RAW MATERIALS', 46, '#e8e4d8', 0.62, 700]], 1000, 250, { bg: '#2a2c2a', age: 1 })), X1 - 0.27, 7.0, -8.3, -Math.PI / 2, root);
  // 货架之间的地上：防撞柱
  for (const z of [0.9, -8.35, -17.6]) { cyl(0.08, 0.08, 1.0, M.yellow, 1.95, 0.5, z, root, 14); cyl(0.085, 0.085, 0.1, M.rackDark, 1.95, 0.75, z, root, 14); }

  // ---------------------------------------------------------------- 叉车（停在两组货架之间的横通道口）和两台手动搬运车
  placeKit('08_Logistics_Forklift.glb', -0.6, 0, -8.6, Math.PI / 2 - 0.25, null, 1.3); blob(-0.6, -8.1, 2.0, 3.6);   // 物流叉车（道具包），货叉放在低位
  const jack = (x, z, ry) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    for (const zz of [-0.2, 0.2]) box(1.2, 0.06, 0.16, M.fork, 0, 0.06, zz, g);
    box(0.25, 0.3, 0.6, M.fork, -0.7, 0.2, 0, g);
    const h = box(0.04, 1.1, 0.04, M.rackDark, -0.85, 0.7, 0, g); h.rotation.z = 0.3;
    box(0.04, 0.04, 0.3, M.rackDark, -1.0, 1.22, 0, g);
    for (const zz of [-0.15, 0.15]) { const w = cyl(0.08, 0.08, 0.05, M.tyre, -0.72, 0.08, zz, g, 14); w.rotation.x = Math.PI / 2; }
    return g;
  };
  jack(-3.5, -5.2, 0.5); jack(-9.6, -12.2, 1.6);

  // ---------------------------------------------------------------- 左边：卸货平台（1.1 m 高）、栏杆、台阶、两扇卷帘门
  const PX = -8.5, PH = 1.1, PZ0 = 2, PZ1 = -26;
  box(PX - X0, PH, PZ0 - PZ1, M.concrete, (X0 + PX) / 2, PH / 2, (PZ0 + PZ1) / 2, root);
  { const pt = new THREE.Mesh(new THREE.PlaneGeometry(PX - X0, PZ0 - PZ1), pbr('garage_floor', PX - X0, PZ0 - PZ1, { size: 3.0, roughness: 0.7, color: 0xa8a49c })); pt.rotation.x = -Math.PI / 2; pt.position.set((X0 + PX) / 2, PH + 0.002, (PZ0 + PZ1) / 2); root.add(pt); }   // 平台面：带油渍的旧水泥
  { const hz = new THREE.MeshStandardMaterial({ map: hazardTex(40), roughness: 0.8 }); plane(PZ0 - PZ1, 0.22, hz, PX + 0.005, PH - 0.11, (PZ0 + PZ1) / 2, Math.PI / 2, root); }
  box(0.06, 0.06, PZ0 - PZ1, M.steel, PX + 0.03, PH, (PZ0 + PZ1) / 2, root);   // 平台角钢
  const STZ = -4.2;                                                       // 台阶位置
  for (let i = 0; i < 5; i++) box(0.3, PH * (i + 1) / 5, 1.2, M.concrete, PX + 1.35 - i * 0.3, PH * (i + 1) / 10, STZ, root);
  for (let z = PZ0 - 0.3; z > PZ1; z -= 1.5) {                            // 平台边上的黄色栏杆（台阶处断开）
    if (Math.abs(z - STZ) < 0.9) continue;
    cyl(0.025, 0.025, 1.0, M.yellow, PX + 0.15, PH + 0.5, z, root, 8);
  }
  for (const [za, zb] of [[PZ0 - 0.3, STZ + 0.75], [STZ - 0.75, PZ1 + 0.2]]) for (const y of [PH + 1.0, PH + 0.55]) { const r = cyl(0.02, 0.02, za - zb, M.yellow, PX + 0.15, y, (za + zb) / 2, root, 8); r.rotation.x = Math.PI / 2; }
  for (const z of [STZ + 0.6, STZ - 0.6]) { const r = cyl(0.02, 0.02, 1.7, M.yellow, PX + 0.85, PH * 0.5 + 0.9, z, root, 8); r.rotation.z = Math.atan2(PH, 1.5); }
  // 卷帘门
  const rm = corrugatedMaps([80, 82, 78], 'whdoor');
  const dm = new THREE.MeshStandardMaterial({ map: rm.map.clone(), normalMap: rm.normalMap.clone(), roughness: 0.6, metalness: 0.5 });
  for (const t of [dm.map, dm.normalMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 6); t.rotation = Math.PI / 2; t.needsUpdate = true; }
  for (const [z, n] of [[-8, 1], [-17, 2]]) {
    plane(3.6, 3.6, pbr(n === 1 ? 'painted_metal_shutter' : 'rusty_metal_shutter', 3.6, 3.6, { size: 2.4, roughness: 0.55, metalness: 0.45, color: 0xa8a8a0 }), X0 + 0.02, PH + 1.8, z, Math.PI / 2, root);
    { const lv = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.4), pbr('DiamondPlate008A', 2.6, 1.4, { size: 1.2, roughness: 0.45, metalness: 0.9, color: 0x9a9a94 })); lv.rotation.set(-Math.PI / 2, 0, Math.PI / 2); lv.position.set(X0 + 1.0, PH + 0.004, z); root.add(lv); }   // 卸货口的花纹钢板
    for (const dz of [-1.9, 1.9]) box(0.18, 3.9, 0.2, M.rackRed, X0 + 0.08, PH + 1.95, z + dz, root);
    box(0.5, 0.5, 4.2, M.rackDark, X0 + 0.25, PH + 3.9, z, root);           // 卷轴箱
    box(0.04, 0.12, 3.5, M.yellow, X0 + 0.06, PH + 0.06, z, root);
    plane(1.2, 0.36, lit(textTex([[`DOCK 0${n}`, 50, '#fff', 0.5, 700], ['MAX HEIGHT 3.4 m', 24, 'rgba(255,255,255,.75)', 0.86, 500]], 400, 120, { bg: '#7a2420', age: 0.8 })), X0 + 0.04, PH + 4.5, z, Math.PI / 2, root);
    const dl = new THREE.SpotLight(0xffd8a0, 9, 7, 0.7, 0.6, 1.4); dl.position.set(X0 + 0.6, PH + 4.3, z); dl.target.position.set(X0 + 2.5, PH, z); root.add(dl, dl.target);
    cyl(0.12, 0.18, 0.2, M.rackDark, X0 + 0.5, PH + 4.3, z, root, 14).rotation.z = Math.PI / 2;
  }
  for (let z = PZ0 - 1.5; z > PZ1 + 1; z -= 3.2) {
    decal(rnd() < 0.5 ? 'SurfaceImperfections013' : 'SurfaceImperfections015', root, { pos: [PX + 0.004, 0.35, z + rnd()], rot: [0, Math.PI / 2, 0], w: 2.6, h: 0.7, color: 0x4a5a30, opacity: 0.7 });   // 墙脚青苔
    decal(rnd() < 0.5 ? 'Leaking005' : 'Leaking006', root, { pos: [PX + 0.005, 0.6, z + 1.2 + rnd()], rot: [0, Math.PI / 2, 0], w: 1.2, h: 1.0, color: 0x2a2a22, opacity: 0.6 }); }   // 往下流的水痕
  // 平台上：空的动物运输笼（干草还是新的）、一垛盖着蓝防水布的货
  { const l = new THREE.PointLight(0xe8d8b8, 7, 6, 1.6); l.position.set(-9.4, PH + 3.2, -16.2); root.add(l); }
  for (const [x, z, r] of [[-9.75, -15.15, Math.PI / 2 - 0.06], [-9.8, -16.55, Math.PI / 2 + 0.08], [-11.15, -15.9, Math.PI / 2 + 0.35]]) { placeKit('07_Optional_Empty_Transit_Cage.glb', x, PH, z, r); blob(x, z, 1.0, 1.4, PH + 0.005); }   // 空运输笼 ×3
  placeKit('06_Farm_Sample_Return.glb', -11.2, PH, -19.6, Math.PI / 2); blob(-11.2, -19.6, 1.0, 1.4, PH + 0.005);   // 牧场送样与返箱区（道具包）
  for (const [z, w] of [[-21, 1.2], [-23, 1.0]]) { box(w, 0.9, 1.0, M.crateGrey, -10.4, PH + 0.45, z, root); drape(w + 0.05, 0.94, 1.05, M.tarpBlue, -10.4, PH, z, 0.1, root); }
  { let yy = PH; for (let i = 0; i < 3; i++) { const b = carton(-10.6 + (i % 2) * 0.06, yy, -5.6, 0, 0, 0, i === 1 ? 'supply' : 'reuse', (rnd() - 0.5) * 0.3, root, { open: i === 2 }); yy += b.h; } }

  // ---------------------------------------------------------------- 左前：冷链收货区（道具包）——卧式冷柜、木托盘、一只拆开的泡沫箱（六瓶带批次标签的试制血清）、一只封条完好的
  placeKit('03_Cold_Chain_Intake.glb', PX + 0.8, 0, -1.2, Math.PI / 2); blob(PX + 0.9, -1.2, 1.7, 1.7);
  plane(0.9, 0.3, lit(textTex([['−20 ℃ · SERUM / GROWTH FACTORS', 34, '#1a1a18', 0.65, 700]], 600, 200, { bg: '#d8d4c4', age: 1 })), PX + 0.006, PH - 0.35, -1.2, Math.PI / 2, root);

  // ---------------------------------------------------------------- 值班点验台（道具包）：沿用旧台灯，夹板、圆珠笔、露出粉色底联的三联收货单——这里核对“到了几箱”
  placeKit('05_Dock_Check_In.glb', PX + 0.6, 0, -11.6, Math.PI / 2); blob(PX + 0.65, -11.6, 0.9, 1.4);
  { const dkl = new THREE.SpotLight(0xffcf8a, 5, 3, 0.8, 0.6, 1.4); dkl.position.set(PX + 0.48, 1.3, -11.25); dkl.target.position.set(PX + 0.6, 0.8, -11.6); root.add(dkl, dkl.target); }   // 台灯的光

  // ---------------------------------------------------------------- 最里面：冷库（细胞库）。保温板墙、PVC 门帘、红色警示灯；屋顶上两台冷凝机组
  const cold = new THREE.Group(); cold.position.set(-1.5, 0, -27.0); root.add(cold);
  const CWd = 8, CHt = 4.2, CDp = 5.6;
  box(CWd, CHt, CDp, M.panel, 0, CHt / 2, 0, cold);
  for (let x = -CWd / 2 + 1.1; x < CWd / 2; x += 1.1) box(0.02, CHt, 0.02, M.rackDark, x, CHt / 2, CDp / 2 + 0.005, cold);
  box(CWd + 0.1, 0.12, CDp + 0.1, M.steel, 0, CHt + 0.06, 0, cold);
  placeKit('04_Cell_Bank_Handover.glb', -1.5, 0, -27.0 + CDp / 2 + 0.36, 0); blob(-1.5, -23.3, 1.6, 1.0);   // 细胞库交接处（道具包）：门、软门帘、库位牌、推车上的液氮罐
  const coldSign = canvasTexture(512, 160, (g, W, H) => { g.fillStyle = '#d8d4c4'; g.fillRect(0, 0, W, H); g.fillStyle = '#1a3a6a'; g.font = `700 60px ${SANS}`; g.textAlign = 'center'; fitText(g, 'COLD STORE · AUTHORISED ONLY', W / 2, 78, W - 30); g.font = `400 28px ${SANS}`; g.fillStyle = '#9a2422'; fitText(g, 'CELL BANK MCB-07 · LN₂ −196 ℃ · OXYGEN DEPLETION RISK', W / 2, 126, W - 30); ageCanvas(g, W, H, { amount: 1.2, seed: 13, drips: false }); });
  plane(2.2, 0.68, lit(coldSign), 0, 3.3, CDp / 2 + 0.02, 0, cold);
  box(0.3, 0.06, 0.2, M.warn, 1.5, 2.85, CDp / 2 + 0.08, cold);
  const warnL = new THREE.PointLight(0xff4020, 2, 4.5, 2); warnL.position.set(1.5, 2.7, CDp / 2 + 0.4); cold.add(warnL);
  const coldLight = new THREE.PointLight(0xb8e0ff, 4, 5, 2); coldLight.position.set(0, 1.4, CDp / 2 + 1.0); cold.add(coldLight);
  const tdisp = canvasTexture(200, 80, (g, W, H) => { g.fillStyle = '#0c0e0e'; g.fillRect(0, 0, W, H); g.fillStyle = '#5ae0ff'; g.font = `700 40px monospace`; g.fillText('O₂ 20.6%', 10, 54); });
  plane(0.3, 0.12, new THREE.MeshBasicMaterial({ map: tdisp }), -1.6, 1.6, CDp / 2 + 0.01, 0, cold);
  plane(0.42, 0.56, lit(textTex([['BEFORE ENTRY', 30, '#1a1a18', 0.2, 700], ['CHECK O₂ LEVEL', 26, '#1a1a18', 0.36, 500], ['≥ 19.5%', 40, '#9a2422', 0.58, 700], ['WEAR CRYO GLOVES', 24, '#1a1a18', 0.8, 500]], 300, 400, { bg: '#e8e0c8', age: 1 })), 1.65, 1.5, CDp / 2 + 0.01, 0, cold);
  for (const dx of [-2.2, 2.0]) {                                          // 屋顶冷凝机组
    box(1.6, 0.9, 1.1, M.panel, dx, CHt + 0.57, -0.8, cold);
    for (const fx of [-0.4, 0.4]) { cyl(0.32, 0.32, 0.03, M.rackDark, dx + fx, CHt + 1.03, -0.8, cold, 24); }
  }
  { const p = cyl(0.05, 0.05, 6, M.steel, 3.2, CHt + 3.2, -0.8, cold, 10); }   // 冷媒管接到顶上
  blob(-1.5, -27.0, CWd + 1, CDp + 1);
  const dewar = (x, z, s = 1, lbl = 'B-0417 · P-0932') => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); root.add(g);
    cyl(0.32, 0.32, 1.2, M.steel, 0, 0.65, 0, g, 24);
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.steel); d.position.y = 1.25; g.add(d);
    cyl(0.07, 0.07, 0.16, M.steel, 0, 1.6, 0, g, 12);
    for (const a of [0, 2.1, 4.2]) cyl(0.03, 0.03, 0.06, M.rackDark, Math.cos(a) * 0.28, 0.03, Math.sin(a) * 0.28, g, 8);
    const t = canvasTexture(160, 90, (gg, W, H) => { gg.fillStyle = '#2a4a8a'; gg.fillRect(0, 0, W, H); gg.fillStyle = '#fff'; gg.font = `700 30px ${SANS}`; gg.fillText('LN₂', 14, 40); gg.font = `400 15px ${SANS}`; gg.fillText(lbl, 14, 72); });
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.322, 0.322, 0.26, 24, 1, true, -0.6, 1.2), lit(t)); l.position.y = 0.85; g.add(l);
    blob(x, z, 0.9 * s);
    return g;
  };
  dewar(-4.4, -23.3); dewar(-3.6, -23.7, 0.85, 'G-0221'); dewar(1.6, -23.6, 1.0, 'P-1077 · NEW LINE');
  const fogTex = canvasTexture(128, 128, (g, W, H) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(210,225,230,.5)'); gr.addColorStop(1, 'rgba(210,225,230,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); });
  const mist = [];
  for (let i = 0; i < 10; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fogTex, transparent: true, depthWrite: false, opacity: 0.3 })); s.userData.ph = i / 10; root.add(s); mist.push(s); }

  // ---------------------------------------------------------------- 右后角：CO₂ 气瓶笼；地上几垛培养袋
  const cage = new THREE.Group(); cage.position.set(9.6, 0, -25.8); root.add(cage);
  for (let i = 0; i < 8; i++) { cyl(0.11, 0.11, 1.4, M.co2, -0.6 + (i % 4) * 0.3, 0.7, (Math.floor(i / 4) - 0.5) * 0.32, cage, 14); cyl(0.04, 0.04, 0.12, M.steel, -0.6 + (i % 4) * 0.3, 1.46, (Math.floor(i / 4) - 0.5) * 0.32, cage, 8); }
  for (const x of [-0.85, 0.65]) for (const z of [-0.45, 0.45]) box(0.04, 1.9, 0.04, M.rackDark, x, 0.95, z, cage);
  for (const y of [0.4, 1.0, 1.6]) { box(1.5, 0.03, 0.03, M.rackDark, -0.1, y, -0.45, cage); box(1.5, 0.03, 0.03, M.rackDark, -0.1, y, 0.45, cage); box(0.03, 0.03, 0.9, M.rackDark, -0.85, y, 0, cage); }
  plane(0.6, 0.3, lit(textTex([['CO₂', 60, '#fff', 0.6, 800], ['COMPRESSED GAS', 22, 'rgba(255,255,255,.8)', 0.9, 500]], 240, 120, { bg: '#2a6a3a', age: 0.8 })), -0.1, 1.85, 0.47, 0, cage);
  blob(9.6, -25.8, 2, 1.4);
  for (const [x, z] of [[5.6, -21.0], [7.2, -21.4], [6.4, -22.8]]) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rnd(); root.add(g); pallet(0, 0, 0, g); loads.bags(g, 0, 0.15); blob(x, z, 1.5); }

  // ---------------------------------------------------------------- 前墙：回门店的门、消防栓、配电箱
  box(1.3, 2.4, 0.1, M.rackDark, -1.3, 1.2, Z0 - 0.02, root);
  plane(1.1, 2.25, new THREE.MeshStandardMaterial({ color: 0x5a5c58, roughness: 0.5, metalness: 0.6, map: grimeMap(69) }), -1.3, 1.13, Z0 - 0.08, Math.PI, root);
  plane(0.8, 0.26, lit(textTex([['←  SHOP', 50, '#fff', 0.7, 700]], 300, 100, { bg: '#1f6a40', age: 0.6 })), -1.3, 2.62, Z0 - 0.08, Math.PI, root);
  box(0.6, 0.8, 0.2, new THREE.MeshStandardMaterial({ color: 0x9a2a20, roughness: 0.6, map: grimeMap(70) }), 3.4, 1.4, Z0 - 0.12, root);
  box(0.8, 1.1, 0.25, M.panel, 6.2, 1.6, Z0 - 0.14, root);
  for (const x of [-6, -3]) { box(0.6, 0.06, 0.3, M.rackDark, x, 3.2, Z0 - 0.2, root); }

  // ---------------------------------------------------------------- 散落的东西：拉伸膜卷、木托盘垛、纸箱
  for (let i = 0; i < 6; i++) { const y = i * 0.15; pallet(-6.6, y, -18.5 + (rnd() - 0.5) * 0.05); }
  blob(-6.6, -18.5, 1.6);
  for (let i = 0; i < 3; i++) { const w = cyl(0.12, 0.12, 0.5, M.bag, -5.6 + i * 0.3, 0.12, -19.6, root, 16); w.rotation.z = Math.PI / 2; }
  for (let i = 0; i < 4; i++) carton(-3.0 + rnd() * 0.8, 0, -14 - i * 1.1, 0, 0, 0, ['supply', 'pkg', 'reuse', 'cooler'][i], rnd() * 3, root, { crush: i === 2 ? 0.04 : 0 });

  // ---------------------------------------------------------------- 脏：墙上的雨水痕 / 锈水 / 返潮，地上的积水，运输笼旁边的血，卸货门上的小窗，铁丝罩壁灯，靠墙的木托盘，铁皮桶
  const stainSheet = (w, h, seed) => canvasTexture(Math.round(w * 40), Math.round(h * 40), (g, W, H) => { g.clearRect(0, 0, W, H); const rr = ((n) => () => (n = (n * 16807) % 2147483647) / 2147483647)(seed); grimeLayer(g, W, H, rr, { stains: Math.round(w * 0.6), drips: Math.round(w * 6), rust: Math.round(w * 1.2), mould: w * 0.4, unit: 60, dripCol: '50,40,28' }); });
  const sheet = (w, h, x, y, z, ry, seed) => plane(w, h, new THREE.MeshStandardMaterial({ map: stainSheet(w, h, seed), transparent: true, depthWrite: false, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -1 }), x, y, z, ry, root);
  sheet(DP, HT, X0 + 0.01, HT / 2, CZ, Math.PI / 2, 301); sheet(DP, HT, X1 - 0.01, HT / 2, CZ, -Math.PI / 2, 302); sheet(WD, HT, CX, HT / 2, Z1 + 0.01, 0, 303);
  for (const [x, z, w, d, r, sd] of [[-2.0, -3.0, 3.2, 1.8, 0.3, 61], [0.2, -11, 2.4, 1.2, 1.2, 62], [-3.0, -17.5, 3.6, 2.0, 2.0, 63], [4.6, -9, 1.8, 1.0, 0.6, 64], [-6.2, -14, 2.2, 1.2, 1.6, 65], [1.5, -21, 2.6, 1.4, 0.2, 66], [-1.0, 1.4, 1.6, 0.9, 2.6, 67]]) {
    const pd = puddleDecal(sd); const m = new THREE.MeshStandardMaterial({ map: pd.map, roughnessMap: pd.roughnessMap, roughness: 0.05, metalness: 0.0, envMapIntensity: 1.2, opacity: 0.55, color: 0xb8b4aa, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); p.rotation.set(-Math.PI / 2, 0, r); p.position.set(x, 0.006, z); root.add(p);
  }
  for (const [x, z, sz, sd] of [[-9.6, -16.4, 0.9, 71], [-8.9, -15.2, 0.5, 72], [-10.2, -18.3, 0.6, 73]]) { const pd = puddleDecal(sd, { kind: 'blood' }); const p = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), new THREE.MeshStandardMaterial({ map: pd.map, roughness: 0.45, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); p.rotation.set(-Math.PI / 2, 0, sd); p.position.set(x, PH + 0.006, z); root.add(p); }
  for (const z of [-8, -17]) for (const dz of [-1.0, 0, 1.0]) { box(0.02, 0.22, 0.6, M.rackDark, X0 + 0.04, PH + 2.4, z + dz, root); plane(0.52, 0.16, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.45, 0.5, 0.55) }), X0 + 0.055, PH + 2.4, z + dz, Math.PI / 2, root); }   // 卷帘门上的小窗（外面是夜）
  const cagedLamp = (x, y, z, ry) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; root.add(g);
    box(0.14, 0.14, 0.05, M.rackDark, 0, 0, 0, g); cyl(0.07, 0.07, 0.2, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.2, 1.2) }), 0, 0, 0.13, g, 14).rotation.x = Math.PI / 2;
    for (let k = 0; k < 6; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.004, 4, 16), M.rackDark); r.position.set(0, 0, 0.05 + k * 0.04); g.add(r); }
    const l = new THREE.PointLight(0xffb468, 5, 6, 1.6); l.position.set(0, -0.1, 0.4); g.add(l); };
  cagedLamp(X0 + 0.05, PH + 3.0, -9.9, Math.PI / 2); cagedLamp(X0 + 0.05, PH + 3.0, -18.9, Math.PI / 2); cagedLamp(PX + 0.06, PH - 0.3, -1.6, Math.PI / 2);
  for (let i = 0; i < 4; i++) { const g = new THREE.Group(); g.position.set(PX + 0.32 + i * 0.16, 0.6, -6.4 + i * 0.03); g.rotation.set(0, 0, Math.PI / 2 + 0.25); root.add(g); pallet(0, -0.07, 0, g); }   // 靠在平台边上的一摞木托盘
  { const bk = cyl(0.17, 0.14, 0.32, M.steel, -11.2, PH + 0.16, -14.6, root, 18); cyl(0.17, 0.17, 0.01, new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.1 }), -11.2, PH + 0.28, -14.6, root, 18); }
  { const ct = new THREE.Group(); ct.position.set(-11.3, PH, -12.6); root.add(ct); box(0.7, 0.4, 0.5, M.crateGrey, 0, 0.2, 0, ct); box(0.7, 0.4, 0.5, M.crateGrey, 0, 0.6, 0.02, ct).rotation.y = 0.05; }

  // 真实模型：随手堆放的东西（桶、周转箱、手推车、油桶、发电机、吨桶、扫把、旧轮胎、纸箱、湿地警示牌、吊灯）
  model('Barrel_01', { pos: [8.2, 0, -23.4], jitter: 0.3, parent: root }); model('barrel_03', { pos: [8.9, 0, -23.0], jitter: 0.3, parent: root }); model('Barrel_01', { pos: [8.5, 0, -22.4], tilt: 0.05, jitter: 0.3, parent: root });
  for (let i = 0; i < 4; i++) model('plastic_crate_03', { pos: [-3.3 + (i % 2) * 0.5, Math.floor(i / 2) * 0.27, -6.2], rot: (i % 2) * 0.2, jitter: 0.2, parent: root });
  for (let i = 0; i < 3; i++) model('plastic_crate_01', { pos: [-10.6 + i * 0.35, PH, -10.9], rot: 0.1 * i, jitter: 0.3, parent: root });
  model('hand_truck', { pos: [-7.9, 0, -2.6], rot: 1.2, tilt: 0.06, parent: root });
  model('metal_jerrycan', { pos: [7.8, 0, -24.6], rot: 0.4, parent: root }); model('metal_jerrycan', { pos: [8.15, 0, -24.7], rot: 1.1, parent: root });
  model('portable_generator', { pos: [5.0, 0, -24.4], rot: -0.6, parent: root });
  model('industrial_pastic_container', { pos: [-5.0, 0, -22.3], rot: 0.3, parent: root }); model('industrial_pastic_container', { pos: [-5.6, 0, -21.8], rot: 1.2, parent: root });
  { const b = model('plastic_broom', { pos: [-7.95, 0, -8.6], rot: Math.PI / 2, parent: root }); b.rotation.z = 0.25; }
  model('old_tyre', { pos: [-9.5, PH + 0.3, -20.0], rot: 0.4, parent: root });
  for (const [x, z, r, k] of [[-2.2, -15.2, 0.4, 'supply'], [-2.6, -15.7, 1.2, 'reuse'], [0.8, -2.6, 2.0, 'pkg'], [-11.0, -6.0, 0.3, 'reuse']]) carton(x, x < -9 ? PH : 0, z, 0, 0, 0, k, r, root, { crush: k === 'reuse' ? 0.03 : 0 });   // 原来四个一模一样的纸箱模型
  model('wooden_crate_02', { pos: [-10.7, PH, -3.2], rot: 0.1, parent: root });
  model('WetFloorSign_01', { pos: [-0.8, 0, -16.6], rot: 0.7, scale: 1.25, parent: root });
  for (const [x, z] of [[-1.5, -21.5], [-6.5, -9], [-6.5, -18]]) model('caged_hanging_light', { pos: [x, HT - 1.3, z], parent: root });

  // ---------------------------------------------------------------- 第二批真实素材：工具车、货架、工具箱、水泥袋、油桶、气罐、监控、配电箱、档案柜
  model('tool_cart', { pos: [8.6, 0, 2.2], rot: -0.5, parent: root });
  model('metal_toolbox', { pos: [8.5, 0.96, 2.2], rot: -0.3, parent: root });
  model('oil_tin', { pos: [8.95, 0.96, 2.4], rot: 1.2, parent: root }); model('lubricant_spray', { pos: [8.3, 0.96, 1.98], rot: 0.4, parent: root });
  model('worn_metal_rack', { pos: [8.6, 0, 3.6], rot: Math.PI, parent: root });
  for (let i = 0; i < 3; i++) model('can_rusted', { pos: [7.9 + i * 0.15, 0, 3.0 + (i % 2) * 0.1], rot: i, parent: root });
  model('spray_paint_bottles', { pos: [8.85, 0.96, 1.95], rot: -0.5, parent: root });
  // 前墙：包装耗材架 + 订单配货台（道具包）。大厅展示顾客怎么选肉，这里是员工把那份选择封进袋子
  placeKit('02_Order_Packing_Bench.glb', 1.95, 0, 3.58, Math.PI); blob(1.95, 3.55, 1.9, 0.9);
  placeKit('01_Packaging_Pick_Rack.glb', 4.7, 0, 3.6, Math.PI); blob(4.7, 3.6, 2.0, 0.9);
  { const pl = new THREE.PointLight(0xffe0b0, 5, 5, 1.6); pl.position.set(3.3, 2.6, 2.6); root.add(pl); }   // 配货台上方一盏暖灯
  model('propane_tank', { pos: [5.7, 0, -25.1], rot: 0.3, parent: root }); model('propane_tank', { pos: [6.1, 0, -25.25], rot: 1.7, parent: root });
  model('metal_jerrycan_green', { pos: [7.4, 0, -24.9], rot: 0.2, parent: root }); model('plastic_jerrycan', { pos: [4.5, 0, -24.9], rot: 2.2, parent: root });
  model('security_camera_01', { pos: [X0 + 0.15, PH + 5.0, -12.5], rot: Math.PI / 2, parent: root });
  model('power_box_01', { pos: [7.4, 1.5, Z0 - 0.05], rot: Math.PI, parent: root });
  model('drawer_cabinet', { pos: [PX + 0.27, 0, -13.05], rot: Math.PI / 2, parent: root });          // 值班桌旁的档案柜
  model('wooden_stool_01', { pos: [PX + 1.5, 0, -10.6], rot: 0.7, jitter: 0.3, parent: root });
  model('compost_bags', { pos: [-10.6, PH, -7.6], rot: Math.PI / 2, scale: 0.9, parent: root });     // 平台上一垛原料袋
  model('dustpan', { pos: [-7.6, 0, -8.9], rot: 1.0, parent: root });
  // 警示牌（照片扫描）：叉车通道、小心坠物、易燃、低温
  for (const [n, x, y, z, ry] of [['Sign017', X1 - 0.005, 5.0, -7.5, -Math.PI / 2], ['Sign012', X1 - 0.005, 5.0, -14.0, -Math.PI / 2], ['Sign008', 6.2, 2.0, Z1 + 0.012, 0], ['Sign010', -3.6, 2.4, -24.19, 0], ['Sign017', X0 + 0.005, PH + 4.5, -12.5, Math.PI / 2]]) decal(n, root, { pos: [x, y, z], rot: [0, ry, 0], w: 0.45, h: 0.45, roughness: 0.6 });
  // 地上：叉车漏的油、轮胎碾出来的脏道、拖过的湿痕；铁桶、气瓶底下的锈圈；墙上的漏水
  for (let i = 0; i < 8; i++) decal('decal_20', root, { pos: [-4 + rnd() * 9, 0.007, -2 - rnd() * 20], rot: [-Math.PI / 2, 0, rnd() * 6], w: 0.8 + rnd() * 1.2, h: 0.8 + rnd() * 1.4, color: 0x0e0d0b, opacity: 0.6, roughness: 0.2 });
  decal('SurfaceImperfections017', root, { pos: [-1.3, 0.0065, -12], rot: [-Math.PI / 2, 0, Math.PI / 2], w: 26, h: 4, color: 0x24201a, opacity: 0.55 });
  decal('SurfaceImperfections018', root, { pos: [4.0, 0.0065, -20], rot: [-Math.PI / 2, 0, 0.6], w: 6, h: 5, color: 0x24201a, opacity: 0.5 });
  decal('Smear007', root, { pos: [-1.5, 0.0068, -15.5], rot: [-Math.PI / 2, 0, 1.2], w: 3.0, h: 1.8, color: 0x1e1e1a, opacity: 0.25, roughness: 0.1 });
  for (const [x, z, s] of [[8.5, -23.0, 1.8], [9.6, -25.8, 1.6], [5.0, -24.4, 1.2], [-5.3, -22.0, 1.6]]) decal('Rust001', root, { pos: [x, 0.0072, z], rot: [-Math.PI / 2, 0, x], w: s, h: s, opacity: 0.85 });
  for (const [x, k] of [[-7.5, 'Leaking004'], [-1.0, 'Leaking003'], [5.5, 'Leaking005']]) decal(k, root, { pos: [x, 6.4, Z1 + 0.014], w: 2.6, h: 4.0, color: 0x3a3022, opacity: 0.7 });
  for (const [z, k] of [[-3.5, 'Leaking008'], [-14.5, 'Leaking009'], [-22.0, 'Leaking007']]) decal(k, root, { pos: [X1 - 0.002, 0.8, z], rot: [0, -Math.PI / 2, 0], w: 5, h: 1.6, color: 0x2a2620, opacity: 0.7 });
  userDecal('blood_smear.webp', root, { pos: [-10.2, PH + 0.007, -14.3], rot: [-Math.PI / 2, 0, Math.PI / 2 + 0.2], w: 1.8, h: 0.6, color: 0x7a4a46, roughness: 0.55 });   // 运输笼拖到卸货门的血痕
  userDecal('poster_residue.webp', root, { pos: [-3.4, 2.3, Z0 - 0.005], rot: [0, Math.PI, 0], w: 0.9, h: 0.6, mode: 'cut' });
  userDecal('drips.webp', root, { pos: [3.0, 7.3, Z1 + 0.02], w: 3.2, h: 1.6 });
  decal('Tape001', root, { pos: [9.6, 0.0075, -24.6], rot: [-Math.PI / 2, 0, 0], w: 2.2, h: 0.1, opacity: 0.9, roughness: 0.6 });   // 气瓶笼前地上的黄黑警示胶带

  // ---------------------------------------------------------------- 前墙：通办公室的门（门店办公室后墙那扇铁门的另一面）
  { const OX = -4.8;
    box(1.2, 2.3, 0.12, M.rackDark, OX, 1.15, Z0 - 0.03, root);                    // 门框
    const dm = new THREE.MeshStandardMaterial({ color: 0x5e6a60, roughness: 0.5, metalness: 0.45, map: grimeMap(71) });   // 灰绿色旧铁门（有污渍）
    plane(1.0, 2.15, dm, OX, 1.08, Z0 - 0.095, Math.PI, root);                       // 灰绿色防火门
    box(0.72, 0.04, 0.05, M.steel, OX, 1.0, Z0 - 0.13, root); for (const s of [-1, 1]) box(0.03, 0.05, 0.06, M.steel, OX + s * 0.37, 1.0, Z0 - 0.11, root);   // 推杠
    plane(0.62, 0.22, lit(textTex([['OFFICE  →', 40, '#fff', 0.66, 700]], 360, 128, { bg: '#24427a', age: 0.5 })), OX, 2.5, Z0 - 0.08, Math.PI, root);
    plane(0.34, 0.12, lit(textTex([['STAFF ONLY', 34, '#1a1a1a', 0.66, 700]], 240, 84, { bg: '#e8c832', age: 0.4 })), OX, 1.55, Z0 - 0.1, Math.PI, root);
    decal('Scratches001', root, { pos: [OX, 0.6, Z0 - 0.1], rot: [0, Math.PI, 0], w: 1.0, h: 1.0, color: 0xc8c8c0, opacity: 0.45 });
  }
  // 侧墙：每根红柱顶上往下流的锈水（参考图里墙上一道道竖的锈痕）
  for (let z = Z0 - 3; z > Z1; z -= 6) for (const [x, ry] of [[X0 + 0.004, Math.PI / 2], [X1 - 0.004, -Math.PI / 2]]) {
    decal(rnd() < 0.5 ? 'Leaking010A' : 'Leaking011A', root, { pos: [x, HT - 2.2 - rnd(), z + (rnd() - 0.5) * 1.2], rot: [0, ry, 0], w: 1.4, h: 3.6, color: 0x5a3a22, opacity: 0.75 }); }
  // 灯下的光柱：空气里的灰被照亮（一个开口的圆锥，加法混合，越往下越淡）
  // 灯下的光柱：空气里的灰被照亮。正对视线的部分最亮，边缘按法线和视线的夹角淡出去，越往下越淡（不然看起来是一块硬边的三角形）
  { const cm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color(1.0, 0.9, 0.75) }, uI: { value: 0.05 } },
      vertexShader: 'varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = uv.y; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 uColor; uniform float uI; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vec3 n = vN / max(length(vN), 1e-4); vec3 v = vV / max(length(vV), 1e-4); float edge = pow(clamp(abs(dot(n, v)), 0.0, 1.0), 2.5); float fall = pow(clamp(vY, 0.0, 1.0), 1.6); gl_FragColor = vec4(max(uColor * uI * edge * fall, vec3(0.0)), 1.0); }' });
    for (const [x, z, h, r] of [[-1.5, -21.5, 6.5, 2.0], [-6.5, -9, 6.5, 1.8], [-6.5, -18, 6.5, 1.8], [-1.3, -4, 7.2, 2.4], [-1.3, -15, 7.2, 2.4]]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.18, r, h, 32, 1, true), cm); c.position.set(x, HT - 1.3 - h / 2, z); root.add(c); } }
  // ================================================================ 原来第二排货架的位置：出库暂存区、缠膜机、空托盘垛、上锁的生长因子铁笼
  const slotG = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g); return g; };
  // 地上画框的暂存区（油漆线是掉漆的那种）+ 地上印的字
  for (const [cx, cz, txt] of [[6.0, -2.0, 'STAGING 01 · OUTBOUND'], [6.0, -5.2, 'STAGING 02 · QC HOLD']]) {
    const w = 2.9, d = 2.8;
    line(cx - w / 2, cz, 0.1, d); line(cx + w / 2, cz, 0.1, d); line(cx, cz - d / 2, w, 0.1); line(cx, cz + d / 2, w, 0.1);
    line(cx - w / 2 + 0.3, cz, 2.4, 0.36, new THREE.MeshStandardMaterial({ map: textTex([[txt, 56, 'rgba(214,210,198,.85)', 0.72, 800]], 900, 120, { age: 1.2 }), transparent: true, depthWrite: false, roughness: 0.9 }), -Math.PI / 2);
  }
  { const a = slotG(5.35, -2.0, 0.08); pallet(0, 0, 0, a); kit.stackPallet(a, 0, 0.15, 'pkg', { maxH: 1.1, mixed: 0.6 }); blob(5.35, -2.0, 1.5, 1.3);
    const b = slotG(6.7, -2.15, -0.12); pallet(0, 0, 0, b); loads.wrapped(b, 0, 0.15); blob(6.7, -2.15, 1.5, 1.3);
    const c = slotG(5.4, -5.1, -0.05); pallet(0, 0, 0, c); kit.stackPallet(c, 0, 0.15, 'supply', { maxH: 0.55, mixed: 0.3 }); blob(5.4, -5.1, 1.5, 1.3);
    const d = slotG(6.75, -5.3, 0.2); pallet(0, 0, 0, d); carton(0.2, 0.15, 0.05, 0, 0, 0, 'cooler', 0.3, d, { design: 'eps' }); carton(-0.3, 0.15, -0.15, 0, 0, 0, 'fbs', -0.2, d, { design: 'dryice', open: true }); blob(6.75, -5.3, 1.5, 1.3);
    for (let i = 0; i < 3; i++) { const t = tote(6.25 + i * 0.03, i * 0.33, -6.3, i === 2 ? M.crateGrey : M.crateBlue, root); t.rotation.y = 0.3 + (rnd() - 0.5) * 0.1; } }   // 地上一摞周转箱

  // 缠膜机：花纹钢板转盘、立柱、膜架，转盘上一托货缠到一半，膜还连着
  { const wg = new THREE.Group(); wg.position.set(6.0, 0, -9.4); wg.rotation.y = 0.15; root.add(wg);
    const machine = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.3, map: canvasTexture(256, 256, (g, W, H) => { const r = R(21); g.fillStyle = '#3a5a6e'; g.fillRect(0, 0, W, H); chips(g, W, H, r, 120, () => r() < 0.7 ? 'rgba(150,146,138,.8)' : 'rgba(110,64,30,.8)'); grime(g, W, H, r, 0.5); }) });   // 机身：灰蓝漆，掉漆露铁、生锈
    cyl(0.9, 0.93, 0.09, machine, 0, 0.045, 0, wg, 40);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.02, 40), pbr('DiamondPlate008A', 1.8, 1.8, { size: 0.6, metalness: 0.8, roughness: 0.45, color: 0x9a9a92 })); plate.position.y = 0.1; wg.add(plate);
    const ramp = box(0.9, 0.06, 0.55, machine, 0, 0.04, 1.15, wg); ramp.rotation.x = 0.12;
    box(0.6, 0.12, 0.6, machine, 1.3, 0.06, 0, wg); box(0.26, 2.5, 0.26, machine, 1.3, 1.3, 0, wg);           // 立柱
    box(0.32, 0.42, 0.2, machine, 1.3, 1.15, 0.24, wg);                                                         // 控制箱
    plane(0.28, 0.36, lit(canvasTexture(140, 180, (g, W, H) => { g.fillStyle = '#2a2c2c'; g.fillRect(0, 0, W, H); g.fillStyle = '#e8c832'; g.fillRect(8, 8, W - 16, 26); g.fillStyle = '#111'; g.font = `800 14px ${SANS}`; g.fillText('WRAP-01', 14, 26);
      g.fillStyle = '#c8281e'; g.beginPath(); g.arc(W / 2, 80, 22, 0, 7); g.fill(); g.fillStyle = '#eee'; g.font = `700 10px ${SANS}`; g.fillText('E-STOP', W / 2 - 18, 118);
      [['#3a8a4a', 'START'], ['#888', 'STOP'], ['#2a5a9a', 'TOP']].forEach(([c, t], i) => { g.fillStyle = c; g.beginPath(); g.arc(24 + i * 46, 146, 11, 0, 7); g.fill(); g.fillStyle = '#ddd'; g.fillText(t, 10 + i * 46, 172); }); ageCanvas(g, W, H, { amount: 0.8, seed: 5, drips: false }); }), { roughness: 0.6 }), 1.3, 1.15, 0.345, 0, wg);
    box(0.36, 0.3, 0.34, machine, 1.02, 0.78, 0, wg);                                                          // 膜架
    cyl(0.09, 0.09, 0.5, M.film, 0.8, 0.78, 0, wg, 18); cyl(0.04, 0.04, 0.52, M.rackDark, 0.8, 0.78, 0, wg, 10);
    const pg = new THREE.Group(); pg.position.set(0, 0.11, 0); pg.rotation.y = 0.45; wg.add(pg);
    pallet(0, 0, 0, pg); kit.stackPallet(pg, 0, 0.15, 'brand', { maxH: 0.95, mixed: 0 }); box(1.17, 0.5, 1.0, M.wrap, 0, 0.42, 0, pg);   // 缠了下半截
    plane(0.36, 0.45, M.wrap, 0.62, 0.72, 0.16, 0.65, wg);                                                     // 膜从卷上拉到货上
    blob(6.1, -9.4, 2.6, 2.0); }

  // 空托盘垛：一垛码得还算齐，一垛歪着
  for (let i = 0; i < 9; i++) { const m = pallet(5.1 + (rnd() - 0.5) * 0.06, i * 0.15, -12.6 + (rnd() - 0.5) * 0.06); m.rotation.y = (rnd() - 0.5) * 0.06; }
  for (let i = 0; i < 5; i++) { const m = pallet(6.55 + i * 0.025, i * 0.15, -12.9 + (rnd() - 0.5) * 0.05); m.rotation.y = 0.25 + (rnd() - 0.5) * 0.1; }
  blob(5.1, -12.6, 1.6, 1.4); blob(6.6, -12.9, 1.6, 1.4);

  // 上锁的铁丝网笼：生长因子和 −80 ℃ 超低温冰箱（贵、要锁起来）
  { const cg = new THREE.Group(); cg.position.set(6.0, 0, -15.9); root.add(cg);
    const CW = 2.8, CD = 2.2, CHh = 2.4;
    const meshT = canvasTexture(128, 128, (g, W, H) => { g.clearRect(0, 0, W, H); g.strokeStyle = '#c4c6be'; g.lineWidth = 5; for (let i = 0; i <= W; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, H); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(W, i); g.stroke(); } });   // 50 mm 方格焊接网
    const meshM = (w, h) => { const t = meshT.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 0.2, h / 0.2); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, metalness: 0.7, roughness: 0.45, side: THREE.DoubleSide }); };
    const panel = (w, h, x, z, ry, par = cg) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), meshM(w, h)); m.position.set(x, 0.17 + h / 2, z); m.rotation.y = ry; par.add(m); };
    const ph = CHh - 0.2;
    panel(CW, ph, 0, -CD / 2, 0); panel(CD, ph, -CW / 2, 0, Math.PI / 2); panel(CD, ph, CW / 2, 0, Math.PI / 2); panel(CW - 1.0, ph, -0.5, CD / 2, 0);   // 后、左、右、前（右前是门）
    for (const [x, z] of [[-CW / 2, -CD / 2], [CW / 2, -CD / 2], [-CW / 2, CD / 2], [CW / 2, CD / 2], [CW / 2 - 1.0, CD / 2]]) box(0.05, CHh, 0.05, M.galv, x, CHh / 2, z, cg);
    for (const [w, x, z, ry] of [[CW, 0, -CD / 2, 0], [CW, 0, CD / 2, 0], [CD, -CW / 2, 0, Math.PI / 2], [CD, CW / 2, 0, Math.PI / 2]]) { const t = box(w, 0.04, 0.04, M.galv, x, CHh - 0.02, z, cg); t.rotation.y = ry; const k = box(w, 0.15, 0.02, M.galv, x, 0.09, z, cg); k.rotation.y = ry; }
    const door = new THREE.Group(); door.position.set(CW / 2, 0, CD / 2); door.rotation.y = -0.35; cg.add(door);   // 门开着一条缝
    panel(0.98, ph, -0.49, 0, 0, door); box(0.04, CHh - 0.1, 0.04, M.galv, -0.98, (CHh - 0.1) / 2, 0, door);
    plane(0.5, 0.3, lit(textTex([['GROWTH FACTORS', 44, '#1a1a18', 0.32, 800], ['−80 ℃ · LOCKED', 34, '#9a2422', 0.62, 800], ['KEY AT OFFICE', 28, '#1a1a18', 0.88, 600]], 400, 240, { bg: '#e8c832', age: 1 })), -0.5, 1.5, 0.02, 0, door);
    box(0.06, 0.08, 0.03, M.steel, -0.94, 1.05, 0.03, door); const lock = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 6, 12, Math.PI), M.steel); lock.position.set(-0.94, 1.1, 0.05); door.add(lock);
    // −80 ℃ 超低温冰箱：发黄的白色烤漆、门把手、温度屏、底下一圈锈
    const ult = new THREE.MeshStandardMaterial({ roughness: 0.45, map: canvasTexture(256, 512, (g, W, H) => { const r = R(31); g.fillStyle = '#e2e0d6'; g.fillRect(0, 0, W, H); for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(120,100,60,${r() * 0.08})`; g.fillRect(r() * W, r() * H, 10 + r() * 60, 2 + r() * 20); }
      g.fillStyle = 'rgba(110,64,30,.5)'; for (let i = 0; i < 40; i++) g.fillRect(r() * W, H - 8 - r() * 30, 2 + r() * 6, 2 + r() * 10); grime(g, W, H, r, 0.3);
      g.fillStyle = '#2a2c2c'; g.fillRect(60, 40, 136, 50); g.fillStyle = '#5ae0a0'; g.font = `700 30px monospace`; g.fillText('-80.4', 78, 76); g.fillStyle = '#1a3a6a'; g.font = `800 20px ${SANS}`; g.fillText('ULT FREEZER', 64, 130); g.font = `600 14px ${SANS}`; g.fillText('B-0417 · P-0932 · FGF2 · TGF-β', 40, 152); }) });
    const f = box(0.78, 1.95, 0.82, ult, 0.75, 0.975 + 0.02, -0.55, cg); box(0.04, 0.5, 0.05, M.steel, 0.4, 1.1, -0.12, cg);
    // 铁丝货架：几盒小箱子、一只泡沫箱
    for (const [x, z] of [[-1.25, -0.88], [-0.15, -0.88], [-1.25, -0.42], [-0.15, -0.42]]) box(0.03, 1.8, 0.03, M.steel, x, 0.9, z, cg);
    for (const y of [0.15, 0.75, 1.35]) { box(1.14, 0.02, 0.48, M.steel, -0.7, y, -0.65, cg); }
    kit.add(cg, -1.0, 0.16, -0.66, { design: 'tips', ry: 0.05 }); kit.add(cg, -0.42, 0.16, -0.64, { design: 'thermal', ry: -0.1 });
    kit.add(cg, -0.95, 0.76, -0.66, { design: 'dryice', ry: 0.1, size: [0.36, 0.3, 0.36] }); kit.add(cg, -0.4, 0.76, -0.66, { design: 'media', ry: -0.06, size: [0.4, 0.26, 0.32] });
    kit.add(cg, -0.75, 1.36, -0.66, { design: 'glove', ry: 0.2 });
    kit.add(cg, 0.2, 0, 0.55, { design: 'eps', ry: 0.4 });
    blob(6.0, -15.9, 3.2, 2.6); }

  // ================================================================ 地面细节：补过的水泥块、裂缝、叉车轮胎印、月台根下的排水沟、通道上掉的东西
  const floorDecal = (tex, x, z, w, d, ry = 0, op = 1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity: op, depthWrite: false, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -1 })); m.rotation.set(-Math.PI / 2, 0, ry); m.position.set(x, 0.0055, z); root.add(m); return m; };
  const patchTex = (seed, light) => canvasTexture(256, 256, (g, W, H) => { const r = R(seed); g.clearRect(0, 0, W, H); const b = light ? [150, 146, 136] : [96, 92, 84];
    g.fillStyle = `rgba(${b},.4)`; g.fillRect(8, 8, W - 16, H - 16); for (let i = 0; i < 1500; i++) { const v = (r() - 0.5) * 40; g.fillStyle = `rgba(${b[0] + v | 0},${b[1] + v | 0},${b[2] + v | 0},.5)`; g.fillRect(8 + r() * (W - 16), 8 + r() * (H - 16), 2, 2); }
    g.strokeStyle = 'rgba(30,26,20,.75)'; g.lineWidth = 4; g.strokeRect(8, 8, W - 16, H - 16); });   // 切割缝 + 颜色不一样的新水泥
  for (const [x, z, w, d, sd, l] of [[-1.2, -5.6, 2.2, 1.4, 41, true], [-3.2, -12.8, 1.6, 1.6, 42, false], [0.4, -18.4, 2.6, 1.2, 43, true], [8.6, -6.2, 1.4, 2.0, 44, false], [-5.6, -20.6, 1.8, 1.2, 45, true]]) floorDecal(patchTex(sd, l), x, z, w, d, 0, 0.6);
  const crackTex = (seed) => canvasTexture(256, 256, (g, W, H) => { const r = R(seed); g.clearRect(0, 0, W, H); g.strokeStyle = 'rgba(20,18,14,.85)'; g.lineCap = 'round';
    const walk = (x, y, a, n, wdt) => { g.lineWidth = wdt; g.beginPath(); g.moveTo(x, y); for (let i = 0; i < n; i++) { a += (r() - 0.5) * 0.9; x += Math.cos(a) * 6; y += Math.sin(a) * 6; g.lineTo(x, y); if (r() < 0.06 && wdt > 1) { g.stroke(); walk(x, y, a + (r() - 0.5) * 2, n / 3, wdt * 0.6); g.beginPath(); g.moveTo(x, y); } } g.stroke(); };
    walk(10, H / 2 + (r() - 0.5) * 60, 0, 40, 2.4); });
  for (let i = 0; i < 9; i++) floorDecal(crackTex(50 + i), -6 + rnd() * 16, 2 - rnd() * 24, 1.6 + rnd() * 1.4, 1.2, rnd() * 6, 0.85);
  const tyreTex = canvasTexture(512, 128, (g, W, H) => { const r = R(60); g.clearRect(0, 0, W, H); for (const off of [36, 92]) { g.strokeStyle = 'rgba(14,12,10,.32)'; g.lineWidth = 14; g.beginPath(); g.moveTo(0, off); g.bezierCurveTo(W * 0.35, off - 10, W * 0.65, off + 18, W, off + 4); g.stroke(); }
    g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.8})`; g.fillRect(r() * W, r() * H, 4 + r() * 20, 2 + r() * 6); } });   // 两道轮胎印，断断续续
  for (const [x, z, ry] of [[-0.4, -6.4, 1.2], [-1.6, -10.6, 1.9], [0.6, -12.0, 1.5], [-2.2, -3.0, 1.35], [3.8, -8.6, 0.2]]) floorDecal(tyreTex, x, z, 3.4, 0.85, ry, 0.9);
  // 排水沟：月台根下一条，暗槽 + 镀锌格栅（台阶、档案柜那里断开）
  { const grT = canvasTexture(64, 64, (g, W, H) => { g.clearRect(0, 0, W, H); g.fillStyle = '#a8aaa2'; for (let y = 0; y < H; y += 8) g.fillRect(0, y, W, 4); g.fillRect(0, 0, 5, H); g.fillRect(W - 5, 0, 5, H); for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(90,60,30,${Math.random() * 0.4})`; g.fillRect(Math.random() * W, Math.random() * H, 3, 2); } });
    const dark = new THREE.MeshStandardMaterial({ color: 0x0c0b0a, roughness: 0.4 });
    for (const [z0, z1] of [[1.8, -3.45], [-4.95, -12.45], [-13.65, -25.8]]) { const L = z0 - z1, zc = (z0 + z1) / 2;
      const ch = new THREE.Mesh(new THREE.PlaneGeometry(0.2, L), dark); ch.rotation.x = -Math.PI / 2; ch.position.set(PX + 0.11, 0.003, zc); root.add(ch);
      const t = grT.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, L / 0.2); t.needsUpdate = true;
      const gr = new THREE.Mesh(new THREE.PlaneGeometry(0.2, L), new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, metalness: 0.75, roughness: 0.4 })); gr.rotation.x = -Math.PI / 2; gr.position.set(PX + 0.11, 0.007, zc); root.add(gr);
      for (const dx of [0.005, 0.215]) box(0.012, 0.012, L, M.steel, PX + dx, 0.006, zc, root); } }
  // 通道上掉的：揉成团的拉伸膜、撕下来的标签纸、一截断了的托盘板
  for (const [x, z] of [[1.2, -6.8], [-2.9, -14.4], [3.9, -4.2], [0.3, -16.2]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), M.wrap); b.scale.set(1.4, 0.45, 1.1); b.position.set(x, 0.05, z); b.rotation.y = rnd() * 3; root.add(b); }
  for (const [x, z, r] of [[1.0, -9.9, 0.4], [-0.9, -4.6, 2.1], [4.2, -11.2, 1.0]]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.15), new THREE.MeshStandardMaterial({ color: 0xece8dc, roughness: 0.9 })); l.rotation.set(-Math.PI / 2, 0, r); l.position.set(x, 0.006, z); root.add(l); }
  { const bd = box(1.0, 0.022, 0.14, M.pallet, 1.4, 0.011, -13.3, root); bd.rotation.y = 0.5; const bd2 = box(0.45, 0.022, 0.14, M.pallet, 1.95, 0.011, -13.7, root); bd2.rotation.y = 0.8; }
  scene.add(new THREE.HemisphereLight(0xb8b0a0, 0x2a2620, 0.8));                  // 参考图整体更亮：天光补一点（不花显卡）
  // 主通道上方两盏暖一点的投光灯
  for (const z of [-4, -15]) { const s = new THREE.SpotLight(0xffe4b8, 30, 14, 0.6, 0.7, 1.4); s.position.set(-1.3, HT - 1.2, z); s.target.position.set(-1.3, 0, z - 1); root.add(s, s.target); }

  kit.flush();                                                                     // 所有纸箱按父节点合并成一个个网格
  function tick(t) {
    for (const s of mist) {                                                // 液氮罐口飘出来的冷雾
      const p = (t * 0.12 + s.userData.ph) % 1;
      s.position.set(-4.4 + Math.sin(p * 5) * 0.2, 1.75 + p * 0.8, -23.3 + p * 0.3);
      s.scale.setScalar(0.3 + p * 1.0);
      s.material.opacity = 0.3 * (1 - p) * Math.min(1, p * 5);
    }
    warnL.intensity = 2 * (0.5 + 0.5 * Math.sign(Math.sin(t * 3)));        // 警示灯一闪一闪
  }
  return { scene, tick };
}
