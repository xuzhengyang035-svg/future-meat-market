// 后期处理（门店、观察室、冷柜都用）：
// 1. 环境光遮蔽 GTAO：墙角、物体底部、管道交接处自然变暗——这是“看起来像照片”的关键；
// 2. 辉光：只让亮度超过 1 的灯管、视镜、指示灯泛光；
// 3. 调色：参考 Fincher 式的停尸房画面——降低饱和度、暗部偏冷绿、亮部略偏黄、黑色压重；
// 4. 暗角 + 胶片颗粒：让画面更像摄影机拍到的，而不是电脑渲染。
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

// ------------------------------------------------------------------ 体积雾：每个像素从镜头往它看到的那个表面走十几步，沿路把三维噪声里的雾浓度累加起来。
// 雾是一整块连续的空间，不是一张张面片，所以永远切不出直线、方块；靠近灯的雾被照暖。低分辨率算，再铺回全屏。
// 场景用 scene.userData.fog 打开：{ min, max, floor, up, density, scale, color, light, lights, wind, maxDist }
const FOG_MARCH = /* glsl */`
  uniform sampler2D tDepth; uniform mat4 uProjInv, uCamWorld; uniform float uTime, uDensity, uScale, uMaxDist, uFloor, uUp, uLK, uEven;
  uniform vec3 uColor, uLight, uMin, uMax, uWind, uHoleMin, uHoleMax; uniform vec3 uL[8], uD[8]; uniform float uCos[8], uG[8], uF[8]; varying vec2 vUv;
  float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float n3(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++) { s += a * n3(p); p = p * 2.07 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
  float dens(vec3 p) {
    vec3 lo = smoothstep(uMin, uMin + vec3(2.0, 0.0001, 2.0), p), hi = 1.0 - smoothstep(uMax - vec3(2.0, 1.5, 2.0), uMax, p);
    float box = lo.x * lo.z * hi.x * hi.y * hi.z;
    if (all(greaterThan(p, uHoleMin)) && all(lessThan(p, uHoleMax))) return 0.0;   // inside buildings seen only through glass: no fog
    float ground = exp(-max(p.y - uMin.y, 0.0) / uFloor), ceil = exp(-max(uMax.y - p.y, 0.0) / uFloor);
    vec3 q = p * uScale + uWind * uTime;
    float n = fbm(q + vec3(n3(q * 0.5 + 3.1), 0.0, n3(q * 0.5 + 7.7)) * 1.4);           // warped: billows and wisps
    return box * mix(ground, ceil, uUp) * mix(smoothstep(0.3, 0.75, n), 0.55 + 0.45 * n, uEven);   // uEven 1: an even haze that only breathes a little
  }
  void main() {
    float z = texture2D(tDepth, vUv).x;
    vec4 v = uProjInv * vec4(vUv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0); v /= v.w;
    vec3 cam = uCamWorld[3].xyz, wp = (uCamWorld * v).xyz, dir = normalize(wp - cam);
    float dist = z > 0.99999 ? uMaxDist : min(length(wp - cam), uMaxDist);
    const int N = 28; float dt = dist / float(N);
    float t = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) * dt;   // interleaved-gradient jitter: even, no clumps
    float T = 1.0; vec3 L = vec3(0.0);
    for (int i = 0; i < N; i++) {
      vec3 p = cam + dir * t; float rho = dens(p) * uDensity;
      if (rho > 0.0001) {
        float lit = 0.0; for (int k = 0; k < 8; k++) { vec3 d = p - uL[k]; float r2 = dot(d, d);
          if (uCos[k] > 0.0) { float c = dot(d * inversesqrt(r2 + 1e-4), uD[k]); lit += uG[k] * (smoothstep(uCos[k], mix(uCos[k], 1.0, 0.25), c) / (1.0 + r2 * uF[k]) + 0.4 / (1.0 + r2 * 3.0)); }   // spot: a shaft through the fog
          else lit += uG[k] / (1.0 + r2 * uF[k]); }
        float a = 1.0 - exp(-rho * dt);
        L += T * a * (uColor + uLight * lit * uLK); T *= 1.0 - a;
      }
      t += dt;
    }
    gl_FragColor = vec4(L, T);
  }`;
