// 店外：欧洲老城区一条湿漉漉的小街上，一间灰色、陈旧的老肉铺.
// 设定：在一个禁止培养肉的城市，它伪装成普通的街角肉铺地下经营.店招早就褪得看不清了，
// 从外面看一切平常——只有几处细节露馅：侧门边链着 CO₂ 气瓶、停着液氮罐推车、排风口一直冒白汽、
// 门口停着冷链车，还有便宜得不太正常的特价牌.
import * as THREE from 'three';
import { canvasTexture } from './textures.js';
import { stuccoMaps, settMaps, corrugatedMaps, grimeFloorMaps, grimeMap, ageCanvas, blobShadow } from './materials.js';

const SANS = '"Inter", "Noto Sans SC", "Microsoft YaHei", sans-serif';
const SERIF = '"Noto Serif SC", Georgia, serif';

function box(w, h, d, m, x, y, z, p) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); p.add(o); return o; }
function cyl(rt, rb, h, m, x, y, z, p, seg = 20) { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x, y, z); p.add(o); return o; }
function plane(w, h, mat, x, y, z, ry, p) { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); o.position.set(x, y, z); o.rotation.y = ry; p.add(o); return o; }
const lit = (map, o = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.85, ...o });
const wallMat = (w, h, o) => new THREE.MeshStandardMaterial({ ...stuccoMaps(w, h, o) });

