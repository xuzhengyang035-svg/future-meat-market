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

const FilmShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uVignette: { value: 0.55 }, uGrain: { value: 0.05 },
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
      c.rgb += (hash(vUv * 1000.0 + fract(uTime * 7.0) * 100.0) - 0.5) * uGrain;
      gl_FragColor = c;
    }`,
};

export function createPost(renderer, scene, camera, grade = {}) {
  const pr = Math.min(devicePixelRatio, 1.25);
  const rt = new THREE.WebGLRenderTarget(innerWidth * pr, innerHeight * pr, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(pr);
  composer.addPass(new RenderPass(scene, camera));

  const ao = new GTAOPass(scene, camera, innerWidth, innerHeight);
  ao.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.4, thickness: 1.2, scale: 1.2, samples: 8 });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 8 });
  ao.blendIntensity = 1.0;
  // 透明的玻璃、培养液不参与遮蔽计算，否则玻璃后面的车间会失去阴影
  ao.overrideVisibility = function () {
    const cache = this._visibilityCache;
    this.scene.traverse((o) => {
      cache.set(o, o.visible);
      if (o.isPoints || o.isLine || (o.material && o.material.transparent)) o.visible = false;
    });
  };
  composer.addPass(ao);
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.4, 0.55, 1.1));
  composer.addPass(new OutputPass());
  const film = new ShaderPass(FilmShader);
  for (const [k, v] of Object.entries(grade)) {
    const u = film.uniforms[k];
    if (u) u.value = Array.isArray(v) ? new THREE.Vector3(...v) : v;
  }
  composer.addPass(film);

  return {
    composer, ao,
    setSize(w, h) { composer.setSize(w, h); },
    render(t) { film.uniforms.uTime.value = t; composer.render(); },
  };
}
