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
    show(at, camera) {
      want = at ? strength : 0;
      if (!at) return;
      dir.copy(camera.position).sub(at).normalize().multiplyScalar(0.6);
      dir.y += 0.35;
      light.position.copy(at).add(dir);
    },
    tick(dt) { light.intensity += (want - light.intensity) * Math.min(1, dt * 7); },
  };
}
