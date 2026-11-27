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

// 空气里悬着的细小水汽 / 浮尘：一个盒子里几千个很小的点，各自慢慢打着旋飘，离镜头太近或太远都淡掉。
// lights: 最多 4 盏灯的位置（世界坐标），靠近灯的颗粒被照亮——雾里看见灯光就是这个样子
export function mistField(parent, { center = [0, 2, 0], size = [20, 6, 12], count = 4000, color = 0xb8c4c8, lightColor = 0xffc890, lights = [], px = 0.012, strength = 0.35, fall = 0.03, swirl = 0.25 } = {}) {
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) { pos.set([(Math.random() - 0.5) * size[0], (Math.random() - 0.5) * size[1], (Math.random() - 0.5) * size[2]], i * 3); seed[i] = Math.random(); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const L = lights.slice(0, 4).map((p) => new THREE.Vector3(...p)); while (L.length < 4) L.push(new THREE.Vector3(1e4, 1e4, 1e4));
  const mat = new THREE.ShaderMaterial({ ...base,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uLight: { value: new THREE.Color(lightColor) }, uK: { value: strength }, uSize: { value: px }, uScale: { value: 800 },
      uBox: { value: new THREE.Vector3(...size) }, uL: { value: L }, uFall: { value: fall }, uSwirl: { value: swirl } },
    vertexShader: /* glsl */`
      attribute float seed; uniform float uTime, uSize, uScale, uFall, uSwirl; uniform vec3 uBox, uL[4]; varying float vA; varying float vLit;
      void main() {
        vec3 p = position;
        float t = uTime * (0.6 + seed * 0.8);
        p += vec3(sin(t * 0.21 + seed * 31.0) + sin(t * 0.07 + p.y), sin(t * 0.13 + seed * 17.0) * 0.6, cos(t * 0.17 + seed * 23.0) + cos(t * 0.05 + p.x)) * uSwirl;
        p.y = mod(p.y + uBox.y * 0.5 - uTime * uFall * (0.4 + seed), uBox.y) - uBox.y * 0.5;     // slow settle, wraps round
        p.x += uTime * 0.04; p.x = mod(p.x + uBox.x * 0.5, uBox.x) - uBox.x * 0.5;                // a breath of wind along the street
        vec4 w = modelMatrix * vec4(p, 1.0);
        float lit = 0.0; for (int i = 0; i < 4; i++) { float d = distance(w.xyz, uL[i]); lit += 1.0 / (1.0 + d * d * 0.9); }
        vLit = clamp(lit, 0.0, 1.5);
        vec4 mv = viewMatrix * w;
        float z = -mv.z;
        vA = smoothstep(1.2, 4.5, z) * smoothstep(26.0, 9.0, z) * (0.55 + 0.45 * sin(uTime * (0.4 + seed) + seed * 60.0));   // 近处的淡掉：贴着脸的水汽看不见颗粒
        gl_PointSize = clamp(uSize * uScale / z * (0.5 + seed), 1.0, 2.6);                                                     // 再近也只是一粒细点
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor, uLight; uniform float uK; varying float vA; varying float vLit;
      void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, d) * vA * uK; gl_FragColor = vec4((uColor * 0.35 + uLight * vLit) * a, 1.0); }` });
  const pts = new THREE.Points(geo, mat);
  pts.position.set(...center); pts.renderOrder = 4; pts.frustumCulled = false; pts.userData.keep = true;
  const s2 = new THREE.Vector2();
  pts.onBeforeRender = (r, s, cam) => { mat.uniforms.uTime.value = performance.now() / 1000; r.getDrawingBufferSize(s2); mat.uniforms.uScale.value = s2.y * 0.5 * cam.projectionMatrix.elements[5]; };
  parent.add(pts);
  return pts;
}

// 一盏灯在潮湿空气里的光晕：一张始终朝着镜头的软圆，中心亮、往外按平方衰减，外圈带一点点冷色
export function lampHalo(parent, at, { radius = 1.4, color = 0xffc890, strength = 0.35 } = {}) {
  const mat = new THREE.ShaderMaterial({ ...base,
    uniforms: { uColor: { value: new THREE.Color(color) }, uK: { value: strength }, uTime: { value: 0 } },
    vertexShader: /* glsl */`varying vec2 vUv; varying float vZ; void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); vZ = -mv.z; mv.xy += position.xy; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uK, uTime; varying vec2 vUv; varying float vZ;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float core = exp(-d * d * 9.0), wide = exp(-d * d * 2.2) * 0.45;
        float breath = 0.94 + 0.06 * sin(uTime * 0.7 + vUv.x * 3.0);
        vec3 c = mix(uColor, vec3(0.6, 0.72, 0.8), smoothstep(0.2, 0.9, d) * 0.4);
        gl_FragColor = vec4(c * (core + wide) * uK * breath * smoothstep(0.8, 2.5, vZ) * smoothstep(1.0, 0.85, d), 1.0);
      }` });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), mat);
  m.position.set(...at); m.renderOrder = 5; m.frustumCulled = false; m.userData.keep = true;
  m.onBeforeRender = () => { mat.uniforms.uTime.value = performance.now() / 1000; };
  parent.add(m);
  return m;
}

