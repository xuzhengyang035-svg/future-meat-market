import { gbp } from './money.js';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createRoom } from './room.js';
import { createLab } from './lab.js';
import { packFit } from './fridge.js';
import { createProductScreen } from './fridge-screen.js';
import { createNav } from './nav.js';
import { batchStatic } from './batch.js';
import { focusLight } from './atmosphere.js';
import { createStreet } from './street.js';
import { createWarehouse } from './warehouse.js';
import './lightcull.js';
import { createInspector } from './inspect.js';
import { playPromo } from './promo.js';
import { createPost, resizePost, postTarget, pixelRatio, quality } from './post.js';
import { loadTexturesOf, initAssets, createPreparer, breathe } from './gfx.js';
import { preloadModels, SCENE_MODELS, envFrom, loadManifest } from './assets.js';
import { renderPosters, posterTexture } from './posters.js';
import { paperHTML } from './papers.js';
import { ROOM_NAV } from './data.js';
import { SPECIES, ORDER, OPTIONS, GROWTH, HOTSPOTS, MARQUEE, DONOR_PR, DONOR_STEPS, AD, CALLOUTS, CERAMIC_BASE, BRAND_FILM, BRAND_FINE,
  STREET_MARQUEE, STREET_HOTSPOTS, WH_MARQUEE, WH_HOTSPOTS, WH_NAV, LAB_NAV,
  LAB_MARQUEE, LAB_HOTSPOTS, LAB_FOCUS, CELLBANK_ROWS, LAB_DEEP } from './data.js';
import { meatGeometry, meatHeight, kindFor } from './meat.js';
import { makeBatch, stepBatch, readout, curve, sci } from './growth.js';

// ------------------------------------------------------------------ 渲染
const canvas = document.getElementById('c');
const FX = new URLSearchParams(location.search).get('fx') !== '0';          // ?fx=0 关掉后期，用来对比或在低配电脑上提速
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !FX, powerPreference: 'high-performance' });   // 抗锯齿在后期的缓冲里做，画布自己不用再来一份
const store = { get(k) { try { return sessionStorage.getItem(k); } catch { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* 隐私模式 */ } } };
if (store.get('lowgfx')) quality.scale = 0.6;
renderer.setPixelRatio(pixelRatio());
// 显存不够时浏览器会直接收回 WebGL（画面一片白）：盖上加载画面，用省内存的档位重开一次
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  const box = document.getElementById('loading'), again = !store.get('lowgfx');
  box.classList.remove('gone');
  box.querySelector('.lt').textContent = again ? 'Out of graphics memory · reopening in low-memory mode' : 'Out of graphics memory · close other 3D pages and reload';
  if (again) { store.set('lowgfx', '1'); setTimeout(() => location.reload(), 1500); }
});
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.78;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

// 加载进度：按真实的阶段推进（字体 → 模型 → 灯光 → 搭场景 → 预编译着色器 → 第一帧画出来），每一步之后让浏览器喘口气、把进度画出来
const LD = { el: document.querySelector('#loading .lt'), arc: document.querySelector('#loading .prog') };
async function stage(p, label) {
  const pct = Math.round(p * 100);
  if (LD.el) LD.el.textContent = `${label} · ${pct}%`;
  if (LD.arc) LD.arc.style.strokeDashoffset = String(1 - p);
  await breathe();
}
await stage(0.02, 'Unlocking the shutters');
await initAssets();
// 画布上的文字（海报、标牌）要等字体加载好再画
await Promise.race([
  Promise.all(['500 20px "Noto Serif SC"', '600 20px "Noto Serif SC"', '400 20px "Noto Sans SC"', '500 20px "Noto Sans SC"', '500 20px "IBM Plex Mono"', '500 20px Inter',
    '700 20px "Bodoni Moda"', '700 20px "Cormorant Garamond"',
    'italic 700 20px "Cormorant Garamond"', '600 20px Jost']
    .map((f) => document.fonts.load(f))),
  new Promise((r) => setTimeout(r, 3000)),
]).catch(() => {});

await stage(0.05, 'Receiving deliveries'); await loadManifest();

// 五个地方都是走到了才下载、才搭：街道、门店、冷柜、加工间、仓库
let room = null, fr = null, fridge = null, lab = null, street = null, wh = null;
let PH = null, POSTER = null;
let post = null, postRoom = null, postFridge = null, postStreet = null, postWh = null;
let originalScreenMap = null, screenTint = null;
const placeOf = (view) => ({ room, fridge: room, lab, street, warehouse: wh })[view];
const atFridge = () => state.view === 'room' && state.rfocus === 'fridge' && !!fridge;   // 站在门店的鲜肉柜前面
let pendingProduct = null;                                                   // 走到柜前以后要打开的那件
// “快乐动物”广告海报：第一次要用的时候离屏拍好，贴到门店灯箱、冷柜两侧灯箱、告示栏照片上
function ensurePosters() {
  if (PH) return;
  PH = renderPosters(renderer, env);
  POSTER = Object.fromEntries(ORDER.map((k) => [k, posterTexture(PH.posters[k])]));
}
function setFridgePosters(k = 'beef') {
  if (!fr) return;                                                             // 灯箱只在原来单独的冷柜场景里有
  const next = ORDER[(ORDER.indexOf(k) + 2) % ORDER.length];
  fr.posters[0].material.map = POSTER[k];
  fr.posters[1].material.map = POSTER[next];
  fr.posters.forEach((m) => { m.material.needsUpdate = true; });
}
const grade = (scene, o) => (FX ? createPost(renderer, scene, camera, o) : null);
const PLACES = {
  async room() {
    ensurePosters(); await breathe();
    room = createRoom(env);
    room.setPosters(['beef', 'pork', 'chicken', 'fish'].map((k) => POSTER[k]), PH.photos);
    mountRoomSurfaces();
    fridge = room.smart;                                                       // 鲜肉柜就是门店里这台
    originalScreenMap = fridge.screen.material.map;
    screenTint = fridge.screen.material.color.clone();
    fridge.group.updateWorldMatrix(true, true);
    const W = (v) => fridge.group.localToWorld(new THREE.Vector3(...v)).toArray();
    room.spots.fridge = { eye: W(FRIDGE_OVERVIEW.pos), at: W(FRIDGE_OVERVIEW.target), fov: 40 };
    FRIDGE_PRODUCT.eye = W(FRIDGE_PRODUCT.pos); FRIDGE_PRODUCT.at = W(FRIDGE_PRODUCT.target);
    postRoom = grade(room.scene, { uSat: 0.98, uShadow: [-0.02, 0.012, 0.02], uHigh: [0.045, 0.02, -0.04], uContrast: 1.24, uLift: 0.004, uVignette: 0.76 });   // 门店：暗处偏青，灯泡底下暖黄
  },
  async lab() {
    lab = createLab(env);
    lab.setBatch(state.batch, state.order?.opts);
    mountLabTags();
    post = grade(lab.scene, { uSat: 1.1, uShadow: [-0.016, 0.008, 0.016], uHigh: [0.04, 0.025, -0.03], uContrast: 1.3, uVignette: 0.78, uLift: 0, uGrain: 0.02 });   // 观察室：黑压下去不发灰，暗部一点青，台灯暖、罐子绿
  },
  async street() {
    street = createStreet(env);
    postStreet = grade(street.scene, { ao: 0, bloomStrength: 0.12, bloomThreshold: 1.65, uContrast: 1.025, uLift: 0.022, uSat: 0.88, uShadow: [-0.014, 0.012, 0.018], uHigh: [0.026, 0.014, -0.02], uVignette: 0.39 });   // 夜里：暗部偏蓝，路灯偏橘
  },
  async warehouse() {
    wh = createWarehouse(env);
    postWh = grade(wh.scene, { uSat: 0.89, uShadow: [0.004, 0.002, -0.004], uHigh: [0.035, 0.02, -0.035], uVignette: 0.62 });     // 仓库：冷青的底，几摊暖光
  },
};
const building = {}, FOCUS_LIGHT = {};
function buildPlace(view, onProgress = () => {}) {
  return building[view] ??= (async () => {
    await preloadModels(SCENE_MODELS[view], (p) => onProgress(p * 0.8, 'Receiving deliveries'));
    onProgress(0.85, 'Thawing cell lines');
    await breathe();
    await PLACES[view]();
    FOCUS_LIGHT[view] = focusLight(placeOf(view).scene, view === 'warehouse' || view === 'street' ? 6 : 3.2);   // 先备着，强度 0
    await breathe();
    onProgress(1, 'Thawing cell lines');
  })();
}
const HDRI = { room: ['abandoned_factory_canteen_01', 0.55], fridge: ['abandoned_factory_canteen_01', 0.55],
  street: ['cobblestone_street_night', 0.32], lab: ['abandoned_tiled_room', 0.26], warehouse: ['empty_warehouse_01', 0.42] };   // 环境光照片也是进哪个房间才下载哪张
window.__dbg = { renderer, get street() { return street; }, get wh() { return wh; }, get room() { return room; }, get fr() { return fr; }, get lab() { return lab; }, get camera() { return camera; } };   // 调试用
const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 120);
// 三个场景统一偏暗、偏冷（调色在 post.js 里）
const TONE = { lab: [THREE.NeutralToneMapping, 0.94], room: [THREE.NeutralToneMapping, 0.82], fridge: [THREE.NeutralToneMapping, 0.66], street: [THREE.NeutralToneMapping, 1.12], warehouse: [THREE.NeutralToneMapping, 1.22], other: [THREE.ACESFilmicToneMapping, 0.72] };

const $ = (s) => document.querySelector(s);
const state = { view: 'boot', rfocus: null, sel: null, mode: null, fscreen: null, opts: null, order: null, basket: [], busy: false, focus: null, batch: makeBatch(null) };
const hasCart = () => !!state.order || state.basket.length > 0;                // 现货袋子里有东西，或者下了培养单
// 柜里每种肉最前面那一盒（现货）：都是给别人长的、没被取走的那份。不能定制，只能拿或不拿
const STOCK = {
  beef: { batch: 'B0417-1108', grown: 28, harvested: '2 days ago', grams: 214, best: 'NOV 19', for: 'FM-4471 · cancelled', tag: 'SURPLUS · CANCELLED ORDER  −30%', disc: 0.7 },
  pork: { batch: 'P0932-1112', grown: 21, harvested: 'yesterday', grams: 236, best: 'NOV 20', for: 'FM-5093 · not collected', tag: 'NOT COLLECTED  −20%', disc: 0.8 },
  chicken: { batch: 'G0221-1119', grown: 14, harvested: 'today, 06:40', grams: 198, best: 'NOV 22', for: 'standing order · café', tag: null, disc: 1 },
  fish: { batch: 'F1180-1105', grown: 28, harvested: '4 days ago', grams: 182, best: 'TOMORROW', soon: true, for: 'FM-3920 · refused at door', tag: 'LAST DAY  −40%', disc: 0.6 },
};
function stockPack(k) { const p = STOCK[k], full = Math.round(SPECIES[k].price * p.grams / 200); return { ...p, price: Math.round(full * p.disc), was: p.disc < 1 ? full : null }; }
const PLAN_EN = { std: 'Standard', a: 'Formula A', b: 'Formula B' };
const NAME_EN = { beef: 'Cultivated beef steak', pork: 'Cultivated pork chop', chicken: 'Cultivated chicken breast', fish: 'Cultivated yellow croaker' };

// ------------------------------------------------------------------ 滚动字幕
function setMarquee(text) {
  const t = (text || MARQUEE).repeat(6);
  $('#marquee .track').innerHTML = `<span>${t}</span><span>${t}</span>`;
}

// ------------------------------------------------------------------ 门店：拖动环顾（全景式）
// 门店和观察室都用同一套“站在原地拖动环顾”的控制，各自记住自己的朝向
const ROOM_EYE = new THREE.Vector3(-0.5, 1.62, 3.4);
const LAB_EYE = new THREE.Vector3(0.1, 1.62, 2.15);
const LAB_HOME = LAB_EYE.clone();   // 看批次、数据墙、须知、终端时的站位；平时站在走廊的点位上（LAB_NAV）
const look = { yaw: 0, pitch: -2, tYaw: 0, tPitch: -2, fov: 62 };
const labLook = { yaw: -6, pitch: -6, tYaw: -6, tPitch: -6, fov: 60 };
// 店外和仓库：同样是站在原地环顾
const STREET_EYE = new THREE.Vector3(-1.0, 1.65, 7.2);   // standing on the kerb side of the road, close enough to read the shop
const WH_EYE = new THREE.Vector3(-1.3, 1.65, 2.6);
const streetLook = { yaw: 0, pitch: 11, tYaw: 0, tPitch: 11, fov: 62 };
const whLook = { yaw: -12, pitch: -6, tYaw: -12, tPitch: -6, fov: 64 };
const LOOKS = { room: { eye: ROOM_EYE, l: look, min: 38, max: 72, pitch: [-52, 35] }, lab: { eye: LAB_EYE, l: labLook, min: 34, max: 66, pitch: [-55, 60] },
  street: { eye: STREET_EYE, l: streetLook, min: 34, max: 70 }, warehouse: { eye: WH_EYE, l: whLook, min: 34, max: 70, pitch: [-55, 35] } };
window.__looks = LOOKS;   // 调试 / 截图用
const canLook = () => LOOKS[state.view] && !state.rfocus && !state.busy && (!state.sfocus || state.view === 'street') && !state.focus && !NAV[state.view]?.walking;   // walked up to something on the street: you can still look around
let drag = null;
const toYawPitch = (p, eye = ROOM_EYE) => {
  const d = new THREE.Vector3(...p).sub(eye);
  return { yaw: THREE.MathUtils.radToDeg(Math.atan2(d.x, -d.z)), pitch: THREE.MathUtils.radToDeg(Math.atan2(d.y, Math.hypot(d.x, d.z))) };
};
canvas.addEventListener('pointerdown', (e) => {
  if (!canLook()) return;
  drag = { x: e.clientX, y: e.clientY, moved: 0 };
  canvas.setPointerCapture(e.pointerId);
  document.body.classList.add('grabbing');
  hideTutorial();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag || !LOOKS[state.view]) return;
  const L = LOOKS[state.view].l;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
  L.tYaw -= dx * 0.14;
  const [lo, hi] = LOOKS[state.view].pitch || [-28, 28];
  L.tPitch = THREE.MathUtils.clamp(L.tPitch + dy * 0.1, lo, hi);
});
const endDrag = () => { lastDragMoved = drag ? drag.moved : 0; drag = null; document.body.classList.remove('grabbing'); };
canvas.addEventListener('pointerup', endDrag);

