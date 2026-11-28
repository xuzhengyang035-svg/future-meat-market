// 装饰用的动物 (陶瓷摆件、毛绒公仔、广告海报里的“快乐动物”）.
// 不再用几个球拼凑，而是像雕塑一样：用一组椭球、胶囊做出解剖结构，再平滑融合成一整块 (有符号距离场 + 移动立方体），
// 最后按部位上色 (荷斯坦牛的黑白花、猪鼻盘、鸡冠、鱼的金黄腹部）.所有动物都朝 +x 方向，脚踩在 y = 0.
import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';

// ------------------------------------------------------------------ 距离场基本形
function ell(cx, cy, cz, rx, ry, rz, part, k = 0.02, rotZ = 0, rotY = 0) {
  const cz_ = Math.cos(-rotZ), sz_ = Math.sin(-rotZ), cy_ = Math.cos(-rotY), sy_ = Math.sin(-rotY);
  return { part, k, f(x, y, z) {
    let px = x - cx, py = y - cy, pz = z - cz;
    // 先绕 y 再绕 z 的逆变换
    let tx = px * cy_ + pz * sy_; pz = -px * sy_ + pz * cy_; px = tx;
    tx = px * cz_ - py * sz_; py = px * sz_ + py * cz_; px = tx;
    const ax = px / rx, ay = py / ry, az = pz / rz;
    const k0 = Math.sqrt(ax * ax + ay * ay + az * az);
    const bx = ax / rx, by = ay / ry, bz = az / rz;
    const k1 = Math.sqrt(bx * bx + by * by + bz * bz);
    return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(rx, ry, rz);
  } };
}
function cap(a, b, r1, r2, part, k = 0.02) {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const bb = bax * bax + bay * bay + baz * baz;
  return { part, k, f(x, y, z) {
    const pax = x - a[0], pay = y - a[1], paz = z - a[2];
    const h = Math.max(0, Math.min(1, (pax * bax + pay * bay + paz * baz) / bb));
    const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) - (r1 + (r2 - r1) * h);
  } };
}
function torusZ(cx, cy, cz, R, r, part, k = 0.01) {
  return { part, k, f(x, y, z) {
    const qx = Math.hypot(x - cx, y - cy) - R;
    return Math.hypot(qx, z - cz) - r;
  } };
}
const sub = (prim) => ({ ...prim, sub: true });
const mirror = (fn) => [fn(1), fn(-1)];

function smin(a, b, k) {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
function smax(a, b, k) { return -smin(-a, -b, k); }

// ------------------------------------------------------------------ 噪声 (牛的花斑）
function hash3(x, y, z) {
  let h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return h - Math.floor(h);
}
function vnoise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let fx = x - ix, fy = y - iy, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const L = (a, b, t) => a + (b - a) * t;
  return L(L(L(hash3(ix, iy, iz), hash3(ix + 1, iy, iz), fx), L(hash3(ix, iy + 1, iz), hash3(ix + 1, iy + 1, iz), fx), fy),
    L(L(hash3(ix, iy, iz + 1), hash3(ix + 1, iy, iz + 1), fx), L(hash3(ix, iy + 1, iz + 1), hash3(ix + 1, iy + 1, iz + 1), fx), fy), fz);
}
const fbm = (x, y, z) => vnoise(x, y, z) * 0.6 + vnoise(x * 2.1 + 5, y * 2.1, z * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3 + 3, z * 4.3) * 0.1;

