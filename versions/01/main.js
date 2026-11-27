import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildStore, addLights, SPECIES, ORDER, drawLabel } from './scene.js';
import { meatGeometry, meatMaterial, meatUniforms, kindFor } from './meat.js';

// ------------------------------------------------------------------ 渲染器与场景
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.82;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe9e6e1);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 60);
const store = buildStore(scene);
addLights(scene);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.22, 0.6, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ------------------------------------------------------------------ 状态
const BASE_PRICE = { chicken: 68, beef: 168, pork: 98, fish: 128 };
const PLAN = {
  std: { label: '标准配方', x: 1, price: 1, count: 500 },
  a: { label: '优化配方 A', x: 3, price: 0.82, count: 1500 },
  b: { label: '优化配方 B', x: 4, price: 0.74, count: 2200 },
};
const state = {
  step: 1, maxStep: 1,
  species: 'beef', fat: 'mid', firm: 'tender', aroma: 'base', color: 0.5, form: 'fillet',
  cycle: 28, plan: 'std', qty: 2, delivery: 'std', generated: false, windowOpen: false,
};

// ------------------------------------------------------------------ 展台上的肉
const meatMat = meatMaterial();
const meat = new THREE.Mesh(meatGeometry('beef'), meatMat);
meat.castShadow = true;
meat.position.y = 1.03 + 0.09;
store.pedestal.add(meat);

function updateMeat() {
  const s = state.species;
  meatUniforms.uSpecies.value = ORDER.indexOf(s);
  meat.geometry.dispose();
  meat.geometry = meatGeometry(kindFor(s, state.form));
  const kind = kindFor(s, state.form);
  meat.position.y = 1.03 + ({ beef: .085, pork: .075, chicken: .1, fillet: .045, steak: .095 })[kind];
}
function setUniforms() {
  const fatV = { low: 0, mid: 0.5, high: 1 }[state.fat];
  gsap.to(meatUniforms.uFat, { value: fatV, duration: 0.6 });
  gsap.to(meatUniforms.uFirm, { value: state.firm === 'firm' ? 1 : 0, duration: 0.6 });
  gsap.to(meatUniforms.uColor, { value: state.color, duration: 0.3 });
  meatUniforms.uSteak.value = state.form === 'steak' ? 1 : 0;
}

// ------------------------------------------------------------------ 反应器里的细胞粒子
const cellMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false,
  uniforms: { uTime: { value: 0 }, uSpeed: { value: 1 } },
  vertexShader: /* glsl */`
    attribute vec3 seed;
    uniform float uTime, uSpeed;
    varying float vA;
    void main(){
      float a = seed.x*6.2831 + uTime*.25*uSpeed*(.5+seed.z);
      float r = .58*sqrt(seed.y);
      float y = mod(seed.z*1.1 + uTime*.05*uSpeed*(.4+seed.x), 1.1) - .55;
      vec3 p = vec3(cos(a)*r, y, sin(a)*r);
      vec4 mv = modelViewMatrix*vec4(p,1.);
      gl_Position = projectionMatrix*mv;
      gl_PointSize = (28. + 36.*seed.x)/-mv.z;
      vA = .35 + .65*seed.y;
    }`,
  fragmentShader: /* glsl */`
    varying float vA;
    void main(){
      vec2 d = gl_PointCoord - .5;
      float r = length(d);
      float ring = smoothstep(.5,.38,r)*(.35 + .65*smoothstep(.25,.42,r));
      gl_FragColor = vec4(mix(vec3(.62,.16,.22), vec3(.95,.72,.74), smoothstep(.2,.45,r)), ring*vA*.8);
    }`,
});
const cells = store.reactors.map((g) => {
  const n = 2600;
  const geo = new THREE.BufferGeometry();
  const seeds = new Float32Array(n * 3).map(() => Math.random());
  geo.setAttribute('seed', new THREE.BufferAttribute(seeds, 3));
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2);
  const pts = new THREE.Points(geo, cellMat);
  pts.position.y = 1.5;
  pts.frustumCulled = false;
  g.add(pts);
  geo.setDrawRange(0, PLAN.std.count);
  return geo;
});
const growth = { day: 0 };
function drawScreens() {
  store.reactorScreens.forEach((sc, i) => {
    const g = sc.canvas.getContext('2d');
    const W = 512, H = 320;
    g.fillStyle = '#0e1114'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#9fb3c4'; g.font = '400 20px Inter, sans-serif';
    g.fillText(sc.name + '  ·  ' + SPECIES[state.species].id, 28, 44);
    g.fillStyle = '#ffffff'; g.font = '300 54px Inter, sans-serif';
    g.fillText('Day ' + Math.floor(growth.day) + ' / ' + state.cycle, 28, 120);
    g.fillStyle = '#9fb3c4'; g.font = '400 18px Inter, sans-serif';
    g.fillText('37.0 °C    pH 7.2    DO 40%', 28, 168);
    g.fillText(PLAN[state.plan].label + '  ·  细胞量 ×' + (1 + (PLAN[state.plan].x - 1) * growth.day / state.cycle).toFixed(1), 28, 204);
    g.fillStyle = '#2a3138'; g.fillRect(28, 250, W - 56, 6);
    g.fillStyle = '#e0565e'; g.fillRect(28, 250, (W - 56) * growth.day / state.cycle, 6);
    sc.tex.needsUpdate = true;
  });
}
function updateGrowth() {
  cells.forEach((geo) => geo.setDrawRange(0, PLAN[state.plan].count));
  gsap.to(cellMat.uniforms.uSpeed, { value: PLAN[state.plan].x * (28 / state.cycle), duration: 1 });
  growth.day = 0;
  gsap.to(growth, { day: state.cycle * 0.62, duration: 2.2, ease: 'power2.out', onUpdate: drawScreens });
}
drawScreens();

