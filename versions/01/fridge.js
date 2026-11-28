// 智能鲜肉柜 (左边玻璃门放商品，右边是触摸屏）和旁边普通的饮料柜.
// Shop场景和冷柜特写场景共用同一个模型.
import * as THREE from 'three';
import { SPECIES } from './data.js';
import { meatGeometry, meatMaterial, meatHeight } from './meat.js';
import { canvasTexture, drawAttract, shelfLabel, signTexture, tileTexture } from './textures.js';

const M = {
  graphite: new THREE.MeshStandardMaterial({ color: 0x2b2d30, roughness: 0.45, metalness: 0.4 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.5 }),
  inner: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.75 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, transparent: true, opacity: 0.12, depthWrite: false }),
  shelf: new THREE.MeshPhysicalMaterial({ color: 0xdfeaea, roughness: 0.1, transparent: true, opacity: 0.35, depthWrite: false }),
  tray: new THREE.MeshStandardMaterial({ color: 0x1a1a1b, roughness: 0.55 }),
  film: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.08, transparent: true, opacity: 0.08, depthWrite: false }),
  led: new THREE.MeshBasicMaterial({ color: 0xffffff }),
};

function box(w, h, d, m, x, y, z, parent) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  o.castShadow = o.receiveShadow = true;
  parent.add(o);
  return o;
}

// 一盒真空包装的肉
export function makePack(species, kind) {
  const g = new THREE.Group();
  box(0.22, 0.03, 0.16, M.tray, 0, 0.015, 0, g);
  const mat = meatMaterial(species);
  const meat = new THREE.Mesh(meatGeometry(kind), mat);
  meat.scale.setScalar(0.38);
  meat.position.y = 0.03 + meatHeight(kind) * 0.38;
  meat.castShadow = true;
  g.add(meat);
  const film = new THREE.Mesh(new THREE.BoxGeometry(0.225, 0.07, 0.165), M.film);
  film.position.y = 0.04;
  g.add(film);
  g.userData = { meat, mat };
  return g;
}

export const SHELF_ORDER = [['beef', 1.58], ['chicken', 1.18], ['pork', 0.78], ['fish', 0.38]];

export function buildSmartFridge() {
  const g = new THREE.Group();
  const W = 1.32, H = 2.05, D = 0.75, DW = 0.82;
  const xL = -W / 2, xC = xL + DW, doorCX = xL + DW / 2, colCX = xC + (W - DW) / 2;
  const front = D / 2;

  box(W, H, 0.03, M.graphite, 0, H / 2, -D / 2, g);
  box(0.03, H, D, M.graphite, -W / 2, H / 2, 0, g);
  box(0.03, H, D, M.graphite, W / 2, H / 2, 0, g);
  box(W, 0.16, D, M.graphite, 0, H - 0.08, 0, g);
  box(W, 0.12, D, M.graphite, 0, 0.06, 0, g);
  box(0.03, H, D, M.graphite, xC, H / 2, 0, g);
  box(W - DW, H - 0.28, 0.02, M.graphite, colCX, H / 2, front - 0.01, g);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(DW - 0.04, H - 0.3), M.inner);
  back.position.set(doorCX, H / 2, -D / 2 + 0.02);
  g.add(back);
  box(DW - 0.06, 0.01, 0.02, M.led, doorCX, H - 0.17, front - 0.05, g).castShadow = false;

  const shelves = {};
  for (const [key, y] of SHELF_ORDER) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(DW - 0.06, 0.012, D - 0.1), M.shelf);
    slab.position.set(doorCX, y, 0);
    g.add(slab);
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.056), new THREE.MeshBasicMaterial({ map: shelfLabel(key), toneMapped: false }));
    tag.position.set(doorCX, y - 0.03, front - 0.04);
    g.add(tag);
    const kind = key === 'fish' ? 'fillet' : key;
    const packs = [-0.26, 0, 0.26].map((dx, i) => {
      const p = makePack(key, kind);
      p.position.set(doorCX + dx, y + 0.008, 0.04 - Math.abs(dx) * 0.2);
      p.rotation.set(0.38, (i - 1) * -0.06, 0);
      g.add(p);
      return p;
    });
    shelves[key] = { y, packs, hero: packs[1], anchor: new THREE.Vector3(doorCX, y + 0.1, 0.1) };
  }

  // 玻璃门 (铰链在左边）
  const door = new THREE.Group();
  door.position.set(xL + 0.015, 0, front + 0.012);
  g.add(door);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(DW - 0.02, H - 0.3), M.glass);
  pane.position.set(DW / 2, H / 2, 0);
  door.add(pane);
  box(DW - 0.01, 0.03, 0.025, M.graphite, DW / 2, 0.135, 0, door);
  box(DW - 0.01, 0.03, 0.025, M.graphite, DW / 2, H - 0.165, 0, door);
  box(0.03, H - 0.3, 0.025, M.graphite, 0.015, H / 2, 0, door);
  box(0.03, H - 0.3, 0.025, M.graphite, DW - 0.025, H / 2, 0, door);
  box(0.018, 0.7, 0.03, M.graphite, DW - 0.07, 1.15, 0.035, door);

  // 触摸屏与取货口
  const attract = canvasTexture(420, 740, drawAttract);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.74), new THREE.MeshBasicMaterial({ map: attract, toneMapped: false }));
  screen.position.set(colCX, 1.28, front + 0.002);
  g.add(screen);
  box(0.16, 0.1, 0.03, M.white, colCX, 0.78, front, g);
  box(0.36, 0.12, 0.03, new THREE.MeshStandardMaterial({ color: 0x111112, roughness: 0.3 }), colCX, 0.45, front, g);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(W, 0.14),
    new THREE.MeshBasicMaterial({ map: signTexture('FUTURE MEAT · GROWN TO ORDER', null, { bg: '#f4f2ee', h: 110 }), toneMapped: false }));
  sign.position.set(0, H - 0.08, front + 0.002);
  g.add(sign);

  const light = new THREE.PointLight(0xffffff, 1.4, 1.6, 2);
  light.position.set(doorCX, 1.4, 0.15);
  g.add(light);

  return { group: g, door, screen, shelves, size: { W, H, D } };
}

