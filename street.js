// 店外：雨夜，一栋五层的旧石灰抹灰楼，底层是一整排墨绿色木头店面（照着效果图做）
//   店面   左边大橱窗（冷藏肉柜，粉色灯）· 中间一对敞开的木门（棋盘格地砖）· 右边小橱窗（挂着香肠和火腿、一台切片机）
//          上面一条破旧的帆布遮阳篷；店里暖黄的灯，吊灯、货架、罐子
//   门前   花槽和常春藤、三根铸铁护柱、一套被雨淋着的铁桌椅、一盆绿植
//   右边   两只高高的气瓶（CO₂）、贴在墙上的告示、一扇墨绿色的侧门（下面百叶）、门上一盏小灯、一摞木箱
//   左边   墙角一盏铸铁壁灯；往左是一条更窄的老街，远处的窗都亮着
// 贴图都是真实照片扫描（Poly Haven / ambientCG，CC0）；楼和远处的街只做到“看起来立体”的程度
import * as THREE from 'three';
import { addMarketLane } from './market-lane.js';
import { mistField, lampHalo, fogPuffs, rayShaft } from './atmosphere.js';
import { ivy, shrub, weeds, planeTree, fallenLeaves } from './foliage.js';
import { addSheets } from './newsprint.js';
import { canvasTexture } from './textures.js';
import { pbr, model, decal, userDecal, userMat, paintedText } from './assets.js';
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
  let valve = null, nowT = 0;
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
  const clothM = [0x8a3a30, 0xd8d0c0, 0x3a4a6a, 0x5a6a4a, 0xc8a050].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, side: THREE.DoubleSide, map: grimeMap(58) }));
  const laundry = (x, y, z, n) => { const rr = R(n * 31); for (let k = 0; k < n; k++) { const w = 0.18 + rr() * 0.22, h = 0.25 + rr() * 0.35, o = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 1, 4), clothM[Math.floor(rr() * 5)]); const pa = o.geometry.attributes.position; for (let v = 0; v < pa.count; v++) pa.setZ(v, Math.sin((pa.getY(v) / h + 0.5) * 3) * 0.015); o.geometry.computeVertexNormals(); o.position.set(x - 0.55 + k * (1.1 / n) + rr() * 0.05, y - h / 2 + 0.03, z + 0.03); o.rotation.z = (rr() - 0.5) * 0.08; root.add(o); } };
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
  { const IN = 1.3, tex = new THREE.TextureLoader().load('assets/street/interior.jpg'); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(SX1 - SX0, 3.75), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, fog: false, color: new THREE.Color(0.92, 0.9, 0.88) }));
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
  { const fa = canvasTexture(1600, 100, (g, W, H) => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(200,180,120,.2)'; g.font = `600 64px ${SANS}`; g.textAlign = 'center'; g.fillText('B O U C H E R I E', W / 2, 72); });
    plane(SX1 - SX0, 0.4, new THREE.MeshStandardMaterial({ map: fa, transparent: true, roughness: 0.7 }), (SX0 + SX1) / 2, SH + 0.28, 0.26, 0, root); }
  box(DX1 - DX0 + 0.2, 0.12, 0.2, G, (DX0 + DX1) / 2, 2.85, 0.08, root);
  plane(DX1 - DX0, 0.6, M.glass, (DX0 + DX1) / 2, 3.25, 0.02, 0, root);
  for (const [hx, s] of [[DX0, 1], [DX1, -1]]) {
    const d = new THREE.Group(); d.position.set(hx, 0.15, 0.05); d.rotation.y = s * 1.25; root.add(d);
    const w = (DX1 - DX0) / 2;
    box(w, 2.6, 0.06, G, s * w / 2, 1.3, 0, d); plane(w - 0.2, 1.3, M.glass, s * w / 2, 1.75, 0.035, 0, d);
    box(w - 0.18, 0.7, 0.02, M.green(0.8, 0.7), s * w / 2, 0.5, 0.035, d); box(0.04, 0.18, 0.06, M.steel, s * (w - 0.08), 1.1, 0.05, d);
  }
  box(DX1 - DX0 + 0.3, 0.05, 0.5, M.stone(2, 0.5), (DX0 + DX1) / 2, 0.16, 0.25, root);
  // 左橱窗：店里糊在玻璃内侧的旧报纸（newsprint.js，和店里同一批、同一个位置），从街上看到的是每张的头版
  addSheets(root, 'front', { dx: -1.65, glassZ: 0.02 });
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
    box(WR1 - WR0, 0.05, 0.6, M.steel, (WR0 + WR1) / 2, 1.0, -0.45, root);
    const sl = new THREE.Group(); sl.position.set(WR0 + 0.7, 1.03, -0.45); sl.rotation.y = 0.5; root.add(sl);
    const enamel = new THREE.MeshStandardMaterial({ color: 0xe0dcd0, roughness: 0.3 });
    box(0.42, 0.12, 0.34, enamel, 0, 0.06, 0, sl); box(0.12, 0.3, 0.16, enamel, 0.14, 0.24, -0.06, sl);
    const bl = cyl(0.15, 0.15, 0.012, new THREE.MeshPhysicalMaterial({ map: brushedSteelMaps(61, { scuff: false }).map, metalness: 1, roughness: 0.2 }), -0.02, 0.27, 0.05, sl, 40); bl.rotation.x = Math.PI / 2;
    cyl(0.04, 0.04, 0.03, M.iron, -0.02, 0.27, 0.07, sl, 16).rotation.x = Math.PI / 2;
    box(0.26, 0.02, 0.2, M.steel, -0.08, 0.14, 0.12, sl);
    for (let i = 0; i < 4; i++) cyl(0.05, 0.05, 0.16, new THREE.MeshStandardMaterial({ color: [0x8a3a1a, 0xc8a050, 0x5a6a2a, 0xd8c8a0][i], roughness: 0.15, transparent: true, opacity: 0.88 }), WR1 - 0.6 + i * 0.13, 1.11, -0.5, root, 14);
  }

  // ---------------------------------------------------------------- 破旧的帆布遮阳篷
  { const W = SX1 - SX0 + 0.4, D = 1.5;
    const tear = canvasTexture(512, 256, (g, Wt, Ht) => { g.fillStyle = '#fff'; g.fillRect(0, 0, Wt, Ht); const r = R(55); g.fillStyle = '#000';
      for (let i = 0; i < 6; i++) { const x = r() * Wt, y = Ht * (0.55 + r() * 0.45); g.beginPath(); g.moveTo(x, Ht); g.lineTo(x + 6 + r() * 20, y); g.lineTo(x + 18 + r() * 30, Ht); g.fill(); }
      for (let i = 0; i < 3; i++) { const x = r() * Wt, y = r() * Ht * 0.6; g.beginPath(); g.ellipse(x, y, 4 + r() * 14, 2 + r() * 6, r() * 3, 0, Math.PI * 2); g.fill(); } });
    const cm = pbr('canvas_fabric', W, D, { size: 0.8, color: 0x8a8070, roughness: 0.95 });
    cm.alphaMap = tear; cm.alphaTest = 0.5; cm.side = THREE.DoubleSide;
    const geo = new THREE.PlaneGeometry(W, D, 40, 10); const ps = geo.attributes.position;
    for (let i = 0; i < ps.count; i++) { const x = ps.getX(i), y = ps.getY(i); ps.setZ(i, Math.sin(x * 1.3) * 0.04 + Math.sin(x * 5 + y) * 0.015 + (Math.abs(Math.sin(x * 1.75)) * 0.08) * (1 - (y + D / 2) / D)); }
    geo.computeVertexNormals();
    const aw = new THREE.Mesh(geo, cm); aw.position.set((SX0 + SX1) / 2, SH - 0.05, 0.75); aw.rotation.x = -Math.PI / 2 + 0.55; root.add(aw);
    const val = new THREE.Mesh(new THREE.PlaneGeometry(W, 0.3, 40, 2), cm.clone()); val.position.set((SX0 + SX1) / 2, SH - 0.82, 1.43); root.add(val);
    const vp = val.geometry.attributes.position; for (let i = 0; i < vp.count; i++) vp.setZ(i, Math.sin(vp.getX(i) * 4) * 0.02); val.geometry.computeVertexNormals();
    for (const x of [SX0, SX1]) { const a = cyl(0.012, 0.012, 1.55, M.iron, x, SH - 0.45, 0.72, root, 6); a.rotation.x = 1.0; }
    const dropM = new THREE.MeshPhysicalMaterial({ color: 0xa0b0b8, roughness: 0, transparent: true, opacity: 0.5 });
    for (let i = 0; i < 18; i++) { const x = SX0 + rnd() * (SX1 - SX0), l = 0.05 + rnd() * 0.12; cyl(0.003, 0.001, l, dropM, x, SH - 0.97 - l / 2, 1.44, root, 4); }
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
      const c = new THREE.Group(); c.position.set(x, 0.15, z); c.rotation.y = turn; root.add(c);
      c.add(new THREE.Mesh(new THREE.LatheGeometry(split(0, shoulderAt), 32), bodyM));
      c.add(new THREE.Mesh(new THREE.LatheGeometry(split(shoulderAt, 1.6), 32), greyM));
      const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.1172, 0.1172, 0.24, 32, 1, true, -1.1, 2.2), labelM); lb.position.y = 0.98; c.add(lb);
      cyl(0.024, 0.026, 0.09, brass, 0, 1.64, 0, c, 16);
      const out = cyl(0.012, 0.012, 0.06, brass, 0.035, 1.635, 0, c, 10); out.rotation.z = Math.PI / 2;
      const hwG = new THREE.Group(); hwG.position.y = 1.7; c.add(hwG); wheels.push(hwG);
      const hw = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 18), wheelM); hw.rotation.x = Math.PI / 2; hwG.add(hw);
      for (let s = 0; s < 3; s++) { const sp = box(0.06, 0.006, 0.006, wheelM, 0, 0, 0, hwG); sp.rotation.y = s * Math.PI / 3; }
      outlets.push(c.localToWorld(new THREE.Vector3(0.068, 1.635, 0)));
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
    box(0.86, 0.05, 0.08, M.iron, 3.70, 1.2, 0.05, root);
    const chainM = new THREE.MeshStandardMaterial({ color: 0x8a8a84, metalness: 1, roughness: 0.45 });
    const ch = new THREE.CatmullRomCurve3([[3.29, 1.2, 0.08], [3.32, 1.18, 0.3], [3.4, 1.16, 0.44], [3.52, 1.15, 0.458], [3.74, 1.13, 0.48], [3.96, 1.15, 0.498], [4.09, 1.16, 0.44], [4.11, 1.18, 0.3], [4.11, 1.2, 0.08]].map((p) => new THREE.Vector3(...p)));
    for (let i = 0; i < 64; i++) { const t = i / 63, p = ch.getPoint(t), d = ch.getTangent(t); const l = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0035, 5, 10), chainM); l.position.copy(p); l.lookAt(p.clone().add(d)); l.rotateY(Math.PI / 2); if (i % 2) l.rotateX(Math.PI / 2); l.scale.set(1.5, 1, 1); root.add(l); }
    // the valve: crack it open and the handwheel turns, a cold white jet hisses out of the outlet for a few seconds
    const puffMap = canvasTexture(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    const puffs = []; for (let i = 0; i < 40; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffMap, transparent: true, depthWrite: false, opacity: 0, color: 0xe8eef0 })); sp.userData.ph = i / 40; root.add(sp); puffs.push(sp); }
    valve = { wheels, outlets, puffs, t0: -99 };
  }
  const note = (t, s, seed) => canvasTexture(200, 260, (g, W, H) => { g.fillStyle = '#ddd6c2'; g.fillRect(0, 0, W, H); g.fillStyle = '#222'; g.font = `700 36px ${SANS}`; g.textAlign = 'center'; g.fillText(t, W / 2, 60); g.font = `400 20px ${SANS}`; s.forEach((l, i) => g.fillText(l, W / 2, 110 + i * 30)); ageCanvas(g, W, H, { amount: 1.2, seed }); });
  for (const [x, y, t, l] of [[4.55, 2.05, 'NOTICE', ['Basement works', 'at night']], [4.85, 1.65, 'HIRING', ['Night packers', 'paid daily']], [4.45, 1.45, 'REGULARS', ['Use side door', 'knock 3 times']], [5.0, 2.3, 'LOST CAT', ['Grey · female', 'reward']]]) plane(0.24, 0.31, lit(note(t, l, Math.round(x * 10))), x, y, 0.02, 0, root).rotation.z = (rnd() - 0.5) * 0.12;
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
  box(0.45, 0.45, 0.3, M.steel, SDX + 0.9, 4.1, 0.12, root);
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
      const t = (txt, x, y, px, col = 'rgba(240,238,228,.95)', align = 'center', rot = 0) => { g.save(); g.translate(x, y); g.rotate(rot + (r() - 0.5) * 0.03); g.font = f(px); g.textAlign = align; g.fillStyle = col; g.fillText(txt, 0, 0); g.restore(); };
      const line = (pts, col = 'rgba(240,238,228,.85)', w = 4) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x + (r() - 0.5) * 3, y + (r() - 0.5) * 3) : g.moveTo(x, y))); g.stroke(); };
      draw(g, W, H, t, line, r);
      g.globalCompositeOperation = 'destination-out';                              // 粉笔的颗粒：随机抠掉一些像素
      for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(0,0,0,${0.15 + r() * 0.5})`; g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2); }
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
      t('FUTURE MEAT', W / 2, 120, 78, Y);
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
    document.fonts.load(f(60), 'TODAY').then(() => { for (const t of [front, back]) { t.userData?.redraw?.(); } }).catch(() => {});
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
  { const RN = 7000, P = new Float32Array(RN * 6), S = new Float32Array(RN * 2 * 4);
    for (let i = 0; i < RN; i++) { const x = (rnd() - 0.5) * 30, y = rnd() * 11, z = -1 + rnd() * 15, len = 0.07 + rnd() * 0.1, a = 0.25 + rnd() * 0.75, sp = 6.5 + rnd() * 2.5;
      for (let e = 0; e < 2; e++) { P.set([x, y, z], (i * 2 + e) * 3); S.set([e, len, a, sp], (i * 2 + e) * 4); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('drop', new THREE.BufferAttribute(S, 4));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x9fb0bc) } },
      vertexShader: `attribute vec4 drop; uniform float uTime; varying float vA;
        void main() { vec3 p = position; float y = mod(p.y - uTime * drop.w, 11.0); p.y = y - drop.x * drop.y; p.x += (11.0 - y) * 0.035 + drop.x * drop.y * 0.035;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); float z = -mv.z; vA = drop.z * smoothstep(0.6, 2.5, z) * smoothstep(22.0, 8.0, z) * (1.0 - drop.x * 0.6);
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; varying float vA; void main() { gl_FragColor = vec4(uColor * vA * 0.16, 1.0); }` });
    const rain = new THREE.LineSegments(g, m); rain.frustumCulled = false; rain.userData.keep = true; rain.onBeforeRender = () => { m.uniforms.uTime.value = performance.now() / 1000; }; root.add(rain); }
  // 雾：悬在空气里的细小水汽，靠近路灯、壁灯的那些被照亮；几层前后错开的薄雾；每盏灯外面一圈光晕，灯下一道被雾照出来的光
  const LAMPS = [[BX0 + 0.15, 4.25, 0.5], [SDX, 3.7, 0.25], [-9, 4.4, 19.6], [9, 4.4, 19.6]];
  mistField(root, { center: [0, 2.4, 6], size: [30, 5, 15], count: 16000, px: 0.006, strength: 0.45, lights: LAMPS, lightColor: 0xffc080, fall: 0.025, swirl: 0.3 });
  mistField(root, { center: [0, 0.9, 6], size: [30, 1.6, 15], count: 6000, px: 0.007, strength: 0.35, lights: LAMPS, lightColor: 0xffb070, fall: 0.006, swirl: 0.4 });   // 贴着湿地面的那层更密
  // 一团一团的雾：贴着湿路面一条翻滚的雾带，上面零散几团，小巷和桥洞里更浓；离镜头近的自己淡掉
  { const fr = R(707), puffs = [];
    for (const [z, y0, k] of [[0.9, 0.5, 1.2], [1.8, 1.5, 0.9], [3.0, 0.55, 1.1], [6.5, 0.6, 1.0], [10.5, 0.7, 1.2], [14.5, 0.8, 1.3], [18.6, 0.9, 1.4]])
      for (let x = -17; x < 17; x += 3.2 + fr() * 2) puffs.push({ pos: [x + fr(), y0 + fr() * 0.4, Math.min(19.5, z + (fr() - 0.5) * 1.6)], w: 6 + fr() * 4, h: 2 + fr() * 1.4, k: k * (0.7 + fr() * 0.6) });
    for (let i = 0; i < 14; i++) puffs.push({ pos: [-14 + fr() * 28, 2.8 + fr() * 1.8, 4 + fr() * 14], w: 7 + fr() * 5, h: 2.6 + fr() * 1.4, k: 0.55 + fr() * 0.3 });   // clear of the facades and roofs
    const alley = []; for (let i = 0; i < 6; i++) alley.push({ pos: [-11.6 + (fr() - 0.5) * 1.2, 1 + fr() * 1.8, -1 - fr() * 9], w: 3.4 + fr() * 1.2, h: 2.4 + fr() * 1.2, k: 1.4 });   // the alley
    for (let i = 0; i < 5; i++) puffs.push({ pos: [-21.5 + fr() * 1.5, 1 + fr() * 2, 6 + fr() * 8], w: 5 + fr() * 2, h: 3, k: 1.5 });           // under the viaduct
    fogPuffs(root, puffs, { color: 0x7f8f98, warm: 0xffbe80, lights: LAMPS, opacity: 0.42, scale: 0.32, speed: 0.06, nearFade: 2.2, bounds: { min: [-23.5, -0.5, 0.2], max: [30, 7.5, 22.3] } });
    fogPuffs(root, alley, { color: 0x7f8f98, warm: 0xffbe80, lights: LAMPS, opacity: 0.42, scale: 0.32, speed: 0.06, nearFade: 2.2, bounds: { min: [-14.4, -0.5, -12], max: [-8.9, 5.2, 0.6] }, margin: 0.8 }); }
  for (const [x, y, z] of LAMPS) { lampHalo(root, [x, y, z + (z > 10 ? -0.3 : 0.3)], { radius: 1.7, color: 0xffc080, strength: 0.55 }); { const wall = z < 5;                                                                     // wall lamps: a narrow shaft that leans away from the wall instead of cutting into it
      rayShaft(root, [x, y - 0.1, z + (wall ? 0.35 : -0.2)], [0, -1, wall ? 0.32 : -0.12], { length: (y - 0.2) * (wall ? 0.8 : 1), radius: wall ? 0.75 : 1.6, top: 0.1, color: 0xffc080, strength: 0.16 }); } }
  lampHalo(root, [-1.1, 2.6, 0.8], { radius: 2.2, color: 0xffd0a0, strength: 0.16 });                          // 门口透出来的暖光，在雨雾里散开
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