class FogPass extends Pass {
  constructor() {
    super(); this.needsSwap = true;
    this.rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
    this.march = new THREE.ShaderMaterial({ vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: FOG_MARCH,
      uniforms: { tDepth: { value: null }, uProjInv: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uTime: { value: 0 }, uDensity: { value: 0.2 }, uScale: { value: 0.2 },
        uMaxDist: { value: 40 }, uFloor: { value: 2 }, uUp: { value: 0 }, uLK: { value: 1 }, uColor: { value: new THREE.Color() }, uLight: { value: new THREE.Color() },
        uMin: { value: new THREE.Vector3() }, uMax: { value: new THREE.Vector3() }, uHoleMin: { value: new THREE.Vector3(1e4, 1e4, 1e4) }, uHoleMax: { value: new THREE.Vector3(1e4, 1e4, 1e4) }, uWind: { value: new THREE.Vector3() }, uEven: { value: 0 }, uL: { value: Array.from({ length: 8 }, () => new THREE.Vector3(1e4, 1e4, 1e4)) }, uD: { value: Array.from({ length: 8 }, () => new THREE.Vector3()) }, uCos: { value: new Array(8).fill(0) }, uG: { value: new Array(8).fill(1) }, uF: { value: new Array(8).fill(1) } } });
    this.mix = new THREE.ShaderMaterial({ vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse, tFog; uniform vec2 uTexel; varying vec2 vUv;
        void main(){ vec4 c = texture2D(tDiffuse, vUv), f = vec4(0.0); float w = 0.0;
          for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { float k = (x == 0 ? 2.0 : 1.0) * (y == 0 ? 2.0 : 1.0); f += texture2D(tFog, vUv + vec2(x, y) * uTexel) * k; w += k; }   // soften the low-res fog
          f /= w; gl_FragColor = vec4(c.rgb * f.a + f.rgb, c.a); }`,
      uniforms: { tDiffuse: { value: null }, tFog: { value: this.rt.texture }, uTexel: { value: new THREE.Vector2() } } });
    this.quad = new FullScreenQuad(this.march); this.cfg = null; this.camera = null; this.depth = null;
  }
  setSize(w, h) { const k = Math.min(0.5, Math.sqrt(0.7e6 / (w * h))), W = Math.max(1, Math.round(w * k)), H = Math.max(1, Math.round(h * k)); this.rt.setSize(W, H); this.mix.uniforms.uTexel.value.set(1 / W, 1 / H); }
  render(r, writeBuffer, readBuffer) {
    const f = this.cfg, u = this.march.uniforms, cam = this.camera;
    u.tDepth.value = this.depth; u.uProjInv.value.copy(cam.projectionMatrixInverse); u.uCamWorld.value.copy(cam.matrixWorld); u.uTime.value = performance.now() / 1000;
    u.uDensity.value = f.density ?? 0.2; u.uScale.value = f.scale ?? 0.2; u.uMaxDist.value = f.maxDist ?? 40; u.uFloor.value = f.floor ?? 2; u.uUp.value = f.up ?? 0; u.uLK.value = f.lightK ?? 1;
    u.uColor.value.set(f.color ?? 0x101418).convertSRGBToLinear(); u.uLight.value.set(f.light ?? 0xffb070).convertSRGBToLinear();
    u.uMin.value.set(...f.min); u.uMax.value.set(...f.max); u.uHoleMin.value.set(...(f.hole?.[0] ?? [1e4, 1e4, 1e4])); u.uHoleMax.value.set(...(f.hole?.[1] ?? [1e4, 1e4, 1e4])); u.uWind.value.set(...(f.wind ?? [0.12, 0.01, 0.05]));
    u.uEven.value = f.even ?? 0;
    // a light: [x, y, z] glows; [x, y, z, dx, dy, dz, halfAngle] is a spot shaft; optional { gain, falloff } as an 8th entry
    u.uL.value.forEach((v, i) => { const l = f.lights?.[i]; if (!l) { v.set(1e4, 1e4, 1e4); u.uCos.value[i] = 0; return; }
      const o = typeof l[l.length - 1] === 'object' ? l[l.length - 1] : {}, spot = l.length >= 7;
      v.set(l[0], l[1], l[2]); u.uG.value[i] = o.gain ?? 1;
      if (spot) { u.uD.value[i].set(l[3], l[4], l[5]).normalize(); u.uCos.value[i] = Math.cos(l[6]); u.uF.value[i] = o.falloff ?? 0.08; } else { u.uCos.value[i] = 0; u.uF.value[i] = o.falloff ?? 1.1; } });
    this.quad.material = this.march; r.setRenderTarget(this.rt); this.quad.render(r);
    this.mix.uniforms.tDiffuse.value = readBuffer.texture; this.quad.material = this.mix;
    r.setRenderTarget(this.renderToScreen ? null : writeBuffer); this.quad.render(r);
  }
}

const FilmShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uVignette: { value: 0.55 }, uGrain: { value: 0.022 },
    uSat: { value: 0.62 }, uShadow: { value: new THREE.Vector3(-0.012, 0.018, 0.012) }, uHigh: { value: new THREE.Vector3(0.02, 0.015, -0.035) },
    uContrast: { value: 1.12 }, uLift: { value: 0.012 },
  },
  vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime, uVignette, uGrain, uSat, uContrast, uLift; uniform vec3 uShadow, uHigh; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(vec3(l), c.rgb, uSat);
      c.rgb = (c.rgb - 0.5) * uContrast + 0.5;                       // 对比：黑压下去
      c.rgb += uShadow * (1.0 - smoothstep(0.0, 0.5, l));             // 暗部冷绿
      c.rgb += uHigh * smoothstep(0.45, 1.0, l);                      // 亮部偏黄
      c.rgb = max(c.rgb, vec3(0.0)) * (1.0 - uLift) + uLift * vec3(0.55, 0.62, 0.6);
      vec2 d = (vUv - 0.5) * vec2(1.15, 1.0);
      c.rgb *= 1.0 - uVignette * smoothstep(0.25, 0.95, length(d));
      c.rgb += (hash(mod(gl_FragCoord.xy, 997.0) * 0.731 + fract(uTime * 7.0) * 100.0) - 0.5) * uGrain;   // 颗粒一个像素一粒，不糊成方块
      gl_FragColor = c;
    }`,
};

// 五个场景共用一套缓冲（以前每个场景各有一套 4× MSAA + AO + 辉光，走一圈就是一两个 GB 显存）；切场景只换 scene 和调色
//   清晰度：按屏幕的真实像素画（2880 × 1800 就画 2880 × 1800）；普通 1080p 屏画到 1.4 倍再缩回来，边缘就是顺的。
//   不再用多重采样：它让每一道全屏后期都多写一遍，一帧 51 ms，去掉以后 23 ms（Intel Arc 实测），省下来的正好换成像素。
let core = null;
export const quality = { scale: 1 };
const MAX_PIXELS = 5.3e6;                                                     // 2880 × 1800 是 5.2 百万；4K 屏收到这个数
export function pixelRatio() {
  const fit = Math.sqrt(MAX_PIXELS / (innerWidth * innerHeight));
  return Math.min(Math.max(devicePixelRatio, 1.4), 2, fit) * quality.scale;
}
// 遮蔽、辉光本来就是糊的：像素再多也只按这么大算
const capped = (w, h, share, max) => { const k = Math.min(share, Math.sqrt(max / (w * h))); return [Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))]; };

function createCore(renderer, scene, camera) {
  const pr = pixelRatio();
  const rt = new THREE.WebGLRenderTarget(innerWidth * pr, innerHeight * pr, { type: THREE.HalfFloatType, format: THREE.RGBFormat, internalFormat: 'R11F_G11F_B10F' });   // 同样能存过曝的亮度，读写和显存都只要一半
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(pr);
  composer.setSize(innerWidth, innerHeight);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const ao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  const aoSize = ao.setSize.bind(ao);
  ao.setSize = (w, h) => aoSize(...capped(w, h, 0.6, 0.9e6));
  ao.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.4, thickness: 1.2, scale: 1.2, samples: 8 });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 8 });
  ao.blendIntensity = 1.0;
  // 透明的玻璃、培养液不参与遮蔽计算，否则玻璃后面的车间会失去阴影
  ao.overrideVisibility = function () {
    const cache = this._visibilityCache;
    this.scene.traverse((o) => {
      cache.set(o, o.visible);
      if (o.isPoints || o.isLine || (o.material && (o.material.transparent || o.material.userData?.noAO))) o.visible = false;   // baked depth windows: AO on a picture only makes dark patches
    });
  };
  // 遮蔽直接乘在画面上，不必先把整张画面抄一遍
  ao.output = GTAOPass.OUTPUT.Off;
  ao.needsSwap = false;
  const aoRender = ao.render.bind(ao);
  ao.render = (r, writeBuffer, readBuffer) => {
    aoRender(r, writeBuffer, readBuffer);
    ao.blendMaterial.uniforms.intensity.value = ao.blendIntensity;
    ao.blendMaterial.uniforms.tDiffuse.value = ao.pdRenderTarget.texture;
    ao.renderPass(r, ao.blendMaterial, readBuffer);
  };
  composer.addPass(ao);
  const fog = new FogPass(); fog.depth = ao.depthTexture; fog.enabled = false; composer.addPass(fog);
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.4, 0.55, 1.1);
  const bloomSize = bloom.setSize.bind(bloom);
  bloom.setSize = (w, h) => bloomSize(...capped(w, h, 0.5, 0.6e6));
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const film = new ShaderPass(FilmShader);
  composer.addPass(film);
  return {
    composer, ao, bloom, renderPass, film, fog,
    resize(w, h) {
      const r = pixelRatio();
      composer.setPixelRatio(r); composer.setSize(w, h);
    },
  };
}

