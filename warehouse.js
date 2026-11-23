// 仓库：门店后面租下的一整间旧厂房（参考物流仓库：高货架、宽通道、地面标线、叉车）。
// 24 m 宽、34 m 深、9 m 高。从门店的后门进来，正对着主通道：
//   右边     三排重型货架：无菌耗材、包装、消毒液、一次性培养袋、大豆蛋白、硅胶管
//   左边     沿墙一条 1.1 m 高的卸货平台，两扇卷帘门通后街；平台上是空的动物运输笼
//   左前     −20 ℃ 冷柜和刚到的胎牛血清（干冰运输箱）
//   最里面   冷库（细胞库，液氮），门口几只液氮罐
//   右后角   04 冷藏货架（猪肉按口感分三层）、05 自动出库（滚筒线、机械臂、扫码门、托盘车）、06 档案区（登记册、图谱、退货桶）
import * as THREE from 'three';
import { canvasTexture } from './textures.js';
import { createCartonKit } from './cartons.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { deferImages } from './gfx.js';
import { lightCone, glowColumn, hazeLayer } from './atmosphere.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { pbr, model, decal, userDecal, paintedText } from './assets.js';
import { ageCanvas, blobShadow, puddleDecal } from './materials.js';

const SANS = '"Inter", "Noto Sans SC", "Microsoft YaHei", sans-serif';
const MONO = '"IBM Plex Mono", Consolas, monospace';

// ---- 贴图按“米”铺：真实照片扫描的材质（掉漆、锈、橡胶、塑料）按物体的真实尺寸重算 UV，长杆不会把划痕拉成长条，
//      每个物体再随机错开一段，同一张图不会在相邻的东西上重复出现
let uvS = 7; const uvOff = () => (uvS = (uvS * 16807) % 2147483647) / 2147483647 * 9;
function uvMeters(geo, size) { const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv, ou = uvOff(), ov = uvOff(), fl = uvOff() > 4.5 ? -1 : 1;   // fl：一半的物体左右镜像，同一张扫描图在相邻的东西上看起来不一样
  for (let i = 0; i < P.count; i++) { const ax = Math.abs(N.getX(i)), ay = Math.abs(N.getY(i)), az = Math.abs(N.getZ(i));
    const u = ax >= ay && ax >= az ? P.getZ(i) : P.getX(i), v = ay > ax && ay >= az ? P.getZ(i) : P.getY(i); U.setXY(i, fl * u / size + ou, v / size + ov); }
  U.needsUpdate = true; return geo; }
function uvTube(geo, r, h, size) { const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv, ou = uvOff(), ov = uvOff();   // 圆柱：绕一圈 × 沿长度
  for (let i = 0; i < P.count; i++) { if (Math.abs(N.getY(i)) > 0.9) U.setXY(i, P.getX(i) / size + ou, P.getZ(i) / size + ov); else U.setXY(i, U.getX(i) * 2 * Math.PI * r / size + ou, U.getY(i) * h / size + ov); }
  U.needsUpdate = true; return geo; }
const fit = (g, m) => (m.userData.meters ? uvMeters(g, m.userData.meters) : g);
function box(w, h, d, m, x, y, z, p) { const o = new THREE.Mesh(fit(new THREE.BoxGeometry(w, h, d), m), m); o.position.set(x, y, z); p.add(o); return o; }
function rbox(w, h, d, r, m, x, y, z, p) { const o = new THREE.Mesh(fit(new RoundedBoxGeometry(w, h, d, 2, r), m), m); o.position.set(x, y, z); p.add(o); return o; }   // 倒了圆角的钣金件
function cyl(rt, rb, h, m, x, y, z, p, seg = 20) { const g = new THREE.CylinderGeometry(rt, rb, h, seg); if (m.userData.meters) uvTube(g, (rt + rb) / 2, h, m.userData.meters); const o = new THREE.Mesh(g, m); o.position.set(x, y, z); p.add(o); return o; }
function plane(w, h, mat, x, y, z, ry, p) { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); o.position.set(x, y, z); o.rotation.y = ry; p.add(o); return o; }
// 真实 PBR 材质（ambientCG / Poly Haven 照片扫描），size = 这张图在现实里覆盖多少米；metal 图标出掉漆露出钢板的地方
// clean：这种漆新的时候的颜色。给了 clean 的材质会按世界坐标分块“有的地方旧、有的地方新”——遮罩用真实扫描的瑕疵图（SurfaceImperfections015，
//   2.6 m 一块），新的那块是干净的漆面（不露钢、不发亮），旧的那块才是扫描图里的划痕和锈；每种材质的旧新比例也不一样
let ageTex = null; let ageN = 0;
const real = (name, size, { clean, age = 0, ...o } = {}) => { const m = pbr(name, 1, 1, { size: 1, ...o }); m.userData.meters = size;
  if (clean !== undefined) {
    if (!ageTex) { ageTex = new THREE.TextureLoader().load('assets/ph/decal/SurfaceImperfections015/opacity.jpg'); ageTex.wrapS = ageTex.wrapT = THREE.RepeatWrapping; ageTex.colorSpace = THREE.NoColorSpace; }
    const uClean = { value: new THREE.Color(clean) }, uBias = { value: age + ((ageN++ * 0.618) % 1 - 0.5) * 0.18 }, uAge = { value: ageTex };
    m.onBeforeCompile = (sh) => { sh.uniforms.uClean = uClean; sh.uniforms.uAgeBias = uBias; sh.uniforms.uAge = uAge;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;').replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN; uniform vec3 uClean; uniform float uAgeBias; uniform sampler2D uAge; float wAge;')
        .replace('#include <map_fragment>', `#include <map_fragment>
          vec3 an = abs(normalize(vWN));
          float mA = texture2D(uAge, vWP.xz * 0.38).r * an.y + texture2D(uAge, vec2(vWP.x + vWP.z, vWP.y) * 0.38 + 0.31).r * (1.0 - an.y);
          float mB = texture2D(uAge, vec2(vWP.x - vWP.z, vWP.y) * 1.3 + 0.57).r;
          wAge = smoothstep(0.3, 0.62, mA * 0.8 + mB * 0.25 + uAgeBias);
          diffuseColor.rgb = mix(diffuse * uClean * (0.9 + 0.18 * mB), diffuseColor.rgb, wAge);`)
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor *= wAge;')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.5, roughnessFactor, wAge);')
        .replace('#include <normal_fragment_maps>', THREE.ShaderChunk.normal_fragment_maps.replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * mix(0.2, 1.0, wAge);'))   // 新漆的地方：锈斑的凹凸和阴影也一起去掉
        .replace('#include <aomap_fragment>', THREE.ShaderChunk.aomap_fragment.replace('float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;', 'float ambientOcclusion = mix(1.0, ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0, wAge);')); };
    m.customProgramCacheKey = () => 'wh-aged-paint'; }
  return m; };
// 印刷品（标签、牌子）：字是画的，但纸 / 铁皮本身的凹凸和粗糙度用真实扫描图
let signNor = null, signRough = null;
const lit = (map, o = {}) => { if (!signNor) { const s = pbr('PaintedMetal012', 1, 1); signNor = s.normalMap; signRough = s.roughnessMap; }
  const m = new THREE.MeshStandardMaterial({ map, roughness: 0.85, normalMap: signNor, roughnessMap: signRough, ...o }); m.normalScale.set(0.35, 0.35); return m; };
