import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createRoom } from './room.js';
import { createFridgeScene } from './fridge.js';
import { createLab } from './lab.js';
import { createStreet } from './street.js';
import { createWarehouse } from './warehouse.js';
import { createPost } from './post.js';
import { renderPosters, posterTexture } from './posters.js';
import { paperHTML } from './papers.js';
import { SPECIES, ORDER, OPTIONS, GROWTH, HOTSPOTS, MARQUEE, DONOR_PR, DONOR_STEPS, AD, CALLOUTS, CERAMIC_BASE, BRAND_FILM, BRAND_FINE,
  STREET_MARQUEE, STREET_HOTSPOTS, WH_MARQUEE, WH_HOTSPOTS,
  LAB_MARQUEE, LAB_HOTSPOTS, LAB_FOCUS, CELLBANK_ROWS, ASK, ASK_FALLBACK, ASK_ANIMAL } from './data.js';
import { meatGeometry, meatHeight, kindFor } from './meat.js';
import { makeBatch, stepBatch, readout, curve, sci } from './growth.js';

// ------------------------------------------------------------------ 渲染
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.78;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

// 画布上的文字 (海报、标牌）要等字体加载好再画
await Promise.race([
  Promise.all(['500 20px "Noto Serif SC"', '600 20px "Noto Serif SC"', '400 20px "Noto Sans SC"', '500 20px "Noto Sans SC"', '500 20px "IBM Plex Mono"', '500 20px Inter']
    .map((f) => document.fonts.load(f))),
  new Promise((r) => setTimeout(r, 3000)),
]).catch(() => {});

const room = createRoom(env);
const fr = createFridgeScene(env);
const fridge = fr.fridge;
// “快乐动物”广告海报：启动时离屏拍好，贴到Shop灯箱、冷柜两侧灯箱、告示栏照片上
const PH = renderPosters(renderer, env);
const POSTER = Object.fromEntries(ORDER.map((k) => [k, posterTexture(PH.posters[k])]));
room.setPosters(['beef', 'pork', 'chicken', 'fish'].map((k) => POSTER[k]), PH.photos);
function setFridgePosters(k = 'beef') {
  const next = ORDER[(ORDER.indexOf(k) + 2) % ORDER.length];
  fr.posters[0].material.map = POSTER[k];
  fr.posters[1].material.map = POSTER[next];
  fr.posters.forEach((m) => { m.material.needsUpdate = true; });
}
setFridgePosters('beef');
const lab = createLab(env);
const street = createStreet(env);
const wh = createWarehouse(env);
window.__dbg = { street, wh, room, fr, lab };   // 调试用
const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 120);
// 观察室走后期管线 (环境光遮蔽、辉光、暗角、颗粒）;?fx=0 可以关掉，用来对比或在低配电脑上提速
const FX = new URLSearchParams(location.search).get('fx') !== '0';
const post = FX ? createPost(renderer, lab.scene, camera) : null;
const postRoom = FX ? createPost(renderer, room.scene, camera) : null;
const postFridge = FX ? createPost(renderer, fr.scene, camera, { uVignette: 0.6 }) : null;
const postStreet = FX ? createPost(renderer, street.scene, camera, { uSat: 0.72, uShadow: [-0.012, 0.006, 0.02], uHigh: [0.03, 0.012, -0.03], uVignette: 0.6 }) : null;   // 夜里：暗部偏蓝，路灯偏橘
const postWh = FX ? createPost(renderer, wh.scene, camera, { uSat: 0.6, uShadow: [-0.004, 0.006, 0.004], uHigh: [0.03, 0.02, -0.03], uVignette: 0.6 }) : null;     // 仓库：尘雾、偏暖
// 三个场景统一偏暗、偏冷 (调色在 post.js 里）
const TONE = { lab: [THREE.NeutralToneMapping, 0.78], room: [THREE.NeutralToneMapping, 0.82], fridge: [THREE.NeutralToneMapping, 0.8], street: [THREE.NeutralToneMapping, 1.25], warehouse: [THREE.NeutralToneMapping, 0.88], other: [THREE.ACESFilmicToneMapping, 0.72] };

const $ = (s) => document.querySelector(s);
const state = { view: 'street', rfocus: null, sel: null, opts: null, order: null, busy: false, focus: null, batch: makeBatch(null) };
lab.setBatch(state.batch);

// ------------------------------------------------------------------ 滚动字幕
function setMarquee(text) {
  const t = (text || MARQUEE).repeat(6);
  $('#marquee .track').innerHTML = `<span>${t}</span><span>${t}</span>`;
}

// ------------------------------------------------------------------ Shop：拖动环顾 (全景式）
// Shop和观察室都用同一套“站在原地拖动环顾”的控制，各自记住自己的朝向
const ROOM_EYE = new THREE.Vector3(0.2, 1.6, 2.0);
const LAB_EYE = new THREE.Vector3(0.1, 1.62, 2.15);
const look = { yaw: 0, pitch: -3, tYaw: 0, tPitch: -3, fov: 55 };
const labLook = { yaw: -6, pitch: -6, tYaw: -6, tPitch: -6, fov: 60 };
// 店外和仓库：同样是站在原地环顾
const STREET_EYE = new THREE.Vector3(0.4, 1.6, 8.6);
const WH_EYE = new THREE.Vector3(0, 1.65, 3.4);
const streetLook = { yaw: 2, pitch: 9, tYaw: 2, tPitch: 9, fov: 62 };
const whLook = { yaw: 0, pitch: 3, tYaw: 0, tPitch: 3, fov: 64 };
const LOOKS = { room: { eye: ROOM_EYE, l: look, min: 38, max: 68 }, lab: { eye: LAB_EYE, l: labLook, min: 34, max: 66 },
  street: { eye: STREET_EYE, l: streetLook, min: 34, max: 70 }, warehouse: { eye: WH_EYE, l: whLook, min: 34, max: 70 } };
window.__looks = LOOKS;   // 调试 / 截图用
const canLook = () => LOOKS[state.view] && !state.rfocus && !state.busy && !state.focus;
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
  L.tPitch = THREE.MathUtils.clamp(L.tPitch + dy * 0.1, -28, 28);
});
const endDrag = () => { drag = null; document.body.classList.remove('grabbing'); };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', (e) => {
  if (!canLook()) return;
  const { l, min, max } = LOOKS[state.view];
  l.fov = THREE.MathUtils.clamp(l.fov + e.deltaY * 0.02, min, max);
}, { passive: true });