// ---- game-style looking indoors: click the view once and the mouse turns your head (no dragging); a faint dot in the
// middle is where you aim, and a click uses whatever the dot is on. Esc gives the mouse back; so does opening anything.
const reticle = document.createElement('div'); reticle.id = 'reticle'; document.body.appendChild(reticle);
const lookHint = document.createElement('div'); lookHint.className = 'lookhint'; lookHint.textContent = 'Click to look around · Esc to release'; document.body.appendChild(lookHint);
const AIM_LISTS = () => ({ room: hsEls, warehouse: whEls, lab: labEls })[state.view];
const mouseLookHere = () => !!NAV[state.view] && canLook() && !inspector.active && !(state.view === 'lab' && !labChosen);
const locked = () => document.pointerLockElement === canvas;
let aimed = null, aimLab = null, aimRow = false, noLock = false;
document.addEventListener('pointerlockerror', () => { noLock = true; lookHint.textContent = 'Drag to look around'; });
const CENTER = () => ({ clientX: innerWidth / 2, clientY: innerHeight / 2 });
function setAim(el) {
  if (aimed === el) return;
  if (aimed) { aimed.classList.remove('aim'); aimed.dispatchEvent(new PointerEvent('pointerleave')); }
  aimed = el;
  if (el) { el.classList.add('aim'); el.dispatchEvent(new PointerEvent('pointerenter')); }
}
function aimTick() {
  const on = locked();
  if (on && !mouseLookHere()) document.exitPointerLock();
  document.body.classList.toggle('mouselook', on);
  lookHint.classList.toggle('on', !on && mouseLookHere());
  let best = null, bd = Infinity;
  if (on) {
    const cx = innerWidth / 2, cy = innerHeight / 2;
    for (const { el } of AIM_LISTS() || []) {
      if (el.classList.contains('hidden')) continue;
      const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, hit = (parseFloat(el.style.getPropertyValue('--hit')) || 64) / 2 + 6;
      const d = Math.hypot(x - cx, y - cy);
      if (d < hit && d < bd) { bd = d; best = el; }
    }
    const lt = state.view === 'lab' ? labThing(CENTER()) : null;
    if (lt?.free && lt.id === 'ask' && lt.uv) best = null;                        // on the terminal's screen: the screen itself wins over its ring
    aimLab = !best && lt?.free ? lt : null;
    const onKiosk = !!(aimLab?.id === 'ask' && aimLab.uv);                           // looking at the terminal: it wakes up and lists its questions
    aimRow = onKiosk ? lab.kiosk.aim(aimLab.uv) : false;
    if (!onKiosk && state.view === 'lab' && lab && !state.focus) lab.kiosk.aim(null);
  } else aimLab = null;
  setAim(best);
  reticle.classList.toggle('on', on);
  reticle.classList.toggle('hot', !!(best || aimLab));
}
addEventListener('pointerdown', (e) => {                                          // runs before the canvas handlers
  if (e.target !== canvas) return;
  if (locked()) {
    e.stopImmediatePropagation(); e.preventDefault();
    if (aimed) { const el = aimed; setAim(null); el.click(); }
    else if (aimRow) { lab.kiosk.ask(aimLab.uv); }                                 // ask it right here: the answer types out on the screen
    else if (aimLab) { location.hash = '#/lab/' + aimLab.id; }
    return;
  }
  if (mouseLookHere() && e.button === 0 && !noLock) { try { canvas.requestPointerLock?.()?.catch?.(() => {}); } catch {} }   // if the browser says no, dragging still works
}, true);
addEventListener('click', (e) => { if (e.target === canvas && locked()) e.stopImmediatePropagation(); }, true);
document.addEventListener('mousemove', (e) => {
  if (!locked() || !LOOKS[state.view]) return;
  const L = LOOKS[state.view].l, [lo, hi] = LOOKS[state.view].pitch || [-28, 28];
  L.tYaw += e.movementX * 0.11; L.yaw = L.tYaw;
  L.tPitch = THREE.MathUtils.clamp(L.tPitch - e.movementY * 0.09, lo, hi); L.pitch = L.tPitch;
});
document.addEventListener('pointerlockchange', () => { if (!locked()) setAim(null); });
// 冷柜触摸屏上的电子菜单（同一页手写便签）：指针移上去那一行涂上荧光笔；
// 点培养肉那几行 → 在冷柜里打开这件商品下单；点堂食 → 去吧台试吃；划掉的那行今天没有
const menuRay = new THREE.Raycaster(), menuNdc = new THREE.Vector2();
function menuRow(e) {
  if (!atFridge() || state.sel || state.fscreen || state.busy) return null;
  const r = canvas.getBoundingClientRect();
  menuNdc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  menuRay.setFromCamera(menuNdc, camera);
  const h = menuRay.intersectObjects(fridge.pad ? [fridge.screen, fridge.pad.sheet] : [fridge.screen], false)[0];   // 屏幕和旁边那本纸菜单都能点
  if (!h) return null;
  if (h.object !== fridge.screen && !padHeld) return { i: -1, padPick: true };   // 纸菜单：先拿起来，拿着才点菜
  return h.object === fridge.screen ? fridge.menu.pick(h.uv) : fridge.pad.pick(h.uv);
}
const menuHover = (i) => { fridge.pad?.setHover(i); if (!padHeld) fridge.menu.setHover(i); };   // 拿着纸时屏幕被挡住，不重画它
canvas.addEventListener('pointermove', (e) => {
  if (!atFridge()) return;
  const row = menuRow(e);
  menuHover(row ? row.i : -1);
  padHover(!!row?.padPick);
  canvas.style.cursor = row && !row.out ? 'pointer' : '';
});
canvas.addEventListener('click', (e) => {
  if (padJustHeld) { padJustHeld = false; return; }                        // 这一下是把纸菜单拿起来
  const row = menuRow(e);
  if (!row || row.padPick) return;
  holdPad(false);
  canvas.style.cursor = ''; menuHover(-1);
  if (row.out) { toast('Sold out'); return; }
  location.hash = SPECIES[row.go] ? '#/fridge/' + row.go : row.go === 'grow' ? '#/fridge/grow' : '#/' + row.go;
});
// 选好的那块肉：屏幕上的商品页直接点（定制、份量、交付、下单、看它生长 / 去结算）
function productAct(e) {
  if (!atFridge() || !(state.sel || state.fscreen)) return null;
  const r = canvas.getBoundingClientRect();
  menuNdc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  menuRay.setFromCamera(menuNdc, camera);
  const h = menuRay.intersectObject(fridge.screen, false)[0];
  return h ? h.uv : null;
}
canvas.addEventListener('pointermove', (e) => {
  if (!atFridge() || !(state.sel || state.fscreen)) return;
  const a = productScreen.hover(productAct(e));
  canvas.style.cursor = a ? 'pointer' : '';
});
canvas.addEventListener('click', (e) => {
  if (!atFridge() || !(state.sel || state.fscreen)) return;
  const a = productScreen.pick(productAct(e));
  if (!a) return;
  if (a.type === 'opt') { state.opts[a.key] = a.v; drawProduct(); }
  else if (a.type === 'qty') { state.opts.qty = THREE.MathUtils.clamp(state.opts.qty + a.d, 1, 10); drawProduct(); }
  else if (a.type === 'buy') placeOrder();
  else if (a.type === 'take') takePack();
  else if (a.type === 'go') location.hash = a.hash;
  else if (a.type === 'close') location.hash = '#/fridge';
});
// 旁边柜子上的纸菜单：点一下拿到眼前（拿着也能点菜），点别处或 Esc 放回去
let padHeld = null, padLift = false;
function padHover(on, now = false) {                                       // 指到纸菜单：纸从板上抬起一点，旁边的点亮出名字
  const g = fridge?.pad?.group; if (!g || (padHeld && !now) || on === padLift) return;
  padLift = on; g.userData.y0 ??= g.position.y;
  gsap.killTweensOf(g.position);
  if (now) { g.position.y = g.userData.y0; g.updateMatrixWorld(true); }
  else gsap.to(g.position, { y: g.userData.y0 + (on ? 0.02 : 0), duration: 0.25, ease: 'power2.out' });
  padDot.classList.toggle('hot', on);
}
function holdPad(on) {
  const pad = fridge?.pad; if (!pad) return;
  const grp = pad.group;
  if (on && !padHeld) {
    padHover(false, true);
    padHeld = { parent: grp.parent, pos: grp.position.clone(), quat: grp.quaternion.clone(), k: { t: 0 } };
    const wp = grp.getWorldPosition(new THREE.Vector3()), wq = grp.getWorldQuaternion(new THREE.Quaternion());
    room.scene.attach(grp);
    const fwd = camera.getWorldDirection(new THREE.Vector3()), up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion), right = new THREE.Vector3().crossVectors(fwd, up);
    const toPos = camera.position.clone().addScaledVector(fwd, 0.6).addScaledVector(up, -0.02);
    const toQuat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, fwd.clone().negate(), up.clone().negate()));
    toPos.addScaledVector(fwd.clone().negate(), 0.011);
    padHeld.from = { p: wp, q: wq }; padHeld.to = { p: toPos, q: toQuat };
    gsap.to(padHeld.k, { t: 1, duration: 0.6, ease: 'power2.inOut', onUpdate: () => { grp.position.lerpVectors(wp, toPos, padHeld.k.t); grp.quaternion.slerpQuaternions(wq, toQuat, padHeld.k.t); } });
    document.body.classList.add('pad-held'); fridge.menu.setHover(-1); psLayer.style.visibility = 'hidden';   // 拿在眼前时不显示任何交互点
  } else if (!on && padHeld) {
    const h = padHeld; padHeld = null;
    gsap.killTweensOf(h.k);
    const p0 = grp.position.clone(), q0 = grp.quaternion.clone(), k = { t: 0 };
    gsap.to(k, { t: 1, duration: 0.5, ease: 'power2.inOut', onUpdate: () => { grp.position.lerpVectors(p0, h.from.p, k.t); grp.quaternion.slerpQuaternions(q0, h.from.q, k.t); },
      onComplete: () => { h.parent.add(grp); grp.position.copy(h.pos); grp.quaternion.copy(h.quat); } });
    document.body.classList.remove('pad-held'); psLayer.style.visibility = '';
  }
}
canvas.addEventListener('pointerdown', (e) => {                          // 先于点菜判断：没拿着时点到纸菜单 = 拿起来；拿着时点到纸外面 = 放回去
  if (!atFridge() || state.sel || state.fscreen || !fridge?.pad) return;
  const r = canvas.getBoundingClientRect();
  menuNdc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  menuRay.setFromCamera(menuNdc, camera);
  const onPad = menuRay.intersectObject(fridge.pad.sheet, false).length > 0;
  if (!padHeld && onPad) { e.stopImmediatePropagation(); padJustHeld = true; holdPad(true); }
  else if (padHeld && onPad) e.stopImmediatePropagation();                  // 拿着时点纸上：只点菜，不拖动视角
  else if (padHeld && !onPad) holdPad(false);
}, true);
let padJustHeld = false;
addEventListener('keydown', (e) => { if (e.key === 'Escape' && padHeld) holdPad(false); });
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', (e) => {
  if (!canLook()) return;
  const { l, min, max } = LOOKS[state.view];
  l.fov = THREE.MathUtils.clamp(l.fov + e.deltaY * 0.02, min, max);
}, { passive: true });

// ------------------------------------------------------------------ 热点：旋转的圆形文字标签
// 离开热点时恢复的字幕跟随当前所在的场景，而不是创建热点时的场景
function currentMarquee() {
  if (state.view === 'lab') return state.focus ? titleOf(LAB_HOTSPOTS.find((h) => h.id === state.focus)) + ' · ' : LAB_MARQUEE;
  if (state.view === 'street') return STREET_MARQUEE;
  if (state.view === 'warehouse') return WH_MARQUEE;
  return MARQUEE;
}
// 热点只留标题：平时一个点、一圈细环；指上去环张开到那样东西的大小，标题浮出来，同时一束光打在它身上、周围暗下去一点
const titleOf = (h) => {
  if (!h) return '';
  const parts = h.label.split('·').map((x) => x.trim()).filter(Boolean), zh = parts.filter((x) => /[\u4e00-\u9fff]/.test(x));
  return (zh.length ? zh : parts).join(' · ');
};
const LOCK = '<svg class="lock" viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="7" width="9" height="6.5" rx="1.2"/><path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7"/></svg>';
const spotShade = document.createElement('div');
spotShade.id = 'spot';
document.body.appendChild(spotShade);
let hovered = null;                                                          // { el, v, r }：正指着的那样东西
let meshHover = null;                                                        // { v, r }：直接指着场景里的一样东西（墙上的须知、终端）
function hoverOn(el, v, r = 0.5) { hovered = { el, v, r }; }
function hoverOff(el) { if (!el || hovered?.el === el) hovered = null; }
function feedback(dt) {
  const light = FOCUS_LIGHT[state.view];
  if (hovered && (!hovered.el.isConnected || !hovered.el.getClientRects().length || hovered.el.classList.contains('hidden'))) hovered = null;
  const hv = hovered || meshHover;
  spotShade.classList.toggle('on', !!hv);
  if (!inspector.active) light?.show(hv?.v, camera);
  light?.tick(dt);
  if (!hv) return;
  const p = project(hv.v), focal = innerHeight / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const r = THREE.MathUtils.clamp((focal * hv.r) / camera.position.distanceTo(hv.v), 56, 260);
  spotShade.style.setProperty('--x', p.x + 'px'); spotShade.style.setProperty('--y', p.y + 'px'); spotShade.style.setProperty('--r', r + 'px');
}
function makeHotspots(list, layer, onClick) {
  return list.map((h) => {
    const el = document.createElement('button'), title = titleOf(h), v = new THREE.Vector3(...h.pos);
    el.className = 'hs' + (h.subtle ? ' subtle' : '');
    el.innerHTML = `<span class="halo"></span><span class="core"></span>${LOCK}<span class="title">${title}</span>`;
    el.setAttribute('aria-label', title);
    const on = () => { hoverOn(el, v, h.r || 0.55); setMarquee(title + ' · '); };
    const off = () => { hoverOff(el); setMarquee(currentMarquee()); };
    el.addEventListener('pointerenter', on);
    el.addEventListener('focus', on);
    el.addEventListener('pointerleave', off);
    el.addEventListener('blur', off);
    el.addEventListener('click', () => { hoverOff(el); onClick(h); });
    layer.appendChild(el);
    return { h, el, v };
  });
}
const hsEls = makeHotspots(HOTSPOTS, $('#hotspots'), (h) => enterHotspot(h));
const labEls = makeHotspots(LAB_HOTSPOTS.filter((h) => !h.nopin), $('#labspots'), (h) => { location.hash = '#/' + h.route; });
// 店外、仓库的热点：要么去另一个场景，要么在原地用引线标出几样东西
const sceneLayer = (id) => { const d = document.createElement('div'); d.id = id; d.className = 'spots'; document.body.appendChild(d); return d; };
let infoOpen = null;
function sceneSpot(h) {
  if (h.route !== undefined) { location.hash = '#/' + h.route; return; }
  if (h.eye) { location.hash = `#/${state.view}/${h.id}`; return; }       // 有机位的：走近再看
  if (infoOpen === h.id) { hideInfo(); return; }
  infoOpen = h.id;
  hideTutorial();
  showCallouts(h.info);
  setMarquee(titleOf(h) + ' · ');
}
function hideInfo() { inspector.close(); infoOpen = null; calloutLayer.classList.remove('on'); callouts = []; calloutLines.innerHTML = ''; FC.look = null; inspected = null; }
// 店外 / 仓库里的走近：眼睛从现在的位置走到 h.eye，一路看着 h.at；到了再出引线标注
const SCENE_HOME = { street: { eye: STREET_EYE.clone(), yaw: 0, pitch: 11, fov: 62 }, warehouse: { eye: WH_EYE.clone(), yaw: -12, pitch: -6, fov: 64 } };
let sceneWalk, sceneTimer;
// 人走近一样东西、转头看它：时间按“走多远、转多少度”算，起和停都是软的，不甩镜头。所有镜头移动都走这里
function moveSeconds(eyeV, to, L, yaw, pitch) {
  const dist = eyeV.distanceTo(to), turn = Math.abs(wrapNear(yaw, L.yaw) - L.yaw) + Math.abs(pitch - L.pitch) * 0.6;
  return THREE.MathUtils.clamp(Math.max(0.6 + dist / 2.05, 0.45 + turn / 66), 1.0, 3.9);
}
function humanMove(L, eyeV, to, aim, fov, done) {
  const from = eyeV.clone(), target = new THREE.Vector3(...to), y0 = L.yaw, p0 = L.pitch, p = { t: 0 };
  const end = Array.isArray(aim) ? toYawPitch(aim, target) : aim, y1 = wrapNear(end.yaw, y0), fov0 = camera.fov;
  const seconds = moveSeconds(from, target, L, end.yaw, end.pitch);
  gsap.killTweensOf(L);
  return gsap.to(p, { t: 1, duration: seconds, ease: 'sine.inOut', onUpdate() {
    eyeV.lerpVectors(from, target, p.t);
    L.yaw = L.tYaw = y0 + (y1 - y0) * p.t;
    L.pitch = L.tPitch = p0 + (end.pitch - p0) * p.t;
    L.fov = fov0 + (fov - fov0) * p.t;
  }, onComplete: done });
}
function walkLook(L, eyeV, to, aim, fov) {
  sceneWalk?.kill();
  sceneWalk = humanMove(L, eyeV, to, aim, fov);
  return sceneWalk.duration();
}
function focusScene(id) {
  const list = state.view === 'street' ? STREET_HOTSPOTS : WH_HOTSPOTS;
  const h = list.find((x) => x.id === id && x.eye);
  if (!h) return unfocusScene();
  hideTutorial(); hideInfo();
  clearTimeout(sceneTimer);
  const { eye, l } = LOOKS[state.view];
  let dur;
  state.sfocus = id;
  document.body.classList.add('scene-focus');
  updateBack();
  if (state.view === 'warehouse' && h.view) { NAV.warehouse.stop(); sceneWalk?.kill(); dur = fcStart(h); }   // 仓库：换成这个点自己的镜头（可以拖着转 / 平移）
  else dur = walkLook(l, eye, h.eye, h.at, h.fov || 52);
  placeOf(state.view)?.onFocus?.(id, true);                                // 走到档案桌前，书自己翻开
  sceneTimer = setTimeout(() => { if (state.sfocus === id && location.hash.endsWith('/' + id) && h.info) showCallouts(h.info); }, dur * 1000 - 100);
  setMarquee(titleOf(h) + ' · ');
}
function unfocusScene(instant = false) {
  clearTimeout(sceneTimer);
  const home = SCENE_HOME[state.view];
  if (instant) { sceneWalk?.kill(); for (const [k, v] of Object.entries(SCENE_HOME)) LOOKS[k].eye.copy(v.eye); fcEnd(null, true); }
  if (!state.sfocus) return;
  hideInfo();
  placeOf(state.view)?.onFocus?.(state.sfocus, false);
  state.sfocus = null;
  document.body.classList.remove('scene-focus');
  updateBack();
  if (!instant && state.view === 'warehouse' && FC.on) fcEnd(home);                   // 仓库：从这个点的镜头退回原来的站位
  else if (!instant && home) walkLook(LOOKS[state.view].l, LOOKS[state.view].eye, home.eye.toArray(), { yaw: home.yaw, pitch: home.pitch }, home.fov);
  setMarquee(currentMarquee());
}
const streetEls = makeHotspots(STREET_HOTSPOTS, sceneLayer('streetspots'), sceneSpot);
const whEls = makeHotspots(WH_HOTSPOTS, sceneLayer('whspots'), sceneSpot);