// ------------------------------------------------------------------ 各物种的解剖结构
const C = (hex) => new THREE.Color(hex);
const SPECS = {
  // 荷斯坦公牛：肩高约 0.3 (单位米，摆件会再整体缩放）
  cow: {
    center: [0.04, 0.17, 0], half: 0.27,
    prims: [
      ell(0, 0.21, 0, 0.17, 0.085, 0.078, 'body', 0),
      ell(0.11, 0.2, 0, 0.075, 0.09, 0.075, 'body', 0.05),
      ell(-0.12, 0.225, 0, 0.075, 0.078, 0.076, 'body', 0.05),
      ell(0, 0.178, 0, 0.12, 0.07, 0.077, 'body', 0.04),
      ell(0.1, 0.272, 0, 0.055, 0.03, 0.042, 'body', 0.04),
      ...mirror((s) => ell(-0.135, 0.288, s * 0.042, 0.022, 0.013, 0.02, 'body', 0.03)),
      cap([0.13, 0.235, 0], [0.2, 0.255, 0], 0.052, 0.036, 'body', 0.035),
      ell(0.165, 0.185, 0, 0.045, 0.045, 0.02, 'body', 0.035),
      cap([0.212, 0.274, 0], [0.27, 0.214, 0], 0.042, 0.034, 'head', 0.022),
      ell(0.212, 0.286, 0, 0.022, 0.013, 0.036, 'head', 0.012),
      ell(0.287, 0.203, 0, 0.033, 0.029, 0.036, 'muzzle', 0.014),
      ...mirror((s) => sub(ell(0.317, 0.206, s * 0.013, 0.006, 0.008, 0.006, 'muzzle', 0.004))),
      ...mirror((s) => ell(0.203, 0.27, s * 0.062, 0.009, 0.017, 0.032, 'ear', 0.01, 0, s * 0.25)),
      ...mirror((s) => cap([0.207, 0.292, s * 0.026], [0.214, 0.31, s * 0.058], 0.009, 0.004, 'horn', 0.006)),
      ...mirror((s) => cap([0.1, 0.18, s * 0.045], [0.104, 0.085, s * 0.043], 0.032, 0.02, 'body', 0.035)),
      ...mirror((s) => cap([0.104, 0.085, s * 0.043], [0.106, 0.022, s * 0.043], 0.018, 0.016, 'leg', 0.012)),
      ...mirror((s) => ell(0.109, 0.013, s * 0.043, 0.021, 0.013, 0.019, 'hoof', 0.006)),
      ...mirror((s) => cap([-0.12, 0.205, s * 0.046], [-0.145, 0.12, s * 0.04], 0.047, 0.025, 'body', 0.035)),
      ...mirror((s) => cap([-0.145, 0.12, s * 0.04], [-0.128, 0.075, s * 0.04], 0.023, 0.017, 'leg', 0.012)),
      ...mirror((s) => cap([-0.128, 0.075, s * 0.04], [-0.122, 0.022, s * 0.04], 0.017, 0.016, 'leg', 0.008)),
      ...mirror((s) => ell(-0.119, 0.013, s * 0.04, 0.021, 0.013, 0.019, 'hoof', 0.006)),
      cap([-0.188, 0.272, 0], [-0.203, 0.125, 0], 0.01, 0.007, 'body', 0.012),
      ell(-0.204, 0.105, 0, 0.013, 0.026, 0.013, 'tuft', 0.008),
    ],
    eyes: { at: [0.234, 0.266, 0.037], r: 0.0066 },
    color(part, x, y, z) {
      if (part === 'hoof') return C(0x37302c);
      if (part === 'horn') return C(0xe6dcc6);
      if (part === 'muzzle') return C(0x3a3433);
      if (part === 'tuft') return C(0x1f1f20);
      return C(0xf4f1ea);
    },
    // 黑白花斑在着色器里逐像素计算 (逐顶点会有锯齿），这里只标记哪些部位可以有花斑
    spot: (part) => (part === 'body' || part === 'head' || part === 'ear' ? 1 : 0),
  },
  // 粉色家猪：大耳朵向前耷拉，卷尾巴
  pig: {
    center: [0.04, 0.15, 0], half: 0.25,
    prims: [
      ell(0, 0.17, 0, 0.17, 0.1, 0.095, 'body', 0),
      ell(-0.1, 0.175, 0, 0.085, 0.098, 0.092, 'body', 0.05),
      ell(0.09, 0.175, 0, 0.08, 0.1, 0.09, 'body', 0.05),
      ell(0, 0.135, 0, 0.13, 0.072, 0.086, 'body', 0.04),
      ell(0.18, 0.18, 0, 0.07, 0.066, 0.064, 'body', 0.045),
      ...mirror((s) => ell(0.165, 0.148, s * 0.03, 0.05, 0.04, 0.036, 'body', 0.03)),
      cap([0.21, 0.175, 0], [0.252, 0.164, 0], 0.044, 0.033, 'snout', 0.025),
      ell(0.262, 0.164, 0, 0.012, 0.031, 0.036, 'disc', 0.008),
      ...mirror((s) => sub(ell(0.274, 0.166, s * 0.013, 0.006, 0.0085, 0.0055, 'disc', 0.003))),
      ...mirror((s) => ell(0.2, 0.248, s * 0.047, 0.048, 0.012, 0.032, 'ear', 0.012, -0.55, s * -0.3)),
      ...mirror((s) => cap([0.1, 0.12, s * 0.052], [0.104, 0.022, s * 0.052], 0.03, 0.017, 'leg', 0.025)),
      ...mirror((s) => cap([-0.11, 0.13, s * 0.052], [-0.114, 0.022, s * 0.052], 0.036, 0.017, 'leg', 0.025)),
      ...mirror((s) => ell(0.106, 0.012, s * 0.052, 0.019, 0.012, 0.017, 'hoof', 0.005)),
      ...mirror((s) => ell(-0.112, 0.012, s * 0.052, 0.019, 0.012, 0.017, 'hoof', 0.005)),
      cap([-0.168, 0.2, 0], [-0.182, 0.212, 0], 0.008, 0.006, 'body', 0.008),
      torusZ(-0.196, 0.222, 0, 0.015, 0.0058, 'body', 0.004),
    ],
    eyes: { at: [0.215, 0.208, 0.046], r: 0.0055 },
    color(part, x, y, z) {
      if (part === 'hoof') return C(0x8a6a5e);
      if (part === 'disc') return C(0xd88b85);
      const base = C(0xedb8aa);
      if (part === 'ear') return base.clone().lerp(C(0xd99a90), 0.3);
      return base.lerp(C(0xf6d2c7), THREE.MathUtils.clamp((y - 0.1) * 4, 0, 0.5));
    },
  },
  // 白羽母鸡：红冠、黄喙、尾羽上翘
  hen: {
    center: [0.01, 0.16, 0], half: 0.18,
    prims: [
      ell(0, 0.15, 0, 0.092, 0.075, 0.07, 'body', 0, 0.25),
      ell(0.05, 0.148, 0, 0.062, 0.066, 0.062, 'body', 0.03),
      ell(-0.085, 0.205, 0, 0.036, 0.062, 0.026, 'tail', 0.03, 0.5),
      ell(-0.1, 0.225, 0, 0.022, 0.05, 0.016, 'tail', 0.012, 0.75),
      ...mirror((s) => ell(-0.005, 0.162, s * 0.06, 0.072, 0.042, 0.016, 'wing', 0.012, 0.15)),
      cap([0.05, 0.19, 0], [0.076, 0.25, 0], 0.041, 0.026, 'body', 0.03),
      ell(0.084, 0.262, 0, 0.031, 0.027, 0.025, 'body', 0.012),
      ell(0.062, 0.29, 0, 0.012, 0.016, 0.007, 'comb', 0.006),
      ell(0.077, 0.298, 0, 0.011, 0.018, 0.007, 'comb', 0.006),
      ell(0.092, 0.295, 0, 0.011, 0.016, 0.007, 'comb', 0.006),
      ell(0.104, 0.284, 0, 0.009, 0.012, 0.007, 'comb', 0.006),
      ell(0.105, 0.234, 0, 0.009, 0.015, 0.008, 'comb', 0.006),
      cap([0.108, 0.259, 0], [0.13, 0.252, 0], 0.0085, 0.0025, 'beak', 0.004),
      ...mirror((s) => ell(0.002, 0.1, s * 0.03, 0.032, 0.03, 0.024, 'body', 0.02)),
      ...mirror((s) => cap([0.002, 0.085, s * 0.026], [0.006, 0.012, s * 0.026], 0.0075, 0.0062, 'leg', 0.01)),
      ...mirror((s) => cap([0.006, 0.008, s * 0.026], [0.038, 0.006, s * 0.028], 0.0048, 0.0042, 'leg', 0.004)),
      ...mirror((s) => cap([0.006, 0.008, s * 0.026], [0.03, 0.006, s * 0.046], 0.0048, 0.0042, 'leg', 0.004)),
      ...mirror((s) => cap([0.006, 0.008, s * 0.026], [-0.018, 0.007, s * 0.026], 0.0048, 0.0042, 'leg', 0.004)),
    ],
    eyes: { at: [0.096, 0.268, 0.021], r: 0.0046 },
    color(part) {
      if (part === 'comb') return C(0xc4352e);
      if (part === 'beak' || part === 'leg') return C(0xe0a63a);
      if (part === 'wing' || part === 'tail') return C(0xefe9dd);
      return C(0xf7f3ea);
    },
  },
  // 大黄鱼：只用于广告和告示照片
  fish: {
    center: [-0.02, 0.0, 0], half: 0.25,
    prims: [
      ell(0, 0, 0, 0.17, 0.052, 0.027, 'body', 0),
      ell(0.12, -0.002, 0, 0.062, 0.046, 0.025, 'body', 0.03),
      cap([-0.14, 0, 0], [-0.205, 0, 0], 0.02, 0.008, 'body', 0.025),
      ell(-0.222, 0.022, 0, 0.036, 0.015, 0.0065, 'fin', 0.012, 0.85),
      ell(-0.222, -0.022, 0, 0.036, 0.015, 0.0065, 'fin', 0.012, -0.85),
      ell(-0.01, 0.055, 0, 0.11, 0.02, 0.0065, 'fin', 0.012),
      ell(-0.07, -0.05, 0, 0.05, 0.016, 0.0065, 'fin', 0.012),
      ...mirror((s) => ell(0.075, -0.016, s * 0.027, 0.032, 0.012, 0.006, 'fin', 0.008, -0.4)),
      ell(0.178, -0.012, 0, 0.012, 0.01, 0.014, 'body', 0.01),
    ],
    eyes: { at: [0.142, 0.012, 0.023], r: 0.0095 },
    color(part, x, y) {
      if (part === 'fin') return C(0xe9b23c);
      return C(0x9b8a5a).lerp(C(0xf0c64a), THREE.MathUtils.smoothstep(-y, -0.03, 0.035));
    },
  },
};