// ------------------------------------------------------------------ 热点：旋转的圆形文字标签
// 离开热点时恢复的字幕跟随当前所在的场景，而不是创建热点时的场景
function currentMarquee() {
  if (state.view === 'lab') return state.focus ? LAB_HOTSPOTS.find((h) => h.id === state.focus)?.marquee : LAB_MARQUEE;
  if (state.view === 'street') return STREET_MARQUEE;
  if (state.view === 'warehouse') return WH_MARQUEE;
  return MARQUEE;
}
function makeHotspots(list, layer, onClick) {
  return list.map((h) => {
    const el = document.createElement('button');
    el.className = 'hs' + (h.subtle ? ' subtle' : '');
    el.innerHTML = `
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <defs><path id="hp-${h.id}" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0"/></defs>
        <text><textPath href="#hp-${h.id}" textLength="276" lengthAdjust="spacing">${h.label.repeat(2)}</textPath></text>
      </svg>
      <span class="core"><i class="lock"></i></span>`;
    el.setAttribute('aria-label', h.label);
    el.addEventListener('pointerenter', () => setMarquee(h.marquee));
    el.addEventListener('pointerleave', () => setMarquee(currentMarquee()));
    el.addEventListener('click', () => onClick(h));
    layer.appendChild(el);
    return { h, el, v: new THREE.Vector3(...h.pos) };
  });
}
const hsEls = makeHotspots(HOTSPOTS, $('#hotspots'), (h) => enterHotspot(h));
const labEls = makeHotspots(LAB_HOTSPOTS, $('#labspots'), (h) => { location.hash = '#/' + h.route; });
// 店外、仓库的热点：要么去另一个场景，要么在原地用引线标出几样东西
const sceneLayer = (id) => { const d = document.createElement('div'); d.id = id; d.className = 'spots'; document.body.appendChild(d); return d; };
let infoOpen = null;
function sceneSpot(h) {
  if (h.route !== undefined) { location.hash = '#/' + h.route; return; }
  if (infoOpen === h.id) { hideInfo(); return; }
  infoOpen = h.id;
  hideTutorial();
  showCallouts(h.info);
  setMarquee(h.marquee);
}
function hideInfo() { infoOpen = null; calloutLayer.classList.remove('on'); callouts = []; calloutLines.innerHTML = ''; }
const streetEls = makeHotspots(STREET_HOTSPOTS, sceneLayer('streetspots'), sceneSpot);
const whEls = makeHotspots(WH_HOTSPOTS, sceneLayer('whspots'), sceneSpot);