// ---- 仓库、实验室里走动：固定点位 + 按路线画的箭头，走法都在 nav.js，点位在 data.js（WH_NAV / LAB_NAV）
let lastDragMoved = 0;
let roomMove, labChosen = false, labChoice = null;
const onStep = () => { hideTutorial(); hideInfo(); canvas.style.cursor = ''; };
const NAV = {
  warehouse: createNav({ scene: { add: (o) => wh.scene.add(o), remove: (o) => wh?.scene.remove(o) }, graph: WH_NAV, camera, eye: WH_EYE, look: whLook, home: SCENE_HOME.warehouse, onStep, world: () => wh?.scene,
    visible: () => state.view === 'warehouse' && !state.sfocus && !FC.on }),
  room: createNav({ scene: { add: (o) => room.scene.add(o), remove: (o) => room?.scene.remove(o) }, graph: ROOM_NAV, camera, eye: ROOM_EYE, look, home: { eye: new THREE.Vector3() }, onStep, world: () => room?.scene,
    visible: () => state.view === 'room' && !state.rfocus && !state.busy && !roomMove?.isActive() }),
  lab: createNav({ scene: { add: (o) => lab.scene.add(o), remove: (o) => lab?.scene.remove(o) }, graph: LAB_NAV, camera, eye: LAB_EYE, look: labLook, home: { eye: new THREE.Vector3() }, onStep, world: () => lab?.scene,
    visible: () => state.view === 'lab' && labChosen && !state.focus && !FC.on && !labWalk?.isActive() }),
};
window.__nav = NAV;   // 调试
canvas.addEventListener('pointermove', (e) => {
  const nav = NAV[state.view];
  if (!nav || drag || fdrag) return;
  const a = nav.pick(e, canvas);
  nav.setHover(a);
  canvas.style.cursor = a ? 'pointer' : '';
});
canvas.addEventListener('click', (e) => {
  const nav = NAV[state.view];
  if (!nav || lastDragMoved > 6) return;
  const a = nav.pick(e, canvas);
  if (a) { canvas.style.cursor = ''; nav.step(a.link); }
});
canvas.addEventListener('pointerleave', () => { NAV[state.view]?.setHover(null); });
// 登记簿：指到哪一页那一页的角先翘起来，点了就翻；← → 也能翻
const bookRay = new THREE.Raycaster(), bookNdc = new THREE.Vector2();
function bookSide(e) {
  if (state.view !== 'room' || state.rfocus !== 'records') return 0;
  const r = canvas.getBoundingClientRect();
  bookNdc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  bookRay.setFromCamera(bookNdc, camera);
  return room.ledger.side(bookRay);
}
canvas.addEventListener('pointermove', (e) => {
  if (state.view !== 'room' || state.rfocus !== 'records') return;
  const side = bookSide(e);
  room.ledger.warm?.(renderer);
  room.ledger.hover(side);
  canvas.style.cursor = side ? 'pointer' : '';
});
canvas.addEventListener('click', (e) => { const side = bookSide(e); if (side) room.ledger.turn(side); });
const labRay = new THREE.Raycaster(), labNdc = new THREE.Vector2();
const LAB_THINGS = { notice: { v: new THREE.Vector3(4.95, 1.45, 2.45), r: 0.42 }, ask: { v: new THREE.Vector3(3.9, 1.15, 0.35), r: 0.4 } };
function labThing(e) {
  if (state.view !== 'lab' || !lab || inspector.active) return null;
  const free = !state.focus && labChosen && !NAV.lab.walking && !labWalk?.isActive();
  if (!free && state.focus !== 'notice' && state.focus !== 'ask') return null;
  const r = canvas.getBoundingClientRect();
  labNdc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  labRay.setFromCamera(labNdc, camera);
  const hits = labRay.intersectObjects([lab.notice.mesh, ...lab.kiosk.pick], false);
  const h = hits.find((x) => x.object === lab.kiosk.screen && x.distance - hits[0].distance < 0.15) || hits[0];   // look through the terminal's cover glass to the screen behind it
  if (!h || h.distance > 6) return free ? null : { id: state.focus, uv: null };
  const id = h.object === lab.notice.mesh ? 'notice' : 'ask';
  return { id, uv: h.object === lab.notice.mesh || h.object === lab.kiosk.screen ? h.uv : null, free };
}
canvas.addEventListener('pointermove', (e) => {
  if (state.view !== 'lab' || !lab) return;
  const t = labThing(e);
  if (t?.free) {
    if (meshHover?.id !== t.id) { meshHover = { id: t.id, ...LAB_THINGS[t.id] }; setMarquee(titleOf(LAB_HOTSPOTS.find((h) => h.id === t.id)) + ' · '); }
    canvas.style.cursor = 'pointer'; return;
  }
  if (meshHover) { meshHover = null; canvas.style.cursor = ''; setMarquee(currentMarquee()); }
  if (state.focus === 'notice') { const on = t?.id === 'notice' && lab.notice.hover(t.uv); if (!on) lab.notice.hover(null); canvas.style.cursor = on ? 'pointer' : ''; }
  if (state.focus === 'ask') { const on = t?.id === 'ask' && lab.kiosk.hover(t.uv); if (!on) lab.kiosk.hover(null); canvas.style.cursor = on ? 'pointer' : ''; }
});
canvas.addEventListener('click', (e) => {
  if (state.view !== 'lab' || !lab || lastDragMoved > 6) return;
  const t = labThing(e);
  if (!t) return;
  if (t.free) { meshHover = null; canvas.style.cursor = ''; location.hash = '#/lab/' + t.id; return; }
  if (t.id === 'notice' && state.focus === 'notice') lab.notice.click(t.uv);
  if (t.id === 'ask' && state.focus === 'ask') lab.kiosk.click(t.uv);
});
addEventListener('keydown', (e) => {
  if (state.view === 'room' && state.rfocus === 'records' && (e.code === 'ArrowRight' || e.code === 'ArrowLeft')) { e.preventDefault(); room.ledger.warm?.(renderer); return room.ledger.turn(e.code === 'ArrowRight' ? 1 : -1); }
  if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, textarea, select, [contenteditable]')) return;
  if (e.key === 'Enter' && e.target.closest?.('button')) return;            // 焦点在按钮上：回车就是按那个按钮
  if (!inspector.active && NAV[state.view]?.key(e.code)) { e.preventDefault(); hideTutorial(); }
});

// ---- 点进一样东西以后的镜头：每个点按东西的样子给不同的看法，拖动就能换角度
//   orbit：绕着这样东西转（左右有限度、上下有限度，滚轮拉近拉远）——桌子、冷柜、运输笼……
//   track：沿着一条轨道平移（左右拖 = 沿着走，上下拖 = 抬头低头）——冷冻区是从上往下看、沿着一排冷柜移；货架是沿着货架正面走
let labWalk;
const FC = { look: null, lookAt: new THREE.Vector3(), lk: 0, on: false, exiting: false, h: null, v: null, blend: 0, fromEye: new THREE.Vector3(), fromAt: new THREE.Vector3(), u: 0.5, tu: 0.5, az: 0, taz: 0, el: 0, tel: 0, d: 1, td: 1, tilt: 0, ttilt: 0, fov: 56, side: 1, az0: 0, d0: 1 };
const fcEye = new THREE.Vector3(), fcAt = new THREE.Vector3();
let fdrag = null;
function fcPose(eye, at) {
  const v = FC.v;
  if (v.mode === 'orbit') { at.set(...FC.h.at); eye.set(at.x + Math.sin(FC.az) * Math.cos(FC.el) * FC.d, at.y + Math.sin(FC.el) * FC.d, at.z + Math.cos(FC.az) * Math.cos(FC.el) * FC.d); }
  else { eye.lerpVectors(new THREE.Vector3(...v.a), new THREE.Vector3(...v.b), FC.u); const L = new THREE.Vector3(...v.look); const hz = Math.hypot(L.x, L.z), p = Math.atan2(L.y, hz) + FC.tilt;
    at.set(eye.x + (L.x / hz) * Math.cos(p) * 2, eye.y + Math.sin(p) * 2, eye.z + (L.z / hz) * Math.cos(p) * 2); }
}
function fcStart(h) {
  FC.h = h; FC.v = h.view; FC.view = state.view; FC.look = null; FC.lk = 0; FC.on = true; FC.exiting = false; FC.blend = 0;
  FC.fromEye.copy(camera.position); FC.fromAt.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(3));
  FC.fov = h.view.fov || h.fov || 54;
  if (FC.v.mode === 'orbit') { const e = new THREE.Vector3(...h.eye), a = new THREE.Vector3(...h.at), d = e.distanceTo(a);
    FC.d0 = FC.d = FC.td = d; FC.az0 = FC.az = FC.taz = Math.atan2(e.x - a.x, e.z - a.z); FC.el = FC.tel = Math.asin((e.y - a.y) / d); }
  else { FC.u = FC.tu = (camera.aspect < 1 ? FC.v.u0p : undefined) ?? FC.v.u0 ?? 0.5; FC.tilt = FC.ttilt = 0;
    const L = new THREE.Vector3(...FC.v.look), right = new THREE.Vector3(L.x, 0, L.z).normalize().cross(new THREE.Vector3(0, 1, 0));
    FC.side = Math.sign(new THREE.Vector3(...FC.v.b).sub(new THREE.Vector3(...FC.v.a)).dot(right)) || 1; }
  fcPose(fcEye, fcAt);
  const seconds = fcSeconds(fcEye, fcAt);
  gsap.to(FC, { blend: 1, duration: seconds, ease: 'sine.inOut', overwrite: true });
  setTimeout(() => { if (FC.on && !FC.exiting) showTutorial('', '', 'drag'); }, seconds * 1000);
  return seconds;
}
function fcSeconds(eyeTo, atTo) {                                               // 走多远、转多少度 → 几秒
  const turn = THREE.MathUtils.radToDeg(camera.getWorldDirection(new THREE.Vector3()).angleTo(atTo.clone().sub(eyeTo)));
  return THREE.MathUtils.clamp(Math.max(0.7 + camera.position.distanceTo(eyeTo) / 1.9, 0.5 + turn / 55), 1.3, 4.6);
}
function fcEnd(home, instant) {
  if (!FC.on) return;
  if (instant) { gsap.killTweensOf(FC); FC.on = false; FC.exiting = false; return; }
  FC.exiting = true; fcPose(FC.fromEye, FC.fromAt);                                     // 从现在的样子回到站位
  const y = THREE.MathUtils.degToRad(home.yaw), p = THREE.MathUtils.degToRad(home.pitch);
  const hEye = home.eye.clone(), hAt = hEye.clone().add(new THREE.Vector3(Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p)).multiplyScalar(3));
  FC.blend = 0; FC.back = { eye: hEye, at: hAt, fov: home.fov || 64 };
  gsap.to(FC, { blend: 1, duration: fcSeconds(hEye, hAt), ease: 'sine.inOut', overwrite: true, onComplete: () => {
    FC.on = false; FC.exiting = false; LOOKS[FC.view].eye.copy(hEye); Object.assign(LOOKS[FC.view].l, { yaw: home.yaw, tYaw: home.yaw, pitch: home.pitch, tPitch: home.pitch, fov: home.fov || 64 }); } });
}
function fcStep() {
  const k = 0.16, v = FC.v;
  FC.u += (FC.tu - FC.u) * k; FC.az += (FC.taz - FC.az) * k; FC.el += (FC.tel - FC.el) * k; FC.d += (FC.td - FC.d) * k; FC.tilt += (FC.ttilt - FC.tilt) * k;
  let fov;
  if (!FC.exiting) {
    fcPose(fcEye, fcAt);
    const b = FC.blend;
    camera.position.lerpVectors(FC.fromEye, fcEye, b);
    fcAt.lerpVectors(FC.fromAt, fcAt, b);
    if (FC.look) FC.lookAt.copy(FC.look);
    FC.lk += ((FC.look ? 1 : 0) - FC.lk) * 0.055;                           // 点了某一样的标题：头慢慢转过去、视角收一点
    if (FC.lk > 0.002) fcAt.lerp(FC.lookAt, FC.lk);
    fov = THREE.MathUtils.lerp(camera.fov, FC.fov * (1 - 0.36 * FC.lk), 0.12);
  }
  else { const b = FC.blend; camera.position.lerpVectors(FC.fromEye, FC.back.eye, b); fcAt.lerpVectors(FC.fromAt, FC.back.at, b); fov = THREE.MathUtils.lerp(camera.fov, FC.back.fov, 0.12); }
  if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  camera.lookAt(fcAt); camera.updateMatrixWorld();
}
canvas.addEventListener('pointerdown', (e) => { if (!(FC.on && state.view === FC.view && !FC.exiting && FC.blend > 0.95)) return; fdrag = { x: e.clientX, y: e.clientY }; if (FC.look) { FC.look = null; inspected?.el.classList.remove('sel'); inspected = null; } canvas.setPointerCapture(e.pointerId); document.body.classList.add('grabbing'); hideTutorial(); });
canvas.addEventListener('pointermove', (e) => {
  if (!fdrag) return; const dx = e.clientX - fdrag.x, dy = e.clientY - fdrag.y; fdrag.x = e.clientX; fdrag.y = e.clientY; const v = FC.v;
  if (v.mode === 'orbit') { const r = THREE.MathUtils.degToRad(v.az); FC.taz = THREE.MathUtils.clamp(FC.taz - dx * 0.006, FC.az0 - r, FC.az0 + r);
    FC.tel = THREE.MathUtils.clamp(FC.tel + dy * 0.005, THREE.MathUtils.degToRad(v.el[0]), THREE.MathUtils.degToRad(v.el[1])); }
  else { const len = new THREE.Vector3(...v.a).distanceTo(new THREE.Vector3(...v.b)); FC.tu = THREE.MathUtils.clamp(FC.tu - FC.side * dx * 2.4 / (innerWidth * len), 0, 1);   // 画面跟着手走
    FC.ttilt = THREE.MathUtils.clamp(FC.ttilt + dy * 0.003, -THREE.MathUtils.degToRad(v.tilt), THREE.MathUtils.degToRad(v.tilt)); }
});
const endFDrag = () => { if (fdrag) { fdrag = null; document.body.classList.remove('grabbing'); } };
canvas.addEventListener('pointerup', endFDrag); canvas.addEventListener('pointercancel', endFDrag);
canvas.addEventListener('wheel', (e) => { if (!(FC.on && state.view === FC.view && !FC.exiting)) return;
  if (FC.v.mode === 'orbit') { const [zi, zo] = FC.v.zoom || [0.6, 1.35]; FC.td = THREE.MathUtils.clamp(FC.td * (1 + e.deltaY * 0.001), FC.d0 * zi, FC.d0 * zo); } else { const [lo, hi] = FC.v.zoomFov || [38, 70]; FC.fov = THREE.MathUtils.clamp(FC.fov + e.deltaY * 0.02, lo, hi); } }, { passive: true });

