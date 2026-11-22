// 会拉开的大帘子：两幅布挂在一根顶轨上，从中间往两头收。
//   收拢时褶子变深、变密；拉动时下摆比吊环慢半拍，停下来再轻轻晃两下。布用的是扫描的织物贴图。
import * as THREE from 'three';

export function createCurtain({ x0, x1, split, z, top, bottom, fabric, metal, gathered = 0.95, seconds = 4.2 }) {
  const group = new THREE.Group(), panels = [];
  const rail = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 0.1, 0.035, 0.045), metal);
  rail.position.set((x0 + x1) / 2, top + 0.045, z);
  group.add(rail);

  for (const [edge, inner] of [[x0, split + 0.07], [x1, split - 0.07]]) {
    const full = Math.abs(inner - edge), dir = Math.sign(inner - edge), pleats = Math.round(full / 0.27), nu = pleats * 6, nv = 14;
    const geo = new THREE.PlaneGeometry(1, 1, nu, nv), uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * full * 1.35, uv.getY(i) * (top - bottom));   // 布比它遮住的宽度多三成；uv 用米
    const mesh = new THREE.Mesh(geo, fabric);
    mesh.frustumCulled = false;
    const rings = new THREE.InstancedMesh(new THREE.TorusGeometry(0.019, 0.004, 5, 10).rotateY(Math.PI / 2), metal, pleats + 1);
    rings.frustumCulled = false;
    group.add(mesh, rings);
    panels.push({ edge, dir, full, pleats, nu, nv, geo, mesh, rings });
  }

  const state = { open: 0 }, m = new THREE.Matrix4();
  let drawn = -1, drawnSway = 0, last = 0, speed = 0, sway = 0, swayV = 0, tween = null;

  function shape(open, swing) {
    for (const { edge, dir, full, pleats, nu, nv, geo, rings } of panels) {
      const width = full + (gathered - full) * open, amp = 0.032 + 0.07 * Math.pow(open, 0.6), p = geo.attributes.position;
      for (let iy = 0, n = 0; iy <= nv; iy++) {
        const fall = iy / nv;                                                // 0 = 吊环，1 = 下摆
        for (let ix = 0; ix <= nu; ix++, n++) {
          const u = dir > 0 ? ix / nu : 1 - ix / nu;                         // u：0 = 固定的那头，1 = 拉着走的那头
          const a = u * pleats * Math.PI * 2, irregular = Math.sin(u * 23.0 + edge) * 0.5 + Math.sin(u * 7.3) * 0.8;
          const deep = amp * (0.55 + 0.6 * fall) * (0.82 + 0.18 * Math.sin(u * 41 + edge));
          const x = edge + dir * (u * width + swing * fall * fall * u * 0.5 + Math.cos(a) * 0.012 * fall);
          const y = top - fall * (top - bottom) + Math.sin(a * 0.5 + irregular) * 0.014 * fall * fall;
          p.setXYZ(n, x, y, z + Math.sin(a + irregular * fall * 0.6) * deep + Math.sin(u * 5 + edge) * 0.02 * fall);
        }
      }
      p.needsUpdate = true;
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      for (let i = 0; i <= pleats; i++) rings.setMatrixAt(i, m.makeTranslation(edge + dir * (i / pleats) * width, top + 0.014, z));
      rings.instanceMatrix.needsUpdate = true;
      rings.computeBoundingSphere();
    }
  }
  shape(0, 0);

  return {
    group,
    meshes: panels.map((p) => p.mesh),
    get open() { return state.open; },
    set(open, instant = false) {
      tween?.kill();
      const to = open ? 1 : 0;
      if (instant || matchMedia('(prefers-reduced-motion: reduce)').matches) { state.open = last = to; return; }
      tween = gsap.to(state, { open: to, duration: Math.max(1.2, seconds * Math.abs(to - state.open)), ease: 'sine.inOut' });
    },
    tick(dt) {
      if (dt > 0) speed = (state.open - last) / dt;
      last = state.open;
      swayV += ((speed * 1.5 - sway) * 26 - swayV * 4.2) * dt;                 // 下摆是一个带阻尼的摆
      sway += swayV * dt;
      if (Math.abs(state.open - drawn) < 1e-4 && Math.abs(sway - drawnSway) < 0.002) return;
      drawn = state.open; drawnSway = sway;
      shape(state.open, sway);
    },
  };
}