function enterHotspot(h) {
  if (state.busy) return;
  if (h.needsOrder && !state.order) return toast('Your cart is empty. Pick one from the fridge first');
  if (room.spots[h.route]) { location.hash = '#/' + h.route; return; }
  const { yaw, pitch } = toYawPitch(h.pos);
  let target = yaw;
  while (target - look.yaw > 180) target -= 360;
  while (target - look.yaw < -180) target += 360;
  state.busy = true;
  gsap.to(look, { tYaw: target, tPitch: pitch, fov: 30, duration: 1.1, ease: 'power2.inOut', onComplete: () => {
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
  el.innerHTML = `<span class="dot"></span><span class="tag">${SPECIES[k].title}<b>¥${SPECIES[k].price}</b></span>`;
  el.addEventListener('click', () => { location.hash = '#/fridge/' + k; });
  psLayer.appendChild(el);
  return { k, el };
});

const screenEl = $('#screen');
const screenBody = $('#screen .body');
const originalScreenMap = fridge.screen.material.map;
const blankScreen = new THREE.MeshBasicMaterial({ color: 0x101113 });
let heroHome = null;

function defaults() {
  return { fat: 'mid', form: 'fillet', firm: 'tender', aroma: 'base', shade: 'light', cycle: 28, plan: 'std', qty: 1, delivery: 'std' };
}
function heroOf(k) { return fridge.shelves[k].hero; }

function openProduct(k) {
  if (state.sel === k) return;
  if (state.sel) closeProduct(true);
  state.sel = k;
  state.opts = defaults();
  const hero = heroOf(k);
  heroHome = { p: hero.position.clone(), r: hero.rotation.clone(), s: hero.scale.x };
  document.body.classList.add('product-open');
  hideTutorial();
  gsap.to(fridge.door.rotation, { y: -1.8, duration: 1.0, ease: 'power2.inOut' });
  flyCam(FRIDGE_PRODUCT, 1.3);
  gsap.timeline()
    .to(hero.position, { z: 0.55, duration: 0.5, ease: 'power2.out', delay: 0.5 })
    .to(hero.position, { x: -0.22, y: 1.16, z: 0.62, duration: 0.9, ease: 'power3.inOut' })
    .to(hero.rotation, { x: 0.7, y: 0.25, duration: 0.9, ease: 'power3.inOut' }, '<')
    .to(hero.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.9, ease: 'power3.inOut' }, '<');
  fridge.screen.material = blankScreen;
  setFridgePosters(k);
  renderProduct();
  setTimeout(() => { screenEl.classList.add('on'); startFlips(screenBody); }, 1100);
  setMarquee(`${SPECIES[k].title} · cell line ${SPECIES[k].id} · zero slaughter · `);
}

function closeProduct(instant = false) {
  if (!state.sel) return;
  const hero = heroOf(state.sel);
  const home = heroHome;
  screenEl.classList.remove('on');
  document.body.classList.remove('product-open');
  const d = instant ? 0 : 0.8;
  gsap.to(hero.position, { x: home.p.x, y: home.p.y, z: home.p.z, duration: d, ease: 'power2.inOut' });
  gsap.to(hero.rotation, { x: home.r.x, y: home.r.y, duration: d });
  gsap.to(hero.scale, { x: home.s, y: home.s, z: home.s, duration: d });
  gsap.to(fridge.door.rotation, { y: 0, duration: instant ? 0 : 0.9, delay: instant ? 0 : 0.6, ease: 'power2.inOut' });
  fridge.screen.material.map = originalScreenMap;
  fridge.screen.material = new THREE.MeshBasicMaterial({ map: originalScreenMap, toneMapped: false });
  if (!instant) flyCam(FRIDGE_OVERVIEW, 1.2);
  state.sel = null;
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
  hero.userData.meat.position.y = 0.03 + meatHeight(kind) * 0.38;
}

// ------------------------------------------------------------------ 翻牌数字 (参考网站配方用量的滚动数字）
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
    <div class="tname"><b>${t.tech}</b><span>${t.techZh}</span></div>
    <p class="pitch">${t.pitch}</p>
    ${body}
    <button class="paper-link" data-paper="${t.paper}">Read the technical report →</button>
  </div>`;
function renderProduct() {
  const k = state.sel, s = SPECIES[k], o = state.opts, ad = AD[k];
  screenBody.innerHTML = `
    <div class="eyebrow">CULTIVATED ${s.en} · ${s.id}</div>
    <h2 class="slogan">${ad.slogan}</h2>
    <p class="lead">${ad.copy}</p>
    <div class="ptitle"><span>${s.title}</span><b>¥${s.price}<small> from</small></b></div>
    <div class="stats">
      <div class="stat"><div class="flip" data-stat="cycle"></div><span>days · culture cycle</span></div>
      <div class="stat"><div class="flip" data-stat="x"></div><span>cell mass</span></div>
      <div class="stat"><div class="flip" data-stat="kill"></div><span>animals slaughtered</span></div>
    </div>
    <h4>Made for you · ${OPTIONS[k].length} patented technologies</h4>
    ${OPTIONS[k].map((opt) => techBlock(opt, `<label>${opt.label}</label>${seg(opt.key, opt.choices)}`)).join('')}
    <h4>Culture plan</h4>
    <div class="group"><label>Culture cycle</label>${seg('cycle', GROWTH.cycle)}</div>
    ${techBlock(GROWTH, `<label>产量配方</label>${seg('plan', Object.entries(GROWTH.plan).map(([v, p]) => [v, p.x > 1 ? `${p.label} ×${p.x}` : p.label]))}`)}
    <h4>Order</h4>
    <div class="group row"><label>Quantity</label>
      <div class="stepper"><button data-qty="-1">−</button><span>${o.qty}</span><button data-qty="1">+</button></div></div>
    <div class="group"><label>Delivery</label>${seg('delivery', [['std', 'Standard'], ['priority', 'Priority +£4.80']])}</div>
    <div class="buybar"><div class="price">¥<span>${price()}</span></div><button class="buy">Grow my order</button></div>
    <p class="fine">Screen content is speculative design.</p>`;
  updateStats();
  applyMeat();
}
function updateStats() {
  const o = state.opts;
  const x = GROWTH.plan[o.plan].x;
  screenBody.querySelectorAll('.flip').forEach((el) => {
    const v = { cycle: o.cycle, x: '×' + x, kill: 0 }[el.dataset.stat];
    setFlip(el, v);
  });
  const p = screenBody.querySelector('.price span');
  if (p) p.textContent = price();
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
  lab.setBatch(state.batch, state.order.opts);
  hudStatic();
  document.body.classList.add('has-order');
  $('#cart').textContent = `Order ${state.order.no}`;
  screenBody.innerHTML = `
    <div class="eyebrow">ORDER ${state.order.no}</div>
    <h2>Growing has started</h2>
    <p class="lead">Your${SPECIES[k].title}has entered open workshop BR-02. Please pay at the self-checkout by the door.</p>
    <div class="stats">
      <div class="stat"><div class="flip" data-v="">${''}</div><span>days until pickup</span></div>
    </div>
    <div class="actions">
      <button class="btn" data-go="#/lab/batch">Watch it grow</button>
      <button class="btn primary" data-go="#/checkout">Pay</button>
    </div>
    <button class="link" data-go="#/">Back to the shop</button>`;
  const f = screenBody.querySelector('.flip');
  delete f.dataset.v;
  setFlip(f, state.order.opts.cycle - (state.order.opts.delivery === 'priority' ? 5 : 0));
  startFlips(screenBody);
}

// ------------------------------------------------------------------ Shop：走近实物 (不开窗口）
// 点热点后，镜头真的走到那件东西前面;屏幕类的东西 (广告屏、评价平板、结算机、告示）直接在 3D 表面上显示网页内容，
// 货架和摆件旁边用引线标注，像观察室里“Your batch”那样.
const ROOM_HOME = ROOM_EYE.clone();
const ROOM_SPOTS = new Set(Object.keys(room.spots));
// 屏幕表面上的网页：每一帧把这块表面的四个角投影到画面上，再用一个透视矩阵 (matrix3d）把网页贴上去.
// 不用嵌套的 3D 场景，是因为那样浏览器算不准点击位置;单层透视变换既跟画面严丝合缝，按钮也点得准.
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
// 四点透视映射 (把 w×h 的矩形映射到屏幕上的四个点）
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
for (const [id, sp] of Object.entries(room.spots)) {
  if (!sp.surface) continue;
  const { mesh, w, h, size } = sp.surface;
  const el = document.createElement('div');
  el.className = 'surf surf-' + id;
  el.style.width = w + 'px'; el.style.height = h + 'px';
  surfaces[id] = { obj: cssSurface(el, mesh, size / w, [0, 0, 0.0015]), el };
}
// 结算机的小票：从出票口一点点吐出来
const receiptEl = document.createElement('div');
receiptEl.className = 'receipt3d';
receiptEl.style.width = '180px'; receiptEl.style.height = '300px';
const receiptObj = cssSurface(receiptEl, room.slot, 0.09 / 180, [0, -0.075, 0.002]);
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
function showCallouts(list) {
  const box = calloutLayer.querySelector('.boxes');
  box.innerHTML = list.map((c, i) => `
    <div class="cbox${c.note ? ' note' : ''}${c.action ? ' act' : ''}" data-i="${i}">
      ${c.title ? `<b>${c.title}</b>` : ''}${c.price ? `<span class="pr">¥${c.price}</span>` : ''}
      ${c.line ? `<p>${c.line}</p>` : ''}${c.fine ? `<small>${c.fine}</small>` : ''}
      ${c.buy ? `<button data-buy="${c.buy}">加入购物车</button>` : ''}
      ${c.flip !== undefined ? `<button data-flip="${c.flip}">翻过来看看</button><div class="flipnote"></div>` : ''}
      ${c.action ? `<button data-go="${c.action[1]}">${c.action[0]}</button>` : ''}
    </div>`).join('');
  callouts = list.map((c, i) => ({ c, el: box.children[i], v: new THREE.Vector3(...c.at) }));
  calloutLayer.classList.add('on');
}
function updateCallouts() {
  let svg = '';
  for (const { c, el, v } of callouts) {
    const a = project(v);
    const x = a.x + c.dx, y = a.y + c.dy;
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    const right = c.dx < 0;
    const bx = right ? x + el.offsetWidth : x, by = y + 16;
    const ex = bx + (right ? 26 : -26);
    svg += `<path d="M${a.x.toFixed(1)},${a.y.toFixed(1)} L${ex.toFixed(1)},${by.toFixed(1)} L${bx.toFixed(1)},${by.toFixed(1)}"/>`
      + `<rect x="${(a.x - 3.5).toFixed(1)}" y="${(a.y - 3.5).toFixed(1)}" width="7" height="7"/><circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="2.5"/>`;
  }
  calloutLines.innerHTML = svg;
}

// 各个屏幕表面上的内容
let filmTimer = null;
const SURF = {
  brand(el) {
    el.innerHTML = `<div class="film">
      ${BRAND_FILM.map((f, i) => `<div class="slide${i ? '' : ' on'}${f.poster ? ' img' : ''}" ${f.poster ? `style="background-image:url(${PH.photos[f.poster]})"` : ''}>
        <div class="big">${f.big}${f.unit ? `<small>${f.unit}</small>` : ''}</div><div class="small">${f.small}</div></div>`).join('')}
      <div class="logo">FUTURE MEAT MARKET</div>
      <button class="skip" disabled>Skip in 5 s</button>
      <div class="fine">${BRAND_FINE}</div>
      <div class="bar"><i></i></div></div>`;
    let slide = 0, count = 5;
    const slides = el.querySelectorAll('.slide'), skip = el.querySelector('.skip'), bar = el.querySelector('.bar i');
    const show = (n) => { slide = n; slides.forEach((s, i) => s.classList.toggle('on', i === n)); bar.style.width = ((n + 1) / slides.length * 100) + '%'; };
    show(0);
    clearInterval(filmTimer);
    let tick = 0;
    filmTimer = setInterval(() => {
      tick++;
      if (tick % 3 === 0) show((slide + 1) % slides.length);
      count--;
      // 倒数到 0 才能跳过;点了跳过，广告重新开始
      if (count > 0) { skip.disabled = true; skip.textContent = `${count} s until you can skip`; }
      else { skip.disabled = false; skip.textContent = 'Skip ad ›'; }
    }, 1000);
    skip.onclick = () => { count = 6; tick = 0; show(0); skip.disabled = true; skip.textContent = 'Playing it again for you…'; };
  },
  survey(el) {
    el.innerHTML = `<form class="tab">
      <div class="th"><span>FREE TASTING</span><b>Seared cultivated steak</b></div>
      <div class="q"><label>Rate the texture</label><div class="stars">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}">★</button>`).join('')}</div></div>
      <div class="q"><label>Compared with a conventional steak</label><div class="seg"><button type="button">Can't tell the difference</button><button type="button">Better</button><button type="button">Not quite</button></div></div>
      <div class="q"><label>What would you pay for 200 g</label><div class="range"><input type="range" min="40" max="200" step="2" value="120" aria-label="Price"><b>¥120</b></div></div>
      <button class="submit" type="submit">Submit and get a £3 voucher</button>
      <small>Survey data is used to tune flavour and pricing.</small>
    </form>`;
  },
  checkout(el) {
    const o = state.order, s = SPECIES[o.species];
    const lines = [
      [s.title + ' × ' + o.opts.qty, '¥' + Math.round(s.price * GROWTH.plan[o.opts.plan].price * o.opts.qty)],
      ['Culture plan', `${o.opts.cycle} days · ${GROWTH.plan[o.opts.plan].label}`],
      ...(o.opts.delivery === 'priority' ? [['Priority delivery', '¥48']] : []),
      ...(o.boost ? [['Speed-up pack ×1.5', '¥28']] : []),
      ...(o.coupon ? [['New-customer voucher', '-¥' + o.coupon]] : []),
    ];
    el.innerHTML = `<div class="kiosk">
      <div class="kh"><span>SELF CHECKOUT</span><span>Order ${o.no}</span></div>
      <div class="kl">${lines.map(([a, b]) => `<div><span>${a}</span><span>${b}</span></div>`).join('')}</div>
      <div class="kt"><span>Total</span><b>¥${o.price}</b></div>
      <button class="pay">Confirm payment</button>
      <small>Paying means you accept the Biological Ownership Terms</small>
    </div>`;
    receiptEl.innerHTML = `<div class="paper">
      <div class="rh">FUTURE MEAT MARKET<br>${new Date().toLocaleString('zh-CN', { hour12: false })}</div>
      ${lines.map(([a, b]) => `<div class="rl"><span>${a}</span><span>${b}</span></div>`).join('')}
      <div class="rl t"><span>Total</span><span>¥${o.price}</span></div>
      <div class="rf">Cell line ${s.id}<br>Zero slaughter · thank you<br>Incl. 1 certificate of biological ownership</div></div>`;
  },
  donor(el) {
    el.innerHTML = `<div class="flyer3d">
      <div class="eyebrow">NOTICE</div>
      <h3>Meet our donors</h3>
      <p>Every delicious bite comes from a friend who was treated gently.</p>
      <div class="pols">${ORDER.map((k) => `
        <button class="pol" data-donor="${k}"><span class="in">
          <span class="front"><span class="ph" style="background-image:url(${PH.photos[k]})"></span><b>${SPECIES[k].id}</b><small>${DONOR_PR[k]}</small></span>
          <span class="back">${DONOR_STEPS.map(([t, d]) => `<b>${t}</b><small>${d}</small>`).join('')}</span>
        </span></button>`).join('')}</div>
      <button class="more" data-go="#/lab">Want to know more? Visit the open workshop →</button>
      <p class="fine">*Photos and stories are brand illustrations, not specific animals. Click a photo to see the back.</p>
    </div>`;
  },
};

// 每个热点走近之后要显示什么
function openRoomUI(id) {
  const sp = room.spots[id];
  if (surfaces[id]) { SURF[id](surfaces[id].el); surfaces[id].obj.visible = true; }
  let list = (CALLOUTS[id] || []).slice();
  if (id === 'tasting') list.push({ at: room.spots.survey.at, dx: -60, dy: 120, title: 'Review tablet', line: 'Have a taste and tell us what you think.', action: ['Scan to review · get a £3 voucher →', '#/survey'] });
  if (list.length) showCallouts(list);
}
function closeRoomUI() {
  for (const it of cssItems) { it.visible = false; it.el.style.display = 'none'; }
  receiptEl.classList.remove('print');
  clearInterval(filmTimer);
  calloutLayer.classList.remove('on');
  callouts = [];
  calloutLines.innerHTML = '';
  resetFigurines();
}
let roomTimer, eyeTween;
const wrapNear = (yaw, ref) => { while (yaw - ref > 180) yaw -= 360; while (yaw - ref < -180) yaw += 360; return yaw; };
function walkTo(eye, at, fov, duration = 1.4, done) {
  const from = ROOM_EYE.clone(), to = new THREE.Vector3(...eye), p = { t: 0 };
  eyeTween?.kill();
  eyeTween = gsap.to(p, { t: 1, duration, ease: 'power2.inOut', onUpdate() {
    ROOM_EYE.lerpVectors(from, to, p.t);
    const yp = toYawPitch(at, ROOM_EYE);
    look.tYaw = wrapNear(yp.yaw, look.yaw); look.tPitch = yp.pitch;
  }, onComplete: done });
  gsap.to(look, { fov, duration, ease: 'power2.inOut', overwrite: true });
}
function focusRoom(id) {
  const sp = room.spots[id];
  if (!sp || state.rfocus === id) return;
  hideTutorial();
  closeRoomUI();
  state.rfocus = id;
  document.body.classList.add('room-focus');
  updateBack();
  walkTo(sp.eye, sp.at, sp.fov);
  clearTimeout(roomTimer);
  roomTimer = setTimeout(() => { if (state.rfocus === id) openRoomUI(id); }, 1350);
  const h = HOTSPOTS.find((x) => x.route === id);
  setMarquee(h ? h.marquee : MARQUEE);
}
function unfocusRoom(instant = false) {
  closeRoomUI();
  clearTimeout(roomTimer);
  if (!state.rfocus) return;
  const sp = room.spots[state.rfocus];
  state.rfocus = null;
  document.body.classList.remove('room-focus');
  updateBack();
  if (instant) { eyeTween?.kill(); ROOM_EYE.copy(ROOM_HOME); look.fov = 55; return; }
  walkTo(ROOM_HOME.toArray(), sp.at, 55, 1.2);
  setMarquee();
}

// 陶瓷摆件：翻过来，底座底部印着Donor编号
function resetFigurines() {
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
  if (buy) { buy.textContent = 'Added ✓'; buy.disabled = true; return toast(`${buy.dataset.buy} added to cart (demo)`); }
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
  if (e.target.type === 'range') e.target.nextElementSibling.textContent = '¥' + e.target.value;
});
css.domElement.addEventListener('submit', (e) => {
  e.preventDefault();
  state.coupon = 30;
  e.target.innerHTML = `<div class="th"><span>THANK YOU</span><b>Thanks for your review!</b></div>
    <p class="ok">A £3 new-customer voucher is in your account,<br>taken off automatically at checkout.</p>
    <div class="acts"><button type="button" class="submit" data-go="#/fridge">Pick one from the fridge</button><button type="button" data-go="#/">Keep browsing</button></div>`;
});
// 结算：屏幕上换成证书，小票从出票口吐出来
function pay() {
  const o = state.order, s = SPECIES[o.species];
  surfaces.checkout.el.innerHTML = `<div class="kiosk cert3d">
    <div class="kh"><span>Payment complete · ${o.no}</span><span class="seal">VERIFIED</span></div>
    <h4>Certificate of Biological Ownership<small>Certificate of biological ownership</small></h4>
    <table>
      <tr><td>Cell sample management</td><td>Future Meat Market</td></tr>
      <tr><td>Derived-cell use</td><td>Future Meat Market</td></tr>
      <tr><td>Source-information display</td><td>Future Meat Market</td></tr>
      <tr><td>Product ownership</td><td>You (customer)</td></tr>
    </table>
    <div class="cs"><div><span>Human Control</span><b>100%</b></div><div class="red"><span>Animal Agency</span><b>0%</b></div><div class="red"><span>Animal Consent</span><b>N/A</b></div></div>
    <div class="sg"><div><b>Future Meat</b>Producer</div><div><b>You</b>Buyer</div><div class="empty"><b>${s.id}</b>No signature field</div></div>
  </div>`;
  receiptObj.visible = true;
  requestAnimationFrame(() => receiptEl.classList.add('print'));
  setTimeout(() => {
    if (state.rfocus !== 'checkout') return;
    showCallouts([{ at: room.spots.checkout.at, dx: 190, dy: 40, title: 'Whose signature is missing from this certificate?', line: 'This certificate is a critical gesture within a speculative design; all ratios and terms are fictional.' }]);
  }, 1800);
}

// ------------------------------------------------------------------ 观察室：数据化标注层 (Your batch）
const hud = $('#hud');
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
  setH('title', `${b.name ? `"${b.name}"` : b.demo ? 'Demo batch' : 'Your batch'}<em>${s.title}</em>`);
  setH('sub', b.demo ? 'Once you order, your own portion appears here' : `Order ${b.no} · cell line ${s.id}`);
  setH('k', sci(1.2e7 * b.x));
  setH('src', `
    <div><span>Cell line</span><b>${b.cell}</b></div>
    <div><span>Passage</span><b>P${b.passage}</b></div>
    <div><span>Line started</span><b>${b.since}</b></div>
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
  setH('status', r.done ? r.status : `${r.status} · about ${r.eta} days to harvest`);
  setH('density', sci(r.N));
  setH('via', `${r.viability.toFixed(1)}<small> %</small>`);
  setH('grams', `Expected yield ${r.grams} g`);
  setH('env', [['Temperature', r.temp.toFixed(1) + ' ℃'], ['pH', r.ph.toFixed(2)], ['DO', r.oxygen.toFixed(0) + ' %'],
    ['Glucose', r.glucose.toFixed(1) + ' g/L'], ['Lactate', r.lactate.toFixed(1) + ' g/L']]
    .map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join(''));
  setH('mu', r.done ? '—' : `${r.muH.toFixed(3)}<small> /h</small>`);
  setH('dbl', r.done ? 'Stopped dividing' : `Doubling time ${r.doubling.toFixed(1)} h · vs peak −${Math.max(0, r.drop)}%`);
  const cv = curve(b, 44);
  const pts = cv.map((v, i) => `${(i / 44 * 220).toFixed(1)},${(56 - v * 50).toFixed(1)}`).join(' ');
  const n = Math.round(r.p * 44);
  setH('curve', `<polyline class="all" points="${pts}"/><polyline class="done" points="${pts.split(' ').slice(0, n + 1).join(' ')}"/>
    <rect x="${(r.p * 220 - 3).toFixed(1)}" y="${(56 - r.f * 50 - 3).toFixed(1)}" width="6" height="6"/>`);
  // 商家视角：增长放缓的那一刻，就是推销加速包的时机
  let up = '';
  if (r.done) up = state.order ? `<b>Ready for sale</b><span>After harvest it will be delivered your way</span><button data-act="checkout">Pay →</button>` : '';
  else if (b.boost > 1) up = `<b>Speeding up ×1.5</b><span>Expected about ${Math.max(1, Math.round(b.cycle - b.day - r.eta))} days earlier than planned</span><p class="fine">*Speed-up works by raising growth factors in the medium; viability may drop slightly.</p>`;
  else if (r.drop >= 30) up = `<b>Growth rate down from peak by ${r.drop}%</b><span>A speed-up pack gets it growing fast again</span><button data-act="boost">Speed up now · £2.80</button>`;
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
  if (e.target.closest('[data-redact]')) return toast('This field is filed with regulators only and not shown to consumers');
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (act === 'boost') {
    if (!state.order) return toast('Order first to speed up your batch');
    if (state.batch.boost > 1) return;
    state.batch.boost = 1.5;
    state.order.boost = true;
    state.order.price += 28;
    toast('Sped up ×1.5 · £2.80 added to your order');
  }
  if (act === 'checkout') location.hash = '#/checkout';
});