// ------------------------------------------------------------------ 04 包装好的产品
const labelCanvas = document.createElement('canvas');
labelCanvas.width = 512; labelCanvas.height = 320;
const labelTex = new THREE.CanvasTexture(labelCanvas);
labelTex.colorSpace = THREE.SRGBColorSpace;
const product = new THREE.Group();
product.position.set(0, 0.99, 0.05);
product.visible = false;
store.counter.add(product);
const tray = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.62), new THREE.MeshStandardMaterial({ color: 0x1b1b1c, roughness: 0.5 }));
tray.position.y = 0.025; tray.castShadow = tray.receiveShadow = true;
product.add(tray);
const packedMeat = new THREE.Mesh(meat.geometry, meatMat);
packedMeat.scale.setScalar(0.8);
packedMeat.castShadow = true;
product.add(packedMeat);
const film = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.62),
  new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.08, transparent: true, opacity: 0.07, depthWrite: false }));
film.position.y = 0.08;
product.add(film);
const label = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.26), new THREE.MeshBasicMaterial({ map: labelTex, color: 0xd8d6d2 }));
label.rotation.x = -Math.PI / 2; label.position.set(0.2, 0.175, 0.12);
label.renderOrder = 2;
product.add(label);

function generateProduct(done) {
  packedMeat.geometry = meat.geometry;
  packedMeat.position.y = 0.05 + (meat.position.y - 1.03) * 0.8;
  product.visible = true;
  product.position.y = 1.4;
  const prog = { p: 0 };
  const date = deliveryDate();
  const tl = gsap.timeline({ onComplete: done });
  tl.to(product.position, { y: 0.99, duration: 1.1, ease: 'power3.out' });
  tl.to(prog, {
    p: 1, duration: 2.6, ease: 'power1.inOut',
    onUpdate: () => {
      drawLabel(labelCanvas.getContext('2d'), 512, 320, state.species, prog.p, '送达 ' + date);
      labelTex.needsUpdate = true;
    },
  }, '+=0.2');
}