function enterHotspot(h) {
  if (state.busy) return;
  if (h.needsOrder && !hasCart()) return toast('Your basket is empty');
  if (room.spots[h.route]) { location.hash = '#/' + h.route; return; }
  const { yaw, pitch } = toYawPitch(h.pos);
  let target = yaw;
  while (target - look.yaw > 180) target -= 360;
  while (target - look.yaw < -180) target += 360;
  state.busy = true;
  gsap.to(look, { tYaw: target, tPitch: pitch, fov: 40, duration: THREE.MathUtils.clamp(0.8 + Math.abs(target - look.yaw) / 55, 1.3, 3), ease: 'sine.inOut', onComplete: () => {
    state.busy = false;
    location.hash = '#/' + h.route;
  } });
}

// ------------------------------------------------------------------ 冷柜：商品热点、开门、屏幕
const cam = { pos: new THREE.Vector3(0.05, 1.45, 4.2), target: new THREE.Vector3(0.05, 1.1, 0) };
const FRIDGE_OVERVIEW = { pos: [0.05, 1.42, 2.55], target: [0.05, 1.08, 0] };
const FRIDGE_PRODUCT = { pos: [0.16, 1.3, 1.85], target: [0.12, 1.22, 0] };
function flyCam(stop, duration = 1.4) {
  gsap.to(cam.pos, { x: stop.pos[0], y: stop.pos[1], z: stop.pos[2], duration, ease: 'power2.inOut' });
  gsap.to(cam.target, { x: stop.target[0], y: stop.target[1], z: stop.target[2], duration, ease: 'power2.inOut' });
}

const psLayer = $('#products');
const psEls = ORDER.map((k) => {
  const el = document.createElement('button');
  el.className = 'ps';
  el.innerHTML = `<span class="dot"></span><span class="tag">${SPECIES[k].title}<b>${gbp(SPECIES[k].price)}</b></span>`;
  el.addEventListener('click', () => { location.hash = '#/fridge/' + k; });
  psLayer.appendChild(el);
  return { k, el };
});

const padDot = document.createElement('button');                           // 纸菜单放在柜子上时的交互点：点它 = 拿起来
padDot.className = 'ps pad-dot';
padDot.innerHTML = '<span class="dot"></span><span class="tag">Paper menu<b>Pick it up</b></span>';
padDot.addEventListener('click', () => { if (atFridge() && !state.sel) holdPad(true); });
padDot.addEventListener('pointerenter', () => padHover(true));
padDot.addEventListener('pointerleave', () => padHover(false));
psLayer.appendChild(padDot);
const padAnchor = new THREE.Vector3();
const screenEl = $('#screen');
const screenBody = $('#screen .body');
const blankScreen = new THREE.MeshBasicMaterial({ color: 0x101113 });

function defaults() {
  return { fat: 'mid', form: 'fillet', firm: 'tender', aroma: 'base', shade: 'light', cycle: 28, plan: 'std', qty: 1, delivery: 'std' };
}
function heroOf(k) { return fridge.shelves[k].hero; }
function fridgeOverlay(t) {
  if (state.sel) {
    const hero = heroOf(state.sel);
    if (hero.scale.x > 1.45) hero.rotation.y = 0.25 + Math.sin(t * 0.6) * 0.25;
    const pts = corners.map((c) => project(fridge.screen.localToWorld(c.clone())));
    const xs = pts.map((q) => q.x), ys = pts.map((q) => q.y);
    const l = Math.min(...xs), r = Math.max(...xs), tp = Math.min(...ys), b = Math.max(...ys);
    Object.assign(screenEl.style, { left: l + 'px', top: tp + 'px', width: (r - l) + 'px', height: (b - tp) + 'px' });
  }
  if (fridge.pad && !padHeld) { const s = project(fridge.pad.sheet.getWorldPosition(padAnchor)); padDot.style.transform = `translate(${s.x}px, ${s.y}px)`; }
  for (const { k, el } of psEls) {
    const s = project(fridge.group.localToWorld(fridge.shelves[k].anchor.clone()));
    el.style.transform = `translate(${s.x}px, ${s.y}px)`;
  }
}

let productMat = null;
const showScreen = (view) => { productMat ??= new THREE.MeshBasicMaterial({ map: productScreen.tex, toneMapped: false, color: screenTint }); fridge.screen.material = productMat; productScreen.draw(view); };
function restoreKiosk() { state.fscreen = null; if (!state.sel) fridge.screen.material = new THREE.MeshBasicMaterial({ map: originalScreenMap, toneMapped: false, color: screenTint }); }
// 屏幕上：培养定制第一步（选哪一种从细胞系开始长）
function openGrowPick() {
  holdPad(false);
  if (state.sel) closeProduct(true);
  state.fscreen = 'grow';
  document.body.classList.add('product-open'); hideTutorial(); updateBack();
  walkTo(FRIDGE_PRODUCT.eye, FRIDGE_PRODUCT.at, 40);
  showScreen({ mode: 'grow', prices: Object.fromEntries(ORDER.map((k) => [k, Math.round(SPECIES[k].price * GROWTH.plan.b.price)])) });
  setMarquee('Grow to order · grown after you order · 14–28 days · ');
}
function fridgeRoute(sub, third) {
  if (SPECIES[sub]) openProduct(sub, 'stock');
  else if (sub === 'grow' && SPECIES[third]) openProduct(third, 'grow');
  else if (sub === 'grow') openGrowPick();
  else { closeProduct(); restoreKiosk(); document.body.classList.remove('product-open'); updateBack(); }
}
function openProduct(k, mode = 'stock') {
  holdPad(false);
  fridge.menu.setCurrent(k); fridge.pad?.setCurrent(k);                   // 看过的那件，屏幕上的菜单会把它圈出来
  if (state.sel === k && state.mode === mode) return;
  if (state.sel) closeProduct(true);
  state.fscreen = null;
  state.sel = k; state.mode = mode;
  state.opts = defaults();
  const hero = heroOf(k);
  hero.visible = true;
  gsap.killTweensOf([hero.position, hero.rotation, hero.scale]);
  hero.userData.home ??= { p: hero.position.clone(), r: hero.rotation.clone(), s: hero.scale.x };   // 架子上的原位只记一次（半路再点也不会记歪）
  document.body.classList.add('product-open');
  hideTutorial();
  walkTo(FRIDGE_PRODUCT.eye, FRIDGE_PRODUCT.at, 40);
  updateBack();
  setFridgePosters(k);
  if (mode === 'grow') {                                                          // 培养定制：柜里的现货不动，屏幕上从细胞系开始定
    showScreen({ mode: 'product', k, opts: state.opts, options: OPTIONS[k], price: price(), base: SPECIES[k].price, x: GROWTH.plan[state.opts.plan].x });
    setMarquee(`Grow to order · ${SPECIES[k].title} · cell line ${SPECIES[k].id} · `);
    return;
  }
  gsap.to(fridge.door.rotation, { y: -1.8, duration: 1.0, ease: 'power2.inOut' });   // 现货：开门把最前面那一盒拿出来给你看
  gsap.timeline()
    .to(hero.position, { z: 0.55, duration: 0.5, ease: 'power2.out', delay: 0.5 })
    .to(hero.position, { x: -0.22, y: 1.16, z: 0.62, duration: 0.9, ease: 'power3.inOut' })
    .to(hero.rotation, { x: 0.7, y: 0.25, duration: 0.9, ease: 'power3.inOut' }, '<')
    .to(hero.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.9, ease: 'power3.inOut' }, '<');
  applyMeat();
  showScreen({ mode: 'stock', k, pack: stockPack(k) });                        // 现货页就画在这块玻璃屏上
  setMarquee(`In stock · ${SPECIES[k].title} · batch ${STOCK[k].batch} · `);
}
// 拿走这一盒：放进袋子（盒子往下收走），屏幕上换成“已放进袋子”
function takePack() {
  const k = state.sel; if (!k || state.mode !== 'stock') return;
  const pack = stockPack(k);
  if (!state.basket.some((b) => b.k === k)) state.basket.push({ k, ...pack });
  const hero = heroOf(k);
  gsap.killTweensOf([hero.position, hero.rotation, hero.scale]);
  gsap.to(hero.position, { y: hero.position.y - 0.7, z: hero.position.z + 0.25, duration: 0.7, ease: 'power2.in', onComplete: () => { hero.visible = false; } });
  gsap.to(hero.rotation, { x: 1.2, duration: 0.7 });
  cartLabel();
  showScreen({ mode: 'taken', k, pack, count: state.basket.length, total: state.basket.reduce((a, b) => a + b.price, 0) });
}
function cartLabel() {
  document.body.classList.toggle('has-order', hasCart());
  $('#cart').textContent = state.order ? `Order ${state.order.no}` : `Basket ${state.basket.length}`;
}

function closeProduct(instant = false) {
  if (!state.sel) return;
  const hero = heroOf(state.sel);
  const home = hero.userData.home;
  gsap.killTweensOf([hero.position, hero.rotation, hero.scale]);
  screenEl.classList.remove('on');
  document.body.classList.remove('product-open');
  const d = instant ? 0 : 0.8;
  gsap.to(hero.position, { x: home.p.x, y: home.p.y, z: home.p.z, duration: d, ease: 'power2.inOut' });
  gsap.to(hero.rotation, { x: home.r.x, y: home.r.y, duration: d });
  gsap.to(hero.scale, { x: home.s, y: home.s, z: home.s, duration: d });
  hero.visible = true;                                                             // 拿走的那一盒：店员又从后面补上一盒
  gsap.to(fridge.door.rotation, { y: 0, duration: instant ? 0 : 0.9, delay: instant ? 0 : 0.6, ease: 'power2.inOut' });
  fridge.screen.material = new THREE.MeshBasicMaterial({ map: originalScreenMap, toneMapped: false, color: screenTint });
  state.sel = null; state.mode = null; state.fscreen = null;
  if (!instant && atFridge()) { const sp = room.spots.fridge; walkTo(sp.eye, sp.at, sp.fov); }
  updateBack();
  setMarquee();
}

function applyMeat() {
  const k = state.sel, o = state.opts;
  const hero = heroOf(k);
  const u = hero.userData.mat.userData.uniforms;
  gsap.to(u.uFat, { value: { low: 0, mid: 0.5, high: 1 }[o.fat], duration: 0.6 });
  gsap.to(u.uFirm, { value: o.firm === 'firm' ? 1 : 0, duration: 0.6 });
  gsap.to(u.uColor, { value: o.shade === 'deep' ? 0.85 : 0.25, duration: 0.6 });
  u.uSteak.value = o.form === 'steak' ? 1 : 0;
  const kind = kindFor(k, o.form);
  hero.userData.meat.geometry = meatGeometry(kind);
  const fit = packFit(kind); hero.userData.meat.scale.setScalar(fit);
  hero.userData.meat.position.y = 0.03 + meatHeight(kind) * fit;
}

// ------------------------------------------------------------------ 翻牌数字（参考网站配方用量的滚动数字）
function flipHTML(str) {
  return [...String(str)].map((ch) => /\d/.test(ch)
    ? `<span class="fd"><span class="col" style="--d:0">${[...'0123456789'].map((d) => `<i>${d}</i>`).join('')}</span></span>`
    : `<span class="fs">${ch}</span>`).join('');
}
function setFlip(el, str) {
  str = String(str);
  if (el.dataset.v === undefined || el.dataset.v.length !== str.length) {
    el.innerHTML = flipHTML(str);
    el.dataset.ready = '';
  }
  el.dataset.v = str;
  if (el.dataset.ready === '1') updateFlip(el);
}
function updateFlip(el) {
  const digits = [...el.dataset.v].filter((c) => /\d/.test(c));
  el.querySelectorAll('.col').forEach((c, i) => {
    c.style.transitionDelay = `${i * 0.12}s`;
    c.style.setProperty('--d', digits[i]);
  });
}
function startFlips(root) {
  requestAnimationFrame(() => root.querySelectorAll('.flip').forEach((el) => { el.dataset.ready = '1'; updateFlip(el); }));
}

