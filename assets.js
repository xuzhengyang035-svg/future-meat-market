// 真实素材：Poly Haven 上的 CC0 照片扫描贴图、模型和 HDRI（都在 assets/ph 下，1K 分辨率）
//   pbr(name, repeatX, repeatY, opts)  → 一个 MeshStandardMaterial（颜色、法线、粗糙度、AO 四张图）
//   await preloadModels(names)         → 先把模型都加载好（在加载画面期间）
//   model(name, opts)                  → 复制一份模型；opts 里可以给位置、旋转、缩放，以及“随手放歪一点”的随机量
//   await envFrom(name, renderer)      → HDRI 做环境光 / 反射
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { deferImages } from './gfx.js';

const BASE = 'assets/ph/';
const texLoader = new THREE.TextureLoader();
const texCache = {};
function tex(path, srgb, rx, ry, rot = 0) {
  const key = path + rx + 'x' + ry + 'r' + rot;
  if (texCache[key]) return texCache[key];
  const t = texLoader.load(path);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  if (rot) { t.center.set(0.5, 0.5); t.rotation = rot; }
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return (texCache[key] = t);
}

// 贴图：repeat 用“米”来算——size 是这张贴图在现实里覆盖多大（Poly Haven 的 1K 贴图一般是 1–2 米见方）
// manifest.json 记录每套贴图实际有哪几张（ambientCG 的有些没有 AO，贴花有透明度图）
let MAN = { tex: {}, decal: {} };
export async function loadManifest() { try { MAN = await (await fetch(BASE + 'manifest.json')).json(); } catch (e) { console.warn('manifest', e); } }
export function pbr(name, w = 1, h = 1, { size = 1.5, color, roughness = 1, metalness = 0, normalScale = 1, envMapIntensity = 1, ao = true, rotate = 0, variant = '', ...rest } = {}) {
  const rx = (rotate ? h : w) / size, ry = (rotate ? w : h) / size, p = `${BASE}tex/${name}/`;
  const has = MAN.tex[name] || { diff: 'diff.jpg', nor: 'nor.jpg', rough: 'rough.jpg', ao: 'ao.jpg' };
  const T = (k, srgb) => (has[k] ? tex(p + has[k], srgb, rx, ry, rotate) : null);
  const m = new THREE.MeshStandardMaterial({
    map: T(has['diff' + variant] ? 'diff' + variant : 'diff', true), normalMap: T('nor', false), roughnessMap: T('rough', false),
    roughness, metalness, envMapIntensity, ...rest,
  });
  if (has.metal && metalness > 0) m.metalnessMap = T('metal', false);
  if (has.opacity) { m.alphaMap = T('opacity', false); m.alphaTest = 0.4; m.side = THREE.DoubleSide; }
  if (ao && has.ao) { m.aoMap = T('ao', false); m.aoMapIntensity = 1; }
  m.normalScale.set(normalScale, normalScale);
  if (color !== undefined) m.color.set(color);
  return m;
}
// 给几何体补一套 uv1（aoMap 用）
export function withAO(geo) { if (geo.attributes.uv && !geo.attributes.uv1) geo.setAttribute('uv1', geo.attributes.uv); return geo; }

// ------------------------------------------------------------------ 贴花：水渍、流痕、指纹、擦痕、杯印、胶带……（ambientCG / ShareTextures，CC0）
// 一张带透明度的平面，贴在墙、地、桌面前面几毫米；color 给没有颜色图的贴花上色（或者给有颜色图的压暗、偏色）
const decalCache = {};
export function decalMat(name, { color, opacity = 1, roughness = 1, normalScale = 1, flipX = false } = {}) {
  const key = [name, color, opacity, roughness, normalScale, flipX].join('|');
  if (decalCache[key]) return decalCache[key];
  const has = MAN.decal[name] || MAN.tex[name] || {}, dir = MAN.decal[name] ? 'decal' : 'tex', p = `${BASE}${dir}/${name}/`;
  const L = (k, srgb) => { if (!has[k]) return null; const t = texLoader.load(p + has[k]); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (flipX) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; } return t; };
  const m = new THREE.MeshStandardMaterial({
    map: L('diff', true), alphaMap: L('opacity', false), normalMap: L('nor', false), roughnessMap: L('rough', false),
    roughness, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  });
  m.normalScale.set(normalScale, normalScale);
  if (color !== undefined) m.color.set(color);
  return (decalCache[key] = m);
}
// decal('Leaking004', parent, { pos, rot: [x,y,z], w, h, ...材质参数 })
export function decal(name, parent, { pos = [0, 0, 0], rot = [0, 0, 0], w = 1, h = 1, order = 0, ...o } = {}) {
  const d = new THREE.Mesh(new THREE.PlaneGeometry(w, h), decalMat(name, o));
  d.position.set(...pos); d.rotation.set(...rot); d.renderOrder = 2 + order;
  parent?.add(d);
  return d;
}
export const hasDecal = (n) => !!(MAN.decal[n] || MAN.tex[n]);