export function createStreet(env) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0f11);
  scene.fog = new THREE.FogExp2(0x1a2024, 0.05);
  scene.environment = env;
  scene.environmentIntensity = 0.2;
  const root = new THREE.Group(); scene.add(root);
  let rs = 5; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;

  const M = {
    paint: new THREE.MeshStandardMaterial({ color: 0x3a4240, roughness: 0.7, map: grimeMap(40) }),        // 店面的旧油漆木框 (灰绿）
    paintLight: new THREE.MeshStandardMaterial({ color: 0x6a706a, roughness: 0.75, map: grimeMap(48) }),
    stone: new THREE.MeshStandardMaterial({ color: 0x8a8a84, roughness: 0.9, map: grimeMap(43) }),
    steel: new THREE.MeshStandardMaterial({ color: 0x8a8d88, roughness: 0.45, metalness: 0.8, map: grimeMap(41) }),
    iron: new THREE.MeshStandardMaterial({ color: 0x1e2120, roughness: 0.55, metalness: 0.6, map: grimeMap(42) }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x9fb0b4, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.3, envMapIntensity: 1.5 }),
    carton: new THREE.MeshStandardMaterial({ color: 0x7e6446, roughness: 0.95, map: grimeMap(44) }),
    bag: new THREE.MeshStandardMaterial({ color: 0x141616, roughness: 0.25, metalness: 0.1 }),
    shutter: new THREE.MeshStandardMaterial({ color: 0x5a605c, roughness: 0.8, map: grimeMap(45) }),
    co2: new THREE.MeshStandardMaterial({ color: 0x2e3a36, roughness: 0.5, metalness: 0.5, map: grimeMap(46) }),
    cap: new THREE.MeshStandardMaterial({ color: 0x8a8a80, roughness: 0.4, metalness: 0.8 }),
    canvas: new THREE.MeshStandardMaterial({ color: 0x5c605c, roughness: 0.95, side: THREE.DoubleSide, map: grimeMap(49) }),
    warm: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.8, 2.1, 1.3) }),
    cold: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.6, 2.4) }),
    meat: new THREE.MeshStandardMaterial({ color: 0x7a2a2a, roughness: 0.5 }),
    veg: [0x4a5a32, 0x6a6a3a, 0x7a4a2a, 0x8a7232].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 })),
  };

  // ---------------------------------------------------------------- 地面：灰色石板人行道 + 湿的弹石路
  const sw = grimeFloorMaps('sidewalk-eu', { base: [104, 104, 100], seed: 81, gloss: 2 });
  const swm = new THREE.MeshStandardMaterial({ map: sw.map.clone(), roughnessMap: sw.roughnessMap.clone(), normalMap: sw.normalMap.clone(), roughness: 1 });
  for (const t of [swm.map, swm.roughnessMap, swm.normalMap]) { t.repeat.set(30 / 2.4, 3.6 / 2.4); t.needsUpdate = true; }
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(30, 3.6), swm); walk.rotation.x = -Math.PI / 2; walk.position.set(0, 0.15, 1.8); root.add(walk);
  box(30, 0.16, 0.25, M.stone, 0, 0.075, 3.62, root);                        // 花岗岩路缘石
  const sm = settMaps();
  const sett = new THREE.MeshStandardMaterial({ ...sm, roughness: 1, metalness: 0.15, normalScale: new THREE.Vector2(0.8, 0.8) });
  for (const t of [sett.map, sett.roughnessMap, sett.normalMap]) t.repeat.set(30 / 1.2, 14 / 1.2);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(30, 14), sett); road.rotation.x = -Math.PI / 2; road.position.set(0, 0, 10.6); root.add(road);

  // ---------------------------------------------------------------- 主楼：四层灰色抹灰老楼 (底层是石块墙基）
  box(9, 7.2, 6, wallMat(9, 7.2, { base: [128, 130, 126], seed: 4 }), 0, 6.9, -3, root);
  box(9, 3.3, 4.6, wallMat(9, 3.3, { base: [90, 92, 88], seed: 6 }), 0, 1.65, -3.7, root);
  box(0.35, 3.3, 1.4, wallMat(0.35, 3.3, { rustic: true, seed: 7, base: [118, 118, 112] }), -4.33, 1.65, -0.7, root);
  box(1.6, 3.3, 1.4, wallMat(1.6, 3.3, { rustic: true, seed: 8, base: [118, 118, 112] }), 3.7, 1.65, -0.7, root);
  box(7.1, 0.1, 1.4, M.iron, -0.65, 3.25, -0.7, root);
  box(7.1, 0.15, 1.4, M.stone, -0.65, 0.075, -0.7, root);
  for (const y of [3.42, 6.2, 8.9]) box(9.3, 0.18, 0.22, M.stone, 0, y, 0.05, root);   // 腰线
  box(9.5, 0.45, 0.5, M.stone, 0, 10.6, 0.1, root);                         // 顶上的檐口
  // 楼上的窗：高高的法式窗，灰色百叶，大多关着;小小的铸铁阳台
  const curtain = canvasTexture(64, 128, (g, W, H) => { g.fillStyle = '#4a4a44'; g.fillRect(0, 0, W, H); for (let x = 0; x < W; x += 8) { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x, 0, 3, H); } ageCanvas(g, W, H, { amount: 1, seed: 3 }); });
  const shutterTex = canvasTexture(64, 192, (g, W, H) => { g.fillStyle = '#5a605c'; g.fillRect(0, 0, W, H); for (let y = 4; y < H; y += 7) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(4, y, W - 8, 2); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(4, y + 2, W - 8, 1); } ageCanvas(g, W, H, { amount: 1.6, seed: 4 }); });
  const shutMat = lit(shutterTex);
  [-3.0, -1.0, 1.0, 3.0].forEach((x, i) => [4.9, 7.6].forEach((y, j) => {
    box(1.0, 1.9, 0.14, M.stone, x, y, 0.02, root);
    const on = i === 1 && j === 1;
    plane(0.8, 1.7, on ? new THREE.MeshBasicMaterial({ map: curtain, color: new THREE.Color(1.5, 1.15, 0.8) }) : lit(curtain, { color: 0x3a3a3a }), x, y, 0.1, 0, root);
    for (let k = 0; k < 3; k++) box(0.8, 0.02, 0.02, M.paintLight, x, y - 0.6 + k * 0.6, 0.11, root);
    box(0.02, 1.7, 0.02, M.paintLight, x, y, 0.11, root);
    const closed = (i + j) % 3 !== 1 && !on;
    for (const s of [-1, 1]) {                                               // 百叶：关着的贴在窗前，开着的推到两边
      const sh = plane(0.42, 1.8, shutMat, closed ? x + s * 0.21 : x + s * 0.72, y, closed ? 0.16 : 0.13, 0, root);
      if (!closed) sh.rotation.y = s * 0.15;
    }
    if (j === 0) { box(1.2, 0.06, 0.4, M.stone, x, y - 1.0, 0.2, root); for (let k = 0; k < 9; k++) cyl(0.008, 0.008, 0.5, M.iron, x - 0.55 + k * 0.137, y - 0.73, 0.38, root, 5); box(1.2, 0.03, 0.03, M.iron, x, y - 0.48, 0.38, root); }
  }));
  const winLight = new THREE.PointLight(0xffb070, 1.0, 4, 2); winLight.position.set(-1.0, 7.6, 0.8); root.add(winLight);
  cyl(0.06, 0.06, 10.4, M.iron, 4.42, 5.2, 0.14, root, 10);                  // 铸铁落水管
  for (let y = 1; y < 10; y += 1.6) box(0.1, 0.04, 0.1, M.iron, 4.42, y, 0.14, root);

  // ---------------------------------------------------------------- 店面：旧油漆木框 (灰绿、掉漆），招牌板空着，只剩看不清的旧字
  box(0.3, 3.2, 0.16, M.paint, -4.12, 1.65, 0.08, root);                     // 两侧壁柱
  box(0.3, 3.2, 0.16, M.paint, 2.75, 1.65, 0.08, root);
  for (const x of [-4.12, 2.75]) box(0.38, 0.35, 0.3, M.paint, x, 3.05, 0.12, root);   // 托架
  const fasciaTex = canvasTexture(1400, 160, (g, W, H) => {
    g.fillStyle = '#3a4240'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(200,190,160,.13)'; g.font = `600 96px ${SERIF}`; g.textAlign = 'center';
    g.fillText('— — —   — — — —   — —', W / 2, 115);                              // 只剩一点点旧字的痕迹
    for (let i = 0; i < 380; i++) { g.fillStyle = `rgba(${120 + Math.random() * 40},${110 + Math.random() * 30},90,${Math.random() * 0.5})`; g.fillRect(Math.random() * W, Math.random() * H, 3 + Math.random() * 30, 2 + Math.random() * 10); }   // 掉漆
    ageCanvas(g, W, H, { amount: 1.8, seed: 21 });
  });
  box(7.2, 0.62, 0.2, M.paint, -0.68, 3.0, 0.1, root);
  plane(6.9, 0.52, lit(fasciaTex, { roughness: 0.7 }), -0.68, 3.0, 0.205, 0, root);
  box(7.5, 0.1, 0.32, M.paint, -0.68, 3.36, 0.14, root);                     // 招牌上面的线脚
  // 一盏老式弯管灯照着空招牌
  for (const x of [-2.6, 1.2]) {
    const arm = cyl(0.012, 0.012, 0.6, M.iron, x, 3.55, 0.4, root, 6); arm.rotation.x = 1.1;
    const sh = cyl(0.04, 0.11, 0.1, M.iron, x, 3.42, 0.68, root, 16); sh.rotation.x = 0.7;
    if (x < 0) { const s = new THREE.SpotLight(0xffd29a, 3.5, 3, 0.9, 0.6, 1.5); s.position.set(x, 3.4, 0.7); s.target.position.set(x, 2.9, 0.2); root.add(s, s.target); cyl(0.035, 0.035, 0.01, M.warm, x, 3.37, 0.72, root, 12); }
  }
  // 褪色的帆布遮阳篷，收from一半，边上破了
  const awn = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 0.9, 20, 4), M.canvas);
  { const p = awn.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 2.2) * 0.03 + (p.getY(i) < -0.4 ? Math.sin(p.getX(i) * 9) * 0.04 : 0)); awn.geometry.computeVertexNormals(); }
  awn.position.set(-0.68, 2.62, 0.55); awn.rotation.x = -Math.PI / 2 + 0.55; root.add(awn);
  for (const x of [-3.9, 2.55]) { const a = cyl(0.012, 0.012, 1.0, M.iron, x, 2.45, 0.5, root, 6); a.rotation.x = 1.05; }
  // 下面的护墙板、橱窗框、门
  box(2.9, 0.62, 0.12, M.paint, -2.63, 0.46, 0.06, root);
  box(2.0, 0.62, 0.12, M.paint, 1.7, 0.46, 0.06, root);
  for (const [x, w] of [[-2.63, 2.9], [1.7, 2.0]]) { for (let k = 0; k < 3; k++) box(w / 3 - 0.12, 0.38, 0.02, M.paintLight, x - w / 3 + k * w / 3, 0.46, 0.13, root); box(w, 0.06, 0.14, M.paint, x, 0.8, 0.07, root); box(w, 0.08, 0.14, M.paint, x, 2.64, 0.07, root); }
  for (const x of [-3.6, -2.63, -1.66]) box(0.05, 1.8, 0.08, M.paint, x, 1.72, 0.06, root);
  for (const x of [1.2, 2.2]) box(0.05, 1.8, 0.08, M.paint, x, 1.72, 0.06, root);
  box(0.12, 2.65, 0.16, M.paint, -1.15, 1.45, 0.08, root); box(0.12, 2.65, 0.16, M.paint, 0.6, 1.45, 0.08, root);
  box(1.7, 0.08, 0.16, M.paint, -0.28, 2.3, 0.08, root);                     // 门上的气窗横档
  // 店里透出来的光 (一张发暖光的背景板 + 货架剪影）
  const inside = canvasTexture(512, 256, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#5e584a'); gr.addColorStop(1, '#2e2c26'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let x = 10; x < W; x += 120) { g.fillStyle = 'rgba(16,15,12,.8)'; g.fillRect(x, 40, 90, H); for (let y = 60; y < H; y += 44) { g.fillStyle = `rgba(${70 + Math.random() * 60},${60 + Math.random() * 40},40,.8)`; for (let k = 0; k < 6; k++) g.fillRect(x + 4 + k * 14, y, 10, 22); } }
  });
  const glow = new THREE.MeshBasicMaterial({ map: inside, color: new THREE.Color(0.85, 0.78, 0.65) });
  plane(3.0, 2.6, glow, -2.65, 1.65, -1.38, 0, root);
  plane(2.2, 2.6, glow, 1.7, 1.65, -1.38, 0, root);
  plane(1.6, 2.6, glow, -0.3, 1.65, -1.38, 0, root);
  for (const [x, w] of [[-2.63, 2.9], [1.7, 2.0]]) plane(w, 1.85, M.glass, x, 1.72, 0.03, 0, root);
  // 左橱窗：挂着的几块肉、一排菜筐，一张手写的特价牌
  for (let i = 0; i < 4; i++) { cyl(0.004, 0.004, 0.5, M.steel, -3.4 + i * 0.4, 2.35, -0.25, root, 4); const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), M.meat); m.scale.set(0.7, 1.4, 0.5); m.position.set(-3.4 + i * 0.4, 1.95, -0.25); root.add(m); }
  box(2.6, 0.04, 0.5, M.steel, -2.63, 0.84, -0.35, root);
  for (let i = 0; i < 4; i++) {
    const cx = -3.6 + i * 0.66;
    box(0.58, 0.18, 0.4, M.carton, cx, 0.95, -0.35, root);
    for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.06 + rnd() * 0.02, 10, 8), M.veg[i]); s.position.set(cx - 0.18 + (k % 3) * 0.18, 1.08, -0.45 + Math.floor(k / 3) * 0.16); root.add(s); }
  }
  const price = canvasTexture(256, 180, (g, W, H) => { g.fillStyle = '#1e2420'; g.fillRect(0, 0, W, H); g.strokeStyle = '#8a7a5a'; g.lineWidth = 6; g.strokeRect(6, 6, W - 12, H - 12); g.fillStyle = '#e8e0c8'; g.textAlign = 'center'; g.font = `600 34px ${SERIF}`; g.fillText('Today\'s special', W / 2, 62); g.font = `700 64px ${SERIF}`; g.fillText('€2.99', W / 2, 140); ageCanvas(g, W, H, { amount: 0.8, seed: 7, drips: false }); });
  plane(0.42, 0.3, lit(price), -2.0, 1.3, -0.05, 0, root).rotation.z = 0.05;   // 小黑板价签：便宜得不太正常
  // 右橱窗：卷帘门拉下一大半，上面有涂鸦;露出的玻璃上贴着两张字条
  const graf = (seed) => canvasTexture(256, 256, (g, W, H) => {
    for (let y = 0; y < H; y += 9) { g.fillStyle = '#5a5e5a'; g.fillRect(0, y, W, 7); g.fillStyle = '#2a2c2a'; g.fillRect(0, y + 7, W, 2); }
    g.font = `700 70px ${SANS}`; g.fillStyle = 'rgba(150,40,50,.65)'; g.fillText('NO', 20, 120); g.strokeStyle = 'rgba(60,120,150,.55)'; g.lineWidth = 5; g.strokeText('KILL?', 60, 200);
    ageCanvas(g, W, H, { amount: 1.6, seed });
  });
  plane(2.0, 1.3, lit(graf(31), { metalness: 0.4, roughness: 0.6 }), 1.7, 1.45, 0.12, 0, root);
  box(2.1, 0.18, 0.2, M.iron, 1.7, 2.62, 0.1, root);
  const note = (t, s) => canvasTexture(200, 240, (g, W, H) => { g.fillStyle = '#ddd6c2'; g.fillRect(0, 0, W, H); g.fillStyle = '#222'; g.font = `700 40px ${SANS}`; g.textAlign = 'center'; g.fillText(t, W / 2, 62); g.font = `400 22px ${SANS}`; s.forEach((l, i) => g.fillText(l, W / 2, 110 + i * 32)); ageCanvas(g, W, H, { amount: 1, seed: t.length + 3 }); });
  plane(0.22, 0.27, lit(note('Hiring', ['Night-shift sorting', 'No questions asked'])), 1.3, 2.3, 0.04, 0, root);
  plane(0.22, 0.27, lit(note('Regulars', ['Use the side door', 'Knock three times'])), 2.05, 2.28, 0.04, 0, root).rotation.z = 0.08;
  // 店门：半截玻璃的木门，开着一条缝，里面挂着 PVC 门帘
  const doorG = new THREE.Group(); doorG.position.set(-1.08, 0.15, 0.0); doorG.rotation.y = 0.5; root.add(doorG);
  box(1.55, 2.1, 0.06, M.paint, 0.78, 1.05, 0, doorG);
  plane(1.1, 1.1, M.glass, 0.78, 1.45, 0.035, 0, doorG);
  for (let k = 0; k < 2; k++) box(1.2, 0.5 - 0.1, 0.02, M.paintLight, 0.78, 0.45, 0.04, doorG);
  box(0.04, 0.2, 0.06, M.steel, 1.4, 1.05, 0.05, doorG);
  plane(1.5, 0.45, M.glass, -0.28, 2.55, 0.04, 0, root);                    // 门上的气窗
  const strip = new THREE.MeshPhysicalMaterial({ color: 0xb8c0a0, roughness: 0.3, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
  for (let i = 0; i < 7; i++) plane(0.24, 2.3, strip, -1.0 + i * 0.22, 1.35, -0.4, (rnd() - 0.5) * 0.2, root);
  box(1.8, 0.04, 0.6, M.stone, -0.28, 0.17, 0.3, root);                      // 门前的石台阶
  const doorLight = new THREE.PointLight(0xffc888, 3, 5, 1.6); doorLight.position.set(-0.3, 2.6, -0.9); root.add(doorLight);
  const shopLight = new THREE.PointLight(0xffc888, 2.2, 5, 1.8); shopLight.position.set(-2.6, 2.6, -0.9); root.add(shopLight);

  // ---------------------------------------------------------------- 侧门：送货口 (一盏冷白灯、液氮罐、链着的 CO₂ 气瓶、冒白汽的排风口）
  box(1.0, 2.3, 0.08, M.iron, 3.55, 1.3, 0.02, root);
  for (let k = 0; k < 4; k++) box(0.9, 0.02, 0.02, M.steel, 3.55, 0.4 + k * 0.6, 0.07, root);
  box(0.06, 0.25, 0.06, M.steel, 3.9, 1.3, 0.09, root);
  box(0.4, 0.06, 0.12, M.iron, 3.55, 2.7, 0.12, root);
  box(0.36, 0.02, 0.06, M.cold, 3.55, 2.66, 0.14, root);
  const sideLight = new THREE.PointLight(0xd6eadc, 3.5, 5, 1.8); sideLight.position.set(3.55, 2.55, 0.6); root.add(sideLight);
  for (let i = 0; i < 3; i++) {                                              // CO₂ 气瓶，用铁链拴在墙上
    const x = 4.2 + (i % 2) * 0.05, z = 0.25 + i * 0.27;
    cyl(0.11, 0.11, 1.35, M.co2, x, 0.15 + 0.675, z, root, 16);
    cyl(0.05, 0.08, 0.12, M.co2, x, 1.56, z, root, 12);
    cyl(0.03, 0.03, 0.1, M.cap, x, 1.66, z, root, 8);
    const lbl = canvasTexture(128, 64, (g, W, H) => { g.fillStyle = '#d8d4c4'; g.fillRect(0, 0, W, H); g.fillStyle = '#222'; g.font = `700 28px ${SANS}`; g.fillText('CO₂', 14, 42); g.font = `400 14px ${SANS}`; g.fillText('E290', 80, 40); });
    const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.112, 0.2, 16, 1, true, -0.8, 1.6), lit(lbl)); lb.position.set(x, 1.1, z); lb.rotation.y = -Math.PI / 2 + 0.3; root.add(lb);
  }
  for (const y of [0.95, 1.3]) box(0.03, 0.03, 0.9, M.steel, 4.33, y, 0.55, root);
  const dewar = new THREE.Group(); dewar.position.set(2.75, 0.15, 0.95); root.add(dewar);   // 液氮罐推车
  box(0.7, 0.06, 0.6, M.steel, 0, 0.12, 0, dewar);
  for (const [x, z] of [[-0.3, -0.25], [0.3, -0.25], [-0.3, 0.25], [0.3, 0.25]]) cyl(0.05, 0.05, 0.04, M.iron, x, 0.05, z, dewar, 12).rotation.z = Math.PI / 2;
  cyl(0.24, 0.24, 1.0, M.steel, 0, 0.65, 0, dewar, 24);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.steel); dome.position.y = 1.15; dewar.add(dome);
  cyl(0.06, 0.06, 0.12, M.steel, 0, 1.42, 0, dewar, 12);
  const lnLbl = canvasTexture(160, 90, (g, W, H) => { g.fillStyle = '#2a4a8a'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.font = `700 30px ${SANS}`; g.fillText('LN₂', 14, 40); g.font = `400 16px ${SANS}`; g.fillText('−196 °C', 14, 72); });
  const ll = new THREE.Mesh(new THREE.CylinderGeometry(0.242, 0.242, 0.22, 24, 1, true, -0.6, 1.2), lit(lnLbl)); ll.position.y = 0.8; ll.rotation.y = -Math.PI / 2; dewar.add(ll);
  box(0.4, 0.4, 0.3, M.steel, 3.55, 3.75, 0.18, root);                       // 排风口和白汽
  const steamTex = canvasTexture(128, 128, (g, W, H) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(220,226,224,.55)'); gr.addColorStop(1, 'rgba(220,226,224,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); });
  const steam = [];
  for (let i = 0; i < 10; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0.4 })); s.userData.ph = i / 10; root.add(s); steam.push(s); }

  // ---------------------------------------------------------------- 门口杂物：黑色垃圾袋、纸箱、一把旧椅子、垃圾桶、积水
  for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), M.bag); b.scale.set(1, 0.7 + rnd() * 0.3, 0.9); b.position.set(-3.9 + rnd() * 0.8, 0.36, 0.7 + rnd() * 0.5); root.add(b); }
  for (let i = 0; i < 3; i++) { const c = box(0.5, 0.35, 0.4, M.carton, 3.1 + rnd() * 0.3, 0.33 + i * 0.35, 1.7, root); c.rotation.y = rnd() * 0.5; }
  const chair = new THREE.Group(); chair.position.set(0.95, 0.15, 1.1); chair.rotation.y = -0.4; root.add(chair);
  box(0.42, 0.04, 0.42, M.paintLight, 0, 0.45, 0, chair); box(0.42, 0.45, 0.04, M.paintLight, 0, 0.7, -0.2, chair);
  for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) box(0.03, 0.45, 0.03, M.iron, x, 0.22, z, chair);
  cyl(0.24, 0.22, 0.85, M.iron, -4.9, 0.575, 1.4, root, 20);                // 街边的铁皮垃圾桶
  const blob = new THREE.MeshBasicMaterial({ map: blobShadow(), transparent: true, depthWrite: false, opacity: 0.6 });
  for (const [x, z, s] of [[-3.5, 1.0, 1.6], [3.3, 1.7, 1.2], [2.75, 0.95, 1.0], [-4.9, 1.4, 0.8]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(s, s), blob); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.155, z); root.add(p); }

  // ---------------------------------------------------------------- 左右邻居：关着卷帘门的空铺、另一栋灰色老楼
  box(8, 9, 6, wallMat(8, 9, { base: [112, 110, 104], seed: 9 }), -8.5, 4.5, -3.2, root);
  plane(3.6, 2.6, lit(graf(33), { metalness: 0.4, roughness: 0.6 }), -8.0, 1.45, -0.18, 0, root);
  box(3.8, 0.4, 0.4, M.iron, -8.0, 2.9, -0.1, root);
  for (const [x, y] of [[-9.5, 5.0], [-7.0, 5.0], [-9.5, 7.6], [-7.0, 7.6]]) { box(1.0, 1.8, 0.1, M.stone, x, y, -0.15, root); plane(0.8, 1.6, lit(shutterTex), x, y, -0.09, 0, root); }
  box(8, 11, 6, wallMat(8, 11, { base: [100, 104, 104], seed: 10 }), 8.6, 5.5, -3.3, root);
  for (const [x, y] of [[6.5, 2.0], [9.0, 2.0], [6.5, 5.2], [9.0, 5.2], [6.5, 8.0], [9.0, 8.0]]) { box(1.0, 1.7, 0.1, M.stone, x, y, -0.25, root); plane(0.8, 1.5, lit(curtain, { color: 0x2c2c2c }), x, y, -0.19, 0, root); }

  // ---------------------------------------------------------------- 街上：铸铁路灯 (暖黄）、交错的电线、停着的冷链车
  cyl(0.07, 0.11, 4.2, M.iron, -5.4, 2.1, 3.3, root, 12);
  cyl(0.16, 0.16, 0.3, M.iron, -5.4, 0.15, 3.3, root, 16);
  const lantern = new THREE.Group(); lantern.position.set(-5.4, 4.45, 3.3); root.add(lantern);
  cyl(0.05, 0.2, 0.14, M.iron, 0, 0.32, 0, lantern, 6);
  cyl(0.18, 0.12, 0.42, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.8, 1.0), transparent: true, opacity: 0.9 }), 0, 0.04, 0, lantern, 6);
  cyl(0.13, 0.13, 0.05, M.iron, 0, -0.2, 0, lantern, 6);
  const lamp = new THREE.SpotLight(0xffb468, 45, 14, 1.1, 0.5, 1.4);
  lamp.position.set(-5.4, 4.3, 3.3); lamp.target.position.set(-2.4, 0, 1.8); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.001;
  root.add(lamp, lamp.target);
  const lampFill = new THREE.PointLight(0xffb468, 2.5, 6, 1.6); lampFill.position.set(-5.4, 4.4, 3.3); root.add(lampFill);
  for (const [a, b] of [[[-14, 7.2, 0.2], [14, 6.8, 0.3]], [[-14, 7.8, 0.3], [6, 7.4, 6]]]) { const w = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(...a), new THREE.Vector3((a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 0.6, (a[2] + b[2]) / 2), new THREE.Vector3(...b)]), 40, 0.01, 5), M.iron); root.add(w); }
  const van = new THREE.Group(); van.position.set(7.2, 0, 6.8); van.rotation.y = -0.05; root.add(van);   // 灰白色的冷链厢式车，车身没有字
  box(3.6, 2.0, 1.9, new THREE.MeshStandardMaterial({ color: 0xa8a8a0, roughness: 0.6, map: grimeMap(45) }), 0, 1.45, 0, van);
  box(1.4, 1.5, 1.9, new THREE.MeshStandardMaterial({ color: 0x7a7c78, roughness: 0.4, metalness: 0.5, map: grimeMap(47) }), -2.4, 1.15, 0, van);
  box(0.8, 0.5, 1.2, M.iron, 1.6, 2.6, 0, van);                             // 车顶制冷机组
  const snow = canvasTexture(128, 128, (g, W, H) => { g.fillStyle = '#a8a8a0'; g.fillRect(0, 0, W, H); g.strokeStyle = '#2a4a6a'; g.lineWidth = 6; for (let k = 0; k < 3; k++) { g.beginPath(); const a = k * Math.PI / 3; g.moveTo(64 - Math.cos(a) * 44, 64 - Math.sin(a) * 44); g.lineTo(64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44); g.stroke(); } ageCanvas(g, W, H, { amount: 1.2, seed: 41, drips: false }); });
  plane(0.5, 0.5, lit(snow), 0.6, 1.6, -0.96, Math.PI, van);
  for (const x of [-2.3, 1.2]) for (const z of [-0.95, 0.95]) cyl(0.38, 0.38, 0.25, M.bag, x, 0.38, z, van, 20).rotation.x = Math.PI / 2;
  const tail = new THREE.PointLight(0xff3020, 0.8, 3, 2); tail.position.set(1.85, 0.9, -0.9); van.add(tail);
  box(0.04, 0.12, 0.2, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.3, 0.2) }), 1.82, 0.9, -0.85, van);

  // ---------------------------------------------------------------- 灯光：夜里、刚下过雨
  scene.add(new THREE.HemisphereLight(0x4a5866, 0x0c0d0d, 0.75));
  const moon = new THREE.DirectionalLight(0x8aa0b8, 0.4); moon.position.set(5, 12, 10); scene.add(moon);

  function tick(t) {
    for (const s of steam) {
      const p = (t * 0.18 + s.userData.ph) % 1;
      s.position.set(3.55 + Math.sin(p * 6 + s.userData.ph * 9) * 0.15, 3.85 + p * 2.4, 0.4 + p * 0.6);
      s.scale.setScalar(0.4 + p * 1.6);
      s.material.opacity = 0.45 * (1 - p) * Math.min(1, p * 6);
    }
    sideLight.intensity = 3.5 * (t % 5.1 > 4.85 ? 0.3 : 1);
  }
  return { scene, tick };
}
