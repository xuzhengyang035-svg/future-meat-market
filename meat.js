// 可实时定制的肉：形状由几何体变形得到，纹理（肌纤维、脂肪纹、鱼肉肌节）在着色器里实时计算。
// 每个材质有自己的一组参数，所以冷柜里不同物种的肉可以同时显示。
import * as THREE from 'three';

const SHAPES = {
  beef:    { sx: 0.46, sy: 0.085, sz: 0.32, taper: 0.10 },
  pork:    { sx: 0.44, sy: 0.075, sz: 0.30, taper: 0.25 },
  chicken: { sx: 0.40, sy: 0.10,  sz: 0.22, taper: 0.55 },
  fillet:  { sx: 0.55, sy: 0.045, sz: 0.17, taper: 0.60 },
  steak:   { sx: 0.30, sy: 0.095, sz: 0.26, taper: 0.00 },
};
export const SPECIES_INDEX = { chicken: 0, beef: 1, pork: 2, fish: 3 };

const geoCache = {};
export function meatGeometry(kind) {
  if (geoCache[kind]) return geoCache[kind];
  const s = SHAPES[kind];
  const g = new THREE.SphereGeometry(1, 128, 64);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = Math.atan2(v.z, v.x);
    const wob = 1 + 0.05 * Math.sin(a * 3 + 0.7) + 0.03 * Math.sin(a * 5 + 2.1) + 0.015 * Math.sin(a * 9);
    const t = v.x * 0.5 + 0.5;
    const flat = Math.sign(v.y) * Math.pow(Math.abs(v.y), 0.5);
    p.setXYZ(i,
      v.x * s.sx * wob,
      flat * s.sy * (1 - 0.35 * s.taper * t) * (0.92 + 0.08 * Math.cos(v.x * 3 + v.z * 2)),
      v.z * s.sz * wob * (1 - s.taper * t));
  }
  g.computeVertexNormals();
  geoCache[kind] = g;
  return g;
}
export const meatHeight = (kind) => SHAPES[kind].sy;

const GLSL_COMMON = /* glsl */`
uniform float uSpecies, uColor, uFat, uFirm, uSteak;
varying vec3 vPos;
float gFat;
float h31(vec3 p){ p = fract(p*.1031); p += dot(p, p.zyx+31.32); return fract((p.x+p.y)*p.z); }
float vnoise(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(mix(h31(i), h31(i+vec3(1,0,0)), f.x), mix(h31(i+vec3(0,1,0)), h31(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i+vec3(0,0,1)), h31(i+vec3(1,0,1)), f.x), mix(h31(i+vec3(0,1,1)), h31(i+vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float s = 0., a = .5; for(int i=0;i<5;i++){ s += a*vnoise(p); p = p*2.02+7.1; a *= .5; } return s; }
vec3 meatColor(){
  vec3 P = vPos;
  float warp = fbm(P*6.);
  float fib = .5+.5*sin(P.z*mix(170.,360.,uFirm) + warp*7.);
  float grain = fbm(P*38.);
  float ridge = 1.-abs(fbm(P*vec3(5.,9.,7.)+3.)*2.-1.);
  float ridge2 = 1.-abs(fbm(P*vec3(11.,16.,13.)+9.)*2.-1.);
  vec3 lean, fatC = vec3(.96,.91,.84);
  float fm;
  if(uSpecies < .5){
    lean = vec3(.94,.72,.66);
    float w = mix(.015,.07,uFat);
    fm = smoothstep(1.-w, 1.-w*.3, ridge)*.55;
    fatC = vec3(.98,.90,.70);
  } else if(uSpecies < 1.5){
    lean = mix(vec3(.58,.10,.11), vec3(.28,.025,.04), uColor);
    float w = .045;
    fm = max(smoothstep(1.-w, 1.-w*.3, ridge)*.9, smoothstep(1.-w*.45, 1.-w*.1, ridge2)*.7);
  } else if(uSpecies < 2.5){
    lean = vec3(.88,.55,.53);
    float w = mix(.02,.10,uFat);
    fm = smoothstep(1.-w, 1.-w*.35, ridge)*.7;
    fm = max(fm, smoothstep(.30-.07*uFat, .32-.07*uFat, P.z));
  } else {
    lean = vec3(.95,.86,.79);
    float m = uSteak > .5 ? fract(length(P.xz)*16.+warp*.5) : fract(P.x*10.+abs(P.z)*5.+warp*.4);
    fm = smoothstep(.07,.0,abs(m-.5))*.85;
    fatC = vec3(1.,.97,.93);
  }
  gFat = fm;
  vec3 c = lean*(.80+.28*fib*(uSpecies > 2.5 ? .3 : 1.))*(.86+.28*grain);
  return mix(c, fatC, clamp(fm,0.,1.));
}
`;