export function buildDrinksFridge(seed = 1) {
  const g = new THREE.Group();
  const W = 1.1, H = 2.05, D = 0.72;
  box(W, H, 0.03, M.graphite, 0, H / 2, -D / 2, g);
  box(0.03, H, D, M.graphite, -W / 2, H / 2, 0, g);
  box(0.03, H, D, M.graphite, W / 2, H / 2, 0, g);
  box(W, 0.16, D, M.graphite, 0, H - 0.08, 0, g);
  box(W, 0.12, D, M.graphite, 0, 0.06, 0, g);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.04, H - 0.3), M.inner);
  back.position.set(0, H / 2, -D / 2 + 0.02);
  g.add(back);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.04, H - 0.3), M.glass);
  pane.position.set(0, H / 2, D / 2 + 0.01);
  g.add(pane);
  const cols = [0xb8473a, 0x3d6a9a, 0xd9b75a, 0x4f8a62, 0xeeeeea, 0x6f4a86, 0xc98546];
  const rows = [0.3, 0.62, 0.94, 1.26, 1.58];
  const per = 9;
  const bottle = new THREE.CylinderGeometry(0.032, 0.035, 0.24, 12);
  const inst = new THREE.InstancedMesh(bottle, new THREE.MeshStandardMaterial({ roughness: 0.35 }), rows.length * per * 2);
  const m4 = new THREE.Matrix4();
  const c = new THREE.Color();
  let n = 0;
  let r = seed;
  const rand = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  rows.forEach((y, ri) => {
    box(W - 0.06, 0.01, D - 0.1, M.shelf, 0, y - 0.01, 0, g);
    const col = cols[Math.floor(rand() * cols.length)];
    for (let k = 0; k < per; k++) for (let d = 0; d < 2; d++) {
      m4.makeTranslation(-W / 2 + 0.08 + k * 0.115, y + 0.12, 0.15 - d * 0.18);
      inst.setMatrixAt(n, m4);
      inst.setColorAt(n, c.set(rand() < 0.75 ? col : cols[Math.floor(rand() * cols.length)]));
      n++;
    }
  });
  g.add(inst);
  return g;
}

// 冷柜特写场景
export function createFridgeScene(env) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd9dcdc);
  scene.environment = env;
  scene.environmentIntensity = 0.5;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), new THREE.MeshStandardMaterial({ map: tileTexture([4, 3.2]), roughness: 0.3 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  scene.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.2), new THREE.MeshStandardMaterial({ color: 0xeceae5, roughness: 0.9 }));
  wall.position.set(0, 1.6, -0.45);
  scene.add(wall);
  const fridge = buildSmartFridge();
  scene.add(fridge.group);
  // 两侧是灯箱广告：“快乐的动物”，跟着所选商品换
  const posters = [-1.3, 1.3].map((x) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.06, 1.44, 0.06), M.graphite);
    frame.position.set(x, 1.22, -0.4); scene.add(frame);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 1.28), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
    p.position.set(x, 1.22, -0.365); scene.add(p);
    return p;
  });

  scene.add(new THREE.HemisphereLight(0xffffff, 0xa8a49e, 0.7));
  const key = new THREE.SpotLight(0xfff3e6, 40, 8, 0.6, 0.7, 1.5);
  key.position.set(0.4, 3.1, 1.8); key.target.position.set(0, 1, 0);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0005;
  scene.add(key, key.target);
  return { scene, fridge, posters };
}
