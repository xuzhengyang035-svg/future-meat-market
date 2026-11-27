// 店外：雨夜，一栋五层的旧石灰抹灰楼，底层是一整排墨绿色木头店面（照着效果图做）
//   店面   左边大橱窗（冷藏肉柜，粉色灯）· 中间一对敞开的木门（棋盘格地砖）· 右边小橱窗（挂着香肠和火腿、一台切片机）
//          上面一条破旧的帆布遮阳篷；店里暖黄的灯，吊灯、货架、罐子
//   门前   花槽和常春藤、三根铸铁护柱、一套被雨淋着的铁桌椅、一盆绿植
//   右边   两只高高的气瓶（CO₂）、贴在墙上的告示、一扇墨绿色的侧门（下面百叶）、门上一盏小灯、一摞木箱
//   左边   墙角一盏铸铁壁灯；往左是一条更窄的老街，远处的窗都亮着
// 贴图都是真实照片扫描（Poly Haven / ambientCG，CC0）；楼和远处的街只做到“看起来立体”的程度
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { addMarketLane } from './market-lane.js';
import { mistField } from './atmosphere.js';
import { ivy, shrub, weeds, planeTree, fallenLeaves } from './foliage.js';
import { addSheets } from './newsprint.js';
import { glassDoors, doorLamp, depthWindow } from './doors.js';
import { canvasTexture } from './textures.js';
import { porkBrandTexture } from './pork-brand.js';
import { pbr, model, decal, userDecal, userMat, paintedText } from './assets.js';
import { towel } from './dress.js';
import { meatGeometry, meatMaterial, texturedMeat } from './meat.js';
import { grimeMap, ageCanvas, blobShadow, puddleDecal, grimeLayer, brushedSteelMaps } from './materials.js';

const SANS = '"Inter", "Noto Sans SC", "Microsoft YaHei", sans-serif';
function box(w, h, d, m, x, y, z, p) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); p.add(o); return o; }
function cyl(rt, rb, h, m, x, y, z, p, seg = 20) { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x, y, z); p.add(o); return o; }
function plane(w, h, mat, x, y, z, ry, p) { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); o.position.set(x, y, z); o.rotation.y = ry; p.add(o); return o; }
const lit = (map, o = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.85, ...o });
const R = (n) => () => (n = (n * 16807) % 2147483647) / 2147483647;

