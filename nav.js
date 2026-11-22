// 房间里走动（所有房间共用）：几个固定点位，点位之间是画好的路线。
//   路标：每个去处只有一个——贴着地面透视的一枚半透明圆盘，里面一个小箭头指着出发的方向，底下只有地名。
//        · 指上去（或指到那条路附近的地面）：整条路亮起来一道细光，终点浮出一圈落点，别的路标退淡；点下去就走。地面本身就是按钮
//        · 在画面外的去处停靠在屏幕左右两边，所以站在哪儿都数得清有几条路
//        · 键盘：↑ / W 往前，← → / A D 转向并选中旁边那条，回车走，↓ / S 往回；走到一半也能掉头
//   走：按人的节奏——慢慢起步、匀速、拐弯和楼梯上慢下来、到了再停；头先转向要走的方向，转头有速度上限，不甩镜头。
import * as THREE from 'three';

const deg = THREE.MathUtils.radToDeg, rad = THREE.MathUtils.degToRad, clamp = THREE.MathUtils.clamp;
export const wrap = (a) => ((a + 180) % 360 + 360) % 360 - 180;
const yawOf = (dx, dz) => deg(Math.atan2(dx, -dz));
const still = matchMedia('(prefers-reduced-motion: reduce)');

// 人转头：有惯性、有最高速度（度 / 秒），起和停都是软的
function damp(value, target, state, time, maxSpeed, dt) {
  const w = 2 / time, x = w * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = clamp(value - target, -maxSpeed * time, maxSpeed * time), t = (state.v + w * change) * dt;
  state.v = (state.v - w * t) * e;
  return value - change + (change + t) * e;
}

// 折线 → 拐角倒圆，再按距离取点；y 是脚下地面的高度
function makePath(raw, radius) {
  const p = raw.map(([x, z, y = 0]) => new THREE.Vector3(x, y, z)), out = [p[0].clone()];
  for (let i = 1; i < p.length - 1; i++) {
    const before = p[i].distanceTo(p[i - 1]), after = p[i].distanceTo(p[i + 1]), r = Math.min(radius, before / 2, after / 2);
    const a = p[i].clone().lerp(p[i - 1], r / before), b = p[i].clone().lerp(p[i + 1], r / after), c = new THREE.QuadraticBezierCurve3(a, p[i], b);
    for (let k = 0; k <= 14; k++) out.push(c.getPoint(k / 14));
  }
  out.push(p[p.length - 1].clone());
  const len = [0];
  for (let i = 1; i < out.length; i++) len.push(len[i - 1] + out[i].distanceTo(out[i - 1]));
  const total = len[len.length - 1];
  const at = (s) => {
    s = clamp(s, 0, total);
    let i = 1;
    while (i < out.length - 1 && len[i] < s) i++;
    return out[i - 1].clone().lerp(out[i], clamp((s - len[i - 1]) / (len[i] - len[i - 1] || 1), 0, 1));
  };
  const dir = (s, span = 0.3) => at(Math.min(total, s + span)).sub(at(Math.max(0, s - span)));
  const yaw = (s, span) => { const d = dir(s, span); return yawOf(d.x, d.z); };
  return { total, at, dir, yaw };
}

// ---------------------------------------------------------------- 选中时地上的那道光和终点那一圈
const trailMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5,
  uniforms: { uTime: { value: 0 }, uOn: { value: 0 }, uLen: { value: 1 } },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform float uTime, uOn, uLen;
    varying vec2 vUv;
    void main() {
      float x = abs(vUv.y * 2.0 - 1.0), aa = fwidth(x);
      float core = 1.0 - smoothstep(0.16 - aa, 0.16 + aa, x);
      float glow = pow(max(1.0 - x, 0.0), 2.5) * 0.22;
      float ends = smoothstep(0.2, 1.1, vUv.x) * (1.0 - smoothstep(uLen - 0.8, uLen - 0.35, vUv.x));
      float flow = pow(0.5 + 0.5 * sin(vUv.x * 2.4 - uTime * 4.0), 4.0);
      float a = (core * (0.3 + 0.4 * flow) + glow) * ends * uOn;
      if (a < 0.003) discard;
      gl_FragColor = vec4(vec3(1.05, 1.28, 1.22), a);
    }`,
});
const landMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5,
  uniforms: { uTime: { value: 0 }, uOn: { value: 0 } },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform float uTime, uOn;
    varying vec2 vUv;
    void main() {
      float r = length(vUv - 0.5) * 2.0, aa = fwidth(r), p = fract(uTime * 0.7);
      float ring = 1.0 - smoothstep(0.018, 0.018 + aa, abs(r - 0.6));
      float wave = (1.0 - smoothstep(0.012, 0.012 + aa, abs(r - 0.6 - p * 0.36))) * (1.0 - p) * 0.55;
      float fill = (1.0 - smoothstep(0.0, 0.58, r)) * 0.14;
      float a = (ring * 0.85 + wave + fill) * uOn;
      if (a < 0.003) discard;
      gl_FragColor = vec4(vec3(1.05, 1.28, 1.22), a);
    }`,
});