// 一组零件按材质合并成几个网格（少几百次 draw call，电脑不卡）
function mergeGroup(g) { g.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), by = new Map(), drop = [];
  g.traverse((o) => { if (!o.isMesh || o.userData.keep) return; const geo = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    if (Array.isArray(o.material)) return; const key = o.material.uuid + '|' + Object.keys(geo.attributes).sort().join(',');
    if (!by.has(key)) by.set(key, { m: o.material, gs: [], os: [] }); const e = by.get(key); e.gs.push(geo); e.os.push(o); });
  for (const { m, gs, os } of by.values()) { if (gs.length < 2) continue; const anyNI = gs.some((x) => !x.index); const merged = mergeGeometries(anyNI ? gs.map((x) => (x.index ? x.toNonIndexed() : x)) : gs);
    if (!merged) continue; for (const o of os) o.parent.remove(o); g.add(new THREE.Mesh(merged, m)); }
  return g; }

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
  if (o.age && o.bg) ageCanvas(g, W, H, { amount: o.age, seed: w + h, drips: false });
  else if (o.age) { let n = w + h; const r = () => (n = (n * 16807) % 2147483647) / 2147483647; g.globalCompositeOperation = 'destination-out';   // 透明底的字（地上的字、门上刷的号）：不上色，只把油漆磨掉一些
    for (let i = 0; i < 200 * o.age; i++) { g.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.7})`; g.beginPath(); g.ellipse(r() * W, r() * H, 1 + r() * 6, 1 + r() * 3, r() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(r() * W, 0, 10 + r() * 30, H); } g.globalCompositeOperation = 'source-over'; }
});
// 月台边沿的黄黑斜纹：整条边一张图（30 m 不重复）。不是一次刷好的——一段段补刷过：黄有新有旧、斜纹方向和间距对不上、
//   接缝处错位；托盘和推车磕的地方一簇簇掉漆露出锈和钢，锈水往下淌；底边被轮子蹭黑，中间有一块焊补的钢板只刷了红底漆
function dockEdgeTex(len, seed = 17) {
  let n = seed; const R = () => (n = (n * 16807) % 2147483647) / 2147483647, rr = (a, b) => a + R() * (b - a);
  const W = 8192, H = 64, ppm = W / len, ppv = H / 0.22;                  // 横向每米像素、竖向每米像素
  return canvasTexture(W, H, (g) => {
    let x = 0;
    while (x < W) {                                                        // 一段一段刷
      const w = rr(1.4, 4.8) * ppm, kind = R();
      const yel = kind < 0.25 ? '#dcae24' : kind < 0.6 ? '#c09c3e' : kind < 0.85 ? '#a88e46' : '#b8a060';
      const blk = R() < 0.7 ? '#1d1c19' : '#34312b', pitch = rr(0.18, 0.23) * ppm, dir = R() < 0.8 ? 1 : -1, ph = R() * pitch, slant = 0.22 * ppm * dir;
      g.save(); g.beginPath(); g.rect(x, 0, w, H); g.clip();
      g.fillStyle = yel; g.fillRect(x, 0, w, H);
      if (R() < 0.12) { g.fillStyle = '#6e3a28'; g.fillRect(x, 0, w, H); }       // 焊补过的一块：只有红底漆
      else {
        g.fillStyle = blk;
        for (let s0 = x - pitch * 3 + ph; s0 < x + w + pitch * 2; s0 += pitch) { g.beginPath(); g.moveTo(s0, H); g.lineTo(s0 + pitch / 2, H); g.lineTo(s0 + pitch / 2 + slant, 0); g.lineTo(s0 + slant, 0); g.fill(); }
      }
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.7, `rgba(20,16,10,${rr(0.05, 0.2)})`); gr.addColorStop(1, `rgba(20,16,10,${rr(0.35, 0.6)})`);
      g.fillStyle = gr; g.fillRect(x, 0, w, H);                            // 底边被轮子、拖把蹭黑
      g.restore();
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + w - 1, 0, 1.5, H);  // 两次刷漆的接缝
      x += w;
    }
    const chip = (cx, cy, s) => { g.beginPath(); const k = 5 + Math.floor(R() * 4); for (let i = 0; i < k; i++) { const a = (i / k) * Math.PI * 2, q = s * rr(0.5, 1.2); g.lineTo(cx + Math.cos(a) * q * 1.6, cy + Math.sin(a) * q); } g.closePath(); g.fill(); };
    for (let k = 0; k < 6; k++) {                                          // 几段被叉车货叉、托盘反复刮过：漆几乎磨光，露出锈和钢
      const cx = R() * W, w = rr(0.4, 1.8) * ppm;
      for (let i = 0; i < w * 6; i++) { const t = (R() - 0.5), px = cx + t * w, py = Math.pow(R(), 1.4) * H; if (R() > 1 - Math.abs(t) * 1.6) continue; g.fillStyle = R() < 0.7 ? `rgba(${76 + R() * 30},${44 + R() * 16},${22 + R() * 10},${rr(0.5, 0.9)})` : `rgba(${88 + R() * 26},${84 + R() * 24},${76 + R() * 20},${rr(0.4, 0.8)})`; g.fillRect(px, py, rr(1, 6), rr(1, 4)); }
    }
    for (let k = 0; k < 64; k++) {                                         // 磕过的地方：一簇簇掉漆，多在上沿；有的地方一簇很密，有的就零星几点
      const cx = R() * W, spread = rr(0.05, 0.5) * ppm, cnt = 4 + Math.floor(Math.pow(R(), 2) * 70), top = R() < 0.65;
      for (let i = 0; i < cnt; i++) {
        const px = cx + (R() - 0.5) * spread, py = top ? Math.pow(R(), 2.2) * H * 0.7 : R() * H, sz = rr(0.8, 4.5) * (R() < 0.1 ? 2.6 : 1);
        g.fillStyle = R() < 0.6 ? `rgb(${74 + R() * 30},${42 + R() * 14},${22 + R() * 10})` : `rgb(${78 + R() * 24},${76 + R() * 22},${70 + R() * 20})`;
        chip(px, py, sz);
        if (R() < 0.25) { const len2 = rr(6, 40); const gg = g.createLinearGradient(0, py, 0, py + len2); gg.addColorStop(0, 'rgba(110,58,22,.45)'); gg.addColorStop(1, 'rgba(110,58,22,0)'); g.fillStyle = gg; g.fillRect(px - 0.8, py, rr(1, 2.5), len2); }   // 锈水往下淌
      }
    }
    for (let k = 0; k < 70; k++) { const cx = R() * W, cy = rr(0.2, 1) * H, rad = rr(0.15, 0.9) * ppm, gg = g.createRadialGradient(cx, cy, 0, cx, cy, rad); gg.addColorStop(0, `rgba(${R() < 0.5 ? '150,130,90' : '60,48,30'},${rr(0.12, 0.35)})`); gg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gg; g.fillRect(cx - rad, 0, rad * 2, H); }   // 积灰、油污，一片片的
    for (let k = 0; k < 220; k++) { const y = R() * H, x0 = R() * W, l = rr(0.05, 0.9) * ppm; g.strokeStyle = R() < 0.5 ? 'rgba(255,240,200,.14)' : 'rgba(10,8,6,.25)'; g.lineWidth = rr(0.4, 1.4); g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + l, y + rr(-3, 3)); g.stroke(); }   // 横着的刮痕
    for (let k = 0; k < 30; k++) { g.fillStyle = `rgba(14,12,10,${rr(0.15, 0.4)})`; g.fillRect(R() * W, H * rr(0.55, 0.85), rr(0.1, 0.8) * ppm, rr(2, 6)); }   // 轮胎蹭上去的黑道
  });
}
// 黄黑斜纹
const hazardTex = (rep = 4) => { const t = canvasTexture(256, 64, (g, W, H) => { g.fillStyle = '#c8a028'; g.fillRect(0, 0, W, H); g.fillStyle = '#1a1a18'; for (let x = -H; x < W + H; x += 48) { g.beginPath(); g.moveTo(x, H); g.lineTo(x + 24, H); g.lineTo(x + 24 + H, 0); g.lineTo(x + H, 0); g.fill(); } ageCanvas(g, W, H, { amount: 1.4, seed: 5, drips: false }); }); t.wrapS = THREE.RepeatWrapping; t.repeat.set(rep, 1); return t; };

export function createWarehouse(env) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14120f);
  scene.fog = new THREE.FogExp2(0x14302e, 0.026);                         // 冷青的尘雾：远处沉下去，暖灯才跳出来
  scene.environment = env;
  scene.environmentIntensity = 0.3;
  const root = new THREE.Group(); scene.add(root);
  let rs = 9; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;

  // ---- 材质：全部用真实照片扫描的 PBR 贴图（ambientCG / Poly Haven，CC0），按米铺；颜色参数只是在原图上压一点色调。
  //      掉漆、划痕、锈都是扫描图里本来就有的，metal 图让露出来的钢板真的反光，不再是画上去的小圆点
  const M = {
    rackRed: real('rusty_painted_metal', 1.6, { roughness: 1, metalness: 0.3, color: 0xe8885a, clean: 0x9a4a32 }),   // 红色壁柱：竖着往下流的锈
    rackDark: real('PaintedMetal012', 1.4, { metalness: 1, color: 0x3a3c40, clean: 0xdcdcd8, age: 0.05 }),        // 深灰漆钢（桁架、门框、卷轴箱）：漆面磨花、边角起锈
    pallet: real('rough_wood', 0.8, { roughness: 1, rotate: Math.PI / 2, color: 0xf0e2c8 }),   // 旧托盘：风化发灰的松木（真实扫描），木纹顺着板子
    carton: pbr('Cardboard001', 1, 1, { size: 0.9, roughness: 0.95, color: 0xb8a890 }),   // 瓦楞纸
    tape: new THREE.MeshStandardMaterial({ color: 0xa89a74, roughness: 0.5 }),
    crateBlue: 'plastic_crate_02', crateGrey: 'plastic_crate_03',                     // 周转箱：直接用扫描的塑料箱模型
    case: real('Plastic006', 0.5, { roughness: 1, color: 0xa0a0a0 }),                 // 黑色 ABS 航空箱
    alu: real('Metal009', 0.4, { metalness: 1, roughness: 0.8, color: 0xd8d8d4 }),    // 航空箱的包角铝条
    latch: real('Metal009', 0.2, { metalness: 1, roughness: 0.6, color: 0xc8c8c0 }),
    steel: real('Metal009', 0.8, { metalness: 1, roughness: 0.85, color: 0xb8bab4 }), // 拉丝不锈钢
    galv: real('Metal009', 1.4, { metalness: 1, roughness: 1, color: 0xc4c6c0 }),      // 镀锌铁：发灰、哑光
    co2: real('PaintedMetal006', 0.6, { metalness: 1, color: 0x7a9a8a, clean: 0x2e8a66 }),            // 绿漆气瓶：掉漆起锈
    fork: real('PaintedMetal004', 0.5, { metalness: 1, color: 0xc86858, clean: 0xc2301e }),           // 手动搬运车：红漆磨花
    tyre: real('Rubber004', 0.25, { roughness: 1 }),                                   // 橡胶轮、电缆、把手套
    tarp: real('canvas_fabric', 0.8, { color: 0x50545a, side: THREE.DoubleSide }),
    tarpBlue: real('canvas_fabric', 0.8, { color: 0x3a5a78, side: THREE.DoubleSide }),
    strip: new THREE.MeshPhysicalMaterial({ color: 0xa8b090, roughness: 0.3, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }),
    tube: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.5, 2.2) }),
    deadTube: new THREE.MeshStandardMaterial({ color: 0x5a5a54, roughness: 0.4 }),
    yellow: real('PaintedMetal016', 0.6, { metalness: 1, color: 0xe8dcc0 }),         // 黄黑斜纹的防撞护角、防撞柱
    railY: real('PaintedMetal001', 0.9, { metalness: 1, color: 0xf2e0b4, clean: 0xe8b032 }),          // 栏杆：安全黄漆，被鞋和货蹭出一道道划痕、露出钢
    oxide: real('PaintedMetal004', 0.7, { metalness: 1, color: 0x7a4e48, clean: 0xb8402e }),          // 楼梯斜梁、踢板：铁红防锈漆（暗红、发灰）
    orange: real('PaintedMetal008', 0.7, { metalness: 1, clean: 0xe8661a, age: -0.05 }),                          // 货架：橙漆，一块块锈
    blue: real('PaintedMetal002', 0.8, { metalness: 1, color: 0xa4b4d4, clean: 0x2848a8 }),           // 缠膜机、平板车：蓝漆磨花
    white: real('Metal051A', 1.2, { metalness: 0.6, roughness: 1, color: 0xe4e4dc, normalScale: 0.35 }),   // 白色烤漆钢板（冷库保温板、超低温冰箱）：真实扫描的烤漆面，脏和水痕用贴花
    grey: real('PaintedMetal012', 1.2, { metalness: 1, color: 0x8a908c, clean: 0xe6e6e0 }),           // 灰漆钣金（充电机、桌子、柜子）
    warn: new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.4, 0.2) }),
    concrete: pbr('concrete_wall_008', 8, 1, { size: 1.0, roughness: 0.95, color: 0xb4b0a6 }),
    drumBlue: real('Plastic010', 0.6, { roughness: 1, color: 0x3c66aa }),            // 吹塑 HDPE 桶
    pail: real('Plastic010', 0.4, { roughness: 1, color: 0xeae6dc }),                // 白色塑料提桶
    panel: real('PaintedMetal012', 1.4, { metalness: 1, color: 0xbcc0ba, clean: 0xe8e8e2 }),          // 冷凝机组、配电箱
  };
  // ---- 塑料膜（拉伸膜、塑料袋、真空袋）：照着真东西做——
  //   · 正对着看几乎透明，越斜着看越白、越反光（菲涅尔：透明度跟着视线和表面的夹角走），所以膜包住的箱子边缘一圈发白发亮；
  //   · 很光（清漆层、粗糙度很低），环境里的灯在膜上拉出一条条高光；皱褶用真实扫描的揉皱锡箔法线图（ambientCG Foil003）；
  //   · 拉伸膜是 500 mm 宽的膜一圈圈螺旋缠上去、上下压一半：所以一条条横带一层厚一层薄（每 0.27 m 换一次），每条膜边卷成一道细细的、更白的棱。
  const foilN = pbr('Foil003', 1, 1).normalMap;
  const filmMat = ({ tint = 0xe6eef1, base = 0.05, edge = 0.6, bands = false, ns = 0.35, map = null, mapA = 0, meters = 0.45, side = THREE.DoubleSide } = {}) => {
    const m = new THREE.MeshPhysicalMaterial({ color: tint, map, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.7, normalMap: foilN, transparent: true, depthWrite: false, side });
    m.normalScale.set(ns, ns); m.userData.meters = meters;
    const U = { uBase: { value: base }, uEdge: { value: edge }, uBands: { value: bands ? 1 : 0 }, uMapA: { value: mapA } };
    m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
varying vec3 vFW;`).replace('#include <project_vertex>', `#include <project_vertex>
        #ifdef USE_INSTANCING
          vFW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        #else
          vFW = (modelMatrix * vec4(transformed, 1.0)).xyz;
        #endif`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vFW; uniform float uBase; uniform float uEdge; uniform float uBands; uniform float uMapA;`)
        .replace('#include <opaque_fragment>', `
          float fr = pow(1.0 - abs(dot(normalize(geometryNormal), normalize(geometryViewDir))), 2.6);
          float yb = vFW.y + 0.02 * sin(vFW.x * 3.1 + vFW.z * 2.3);
          float ph = fract(yb / 0.27), lay = step(0.5, fract(yb / 0.54));
          float ridge = (smoothstep(0.0, 0.012, ph) - smoothstep(0.02, 0.05, ph)) * uBands;
          float a = uBase + uEdge * fr + uBands * (0.05 * lay + 0.22 * ridge) + diffuseColor.a * uMapA;
          outgoingLight += vec3(0.55, 0.6, 0.65) * (0.12 * fr + 0.3 * ridge);
          diffuseColor.a = clamp(a, 0.0, 0.95);
          #include <opaque_fragment>`); };
    m.customProgramCacheKey = () => 'wh-film'; return m; };
  M.wrap = filmMat({ bands: true, base: 0.05, edge: 0.55, ns: 0.22 });                    // 拉伸膜
  const R = (seed) => { let n = seed * 7919 + 13; return () => (n = (n * 16807) % 2147483647) / 2147483647; };
  const kit = createCartonKit({ normalMap: M.carton.normalMap });
  // ---- 仓库道具包（Blender 做的 8 个 GLB，地面为原点、单位米、正面朝 +z）。贴图事先压到 512（带字的到 1024）并按内容哈希命名，
  //      这里跨文件共用同一张贴图——同一张旧钢板、旧木头不会重复上传显存（three-best-practices：material-reuse / 显存）
  const loader = deferImages(new GLTFLoader()).setDRACOLoader(new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/libs/draco/gltf/')), texCache = new Map();   // 04–06 三个区是 Draco 压缩的
  const waiting = [];                                                      // 第一次走进仓库才下载这些模型
  const gltf = { load: (url, ok, progress, fail) => waiting.push(() => new Promise((res) => {
    loader.load(url, (g) => { try { ok(g); } finally { res(); } }, progress, (e) => { fail?.(e); res(); });
  })) };
  let pending = null;
  const load = () => pending ??= Promise.all(waiting.map((f) => f()));
  const shareTex = (mat) => { for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap']) { const t = mat[k]; if (!t || !t.name) continue;
    const key = t.name + '|' + t.colorSpace, c = texCache.get(key); if (c) mat[k] = c; else { t.anisotropy = 8; texCache.set(key, t); } } };
  const placeKit = (file, x, y, z, ry = 0, after, sc = 1) => gltf.load('assets/kit/' + file, (g) => {
    const o = g.scene; o.traverse((m) => { if (m.isMesh) { shareTex(m.material); m.material.envMapIntensity = 0.9; } });
    o.position.set(x, y, z); o.rotation.y = ry; o.scale.setScalar(sc); o.updateMatrixWorld(true); o.matrixAutoUpdate = false; root.add(o); after?.(o, g);
  }, undefined, (e) => console.warn('kit', file, e));                // 纸箱：贴图集 + 合并网格（cartons.js）
  const blobMat = new THREE.MeshBasicMaterial({ map: blobShadow(), transparent: true, depthWrite: false, opacity: 0.6 });
  const blob = (x, z, sx, sz = sx, y = 0.005) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), blobMat); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); root.add(p); return p; };

  // ---------------------------------------------------------------- 厂房：水泥地、瓦楞铁皮墙（下半截水泥墙裙）、红色壁柱、钢桁架屋顶
  const X0 = -12, X1 = 12, Z0 = 4, Z1 = -30, HT = 9;
  const CX = (X0 + X1) / 2, CZ = (Z0 + Z1) / 2, WD = X1 - X0, DP = Z0 - Z1;
  let fm = pbr('concrete_floor_worn_001', WD, DP, { size: 3.0, roughness: 0.6, envMapIntensity: 1.6, color: 0xc8c4ba });   // 真实的旧水泥地
  // 磨损遮罩：真实扫描的地面瑕疵图（SurfaceImperfections011），用来决定地上的油漆哪里被磨掉、哪里返潮发亮
  const wearTex = new THREE.TextureLoader().load('assets/ph/decal/SurfaceImperfections011/opacity.jpg'); wearTex.wrapS = wearTex.wrapT = THREE.RepeatWrapping; wearTex.colorSpace = THREE.NoColorSpace; wearTex.anisotropy = 8;
  { const W = 768, H = Math.round(768 * DP / WD); let n = 77; const r = () => (n = (n * 16807) % 2147483647) / 2147483647;
    const toPx = (x, z) => [(x - X0) / WD * W, (z - Z1) / DP * H];               // 画布最上面 = 最里面的墙（贴图 flipY）
    const wetDraw = (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, W, H);                    // 黑 = 干；白 = 湿（下面再反过来当粗糙度用）
      const blot = (x, z, rx, rz, a) => { const [px, pz] = toPx(x, z); const gr = g.createRadialGradient(px, pz, 0, px, pz, rx / WD * W); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(0.6, `rgba(255,255,255,${a * 0.6})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.save(); g.translate(px, pz); g.scale(1, rz / rx); g.translate(-px, -pz); g.fillStyle = gr; g.beginPath(); g.arc(px, pz, rx / WD * W, 0, 7); g.fill(); g.restore(); };
      for (let i = 0; i < 70; i++) blot(X0 + 1 + r() * (WD - 2), Z0 - 1 - r() * (DP - 2), 0.4 + r() * 1.8, 0.3 + r() * 1.2, 0.35 + r() * 0.5);   // 一片片返潮
      for (const x of [-2.6, -0.2]) for (let z = Z0 - 1; z > Z1 + 2; z -= 0.6) blot(x + (r() - 0.5) * 0.3, z, 0.45, 0.6, 0.18 + r() * 0.12);   // 叉车轮胎碾出来的两道亮痕
      for (let z = Z0 - 2; z > Z1 + 2; z -= 0.8) blot(-9.0 + (r() - 0.5) * 0.4, z, 0.7, 0.9, 0.3);   // 卸货平台根下一直是湿的
      for (const [x, z, s] of [[-2.0, -3.0, 2.0], [0.2, -11, 1.6], [-3.0, -17.5, 2.2], [4.6, -9, 1.2], [-6.2, -14, 1.4], [1.5, -21, 1.6], [-1.0, 1.4, 1.0]]) blot(x, z, s, s * 0.6, 0.95);   // 积水（形状再由真实瑕疵图打散）
      for (const [x, z, sx, sz] of [[-8.7, Z1 + 0.9, 1.9, 1.1], [-10.0, Z1 + 2.3, 1.1, 0.7], [-8.0, Z1 + 0.3, 1.8, 0.5]]) blot(x, z, sx, sz, 1);
      for (const [x, z, sx, sz] of [[9.3, -21.0, 1.2, 0.9], [10.5, -18.7, 0.8, 0.5], [10.6, -20.6, 0.6, 0.6], [9.8, -21.9, 0.7, 0.4]]) blot(x, z, sx, sz, 0.95); };   // 冷冻区：化霜水、冻品托盘底下的一摊水   // 02 号门：雨从门底下飘进来
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; wetDraw(cv.getContext('2d'));
    const coatAmt = new THREE.CanvasTexture(cv);                                     // clearcoatMap 读红通道：湿的地方有清漆
    const cv2 = document.createElement('canvas'); cv2.width = W; cv2.height = H; const g2 = cv2.getContext('2d'); g2.filter = 'invert(1)'; g2.drawImage(cv, 0, 0);
    const coatRough = new THREE.CanvasTexture(cv2);                                  // clearcoatRoughnessMap 读绿通道：湿 = 光滑
    for (const t of [coatAmt, coatRough]) { t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8; }   // 数据贴图不做 sRGB 转换
    const old = fm; fm = new THREE.MeshPhysicalMaterial({ map: old.map, normalMap: old.normalMap, normalScale: old.normalScale, roughnessMap: old.roughnessMap, aoMap: old.aoMap, roughness: 0.75, color: old.color,
      clearcoat: 1, clearcoatMap: coatAmt, clearcoatRoughness: 0.9, clearcoatRoughnessMap: coatRough, envMapIntensity: 1.6 }); }
  // ---- 地上的油漆（标线、字、斜纹）不再是一片片浮在地上的平面：全部画进一张覆盖整个地面的画布，在地面的着色器里和水泥混在一起——
  //      共用水泥的法线、粗糙度和湿痕反光，所以转视角时字和地是一体的；漆被磨掉的地方由真实扫描的瑕疵图决定，底下的脏也透上来
  const MPX = 64, markCv = document.createElement('canvas'); markCv.width = WD * MPX; markCv.height = DP * MPX;
  const mg = markCv.getContext('2d'), mpx = (x, z) => [(x - X0) * MPX, (z - Z1) * MPX];
  const PAINT = { y: 'rgba(218,186,58,0.96)', g: 'rgba(56,130,76,0.95)', w: 'rgba(224,220,208,0.93)', r: 'rgba(170,48,36,0.95)', b: 'rgba(52,96,170,0.95)' };
  const onFloor = (x, z, ry, fn) => { const [px, pz] = mpx(x, z); mg.save(); mg.translate(px, pz); mg.rotate(-ry); fn(); mg.restore(); };
  const line = (x, z, w, d, col = 'y', ry = 0) => onFloor(x, z, ry, () => { mg.fillStyle = PAINT[col] || col; mg.fillRect(-w * MPX / 2, -d * MPX / 2, w * MPX, d * MPX); });
  const floorText = (txt, x, z, w, h, col = 'y', ry = 0) => onFloor(x, z, ry, () => { mg.fillStyle = PAINT[col] || col; mg.textAlign = 'center'; mg.textBaseline = 'middle'; mg.font = `800 ${Math.round(h * MPX)}px ${SANS}`;
    const m = mg.measureText(txt).width, s = Math.min(1, w * MPX / m); mg.scale(s, 1); mg.fillText(txt, 0, 0); });
  const floorHazard = (x, z, w, d, ry = 0) => onFloor(x, z, ry, () => { mg.beginPath(); mg.rect(-w * MPX / 2, -d * MPX / 2, w * MPX, d * MPX); mg.clip(); mg.fillStyle = PAINT.y; mg.fillRect(-w * MPX / 2, -d * MPX / 2, w * MPX, d * MPX);
    mg.fillStyle = 'rgba(24,22,20,0.95)'; const st = 0.12 * MPX; for (let k = -w * MPX - d * MPX; k < w * MPX + d * MPX; k += st * 2) { mg.beginPath(); mg.moveTo(k, -d * MPX); mg.lineTo(k + st, -d * MPX); mg.lineTo(k + st + d * MPX * 2, d * MPX); mg.lineTo(k + d * MPX * 2, d * MPX); mg.fill(); } });
  const markTex = new THREE.CanvasTexture(markCv); markTex.colorSpace = THREE.SRGBColorSpace; markTex.anisotropy = 8;
  fm.onBeforeCompile = (sh) => {
    sh.uniforms.uMark = { value: markTex }; sh.uniforms.uWear = { value: wearTex };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vMk;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvMk = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vMk; uniform sampler2D uMark; uniform sampler2D uWear; float mkCov; float wrA;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec4 mk = texture2D(uMark, vMk);
        wrA = texture2D(uWear, vMk * vec2(${(WD / 1.7).toFixed(2)}, ${(DP / 1.7).toFixed(2)})).r;
        float wrB = texture2D(uWear, vMk * vec2(${(WD / 6.1).toFixed(2)}, ${(DP / 6.1).toFixed(2)}) + vec2(0.37, 0.71)).r;
        mkCov = mk.a * (1.0 - smoothstep(0.32, 0.85, wrA * 0.7 + wrB * 0.5));
        float lum = dot(diffuseColor.rgb, vec3(0.3333));
        diffuseColor.rgb = mix(diffuseColor.rgb, mk.rgb * clamp(0.5 + lum * 1.6, 0.0, 1.1), mkCov);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.5, mkCov * 0.6);')
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\nmaterial.clearcoat *= smoothstep(0.08, 0.5, wrA * 1.3 + 0.12);');   // 湿的地方：形状按真实瑕疵图打散，不是一个个圆
  };
  fm.customProgramCacheKey = () => 'wh-floor-paint';
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(WD, DP), fm); floor.rotation.x = -Math.PI / 2; floor.position.set(CX, 0, CZ); floor.userData.walk = true; root.add(floor);   // walk：地上的箭头只能落在能走的面上
  { const jm = new THREE.MeshStandardMaterial({ color: 0x15130f, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1 });   // 地坪切割缝（真的切进去的缝，不会被磨掉）
    for (let x = X0 + 6; x < X1; x += 6) { const j = new THREE.Mesh(new THREE.PlaneGeometry(0.008, DP), jm); j.rotation.x = -Math.PI / 2; j.position.set(x, 0.001, CZ); j.userData.walk = true; root.add(j); }
    for (let z = Z0 - 6; z > Z1; z -= 6) { const j = new THREE.Mesh(new THREE.PlaneGeometry(WD, 0.008), jm); j.rotation.x = -Math.PI / 2; j.position.set(CX, 0.001, z); j.userData.walk = true; root.add(j); } }
  const wallMat = (rep) => pbr('concrete_wall_008', rep * 2, 7.4, { size: 3.0, roughness: 0.9, color: 0xe2e0da });   // 真实的旧水泥墙（灰、有水渍）
  const WB = 1.6;                                                          // 水泥墙裙高度
  { const D0 = -10.8, D1 = -7.2, DH = 4.2;                                             // 后墙：02 号门的门洞（x -10.8…-7.2，高 4.2 m）
    box(D0 - X0, HT - WB, 0.2, wallMat((D0 - X0) / 2), (X0 + D0) / 2, WB + (HT - WB) / 2, Z1 - 0.1, root);
    box(X1 - D1, HT - WB, 0.2, wallMat((X1 - D1) / 2), (X1 + D1) / 2, WB + (HT - WB) / 2, Z1 - 0.1, root);
    box(D1 - D0, HT - DH, 0.2, wallMat((D1 - D0) / 2), (D0 + D1) / 2, (HT + DH) / 2, Z1 - 0.1, root); }
  box(WD, HT - WB, 0.2, wallMat(12), CX, WB + (HT - WB) / 2, Z0 + 0.1, root);
  const ironMat = pbr('corrugated_iron', DP, HT - WB, { size: 2.4, roughness: 0.72, metalness: 0.3, color: 0xb0aea6 });   // 两侧墙上半截：镀锌瓦楞铁皮
  box(0.2, HT - WB, DP, ironMat, X0 - 0.1, WB + (HT - WB) / 2, CZ, root);
  box(0.2, HT - WB, DP, ironMat, X1 + 0.1, WB + (HT - WB) / 2, CZ, root);
  box(-10.8 - X0, WB, 0.24, M.concrete, (X0 + -10.8) / 2, WB / 2, Z1 - 0.08, root); box(X1 - (-7.2), WB, 0.24, M.concrete, (X1 + -7.2) / 2, WB / 2, Z1 - 0.08, root);
  box(WD, WB, 0.24, M.concrete, CX, WB / 2, Z0 + 0.08, root);
  box(0.24, WB, DP, M.concrete, X0 - 0.08, WB / 2, CZ, root);
  box(0.24, WB, DP, M.concrete, X1 + 0.08, WB / 2, CZ, root);
  box(WD, 0.2, DP, pbr('corrugated_iron', WD, DP, { size: 3.0, rotate: Math.PI / 2, roughness: 0.6, metalness: 0.4, color: 0x7a7a74 }), CX, HT + 0.1, CZ, root);   // 屋面：底下看得见的压型钢板
  for (let z = Z0 - 3; z > Z1; z -= 6) {                                   // 两侧墙上的红色壁柱
    for (const x of [X0 + 0.15, X1 - 0.15]) { box(0.3, HT, 0.5, M.rackRed, x, HT / 2, z, root); box(0.34, 0.3, 0.6, M.rackDark, x, WB, z, root); }
  }
  for (let x = X0 + 3; x < X1; x += 6) if (Math.abs(x + 9) > 0.1) box(0.5, HT, 0.3, M.rackRed, x, HT / 2, Z1 + 0.15, root);   // 02 号门那一根柱子换成门框
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
  for (const [x, z, i] of [[-10, -6, 14], [-10, -18, 14], [-6, -2, 26], [3, -2, 26], [-6, -11, 22], [3, -11, 26], [9, -11, 18], [-3, -20, 24], [6, -20, 20]]) { const l = new THREE.PointLight(0x9fd0c6, i * 0.72, 16, 1.5); l.position.set(x, HT - 1.3, z); root.add(l); }

  // ---------------------------------------------------------------- 地面标线：主通道两条黄线、中间绿色虚线、出入库字样、斑马线
  line(-4.2, -9.5, 0.12, 26); line(1.6, -9.5, 0.12, 26);                    // 主通道 x −4.2 … 1.6
  for (let z = 2.5; z > -22; z -= 1.6) line(-1.3, z, 0.1, 0.8, 'g');
  line(-1.3, -22.6, 5.8, 0.12);                                           // 冷库前的停止线
  floorText('INBOUND  →', 0.2, 1.0, 2.2, 0.36); floorText('←  OUTBOUND', -2.8, -1.2, 2.2, 0.36);
  // （原来地上刷的白色大箭头去掉了：会和走动用的箭头混在一起）
  floorHazard(-1.5, -23.4, 4, 1.2);                                        // 冷库门口的斜纹禁停区
  for (const [x0, z0, w, d] of [[2.1, -3.5, 0.08, 8.3], [2.1, -13.2, 0.08, 8.3]]) line(x0 - 0.15, z0, w, d, 'w');   // 货架前的白色边线

  // ---------------------------------------------------------------- 重型货架
  const palletGeo = (() => { const parts = [];                                   // EUR 托盘 1200 × 1000 × 144 mm：五块面板（有缝）+ 三根垫木 + 三块底板，木纹按米铺
    const add = (w, h, d, x, y, z) => { const b = uvMeters(new THREE.BoxGeometry(w, h, d), 0.7); b.translate(x, y, z); parts.push(b); };
    for (let k = 0; k < 5; k++) add(1.2, 0.022, 0.15, 0, 0.139, -0.425 + k * 0.2125);
    for (const dz of [-0.42, 0, 0.42]) { add(1.2, 0.1, 0.1, 0, 0.078, dz); add(1.2, 0.022, 0.12, 0, 0.011, dz); }
    return mergeGeometries(parts); })();
  const pallet = (x, y, z, p = root) => { const m = new THREE.Mesh(palletGeo, M.pallet); m.position.set(x, y, z); p.add(m); return m; };
  // 单个纸箱：种类按 kind 挑，尺寸用那种箱子自己的尺寸（每个再随机差一点），返回 { w, h, d }
  const carton = (x, y, z, w, h, d, kind, ry = 0, p = root, o = {}) => kit.add(p, x, y, z, { kind: kind || 'reuse', ry, ...o });

  // 盖着防水布的一垛货：平面网格往下“搭”在一个看不见的盒子上（帆布是真实扫描的纹理）
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
    if (mat.userData.meters) { const U = g.attributes.uv; for (let i = 0; i < U.count; i++) U.setXY(i, U.getX(i) * (w + h * 1.6) / mat.userData.meters, U.getY(i) * (d + h * 1.6) / mat.userData.meters); }
    const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.rotation.y = ry; p.add(m); return m;
  };
  // 周转箱：扫描的塑料箱模型（500 × 400 × 254 mm），一摞摞叠起来
  const TOTE_H = 0.25;
  const tote = (x, y, z, kind = M.crateBlue, p = root) => model(kind, { pos: [x, y, z], rot: (rnd() - 0.5) * 0.12, parent: p });

  // ---- 印刷品：真实的纸 / 编织布照片打底，油墨用正片叠底印上去（油墨吃进纸纹里）；脏也是真实扫描的污渍图
  const imgP = {}; const loadImg = (src) => imgP[src] || (imgP[src] = new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }));
  const stainOn = (g, im, rgb, amt, x, y, w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); const cg = c.getContext('2d'); cg.drawImage(im, 0, 0, c.width, c.height);
    const d = cg.getImageData(0, 0, c.width, c.height), p = d.data; for (let i = 0; i < p.length; i += 4) { p[i + 3] = p[i] * amt; p[i] = rgb[0]; p[i + 1] = rgb[1]; p[i + 2] = rgb[2]; } cg.putImageData(d, 0, 0); g.drawImage(c, x, y); };
  const printed = (base, W, H, draw, dirt = []) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    Promise.all([loadImg(base.includes('/') ? base : `assets/ph/tex/${base}/diff.jpg`), ...dirt.map((d) => loadImg(d[0].includes('/') ? d[0] : `assets/ph/decal/${d[0]}/opacity.${/^decal_/.test(d[0]) ? 'png' : 'jpg'}`))]).then(([bg, ...ds]) => { const g = c.getContext('2d'); if (bg) g.drawImage(bg, 0, 0, W, H);
      g.globalCompositeOperation = 'multiply'; draw(g, W, H); g.globalCompositeOperation = 'source-over';
      ds.forEach((im, i) => { if (im) { const [, rgb, amt, rx, ry, rw, rh] = dirt[i]; stainOn(g, im, rgb, amt, rx * W, ry * H, Math.round(rw * W), Math.round(rh * H)); } }); t.needsUpdate = true; });
    return t; };
  const paperS = pbr('Paper005', 1, 1), wovenS = pbr('Fabric045', 1, 1), paperFlat = pbr('Paper006', 1, 1);
  const printMat = (base, ref, draw, dirt, tint = 0xffffff, W = 512, H = 320) => new THREE.MeshStandardMaterial({ map: printed(base, W, H, draw, dirt), normalMap: ref.normalMap, roughnessMap: ref.roughnessMap, roughness: 1, color: tint });
  // 25 kg 多层牛皮纸袋：细胞培养基干粉
  const printMedia = (g, W, H) => { g.fillStyle = '#3a6aa8'; g.fillRect(0, H * 0.08, W, H * 0.07); g.fillRect(0, H * 0.85, W, H * 0.07);
    g.fillStyle = '#20406e'; g.textAlign = 'center'; g.font = `800 46px ${SANS}`; fitText(g, 'CELL CULTURE MEDIUM', W / 2, H * 0.34, W * 0.86); g.font = `600 24px ${SANS}`; fitText(g, 'DMEM / F-12 · DRY POWDER · ANIMAL-ORIGIN FREE', W / 2, H * 0.46, W * 0.86);
    g.font = `800 58px ${SANS}`; g.fillText('25 kg', W / 2, H * 0.66); g.font = `500 17px ${SANS}`; fitText(g, 'KEEP DRY · STORE 2–8 ℃ · NO HOOKS', W / 2, H * 0.77, W * 0.8);
    g.save(); g.translate(W * 0.83, H * 0.58); g.rotate(-0.14); g.fillStyle = '#2a2a2a'; g.font = `700 17px ${MONO}`; g.fillText('LOT 2611-04', 0, 0); g.fillText('EXP 05 2028', 0, 21); g.restore(); };
  // 25 kg PP 编织袋：大豆分离蛋白（做支架的原料）
  const printSoy = (g, W, H) => { g.fillStyle = '#2e6e34'; g.fillRect(W * 0.05, H * 0.12, W * 0.9, 7); g.fillRect(W * 0.05, H * 0.86, W * 0.9, 7); g.textAlign = 'center';
    g.font = `900 46px ${SANS}`; fitText(g, 'SOY PROTEIN ISOLATE', W / 2, H * 0.38, W * 0.86); g.font = `600 22px ${SANS}`; fitText(g, 'FOOD GRADE · NON-GMO · SCAFFOLD FEEDSTOCK', W / 2, H * 0.5, W * 0.86);
    g.font = `800 50px ${SANS}`; g.fillText('NET 25 kg', W / 2, H * 0.71); g.fillStyle = '#7a2a22'; g.font = `700 18px ${MONO}`; g.fillText('BATCH 26-1107', W * 0.78, H * 0.8); };
  // 每种袋子三套：脏的位置、深浅不一样（真实污渍扫描图：拖过的灰、手印、水渍）
  const dirtA = [['SurfaceImperfections003', [70, 58, 44], 0.55, 0, 0, 1, 1], ['Smear006', [60, 50, 40], 0.3, 0.55, 0.45, 0.45, 0.55]];
  const dirtB = [['SurfaceImperfections015', [80, 66, 50], 0.5, 0, 0, 1, 1], ['Fingerprints005', [50, 44, 38], 0.6, 0.05, 0.2, 0.3, 0.5]];
  const dirtC = [['Smear007', [74, 62, 48], 0.35, 0, 0, 1, 1], ['SurfaceImperfections009', [90, 80, 64], 0.45, 0.3, 0, 0.7, 1]];
  M.paperSacks = [printMat('Paper005', paperS, printMedia, dirtA, 0xf4ecdc), printMat('Paper005', paperS, printMedia, dirtB, 0xe8dcc6), printMat('Paper005', paperS, printMedia, dirtC, 0xfff6e6)];
  M.wovenSacks = [printMat('Fabric045', wovenS, printSoy, dirtA, 0xece8dc), printMat('Fabric045', wovenS, printSoy, dirtB, 0xe0dccc), printMat('Fabric045', wovenS, printSoy, dirtC, 0xf4f0e6)];
  M.powder = real('white_plaster_02', 0.3, { color: 0xf2eee2, roughness: 1 });
  // 塑料桶、提桶：真实的塑料扫描图打底，再叠上真实扫描的灰、水渍（桶底和桶肩最脏）
  M.drumBlue.map = printed('Plastic010', 512, 512, () => {}, [['SurfaceImperfections015', [36, 32, 26], 0.6, 0, 0, 1, 1], ['Leaking005', [44, 38, 30], 0.45, 0, 0, 1, 0.7]]); M.drumBlue.map.wrapS = M.drumBlue.map.wrapT = THREE.RepeatWrapping;
  M.pail.map = printed('Plastic010', 512, 512, () => {}, [['SurfaceImperfections003', [70, 60, 46], 0.5, 0, 0, 1, 1], ['Smear006', [80, 70, 56], 0.3, 0, 0.5, 1, 0.5]]); M.pail.map.wrapS = M.pail.map.wrapT = THREE.RepeatWrapping;     // 撒出来的粉
  M.bagClear = filmMat({ tint: 0xeef2f0, base: 0.12, edge: 0.6, ns: 0.7, meters: 0.25 });   // 揉皱的透明塑料袋
  // ---- 整托打包：拉伸膜裹住四周、封箱胶带从顶上压下来、马克笔写的托号 / 箱数 / 去向（每托写的不一样），有的还贴一张发货单
  //      胶带：半透明的琥珀色 PP 胶带，毛边用真实扫描的胶带透明度图，皱褶用揉皱纸的法线图
  const tapeAlpha = new THREE.TextureLoader().load('assets/ph/tex/Tape002/opacity.jpg'); tapeAlpha.colorSpace = THREE.NoColorSpace; tapeAlpha.wrapS = tapeAlpha.wrapT = THREE.RepeatWrapping;
  const tapeMat = (col, op) => new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.25, transparent: true, opacity: op, alphaMap: tapeAlpha, alphaTest: 0.05, normalMap: paperS.normalMap, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide });
  M.tapeBrown = tapeMat(0xa87a3c, 0.88); M.tapeClear = tapeMat(0xe4e0d2, 0.42);
  const MARKS = ['PAL 07', '40 CTN', '→ SHOP', '12/11', 'B-0417', 'HOLD', '×24', '3 / 5', 'QC OK', 'P-0932', 'AM SHIFT', '18 BOX', 'DOCK 2', 'NO STACK', '20.11', '#14'];
  const markTexs = MARKS.map((t, k) => { const c = document.createElement('canvas'); c.width = 256; c.height = 112; const g = c.getContext('2d'); const r = R(400 + k);
    g.translate(128, 62); g.rotate((r() - 0.5) * 0.18); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${60 + r() * 14 | 0}px "Ink Free", "Segoe Print", "Comic Sans MS", cursive`;
    for (const [dx, dy, a] of [[0, 0, 0.92], [1.6, 0.8, 0.55], [-0.8, 1.2, 0.35]]) { g.fillStyle = `rgba(14,14,18,${a})`; g.fillText(t, dx, dy); }   // 马克笔：笔画边缘有点洇
    if (r() < 0.35) { g.strokeStyle = 'rgba(14,14,18,.85)'; g.lineWidth = 4; g.beginPath(); g.moveTo(-90, 34); g.lineTo(90, 30 + r() * 8); g.stroke(); }   // 有的底下划了一道
    const t2 = new THREE.CanvasTexture(c); t2.colorSpace = THREE.SRGBColorSpace; t2.anisotropy = 8; return new THREE.MeshStandardMaterial({ map: t2, transparent: true, depthWrite: false, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -3 }); });
  const shipLabel = lit(printed('Paper006', 256, 180, (g, W, H) => { g.fillStyle = '#1a1a1a'; g.textAlign = 'left'; g.font = `800 26px ${SANS}`; g.fillText('PALLET LABEL', 14, 34); g.font = `600 17px ${MONO}`;
    ['FROM  WAREHOUSE A', 'TO    SHOP FLOOR / COLD', 'QTY   40 CTN', 'DATE  2026-11-20'].forEach((t, k) => g.fillText(t, 14, 70 + k * 26)); g.lineWidth = 3; g.strokeRect(6, 6, W - 12, H - 12); }, [['Fingerprints008', [60, 50, 40], 0.5, 0.5, 0.3, 0.5, 0.7]]), { roughness: 0.85 });
  const tapeStrip = (p, len, wdt, mat, x, y, z, rx, ry) => { const g = new THREE.PlaneGeometry(wdt, len); const U = g.attributes.uv; for (let i = 0; i < U.count; i++) U.setY(i, U.getY(i) * len / 0.35); const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0, 'YXZ'); p.add(m); return m; };
  const wrapStack = (g, x, y, S, { film = true, tape = true } = {}) => { const { h, w, d } = S; if (h < 0.1) return;
    const W2 = w / 2 + 0.014, D2 = d / 2 + 0.014;
    if (film) { const hf = Math.max(0.2, h - 0.12 + 0.1);                               // 拉伸膜只缠四周（顶上敞着），一般缠到离顶上十几厘米就停了
      const bg = uvMeters(new THREE.BoxGeometry(w + 0.028, hf, d + 0.028), 0.45), keep = bg.groups.filter((gr, gi) => gi !== 2 && gi !== 3), idx = [];
      for (const gr of keep) for (let k = gr.start; k < gr.start + gr.count; k++) idx.push(bg.index.getX(k)); bg.setIndex(idx); bg.clearGroups();
      const fb = new THREE.Mesh(bg, M.wrap); fb.position.set(x, y - 0.1 + hf / 2, 0); g.add(fb);
      if (rnd() < 0.4) { const f = plane(0.32 + rnd() * 0.2, 0.25, M.wrap, x + (rnd() - 0.5) * w * 0.6, y + h * (0.3 + rnd() * 0.4), D2 + 0.03, 0, g); f.rotation.x = 0.4; f.rotation.z = (rnd() - 0.5) * 0.6; } }   // 膜被划开一道，耷拉下来
    if (tape) { const tm = rnd() < 0.7 ? M.tapeBrown : M.tapeClear, n = 1 + Math.floor(rnd() * 2);
      for (let k = 0; k < n; k++) { const tx = x + (n === 1 ? (rnd() - 0.5) * 0.2 : (k - 0.5) * w * 0.5), down = 0.12 + rnd() * 0.2;
        tapeStrip(g, d + 0.03, 0.048, tm, tx, y + h + 0.004, 0, -Math.PI / 2, 0);                                           // 顶上压一道
        for (const s of [1, -1]) tapeStrip(g, down, 0.048, tm, tx, y + h - down / 2, s * (D2 + 0.004), 0, s > 0 ? 0 : Math.PI); } }   // 两头往下折
    const nm = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < nm; k++) { const mk = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.114), markTexs[Math.floor(rnd() * markTexs.length)]); const side = rnd();
      if (side < 0.6) mk.position.set(x + (rnd() - 0.5) * (w - 0.3), y + h * (0.35 + rnd() * 0.5), D2 + 0.006);                 // 前面膜上
      else { mk.position.set(x + (rnd() - 0.5) * (w - 0.3), y + h + 0.007, (rnd() - 0.5) * (d - 0.2)); mk.rotation.set(-Math.PI / 2, 0, (rnd() - 0.5) * 0.8); }   // 顶上
      g.add(mk); }
    if (rnd() < 0.4) { const lb = plane(0.21, 0.15, shipLabel, x + (rnd() - 0.5) * (w - 0.4), y + h * 0.55, D2 + 0.005, 0, g); lb.rotation.z = (rnd() - 0.5) * 0.06;
      tapeStrip(g, 0.24, 0.048, M.tapeClear, lb.position.x, lb.position.y + 0.07, D2 + 0.007, 0, 0).rotation.z = Math.PI / 2; } };   // 发货单，上沿用透明胶带粘着
  // 装满的袋子：上下两片高度场拼成枕头形——两头缝口是扁的、侧边鼓圆；每只起伏不同，有的一头塌下去（实测 25 kg 纸袋平放约 640 × 400 × 130 mm）
  const sackGeo = (L, W, T, seed) => { const r = R(seed), p0 = r() * 6, p1 = r() * 6, sag = (r() - 0.5) * 0.45, parts = [];
    for (const s of [1, -1]) { const g = new THREE.PlaneGeometry(L, W, 20, 12); g.rotateX(s > 0 ? -Math.PI / 2 : Math.PI / 2); const P = g.attributes.position;
      for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), nx = Math.min(1, Math.abs(2 * x / L) / 0.93), nz = Math.min(1, Math.abs(2 * z / W));
        let h = Math.pow(Math.max(0, 1 - Math.pow(nx, 5)), 0.55) * Math.pow(Math.max(0, 1 - Math.pow(nz, 3)), 0.5);
        h *= 1 + 0.07 * Math.sin(x * 9 + p0) * Math.sin(z * 11 + p1) + 0.04 * Math.sin(x * 23 + p1);
        if (s > 0) h *= 1 + sag * (2 * x / L); P.setY(i, s > 0 ? h * T * 0.62 : -h * T * 0.38); }
      g.translate(0, T * 0.38, 0); g.computeVertexNormals(); parts.push(g); }
    return mergeGeometries(parts); };
  const SACK = { paper: { L: 0.64, W: 0.40, T: 0.13, mats: M.paperSacks }, woven: { L: 0.62, W: 0.46, T: 0.15, mats: M.wovenSacks } };
  for (const k in SACK) { const S = SACK[k]; S.geos = [11, 23, 37, 41].map((sd) => sackGeo(S.L, S.W, S.T, sd + k.length)); }
  const oneSack = (p, type, x, y, z, ry, tilt = 0.04) => { const S = SACK[type]; const m = new THREE.Mesh(S.geos[Math.floor(rnd() * 4)], S.mats[Math.floor(rnd() * 3)]); m.position.set(x, y, z); m.rotation.set((rnd() - 0.5) * tilt, ry, (rnd() - 0.5) * tilt); p.add(m); return m; };
  // 一托袋子：纸袋每层 5 只（3 竖 2 横，一层一反，咬合码法），编织袋每层 4 只；最上面一层缺几只、有一只斜搭着；有的托缠了膜又被划开；偶尔一只破了口、粉撒在下面那层上
  const sackStack = (g, x, y, type, layers) => { const S = SACK[type], lay = S.T * 0.84;
    const A = type === 'paper' ? [[-0.4, -0.18, Math.PI / 2], [0, -0.18, Math.PI / 2], [0.4, -0.18, Math.PI / 2], [-0.32, 0.31, 0], [0.32, 0.31, 0]] : [[-0.3, -0.24, 0], [0.31, -0.24, 0], [-0.31, 0.24, 0], [0.3, 0.24, 0]];
    let top = 0;
    for (let l = 0; l < layers; l++) { const fl = l % 2 ? -1 : 1, last = l === layers - 1;
      for (const [px, pz, ry] of A) { if (last && rnd() < 0.4) continue; oneSack(g, type, x + px * (type === 'paper' ? 1 : fl) + (rnd() - 0.5) * 0.05, y + l * lay, pz * fl + (rnd() - 0.5) * 0.05, ry + (rnd() - 0.5) * 0.12); }
      top = y + (l + 1) * lay; }
    if (rnd() < 0.5) oneSack(g, type, x + (rnd() - 0.5) * 0.3, top - 0.02, (rnd() - 0.5) * 0.2, rnd() * 3, 0.18);   // 斜搭在最上面的一只
    if (rnd() < 0.35) { const pile = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.powder); pile.scale.set(1.4 + rnd(), 0.22, 1.0 + rnd() * 0.6); pile.position.set(x + (rnd() - 0.5) * 0.5, top - lay * 0.15, (rnd() - 0.5) * 0.5); g.add(pile); }   // 破了口，粉撒出来
    if (rnd() < 0.3) { const h = (layers - 1) * lay; box(1.22, h, 1.04, M.wrap, x, y + h / 2, 0, g); }   // 下面几层缠了膜（上面那层膜已经割开拿走了）
  };
  // 拉伸膜卷（机用）：500 mm 宽、外径 250 mm，76 mm 纸管芯；竖着码，每层 12 卷，中间垫一张纸板
  const filmM = new THREE.MeshPhysicalMaterial({ color: 0xd0d8dc, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.2, transparent: true, opacity: 0.9, normalMap: paperS.normalMap, envMapIntensity: 1.2 }); filmM.normalScale.set(0.22, 0.22);
  const filmTail = filmMat({ base: 0.1, edge: 0.6, ns: 0.45 });                         // 膜卷耷拉下来的膜头
  const coreM = real('Cardboard001', 0.3, { color: 0x9a8264, roughness: 1, side: THREE.DoubleSide });
  const rollGeos = [0.125, 0.118, 0.1, 0.082].map((R0) => { const g = new THREE.LatheGeometry([[0.039, 0], [R0 - 0.006, 0], [R0, 0.006], [R0, 0.494], [R0 - 0.006, 0.5], [0.039, 0.5]].map(([a, b]) => new THREE.Vector2(a, b)), 28);
    const U = g.attributes.uv; for (let i = 0; i < U.count; i++) U.setXY(i, U.getX(i) * 2 * Math.PI * R0 / 0.45, U.getY(i)); return g; });
  const coreGeo = uvTube(new THREE.CylinderGeometry(0.038, 0.038, 0.512, 16, 1, true), 0.038, 0.512, 0.3);
  const filmLabel = lit(printed('Paper006', 256, 160, (g, W, H) => { g.fillStyle = '#1a1a1a'; g.textAlign = 'center'; g.font = `800 34px ${SANS}`; g.fillText('STRETCH FILM', W / 2, 48); g.font = `600 20px ${SANS}`; g.fillText('CAST LLDPE · 23 µm', W / 2, 82); g.fillText('500 mm × 1500 m', W / 2, 108); g.font = `700 18px ${MONO}`; g.fillText('ROLL 0417', W / 2, 140); }), { roughness: 0.9 });
  const filmRoll = (p, x, y, z, R0i = 0, lying = false) => { const R0 = [0.125, 0.118, 0.1, 0.082][R0i], r = new THREE.Group(), q = new THREE.Group(); r.position.set(x, y, z); r.rotation.y = rnd() * 6; r.add(q);
    if (lying) { q.rotation.z = Math.PI / 2; q.position.set(0.25, R0, 0); }                    // 横躺着的一卷
    q.add(new THREE.Mesh(rollGeos[R0i], filmM)); const c = new THREE.Mesh(coreGeo, coreM); c.position.y = 0.25; q.add(c);
    if (rnd() < 0.5) { const a = rnd() * 6, l = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.05), filmLabel); l.position.set(Math.sin(a) * (R0 + 0.002), 0.3, Math.cos(a) * (R0 + 0.002)); l.rotation.y = a; q.add(l); }
    p.add(r); return r; };
  const loads = {
    cartons: (g, x, y, kind) => { const S = kit.stackPallet(g, x, y, kind || 'supply', { maxH: 0.5 + rnd() * 0.65, mixed: 0.5 }); if (rnd() < 0.6) wrapStack(g, x, y, S, { film: rnd() < 0.75 }); },
    bags: (g, x, y) => sackStack(g, x, y, 'paper', 3 + Math.floor(rnd() * 3)),
    sacks: (g, x, y) => sackStack(g, x, y, 'woven', 3 + Math.floor(rnd() * 2)),
    totes: (g, x, y) => { for (const [px, pz] of [[-0.29, -0.22], [0.29, -0.22], [-0.29, 0.22], [0.29, 0.22]]) { const n = Math.floor(rnd() * 4); for (let i = 0; i < n; i++) tote(x + px + (rnd() - 0.5) * 0.04, y + i * TOTE_H, pz + (rnd() - 0.5) * 0.04, rnd() < 0.75 ? M.crateBlue : M.crateGrey, g); } },
    cases: (g, x, y) => { for (let i = 0; i < 2; i++) flightCase(g, x + (rnd() - 0.5) * 0.06, y + i * 0.362, (rnd() - 0.5) * 0.06, (rnd() - 0.5) * 0.08); },
    drums: (g, x, y) => { for (const [dx, dz] of [[-0.3, -0.24], [0.3, -0.24], [-0.3, 0.26], [0.3, 0.26]]) if (rnd() > 0.12) drum(g, x + dx + (rnd() - 0.5) * 0.03, y, dz, rnd() * 6); },
    wrapped: (g, x, y) => { const S = kit.stackPallet(g, x, y, ['pkg', 'supply', 'media', 'clean'][Math.floor(rnd() * 4)], { maxH: 0.55 + rnd() * 0.45, mixed: 0.4 }); wrapStack(g, x, y, S); },   // 整托缠膜、压胶带、马克笔写着托号
    rolls: (g, x, y) => { const xs = [-0.45, -0.15, 0.15, 0.45], zs = [-0.33, 0, 0.33], layers = rnd() < 0.5 ? 2 : 1;
      for (let l = 0; l < layers; l++) { const yy = y + l * 0.505; if (l > 0) box(1.18, 0.004, 0.98, M.carton, x, yy - 0.002, 0, g);   // 层间纸板
        for (const px of xs) for (const pz of zs) { if ((l === layers - 1 && rnd() < 0.3) || rnd() < 0.05) continue; filmRoll(g, x + px + (rnd() - 0.5) * 0.02, yy, pz + (rnd() - 0.5) * 0.02, rnd() < 0.8 ? 0 : 1 + Math.floor(rnd() * 3)); } }
      if (rnd() < 0.6) filmRoll(g, x + (rnd() - 0.5) * 0.4, y + layers * 0.505, (rnd() - 0.5) * 0.4, 1 + Math.floor(rnd() * 3), true);   // 用了一半的一卷横躺在上面
      if (rnd() < 0.5) { const t = new THREE.PlaneGeometry(0.5, 0.55, 1, 6); const P = t.attributes.position; for (let i = 0; i < P.count; i++) { const v = (P.getY(i) + 0.275) / 0.55; P.setZ(i, Math.pow(1 - v, 2) * 0.12 + Math.sin(P.getX(i) * 12) * 0.01); } t.computeVertexNormals();
        const tm = new THREE.Mesh(t, filmTail); tm.position.set(x + xs[3] * 0.5, y + 0.22, 0.52); tm.rotation.y = 0.1; g.add(tm); } },   // 一卷的膜头耷拉在托盘外面
    buckets: (g, x, y) => { for (const px of [-0.36, 0, 0.36]) for (const pz of [-0.32, 0, 0.32]) { const n = rnd() < 0.2 ? 0 : 1 + (rnd() < 0.45 ? 1 : 0); for (let i = 0; i < n; i++) pail(g, x + px + (rnd() - 0.5) * 0.03, y + i * 0.374, pz + (rnd() - 0.5) * 0.03, rnd() * 6); } },
    mixed: (g, x, y) => {
      kit.add(g, x - 0.3, y, 0.2, { design: 'banana', ry: 0.08 + (rnd() - 0.5) * 0.1, open: true, size: [0.5, 0.24, 0.4] });
      for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(bagGeo, M.bagClear); b.scale.set(0.12 + rnd() * 0.05, 0.07, 0.1); b.position.set(x - 0.3 + (rnd() - 0.5) * 0.25, y + 0.25, 0.2 + (rnd() - 0.5) * 0.2); b.rotation.y = rnd() * 3; g.add(b); }   // 塑料袋从箱口鼓出来
      kit.add(g, x + 0.3, y, 0.22, { design: 'casing', ry: -0.12, crush: 0.03, size: [0.36, 0.24, 0.3] });
      kit.add(g, x - 0.28, y, -0.25, { design: 'biobag', ry: 0.04, size: [0.56, 0.26, 0.36] });
      kit.add(g, x - 0.25, y + 0.27, -0.24, { design: 'coverall', ry: -0.06, size: [0.42, 0.3, 0.32] });
      if (rnd() < 0.55) sack(g, x + 0.3, y, -0.2); else tote(x + 0.3, y, -0.24, M.crateBlue, g);
    },
    empty: (g, x, y) => { if (rnd() < 0.7) carton(x + 0.2, y, 0.1, 0, 0, 0, rnd() < 0.5 ? 'reuse' : 'supply', 0.3, g, { open: rnd() < 0.4 }); },
  };
  // 揉皱的透明塑料袋
  const bagGeo = (() => { const g = new THREE.SphereGeometry(1, 12, 8); const P = g.attributes.position; for (let i = 0; i < P.count; i++) { const v = 1 + Math.sin(P.getX(i) * 5) * 0.08 + Math.cos(P.getZ(i) * 4) * 0.08; P.setXYZ(i, P.getX(i) * v, P.getY(i) * v, P.getZ(i) * v); } g.computeVertexNormals(); return g; })();
  // 一只编织袋（装着用过的透明袋子），平躺着，袋口那头露出塑料袋
  function sack(g, x, y, z) { const s = oneSack(g, 'woven', x, y, z, rnd() * 3, 0.1); s.scale.set(0.8, 1.1, 0.8);
    const b = new THREE.Mesh(bagGeo, M.bagClear); b.scale.set(0.09, 0.06, 0.12); b.position.set(x + Math.cos(s.rotation.y) * 0.26, y + 0.1, z - Math.sin(s.rotation.y) * 0.26); g.add(b); }
  // 黑色 ABS 航空箱：铝包边、包角、两把搭扣、提手（1000 × 360 × 700 mm）
  function flightCase(g, x, y, z, ry) { const c = new THREE.Group(); c.position.set(x, y, z); c.rotation.y = ry; g.add(c);
    rbox(1.0, 0.36, 0.7, 0.012, M.case, 0, 0.18, 0, c);
    for (const yy of [0.012, 0.236, 0.348]) for (const [w, d, px, pz] of [[1.008, 0.022, 0, 0.352], [1.008, 0.022, 0, -0.352], [0.022, 0.708, 0.502, 0], [0.022, 0.708, -0.502, 0]]) box(w, 0.022, d, M.alu, px, yy, pz, c);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const yy of [0.02, 0.34]) rbox(0.05, 0.045, 0.05, 0.008, M.alu, sx * 0.49, yy, sz * 0.34, c);
    for (const dx of [-0.32, 0.32]) box(0.07, 0.05, 0.016, M.latch, dx, 0.236, 0.362, c);
    box(0.14, 0.024, 0.03, M.tyre, 0, 0.15, 0.37, c); }
  // 200 L 吹塑 HDPE 桶（Ø 585 × 935 mm，两道滚箍、两个桶塞），白标签印着内容
  const drumGeo = (() => { const g = new THREE.LatheGeometry([[0, 0], [0.272, 0], [0.285, 0.012], [0.29, 0.04], [0.29, 0.235], [0.297, 0.245], [0.297, 0.275], [0.29, 0.285], [0.29, 0.645], [0.297, 0.655], [0.297, 0.685], [0.29, 0.695], [0.29, 0.9], [0.284, 0.925], [0.27, 0.935], [0, 0.935]].map(([a, b]) => new THREE.Vector2(a, b)), 32);
    const U = g.attributes.uv; for (let i = 0; i < U.count; i++) U.setXY(i, U.getX(i) * 2 * Math.PI * 0.29 / 0.6, U.getY(i) * 1.6 / 0.6); return g; })();
  const drumLabel = lit(printed('Paper006', 384, 256, (g, W, H) => { g.fillStyle = '#1a1a1a'; g.textAlign = 'left'; g.font = `800 40px ${SANS}`; g.fillText('BASAL MEDIUM', 22, 62); g.font = `600 24px ${SANS}`; g.fillText('LIQUID CONCENTRATE 10×', 22, 98); g.fillText('200 L · LOT 2610-B', 22, 130);
    g.font = `500 18px ${SANS}`; g.fillText('KEEP SEALED · 2–8 ℃ · PROTECT FROM LIGHT', 22, 170); g.strokeStyle = '#1a1a1a'; g.lineWidth = 3; g.strokeRect(10, 14, W - 20, H - 28); }, [['Smear006', [80, 70, 55], 0.35, 0, 0.3, 1, 0.7]]), { roughness: 0.8 });
  const drumLabelGeo = new THREE.CylinderGeometry(0.2905, 0.2905, 0.24, 20, 1, true, -0.55, 1.1);
  function drum(g, x, y, z, ry) { const d = new THREE.Group(); d.position.set(x, y, z); d.rotation.y = ry; g.add(d); d.add(new THREE.Mesh(drumGeo, M.drumBlue)); const l = new THREE.Mesh(drumLabelGeo, drumLabel); l.position.y = 0.46; d.add(l);
    for (const dx of [-0.17, 0.17]) cyl(0.032, 0.032, 0.022, M.drumBlue, dx, 0.944, 0.05, d, 12); }
  // 20 L 白色塑料提桶（上口 Ø 300、下口 Ø 270、高 372 mm），盖子、铁丝提手、印刷标签
  const pailGeo = (() => { const g = new THREE.LatheGeometry([[0, 0], [0.13, 0], [0.135, 0.008], [0.147, 0.33], [0.152, 0.334], [0.152, 0.352], [0.156, 0.356], [0.156, 0.372], [0.05, 0.374], [0, 0.374]].map(([a, b]) => new THREE.Vector2(a, b)), 24);
    const U = g.attributes.uv; for (let i = 0; i < U.count; i++) U.setXY(i, U.getX(i) * 2 * Math.PI * 0.145 / 0.4, U.getY(i) * 0.7 / 0.4); return g; })();
  const pailLabel = lit(printed('Paper006', 384, 160, (g, W, H) => { g.fillStyle = '#2a5a8a'; g.fillRect(0, 0, W, 50); g.fillStyle = '#1a1a1a'; g.textAlign = 'center'; g.font = `800 34px ${SANS}`; g.fillText('PBS 10×', W / 2, 94); g.font = `600 20px ${SANS}`; g.fillText('BUFFER SALTS · 20 L · LOT 0921', W / 2, 128); }), { roughness: 0.6 });
  const pailLabelGeo = new THREE.CylinderGeometry(0.1478, 0.1405, 0.15, 20, 1, true, -1.0, 2.0);
  const pailHandle = new THREE.TorusGeometry(0.153, 0.003, 4, 20, Math.PI);
  function pail(g, x, y, z, ry) { const p = new THREE.Group(); p.position.set(x, y, z); p.rotation.y = ry; g.add(p); p.add(new THREE.Mesh(pailGeo, M.pail)); const l = new THREE.Mesh(pailLabelGeo, pailLabel); l.position.y = 0.19; p.add(l);
    const h = new THREE.Mesh(pailHandle, M.steel); h.position.y = 0.34; h.rotation.set(-Math.PI / 2 + 0.25 + rnd() * 0.3, 0, 0); p.add(h); }

  const LEVELS = [0, 1.6, 3.15, 4.7], RH = 6.3, BAY = 2.7, RD = 1.1;
  // 立柱上一列列水滴形冲孔（真的孔，透过去是黑的）：一条带透明度的贴片贴在立柱正面
  const holeTex = canvasTexture(32, 64, (g, W, H) => { g.clearRect(0, 0, W, H); g.fillStyle = '#000'; g.beginPath(); g.ellipse(W / 2, 20, 7, 11, 0, 0, Math.PI * 2); g.fill(); g.fillRect(W / 2 - 4, 20, 8, 22); g.beginPath(); g.arc(W / 2, 42, 4, 0, Math.PI * 2); g.fill(); });
  holeTex.wrapS = holeTex.wrapT = THREE.RepeatWrapping;
  const holeM = new THREE.MeshBasicMaterial({ map: holeTex, alphaTest: 0.5, color: 0x080605, polygonOffset: true, polygonOffsetFactor: -2 });
  const labelMat = (txt) => lit(textTex([[txt, 34, '#1a1a18', 0.72, 700, MONO]], 160, 48, { bg: '#d8b838', age: 0.7 }), { roughness: 0.6 });
  // fill[bay][level] = [load, kind]
  const rack = (name, x, z, ry, fill, guards = true) => {
    const bays = fill.length, W = bays * BAY;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    const holes = [];
    for (let k = 0; k <= bays; k++) {
      const fx = -W / 2 + k * BAY;
      for (const fz of [-RD / 2, RD / 2]) { box(0.09, RH, 0.07, M.orange, fx, RH / 2, fz, g); box(0.18, 0.012, 0.14, M.rackDark, fx, 0.006, fz, g);
        const hp = new THREE.PlaneGeometry(0.034, RH - 0.1); const U = hp.attributes.uv; for (let i = 0; i < U.count; i++) U.setY(i, U.getY(i) * (RH - 0.1) / 0.05); hp.rotateY(fz > 0 ? 0 : Math.PI); hp.translate(fx, RH / 2, fz + Math.sign(fz) * 0.0352); holes.push(hp); }
      for (let y = 0.35; y < RH - 0.3; y += 0.85) { const d = box(0.03, 0.03, Math.hypot(RD, 0.85), M.orange, fx, y + 0.42, 0, g); d.rotation.x = Math.atan2(0.85, RD) * (Math.round(y / 0.85) % 2 ? 1 : -1); }
      for (const y of [0.15, RH - 0.1]) box(0.04, 0.04, RD, M.orange, fx, y, 0, g);
      if (guards && (k === 0 || k === bays)) box(0.2, 0.42, 0.18, M.yellow, fx, 0.21, RD / 2 + 0.1, g);
      if (rnd() < 0.6) decal(rnd() < 0.5 ? 'Scratches001' : 'Rust001', g, { pos: [fx, 0.35, RD / 2 + 0.04], w: 0.12, h: 0.6, color: 0x8a7a6a, opacity: 0.7 });   // 叉车蹭的、返潮锈的
    }
    { const hm = new THREE.Mesh(mergeGeometries(holes), holeM); hm.userData.keep = true; g.add(hm); }
    for (let b = 0; b < bays; b++) {
      const bx = -W / 2 + (b + 0.5) * BAY;
      LEVELS.forEach((y, li) => {
        if (li > 0) {
          for (const fz of [-RD / 2, RD / 2]) box(BAY - 0.1, 0.13, 0.06, M.orange, bx, y - 0.065, fz, g);
          const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.06), labelMat(`${name}-${String(b + 1).padStart(2, '0')}-${li + 1}`)); tag.position.set(bx - 0.6, y - 0.065, RD / 2 + 0.032); tag.userData.keep = true; g.add(tag);
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
    mergeGroup(g);                                                               // 整排货架（钢件、托盘、袋子、桶、周转箱）按材质合并成几十个网格
    return g;
  };
  const F = (...a) => a;                                                   // 每格：[货物, 标签]
  const C = (k) => ['cartons', k];
  const facing = -Math.PI / 2;                                             // 货架正面朝向 −x（朝主通道）
  // 第一排（主通道右边）
  rack('A', 2.75, -3.5, facing, [
    [['mixed'], C('supply'), ['totes'], ['wrapped']],
    [['sacks'], ['mixed'], C('pkg'), ['cases']],
    [C('clean'), ['buckets'], ['mixed'], ['rolls']],
  ]);
  rack('A', 2.75, -13.2, facing, [
    [['drums'], ['mixed'], ['wrapped'], ['sacks']],
    [C('supply'), ['totes'], ['mixed'], C('glove')],
    [['rolls'], ['bags'], ['cases'], ['mixed']],
  ]);
  // 区域牌
  for (const [txt, x, z] of [['A', 2.75, 0.75]]) {
    const s = plane(0.9, 0.9, lit(textTex([[txt, 150, '#1a1a18', 0.72, 800, SANS]], 200, 200, { bg: '#d8b838', age: 0.8 })), x, RH + 0.55, z, 0, root);
    box(0.95, 0.95, 0.04, M.rackDark, x, RH + 0.55, z - 0.03, root);
  }
  plane(3.2, 0.8, lit(textTex([['CHARGING · ROLL CAGES · BREAK AREA', 46, '#e8e4d8', 0.62, 700]], 1000, 250, { bg: '#2a2c2a', age: 1 })), X1 - 0.27, 7.0, -8.3, -Math.PI / 2, root);
  // 货架之间的地上：防撞柱（Ø 160 钢管灌混凝土，黄黑漆）
  for (const z of [0.9, -8.35, -17.6]) { cyl(0.08, 0.08, 1.0, M.yellow, 1.95, 0.5, z, root, 14); cyl(0.085, 0.085, 0.1, M.rackDark, 1.95, 0.75, z, root, 14); }

  // ---------------------------------------------------------------- 叉车（停在两组货架之间的横通道口）和两台手动搬运车
  placeKit('08_Logistics_Forklift.glb', -0.6, 0, -8.6, Math.PI / 2 - 0.25, null, 1.3); blob(-0.6, -8.1, 2.0, 3.6);   // 物流叉车（道具包），货叉放在低位
  // 手动液压搬运车（实测：货叉 1150 × 160 mm、外宽 540 mm、降到底 85 mm，转向轮 Ø 200、承重轮 Ø 80，把手高约 1.2 m）
  const jack = (x, z, ry, y = 0) => {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; root.add(g);
    for (const zz of [-0.19, 0.19]) { rbox(1.15, 0.05, 0.16, 0.008, M.fork, 0.02, 0.06, zz, g); rbox(0.1, 0.03, 0.15, 0.01, M.fork, 0.62, 0.05, zz, g);   // 货叉（带斜头）
      for (const dx of [0.5, 0.42]) { const w = cyl(0.04, 0.04, 0.07, M.tyre, dx, 0.042, zz, g, 12); w.rotation.x = Math.PI / 2; } }
    rbox(0.22, 0.13, 0.54, 0.012, M.fork, -0.62, 0.11, 0, g);                       // 叉根横梁
    cyl(0.045, 0.045, 0.26, M.steel, -0.66, 0.3, 0, g, 14);                          // 液压缸（镀铬）
    rbox(0.17, 0.11, 0.22, 0.015, M.fork, -0.68, 0.47, 0, g);                         // 泵头
    for (const zz of [-0.075, 0.075]) { const w = cyl(0.1, 0.1, 0.05, M.tyre, -0.7, 0.1, zz, g, 18); w.rotation.x = Math.PI / 2; const hb = cyl(0.045, 0.045, 0.052, M.fork, -0.7, 0.1, zz, g, 12); hb.rotation.x = Math.PI / 2; }
    const hd = new THREE.Group(); hd.position.set(-0.7, 0.5, 0); hd.rotation.z = 0.32; g.add(hd);   // 把手往后斜着
    for (const zz of [-0.11, 0.11]) { cyl(0.014, 0.014, 0.66, M.fork, 0, 0.33, zz, hd, 10); cyl(0.017, 0.017, 0.12, M.tyre, 0, 0.6, zz, hd, 10); }   // 两根管子，上面套着橡胶把套
    { const t = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.017, 8, 20, Math.PI), M.tyre); t.position.set(0, 0.66, 0); t.rotation.y = Math.PI / 2; hd.add(t); }   // 顶上弯成一个环
    box(0.08, 0.012, 0.02, M.steel, 0.02, 0.6, 0, hd);                                 // 升降拨杆
    return mergeGroup(g);
  };
  jack(-3.5, -5.2, 0.5); jack(-10.2, -12.6, 1.6, 1.1);   // 第二台停在月台上（以前放在地面上，等于埋在月台里，把手从月台面上露出一个黑圈）

  // ---------------------------------------------------------------- 左边：卸货平台（1.1 m 高）、栏杆、台阶、两扇卷帘门
  const PX = -8.5, PH = 1.1, PZ0 = Z0, PZ1 = -26;                          // 高台一直做到墙根（原来只到 z = 2，离墙空着两米）
  box(PX - X0, PH, PZ0 - PZ1, M.concrete, (X0 + PX) / 2, PH / 2, (PZ0 + PZ1) / 2, root);
  { const pt = new THREE.Mesh(new THREE.PlaneGeometry(PX - X0, PZ0 - PZ1), pbr('garage_floor', PX - X0, PZ0 - PZ1, { size: 3.0, roughness: 0.7, color: 0xa8a49c })); pt.rotation.x = -Math.PI / 2; pt.position.set((X0 + PX) / 2, PH + 0.002, (PZ0 + PZ1) / 2); pt.userData.walk = true; root.add(pt); }   // 平台面：带油渍的旧水泥
  box(0.012, 0.22, PZ0 - PZ1, M.rackDark, PX + 0.006, PH - 0.11, (PZ0 + PZ1) / 2, root);
  { const L = PZ0 - PZ1, nr = pbr('PaintedMetal016', L, 0.22, { size: 0.9 });   // 月台边沿的黄黑斜纹：整条一张不重复的图（dockEdgeTex），凹凸和粗糙度用真实扫描的旧漆钢板
    const em = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.22), new THREE.MeshStandardMaterial({ map: dockEdgeTex(L), normalMap: nr.normalMap, roughnessMap: nr.roughnessMap, roughness: 1, metalness: 0.2 }));
    em.material.normalScale.set(0.8, 0.8); em.position.set(PX + 0.0128, PH - 0.11, (PZ0 + PZ1) / 2); em.rotation.y = Math.PI / 2; root.add(em); }
  box(0.045, 0.008, PZ0 - PZ1, M.steel, PX - 0.0225, PH + 0.001, (PZ0 + PZ1) / 2, root).userData.walk = true;   // 护边角钢：一肢平贴在台面上，一肢贴着台边（不再凸出来一条）
  box(0.008, 0.06, PZ0 - PZ1, M.steel, PX + 0.016, PH - 0.025, (PZ0 + PZ1) / 2, root);
  const STZ = -4.2;                                                       // 台阶位置
  // 钢楼梯：两根铁红斜梁（按踏步的斜度切好，上端平着搭进台边、下端平着落地）、花纹钢板踏步、黄色防滑前沿（比踏面高 3 mm，不再和钢板同面闪烁）
  const XB = PX + 1.68, rise = PH / 6, run = 0.28, SW = 1.1, SLOPE = rise / run;
  const RX = PX - 0.125;                                                   // 立柱中心退到台面里：底板全落在混凝土上，螺栓离边 8 cm
  const nose = (x) => Math.min(PH, rise + (XB - x) * SLOPE);               // 踏步前沿连成的斜线
  { const tread = pbr('DiamondPlate008A', 0.3, SW, { size: 0.5, metalness: 0.3, roughness: 0.68, color: 0xb4b2a8, normalScale: 0.6, envMapIntensity: 1.3 });
    for (let i = 1; i <= 6; i++) {
      const front = XB - run * (i - 1), y = rise * i;
      box(run - 0.05, 0.03, SW, tread, front - 0.05 - (run - 0.05) / 2, y - 0.015, STZ, root).userData.walk = true;
      box(0.05, 0.036, SW, M.railY, front - 0.025, y - 0.015, STZ, root).userData.walk = true;
      box(0.012, rise - 0.036, SW, M.oxide, front - 0.012, y - 0.036 - (rise - 0.036) / 2, STZ, root);          // 踢板
    }
    const side = new THREE.Shape([[XB + 0.07, 0], [XB + 0.07, 0.1], [XB, rise + 0.02], [XB - run * 5, PH], [PX, PH], [PX, PH - 0.27], [XB - 0.3, 0]].map(([x, y]) => new THREE.Vector2(x, y)));
    for (const s of [-1, 1]) {
      const geo = new THREE.ExtrudeGeometry(side, { depth: 0.06, bevelEnabled: false }), uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / M.oxide.userData.meters, uv.getY(i) / M.oxide.userData.meters);
      const st = new THREE.Mesh(geo, M.oxide);
      st.position.z = STZ + s * (SW / 2 + 0.03) - 0.03;
      root.add(st);
    }
    decal('Rust001', root, { pos: [XB - 0.45, 0.3, STZ + SW / 2 + 0.064], w: 0.5, h: 0.3, opacity: 0.8 }); }
  // 栏杆（OSHA 1910.29：上横杆 1.07 m、中横杆 0.53 m、踢脚板 ≥ 90 mm、所有临空的边都要围上）；Ø 42.4 横杆、Ø 48.3 立柱
  //   台面上：150 × 150 × 12 底板、四颗膨胀螺栓。楼梯上：立柱用侧装板栓在斜梁外侧，最下面一根落在地上
  const rg = new THREE.Group(); root.add(rg);
  // 栏杆不是一次装好的：有原装的（黄漆磨花）、补焊过重新刷的（漆新、颜色偏橙）、锈得最厉害的一段（靠卸货门、淋过雨），管子粗细也不一样（Ø 38–54）
  const railMats = [M.railY,
    real('PaintedMetal004', 0.7, { metalness: 1, color: 0xe8c47a, clean: 0xe0a62a, age: 0.22 }),
    real('PaintedMetal008', 1.1, { metalness: 1, color: 0xf4dc96, clean: 0xf0c23a, age: -0.16 }),
    real('rusty_painted_metal', 0.8, { metalness: 0.5, color: 0xd6ae6c, clean: 0xd89a2a, age: 0.4 })];
  let railM = M.railY, railK = 1;
  const pickRail = () => { railM = railMats[Math.floor(rnd() * railMats.length)]; railK = 0.85 + rnd() * 0.42; };
  const rail = (a, b, r = 0.0212 * railK, mat = railM) => { const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va), L = d.length(); const m = new THREE.Mesh(uvTube(new THREE.CylinderGeometry(r, r, L, 12), r, L, mat.userData.meters), mat); m.position.copy(va).add(vb).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); rg.add(m); return m; };
  const elbow = (p, r = 0.027 * railK) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), railM); m.position.set(...p); rg.add(m); };
  const post = (x, y, z, h = 1.07) => {                                    // 落地的立柱：每根自己的漆、自己的粗细
    const top = y + 0.012, pm = railMats[Math.floor(rnd() * railMats.length)], pr = 0.0242 * (0.85 + rnd() * 0.35);
    box(0.15, 0.012, 0.15, pm, x, y + 0.006, z, rg);
    rail([x, top, z], [x, y + h, z], pr, pm);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      cyl(0.015, 0.015, 0.003, M.steel, x + sx * 0.052, top + 0.0015, z + sz * 0.052, rg, 10);                  // 垫圈
      cyl(0.0105, 0.0105, 0.011, M.steel, x + sx * 0.052, top + 0.0085, z + sz * 0.052, rg, 6);                 // 螺母
    }
  };
  const sidePost = (x, z, s, top) => {                                     // 栓在斜梁外侧的立柱
    const y = nose(x), face = z - s * 0.0242;
    rail([x, y - 0.2, z], [x, top, z], 0.0242);
    box(0.11, 0.17, 0.012, M.railY, x, y - 0.11, face - s * 0.004, rg);
    for (const dx of [-0.036, 0.036]) for (const dy of [-0.05, 0.05]) cyl(0.011, 0.011, 0.014, M.steel, x + dx, y - 0.11 + dy, face + s * 0.006, rg, 6).rotation.x = Math.PI / 2;
  };
  const span = (a, b, max = 1.5) => { const n = Math.max(1, Math.ceil(Math.abs(b - a) / max)); return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n + (i && i < n ? (rnd() - 0.5) * Math.abs(b - a) / n * 0.45 : 0)); };   // 立柱间距不等：补过、挪过
  { const F = PH + 0.002, zN = STZ + 0.645, zS = STZ - 0.645, zEnd = PZ1 + 0.125, xW = X0 + 0.16, zW = PZ0 - 0.03;
    for (const h of [1.07, 0.53]) {
      const y = F + h, nx = XB - run * 5, low = rise + h, fx = XB + 0.15;
      pickRail(); rail([RX, y, zW], [RX, y, zN]);                            // 北段：一直顶到墙
      { const zm = zS + (zEnd - zS) * (0.35 + rnd() * 0.3); pickRail(); rail([RX, y, zS], [RX, y, zm]); pickRail(); rail([RX, y, zm], [RX, y, zEnd]); elbow([RX, y, zm], 0.03); }   // 南段：中间接过一次，两截不是同一批管子
      pickRail(); rail([RX, y, zEnd], [xW, y, zEnd]);                        // 南头横着封到墙
      elbow([RX, y, zEnd]);
      cyl(0.05, 0.05, 0.008, M.railY, RX, y, PZ0 - 0.012, rg, 14).rotation.x = Math.PI / 2;                    // 两头的墙上法兰
      cyl(0.05, 0.05, 0.008, M.railY, xW, y, zEnd, rg, 14).rotation.z = Math.PI / 2;
      for (const z of [zN, zS]) {
        pickRail(); rail([RX, y, z], [nx, y, z]); rail([nx, y, z], [XB, low, z]); rail([XB, low, z], [fx, low, z]);
        for (const p of [[RX, y, z], [nx, y, z], [XB, low, z], [fx, low, z]]) elbow(p);
      }
    }
    for (const z of span(PZ0 - 0.16, zN)) post(RX, F, z);
    for (const z of span(zS, zEnd)) post(RX, F, z);
    for (const x of span(RX, xW + 0.16, 1.3).slice(1)) post(x, F, zEnd);
    for (const [z, s] of [[zN, 1], [zS, -1]]) {
      post(XB + 0.15, 0, z, rise + 1.07);
      for (const x of [XB - run * 1.5, XB - run * 4.2]) sidePost(x, z, s, nose(x) + 1.07);
    }
    for (const [a, b] of [[zN, zW], [zEnd, zS]]) box(0.008, 0.1, Math.abs(b - a), M.railY, RX + 0.035, F + 0.056, (a + b) / 2, rg);          // 踢脚板：只在楼梯口断开
    box(RX - xW, 0.1, 0.008, M.railY, (RX + xW) / 2, F + 0.056, zEnd - 0.035, rg);
  }
  mergeGroup(rg);
  // 卷帘门
  for (const [z, n] of [[-8, 1]]) {
    plane(3.6, 3.6, pbr(n === 1 ? 'painted_metal_shutter' : 'rusty_metal_shutter', 3.6, 3.6, { size: 2.4, roughness: 0.55, metalness: 0.45, color: 0xa8a8a0 }), X0 + 0.02, PH + 1.8, z, Math.PI / 2, root);
    { const lv = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.4), pbr('DiamondPlate008A', 2.6, 1.4, { size: 1.2, roughness: 0.45, metalness: 0.9, color: 0x9a9a94 })); lv.rotation.set(-Math.PI / 2, 0, Math.PI / 2); lv.position.set(X0 + 1.0, PH + 0.004, z); lv.userData.walk = true; root.add(lv); }   // 卸货口的花纹钢板
    for (const dz of [-1.9, 1.9]) box(0.18, 3.9, 0.2, M.rackRed, X0 + 0.08, PH + 1.95, z + dz, root);
    box(0.5, 0.5, 4.2, M.rackDark, X0 + 0.25, PH + 3.9, z, root);           // 卷轴箱
    box(0.04, 0.12, 3.5, M.yellow, X0 + 0.06, PH + 0.06, z, root);
    plane(1.2, 0.36, lit(textTex([[`DOCK 0${n}`, 50, '#fff', 0.5, 700], ['MAX HEIGHT 3.4 m', 24, 'rgba(255,255,255,.75)', 0.86, 500]], 400, 120, { bg: '#7a2420', age: 0.8 })), X0 + 0.04, PH + 4.5, z, Math.PI / 2, root);
    const dl = new THREE.SpotLight(0xffa855, 17, 7, 0.7, 0.6, 1.4); dl.position.set(X0 + 0.6, PH + 4.3, z); dl.target.position.set(X0 + 2.5, PH, z); root.add(dl, dl.target);
    lightCone(root, [X0 + 0.65, PH + 4.2, z], [1.9, -4.2, 0], { length: 3.6, radius: 1.5, color: 0xffa855, strength: 0.13 });
    cyl(0.12, 0.18, 0.2, M.rackDark, X0 + 0.5, PH + 4.3, z, root, 14).rotation.z = Math.PI / 2;
  }
  for (let z = 2 - 1.5; z > PZ1 + 1; z -= 3.2) {
    decal(rnd() < 0.5 ? 'SurfaceImperfections013' : 'SurfaceImperfections015', root, { pos: [PX + 0.004, 0.35, z + rnd()], rot: [0, Math.PI / 2, 0], w: 2.6, h: 0.7, color: 0x4a5a30, opacity: 0.7 });   // 墙脚青苔
    decal(rnd() < 0.5 ? 'Leaking005' : 'Leaking006', root, { pos: [PX + 0.005, 0.6, z + 1.2 + rnd()], rot: [0, Math.PI / 2, 0], w: 1.2, h: 1.0, color: 0x2a2a22, opacity: 0.6 }); }   // 往下流的水痕
  // 平台上：空的动物运输笼（干草还是新的）、一垛盖着蓝防水布的货
  { const l = new THREE.PointLight(0xe8d8b8, 7, 6, 1.6); l.position.set(-9.4, PH + 3.2, -16.2); root.add(l); }
  for (const [x, z, r] of [[-9.75, -15.15, Math.PI / 2 - 0.06], [-9.8, -16.55, Math.PI / 2 + 0.08], [-11.15, -15.9, Math.PI / 2 + 0.35]]) { placeKit('07_Optional_Empty_Transit_Cage.glb', x, PH, z, r); blob(x, z, 1.0, 1.4, PH + 0.005); }   // 空运输笼 ×3
  placeKit('06_Farm_Sample_Return.glb', -6.0, 0, -27.5, -Math.PI / 2); blob(-6.0, -27.5, 1.0, 1.4);   // 牧场送样与返箱区（道具包）：挪到地面的 02 号门边上
  for (const [z, w] of [[-21, 1.2], [-23, 1.0]]) { box(w, 0.9, 1.0, M.case, -10.4, PH + 0.45, z, root); drape(w + 0.05, 0.94, 1.05, M.tarpBlue, -10.4, PH, z, 0.1, root); }
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
  const coldWall = M.white;                                                // 冷库保温板：白色烤漆钢板（真实扫描，边角起锈、发黄）
  box(CWd, CHt, CDp, coldWall, 0, CHt / 2, 0, cold);
  for (let x = -CWd / 2 + 1.1; x < CWd / 2; x += 1.1) box(0.02, CHt, 0.02, M.rackDark, x, CHt / 2, CDp / 2 + 0.005, cold);
  // 保温板上的脏：顶上冷凝水往下流的水痕、墙根被叉车和推车蹭黑的一圈（真实扫描的贴花）
  for (const [face, len] of [[0, CWd], [1, CDp], [-1, CDp]]) for (let u = -len / 2 + 0.8; u < len / 2 - 0.4; u += 1.6 + rnd() * 0.8) {
    const pos = (y, d) => (face === 0 ? [u, y, CDp / 2 + d] : [face * (CWd / 2 + d), y, u]), rot = [0, face === 0 ? 0 : face * Math.PI / 2, 0];
    decal(['Leaking003', 'Leaking006', 'Leaking008'][Math.floor(rnd() * 3)], cold, { pos: pos(CHt - 1.1, 0.004), rot, w: 0.9 + rnd() * 0.5, h: 2.2, color: 0x6a5e4a, opacity: 0.4 });
    decal(rnd() < 0.5 ? 'SurfaceImperfections013' : 'Scratches001', cold, { pos: pos(0.32, 0.005), rot, w: 1.6, h: 0.6, color: 0x3e3a32, opacity: 0.55 }); }
  box(CWd + 0.1, 0.12, CDp + 0.1, M.steel, 0, CHt + 0.06, 0, cold);
  placeKit('04_Cell_Bank_Handover.glb', -1.5, 0, -27.0 + CDp / 2 + 0.36, 0, (o) => { let pnl = null; o.traverse((c) => { if (!pnl && /Insulated.junction.panel/i.test(c.name)) pnl = c; }); if (!pnl) return; const bb = new THREE.Box3().setFromObject(pnl); pnl.visible = false; o.position.z -= bb.max.z - bb.min.z; o.updateMatrix(); o.updateMatrixWorld(true); }); blob(-1.5, -23.3, 1.6, 1.0);   // 细胞库交接处（道具包）：门、软门帘、库位牌、推车上的液氮罐
  const coldSign = canvasTexture(512, 160, (g, W, H) => { g.fillStyle = '#d8d4c4'; g.fillRect(0, 0, W, H); g.fillStyle = '#1a3a6a'; g.font = `700 60px ${SANS}`; g.textAlign = 'center'; fitText(g, 'COLD STORE · AUTHORISED ONLY', W / 2, 78, W - 30); g.font = `400 28px ${SANS}`; g.fillStyle = '#9a2422'; fitText(g, 'CELL BANK MCB-07 · LN₂ −196 ℃ · OXYGEN DEPLETION RISK', W / 2, 126, W - 30); ageCanvas(g, W, H, { amount: 1.2, seed: 13, drips: false }); });
  plane(2.2, 0.68, lit(coldSign), 0, 3.3, CDp / 2 + 0.02, 0, cold);
  box(0.3, 0.06, 0.2, M.warn, 1.5, 2.85, CDp / 2 + 0.08, cold);
  const warnL = new THREE.PointLight(0xff4020, 2, 4.5, 2); warnL.position.set(1.5, 2.7, CDp / 2 + 0.4); cold.add(warnL);
  const coldLight = new THREE.PointLight(0xb8e0ff, 4, 5, 2); coldLight.position.set(0, 1.4, CDp / 2 + 1.0); cold.add(coldLight);
  const tdisp = canvasTexture(200, 80, (g, W, H) => { g.fillStyle = '#0c0e0e'; g.fillRect(0, 0, W, H); g.fillStyle = '#5ae0ff'; g.font = `700 40px monospace`; g.fillText('O₂ 20.6%', 10, 54); });
  plane(0.3, 0.12, new THREE.MeshBasicMaterial({ map: tdisp }), -1.6, 1.6, CDp / 2 + 0.01, 0, cold);
  box(0.46, 0.6, 0.004, real('Plastic010', 0.3, { color: 0xf2efe6, roughness: 0.8 }), 2.05, 1.5, CDp / 2 + 0.002 + 0.002 + 0.012, cold); for (const [sx, sy] of [[-0.2, 0.27], [0.2, 0.27], [-0.2, -0.27], [0.2, -0.27]]) { const sc = cyl(0.007, 0.007, 0.004, M.steel, 2.05 + sx, 1.5 + sy, CDp / 2 + 0.02, cold, 8); sc.rotation.x = Math.PI / 2; }   // 告示：贴在一块塑料板上，用四颗螺丝钉在一块保温板正中（不跨拼缝）
  plane(0.42, 0.56, lit(textTex([['BEFORE ENTRY', 30, '#1a1a18', 0.2, 700], ['CHECK O₂ LEVEL', 26, '#1a1a18', 0.36, 500], ['≥ 19.5%', 40, '#9a2422', 0.58, 700], ['WEAR CRYO GLOVES', 24, '#1a1a18', 0.8, 500]], 300, 400, { bg: '#e8e0c8', age: 1 })), 2.05, 1.5, CDp / 2 + 0.019, 0, cold);
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

  // ---------------------------------------------------------------- 右后角：04 冷藏货架 / 05 自动出库 / 06 档案区（Warehouse 04–06 道具包，tools/blender/wh_zones.py）
  //   06 贴后墙、两根红柱之间；04 转过来贴右墙（冷冻柜和墙角柱子之间）；05 在前面，滚筒线朝着主通道。三者之间留一条 3 m 的过道
  let atlas = null, dispatch = null;
  placeKit('11_Archive.glb', 5.89, 0, -28.505, 0, (o, g) => {
    const hinge = o.getObjectByName('Atlas_Hinge'); if (!hinge || !g.animations.length) return;
    hinge.traverse((c) => { c.userData.keep = true; });                    // 翻开的封面和书页不能被 batchStatic 合进静态网格
    const mixer = new THREE.AnimationMixer(o), act = mixer.clipAction(g.animations[0]); act.setLoop(THREE.LoopOnce); act.clampWhenFinished = true; act.play(); act.paused = true;
    atlas = { mixer, act, k: 0, to: 0, len: g.animations[0].duration }; mixer.setTime(0);
  }); blob(5.9, -28.6, 4.2, 2.6);
  placeKit('09_Cold_Store.glb', 10.5, 0, -25.76, -Math.PI / 2); blob(10.6, -26.0, 2.6, 4.2);
  // 档案区往右扩到墙角：柱子边两只医疗废物桶；墙上一块软木板钉着老牧场照片、家系图、耳标复印件；
  //   板下一辆不锈钢小推车放着几罐失败的肉样（标本罐），墙角一摞档案箱；桌前一张凳子
  { const steelM = M.steel, yel = pbr('Plastic010', 1.6, 0.6, { size: 0.5, color: 0xe8c430, roughness: 0.55 }), red = pbr('Plastic010', 1.6, 0.1, { size: 0.5, color: 0xb42a22, roughness: 0.5 });
    const bin = canvasTexture(256, 160, (g, W, H) => { g.fillStyle = '#e8c430'; g.fillRect(0, 0, W, H); g.fillStyle = '#141414'; g.font = `800 26px ${SANS}`; g.textAlign = 'center'; g.fillText('CLINICAL WASTE', W / 2, 40); g.font = `600 18px ${SANS}`; g.fillText('FOR INCINERATION ONLY', W / 2, 70);
      g.lineWidth = 7; g.strokeStyle = '#141414'; for (let k = 0; k < 3; k++) { const a = k * 2.094 - 1.57; g.beginPath(); g.arc(W / 2 + Math.cos(a) * 16, 112 + Math.sin(a) * 16, 15, 0, 7); g.stroke(); } g.beginPath(); g.arc(W / 2, 112, 8, 0, 7); g.stroke(); ageCanvas(g, W, H, { amount: 1.2, seed: 4 }); });
    for (const [x, z, r] of [[8.32, -29.66, 0.3], [8.38, -29.02, 1.4]]) {
      cyl(0.25, 0.23, 0.6, yel, x, 0.3, z, root, 24); cyl(0.26, 0.26, 0.05, red, x, 0.625, z, root, 24);
      const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.2505, 0.2505, 0.2, 24, 1, true, r - 0.6, 1.2), new THREE.MeshStandardMaterial({ map: bin, roughness: 0.6 })); lb.position.set(x, 0.32, z); root.add(lb); blob(x, z, 0.8);
    }
    // 软木板
    const cork = canvasTexture(1024, 640, (g, W, H) => { g.fillStyle = '#9c7446'; g.fillRect(0, 0, W, H); for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '60,38,18' : '200,160,110'},${0.15 + Math.random() * 0.3})`; g.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 3, 2 + Math.random() * 2); }
      const paper = (x, y, w, h, a, draw) => { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-w / 2 + 4, -h / 2 + 5, w, h); g.fillStyle = '#ece4cf'; g.fillRect(-w / 2, -h / 2, w, h); draw(-w / 2, -h / 2, w, h); g.fillStyle = '#b8282a'; g.beginPath(); g.arc(0, -h / 2 + 12, 7, 0, 7); g.fill(); g.restore(); };
      paper(560, 330, 300, 380, 0.03, (x, y, w) => { g.fillStyle = '#1d1f22'; g.font = `700 20px ${MONO}`; g.fillText('LINE P-0932 · LINEAGE', x + 18, y + 40); g.strokeStyle = '#1d1f22'; g.lineWidth = 2;
        const nodes = [[w / 2, 90, 'SOW 4471'], [w / 2 - 70, 170, 'P-0932'], [w / 2 + 70, 170, 'P-0933 †'], [w / 2 - 110, 260, 'MCB-07'], [w / 2 - 20, 260, 'WCB-07-3'], [w / 2 - 60, 340, 'B-0417 ?']];
        for (const [a, b] of [[0, 1], [0, 2], [1, 3], [1, 4], [4, 5]]) { g.beginPath(); g.moveTo(x + nodes[a][0], y + nodes[a][1] + 8); g.lineTo(x + nodes[b][0], y + nodes[b][1] - 18); g.stroke(); }
        g.font = `500 16px ${MONO}`; for (const [nx, ny, t] of nodes) { g.strokeRect(x + nx - 52, y + ny - 18, 104, 28); g.fillText(t, x + nx - 46, y + ny + 2); } });
      paper(850, 220, 220, 150, -0.05, (x, y, w) => { g.fillStyle = '#1d1f22'; g.font = `600 17px ${MONO}`; g.fillText('EAR TAG · COPY', x + 14, y + 30); g.fillStyle = '#c9a930'; g.fillRect(x + 30, y + 50, 70, 80); g.fillStyle = '#1d1f22'; g.font = `700 13px ${MONO}`; g.fillText('UK 286071', x + 32, y + 86); g.fillText('00932', x + 44, y + 104); g.font = `400 15px ${MONO}`; g.fillText('culled 03/22', x + 112, y + 100); });
      paper(870, 470, 230, 170, 0.06, (x, y) => { g.fillStyle = '#1c2f66'; g.font = `400 26px "Caveat", cursive`; g.fillText('ask Hale about', x + 16, y + 50); g.fillText('the new gilts —', x + 16, y + 86); g.fillText('need a 2nd donor', x + 16, y + 122); });
      g.strokeStyle = '#b8282a'; g.lineWidth = 3; g.beginPath(); g.moveTo(560, 160); g.quadraticCurveTo(420, 260, 300, 170); g.stroke(); g.beginPath(); g.moveTo(640, 410); g.quadraticCurveTo(760, 380, 850, 160); g.stroke();   // 红线把照片和家系连起来
      ageCanvas(g, W, H, { amount: 0.9, seed: 21, drips: false }); });
    const board = new THREE.Group(); board.position.set(10.6, 1.72, -29.97); root.add(board);
    board.add(new THREE.Mesh(new THREE.BoxGeometry(1.66, 1.06, 0.03), M.rackDark));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshStandardMaterial({ map: cork, roughness: 0.95 })); face.position.z = 0.016; board.add(face);
    [['oldphoto_1.jpg', -0.58, 0.22, 0.24, 0.17, 0.06], ['oldphoto_2.jpg', -0.36, -0.22, 0.152, 0.102, -0.08], ['oldphoto_3.jpg', -0.66, -0.2, 0.152, 0.102, 0.12]].forEach(([f, x, y, w, h, a]) => {
      const t = new THREE.TextureLoader().load('assets/user/' + f); t.colorSpace = THREE.SRGBColorSpace;
      const ph = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, color: 0xe2d6bc })); ph.position.set(x, y, 0.02); ph.rotation.z = a; board.add(ph);
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), new THREE.MeshStandardMaterial({ color: 0xb8282a, roughness: 0.3 })); pin.position.set(x, y + h / 2 - 0.012, 0.026); board.add(pin); });
    // 小推车：两层不锈钢盘，上层四罐失败的肉样、下层一箱档案
    const tr = new THREE.Group(); tr.position.set(9.95, 0, -29.58); root.add(tr);
    for (const y of [0.32, 0.86]) box(0.72, 0.025, 0.46, steelM, 0, y, 0, tr);
    for (const sx of [-0.34, 0.34]) for (const sz of [-0.21, 0.21]) { cyl(0.011, 0.011, 0.86, steelM, sx, 0.47, sz, tr, 8); cyl(0.03, 0.03, 0.025, M.rackDark, sx, 0.035, sz, tr, 12); }
    const jarGlass = new THREE.MeshPhysicalMaterial({ color: 0xf2f4ee, roughness: 0.08, transparent: true, opacity: 0.3, depthWrite: false }), murk = new THREE.MeshStandardMaterial({ color: 0x7a6a42, roughness: 0.2, transparent: true, opacity: 0.55, depthWrite: false }), grey = new THREE.MeshStandardMaterial({ color: 0x5e554a, roughness: 0.75 }), lidM = new THREE.MeshStandardMaterial({ color: 0x3a4a6a, roughness: 0.5 });
    [[-0.24, 0.05], [-0.08, -0.08], [0.09, 0.06], [0.25, -0.05]].forEach(([x, z], i) => { const y = 0.873;
      const gl = cyl(0.05, 0.05, 0.15, jarGlass, x, y + 0.075, z, tr, 24, true); gl.renderOrder = 3; const fl = cyl(0.047, 0.047, 0.11, murk, x, y + 0.057, z, tr, 24); fl.renderOrder = 2;
      const lump = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 9), grey); lump.scale.set(1.1, 0.7 + i * 0.1, 0.9); lump.position.set(x, y + 0.03, z); tr.add(lump); cyl(0.053, 0.053, 0.018, lidM, x, y + 0.159, z, tr, 24); });
    carton(0, 0.3325, 0, 0, 0, 0, 'reuse', 0.04, tr);
    // 墙角一摞档案箱
    for (let i = 0; i < 3; i++) carton(11.45 + (rnd() - 0.5) * 0.06, i * 0.27, -29.62, 0, 0, 0, 'reuse', rnd() * 0.3, root);
    blob(9.95, -29.58, 1.0, 0.7); blob(11.45, -29.6, 0.8, 0.7);
    model('wooden_stool_01', { pos: [5.55, 0, -26.95], rot: 0.5, parent: root });
    // 扩出来的这一段也要有光：软木板上方一盏壁灯
    { const l = new THREE.SpotLight(0xffc890, 9, 4.5, 0.6, 0.6, 1.6); l.position.set(10.6, 2.75, -29.4); l.target.position.set(10.4, 1.2, -29.8); root.add(l, l.target); }
  }
  placeKit('10_Dispatch.glb', 5.6, 0, -22.6, 0, (o) => {
    const box = o.getObjectByName('Dispatch_carton'); if (!box) return;
    box.matrixAutoUpdate = true; box.userData.keep = true; dispatch = { box, x0: box.position.x, t: 0 };
  }); blob(5.8, -22.6, 4.0, 3.0);
  // 扫码门的红色扫描线（纸箱经过时亮）
  const scanLine = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.78), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.25, 0.2), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  scanLine.rotation.x = -Math.PI / 2; scanLine.position.set(5.6 + 1.18, 0.8, -22.6 + 0.18); root.add(scanLine);
  // 三个区各自的灯：档案桌上一盏暖的、冷藏架前一盏冷的、出库线上一盏白的
  for (const [c, i, x, y, z] of [[0xffc48a, 6, 5.8, 2.7, -27.6], [0xcfe6ff, 7, 9.0, 2.9, -26.0], [0xf2f0e6, 6, 5.6, 3.2, -22.2]]) { const l = new THREE.PointLight(c, i, 6, 1.6); l.position.set(x, y, z); root.add(l); }
  model('caged_hanging_light', { pos: [5.8, HT - 1.3, -27.6], parent: root });
  { const s = new THREE.SpotLight(0xffc48a, 22, 9, 0.42, 0.6, 1.5); s.position.set(5.8, HT - 1.6, -27.6); s.target.position.set(5.8, 0.9, -27.9); root.add(s, s.target);
    lightCone(root, [5.8, HT - 1.6, -27.6], [0, -1, -0.04], { length: HT - 2.4, radius: 1.6, top: 0.12, color: 0xffc48a, strength: 0.09 }); }

  // ---------------------------------------------------------------- 前墙：回门店的门、消防栓、配电箱
  box(1.3, 2.4, 0.1, M.rackDark, -1.3, 1.2, Z0 - 0.02, root);
  box(1.1, 2.25, 0.01, real('PaintedMetal012', 1.2, { metalness: 1, color: 0x6a6e6a }), -1.3, 1.13, Z0 - 0.08, root);   // 回门店的铁门：灰漆磨花
  plane(0.8, 0.26, lit(textTex([['←  SHOP', 50, '#fff', 0.7, 700]], 300, 100, { bg: '#1f6a40', age: 0.6 })), -1.3, 2.62, Z0 - 0.08, Math.PI, root);
  box(0.6, 0.8, 0.2, M.fork, 3.4, 1.4, Z0 - 0.12, root);
  box(0.8, 1.1, 0.25, M.panel, 6.2, 1.6, Z0 - 0.14, root);
  for (const x of [-6, -3]) { box(0.6, 0.06, 0.3, M.rackDark, x, 3.2, Z0 - 0.2, root); }

  // ---------------------------------------------------------------- 散落的东西：拉伸膜卷、木托盘垛、纸箱
  for (let i = 0; i < 6; i++) { const y = i * 0.15; pallet(-6.6, y, -18.5 + (rnd() - 0.5) * 0.05); }
  blob(-6.6, -18.5, 1.6);
  for (let i = 0; i < 3; i++) filmRoll(root, -5.6 + i * 0.32, 0, -19.6 + (rnd() - 0.5) * 0.2, i === 1 ? 2 : 0, true);   // 地上横躺着三卷拉伸膜
  for (let i = 0; i < 4; i++) carton(-3.0 + rnd() * 0.8, 0, -14 - i * 1.1, 0, 0, 0, ['supply', 'pkg', 'reuse', 'cooler'][i], rnd() * 3, root, { crush: i === 2 ? 0.04 : 0 });

  // ---------------------------------------------------------------- 脏：墙上的雨水痕 / 锈水 / 返潮，地上的积水，运输笼旁边的血，卸货门上的小窗，铁丝罩壁灯，靠墙的木托盘，铁皮桶
  // （原来整面墙铺的画出来的脏已经去掉：墙上的水痕、锈水全部用真实扫描的 Leaking / Rust 贴花）
  // 地上的积水不再是一张张贴片：积水 / 返潮直接是地面材质里的清漆层（形状按真实瑕疵图打散），和水泥是一体的
  for (const [x, z, sz, r] of [[-9.6, -16.4, 0.9, 0.4], [-10.2, -18.3, 0.6, 2.2]]) userDecal('blood_smear.webp', root, { pos: [x, PH + 0.007, z], rot: [-Math.PI / 2, 0, r], w: sz * 1.6, h: sz * 0.6, color: 0x6a3e3a, roughness: 0.5, opacity: 0.8 });   // 运输笼边上干了的血迹
  for (const z of [-8, -17]) for (const dz of [-1.0, 0, 1.0]) { box(0.02, 0.22, 0.6, M.rackDark, X0 + 0.04, PH + 2.4, z + dz, root); plane(0.52, 0.16, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.45, 0.5, 0.55) }), X0 + 0.055, PH + 2.4, z + dz, Math.PI / 2, root); }   // 卷帘门上的小窗（外面是夜）
  const cagedLamp = (x, y, z, ry) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; root.add(g);
    box(0.14, 0.14, 0.05, M.rackDark, 0, 0, 0, g); cyl(0.07, 0.07, 0.2, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.2, 1.2) }), 0, 0, 0.13, g, 14).rotation.x = Math.PI / 2;
    for (let k = 0; k < 6; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.004, 4, 16), M.rackDark); r.position.set(0, 0, 0.05 + k * 0.04); g.add(r); }
    const l = new THREE.PointLight(0xff9c48, 7.5, 6, 1.6); l.position.set(0, -0.1, 0.4); g.add(l); };
  cagedLamp(X0 + 0.05, PH + 3.0, -9.9, Math.PI / 2); cagedLamp(X0 + 0.05, PH + 3.0, -18.9, Math.PI / 2); cagedLamp(PX + 0.06, PH - 0.3, -1.6, Math.PI / 2);
  for (let i = 0; i < 4; i++) { const g = new THREE.Group(); g.position.set(PX + 0.32 + i * 0.16, 0.6, -6.4 + i * 0.03); g.rotation.set(0, 0, Math.PI / 2 + 0.25); root.add(g); pallet(0, -0.07, 0, g); }   // 靠在平台边上的一摞木托盘
  { const bk = cyl(0.17, 0.14, 0.32, M.steel, -11.2, PH + 0.16, -14.6, root, 18); cyl(0.17, 0.17, 0.01, new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.1 }), -11.2, PH + 0.28, -14.6, root, 18); }
  for (let i = 0; i < 3; i++) tote(-11.3 + (rnd() - 0.5) * 0.04, PH + i * TOTE_H, -12.6, i === 2 ? M.crateBlue : M.crateGrey);   // 平台上一摞周转箱

  // 真实模型：随手堆放的东西（桶、周转箱、手推车、油桶、发电机、吨桶、扫把、旧轮胎、纸箱、湿地警示牌、吊灯）
  for (let i = 0; i < 4; i++) model('plastic_crate_03', { pos: [-3.3 + (i % 2) * 0.5, Math.floor(i / 2) * 0.27, -6.2], rot: (i % 2) * 0.2, jitter: 0.2, parent: root });
  for (let i = 0; i < 3; i++) model('plastic_crate_01', { pos: [-10.6 + i * 0.35, PH, -10.9], rot: 0.1 * i, jitter: 0.3, parent: root });
  model('hand_truck', { pos: [-7.9, 0, -2.6], rot: 1.2, tilt: 0.06, parent: root });
  model('industrial_pastic_container', { pos: [-3.5, 0, -19.9], rot: 0.3, parent: root }); model('industrial_pastic_container', { pos: [-4.1, 0, -20.4], rot: 1.2, parent: root });   // 让开去 02 号门的路
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
  model('security_camera_01', { pos: [X0 + 0.15, PH + 5.0, -12.5], rot: Math.PI / 2, parent: root });
  model('power_box_01', { pos: [7.4, 1.5, Z0 - 0.05], rot: Math.PI, parent: root });
  model('drawer_cabinet', { pos: [PX + 0.27, 0, -13.05], rot: Math.PI / 2, parent: root });          // 值班桌旁的档案柜
  model('wooden_stool_01', { pos: [PX + 1.5, 0, -10.6], rot: 0.7, jitter: 0.3, parent: root });
  model('compost_bags', { pos: [-10.6, PH, -7.6], rot: Math.PI / 2, scale: 0.9, parent: root });     // 平台上一垛原料袋
  model('dustpan', { pos: [-7.6, 0, -8.9], rot: 1.0, parent: root });
  // 警示牌（照片扫描）：叉车通道、小心坠物、易燃、低温
  for (const [n, x, y, z, ry] of [['Sign017', X1 - 0.005, 5.0, -7.5, -Math.PI / 2], ['Sign012', X1 - 0.005, 5.0, -14.0, -Math.PI / 2], ['Sign008', 6.2, 2.0, Z1 + 0.012, 0], ['Sign010', -3.6, 2.4, -24.19, 0], ['Sign017', X0 + 0.005, PH + 4.5, -12.5, Math.PI / 2]]) decal(n, root, { pos: [x, y, z], rot: [0, ry, 0], w: 0.45, h: 0.45, roughness: 0.6 });
  // 地上：叉车漏的油、轮胎碾出来的脏道、拖过的湿痕；铁桶、气瓶底下的锈圈；墙上的漏水
  for (const [x, z, s] of [[-0.3, -8.2, 0.9], [-1.1, -9.0, 0.6], [10.0, -3.1, 1.0], [10.1, -5.5, 0.8], [9.4, -3.6, 0.5], [-3.4, -5.0, 0.5], [-9.4, -12.0, 0.5]]) decal(rnd() < 0.5 ? 'decal_17' : 'decal_18', root, { pos: [x + (rnd() - 0.5) * 0.3, 0.007, z], rot: [-Math.PI / 2, 0, rnd() * 6], w: s, h: s * (0.7 + rnd() * 0.4), color: 0x1a1612, opacity: 0.32, roughness: 0.25 });   // 叉车、搬运车停的地方滴的油（真实扫描的斑点贴花，小片、发亮）
  decal('SurfaceImperfections017', root, { pos: [-1.3, 0.0065, -12], rot: [-Math.PI / 2, 0, Math.PI / 2], w: 26, h: 4, color: 0x24201a, opacity: 0.55 });
  decal('SurfaceImperfections018', root, { pos: [4.0, 0.0065, -20], rot: [-Math.PI / 2, 0, 0.6], w: 6, h: 5, color: 0x24201a, opacity: 0.5 });
  decal('Smear007', root, { pos: [-1.5, 0.0068, -15.5], rot: [-Math.PI / 2, 0, 1.2], w: 3.0, h: 1.8, color: 0x1e1e1a, opacity: 0.25, roughness: 0.1 });
  for (const [x, z, s] of [[-5.3, -22.0, 1.6]]) decal('Rust001', root, { pos: [x, 0.0072, z], rot: [-Math.PI / 2, 0, x], w: s, h: s, opacity: 0.85 });
  for (const [x, k] of [[-7.5, 'Leaking004'], [-1.0, 'Leaking003'], [5.5, 'Leaking005']]) decal(k, root, { pos: [x, 6.4, Z1 + 0.014], w: 2.6, h: 4.0, color: 0x3a3022, opacity: 0.7 });
  for (const [z, k] of [[-3.5, 'Leaking008'], [-14.5, 'Leaking009'], [-22.0, 'Leaking007']]) decal(k, root, { pos: [X1 - 0.002, 0.8, z], rot: [0, -Math.PI / 2, 0], w: 5, h: 1.6, color: 0x2a2620, opacity: 0.7 });
  userDecal('blood_smear.webp', root, { pos: [-10.2, PH + 0.007, -14.3], rot: [-Math.PI / 2, 0, Math.PI / 2 + 0.2], w: 1.8, h: 0.6, color: 0x7a4a46, roughness: 0.55 });   // 运输笼拖到卸货门的血痕
  userDecal('poster_residue.webp', root, { pos: [-3.4, 2.3, Z0 - 0.005], rot: [0, Math.PI, 0], w: 0.9, h: 0.6, mode: 'cut' });
  userDecal('drips.webp', root, { pos: [3.0, 7.3, Z1 + 0.02], w: 3.2, h: 1.6 });

  // ---------------------------------------------------------------- 前墙：通办公室的门（门店办公室后墙那扇铁门的另一面）
  { const OX = -4.8;
    box(1.2, 2.3, 0.12, M.rackDark, OX, 1.15, Z0 - 0.03, root);                    // 门框
    const dm = real('PaintedMetal012', 1.2, { metalness: 1, color: 0x6e7c70, clean: 0xe4e4dc });                 // 灰绿色旧铁门：漆面磨花、边角起锈
    box(1.0, 2.15, 0.012, dm, OX, 1.08, Z0 - 0.095, root);                                       // 灰绿色防火门
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
    floorText(txt, cx - w / 2 + 0.3, cz, 2.4, 0.26, 'w', -Math.PI / 2);
  }
  { const a = slotG(5.35, -2.0, 0.08); pallet(0, 0, 0, a); wrapStack(a, 0, 0.15, kit.stackPallet(a, 0, 0.15, 'pkg', { maxH: 1.1, mixed: 0.6 })); blob(5.35, -2.0, 1.5, 1.3);
    const b = slotG(6.7, -2.15, -0.12); pallet(0, 0, 0, b); loads.wrapped(b, 0, 0.15); blob(6.7, -2.15, 1.5, 1.3);
    const c = slotG(5.4, -5.1, -0.05); pallet(0, 0, 0, c); wrapStack(c, 0, 0.15, kit.stackPallet(c, 0, 0.15, 'supply', { maxH: 0.55, mixed: 0.3 }), { film: false }); blob(5.4, -5.1, 1.5, 1.3);
    const d = slotG(6.75, -5.3, 0.2); pallet(0, 0, 0, d); carton(0.2, 0.15, 0.05, 0, 0, 0, 'cooler', 0.3, d, { design: 'eps' }); carton(-0.3, 0.15, -0.15, 0, 0, 0, 'fbs', -0.2, d, { design: 'dryice', open: true }); blob(6.75, -5.3, 1.5, 1.3);
    for (let i = 0; i < 3; i++) { const t = tote(6.25 + i * 0.02, i * TOTE_H, -6.3, M.crateBlue, root); t.rotation.y = 0.3 + (rnd() - 0.5) * 0.1; } }   // 地上一摞周转箱

  // 转盘式缠膜机（参照常见的低位转盘机型实测尺寸：转盘 Ø 1650 × 85 mm，立柱 200 × 220 mm、高约 2.7 m，
  //   膜架装在立柱上上下走，里面竖着一卷 500 mm 的机用膜、两根预拉伸胶辊；控制箱挂在立柱侧面朝操作位；
  //   前面一块花纹钢板坡道给搬运车推托盘上去；电缆从屋架上吊下来接到立柱顶）
  //   转盘上一托货缠到一半，膜从胶辊拉到货的一个角上
  { const wg = new THREE.Group(); wg.position.set(6.0, 0, -9.4); wg.rotation.y = 0.15; root.add(wg);
    const TR = 0.825, MX = 1.27, MH = 2.6;
    const dia = pbr('DiamondPlate008A', 1, 1, { metalness: 0.55, roughness: 1, color: 0xc4c4bc, envMapIntensity: 1.4 }); dia.userData.meters = 0.6;
    cyl(TR + 0.02, TR + 0.045, 0.06, M.blue, 0, 0.03, 0, wg, 56);                              // 转盘底座圈
    rbox(0.9, 0.08, 0.6, 0.015, M.blue, (TR + MX) / 2 + 0.06, 0.04, 0, wg);                   // 尾座：底座伸到立柱
    { const pl = new THREE.Mesh(uvMeters(new THREE.CylinderGeometry(TR, TR, 0.022, 56), 0.6), dia); pl.position.y = 0.074; wg.add(pl); }   // 花纹钢板转盘面
    cyl(TR + 0.006, TR + 0.006, 0.028, M.rackDark, 0, 0.056, 0, wg, 56);                       // 转盘边圈
    { const sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0, 0.085), new THREE.Vector2(0.05, 0.085), new THREE.Vector2(0.72, 0.004), new THREE.Vector2(0.72, 0)]);   // 坡道：从地面 4 mm 升到转盘面 85 mm
      const rg = new THREE.ExtrudeGeometry(sh, { depth: 1.1, bevelEnabled: false }); rg.rotateY(-Math.PI / 2); rg.translate(0.55, 0, TR - 0.06); rg.computeVertexNormals(); wg.add(new THREE.Mesh(uvMeters(rg, 0.6), dia)); }
    rbox(0.52, 0.1, 0.5, 0.02, M.blue, MX, 0.05, 0, wg);                                        // 立柱底座
    rbox(0.2, MH, 0.22, 0.012, M.blue, MX, 0.1 + MH / 2, 0, wg);                                // 立柱
    box(0.012, MH - 0.35, 0.1, M.rackDark, MX - 0.106, 0.3 + (MH - 0.35) / 2, 0, wg);            // 立柱正面的导轨槽
    rbox(0.26, 0.05, 0.28, 0.01, M.blue, MX, 0.1 + MH + 0.025, 0, wg);                          // 顶盖
    cyl(0.04, 0.045, 0.05, M.rackDark, MX, MH + 0.18, 0, wg, 14);                                // 警示灯座
    cyl(0.04, 0.04, 0.09, new THREE.MeshPhysicalMaterial({ color: 0xe88a20, roughness: 0.3, transparent: true, opacity: 0.85, emissive: 0x401800 }), MX, MH + 0.25, 0, wg, 16);   // 橙色警示灯罩
    { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(MX + 0.05, MH + 0.13, -0.08), new THREE.Vector3(MX + 0.12, MH + 0.6, -0.1), new THREE.Vector3(MX + 0.1, HT - 1.6, -0.05), new THREE.Vector3(MX + 0.1, HT - 0.95, 0)]);
      const t = new THREE.TubeGeometry(c, 20, 0.011, 6); const U = t.attributes.uv; for (let i = 0; i < U.count; i++) U.setXY(i, U.getX(i) * 6 / 0.25, U.getY(i) * 0.07 / 0.25); wg.add(new THREE.Mesh(t, M.tyre)); }   // 从屋架上吊下来的电缆
    // 膜架：背板、上下托板、竖着的一卷膜、两根预拉伸胶辊 + 一根导向辊、顶上的齿轮罩和电机
    const cg = new THREE.Group(); cg.position.set(MX - 0.11, 0.95, 0); wg.add(cg);
    rbox(0.07, 0.72, 0.44, 0.01, M.grey, -0.035, 0, 0, cg);
    for (const y of [-0.34, 0.34]) rbox(0.46, 0.035, 0.44, 0.008, M.grey, -0.26, y, 0, cg);
    { const r = new THREE.Mesh(rollGeos[1], filmM); r.position.set(-0.33, -0.322, 0.08); cg.add(r); const c = new THREE.Mesh(coreGeo, coreM); c.position.set(-0.33, -0.072, 0.08); cg.add(c); }
    for (const [rx, rz, m] of [[-0.15, -0.13, M.tyre], [-0.08, -0.04, M.tyre], [-0.44, -0.15, M.steel]]) cyl(0.038, 0.038, 0.62, m, rx, 0, rz, cg, 16);
    rbox(0.3, 0.12, 0.3, 0.012, M.grey, -0.17, 0.42, -0.06, cg);
    { const mo = cyl(0.055, 0.055, 0.15, M.rackDark, -0.1, 0.42, 0.16, cg, 14); mo.rotation.x = Math.PI / 2; }
    rbox(0.06, 0.1, 0.1, 0.01, M.grey, 0.03, 0, 0.17, cg);                                     // 滑块（卡在导轨上）
    // 控制箱：挂在立柱朝操作位那一面，主电源旋钮、急停、三个按钮、一块小屏
    const pz = 0.11 + 0.09;
    rbox(0.36, 0.46, 0.18, 0.014, M.grey, MX, 1.28, pz, wg);
    plane(0.32, 0.42, lit(printed('Paper006', 256, 336, (g, W, H) => { g.fillStyle = '#e8c832'; g.fillRect(0, 0, W, 54); g.fillStyle = '#1a1a1a'; g.textAlign = 'center'; g.font = `800 26px ${SANS}`; g.fillText('WRAP-01', W / 2, 36);
      g.font = `700 13px ${SANS}`; g.fillText('MAIN', 56, 128); g.fillText('E-STOP', 192, 128); g.fillText('START', 48, 300); g.fillText('STOP', 128, 300); g.fillText('TOP SHEET', 208, 300); g.font = `600 12px ${SANS}`; g.fillText('PRE-STRETCH 250 % · 12 rpm', W / 2, 232); }), { roughness: 0.7 }), MX, 1.28, pz + 0.0905, 0, wg);
    const btn = (x, y, r, h, col) => { const b = cyl(r, r, h, real('Plastic010', 0.2, { color: col, roughness: 0.7 }), MX + x, 1.28 + y, pz + 0.09 + h / 2, wg, 16); b.rotation.x = Math.PI / 2; return b; };
    btn(0.09, 0.07, 0.042, 0.006, 0xe8c020); btn(0.09, 0.07, 0.03, 0.03, 0xc01e14);               // 急停：黄底红蘑菇头
    btn(-0.09, 0.07, 0.035, 0.012, 0x9a9a96); box(0.012, 0.05, 0.02, real('Plastic010', 0.2, { color: 0xb01a10 }), MX - 0.09, 1.35, pz + 0.11, wg);   // 主电源旋钮
    [[-0.1, 0x2a8a3a], [0, 0x1a1a1a], [0.1, 0x2a5aa0]].forEach(([x, c]) => btn(x, -0.12, 0.016, 0.014, c));
    plane(0.12, 0.05, new THREE.MeshBasicMaterial({ map: canvasTexture(192, 80, (g, W, H) => { g.fillStyle = '#0c1210'; g.fillRect(0, 0, W, H); g.fillStyle = '#6ee08a'; g.font = '700 30px monospace'; g.fillText('CYCLE 3/5', 10, 50); }) }), MX, 1.25, pz + 0.091, 0, wg);
    { const np = new THREE.Group(); np.position.set(MX + 0.101, 1.86, 0); np.rotation.y = Math.PI / 2; wg.add(np);   // 立柱侧面的铭牌：拉丝铝板 + 四颗铆钉（型号、电源、出厂编号）
      box(0.2, 0.12, 0.003, M.steel, 0, 0, 0, np);
      plane(0.19, 0.11, lit(printed('Metal009', 380, 220, (g, W, H) => { g.fillStyle = '#1a1a1a'; g.textAlign = 'left'; g.font = `800 34px ${SANS}`; g.fillText('STRETCH WRAPPER', 16, 46); g.font = `600 22px ${MONO}`;
        ['MODEL  TW-1650', '400 V · 3 PH · 50 Hz · 1.5 kW', 'SN  2019-04471', 'MAX LOAD  2000 kg'].forEach((t, k) => { g.font = `600 22px ${MONO}`; fitText(g, t, 16, 90 + k * 32, W - 34); }); }), { roughness: 0.5, metalness: 0.6 }), 0, 0, 0.0016, 0, np);
      for (const [sx, sy] of [[-0.09, 0.05], [0.09, 0.05], [-0.09, -0.05], [0.09, -0.05]]) { const r = cyl(0.004, 0.004, 0.003, M.steel, sx, sy, 0.003, np, 8); r.rotation.x = Math.PI / 2; } }
    // 转盘上的货：缠了一大半，膜从胶辊拉到货的一个角
    const pg = new THREE.Group(); pg.position.set(0, 0.086, 0); pg.rotation.y = 0.45; wg.add(pg);
    pallet(0, 0, 0, pg); wrapStack(pg, 0, 0.15, kit.stackPallet(pg, 0, 0.15, 'brand', { maxH: 1.1, mixed: 0.45 }), { film: false });   // 缠之前已经压了胶带、写了托号
    { const wb = new THREE.Mesh(uvMeters(new RoundedBoxGeometry(1.22, 1.06, 1.05, 3, 0.05), 0.45), M.wrap); wb.position.set(0, 0.12 + 0.53, 0); pg.add(wb); }   // 缠好的那一截膜（四角是圆的，膜绷在货上）
    { const a = new THREE.Vector3(MX - 0.11 - 0.44, 0.95, -0.15), b = new THREE.Vector3(0.6, 0, -0.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.45); b.y = 0.95; const L = a.distanceTo(b);
      const w = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.5), M.wrap); w.position.copy(a).add(b).multiplyScalar(0.5); w.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x); wg.add(w); }   // 拉着的那一段膜
    mergeGroup(wg);
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
    rbox(0.78, 1.93, 0.82, 0.02, M.white, 0.75, 0.04 + 0.965, -0.55, cg); box(0.76, 0.04, 0.78, M.rackDark, 0.75, 0.02, -0.55, cg);   // 机身（白色烤漆，真实扫描：发黄、边角起锈）+ 底座
    box(0.74, 0.006, 0.01, M.rackDark, 0.75, 1.62, -0.137, cg);                                                                      // 门缝
    for (let i = 0; i < 7; i++) box(0.6, 0.012, 0.012, M.rackDark, 0.75, 0.1 + i * 0.03, -0.136, cg);                                // 压缩机进风百叶
    plane(0.3, 0.1, new THREE.MeshBasicMaterial({ map: canvasTexture(240, 80, (g, W, H) => { g.fillStyle = '#101414'; g.fillRect(0, 0, W, H); g.fillStyle = '#6ee0a0'; g.font = '700 46px monospace'; g.fillText('-80.4', 20, 58); g.font = '700 20px monospace'; g.fillText('°C', 178, 40); }) }), 0.75, 1.78, -0.138, 0, cg);
    plane(0.5, 0.26, lit(printed('Paper006', 320, 166, (g, W, H) => { g.fillStyle = '#1a3a6a'; g.textAlign = 'left'; g.font = `800 30px ${SANS}`; g.fillText('ULT FREEZER  −80 ℃', 14, 40); g.fillStyle = '#1a1a1a'; g.font = `600 19px ${SANS}`; ['SHELF 1  FGF2 · TGF-β', 'SHELF 2  B-0417 · P-0932', 'SHELF 3  P-1077 (NEW LINE)'].forEach((t, k) => g.fillText(t, 14, 78 + k * 30)); }, [['Fingerprints002', [60, 50, 40], 0.5, 0.6, 0.4, 0.4, 0.6]]), { roughness: 0.8 }), 0.75, 1.3, -0.138, 0, cg);
    box(0.04, 0.5, 0.05, M.steel, 0.4, 1.1, -0.12, cg);
    // 铁丝货架：几盒小箱子、一只泡沫箱
    for (const [x, z] of [[-1.25, -0.88], [-0.15, -0.88], [-1.25, -0.42], [-0.15, -0.42]]) box(0.03, 1.8, 0.03, M.steel, x, 0.9, z, cg);
    for (const y of [0.15, 0.75, 1.35]) { box(1.14, 0.02, 0.48, M.steel, -0.7, y, -0.65, cg); }
    kit.add(cg, -1.0, 0.16, -0.66, { design: 'tips', ry: 0.05 }); kit.add(cg, -0.42, 0.16, -0.64, { design: 'thermal', ry: -0.1 });
    kit.add(cg, -0.95, 0.76, -0.66, { design: 'dryice', ry: 0.1, size: [0.36, 0.3, 0.36] }); kit.add(cg, -0.4, 0.76, -0.66, { design: 'media', ry: -0.06, size: [0.4, 0.26, 0.32] });
    kit.add(cg, -0.75, 1.36, -0.66, { design: 'glove', ry: 0.2 });
    kit.add(cg, 0.2, 0, 0.55, { design: 'eps', ry: 0.4 });
    blob(6.0, -15.9, 3.2, 2.6); }

  // ================================================================ 地面细节：补过的水泥块、裂缝、叉车轮胎印、月台根下的排水沟、通道上掉的东西
  // 补过的水泥块：真实扫描的路面修补贴花（AsphaltDamage001），压暗一点贴近这块地的颜色
  for (const [x, z, w, d, r] of [[-1.2, -5.6, 2.2, 1.4, 0.05], [-3.2, -12.8, 1.6, 1.6, 1.6], [0.4, -18.4, 2.6, 1.2, 3.1], [8.6, -6.2, 1.4, 2.0, 0.02], [-5.6, -20.6, 1.8, 1.2, 4.7]]) decal('AsphaltDamage001', root, { pos: [x, 0.0062, z], rot: [-Math.PI / 2, 0, r], w, h: d, color: 0x9a968c, opacity: 0.75, roughness: 0.9 });
  // 叉车轮子带进来的泥印：真实扫描的胎纹（TireTracks001），两条一组、沿着车走的方向铺开，两头渐渐淡掉
  { const tt = new THREE.TextureLoader(); const tAlpha = tt.load('assets/ph/decal/TireTracks001/opacity.jpg'); tAlpha.wrapS = tAlpha.wrapT = THREE.RepeatWrapping; tAlpha.colorSpace = THREE.NoColorSpace; tAlpha.anisotropy = 8;
    const tm = new THREE.MeshStandardMaterial({ color: 0x2a2620, alphaMap: tAlpha, transparent: true, opacity: 0.55, roughness: 0.95, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, vertexColors: true });
    const track = (x, z, len, ry, gauge = 0.9) => { const geos = [];
      for (const off of [-gauge / 2, gauge / 2]) { const g = new THREE.PlaneGeometry(len, 0.2, 16, 1); const U = g.attributes.uv, P = g.attributes.position, col = new Float32Array(P.count * 4);
        for (let i = 0; i < P.count; i++) { U.setX(i, U.getX(i) * len / 0.8); const t = (P.getX(i) + len / 2) / len, a = Math.min(1, t * 4, (1 - t) * 3) * (0.6 + 0.4 * Math.sin(t * 9 + off * 7)); col.set([1, 1, 1, Math.max(0, a)], i * 4); }
        g.setAttribute('color', new THREE.BufferAttribute(col, 4)); g.translate(0, off, 0); geos.push(g); }
      const m = new THREE.Mesh(mergeGeometries(geos), tm); m.rotation.set(-Math.PI / 2, 0, ry); m.position.set(x, 0.0058, z); root.add(m); };
    for (const [x, z, len, ry] of [[-0.6, -5.4, 5.5, 1.45], [-1.8, -11.2, 6.0, 1.62], [0.4, -13.0, 4.0, 1.3], [-2.2, -2.4, 4.5, 1.52], [4.0, -8.6, 3.2, 0.25], [8.4, -4.2, 3.0, 0.05]]) track(x, z, len, ry); }
  // 排水沟：月台根下一条，暗槽 + 镀锌格栅（台阶、档案柜那里断开）
  { const grM = pbr('MetalWalkway011', 1, 1, { metalness: 1, roughness: 1, color: 0xb0b2aa });   // 镀锌钢格栅（真实扫描，带透明度）
    const dark = new THREE.MeshStandardMaterial({ color: 0x0c0b0a, roughness: 0.4 });
    for (const [z0, z1] of [[1.8, -3.45], [-4.95, -12.45], [-13.65, -25.8]]) { const L = z0 - z1, zc = (z0 + z1) / 2;
      const ch = new THREE.Mesh(new THREE.PlaneGeometry(0.2, L), dark); ch.rotation.x = -Math.PI / 2; ch.position.set(PX + 0.11, 0.003, zc); ch.userData.walk = true; root.add(ch);
      const gm = grM.clone(); for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap']) if (gm[k]) { gm[k] = gm[k].clone(); gm[k].repeat.set(0.2 / 0.6, L / 0.6); gm[k].needsUpdate = true; } gm.side = THREE.FrontSide;
      const gr = new THREE.Mesh(new THREE.PlaneGeometry(0.2, L), gm); gr.rotation.x = -Math.PI / 2; gr.position.set(PX + 0.11, 0.007, zc); gr.userData.walk = true; root.add(gr);
      for (const dx of [0.005, 0.215]) box(0.012, 0.012, L, M.steel, PX + dx, 0.006, zc, root); } }
  // 通道上掉的：揉成团的拉伸膜、撕下来的标签纸、一截断了的托盘板
  for (const [x, z] of [[1.2, -6.8], [-2.9, -14.4], [3.9, -4.2], [0.3, -16.2]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), M.wrap); b.scale.set(1.4, 0.45, 1.1); b.position.set(x, 0.05, z); b.rotation.y = rnd() * 3; root.add(b); }
  for (const [x, z, r] of [[1.0, -9.9, 0.4], [-0.9, -4.6, 2.1], [4.2, -11.2, 1.0]]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.15), new THREE.MeshStandardMaterial({ color: 0xece8dc, roughness: 0.9 })); l.rotation.set(-Math.PI / 2, 0, r); l.position.set(x, 0.006, z); root.add(l); }
  { const bd = box(1.0, 0.022, 0.14, M.pallet, 1.4, 0.011, -13.3, root); bd.rotation.y = 0.5; const bd2 = box(0.45, 0.022, 0.14, M.pallet, 1.95, 0.011, -13.7, root); bd2.rotation.y = 0.8; }
  // ================================================================ 02 号门：地面上的大卷帘门，拉起来一半，门外是下着雨的后巷（和店外那一页同一个雨夜）
  let rainTex = null;
  { const D0 = -10.8, D1 = -7.2, DH = 4.2, OPEN = 1.5, cx = (D0 + D1) / 2;
    for (const x of [D0 - 0.08, D1 + 0.08]) { box(0.16, DH + 0.3, 0.32, M.rackRed, x, (DH + 0.3) / 2, Z1 + 0.12, root); box(0.06, DH, 0.1, M.steel, x + (x < cx ? 0.11 : -0.11), DH / 2, Z1 + 0.06, root); }   // 门框柱 + 导轨
    box(D1 - D0 + 0.4, 0.3, 0.32, M.rackRed, cx, DH + 0.15, Z1 + 0.12, root);
    box(D1 - D0 + 0.2, 0.55, 0.55, M.rackDark, cx, DH + 0.55, Z1 + 0.35, root);                                    // 卷轴箱
    const sh = plane(D1 - D0, DH - OPEN, pbr('rusty_metal_shutter', D1 - D0, DH - OPEN, { size: 2.4, roughness: 0.55, metalness: 0.45, color: 0xa8a8a0 }), cx, (DH + OPEN) / 2, Z1 + 0.04, 0, root);
    box(D1 - D0 - 0.02, 0.08, 0.06, M.steel, cx, OPEN + 0.04, Z1 + 0.05, root); box(0.3, 0.03, 0.06, M.rackDark, cx, OPEN + 0.12, Z1 + 0.09, root);   // 底梁 + 拉手
    plane(1.4, 1.0, new THREE.MeshStandardMaterial({ map: paintedText('02', { W: 512, H: 360, size: 300, color: 'rgba(150,40,30,.88)' }), transparent: true, roughness: 0.7, depthWrite: false }), cx + 0.6, 3.2, Z1 + 0.045, 0, root);   // 门上刷的大号“02”
    plane(1.2, 0.36, lit(textTex([['DOOR 02 · GROUND LEVEL', 34, '#fff', 0.5, 800], ['NO PARKING · KEEP CLEAR', 22, 'rgba(255,255,255,.75)', 0.84, 500]], 420, 120, { bg: '#7a2420', age: 0.8 })), cx, DH + 1.1, Z1 + 0.03, 0, root);
    floorHazard(cx, Z1 + 0.5, D1 - D0, 0.5);
    floorText('KEEP CLEAR', cx, Z1 + 1.6, 2.6, 0.38, 'w');
    // 雨从门底下飘进来、地上湿了一片：在地面材质的清漆层里（见地面那一段）
    // 门外：湿的柏油地、对面的旧楼和路灯（自己画的）、一层会动的雨丝
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), pbr('asphalt_02', 16, 14, { size: 3, roughness: 0.32, color: 0x1a1c20, envMapIntensity: 0.25 })); ground.rotation.x = -Math.PI / 2; ground.position.set(cx, -0.02, Z1 - 7.2); root.add(ground);
    const alley = canvasTexture(1024, 512, (g, W, H) => { const r = R(93); const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#0c1420'); sky.addColorStop(1, '#1c242c'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
      g.fillStyle = '#20242a'; g.fillRect(0, 120, W, H - 120); for (let y = 150; y < H - 60; y += 70) for (let x = 30; x < W; x += 110) { const lit = r() < 0.3; g.fillStyle = lit ? `rgba(255,${190 + r() * 40 | 0},120,.75)` : 'rgba(40,46,54,1)'; g.fillRect(x, y, 48, 38); }
      const lamp = g.createRadialGradient(W * 0.7, 210, 4, W * 0.7, 210, 260); lamp.addColorStop(0, 'rgba(255,200,130,.8)'); lamp.addColorStop(1, 'rgba(255,200,130,0)'); g.fillStyle = lamp; g.fillRect(0, 0, W, H);
      g.fillStyle = '#ffe2b0'; g.beginPath(); g.arc(W * 0.7, 210, 6, 0, 7); g.fill(); g.fillStyle = '#0e1014'; g.fillRect(W * 0.7 - 3, 214, 6, H); g.fillRect(0, H - 60, W, 60);
      g.fillStyle = 'rgba(180,190,200,.12)'; for (let i = 0; i < 400; i++) g.fillRect(r() * W, r() * H, 1, 8 + r() * 20); });
    { const refl = canvasTexture(64, 256, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,190,110,.55)'); gr.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = gr; for (let y = 0; y < H; y += 3) g.fillRect(W / 2 - 6 - Math.random() * 10, y, 12 + Math.random() * 20, 2); });   // 路灯在湿地上拉出来的一道倒影
      const rf = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 9), new THREE.MeshBasicMaterial({ map: refl, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); rf.rotation.x = -Math.PI / 2; rf.position.set(cx + 2.0, -0.01, Z1 - 8.5); root.add(rf); }
    const bd = new THREE.Mesh(new THREE.PlaneGeometry(26, 13), new THREE.MeshBasicMaterial({ map: alley, toneMapped: false, color: new THREE.Color(0.55, 0.55, 0.6), fog: false })); bd.position.set(cx, 6.0, Z1 - 13.5); root.add(bd);
    rainTex = canvasTexture(256, 512, (g, W, H) => { g.clearRect(0, 0, W, H); const r = R(94); for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(200,210,220,${0.15 + r() * 0.35})`; g.lineWidth = 1; const x = r() * W, y = r() * H, l = 20 + r() * 40; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y + l); g.stroke(); } }, { repeat: [2, 1] });
    const rain = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), new THREE.MeshBasicMaterial({ map: rainTex, transparent: true, depthWrite: false, opacity: 0.3, fog: false })); rain.position.set(cx, 2.4, Z1 - 1.2); root.add(rain);
    const outL = new THREE.PointLight(0x8aa0c0, 1.2, 5, 1.6); outL.position.set(cx, 1.0, Z1 - 1.5); root.add(outL); }   // 门外的冷光照进来一点

  // ================================================================ 右墙（原来的 C 排货架）：叉车充电区、笼车、平板推车，靠里是员工休息角
  { // 壁挂式叉车充电机（48 V / 80 A 一类，约 420 × 600 × 300 mm）：灰漆钣金、两侧百叶、前面板有铭牌和指示灯，底下出线接到叉车的插头
    const chargerLabel = lit(printed('Paper006', 256, 160, (g, W, H) => { g.fillStyle = '#1a1a1a'; g.textAlign = 'left'; g.font = `800 30px ${SANS}`; g.fillText('CHARGER', 16, 44); g.font = `600 20px ${SANS}`; g.fillText('48 V · 80 A · IP21', 16, 76); g.fillText('LEAD-ACID / Li-ION', 16, 104); g.font = `500 15px ${MONO}`; g.fillText('SN 26-0418  ·  BAY 1', 16, 138); }), { roughness: 0.7 });
    const ledG = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 2.2, 0.5) }), ledA = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.2, 0.2) });
    const plugM = real('Plastic010', 0.2, { color: 0xb02a20, roughness: 0.6 });
    for (const [z, k] of [[-3.0, 0], [-5.4, 1]]) {
      placeKit('08_Logistics_Forklift.glb', 10.35, 0, z, -Math.PI / 2 + (k ? 0.05 : -0.04), null, 1.3); blob(10.0, z, 3.4, 1.8);
      const cgp = slotG(X1 - 0.17, z, -Math.PI / 2);
      rbox(0.42, 0.6, 0.3, 0.012, M.grey, 0, 1.5, 0, cgp);
      plane(0.22, 0.14, chargerLabel, -0.06, 1.62, 0.151, 0, cgp);
      for (const [lx, lm] of [[0.1, ledG], [0.15, k ? ledA : ledG]]) { const l = cyl(0.009, 0.009, 0.006, lm, lx, 1.66, 0.152, cgp, 10); l.rotation.x = Math.PI / 2; }
      for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) { const v = box(0.004, 0.012, 0.18, M.rackDark, sx * 0.212, 1.36 + i * 0.03, 0, cgp); v.rotation.z = sx * 0.4; }   // 两侧百叶
      cyl(0.02, 0.02, 0.04, M.rackDark, 0.1, 1.18, 0.05, cgp, 10);                                                                 // 出线的电缆接头
      const cable = new THREE.CatmullRomCurve3([new THREE.Vector3(X1 - 0.2, 1.16, z + 0.1), new THREE.Vector3(X1 - 0.24, 0.5, z + 0.32), new THREE.Vector3(X1 - 0.4, 0.035, z + 0.3), new THREE.Vector3(11.2, 0.035, z + 0.05), new THREE.Vector3(11.0, 0.3, z - 0.05), new THREE.Vector3(10.95, 0.55, z)]);
      const tg = new THREE.TubeGeometry(cable, 32, 0.016, 8); const U = tg.attributes.uv; for (let i = 0; i < U.count; i++) U.setXY(i, U.getX(i) * 2.4 / 0.25, U.getY(i) * 0.1 / 0.25); root.add(new THREE.Mesh(tg, M.tyre));
      rbox(0.1, 0.07, 0.09, 0.01, plugM, 10.95, 0.58, z, root); }                                                                   // 插在叉车上的红色充电插头
    for (const [cz] of [[-3.0], [-5.4]]) { line(8.0, cz, 0.08, 2.2); }
    line(9.95, -1.85, 3.9, 0.08); line(9.95, -4.2, 3.9, 0.08); line(9.95, -6.55, 3.9, 0.08);
    floorText('CHARGING ONLY', 8.5, -4.2, 3.6, 0.3, 'y', -Math.PI / 2);
    // 笼车（物流笼车约 800 × 700 × 1700 mm）：镀锌焊接网（50 mm 网格、Ø 4 mm 钢丝）、底下四个 Ø 100 小轮，里面胡乱塞着箱子和袋子
    const meshT = canvasTexture(128, 128, (g, W, H) => { g.clearRect(0, 0, W, H); g.strokeStyle = '#fff'; g.lineWidth = 6; for (let i = 0; i <= W; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, H); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(W, i); g.stroke(); } });
    meshT.colorSpace = THREE.NoColorSpace;
    const meshM = (w, h) => { const t = meshT.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 0.1, h / 0.1); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ alphaMap: t, alphaTest: 0.5, color: 0xb8bab4, metalness: 0.85, roughness: 0.55, side: THREE.DoubleSide }); };
    const rollCage = (x, z, ry) => { const g = slotG(x, z, ry); const W = 0.8, D = 0.7, Hh = 1.7;
      box(W, 0.05, D, M.galv, 0, 0.17, 0, g); for (const [dx, dz] of [[-0.33, -0.28], [0.33, -0.28], [-0.33, 0.28], [0.33, 0.28]]) { const w = cyl(0.05, 0.05, 0.035, M.tyre, dx, 0.055, dz, g, 14); w.rotation.x = Math.PI / 2; box(0.05, 0.09, 0.05, M.galv, dx, 0.125, dz, g); }
      for (const [w, px, pz, ry2] of [[W, 0, -D / 2, 0], [D, -W / 2, 0, Math.PI / 2], [D, W / 2, 0, Math.PI / 2]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, Hh - 0.2), meshM(w, Hh - 0.2)); m.position.set(px, 0.2 + (Hh - 0.2) / 2, pz); m.rotation.y = ry2; g.add(m); }
      for (const [px, pz] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) cyl(0.014, 0.014, Hh - 0.15, M.galv, px, 0.2 + (Hh - 0.15) / 2, pz, g, 8);
      kit.add(g, -0.15, 0.2, -0.1, { kind: 'pkg', ry: 0.1 }); kit.add(g, 0.18, 0.2, 0.12, { kind: 'reuse', ry: -0.2, open: rnd() < 0.5 }); kit.add(g, 0.0, 0.52, -0.05, { kind: 'supply', ry: 0.3 }); sack(g, 0.18, 0.2, -0.12);
      blob(x, z, 1.0, 0.9); return g; };
    rollCage(11.05, -8.3, -0.05); rollCage(11.1, -9.25, 0.08); rollCage(10.15, -8.9, 0.45);
    // 平板推车（1000 × 600 mm 钢板车，蓝漆磨花）：U 形把手、四个 Ø 125 橡胶轮，上面一摞箱子
    { const pt = slotG(9.15, -8.2, 0.35);
      rbox(1.0, 0.035, 0.6, 0.008, M.blue, 0, 0.165, 0, pt); for (const [dx, dz] of [[-0.42, -0.24], [0.42, -0.24], [-0.42, 0.24], [0.42, 0.24]]) { const w = cyl(0.0625, 0.0625, 0.035, M.tyre, dx, 0.0625, dz, pt, 16); w.rotation.x = Math.PI / 2; box(0.04, 0.06, 0.05, M.galv, dx, 0.12, dz, pt); }
      for (const dz of [-0.26, 0.26]) cyl(0.014, 0.014, 0.85, M.steel, -0.48, 0.6, dz, pt, 10); { const t = cyl(0.014, 0.014, 0.52, M.steel, -0.48, 1.02, 0, pt, 10); t.rotation.x = Math.PI / 2; }
      let yy = 0.183; for (let i = 0; i < 3; i++) { const b = kit.add(pt, 0.08 + (rnd() - 0.5) * 0.08, yy, (rnd() - 0.5) * 0.06, { kind: i === 2 ? 'reuse' : 'pkg', ry: (rnd() - 0.5) * 0.3 }); yy += b.h; }
      mergeGroup(pt); blob(9.15, -8.2, 1.3, 0.9); }

    // ---- 休息角：旧的钢制办公桌（1300 × 650、高 750 mm，灰绿漆、浅灰贴面磨花）、两把折叠椅（铁管掉漆、木板发黑），搪瓷杯、笔筒、胶带、收音机、电水壶，墙上挂历
    const deskTop = real('Plastic010', 0.6, { roughness: 1, color: 0x9aa094 });                  // 桌面：浅灰绿的贴面板
    const deskPaint = real('PaintedMetal012', 0.8, { metalness: 1, color: 0x7e8a78, clean: 0xe4e4dc });          // 桌身：灰绿漆，边角起锈
    const dg = slotG(11.45, -13.4, -Math.PI / 2);
    rbox(1.3, 0.032, 0.65, 0.008, deskTop, 0, 0.752, 0, dg); box(1.31, 0.02, 0.66, M.rackDark, 0, 0.728, 0, dg);   // 桌面 + 包边
    rbox(0.42, 0.71, 0.6, 0.008, deskPaint, 0.42, 0.365, -0.01, dg);
    for (let i = 0; i < 3; i++) { rbox(0.39, 0.2, 0.014, 0.004, deskPaint, 0.42, 0.13 + i * 0.23, 0.296, dg); box(0.14, 0.018, 0.022, M.steel, 0.42, 0.2 + i * 0.23, 0.31, dg); }
    for (const dz of [-0.28, 0.28]) box(0.035, 0.73, 0.035, deskPaint, -0.6, 0.365, dz, dg); box(0.85, 0.4, 0.015, deskPaint, -0.2, 0.52, -0.3, dg);
    for (const [x, z, n, s, r] of [[-0.25, 0.1, 'Fingerprints005', 0.4, 0.3], [0.2, -0.05, 'Scratches003', 0.6, 1.2], [-0.45, -0.15, 'Smear005', 0.25, 2.0]]) decal(n, dg, { pos: [x, 0.7685, z], rot: [-Math.PI / 2, 0, r], w: s, h: s * 0.7, color: n === 'Smear005' ? 0x5a3a22 : 0x2a2a26, opacity: n === 'Scratches003' ? 0.5 : 0.35, roughness: 0.6 });   // 手印、划痕、洒过的咖啡（真实扫描）
    const enamel = real('PaintedMetal012', 0.25, { metalness: 1, color: 0xf6f2e8 });          // 搪瓷杯：白瓷釉，磕掉的地方露出黑铁（扫描图里本来就有）
    const enamelRim = real('PaintedMetal002', 0.2, { metalness: 1, color: 0x7a8ab0 });
    cyl(0.042, 0.04, 0.09, enamel, -0.3, 0.815, 0.12, dg, 18); { const rim = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.003, 6, 24), enamelRim); rim.rotation.x = Math.PI / 2; rim.position.set(-0.3, 0.86, 0.12); dg.add(rim);
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 6, 12, Math.PI), enamel); h.position.set(-0.258, 0.815, 0.12); h.rotation.z = -Math.PI / 2; dg.add(h); }
    cyl(0.038, 0.034, 0.1, M.steel, -0.52, 0.82, -0.12, dg, 14); for (let i = 0; i < 3; i++) { const pn = cyl(0.005, 0.005, 0.15, real('Plastic010', 0.1, { color: [0xb0281e, 0x2a4a8a, 0x2a2a2a][i], roughness: 0.6 }), -0.52 + (i - 1) * 0.015, 0.89, -0.12 + (i - 1) * 0.01, dg, 6); pn.rotation.z = (i - 1) * 0.15; }
    { const t = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.018, 8, 16), real('Plastic010', 0.1, { color: 0xc8a46a, roughness: 0.45 })); t.rotation.x = Math.PI / 2; t.position.set(-0.4, 0.788, 0.22); dg.add(t); }   // 一卷封箱胶带
    plane(0.42, 0.3, lit(printed('Paper006', 256, 180, (g, W, H) => { g.strokeStyle = 'rgba(90,110,150,.45)'; for (let y = 30; y < H; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } g.fillStyle = 'rgba(30,30,60,.85)'; g.font = `600 15px ${SANS}`; g.fillText('NIGHT SHIFT TALLY', 10, 20);
      g.font = '14px "Segoe Print", cursive'; ['04:10  FBS  ×30 ✓', '04:25  B-0417 hind ×12', '05:02  pork belly ×8', '05:40  return boxes ×6'].forEach((t, i) => g.fillText(t, 10, 46 + i * 32)); }, [['Smear006', [90, 70, 40], 0.3, 0.5, 0.4, 0.5, 0.6]]), { roughness: 0.95 }), 0.05, 0.771, 0.08, 0, dg).rotation.x = -Math.PI / 2;
    model('vintage_radio_transceiver', { pos: [11.6, 0.77, -12.95], rot: -1.7, parent: root }); model('vintage_electric_kettle', { pos: [11.62, 0.77, -13.9], rot: -1.2, parent: root });
    const chairSteel = real('PaintedMetal012', 0.5, { metalness: 1, color: 0x8a8c86, clean: 0xe4e4de, age: 0.1 });       // 折叠椅铁管：灰漆，掉漆生锈
    const chairWood = real('wood_table_worn', 0.5, { roughness: 1, color: 0x8a6448 });          // 椅面：发黑的旧木板
    const chair = (x, z, ry) => { const c = slotG(x, z, ry);
      for (const dx of [-0.2, 0.2]) { const fl = cyl(0.012, 0.012, 0.5, chairSteel, dx, 0.23, 0.17, c, 10); fl.rotation.x = 0.18; const bl = cyl(0.012, 0.012, 0.92, chairSteel, dx, 0.46, -0.16, c, 10); bl.rotation.x = -0.08; }
      { const cr = cyl(0.01, 0.01, 0.4, chairSteel, 0, 0.12, 0.2, c, 8); cr.rotation.z = Math.PI / 2; }
      rbox(0.44, 0.025, 0.4, 0.006, chairWood, 0, 0.46, 0.02, c); const bk = rbox(0.42, 0.18, 0.02, 0.006, chairWood, 0, 0.8, -0.2, c); bk.rotation.x = -0.08; return mergeGroup(c); };
    chair(10.75, -13.3, Math.PI / 2 + 0.25);
    { const f = slotG(11.82, -15.5, -Math.PI / 2); const inner = new THREE.Group(); inner.rotation.x = -0.12; f.add(inner);   // 收起来的折叠椅靠在墙上
      for (const dx of [-0.2, 0.2]) cyl(0.012, 0.012, 0.95, chairSteel, dx, 0.47, 0, inner, 10); rbox(0.44, 0.4, 0.025, 0.006, chairWood, 0, 0.45, 0.03, inner); rbox(0.42, 0.18, 0.02, 0.006, chairWood, 0, 0.82, 0.03, inner); mergeGroup(f); }
    // 铁皮储物柜（三门 900 × 1850 × 450 mm）：灰蓝漆钣金，每扇门顶上一排冲压百叶、名牌插槽、把手，一扇门挂着挂锁
    { const lk = slotG(11.72, -11.0, -Math.PI / 2); const lkM = real('PaintedMetal012', 0.9, { metalness: 1, color: 0x76849a, clean: 0xe8e8e4 });
      rbox(0.9, 1.8, 0.43, 0.01, lkM, 0, 0.95, -0.01, lk); box(0.9, 0.05, 0.42, M.rackDark, 0, 0.025, 0, lk);   // 柜身 + 踢脚
      const nameT = (n) => lit(printed('Paper006', 128, 48, (g, W, H) => { g.fillStyle = '#1a1a1a'; g.font = `700 22px ${SANS}`; g.textAlign = 'center'; g.fillText(n, W / 2, 32); }), { roughness: 0.8 });
      ['SHIFT A', 'SHIFT B', 'SPARE'].forEach((n, d) => { const x = -0.3 + d * 0.3;
        rbox(0.285, 1.74, 0.014, 0.004, lkM, x, 0.95, 0.212, lk);
        plane(0.2, 0.18, new THREE.MeshBasicMaterial({ color: 0x0a0b0c }), x, 1.62, 0.2195, 0, lk);                                 // 百叶后面是黑的
        for (let i = 0; i < 6; i++) { const v = box(0.2, 0.012, 0.012, lkM, x, 1.545 + i * 0.03, 0.222, lk); v.rotation.x = -0.6; }
        plane(0.1, 0.035, nameT(n), x, 1.38, 0.2205, 0, lk); box(0.11, 0.045, 0.004, M.steel, x, 1.38, 0.2195, lk);
        box(0.02, 0.1, 0.025, M.steel, x + 0.11, 1.0, 0.232, lk); });
      { const pk = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.003, 6, 12, Math.PI), M.steel); pk.position.set(-0.19, 1.04, 0.25); lk.add(pk); box(0.03, 0.035, 0.014, real('Metal009', 0.1, { metalness: 1, roughness: 0.5, color: 0xc8a050 }), -0.19, 1.015, 0.25, lk); }   // 黄铜挂锁
      blob(11.72, -11.0, 0.7, 1.1); }
    plane(0.3, 0.42, lit(textTex([['NOV 2026', 40, '#9a2422', 0.14, 800], ['M  T  W  T  F  S  S', 18, '#333', 0.3, 600], ['2   3   4   5   6   7   8', 20, '#333', 0.45, 500], ['9  10  11  12  13  14  15', 20, '#333', 0.58, 500], ['16  17  18  19  20  21  22', 20, '#333', 0.71, 500], ['23  24  25  26  27  28  29', 20, '#333', 0.84, 500]], 300, 420, { bg: '#f0ece0', age: 1 })), X1 - 0.012, 1.65, -13.9, -Math.PI / 2, root);
    plane(0.9, 0.3, lit(textTex([['BREAK AREA', 54, '#1a1a18', 0.45, 800], ['NO FOOD ON THE RACKS', 26, '#9a2422', 0.82, 700]], 600, 200, { bg: '#e8c832', age: 1 })), X1 - 0.012, 2.45, -13.2, -Math.PI / 2, root);
    cagedLamp(X1 - 0.05, 2.7, -14.4, -Math.PI / 2);
    blob(11.3, -13.4, 1.6, 2.2); }
  // ================================================================ 冷冻区（右墙，休息角往里）：五台卧式冷冻柜，按真实规格（500 L：1530 × 720 × 840，400 L：1270，300 L：1030；
  //   内胆深 500、高 560，靠压缩机那头柜底有一级台阶），新旧不一：有的还白、有的发黄、最旧那台满是划痕、柜脚起锈；两台开着盖，里面码着冻肉。
  //   冻肉是自己在 Blender 里建的模型（tools/blender/frozen_meat.py → assets/models/frozen_meat.glb）：两块牛排一袋、整条西冷、牛肉馅砖、五花肉，
  //   真空袋贴着肉、四周是压扁的封边，袋上贴着标签。肉是门店给的肉的照片，压暗发紫（真空没氧气，冻肉就是这个颜色）+ 真实扫描的霜斑和冻伤发白的斑。
  //   码放用“高度图”：每一袋落在它下面最高的那一点上，所以袋子之间、袋子和柜壁之间都不会穿模。
  { const frost = real('Snow006', 0.45, { roughness: 1, color: 0xeef3f7 });                                              // 厚霜（真实扫描的细雪）
    const frostMask = new THREE.TextureLoader().load('assets/ph/decal/decal_17/opacity.png'); frostMask.colorSpace = THREE.NoColorSpace; frostMask.wrapS = frostMask.wrapT = THREE.RepeatWrapping;
    const frostDecal = new THREE.MeshStandardMaterial({ color: 0xf2f6fa, alphaMap: frostMask, transparent: true, opacity: 0.8, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
    const plinthM = real('Plastic006', 0.4, { roughness: 1, color: 0x8a8c8a });
    const linerM = real('Plastic010', 0.5, { roughness: 1, color: 0xecebe6 });
    const disp = (txt) => new THREE.MeshBasicMaterial({ map: canvasTexture(160, 64, (g, W, H) => { g.fillStyle = '#0c1012'; g.fillRect(0, 0, W, H); g.fillStyle = '#ff5a3a'; g.font = '700 40px monospace'; g.fillText(txt, 12, 46); }) });
    // 三种柜身：还算白的、发黄的、很旧（发黄 + 更多磨损）
    const bodyM = [real('PaintedMetal012', 1.1, { metalness: 1, color: 0xf0eee8, clean: 0xf2f0ea, age: -0.3 }),
      real('PaintedMetal012', 1.1, { metalness: 1, color: 0xe8dcc0, clean: 0xece0c2, age: -0.1 }),
      real('PaintedMetal012', 1.2, { metalness: 1, color: 0xdccfae, clean: 0xe2d4b0, age: -0.04 })];
    const badge = (n) => lit(printed('Metal009', 256, 72, (g, W, H) => { g.fillStyle = '#1a1a1a'; g.font = `800 26px ${SANS}`; g.fillText('CHEST FREEZER', 12, 32); g.font = `600 20px ${MONO}`; g.fillText(`CF-${n} · −18…−25 ℃`, 12, 60); }), { roughness: 0.5, metalness: 0.6 });
    const H = 0.84, D = 0.72, LID = 0.07, TF = 0.11, FLOOR = 0.21;                                                       // 总高、深、盖厚、前后壁厚（保温层）、内胆底面高度
    const openFz = [];
    const chest = ({ x, z, ry = 0, L = 1.53, age = 0, open = false, cap = 500, top }) => {
      const g = slotG(x, z, ry), bm = bodyM[age], TE = 0.048, rim = H - LID;
      box(D - 0.02, 0.09, L - 0.02, plinthM, 0, 0.045, 0, g);                                                               // 底座
      for (let i = 0; i < 6; i++) box(0.006, 0.012, 0.3, M.rackDark, -D / 2 + 0.006, 0.025 + i * 0.011, L / 2 - 0.24, g);   // 压缩机那头的进风百叶
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(0.025, 0.025, 0.02, M.tyre, sx * (D / 2 - 0.06), 0.01, sz * (L / 2 - 0.08), g, 10);
      if (!open) rbox(D, rim - 0.09, L, 0.02, bm, 0, 0.09 + (rim - 0.09) / 2, 0, g);
      else { const hw = rim - 0.09, cy = 0.09 + hw / 2, iz = L / 2 - TE, ix = D / 2 - TF;                                   // 开着的：真的箱体
        for (const sx of [-1, 1]) box(TF, hw, L, bm, sx * (D / 2 - TF / 2), cy, 0, g);
        for (const sz of [-1, 1]) box(D - 2 * TF, hw, TE, bm, 0, cy, sz * (L / 2 - TE / 2), g);
        box(D - 2 * TF, FLOOR - 0.09, L - 2 * TE, bm, 0, 0.09 + (FLOOR - 0.09) / 2, 0, g);                                    // 柜底（保温层）
        const SL = 0.3, SH = 0.22;                                                                                            // 压缩机台阶
        box(D - 2 * TF, SH, SL, linerM, 0, FLOOR + SH / 2, iz - SL / 2, g);
        const FT = 0.008;                                                                                                     // 霜：贴在内胆每一面上
        box(D - 2 * TF, FT, L - 2 * TE - SL, frost, 0, FLOOR + FT / 2, -SL / 2, g); box(D - 2 * TF, FT, SL, frost, 0, FLOOR + SH + FT / 2, iz - SL / 2, g);
        for (const sx of [-1, 1]) box(FT, hw - (FLOOR - 0.09) - 0.06, L - 2 * TE, frost, sx * (ix - FT / 2), FLOOR + (hw - (FLOOR - 0.09) - 0.06) / 2, 0, g);
        for (const sz of [-1, 1]) box(D - 2 * TF - 2 * FT, rim - FLOOR - 0.06, FT, frost, 0, FLOOR + (rim - FLOOR - 0.06) / 2, sz * (iz - FT / 2), g);
        for (const sx of [-1, 1]) box(TF + 0.004, 0.006, L, frost, sx * (D / 2 - TF / 2), rim + 0.003, 0, g);              // 柜口一圈霜
        openFz.push({ g, ix: ix - FT - 0.012, iz: iz - FT - 0.012, floor: FLOOR + FT, step: { z0: iz - SL - 0.005, h: SH + FT }, top: rim - 0.05 }); }
      const pv = new THREE.Group(); pv.position.set(D / 2, rim, 0); g.add(pv); if (open) pv.rotation.z = -1.33;              // 盖子：铰链在靠墙那边
      rbox(D + 0.02, LID, L + 0.02, 0.022, bm, -D / 2, LID / 2, 0, pv);
      box(D - 0.05, 0.01, L - 0.07, linerM, -D / 2, -0.004, 0, pv);                                                           // 盖子里的白内衬 + 一圈灰密封条
      for (const [w, d, px, pz] of [[D - 0.03, 0.022, -D / 2, (L - 0.05) / 2], [D - 0.03, 0.022, -D / 2, -(L - 0.05) / 2], [0.022, L - 0.05, -0.016, 0], [0.022, L - 0.05, -D + 0.016, 0]]) box(w, 0.016, d, plinthM, px, -0.009, pz, pv);
      rbox(0.035, 0.035, 0.32, 0.01, plinthM, -D - 0.025, 0.02, 0, pv);                                                        // 拉手
      if (age > 0) { for (const [n, w, h2, px, pz, r] of [['Scratches003', 0.7, 0.5, -D * 0.45, -L * 0.2, 0.4], ['Scratches001', 0.5, 0.4, -D * 0.6, L * 0.25, 2.0]]) decal(n, pv, { pos: [px, LID + 0.0015, pz], rot: [-Math.PI / 2, 0, r], w, h: h2, color: 0x6a6458, opacity: 0.55 }); }   // 旧的盖子上一道道划痕
      if (age === 2) { decal('Rust001', g, { pos: [-D / 2 - 0.003, 0.16, -L * 0.25], rot: [0, -Math.PI / 2, 0], w: 0.5, h: 0.16, opacity: 0.85 }); decal('Scratches001', g, { pos: [-D / 2 - 0.004, 0.45, L * 0.1], rot: [0, -Math.PI / 2, 0], w: 0.8, h: 0.4, color: 0x6a6458, opacity: 0.5 }); }   // 柜脚起锈、前面被蹭花
      if (!open && age !== 2) plane(0.45, 0.32, frostDecal, -D / 2, LID + 0.001, 0.25, 0, pv).rotation.x = -Math.PI / 2;     // 盖子上化了又冻的一块霜印
      box(0.008, 0.07, 0.2, plinthM, -D / 2 - 0.004, rim - 0.11, L / 2 - 0.22, g); plane(0.1, 0.04, disp(age === 2 ? '-19' : '-25'), -D / 2 - 0.009, rim - 0.11, L / 2 - 0.25, -Math.PI / 2, g);   // 温控屏
      cyl(0.006, 0.006, 0.004, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 2.2, 0.5) }), -D / 2 - 0.009, rim - 0.11, L / 2 - 0.15, g, 8).rotation.z = Math.PI / 2;
      plane(0.16, 0.045, badge(cap), -D / 2 - 0.003, rim - 0.11, -L / 2 + 0.2, -Math.PI / 2, g);                               // 铭牌
      top?.(g, rim + LID);
      blob(x, z, ry ? L + 0.25 : 0.95, ry ? 0.95 : L + 0.25); return g; };
    // 电源线：从柜子背后下面出来，沿墙根接到墙上的插座（插座躲开壁柱）
    const cord = (from, sock) => { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(...from), new THREE.Vector3(from[0] + 0.08, 0.03, from[2] + 0.05), new THREE.Vector3(sock[0] - 0.05, 0.04, sock[2] - 0.04), new THREE.Vector3(sock[0] - 0.03, sock[1], sock[2])]);
      root.add(new THREE.Mesh(new THREE.TubeGeometry(c, 16, 0.006, 6), M.tyre)); rbox(0.03, 0.09, 0.07, 0.008, M.grey, sock[0], sock[1], sock[2], root); };
    const FX = 11.65 - D / 2;
    chest({ x: FX, z: -16.98, L: 1.53, age: 0, cap: 500, top: (g, y) => model('garden_gloves_01', { pos: [-0.12, y, 0.35], rot: 0.6, parent: g, sit: true }) });
    chest({ x: FX, z: -18.53, L: 1.27, age: 1, cap: 400, open: true });
    chest({ x: FX, z: -20.11, L: 1.53, age: 2, cap: 500, top: (g, y) => { model('plastic_crate_01', { pos: [0.0, y, -0.3], rot: 0.15, parent: g, sit: true }); } });
    chest({ x: FX, z: -21.55, L: 1.03, age: 1, cap: 300, open: true });
    chest({ x: 10.935, z: -22.95, ry: -Math.PI / 2, L: 1.27, age: 2, cap: 400 });
    for (const [z, sz] of [[-16.98, -16.4], [-18.53, -18.0], [-20.11, -19.5], [-21.55, -21.2]]) cord([11.65, 0.12, z + 0.3], [11.944, 0.42, sz]);
    cord([11.4, 0.12, -22.59], [11.944, 0.42, -22.45]);
    // 冻肉：等模型加载完，按高度图码进两台开着的柜子
    gltf.load('assets/models/frozen_meat.glb', (res) => {
      const T = {}; res.scene.updateMatrixWorld(true);
      res.scene.traverse((o) => { if (!o.isMesh) return; const m = o.name.match(/^(steak2|striploin|mince|belly)_(meat|film|label)/); if (!m) return; (T[m[1]] = T[m[1]] || {})[m[2]] = o.geometry; });
      const lab = (title, line2) => { const t = printed('Paper006', 256, 170, (g, W, H2) => { g.fillStyle = '#1a1a1a'; g.textAlign = 'left'; g.font = `800 26px ${SANS}`; fitText(g, title, 12, 40, W - 24); g.font = `600 18px ${MONO}`;
          [line2, 'FROZEN 18.11.26 · ≤ −18 ℃', 'LOT B-0417'].forEach((s, k) => g.fillText(s, 12, 80 + k * 28)); g.fillStyle = '#9a2422'; g.fillRect(0, H2 - 12, W, 12); }); t.flipY = false; return lit(t, { roughness: 0.8 }); };
      const meatTex = (k, burn) => printed(`assets/user/meat_${k}.webp`, 512, 340, (g, W, H2) => { g.fillStyle = 'rgb(150,94,124)'; g.fillRect(0, 0, W, H2); },   // 真空没氧气 + 冻上：压暗、发紫
        [['SurfaceImperfections009', [236, 242, 248], 0.55, 0, 0, 1, 1], ['decal_18', [200, 184, 176], burn, 0.45, 0.1, 0.5, 0.75]]);                 // 一粒粒的冰晶（真实扫描的斑点）+ 一块冻伤发白发干的斑
      const meatMat = (k, burn = 0.18) => { const m = new THREE.MeshStandardMaterial({ map: meatTex(k, burn), roughness: 0.75 });
        m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float fatw; varying float vFat;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvFat = fatw;');
          sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vFat;').replace('#include <map_fragment>', `#include <map_fragment>
            float fl = dot(sampledDiffuseColor.rgb, vec3(0.333));
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.70, 0.62, 0.54) * (0.82 + 0.5 * fl), smoothstep(0.15, 0.85, vFat));`); };   // 顶点里存的脂肪比例：肉和脂肪平滑地混在一起
        m.customProgramCacheKey = () => 'frozen-meat'; return m; };
      const filmTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'); g.clearRect(0, 0, 512, 512);
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
        loadImg('assets/ph/decal/SurfaceImperfections009/opacity.jpg').then((im) => { if (im) { stainOn(g, im, [240, 245, 250], 0.65, 0, 0, 512, 512); t.needsUpdate = true; } }); return t; })();   // 袋子内壁结的冰晶：一粒粒、一小片（真实扫描的斑点图）
      const vacMat = filmMat({ tint: 0xf4f8fa, map: filmTex, mapA: 0.85, base: 0.04, edge: 0.7, ns: 0.5 });   // 真空袋：绷在肉上、很亮，斜着看发白；袋里结的冰晶是一粒粒白的
      const KIND = { steak2: { meat: meatMat(2, 0.0), label: lab('RIBEYE STEAK × 2', '0.82 kg') }, striploin: { meat: meatMat(1, 0.45), label: lab('BEEF STRIPLOIN', '4.6 kg · WHOLE') },
        mince: { meat: meatMat(1, 0.0), label: lab('BEEF MINCE 15%', '1.0 kg') }, belly: { meat: meatMat(4, 0.3), label: lab('PORK BELLY · SKIN ON', '1.9 kg') } };
      for (const k in T) { const gm = T[k].meat; if (gm) {   // 脂肪比例存在顶点色里；导出器另外塞了一套全白的，挑真正有变化的那一套
          const cands = Object.keys(gm.attributes).filter((n) => /^color/.test(n)).map((n) => gm.attributes[n]);
          const c = cands.find((at) => { let mn = 9, mx = -9; for (let i = 0; i < at.count; i += 7) { const v = at.getX(i); mn = Math.min(mn, v); mx = Math.max(mx, v); } return mx - mn > 0.05; });
          const a = new Float32Array(gm.attributes.position.count); if (c) for (let i = 0; i < c.count; i++) a[i] = c.getX(i);
          gm.setAttribute('fatw', new THREE.BufferAttribute(a, 1)); for (const n of Object.keys(gm.attributes)) if (/^color/.test(n)) gm.deleteAttribute(n); }
        T[k].box = new THREE.Box3().setFromBufferAttribute(T[k].film.attributes.position); }
      // 高度图码放：2 cm 一格，每一袋试 28 个位置，挑落得最低的那个；放不下就不放
      const place = { steak2: [], striploin: [], mince: [], belly: [] };
      const mix = ['steak2', 'steak2', 'mince', 'mince', 'striploin', 'belly', 'steak2', 'mince', 'belly'];
      openFz.forEach((F, fi) => { const C = 0.02, nx = Math.ceil(2 * F.ix / C), nz = Math.ceil(2 * F.iz / C), hm = new Float32Array(nx * nz);
        for (let j = 0; j < nz; j++) if (-F.iz + (j + 0.5) * C > F.step.z0) for (let i = 0; i < nx; i++) hm[j * nx + i] = F.step.h;   // 压缩机台阶
        const fill = F.top - F.floor - 0.06 - fi * 0.08;
        let placed = 0; for (let n = 0; n < 110 && placed < 30 - fi * 6; n++) { const k = mix[(n * 7 + fi * 3) % mix.length], B = T[k].box; if (!B) continue; const hx = (B.max.x - B.min.x) / 2, hz = (B.max.z - B.min.z) / 2, h = B.max.y - B.min.y;
          let best = null;
          for (let t = 0; t < 28; t++) { const r = (Math.floor(rnd() * 4) * Math.PI) / 2 + (rnd() - 0.5) * 0.12, c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r)), ex = c * hx + s * hz + 0.004, ez = s * hx + c * hz + 0.004;
            if (ex > F.ix || ez > F.iz) continue; const px = (rnd() * 2 - 1) * (F.ix - ex), pz = (rnd() * 2 - 1) * (F.iz - ez);
            const i0 = Math.max(0, Math.floor((px - ex + F.ix) / C)), i1 = Math.min(nx - 1, Math.floor((px + ex + F.ix) / C)), j0 = Math.max(0, Math.floor((pz - ez + F.iz) / C)), j1 = Math.min(nz - 1, Math.floor((pz + ez + F.iz) / C));
            let base = 0; for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) base = Math.max(base, hm[j * nx + i]);
            if (base + h > fill) continue; const score = base + rnd() * 0.01; if (!best || score < best.score) best = { score, base, px, pz, r, i0, i1, j0, j1 }; }
          if (!best) continue;
          for (let j = best.j0; j <= best.j1; j++) for (let i = best.i0; i <= best.i1; i++) hm[j * nx + i] = best.base + h + 0.002;
          const mtx = new THREE.Matrix4().makeRotationY(best.r).setPosition(best.px, F.floor + best.base - B.min.y + 0.001, best.pz);
          F.g.updateMatrixWorld(true); place[k].push(new THREE.Matrix4().multiplyMatrices(F.g.matrixWorld, mtx)); placed++; } });
      for (const k in place) { const P = place[k]; if (!P.length || !T[k]) continue;
        for (const [part, mat] of [['meat', KIND[k].meat], ['film', vacMat], ['label', KIND[k].label]]) { if (!T[k][part]) continue; const im = new THREE.InstancedMesh(T[k][part], mat, P.length);
          P.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; im.userData.frozen = k; root.add(im); } }
      window.__frozen = { place: Object.fromEntries(Object.entries(place).map(([k, v]) => [k, v.length])), freezers: openFz.length };
    }, undefined, (e) => console.warn('frozen meat', e));
    // 刚出库的一托冻品：缠膜、胶带，纸箱顶上和侧面结了一块块白霜
    { const fp = slotG(9.3, -21.0, 0.12); pallet(0, 0, 0, fp); const S = kit.stackPallet(fp, 0, 0.15, 'brand', { maxH: 0.95, mixed: 0.3 }); wrapStack(fp, 0, 0.15, S);
      for (const s of [1, -1]) plane(S.w * 0.85, S.h * 0.6, frostDecal, 0, 0.15 + S.h * 0.62, s * (S.d / 2 + 0.022), s > 0 ? 0 : Math.PI, fp);
      blob(9.3, -21.0, 1.5, 1.3); }
    // 地上的蓝线框 + 字，墙上的牌子、温度记录本
    line(10.15, -19.8, 0.08, 7.5, 'b'); line(11.05, -16.05, 1.8, 0.08, 'b'); line(11.05, -23.55, 1.8, 0.08, 'b');
    floorText('FROZEN · −25 ℃', 9.82, -19.6, 2.8, 0.26, 'b', -Math.PI / 2);
    plane(1.3, 0.42, lit(textTex([['FROZEN STORAGE · −25 ℃', 44, '#fff', 0.42, 800], ['CLOSE LIDS · GLOVES REQUIRED · LOG TEMP 2× / SHIFT', 20, 'rgba(255,255,255,.85)', 0.8, 600]], 800, 260, { bg: '#24508a', age: 0.8 })), 11.99, 2.45, -18.8, -Math.PI / 2, root);
    { const cb = new THREE.Group(); cb.position.set(11.954, 1.45, -19.75); cb.rotation.y = -Math.PI / 2; root.add(cb);              // 挂在墙上的温度记录夹板
      box(0.23, 0.32, 0.006, real('wood_table_worn', 0.4, { color: 0x9a7a5a }), 0, 0, 0, cb); box(0.09, 0.03, 0.015, M.steel, 0, 0.15, 0.01, cb);
      plane(0.21, 0.28, lit(printed('Paper006', 210, 280, (g, W, H2) => { g.fillStyle = '#1a1a1a'; g.font = `700 15px ${SANS}`; g.fillText('FREEZER TEMP LOG', 10, 22); g.strokeStyle = 'rgba(60,80,120,.5)'; for (let y = 36; y < H2; y += 20) { g.beginPath(); g.moveTo(6, y); g.lineTo(W - 6, y); g.stroke(); }
        g.fillStyle = 'rgba(20,30,80,.85)'; g.font = '15px "Segoe Print", "Ink Free", cursive'; ['18.11  1:-25 2:-24 3:-20', '19.11  1:-26 2:-24 3:-19!', '19.11  4:-25 5:-23', '20.11  3:-19 call tech', '20.11  1:-25 2:-25', '21.11  3:-18 !!'].forEach((t, k) => g.fillText(t, 10, 54 + k * 20)); }), { roughness: 0.95 }), 0, -0.01, 0.0045, 0, cb); }
  }
  scene.add(new THREE.HemisphereLight(0x74a8a2, 0x141d1a, 0.66));                  // 参考图整体更亮：天光补一点（不花显卡）
  // 主通道上方两盏暖一点的投光灯
  for (const z of [-4, -15]) { const s = new THREE.SpotLight(0xffb668, 62, 14, 0.5, 0.65, 1.4); s.position.set(-1.3, HT - 1.2, z); s.target.position.set(-1.3, 0, z - 1); root.add(s, s.target);
    lightCone(root, [-1.3, HT - 1.2, z], [0, -(HT - 1.2), -1], { length: 7.2, radius: 2.9, color: 0xffb668, strength: 0.1 }); }
  hazeLayer(root, [0, 3.2, -23.2], { width: 24, height: 7, color: 0x1c6a6e, strength: 0.07 });

  // ---- 血和脏（第二遍）：运输笼拖到卸货门、月台边上甩的、叉车压过血再带走的胎印、红柱上一只血手印；出库线末端滴的血水、冷藏架底下的化冻血水、退货桶边的一圈
  const bloodMat = (seed, o = {}) => { const { map, roughnessMap } = puddleDecal(seed, { kind: 'blood', size: 256 }); return new THREE.MeshStandardMaterial({ map, roughnessMap, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, roughness: 1, ...o }); };
  const blood = (x, y, z, sz, seed, rot = [-Math.PI / 2, 0, rnd() * 6], o) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), bloodMat(seed, o)); m.position.set(x, y, z); m.rotation.set(...rot); m.renderOrder = 3; root.add(m); return m; };
  for (const [x, z, sz, sd] of [[-8.1, -16.2, 1.3, 31], [-9.9, -12.6, 0.7, 32], [-10.6, -19.4, 0.9, 33], [-0.9, -22.0, 0.8, 34], [7.7, -22.3, 0.55, 35], [7.9, -21.6, 0.35, 36], [10.0, -25.2, 1.1, 37], [7.4, -28.9, 0.7, 38], [10.7, -21.2, 0.45, 39], [3.6, -10.2, 0.4, 40], [-4.6, -6.8, 0.5, 41]])
    blood(x, (x < -8.5 && x > -12 ? PH : 0) + 0.0078, z, sz, sd, undefined, { opacity: 0.85 });
  for (const z of [-15.6, -16.5, -17.3]) blood(PX + 0.014, PH - 0.32 - rnd() * 0.25, z, 0.42, 50 + Math.round(-z * 3), [0, Math.PI / 2, rnd() * 6]);   // 月台边沿上甩的
  for (const [x, z, r, w] of [[-9.0, -12.9, 0.3, 2.2], [-8.9, -17.7, -0.2, 1.6], [-10.9, -20.2, 1.3, 1.4]]) userDecal('blood_smear.webp', root, { pos: [x, PH + 0.0072, z], rot: [-Math.PI / 2, 0, Math.PI / 2 + r], w, h: 0.55, color: 0x6a3a36, roughness: 0.5, opacity: 0.85 });   // 拖过去的
  decal('TireTracks001', root, { pos: [-6.0, 0.0076, -16.4], rot: [-Math.PI / 2, 0, Math.PI / 2], w: 4.2, h: 0.5, color: 0x5a1a14, opacity: 0.55 });   // 叉车压过地上的血，带着往主通道走
  decal('TireTracks001', root, { pos: [-3.4, 0.0076, -16.7], rot: [-Math.PI / 2, 0, Math.PI / 2 + 0.12], w: 2.6, h: 0.5, color: 0x3a1a14, opacity: 0.35 });
  { const hand = canvasTexture(256, 384, (g, W, H) => {                    // 红柱上一只血手印（撑了一下、往下滑了一截）
      g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(96,14,12,.85)';
      g.beginPath(); g.ellipse(128, 210, 62, 70, 0, 0, 7); g.fill();
      for (const [x, y, h, a] of [[70, 120, 70, -0.35], [100, 92, 86, -0.12], [134, 86, 90, 0.03], [166, 100, 80, 0.18], [196, 176, 58, 0.75]]) { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.ellipse(0, 0, 14, h / 2, 0, 0, 7); g.fill(); g.restore(); }
      g.globalAlpha = 0.5; for (let i = 0; i < 4; i++) g.fillRect(84 + i * 26, 260, 10, 60 + i * 18); g.globalAlpha = 1;
      g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${0.3 + Math.random() * 0.6})`; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); } });
    const hm = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.26), new THREE.MeshStandardMaterial({ map: hand, transparent: true, depthWrite: false, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -4 }));
    hm.position.set(X0 + 0.302, PH + 1.22, -17.08); hm.rotation.set(0, Math.PI / 2, 0.08); hm.renderOrder = 3; root.add(hm); }
  for (const [x, k] of [[5.4, 'Leaking006'], [7.6, 'Leaking004'], [10.6, 'Leaking011A']]) decal(k, root, { pos: [x, 4.6, Z1 + 0.015], w: 1.6, h: 3.4, color: 0x3a3022, opacity: 0.7 });   // 档案区、冷藏架上方的水痕
  decal('SurfaceImperfections003', root, { pos: [7.5, 0.4, Z1 + 0.016], w: 9, h: 0.8, color: 0x1e1a14, opacity: 0.75 });
  decal('Leaking009', root, { pos: [X1 - 0.003, 3.4, -26.0], rot: [0, -Math.PI / 2, 0], w: 3.2, h: 2.6, color: 0x2a2620, opacity: 0.7 });
  decal('SurfaceImperfections017', root, { pos: [6.8, 0.0067, -25.2], rot: [-Math.PI / 2, 0, 0.4], w: 7, h: 4, color: 0x221e18, opacity: 0.5 });   // 三个区之间的过道：踩出来的灰
  for (const [x, z] of [[6.4, -21.0], [4.6, -23.0]]) decal('decal_17', root, { pos: [x, 0.0071, z], rot: [-Math.PI / 2, 0, x], w: 0.7, h: 0.5, color: 0x1a1612, opacity: 0.35, roughness: 0.25 });   // 托盘车漏的液压油

  kit.flush();                                                                     // 所有纸箱按父节点合并成一个个网格
  let lastT = 0;
  function tick(t) {
    const dt = Math.min(0.05, Math.max(0, t - lastT)); lastT = t;
    if (atlas) {                                                           // 走到档案桌前书才翻开，离开时合上
      const k0 = atlas.k; atlas.k = THREE.MathUtils.clamp(atlas.k + Math.sign(atlas.to - atlas.k) * dt / atlas.len, 0, 1);
      if (atlas.k !== k0) { atlas.act.time = atlas.k * atlas.len; atlas.mixer.update(0); }
    }
    if (dispatch) {                                                        // 机械臂放下一箱 → 沿滚筒线走过扫码门 → 停在末端，过一会儿下一箱
      const d = dispatch; d.t += dt;
      const run = Math.min(d.t, 8) * 0.18, x = d.x0 - 0.62 + run;
      d.box.position.x = x; d.box.visible = d.t < 10.5;
      if (d.t > 11) d.t = 0;
      scanLine.material.opacity = Math.abs(x + 5.6 - 6.78) < 0.3 ? 0.55 + 0.45 * Math.sin(t * 40) : 0;
    }
    for (const s of mist) {                                                // 液氮罐口飘出来的冷雾
      const p = (t * 0.12 + s.userData.ph) % 1;
      s.position.set(-4.4 + Math.sin(p * 5) * 0.2, 1.75 + p * 0.8, -23.3 + p * 0.3);
      s.scale.setScalar(0.3 + p * 1.0);
      s.material.opacity = 0.3 * (1 - p) * Math.min(1, p * 5);
    }
    warnL.intensity = 2 * (0.5 + 0.5 * Math.sign(Math.sin(t * 3)));        // 警示灯一闪一闪
    if (rainTex) rainTex.offset.y = (t * 1.6) % 1;                            // 02 号门外的雨
  }
  return { scene, tick, load, onFocus(id, on) { if (id === 'atlas' && atlas) atlas.to = on ? 1 : 0; } };
}