// ------------------------------------------------------------------ 观察室：右侧数据面板 (车间、细胞库、须知、数据墙）
const labPanel = $('#labpanel');
const labPanelBody = $('#labpanel .body');
const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
const LAB_PANELS = {
  hall: () => `
    <div class="eyebrow">CULTIVATION HALL 02</div>
    <h2>Cultivation hall</h2>
    <p class="lead">13 stainless-steel bioreactors run sterile around the clock. What you see from this side of the glass is where dinner is born.</p>
    <p class="lead hint">Click a tank number to see the batch growing inside.</p>
    <dl class="rows">${row('Bioreactors', '10 × 2,000 L · 3 × 5,000 L')}${row('Active batches', '3,412')}${row('Output today', '1,284.6 kg')}
      ${row('Clean class', 'ISO 7')}${row('Animals slaughtered', '0')}</dl>
    <p class="fine">*Visits cover the cultivation hall only. The cell bank, sampling and donor keeping are not on the tour.</p>`,
  cellbank: () => `
    <div class="eyebrow red">AUTHORIZED PERSONNEL ONLY</div>
    <h2>Cell bank · no visitors</h2>
    <p class="lead">For biosafety and trade secrets, this area is closed to the public.</p>
    <dl class="rows">${CELLBANK_ROWS.map(([k, v]) => row(k, v ?? '<span class="redact" data-redact>██████████</span>')).join('')}</dl>
    <p class="fine">The fields above are filed with regulators and not disclosed to consumers.</p>
    <button class="lbtn" data-act="apply">Request a visit</button>
    <div class="reply"></div>`,
  notice: () => `
    <div class="eyebrow">VISITOR NOTICE</div>
    <h2>Visitor notice</h2>
    <ol class="rules"><li>No photos or video in the gallery.</li><li>Do not tap the glass.</li>
      <li>Staff cannot answer questions about the process or the source of the cells. Thank you for understanding.</li><li>Visits last about 15 minutes.</li></ol>
    <p class="fine">For more, please contact the shop.</p>`,
  ask: () => `
    <div class="eyebrow">ASK US</div>
    <h2>Questions? Ask us</h2>
    <div class="chat"><div class="msg bot">Hello! I'm the guide of the open workshop. What would you like to know about cultivated meat?</div></div>
    <div class="qs">${ASK.map(([q], i) => `<button data-q="${i}">${q}</button>`).join('')}</div>
    <form class="askform"><input maxlength="40" placeholder="Type your question…" aria-label="Type a question"><button>Send</button></form>
    <p class="fine">2,341 questions answered today · 98% satisfied</p>`,
  tank: () => tankPanel(),
  data: () => `
    <div class="eyebrow">DATA WALL</div>
    <h2>Growth data wall</h2>
    <p class="lead">All 3,412 batches: every cell's growth, viability and metabolism shown live on this wall. Your batch is the third row of the "batch log" on the right.</p>
    <p class="fine">*Donor details are outside the scope of this system.</p>`,
};
// 车间里每一座罐：BR-02 是Your batch，其余是别人的Order
let selTank = null;
function tankPanel() {
  const t = lab.tanks[selTank], i = selTank;
  const mine = t.name === 'BR-02';
  const sp = mine ? state.batch.species : ORDER[(i * 3 + 1) % 4];
  const r = mine ? readout(state.batch, clock.elapsedTime) : null;
  const day = mine ? r.day : (i * 7 + 3) % 26 + 1, cycle = mine ? state.batch.cycle : 28;
  const via = mine ? r.viability.toFixed(1) : (96.4 + ((i * 37) % 23) / 10).toFixed(1);
  const dens = mine ? sci(r.N) : sci(4e6 + ((i * 53) % 40) * 1e6);
  return `
    <div class="eyebrow">${t.name} · ${t.size}${mine ? ' · your batch' : ''}</div>
    <h2>${SPECIES[sp].title}</h2>
    <p class="lead">${mine ? (state.batch.demo ? 'Demo batch. Once you order, your portion will grow in this tank.' : `Order ${state.batch.no} is growing here.`) : 'Another customer’s order.'}</p>
    <dl class="rows">${row('Progress', `第 ${day} / ${cycle} days`)}${row('Cell density', dens + ' /mL')}${row('Viability', via + ' %')}
      ${row('Cell line', SPECIES[sp].id)}${row('Donor', '<span class="redact" data-redact>██████████</span>')}</dl>
    <button class="lbtn" data-act="tanks">← Back to the hall</button>`;
}
const tankEls = lab.tanks.map((t, i) => {
  const el = document.createElement('button');
  el.className = 'tk';
  el.innerHTML = `<i></i><span>${t.name}</span>`;
  el.addEventListener('click', () => { selTank = i; openLabPanel('tank'); });
  $('#tankspots').appendChild(el);
  return { el, v: t.pos };
});
function openLabPanel(kind) {
  labPanel.dataset.kind = kind;
  labPanelBody.innerHTML = LAB_PANELS[kind]();
  labPanel.classList.add('on');
}
labPanel.addEventListener('click', (e) => {
  if (e.target.closest('[data-redact]')) return toast('This field is filed with regulators only and not shown to consumers');
  if (e.target.closest('[data-act="tanks"]')) return openLabPanel('hall');
  const q = e.target.closest('[data-q]');
  if (q) return ask(ASK[q.dataset.q][0], ASK[q.dataset.q][1], ASK[q.dataset.q][2]);
  const b = e.target.closest('[data-act="apply"]');
  if (!b) return;
  b.disabled = true; b.textContent = 'Submitted';
  labPanelBody.querySelector('.reply').innerHTML = 'Thank you for your interest! Your request has gone to our <b>brand PR team</b>; we will contact you within 7–15 working days.';
});
$('#labpanel .close').addEventListener('click', () => { location.hash = '#/lab'; });
labPanel.addEventListener('submit', (e) => {
  e.preventDefault();
  const input = labPanel.querySelector('.askform input');
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  const preset = ASK.find(([k]) => k === q);
  ask(q, preset ? preset[1] : ASK_ANIMAL.test(q) ? 'This question involves donor information, which is filed with regulators and outside what the terminal can answer. Thank you for understanding!' : ASK_FALLBACK, preset?.[2]);
});
// 讲解员逐字打出回答
let typing;
function ask(q, a, fine) {
  const chat = labPanel.querySelector('.chat');
  if (!chat) return;
  clearInterval(typing);
  chat.insertAdjacentHTML('beforeend', `<div class="msg me">${q.replace(/</g, '&lt;')}</div><div class="msg bot"></div>`);
  const out = chat.lastElementChild;
  let i = 0;
  typing = setInterval(() => {
    out.textContent = a.slice(0, ++i);
    chat.scrollTop = chat.scrollHeight;
    if (i >= a.length) { clearInterval(typing); if (fine) out.insertAdjacentHTML('beforeend', `<small>${fine}</small>`); }
  }, 28);
}

