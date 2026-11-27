import { gbp } from './money.js';
// 用 canvas 画出来的占位贴图：地砖、窗外街景、广告屏、直播画面、价签。
// 之后都可以换成真实照片或录屏。
import * as THREE from 'three';
import { SPECIES } from './data.js';

export function canvasTexture(w, h, draw, opts = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...opts.repeat); }
  t.userData = { canvas: c, ctx: g };
  return t;
}

const FONT = '"Inter", "Noto Sans SC", "Microsoft YaHei", sans-serif';

export const tileTexture = (repeat) => canvasTexture(512, 512, (g, W) => {
  g.fillStyle = '#d9d6cf'; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const v = 214 + Math.random() * 10;
    g.fillStyle = `rgb(${v},${v - 3},${v - 9})`;
    g.fillRect(i * 128 + 2, j * 128 + 2, 124, 124);
  }
}, { repeat });

export const streetTexture = () => canvasTexture(2048, 900, (g, W, H) => {
  const sky = g.createLinearGradient(0, 0, 0, H * 0.6);
  sky.addColorStop(0, '#b9c7d2'); sky.addColorStop(1, '#e4e8ea');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  g.filter = 'blur(3px)';
  const cols = ['#a9a39b', '#8e8a85', '#b8b1a6', '#9c958b', '#7f7b77'];
  let x = 0;
  while (x < W) {
    const w = 180 + Math.random() * 260, h = 260 + Math.random() * 300;
    g.fillStyle = cols[Math.floor(Math.random() * cols.length)];
    g.fillRect(x, H * 0.62 - h, w, h);
    g.fillStyle = 'rgba(40,50,60,.35)';
    for (let wy = H * 0.62 - h + 24; wy < H * 0.6 - 30; wy += 46)
      for (let wx = x + 16; wx < x + w - 30; wx += 40) g.fillRect(wx, wy, 22, 28);
    x += w + 8;
  }
  g.fillStyle = '#6d6a66'; g.fillRect(0, H * 0.62, W, H * 0.12);
  g.fillStyle = '#bdb8b0'; g.fillRect(0, H * 0.74, W, H * 0.26);
  g.fillStyle = '#5c6b4f';
  for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(200 + i * 420, H * 0.5, 90, 0, Math.PI * 2); g.fill(); }
  g.filter = 'none';
});

// 品牌广告屏：几张轮播
const ADS = [
  ['CULTIVATED MEAT', 'Grown from animal cells · no slaughter'],
  ['0', 'animals slaughtered for your dinner*'],
  ['OPEN WORKSHOP', 'Regulars may book a visit · no photos'],
];
export function drawAd(g, W, H, i) {
  const [big, small] = ADS[i % ADS.length];
  g.fillStyle = '#f3efe8'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#b3262d'; g.fillRect(0, 0, 16, H);
  g.fillStyle = '#141414';
  g.font = `300 ${big.length < 3 ? 200 : 72}px ${FONT}`;
  g.fillText(big, 70, H * 0.55);
  g.font = `400 30px ${FONT}`; g.fillStyle = '#5d5a57';
  g.fillText(small, 74, H * 0.55 + 60);
  g.font = `400 18px ${FONT}`; g.fillStyle = '#9a9591';
  g.fillText('FUTURE MEAT MARKET', 74, 60);
  if (small.includes('*')) g.fillText('*see notice in store', W - 210, H - 30);
}