// ------------------------------------------------------------------ 体积感的雾：一团一团软的云絮
// 每一团是一张始终面向镜头（只绕竖轴转）的大片，片上用分形噪声画出絮状的雾，再被一个下浓上淡的椭圆收边。
// 噪声在世界空间里取样、随时间慢慢漂，所以镜头一动，雾团之间会错开，有纵深；靠近灯的那几团被染暖。
const NOISE = /* glsl */`
  float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float n3(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * n3(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }`;

export function fogPuffs(parent, puffs, { color = 0x8a9aa2, warm = 0xffc890, lights = [], opacity = 0.28, scale = 0.35, speed = 0.05, nearFade = 2.2 } = {}) {
  const group = new THREE.Group(); group.userData.keep = true; parent.add(group);
  const L = lights.map((p) => new THREE.Vector3(...p));
  const mats = [];
  for (const { pos, w, h, k = 1 } of puffs) {
    const c = new THREE.Vector3(...pos); let lit = 0; for (const l of L) lit += 1 / (1 + c.distanceToSquared(l) * 0.12);
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color).lerp(new THREE.Color(warm), Math.min(0.75, lit * 0.8)) }, uA: { value: opacity * k * (1 + Math.min(0.6, lit)) },
        uScale: { value: scale }, uSpeed: { value: speed }, uNear: { value: nearFade }, uSeed: { value: Math.random() * 100 } },
      vertexShader: /* glsl */`varying vec2 vUv; varying vec3 vW; varying float vZ;
        void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vZ = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: NOISE + /* glsl */`
        uniform vec3 uColor; uniform float uTime, uA, uScale, uSpeed, uNear, uSeed; varying vec2 vUv; varying vec3 vW; varying float vZ;
        void main() {
          vec3 p = vW * uScale + vec3(uTime * uSpeed, uTime * uSpeed * 0.15, uSeed);
          vec3 q = vec3(fbm(p), fbm(p + vec3(5.2, 1.3, 2.8)), 0.0);                       // domain warp: wisps curl into each other
          float d = fbm(p + q * 1.6 + vec3(0.0, 0.0, uTime * uSpeed * 0.6));
          vec2 e = (vUv - 0.5) * 2.0; float shape = smoothstep(1.0, 0.2, length(e * vec2(1.0, 1.2)));
          shape *= smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x) * smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.7, vUv.y);   // every edge of the card fades out, no hard rim
          float low = mix(1.0, 0.45, vUv.y);                                              // heavier at the bottom
          float a = smoothstep(0.38, 0.85, d) * shape * low * uA * smoothstep(uNear * 0.5, uNear * 1.6, vZ);
          gl_FragColor = vec4(uColor * (0.75 + d * 0.5), a);
        }` });
    mats.push(mat);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.copy(c); m.renderOrder = 6; m.frustumCulled = false;
    m.onBeforeRender = (r, s, cam) => { m.rotation.y = Math.atan2(cam.position.x - m.position.x - group.position.x, cam.position.z - m.position.z - group.position.z); mat.uniforms.uTime.value = performance.now() / 1000; };
    group.add(m);
  }
  return group;
}

// 雾里的光柱：一缕一缕的，有亮有暗，里面的雾在翻
export function rayShaft(parent, from, dir, { length = 6, radius = 2, top = 0.2, color = 0xffd2a0, strength = 0.22 } = {}) {
  const geo = new THREE.CylinderGeometry(top, radius, length, 48, 1, true).translate(0, -length / 2, 0);
  const mat = new THREE.ShaderMaterial({ ...base, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uK: { value: strength }, uTime: { value: 0 } },
    vertexShader: /* glsl */`varying vec2 vUv; varying vec3 vN, vP, vW; void main() { vUv = uv; vN = normalize(normalMatrix * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vP = mv.xyz; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: NOISE + /* glsl */`
      uniform vec3 uColor; uniform float uK, uTime; varying vec2 vUv; varying vec3 vN, vP, vW;
      void main() {
        float edge = pow(abs(dot(normalize(vN), normalize(-vP))), 2.2);
        float along = smoothstep(0.0, 0.5, vUv.y) * smoothstep(1.0, 0.92, vUv.y);
        float rays = 0.55 + 0.9 * pow(n3(vec3(vUv.x * 26.0, 0.0, 1.3)), 2.0);            // streaks running down the shaft
        float cloud = fbm(vW * 0.6 + vec3(uTime * 0.04, -uTime * 0.02, 0.0));               // fog churning inside it
        float a = edge * along * rays * (0.35 + cloud) * uK * smoothstep(0.6, 3.0, -vP.z);
        gl_FragColor = vec4(uColor * a, 1.0);
      }` });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...from); m.quaternion.setFromUnitVectors(UP, new THREE.Vector3(...dir).normalize().negate());
  m.renderOrder = 3; m.userData.keep = true; m.onBeforeRender = () => { mat.uniforms.uTime.value = performance.now() / 1000; };
  parent.add(m); return m;
}
