// 店外：雨夜，一栋五层的旧石灰抹灰楼，底层是一整排墨绿色木头店面（照着效果图做）
//   店面   左边大橱窗（冷藏肉柜，粉色灯）· 中间一对敞开的木门（棋盘格地砖）· 右边小橱窗（挂着香肠和火腿、一台切片机）
//          上面一条破旧的帆布遮阳篷；店里暖黄的灯，吊灯、货架、罐子
//   门前   花槽和常春藤、三根铸铁护柱、一套被雨淋着的铁桌椅、一盆绿植
//   右边   两只高高的气瓶（CO₂）、贴在墙上的告示、一扇墨绿色的侧门（下面百叶）、门上一盏小灯、一摞木箱
//   左边   墙角一盏铸铁壁灯；往左是一条更窄的老街，远处的窗都亮着
// 贴图都是真实照片扫描（Poly Haven / ambientCG，CC0）；楼和远处的街只做到“看起来立体”的程度
import * as THREE from 'three';
import { addMarketLane } from './market-lane.js';
import { canvasTexture } from './textures.js';
import { pbr, model, decal, userDecal, userMat, paintedText } from './assets.js';
import { meatGeometry, meatMaterial } from './meat.js';
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
  const scene = new THREE.Scene();
  scene.background = canvasTexture(16, 512, (g, W, H) => {                  // 雨夜的天：上面深蓝黑，往下一点点被城市的灯光照成暖灰
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#05080c'); gr.addColorStop(0.55, '#141b22'); gr.addColorStop(0.8, '#2a2a28'); gr.addColorStop(1, '#3a3228'); g.fillStyle = gr; g.fillRect(0, 0, W, H); });
  scene.fog = new THREE.FogExp2(0x243039, 0.021);
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
  const leafM = new THREE.MeshStandardMaterial({ color: 0x3a5a2e, roughness: 0.7, side: THREE.DoubleSide });
  const flowerM = [0xb83a3a, 0xd8a03a, 0xe8e0d0].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }));
  const leafG = new THREE.SphereGeometry(0.055, 8, 5); leafG.scale(1, 0.3, 1.6);
  const bush = (x, y, z, w, d, n, flowers = 0) => { for (let i = 0; i < n; i++) { const l = new THREE.Mesh(leafG, leafM); l.position.set(x + (rnd() - 0.5) * w, y + rnd() * 0.3, z + (rnd() - 0.5) * d); l.rotation.set(rnd() * 2, rnd() * 6, rnd() * 2); l.scale.setScalar(0.7 + rnd() * 0.8); root.add(l); } for (let i = 0; i < flowers; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), flowerM[i % 3]); f.position.set(x + (rnd() - 0.5) * w, y + 0.2 + rnd() * 0.15, z + (rnd() - 0.5) * d); root.add(f); } };
  const vine = (x, y, z, len, n) => { for (let k = 0; k < n; k++) { const ox = (rnd() - 0.5) * 0.6; for (let i = 0; i < len / 0.06; i++) { const l = new THREE.Mesh(leafG, leafM); l.position.set(x + ox + Math.sin(i * 0.7 + k) * 0.04, y - i * 0.06, z + 0.05 + rnd() * 0.05); l.rotation.set(rnd() * 2, rnd() * 6, rnd()); l.scale.setScalar(0.6 + rnd() * 0.6); root.add(l); } } };
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
  box(SX1 - SX0, SH + 0.6, 0.1, tiles(SX1 - SX0, SH), (SX0 + SX1) / 2, (SH + 0.6) / 2, -ID, root);
  box(0.1, SH + 0.6, ID, tiles(ID, SH), SX0, (SH + 0.6) / 2, -ID / 2, root); box(0.1, SH + 0.6, ID, tiles(ID, SH), SX1, (SH + 0.6) / 2, -ID / 2, root);
  box(SX1 - SX0, 0.1, ID, new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 0.9 }), (SX0 + SX1) / 2, SH + 0.6, -ID / 2, root);
  { const wood = pbr('wood_table_worn', 1, 1, { size: 1.0, color: 0x9a7a5a });
    const jarMats = [0x8a3a1a, 0xa86a2a, 0x5a6a2a, 0xd8c8a0].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.17 }));
    for (const [x0, x1] of [[SX0 + 0.4, -2.4], [0.2, SX1 - 0.4]]) for (const y of [1.55, 2.05, 2.55]) {
      box(x1 - x0, 0.04, 0.3, wood, (x0 + x1) / 2, y, -ID + 0.2, root);
      for (let x = x0 + 0.1; x < x1 - 0.05; x += 0.14 + rnd() * 0.06) { const h = 0.12 + rnd() * 0.1; cyl(0.045, 0.045, h, jarMats[Math.floor(rnd() * 4)], x, y + 0.02 + h / 2, -ID + 0.2, root, 12); cyl(0.047, 0.047, 0.02, M.iron, x, y + h + 0.03, -ID + 0.2, root, 12); }
    } }
  for (const x of [-4.2, -1.1, 1.5]) { model('hanging_industrial_lamp', { pos: [x, SH + 0.5, -1.4], scale: 0.8, parent: root }); const l = new THREE.PointLight(0xffb468, 3.2, 6, 1.6); l.position.set(x, 2.6, -1.4); root.add(l); }
  { const l = new THREE.PointLight(0xffc888, 3.5, 6, 1.6); l.position.set(-1.1, 2.0, 0.6); root.add(l); }
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
  // 左橱窗：冷藏肉柜
  { const dc = new THREE.Group(); dc.position.set((WL0 + WL1) / 2, 0.5, -0.8); root.add(dc);
    box(WL1 - WL0 - 0.3, 0.36, 0.8, new THREE.MeshStandardMaterial({ color: 0x2a1a14, roughness: 0.8 }), (WL0 + WL1) / 2, 0.33, -0.8, root);   // 肉柜下面的垫台
    const L = WL1 - WL0 - 0.3;
    box(L, 0.75, 0.85, new THREE.MeshStandardMaterial({ color: 0x4a1c18, roughness: 0.4, map: grimeMap(50) }), 0, 0.375, 0, dc);
    box(L, 0.04, 0.92, M.steel, 0, 0.77, 0, dc);
    const gc = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, L, 24, 1, true, 0, Math.PI / 2), M.glass); gc.rotation.z = Math.PI / 2; gc.position.set(0, 0.79, 0); dc.add(gc);
    box(L, 0.03, 0.42, M.steel, 0, 1.21, -0.22, dc);
    box(L - 0.1, 0.02, 0.03, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.8, 1.4, 1.7) }), 0, 1.19, -0.08, dc);
    const pk = new THREE.PointLight(0xff8aa0, 3, 2.4, 2); pk.position.set(0, 1.1, 0.1); dc.add(pk);
    for (let i = 0; i < 10; i++) { const sp = i % 3 === 1 ? 'pork' : 'beef'; const m = new THREE.Mesh(meatGeometry(sp), meatMaterial(sp)); m.scale.setScalar(0.3 + rnd() * 0.06); m.position.set(-L / 2 + 0.3 + (i % 5) * (L - 0.6) / 4, 0.82 + (i < 5 ? 0 : 0.03), (i < 5 ? 0.14 : -0.16)); m.rotation.set(-0.35, rnd() * 0.6 - 0.3, 0); dc.add(m); }   // 一块块真实大小的牛排、猪排，朝外斜放
    for (let i = 0; i < 7; i++) { const t = plane(0.08, 0.05, lit(canvasTexture(80, 50, (g) => { g.fillStyle = '#efeadc'; g.fillRect(0, 0, 80, 50); g.fillStyle = '#222'; g.font = '600 22px sans-serif'; g.fillText(`€${(8 + i * 3.5).toFixed(2)}`, 6, 32); })), -L / 2 + 0.2 + i * (L - 0.4) / 6, 0.85, 0.32, 0, dc); t.rotation.x = -0.7; }
    model('potted_plant_02', { pos: [(WL0 + WL1) / 2 + 1.0, 1.25, -2.9], scale: 0.6, parent: root }); }
  // 右橱窗：香肠和火腿、切片机、罐子
  { const sm = new THREE.MeshPhysicalMaterial({ map: sausageTex(), roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.35, sheen: 0.3 });
    const hm = new THREE.MeshPhysicalMaterial({ map: hamTex(), roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.5 });
    const bar = cyl(0.012, 0.012, WR1 - WR0 - 0.1, M.steel, (WR0 + WR1) / 2, 2.75, -0.35, root, 8); bar.rotation.z = Math.PI / 2;
    let x = WR0 + 0.12;
    while (x < WR1 - 0.1) {
      const isHam = rnd() < 0.22;
      cyl(0.003, 0.003, 0.08, M.steel, x, 2.71, -0.35, root, 4);
      const o = isHam ? ham(hm) : sausage(0.3 + rnd() * 0.25, 0.028 + rnd() * 0.012, sm, (rnd() - 0.5) * 0.08);
      o.position.set(x, 2.67, -0.35); o.rotation.y = rnd() * 3; o.rotation.z = (rnd() - 0.5) * 0.08; root.add(o);
      x += isHam ? 0.3 : 0.1 + rnd() * 0.06;
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
  for (const [x, z] of [[3.55, 0.3], [3.95, 0.35]]) {
    cyl(0.12, 0.12, 1.55, M.co2, x, 0.15 + 0.78, z, root, 20); cyl(0.07, 0.12, 0.16, M.co2top, x, 1.78, z, root, 16); cyl(0.035, 0.035, 0.14, M.steel, x, 1.92, z, root, 10);
    const lb = canvasTexture(128, 64, (g) => { g.fillStyle = '#e4e0d4'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#222'; g.font = `700 28px ${SANS}`; g.fillText('CO₂', 14, 42); }); const l = new THREE.Mesh(new THREE.CylinderGeometry(0.121, 0.121, 0.18, 20, 1, true, -0.8, 1.6), lit(lb)); l.position.set(x, 1.2, z); l.rotation.y = -Math.PI / 2 + 0.3; root.add(l);
  }
  box(0.04, 0.04, 0.9, M.iron, 3.75, 1.25, 0.15, root);
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

  // ---------------------------------------------------------------- 雨
  const RN = 3200, rainPos = new Float32Array(RN * 6), rainSeed = new Float32Array(RN * 3);
  for (let i = 0; i < RN; i++) { rainSeed[i * 3] = (rnd() - 0.5) * 26; rainSeed[i * 3 + 1] = rnd() * 11; rainSeed[i * 3 + 2] = -1 + rnd() * 12; }
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xa8b2ba, transparent: true, opacity: 0.12, depthWrite: false })); rain.frustumCulled = false; root.add(rain);

  // ---------------------------------------------------------------- 灯光：主要的光来自店里、壁灯、楼上的窗
  scene.add(new THREE.HemisphereLight(0x9aaebc, 0x27251f, 2.8));
  const moon = new THREE.DirectionalLight(0x5fb4c4, 1.3); moon.position.set(5, 14, 10); scene.add(moon);

  function tick(t) {
    for (const s of steam) {
      const p = (t * 0.18 + s.userData.ph) % 1;
      s.position.set(SDX + 0.9 + Math.sin(p * 6 + s.userData.ph * 9) * 0.15, 4.2 + p * 2.4, 0.4 + p * 0.6);
      s.scale.setScalar(0.4 + p * 1.6);
      s.material.opacity = 0.4 * (1 - p) * Math.min(1, p * 6);
    }
    for (let i = 0; i < RN; i++) {
      const x = rainSeed[i * 3], z = rainSeed[i * 3 + 2];
      const y = 11 - ((rainSeed[i * 3 + 1] + t * 8) % 11);
      rainPos[i * 6] = x + (11 - y) * 0.03; rainPos[i * 6 + 1] = y; rainPos[i * 6 + 2] = z;
      rainPos[i * 6 + 3] = x + (11 - y) * 0.03 + 0.05; rainPos[i * 6 + 4] = y - 0.34; rainPos[i * 6 + 5] = z;
    }
    rainGeo.attributes.position.needsUpdate = true;
    sideLamp.intensity = 3.5 * (t % 5.1 > 4.85 ? 0.3 : 1);
  }
  return { scene, tick };
}
