// 门店场景：零售区、玻璃墙后的生产区、包装台、通往牧场的窗。
// 目前全部用基础几何体占位，之后可以逐个换成 Blender 导出的 GLB 模型。
import * as THREE from 'three';

const mat = {
  floor: new THREE.MeshStandardMaterial({ color: 0xd3cec6, roughness: 0.22 }),
  epoxy: new THREE.MeshStandardMaterial({ color: 0xb9bcbe, roughness: 0.35 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xeeebe6, roughness: 0.9 }),
  lacquer: new THREE.MeshStandardMaterial({ color: 0xf6f4f0, roughness: 0.28 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x1b1b1c, roughness: 0.35 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xc9ccd0, metalness: 1, roughness: 0.28 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.1, depthWrite: false }),
  lightStrip: new THREE.MeshBasicMaterial({ color: 0xfff1de }),
  coolStrip: new THREE.MeshBasicMaterial({ color: 0xe6f2ff }),
};

function box(w, h, d, m, x, y, z, parent) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  o.castShadow = o.receiveShadow = true;
  parent.add(o);
  return o;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function textPlane(text, sub, w, h, opts = {}) {
  const tex = canvasTex(1024, Math.round(1024 * h / w), (g, W, H) => {
    g.fillStyle = opts.bg || 'rgba(0,0,0,0)';
    g.fillRect(0, 0, W, H);
    g.fillStyle = opts.color || '#141414';
    g.textAlign = 'center';
    g.font = `300 ${Math.round(H * 0.36)}px Inter, "Noto Sans SC", sans-serif`;
    g.fillText(text, W / 2, H * (sub ? 0.5 : 0.62));
    if (sub) {
      g.font = `400 ${Math.round(H * 0.16)}px Inter, "Noto Sans SC", sans-serif`;
      g.globalAlpha = 0.6;
      g.fillText(sub, W / 2, H * 0.82);
    }
  });
  const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
}

export const SPECIES = {
  chicken: { zh: '鸡', en: 'CHICKEN', id: 'G-0221', donor: '白羽肉鸡 · 雌性 · 2 岁' },
  beef: { zh: '牛', en: 'BEEF', id: 'B-0417', donor: '荷斯坦公牛 · 3 岁' },
  pork: { zh: '猪', en: 'PORK', id: 'P-0932', donor: '杜洛克母猪 · 4 岁' },
  fish: { zh: '大黄鱼', en: 'YELLOW CROAKER', id: 'F-1180', donor: '养殖大黄鱼 · 2 龄' },
};
export const ORDER = ['chicken', 'beef', 'pork', 'fish'];

// 产品标签：动物图形随 progress 缩小，最后只剩编号
export function drawLabel(g, W, H, key, progress, extra = '') {
  const s = SPECIES[key];
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#f7f5f1';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#141414';
  g.font = '500 30px Inter, sans-serif';
  g.textAlign = 'left';
  g.fillText('FUTURE MEAT', 36, 62);
  g.font = '300 22px Inter, "Noto Sans SC", sans-serif';
  g.fillStyle = '#5d5a57';
  g.fillText('CULTIVATED ' + s.en, 36, 96);

  const r = 92 * (1 - progress * 0.86);
  const cx = W - 140, cy = 150;
  g.globalAlpha = 1 - progress * 0.55;
  g.strokeStyle = '#b3262d';
  g.lineWidth = 2;
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#b3262d';
  g.textAlign = 'center';
  g.font = `300 ${Math.max(10, r * (s.zh.length > 1 ? 0.5 : 0.95))}px "Noto Sans SC", sans-serif`;
  g.fillText(s.zh, cx, cy + r * (s.zh.length > 1 ? 0.18 : 0.34));
  g.globalAlpha = 1;
  g.font = `400 ${18 + progress * 6}px Inter, sans-serif`;
  g.fillStyle = '#141414';
  g.fillText(s.id, cx, cy + r + 30);

  g.textAlign = 'left';
  g.font = '300 20px Inter, "Noto Sans SC", sans-serif';
  g.fillStyle = '#141414';
  g.fillText('100% SLAUGHTER-FREE', 36, H - 92);
  g.fillStyle = '#5d5a57';
  g.fillText(extra || 'Batch C-2080-117', 36, H - 58);
}