// 直播画面：像监控摄像头拍到的生产车间
export function drawLive(g, W, H, t, order) {
  g.fillStyle = '#8d9396'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#a7adb0'; g.fillRect(0, H * 0.62, W, H * 0.38);
  for (let i = 0; i < 3; i++) {
    const cx = W * (0.22 + i * 0.28), w = W * 0.13, top = H * 0.18, bot = H * 0.78;
    const steel = g.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    steel.addColorStop(0, '#6f7477'); steel.addColorStop(0.4, '#d8dcde'); steel.addColorStop(1, '#5e6366');
    g.fillStyle = steel;
    g.fillRect(cx - w / 2, top, w, bot - top);
    g.beginPath(); g.ellipse(cx, top, w / 2, w / 5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(214,120,128,.75)';
    g.fillRect(cx - w / 2 + 6, H * 0.38, w - 12, H * 0.22);
    g.fillStyle = 'rgba(255,255,255,.5)';
    for (let k = 0; k < 14; k++) {
      const y = H * 0.38 + ((k * 37 + t * 18 * (i + 1)) % (H * 0.22));
      g.fillRect(cx - w / 2 + 10 + ((k * 53) % (w - 24)), y, 3, 3);
    }
  }
  g.fillStyle = 'rgba(255,255,255,.85)';
  g.fillRect(W * 0.72, H * 0.42, W * 0.03, H * 0.2);
  // 噪点与扫描线
  for (let k = 0; k < 400; k++) {
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
    g.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  }
  g.fillStyle = 'rgba(0,0,0,.05)';
  for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);
  // 叠加文字
  const d = new Date();
  g.font = `500 ${Math.round(H * 0.045)}px ${FONT}`;
  g.fillStyle = '#fff';
  g.fillText('CAM-02  OPEN WORKSHOP  BR-01 ~ BR-03', W * 0.03, H * 0.08);
  g.fillText(d.toLocaleString('en-GB', { hour12: false }), W * 0.03, H * 0.95);
  g.fillStyle = Math.floor(t * 2) % 2 ? '#e0353b' : 'rgba(224,53,59,.3)';
  g.beginPath(); g.arc(W * 0.9, H * 0.065, H * 0.018, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.fillText('LIVE', W * 0.92, H * 0.08);
  if (order) {
    g.fillStyle = 'rgba(179,38,45,.9)';
    g.fillRect(W * 0.03, H * 0.82, W * 0.42, H * 0.07);
    g.fillStyle = '#fff';
    g.fillText(`YOUR ORDER · ${SPECIES[order.species].id} · BR-02`, W * 0.045, H * 0.87);
  }
}

// 冷柜触摸屏待机画面
export function drawAttract(g, W, H) {
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1d1f22'); bg.addColorStop(1, '#0d0e10');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff'; g.textAlign = 'center';
  g.font = `300 46px ${FONT}`;
  g.fillText('Pick a pack', W / 2, H * 0.42);
  g.fillText('or grow your own', W / 2, H * 0.42 + 60);
  g.font = `400 20px ${FONT}`; g.fillStyle = '#9aa0a6';
  g.fillText('TAP A PRODUCT TO BEGIN', W / 2, H * 0.42 + 112);
  g.strokeStyle = '#b3262d'; g.lineWidth = 3;
  g.beginPath(); g.arc(W / 2, H * 0.72, 34, 0, Math.PI * 2); g.stroke();
  g.font = `500 22px ${FONT}`; g.fillStyle = '#9aa0a6';
  g.fillText('FUTURE MEAT', W / 2, H * 0.92);
}

// 电子价签
export const shelfLabel = (key) => canvasTexture(512, 96, (g, W, H) => {
  const s = SPECIES[key];
  g.fillStyle = '#f4f3ef'; g.fillRect(0, 0, W, H);
  g.fillStyle = "#141414"; g.font = `500 28px ${FONT}`;
  g.fillText({ beef: 'Cultivated beef steak', pork: 'Cultivated pork chop', chicken: 'Cultivated chicken breast', fish: 'Cultivated yellow croaker' }[key] || s.en, 22, 50);
  g.font = `400 20px ${FONT}`; g.fillStyle = '#6b6662';
  g.fillText(`CELL LINE ${s.id} · PER 200 g`, 22, 80);
  g.textAlign = 'right'; g.fillStyle = '#b3262d'; g.font = `500 44px ${FONT}`;
  g.fillText(gbp(s.price), W - 22, 62);
});

export const signTexture = (text, sub, opts = {}) => canvasTexture(1024, opts.h || 160, (g, W, H) => {
  g.fillStyle = opts.bg || '#f7f5f1'; g.fillRect(0, 0, W, H);
  g.fillStyle = opts.color || '#141414'; g.textAlign = 'center';
  g.font = `500 ${Math.round(H * 0.34)}px ${FONT}`;
  g.fillText(text, W / 2, sub ? H * 0.5 : H * 0.62);
  if (sub) { g.font = `400 ${Math.round(H * 0.18)}px ${FONT}`; g.globalAlpha = 0.6; g.fillText(sub, W / 2, H * 0.82); }
});
