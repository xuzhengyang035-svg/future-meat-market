import { gbp } from './money.js';
// 广告海报：把“快乐的动物”放进阳光、草地和花丛里拍一张“产品照”，再排上广告字。
// 海报底部的小字说明一切：“图片仅为示意，产品由细胞培养而成，与图中动物无直接关联”。
// 同一张渲染图也裁成方形，当作告示栏上“供体”的照片。
import * as THREE from 'three';
import { makeAnimal } from './animals.js';
import { SPECIES, DONOR_PR } from './data.js';

const SERIF = '"Noto Serif SC", "Songti SC", "SimSun", serif';
const SANS = '"Inter", "Noto Sans SC", "Microsoft YaHei", sans-serif';
const MONO = '"IBM Plex Mono", Consolas, monospace';

export const POSTER_COPY = {
  beef: { head: ['Cultivated steak.', 'No slaughter.'], animal: 'cow', sky: ['#9fc7e6', '#fdf1d8'] },
  pork: { head: ['Cultivated pork.', 'Pick your fat.'], animal: 'pig', sky: ['#b9d6e8', '#fbeede'] },
  chicken: { head: ['Cultivated chicken.', 'High protein.'], animal: 'hen', sky: ['#a8d0e6', '#fff3d6'] },
  fish: { head: ['Cultivated croaker.', 'No bones.'], animal: 'fish', sky: ['#1d5f86', '#7fc4d8'] },
};

function gradientTexture(top, bottom) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, top); gr.addColorStop(1, bottom);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function meadow(scene, rand) {
  const hill = new THREE.Mesh(new THREE.SphereGeometry(8, 96, 48), new THREE.MeshStandardMaterial({ color: 0x86b35c, roughness: 1 }));
  hill.position.set(0, -8, 0); hill.receiveShadow = true;
  scene.add(hill);
  const far = new THREE.Mesh(new THREE.SphereGeometry(30, 64, 32), new THREE.MeshStandardMaterial({ color: 0xa9c98a, roughness: 1 }));
  far.position.set(-6, -29.6, -16);
  scene.add(far);
  // 草叶
  const blade = new THREE.ConeGeometry(0.006, 0.07, 3); blade.translate(0, 0.035, 0);
  const grass = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ color: 0x5f9440, roughness: 1 }), 2600);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < grass.count; i++) {
    const x = (rand() - 0.5) * 2.4, z = (rand() - 0.5) * 2.0 - 0.3;
    p.set(x, Math.sqrt(64 - x * x - z * z) - 8, z);
    e.set((rand() - 0.5) * 0.5, rand() * 6, (rand() - 0.5) * 0.5); q.setFromEuler(e);
    s.setScalar(0.6 + rand() * 0.9);
    grass.setMatrixAt(i, m.compose(p, q, s));
  }
  grass.receiveShadow = true;
  scene.add(grass);
  // 小花：白色、黄色
  const flower = new THREE.SphereGeometry(0.011, 8, 6);
  for (const col of [0xffffff, 0xf3cf4f, 0xf6b9c3]) {
    const fl = new THREE.InstancedMesh(flower, new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 }), 90);
    for (let i = 0; i < fl.count; i++) {
      const x = (rand() - 0.5) * 2.2, z = (rand() - 0.5) * 1.6 - 0.2;
      p.set(x, Math.sqrt(64 - x * x - z * z) - 8 + 0.05 + rand() * 0.03, z);
      fl.setMatrixAt(i, m.compose(p, q.identity(), s.set(1, 0.6, 1)));
    }
    scene.add(fl);
  }
}

function water(scene, rand) {
  // 光柱和气泡：一张“深海网箱”的宣传照
  const rayMat = new THREE.MeshBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(0.18 + rand() * 0.2, 4), rayMat);
    r.position.set(-0.8 + i * 0.35, 1.2, -1.2); r.rotation.z = 0.35;
    scene.add(r);
  }
  const bub = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, transmission: 0.6, transparent: true, opacity: 0.5 });
  for (let i = 0; i < 40; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.004 + rand() * 0.01, 10, 8), bub);
    b.position.set((rand() - 0.5) * 1.2, rand() * 0.9 - 0.2, (rand() - 0.5) * 0.6);
    scene.add(b);
  }
}