// ---------------------------------------------------------------- 挂着的肉：香肠（弯的，肠衣皱、油亮，有白色脂肪点）、风干火腿（梨形，外皮深红棕，麻绳捆着）
const sausageTex = () => canvasTexture(256, 512, (g, W, H) => {
  const r = R(17);
  const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, '#3e140c'); gr.addColorStop(0.5, '#7a2a18'); gr.addColorStop(1, '#3e140c');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${200 + r() * 40},${170 + r() * 40},${150 + r() * 30},${0.25 + r() * 0.4})`; g.beginPath(); g.ellipse(r() * W, r() * H, 1 + r() * 3, 1 + r() * 2.5, r() * 3, 0, Math.PI * 2); g.fill(); }
  for (let i = 0; i < 220; i++) { g.strokeStyle = `rgba(20,6,4,${0.15 + r() * 0.25})`; g.lineWidth = 0.6 + r() * 1.4; const x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 8, y + 4, x + 14, y - 3, x + 22 + r() * 20, y + r() * 6); g.stroke(); }
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(240,236,220,${0.05 + r() * 0.1})`; g.fillRect(r() * W, r() * H, 2 + r() * 6, 1); }
});
const hamTex = () => canvasTexture(256, 512, (g, W, H) => {
  const r = R(23);
  g.fillStyle = '#5a1e10'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${120 + r() * 60},${50 + r() * 30},20,${0.15 + r() * 0.2})`; g.beginPath(); g.ellipse(r() * W, r() * H, 10 + r() * 40, 6 + r() * 30, r() * 3, 0, Math.PI * 2); g.fill(); }
  for (let i = 0; i < 300; i++) { g.strokeStyle = `rgba(20,6,2,${0.1 + r() * 0.2})`; g.lineWidth = 1 + r() * 2; const x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 8); g.stroke(); }
  g.fillStyle = '#c8a888'; g.fillRect(0, H * 0.9, W, H * 0.1);
});
const twine = new THREE.MeshStandardMaterial({ color: 0xb8a070, roughness: 1 });
function sausage(len, r, mat, bend) {
  const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector3(Math.sin(t * Math.PI) * bend, -t * len, Math.sin(t * 3.1) * bend * 0.3)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, r, 12), mat));
  for (const t of [0, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), mat); e.position.copy(curve.getPoint(t)); g.add(e); }
  const tw = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.002, 4, 10), twine); tw.position.y = 0.012; g.add(tw);
  return g;
}
function ham(mat) {
  const pts = [[0, 0], [0.03, -0.01], [0.035, -0.08], [0.06, -0.16], [0.1, -0.26], [0.125, -0.36], [0.12, -0.45], [0.09, -0.52], [0.04, -0.55], [0, -0.56]].map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), mat); m.scale.set(1, 1, 0.75); g.add(m);
  const tw = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.003, 4, 12), twine); tw.position.y = 0.01; g.add(tw);
  for (let k = 0; k < 3; k++) { const net = new THREE.Mesh(new THREE.TorusGeometry(0.06 + k * 0.025, 0.002, 4, 24), twine); net.rotation.x = Math.PI / 2; net.position.y = -0.12 - k * 0.11; net.scale.set(1, 0.75, 1); g.add(net); }
  return g;
}

export function createStreet(env) {
  let valve = null, nowT = 0, awningDrips = null;
  const scene = new THREE.Scene();
  scene.background = canvasTexture(16, 512, (g, W, H) => {                  // 雨夜的天：上面深蓝黑，往下一点点被城市的灯光照成暖灰
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#05080c'); gr.addColorStop(0.55, '#141b22'); gr.addColorStop(0.8, '#2a2a28'); gr.addColorStop(1, '#3a3228'); g.fillStyle = gr; g.fillRect(0, 0, W, H); });
  scene.fog = new THREE.FogExp2(0x46545c, 0.036);                         // 潮湿的夜：远处一层层沉进雾里
  scene.environment = env;
  scene.environmentIntensity = 0.25;
  const root = new THREE.Group(); scene.add(root);
  const rnd = R(5);
  const blobMat = new THREE.MeshBasicMaterial({ map: blobShadow(), transparent: true, depthWrite: false, opacity: 0.55 });
  const blob = (x, z, s, y = 0.152) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(s, s), blobMat); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); root.add(p); };

  const M = {
    plaster: (w, h, c = 0x9a968c) => pbr('worn_mossy_plasterwall', w, h, { size: 3.0, roughness: 0.95, color: c }),
    stone: (w, h) => pbr('plastered_stone_wall', w, h, { size: 2.2, roughness: 0.95, color: 0x8a867e }),
    green: (w = 1, h = 1) => pbr('green_rough_planks', w, h, { size: 1.6, roughness: 0.7, color: 0x8aa294 }),
    iron: pbr('PaintedMetal012', 1, 1, { metalness: 1, roughness: 1, color: 0x2a2c2e }),   // 黑漆铸铁 / 铁框：真实扫描的旧漆面（压暗），磨掉的地方露铁起锈
    sill: pbr('white_plaster_02', 1, 1, { size: 0.8, color: 0xa8a49a }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xcfd8dc, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.07, envMapIntensity: 0.7, depthWrite: false }),
    warm: new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.2, 1.3) }),
    steel: new THREE.MeshStandardMaterial({ color: 0xc8c8c4, roughness: 0.25, metalness: 1 }),
    co2: pbr('Metal009', 1, 1, { metalness: 1, roughness: 0.8, color: 0xb4b8b4 }),         // 气瓶：拉丝钢（真实扫描）
    co2top: new THREE.MeshStandardMaterial({ color: 0x2e6a48, roughness: 0.5, metalness: 0.4 }),
  };

  // ---------------------------------------------------------------- 地面：石板人行道（湿）、花岗岩路缘、方块弹石路（湿，反光）
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(40, 4.2), pbr('stone_pavers', 40, 4.2, { size: 2.0, roughness: 0.92, envMapIntensity: 0.2, color: 0x8a8a88 }));
  walk.rotation.x = -Math.PI / 2; walk.position.set(0, 0.15, 2.1); root.add(walk);
  box(40, 0.16, 0.28, pbr('plastered_stone_wall', 40, 0.3, { size: 1.5, color: 0x7a7a76, roughness: 0.6 }), 0, 0.075, 4.3, root);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(40, 16), pbr('square_cobblestone', 40, 16, { size: 2.2, roughness: 0.9, metalness: 0, envMapIntensity: 0.23, color: 0x6e6e6c }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, 12.4); root.add(road);
  for (const [x, z, w, d, r, sd, y] of [[-3.8, 2.6, 3.2, 1.6, 0.2, 21, 0.152], [1.6, 3.0, 2.2, 1.0, 1.1, 22, 0.152], [-1.0, 6.8, 5, 2.6, 0.5, 23, 0.003], [4.5, 8.6, 3.6, 1.8, 2.2, 24, 0.003], [-6.5, 8.0, 4, 2.0, 1.4, 25, 0.003], [7.5, 5.6, 2.6, 1.4, 0.3, 26, 0.003], [-9.5, 5.2, 3, 1.4, 1.9, 27, 0.003]]) {
    const pd = puddleDecal(sd); const m = new THREE.MeshStandardMaterial({ map: pd.map, roughnessMap: pd.roughnessMap, roughness: 0.35, metalness: 0.04, envMapIntensity: 0.52, opacity: 0.6, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); p.rotation.set(-Math.PI / 2, 0, r); p.position.set(x, y, z); root.add(p);
  }

  // ---------------------------------------------------------------- 主楼：16 m 宽，底层 4.3 m 高，上面四层抹灰，每层五扇高高的法式窗 + 铸铁小阳台 + 花箱
  const BX0 = -8, BX1 = 8, BW = BX1 - BX0, GH = 4.3, FH = 3.3, NF = 4, TOP = GH + FH * NF;
  box(BW, TOP - GH, 1.0, M.plaster(BW, TOP - GH), 0, GH + (TOP - GH) / 2, -0.5, root);
  box(BW + 0.6, 0.5, 0.6, M.sill, 0, TOP + 0.25, -0.2, root);
  box(BW + 0.2, 0.28, 0.35, M.sill, 0, GH + 0.14, -0.05, root);
  for (let f = 1; f < NF; f++) box(BW, 0.12, 0.16, M.sill, 0, GH + f * FH, 0.02, root);
  { const st = canvasTexture(1600, 1400, (g, W, H) => { g.clearRect(0, 0, W, H); grimeLayer(g, W, H, R(77), { stains: 14, drips: 120, rust: 10, mould: 2, unit: 500, dripCol: '24,26,24' }); });
    plane(BW, TOP - GH, new THREE.MeshStandardMaterial({ map: st, transparent: true, depthWrite: false, roughness: 0.9 }), 0, GH + (TOP - GH) / 2, 0.012, 0, root); }
  const darkWin = new THREE.MeshStandardMaterial({ color: 0x0c1014, roughness: 0.05, metalness: 0.6, envMapIntensity: 2 });



  // planting and ivy are leaf cards cut from real leaf shapes (foliage.js)
  let fseed = 1;
  const bush = (x, y, z, w, d, n, flowers = 0) => shrub(root, { x, y, z, w, d, h: 0.32, n: n * 6, flowers: flowers * 2, seed: fseed++ });
  const vine = (x, y, z, len, n) => ivy(root, { x, y, z: z + 0.02, len, strands: n + 2, spread: 0.7, seed: fseed++ });
  // 每扇亮着的窗是一间不同的屋子：钨丝灯的暖黄、厨房日光灯的青白、电视的蓝光在闪、红灯罩、只开一盏台灯的暗屋、百叶窗……亮度和冷暖都不一样
  const roomTex = (kind, seed) => canvasTexture(128, 256, (g, W, H) => {
    const r = R(seed), P = {
      tungsten: ['#3a2410', '#f0b060', '#ffd9a0'], fluoro: ['#2a3432', '#cfe6dc', '#f4fff8'], tv: ['#0a1020', '#3a5a9a', '#a8c4ff'],
      red: ['#2a0c0a', '#c0483a', '#ffb090'], lamp: ['#120a06', '#6a4020', '#ffc070'], blinds: ['#3a3022', '#e8d8b0', '#fff4dc'], green: ['#10180e', '#6a8a4a', '#e8f0c0'] }[kind];
    g.fillStyle = P[0]; g.fillRect(0, 0, W, H);
    const hx = W * (0.25 + r() * 0.5), hy = H * (0.2 + r() * 0.35);                         // 屋里的灯在哪
    const gr = g.createRadialGradient(hx, hy, 2, hx, hy, W * (kind === 'lamp' ? 0.5 : 1.1)); gr.addColorStop(0, P[2]); gr.addColorStop(0.35, P[1]); gr.addColorStop(1, P[0]);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(0,0,0,.55)';                                                          // 屋里的东西：书架、柜子、椅背、吊灯
    if (r() < 0.6) { const sx = r() < 0.5 ? 4 : W - 34; g.fillRect(sx, H * 0.3, 30, H * 0.7); g.fillStyle = 'rgba(255,255,255,.08)'; for (let y = H * 0.35; y < H; y += 22) g.fillRect(sx + 2, y, 26, 2); g.fillStyle = 'rgba(0,0,0,.55)'; }
    if (r() < 0.5) { g.fillRect(W * 0.35, H * 0.62, 34, 8); g.fillRect(W * 0.35 + 2, H * 0.62, 5, H * 0.38); g.fillRect(W * 0.35 + 27, H * 0.66, 5, H * 0.34); }
    if (kind !== 'lamp') { g.fillRect(hx - 0.8, 0, 1.6, hy - 6); g.beginPath(); g.ellipse(hx, hy - 4, 10, 6, 0, Math.PI, 0); g.fill(); }
    if (kind === 'tv') { g.fillStyle = 'rgba(0,0,0,.7)'; g.beginPath(); g.ellipse(W * 0.5, H * 0.78, 26, 30, 0, Math.PI, 0); g.fill(); g.fillRect(W * 0.2, H * 0.78, W * 0.6, H * 0.22); }   // 沙发背和人头
    if (kind === 'blinds') { for (let y = 0; y < H; y += 7) { g.fillStyle = 'rgba(40,30,20,.55)'; g.fillRect(0, y, W, 2.2); } if (r() < 0.6) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, H * 0.72, W, H * 0.28); } }   // 一边拉歪的百叶
    if (kind === 'green') { g.fillStyle = 'rgba(10,20,8,.8)'; for (let k = 0; k < 40; k++) { g.beginPath(); g.ellipse(W * 0.2 + r() * W * 0.6, H * 0.55 + r() * H * 0.35, 4 + r() * 8, 2 + r() * 4, r() * 3, 0, 7); g.fill(); } }   // 窗台上一排盆栽
    const cc = ['#7a2a20', '#d8c8a0', '#2a3a4a', '#8a6a3a', '#4a5238'][Math.floor(r() * 5)], cw = kind === 'blinds' ? 0 : 0.12 + r() * 0.3;
    for (const side of [0, 1]) {                                                              // 窗帘拉开的程度每扇不一样
      const w = W * cw * (0.6 + r() * 0.8), x0 = side ? W - w : 0;
      g.fillStyle = cc; g.globalAlpha = 0.92; g.fillRect(x0, 0, w, H); g.globalAlpha = 1;
      for (let x = x0; x < x0 + w; x += 6) { g.fillStyle = `rgba(0,0,0,${0.15 + r() * 0.25})`; g.fillRect(x, 0, 2.5, H); }
    }
    if (r() < 0.35) { g.fillStyle = 'rgba(255,255,255,.22)'; for (let x = 0; x < W; x += 3) g.fillRect(x, 0, 1, H * 0.55); }   // 半截白纱帘
    if (r() < 0.4) { g.fillStyle = 'rgba(0,0,0,.75)'; const bx = W * (0.15 + r() * 0.6); g.fillRect(bx, H - 30, 16, 30); g.beginPath(); g.ellipse(bx + 8, H - 34, 14, 10, 0, 0, 7); g.fill(); }   // 窗台上的东西
  });
  //               种类        亮度   灯光颜色（给前两层的点光）  —— null = 没人在家
  const ROOMS = [['tungsten', 1.25, 0xffb070], null, ['fluoro', 1.05, 0xd8f0e8], null, ['lamp', 0.55, 0xff9a50], ['tv', 0.9, 0x7a9cff], null,
    ['red', 0.8, 0xff6a50], null, ['blinds', 1.15, 0xffe0b0], null, null, ['tungsten', 0.75, 0xffa860], ['green', 0.95, 0xe8f0c0], null,
    ['fluoro', 0.7, 0xc8e8f0], null, ['lamp', 0.8, 0xffb060], null, ['tungsten', 1.4, 0xffc080]].map((d, n) => {
    if (!d) return null; const [kind, k, light] = d, c = [k, k, k];
    return { kind, k, light, c, tv: kind === 'tv', mat: new THREE.MeshBasicMaterial({ map: roomTex(kind, 40 + n * 7), color: new THREE.Color(k, k, k) }) };
  });
  // 黑着的窗也有人住的痕迹：贴着的纸板、晾在窗里的衣服、一只猫
  const darkLife = [
    canvasTexture(64, 128, (g, W, H) => { g.clearRect(0, 0, W, H); g.fillStyle = '#6a5438'; g.fillRect(4, H * 0.45, W * 0.55, H * 0.35); g.fillStyle = 'rgba(220,210,180,.5)'; g.fillRect(4, H * 0.45, W * 0.55, 3); g.fillRect(4, H * 0.8 - 3, W * 0.55, 3); }),
    canvasTexture(64, 128, (g, W, H) => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(0,0,0,.9)'; g.beginPath(); g.ellipse(W * 0.6, H * 0.9, 9, 7, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(W * 0.6, H * 0.82, 5, 5, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(W * 0.6 - 5, H * 0.8); g.lineTo(W * 0.6 - 3, H * 0.76); g.lineTo(W * 0.6 - 1, H * 0.8); g.moveTo(W * 0.6 + 1, H * 0.8); g.lineTo(W * 0.6 + 3, H * 0.76); g.lineTo(W * 0.6 + 5, H * 0.8); g.fill(); }),
    canvasTexture(64, 128, (g, W, H) => { g.clearRect(0, 0, W, H); g.strokeStyle = 'rgba(90,90,90,.8)'; g.beginPath(); g.moveTo(0, 14); g.lineTo(W, 16); g.stroke(); for (const [x, c, w, h] of [[6, '#6a7a8a', 16, 30], [26, '#8a4a3a', 12, 22], [42, '#c8c0b0', 16, 34]]) { g.fillStyle = c; g.fillRect(x, 15, w, h); } }),
  ].map((map) => new THREE.MeshStandardMaterial({ map, transparent: true, roughness: 0.9, color: 0x707070, depthWrite: false }));
  // 阳台栏杆上晾的衣服、一串小彩灯
  // 阳台栏杆上搭着的毛巾、茶巾、小方巾：真的织物扫描（华夫格、平纹、针织、格子、牛仔布），有厚度、两头织边、褶子；被雨淋湿，颜色发深、下摆在滴水
  const FABRICS = [['waffle_pique_cotton', 0xb8a890, 0.3], ['cotton_jersey', 0x6a3a34, 0.3], ['rough_linen', 0xc8c0a8, 0.3], ['gingham_check', 0x9aa0b0, 0.35], ['fabric_pattern_05', 0xb0a898, 0.35],
    ['denim_fabric_03', 0x7a8490, 0.35], ['fabric_pattern_07', 0xa89890, 0.35], ['cotton_jersey', 0x4a5a44, 0.3]];
  const fabM = FABRICS.map(([n, c, sz]) => { const m = pbr(n, 0.3, 0.8, { size: sz, color: c, roughness: 0.85 }); m.side = THREE.DoubleSide; m.color.multiplyScalar(0.82); return m; });   // wet: darker
  const bandM = [0x7a2a22, 0x2a3a5a, 0x6a6a3a].map((c) => pbr('rough_linen', 0.3, 0.05, { size: 0.3, color: c }));
  const laundry = (x, y, z, n) => { const rr = R(n * 31 + Math.round(x * 7)); let cx = x - 0.62;
    for (let k = 0; k < n; k++) { const w = 0.2 + rr() * 0.16; if (cx + w > x + 0.66) break;
      const tg = new THREE.Group(); tg.position.set(cx + w / 2, y + 0.012, z); tg.rotation.y = Math.PI; root.add(tg);   // local +z → the wall side
      tg.add(towel({ w, lenA: 0.12 + rr() * 0.12, lenB: 0.28 + rr() * 0.3, r: 0.014, ampA: 0.2, ampB: 1, seed: 40 + k * 7 + n, mat: fabM[Math.floor(rr() * fabM.length)], bandMat: rr() < 0.6 ? bandM[Math.floor(rr() * 3)] : null, thick: 0.003 + rr() * 0.002, skew: (rr() - 0.5) * 0.06, dirt: 0.5 + rr() * 0.3 }));
      for (let d = 0; d < 2; d++) { const dr = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 4), new THREE.MeshPhysicalMaterial({ color: 0xc8d0d4, roughness: 0, clearcoat: 1, transparent: true, opacity: 0.7 })); dr.scale.y = 1.6; dr.position.set(cx + w * (0.25 + d * 0.5), y - 0.33 - rr() * 0.25, z + 0.03); root.add(dr); }
      cx += w + 0.03 + rr() * 0.08; } };
  const fairy = (x, y, z) => { const bulbs = [0xffd080, 0xff6a6a, 0x80c0ff, 0x90ff90].map((c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(2.2) })); const bg = new THREE.SphereGeometry(0.014, 6, 4); for (let k = 0; k < 15; k++) { const t = k / 14, b = new THREE.Mesh(bg, bulbs[k % 4]); b.position.set(x - 0.72 + t * 1.44, y + 0.01 - Math.sin(t * Math.PI) * 0.12, z + 0.02); root.add(b); } const l = new THREE.PointLight(0xffc0a0, 0.6, 2.5, 2); l.position.set(x, y, z + 0.3); root.add(l); };
  const LAUNDRY = { '0,1': 4, '1,4': 3, '2,0': 5, '3,2': 3 };
  const WXS = [-6.2, -3.1, 0, 3.1, 6.2];
  for (let f = 0; f < NF; f++) {
    const y = GH + f * FH + 1.55;
    WXS.forEach((x, i) => {
      box(1.36, 2.5, 0.12, M.sill, x, y, 0.03, root);
      box(1.6, 0.14, 0.3, M.sill, x, y + 1.32, 0.08, root);
      const room = ROOMS[(f * 5 + i) % ROOMS.length], on = !!room;
      const wp = plane(1.08, 2.26, on ? room.mat : darkWin, x, y, 0.1, 0, root);
      if (room?.tv) wp.onBeforeRender = () => { const t = performance.now() * 0.001, k = 0.75 + 0.25 * Math.sin(t * 7.3) * Math.sin(t * 2.1 + 1) + (Math.sin(t * 23) > 0.92 ? 0.25 : 0); room.mat.color.setRGB(room.c[0] * k, room.c[1] * k, room.c[2] * k); };
      if (!on && (f + i) % 3 === 0) plane(1.0, 2.1, darkLife[(f + i) % darkLife.length], x, y, 0.101, 0, root);
      for (const dx of [-0.27, 0.27]) box(0.04, 2.26, 0.05, M.iron, x + dx, y, 0.12, root);
      for (const dy of [-0.4, 0.35]) box(1.08, 0.04, 0.05, M.iron, x, y + dy, 0.12, root);
      if (on && f < 2) { const l = new THREE.PointLight(room.light, 1.2 * room.k, 4, 2); l.position.set(x, y, 0.8); root.add(l); }
      if (LAUNDRY[`${f},${i}`]) laundry(x, y - 1.15 + 0.66, 0.47, LAUNDRY[`${f},${i}`]);
      if (f === 2 && i === 3) fairy(x, y - 1.15 + 0.66, 0.48);
      const by = y - 1.15;
      { const k = (f * 5 + i) % 3; decal(['Leaking003', 'Leaking004', 'Leaking005'][k], root, { pos: [x + (k - 1) * 0.1, by - 0.85, 0.013], w: 1.5, h: 1.7, color: 0x2e2c26, opacity: 0.55 + k * 0.1, flipX: (f + i) % 2 === 1 }); }
      box(1.5, 0.08, 0.5, M.sill, x, by, 0.25, root);
      for (let k = 0; k < 14; k++) cyl(0.008, 0.008, 0.62, M.iron, x - 0.68 + k * 0.105, by + 0.35, 0.47, root, 5);
      box(1.5, 0.03, 0.03, M.iron, x, by + 0.66, 0.47, root); box(1.5, 0.02, 0.02, M.iron, x, by + 0.12, 0.47, root);
      for (const sx of [-0.74, 0.74]) for (let k = 0; k < 4; k++) cyl(0.008, 0.008, 0.62, M.iron, x + sx, by + 0.35, 0.05 + k * 0.13, root, 5);
      for (let k = 0; k < 4; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.007, 5, 14), M.iron); t.position.set(x - 0.5 + k * 0.33, by + 0.48, 0.47); root.add(t); }
      if ((i + f) % 2 === 0) { box(1.0, 0.16, 0.2, new THREE.MeshStandardMaterial({ color: 0x5a3a28, roughness: 0.8, map: grimeMap(51) }), x, by + 0.14, 0.32, root); bush(x, by + 0.22, 0.32, 0.95, 0.18, 34, 8); if (f === 0 && i % 2 === 0) vine(x, by + 0.1, 0.4, 0.9, 3); }
    });
  }
  for (const x of [3.0, 7.85]) { cyl(0.065, 0.065, TOP, M.iron, x, TOP / 2, 0.12, root, 12); for (let y = 0.8; y < TOP; y += 1.8) box(0.16, 0.05, 0.16, M.iron, x, y, 0.1, root); }

  // ---------------------------------------------------------------- 底层：石砌墙（店面两边、右边侧门那一段）
  const SX0 = -6.3, SX1 = 2.8;
  box(SX0 - BX0, GH, 1.0, M.stone(SX0 - BX0, GH), (BX0 + SX0) / 2, GH / 2, -0.5, root);
  { const D0 = 5.4, D1 = 7.4, DT = 3.15;                                         // 右边这段墙在 02 号门那里真的开一个门洞（以前是一整块墙，门里只是一张画）
    box(D0 - SX1, GH, 1.0, M.stone(D0 - SX1, GH), (SX1 + D0) / 2, GH / 2, -0.5, root); box(BX1 - D1, GH, 1.0, M.stone(BX1 - D1, GH), (D1 + BX1) / 2, GH / 2, -0.5, root);
    box(D1 - D0, GH - DT, 1.0, M.stone(D1 - D0, GH - DT), (D0 + D1) / 2, DT + (GH - DT) / 2, -0.5, root); }
  box(SX1 - SX0, GH - 4.25, 1.0, M.stone(SX1 - SX0, 0.1), (SX0 + SX1) / 2, 4.25 + (GH - 4.25) / 2, -0.5, root);
  {   // 墙上的脏只用真实扫描的流痕贴花（以前那层画出来的脏去掉了）
    for (const [x, w, k] of [[(BX0 + SX0) / 2, SX0 - BX0, 'Leaking008'], [4.2, 2.4, 'Leaking009'], [7.4, 1.2, 'Leaking007']]) decal(k, root, { pos: [x, 0.75, 0.016], w, h: 1.2, color: 0x2a2a24, opacity: 0.7 }); }

  // ---------------------------------------------------------------- 店面：墨绿色旧木头，左大橱窗、中间对开门、右小橱窗
  const DX0 = -2.0, DX1 = -0.2;
  const WL0 = SX0 + 0.3, WL1 = DX0 - 0.25, WR0 = DX1 + 0.25, WR1 = SX1 - 0.3;
  const SH = 3.6;
  const ID = 3.2;
  const inFloor = new THREE.Mesh(new THREE.PlaneGeometry(SX1 - SX0, ID), userMat('floor_checker.webp', SX1 - SX0, ID, { size: 3.0, roughness: 0.5, bump: 0.6, envMapIntensity: 1.2, color: 0xb8b4ac }));
  inFloor.rotation.x = -Math.PI / 2; inFloor.position.set((SX0 + SX1) / 2, 0.16, -ID / 2); root.add(inFloor);
  const tiles = (w, h) => pbr('long_white_tiles', w, h, { size: 2.4, rotate: Math.PI / 2, roughness: 0.6, color: 0xa89c88 });
  // Behind the left window and the door is the real shop (room.js), rendered from this street once and baked:
  // room = street + (1.65, 0, 5); the picture plane sits 1.3 m inside, near-clipped there, framed for an eye at (−1.1, 1.65, 6.5).
  { const IN = 1.3;
    const bc = new THREE.PerspectiveCamera(); bc.position.set(0.55, 1.65, 11.5); bc.lookAt(0.55, 1.65, 0); bc.updateMatrixWorld();   // the bake camera, in shop coordinates
    const back = new THREE.Mesh(new THREE.PlaneGeometry(SX1 - SX0, 3.75), depthWindow('assets/street/interior.jpg', 'assets/street/interior_depth.png', {
      view: bc.matrixWorldInverse.clone().multiply(new THREE.Matrix4().makeTranslation(1.65, 0, 5)), proj: new THREE.Matrix4().makePerspective(-5.2, 3.9, 2.25, -1.5, 7.8, 40), near: 7.8, far: 40, maxT: 12 }));
    back.position.set((SX0 + SX1) / 2, 0.15 + 3.75 / 2, -IN); root.add(back);
    inFloor.scale.y = IN / ID; inFloor.position.z = -IN / 2;
    box(SX1 - SX0, 0.1, IN, new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.9 }), (SX0 + SX1) / 2, 3.9, -IN / 2, root);
    for (const x of [SX0, SX1]) box(0.1, 3.9, IN, M.stone(IN, 3.9), x, 1.95, -IN / 2, root);
    const l = new THREE.PointLight(0xffc888, 3.5, 6, 1.6); l.position.set(-1.1, 2.0, 0.6); root.add(l); }
  const G = M.green();
  box(WL1 - WL0 + 0.3, 0.8, 0.14, M.green(4, 0.8), (WL0 + WL1) / 2, 0.55, 0.07, root);
  box(WR1 - WR0 + 0.3, 0.8, 0.14, M.green(3, 0.8), (WR0 + WR1) / 2, 0.55, 0.07, root);
  for (const [x0, x1] of [[WL0, WL1], [WR0, WR1]]) { const n = Math.round((x1 - x0) / 0.9); for (let k = 0; k < n; k++) { const pw = (x1 - x0) / n; box(pw - 0.12, 0.52, 0.03, G, x0 + (k + 0.5) * pw, 0.55, 0.15, root); } }
  for (const x of [SX0, WL1 + 0.12, WR0 - 0.12, SX1]) { box(0.32, SH, 0.24, G, x, SH / 2, 0.1, root); box(0.42, 0.3, 0.3, G, x, SH - 0.1, 0.12, root); box(0.4, 0.18, 0.3, G, x, 0.24, 0.12, root); }
  for (const [x0, x1] of [[WL0, WL1], [WR0, WR1]]) {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    box(w, 0.08, 0.18, G, cx, 0.98, 0.08, root); box(w, 0.1, 0.18, G, cx, 2.95, 0.08, root);
    const n = Math.max(2, Math.round(w / 1.3));
    for (let k = 1; k < n; k++) box(0.06, 1.95, 0.1, G, x0 + k * w / n, 1.97, 0.06, root);
    const m = Math.round(w / 0.45);
    for (let k = 1; k < m; k++) box(0.03, 0.42, 0.06, G, x0 + k * w / m, 3.25, 0.06, root);
    plane(w, 1.95, M.glass, cx, 1.97, 0.02, 0, root); plane(w, 0.45, M.glass, cx, 3.25, 0.02, 0, root);
  }
  box(SX1 - SX0 + 0.5, 0.55, 0.3, G, (SX0 + SX1) / 2, SH + 0.28, 0.1, root);
  box(SX1 - SX0 + 0.7, 0.12, 0.42, G, (SX0 + SX1) / 2, SH + 0.62, 0.14, root);
  { const x = (SX0 + SX1) / 2, y = SH + 0.42;
    const fascia = porkBrandTexture('fascia');
    const trim = new THREE.MeshStandardMaterial({ color: 0x382c23, metalness: 0.55, roughness: 0.63 });
    box(3.08, 0.41, 0.06, trim, x, y, 0.348, root);
    plane(3, 0.4, lit(fascia, { emissiveMap: fascia, emissive: 0xffffff, emissiveIntensity: 0.28 }), x, y, 0.38, 0, root);
    for (const dx of [-1.49, 1.49]) {
      for (const dy of [-0.17, 0.17]) box(0.025, 0.025, 0.018, trim, x + dx, y + dy, 0.389, root);
    }
  }
  box(DX1 - DX0 + 0.2, 0.12, 0.2, G, (DX0 + DX1) / 2, 2.85, 0.08, root);
  plane(DX1 - DX0, 0.6, M.glass, (DX0 + DX1) / 2, 3.25, 0.02, 0, root);
  glassDoors(root, { x0: DX0, x1: DX1, y0: 0.15, z: 0.05, h: 2.65 });                  // doors.js: the same glass doors the shop has inside
  doorLamp(root, [(DX0 + DX1) / 2, 3.02, 0.2]);                                     // caged lamp on the door header
  box(DX1 - DX0 + 0.3, 0.05, 0.5, M.stone(2, 0.5), (DX0 + DX1) / 2, 0.16, 0.25, root);
  // 左橱窗：店里糊在玻璃内侧的旧报纸（newsprint.js，和店里同一批、同一个位置），从街上看到的是每张的头版
  addSheets(root, 'front', { dx: -1.65, glassZ: 0.02 });
  const brandAd = porkBrandTexture('poster');
  plane(0.48, 0.62, lit(brandAd, { emissiveMap: brandAd, emissive: 0xffffff, emissiveIntensity: 0.14 }), WR1 - 0.38, 1.65, 0.039, 0, root).rotation.z = -0.026;
  // 右橱窗：店里这一段是实墙，所以是一个封了背板的浅橱窗，只挂肉
  // 右橱窗：香肠和火腿、切片机、罐子
  { box(WR1 - WR0 + 0.2, 2.9, 0.06, tiles(WR1 - WR0, 2.9), (WR0 + WR1) / 2, 1.45 + 0.15, -0.78, root);              // tiled backboard: the shop wall is right behind it
    box(WR1 - WR0 + 0.2, 0.06, 0.8, new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.9 }), (WR0 + WR1) / 2, 3.05, -0.4, root);
    model('hanging_industrial_lamp', { pos: [(WR0 + WR1) / 2, 3.05, -0.4], scale: 0.7, parent: root });
    { const l = new THREE.PointLight(0xffc080, 2.6, 3.5, 1.8); l.position.set((WR0 + WR1) / 2, 2.6, -0.3); root.add(l); }
    // every sausage its own: casing colour, girth, length, bend, white bloom, a ring, a tied pair
    const casing = (seed, base, bloom) => new THREE.MeshPhysicalMaterial({ map: canvasTexture(256, 512, (g, W, H) => {
      const r = R(seed); const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, base[0]); gr.addColorStop(0.5, base[1]); gr.addColorStop(1, base[0]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${200 + r() * 40},${170 + r() * 50},${150 + r() * 40},${0.2 + r() * 0.4})`; g.beginPath(); g.ellipse(r() * W, r() * H, 1 + r() * 2.5, 1 + r() * 2, 0, 0, 7); g.fill(); }
      for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(15,5,2,${0.15 + r() * 0.3})`; g.lineWidth = 0.6 + r() * 1.2; const x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 8, y + 4, x + 14, y - 3, x + 24 + r() * 18, y + r() * 6); g.stroke(); }
      if (bloom) for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(236,232,220,${0.15 + r() * 0.35})`; g.beginPath(); g.ellipse(r() * W, r() * H, 4 + r() * 22, 3 + r() * 14, r() * 3, 0, 7); g.fill(); }
    }), roughness: bloom ? 0.85 : 0.45, clearcoat: bloom ? 0 : 0.4, clearcoatRoughness: 0.4 });
    const C = [casing(11, ['#3a120c', '#6a2216'], false), casing(12, ['#5a1a10', '#8e3220'], false), casing(13, ['#2a0e0a', '#4a1a12'], true), casing(14, ['#6a2a18', '#a8502e'], false), casing(15, ['#4a2418', '#7a4430'], true)];
    const ring = (r0, t, m) => { const g = new THREE.Group(); const o = new THREE.Mesh(new THREE.TorusGeometry(r0, t, 12, 36, Math.PI * 1.8), m); o.rotation.z = Math.PI / 2 + 0.3; o.position.y = -r0; g.add(o); return g; };
    const hook = (x, z) => { const h = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.003, 5, 12, Math.PI * 1.5), M.steel); h.position.set(x, 2.7, z); h.rotation.z = Math.PI * 0.25; root.add(h); };
    const bar = cyl(0.012, 0.012, WR1 - WR0 - 0.1, M.steel, (WR0 + WR1) / 2, 2.75, -0.35, root, 8); bar.rotation.z = Math.PI / 2;
    let x = WR0 + 0.14, k = 0; const rr = R(77);
    const cuts = [[1, 0.5], [3, 0.46], [0, 0.48]];                              // real-texture cuts from the shop's own counter: marbled beef, pork belly, lean beef
    while (x < WR1 - 0.12) {
      const pick = k % 7;
      cyl(0.003, 0.003, 0.08, M.steel, x, 2.71, -0.35, root, 4);
      if (pick === 2 || pick === 5) {                                             // a whole cut hung on an S-hook, face to the street
        // hung by one end, long side down, the cut face to the street, swinging a little off true
        const [ti, sc] = cuts[(k >> 1) % 3]; const m = texturedMeat(ti, 31 + k); m.scale.setScalar(sc * 0.8); m.rotation.x = Math.PI / 2 - 0.06;
        const hold = new THREE.Group(); hold.add(m); hold.rotation.z = Math.PI / 2 + (rr() - 0.5) * 0.12; hold.updateMatrixWorld(true);
        const b = new THREE.Box3().setFromObject(hold); hold.position.set(x - (b.max.x + b.min.x) / 2, 2.64 - b.max.y, -0.33); root.add(hold); hook(x, -0.35);
        x += 0.17;
      } else if (pick === 4) { const o = ring(0.1 + rr() * 0.03, 0.022, C[k % 5]); o.position.set(x, 2.69, -0.35); o.rotation.y = rr() * 0.6 - 0.3; root.add(o); x += 0.16; }
      else {
        const pair = pick === 6, n = pair ? 2 : 1;
        for (let j = 0; j < n; j++) { const o = sausage(0.22 + rr() * 0.32, 0.02 + rr() * 0.02, C[(k + j) % 5], (rr() - 0.5) * 0.1); o.position.set(x + j * 0.05, 2.67, -0.35); o.rotation.y = rr() * 3; o.rotation.z = (rr() - 0.5) * 0.1; root.add(o); }
        x += (pair ? 0.15 : 0.09) + rr() * 0.05;
      }
      k++;
    }
    // window bed: a worn end-grain butcher's block running the width of the window, white tile kick below
    const cxw = (WR0 + WR1) / 2, Y = 1.0, Zc = -0.45;
    box(WR1 - WR0, 0.08, 0.6, pbr('wood_table_worn', WR1 - WR0, 0.6, { size: 0.5, color: 0xb08a68, roughness: 0.6 }), cxw, Y - 0.015, Zc, root);
    // butcher's paper with sliced salami fanned out, a sprig of rosemary
    { const pap = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.3, 6, 4), new THREE.MeshStandardMaterial({ color: 0xc8a878, roughness: 0.9, side: THREE.DoubleSide }));
      const pp = pap.geometry.attributes.position; for (let i = 0; i < pp.count; i++) pp.setZ(i, Math.sin(pp.getX(i) * 18) * 0.003 + (Math.abs(pp.getY(i)) > 0.13 ? 0.006 : 0)); pap.geometry.computeVertexNormals();
      pap.rotation.set(-Math.PI / 2, 0, 0.12); pap.position.set(cxw - 0.05, Y + 0.027, Zc + 0.05); root.add(pap);
      const salT = canvasTexture(128, 128, (g, W, H) => { const r = R(83); g.fillStyle = '#8a2a22'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(240,220,200,${0.6 + r() * 0.4})`; g.beginPath(); g.ellipse(64 + (r() - 0.5) * 100, 64 + (r() - 0.5) * 100, 2 + r() * 5, 2 + r() * 4, r() * 3, 0, 7); g.fill(); } g.strokeStyle = '#4a1a10'; g.lineWidth = 5; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.stroke(); });
      const salM = new THREE.MeshStandardMaterial({ map: salT, roughness: 0.45 });
      for (let k = 0; k < 9; k++) { const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.003, 20), salM); sl.position.set(cxw - 0.18 + k * 0.03, Y + 0.03 + k * 0.0012, Zc + 0.04 + Math.sin(k * 0.6) * 0.03); sl.rotation.set(0.12, 0, -0.18); root.add(sl); }
      const stub = sausage(0.14, 0.03, new THREE.MeshPhysicalMaterial({ map: sausageTex(), roughness: 0.5, clearcoat: 0.3 }), 0.01); stub.rotation.z = Math.PI / 2 + 0.05; stub.position.set(cxw + 0.12, Y + 0.058, Zc + 0.06); root.add(stub);
      const leafM = new THREE.MeshStandardMaterial({ color: 0x3a5a2a, roughness: 0.7 }); for (let k = 0; k < 10; k++) { const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.002, 0.014, 2, 4), leafM); l.position.set(cxw - 0.02 + k * 0.006, Y + 0.035, Zc - 0.06 + (k % 2 ? 0.006 : -0.006)); l.rotation.set(Math.PI / 2, 0, (k % 2 ? 0.6 : -0.6)); root.add(l); } }
    // a vintage gravity slicer, red enamel with a chrome blade and carriage
    { const sl = new THREE.Group(); sl.position.set(WR0 + 0.38, Y + 0.025, Zc - 0.02); sl.rotation.y = 0.55; root.add(sl);
      const red = new THREE.MeshPhysicalMaterial({ color: 0x8a1c18, roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.25 }), chrome = new THREE.MeshStandardMaterial({ color: 0xd8dcdc, metalness: 1, roughness: 0.18 });
      const base = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.09, 0.34, 3, 0.03), red); base.position.y = 0.045; sl.add(base);
      const col = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.26, 0.14, 3, 0.03), red); col.position.set(0.14, 0.21, -0.07); sl.add(col);
      const blade = cyl(0.145, 0.145, 0.006, new THREE.MeshPhysicalMaterial({ map: brushedSteelMaps(61, { scuff: false }).map, metalness: 1, roughness: 0.15 }), 0.0, 0.24, 0.03, sl, 48); blade.rotation.x = Math.PI / 2;
      const guard = new THREE.Mesh(new THREE.TorusGeometry(0.152, 0.012, 8, 40, Math.PI * 1.3), chrome); guard.position.set(0, 0.24, 0.036); guard.rotation.z = 0.35; sl.add(guard);
      cyl(0.04, 0.04, 0.035, chrome, 0, 0.24, 0.05, sl, 20).rotation.x = Math.PI / 2;
      const tray = box(0.24, 0.012, 0.18, chrome, -0.08, 0.12, 0.1, sl); tray.rotation.z = 0.08;
      cyl(0.012, 0.012, 0.16, chrome, -0.22, 0.15, 0.1, sl, 10).rotation.z = Math.PI / 2;
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 })); knob.position.set(-0.3, 0.15, 0.1); sl.add(knob);
      decal('Fingerprints003', sl, { pos: [0.14, 0.22, 0.002], w: 0.1, h: 0.1, color: 0xd8d0c8, opacity: 0.35 }); }
    // preserving jars: glass, wire-bail lids, things in brine; a paper price tag on each
    { const glassM = new THREE.MeshPhysicalMaterial({ color: 0xe8f0ec, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.28, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
      const brine = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.15, transparent: true, opacity: 0.55, depthWrite: false });
      const lidM = new THREE.MeshStandardMaterial({ color: 0xb8a070, metalness: 0.8, roughness: 0.35 }), wireM = new THREE.MeshStandardMaterial({ color: 0xaaaaa4, metalness: 1, roughness: 0.3 });
      [['onions', 0xd8d0a0, 0xe8e0c0], ['gherkins', 0x8a9a5a, 0x5a6a2a], ['mustard', 0xc89a30, 0xc89a30], ['chutney', 0x7a3418, 0x5a2410]].forEach(([n, bc, fc], i) => {
        const j = new THREE.Group(); j.position.set(WR1 - 0.62 + i * 0.15, Y + 0.025, Zc - 0.1 + (i % 2) * 0.05); j.rotation.y = (i - 1.5) * 0.3; root.add(j);
        const h = 0.13 + (i % 2) * 0.03, rr = 0.045;
        const body = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, h, 24, 1, true), glassM); body.position.y = h / 2; body.renderOrder = 4; j.add(body);
        const fill = new THREE.Mesh(new THREE.CylinderGeometry(rr - 0.004, rr - 0.004, h * 0.82, 20), brine(bc)); fill.position.y = h * 0.41 + 0.002; fill.renderOrder = 3; j.add(fill);
        if (n === 'onions') for (let k = 0; k < 9; k++) { const o = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshStandardMaterial({ color: fc, roughness: 0.3 })); o.position.set((Math.random() - 0.5) * 0.05, 0.02 + Math.random() * h * 0.7, (Math.random() - 0.5) * 0.05); j.add(o); }
        if (n === 'gherkins') for (let k = 0; k < 5; k++) { const o = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.07, 4, 8), new THREE.MeshStandardMaterial({ color: fc, roughness: 0.5 })); o.position.set((k - 2) * 0.014, 0.06, (k % 2 - 0.5) * 0.02); o.rotation.z = (k - 2) * 0.12; j.add(o); }
        const lid = cyl(rr + 0.004, rr + 0.004, 0.015, lidM, 0, h + 0.008, 0, j, 24);
        const bail = new THREE.Mesh(new THREE.TorusGeometry(rr * 0.9, 0.0018, 4, 20, Math.PI), wireM); bail.position.y = h + 0.005; bail.rotation.y = 0.4; j.add(bail);
        const tag = canvasTexture(128, 64, (g, W, H) => { g.fillStyle = '#efe6cc'; g.fillRect(0, 0, W, H); g.fillStyle = '#1b2a5a'; g.font = `400 30px "Nanum Pen Script", Caveat, cursive`; g.textAlign = 'center'; g.fillText(n, W / 2, 28); g.fillStyle = '#8a1a14'; g.fillText(['¥18', '¥22', '¥15', '¥26'][i], W / 2, 56); });
        const tg = plane(0.05, 0.025, lit(tag), 0, h * 0.5, rr + 0.002, 0, j); tg.rotation.z = (Math.random() - 0.5) * 0.15;
      }); }
    // brass price spike with a ticket for the hanging salami
    { const sp = cyl(0.003, 0.003, 0.2, new THREE.MeshStandardMaterial({ color: 0xb89048, metalness: 1, roughness: 0.3 }), cxw + 0.32, Y + 0.12, Zc + 0.12, root, 6); cyl(0.02, 0.025, 0.012, sp.material, cxw + 0.32, Y + 0.03, Zc + 0.12, root, 12);
      const t = canvasTexture(192, 128, (g, W, H) => { g.fillStyle = '#f2ecd8'; g.fillRect(0, 0, W, H); g.strokeStyle = '#8a1a14'; g.lineWidth = 4; g.strokeRect(6, 6, W - 12, H - 12); g.fillStyle = '#1b1b1b'; g.textAlign = 'center'; g.font = `400 40px "Nanum Pen Script", Caveat, cursive`; g.fillText('Cured salami', W / 2, 48); g.fillStyle = '#8a1a14'; g.font = `600 46px Caveat, cursive`; g.fillText('¥74 / 100g', W / 2, 100); });
      const tk = plane(0.09, 0.06, lit(t), cxw + 0.32, Y + 0.2, Zc + 0.122, 0, root); tk.rotation.z = -0.06; }
  }

  // ---------------------------------------------------------------- 遮雨篷：一条老式条纹帆布伸缩篷（墨绿 / 奶白），钢管骨架、顶上卷轴箱、两侧折臂、前沿一道波浪边
  //   帆布被雨浸透：颜色发深、表面一层湿亮；褪色、霉点、锈水、补丁、两个破洞、边缘起毛；骨架之间的布往下兜，最低处积着水往下滴
  { const W = SX1 - SX0 + 0.5, L = 1.75, y0 = SH + 0.05, z0 = 0.2, drop = 0.85, cx = (SX0 + SX1) / 2;
    const RIBS = 6, rib = W / RIBS, ang = Math.atan2(drop, Math.sqrt(L * L - drop * drop));
    const cloth = canvasTexture(1024, 512, (g, Wt, Ht) => {
      const r = R(311), n = 14;
      for (let k = 0; k < n; k++) { g.fillStyle = k % 2 ? '#cfc6ad' : '#1f4a36'; g.fillRect(k * Wt / n, 0, Wt / n + 1, Ht); }   // stripes
      const sun = g.createLinearGradient(0, 0, 0, Ht); sun.addColorStop(0, 'rgba(255,240,210,.0)'); sun.addColorStop(1, 'rgba(230,220,190,.22)'); g.fillStyle = sun; g.fillRect(0, 0, Wt, Ht);   // faded toward the street
      for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${40 + r() * 30},${44 + r() * 30},${30},${0.12 + r() * 0.2})`; g.beginPath(); g.ellipse(r() * Wt, r() * Ht, 10 + r() * 60, 6 + r() * 30, r() * 3, 0, 7); g.fill(); }   // damp blotches
      for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(20,30,18,${0.2 + r() * 0.4})`; g.beginPath(); g.arc(r() * Wt, Ht * (0.6 + r() * 0.4), 0.8 + r() * 2.5, 0, 7); g.fill(); }   // mildew speckle low down
      for (let i = 0; i < RIBS + 1; i++) { const x = i / RIBS * Wt; const gr = g.createLinearGradient(x - 14, 0, x + 14, 0); gr.addColorStop(0, 'rgba(90,40,10,0)'); gr.addColorStop(.5, 'rgba(90,40,10,.45)'); gr.addColorStop(1, 'rgba(90,40,10,0)'); g.fillStyle = gr; g.fillRect(x - 14, 0, 28, Ht); }   // rust from the ribs
      for (let i = 0; i < 2; i++) { const x = Wt * (0.2 + r() * 0.6), y = Ht * (0.25 + r() * 0.4); g.fillStyle = '#7a6a52'; g.fillRect(x, y, 60 + r() * 30, 40 + r() * 20); g.strokeStyle = 'rgba(30,24,16,.7)'; g.setLineDash([4, 4]); g.lineWidth = 2; g.strokeRect(x + 3, y + 3, 54, 34); g.setLineDash([]); }   // patches
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, Wt, 10);
    });
    const holes = canvasTexture(1024, 512, (g, Wt, Ht) => { g.fillStyle = '#fff'; g.fillRect(0, 0, Wt, Ht); g.fillStyle = '#000'; const r = R(77);
      for (const [hx, hy, hr] of [[0.18, 0.55, 22], [0.71, 0.72, 15]]) { g.beginPath(); for (let k = 0; k < 14; k++) { const a = k / 14 * 6.28, rr = hr * (0.5 + r() * 0.8); g.lineTo(hx * Wt + Math.cos(a) * rr * 1.6, hy * Ht + Math.sin(a) * rr); } g.fill(); } });
    const fabN = pbr('canvas_fabric', W, L, { size: 0.5 });
    const can = new THREE.MeshPhysicalMaterial({ map: cloth, alphaMap: holes, alphaTest: 0.5, side: THREE.DoubleSide, normalMap: fabN.normalMap, roughnessMap: fabN.roughnessMap,
      roughness: 0.75, clearcoat: 0.55, clearcoatRoughness: 0.22, color: 0xb8b8b0, envMapIntensity: 1.2 });   // soaked canvas: dull fibre under a wet sheen
    // canopy: one sheet from the roller box to the front bar, sagging between ribs, a pond in the middle bay
    const geo = new THREE.PlaneGeometry(W, L, 96, 24), P = geo.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), v = P.getY(i) / L + 0.5, fx = ((x + W / 2) / rib) % 1;
      let sag = Math.sin(fx * Math.PI) * 0.06 * Math.sin(v * Math.PI);
      sag += Math.exp(-((x - 0.3) ** 2) / 0.4 - ((v - 0.62) ** 2) / 0.02) * 0.07;                       // water pooled here
      P.setZ(i, -sag + Math.sin(x * 9 + v * 4) * 0.004);
    }
    geo.computeVertexNormals();
    const canopy = new THREE.Mesh(geo, can); canopy.position.set(cx, y0 - drop / 2, z0 + Math.sqrt(L * L - drop * drop) / 2); canopy.rotation.x = -Math.PI / 2 + ang; root.add(canopy);
    const zf = z0 + Math.sqrt(L * L - drop * drop), yf = y0 - drop;
    // scalloped valance hanging off the front bar, same canvas, frayed bottom
    const valT = canvasTexture(1024, 96, (g, Wt, Ht) => { g.fillStyle = '#fff'; g.fillRect(0, 0, Wt, Ht); g.fillStyle = '#000'; const r = R(9);
      for (let k = 0; k < 28; k++) { const x0 = k / 28 * Wt; g.beginPath(); g.moveTo(x0, Ht); g.quadraticCurveTo(x0 + Wt / 56, Ht * 0.45, x0 + Wt / 28, Ht); g.fill(); }
      for (let i = 0; i < 300; i++) { g.fillRect(r() * Wt, Ht * (0.55 + r() * 0.45), 1, 2 + r() * 6); } });
    const vm = can.clone(); vm.alphaMap = valT; vm.map = cloth;
    const vg = new THREE.PlaneGeometry(W, 0.32, 96, 2), vp = vg.attributes.position; for (let i = 0; i < vp.count; i++) vp.setZ(i, Math.sin(vp.getX(i) * 5) * 0.01); vg.computeVertexNormals();
    const val = new THREE.Mesh(vg, vm); val.position.set(cx, yf - 0.15, zf + 0.02); root.add(val);
    { const t = canvasTexture(1024, 96, (g, Wt, Ht) => { g.clearRect(0, 0, Wt, Ht); g.fillStyle = 'rgba(236,228,206,.92)'; g.font = `700 40px ${'Georgia, serif'}`; g.textAlign = 'center'; g.fillText('PORK.exe  ·  BUTCHER & DELI', Wt / 2, 46); g.globalCompositeOperation = 'destination-out'; const r = R(5); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(0,0,0,${r()})`; g.fillRect(r() * Wt, r() * Ht, 2 + r() * 10, 1 + r() * 3); } });
      const lt = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.7, 0.16), new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, roughness: 0.8 })); lt.position.set(cx, yf - 0.1, zf + 0.035); root.add(lt); }   // lettering painted on the valance
    // frame: roller box on the fascia, front bar, ribs, two folding side arms with an elbow joint, wall brackets
    const steelP = pbr('rusty_painted_metal', 1, 1, { size: 0.6, metalness: 0.6, roughness: 0.7, color: 0x3a3e3a });
    box(W + 0.1, 0.18, 0.2, steelP, cx, y0 + 0.08, z0 - 0.02, root);
    const bar = cyl(0.03, 0.03, W + 0.04, steelP, cx, yf, zf, root, 12); bar.rotation.z = Math.PI / 2;
    for (let k = 0; k <= RIBS; k++) { const x = SX0 - 0.25 + k * rib, r = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, L, 8), steelP); r.position.set(x, y0 - drop / 2 - 0.045, (z0 + zf) / 2); r.rotation.x = Math.PI / 2 + ang; root.add(r); }   // along the slope, under the canvas
    for (const sx of [SX0 - 0.15, SX1 + 0.15]) {
      const wy = y0 - 1.25, elbow = new THREE.Vector3(sx, wy + 0.55, (z0 + zf) / 2 + 0.15);
      for (const [a, b] of [[new THREE.Vector3(sx, wy, 0.12), elbow], [elbow, new THREE.Vector3(sx, yf - 0.02, zf)]]) { const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, d.length(), 10), steelP); m.position.copy(a).lerp(b, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); root.add(m); }
      const j = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), steelP); j.position.copy(elbow); root.add(j);
      box(0.12, 0.2, 0.06, steelP, sx, wy, 0.09, root);
      decal('Leaking006', root, { pos: [sx + 0.05, wy - 0.7, 0.13], w: 0.25, h: 1.4, color: 0x3a2010, opacity: 0.65 });   // rust run below the bracket
    }
    // water: drops falling off the low points of the valance and the pond's edge, a wet stripe on the pavement under the drip line
    const dropM = new THREE.MeshPhysicalMaterial({ color: 0xc0ccd2, roughness: 0, transmission: 0, transparent: true, opacity: 0.55, clearcoat: 1 });
    const drips = [];
    for (let i = 0; i < 26; i++) { const x = SX0 - 0.2 + (i + 0.5) / 26 * W + (rnd() - 0.5) * 0.08; const d = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 5), dropM); d.scale.y = 1.8; d.userData = { x, ph: rnd(), sp: 2.5 + rnd() * 1.5 }; root.add(d); drips.push(d); }
    awningDrips = { drips, y: yf - 0.3, z: zf + 0.03 };
    { const wet = new THREE.Mesh(new THREE.PlaneGeometry(W, 0.35), new THREE.MeshStandardMaterial({ color: 0x0c0e10, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }));
      wet.rotation.x = -Math.PI / 2; wet.position.set(cx, 0.153, zf + 0.04); root.add(wet); }
  }
  // ---------------------------------------------------------------- 门前：花槽（常春藤）、三根铸铁护柱、铁桌椅、绿植
  for (const x of [WL0 + 0.6, WL0 + 1.6, WL0 + 2.6]) model('planter_box_01', { pos: [x, 0.15, 0.45], parent: root });
  bush((WL0 + WL1) / 2 - 0.3, 0.55, 0.45, 2.9, 0.35, 150); vine(WL0 + 0.8, 0.9, 0.62, 0.5, 4); vine(WL0 + 2.4, 0.9, 0.62, 0.4, 3);
  for (const x of [-7.4, -2.6, 1.0]) { const g = new THREE.Group(); g.position.set(x, 0.15, 3.6); root.add(g); cyl(0.07, 0.09, 0.95, M.iron, 0, 0.47, 0, g, 16); const tp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.iron); tp.position.y = 0.95; g.add(tp); cyl(0.095, 0.095, 0.05, M.iron, 0, 0.75, 0, g, 16); blob(x, 3.6, 0.5); }
  model('outdoor_table_chair_set_01', { pos: [1.4, 0.15, 1.1], rot: 0.5, jitter: 0.15, parent: root });
  model('potted_plant_02', { pos: [2.4, 0.15, 0.55], scale: 1.0, parent: root });

  // ---------------------------------------------------------------- 右边：两只高气瓶、告示、墨绿色侧门、门上的小灯、木箱、排风口
  // Two food-grade CO₂ cylinders (for the meat's modified-atmosphere packs): seamless steel, black body, grey shoulder,
  // brass valve with handwheel and a guard ring, a wrap label, a hazard diamond, a tag on string, chained to a wall bracket.
  { const prof = [[0, 0], [0.09, 0], [0.112, 0.012], [0.116, 0.04], [0.116, 1.36], [0.112, 1.43], [0.098, 1.49], [0.074, 1.535], [0.042, 1.56], [0.03, 1.575], [0.03, 1.6], [0, 1.6]].map(([r, y]) => new THREE.Vector2(r, y));
    const shoulderAt = 1.34;
    // satin enamel on steel: knocks and scrapes down to bare metal, rust where it stands in water
    const paintTex = (base, seed, rust) => canvasTexture(512, 512, (g, W, H) => {
      const r = R(seed); g.fillStyle = base; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.05})`; g.fillRect(0, r() * H, W, 1 + r() * 4); }
      for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(170,170,165,${0.25 + r() * 0.5})`; g.lineWidth = 0.6 + r() * 1.4; const x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 14); g.stroke(); }
      for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(150,150,145,${0.4 + r() * 0.4})`; g.beginPath(); g.ellipse(r() * W, r() * H, 2 + r() * 6, 1 + r() * 4, r() * 3, 0, 7); g.fill(); }
      if (rust) for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${110 + r() * 50},${50 + r() * 30},20,${0.3 + r() * 0.5})`; g.beginPath(); g.ellipse(r() * W, H * (0.88 + r() * 0.12), 1 + r() * 5, 1 + r() * 3, 0, 0, 7); g.fill(); }
    });
    const bodyM = new THREE.MeshPhysicalMaterial({ map: paintTex('#1c1d1f', 81, true), roughness: 0.55, metalness: 0.2, clearcoat: 0.35, clearcoatRoughness: 0.45 });
    const greyM = new THREE.MeshPhysicalMaterial({ map: paintTex('#4a4e50', 82, false), roughness: 0.42, metalness: 0.2, clearcoat: 0.35, clearcoatRoughness: 0.45 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xb08a48, metalness: 1, roughness: 0.35 });
    const wheelM = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 });
    const split = (lo, hi) => prof.filter(([r, y]) => true).map((v) => new THREE.Vector2(v.x, THREE.MathUtils.clamp(v.y, lo, hi)));
    const label = canvasTexture(512, 192, (g, W, H) => {
      g.fillStyle = '#e8e4d6'; g.fillRect(0, 0, W, H); g.fillStyle = '#1a1a1a'; g.font = `800 34px ${SANS}`; g.fillText('CARBON DIOXIDE', 24, 52);
      g.font = `600 20px ${SANS}`; g.fillText('FOOD GRADE · E290 · UN 1013', 24, 84); g.fillText('Liquefied · 25 kg · 57 bar', 24, 112);
      g.font = `500 16px ${SANS}`; g.fillText('Gas for modified-atmosphere packs. Keeps the meat pink.', 24, 150);
      g.save(); g.translate(430, 92); g.rotate(Math.PI / 4); g.fillStyle = '#2a8a3a'; g.fillRect(-46, -46, 92, 92); g.restore();
      g.fillStyle = '#fff'; g.font = `800 26px ${SANS}`; g.textAlign = 'center'; g.fillText('2', 430, 128); g.textAlign = 'left';
      ageCanvas(g, W, H, { amount: 1.6, seed: 61 });
    });
    const labelM = new THREE.MeshStandardMaterial({ map: label, roughness: 0.85, color: 0xb8b2a4 });
    const wheels = [], outlets = [];
    [[3.52, 0.32, 0.4], [3.96, 0.36, -0.6]].forEach(([x, z, turn], k) => {
      const c = new THREE.Group(); c.position.set(x, 0.15, z); c.rotation.y = turn; c.scale.setScalar(0.7); root.add(c);   // a 10 kg beverage cylinder: about 1.1 m, not a welding bottle
      c.add(new THREE.Mesh(new THREE.LatheGeometry(split(0, shoulderAt), 32), bodyM));
      c.add(new THREE.Mesh(new THREE.LatheGeometry(split(shoulderAt, 1.6), 32), greyM));
      const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.1172, 0.1172, 0.24, 32, 1, true, -1.1, 2.2), labelM); lb.position.y = 0.98; c.add(lb);
      cyl(0.024, 0.026, 0.09, brass, 0, 1.64, 0, c, 16);
      const out = cyl(0.012, 0.012, 0.06, brass, 0.035, 1.635, 0, c, 10); out.rotation.z = Math.PI / 2;
      const hwG = new THREE.Group(); hwG.position.y = 1.7; c.add(hwG); wheels.push(hwG);
      const hw = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 18), wheelM); hw.rotation.x = Math.PI / 2; hwG.add(hw);
      for (let s = 0; s < 3; s++) { const sp = box(0.06, 0.006, 0.006, wheelM, 0, 0, 0, hwG); sp.rotation.y = s * Math.PI / 3; }
      c.updateMatrixWorld(true); outlets.push(c.localToWorld(new THREE.Vector3(0.068, 1.635, 0)));
      const guard = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.008, 6, 24), greyM); guard.rotation.x = Math.PI / 2; guard.position.y = 1.73; c.add(guard);
      for (let s = 0; s < 3; s++) { const a = s * Math.PI * 2 / 3; cyl(0.006, 0.006, 0.16, greyM, Math.cos(a) * 0.07, 1.65, Math.sin(a) * 0.07, c, 6); }
      // tag on string
      const tag = canvasTexture(128, 200, (g, W, H) => { g.fillStyle = k ? '#e8c84a' : '#e8e6dc'; g.fillRect(0, 0, W, H); g.fillStyle = '#222'; g.font = `800 22px ${SANS}`; g.fillText(k ? 'IN USE' : 'FULL', 14, 40);
        g.font = `500 14px ${SANS}`; ['Batch C-2611', 'Filled 18/11', 'Return to BOC'].forEach((t, i) => g.fillText(t, 14, 80 + i * 24)); g.beginPath(); g.arc(W / 2, 14, 6, 0, 7); g.fillStyle = '#666'; g.fill(); ageCanvas(g, W, H, { amount: 1.4, seed: 70 + k }); });
      const tg = plane(0.06, 0.094, lit(tag, { side: THREE.DoubleSide }), 0.13, 1.5, 0, Math.PI / 2, c); tg.rotation.z = 0.06;   // hangs off the outlet, clear of the shoulder
      const st = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(0.066, 1.635, 0), new THREE.Vector3(0.13, 1.548, 0)), 2, 0.0008, 3), wheelM); c.add(st);
      decal('Leaking007', c, { pos: [0, 0.2, 0.118], w: 0.24, h: 0.4, color: 0x3a2a1a, opacity: 0.6, rot: [0, 0, Math.PI] });
    });
    // wall bracket and a chain across the front of both cylinders
    box(0.86, 0.05, 0.08, M.iron, 3.70, 0.88, 0.05, root);
    const chainM = new THREE.MeshStandardMaterial({ color: 0x8a8a84, metalness: 1, roughness: 0.45 });
    const ch = new THREE.CatmullRomCurve3([[3.32, 0.88, 0.08], [3.35, 0.865, 0.28], [3.42, 0.85, 0.4], [3.52, 0.84, 0.42], [3.74, 0.82, 0.44], [3.96, 0.84, 0.45], [4.06, 0.85, 0.41], [4.08, 0.865, 0.28], [4.08, 0.88, 0.08]].map((p) => new THREE.Vector3(...p)));
    for (let i = 0; i < 64; i++) { const t = i / 63, p = ch.getPoint(t), d = ch.getTangent(t); const l = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0035, 5, 10), chainM); l.position.copy(p); l.lookAt(p.clone().add(d)); l.rotateY(Math.PI / 2); if (i % 2) l.rotateX(Math.PI / 2); l.scale.set(1.5, 1, 1); root.add(l); }
    // the valve: crack it open and the handwheel turns, a cold white jet hisses out of the outlet for a few seconds
    const puffMap = canvasTexture(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    const puffs = []; for (let i = 0; i < 40; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffMap, transparent: true, depthWrite: false, opacity: 0, color: 0xe8eef0 })); sp.userData.ph = i / 40; root.add(sp); puffs.push(sp); }
    valve = { wheels, outlets, puffs, t0: -99 };
  }
  // 墙上的告示：几张真的纸——A4 打印的招工启事（底下一排撕号码的条，撕掉了几条）、手写的熟客须知、复印的寻猫启事（照片发糊）、
  //   一张施工通知；纸的白不一样，被雨打湿的地方发灰起皱、墨水晕开，角上贴着胶带或者图钉，没贴牢的角翘起来
  { const PEN = (px) => `400 ${px}px "Nanum Pen Script", "Caveat", cursive`;
    const sheet = (w, h, draw, { x, y, rz = 0, seed = 1, tint = '#e8e4d8', curl = 0.02, tabs = 0, pins = 'tape' }) => {
      const W = Math.round(w * 1400), H = Math.round(h * 1400), r = R(seed);
      const tex = canvasTexture(W, H, (g) => {
        g.fillStyle = tint; g.fillRect(0, 0, W, H);
        for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.03})`; g.fillRect(r() * W, r() * H, 1 + r() * 3, 1 + r() * 3); }   // paper grain
        g.fillStyle = '#1c1c1c'; g.textAlign = 'center'; draw(g, W, H, r);
        // rain: grey damp patches, ink running down from the lower lines, a tide line
        for (let i = 0; i < 5; i++) { const cx = r() * W, cy = H * (0.4 + r() * 0.6), rr = 20 + r() * 60, gr = g.createRadialGradient(cx, cy, 2, cx, cy, rr); gr.addColorStop(0, 'rgba(90,92,96,.1)'); gr.addColorStop(0.8, 'rgba(90,92,96,.06)'); gr.addColorStop(0.95, 'rgba(110,95,60,.1)'); gr.addColorStop(1, 'rgba(110,95,60,0)'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.fill(); }
        for (let i = 0; i < 14; i++) { const x0 = r() * W, y0 = H * (0.35 + r() * 0.5), l = 10 + r() * 50; g.strokeStyle = `rgba(30,30,60,${0.08 + r() * 0.15})`; g.lineWidth = 1 + r() * 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + (r() - 0.5) * 3, y0 + l); g.stroke(); }
        g.fillStyle = 'rgba(120,100,60,.18)'; g.fillRect(0, H * 0.93, W, H * 0.07);
        if (tabs) { const tw = W / tabs; g.globalCompositeOperation = 'destination-out'; for (let k = 0; k < tabs; k++) { if (r() < 0.45) { g.fillStyle = '#000'; g.beginPath(); g.moveTo(k * tw + 2, H); g.lineTo(k * tw + 2, H * 0.8 + r() * 6); for (let j = 0; j < 6; j++) g.lineTo(k * tw + j / 5 * (tw - 4), H * 0.8 + (r() - 0.5) * 8); g.lineTo((k + 1) * tw - 2, H); g.fill(); } } g.globalCompositeOperation = 'source-over'; }
      });
      const geo = new THREE.PlaneGeometry(w, h, 6, 8), P = geo.attributes.position, lc = r() < 0.5 ? 1 : -1;
      for (let i = 0; i < P.count; i++) { const u = P.getX(i) / w * 2, v = P.getY(i) / h * 2; P.setZ(i, 0.002 + 0.003 * (1 - v * v) + curl * Math.max(0, u * lc) ** 2 * Math.max(0, -v) ** 2 + Math.sin(u * 5 + v * 3 + seed) * 0.0015); }   // bellied, one lower corner curling off the wall
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, alphaTest: 0.4, transparent: false, side: THREE.DoubleSide }));
      m.position.set(x, y, 0.012); m.rotation.z = rz; root.add(m);
      const tapeM = new THREE.MeshStandardMaterial({ color: 0xe0d8b0, roughness: 0.4, transparent: true, opacity: 0.75 });
      for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { if (sx === lc && sy === -1) continue;
        if (pins === 'tape') { const t = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.016), tapeM); t.position.set(sx * w / 2 * 0.92, sy * h / 2 * 0.94, 0.0045); t.rotation.z = sx * sy * 0.7; m.add(t); }
        else if (sy > 0) { const pin = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), new THREE.MeshStandardMaterial({ color: [0xb02020, 0x2050a0, 0xe0c020][Math.floor(r() * 3)], roughness: 0.3 })); pin.position.set(sx * w / 2 * 0.85, h / 2 * 0.9, 0.006); m.add(pin); } }
      return m;
    };
    sheet(0.21, 0.297, (g, W, H, r) => {                                      // printed A4, phone-number tabs along the bottom
      g.font = `800 ${W * 0.13}px ${SANS}`; g.fillText('HIRING', W / 2, H * 0.14);
      g.font = `600 ${W * 0.06}px ${SANS}`; g.fillText('NIGHT PACKERS', W / 2, H * 0.24); g.font = `400 ${W * 0.045}px ${SANS}`;
      ['Mon–Sat · 22:00–06:00', 'Cash paid daily', 'No experience needed', 'Ask for Danny at Door 02'].forEach((t, i) => g.fillText(t, W / 2, H * (0.36 + i * 0.07)));
      g.save(); for (let k = 0; k < 8; k++) { g.save(); g.translate(k * W / 8 + W / 16, H * 0.9); g.rotate(-Math.PI / 2); g.font = `500 ${W * 0.032}px ${SANS}`; g.fillText('07700 900' + (300 + k), 0, 4); g.restore(); g.strokeStyle = 'rgba(0,0,0,.4)'; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(k * W / 8, H * 0.8); g.lineTo(k * W / 8, H); g.stroke(); } g.restore();
    }, { x: 4.88, y: 1.62, rz: 0.03, seed: 11, tint: '#eeece4', tabs: 8 });
    sheet(0.15, 0.2, (g, W, H, r) => {                                         // handwritten on lined pad paper
      g.strokeStyle = 'rgba(80,110,160,.35)'; for (let y = H * 0.18; y < H; y += H * 0.085) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      g.fillStyle = '#1b2a5a'; g.textAlign = 'left';
      [['Regulars —', 0.16, 0.13], ['use the side door', 0.26, 0.1], ['after 9pm.', 0.35, 0.1], ['knock 3 times', 0.47, 0.11], ['— D.', 0.6, 0.1]].forEach(([t, y, s], i) => { g.save(); g.translate(W * 0.08 + r() * 4, H * y); g.rotate((r() - 0.5) * 0.05); g.font = PEN(W * s * 1.4); g.fillText(t, 0, 0); g.restore(); });
      g.strokeStyle = '#1b2a5a'; g.lineWidth = 2; g.beginPath(); g.moveTo(W * 0.55, H * 0.49); g.quadraticCurveTo(W * 0.75, H * 0.52, W * 0.92, H * 0.47); g.stroke();
    }, { x: 4.42, y: 1.36, rz: -0.06, seed: 23, tint: '#f2efe0', pins: 'pin', curl: 0.03 });
    sheet(0.148, 0.21, (g, W, H, r) => {                                       // photocopied lost-cat poster: grey, grainy, the photo blotchy
      g.fillStyle = '#d8d8d2'; g.fillRect(0, 0, W, H); g.fillStyle = '#111'; g.font = `900 ${W * 0.16}px ${SANS}`; g.fillText('LOST CAT', W / 2, H * 0.14);
      g.fillStyle = '#555'; g.fillRect(W * 0.15, H * 0.2, W * 0.7, H * 0.36); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? 20 : 200},${r() < 0.5 ? 20 : 200},${r() < 0.5 ? 20 : 200},${r() * 0.5})`; g.fillRect(W * 0.15 + r() * W * 0.7, H * 0.2 + r() * H * 0.36, 2, 2); }
      g.fillStyle = 'rgba(20,20,20,.75)'; g.beginPath(); g.ellipse(W / 2, H * 0.42, W * 0.2, H * 0.1, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(W / 2, H * 0.3, W * 0.12, H * 0.07, 0, 0, 7); g.fill();
      g.fillStyle = '#111'; g.font = `700 ${W * 0.085}px ${SANS}`; g.fillText('"BISCUIT"', W / 2, H * 0.65); g.font = `400 ${W * 0.055}px ${SANS}`;
      ['Grey tabby · female · 9 yrs', 'Shy. Last seen Cable St.', 'REWARD · 07700 900461'].forEach((t, i) => g.fillText(t, W / 2, H * (0.74 + i * 0.07)));
      g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(200,200,190,.4)'; for (let i = 0; i < 40; i++) g.fillRect(0, r() * H, W, 1); g.globalCompositeOperation = 'source-over';
    }, { x: 5.08, y: 2.24, rz: 0.05, seed: 37, tint: '#dcdcd6' });
    sheet(0.21, 0.148, (g, W, H, r) => {                                       // council works notice, landscape
      g.fillStyle = '#1a3a6a'; g.fillRect(0, 0, W, H * 0.2); g.fillStyle = '#fff'; g.font = `800 ${H * 0.12}px ${SANS}`; g.fillText('NOTICE OF WORKS', W / 2, H * 0.14);
      g.fillStyle = '#1c1c1c'; g.font = `400 ${H * 0.075}px ${SANS}`; ['Basement drainage works will take place', 'overnight 11 Nov – 2 Dec.', 'We apologise for any disturbance.'].forEach((t, i) => g.fillText(t, W / 2, H * (0.38 + i * 0.13)));
      g.font = `600 ${H * 0.06}px ${SANS}`; g.fillText('Southwark Building Control · ref. BC/26/0941', W / 2, H * 0.86);
    }, { x: 4.6, y: 2.06, rz: -0.02, seed: 49, tint: '#f0eee8' });
  }
  const SDX = 6.4;
  // 仓库的 02 号门（和仓库里那扇是同一扇）：卷帘门拉起来一半，里面暖黄的灯照出来，看得见运输笼和托盘
  { const DW = 2.0, DTop = 3.15, OPEN = 1.35, y0 = 0.15;
    // 门里：一间真的小库房（不是画）——旧水泥地、水泥墙、压型钢板顶，里面一台扫描的仓储推车、木箱、周转箱、手推车，一盏暖灯
    { const RX0 = 4.9, RX1 = 7.9, RZ1 = -3.8, RH = 3.4, cx = (RX0 + RX1) / 2, cz = RZ1 / 2;
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(RX1 - RX0, -RZ1), pbr('concrete_floor_worn_001', RX1 - RX0, -RZ1, { size: 3, roughness: 0.75, color: 0x9a968c })); fl.rotation.x = -Math.PI / 2; fl.position.set(cx, y0 + 0.001, cz); root.add(fl);
      const wm = (w, h) => pbr('concrete_wall_008', w, h, { size: 3, roughness: 0.95, color: 0x8a867e });
      plane(RX1 - RX0, RH, wm(RX1 - RX0, RH), cx, y0 + RH / 2, RZ1, 0, root);
      for (const [x, ry] of [[RX0, Math.PI / 2], [RX1, -Math.PI / 2]]) plane(-RZ1 + 1, RH, wm(-RZ1, RH), x, y0 + RH / 2, (RZ1 - 1) / 2 + 0.5, ry, root);
      { const c = new THREE.Mesh(new THREE.PlaneGeometry(RX1 - RX0, -RZ1), pbr('corrugated_iron', RX1 - RX0, -RZ1, { size: 2.4, roughness: 0.7, metalness: 0.4, color: 0x6a6a64 })); c.rotation.x = Math.PI / 2; c.position.set(cx, y0 + RH, cz); root.add(c); }
      model('industrial_storage_cart', { pos: [5.7, y0, -2.6], rot: 0.35, parent: root });
      model('wooden_crate_01', { pos: [7.1, y0, -3.1], rot: -0.25, parent: root });
      for (let i = 0; i < 3; i++) model('plastic_crate_01', { pos: [6.55 + (i % 2) * 0.05, y0 + i * 0.262, -1.7], rot: 0.1 * i, jitter: 0.2, parent: root });
      model('hand_truck', { pos: [7.45, y0, -1.6], rot: -1.3, tilt: 0.05, parent: root });
      model('cardboard_box_01', { pos: [5.3, y0, -1.5], rot: 0.6, parent: root });
      decal('Leaking006', root, { pos: [6.0, y0 + 2.0, RZ1 + 0.01], w: 1.6, h: 2.4, color: 0x3a3428, opacity: 0.6 });
      const inL = new THREE.PointLight(0xffb870, 6, 5.5, 1.6); inL.position.set(6.4, y0 + 2.7, -1.7); root.add(inL); }   // 库房里的暖灯，光从半开的门底下照到湿地上
    for (const dx of [-DW / 2 - 0.07, DW / 2 + 0.07]) box(0.14, DTop - y0 + 0.2, 0.2, M.iron, SDX + dx, (DTop + y0) / 2 + 0.1, 0.06, root);   // 门框
    box(DW + 0.3, 0.42, 0.42, M.iron, SDX, DTop + 0.2, 0.18, root);                                                      // 卷轴箱
    plane(DW, DTop - y0 - OPEN, pbr('rusty_metal_shutter', DW, DTop - y0 - OPEN, { size: 2.2, roughness: 0.55, metalness: 0.45, color: 0xa8a8a0 }), SDX, y0 + OPEN + (DTop - y0 - OPEN) / 2, 0.08, 0, root);
    box(DW, 0.07, 0.06, M.steel, SDX, y0 + OPEN + 0.03, 0.09, root);
    const n02 = paintedText('02', { W: 256, H: 160, size: 140, y: 0.84, color: 'rgba(150,40,30,.88)', mask: 'SurfaceImperfections009' });   // 门上刷的“02”：磨掉的地方用真实扫描的瑕疵图擦
    plane(0.8, 0.5, new THREE.MeshStandardMaterial({ map: n02, transparent: true, depthWrite: false, roughness: 0.7 }), SDX + 0.3, y0 + OPEN + 0.95, 0.085, 0, root);
  }
  const sideLamp = new THREE.PointLight(0xffc070, 3.5, 4.5, 1.7);
  { const wl = new THREE.Group(); wl.position.set(SDX, 3.75, 0.08); root.add(wl); cyl(0.07, 0.12, 0.1, M.iron, 0, 0, 0.12, wl, 14); cyl(0.06, 0.06, 0.02, M.warm, 0, -0.06, 0.12, wl, 14); sideLamp.position.set(0, -0.2, 0.5); wl.add(sideLamp); }
  model('wooden_crate_01', { pos: [7.8, 0.15, 0.6], rot: 0.1, parent: root }); model('wooden_crate_01', { pos: [7.75, 0.5, 0.55], rot: -0.12, parent: root }); model('wooden_crate_01', { pos: [7.85, 0.85, 0.6], rot: 0.2, tilt: 0.04, parent: root });
  model('wooden_crate_02', { pos: [7.6, 0.15, 1.5], rot: 1.5, parent: root });
  model('trashbag', { pos: [4.95, 0.15, 0.65], rot: 0.5, parent: root });
  // kitchen extract above the side door: galvanised hood with a louvred face and a bird mesh, a duct going up the wall,
  // grease weeping out of the louvres and down the render, rust at the fixings
  { const galv = pbr('Metal009', 0.5, 0.5, { size: 0.5, metalness: 0.85, roughness: 0.55, color: 0x8a8c88 }), dark = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.8 });
    const v = new THREE.Group(); v.position.set(SDX + 0.9, 4.1, 0.05); root.add(v);
    box(0.5, 0.46, 0.26, galv, 0, 0, 0.13, v); box(0.42, 0.38, 0.01, dark, 0, 0, 0.262, v);
    for (let k = 0; k < 7; k++) { const sl = box(0.44, 0.012, 0.06, galv, 0, -0.17 + k * 0.055, 0.27, v); sl.rotation.x = -0.6; }
    const mesh = canvasTexture(64, 64, (g) => { g.clearRect(0, 0, 64, 64); g.strokeStyle = 'rgba(60,60,58,.9)'; g.lineWidth = 1.2; for (let i = 0; i < 64; i += 6) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.moveTo(0, i); g.lineTo(64, i); g.stroke(); } });
    mesh.wrapS = mesh.wrapT = THREE.RepeatWrapping; mesh.repeat.set(6, 6); plane(0.44, 0.4, new THREE.MeshStandardMaterial({ map: mesh, transparent: true, alphaTest: 0.3, metalness: 0.6, roughness: 0.6 }), 0, 0, 0.295, 0, v);
    box(0.54, 0.03, 0.3, galv, 0, 0.245, 0.14, v);
    cyl(0.09, 0.09, 1.6, galv, 0, 1.05, 0.12, v, 16); for (const y of [0.55, 1.15, 1.7]) cyl(0.096, 0.096, 0.03, galv, 0, y, 0.12, v, 16);
    decal('Leaking006', root, { pos: [SDX + 0.9, 3.35, 0.012], w: 0.5, h: 1.3, color: 0x3a2c14, opacity: 0.75 });   // grease run
    decal('Leaking007', root, { pos: [SDX + 0.9, 3.75, 0.304], w: 0.46, h: 0.3, color: 0x2a2010, opacity: 0.6 });
    for (const x of [-0.22, 0.22]) decal('Leaking006', root, { pos: [SDX + 0.9 + x, 3.6, 0.012], w: 0.12, h: 0.6, color: 0x4a2410, opacity: 0.7 }); }
  const steamTex = canvasTexture(128, 128, (g, W, H) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(220,226,224,.5)'); gr.addColorStop(1, 'rgba(220,226,224,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); });
  const steam = [];
  for (let i = 0; i < 10; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0.4 })); s.userData.ph = i / 10; root.add(s); steam.push(s); }

  // ---------------------------------------------------------------- 街面上的设备和杂物：门口的菜单立板、墙上的空调外机、电表箱、水龙头、监控、垃圾桶
  // 门口的黑板立牌：两面都用粉笔写了英文宣传和折扣（白、黄、粉三种粉笔，写错擦掉的地方留着灰印）
  { const cb = model('standing_chalkboard_01', { pos: [-2.75, 0.15, 1.75], rot: 0.45, parent: root });
    const CHALK = '600 {px}px Caveat, "Segoe Print", "Comic Sans MS", cursive';
    const f = (px) => CHALK.replace('{px}', px);
    const chalkSide = (draw, seed) => { const paint = (g, W, H) => {
      g.clearRect(0, 0, W, H);
      let n = seed; const r = () => (n = (n * 16807) % 2147483647) / 2147483647;
      g.filter = 'blur(10px)'; for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(220,224,218,${0.015 + r() * 0.03})`; g.beginPath(); g.ellipse(r() * W, r() * H, 50 + r() * 110, 10 + r() * 22, (r() - 0.5) * 0.6, 0, 7); g.fill(); } g.filter = 'none';   // 擦过没擦干净的粉笔灰：淡、横向、边缘模糊
      g.lineCap = g.lineJoin = 'round'; g.textBaseline = 'alphabetic';
      // written by hand in chalk: letter by letter, each with its own lean, size and height, the line drifting uphill a little;
      //   big headings in a brushier hand, small print in a scratchier one; every stroke gone over twice, unevenly
      const t = (txt, x, y, px, col = 'rgba(240,238,228,.95)', align = 'center', rot = 0) => {
        const big = px >= 56, fam = big ? `${px}px "Caveat Brush", Caveat, cursive` : `${Math.round(px * 1.32)}px "Nanum Pen Script", Caveat, cursive`;
        g.save(); g.translate(x, y); g.rotate(rot + (r() - 0.5) * 0.05); g.font = fam; g.textAlign = 'left'; g.fillStyle = col; g.strokeStyle = col;
        const glyphs = [...txt].map((ch) => ({ ch, w: g.measureText(ch).width, s: 0.9 + r() * 0.2, a: (r() - 0.5) * 0.12, dy: (r() - 0.5) * px * 0.06 }));
        const total = glyphs.reduce((a, q) => a + q.w * q.s * 0.98, 0); let cx = align === 'center' ? -total / 2 : align === 'right' ? -total : 0;
        const drift = (r() - 0.5) * 0.04;
        glyphs.forEach((q, i) => { g.save(); g.translate(cx, q.dy + cx * drift); g.rotate(q.a); g.scale(q.s, q.s * (0.95 + r() * 0.1));
          g.globalAlpha = 0.72 + r() * 0.28; g.fillText(q.ch, 0, 0);
          g.globalAlpha = 0.25 + r() * 0.2; g.fillText(q.ch, 1.2 + r() * 1.5, -0.8 + r() * 1.2);          // second pass of the chalk, a hair off
          g.globalAlpha = 0.15; g.lineWidth = 0.8; g.strokeText(q.ch, 0, 0); g.restore(); cx += q.w * q.s * (0.94 + r() * 0.08); });
        g.restore(); };
      const line = (pts, col = 'rgba(240,238,228,.85)', w = 4) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x + (r() - 0.5) * 3, y + (r() - 0.5) * 3) : g.moveTo(x, y))); g.stroke(); };
      draw(g, W, H, t, line, r);
      g.globalCompositeOperation = 'destination-out';                              // 粉笔的颗粒：随机抠掉一些像素，再加上顺着笔势拖出来的断线
      for (let i = 0; i < 14000; i++) { g.fillStyle = `rgba(0,0,0,${0.15 + r() * 0.55})`; g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2); }
      g.lineWidth = 1.2; for (let i = 0; i < 2600; i++) { const x0 = r() * W, y0 = r() * H, l = 4 + r() * 12; g.strokeStyle = `rgba(0,0,0,${0.3 + r() * 0.5})`; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + l * 0.94, y0 - l * 0.34); g.stroke(); }
      g.globalCompositeOperation = 'source-over';
      g.filter = 'blur(3px)'; for (let i = 0; i < 10; i++) { g.fillStyle = `rgba(230,230,222,${0.03 + r() * 0.05})`; g.beginPath(); g.ellipse(r() * W, r() * H, 14 + r() * 40, 5 + r() * 12, r() * 3, 0, 7); g.fill(); } g.filter = 'none';   // thumb smudges
      g.globalCompositeOperation = 'destination-out';
      g.globalCompositeOperation = 'source-over';
    };
      const tx = canvasTexture(660, 1000, paint); tx.userData.redraw = () => { paint(tx.userData.ctx, 660, 1000); tx.needsUpdate = true; }; return tx; };   // 手写字体到了再写一遍
    const Y = 'rgba(244,214,96,.95)', P = 'rgba(240,150,150,.95)';
    const front = chalkSide((g, W, H, t, line) => {
      t("TODAY'S SPECIALS", W / 2, 110, 74, Y);
      line([[110, 135], [330, 128], [550, 138]], Y, 4);
      t('Cultivated meat', W / 2, 205, 52);
      t('made to order · ready in 14 days', W / 2, 252, 34, 'rgba(240,238,228,.8)');
      t('Beef steak', 70, 345, 54, undefined, 'left'); t('¥168', 590, 345, 50, 'rgba(240,238,228,.6)', 'right');
      line([[505, 330], [592, 326]], 'rgba(240,238,228,.8)', 4);                     // 原价划掉
      t('¥138', 590, 400, 60, Y, 'right'); t('-20%', 470, 402, 40, P, 'right', -0.12);
      t('Pork chop', 70, 470, 54, undefined, 'left'); t('¥98', 590, 470, 50, undefined, 'right');
      t('Chicken breast', 70, 535, 54, undefined, 'left'); t('¥68', 590, 535, 50, undefined, 'right');
      t('per 200 g', 70, 575, 30, 'rgba(240,238,228,.6)', 'left');
      line([[60, 615], [600, 610]], 'rgba(240,238,228,.4)', 3);
      t('LUNCH SET  ¥32', W / 2, 685, 60, P);
      t('pork chop rice + soup of the day', W / 2, 730, 32);
      t('First order? ¥30 off', W / 2, 820, 50, Y);
      t('ask inside', W / 2, 865, 34, 'rgba(240,238,228,.8)');
      line([[420, 930], [520, 930]], 'rgba(240,238,228,.9)', 5); line([[495, 912], [522, 930], [495, 948]], 'rgba(240,238,228,.9)', 5);   // 往店里指的箭头
      t('come in', 400, 942, 38, undefined, 'right');
    }, 41);
    const back = chalkSide((g, W, H, t, line) => {
      t('PORK.exe', W / 2, 120, 78, Y);
      t('fresh · frozen · deli', W / 2, 175, 38);
      line([[120, 205], [540, 200]], Y, 3);
      t('OPEN', W / 2, 290, 54, P); t('Mon - Sat  11:00 - 22:00', W / 2, 345, 44); t('Sunday  12:00 - 20:00', W / 2, 395, 44);
      t('HAPPY HOUR  5 - 7 pm', W / 2, 500, 54, Y);
      t('2nd steak half price', W / 2, 555, 44);
      t('Tasting at the counter', W / 2, 650, 46);
      t('2 free pieces per person', W / 2, 700, 36, 'rgba(240,238,228,.8)');
      t('Cash · card · mobile pay', W / 2, 800, 40);
      t('No photos inside please', W / 2, 880, 36, P);
    }, 57);
    // 板面：正面往后仰 12°（顶部 z 0.07、y 1.4，底部 z 0.24、y 0.6），字贴在板面前 4 mm；背面对称
    const TILT = Math.atan2(0.24 - 0.07, 1.4 - 0.6), cy = 0.89, cz = 0.24 - (cy - 0.6) * Math.tan(TILT);
    const chalkM = (map) => new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 });
    const fp = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.97), chalkM(front)); fp.position.set(0.015, cy, cz + 0.004); fp.rotation.x = -TILT; cb.add(fp);
    const bp = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.97), chalkM(back)); bp.position.set(0.015, cy, -cz - 0.004); bp.rotation.set(TILT, Math.PI, 0); cb.add(bp);
    Promise.all([document.fonts.load(f(60), 'TODAY'), document.fonts.load('60px "Caveat Brush"', 'TODAY'), document.fonts.load('60px "Nanum Pen Script"', 'made')]).then(() => { for (const t of [front, back]) { t.userData?.redraw?.(); } }).catch(() => {});
  }
  model('exterior_aircon_unit', { pos: [4.65, GH + FH + 0.55, 0.24], parent: root });            // 二楼窗户之间的空调外机
  model('exterior_aircon_unit', { pos: [-4.65, GH + FH * 2 + 0.55, 0.24], parent: root });
  for (const [x, y] of [[4.65, GH + FH + 0.25], [-4.65, GH + FH * 2 + 0.25]]) { decal('Leaking006', root, { pos: [x + 0.6, y - 1.5, 0.014], w: 0.45, h: 2.6, color: 0x2a2a24, opacity: 0.7 }); }   // 空调滴水在墙上冲出的一道
  model('power_box_01', { pos: [7.75, 1.8, 0.06], parent: root });   // 让开 02 号门
  userDecal('poster_residue.webp', root, { pos: [5.65, 2.35, 0.018], w: 0.75, h: 0.5, mode: 'cut', roughness: 0.95 });   // 告示旁边撕掉的一张
  for (const [x, f] of [[3.1, 1], [-6.2, 0], [0, 2]]) userDecal('drips.webp', root, { pos: [x, GH + f * FH + 0.4 - 0.38, 0.016], w: 1.5, h: 0.75, opacity: 0.8 });   // 阳台板底下铁栏杆锈水流下来
  model('garden_hose_wall_mounted_01', { pos: [3.2, 0.85, 0.01], parent: root });
  model('security_camera_01', { pos: [SDX - 0.75, 3.05, 0.12], rot: -0.5, parent: root });
  model('metal_trash_can', { pos: [-6.9, 0.15, 0.55], rot: 0.15, parent: root });
  model('industrial_wall_lamp', { pos: [2.95, 3.4, 0.0], parent: root });
  // 地上：人行道上的口香糖和污渍、路面上的油渍、一条挖开又补上的沥青槽
  for (let i = 0; i < 7; i++) decal(['SurfaceImperfections003', 'SurfaceImperfections013', 'decal_18'][i % 3], root, { pos: [-7 + rnd() * 14, 0.153, 0.8 + rnd() * 3.2], rot: [-Math.PI / 2, 0, rnd() * 6], w: 0.8 + rnd() * 1.2, h: 0.8 + rnd() * 1.2, color: 0x1e1e1c, opacity: 0.5 });
  for (let i = 0; i < 5; i++) decal('decal_20', root, { pos: [-10 + rnd() * 20, 0.003, 6 + rnd() * 8], rot: [-Math.PI / 2, 0, rnd() * 6], w: 1.2 + rnd(), h: 1.6 + rnd(), color: 0x0e0e0c, opacity: 0.55, roughness: 0.15 });
  { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 15.6), pbr('asphalt_02', 1.1, 15.6, { size: 2.0, roughness: 0.88, envMapIntensity: 0.24, color: 0x5a5a58 })); p.rotation.x = -Math.PI / 2; p.position.set(5.6, 0.002, 12.2); root.add(p); }

  // ---------------------------------------------------------------- 左边：墙角的铸铁壁灯；往左是一条退进去的老街（远处的楼和亮着的窗）
  model('street_lamp_02', { pos: [BX0 + 0.15, 4.1, 0.05], scale: 1.2, parent: root });
  { const l = new THREE.PointLight(0xffb060, 5, 9, 1.6); l.position.set(BX0 + 0.15, 4.3, 0.95); root.add(l); const s = new THREE.SpotLight(0xffb060, 3.2, 14, 0.9, 0.6, 1.4); s.position.set(BX0 + 0.2, 4.4, 1.0); s.target.position.set(-5, 0, 4); root.add(s, s.target); }
  addMarketLane(root);
  const alleyFloor = new THREE.Mesh(new THREE.PlaneGeometry(6, 13), pbr('brick_pavement', 6, 13, {size:2, roughness:.55}));
  alleyFloor.rotation.x = -Math.PI/2; alleyFloor.position.set(-11.6,.01,-5.8); root.add(alleyFloor);
  { const sw2 = new THREE.Mesh(new THREE.PlaneGeometry(150, 2.5), pbr('stone_pavers', 150, 2.5, { size: 2.0, roughness: 0.9, envMapIntensity: 0.23, color: 0x7a7a78 })); sw2.rotation.x = -Math.PI / 2; sw2.position.set(0, 0.15, 21.2); root.add(sw2);
    box(150, 0.16, 0.28, M.stone(150, 0.3), 0, 0.075, 19.95, root);
    const rd2 = new THREE.Mesh(new THREE.PlaneGeometry(150, 16), pbr('square_cobblestone', 150, 16, { size: 2.2, roughness: 0.9, metalness: 0, envMapIntensity: 0.23, color: 0x6e6e6c })); rd2.rotation.x = -Math.PI / 2; rd2.position.set(0, -0.002, 12.4); root.add(rd2);
    const sw3 = new THREE.Mesh(new THREE.PlaneGeometry(30, 4.2), pbr('stone_pavers', 30, 4.2, { size: 2.0, roughness: 0.92, envMapIntensity: 0.2, color: 0x8a8a88 })); sw3.rotation.x = -Math.PI / 2; sw3.position.set(0, 0.149, 2.1); sw3.scale.x = 5; root.add(sw3); }
  // 对街的两盏铸铁路灯
  for (const x of [-9, 9]) { cyl(0.06, 0.1, 4.2, M.iron, x, 2.1, 19.6, root, 10); const lt = cyl(0.16, 0.1, 0.4, M.warm, x, 4.4, 19.6, root, 6); const l = new THREE.PointLight(0xffd09b, 1.9, 9, 2); l.position.set(x, 4.3, 19.4); root.add(l); }

  // ---------------------------------------------------------------- ground: puddles of every size, potholes, cracked and sunken pavers, grime, weeds, leaves
  { const gr = R(91);
    const wet = (x, y, z, w, d, rot, seed, deep = false) => {
      const pd = puddleDecal(seed); const m = new THREE.MeshStandardMaterial({ map: pd.map, roughnessMap: pd.roughnessMap, roughness: deep ? 0.06 : 0.14, metalness: 0.05, envMapIntensity: deep ? 1.1 : 0.8, opacity: deep ? 0.85 : 0.7, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
      const o = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m); o.rotation.set(-Math.PI / 2, 0, rot); o.position.set(x, y, z); root.add(o); return o; };
    // road: big and small puddles, a run of water along each gutter
    for (const [x, z, w, d] of [[-12, 6.2, 1.2, .7], [-3.6, 10.5, .6, .4], [2.4, 13.8, 2.2, 1.1], [8.6, 11.2, .5, .35], [11.5, 6.0, 1.6, .8], [-7.6, 15.6, .9, .5], [6.2, 16.5, 3.2, 1.4], [-14.5, 12.4, .45, .3], [15.8, 14.2, 1.1, .6], [0.6, 7.4, .35, .25]])
      wet(x, 0.004, z, w, d, gr() * 3, 40 + Math.round(x * 7 + z));
    for (const [z, y] of [[4.5, 0.004], [19.85, 0.004]]) for (let x = -18; x < 18; x += 3.1 + gr() * 2) wet(x, y, z, 1.4 + gr() * 1.4, 0.22, 0, 70 + Math.round(x), true);
    // potholes: broken surface ring with water standing in the hollow
    for (const [x, z, s] of [[-5.2, 8.9, 0.9], [4.1, 9.7, 0.6], [9.8, 14.8, 1.1], [-10.4, 16.8, 0.7], [13.2, 8.4, 0.5]]) {
      wet(x, 0.0055, z, s * 1.25, s * 1.0, gr() * 3, 200 + Math.round(x * 3), true);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(s * 0.42, 18), new THREE.MeshStandardMaterial({ color: 0x0c0d0e, roughness: 0.04, metalness: 0.2, envMapIntensity: 1.2, polygonOffset: true, polygonOffsetFactor: -4 }));
      const hp = hole.geometry.attributes.position; for (let i = 1; i < hp.count; i++) { const k = 0.75 + gr() * 0.4; hp.setXY(i, hp.getX(i) * k, hp.getY(i) * k * 0.8); }
      hole.rotation.set(-Math.PI / 2, 0, gr() * 3); hole.position.set(x, 0.006, z); root.add(hole);
    }
    // pavements: cracked flags, sunken corners holding water, grime and gum
    for (const [zc, zw] of [[2.1, 3.8], [21.2, 2.2]]) {
      for (let i = 0; i < 9; i++) decal(['decal_10', 'decal_17'][i % 2], root, { pos: [-17 + gr() * 34, 0.153, zc + (gr() - 0.5) * zw], rot: [-Math.PI / 2, 0, gr() * 6], w: 0.6 + gr() * 0.8, h: 0.6 + gr() * 0.8, color: 0x141310, opacity: 0.8 });
      for (let i = 0; i < 14; i++) decal(['SurfaceImperfections005', 'SurfaceImperfections009', 'SurfaceImperfections015', 'decal_10', 'decal_17'][i % 5], root, { pos: [-18 + gr() * 36, 0.152, zc + (gr() - 0.5) * zw], rot: [-Math.PI / 2, 0, gr() * 6], w: 0.7 + gr() * 1.6, h: 0.7 + gr() * 1.6, color: 0x1c1b18, opacity: 0.45 + gr() * 0.25 });
      for (let i = 0; i < 5; i++) wet(-16 + gr() * 32, 0.1535, zc + (gr() - 0.5) * zw * 0.8, 0.25 + gr() * 0.5, 0.18 + gr() * 0.3, gr() * 3, 120 + i + Math.round(zc));
    }
    // weeds: along both kerbs, at the foot of the buildings, and in a few paving joints
    const tufts = [];
    for (let x = -19; x < 19; x += 0.35 + gr() * 1.4) tufts.push([x, 0.002, 4.47 + gr() * 0.05, 0.8 + gr() * 0.6]);
    for (let x = -19; x < 19; x += 0.4 + gr() * 1.6) tufts.push([x, 0.002, 19.95 - gr() * 0.05, 0.8 + gr() * 0.6]);
    for (let x = -18; x < 18; x += 0.5 + gr() * 2.2) if (Math.abs(x + 1.1) > 1.2) tufts.push([x, 0.152, 0.06 + gr() * 0.05, 0.7 + gr() * 0.8]);
    for (let x = -18; x < 18; x += 0.6 + gr() * 2.4) tufts.push([x, 0.152, 22.35 - gr() * 0.05, 0.7 + gr() * 0.8]);
    for (let i = 0; i < 26; i++) tufts.push([-17 + gr() * 34, 0.152, 0.6 + gr() * 3.4, 0.35 + gr() * 0.3]);
    weeds(root, tufts, 5);
    // street plane trees in cast-iron pits, leaves on the ground beneath and washed into the gutter
    for (const [x, z, h, seed] of [[-9.7, 3.6, 8.4, 3], [9.2, 3.62, 7.6, 7], [-8.15, 21.0, 8.8, 11], [0.86, 21.05, 7.9, 13]]) {
      planeTree(root, { x, y: 0.152, z, h, seed });
      fallenLeaves(root, { x, y: 0.152, z, rx: 2.2, rz: 1.1, n: 70, seed });
      fallenLeaves(root, { x: x + 1, y: 0.003, z: z < 10 ? 4.55 : 19.8, rx: 3, rz: 0.12, n: 45, seed: seed + 50 });
    }
    // chairs: a café set outside the bookshop, two plastic chairs by the launderette, one by our side door
    model('outdoor_table_chair_set_01', { pos: [-1.3, 0.15, 21.05], rot: Math.PI + 0.3, jitter: 0.1, parent: root });
    model('plastic_monobloc_chair_01', { pos: [-13.7, 0.15, 21.25], rot: Math.PI + 0.35, parent: root });
    model('plastic_monobloc_chair_01', { pos: [-12.9, 0.15, 21.55], rot: Math.PI - 0.5, parent: root });
    model('plastic_monobloc_chair_01', { pos: [5.45, 0.15, 1.25], rot: -0.7, parent: root }).traverse((o) => { if (o.material && !o.material.userData.aged) { o.material.color.setHex(0xb4ae9e); o.material.userData.aged = true; } });   // years of rain: grey-beige, not white
  }

  // ---------------------------------------------------------------- 雨和雾
  // 细雨：七千根很短的雨丝，粗细一样、亮度各不相同，在显卡里下落（不再每帧用 CPU 挪三千根长线）
  { const RN = 11000, P = new Float32Array(RN * 6), S = new Float32Array(RN * 2 * 4);
    for (let i = 0; i < RN; i++) { const x = (rnd() - 0.5) * 30, y = rnd() * 11, z = -1 + rnd() * 15, len = 0.14 + rnd() * 0.16, a = 0.35 + rnd() * 0.65, sp = 6.5 + rnd() * 2.5;
      for (let e = 0; e < 2; e++) { P.set([x, y, z], (i * 2 + e) * 3); S.set([e, len, a, sp], (i * 2 + e) * 4); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('drop', new THREE.BufferAttribute(S, 4));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x9fb0bc) } },
      vertexShader: `attribute vec4 drop; uniform float uTime; varying float vA;
        void main() { vec3 p = position; float y = mod(p.y - uTime * drop.w, 11.0); p.y = y - drop.x * drop.y; p.x += (11.0 - y) * 0.035 + drop.x * drop.y * 0.035;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); float z = -mv.z; vA = drop.z * smoothstep(0.6, 2.5, z) * smoothstep(22.0, 8.0, z) * (1.0 - drop.x * 0.6);
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; varying float vA; void main() { gl_FragColor = vec4(uColor * vA * 0.34, 1.0); }` });
    const rain = new THREE.LineSegments(g, m); rain.frustumCulled = false; rain.userData.keep = true; rain.onBeforeRender = () => { m.uniforms.uTime.value = performance.now() / 1000; }; root.add(rain); }
  // 雾：悬在空气里的细小水汽，靠近路灯、壁灯的那些被照亮；几层前后错开的薄雾；每盏灯外面一圈光晕，灯下一道被雾照出来的光
  const LAMPS = [[BX0 + 0.15, 4.25, 0.5], [SDX, 3.7, 0.25], [-9, 4.4, 19.6], [9, 4.4, 19.6]];
  mistField(root, { center: [0, 2.4, 6], size: [30, 5, 15], count: 16000, px: 0.006, strength: 0.45, lights: LAMPS, lightColor: 0xffc080, fall: 0.025, swirl: 0.3 });
  mistField(root, { center: [0, 0.9, 6], size: [30, 1.6, 15], count: 6000, px: 0.007, strength: 0.35, lights: LAMPS, lightColor: 0xffb070, fall: 0.006, swirl: 0.4 });   // 贴着湿地面的那层更密
  // 体积雾（post.js 里按深度一步步累加的那种）：整条街一块连续的雾，贴着地面最浓、往上散，小巷和桥洞里自然更深；路灯附近的雾被照暖
  scene.userData.fog = { min: [-26, 0, -14], max: [32, 9, 26], floor: 2.6, even: 0.72, density: 0.3, scale: 0.18, color: 0x7a8892, light: 0xffd2a0, lightK: 0.8,
    lights: [[BX0 + 0.15, 4.2, 0.6, 0, -1, 0.25, 0.55], [SDX, 3.65, 0.35, 0, -1, 0.2, 0.5], [-9, 4.35, 19.6, 0, -1, 0, 0.6], [9, 4.35, 19.6, 0, -1, 0, 0.6], [-1.1, 2.9, 0.55], [-11.6, 4, -6]],
    wind: [0.16, 0.01, 0.06], maxDist: 45, hole: [[-8, -1, -16], [8, 4.2, 0]] };                                     // street lamps and wall lamps are spots: their shafts are carved out of the fog
  // ---------------------------------------------------------------- 灯光：主要的光来自店里、壁灯、楼上的窗
  scene.add(new THREE.HemisphereLight(0xbac9d2, 0x594c3d, 3.05));
  const moon = new THREE.DirectionalLight(0xb6ced8, 1.42); moon.position.set(5, 14, 10); scene.add(moon);

  function tick(t) {
    for (const s of steam) {
      const p = (t * 0.18 + s.userData.ph) % 1;
      s.position.set(SDX + 0.9 + Math.sin(p * 6 + s.userData.ph * 9) * 0.15, 4.2 + p * 2.4, 0.4 + p * 0.6);
      s.scale.setScalar(0.4 + p * 1.6);
      s.material.opacity = 0.4 * (1 - p) * Math.min(1, p * 6);
    }
    sideLamp.intensity = 3.5 * (t % 5.1 > 4.85 ? 0.3 : 1);
    nowT = t;
    if (awningDrips) for (const d of awningDrips.drips) { const p = (t * d.userData.sp * 0.25 + d.userData.ph) % 1; d.position.set(d.userData.x, awningDrips.y - p * p * (awningDrips.y - 0.15), awningDrips.z); d.visible = p > 0.04; }
    if (valve) {                                                           // valve open for ~3.5 s: wheel turns, jet streams out, then shut
      const e = t - valve.t0, open = e > 0 && e < 3.6 ? Math.min(1, e * 2, (3.6 - e) * 2) : 0;
      valve.wheels[0].rotation.y = -Math.min(1, Math.max(0, e) / 0.6) * Math.PI * 1.5 + (e > 3.2 ? Math.min(1, (e - 3.2) / 0.6) * Math.PI * 1.5 : 0);
      for (const sp of valve.puffs) {
        const p = ((t * 1.6 + sp.userData.ph) % 1), o = valve.outlets[0];
        sp.position.set(o.x + 0.05 + p * 0.55, o.y + p * p * 0.25, o.z + 0.05 + p * 0.3 + Math.sin(p * 9 + sp.userData.ph * 20) * 0.03);
        sp.scale.setScalar(0.03 + p * 0.28);
        sp.material.opacity = open * 0.5 * (1 - p) * Math.min(1, p * 8);
      }
    }
  }
  return { scene, tick,
    onAction(act) { if (act === 'valve' && valve && nowT - valve.t0 > 5) valve.t0 = nowT; } };
}