// ------------------------------------------------------------------ 05 窗外的供体动物
function placeholderDonor(key) {
  const c = document.createElement('canvas');
  c.width = 1600; c.height = 900;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 520);
  sky.addColorStop(0, '#cfd8dc'); sky.addColorStop(1, '#eef0ea');
  g.fillStyle = sky; g.fillRect(0, 0, 1600, 900);
  g.fillStyle = '#8c9a74'; g.fillRect(0, 520, 1600, 380);
  g.fillStyle = '#6f7d5c'; g.fillRect(0, 520, 1600, 8);
  g.strokeStyle = '#5b5248'; g.lineWidth = 6;
  for (let x = 60; x < 1600; x += 180) { g.beginPath(); g.moveTo(x, 470); g.lineTo(x, 600); g.stroke(); }
  g.beginPath(); g.moveTo(0, 500); g.lineTo(1600, 500); g.moveTo(0, 550); g.lineTo(1600, 550); g.stroke();
  g.fillStyle = '#3d3530';
  g.beginPath(); g.ellipse(800, 600, 240, 110, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(1060, 540, 80, 60, -0.3, 0, Math.PI * 2); g.fill();
  for (const x of [620, 700, 900, 980]) g.fillRect(x, 650, 34, 150);
  g.fillStyle = 'rgba(20,20,20,.75)';
  g.font = '400 34px "Noto Sans SC", sans-serif';
  g.textAlign = 'center';
  g.fillText('供体动物 ' + SPECIES[key].id + ' · 占位图', 800, 120);
  g.font = '300 26px Inter, "Noto Sans SC", sans-serif';
  g.fillText('替换为真实照片：assets/donor_' + key + '.jpg', 800, 166);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function loadDonor(key) {
  new THREE.TextureLoader().load(`assets/donor_${key}.jpg`,
    (t) => { t.colorSpace = THREE.SRGBColorSpace; store.outside.material.map = t; store.outside.material.needsUpdate = true; },
    undefined,
    () => { store.outside.material.map = placeholderDonor(key); store.outside.material.needsUpdate = true; });
}

// ------------------------------------------------------------------ 镜头
const STOPS = {
  1: { pos: [0, 1.9, 11.5], look: [0, 1.0, 4] },
  2: { pos: [0.95, 1.75, 2.3], look: [0, 1.05, 0] },
  3: { pos: [1.4, 1.8, 1.6], look: [0, 1.55, -5.5] },
  4: { pos: [5.7, 1.85, 2.3], look: [5.2, 1.0, 0.2] },
  5: { pos: [-3.2, 1.75, 3.6], look: [-8.9, 1.75, 0] },
  6: { pos: [-3.6, 1.72, 0.9], look: [-9, 1.75, 0] },
};
const look = new THREE.Vector3(...STOPS[1].look);
camera.position.set(...STOPS[1].pos);
function fly(stop, duration = 1.8) {
  const s = STOPS[stop];
  gsap.to(camera.position, { x: s.pos[0], y: s.pos[1], z: s.pos[2], duration, ease: 'power2.inOut' });
  gsap.to(look, { x: s.look[0], y: s.look[1], z: s.look[2], duration, ease: 'power2.inOut' });
}
const mouse = new THREE.Vector2();
addEventListener('pointermove', (e) => { mouse.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5); });

// ------------------------------------------------------------------ 界面
const panel = document.getElementById('panel');
const stepsNav = document.getElementById('steps');
const cert = document.getElementById('cert');
const STEP_NAMES = ['Select Species', 'Customize Meat', 'Optimize Growth', 'Generate Product', 'Ownership Certificate'];

