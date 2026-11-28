// 程序化材质贴图：不用下载任何图片，在浏览器里用噪声画出来.
// 真实感主要来自三件事：粗糙度不均匀 (有的地方亮、有的地方哑）、细小的凹凸 (法线）、
// 以及角落里的暗部 (环境光遮蔽）.这里的每张图都对应其中一件.
import * as THREE from 'three';

// ------------------------------------------------------------------ 噪声
function rng(seed) { let s = seed % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// 可平铺的值噪声：cx、cy 是横竖方向的格子数，拉长一个方向就能得到拉丝纹理
function noise2(size, cx, cy, seed) {
  const r = rng(seed);
  const g = new Float32Array(cx * cy).map(() => r());
  return (x, y) => {
    const fx = (x / size) * cx, fy = (y / size) * cy;
    const ix = Math.floor(fx), iy = Math.floor(fy);
    const tx = fx - ix, ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const x0 = ix % cx, x1 = (ix + 1) % cx, y0 = (iy % cy) * cx, y1 = ((iy + 1) % cy) * cx;
    const a = g[y0 + x0], b = g[y0 + x1], c = g[y1 + x0], d = g[y1 + x1];
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}
export function fbm(size, { cx = 4, cy = 4, octaves = 5, seed = 1 } = {}) {
  const ns = Array.from({ length: octaves }, (_, o) => noise2(size, cx * 2 ** o, cy * 2 ** o, seed + o * 131));
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0, a = 0.5, n = 0;
    for (let o = 0; o < octaves; o++) { v += a * ns[o](x, y); n += a; a *= 0.5; }
    out[y * size + x] = v / n;
  }
  return out;
}

// ------------------------------------------------------------------ 贴图工具
function tex(canvas, { repeat, srgb = false } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(...repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function fromField(size, fn) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const [r, gg, b, a = 255] = fn(i % size, Math.floor(i / size), i);
    img.data[i * 4] = r; img.data[i * 4 + 1] = gg; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = a;
  }
  g.putImageData(img, 0, 0);
  return c;
}
// 高度图 → 法线图
function normalFrom(h, size, strength) {
  return fromField(size, (x, y) => {
    const at = (xx, yy) => h[((yy + size) % size) * size + ((xx + size) % size)];
    let nx = (at(x - 1, y) - at(x + 1, y)) * strength;
    let ny = (at(x, y + 1) - at(x, y - 1)) * strength;
    const l = Math.hypot(nx, ny, 1);
    return [(nx / l * 0.5 + 0.5) * 255, (ny / l * 0.5 + 0.5) * 255, (1 / l * 0.5 + 0.5) * 255];
  });
}
const cache = {};
const once = (k, f) => (cache[k] ||= f());

// ------------------------------------------------------------------ 材质
// 拉丝不锈钢：沿一个方向的细纹 + 低频的手印、水渍
export const steelMaps = () => once('steel', () => {
  const S = 512;
  const streak = fbm(S, { cx: 2, cy: 160, octaves: 3, seed: 3 });
  const blot = fbm(S, { cx: 3, cy: 3, octaves: 4, seed: 9 });
  const rough = fromField(S, (x, y, i) => { const v = (0.2 + streak[i] * 0.16 + Math.max(0, blot[i] - 0.55) * 0.5) * 255; return [v, v, v]; });
  // 用旧的不锈钢：发灰，手印、水渍、黄褐色的锈斑和往下流的污痕
  const rust = fbm(S, { cx: 6, cy: 6, octaves: 5, seed: 17 });
  const drip = fbm(S, { cx: 24, cy: 2, octaves: 3, seed: 29 });
  const color = fromField(S, (x, y, i) => {
    let v = 186 - Math.max(0, blot[i] - 0.45) * 110 - streak[i] * 14 - Math.max(0, drip[i] - 0.55) * 120 * (y / S);
    const ru = Math.max(0, rust[i] - 0.62) * 3.2;
    return [v - ru * 10, v - ru * 30, v - ru * 60];
  });
  return { map: tex(color, { srgb: true }), roughnessMap: tex(rough), normalMap: tex(normalFrom(streak, S, 1.2)) };
});

// 混凝土 / 水磨石地面
export const concreteMaps = (base = [74, 75, 78], key = 'concrete') => once(key, () => {
  const S = 512;
  const low = fbm(S, { cx: 3, cy: 3, octaves: 5, seed: 21 });
  const fine = fbm(S, { cx: 64, cy: 64, octaves: 2, seed: 5 });
  const r = rng(77);
  const speck = new Uint8Array(S * S).map(() => (r() < 0.012 ? 1 : r() < 0.02 ? 2 : 0));
  const color = fromField(S, (x, y, i) => {
    const k = 0.82 + low[i] * 0.3 + (fine[i] - 0.5) * 0.08;
    const sp = speck[i] === 1 ? 1.35 : speck[i] === 2 ? 0.7 : 1;
    return base.map((c) => Math.min(255, c * k * sp));
  });
  const rough = fromField(S, (x, y, i) => { const v = (0.35 + low[i] * 0.35 + (fine[i] - 0.5) * 0.1) * 255; return [v, v, v]; });
  return { map: tex(color, { srgb: true }), roughnessMap: tex(rough), normalMap: tex(normalFrom(fine, S, 0.6)) };
});

// 车间环氧地坪：浅灰、光亮，带推车的划痕和磨损
export const epoxyMaps = () => once('epoxy', () => {
  const S = 1024;
  const low = fbm(S, { cx: 4, cy: 4, octaves: 4, seed: 33 });
  const c = fromField(S, (x, y, i) => { const v = 196 + (low[i] - 0.5) * 14; return [v, v + 3, v + 5]; });
  const rc = fromField(S, (x, y, i) => { const v = (0.12 + Math.max(0, low[i] - 0.45) * 0.5) * 255; return [v, v, v]; });
  const g = c.getContext('2d'), gr = rc.getContext('2d');
  const r = rng(12);
  for (let k = 0; k < 140; k++) {           // 划痕
    const x = r() * S, y = r() * S, len = 30 + r() * 160, a = r() * Math.PI;
    for (const [ctx, col] of [[g, `rgba(90,92,95,${0.05 + r() * 0.1})`], [gr, 'rgba(200,200,200,.5)']]) {
      ctx.strokeStyle = col; ctx.lineWidth = 0.6 + r() * 1.2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + 10, y + Math.sin(a) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
    }
  }
  for (let k = 0; k < 6; k++) {             // 轮迹
    const y = r() * S;
    g.fillStyle = 'rgba(70,72,74,.05)'; g.fillRect(0, y, S, 10 + r() * 8);
    gr.fillStyle = 'rgba(160,160,160,.35)'; gr.fillRect(0, y, S, 10 + r() * 8);
  }
  return { map: tex(c, { srgb: true }), roughnessMap: tex(rc) };
});

// 墙板：按墙的实际尺寸画缝、底部变暗 (假的环境光遮蔽）
export function wallMaps(w, h, { color = [168, 166, 161], panel = 1.2, ppm = 96, ao = 0.35 } = {}) {
  const W = Math.round(w * ppm), H = Math.round(h * ppm);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = `rgb(${color})`; g.fillRect(0, 0, W, H);
  const n = fbm(256, { cx: 3, cy: 3, octaves: 4, seed: Math.round(w * 13 + h) });
  const nimg = fromField(256, (x, y, i) => { const v = 128 + (n[i] - 0.5) * 40; return [v, v, v, 40]; });
  g.globalCompositeOperation = 'overlay';
  for (let x = 0; x < W; x += 256) for (let y = 0; y < H; y += 256) g.drawImage(nimg, x, y);
  g.globalCompositeOperation = 'source-over';
  const bump = document.createElement('canvas'); bump.width = W; bump.height = H;
  const b = bump.getContext('2d');
  b.fillStyle = '#808080'; b.fillRect(0, 0, W, H);
  for (let x = panel * ppm; x < W - 2; x += panel * ppm) {
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x - 1, 0, 2, H);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 1, 0, 1, H);
    b.fillStyle = '#202020'; b.fillRect(x - 1.5, 0, 3, H);
  }
  const grad = g.createLinearGradient(0, H, 0, H - ppm * 0.9);
  grad.addColorStop(0, `rgba(0,0,0,${ao})`); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, H - ppm, W, ppm);
  const top = g.createLinearGradient(0, 0, 0, ppm * 0.5);
  top.addColorStop(0, `rgba(0,0,0,${ao * 0.6})`); top.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = top; g.fillRect(0, 0, W, ppm * 0.5);
  const map = tex(c, { srgb: true }); map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
  const bumpMap = tex(bump); bumpMap.wrapS = bumpMap.wrapT = THREE.ClampToEdgeWrapping;
  return { map, bumpMap, bumpScale: 1.5 };
}