// ------------------------------------------------------------------ 屏幕里的商品页
function price(o = state.opts, k = state.sel) {
  return Math.round(SPECIES[k].price * GROWTH.plan[o.plan].price * o.qty + (o.delivery === 'priority' ? 48 : 0));
}
const seg = (key, choices) => `<div class="seg" data-key="${key}">${choices.map(([v, t]) =>
  `<button data-v="${v}" class="${String(state.opts[key]) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div>`;

// 每一项定制都对应一项“专利技术”，下面附技术报告
const techBlock = (t, body) => `
  <div class="group tech">
    <div class="tname"><b>${t.tech}</b></div>
    ${body}
    <button class="paper-link" data-paper="${t.paper}">Technical report →</button>
  </div>`;
const productScreen = createProductScreen();
function drawProduct() {
  const k = state.sel, o = state.opts;
  if (!k || state.mode !== 'grow') return;
  productScreen.draw({ mode: 'product', k, opts: o, options: OPTIONS[k], price: price(), base: SPECIES[k].price, x: GROWTH.plan[o.plan].x });
}
function renderProduct() { drawProduct(); }
function renderProductHTML() {
  const k = state.sel, s = SPECIES[k], o = state.opts;
  screenBody.innerHTML = `
    <div class="ptitle head"><h2>${s.title}</h2><b>${gbp(s.price)}</b></div>
    <div class="stats">
      <div class="stat"><div class="flip" data-stat="cycle"></div><span>days · growth cycle</span></div>
      <div class="stat"><div class="flip" data-stat="x"></div><span>cell yield</span></div>
      <div class="stat"><div class="flip" data-stat="kill"></div><span>animals slaughtered</span></div>
    </div>
    <h4>Made for you · ${OPTIONS[k].length} patented technologies</h4>
    ${OPTIONS[k].map((opt) => techBlock(opt, `<label>${opt.label}</label>${seg(opt.key, opt.choices)}`)).join('')}
    <h4>Growth plan</h4>
    <div class="group"><label>Growth cycle</label>${seg('cycle', GROWTH.cycle)}</div>
    ${techBlock(GROWTH, `<label>Yield recipe</label>${seg('plan', Object.entries(GROWTH.plan).map(([v, p]) => [v, p.x > 1 ? `${p.label} ×${p.x}` : p.label]))}`)}
    <h4>Order</h4>
    <div class="group row"><label>Quantity</label>
      <div class="stepper"><button data-qty="-1">−</button><span>${o.qty}</span><button data-qty="1">+</button></div></div>
    <div class="group"><label>Delivery</label>${seg('delivery', [['std', 'Standard'], ['priority', 'Priority +£4.80']])}</div>
    <div class="buybar"><div class="price"><span>${gbp(price())}</span></div><button class="buy">Start growing</button></div>`;
  updateStats();
  applyMeat();
}
function updateStats() {
  drawProduct();
  const o = state.opts;
  const x = GROWTH.plan[o.plan].x;
  screenBody.querySelectorAll('.flip').forEach((el) => {
    const v = { cycle: o.cycle, x: '×' + x, kill: 0 }[el.dataset.stat];
    setFlip(el, v);
  });
  const p = screenBody.querySelector('.price span');
  if (p) p.textContent = gbp(price());
}

screenBody.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const segEl = b.closest('.seg');
  if (segEl) {
    const key = segEl.dataset.key;
    state.opts[key] = key === 'cycle' ? Number(b.dataset.v) : b.dataset.v;
    segEl.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    applyMeat(); updateStats();
    return;
  }
  if (b.dataset.qty) {
    state.opts.qty = THREE.MathUtils.clamp(state.opts.qty + Number(b.dataset.qty), 1, 10);
    b.parentElement.querySelector('span').textContent = state.opts.qty;
    updateStats();
    return;
  }
  if (b.dataset.paper) return openPaper(b.dataset.paper);
  if (b.classList.contains('buy')) placeOrder();
  if (b.dataset.go) location.hash = b.dataset.go;
});

// 技术报告：像一份打印出来的论文
const paperEl = $('#paper');
function openPaper(key) {
  paperEl.querySelector('.sheet .body').innerHTML = paperHTML(key, state.sel);
  paperEl.querySelector('.sheet').scrollTop = 0;
  paperEl.classList.add('on');
}
paperEl.addEventListener('click', (e) => { if (e.target === paperEl || e.target.closest('.close')) paperEl.classList.remove('on'); });
$('#screen .close').addEventListener('click', () => { location.hash = '#/fridge'; });

function placeOrder() {
  const k = state.sel;
  const coupon = state.coupon || 0;
  state.coupon = 0;
  state.order = { species: k, opts: { ...state.opts }, coupon, price: Math.max(0, price() - coupon), no: 'FM-' + Math.floor(1000 + Math.random() * 9000), at: performance.now() / 1000 };
  state.batch = makeBatch(state.order);
  lab?.setBatch(state.batch, state.order.opts);
  hudStatic();
  cartLabel();
  productScreen.draw({ mode: 'ordered', k, no: state.order.no, price: state.order.price, days: state.order.opts.cycle - (state.order.opts.delivery === 'priority' ? 5 : 0) });
  return;
  screenBody.innerHTML = `
    <h2>Now growing</h2>
    <div class="stats">
      <div class="stat"><div class="flip" data-v="">${''}</div><span>days to pick-up</span></div>
    </div>
    <div class="actions">
      <button class="btn" data-go="#/lab/batch">Watch it grow</button>
      <button class="btn primary" data-go="#/checkout">Checkout</button>
    </div>
    <button class="link" data-go="#/">Back to the shop</button>`;
  const f = screenBody.querySelector('.flip');
  delete f.dataset.v;
  setFlip(f, state.order.opts.cycle - (state.order.opts.delivery === 'priority' ? 5 : 0));
  startFlips(screenBody);
}

// ------------------------------------------------------------------ 门店：走近实物（不开窗口）
// 点热点后，镜头真的走到那件东西前面；屏幕类的东西（广告屏、评价平板、结算机、告示）直接在 3D 表面上显示网页内容，
// 货架和摆件旁边用引线标注，像观察室里“你的批次”那样。
// 门店里的走动和仓库、加工间是同一套（nav.js + data.js 里的 ROOM_NAV）
function goStation(id, instant = false) {
  if (instant) return NAV.room.place(id);
  if (state.rfocus) unfocusRoom(true);
  if (NAV.room.station === id) return;
  const link = NAV.room.links().find((l) => l.to === id);
  if (link) NAV.room.step(link);
  else fade(() => NAV.room.place(id), id === 'office' ? 'BACK OFFICE' : 'SHOP FLOOR', 'room');   // 隔着几道弯：不穿墙，转场过去
}
const ROOM_SPOTS = new Set(['brand', 'tasting', 'survey', 'checkout', 'records', 'board', 'donor', 'fridge']);   // 门店里能走近的地方（路由要在门店搭好之前就认得）
// 屏幕表面上的网页：每一帧把这块表面的四个角投影到画面上，再用一个透视矩阵（matrix3d）把网页贴上去。
// 不用嵌套的 3D 场景，是因为那样浏览器算不准点击位置；单层透视变换既跟画面严丝合缝，按钮也点得准。
const cssLayer = document.createElement('div');
cssLayer.id = 'css3d';
document.body.appendChild(cssLayer);
const css = { domElement: cssLayer, setSize() {} };
const cssItems = [];
function cssSurface(el, mesh, k, offset) {
  el.style.display = 'none';
  cssLayer.appendChild(el);
  const w = parseFloat(el.style.width) || el.offsetWidth, h = parseFloat(el.style.height) || el.offsetHeight;
  const W = w * k, H = h * k, [ox, oy, oz] = offset;
  const corners = [[-W / 2, H / 2], [W / 2, H / 2], [W / 2, -H / 2], [-W / 2, -H / 2]].map(([x, y]) => new THREE.Vector3(ox + x, oy + y, oz));
  const item = { el, mesh, w, h, corners, visible: false };
  cssItems.push(item);
  return item;
}
// 四点透视映射（把 w×h 的矩形映射到屏幕上的四个点）
const adj = (m) => [m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
  m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
  m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3]];