let focusTimer;
function closeLabUI() {
  hud.classList.remove('on');
  labPanel.classList.remove('on');
  lab.setScan(false);
}
function focusLab(sub) {
  const f = LAB_FOCUS[sub];
  if (!f) return unfocusLab();
  hideTutorial();
  closeLabUI();
  state.focus = sub;
  document.body.classList.add('lab-focus');
  updateBack();
  const at = f.at || lab.anchor('center').toArray();
  const { yaw, pitch } = toYawPitch(at, LAB_EYE);
  let target = yaw;
  while (target - labLook.yaw > 180) target -= 360;
  while (target - labLook.yaw < -180) target += 360;
  gsap.to(labLook, { tYaw: target, tPitch: pitch, fov: f.fov, duration: 1.2, ease: 'power2.inOut', overwrite: true });
  clearTimeout(focusTimer);
  focusTimer = setTimeout(() => {
    if (state.focus !== sub) return;
    if (sub === 'batch') { hud.classList.add('on'); lab.setScan(true); } else openLabPanel(sub);
  }, 1000);
  setMarquee(LAB_HOTSPOTS.find((h) => h.id === sub)?.marquee);
}
function unfocusLab(instant = false) {
  closeLabUI();
  clearTimeout(focusTimer);
  if (!state.focus) return;
  state.focus = null;
  document.body.classList.remove('lab-focus');
  updateBack();
  if (!instant) {
    gsap.to(labLook, { fov: 60, tPitch: -6, duration: 1.0, ease: 'power2.inOut', overwrite: true });
    setMarquee(LAB_MARQUEE);
  }
}
function updateBack() {
  $('#back span:last-child').textContent = state.view === 'lab' && state.focus ? 'Gallery' : state.rfocus === 'survey' ? 'Tasting counter' : state.view === 'room' ? 'Outside' : 'Inside';
}