const gltf = deferImages(new GLTFLoader());
// 透射玻璃会让整个场景多画一遍：小道具上的玻璃改成普通半透明
function plainGlass(m) {
  if (!m.transmission) return;
  m.transmission = 0; m.transmissionMap = null;
  if (/glass/i.test(m.name)) { m.transparent = true; m.opacity = 0.28; m.depthWrite = false; }
}
const models = {};
export async function preloadModels(names, onProgress) {
  names = names.filter((n) => !models[n]);
  let done = 0;
  await Promise.all(names.map((n) => new Promise((res) => {
    const get = (tries) => gltf.load(`${BASE}models/${n}/${n}.gltf`, (g) => {
      g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; if (o.material) { o.material.envMapIntensity = 1; plainGlass(o.material); } } });
      models[n] = g.scene; done++; onProgress?.(done / names.length); res();
    }, undefined, (e) => {
      if (tries < 2) { setTimeout(() => get(tries + 1), 700); return; }        // 网一抖就会少一个模型：再试两次
      console.warn('model', n, e); done++; res();
    });
    get(0);
  })));
}
// 复制一个模型并摆好；jitter 让它“随手放歪一点”（转角、平移、微微倾斜）
let js = 1234;
const jr = () => (js = (js * 16807) % 2147483647) / 2147483647 - 0.5;
// sit：模型的原点不在底面（比如打火机原点在中心）时，把它抬到正好落在 pos 的高度上，不陷进台面
const minY = {};
export function model(name, { pos = [0, 0, 0], rot = 0, scale = 1, tilt = 0, jitter = 0, parent, sit = false } = {}) {
  const src = models[name];
  if (!src) console.warn('Model not preloaded:', name);
  const o = src ? src.clone(true) : new THREE.Group();
  if (sit && src && minY[name] === undefined) minY[name] = new THREE.Box3().setFromObject(src).min.y;
  o.position.set(pos[0] + jr() * jitter * 0.3, pos[1] - (sit && src ? minY[name] * scale : 0), pos[2] + jr() * jitter * 0.3);
  o.rotation.set(jr() * tilt, rot + jr() * jitter, jr() * tilt);
  o.scale.setScalar(scale);
  o.userData.model = name;                                                       // 查穿模时用来认出这是哪个模型
  parent?.add(o);
  return o;
}
export const hasModel = (n) => !!models[n];

const rgbe = new RGBELoader();
const envCache = {};
export function envFrom(name, renderer) {
  if (envCache[name]) return envCache[name];
  return (envCache[name] = new Promise((res) => rgbe.load(`${BASE}hdri/${name}.hdr`, (t) => {
    t.mapping = THREE.EquirectangularReflectionMapping;
    const pm = new THREE.PMREMGenerator(renderer);
    const env = pm.fromEquirectangular(t).texture;
    t.dispose(); pm.dispose();
    res(env);
  }, undefined, () => res(null))));
}