export function meatMaterial(species) {
  const uniforms = {
    uSpecies: { value: SPECIES_INDEX[species] },
    uColor: { value: 0.35 },
    uFat: { value: 0.5 },
    uFirm: { value: 0 },
    uSteak: { value: 0 },
  };
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.32,
    sheen: 0.4, sheenColor: new THREE.Color(0xffc4c0), sheenRoughness: 0.6,
  });
  m.userData.uniforms = uniforms;
  m.customProgramCacheKey = () => 'meat';
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPos = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + GLSL_COMMON)
      .replace('#include <map_fragment>', 'diffuseColor.rgb = meatColor();')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * mix(1., .6, gFat);');
  };
  return m;
}

export const kindFor = (species, form) => (species === 'fish' ? (form === 'steak' ? 'steak' : 'fillet') : species);

// ------------------------------------------------------------------ 真实贴图的肉（你给的 8 张，按顺序）：用在门店的冷藏肉柜
// 1 牛肉 浅红、脂肪少   2 牛肉 深红、雪花多   3 猪肉 脂肪少   4 猪肉 脂肪纹明显
// 5 鸡肉 几乎没有脂肪   6 鸡肉 带一点脂肪     7 鱼肉 斜向纹理的鱼片   8 鱼肉 人字形纹理
// 贴图从正上方投影到肉的顶面（原来的球面 UV 在顶上会挤成一点）；侧面是切面，颜色压暗一点
import { userMap } from './assets.js';
export const TEX_MEAT = [
  { file: 'meat_1.webp', kind: 'beef', size: 0.32 }, { file: 'meat_2.webp', kind: 'steak', size: 0.3 },
  { file: 'meat_3.webp', kind: 'pork', size: 0.32 }, { file: 'meat_4.webp', kind: 'pork', size: 0.3 },
  { file: 'meat_5.webp', kind: 'chicken', size: 0.3 }, { file: 'meat_6.webp', kind: 'chicken', size: 0.3 },
  { file: 'meat_7.webp', kind: 'fillet', size: 0.36 }, { file: 'meat_8.webp', kind: 'fillet', size: 0.3 },
];
const texMeatMats = {};
function texMeatMat(file) {
  if (texMeatMats[file]) return texMeatMats[file];
  const map = userMap(file, 1, 1);
  const m = new THREE.MeshPhysicalMaterial({
    map, bumpMap: map, bumpScale: 1.2, vertexColors: true,                      // 亮的脂肪纹略微凸起
    roughness: 0.45, clearcoat: 0.22, clearcoatRoughness: 0.3,                  // 生肉表面湿，有一层薄薄的反光（不能太强，不然颜色发白）
  });
  return (texMeatMats[file] = m);
}
export function texturedMeat(i, seed = 1) {
  const spec = TEX_MEAT[i], g = meatGeometry(spec.kind).clone();
  const P = g.attributes.position, N = g.attributes.normal, uv = new Float32Array(P.count * 2), col = new Float32Array(P.count * 3);
  let s = (seed * 9301 + 49297) % 233280; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const ox = r(), oz = r(), a = r() * Math.PI;                                   // 每块肉截取贴图的不同位置、不同方向
  const ca = Math.cos(a), sa = Math.sin(a);
  for (let k = 0; k < P.count; k++) {
    const x = P.getX(k), z = P.getZ(k);
    uv[k * 2] = (x * ca - z * sa) / spec.size + ox; uv[k * 2 + 1] = (x * sa + z * ca) / spec.size + oz;
    const side = 1 - Math.abs(N.getY(k));                                         // 侧面（切面）暗一点、偏褐
    col[k * 3] = 1 - side * 0.22; col[k * 3 + 1] = 1 - side * 0.3; col[k * 3 + 2] = 1 - side * 0.3;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, texMeatMat(spec.file));
  m.userData.kind = spec.kind;
  return m;
}