const mmul = (a, b) => { const c = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let v = 0; for (let k = 0; k < 3; k++) v += a[3 * i + k] * b[3 * k + j]; c[3 * i + j] = v; } return c; };
const mv = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
function basis(p) {
  const m = [p[0][0], p[1][0], p[2][0], p[0][1], p[1][1], p[2][1], 1, 1, 1];
  const v = mv(adj(m), [p[3][0], p[3][1], 1]);
  return mmul(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
}
function homography(w, h, dst) {
  const t = mmul(basis(dst), adj(basis([[0, 0], [w, 0], [w, h], [0, h]])));
  for (let i = 0; i < 9; i++) t[i] /= t[8];
  return `matrix3d(${t[0]},${t[3]},0,${t[6]},${t[1]},${t[4]},0,${t[7]},0,0,1,0,${t[2]},${t[5]},0,${t[8]})`;
}
const surfaces = {};
let receiptObj = null;
function mountRoomSurfaces() {
for (const [id, sp] of Object.entries(room.spots)) {
  if (!sp.surface) continue;
  const { mesh, w, h, size } = sp.surface;
  const el = document.createElement('div');
  el.className = 'surf surf-' + id;
  el.style.width = w + 'px'; el.style.height = h + 'px';
  surfaces[id] = { obj: cssSurface(el, mesh, size / w, [0, 0, 0.0015]), el };
}
mountReceipt();
}
// 结算机的小票：从出票口一点点吐出来
const receiptEl = document.createElement('div');
receiptEl.className = 'receipt3d';
receiptEl.style.width = '180px'; receiptEl.style.height = '300px';
function mountReceipt() { receiptObj = cssSurface(receiptEl, room.slot, 0.09 / 180, [0, -0.075, 0.002]); }
const cv = new THREE.Vector3();
function renderCSS() {
  for (const it of cssItems) {
    if (!it.visible) { if (it.el.style.display !== 'none') it.el.style.display = 'none'; continue; }
    let behind = false;
    const pts = it.corners.map((c) => {
      cv.copy(c).applyMatrix4(it.mesh.matrixWorld);
      const p = project(cv);
      behind ||= p.behind;
      return [p.x, p.y];
    });
    it.el.style.display = behind ? 'none' : '';
    if (!behind) it.el.style.transform = homography(it.w, it.h, pts);
  }
}

const calloutLayer = $('#callouts');
const calloutLines = $('#callouts svg');
let callouts = [];
// 拿起来看
const inspector = createInspector({
  camera,
  getScene: () => placeOf(state.view)?.scene,
  getLight: () => FOCUS_LIGHT[state.view],
  loadTextures: loadTexturesOf,
  compile: (o) => { const sc = placeOf(state.view)?.scene; return sc ? renderer.compileAsync(o, camera, sc).catch(() => {}) : null; },
  onOpen: () => { document.body.classList.add('inspecting'); hoverOff(); },
  onClose: () => document.body.classList.remove('inspecting'),
});
function showCallouts(list) {
  const box = calloutLayer.querySelector('.boxes');
  inspector.prepare(list.filter((c) => c.item).map((c) => c.item), { order: state.order });
  box.innerHTML = list.map((c, i) => `<button class="pin" data-i="${i}" aria-label="${c.title}"><span class="dot"></span><span class="title">${c.title}</span></button>`).join('');
  callouts = list.map((c, i) => {
    const el = box.children[i], v = new THREE.Vector3(...c.at);
    el.addEventListener('pointerenter', () => hoverOn(el, v, 0.5));
    el.addEventListener('pointerleave', () => hoverOff(el));
    el.addEventListener('click', () => { if (c.act) { placeOf(state.view)?.onAction?.(c.act); setMarquee(c.title + ' · '); } else if (c.action) location.hash = c.action[1]; else if (c.item) { hoverOff(el); inspector.open(c.item, v, c.title, { order: state.order }); } });
    return { c, el, v };
  });
  calloutLayer.classList.add('on');
}
// 点标题 = 凑近看那一样（再点一下退回来）：只转头和收一点视角，人不动
let inspected = null;
function inspect(el, at) {
  const same = inspected?.el === el, L = LOOKS[state.view]?.l;
  if (inspected) inspected.el.classList.remove('sel');
  if (FC.on && FC.view === state.view) {
    FC.look = same ? null : new THREE.Vector3(...at);
  } else if (L) {
    const from = inspected?.back || { yaw: L.tYaw, pitch: L.tPitch, fov: L.fov };
    const aim = same ? from : { ...toYawPitch(at, LOOKS[state.view].eye), fov: Math.max(20, from.fov * 0.62) };
    gsap.to(L, { tYaw: wrapNear(aim.yaw, L.tYaw), tPitch: aim.pitch, fov: aim.fov, duration: 1.3, ease: 'sine.inOut', overwrite: true });
    if (!same) { inspected = { el, back: from }; el.classList.add('sel'); return; }
  }
  inspected = same ? null : { el };
  if (!same) el.classList.add('sel');
}
function updateCallouts() {
  const placed = [];
  for (const { el, v } of callouts) {
    const p = project(v);
    let y = p.y;
    for (const q of placed) if (Math.abs(q.x - p.x) < 170 && Math.abs(q.y - y) < 40) y = q.y + 40;
    placed.push({ x: p.x, y });
    el.style.transform = `translate(${p.x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    el.classList.toggle('flip', p.x > innerWidth - 170);
    el.classList.toggle('hidden', p.behind);
  }
}

// 各个屏幕表面上的内容
let filmTimer = null, stopPromo = null;
const SURF = {
  brand(el) {
    el.innerHTML = `<div class="film">
      ${BRAND_FILM.map((f, i) => `<div class="slide${i ? '' : ' on'}${f.poster ? ' img' : ''}" ${f.poster ? `style="background-image:url(${PH.photos[f.poster]})"` : ''}>
        <div class="big">${f.big}${f.unit ? `<small>${f.unit}</small>` : ''}</div><div class="small">${f.small}</div></div>`).join('')}
      <div class="logo">FUTURE MEAT MARKET</div>
      <canvas class="promo"></canvas>
      <button class="skip" disabled>5</button>
      <div class="bar"><i></i></div></div>`;
    let slide = 0, count = 5;
    const film = el.querySelector('.film'), promo = el.querySelector('.promo');
    const slides = el.querySelectorAll('.slide'), skip = el.querySelector('.skip'), bar = el.querySelector('.bar i');
    const show = (n) => { slide = n; slides.forEach((s, i) => s.classList.toggle('on', i === n)); bar.style.width = ((n + 1) / slides.length * 100) + '%'; };
    show(0);
    clearInterval(filmTimer);
    let tick = 0, inPromo = false;
    // 广告四页播完（或者点了跳过）→ 播那段小动画 → 再从头放广告
    const restart = () => { inPromo = false; film.classList.remove('promoing'); count = 5; tick = 0; show(0); skip.disabled = true; skip.textContent = '5'; };
    const toPromo = () => {
      if (inPromo) return;
      inPromo = true; film.classList.add('promoing'); skip.disabled = true; skip.textContent = '';
      stopPromo?.(); stopPromo = playPromo(promo, { onEnd: () => { if (promo.isConnected) restart(); } });
    };
    filmTimer = setInterval(() => {
      if (inPromo) return;
      tick++;
      if (tick % 3 === 0) { if (slide === slides.length - 1) return toPromo(); show(slide + 1); }
      count--;
      // 倒数到 0 才能跳过
      if (count > 0) { skip.disabled = true; skip.textContent = `${count}`; }
      else { skip.disabled = false; skip.textContent = 'Skip ›'; }
    }, 1000);
    skip.onclick = () => toPromo();
  },
  survey(el) {
    el.innerHTML = `<form class="tab">
      <div class="th"><b>Pan-seared cultivated steak</b></div>
      <div class="q"><label>Rate the texture</label><div class="stars">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}">★</button>`).join('')}</div></div>
      <div class="q"><label>Compared with a regular steak</label><div class="seg"><button type="button">Can't tell</button><button type="button">Better</button><button type="button">Not as good</button></div></div>
      <div class="q"><label>What would you pay for 200 g?</label><div class="range"><input type="range" min="40" max="200" step="2" value="120" aria-label="Price"><b>£12.00</b></div></div>
      <button class="submit" type="submit">Submit · get a £3.00 coupon</button>
    </form>`;
  },
  checkout(el) {
    const o = state.order, lines = [];
    for (const b of state.basket) lines.push([`${NAME_EN[b.k]} · ${b.grams} g · ready-made`, gbp(b.price)]);
    if (o) {
      lines.push([`${NAME_EN[o.species]} × ${o.opts.qty} · grown to order`, gbp(Math.round(SPECIES[o.species].price * GROWTH.plan[o.opts.plan].price * o.opts.qty))]);
      lines.push(['Grow plan', `${o.opts.cycle} days · ${PLAN_EN[o.opts.plan]}`]);
      if (o.opts.delivery === 'priority') lines.push(['Priority delivery', '£4.80']);
      if (o.boost) lines.push(['Growth boost ×1.5', '£2.80']);
      if (o.coupon) lines.push(['New customer coupon', '-' + gbp(o.coupon)]);
    }
    const total = (o ? o.price : 0) + state.basket.reduce((a, b) => a + b.price, 0), no = o ? o.no : 'FM-' + (1000 + state.basket.length * 137 % 9000);
    el.innerHTML = `<div class="kiosk">
      <div class="kh"><span>SELF CHECKOUT</span><span>ORDER ${no}</span></div>
      <div class="kl">${lines.map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join('')}</div>
      <div class="kt"><span>TOTAL</span><b>${gbp(total)}</b></div>
      <button class="pay">PAY NOW</button>
    </div>`;
    const ids = [...new Set([...state.basket.map((b) => b.k), ...(o ? [o.species] : [])])].map((k) => SPECIES[k].id).join(' · ');
    receiptEl.innerHTML = `<div class="paper">
      <div class="rh">FUTURE MEAT MARKET<br>${new Date().toLocaleString('en-GB', { hour12: false })}</div>
      ${lines.map(([a, b]) => `<div class="rl"><span>${a}</span><span>${b}</span></div>`).join('')}
      <div class="rl t"><span>TOTAL</span><span>${gbp(total)}</span></div>
      <div class="rf">CELL LINE ${ids}<br>NO SLAUGHTER · THANK YOU<br>Encl.: certificate of biological ownership ×1</div></div>`;
    state.payNo = no;
  },
  donor(el) {
    el.innerHTML = `<div class="flyer3d">
      <h3>Our donor animals</h3>
      <div class="pols">${ORDER.map((k) => `
        <button class="pol" data-donor="${k}"><span class="in">
          <span class="front"><span class="ph" style="background-image:url(${PH.photos[k]})"></span><b>${SPECIES[k].id}</b></span>
          <span class="back">${DONOR_STEPS.map(([t]) => `<b>${t}</b>`).join('')}</span>
        </span></button>`).join('')}</div>
      <button class="more" data-go="#/lab">Visit the processing hall →</button>
    </div>`;
  },
};

// 每个热点走近之后要显示什么
function openRoomUI(id) {
  const sp = room.spots[id];
  if (id === 'fridge') {
    document.body.classList.add('at-fridge');
    if (pendingProduct) { const [a, b] = pendingProduct; pendingProduct = null; fridgeRoute(a, b); }
    else if (firstFridge) { firstFridge = false; showTutorial('', '', 'tap'); }
    return;
  }
  if (surfaces[id]) { SURF[id](surfaces[id].el); surfaces[id].obj.visible = true; }
  let list = (CALLOUTS[id] || []).slice();
  if (id === 'tasting') list.push({ at: room.spots.survey.at, title: 'Rating tablet', action: ['', '#/survey'] });
  if (list.length) showCallouts(list);
}
function closeRoomUI() {
  holdPad(false);
  inspector.close();
  document.body.classList.remove('at-fridge');
  if (state.sel) closeProduct(true);
  if (state.fscreen) { restoreKiosk(); document.body.classList.remove('product-open'); }
  for (const it of cssItems) { it.visible = false; it.el.style.display = 'none'; }
  receiptEl.classList.remove('print');
  clearInterval(filmTimer);
  stopPromo?.(); stopPromo = null;
  calloutLayer.classList.remove('on');
  inspected = null;
  callouts = [];
  calloutLines.innerHTML = '';
  resetFigurines();
}
let roomTimer;
const wrapNear = (yaw, ref) => { while (yaw - ref > 180) yaw -= 360; while (yaw - ref < -180) yaw += 360; return yaw; };
function walkTo(eye, aim, fov, done) {
  roomMove?.kill();
  roomMove = humanMove(look, ROOM_EYE, eye, aim, fov, done);
  return roomMove.duration();
}
function focusRoom(id) {
  const sp = room.spots[id];
  if (!sp || state.rfocus === id) return;
  hideTutorial();
  closeRoomUI();
  state.rfocus = id;
  document.body.classList.add('room-focus');
  updateBack();
  NAV.room.stop();
  const seconds = walkTo(sp.eye, sp.at, sp.fov);
  clearTimeout(roomTimer);
  roomTimer = setTimeout(() => { if (state.rfocus === id) openRoomUI(id); }, seconds * 1000 + 100);
  const h = HOTSPOTS.find((x) => x.route === id);
  setMarquee(h ? titleOf(h) + ' · ' : MARQUEE);
}
function unfocusRoom(instant = false) {
  closeRoomUI();
  clearTimeout(roomTimer);
  if (!state.rfocus) return;
  state.rfocus = null;
  room?.ledger.hover(0);
  canvas.style.cursor = '';
  document.body.classList.remove('room-focus');
  updateBack();
  const { home } = NAV.room;
  if (instant) { roomMove?.kill(); ROOM_EYE.copy(home.eye); look.fov = home.fov; Object.assign(look, { yaw: home.yaw, tYaw: home.yaw, pitch: home.pitch, tPitch: home.pitch }); return; }
  walkTo(home.eye.toArray(), { yaw: home.yaw, pitch: home.pitch }, home.fov);
  setMarquee();
}

// 陶瓷摆件：翻过来，底座底部印着供体编号
function resetFigurines() {
  if (!room) return;
  for (const f of room.figurines) {
    gsap.to(f.pivot.position, { y: 0.12, duration: 0.6 });
    gsap.to(f.pivot.rotation, { y: 0, z: 0, duration: 0.6 });
    f.up = false;
  }
}
function flipFigurine(i, btn) {
  const f = room.figurines[i];
  f.up = !f.up;
  gsap.to(f.pivot.position, { y: f.up ? 0.34 : 0.12, duration: 0.9, ease: 'power2.inOut' });
  gsap.to(f.pivot.rotation, { y: f.up ? -0.9 : 0, z: f.up ? Math.PI / 2 : 0, duration: 0.9, ease: 'power2.inOut' });
  btn.textContent = f.up ? 'Put it back' : 'Turn it over';
  const note = btn.nextElementSibling;
  note.innerHTML = f.up ? `Printed underneath: this series honours our first donors · <b>${CERAMIC_BASE[i][0]}</b>` : '';
}

$('#callouts').addEventListener('click', (e) => {
  const buy = e.target.closest('[data-buy]');
  if (buy) { buy.textContent = 'Added ✓'; buy.disabled = true; return toast('Added'); }
  const fl = e.target.closest('[data-flip]');
  if (fl) return flipFigurine(+fl.dataset.flip, fl);
  const go = e.target.closest('[data-go]');
  if (go) location.hash = go.dataset.go;
});
css.domElement.addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]');
  if (go) { location.hash = go.dataset.go; return; }
  const star = e.target.closest('[data-star]');
  if (star) { star.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('on', +b.dataset.star <= +star.dataset.star)); return; }
  const segB = e.target.closest('.seg button');
  if (segB) { segB.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === segB)); return; }
  const pol = e.target.closest('[data-donor]');
  if (pol) { pol.classList.toggle('flip'); return; }
  if (e.target.closest('.pay')) return pay();
});
css.domElement.addEventListener('input', (e) => {
  if (e.target.type === 'range') e.target.nextElementSibling.textContent = gbp(e.target.value);
});
css.domElement.addEventListener('submit', (e) => {
  e.preventDefault();
  state.coupon = 30;
  e.target.innerHTML = `<div class="th"><span>THANK YOU</span><b>Thanks for your feedback!</b></div>
    <p class="ok big">£3.00</p>
    <div class="acts"><button type="button" class="submit" data-go="#/fridge">Pick one at the fridge</button><button type="button" data-go="#/">Keep looking</button></div>`;
});
// 结算：屏幕上换成证书，小票从出票口吐出来
function pay() {
  const s = SPECIES[state.order?.species || state.basket[0]?.k || 'beef'];
  surfaces.checkout.el.innerHTML = `<div class="kiosk cert3d">
    <div class="kh"><span>PAYMENT OK · ${state.payNo || ''}</span><span class="seal">VERIFIED</span></div>
    <h4>Certificate of Biological Ownership<small>issued with every purchase</small></h4>
    <table>
      <tr><td>Custody of cell samples</td><td>Future Meat Market</td></tr>
      <tr><td>Use of derived cells</td><td>Future Meat Market</td></tr>
      <tr><td>Display of source information</td><td>Future Meat Market</td></tr>
      <tr><td>Ownership of the product</td><td>You (customer)</td></tr>
    </table>
    <div class="cs"><div><span>Human Control</span><b>100%</b></div><div class="red"><span>Animal Agency</span><b>0%</b></div><div class="red"><span>Animal Consent</span><b>N/A</b></div></div>
    <div class="sg"><div><b>Future Meat</b>Producer</div><div><b>You</b>Buyer</div><div class="empty"><b>${s.id}</b>No signature field</div></div>
  </div>`;
  receiptObj.visible = true;
  requestAnimationFrame(() => receiptEl.classList.add('print'));
}

// ------------------------------------------------------------------ 观察室：数据化标注层（你的批次）
const hud = $('#hud');
for (const box of hud.querySelectorAll('[data-anchor]')) {                    // 指着哪一格数据，罐子上对应的那个部位就亮
  box.addEventListener('pointerenter', () => { if (lab) hoverOn(box, lab.anchor(box.dataset.anchor), 0.12); });
  box.addEventListener('pointerleave', () => hoverOff(box));
}
const hudLines = $('#hud svg.lines');
const hudCache = {};
const pad = (n) => String(n).padStart(2, '0');
function setH(key, html) {
  if (hudCache[key] === html) return;
  hudCache[key] = html;
  hud.querySelector(`[data-h="${key}"]`).innerHTML = html;
}
function hudStatic() {
  const b = state.batch, s = SPECIES[b.species];
  setH('title', `${b.name ? `“${b.name}”` : b.demo ? 'Demo batch' : 'Your batch'}<em>${s.title}</em>`);
  setH('sub', b.demo ? 'Once you order, this becomes your own batch' : `Order ${b.no} · cell line ${s.id}`);
  setH('k', sci(1.2e7 * b.x));
  setH('src', `
    <div><span>Cell line</span><b>${b.cell}</b></div>
    <div><span>Passage</span><b>P${b.passage}</b></div>
    <div><span>Line in use since</span><b>${b.since}</b></div>
    <div><span>Donor</span><b class="redact" data-redact>████████</b></div>
    <div><span>Collection method</span><b class="redact" data-redact>██████</b></div>
    <div><span>Donor status</span><b class="redact" data-redact>███████</b></div>`);
}
hudStatic();
let lastHud = 0;
function updateHud(t, r) {
  const b = state.batch;
  if (t - lastHud < 0.2) return;
  lastHud = t;
  setH('day', `${pad(r.day)}<small> / ${b.cycle} days</small>`);
  hud.querySelector('[data-h="pbar"]').style.width = (r.p * 100).toFixed(1) + '%';
  setH('status', r.done ? r.status : `${r.status} · ready in about ${r.eta} days`);
  setH('density', sci(r.N));
  setH('via', `${r.viability.toFixed(1)}<small> %</small>`);
  setH('grams', `Expected yield ${r.grams} g`);
  setH('env', [['Temp', r.temp.toFixed(1) + ' ℃'], ['pH', r.ph.toFixed(2)], ['Dissolved O₂', r.oxygen.toFixed(0) + ' %'],
    ['Glucose', r.glucose.toFixed(1) + ' g/L'], ['Lactate', r.lactate.toFixed(1) + ' g/L']]
    .map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join(''));
  setH('mu', r.done ? '—' : `${r.muH.toFixed(3)}<small> /h</small>`);
  setH('dbl', r.done ? 'No longer dividing' : `Doubling time ${r.doubling.toFixed(1)} h · −${Math.max(0, r.drop)}% from peak`);
  const cv = curve(b, 44);
  const pts = cv.map((v, i) => `${(i / 44 * 220).toFixed(1)},${(56 - v * 50).toFixed(1)}`).join(' ');
  const n = Math.round(r.p * 44);
  setH('curve', `<polyline class="all" points="${pts}"/><polyline class="done" points="${pts.split(' ').slice(0, n + 1).join(' ')}"/>
    <rect x="${(r.p * 220 - 3).toFixed(1)}" y="${(56 - r.f * 50 - 3).toFixed(1)}" width="6" height="6"/>`);
  // 商家视角：增长放缓的那一刻，就是推销加速包的时机
  let up = '';
  if (r.done) up = state.order ? `<b>Ready to harvest</b><button data-act="checkout">Checkout →</button>` : '';
  else if (b.boost > 1) up = `<b>Boosted ×1.5</b>`;
  else if (r.drop >= 30) up = `<b>−${r.drop}%</b><button data-act="boost">Boost now · £2.80</button>`;
  setH('upsell', up);
  hud.querySelector('[data-act="boost"]').disabled = b.boost > 1 || r.done;
}
function updateHudLines() {
  let html = '';
  hud.querySelectorAll('.hbox[data-anchor]').forEach((el) => {
    const a = project(lab.anchor(el.dataset.anchor));
    const rc = el.getBoundingClientRect();
    const left = el.parentElement.classList.contains('l');
    const bx = left ? rc.right : rc.left, by = rc.top + 15;
    const ex = bx + (left ? 34 : -34);
    html += `<path d="M${a.x.toFixed(1)},${a.y.toFixed(1)} L${ex.toFixed(1)},${by.toFixed(1)} L${bx.toFixed(1)},${by.toFixed(1)}"/>`
      + `<rect x="${(a.x - 3.5).toFixed(1)}" y="${(a.y - 3.5).toFixed(1)}" width="7" height="7"/><circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="2.5"/>`;
  });
  hudLines.innerHTML = html;
}
hud.addEventListener('click', (e) => {
  { const red = e.target.closest('[data-redact]'); if (red) return deny(red); }
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (act === 'boost') {
    if (!state.order) return toast('Place an order first');
    if (state.batch.boost > 1) return;
    state.batch.boost = 1.5;
    state.order.boost = true;
    state.order.price += 28;
    toast('Boosted ×1.5');
  }
  if (act === 'checkout') location.hash = '#/checkout';
});

// ------------------------------------------------------------------ 观察室：右侧数据面板（车间、细胞库、须知、数据墙）
const labPanel = $('#labpanel');
const labPanelBody = $('#labpanel .body');
const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
// 面板只留标题：要表达的交给图形、按钮和指上去的反应
const SIGN = (inner) => `<svg viewBox="0 0 48 48" aria-hidden="true">${inner}</svg>`;
const LAB_PANELS = {
  hall: () => `
    <h2>Processing room</h2>
    <div class="bednav beds">${lab.beds.map((d, i) => `<button data-bed="${i}">${String(i + 1).padStart(2, '0')}<small>${d.id}</small></button>`).join('')}</div>`,
  cellbank: () => `
    <h2>Cell bank</h2>
    <div class="vault">${[88, 64, 76, 52, 70].map((w) => `<button class="redact" data-redact style="width:${w}%" aria-label="Redacted"></button>`).join('')}</div>
    <button class="lbtn" data-act="apply">Request a visit</button>
    <div class="reply"></div>`,
  tank: () => tankPanel(),
  data: () => `<h2>Growth data wall</h2>`,
};
// 车间里每一座罐：BR-02 是你的批次，其余是别人的订单
let selTank = null;
function tankPanel() {
  const t = lab.tanks[selTank], i = selTank;
  const mine = !t.tissue && t.name === 'BR-02';
  const p = t.tissue ? 1 : mine ? readout(state.batch, clock.elapsedTime).p : (((i * 7 + 3) % 26) + 1) / 28;
  return `
    <h2>${t.tissue ? t.tissue[0] : SPECIES[mine ? state.batch.species : ORDER[(i * 3 + 1) % 4]].title}</h2>
    <svg class="gauge" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50"/><circle class="v" cx="60" cy="60" r="50" pathLength="1" style="stroke-dashoffset:${(1 - p).toFixed(3)}"/></svg>`;
}
let tankEls = [], bedEls = [];
function mountLabTags() {
tankEls = lab.tanks.map((t, i) => {
  const el = document.createElement('button');
  el.className = 'tk';
  el.innerHTML = `<i></i><span>${t.name}</span>`;
  el.addEventListener('click', () => { selTank = i; openLabPanel('tank'); });
  $('#tankspots').appendChild(el);
  return { el, v: t.pos };
});
// 采样床：在车间视角里给每张床一个编号标签，点了就走近
bedEls = lab.beds.map((b, i) => {
  const el = document.createElement('button');
  el.className = 'tk bedtag';
  el.innerHTML = `<i></i><span>${b.id}</span>`;
  el.addEventListener('click', () => { location.hash = '#/lab/bed' + i; });
  $('#tankspots').appendChild(el);
  return { el, v: new THREE.Vector3(b.x, 1.62, -4.3 - LAB_DEEP) };
});
}
function openLabPanel(kind) {
  labPanel.dataset.kind = kind;
  labPanelBody.innerHTML = LAB_PANELS[kind]();
  labPanel.classList.add('on');
}
labPanel.addEventListener('click', (e) => {
  { const red = e.target.closest('[data-redact]'); if (red) return deny(red); }
  if (e.target.closest('[data-act="tanks"]')) return openLabPanel('hall');
  const gb = e.target.closest('[data-bed]');
  if (gb) { location.hash = '#/lab/bed' + gb.dataset.bed; return; }
  const gl = e.target.closest('[data-lab]');
  if (gl) { location.hash = '#/lab/' + gl.dataset.lab; return; }
  const b = e.target.closest('[data-act="apply"]');
  if (!b) return;
  b.disabled = true; b.textContent = 'Submitted';
  labPanelBody.querySelector('.reply').innerHTML = 'Request submitted. We will contact you within 7–15 working days.';
});
$('#labpanel .close').addEventListener('click', () => { location.hash = '#/' + labParent(); });
// 一进加工间先选：贴着玻璃看，或者自己在参观廊里走。只有两个词，不写说明
labChoice = document.createElement('nav');
labChoice.id = 'labchoice';
labChoice.innerHTML = '<button data-go="glass">Look through the glass</button><button data-go="walk">Walk the gallery</button>';
document.body.appendChild(labChoice);
labChoice.addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]')?.dataset.go;
  if (!go) return;
  labChoice.classList.remove('on');
  labChosen = true;
  if (go === 'glass') location.hash = '#/lab/glass';
});
// 贴着玻璃时底下只有一个按钮：拉开 / 拉上帘子（直接点帘子上那个标签也一样）
const labDraw = document.createElement('button');
labDraw.id = 'labdraw';
document.body.appendChild(labDraw);
labDraw.addEventListener('click', () => { location.hash = state.focus === 'ward' ? '#/lab/glass' : '#/lab/ward'; });
function updateLabControls() {
  document.body.classList.toggle('lab-staged', state.view === 'lab' && (state.focus === 'glass' || state.focus === 'ward'));
  const on = state.view === 'lab' && (state.focus === 'glass' || state.focus === 'ward') && !(FC.on && FC.blend < 0.6);
  labDraw.classList.toggle('on', on);
  if (!on) return;
  const text = state.focus === 'ward' ? 'Close the curtain' : 'Open the curtain';
  if (labDraw.textContent !== text) labDraw.textContent = text;
}
let focusTimer;
function closeLabUI() {
  hideInfo();
  hud.classList.remove('on');
  labPanel.classList.remove('on');
  lab?.setScan(false);
  lab?.notice.leave(); lab?.kiosk.focus(false);
  hideInfo();
}
// 观察室里的镜头移动：眼睛从 LAB_EYE 现在的位置走到 eye，一路盯着 at。
// 批次、数据墙、须知、终端在参观廊里看；床、工作台、回收角、高位罐各有自己可以拖动的镜头（LAB_HOTSPOTS 里的 view）。
function walkLab(eye, aim, fov, done) {
  labWalk?.kill();
  labWalk = humanMove(labLook, LAB_EYE, eye, aim, fov, done);
  return labWalk.duration();
}
// 加工间一幕一幕地看：门口 → 贴着玻璃看实验台和培养肉 → 拉开帘子看病床 → 再凑近看某一样；返回就倒着退一幕
const LAB_GLASS = new Set(['batch', 'bench']);
const LAB_WARD = new Set(['bed0', 'bed1', 'bed2', 'bed3', 'bed4', 'vessels', 'returns', 'tank']);
const labStage = () => (!state.focus ? 'walk' : state.focus === 'glass' || state.focus === 'ward' ? state.focus : 'close');
const labParent = () => (LAB_WARD.has(state.focus) ? 'lab/ward' : LAB_GLASS.has(state.focus) || state.focus === 'ward' ? 'lab/glass' : 'lab');
function focusLab(sub) {
  const h = LAB_HOTSPOTS.find((x) => x.id === sub && x.view), f = LAB_FOCUS[sub];
  if (!h && !f) return unfocusLab();
  if (state.focus === sub) return;
  if (labChoice) labChoice.classList.remove('on');
  labChosen = true;
  lab.setCurtain(sub === 'ward' || sub === 'hall' || LAB_WARD.has(sub));
  hideTutorial();
  closeLabUI();
  NAV.lab.stop();
  labWalk?.kill();
  state.focus = sub;
  document.body.classList.add('lab-focus');
  updateBack();
  clearTimeout(focusTimer);
  setMarquee(titleOf(LAB_HOTSPOTS.find((x) => x.id === sub)) + ' · ');
  if (h) { const d = fcStart(h); if (h.info) focusTimer = setTimeout(() => { if (state.focus === sub) showCallouts(h.info); }, d * 1000); return; }   // 换镜头；有能拿起来看的东西就标出来
  if (FC.on) {                                                             // 从一个近看镜头直接切过来：从镜头现在的位置走
    fcEnd(null, true);
    const d = camera.getWorldDirection(new THREE.Vector3()), yaw = THREE.MathUtils.radToDeg(Math.atan2(d.x, -d.z)), pitch = THREE.MathUtils.radToDeg(Math.asin(d.y));
    LAB_EYE.copy(camera.position);
    Object.assign(labLook, { yaw, tYaw: yaw, pitch, tPitch: pitch, fov: camera.fov });
  }
  const at = f.at || lab.anchor('center').toArray();
  const seconds = walkLab(f.eye || LAB_HOME.toArray(), at, f.fov);
  focusTimer = setTimeout(() => {
    if (state.focus !== sub) return;
    if (sub === 'batch') { hud.classList.add('on'); lab.setScan(true); } else if (sub === 'ask') lab.kiosk.focus(true); else if (sub !== 'notice') openLabPanel(sub);
  }, seconds * 1000);
}
function unfocusLab(instant = false) {
  const { home } = NAV.lab;
  if (lab) lab.setCurtain(false, instant);
  closeLabUI();
  clearTimeout(focusTimer);
  if (instant) {
    NAV.lab.stop(); labWalk?.kill();
    if (FC.view === 'lab') fcEnd(null, true);
    LAB_EYE.copy(home.eye);
  }
  if (!state.focus) return;
  state.focus = null;
  document.body.classList.remove('lab-focus');
  updateBack();
  if (instant) return;
  if (FC.on) fcEnd(home);                                                  // 回到走廊里原来站的那个点位，而不是回到入口
  else walkLab(home.eye.toArray(), { yaw: home.yaw, pitch: home.pitch }, home.fov);
  setMarquee(LAB_MARQUEE);
}
function updateBack() {
  $('#back span:last-child').textContent = atFridge() && (state.sel || state.fscreen) ? 'Meat fridge' : state.sfocus ? (state.view === 'street' ? 'Street' : 'Storage') : state.view === 'lab' && state.focus ? ({ 'lab/ward': 'Beds', 'lab/glass': 'Lab bench' }[labParent()] || 'Gallery') : state.rfocus === 'survey' ? 'Tasting' : state.view === 'room' && !state.rfocus ? 'Outside' : 'Shop';
}