export function buildStore(scene) {
  const root = new THREE.Group();
  scene.add(root);

  // 地面、天花、墙
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 12), mat.floor);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 4); floor.receiveShadow = true;
  root.add(floor);
  const prodFloor = new THREE.Mesh(new THREE.PlaneGeometry(18, 8), mat.epoxy);
  prodFloor.rotation.x = -Math.PI / 2; prodFloor.position.set(0, 0, -6); prodFloor.receiveShadow = true;
  root.add(prodFloor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(18, 20), mat.wall);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 4.2, 0);
  root.add(ceil);
  box(18, 4.2, 0.2, mat.wall, 0, 2.1, -10, root);
  box(0.2, 4.2, 20, mat.wall, 9, 2.1, 0, root);
  // 左墙：中间留一扇窗（z -2…2，y 0.6…3.0）
  box(0.2, 4.2, 8, mat.wall, -9, 2.1, -6, root);
  box(0.2, 4.2, 8, mat.wall, -9, 2.1, 6, root);
  box(0.2, 0.6, 4, mat.wall, -9, 0.3, 0, root);
  box(0.2, 1.2, 4, mat.wall, -9, 3.6, 0, root);

  // 天花灯带
  for (const z of [7, 4, 1, -1]) box(10, 0.04, 0.12, mat.lightStrip, 0, 4.17, z, root).castShadow = false;
  for (const z of [-4, -7]) box(14, 0.04, 0.16, mat.coolStrip, 0, 4.17, z, root).castShadow = false;

  // 玻璃隔墙
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(18, 4.2), mat.glass);
  pane.position.set(0, 2.1, -2);
  root.add(pane);
  for (let x = -9; x <= 9; x += 3) box(0.05, 4.2, 0.06, mat.dark, x, 2.1, -2, root);
  box(18, 0.06, 0.08, mat.dark, 0, 0.03, -2, root);
  const slogan = textPlane('GROWN, NOT RAISED.', '透明生产 · 全程可见', 4.2, 0.7, { color: '#141414' });
  slogan.position.set(0, 3.45, -1.98);
  root.add(slogan);

  // 品牌墙
  const sign = textPlane('FUTURE MEAT MARKET', 'Design Your Perfect Protein.', 5, 0.9);
  sign.rotation.y = -Math.PI / 2; sign.position.set(8.88, 2.9, 2);
  root.add(sign);

  // 01 四个展柜
  const fridges = {};
  ORDER.forEach((key, i) => {
    const x = -4.5 + i * 3;
    const g = new THREE.Group();
    g.position.set(x, 0, 4);
    root.add(g);
    box(1.8, 0.9, 0.9, mat.lacquer, 0, 0.45, 0, g);
    box(1.8, 0.04, 0.9, mat.dark, 0, 0.92, 0, g);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 0.9), mat.glass);
    glass.position.y = 1.29;
    g.add(glass);
    const strip = box(1.7, 0.02, 0.04, new THREE.MeshBasicMaterial({ color: 0xfff6ea }), 0, 1.62, 0.38, g);
    strip.castShadow = false;
    // 竖立的产品包装
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 320;
    drawLabel(canvas.getContext('2d'), 512, 320, key, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.4, 0.05),
      [mat.lacquer, mat.lacquer, mat.lacquer, mat.lacquer, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }), mat.lacquer]);
    pack.position.set(0, 1.16, 0.05); pack.rotation.x = -0.18;
    pack.castShadow = true;
    g.add(pack);
    const name = textPlane(SPECIES[key].zh, SPECIES[key].en, 1.2, 0.36);
    name.position.set(0, 0.6, 0.452);
    g.add(name);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.02), new THREE.MeshBasicMaterial({ color: 0xb3262d, transparent: true, opacity: 0 }));
    halo.position.set(0, 0.06, 0.46);
    g.add(halo);
    fridges[key] = { group: g, halo };
  });

  // 02 中央展台
  const pedestal = new THREE.Group();
  root.add(pedestal);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 1.0, 64), mat.lacquer);
  col.position.y = 0.5; col.castShadow = col.receiveShadow = true;
  pedestal.add(col);
  const turntable = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.03, 64), mat.dark);
  turntable.position.y = 1.015; turntable.receiveShadow = true;
  pedestal.add(turntable);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.006, 8, 128), new THREE.MeshBasicMaterial({ color: 0xffe9d6 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 1.0;
  pedestal.add(ring);

  // 03 生物反应器
  const reactors = [];
  const reactorScreens = [];
  [-3, 0, 3].forEach((x, i) => {
    const g = new THREE.Group();
    g.position.set(x, 0, -5.5);
    root.add(g);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.9, 48), mat.steel);
    base.position.y = 0.45; g.add(base);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.6, 48), mat.steel);
    top.position.y = 2.4; g.add(top);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.72, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat.steel);
    dome.position.y = 2.7; g.add(dome);
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 1.2, 48),
      new THREE.MeshStandardMaterial({ color: 0xe8a0a0, emissive: 0xc0424c, emissiveIntensity: 0.25, transparent: true, opacity: 0.35, roughness: 0.2, depthWrite: false }));
    liquid.position.y = 1.5; g.add(liquid);
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 1.2, 48, 1, true), mat.glass);
    shell.position.y = 1.5; g.add(shell);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 16), mat.steel);
    pipe.position.set(0.3, 3.5, 0); g.add(pipe);
    // 控制屏
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 320;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.4), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    screen.position.set(1.05, 1.5, 0.3); screen.rotation.y = -0.35;
    g.add(screen);
    box(0.08, 1.3, 0.08, mat.dark, 1.05, 0.65, 0.3, g);
    reactors.push(g);
    reactorScreens.push({ canvas, tex, name: 'BR-0' + (i + 1) });
  });
  box(3, 0.9, 0.8, mat.lacquer, -6.5, 0.45, -4.2, root);
  box(3, 0.04, 0.8, mat.dark, -6.5, 0.92, -4.2, root);

  // 04 包装台
  const counter = new THREE.Group();
  counter.position.set(5.2, 0, 0.2);
  root.add(counter);
  box(2.6, 0.95, 0.8, mat.lacquer, 0, 0.475, 0, counter);
  box(2.6, 0.04, 0.8, mat.dark, 0, 0.97, 0, counter);
  box(0.4, 0.3, 0.35, mat.lacquer, 0.95, 1.14, -0.1, counter);

  // 05 窗：窗外是供体动物（替换为真实照片：assets/donor_<物种>.jpg）
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.6), new THREE.MeshBasicMaterial({ toneMapped: false }));
  outside.rotation.y = Math.PI / 2; outside.position.set(-10.6, 1.8, 0);
  root.add(outside);
  const frostTex = canvasTex(1024, 600, (g, W, H) => {
    g.fillStyle = 'rgba(245,244,240,1)';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#141414';
    g.textAlign = 'center';
    g.font = '300 58px Inter, sans-serif';
    g.fillText('ETHICALLY SOURCED', W / 2, H / 2 - 10);
    g.font = '400 26px Inter, "Noto Sans SC", sans-serif';
    g.globalAlpha = 0.55;
    g.fillText('所有细胞均来自已授权供体 · 零屠宰', W / 2, H / 2 + 44);
  });
  const frost = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.4),
    new THREE.MeshStandardMaterial({ map: frostTex, transparent: true, opacity: 0.94, roughness: 1 }));
  frost.rotation.y = Math.PI / 2; frost.position.set(-8.88, 1.8, 0);
  root.add(frost);
  box(0.12, 0.05, 4.1, mat.dark, -8.9, 0.6, 0, root);
  box(0.12, 0.05, 4.1, mat.dark, -8.9, 3.0, 0, root);

  return { fridges, pedestal, reactors, reactorScreens, counter, outside, frost };
}