// ------------------------------------------------------------------ 引导与提示
let tutorialTimer;
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

// ------------------------------------------------------------------ 路由 (每个商品都有自己的链接）
let firstRoom = true, firstFridge = true, firstLab = true, firstStreet = true, firstWh = true;
function fade(fn) {
  const f = $('#fade');
  f.classList.add('on');
  hideTutorial();
  setTimeout(() => { fn(); requestAnimationFrame(() => f.classList.remove('on')); }, 450);
}
function setView(v) {
  if (state.view === 'lab' && v !== 'lab') { unfocusLab(true); setMarquee(); }
  if (state.view !== v) hideInfo();
  if (state.view === 'room' && v !== 'room') unfocusRoom(true);
  state.view = v;
  document.body.dataset.view = v;
  updateBack();
}
function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [page, sub] = parts;
  if (page === 'checkout' && !state.order) { location.replace('#/'); return toast('Your cart is empty. Pick one from the fridge first'); }
  if (page === 'live') { location.replace('#/lab' + (state.order ? '/batch' : '')); return; }

  if (page === 'lab') {
    paperEl.classList.remove('on');
    if (state.view !== 'lab') {
      fade(() => {
        closeProduct(true);
        setView('lab');
        Object.assign(labLook, { yaw: -6, tYaw: -6, pitch: -6, tPitch: -6, fov: 60 });
        camera.fov = 60; camera.updateProjectionMatrix();
        setMarquee(LAB_MARQUEE);
        if (sub) setTimeout(() => focusLab(sub), 450);
        else if (firstLab) {
          firstLab = false;
          setTimeout(() => { if (state.view === 'lab' && !state.focus) showTutorial('Drag · look around the gallery', 'The cultivation hall is right behind the glass', 'drag'); }, 900);
        }
      });
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
      Object.assign(L, page === 'street' ? { yaw: 2, tYaw: 2, pitch: 9, tPitch: 9, fov: 62 } : { yaw: 0, tYaw: 0, pitch: 3, tPitch: 3, fov: 64 });
      camera.fov = L.fov; camera.updateProjectionMatrix();
      setMarquee(page === 'street' ? STREET_MARQUEE : WH_MARQUEE);
      if (page === 'street' && firstStreet) { firstStreet = false; setTimeout(() => { if (state.view === 'street') showTutorial('Drag · look around the street', 'An ordinary old butcher\'s. Click a round tag to walk in, or look around', 'drag'); }, 700); }
      if (page === 'warehouse' && firstWh) { firstWh = false; setTimeout(() => { if (state.view === 'warehouse') showTutorial('Drag · look around the warehouse', 'The boxes all say frozen goods. Click a round tag to see what\'s inside', 'drag'); }, 700); }
    };
    if (state.view !== page) fade(enter); else enter();
    return;
  }

  if (page === 'fridge') {
    const enter = () => {
      if (sub && SPECIES[sub]) openProduct(sub); else closeProduct();
    };
    if (state.view !== 'fridge') {
      fade(() => {
        setView('fridge');
        cam.pos.set(0.05, 1.5, 4.4); cam.target.set(0.05, 1.1, 0);
        flyCam(FRIDGE_OVERVIEW, 1.6);
        if (sub) setTimeout(enter, 900);
        else if (firstFridge) { firstFridge = false; setTimeout(() => showTutorial('Click any item', 'Open · customise · order', 'tap'), 1600); }
      });
    } else enter();
    return;
  }

  // Shop，以及走近某件东西
  paperEl.classList.remove('on');
  const spot = ROOM_SPOTS.has(page) ? page : null;
  if (state.view !== 'room') {
    const fromOutside = state.view === 'street' || state.view === 'warehouse';
    fade(() => {
      closeProduct(true);
      if (fromOutside) Object.assign(look, { yaw: state.view === 'warehouse' ? 80 : 0, tYaw: state.view === 'warehouse' ? 80 : 0, pitch: -3, tPitch: -3 });   // 从门口进来面朝窗口，从仓库回来面朝仓库门
      setView('room');
      look.fov = 55; camera.fov = 55; camera.updateProjectionMatrix();
      if (spot) focusRoom(spot);
      else if (firstRoom) {
        firstRoom = false;
        setTimeout(() => { if (state.view === 'room' && !state.rfocus) showTutorial('Drag · look around the shop', 'The real business is at the window in the back wall. Click a round tag to look closer', 'drag'); }, 700);
      }
    });
    return;
  }
  if (spot) focusRoom(spot);
  else if (state.rfocus) unfocusRoom();
}
addEventListener('hashchange', route);
$('#back').addEventListener('click', () => {
  if (paperEl.classList.contains('on')) { paperEl.classList.remove('on'); return; }
  if (state.view === 'room' && state.rfocus === 'survey') location.hash = '#/tasting';
  else if (state.view === 'fridge' && state.sel) location.hash = '#/fridge';
  else if (state.view === 'lab' && state.focus) location.hash = '#/lab';
  else if (state.view === 'room' && !state.rfocus) location.hash = '#/street';
  else location.hash = '#/';
});