// ------------------------------------------------------------------ 引导与提示
let tutorialTimer;
// 点了不给看的东西：不解释，它自己晃一下
function deny(el) { el.classList.remove('deny'); void el.offsetWidth; el.classList.add('deny'); }
function showTutorial(big, small, icon) {
  const t = $('#tutorial');
  t.querySelector('.big').textContent = big;
  t.querySelector('.small').textContent = small;
  t.dataset.icon = icon;
  t.classList.add('on');
  clearTimeout(tutorialTimer);
  tutorialTimer = setTimeout(hideTutorial, 5000);
}
function hideTutorial() { $('#tutorial').classList.remove('on'); }
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2600);
}

// ------------------------------------------------------------------ 路由（每个商品都有自己的链接）
let firstRoom = true, firstFridge = true, firstLab = true, firstStreet = true, firstWh = true;
// 一次只让一处地方留在内存里（门店和冷柜算一处）：走去另一处时，盖上转场以后整页换一次。
// 只在原地释放的话，走完一圈会攒到 2.4 GB；整页换，浏览器才会真的全还回去。订单、批次和看过的引导跟着带过去
const areaOf = (view) => (view === 'fridge' ? 'room' : view);
const otherPlaceBuilt = (view) => Object.keys(building).some((v) => areaOf(v) !== areaOf(view));
function moveOn() {
  store.set('carry', JSON.stringify({ from: state.view, order: state.order, basket: state.basket, age: state.order ? performance.now() / 1000 - state.order.at : 0,
    batch: state.batch, coupon: state.coupon || 0, seen: [firstRoom, firstFridge, firstLab, firstStreet, firstWh] }));
  if (!store.get('carry')) return false;                                     // 隐私模式存不下：就留在这一页里
  location.reload();
  return true;
}
let cameFrom = '';
function arriveWith() {
  const raw = store.get('carry');
  if (!raw) return;
  store.set('carry', '');
  const c = JSON.parse(raw);
  cameFrom = c.from;
  state.batch = c.batch;
  state.coupon = c.coupon;
  [firstRoom, firstFridge, firstLab, firstStreet, firstWh] = c.seen;
  state.basket = c.basket || [];
  if (!c.order) { cartLabel(); return; }
  state.order = { ...c.order, at: performance.now() / 1000 - c.age };
  cartLabel();
  hudStatic();
}
// 转场：遮罩盖上 → 牛排线稿画出来、填色（这时在后面切场景）→ 一刀斜着切过去 → 遮罩揭开
let fadeTimer = 0;
// 进一个场景之前先备齐（贴图、着色器、显存），备齐了才揭开：不会先看到一屋子白模
const prepareScene = createPreparer(renderer, camera, postTarget);
let preparing = 0, settledAt = 0, fadeTok = 0;
const readyViews = new Set();                                                // 没备过的场景不画：直接画第一帧就是十几秒的卡死
async function prepareView(view, onProgress) {
  preparing++;
  try {
    await buildPlace(view, (p, l) => onProgress?.(p * 0.35, l));
    const S = placeOf(view);
    if (S.load) await S.load();
    if ((view === 'street' || view === 'warehouse' || view === 'room') && !S.batched) { S.batched = true; await breathe(); batchStatic(S.scene); await breathe(); }   // 不会动的小件合并了再上显卡
    const [hdri, strength] = HDRI[view], e = await envFrom(hdri, renderer);
    if (e) { S.scene.environment = e; S.scene.environmentIntensity = strength; }
    await prepareScene(S.scene, (p, l) => onProgress?.(0.35 + 0.65 * p, l));
    readyViews.add(view);
  } finally {
    preparing--;
    settledAt = performance.now();
  }
}
// 分辨率跟着这台电脑的本事走：先按屏幕原生像素画，卡了才一档一档降，有余力就升回来。
//   降一档也没变快（卡在别处，或者浏览器自己锁了帧率）就马上升回去，不白白变糊；窗口不在前面时不算数。
const LEVELS = [1, 0.87, 0.76, 0.66, 0.56];
const FPS = { frames: 0, from: 0, level: 0, before: 0, locked: !FX || !!store.get('lowgfx'), climbs: 0, slow: 0 };
function setLevel(n, now) { FPS.level = n; quality.scale = LEVELS[n]; resize(); settledAt = now; }
function watchFps() {
  const now = performance.now();
  if (document.hidden || !document.hasFocus() || preparing || now - settledAt < 2500 || now - FPS.from > 6000) { FPS.frames = 0; FPS.from = now; return; }
  FPS.frames++;
  if (now - FPS.from < 2500 || FPS.locked) return;
  const fps = (FPS.frames * 1000) / (now - FPS.from);
  FPS.frames = 0; FPS.from = now;
  if (FPS.before) {                                                           // 刚降过一档：看值不值
    const gained = fps >= FPS.before * 1.06;
    FPS.before = 0;
    if (!gained) { FPS.locked = true; return setLevel(FPS.level - 1, now); }
  }
  FPS.slow = fps < 30 ? FPS.slow + 1 : 0;
  if (FPS.slow >= 2 && FPS.level < LEVELS.length - 1) { FPS.slow = 0; FPS.before = fps; setLevel(FPS.level + 1, now); }
  else if (fps >= 52 && FPS.level > 0 && FPS.climbs < 3) { FPS.climbs++; setLevel(FPS.level - 1, now); }
}
function fade(fn, label, view) {
  const f = $('#fade');
  clearTimeout(fadeTimer);
  f.querySelector('.tl').textContent = label;
  f.classList.remove('out'); void f.offsetWidth; f.classList.add('on');
  hideTutorial();
  const tok = ++fadeTok;
  fadeTimer = setTimeout(async () => {
    if (otherPlaceBuilt(view) && moveOn()) return;
    const say = (p) => { f.querySelector('.tl').textContent = p < 1 ? `${label} · ${Math.round(p * 100)}%` : label; };
    preparing++;                                                           // 先把要去的地方搭出来，再切过去
    try { await buildPlace(view, (p) => say(p * 0.35)); } finally { preparing--; }
    if (tok !== fadeTok) return;
    fn();
    await prepareView(view, say);
    if (tok !== fadeTok) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {                      // 等新场景画完第一帧再揭开
      f.classList.add('out');
      fadeTimer = setTimeout(() => f.classList.remove('on', 'out'), 650);
    }));
  }, 720);
}
function setView(v) {
  if (state.view === 'lab' && v !== 'lab') { unfocusLab(true); setMarquee(); document.body.classList.remove('tanks-on'); labChoice.classList.remove('on'); labDraw.classList.remove('on'); }
  if (state.view !== v && NAV[state.view]) { NAV[state.view].stop(); NAV[state.view].clear(); canvas.style.cursor = ''; }
  if (state.view !== v) { hideInfo(); if (state.sfocus) unfocusScene(true); }
  if (state.view === 'room' && v !== 'room') unfocusRoom(true);
  const changed = state.view !== v;
  state.view = v;
  document.body.dataset.view = v;
  if (changed) setMarquee(currentMarquee());
  updateBack();
}
function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [page, sub, third] = parts;
  if (page === 'checkout' && !hasCart()) { location.replace('#/'); return toast('Your basket is empty'); }
  if (page === 'live') { location.replace('#/lab' + (state.order ? '/batch' : '')); return; }

  if (page === 'lab') {
    paperEl.classList.remove('on');
    if (state.view !== 'lab') {
      fade(() => {
        closeProduct(true);
        setView('lab');
        labWalk?.kill();
        NAV.lab.reset();
        camera.fov = labLook.fov; camera.updateProjectionMatrix();
        labChosen = true;                                                         // straight into the gallery walk; the glass is a hotspot of its own
        labChoice.classList.remove('on');
        setMarquee(LAB_MARQUEE);
        if (sub) setTimeout(() => focusLab(sub), 450);
        else if (firstLab) {
          firstLab = false;
          setTimeout(() => { if (state.view === 'lab' && !state.focus) if (labChosen) showTutorial('', '', 'drag'); }, 900);
        }
      }, 'PROCESSING HALL', 'lab');
    } else if (sub) focusLab(sub);
    else unfocusLab();
    return;
  }

  // 店外 / 仓库
  if (page === 'street' || page === 'warehouse') {
    paperEl.classList.remove('on');
    const L = page === 'street' ? streetLook : whLook;
    const enter = () => {
      closeProduct(true);
      setView(page);
      unfocusScene(true);
      const wh = SCENE_HOME.warehouse; Object.assign(L, page === 'street' ? { yaw: 0, tYaw: 0, pitch: 11, tPitch: 11, fov: 62 } : { yaw: wh.yaw, tYaw: wh.yaw, pitch: wh.pitch, tPitch: wh.pitch, fov: 64 });
      camera.fov = L.fov; camera.updateProjectionMatrix();
      if (sub) setTimeout(() => { if (state.view === page && location.hash === `#/${page}/${sub}`) focusScene(sub); }, 450);
      setMarquee(page === 'street' ? STREET_MARQUEE : WH_MARQUEE);
      if (page === 'street' && firstStreet) { firstStreet = false; setTimeout(() => { if (state.view === 'street') showTutorial('', '', 'drag'); }, 700); }
      if (page === 'warehouse') NAV.warehouse.stop();
      if (page === 'warehouse' && firstWh) { firstWh = false; setTimeout(() => { if (state.view === 'warehouse') showTutorial('', '', 'drag'); }, 700); }   // 不写字：一个拖动的小图标 + 地上一呼一吸的箭头
    };
    if (state.view !== page) fade(() => { if (page === 'warehouse') NAV.warehouse.reset(); enter(); }, page === 'street' ? 'STREET' : 'WAREHOUSE', page);   // 从外面进仓库：站回门口
    else if (sub) focusScene(sub);
    else if (state.sfocus) unfocusScene();
    else enter();
    return;
  }

  // 门店，以及走近某件东西
  paperEl.classList.remove('on');
  const spot = ROOM_SPOTS.has(page) ? page : null;
  const toOffice = page === 'office';                                              // 仓库那扇“办公室”门：直接进办公室
  if (state.view !== 'room') {
    const fromOutside = state.view === 'street' || state.view === 'warehouse';
    fade(() => {
      closeProduct(true);
      if (toOffice) goStation('office', true);
      else if (fromOutside || state.view === 'boot') goStation(({ warehouse: 'storage', lab: 'right', fridge: 'fridge' })[state.view === 'boot' ? cameFrom : state.view] || 'door', true);   // 从外面进来站回门口，从仓库回来站在仓库门口
      setView('room');
      camera.fov = look.fov; camera.updateProjectionMatrix();
      if (spot === 'fridge') pendingProduct = sub ? [sub, third] : null;
      if (spot) focusRoom(spot);
      else if (firstRoom) {
        firstRoom = false;
        setTimeout(() => { if (state.view === 'room' && !state.rfocus) showTutorial('', '', 'drag'); }, 700);
      }
    }, toOffice ? 'BACK OFFICE' : 'SHOP FLOOR', 'room');
    return;
  }
  if (toOffice) { if (state.rfocus) unfocusRoom(true); goStation('office'); return; }
  if (spot === 'fridge' && state.rfocus === 'fridge') { fridgeRoute(sub, third); return; }
  if (spot === 'fridge') pendingProduct = sub ? [sub, third] : null;
  if (spot) focusRoom(spot);
  else if (state.rfocus) unfocusRoom();
}
addEventListener('hashchange', route);
$('#back').addEventListener('click', () => {
  if (inspector.active) { inspector.close(); return; }
  if (paperEl.classList.contains('on')) { paperEl.classList.remove('on'); return; }
  if (state.sfocus) location.hash = '#/' + state.view;
  else if (state.view === 'room' && state.rfocus === 'survey') location.hash = '#/tasting';
  else if (atFridge() && state.sel && state.mode === 'grow') location.hash = '#/fridge/grow';
  else if (atFridge() && (state.sel || state.fscreen)) location.hash = '#/fridge';
  else if (state.view === 'lab' && state.focus) location.hash = '#/' + labParent();
  else if (state.view === 'room' && !state.rfocus) location.hash = '#/street';
  else location.hash = '#/';
});