export function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xfff8f0, 0x9a948c, 0.3));
  const spot = (x, y, z, tx, ty, tz, intensity, color = 0xffeedd, shadow = false, angle = 0.45) => {
    const s = new THREE.SpotLight(color, intensity, 14, angle, 0.6, 1.4);
    s.position.set(x, y, z);
    s.target.position.set(tx, ty, tz);
    s.castShadow = shadow;
    if (shadow) { s.shadow.mapSize.set(2048, 2048); s.shadow.bias = -0.0004; s.shadow.radius = 6; }
    scene.add(s, s.target);
    return s;
  };
  spot(0, 4.1, 0.6, 0, 1, 0, 55, 0xfff1e2, true, 0.32);       // 展台主光
  spot(-1.2, 4.1, 1.6, 0, 1, 0, 12, 0xffe2d0, false, 0.3);     // 展台补光
  for (let i = 0; i < 4; i++) spot(-4.5 + i * 3, 4.1, 5, -4.5 + i * 3, 1, 4, 22, 0xfff1e2, i === 1, 0.42);
  spot(5.2, 4.1, 1, 5.2, 1, 0.2, 30, 0xfff1e2, true, 0.4);
  for (const x of [-3, 0, 3]) spot(x, 4.1, -4.5, x, 1.5, -5.5, 30, 0xe4efff, false, 0.5);
  spot(-6, 3.5, 0, -9, 1.8, 0, 10, 0xfff6ee, false, 0.6);
}