// 木格栅 (展厅常见的暖色背景墙）
export function slatMaps(w, h, ppm = 128) {
  const W = Math.round(w * ppm), H = Math.round(h * ppm);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const grain = fbm(256, { cx: 2, cy: 40, octaves: 3, seed: 61 });
  const grainImg = fromField(256, (x, y, i) => { const v = grain[i]; return [150 + v * 60, 100 + v * 45, 62 + v * 30]; });
  const bump = document.createElement('canvas'); bump.width = W; bump.height = H;
  const b = bump.getContext('2d');
  g.fillStyle = '#1b1612'; g.fillRect(0, 0, W, H);
  b.fillStyle = '#000'; b.fillRect(0, 0, W, H);
  const slat = 0.045 * ppm, gap = 0.018 * ppm;
  let k = 0;
  for (let x = 0; x < W; x += slat + gap, k++) {
    g.save(); g.beginPath(); g.rect(x, 0, slat, H); g.clip();
    g.drawImage(grainImg, x - (k * 37) % 200, 0, 256, H);
    g.fillStyle = `rgba(0,0,0,${0.05 + (k * 7 % 5) * 0.02})`; g.fillRect(x, 0, slat, H);
    g.restore();
    b.fillStyle = '#fff'; b.fillRect(x + 1, 0, slat - 2, H);
  }
  const grad = g.createLinearGradient(0, H, 0, H - ppm * 0.6);
  grad.addColorStop(0, 'rgba(0,0,0,.45)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, H - ppm * 0.6, W, ppm * 0.6);
  const map = tex(c, { srgb: true }), bumpMap = tex(bump);
  return { map, bumpMap, bumpScale: 3, roughness: 0.75 };
}

// 玻璃上的手印和擦拭痕：集中在手扶的高度
export function smudgeMap(w, h, handY = 0.25) {
  const ppm = 128, W = Math.round(w * ppm), H = Math.round(h * ppm);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const r = rng(Math.round(w * 101));
  g.clearRect(0, 0, W, H);
  for (let k = 0; k < w * 18; k++) {
    const x = r() * W, y = H * (1 - handY) + (r() - 0.5) * H * 0.35, rr = 6 + r() * 16;
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, `rgba(255,255,255,${0.1 + r() * 0.14})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rr, rr * 1.3, r(), 0, Math.PI * 2); g.fill();
  }
  g.lineCap = 'round';
  for (let k = 0; k < w * 2; k++) {        // 擦拭留下的弧线
    const x = r() * W, y = r() * H;
    g.strokeStyle = `rgba(255,255,255,${0.025 + r() * 0.04})`; g.lineWidth = 20 + r() * 40;
    g.beginPath(); g.arc(x, y, 60 + r() * 120, r() * 6, r() * 6 + 1.4); g.stroke();
  }
  return tex(c, { srgb: true });
}

// 格栅 (检修平台）、穿孔板 (桥架）：用透明度贴图挖洞
export const gratingAlpha = () => once('grating', () => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#fff';
  for (let i = 0; i < 64; i += 8) g.fillRect(i, 0, 2, 64);
  for (let j = 0; j < 64; j += 32) g.fillRect(0, j, 64, 3);
  return tex(c);
});

// 圆形软阴影 (贴在物体底下，模拟接触阴影）
export const blobShadow = () => once('blob', () => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(0.55, 'rgba(0,0,0,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
});

// Bioreactors玻璃上的刻度
export const graduationMap = () => once('grad', () => {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 1024, 512);
  g.fillStyle = 'rgba(255,255,255,.85)';
  g.font = '500 16px "IBM Plex Mono", Consolas, monospace';
  const x0 = 470;                           // 正面
  for (let i = 0; i <= 20; i++) {
    const y = 470 - i * 20;
    const big = i % 5 === 0;
    g.fillRect(x0, y, big ? 34 : 18, 2);
    if (big && i) g.fillText(`${i * 100}`, x0 + 40, y + 6);
  }
  g.fillText('mL', x0 + 40, 40);
  return tex(c, { srgb: true });
});

// 手写胶带标签
export function tapeLabel(lines, w = 300, h = 90) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#efe6c8'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(0,0,0,.05)';
  for (let x = 0; x < w; x += 3) g.fillRect(x, 0, 1, h);
  g.fillStyle = '#1d2a6b';
  g.font = `400 ${Math.round(h * 0.32)}px "Segoe Print", "Comic Sans MS", cursive`;
  lines.forEach((l, i) => g.fillText(l, 10, h * (0.4 + i * 0.4)));
  return tex(c, { srgb: true });
}

// 圆形仪表
export const gaugeMap = () => once('gauge', () => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f4f2'; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#222'; g.lineWidth = 2;
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
    g.beginPath(); g.moveTo(64 + Math.cos(a) * 46, 64 + Math.sin(a) * 46); g.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56); g.stroke();
  }
  g.strokeStyle = '#c4262e'; g.lineWidth = 6;
  g.beginPath(); g.arc(64, 64, 52, Math.PI * 1.95, Math.PI * 2.25); g.stroke();
  g.strokeStyle = '#111'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.cos(Math.PI * 1.55) * 44, 64 + Math.sin(Math.PI * 1.55) * 44); g.stroke();
  g.fillStyle = '#111'; g.font = '500 12px Consolas, monospace'; g.textAlign = 'center'; g.fillText('bar', 64, 96);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
});

// ================================================================== 脏旧质感 (参考：灰暗、冷绿、用旧了的停尸房 / 地下食堂）
// 发黄的白瓷砖、刷绿漆的墙裙、水渍、往下流的锈痕、墙根的污垢、磨损的地砖、有水渍的days花板.

// 在任意画布上做旧：泛黄、水渍圈、往下流的污痕、划痕、边缘发暗
export function ageCanvas(g, W, H, { amount = 1, seed = 7, drips = true } = {}) {
  const r = rng(seed);
  g.save();
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = `rgba(206,196,160,${0.55 * amount})`; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over';
  const unit = Math.max(W, H);
  for (let i = 0; i < 10 * amount; i++) {            // 水渍：中间淡、边缘一圈深
    const x = r() * W, y = r() * H, rad = unit * (0.03 + r() * 0.12);
    const gr = g.createRadialGradient(x, y, rad * 0.2, x, y, rad);
    gr.addColorStop(0, 'rgba(120,100,60,0.04)'); gr.addColorStop(0.85, `rgba(110,88,50,${0.1 + r() * 0.12})`); gr.addColorStop(1, 'rgba(110,88,50,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
  }
  if (drips) for (let i = 0; i < 26 * amount; i++) {  // 往下流的污痕
    const x = r() * W, y = r() * H * 0.6, len = H * (0.1 + r() * 0.5), w = 1 + r() * unit * 0.006;
    const gr = g.createLinearGradient(0, y, 0, y + len);
    gr.addColorStop(0, `rgba(80,66,40,${0.08 + r() * 0.14})`); gr.addColorStop(1, 'rgba(80,66,40,0)');
    g.fillStyle = gr; g.fillRect(x, y, w, len);
  }
  g.strokeStyle = 'rgba(255,255,250,0.12)';            // 细划痕
  for (let i = 0; i < 30 * amount; i++) {
    const x = r() * W, y = r() * H, a = r() * Math.PI, l = unit * (0.01 + r() * 0.05);
    g.lineWidth = 0.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const v = g.createRadialGradient(W / 2, H / 2, unit * 0.3, W / 2, H / 2, unit * 0.75);
  v.addColorStop(0, 'rgba(40,34,20,0)'); v.addColorStop(1, `rgba(40,34,20,${0.35 * amount})`);
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  g.restore();
}

// 低频斑驳噪声 (一张 256 的小图，平铺叠加）
const mottle = (seed, alpha = 50, spread = 70) => once('mottle' + seed + alpha + spread, () => {
  const n = fbm(256, { cx: 4, cy: 4, octaves: 5, seed });
  return fromField(256, (x, y, i) => { const v = 128 + (n[i] - 0.5) * spread * 2; return [v, v * 0.98, v * 0.9, alpha]; });
});

// 墙：上半是发黄的方瓷砖 (tile），下半是刷绿漆的墙裙 (dado，单位米）;tile=false 时上半是脏的白漆
export function grimeWallMaps(w, h, o = {}) {
  const { tile = true, dado = 1.2, ppm = 100, size = 0.15, paint = [70, 84, 76], tileCol = [196, 192, 172], upper = [150, 150, 140], ao = 0.55, seed = 3 } = o;
  const W = Math.max(8, Math.round(w * ppm)), H = Math.max(8, Math.round(h * ppm));
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d')]; };
  const [c, g] = mk(), [rc, rg] = mk(), [bc, bg] = mk();
  const r = rng(seed + Math.round(w * 31 + h * 7));
  const dy = H - dado * ppm;                       // 墙裙顶边 (画布坐标，原点在上）
  bg.fillStyle = '#808080'; bg.fillRect(0, 0, W, H);
  // 上半
  if (tile) {
    const s = size * ppm;
    rg.fillStyle = 'rgb(70,70,70)'; rg.fillRect(0, 0, W, dy);
    for (let y = dy; y > -s; y -= s) for (let x = 0; x < W; x += s) {
      const k = 0.94 + r() * 0.1, cr = r() < 0.03 ? 0.85 : 1;
      g.fillStyle = `rgb(${tileCol.map((v) => Math.round(v * k * cr))})`; g.fillRect(x, y - s, s, s);
    }
    g.fillStyle = 'rgb(128,118,92)'; bg.fillStyle = '#383838'; rg.fillStyle = 'rgb(230,230,230)';
    for (let y = dy; y > 0; y -= s) { g.fillRect(0, y - 1, W, 2); bg.fillRect(0, y - 1.5, W, 3); rg.fillRect(0, y - 1, W, 2); }
    for (let x = 0; x < W; x += s) { g.fillRect(x - 1, 0, 2, dy); bg.fillRect(x - 1.5, 0, 3, dy); rg.fillRect(x - 1, 0, 2, dy); }
    for (let i = 0; i < W * dy / (s * s) * 0.02; i++) {   // 碎掉的瓷砖
      const x = Math.floor(r() * W / s) * s, y = dy - Math.ceil(r() * dy / s) * s;
      g.fillStyle = 'rgba(70,60,45,.55)'; g.beginPath(); g.moveTo(x + s * r(), y); g.lineTo(x + s, y + s * r()); g.lineTo(x + s * 0.6, y + s * 0.5); g.fill();
    }
  } else {
    g.fillStyle = `rgb(${upper})`; g.fillRect(0, 0, W, dy);
    rg.fillStyle = 'rgb(200,200,200)'; rg.fillRect(0, 0, W, dy);
  }
  // 墙裙：绿漆 + 深色腰线 + 掉漆
  g.fillStyle = `rgb(${paint})`; g.fillRect(0, dy, W, H - dy);
  rg.fillStyle = 'rgb(140,140,140)'; rg.fillRect(0, dy, W, H - dy);
  g.fillStyle = `rgb(${paint.map((v) => v * 0.55)})`; g.fillRect(0, dy - 0.03 * ppm, W, 0.03 * ppm);
  bg.fillStyle = '#a0a0a0'; bg.fillRect(0, dy - 0.03 * ppm, W, 0.03 * ppm);
  for (let i = 0; i < w * 9; i++) {
    const x = r() * W, y = dy + r() * (H - dy), rad = 1.5 + r() * ppm * 0.03;
    g.fillStyle = r() < 0.4 ? 'rgba(120,118,104,.45)' : 'rgba(70,58,42,.5)';
    g.beginPath();
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, rr = rad * (0.5 + r()); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7); }
    g.fill();
  }
  // 斑驳
  g.globalCompositeOperation = 'multiply';
  const m = mottle(seed, 90, 80);
  for (let x = 0; x < W; x += 256) for (let y = 0; y < H; y += 256) g.drawImage(m, x, y);
  g.globalCompositeOperation = 'source-over';
  // 往下流的锈水痕 (从days花板、从管道）
  for (let i = 0; i < w * 2.2; i++) {
    const x = r() * W, y0 = r() < 0.6 ? 0 : r() * dy, len = (0.4 + r() * 1.6) * ppm, ww = 2 + r() * 0.05 * ppm;
    const col = r() < 0.4 ? '96,62,30' : '70,64,46';
    const gr = g.createLinearGradient(0, y0, 0, y0 + len);
    gr.addColorStop(0, `rgba(${col},${0.25 + r() * 0.25})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.fillRect(x, y0, ww, len);
    rg.fillStyle = 'rgba(255,255,255,.25)'; rg.fillRect(x, y0, ww, len * 0.6);
  }
  // 水渍
  for (let i = 0; i < w * 0.8; i++) {
    const x = r() * W, y = r() * H * 0.8, rad = (0.15 + r() * 0.5) * ppm;
    const gr = g.createRadialGradient(x, y, rad * 0.3, x, y, rad);
    gr.addColorStop(0, 'rgba(110,96,60,.06)'); gr.addColorStop(0.88, `rgba(100,80,44,${0.16 + r() * 0.16})`); gr.addColorStop(1, 'rgba(100,80,44,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
  }
  // 墙根的污垢、顶上的烟熏
  const gb = g.createLinearGradient(0, H, 0, H - 0.6 * ppm);
  gb.addColorStop(0, `rgba(30,26,18,${ao})`); gb.addColorStop(1, 'rgba(30,26,18,0)');
  g.fillStyle = gb; g.fillRect(0, H - 0.6 * ppm, W, 0.6 * ppm);
  const gt = g.createLinearGradient(0, 0, 0, 0.7 * ppm);
  gt.addColorStop(0, `rgba(30,28,22,${ao * 0.8})`); gt.addColorStop(1, 'rgba(30,28,22,0)');
  g.fillStyle = gt; g.fillRect(0, 0, W, 0.7 * ppm);
  const map = tex(c, { srgb: true }), roughnessMap = tex(rc), bumpMap = tex(bc);
  for (const t of [map, roughnessMap, bumpMap]) t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return { map, roughnessMap, bumpMap, bumpScale: 1.2, roughness: 1 };
}

// 地面：磨旧的方地砖 (灰绿），污渍、鞋印擦痕、积水反光、缝里的黑垢.1024 像素 = 4×4 块砖
export const grimeFloorMaps = (key = 'gfloor', o = {}) => once('grimefloor-' + key, () => {
  const { base = [88, 94, 86], seed = 41, gloss = 1 } = o;
  const S = 1024, s = S / 4;
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = S; return [c, c.getContext('2d')]; };
  const [c, g] = mk(), [rc, rg] = mk();
  const r = rng(seed);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const k = 0.88 + r() * 0.2;
    g.fillStyle = `rgb(${base.map((v) => Math.round(v * k))})`; g.fillRect(x * s, y * s, s, s);
  }
  rg.fillStyle = 'rgb(150,150,150)'; rg.fillRect(0, 0, S, S);
  g.globalCompositeOperation = 'multiply';
  const m = mottle(seed, 140, 110);
  for (let x = 0; x < S; x += 256) for (let y = 0; y < S; y += 256) g.drawImage(m, x, y);
  g.globalCompositeOperation = 'source-over';
  const wrap = (fn) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) fn(ox, oy); };
  for (let i = 0; i < 26; i++) {                       // 污渍
    const x = r() * S, y = r() * S, rad = 20 + r() * 120;
    const col = r() < 0.5 ? '60,48,30' : '40,42,36';
    wrap((ox, oy) => {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      gr.addColorStop(0, `rgba(${col},${0.2 + r() * 0.25})`); gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(x + ox, y + oy, rad, 0, Math.PI * 2); g.fill();
    });
  }
  for (let i = 0; i < 3 * gloss; i++) {                // 积水：颜色略深、非常光滑，边缘是虚的
    const x = r() * S, y = r() * S, rad = 60 + r() * 160, sy = 0.4 + r() * 0.4;
    wrap((ox, oy) => {
      for (const [ctx, col] of [[rg, '20,20,20'], [g, '20,24,20']]) {
        ctx.save(); ctx.translate(x + ox, y + oy); ctx.scale(1, sy);
        const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
        gr.addColorStop(0, `rgba(${col},${ctx === rg ? 0.8 : 0.2})`); gr.addColorStop(0.6, `rgba(${col},${ctx === rg ? 0.5 : 0.1})`); gr.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    });
  }
  g.lineCap = 'round';
  for (let i = 0; i < 220; i++) {                      // 鞋底、推车的擦痕
    const x = r() * S, y = r() * S, a = r() * Math.PI * 2, l = 10 + r() * 60;
    g.strokeStyle = `rgba(20,18,14,${0.1 + r() * 0.25})`; g.lineWidth = 1 + r() * 4;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.4) * l * 0.5, y + Math.sin(a + 0.4) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  g.fillStyle = 'rgba(16,15,12,.85)'; rg.fillStyle = 'rgb(240,240,240)';  // 缝
  for (let k = 0; k <= 4; k++) { g.fillRect(k * s - 2, 0, 4, S); g.fillRect(0, k * s - 2, S, 4); rg.fillRect(k * s - 2, 0, 4, S); rg.fillRect(0, k * s - 2, S, 4); }
  const h = new Float32Array(S * S);
  const fine = fbm(S, { cx: 96, cy: 96, octaves: 2, seed: seed + 3 });
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const seam = (x % s < 3 || y % s < 3) ? -1 : 0;
    h[y * S + x] = seam * 1.5 + fine[y * S + x] * 0.4;
  }
  return { map: tex(c, { srgb: true }), roughnessMap: tex(rc), normalMap: tex(normalFrom(h, S, 1.4)) };
});