// ------------------------------------------------------------------ 生成几何体 (每个物种只算一次）
const cache = {};
function evalField(spec, x, y, z) {
  let d = 1e9;
  for (const p of spec.prims) {
    const v = p.f(x, y, z);
    d = p.sub ? smax(d, -v, p.k) : smin(d, v, p.k);
  }
  return d;
}
function partAt(spec, x, y, z) {
  let best = 1e9, part = 'body';
  for (const p of spec.prims) {
    if (p.sub) continue;
    const v = p.f(x, y, z);
    if (v < best) { best = v; part = p.part; }
  }
  return part;
}

export function animalGeometry(kind, res = 80) {
  if (cache[kind]) return cache[kind];
  const spec = SPECS[kind];
  const mc = new MarchingCubes(res, new THREE.MeshBasicMaterial(), false, false, 260000);
  mc.isolation = 0;
  const [cx, cy, cz] = spec.center, H = spec.half;
  const field = mc.field;
  const at = (i) => (i - res / 2) / (res / 2) * H;
  // 先用粗网格算一遍：离表面很远的点只需要正负号，不必逐个精确计算 (启动快好几倍）
  const S = 4, cn = Math.ceil(res / S) + 1, coarse = new Float32Array(cn * cn * cn);
  for (let k = 0; k < cn; k++) for (let j = 0; j < cn; j++) for (let i = 0; i < cn; i++)
    coarse[i + j * cn + k * cn * cn] = evalField(spec, cx + at(i * S), cy + at(j * S), cz + at(k * S));
  const far = (2 * H / res) * S * 1.8;
  for (let k = 0; k < res; k++) {
    const z = cz + at(k), ck = Math.round(k / S);
    for (let j = 0; j < res; j++) {
      const y = cy + at(j), cj = Math.round(j / S);
      for (let i = 0; i < res; i++) {
        const d0 = coarse[Math.round(i / S) + cj * cn + ck * cn * cn];
        field[i + j * res + k * res * res] = -(Math.abs(d0) > far ? d0 : evalField(spec, cx + at(i), y, z)) * 1000;
      }
    }
  }
  mc.update();
  const n = mc.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), spot = new Float32Array(n);
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const x = cx + mc.positionArray[i * 3] * H, y = cy + mc.positionArray[i * 3 + 1] * H, z = cz + mc.positionArray[i * 3 + 2] * H;
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    v.set(mc.normalArray[i * 3], mc.normalArray[i * 3 + 1], mc.normalArray[i * 3 + 2]).normalize();
    nor[i * 3] = v.x; nor[i * 3 + 1] = v.y; nor[i * 3 + 2] = v.z;
    const part = partAt(spec, x, y, z);
    const c = spec.color(part, x, y, z);
    spot[i] = spec.spot ? spec.spot(part) : 0;
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  mc.geometry.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSpot', new THREE.BufferAttribute(spot, 1));
  g.computeBoundingBox(); g.computeBoundingSphere();
  cache[kind] = g;
  return g;
}