// 每个房间用到的模型：走进哪个房间才下载哪些（新摆一种模型时，名字也要加到这里）
export const SCENE_MODELS = {
  room: ['wooden_picnic_table', 'hanging_industrial_lamp', 'CashRegister_01', 'potted_plant_01', 'potted_plant_02', 'hanging_picture_frame_01', 'hanging_picture_frame_02', 'WetFloorSign_01', 'plastic_monobloc_chair_01', 'mounted_fluorescent_lights', 'korean_fire_extinguisher_01', 'wall_clock', 'trashbag', 'metal_stool_01', 'plastic_crate_01', 'plastic_broom', 'standing_chalkboard_01', 'pot_enamel_01', 'metal_jug', 'bleach_bottle', 'multi_cleaner_bottle', 'all_purpose_cleaner', 'ceiling_fan', 'russian_food_cans_01', 'long_life_food', 'desk_lamp_arm_01', 'binder_notebook', 'cigarette_pack', 'vintage_lighter', 'wooden_bowl_01', 'dustpan', 'vintage_electric_kettle', 'garden_gloves_01', 'plastic_crate_02', 'alarm_clock_01', 'rubber_boots', 'pachira_aquatica_01', 'calathea_orbifolia_01'],
  fridge: ['potted_plant_02', 'plastic_crate_01', 'bleach_bottle', 'all_purpose_cleaner', 'binder_notebook', 'garden_gloves_01', 'plastic_crate_02'],
  street: ['hanging_industrial_lamp', 'potted_plant_02', 'potted_plant_01', 'potted_plant_04', 'fern_02', 'calathea_orbifolia_01', 'pachira_aquatica_01', 'anthurium_botany_01', 'plastic_monobloc_chair_01', 'trashbag', 'cardboard_box_01', 'industrial_storage_cart', 'plastic_crate_01', 'wooden_crate_02', 'hand_truck', 'outdoor_table_chair_set_01', 'planter_box_01', 'street_lamp_02', 'wooden_crate_01', 'standing_chalkboard_01', 'exterior_aircon_unit', 'metal_trash_can', 'security_camera_01', 'power_box_01', 'industrial_wall_lamp', 'garden_hose_wall_mounted_01'],
  lab: ['WetFloorSign_01', 'industrial_microscope', 'chemistry_set', 'clipboard', 'metal_stool_01', 'standing_chalkboard_01', 'desk_lamp_arm_01', 'medical_box', 'binder_notebook'],
  warehouse: ['WetFloorSign_01', 'plastic_crate_01', 'plastic_crate_03', 'wooden_crate_02', 'Barrel_01', 'barrel_03', 'hand_truck', 'metal_jerrycan', 'portable_generator', 'industrial_pastic_container', 'plastic_broom', 'caged_hanging_light', 'old_tyre', 'security_camera_01', 'power_box_01', 'metal_toolbox', 'can_rusted', 'oil_tin', 'plastic_jerrycan', 'spray_paint_bottles', 'dustpan', 'tool_cart', 'worn_metal_rack', 'wooden_stool_01', 'vintage_electric_kettle', 'garden_gloves_01', 'plastic_crate_02', 'lubricant_spray', 'drawer_cabinet', 'vintage_radio_transceiver', 'propane_tank', 'compost_bags', 'metal_jerrycan_green'],
};
// 模型的包围盒尺寸（调试、摆放用）
export function modelSize(name) { const b = new THREE.Box3().setFromObject(models[name] || new THREE.Group()); return b.isEmpty() ? null : { min: b.min.toArray(), max: b.max.toArray() }; }

// ------------------------------------------------------------------ 自己生成的贴图（assets/user）：带透明通道的直接用；白底的读进来以后把白底去掉
//   mode 'stain'：污渍类（流痕、血迹）——按“离白色多远”算透明度，再把颜色从白底里还原出来，半透明的边缘也自然
//   mode 'cut'  ：有实体的纸片（撕剩的海报边）——接近纯白的地方透明，其余不透明，边缘留一点羽化
//   mode 'none' ：整张都要（小票）
const userCache = {};
export function userTex(file, mode = 'stain', maxSize = 1024) {
  const key = file + mode;
  if (userCache[key]) return userCache[key];
  const t = new THREE.Texture(); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const im = new Image();
  im.onload = () => {
    const s = Math.min(1, maxSize / Math.max(im.width, im.height)), W = Math.round(im.width * s), H = Math.round(im.height * s);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.drawImage(im, 0, 0, W, H);
    const d0 = g.getImageData(0, 0, W, H).data; let clear = 0; for (let i = 3; i < d0.length; i += 4 * 97) if (d0[i] < 250) clear++;
    const hasAlpha = clear > d0.length / (4 * 97) * 0.01;                         // 图本身已经带透明通道（你给的几张就是）→ 原样用
    if (mode !== 'none' && !hasAlpha) {
      const d = g.getImageData(0, 0, W, H), p = d.data;
      for (let i = 0; i < p.length; i += 4) {
        const r = p[i], gg = p[i + 1], b = p[i + 2], mn = Math.min(r, gg, b);
        let a;
        if (mode === 'cut') a = Math.min(1, Math.max(0, (247 - mn) / 14));
        else {
          a = Math.min(1, Math.max(0, (1 - mn / 255) * 1.25 - 0.03));
          if (a > 0.004) for (let k = 0; k < 3; k++) p[i + k] = Math.max(0, Math.min(255, (p[i + k] - 255 * (1 - a)) / a));   // 去掉白底后的真实颜色
        }
        p[i + 3] = Math.round(a * 255);
      }
      g.putImageData(d, 0, 0);
    }
    t.image = c; t.needsUpdate = true;
  };
  im.src = 'assets/user/' + file;
  return (userCache[key] = t);
}
export function userDecal(file, parent, { pos = [0, 0, 0], rot = [0, 0, 0], w = 1, h = 1, mode = 'stain', color, opacity = 1, roughness = 0.9, order = 0 } = {}) {
  const m = new THREE.MeshStandardMaterial({ map: userTex(file, mode), transparent: true, opacity, roughness, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, side: THREE.DoubleSide });
  if (color !== undefined) m.color.set(color);
  const d = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  d.position.set(...pos); d.rotation.set(...rot); d.renderOrder = 3 + order;
  parent?.add(d);
  return d;
}

