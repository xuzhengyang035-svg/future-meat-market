// 办公室：门口左手边，从大厅左墙开一道门进去（原来那里是杂货架，杂货架挪到了门面左边那段墙前）。
// 管文件、记录：供体登记簿、细胞系档案柜、批次白板、监控屏；后墙一道铁门通往仓库。
// 坐标：大厅左墙在 x = −7.0（墙厚 0.1，办公室这一面在 −7.1）。办公室内部 x −10.6…−7.1，z 1.2…5.0，吊顶 2.9 m。
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

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
  const l1 = new THREE.PointLight(0xe4ecff, 5.5, 5.5, 1.5); l1.position.set(-8.9, 2.6, 3.1); g.add(l1);

  // ---------------------------------------------------------------- 大厅这一侧：门框、门牌；门开着，往办公室里推开约 100°
  const frameM = new THREE.MeshStandardMaterial({ color: 0x3a3226, roughness: 0.55 });
  for (const z of [DZ0 - 0.035, DZ1 + 0.035]) box(0.14, DH + 0.07, 0.07, frameM, X1 + 0.05, (DH + 0.07) / 2, z, g);
  box(0.14, 0.07, DZ1 - DZ0 + 0.14, frameM, X1 + 0.05, DH + 0.035, (DZ0 + DZ1) / 2, g);
  const plate = canvasTexture(360, 110, (c, W, Hh) => { c.fillStyle = '#e8e4d8'; c.fillRect(0, 0, W, Hh); c.fillStyle = '#1e1e1c'; c.font = `700 44px ${SANS}`; c.textBaseline = 'middle'; c.fillText('OFFICE', 22, 40); c.font = `500 22px ${SANS}`; c.fillStyle = '#9a2422'; c.fillText('STAFF ONLY · 办公室', 24, 84); });
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
    const kbT = canvasTexture(256, 96, (c, W, Hh) => { c.fillStyle = '#c8c0aa'; c.fillRect(0, 0, W, Hh); c.fillStyle = '#e4dccb'; for (let r = 0; r < 5; r++) for (let k = 0; k < 15; k++) c.fillRect(6 + k * 16.4, 6 + r * 17, 14, 14); c.fillRect(60, 6 + 4 * 17, 120, 14); });
    const kb = new THREE.Group(); kb.position.set(DX - 0.2, T, DZc + 0.05); kb.rotation.y = -Math.PI / 2; g.add(kb);
    RB(0.44, 0.022, 0.15, 0.006, new THREE.MeshStandardMaterial({ color: 0xc8c0aa, roughness: 0.6 }), 0, 0.011, 0, kb);
    plane(0.42, 0.13, new THREE.MeshStandardMaterial({ map: kbT, roughness: 0.6 }), 0, 0.0225, 0, 0, kb).rotation.x = -Math.PI / 2;
    const cable = new THREE.CatmullRomCurve3([new THREE.Vector3(DX - 0.2, T + 0.005, DZc - 0.18), new THREE.Vector3(DX - 0.25, T + 0.003, DZc - 0.3), new THREE.Vector3(DX - 0.18, T + 0.003, DZc - 0.4)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(cable, 16, 0.003, 5), M.ink)); }
  // 登记簿：一本摊开的硬皮大账本，转过来朝着桌前的人（点进去看内容）
  const ledgerG = new THREE.Group(); ledgerG.position.set(DX + 0.12, T, DZc + 0.12); ledgerG.rotation.y = Math.PI / 2 - 0.08; g.add(ledgerG);
  const coverM = new THREE.MeshStandardMaterial({ color: 0x5a1e1a, roughness: 0.6, bumpMap: grain, bumpScale: 0.3 });
  RB(0.44, 0.012, 0.31, 0.004, coverM, 0, 0.006, 0, ledgerG);
  const pageT = canvasTexture(560, 400, (c, W, Hh) => { c.fillStyle = '#ece4cc'; c.fillRect(0, 0, W, Hh); c.strokeStyle = 'rgba(80,110,150,.35)'; for (let y = 50; y < Hh; y += 22) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.strokeStyle = 'rgba(170,60,60,.4)'; c.beginPath(); c.moveTo(W / 2, 0); c.lineTo(W / 2, Hh); c.stroke(); c.fillStyle = 'rgba(30,30,60,.75)'; c.font = HAND(17);
    const rows = ['B-0417  Holstein  #1 farm  7x', 'P-0932  Duroc  #3  5x', 'G-0221  broiler  #5  sent to market', 'F-1180  croaker  cage  ?'];
    rows.forEach((t, i) => c.fillText(t, 300, 70 + i * 44)); for (let i = 0; i < 9; i++) c.fillText('— ' + ['11/02', '11/05', '11/09', '11/11', '11/14', '11/16', '11/17', '11/18', '11/20'][i] + '  batch ok', 20, 70 + i * 36);
    const sh = c.createLinearGradient(W / 2 - 30, 0, W / 2 + 30, 0); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.5, 'rgba(0,0,0,.18)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = sh; c.fillRect(W / 2 - 30, 0, 60, Hh); });
  const pg = new THREE.PlaneGeometry(0.42, 0.3, 16, 1); { const P = pg.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i); P.setZ(i, 0.012 * Math.sin(Math.abs(x) / 0.21 * Math.PI) * (1 - Math.abs(x) / 0.21 * 0.3)); } pg.computeVertexNormals(); }
  const pages = new THREE.Mesh(pg, new THREE.MeshStandardMaterial({ map: pageT, roughness: 0.9 })); pages.rotation.x = -Math.PI / 2; pages.position.y = 0.0135; ledgerG.add(pages);
  for (let i = 0; i < 4; i++) box(0.416, 0.002, 0.296, new THREE.MeshStandardMaterial({ color: 0xe0d8bf, roughness: 0.95 }), 0, 0.0125 - i * 0.0018, 0, ledgerG);   // 书页厚度
  const ledgerSurf = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.286), new THREE.MeshBasicMaterial({ visible: false })); ledgerSurf.rotation.x = -Math.PI / 2; ledgerSurf.position.y = 0.028; ledgerG.add(ledgerSurf);
  { const pn = pencil(); pn.position.set(DX + 0.12, T + 0.03, DZc + 0.05); pn.rotation.y = 0.5; g.add(pn); }   // 铅笔搁在账本上
  // 台灯
  model('desk_lamp_arm_01', { pos: [DX - 0.25, T, DZc + 0.66], rot: 2.4, parent: g });
  const lampL = new THREE.PointLight(0xffc27a, 1.6, 2.2, 1.6); lampL.position.set(DX - 0.05, T + 0.38, DZc + 0.42); g.add(lampL);
  // 电话：米色按键座机，听筒架在上面，卷线
  { const ph = new THREE.Group(); ph.position.set(DX + 0.2, T, DZc + 0.58); ph.rotation.y = Math.PI / 2 + 0.3; g.add(ph);
    const pm = new THREE.MeshPhysicalMaterial({ color: 0xd6cdb4, roughness: 0.45, clearcoat: 0.3 });
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
  // 印章 + 印台，计算器，杯子，烟灰缸
  { const pad = box(0.11, 0.018, 0.07, new THREE.MeshStandardMaterial({ color: 0x2a3a6a, roughness: 0.5, metalness: 0.4 }), DX + 0.27, T + 0.009, DZc - 0.15, g); pad.rotation.y = 0.2;
    plane(0.095, 0.055, new THREE.MeshStandardMaterial({ color: 0x8a1a18, roughness: 0.9 }), DX + 0.27, T + 0.0185, DZc - 0.15, 0, g).rotation.set(-Math.PI / 2, 0, 0.2);
    cyl(0.018, 0.022, 0.06, railM, DX + 0.18, T + 0.05, DZc - 0.22, g, 12); cyl(0.024, 0.024, 0.02, M.ink, DX + 0.18, T + 0.01, DZc - 0.22, g, 16);
    const calcT = canvasTexture(96, 128, (c, W, Hh) => { c.fillStyle = '#2a2a2a'; c.fillRect(0, 0, W, Hh); c.fillStyle = '#9fb09a'; c.fillRect(8, 8, 80, 24); c.fillStyle = '#222'; c.font = 'bold 18px monospace'; c.fillText('1680.', 30, 27); c.fillStyle = '#bbb'; for (let r = 0; r < 5; r++) for (let k = 0; k < 4; k++) c.fillRect(8 + k * 21, 42 + r * 17, 17, 13); });
    const calc = RB(0.09, 0.012, 0.13, 0.004, new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5 }), DX - 0.07, T + 0.006, DZc + 0.45); calc.rotation.y = 0.3;
    const cp = plane(0.085, 0.125, new THREE.MeshStandardMaterial({ map: calcT, roughness: 0.5 }), DX - 0.07, T + 0.0125, DZc + 0.45, 0, g); cp.rotation.set(-Math.PI / 2, 0, 0.3);
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
  { const lic = canvasTexture(420, 580, (c, W, Hh) => { c.fillStyle = '#efe6d0'; c.fillRect(0, 0, W, Hh); c.strokeStyle = '#a07a3a'; c.lineWidth = 8; c.strokeRect(16, 16, W - 32, Hh - 32); c.fillStyle = '#7a1a18'; c.font = `700 40px ${SANS}`; c.textAlign = 'center'; c.fillText('营业执照', W / 2, 110);
      c.font = `500 18px ${SANS}`; c.fillStyle = '#2a2a2a'; ['名称：未来肉类市场有限公司', '类型：食品经营（肉类零售）', '经营范围：鲜肉、冻品、熟食', '细胞培养肉（试点）', '成立日期：2024 年 3 月'].forEach((t, i) => c.fillText(t, W / 2, 190 + i * 40));
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
    const sg = canvasTexture(400, 260, (c, W, Hh) => { c.fillStyle = '#e8c832'; c.fillRect(0, 0, W, Hh); c.fillStyle = '#1a1a1a'; c.font = `800 54px ${SANS}`; c.fillText('WAREHOUSE', 26, 80); c.font = `600 34px ${SANS}`; c.fillText('仓库 · 随手关门', 28, 140); c.font = `500 24px ${SANS}`; c.fillText('KEEP CLOSED  →  COLD STORE', 28, 210); });
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
  { const wb = canvasTexture(880, 640, (c, W, Hh) => { c.fillStyle = '#f2f2ee'; c.fillRect(0, 0, W, Hh);
      c.fillStyle = 'rgba(120,130,150,.08)'; for (let i = 0; i < 18; i++) { c.beginPath(); c.ellipse(Math.random() * W, Math.random() * Hh, 60 + Math.random() * 90, 20, Math.random(), 0, 7); c.fill(); }   // 没擦干净的旧字印子
      c.textBaseline = 'alphabetic'; c.fillStyle = '#1d3a8a'; c.font = HAND(56, 700); c.fillText('BATCH LOG — NOV', 40, 72);
      c.strokeStyle = '#1d3a8a'; c.lineWidth = 3; for (const y of [96, 150]) { c.beginPath(); c.moveTo(36, y); c.lineTo(W - 40, y); c.stroke(); }
      c.font = HAND(32); ['LINE', 'TANK', 'HARVEST', 'STATUS'].forEach((t, i) => c.fillText(t, 44 + i * 200, 136));
      const rows = [['B-0417', 'R2', '11/21', 'ok ✓', '#1d3a8a'], ['P-0932', 'R3', '—', 'contam? re-seed', '#b22222'], ['G-0221', 'R1', '11/23', 'donor gone ⚠', '#b22222'], ['F-1180', '—', '—', 'waiting FBS', '#1d3a8a']];
      rows.forEach((r, i) => { c.fillStyle = r[4]; c.font = HAND(36); r.slice(0, 4).forEach((t, k) => c.fillText(t, 44 + k * 200, 200 + i * 62)); });
      c.fillStyle = '#b22222'; c.font = HAND(40, 700); c.fillText('AUDIT 12/02 !!', 44, 500); c.fillStyle = '#1d3a8a'; c.font = HAND(32); c.fillText('farm visit #1 → 11/24 (biopsy x2)', 44, 556);
      c.fillStyle = '#2a7a3a'; c.fillText('FBS order: 6 × 500 mL', 520, 500); c.fillStyle = '#1d3a8a'; c.fillText('call vet re: consent forms?', 470, 600); });
    const fr = new THREE.Group(); fr.position.set(X1 - 0.012, 1.45, 1.95); fr.rotation.y = -Math.PI / 2; g.add(fr);
    plane(1.1, 0.8, new THREE.MeshPhysicalMaterial({ map: wb, roughness: 0.15, clearcoat: 0.8 }), 0, 0, 0.006, 0, fr);
    for (const y of [-0.41, 0.41]) box(1.14, 0.025, 0.02, M.steel, 0, y, 0.008, fr); for (const x of [-0.56, 0.56]) box(0.025, 0.84, 0.02, M.steel, x, 0, 0.008, fr);
    box(0.5, 0.025, 0.06, M.steel, 0.2, -0.43, 0.03, fr);                          // 笔槽
    for (const [x, col] of [[0.05, 0x1d3a8a], [0.14, 0xb22222], [0.2, 0x1a1a1a]]) { const m = cyl(0.008, 0.008, 0.12, new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 }), x, -0.405, 0.035, fr, 8); m.rotation.z = Math.PI / 2; }
    box(0.12, 0.03, 0.05, new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 }), 0.36, -0.4, 0.035, fr); }   // 板擦

  // ---------------------------------------------------------------- 左墙：挂历；前墙：铁皮架子上的档案盒、活页夹，一件挂着的外套，一个保险柜
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
    const cols = [0x1d3a6a, 0x7a1a18, 0x2a5a3a, 0x222222, 0xc8a030];
    for (const y of [0.56, 0.99]) { let x = -0.6; while (x < 0.58) { const w = 0.05 + rnd() * 0.03, lean = rnd() < 0.15 ? 0.25 : 0; const b = box(w, 0.32, 0.28, new THREE.MeshStandardMaterial({ color: cols[Math.floor(rnd() * cols.length)], roughness: 0.6 }), x + w / 2, y + 0.17, 0, sh); b.rotation.z = lean; x += w + 0.004 + lean * 0.1; } } }
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
    spots: { records: { eye: ledgerG.localToWorld(new THREE.Vector3(0, 0.55, 0.12)).toArray(), at: ledgerG.localToWorld(new THREE.Vector3(0, 0.02, 0)).toArray(), fov: 42, surface: { mesh: ledgerSurf, w: 560, h: 400, size: 0.4 } } },
    ledgerPos: ledgerG.position.clone(),
  };
}