// ------------------------------------------------------------------ 三种质感：陶瓷 (釉面）、毛绒、照片 (广告用）
const MATS = {};
function material(style) {
  if (MATS[style]) return MATS[style];
  if (style === 'ceramic') MATS[style] = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06 });
  else if (style === 'plush') MATS[style] = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 1, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(0xffffff) });
  else MATS[style] = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78 });
  const m = MATS[style];
  m.customProgramCacheKey = () => 'animal-' + style;
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float aSpot; varying float vSpot; varying vec3 vOP;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vSpot = aSpot; vOP = position;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying float vSpot; varying vec3 vOP;
        float ah(vec3 p){ p = fract(p*.1031); p += dot(p, p.zyx+31.32); return fract((p.x+p.y)*p.z); }
        float an(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
          return mix(mix(mix(ah(i), ah(i+vec3(1,0,0)), f.x), mix(ah(i+vec3(0,1,0)), ah(i+vec3(1,1,0)), f.x), f.y),
                     mix(mix(ah(i+vec3(0,0,1)), ah(i+vec3(1,0,1)), f.x), mix(ah(i+vec3(0,1,1)), ah(i+vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (vSpot > .01) {
          vec3 q = vOP * 10. + vec3(3.1, 0., 1.7);
          float n = an(q) * .62 + an(q * 2.3 + 5.) * .28 + an(q * 5.1) * .1;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.012), smoothstep(.555, .57, n) * vSpot);
        }`);
  };
  return m;
}
const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x0c0b0b, roughness: 0.08, clearcoat: 1 });

export function makeAnimal(kind, style = 'ceramic') {
  const g = new THREE.Group();
  const body = new THREE.Mesh(animalGeometry(kind), material(style));
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);
  const { at, r } = SPECS[kind].eyes;
  for (const s of [1, -1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), eyeMat);
    e.position.set(at[0], at[1], at[2] * s);
    g.add(e);
  }
  g.userData.body = body;
  return g;
}
