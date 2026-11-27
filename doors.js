// The shop's front doors (the same pair in the street and in the shop) and the "depth window" that shows the
// other side through the glass with real parallax.
import * as THREE from 'three';

// ------------------------------------------------------------------ a pair of aluminium-framed glass doors, half open into the shop
// x0..x1 = the opening, y0 = floor, z = the door line. Each leaf: dark aluminium frame, clear glass, brushed-steel kick plate,
// a black iron pull bar on both faces. Returns { left, right } leaf groups (leaf-local: x 0..w along the leaf, z 0 = glass).
const alu = new THREE.MeshStandardMaterial({ color: 0x2a2c2c, metalness: 0.75, roughness: 0.4 });
const steel = new THREE.MeshStandardMaterial({ color: 0xb8bab6, metalness: 1, roughness: 0.32 });
const iron = new THREE.MeshStandardMaterial({ color: 0x1c1d1e, metalness: 0.8, roughness: 0.45 });
const glass = new THREE.MeshPhysicalMaterial({ color: 0xdfe8e6, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.09, envMapIntensity: 1.1, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
function bx(p, w, h, d, m, x, y, z) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); p.add(o); return o; }
function leaf(w, h) {
  const g = new THREE.Group(), F = 0.065, T = 0.05;
  bx(g, F, h, T, alu, F / 2, h / 2, 0); bx(g, F, h, T, alu, w - F / 2, h / 2, 0);              // stiles
  bx(g, w, 0.08, T, alu, w / 2, h - 0.04, 0); bx(g, w, 0.26, T, alu, w / 2, 0.13, 0);          // top rail, bottom rail
  bx(g, w - 2 * F, 0.22, 0.004, steel, w / 2, 0.13, T / 2 + 0.002); bx(g, w - 2 * F, 0.22, 0.004, steel, w / 2, 0.13, -T / 2 - 0.002);   // kick plates
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(w - 2 * F, h - 0.34), glass); pane.position.set(w / 2, 0.26 + (h - 0.34) / 2, 0); pane.renderOrder = 4; g.add(pane);
  for (const s of [1, -1]) {                                                                   // glazing beads both faces
    bx(g, w - 2 * F, 0.012, 0.012, alu, w / 2, h - 0.08, s * 0.02); bx(g, w - 2 * F, 0.012, 0.012, alu, w / 2, 0.26, s * 0.02);
    bx(g, 0.012, h - 0.34, 0.012, alu, F, 0.26 + (h - 0.34) / 2, s * 0.02); bx(g, 0.012, h - 0.34, 0.012, alu, w - F, 0.26 + (h - 0.34) / 2, s * 0.02);
    // iron pull bar: a vertical round bar on two standoffs, near the meeting stile
    const x = w - 0.13, bar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.62, 14), iron); bar.position.set(x, 1.05, s * 0.085); g.add(bar);
    for (const y of [0.79, 1.31]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.07, 10), iron); st.rotation.x = Math.PI / 2; st.position.set(x, y, s * 0.05); g.add(st); }
  }
  for (const y of [0.22, h / 2, h - 0.22]) { const hg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 10), steel); hg.position.set(-0.004, y, 0); g.add(hg); }   // hinges
  return g;
}
export function glassDoors(parent, { x0, x1, y0 = 0, z = 0, h = 2.55, open = 0.55 }) {
  const w = (x1 - x0) / 2 - 0.01;
  const left = new THREE.Group(); left.position.set(x0 + 0.005, y0, z); left.rotation.y = open; left.add(leaf(w, h)); parent.add(left);
  const right = new THREE.Group(); right.position.set(x1 - 0.005, y0, z); right.rotation.y = Math.PI - open * 0.8; right.add(leaf(w, h)); parent.add(right);
  return { left, right };
}

// ------------------------------------------------------------------ door lamp: a caged bulkhead lamp, warm bulb, on the header above the door
export function doorLamp(parent, [x, y, z], { face = 1, light = 2.6 } = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = face > 0 ? 0 : Math.PI; parent.add(g);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.05, 24), iron); base.rotation.x = Math.PI / 2; base.position.z = 0.025; g.add(base);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.085, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.0, 1.3) }));
  lens.rotation.x = Math.PI / 2; lens.position.z = 0.05; lens.scale.set(1, 0.9, 1); g.add(lens);
  for (let k = 0; k < 3; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.006, 6, 24, Math.PI), iron); r.rotation.set(0, k * Math.PI / 3 - Math.PI / 2, Math.PI / 2); r.position.z = 0.05; g.add(r); }
  const pl = new THREE.PointLight(0xffc488, light, 5.5, 1.8); pl.position.set(0, -0.15, 0.35); g.add(pl);
  return g;
}

// ------------------------------------------------------------------ depth window: what is behind the glass, with parallax
// The other scene was rendered once (colour + depth, off-axis camera). Each pixel of this plane marches its own view ray into
// that depth image and takes the colour where the ray meets the stored surface, so walking past the window the room behind it
// moves like a room, not a poster. view = world (this scene) -> bake camera view; proj = the bake camera's projection.
export function depthWindow(colorUrl, depthUrl, { view, proj, near, far, maxT = 14, tint = 0.92 }) {
  const L = new THREE.TextureLoader();
  const tc = L.load(colorUrl); tc.colorSpace = THREE.SRGBColorSpace; tc.anisotropy = 8;
  const td = L.load(depthUrl); td.colorSpace = THREE.NoColorSpace; td.minFilter = td.magFilter = THREE.NearestFilter; td.generateMipmaps = false;
  const m = new THREE.ShaderMaterial({ fog: false,
    uniforms: { tColor: { value: tc }, tDepth: { value: td }, uView: { value: view }, uProj: { value: proj }, uNear: { value: near }, uFar: { value: far }, uMaxT: { value: maxT }, uTint: { value: tint } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`
      #include <packing>
      uniform sampler2D tColor, tDepth; uniform mat4 uView, uProj; uniform float uNear, uFar, uMaxT, uTint; varying vec3 vW;
      vec2 toUv(vec3 p, out float z) { vec4 v = uView * vec4(p, 1.0); z = -v.z; vec4 c = uProj * v; return c.xy / c.w * 0.5 + 0.5; }
      float depthAt(vec2 uv) { return -perspectiveDepthToViewZ(unpackRGToDepth(texture2D(tDepth, uv).rg), uNear, uFar); }
      void main() {
        vec3 dir = normalize(vW - cameraPosition);
        const int N = 64; float dt = uMaxT / float(N), t = 0.0, prev = 0.0, z; vec2 uv; bool hit = false;
        for (int i = 0; i < N; i++) {
          t += dt; uv = toUv(vW + dir * t, z);
          if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) break;
          if (z >= depthAt(uv)) { hit = true; break; }
          prev = t;
        }
        if (hit) { float a = prev, b = t; for (int j = 0; j < 7; j++) { float m = (a + b) * 0.5; vec2 u = toUv(vW + dir * m, z); if (z >= depthAt(u)) b = m; else a = m; } uv = toUv(vW + dir * b, z); }
        else uv = clamp(toUv(vW, z), 0.0, 1.0);
        gl_FragColor = vec4(texture2D(tColor, uv).rgb * uTint, 1.0);
      }` });
  m.userData.noAO = true;
  return m;
}