function deliveryDate() {
  const d = new Date();
  d.setDate(d.getDate() + state.cycle - (state.delivery === 'priority' ? 5 : 0));
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
function price() {
  const p = BASE_PRICE[state.species] * PLAN[state.plan].price * state.qty + (state.delivery === 'priority' ? 48 : 0);
  return Math.round(p);
}
const seg = (key, opts) => `<div class="seg" data-key="${key}">${opts.map(([v, t]) =>
  `<button data-v="${v}" class="${state[key] === v ? 'on' : ''}">${t}</button>`).join('')}</div>`;
const ref = (text, url) => `<div class="note">依据：<a href="${url}" target="_blank" rel="noopener">${text}</a></div>`;

function renderNav() {
  stepsNav.innerHTML = STEP_NAMES.map((n, i) => {
    const k = i + 1;
    const cls = k === state.step ? 'on' : (k <= state.maxStep ? 'done' : '');
    return `<button data-step="${k}" class="${cls}" ${k > state.maxStep ? 'disabled' : ''}>0${k} ${n}</button>`;
  }).join('');
}

const VIEWS = {
  1: () => `
    <div class="eyebrow">01 — Select Species</div>
    <h1>选择你的蛋白质来源</h1>
    <p class="lead">每一份产品都由已授权的供体细胞培养而成。无需饲养，无需屠宰。</p>
    <div class="cards">${ORDER.map((k) => `
      <button class="card ${state.species === k ? 'on' : ''}" data-species="${k}">
        <div class="zh">${SPECIES[k].zh}</div><div class="en">${SPECIES[k].en}</div>
        <div class="meta">细胞系 ${SPECIES[k].id}</div>
      </button>`).join('')}</div>
    <div class="spacer"></div>
    <div class="actions"><button class="btn primary" data-next>开始定制</button></div>`,

  2: () => {
    const s = state.species;
    let opts = '';
    if (s === 'pork' || s === 'chicken') {
      opts = `<div class="group"><div class="group-label">脂肪含量</div>
        ${seg('fat', [['low', '少脂'], ['mid', '适中'], ['high', '丰润']])}
        <div class="note">概念参数：通过脂肪细胞比例调节</div></div>`;
    } else if (s === 'fish') {
      opts = `<div class="group"><div class="group-label">产品形态</div>
        ${seg('form', [['fillet', '鱼片'], ['steak', '鱼排']])}</div>`;
    } else {
      opts = `
        <div class="group"><div class="group-label">口感</div>
          ${seg('firm', [['tender', '柔嫩'], ['firm', '紧实']])}
          ${ref('Nature Communications, 2023 · 支架硬度影响细胞分化', 'https://www.nature.com/articles/s41467-023-44359-9')}</div>
        <div class="group"><div class="group-label">烹饪香气</div>
          ${seg('aroma', [['base', '基础'], ['plus', '烤肉香增强']])}
          ${ref('Nature Communications, 2024 · 风味可切换支架', 'https://www.nature.com/articles/s41467-024-49521-5')}</div>
        <div class="group"><div class="group-label"><span>颜色</span><b id="colorV">${Math.round(state.color * 100)}%</b></div>
          <input type="range" min="0" max="1" step="0.01" value="${state.color}" id="color">
          <div class="range-ends"><span>浅</span><span>深</span></div>
          ${ref('Biomaterials, 2021 · 类肉色泽与红白纹理', 'https://www.sciencedirect.com/science/article/abs/pii/S0142961221004634')}</div>`;
    }
    return `
      <div class="eyebrow">02 — Customize Meat</div>
      <h1>定制${SPECIES[s].zh === '大黄鱼' ? '大黄鱼' : SPECIES[s].zh + '肉'}</h1>
      <p class="lead">按你的偏好重新组织它的组织结构。所有变化实时呈现。</p>
      ${opts}
      <div class="spacer"></div>
      <div class="actions"><button class="btn" data-back>返回</button><button class="btn primary" data-next>下一步：培养</button></div>`;
  },

  3: () => `
    <div class="eyebrow">03 — Optimize Growth</div>
    <h1>优化你的生产</h1>
    <p class="lead">选择培养方案。你的订单将在玻璃墙后的反应器中生长。</p>
    <div class="group"><div class="group-label">培养周期</div>
      ${seg('cycle', [[14, '14 天'], [21, '21 天'], [28, '28 天']])}</div>
    <div class="group"><div class="group-label">产量方案</div>
      ${seg('plan', [['std', '标准'], ['a', '配方 A ×3'], ['b', '配方 B ×4']])}
      ${ref('Communications Biology, 2022 · 28 天后细胞量约 3 倍与 4 倍', 'https://www.nature.com/articles/s42003-022-03423-8')}</div>
    <div class="group"><div class="group-label">订购份量</div>
      <div class="stepper"><button data-qty="-1">−</button><span>${state.qty}</span><button data-qty="1">+</button></div></div>
    <div class="group"><div class="group-label">交付方式</div>
      ${seg('delivery', [['std', '标准交付'], ['priority', '付费优先交付 +¥48']])}</div>
    <div class="summary">
      <div><span>预计送达</span><span>${deliveryDate()}</span></div>
      <div><span>细胞系</span><span>${SPECIES[state.species].id}</span></div>
    </div>
    <div class="price">¥${price()}<small>含培养与冷链</small></div>
    <div class="spacer"></div>
    <div class="actions"><button class="btn" data-back>返回</button><button class="btn primary" data-next>下一步：生成产品</button></div>`,

  4: () => `
    <div class="eyebrow">04 — Generate Product</div>
    <h1>${state.generated ? '你的产品已生成' : '生成你的产品'}</h1>
    <p class="lead">${state.generated ? '包装已完成。它已准备好进入你的厨房。' : '确认订单后，产品将被包装并贴上标签。'}</p>
    <div class="summary">
      <div><span>来源</span><span>${SPECIES[state.species].zh} · ${SPECIES[state.species].id}</span></div>
      <div><span>方案</span><span>${PLAN[state.plan].label} · ${state.cycle} 天</span></div>
      <div><span>份量</span><span>${state.qty} 份</span></div>
      <div><span>送达</span><span>${deliveryDate()}${state.delivery === 'priority' ? '（优先）' : ''}</span></div>
      <div><span>合计</span><span>¥${price()}</span></div>
    </div>
    <div class="spacer"></div>
    <div class="actions">
      ${state.generated
        ? '<button class="btn primary" data-next>查看所有权证书</button>'
        : '<button class="btn" data-back>返回</button><button class="btn primary" data-generate>确认并生成</button>'}
    </div>`,

  5: () => state.windowOpen ? `
    <div class="eyebrow">05 — ${SPECIES[state.species].id}</div>
    <h1>它在窗外</h1>
    <p class="lead">${SPECIES[state.species].donor}。它的细胞构成了你的产品。是否进一步了解它的生活，由你决定。</p>
    <div class="archive">
      <details><summary>取样之前</summary><p>出生于签约供体农场，因细胞增殖速度较快被选为供体。（虚构档案）</p></details>
      <details><summary>取样与恢复</summary><p>局部麻醉下进行肌肉活检 3 次，每次恢复期约 2 周。（虚构档案）</p></details>
      <details><summary>取样以后</summary><p>记录显示已转入照护场所。后续生活：信息未提供。（虚构档案）</p></details>
    </div>
    <div class="spacer"></div>
    <div class="actions"><button class="btn" data-cert>返回证书</button><button class="btn primary" data-restart>重新开始</button></div>` : `
    <div class="eyebrow">05 — Ownership Certificate</div>
    <h1>所有权证书</h1>
    <p class="lead">你的定制已完成。证书记录了这份产品涉及的每一项权利。</p>
    <p class="lead" style="margin-top:18px;color:var(--ink)">这份证书里，谁的签名缺席了？</p>
    <div class="spacer"></div>
    <div class="actions"><button class="btn" data-restart>重新开始</button><button class="btn primary" data-window>看向窗外</button></div>`,
};

function renderCert() {
  const s = SPECIES[state.species];
  cert.innerHTML = `
    <div class="c-head">
      <div><h2>Certificate of Biological Ownership</h2><div class="c-sub">生物所有权证书 · No. ${s.id}-${String(price()).padStart(4, '0')}</div></div>
      <div class="seal">FUTURE<br>MEAT<br>VERIFIED</div>
    </div>
    <table>
      <tr><td class="k">细胞样本管理权</td><td>Future Meat Market</td></tr>
      <tr><td class="k">衍生细胞使用权</td><td>Future Meat Market</td></tr>
      <tr><td class="k">产品所有权</td><td>你（顾客）</td></tr>
      <tr><td class="k">来源信息展示权</td><td>Future Meat Market</td></tr>
      <tr><td class="k">细胞来源</td><td>${s.zh} · ${s.id}</td></tr>
    </table>
    <div class="stats">
      <div class="stat"><div>Human Control</div><div>100%</div></div>
      <div class="stat red"><div>Animal Agency</div><div>0%</div></div>
      <div class="stat red"><div>Animal Consent</div><div>Not Applicable</div></div>
    </div>
    <div class="sigs">
      <div class="sig"><b>Future Meat Market</b>生产方</div>
      <div class="sig"><b>你</b>购买方</div>
      <div class="sig empty"><b>${s.id}</b>无签名栏位</div>
    </div>
    <div class="c-note">本证书为思辨性设计中的批判表达，比例与条款均为虚构，非真实测量数据或法律文件。</div>`;
}

function go(step) {
  state.step = step;
  state.maxStep = Math.max(state.maxStep, step);
  if (step !== 5) { state.windowOpen = false; cert.className = 'hidden'; }
  if (step === 5) { renderCert(); cert.className = state.windowOpen ? 'dim' : ''; }
  gsap.to(store.frost.material, { opacity: step === 5 && state.windowOpen ? 0 : 0.94, duration: 1.6 });
  fly(step === 5 && state.windowOpen ? 6 : step);
  if (step === 3) updateGrowth();
  render();
}

function render() {
  renderNav();
  panel.innerHTML = VIEWS[state.step]();
  Object.values(store.fridges).forEach((f, i) =>
    gsap.to(f.halo.material, { opacity: ORDER[i] === state.species && state.step === 1 ? 1 : 0, duration: 0.4 }));
}

panel.addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.dataset.species) {
    state.species = t.dataset.species;
    state.form = 'fillet';
    updateMeat(); setUniforms(); loadDonor(state.species);
    const x = -4.5 + ORDER.indexOf(state.species) * 3;
    gsap.to(look, { x: x * 0.35, duration: 1 });
    return render();
  }
  const segEl = t.closest('.seg');
  if (segEl) {
    const key = segEl.dataset.key;
    const raw = t.dataset.v;
    state[key] = key === 'cycle' ? Number(raw) : raw;
    if (key === 'form') updateMeat();
    setUniforms();
    if (key === 'plan' || key === 'cycle') updateGrowth();
    return render();
  }
  if (t.dataset.qty) { state.qty = Math.min(10, Math.max(1, state.qty + Number(t.dataset.qty))); return render(); }
  if ('next' in t.dataset) return go(state.step + 1);
  if ('back' in t.dataset) return go(state.step - 1);
  if ('generate' in t.dataset) {
    t.disabled = true;
    generateProduct(() => { state.generated = true; render(); });
    return;
  }
  if ('window' in t.dataset) { state.windowOpen = true; return go(5); }
  if ('cert' in t.dataset) { state.windowOpen = false; return go(5); }
  if ('restart' in t.dataset) {
    Object.assign(state, { maxStep: 1, generated: false, windowOpen: false });
    product.visible = false;
    return go(1);
  }
});
panel.addEventListener('input', (e) => {
  if (e.target.id === 'color') {
    state.color = Number(e.target.value);
    document.getElementById('colorV').textContent = Math.round(state.color * 100) + '%';
    setUniforms();
  }
});
stepsNav.addEventListener('click', (e) => {
  const t = e.target.closest('button[data-step]');
  if (t && !t.disabled) go(Number(t.dataset.step));
});

// ------------------------------------------------------------------ 尺寸与循环
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.resolution.set(w, h);
  camera.aspect = w / h;
  if (w > 900) camera.setViewOffset(w, h, 200, 0, w, h);
  else camera.setViewOffset(w, h, 0, h * 0.24, w, h);
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
const tmp = new THREE.Vector3();
function loop() {
  const t = clock.getElapsedTime();
  meat.rotation.y = t * 0.18;
  cellMat.uniforms.uTime.value = t;
  tmp.copy(look).add(new THREE.Vector3(mouse.x * 0.25, -mouse.y * 0.12, 0));
  camera.lookAt(tmp);
  composer.render();
  requestAnimationFrame(loop);
}

updateMeat(); setUniforms(); loadDonor(state.species);
render();
loop();
document.getElementById('loading').classList.add('gone');