function photoScene(species, env) {
  let seed = 7 + species.length;
  const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const cp = POSTER_COPY[species];
  const scene = new THREE.Scene();
  scene.background = gradientTexture(cp.sky[0], cp.sky[1]);
  scene.environment = env; scene.environmentIntensity = 0.5;
  const fish = cp.animal === 'fish';
  scene.add(new THREE.HemisphereLight(fish ? 0x9fdcff : 0xfff6e0, fish ? 0x0d3550 : 0x6d8f4a, fish ? 1.1 : 1.0));
  const sun = new THREE.DirectionalLight(0xfff0d0, fish ? 1.6 : 3.2);
  sun.position.set(fish ? 0.4 : 1.4, 2.4, fish ? 0.8 : -0.6);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -0.6, right: 0.6, top: 0.6, bottom: -0.6, near: 0.5, far: 6 });
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffffff, 0.8); fill.position.set(-1, 0.6, 1.4); scene.add(fill);
  if (fish) water(scene, rand); else meadow(scene, rand);
  const a = makeAnimal(cp.animal, 'photo');
  if (fish) { a.position.set(0, 0.2, 0); a.rotation.set(0.05, -0.5, 0.12); a.scale.setScalar(1.35); }
  else if (cp.animal === 'hen') { a.rotation.y = -0.55; a.scale.setScalar(1.7); }
  else { a.rotation.y = -0.6; a.scale.setScalar(cp.animal === 'cow' ? 1.0 : 1.1); }
  scene.add(a);
  const cam = new THREE.PerspectiveCamera(30, 3 / 4, 0.05, 60);
  const look = fish ? [0, 0.22, 0] : cp.animal === 'hen' ? [0.02, 0.2, 0] : [-0.04, 0.2, 0];
  if (fish) cam.position.set(0.15, 0.32, 1.45);
  else cam.position.set(0.25, 0.18, 1.55);
  cam.lookAt(...look);
  cam.setViewOffset(600, 800, 0, -150, 600, 800);   // 动物放在画面下半部分，上面留给标题
  return { scene, cam };
}

function compose(species, img) {
  const s = SPECIES[species], cp = POSTER_COPY[species];
  const c = document.createElement('canvas'); c.width = 600; c.height = 800;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, 600, 800);
  const dark = cp.animal === 'fish';
  const ink = dark ? '#ffffff' : '#2a2b2d';
  g.fillStyle = dark ? 'rgba(255,255,255,.8)' : '#b3262d';
  g.font = `500 15px ${MONO}`; g.textAlign = 'left';
  g.fillText('FUTURE MEAT · CULTIVATED MEAT', 44, 62);
  g.fillStyle = ink; g.font = `600 56px ${SERIF}`;
  cp.head.forEach((t, i) => g.fillText(t, 40, 140 + i * 70));
  g.font = `400 19px ${SANS}`; g.fillStyle = dark ? 'rgba(255,255,255,.85)' : '#4b4844';
  g.fillText(DONOR_PR[species], 44, 140 + cp.head.length * 70 - 10);
  // 底部商品条
  g.fillStyle = 'rgba(251,248,242,.94)'; g.fillRect(0, 700, 600, 100);
  g.fillStyle = '#2a2b2d'; g.font = `500 26px ${SANS}`; g.fillText({ beef: 'Cultivated beef steak', pork: 'Cultivated pork chop', chicken: 'Cultivated chicken breast', fish: 'Cultivated yellow croaker' }[species], 40, 744);
  g.fillStyle = '#b3262d'; g.font = `500 26px ${SANS}`; g.textAlign = 'right'; g.fillText(gbp(s.price), 560, 744);
  g.textAlign = 'left'; g.fillStyle = '#8a8580'; g.font = `400 12.5px ${SANS}`;
  g.fillText('*Image for illustration. Grown from cells; not directly related to the animal shown.', 40, 776);
  return c;
}

// 用主渲染器离屏拍照（启动时、加载画面后面完成），返回海报和“供体照片”
export function renderPosters(renderer, env) {
  const out = { posters: {}, photos: {} };
  const pr = renderer.getPixelRatio(), size = renderer.getSize(new THREE.Vector2());
  const tm = renderer.toneMapping, te = renderer.toneMappingExposure;
  renderer.setPixelRatio(1);
  renderer.setSize(600, 800, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
  for (const k of Object.keys(POSTER_COPY)) {
    const { scene, cam } = photoScene(k, env);
    renderer.render(scene, cam);
    const shot = document.createElement('canvas'); shot.width = 600; shot.height = 800;
    shot.getContext('2d').drawImage(renderer.domElement, 0, 0, 600, 800);
    out.posters[k] = compose(k, shot);
    const sq = document.createElement('canvas'); sq.width = sq.height = 320;
    const cy = { chicken: 200, fish: 260 }[k] ?? 320;
    sq.getContext('2d').drawImage(shot, 60, cy, 480, 480, 0, 0, 320, 320);
    out.photos[k] = sq.toDataURL('image/jpeg', 0.85);
    scene.traverse((o) => { if (o.isMesh && o.geometry && !o.geometry.attributes.aSpot) o.geometry.dispose(); });
  }
  renderer.setPixelRatio(pr);
  renderer.setSize(size.x, size.y, false);                                    // 画布要还回屏幕尺寸，否则整间店都按这张小海报的分辨率画
  renderer.toneMapping = tm; renderer.toneMappingExposure = te;
  return out;
}

export function posterTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
