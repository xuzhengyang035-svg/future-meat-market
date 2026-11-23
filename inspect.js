// 把一样东西拿到眼前看：从它在场景里的位置飞到镜头前，拖动可以翻过来，滚轮拉近拉远，点空白处放回去。
// 拿在手里时周围暗下去，用那盏一直备着、强度为 0 的补光照亮它（不新增灯：新增灯会让所有材质重编）。
import * as THREE from 'three';
import { SPECIMENS } from './specimens.js';

export function createInspector({ camera, getScene, getLight, loadTextures, compile, onOpen, onClose }) {
  const layer = document.createElement('div');
  layer.id = 'inspect';
  layer.innerHTML = '<div class="shade"></div><div class="name"></div><div class="turn" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M10 26a14 14 0 0 0 26 6M38 22a14 14 0 0 0-26-6"/><path d="M33 33l3-1 1 4M15 15l-3 1-1-4"/></svg></div>';
  document.body.appendChild(layer);
  const nameEl = layer.querySelector('.name');

  let cur = null;                                                              // { obj, from, t, spin, dist, closing, scene }
  const cache = new Map();
  const tmp = new THREE.Vector3(), fwd = new THREE.Vector3(), q = new THREE.Quaternion(), qx = new THREE.Quaternion(), qy = new THREE.Quaternion();
  const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);

  function build(id, ctx) {
    const made = SPECIMENS[id](ctx);
    const box = new THREE.Box3().setFromObject(made.group), size = box.getSize(new THREE.Vector3()).length();
    const pivot = new THREE.Group();
    made.group.position.sub(made.center);
    pivot.add(made.group);
    pivot.userData.fit = 0.2 / size;
    pivot.userData.view = made.view || [0.35, -0.5, 0];                                           // 拿到眼前大约 20 cm 见方：小东西放大看，大东西缩一点
    pivot.traverse((o) => { o.userData.keep = true; o.frustumCulled = false; o.renderOrder = 10; });
    return pivot;
  }
  // 走近一个点时先把要拿的东西备好（下载贴图、编译着色器），点下去不会卡一下
  async function prepare(ids, ctx) {
    for (const id of ids) {
      if (!SPECIMENS[id] || cache.has(id)) continue;
      const obj = build(id, ctx);
      cache.set(id, obj);
      await loadTextures(obj);
      await compile(obj);
    }
  }
  function open(id, fromWorld, title, ctx) {
    if (cur && !cur.closing) return;
    if (cur) finish();
    let obj = cache.get(id);
    if (!obj || id === 'order') { obj = build(id, ctx); cache.set(id, obj); loadTextures(obj); }
    const scene = getScene();
    scene.add(obj);
    cur = { id, obj, scene, from: fromWorld.clone(), t: 0, closing: false, spin: new THREE.Quaternion().setFromEuler(new THREE.Euler(...obj.userData.view)), dist: 0.42, base: obj.userData.fit };
    nameEl.textContent = title;
    layer.classList.remove('turned');
    layer.classList.add('on');
    onOpen?.();
  }
  function close() { if (cur && !cur.closing) { cur.closing = true; layer.classList.remove('on'); } }
  function finish() { cur.scene.remove(cur.obj); cur = null; onClose?.(); }

  // 拖动翻转、滚轮远近、点一下放回去
  let drag = null;
  layer.addEventListener('pointerdown', (e) => { if (!cur || cur.closing) return; drag = { x: e.clientX, y: e.clientY, moved: 0 }; layer.setPointerCapture(e.pointerId); layer.classList.add('grab'); });
  layer.addEventListener('pointermove', (e) => {
    if (!drag || !cur) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY;
    qy.setFromAxisAngle(Y, dx * 0.009); qx.setFromAxisAngle(X, dy * 0.009);
    cur.spin.premultiply(qy).premultiply(qx);
    if (drag.moved > 20) layer.classList.add('turned');
  });
  const up = () => { if (!drag) return; const moved = drag.moved; drag = null; layer.classList.remove('grab'); if (moved < 5) close(); };
  layer.addEventListener('pointerup', up); layer.addEventListener('pointercancel', () => { drag = null; layer.classList.remove('grab'); });
  layer.addEventListener('wheel', (e) => { if (cur) cur.dist = THREE.MathUtils.clamp(cur.dist * (1 + e.deltaY * 0.001), 0.26, 0.7); e.preventDefault(); }, { passive: false });
  addEventListener('keydown', (e) => { if (cur && e.key === 'Escape') { e.stopPropagation(); close(); } }, true);

  function update(dt) {
    if (!cur) return;
    cur.t = THREE.MathUtils.clamp(cur.t + (cur.closing ? -dt : dt) / 0.55, 0, 1);
    if (cur.closing && cur.t <= 0) return finish();
    const k = cur.t * cur.t * (3 - 2 * cur.t);
    camera.getWorldDirection(fwd);
    tmp.copy(camera.position).addScaledVector(fwd, cur.dist);
    cur.obj.position.lerpVectors(cur.from, tmp, k);
    q.copy(camera.quaternion).multiply(cur.spin);
    cur.obj.quaternion.copy(q);
    cur.obj.scale.setScalar(cur.base * (0.25 + 0.75 * k));
    const light = getLight();
    light?.show(cur.obj.position, camera, 0.85 / (light.strength || 3.2));      // 拿在手里离补光很近：不管哪个房间都只用很弱的一点
  }
  return { open, close, update, prepare, get active() { return !!cur; }, get open_() { return !!cur && !cur.closing; } };
}
