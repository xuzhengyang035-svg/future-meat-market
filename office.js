// 办公室：门口左手边，从大厅左墙开一道门进去（原来那里是杂货架，杂货架挪到了门面左边那段墙前）。
// 管文件、记录：供体登记簿、细胞系档案柜、批次白板、监控屏；后墙一道铁门通往仓库。
// 坐标：大厅左墙在 x = −7.0（墙厚 0.1，办公室这一面在 −7.1）。办公室内部 x −10.6…−7.1，z 1.2…5.0，吊顶 2.9 m。
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeLedger, makeWhiteboard } from './office-paper.js';

export const OFFICE = { X0: -10.6, X1: -7.1, Z0: 1.2, Z1: 5.0, H: 2.9, DZ0: 3.5, DZ1: 4.4, DH: 2.1 };

export function buildOffice(ctx) {
  const { room, box, cyl, plane, M, pbr, userMat, model, decal, canvasTexture, ITEM, bin, litter, hookGarment, wireRack, pencil, rnd } = ctx;
  const { X0, X1, Z0, Z1, H, DZ0, DZ1, DH } = OFFICE;
  const g = new THREE.Group(); room.add(g);
  const RB = (w, h, d, r, m, x, y, z, par = g, seg = 3) => { const o = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, r), m); o.position.set(x, y, z); par.add(o); return o; };
  const HAND = (px, w = 600) => `${w} ${px}px Caveat, "Segoe Print", cursive`;
  const SANS = '"Inter", "Noto Sans SC", "Microsoft YaHei", sans-serif';
  const grain = canvasTexture(128, 128, (c) => { c.fillStyle = '#808080'; c.fillRect(0, 0, 128, 128); for (let i = 0; i < 5000; i++) { const v = 100 + Math.random() * 60 | 0; c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(Math.random() * 128, Math.random() * 128, 1, 1); } });
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(4, 4);

  // ---------------------------------------------------------------- 墙、地、吊顶
  // 墙面：上半截刷浅灰绿乳胶漆，下半截 1 m 高刷深绿色墙裙，中间一道木压条——老单位办公室的样子
  const paint = (w, h) => pbr('painted_plaster_wall', w, h, { size: 2.2, color: 0xc4c8b2, roughness: 0.9 });
  const dado = (w, h) => pbr('painted_plaster_wall', w, h, { size: 2.2, color: 0x56644f, roughness: 0.6 });
  const railM = userMat('wood_dark.webp', 1, 1, { size: 0.6, roughness: 0.6 });
  // face(朝向, 墙所在坐标, 沿墙起点, 终点, y0, y1)：朝向 'px' = 面朝 +x，依此类推
  const ROT = { px: Math.PI / 2, nx: -Math.PI / 2, pz: 0, nz: Math.PI };
  const face = (dir, c, a0, a1, y0, y1) => {
    const w = a1 - a0, along = dir === 'px' || dir === 'nx';
    const put = (mat, yy0, yy1, off) => { if (yy1 <= yy0) return; const p = new THREE.Mesh(new THREE.PlaneGeometry(w, yy1 - yy0), mat); p.rotation.y = ROT[dir];
      const n = { px: [1, 0], nx: [-1, 0], pz: [0, 1], nz: [0, -1] }[dir];
      if (along) p.position.set(c + n[0] * off, (yy0 + yy1) / 2, (a0 + a1) / 2); else p.position.set((a0 + a1) / 2, (yy0 + yy1) / 2, c + n[1] * off); g.add(p); };
    put(paint(w, y1 - y0), y0, y1, 0.003);                                           // 离墙体 3 mm，避免和大厅墙的瓷砖面打架
    put(dado(w, Math.min(y1, 1.0) - y0), y0, Math.min(y1, 1.0), 0.005);
    if (y0 < 1.0 && y1 > 1.0) { const r = new THREE.Mesh(new THREE.BoxGeometry(along ? 0.02 : w, 0.035, along ? w : 0.02), railM); const n = { px: [1, 0], nx: [-1, 0], pz: [0, 1], nz: [0, -1] }[dir];
      if (along) r.position.set(c + n[0] * 0.01, 1.0, (a0 + a1) / 2); else r.position.set((a0 + a1) / 2, 1.0, c + n[1] * 0.01); g.add(r); }
  };
  const BD0 = -9.95, BD1 = -9.05;                                                  // 后墙通仓库的铁门
  const WZ0 = 2.4, WZ1 = 3.6, WY0 = 0.95, WY1 = 2.05;                               // 左墙的窗
  face('nx', X1, Z0, DZ0, 0, H); face('nx', X1, DZ1, Z1, 0, H); face('nx', X1, DZ0, DZ1, DH, H);   // 右：大厅左墙的背面
  face('pz', Z0, X0, BD0, 0, H); face('pz', Z0, BD1, X1, 0, H); face('pz', Z0, BD0, BD1, DH, H);   // 后墙
  face('px', X0, Z0, WZ0, 0, H); face('px', X0, WZ1, Z1, 0, H); face('px', X0, WZ0, WZ1, 0, WY0); face('px', X0, WZ0, WZ1, WY1, H);   // 左墙
  face('nz', Z1, X0, X1, 0, H);                                                    // 前墙
  // 外面看不见的墙体背面：用深色盒子封住（窗洞、门洞的侧面要有厚度）
  const shellM = new THREE.MeshStandardMaterial({ color: 0x3a3a36, roughness: 0.95 });
  for (const [z0, z1] of [[WZ0 - 0.06, WZ0], [WZ1, WZ1 + 0.06]]) box(0.12, WY1 - WY0, z1 - z0, shellM, X0 - 0.06, (WY0 + WY1) / 2, (z0 + z1) / 2, g);
  // 地：旧的灰色 PVC 地板，接缝发黑；进门处一块铝压条
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0 + 0.1, Z1 - Z0), pbr('worn_tile_floor', X1 - X0 + 0.1, Z1 - Z0, { size: 1.6, color: 0x9c9a8e, roughness: 0.7 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set((X0 + X1 + 0.1) / 2, 0.0, (Z0 + Z1) / 2); g.add(floor);
  box(0.12, 0.006, DZ1 - DZ0, M.steel, X1 + 0.05, 0.003, (DZ0 + DZ1) / 2, g);
  // 吊顶：矿棉板（照片扫描），有水渍
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), pbr('OfficeCeiling003', X1 - X0, Z1 - Z0, { size: 1.2, color: 0xd8d6cc }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set((X0 + X1) / 2, H, (Z0 + Z1) / 2); g.add(ceil);
  decal('Leaking004', g, { pos: [-9.6, H - 0.002, 4.2], rot: [Math.PI / 2, 0, 0.4], w: 0.9, h: 0.9, color: 0x8a7a5a, opacity: 0.55 });
  // 踢脚线
  for (const [x, z, w, ry] of [[X1 - 0.01, (Z0 + DZ0) / 2, DZ0 - Z0, -Math.PI / 2], [X1 - 0.01, (DZ1 + Z1) / 2, Z1 - DZ1, -Math.PI / 2], [(X0 + BD0) / 2, Z0 + 0.01, BD0 - X0, 0], [(BD1 + X1) / 2, Z0 + 0.01, X1 - BD1, 0], [X0 + 0.01, (Z0 + Z1) / 2, Z1 - Z0, Math.PI / 2], [(X0 + X1) / 2, Z1 - 0.01, X1 - X0, Math.PI]]) {
    const k = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.015), new THREE.MeshStandardMaterial({ color: 0x2e2e2a, roughness: 0.5 })); k.position.set(x, 0.04, z); k.rotation.y = ry; g.add(k); }

  // ---------------------------------------------------------------- 灯：两盏格栅日光灯（冷白），桌上一盏台灯（暖）
  const tubeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.65, 1.7) });
  for (const z of [2.3, 4.0]) { const t = new THREE.Group(); t.position.set(-8.9, H - 0.02, z); g.add(t);
    box(1.2, 0.04, 0.6, new THREE.MeshStandardMaterial({ color: 0xd8d8d2, roughness: 0.5, metalness: 0.3 }), 0, 0, 0, t);
    for (const dz of [-0.15, 0.15]) box(1.12, 0.012, 0.03, tubeM, 0, -0.022, dz, t);
    for (let i = 0; i < 9; i++) box(0.006, 0.03, 0.58, M.steel, -0.56 + i * 0.14, -0.03, 0, t); }   // 格栅
  const l1 = new THREE.PointLight(0xb4dcd8, 4.8, 5.5, 1.5); l1.position.set(-8.9, 2.6, 3.1); g.add(l1);

  // ---------------------------------------------------------------- 大厅这一侧：门框、门牌；门开着，往办公室里推开约 100°
  const frameM = new THREE.MeshStandardMaterial({ color: 0x3a3226, roughness: 0.55 });
  for (const z of [DZ0 - 0.035, DZ1 + 0.035]) box(0.14, DH + 0.07, 0.07, frameM, X1 + 0.05, (DH + 0.07) / 2, z, g);
  box(0.14, 0.07, DZ1 - DZ0 + 0.14, frameM, X1 + 0.05, DH + 0.035, (DZ0 + DZ1) / 2, g);
  const plate = canvasTexture(360, 110, (c, W, Hh) => { c.fillStyle = '#e8e4d8'; c.fillRect(0, 0, W, Hh); c.fillStyle = '#1e1e1c'; c.font = `700 44px ${SANS}`; c.textBaseline = 'middle'; c.fillText('OFFICE', 22, 40); c.font = `500 22px ${SANS}`; c.fillStyle = '#9a2422'; c.fillText('STAFF ONLY', 24, 84); });
  plane(0.3, 0.092, new THREE.MeshPhysicalMaterial({ map: plate, roughness: 0.3, clearcoat: 0.6 }), X1 + 0.125, 2.35, (DZ0 + DZ1) / 2, Math.PI / 2, g);   // 门上方的门牌（大厅这一面）
  { const hinge = new THREE.Group(); hinge.position.set(X1 + 0.02, 0, DZ1); hinge.rotation.y = Math.PI * 100 / 180; g.add(hinge);   // 门轴在靠门面那一侧
    const leafM = pbr('wood_table_worn', 0.88, 2.05, { size: 0.9, color: 0x9a8268, roughness: 0.6 });
    const lf = new THREE.Group(); lf.position.set(0, 0, 0); hinge.add(lf);       // 门扇沿本地 −z 方向伸出去
    box(0.04, 2.05, 0.88, leafM, -0.02, 1.025 + 0.01, -0.44, lf);
    const glassW = new THREE.MeshPhysicalMaterial({ color: 0xcfd8d4, roughness: 0.15, transparent: true, opacity: 0.35 });
    box(0.042, 0.42, 0.26, glassW, -0.02, 1.6, -0.44, lf);                         // 门上的夹丝玻璃小窗
    for (const s of [-1, 1]) box(0.046, 0.46, 0.02, frameM, -0.02, 1.6, -0.44 + s * 0.14, lf);
    for (const s of [-1, 1]) box(0.046, 0.02, 0.3, frameM, -0.02, 1.6 + s * 0.22, -0.44, lf);
    box(0.046, 0.2, 0.84, M.steel, -0.02, 0.12, -0.44, lf);                         // 踢脚板
    for (const s of [-1, 1]) { const lv = box(0.02, 0.02, 0.12, M.steel, -0.02 + s * 0.04, 1.02, -0.78, lf); }   // 两面的把手
    for (const y of [0.25, 1.8]) cyl(0.008, 0.008, 0.1, M.steel, 0.0, y, 0, lf, 8); }   // 合页
  { const stop = cyl(0.015, 0.015, 0.04, M.ink, -8.0, 0.02, 4.62, g, 10); }           // 地上的门吸

  // ---------------------------------------------------------------- 左墙：窗（百叶半拉）、窗外是夜里的后巷；窗下一组铸铁暖气片
  { const out = canvasTexture(512, 512, (c, W, Hh) => { const gr = c.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, '#0c1420'); gr.addColorStop(1, '#1a2028'); c.fillStyle = gr; c.fillRect(0, 0, W, Hh);
      c.fillStyle = 'rgba(60,50,44,.9)'; for (let y = 120; y < Hh; y += 18) for (let x = (y / 18 % 2) * 20; x < W; x += 40) c.fillRect(x, y, 37, 15);   // 对面的砖墙
      const lamp = c.createRadialGradient(380, 150, 4, 380, 150, 220); lamp.addColorStop(0, 'rgba(255,190,110,.75)'); lamp.addColorStop(1, 'rgba(255,190,110,0)'); c.fillStyle = lamp; c.fillRect(0, 0, W, Hh);   // 一盏路灯的光
      c.fillStyle = '#ffd8a0'; c.beginPath(); c.arc(380, 150, 7, 0, 7); c.fill(); c.fillStyle = 'rgba(20,20,22,.9)'; c.fillRect(120, 260, 14, 252); c.fillRect(60, 330, 200, 10); });   // 管子
    plane(1.8, 1.6, new THREE.MeshBasicMaterial({ map: out, toneMapped: false, color: new THREE.Color(0.55, 0.55, 0.55) }), X0 - 0.9, 1.5, (WZ0 + WZ1) / 2, Math.PI / 2, g);
    const wf = new THREE.MeshStandardMaterial({ color: 0xe0dccf, roughness: 0.55 });   // 刷白漆的木窗框
    for (const z of [WZ0, WZ1]) box(0.1, WY1 - WY0 + 0.08, 0.05, wf, X0 - 0.03, (WY0 + WY1) / 2, z, g);
    for (const y of [WY0, WY1]) box(0.1, 0.05, WZ1 - WZ0 + 0.08, wf, X0 - 0.03, y, (WZ0 + WZ1) / 2, g);
    box(0.1, WY1 - WY0, 0.035, wf, X0 - 0.03, (WY0 + WY1) / 2, (WZ0 + WZ1) / 2, g);   // 中梃
    plane(WZ1 - WZ0, WY1 - WY0, M.glass, X0 - 0.03, (WY0 + WY1) / 2, (WZ0 + WZ1) / 2, Math.PI / 2, g);
    box(0.22, 0.03, WZ1 - WZ0 + 0.16, wf, X0 + 0.06, WY0 - 0.03, (WZ0 + WZ1) / 2, g);   // 窗台板
    // 百叶：拉下来三分之二，叶片斜着，有一片弯了
    const slatM = new THREE.MeshStandardMaterial({ color: 0xd8d4c6, roughness: 0.45, metalness: 0.2 });
    box(0.06, 0.05, WZ1 - WZ0 + 0.06, slatM, X0 + 0.07, WY1 + 0.03, (WZ0 + WZ1) / 2, g);
    for (let i = 0; i < 16; i++) { const y = WY1 - 0.04 - i * 0.048; const s = box(0.05, 0.003, WZ1 - WZ0 + 0.02, slatM, X0 + 0.075, y, (WZ0 + WZ1) / 2, g); s.rotation.z = i === 9 ? 0.2 : 0.75; if (i === 9) s.rotation.x = 0.06; }
    for (const z of [WZ0 + 0.25, WZ1 - 0.25]) box(0.002, 0.8, 0.004, M.ink, X0 + 0.09, WY1 - 0.4, z, g);   // 拉绳
    // 暖气片：12 片铸铁柱，刷奶白漆，漆面有点黄、掉漆
    const radM = new THREE.MeshStandardMaterial({ color: 0xd8d0b8, roughness: 0.55, metalness: 0.2, bumpMap: grain, bumpScale: 0.4 });
    for (let i = 0; i < 12; i++) RB(0.07, 0.6, 0.055, 0.02, radM, X0 + 0.11, 0.45, WZ0 + 0.18 + i * 0.07);
    for (const y of [0.2, 0.7]) { const p = cyl(0.018, 0.018, 0.86, radM, X0 + 0.11, y, (WZ0 + WZ1) / 2 - 0.01, g, 10); p.rotation.x = Math.PI / 2; }
    cyl(0.012, 0.012, 0.2, M.steel, X0 + 0.11, 0.1, WZ0 + 0.12, g, 8); }

  // ---------------------------------------------------------------- 办公桌：灰绿色钢制老式办公桌，木纹贴面桌面；左边一个三抽屉柜
  const DX = -9.55, DZc = 3.0, DW = 0.75, DL = 1.5, DTH = 0.75;
  const deskSteel = new THREE.MeshStandardMaterial({ color: 0x6a7462, roughness: 0.5, metalness: 0.45, bumpMap: grain, bumpScale: 0.15 });
  const top = RB(DW, 0.03, DL, 0.006, pbr('wood_table_001', DW, DL, { size: 0.8, color: 0xb0987a, roughness: 0.45 }), DX, DTH - 0.015, DZc);
  box(0.02, 0.62, DL - 0.04, deskSteel, DX + DW / 2 - 0.03, DTH - 0.34, DZc, g);   // 朝门那面的挡板
  RB(DW - 0.04, DTH - 0.04, 0.42, 0.006, deskSteel, DX, (DTH - 0.03) / 2, DZc - DL / 2 + 0.23);   // 抽屉柜
  for (let i = 0; i < 3; i++) { const y = 0.13 + i * 0.22; box(0.004, 0.19, 0.38, new THREE.MeshStandardMaterial({ color: 0x5e6858, roughness: 0.5, metalness: 0.45 }), DX - DW / 2 + 0.018, y + 0.02, DZc - DL / 2 + 0.23, g); box(0.02, 0.018, 0.12, M.steel, DX - DW / 2 + 0.01, y + 0.08, DZc - DL / 2 + 0.23, g); }
  for (const z of [DZc + DL / 2 - 0.03]) for (const x of [DX - DW / 2 + 0.03, DX + DW / 2 - 0.03]) box(0.03, DTH - 0.03, 0.03, deskSteel, x, (DTH - 0.03) / 2, z, g);   // 右边两条腿
  const T = DTH;                                                                   // 桌面高度
  // 显示器：米色老 CRT，屏幕朝着坐在桌后的人（朝 −x、略朝 +z）
  { const mon = new THREE.Group(); mon.position.set(DX - 0.08, T, DZc - 0.42); mon.rotation.y = -0.63; g.add(mon);
    const beige = new THREE.MeshPhysicalMaterial({ color: 0xd4ccb6, roughness: 0.5, clearcoat: 0.2 });
    RB(0.24, 0.025, 0.2, 0.01, beige, 0, 0.0125, 0, mon); cyl(0.04, 0.05, 0.04, beige, 0, 0.045, 0, mon, 16);
    RB(0.38, 0.33, 0.06, 0.02, beige, 0, 0.245, 0.14, mon);                        // 前框
    const back = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.24, 4, 1), beige); back.rotation.set(Math.PI / 2, Math.PI / 4, 0); back.scale.set(1.3, 1, 1); back.position.set(0, 0.25, -0.02); mon.add(back);   // 后面的锥形壳
    const scr = canvasTexture(320, 240, (c, W, Hh) => { c.fillStyle = '#0a1a14'; c.fillRect(0, 0, W, Hh); c.fillStyle = '#7fe0a8'; c.font = '14px "Courier New", monospace';
      ['DONOR DB v2.3', '> SELECT * FROM lines', 'B-0417  BOVINE   ACTIVE', 'P-0932  PORCINE  ACTIVE', 'G-0221  AVIAN    DONOR N/A', 'F-1180  PISCINE  ????', '> _'].forEach((t, i) => c.fillText(t, 16, 30 + i * 26));
      for (let y = 0; y < Hh; y += 3) { c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(0, y, W, 1); } });
    plane(0.31, 0.24, new THREE.MeshPhysicalMaterial({ color: 0x050505, emissive: 0xffffff, emissiveMap: scr, emissiveIntensity: 0.55, roughness: 0.1, clearcoat: 1 }), 0, 0.25, 0.171, 0, mon);
    // 键盘：米色，按键是一张贴图
    const kb = new THREE.Group(); kb.position.set(DX - 0.2, T, DZc + 0.05); kb.rotation.y = -Math.PI / 2; g.add(kb);
    RB(0.44, 0.022, 0.15, 0.006, pbr('Plastic013B', 0.44, 0.15, { size: 0.25, color: 0xc8c0aa, roughness: 0.6 }), 0, 0.011, 0, kb);
    const keyA = pbr('Plastic010', 0.017, 0.016, { size: 0.06, color: 0xd8d2c2, roughness: 0.65 }), keyB = pbr('Plastic010', 0.017, 0.016, { size: 0.06, color: 0x9c978a, roughness: 0.65 });
    const rows = ['ESC F1 F2 F3 F4 F5 F6 F7 F8 F9 F10 F11 F12', '` 1 2 3 4 5 6 7 8 9 0 - = ←:2', 'TAB:1.5 Q W E R T Y U I O P [ ] \\:1.5', "CAPS:1.75 A S D F G H J K L ; ' ENTER:2.25", 'SHIFT:2.25 Z X C V B N M , . / SHIFT:2.75', 'CTRL:1.5 ALT:1.5 _:9 ALT:1.5 CTRL:1.5'];   // 键距 19 mm
    const caps = [];
    rows.forEach((row, r) => { let u = 0; for (const k of row.split(' ')) { const [label, n] = k.split(':'), w = +(n || (r ? 1 : 15 / 13));
      const x = (u + w / 2 - 7.5) * 0.019, z = (r - 2.5) * 0.021;
      RB(w * 0.019 - 0.0025, 0.007, 0.0175, 0.0022, (r === 0 || (n && label !== '_')) ? keyB : keyA, x, 0.024, z, kb, 2);
      if (label !== '_') caps.push([label, x, z]);
      u += w; } });
    const legend = canvasTexture(870, 384, (c, W, Hh) => { c.clearRect(0, 0, W, Hh); c.fillStyle = '#2b2b28'; c.textAlign = 'center'; c.textBaseline = 'middle';
      for (const [t, x, z] of caps) { c.font = `600 ${t.length > 2 ? 12 : 22}px Inter, sans-serif`; c.fillText(t, (x / 0.29 + 0.5) * W, (z / 0.128 + 0.5) * Hh); } });
    plane(0.29, 0.128, new THREE.MeshStandardMaterial({ map: legend, transparent: true, depthWrite: false, roughness: 0.7 }), 0, 0.0278, 0, 0, kb).rotation.x = -Math.PI / 2;
    const cable = new THREE.CatmullRomCurve3([new THREE.Vector3(DX - 0.2, T + 0.005, DZc - 0.18), new THREE.Vector3(DX - 0.25, T + 0.003, DZc - 0.3), new THREE.Vector3(DX - 0.18, T + 0.003, DZc - 0.4)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(cable, 16, 0.003, 5), M.ink)); }
  // 登记簿：一本摊开的硬皮大账本，转过来朝着桌前的人（点进去看内容）
  // 供体动物登记簿：摊开着，能一页一页翻（office-paper.js）
  const ledger = makeLedger({ pbr, RB }), ledgerG = ledger.group;
  ledgerG.position.set(DX + 0.12, T, DZc + 0.12); ledgerG.rotation.y = Math.PI / 2 - 0.08; g.add(ledgerG);
  { const pn = pencil(); pn.position.set(DX - 0.15, T + 0.006, DZc + 0.12); pn.rotation.y = 0.5; g.add(pn); }   // 铅笔搁在登记簿旁边（不压着书页）
  // 台灯
  // 台灯：底座坐在桌面上（模型原点在底座中间，底座底面比原点低 8.8 cm），灯头探到登记簿上方
  model('desk_lamp_arm_01', { pos: [DX - 0.11, T + 0.088, DZc + 0.42], rot: -0.69, parent: g });
  const lampL = new THREE.PointLight(0xffa450, 1.1, 2.6, 1.5); lampL.position.set(DX, T + 0.62, DZc + 0.28); g.add(lampL);
  // 电话：米色按键座机，听筒架在上面，卷线
  { const ph = new THREE.Group(); ph.position.set(DX + 0.2, T, DZc + 0.58); ph.rotation.y = Math.PI / 2 + 0.3; g.add(ph);
    const pm = pbr('Plastic013B', 0.21, 0.22, { size: 0.25, color: 0xd6cdb4, roughness: 0.5 });
    const base = RB(0.2, 0.05, 0.22, 0.015, pm, 0, 0.025, 0, ph); base.rotation.x = 0;
    RB(0.21, 0.035, 0.055, 0.015, pm, 0, 0.068, -0.03, ph);                         // 听筒
    const keys = canvasTexture(96, 128, (c, W, Hh) => { c.fillStyle = '#d6cdb4'; c.fillRect(0, 0, W, Hh); c.fillStyle = '#efe8d8'; for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) { c.fillRect(10 + k * 28, 10 + r * 28, 22, 20); } c.fillStyle = '#2a2a2a'; c.font = 'bold 14px Arial'; '123456789*0#'.split('').forEach((t, i) => c.fillText(t, 16 + (i % 3) * 28, 26 + (i / 3 | 0) * 28)); });
    plane(0.09, 0.12, new THREE.MeshStandardMaterial({ map: keys, roughness: 0.5 }), 0, 0.0505, 0.05, 0, ph).rotation.x = -Math.PI / 2;
    const coil = new THREE.CatmullRomCurve3(Array.from({ length: 40 }, (_, i) => { const t = i / 39, a = t * 50; return new THREE.Vector3(0.11 + t * 0.03 + Math.cos(a) * 0.006, 0.06 - t * 0.055 + Math.sin(a) * 0.006, -0.03 + t * 0.08); }));
    ph.add(new THREE.Mesh(new THREE.TubeGeometry(coil, 120, 0.0018, 4), new THREE.MeshStandardMaterial({ color: 0xc8bea4, roughness: 0.5 }))); }
  // 文件夹一摞（牛皮纸，露出的纸边、标签）
  { const fg = new THREE.Group(); fg.position.set(DX + 0.23, T, DZc - 0.55); fg.rotation.y = 0.12; g.add(fg);
    const manila = new THREE.MeshStandardMaterial({ color: 0xc8a86a, roughness: 0.85 }), paper = new THREE.MeshStandardMaterial({ color: 0xece6d6, roughness: 0.95 });
    for (let i = 0; i < 7; i++) { const y = 0.004 + i * 0.011, r = (rnd() - 0.5) * 0.08; const f = box(0.24, 0.004, 0.32, manila, (rnd() - 0.5) * 0.015, y, 0, fg); f.rotation.y = r; const p = box(0.225, 0.005, 0.3, paper, (rnd() - 0.5) * 0.01, y + 0.005, 0.005, fg); p.rotation.y = r + (rnd() - 0.5) * 0.04;
      if (i % 2) box(0.06, 0.003, 0.02, manila, -0.06 + i * 0.015, y, 0.17, fg).rotation.y = r; } }
  // 印章 + 铁皮印台（印垫 110 × 70 mm），计算器（103 × 147 × 29 mm），杯子，烟灰缸
  { const pad = new THREE.Group(); pad.position.set(DX + 0.26, T, DZc - 0.2); pad.rotation.y = 0.15; g.add(pad);
    const tin = pbr('Metal009', 0.121, 0.085, { size: 0.15, color: 0x5a5c57, metalness: 0.7, roughness: 0.55 }), inner = pbr('Metal009', 0.121, 0.085, { size: 0.15, color: 0x8e948f, metalness: 0.8, roughness: 0.5 });
    const felt = pbr('Fabric045', 0.11, 0.07, { size: 0.12, color: 0x5c1210, roughness: 1 }), W = 0.121, D = 0.085, t = 0.0015;
    box(W, t, D, tin, 0, t / 2, 0, pad);
    for (const e of [-1, 1]) { box(W, 0.013, t, tin, 0, 0.0065, e * (D - t) / 2, pad); box(t, 0.013, D, tin, e * (W - t) / 2, 0.0065, 0, pad); }
    RB(0.11, 0.009, 0.07, 0.004, felt, 0, 0.006, 0, pad);
    const hinge = cyl(0.0022, 0.0022, 0.07, inner, 0, 0.0135, -D / 2, pad, 8); hinge.rotation.z = Math.PI / 2;
    const lid = new THREE.Group(); lid.position.set(0, 0.0135, -D / 2); lid.rotation.x = -1.85; pad.add(lid);   // 盖子往后掀着
    box(W, t, D, tin, 0, t, D / 2, lid); box(W - 0.004, t, D - 0.004, inner, 0, -0.0002, D / 2, lid);
    box(W, 0.006, t, tin, 0, -0.002, D, lid);
    for (const e of [-1, 1]) box(t, 0.006, D, tin, e * (W - t) / 2, -0.002, D / 2, lid);
    const sx = DX + 0.145, sz = DZc - 0.18;                                        // 车木手柄的橡皮章，没盖正，橡皮沾着红
    const knob = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.016, 0], [0.011, 0.012], [0.009, 0.026], [0.014, 0.042], [0.017, 0.053], [0.013, 0.063], [0, 0.066]].map(([a, b]) => new THREE.Vector2(a, b)), 20), railM);
    knob.position.set(sx, T + 0.023, sz); g.add(knob);
    RB(0.06, 0.016, 0.03, 0.003, railM, sx, T + 0.015, sz).rotation.y = 0.5;
    box(0.056, 0.007, 0.026, pbr('Rubber004', 0.056, 0.026, { size: 0.1, color: 0x6a2420 }), sx, T + 0.0035, sz, g).rotation.y = 0.5;

    const calc = new THREE.Group(); calc.position.set(DX - 0.2, T, DZc + 0.62); calc.rotation.y = Math.PI / 2 - 0.3; g.add(calc);
    const side = new THREE.Shape([[-0.0735, 0.002], [0.0735, 0.002], [0.0735, 0.012], [-0.0735, 0.027]].map(([a, b]) => new THREE.Vector2(a, b)));
    const shellGeo = new THREE.ExtrudeGeometry(side, { depth: 0.103, bevelEnabled: false }); shellGeo.rotateY(-Math.PI / 2); shellGeo.translate(0.0515, 0, 0);
    { const uv = shellGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 0.147, uv.getY(i) / 0.103); }
    calc.add(new THREE.Mesh(shellGeo, pbr('Plastic013B', 0.147, 0.103, { size: 0.12, color: 0x45464a, roughness: 0.65 })));
    for (const a of [-0.04, 0.04]) for (const b of [-0.06, 0.06]) cyl(0.005, 0.005, 0.002, M.ink, a, 0.001, b, calc, 10);
    const face = new THREE.Group(); face.position.set(0, 0.0197, 0); face.rotation.x = Math.atan2(0.015, 0.147); calc.add(face);   // 面板是斜的
    box(0.099, 0.0012, 0.142, pbr('Metal009', 0.099, 0.142, { size: 0.2, color: 0x9a9c98, metalness: 0.7, roughness: 0.45 }), 0, 0.0006, 0, face);
    const lcd = canvasTexture(240, 70, (c, W, Hh) => { c.fillStyle = '#87957f'; c.fillRect(0, 0, W, Hh); c.fillStyle = '#20281f'; c.font = '500 46px "IBM Plex Mono", monospace'; c.textAlign = 'right'; c.fillText('1680.', W - 12, 52); });
    RB(0.088, 0.003, 0.032, 0.001, M.ink, 0, 0.002, -0.047, face);
    plane(0.078, 0.0225, new THREE.MeshPhysicalMaterial({ map: lcd, roughness: 0.18, clearcoat: 1 }), 0, 0.0037, -0.047, 0, face).rotation.set(-Math.PI / 2, 0, 0);
    const keys = ['MC', 'MR', 'M−', 'M+', '÷', '%', '7', '8', '9', '×', '√', '4', '5', '6', '−', 'C', '1', '2', '3', '+', 'AC', '0', '00', '.', '='];
    const keyMap = canvasTexture(440, 460, (c, W, Hh) => { c.clearRect(0, 0, W, Hh); c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '600 34px "Inter", sans-serif';
      keys.forEach((k, i) => { c.fillStyle = k === 'AC' ? '#fff' : i % 5 === 0 || i % 5 === 4 || i < 5 ? '#f0eee6' : '#25262a'; c.fillText(k, 44 + (i % 5) * 88, 46 + Math.floor(i / 5) * 92); }); });
    const num = pbr('Plastic010', 0.014, 0.013, { size: 0.06, color: 0xcfcabb, roughness: 0.6 }), fn = pbr('Plastic010', 0.014, 0.013, { size: 0.06, color: 0x34363a, roughness: 0.6 }), ac = pbr('Plastic010', 0.014, 0.013, { size: 0.06, color: 0x9a4a22, roughness: 0.6 });
    keys.forEach((k, i) => RB(0.0145, 0.004, 0.0135, 0.0016, k === 'AC' ? ac : i % 5 === 0 || i % 5 === 4 || i < 5 ? fn : num, (i % 5 - 2) * 0.018, 0.003, -0.014 + Math.floor(i / 5) * 0.019, face, 2));
    plane(0.09, 0.095, new THREE.MeshStandardMaterial({ map: keyMap, transparent: true, depthWrite: false, roughness: 0.6 }), 0, 0.00515, 0.024, 0, face).rotation.set(-Math.PI / 2, 0, 0);
    ITEM.mug(g, DX - 0.25, T, DZc + 0.42, { seed: 7 }); ITEM.ashtray(g, DX - 0.28, T, DZc - 0.62, { seed: 3 }); }

  // ---------------------------------------------------------------- 办公椅：五星脚、气杆、灰色布面坐垫和靠背（往一边转着）
  { const ch = new THREE.Group(); ch.position.set(-10.03, 0, 3.15); ch.rotation.y = Math.PI / 2 + 0.35; g.add(ch);
    const fab = pbr('fabric_pattern_07', 0.5, 0.5, { size: 0.3, variant: '02', color: 0x5a5e62 });
    const blk = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.45, metalness: 0.2 });
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const leg = box(0.3, 0.025, 0.04, blk, Math.cos(a) * 0.15, 0.06, Math.sin(a) * 0.15, ch); leg.rotation.y = -a; const w = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.025, 12), blk); w.rotation.x = Math.PI / 2; w.rotation.y = -a; w.position.set(Math.cos(a) * 0.29, 0.025, Math.sin(a) * 0.29); ch.add(w); }
    cyl(0.025, 0.025, 0.36, M.steel, 0, 0.25, 0, ch, 12); cyl(0.035, 0.035, 0.12, blk, 0, 0.13, 0, ch, 12);
    RB(0.48, 0.08, 0.46, 0.03, fab, 0, 0.47, 0, ch);                              // 坐垫
    box(0.05, 0.3, 0.04, blk, 0, 0.6, -0.24, ch).rotation.x = -0.1;
    const bk = RB(0.44, 0.5, 0.07, 0.03, fab, 0, 0.88, -0.28, ch); bk.rotation.x = -0.12;   // 靠背
    for (const s of [-1, 1]) { box(0.04, 0.03, 0.26, blk, s * 0.25, 0.66, -0.02, ch); box(0.025, 0.18, 0.025, blk, s * 0.25, 0.57, 0.05, ch); } }
  // 来客坐的旧铁凳
  model('metal_stool_01', { pos: [-8.75, 0, 3.15], rot: 0.4, parent: g });

  // ---------------------------------------------------------------- 后墙：两个四抽屉档案柜（每个细胞系一格）、监控屏、挂钟、营业执照、通往仓库的铁门
  const cabM = new THREE.MeshStandardMaterial({ color: 0x8c9088, roughness: 0.45, metalness: 0.5, bumpMap: grain, bumpScale: 0.1 });
  const labels = [['B-0417', 'BOVINE'], ['P-0932', 'PORCINE'], ['G-0221', 'AVIAN'], ['F-1180', 'PISCINE'], ['CONSENT', 'FORMS'], ['INVOICES', '2026'], ['AUDIT', 'FDA/SAMR'], ['MISC', '']];
  [-8.62, -8.12].forEach((cx, ci) => {
    RB(0.47, 1.32, 0.62, 0.008, cabM, cx, 0.66, Z0 + 0.32);
    for (let d = 0; d < 4; d++) { const y = 0.17 + d * 0.315; const [a, b] = labels[ci * 4 + d];
      RB(0.43, 0.29, 0.02, 0.005, cabM, cx, y + 0.02, Z0 + 0.63);
      box(0.14, 0.02, 0.03, M.steel, cx, y + 0.07, Z0 + 0.65, g);                  // 拉手
      const lt = canvasTexture(160, 64, (c, W, Hh) => { c.fillStyle = '#f0ead8'; c.fillRect(0, 0, W, Hh); c.fillStyle = '#1a1a3a'; c.font = HAND(30); c.fillText(a, 10, 30); c.font = HAND(20, 500); c.fillText(b, 12, 54); });
      plane(0.08, 0.032, new THREE.MeshStandardMaterial({ map: lt, roughness: 0.8 }), cx, y + 0.12, Z0 + 0.641, 0, g);
      for (const s of [-1, 1]) box(0.004, 0.036, 0.004, M.steel, cx + s * 0.042, y + 0.12, Z0 + 0.642, g); }   // 镀铬标签框
  });
  // 监控屏：架在档案柜上，四分屏（门口、大厅、加工间、仓库），黑白带雪花
  { const cm = new THREE.Group(); cm.position.set(-8.37, 1.32, Z0 + 0.3); g.add(cm);
    RB(0.36, 0.28, 0.3, 0.015, new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.5 }), 0, 0.14, 0, cm);
    const feed = canvasTexture(400, 300, (c, W, Hh) => { c.fillStyle = '#111'; c.fillRect(0, 0, W, Hh);
      const q = [['CAM1 ENTRANCE', '#5a5a56'], ['CAM2 HALL', '#6a6a62'], ['CAM3 WORKSHOP', '#4a5250'], ['CAM4 STORAGE', '#3a3a3a']];
      q.forEach(([t, col], i) => { const x = (i % 2) * 200, y = (i / 2 | 0) * 150; c.fillStyle = col; c.fillRect(x + 2, y + 2, 196, 146);
        c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x + 30, y + 60, 60, 80); c.fillRect(x + 120, y + 40, 50, 100);   // 模糊的东西
        for (let k = 0; k < 900; k++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.12})`; c.fillRect(x + Math.random() * 196, y + Math.random() * 146, 1, 1); }
        c.fillStyle = '#e8e8e8'; c.font = '12px monospace'; c.fillText(t, x + 8, y + 18); c.fillText('2026-11-20 19:42', x + 90, y + 140); }); });
    plane(0.3, 0.22, new THREE.MeshPhysicalMaterial({ color: 0x050505, emissive: 0xffffff, emissiveMap: feed, emissiveIntensity: 0.5, roughness: 0.15, clearcoat: 1 }), 0, 0.15, 0.151, 0, cm);
    cyl(0.004, 0.004, 0.003, new THREE.MeshBasicMaterial({ color: 0x40ff60 }), 0.14, 0.03, 0.152, cm, 8).rotation.x = Math.PI / 2; }
  model('wall_clock', { pos: [-8.37, 2.25, Z0 + 0.02], parent: g });
  // 营业执照（镜框，玻璃反光）
  { const lic = canvasTexture(420, 580, (c, W, Hh) => { c.fillStyle = '#efe6d0'; c.fillRect(0, 0, W, Hh); c.strokeStyle = '#a07a3a'; c.lineWidth = 8; c.strokeRect(16, 16, W - 32, Hh - 32); c.fillStyle = '#7a1a18'; c.font = `700 40px ${SANS}`; c.textAlign = 'center'; c.font = `700 31px ${SANS}`; c.fillText('FOOD BUSINESS', W / 2, 100); c.fillText('REGISTRATION', W / 2, 136);
      c.font = `500 18px ${SANS}`; c.fillStyle = '#2a2a2a'; ['Future Meat Market Ltd.', 'Category: retail butcher', 'Fresh, frozen and cooked meat', 'Cultivated meat (pilot scheme)', 'Registered 11 March 2024'].forEach((t, i) => c.fillText(t, W / 2, 190 + i * 40));
      c.strokeStyle = 'rgba(190,30,30,.75)'; c.lineWidth = 4; c.beginPath(); c.arc(W / 2 + 80, 470, 52, 0, 7); c.stroke(); c.fillStyle = 'rgba(190,30,30,.75)'; c.font = '30px serif'; c.fillText('★', W / 2 + 80, 482); });
    const fr = new THREE.Group(); fr.position.set(-10.28, 1.75, Z0 + 0.02); g.add(fr);
    box(0.42, 0.56, 0.02, new THREE.MeshStandardMaterial({ color: 0x2a1e14, roughness: 0.5 }), 0, 0, 0.01, fr);
    plane(0.36, 0.5, new THREE.MeshStandardMaterial({ map: lic, roughness: 0.8 }), 0, 0, 0.021, 0, fr);
    plane(0.38, 0.52, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.1, clearcoat: 1, depthWrite: false }), 0, 0, 0.025, 0, fr); }
  // 通往仓库的铁门：灰色防火门，推杠，门上贴着 WAREHOUSE 和“随手关门”
  { const dm = new THREE.MeshStandardMaterial({ color: 0x6e726c, roughness: 0.45, metalness: 0.55, bumpMap: grain, bumpScale: 0.12 });
    for (const x of [BD0 - 0.035, BD1 + 0.035]) box(0.07, DH + 0.07, 0.14, frameM, x, (DH + 0.07) / 2, Z0 - 0.02, g);
    box(BD1 - BD0 + 0.14, 0.07, 0.14, frameM, (BD0 + BD1) / 2, DH + 0.035, Z0 - 0.02, g);
    box(BD1 - BD0 - 0.01, DH - 0.01, 0.05, dm, (BD0 + BD1) / 2, DH / 2, Z0 - 0.02, g);
    box(0.7, 0.04, 0.05, M.steel, (BD0 + BD1) / 2, 1.0, Z0 + 0.04, g); for (const s of [-1, 1]) box(0.03, 0.05, 0.06, M.steel, (BD0 + BD1) / 2 + s * 0.36, 1.0, Z0 + 0.025, g);   // 推杠
    const sg = canvasTexture(400, 260, (c, W, Hh) => { c.fillStyle = '#e8c832'; c.fillRect(0, 0, W, Hh); c.fillStyle = '#1a1a1a'; c.font = `800 54px ${SANS}`; c.fillText('WAREHOUSE', 26, 80); c.font = `600 34px ${SANS}`; c.fillText('KEEP DOOR SHUT', 28, 140); c.font = `500 24px ${SANS}`; c.fillText('KEEP CLOSED  →  COLD STORE', 28, 210); });
    plane(0.4, 0.26, new THREE.MeshStandardMaterial({ map: sg, roughness: 0.6 }), (BD0 + BD1) / 2, 1.55, Z0 + 0.007, 0, g);
    decal('Scratches003', g, { pos: [(BD0 + BD1) / 2, 0.5, Z0 + 0.006], w: 0.8, h: 0.8, color: 0xc0c0b8, opacity: 0.5 }); }
  // 档案柜右边：小桌子上一台传真机，旁边一摞纸
  { box(0.6, 0.72, 0.5, new THREE.MeshStandardMaterial({ color: 0x4a4e48, roughness: 0.5, metalness: 0.4 }), -7.45, 0.36, Z0 + 0.27, g);
    const fx = new THREE.Group(); fx.position.set(-7.45, 0.72, Z0 + 0.27); g.add(fx);
    const fm = new THREE.MeshPhysicalMaterial({ color: 0xd8d2c0, roughness: 0.5, clearcoat: 0.2 });
    RB(0.36, 0.1, 0.32, 0.02, fm, 0, 0.05, 0, fx); RB(0.3, 0.05, 0.12, 0.02, fm, 0, 0.12, -0.08, fx).rotation.x = 0.4;
    for (let i = 0; i < 3; i++) { const p = box(0.21, 0.002, 0.28, new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.9 }), 0, 0.135 + i * 0.004, -0.13, fx); p.rotation.x = 0.4 + i * 0.05; }   // 进纸架上的纸
    const fl = new THREE.PlaneGeometry(0.2, 0.25, 1, 10); { const P = fl.attributes.position; for (let i = 0; i < P.count; i++) { const t = (P.getY(i) + 0.125) / 0.25; P.setZ(i, -Math.sin(t * 1.3) * 0.05); P.setY(i, P.getY(i) * Math.cos(t * 0.5)); } fl.computeVertexNormals(); }
    const out = new THREE.Mesh(fl, new THREE.MeshStandardMaterial({ color: 0xf0ece0, roughness: 0.9, side: THREE.DoubleSide })); out.rotation.x = -1.2; out.position.set(0, 0.08, 0.2); fx.add(out); }   // 刚吐出来的一张

  // ---------------------------------------------------------------- 右墙（大厅墙的背面）：批次白板
  const whiteboard = makeWhiteboard({ pbr, M, box, cyl });
  whiteboard.group.position.set(X1 - 0.012, 1.45, 1.95); whiteboard.group.rotation.y = -Math.PI / 2; g.add(whiteboard.group);
  { const cal = canvasTexture(300, 420, (c, W, Hh) => { c.fillStyle = '#f4f0e6'; c.fillRect(0, 0, W, Hh); c.fillStyle = '#9a2422'; c.fillRect(0, 0, W, 150); c.fillStyle = '#fff'; c.font = `700 40px ${SANS}`; c.fillText('2026', 20, 60); c.font = `700 70px ${SANS}`; c.fillText('11', 190, 120);
      c.fillStyle = '#333'; c.font = `500 16px ${SANS}`; for (let d = 1; d <= 30; d++) { const i = d + 6 - 1, x = 16 + (i % 7) * 40, y = 190 + (i / 7 | 0) * 44; c.fillStyle = d === 20 ? '#9a2422' : '#333'; c.fillText(String(d), x, y); }
      c.strokeStyle = 'rgba(180,30,30,.8)'; c.lineWidth = 3; c.beginPath(); c.arc(16 + ((24 + 5) % 7) * 40 + 8, 190 + ((24 + 5) / 7 | 0) * 44 - 6, 16, 0, 7); c.stroke(); });
    const cp = plane(0.3, 0.42, new THREE.MeshStandardMaterial({ map: cal, roughness: 0.9 }), X0 + 0.006, 1.65, 4.25, Math.PI / 2, g); cp.rotation.z = 0.02; }
  { const sh = new THREE.Group(); sh.position.set(-9.85, 0, Z1 - 0.25); sh.rotation.y = Math.PI; g.add(sh);
    wireRack(sh, 1.3, 0.42, 1.85, [0.12, 0.55, 0.98, 1.41, 1.82]);
    const cardM = pbr('Cardboard001', 0.35, 0.25, { size: 0.5, color: 0xc8b090 });
    for (const [y, n] of [[0.13, 3], [1.42, 3]]) for (let i = 0; i < n; i++) { const b = box(0.36, 0.26, 0.36, cardM, -0.42 + i * 0.4, y + 0.14, 0, sh); b.rotation.y = (rnd() - 0.5) * 0.08;
      const lb = canvasTexture(160, 90, (c, W, Hh) => { c.fillStyle = '#f2ecd8'; c.fillRect(0, 0, W, Hh); c.fillStyle = '#222'; c.font = HAND(30); c.fillText(['2024', '2025', 'DONORS', 'Q3', 'BIOPSY', 'OLD'][(i + (y > 1 ? 3 : 0)) % 6], 14, 40); c.font = HAND(22, 500); c.fillText('records', 16, 74); });
      plane(0.14, 0.08, new THREE.MeshStandardMaterial({ map: lb, roughness: 0.9 }), -0.42 + i * 0.4, y + 0.15, 0.181, 0, sh); }
    const cols = [0x4a5560, 0x6a4a3c, 0x55604e, 0x3a3835, 0x8c7a58].map((color, i) => pbr(['Fabric045', 'leather_red_02', 'canvas_fabric', 'Cardboard001', 'rough_linen'][i], 0.28, 0.32, { size: 0.3, color, roughness: 0.85 }));   // 旧文件夹：布面、皮面、纸板
    for (const y of [0.56, 0.99]) { let x = -0.6; while (x < 0.58) { const w = 0.05 + rnd() * 0.03, lean = rnd() < 0.15 ? 0.25 : 0; const b = box(w, 0.32, 0.28, cols[Math.floor(rnd() * cols.length)], x + w / 2, y + 0.17, 0, sh); b.rotation.z = lean; x += w + 0.004 + lean * 0.1; } } }
  { const coat = hookGarment({ w: 0.5, h: 0.8, mat: pbr('denim_fabric_03', 0.5, 0.8, { size: 0.4, color: 0x3a3e46 }), seed: 21, sleeves: true });   // 挂在门后墙上的一件旧夹克
    const hk = new THREE.Group(); hk.position.set(-8.55, 1.78, Z1 - 0.02); hk.rotation.y = Math.PI; hk.add(coat); g.add(hk);
    box(0.03, 0.03, 0.06, M.steel, -8.55, 1.8, Z1 - 0.03, g); }
  { const sf = new THREE.Group(); sf.position.set(-8.6, 0, Z1 - 0.26); g.add(sf);   // 保险柜：墨绿色，转盘锁、把手
    const sm = new THREE.MeshStandardMaterial({ color: 0x2e3e34, roughness: 0.4, metalness: 0.5, bumpMap: grain, bumpScale: 0.1 });
    RB(0.44, 0.55, 0.44, 0.015, sm, 0, 0.275, 0, sf);
    cyl(0.04, 0.04, 0.02, M.steel, -0.08, 0.34, -0.225, sf, 24).rotation.x = Math.PI / 2;
    box(0.02, 0.12, 0.03, M.steel, 0.1, 0.3, -0.23, sf); }
  // 地上：废纸篓、几团纸、一个装文件的纸箱
  bin(g, -10.2, 3.95, { r: 0.13, h: 0.36, color: 0x3a3e3a, seed: 41, fill: 0.95 });
  for (const [x, z, s] of [[-9.95, 4.1, 901], [-8.9, 2.3, 902], [-9.2, 4.2, 903]]) litter(g, x, z, s);
  { const cb = box(0.42, 0.3, 0.32, pbr('Cardboard003', 0.42, 0.3, { size: 0.5 }), -10.25, 0.15, 1.6, g); cb.rotation.y = 0.2; }

  ledgerG.updateWorldMatrix(true, false);
  return {
    spots: {
      records: { eye: ledgerG.localToWorld(new THREE.Vector3(0, 0.54, 0.17)).toArray(), at: ledgerG.localToWorld(new THREE.Vector3(0, 0.02, 0)).toArray(), fov: 42 },
      board: { eye: [X1 - 1.17, 1.46, 1.96], at: [X1 - 0.012, 1.44, 1.95], fov: 47 },
    },
    ledger,
    ledgerPos: ledgerG.position.clone(),
  };
}