function trailGeometry(path, width) {
  const n = Math.max(4, Math.ceil(path.total / 0.15)), pos = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const s = (path.total * i) / n, p = path.at(s), d = path.dir(clamp(s, 0.05, path.total - 0.05), 0.15), l = Math.hypot(d.x, d.z) || 1;
    const x = (-d.z / l) * width / 2, z = (d.x / l) * width / 2;
    pos.push(p.x - x, p.y + 0.022, p.z - z, p.x + x, p.y + 0.022, p.z + z);
    uv.push(s, 0, s, 1);
    if (i) { const k = (i - 1) * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

const DISC = '<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="fill" cx="50" cy="50" r="45"/><circle class="rim" cx="50" cy="50" r="45"/>'
  + '<path class="point" d="M50 28 L70 64 Q71.5 68 67.5 67 L50 59 L32.5 67 Q28.5 68 30 64 Z"/></svg>';
const TURN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5 4 10l5 5M4.5 10H15a5 5 0 0 1 0 10h-3"/></svg>';

export function createNav({ scene, graph, camera, eye, look, home, visible, onStep }) {
  const opt = { mark: 3.0, width: 0.34, radius: 1.3, ...graph.path };
  const pace = { speed: 2.4, stairs: 1.1, accel: 1.3, turn: 62, ...graph.pace };
  const node = (id) => graph.nodes[id];
  const standAt = (id) => new THREE.Vector3(node(id).at[0], (node(id).at[2] || 0) + graph.eye, node(id).at[1]);

  const links = {};
  for (const id of Object.keys(graph.nodes)) links[id] = [];
  for (const r of graph.routes) {
    const pts = [node(r.a).at, ...(r.via || []), node(r.b).at], radius = r.radius ?? opt.radius;
    const there = makePath(pts, radius), back = makePath([...pts].reverse(), radius);
    const add = (from, to, path, rev, mark) => {
      const s = mark ?? Math.min(opt.mark, path.total * 0.8), p = path.at(s), o = path.at(0);
      links[from].push({ from, to, path, rev, mark: p, markYaw: path.yaw(Math.min(path.total - 0.05, s + 0.25), 0.35), bearing: yawOf(p.x - o.x, p.z - o.z) });
    };
    add(r.a, r.b, there, back, r.markA);
    if (!r.oneWay) add(r.b, r.a, back, there, r.markB);
  }

  const layer = document.createElement('div');
  layer.className = 'ways';
  const turnBtn = document.createElement('button');
  turnBtn.className = 'turnback';
  turnBtn.innerHTML = TURN;
  turnBtn.setAttribute('aria-label', '掉头');
  turnBtn.addEventListener('click', () => turnBack());
  layer.appendChild(turnBtn);
  document.body.appendChild(layer);

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3(), plane = new THREE.Plane(), v = new THREE.Vector3();
  const landGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  let exits = [], builtFor = null, pointed = null, chosen = null, walk = null, shown = false, station = graph.start, came = null;
  let trail = null, land = null, lit = null, glow = 0, last = 0, builtAt = 0;

  function unlight() {
    if (!trail) return;
    scene.remove(trail); scene.remove(land);
    trail.geometry.dispose();
    trail = land = lit = null;
  }
  function clear() {
    for (const e of exits) e.el.remove();
    exits = []; builtFor = null; pointed = chosen = null;
    unlight();
    glow = 0;
    layer.classList.remove('on', 'walking');
  }
  function build(t) {
    clear();
    builtFor = station;
    builtAt = t;
    for (const link of links[station]) {
      const el = document.createElement('button'), name = node(link.to).name || '';
      el.className = 'way';
      el.setAttribute('aria-label', name);
      el.innerHTML = `<span class="disc">${DISC}</span><span class="name">${name}</span>`;
      const e = { link, el, disc: el.querySelector('.disc') };
      el.addEventListener('pointerenter', () => { pointed = e; chosen = null; });
      el.addEventListener('pointerleave', () => { if (pointed === e) pointed = null; });
      el.addEventListener('focus', () => { chosen = e; });
      el.addEventListener('click', () => step(link));
      layer.appendChild(el);
      exits.push(e);
    }
  }
  function light(e) {
    if (lit === e) return;
    unlight();
    if (!e) return;
    lit = e;
    glow = 0;
    const { path } = e.link;
    trailMat.uniforms.uLen.value = path.total;
    trail = new THREE.Mesh(trailGeometry(path, opt.width), trailMat);
    land = new THREE.Mesh(landGeo, landMat);
    land.position.copy(path.at(path.total));
    land.position.y += 0.024;
    land.scale.setScalar(opt.width * 4.4);
    trail.renderOrder = land.renderOrder = 4;
    trail.userData.nav = land.userData.nav = true;
    scene.add(trail); scene.add(land);
  }

  // 每个路标摆在屏幕哪儿：看得见的贴着地（按透视压扁、转向），看不见的停到左右两边
  function placeMarks() {
    const W = innerWidth, H = innerHeight, focal = H / 2 / Math.tan(rad(camera.fov / 2)), bottom = H - 128, floor = [];
    const side = { left: [], right: [] };
    for (const e of exits) {
      const turn = wrap(e.link.bearing - look.yaw), behind = v.copy(e.link.mark).applyMatrix4(camera.matrixWorldInverse).z > -0.1;
      v.copy(e.link.mark).project(camera);
      const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
      e.turn = turn;
      if (behind || x < 44 || x > W - 44 || Math.abs(turn) > 78) { side[turn < 0 ? 'left' : 'right'].push(e); continue; }
      const dist = camera.position.distanceTo(e.link.mark);
      e.x = x; e.y = clamp(y, 120, bottom);
      e.size = clamp((focal * 0.66) / dist, 54, 92);
      e.squash = y > bottom ? 0.72 : clamp((camera.position.y - e.link.mark.y) / dist, 0.46, 0.8);
      floor.push(e);
    }
    floor.sort((a, b) => a.x - b.x);
    for (let i = 1; i < floor.length; i++) {
      const a = floor[i - 1], b = floor[i], need = (a.size + b.size) / 2 + 14;
      if (Math.abs(b.y - a.y) < 80 && b.x - a.x < need) { const push = (need - (b.x - a.x)) / 2; a.x -= push; b.x += push; }
    }
    for (const e of floor) {
      e.el.classList.remove('edge', 'left', 'right');
      e.el.style.transform = `translate(${e.x.toFixed(1)}px, ${e.y.toFixed(1)}px)`;
      e.el.style.setProperty('--s', `${e.size.toFixed(1)}px`);
      e.el.style.setProperty('--sy', `${(e.size * e.squash).toFixed(1)}px`);
      e.disc.style.transform = `translate(-50%, -50%) scaleY(${e.squash.toFixed(3)}) rotate(${wrap(e.link.markYaw - look.yaw).toFixed(1)}deg)`;
    }
    for (const [name, list] of Object.entries(side)) {
      list.sort((a, b) => Math.abs(a.turn) - Math.abs(b.turn)).forEach((e, i) => {
        const left = name === 'left';
        e.el.classList.add('edge', name);
        e.el.classList.remove(left ? 'right' : 'left');
        e.el.style.transform = `translate(${left ? 40 : W - 40}px, ${Math.min(bottom, H * 0.56 + i * 82)}px)`;
        e.el.style.setProperty('--s', '50px');
        e.el.style.setProperty('--sy', '50px');
        // 在身后的箭头画成朝下：一眼看出那是回头路
        e.disc.style.transform = `translate(-50%, -50%) rotate(${Math.abs(e.turn) > 150 ? 180 : left ? -90 : 90}deg)`;
      });
    }
  }

  // 停下时朝哪：顺着走来的方向，稍微偏一点让前面的路标进画面；回头路留在身后（它会停在屏幕边上）
  function arrive(id, travel, from) {
    const { views, face } = node(id);
    if (views) {
      const best = views.reduce((a, b) => (Math.abs(wrap(b - travel)) < Math.abs(wrap(a - travel)) ? b : a));
      if (camera.aspect >= 1) return best;
      travel = best;
    } else if (face !== undefined) return face;
    const half = deg(Math.atan(Math.tan(rad(look.fov / 2)) * camera.aspect)) * 0.62;
    const ahead = links[id].filter((l) => l.to !== from).map((l) => wrap(l.bearing - travel)).filter((a) => Math.abs(a) < 120).sort((a, b) => Math.abs(a) - Math.abs(b));
    if (!ahead.length) return travel;
    return travel + (ahead[0] > half ? ahead[0] - half : ahead[0] < -half ? ahead[0] + half : 0);
  }

  // 直接站到一个点位上（进门、从别的房间过来）
  function place(id = graph.start, yaw) {
    walk = null;
    clear();
    station = id; came = null;
    home.eye.copy(standAt(id));
    home.fov = graph.fov;
    look.fov = graph.fov;
    home.yaw = yaw ?? arrive(id, node(id).face ?? 0, null);
    home.pitch = node(id).pitch ?? graph.pitch;
    eye.copy(home.eye);
    Object.assign(look, { yaw: home.yaw, tYaw: home.yaw, pitch: home.pitch, tPitch: home.pitch });
  }

  function begin(from, to, path, rev, d, yawV, pitchV) {
    const end = arrive(to, path.yaw(path.total, 0.6), from);
    station = to; came = from;
    home.eye.copy(standAt(to)); home.yaw = wrap(end); home.pitch = node(to).pitch ?? graph.pitch; home.fov = look.fov;   // 中途点了别的东西，退出来也站在这一步的终点
    walk = { from, to, path, rev, end, d, speed: 0, pitch: home.pitch, yawV, pitchV };
    return end;
  }
  function step(link) {
    if (walk) return;
    clear();
    onStep?.();
    const end = begin(link.from, link.to, link.path, link.rev, 0, { v: 0 }, { v: 0 });
    if (still.matches) place(link.to, end);
  }
  // 走到一半也能掉头
  function turnBack() {
    if (!walk) return;
    const { from, to, path, rev, d, yawV, pitchV } = walk;
    begin(to, from, rev, path, clamp(rev.total - d, 0, rev.total), yawV, pitchV);
  }

  // 每一帧走一点
  function tick(dt) {
    if (!walk) return;
    const { path } = walk, left = path.total - walk.d;
    let want, lean = 0;
    if (left > 0.001) {
      const ahead = Math.min(path.total, walk.d + 1.6), p = path.at(walk.d), q = path.at(ahead), d = path.dir(walk.d + 0.02, 0.25);
      want = path.yaw(Math.min(path.total - 0.05, walk.d + 1.2), 0.7);
      if (left < 1.8) want += wrap(walk.end - want) * THREE.MathUtils.smoothstep(1.8 - left, 0, 1.8);   // 快到了就开始往停下来要看的方向转
      const bend = Math.abs(wrap(path.yaw(ahead, 0.4) - path.yaw(walk.d + 0.02, 0.4)));
      const onStairs = Math.abs(d.y) > 0.25 * d.length() || Math.abs(q.y - p.y) > 0.2;
      let max = pace.speed / (1 + bend / 115);                                 // 拐弯慢一点
      if (onStairs) max = Math.min(max, pace.stairs);
      if (left > 1.8) max *= Math.max(0.2, Math.cos(rad(Math.min(90, Math.abs(wrap(want - look.yaw)) * 0.9))));   // 还没转过来时先别大步走
      max = Math.min(max, Math.sqrt(2 * pace.accel * left) + 0.04);          // 到之前慢下来
      walk.speed = walk.speed < max ? Math.min(max, walk.speed + pace.accel * dt) : Math.max(max, walk.speed - pace.accel * 2 * dt);
      walk.d = Math.min(path.total, walk.d + walk.speed * dt);
      const at = path.at(walk.d);
      eye.set(at.x, at.y + graph.eye, at.z);
      if (onStairs) lean = clamp((q.y - p.y) * 11, -14, 12);
    } else want = walk.end;
    look.yaw = look.tYaw = damp(look.yaw, look.yaw + wrap(want - look.yaw), walk.yawV, 0.5, pace.turn, dt);
    look.pitch = look.tPitch = damp(look.pitch, walk.pitch + lean, walk.pitchV, 0.7, 25, dt);
    if (walk.d >= path.total - 0.001 && Math.abs(wrap(walk.end - look.yaw)) < 2.5) {
      look.tYaw = look.yaw + wrap(walk.end - look.yaw); look.tPitch = walk.pitch;   // 最后这一两度交给平时的缓动
      walk = null;
    }
  }

  function update(t) {
    const dt = clamp(t - last, 0, 0.1), open = visible();
    last = t;
    shown = !walk && open;
    layer.classList.toggle('walking', !!walk && open);
    if (shown && builtFor !== station) build(t);
    layer.classList.toggle('on', shown && t - builtAt > 0.12);
    if (!shown) { if (trail) unlight(); pointed = null; return; }
    const on = pointed || chosen;
    layer.classList.toggle('choosing', !!on);
    for (const e of exits) e.el.classList.toggle('hot', e === on);
    light(on);
    glow = on ? Math.min(1, glow + dt * 5) : 0;
    trailMat.uniforms.uTime.value = landMat.uniforms.uTime.value = still.matches ? 0 : t;
    trailMat.uniforms.uOn.value = landMat.uniforms.uOn.value = glow;
    placeMarks();
  }

  // 指在地面上：离哪条路近就吸到哪条
  function pick(e, canvas) {
    if (!shown || walk || !exits.length) return null;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.ray.direction.y > -0.06) return null;
    const base = node(station).at[2] || 0, stand = standAt(station);
    plane.setComponents(0, 1, 0, -base);
    if (!ray.ray.intersectPlane(plane, hit)) return null;
    const dx = hit.x - stand.x, dz = hit.z - stand.z, far = Math.hypot(dx, dz);
    if (far < 0.4 || far > opt.mark * 6) return null;
    let best = null, score = 1;
    for (const x of exits) {
      const { path, bearing } = x.link;
      let near = Infinity;
      for (let s = 0.4, n = Math.min(path.total, opt.mark * 5); s <= n; s += 0.3) { const p = path.at(s); near = Math.min(near, Math.hypot(p.x - hit.x, p.z - hit.z) + Math.abs(p.y - base) * 0.6); }
      const value = Math.min(near / (0.5 + opt.mark * 0.28), Math.abs(wrap(yawOf(dx, dz) - bearing)) / 20);
      if (value < score) { score = value; best = x; }
    }
    return best;
  }

  // 键盘：前、后、左右换一条、回车走
  function key(code) {
    if (walk) {
      if (!['ArrowDown', 'KeyS', 'Escape'].includes(code)) return false;
      turnBack();
      return true;
    }
    if (!shown || !exits.length) return false;
    const now = exits.map((e) => ({ e, a: wrap(e.link.bearing - look.tYaw) }));
    if (code === 'Enter' && chosen) { step(chosen.link); return true; }
    if (code === 'ArrowUp' || code === 'KeyW') {
      const ahead = chosen || now.filter((x) => Math.abs(x.a) < 75).sort((a, b) => Math.abs(a.a) - Math.abs(b.a))[0]?.e;
      if (ahead) step(ahead.link);
      return true;
    }
    if (code === 'ArrowDown' || code === 'KeyS') {
      const back = exits.find((x) => x.link.to === came) || now.sort((a, b) => Math.abs(b.a) - Math.abs(a.a))[0].e;
      step(back.link);
      return true;
    }
    const dir = code === 'ArrowLeft' || code === 'KeyA' ? -1 : code === 'ArrowRight' || code === 'KeyD' ? 1 : 0;
    if (!dir) return false;
    const round = (a) => ((dir * a) % 360 + 360) % 360;
    const next = now.filter((x) => x.e !== chosen && round(x.a) > 0.5 && round(x.a) < 359.5).sort((a, b) => round(a.a) - round(b.a))[0];
    if (next) { chosen = next.e; pointed = null; look.tYaw += dir * round(next.a); } else { [chosen] = exits; look.tYaw += wrap(exits[0].link.bearing - look.tYaw); }
    return true;
  }

  place();
  return {
    reset: () => place(), place, clear, update, tick, pick, step, key, turnBack, home,
    stop() { walk = null; layer.classList.remove('walking'); },
    setHover(e) { pointed = e; if (e) chosen = null; },
    get walking() { return !!walk; },
    get station() { return station; },
    links: () => links[station],
    allLinks: () => Object.values(links).flat(),
  };
}