// ------------------------------------------------------------------ 你给的整张可平铺材质（assets/user）：地砖、旧不锈钢、带血亚麻布、深色木头、拖把布条、黄色塑料
// 每次调用新建一张贴图（可以有自己的重复次数、偏移），但像素只有一份：共用同一个 Source，显存里也只上传一次（最长边 1024）
const userImgs = {};
function shareUserImage(file, t) {
  let e = userImgs[file];
  if (e) {
    t.source = e.source;
    if (e.done) t.version = 1; else e.waiting.push(t);
    return;
  }
  e = userImgs[file] = { source: t.source, waiting: [t], done: false };
  const im = new Image();
  im.onload = () => {
    const k = Math.min(1, 1024 / Math.max(im.width, im.height)), c = document.createElement('canvas');
    c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    e.source.data = c; e.done = true;
    for (const x of e.waiting) x.needsUpdate = true;
    e.waiting = [];
  };
  im.src = 'assets/user/' + file;
}
export function userMap(file, rx = 1, ry = 1, { srgb = true, offset = [0, 0], rotation = 0 } = {}) {
  const t = new THREE.Texture(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.offset.set(...offset);
  if (rotation) { t.center.set(0.5, 0.5); t.rotation = rotation; }
  t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  shareUserImage(file, t);
  return t;
}
// size：这张图在现实里覆盖多少米；bump：用同一张图当凹凸（砖缝、划痕会有一点立体感）
export function userMat(file, w = 1, h = 1, { size = 1, bump = 0, offset, rotation, physical = false, ...rest } = {}) {
  const map = userMap(file, w / size, h / size, { offset, rotation });
  const m = new (physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial)({ map, ...rest });
  if (bump) { m.bumpMap = map; m.bumpScale = bump; }
  return m;
}

// ------------------------------------------------------------------ 刷在铁皮上的大字（门上的号码）：油漆磨掉的地方用真实扫描的瑕疵图（SurfaceImperfections）去擦，不是随机画的小点
export function paintedText(txt, { W = 512, H = 360, size = 300, color = 'rgba(150,40,30,.9)', y = 0.84, mask = 'SurfaceImperfections011', font = '"Inter", "Noto Sans SC", sans-serif', weight = 800, amount = 1 } = {}) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = color; g.font = `${weight} ${size}px ${font}`; g.textAlign = 'center'; g.fillText(txt, W / 2, H * y);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const im = new Image();
  im.onload = () => { const m = document.createElement('canvas'); m.width = W; m.height = H; const mg = m.getContext('2d'); mg.drawImage(im, 0, 0, W, H);
    const d = mg.getImageData(0, 0, W, H), p = d.data; for (let i = 0; i < p.length; i += 4) p[i + 3] = Math.max(0, Math.min(255, (p[i] - 80) * 2.2 * amount));
    mg.putImageData(d, 0, 0); g.globalCompositeOperation = 'destination-out'; g.drawImage(m, 0, 0); g.globalCompositeOperation = 'source-over'; t.needsUpdate = true; };
  im.src = BASE + 'decal/' + mask + (/^decal_/.test(mask) ? '/opacity.png' : '/opacity.jpg');
  return t;
}
