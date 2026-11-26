// LED advertising screens. Each screen cycles through a few adverts drawn into one atlas; the shader turns the image into
// an LED panel seen from the street: RGB sub-pixel dots, a dark grid between modules, rolling refresh band,
// a glitch slice on every change of advert, and a faint flicker. Real sizes: a 48-sheet roadside screen is 6.1 × 3.05 m.
import * as THREE from 'three';
import { canvasTexture } from './textures.js';

const SANS = '"Inter", "Arial Black", sans-serif', SERIF = 'Georgia, "Times New Roman", serif';

// One advert per frame. All fictional brands.
const ADS = {
  verdant: (g, W, H) => {                                                     // clean biotech: green gradient, big serif claim
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#0e3a2a'); gr.addColorStop(1, '#3fae7a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(W * .78, H * .5, 40 + i * 34, 0, 7); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.08)'; g.stroke(); }
    g.fillStyle = '#f2fff4'; g.font = `italic 700 ${H * .2}px ${SERIF}`; g.fillText('Grown,', W * .06, H * .38); g.fillText('not raised.', W * .06, H * .62);
    g.font = `600 ${H * .065}px ${SANS}`; g.fillStyle = 'rgba(240,255,240,.85)'; g.fillText('VERDANT CULTURES  ·  steak in 21 days', W * .06, H * .84);
    g.fillStyle = '#d8ffe0'; g.beginPath(); g.ellipse(W * .78, H * .5, H * .22, H * .16, -.3, 0, 7); g.fill();
    g.fillStyle = '#c0485a'; g.beginPath(); g.ellipse(W * .78, H * .5, H * .17, H * .11, -.3, 0, 7); g.fill();
  },
  subscribe: (g, W, H) => {                                                   // loud retail: yellow, black, price burst
    g.fillStyle = '#ffd400'; g.fillRect(0, 0, W, H); g.fillStyle = '#111'; g.font = `900 ${H * .24}px ${SANS}`; g.fillText('MEAT', W * .05, H * .34); g.fillText('ON TAP', W * .05, H * .62);
    g.font = `700 ${H * .07}px ${SANS}`; g.fillText('Your own cell line. Delivered weekly.', W * .05, H * .82);
    g.fillStyle = '#e6162a'; g.beginPath(); for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, rr = k % 2 ? H * .2 : H * .3; g.lineTo(W * .8 + Math.cos(a) * rr, H * .45 + Math.sin(a) * rr); } g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `900 ${H * .11}px ${SANS}`; g.fillText('¥99', W * .8, H * .47); g.font = `700 ${H * .05}px ${SANS}`; g.fillText('/ WEEK', W * .8, H * .56); g.textAlign = 'left';
  },
  pods: (g, W, H) => {                                                        // calm night pastel: sleep pods, nothing to do with meat
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1a1440'); gr.addColorStop(1, '#5a3a8a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .6})`; g.fillRect(Math.random() * W, Math.random() * H * .6, 2, 2); }
    g.fillStyle = '#ffe6b0'; g.beginPath(); g.arc(W * .82, H * .28, H * .12, 0, 7); g.fill(); g.fillStyle = '#1a1440'; g.beginPath(); g.arc(W * .85, H * .25, H * .11, 0, 7); g.fill();
    g.fillStyle = '#f4e8ff'; g.font = `300 ${H * .15}px ${SANS}`; g.fillText('sleep', W * .06, H * .42); g.font = `800 ${H * .15}px ${SANS}`; g.fillText('somewhere else', W * .06, H * .6);
    g.font = `500 ${H * .06}px ${SANS}`; g.fillStyle = 'rgba(244,232,255,.75)'; g.fillText('NOCTA pods · by the hour · Platform 2', W * .06, H * .82);
  },
  donor: (g, W, H) => {                                                       // public-information style, black and white
    g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, W, H); g.fillStyle = '#111'; g.fillRect(0, 0, W, H * .16);
    g.fillStyle = '#f2f0ea'; g.font = `800 ${H * .08}px ${SANS}`; g.fillText('A MESSAGE FROM THE CULTURED MEAT BOARD', W * .04, H * .11);
    g.fillStyle = '#111'; g.font = `800 ${H * .17}px ${SANS}`; g.fillText('One pig.', W * .04, H * .42); g.fillText('A million dinners.', W * .04, H * .64);
    g.font = `500 ${H * .06}px ${SANS}`; g.fillText('Ask your butcher which animal your cells came from.', W * .04, H * .84);
  },
  tall1: (g, W, H) => {                                                       // portrait: red neon on black
    g.fillStyle = '#080406'; g.fillRect(0, 0, W, H); g.shadowColor = '#ff2a4a'; g.shadowBlur = 30; g.fillStyle = '#ff5a6a';
    g.textAlign = 'center'; g.font = `900 ${W * .3}px ${SANS}`; ['NO', 'BONES', 'NO', 'BLOOD'].forEach((t, i) => g.fillText(t, W / 2, H * (.16 + i * .17)));
    g.shadowBlur = 0; g.fillStyle = '#ffd0d8'; g.font = `600 ${W * .075}px ${SANS}`; g.fillText('PRIMA FLESH™', W / 2, H * .86); g.fillText('open late', W / 2, H * .92); g.textAlign = 'left';
  },
  tall2: (g, W, H) => {                                                       // portrait: travel poster
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#ff9a4a'); gr.addColorStop(.55, '#e8506a'); gr.addColorStop(1, '#2a1a4a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffe8a0'; g.beginPath(); g.arc(W / 2, H * .42, W * .26, 0, 7); g.fill();
    g.fillStyle = '#2a1a4a'; for (let k = 0; k < 6; k++) g.fillRect(0, H * (.5 + k * .03), W, H * .012);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `800 ${W * .14}px ${SANS}`; g.fillText('THE', W / 2, H * .12); g.fillText('SEASIDE', W / 2, H * .2);
    g.font = `500 ${W * .07}px ${SANS}`; g.fillText('still there · 2h by rail', W / 2, H * .9); g.textAlign = 'left';
  },
};

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const FRAG = `
  uniform sampler2D map; uniform float uTime, uFrames, uHold, uGain, uSeed; uniform vec2 uLeds; varying vec2 vUv;
  float h(float n){ return fract(sin(n*91.7+uSeed)*43758.5); }
  void main(){
    float cyc = uTime / uHold, idx = floor(cyc), f = fract(cyc);
    vec2 cell = floor(vUv * uLeds), lp = fract(vUv * uLeds);
    vec2 st = (cell + .5) / uLeds;
    // glitch on changeover: horizontal slices shifted for the first 0.25 s
    float gl = step(f * uHold, .25);
    float band = floor(st.y * 18.0);
    st.x += gl * (h(band + idx) - .5) * .12 * step(.55, h(band * 3.1 + idx));
    float k = mod(idx + gl * step(.5, h(band + idx * 7.0)), uFrames);
    vec3 c = texture2D(map, vec2(st.x, (st.y + k) / uFrames)).rgb;
    // RGB sub-pixels: three vertical stripes per LED, round-ish dots, dark grid between them
    float sx = lp.x * 3.0; vec3 sub = vec3(step(sx,1.0), step(1.0,sx)*step(sx,2.0), step(2.0,sx));
    float dot = smoothstep(.5, .32, length((lp - .5) * vec2(1.0, 1.25)));
    // up close: individual RGB dots; far away the dots average out instead of beating into moiré
    float px = max(fwidth(vUv.x * uLeds.x), fwidth(vUv.y * uLeds.y));
    vec3 near = c * mix(vec3(.35), sub * 2.4, .7) * dot;
    c = mix(near, c * .42, smoothstep(.22, .6, px));
    float roll = .92 + .08 * smoothstep(0.0, .04, abs(fract(vUv.y * .7 - uTime * .23) - .5));       // refresh band rolling down
    float flick = .97 + .03 * sin(uTime * 61.0 + uSeed);
    gl_FragColor = vec4(c * uGain * roll * flick, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

function atlas(names, w, h) {
  return canvasTexture(w, h * names.length, (g, W, H) => {
    names.forEach((n, i) => { g.save(); g.translate(0, (names.length - 1 - i) * h); g.beginPath(); g.rect(0, 0, W, h); g.clip(); ADS[n](g, W, h); g.restore(); });
  });
}

const clock = { t: 0 };
// w × h metres, leds = LED count across; a steel frame, a back box, a gantry and a light that washes the wall below.
export function billboard(parent, { pos, rotY = 0, w = 6.1, h = 3.05, ads, hold = 6, leds = 192, gain = 1.6, glow = 0x99aacc, seed = 1, frame = true }) {
  const g = new THREE.Group(); g.position.set(...pos); g.rotation.y = rotY; parent.add(g);
  const tex = atlas(ads, 512, Math.round(512 * h / w));
  tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const u = { map: { value: tex }, uTime: { value: 0 }, uFrames: { value: ads.length }, uHold: { value: hold }, uGain: { value: gain }, uSeed: { value: seed }, uLeds: { value: new THREE.Vector2(leds, Math.round(leds * h / w)) } };
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG, fog: false }));
  scr.userData.keep = true;
  scr.onBeforeRender = () => { u.uTime.value = performance.now() / 1000 + seed * 3.7; };
  g.add(scr);
  const steel = new THREE.MeshStandardMaterial({ color: 0x1c1e20, metalness: .7, roughness: .5 });
  const box = (bw, bh, bd, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), steel); o.position.set(x, y, z); g.add(o); return o; };
  box(w + .24, h + .24, .32, 0, 0, -.17);                                                         // cabinet
  for (const s of [-1, 1]) box(.12, h + .24, .06, s * (w / 2 + .06), 0, .02);
  for (const s of [-1, 1]) box(w + .24, .12, .06, 0, s * (h / 2 + .06), .02);
  if (frame) { for (const s of [-.3, .3]) box(.2, 1.6, .2, s * w, -h / 2 - .9, -.3); box(w * .8, .6, .06, 0, -h / 2 - .4, -.33); }   // legs and service walkway
  // the screen lights the wet surfaces in front of it
  const l = new THREE.PointLight(glow, 6, Math.max(w, h) * 2.2, 2); l.position.set(0, -h * .2, 1.4); g.add(l);
  return g;
}