// ------------------------------------------------------------------ 循环
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  css.setSize(innerWidth, innerHeight);
  post?.setSize(innerWidth, innerHeight);
  postRoom?.setSize(innerWidth, innerHeight);
  postFridge?.setSize(innerWidth, innerHeight);
  postStreet?.setSize(innerWidth, innerHeight);
  postWh?.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

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
function placeHotspots(list) {
  for (const { h, el, v } of list) {
    const s = project(v);
    el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -50%)`;
    el.classList.toggle('hidden', s.behind);
    el.classList.toggle('locked', !!h.locked || (!!h.needsOrder && !state.order));
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
  // 批次一直在长，不管观众在不在看
  stepBatch(state.batch, dt);
  const R = readout(state.batch, t);
  const [tm, te] = !FX ? TONE.other : TONE[state.view] || TONE.fridge;
  renderer.toneMapping = tm; renderer.toneMappingExposure = te;

  if (state.view === 'room') {
    stepLook(look, ROOM_EYE, dt);
    room.tick(t, state.order);
    placeHotspots(hsEls);
    if (postRoom) postRoom.render(t); else renderer.render(room.scene, camera);
    renderCSS();
    if (callouts.length) updateCallouts();
  } else if (state.view === 'street' || state.view === 'warehouse') {
    const S = state.view === 'street' ? street : wh;
    stepLook(LOOKS[state.view].l, LOOKS[state.view].eye, dt);
    S.tick(t);
    placeHotspots(state.view === 'street' ? streetEls : whEls);
    const P = state.view === 'street' ? postStreet : postWh;
    if (P) P.render(t); else renderer.render(S.scene, camera);
    if (callouts.length) updateCallouts();
  } else if (state.view === 'lab') {
    stepLook(labLook, LAB_EYE, dt);
    lab.tick(t, dt, state.batch, R);
    placeHotspots(labEls);
    const showTanks = state.focus === 'hall';
    document.body.classList.toggle('tanks-on', showTanks);
    if (showTanks) for (const { el, v } of tankEls) {
      const p = project(v);
      el.style.transform = `translate(${p.x}px, ${p.y}px)`;
      el.style.display = p.behind ? 'none' : '';
    }
    if (state.focus === 'batch') { updateHud(t, R); updateHudLines(); }
    if (post) post.render(t); else renderer.render(lab.scene, camera);
  } else {
    if (Math.abs(camera.fov - 40) > 0.01) { camera.fov = 40; camera.updateProjectionMatrix(); }
    camera.position.copy(cam.pos);
    camera.lookAt(cam.target);
    camera.updateMatrixWorld();
    if (state.sel) {
      const hero = heroOf(state.sel);
      if (hero.scale.x > 1.45) hero.rotation.y = 0.25 + Math.sin(t * 0.6) * 0.25;
      if (innerWidth > 760) {
        const pts = corners.map((c) => project(fridge.screen.localToWorld(c.clone())));
        const xs = pts.map((q) => q.x), ys = pts.map((q) => q.y);
        const l = Math.min(...xs), r = Math.max(...xs), tp = Math.min(...ys), b = Math.max(...ys);
        Object.assign(screenEl.style, { left: l + 'px', top: tp + 'px', width: (r - l) + 'px', height: (b - tp) + 'px' });
      } else screenEl.removeAttribute('style');
    }
    for (const { k, el } of psEls) {
      const s = project(fridge.group.localToWorld(fridge.shelves[k].anchor.clone()));
      el.style.transform = `translate(${s.x}px, ${s.y}px)`;
    }
    if (postFridge) postFridge.render(t); else renderer.render(fr.scene, camera);
  }

  requestAnimationFrame(loop);
}

// 一打开先站在店外的街上
if (!location.hash || location.hash === '#' || location.hash === '#/') location.replace('#/street');
setMarquee();
setView(location.hash.startsWith('#/street') ? 'street' : location.hash.startsWith('#/warehouse') ? 'warehouse' : 'room');
camera.fov = 60; camera.updateProjectionMatrix();
loop();
route();
setTimeout(() => $('#loading').classList.add('gone'), 300);
