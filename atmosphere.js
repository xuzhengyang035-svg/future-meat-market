// 空气感：灯下的光锥、罐子周围的辉、远处一层一层的雾。都是一片很轻的网格 + 几行着色器，不是真的体积光，几乎不花显卡。
//   另外每个场景常备一盏强度为 0 的灯给悬停反馈用（灯数不变，着色器就不用重编）。
import * as THREE from 'three';

const base = { transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending };
const softVertex = /* glsl */`
  varying vec2 vUv;
  varying vec3 vN, vP;
  void main() {
    vUv = uv;
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vP = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }`;

const UP = new THREE.Vector3(0, 1, 0);

// 灯下面的一道光：边缘是软的，离灯越远越淡；镜头凑近了自己淡掉，不糊一脸
export function lightCone(parent, from, dir, { length = 2.5, radius = 1, top = 0.1, color = 0xffffff, strength = 0.12 } = {}) {
  const geo = new THREE.CylinderGeometry(top, radius, length, 32, 1, true).translate(0, -length / 2, 0);
  const mat = new THREE.ShaderMaterial({ ...base, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uK: { value: strength } },
    vertexShader: softVertex,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      uniform float uK;
      varying vec2 vUv;
      varying vec3 vN, vP;
      void main() {
        float edge = pow(abs(dot(normalize(vN), normalize(-vP))), 2.6);
        float along = smoothstep(0.0, 0.6, vUv.y) * smoothstep(1.0, 0.94, vUv.y);
        float a = edge * along * uK * smoothstep(0.4, 2.4, -vP.z) * 0.5;
        gl_FragColor = vec4(uColor * a, 1.0);
      }` });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...from);
  m.quaternion.setFromUnitVectors(UP, new THREE.Vector3(...dir).normalize().negate());
  m.renderOrder = 3;
  m.userData.keep = true;
  parent.add(m);
  return m;
}

// 一根发光的柱子周围那团辉
export function glowColumn(parent, at, { radius = 0.9, height = 2.5, color = 0x66ff99, strength = 0.2 } = {}) {
  const mat = new THREE.ShaderMaterial({ ...base,
    uniforms: { uColor: { value: new THREE.Color(color) }, uK: { value: strength } },
    vertexShader: softVertex,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      uniform float uK;
      varying vec2 vUv;
      varying vec3 vN, vP;
      void main() {
        float body = pow(abs(dot(normalize(vN), normalize(-vP))), 3.2);
        float ends = smoothstep(0.0, 0.32, vUv.y) * smoothstep(1.0, 0.72, vUv.y);
        gl_FragColor = vec4(uColor * body * ends * uK, 1.0);
      }` });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 28, 1, true), mat);
  m.position.set(...at);
  m.renderOrder = 3;
  m.userData.keep = true;
  parent.add(m);
  return m;
}

// 一层立着的雾：下面浓、上面散，慢慢地流。放在前景和后景之间，纵深就出来了
export function hazeLayer(parent, at, { width = 16, height = 4, color = 0x2a8f88, strength = 0.1 } = {}) {
  const mat = new THREE.ShaderMaterial({ ...base,
    uniforms: { uColor: { value: new THREE.Color(color) }, uK: { value: strength }, uTime: { value: 0 } },
    vertexShader: softVertex,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      uniform float uK, uTime;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * vec2(7.0, 3.0);
        float drift = sin(p.x * 1.3 + uTime * 0.12 + sin(p.y * 2.1 - uTime * 0.09)) * sin(p.y * 1.7 + p.x * 0.6 + uTime * 0.07);
        float body = smoothstep(1.0, 0.25, vUv.y) * smoothstep(0.0, 0.12, vUv.y) * smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
        gl_FragColor = vec4(uColor * body * uK * (0.78 + 0.22 * drift), 1.0);
      }` });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  m.position.set(...at);
  m.renderOrder = 2;
  m.userData.keep = true;
  m.onBeforeRender = () => { mat.uniforms.uTime.value = performance.now() / 1000; };
  parent.add(m);
  return m;
}

// 悬停时打在那样东西上的一小盏灯：一直都在，平时强度 0
export function focusLight(scene, strength = 3.5) {
  const light = new THREE.PointLight(0xd8fff2, 0, 2.6, 1.6), dir = new THREE.Vector3();
  scene.add(light);
  let want = 0;
  return {
    strength,
    show(at, camera, k = 1) {
      want = at ? strength * k : 0;
      if (!at) return;
      dir.copy(camera.position).sub(at).normalize().multiplyScalar(0.6);
      dir.y += 0.35;
      light.position.copy(at).add(dir);
    },
    tick(dt) { light.intensity += (want - light.intensity) * Math.min(1, dt * 7); },
  };
}

// 光柱里飘着的灰：丁达尔效应要有东西把光散出来。几百个点，在光锥里慢慢漂，越靠光柱中心越亮
export function dustMotes(parent, from, dir, { length = 2.5, radius = 0.9, top = 0.1, count = 180, color = 0xfff2dc, size = 0.0065, strength = 0.5 } = {}) {
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const t = 0.08 + Math.random() * 0.9, rad = (top + (radius - top) * t) * Math.sqrt(Math.random()) * 0.85, a = Math.random() * Math.PI * 2;
    pos.set([Math.cos(a) * rad, -t * length, Math.sin(a) * rad], i * 3); seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({ ...base,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uK: { value: strength * 0.6 }, uSize: { value: size }, uScale: { value: 800 }, uLen: { value: length } },
    vertexShader: /* glsl */`
      attribute float seed; uniform float uTime, uSize, uScale, uLen; varying float vA;
      void main() {
        vec3 p = position + vec3(sin(uTime * 0.11 + seed * 40.0), sin(uTime * 0.07 + seed * 23.0) * 1.4, cos(uTime * 0.09 + seed * 17.0)) * 0.04;
        p.y -= mod(uTime * 0.008 * (0.5 + seed), 0.06);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float t = -position.y / uLen;
        vA = smoothstep(0.0, 0.15, t) * smoothstep(1.0, 0.75, t) * (0.45 + 0.55 * sin(uTime * (0.6 + seed) + seed * 50.0) * 0.5 + 0.3) * smoothstep(0.3, 1.2, -mv.z);
        gl_PointSize = uSize * uScale / -mv.z * (0.6 + seed * 0.8);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uK; varying float vA;
      void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uColor * smoothstep(0.5, 0.0, d) * vA * uK, 1.0); }` });
  const pts = new THREE.Points(geo, mat);
  pts.position.set(...from);
  pts.quaternion.setFromUnitVectors(UP, new THREE.Vector3(...dir).normalize().negate());
  pts.renderOrder = 4; pts.frustumCulled = false; pts.userData.keep = true;
  const size2 = new THREE.Vector2();
  pts.onBeforeRender = (r, s, cam) => { mat.uniforms.uTime.value = performance.now() / 1000; r.getDrawingBufferSize(size2); mat.uniforms.uScale.value = size2.y * 0.5 * cam.projectionMatrix.elements[5]; };
  parent.add(pts);
  return pts;
}