// ------------------------------------------------------------------ 循环
function resize() {
  renderer.setPixelRatio(pixelRatio()); renderer.setSize(innerWidth, innerHeight, false);   // 后期缓冲是走进第一个房间才建的：画布自己先定好大小
  if (FX) resizePost(innerWidth, innerHeight);
  css.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();
for (const n of Object.values(NAV)) n.reset();                             // 画面比例定下来以后，再算一次开场朝向

const clock = new THREE.Clock();
const tmp = new THREE.Vector3();
const corners = [[-0.21, 0.37], [0.21, 0.37], [-0.21, -0.37], [0.21, -0.37]].map(([x, y]) => new THREE.Vector3(x, y, 0));

function stepLook(L, eye, dt) {
  const k = 1 - Math.exp(-dt * 7);
  L.yaw += (L.tYaw - L.yaw) * k;
  L.pitch += (L.tPitch - L.pitch) * k;
  if (Math.abs(camera.fov - L.fov) > 0.01) { camera.fov += (L.fov - camera.fov) * k; camera.updateProjectionMatrix(); }
  const y = THREE.MathUtils.degToRad(L.yaw), p = THREE.MathUtils.degToRad(L.pitch);
  camera.position.copy(eye);
  camera.lookAt(eye.x + Math.sin(y) * Math.cos(p), eye.y + Math.sin(p), eye.z - Math.cos(y) * Math.cos(p));
  camera.updateMatrixWorld();
}
function placeHotspots(list, near = 0, close = 3) {
  const act = state.view === 'lab' ? (labChosen && !(FC.on && FC.blend < 0.75) && !labWalk?.isActive() ? labStage() : '') : null;
  const walking = NAV[state.view]?.walking;
  for (const { h, el, v } of list) {
    const s = project(v);
    el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -50%)`;
    const size = THREE.MathUtils.clamp((innerHeight * 0.36) / Math.max(0.5, camera.position.distanceTo(v)), 52, 120).toFixed(0);
    if (el.dataset.size !== size) { el.dataset.size = size; el.style.setProperty('--hit', size + 'px'); }
    el.classList.toggle('flip', s.x > innerWidth - 170);
    const lim = h.near || near, flat = Math.hypot(v.x - camera.position.x, v.z - camera.position.z), far = lim && flat > lim;
    el.classList.toggle('close', flat < (h.close || close));                 // far: a faint small ring; walk up and it opens out
    const wall = state.view === 'room' && (v.x < -7.05) !== (camera.position.x < -7.05);   // 办公室和大厅隔着墙：互相看不见对方的标签
    el.classList.toggle('hidden', !!(s.behind || far || wall || walking || (act !== null && h.show && !h.show.includes(act))));
    el.classList.toggle('locked', !!h.locked || (!!h.needsOrder && !hasCart()));
  }
}

function project(v) {
  const behind = tmp.copy(v).applyMatrix4(camera.matrixWorldInverse).z > 0;
  tmp.copy(v).project(camera);
  return { x: (tmp.x * 0.5 + 0.5) * innerWidth, y: (-tmp.y * 0.5 + 0.5) * innerHeight, behind };
}

function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (preparing || !readyViews.has(state.view)) { requestAnimationFrame(loop); return; }                    // 正在备场景：盖着转场画面，不用画
  watchFps();
  aimTick();
  inspector.update(dt);
  // 批次一直在长，不管观众在不在看
  stepBatch(state.batch, dt);
  const R = readout(state.batch, t);
  const [tm, te] = !FX ? TONE.other : TONE[state.view] || TONE.fridge;
  renderer.toneMapping = tm; renderer.toneMappingExposure = te;

  if (state.view === 'room') {
    NAV.room.tick(dt);
    stepLook(look, ROOM_EYE, dt);
    room.tick(t, state.order);
    placeHotspots(hsEls, 9, 3.1);                                                   // 走近了（3.3 m 以内）才出现这件东西的交互按钮
    NAV.room.update(t);
    room.ledger.tick();
    if (postRoom) postRoom.render(t); else renderer.render(room.scene, camera);
    renderCSS();
    if (callouts.length) updateCallouts();
    if (atFridge()) fridgeOverlay(t);
  } else if (state.view === 'street' || state.view === 'warehouse') {
    const S = state.view === 'street' ? street : wh;
    if (state.view === 'warehouse') NAV.warehouse.tick(dt);
    if (state.view === 'warehouse' && FC.on) fcStep(); else stepLook(LOOKS[state.view].l, LOOKS[state.view].eye, dt);
    S.tick(t);
    if (state.view === 'street') placeHotspots(streetEls, 0, 4); else { NAV.warehouse.update(t); placeHotspots(whEls, 14, 4); }   // 仓库：走近了（7.6 m 内）才出现标签；地上的箭头
    const P = state.view === 'street' ? postStreet : postWh;
    if (P) P.render(t); else renderer.render(S.scene, camera);
    if (callouts.length) updateCallouts();
  } else if (state.view === 'lab') {
    NAV.lab.tick(dt);
    if (FC.on && FC.view === 'lab') fcStep(); else stepLook(labLook, LAB_EYE, dt);
    lab.tick(t, dt, state.batch, R);
    NAV.lab.update(t);
    updateLabControls();
    placeHotspots(labEls);
    const showTanks = state.focus === 'hall';
    document.body.classList.toggle('tanks-on', showTanks);
    if (showTanks) for (const { el, v } of [...tankEls, ...bedEls]) {
      const p = project(v);
      el.style.transform = `translate(${p.x}px, ${p.y}px)`;
      el.style.display = p.behind ? 'none' : '';
    }
    if (callouts.length) updateCallouts();
    if (state.focus === 'batch') { updateHud(t, R); updateHudLines(); }
    if (post) post.render(t); else renderer.render(lab.scene, camera);
  }

  feedback(dt);
  requestAnimationFrame(loop);
}

// 一打开先站在店外的街上
const atShop = !!store.get('carry') && ['', '#', '#/'].includes(location.hash);   // 从别处走回门店（#/）：不是第一次打开，别送回街上
if (!atShop && (!location.hash || location.hash === '#' || location.hash === '#/')) location.replace('#/street');
setMarquee();
const firstOf = (h) => (h.startsWith('#/warehouse') ? 'warehouse' : h.startsWith('#/lab') ? 'lab' : h.replace(/^#\/?/, '') === '' || h.startsWith('#/street') ? 'street' : 'room');
const firstView = atShop ? 'room' : firstOf(location.hash);
arriveWith();
camera.fov = 60; camera.updateProjectionMatrix();
// 开场只下载、只搭第一眼看到的那个地方
await prepareView(firstView, (p, label) => {
  const q = 0.06 + 0.92 * p;
  if (LD.el) LD.el.textContent = `${label || 'Stocking the counter'} · ${Math.round(q * 100)}%`;
  if (LD.arc) LD.arc.style.strokeDashoffset = String(1 - q);
});
if (firstView === 'street' || firstView === 'warehouse') setView(firstView);     // 其余的进门动作在 route() 的转场里做
await stage(0.99, 'Switching on the sign');
loop();
route();
// 真正画出两帧之后才到 100% 并揭开
requestAnimationFrame(() => requestAnimationFrame(() => {
  if (LD.el) LD.el.textContent = 'Open for business · 100%'; if (LD.arc) LD.arc.style.strokeDashoffset = '0';
  setTimeout(() => $('#loading').classList.add('gone'), 250);
}));