// days花板：60 cm 的矿棉板，有黄褐色的漏水痕.512 像素 = 2×2 块
export const stainedCeilingMaps = () => once('ceiling-grime', () => {
  const S = 1024, s = S / 4;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const r = rng(91);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const k = 0.9 + r() * 0.16; g.fillStyle = `rgb(${[140, 140, 130].map((v) => Math.round(v * k))})`; g.fillRect(x * s, y * s, s, s); }
  for (let i = 0; i < 16000; i++) { g.fillStyle = `rgba(60,60,52,${r() * 0.18})`; g.fillRect(r() * S, r() * S, 1.5, 1.5); }
  for (let i = 0; i < 5; i++) {
    const x = r() * S, y = r() * S, rad = 30 + r() * 140;
    const gr = g.createRadialGradient(x, y, rad * 0.3, x, y, rad);
    gr.addColorStop(0, 'rgba(140,110,60,.06)'); gr.addColorStop(0.9, 'rgba(110,84,44,.22)'); gr.addColorStop(1, 'rgba(120,86,40,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = 'rgb(70,70,66)';
  for (let k = 0; k <= 4; k++) { g.fillRect(k * s - 3, 0, 6, S); g.fillRect(0, k * s - 3, S, 6); }
  return { map: tex(c, { srgb: true }) };
});

// 通用的“用旧”贴图：给家具、柜子、金属件叠一层污垢 (灰度为主，材质颜色会乘上它）
export const grimeMap = (seed = 5) => once('grimemap' + seed, () => {
  const S = 512;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const r = rng(seed);
  g.fillStyle = 'rgb(236,234,226)'; g.fillRect(0, 0, S, S);
  g.globalCompositeOperation = 'multiply';
  const m = mottle(seed + 1, 160, 90);
  g.drawImage(m, 0, 0, S, S);
  g.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 40; i++) {
    const x = r() * S, y = r() * S, rad = 6 + r() * 50;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const col = r() < 0.3 ? '110,66,34' : '50,44,34';
    gr.addColorStop(0, `rgba(${col},${0.15 + r() * 0.3})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = 'rgba(255,255,255,.35)';
  for (let i = 0; i < 120; i++) {
    const x = r() * S, y = r() * S, a = r() * Math.PI, l = 4 + r() * 30;
    g.lineWidth = 0.7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  return tex(c, { srgb: true });
});