export const postTarget = () => core?.composer.readBuffer ?? null;
export const postCore = () => core;                                           // debug: inspect / toggle passes
export function resizePost(w, h) { core?.resize(w, h); }

export function createPost(renderer, scene, camera, grade = {}) {
  core ??= createCore(renderer, scene, camera);
  const look = Object.entries({ ...Object.fromEntries(Object.entries(FilmShader.uniforms).filter(([k]) => k !== 'tDiffuse' && k !== 'uTime').map(([k, u]) => [k, u.value])), ...grade })
    .filter(([k]) => FilmShader.uniforms[k])
    .map(([k, v]) => [k, Array.isArray(v) ? new THREE.Vector3(...v) : v]);
  return {
    render(t) {
      const { composer, ao, renderPass, film } = core;
      core.bloom.strength = grade.bloomStrength ?? 0.4;
      core.bloom.threshold = grade.bloomThreshold ?? 1.1;
      core.ao.blendIntensity = grade.ao ?? 1.0;                                       // per scene; the foggy night street goes without
      renderPass.scene = scene; ao.scene = scene;
      const fc = scene.userData.fog; core.fog.enabled = !!fc; if (fc) { core.fog.cfg = fc; core.fog.camera = renderPass.camera; core.fog.depth = ao.depthTexture; }
      for (const [k, v] of look) {
        const u = film.uniforms[k];
        if (v.isVector3) u.value.copy(v); else u.value = v;
      }
      film.uniforms.uTime.value = t;
      composer.render();
    },
  };
}
