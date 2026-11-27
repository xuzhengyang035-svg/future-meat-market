import { gbp } from './money.js';
// 冷柜触摸屏上的商品页（都直接在这块玻璃屏上点，不弹网页）。两种买法：
//   现货（stock）：柜里那一盒已经长好了——只看这一盒的批次、克重、保质期，拿走就行，不能定制
//   培养定制（product）：从一份细胞系开始为你长一份，脂肪、纹理、颜色……都能选，14–28 天后取
// 画在 600 × 1057 的画布上（屏幕 42 × 74 cm），字都是英文（场景里的字）；点到哪里由 uv 换算回画布坐标，返回一个动作交给 main.js。
import * as THREE from 'three';

const SW = 600, SH = 1057, P = 28;
const MONO = '"IBM Plex Mono", Consolas, monospace', SANS = '"Inter", "Helvetica Neue", Arial, sans-serif';
const NAME = { beef: 'Cultivated beef steak', pork: 'Cultivated pork chop', chicken: 'Cultivated chicken breast', fish: 'Cultivated yellow croaker' };
const LINE = { beef: 'B-0417', pork: 'P-0932', chicken: 'G-0221', fish: 'F-1180' };
const TONE = { beef: ['#8e2a2a', '#c8505a'], pork: ['#c97a78', '#ecb2a8'], chicken: ['#d9a48c', '#f1d0bc'], fish: ['#d8c2a8', '#f3e6d4'] };
const OPT = {
  fat: ['FAT', { low: 'Lean', mid: 'Balanced', high: 'Rich' }, 'FatBlend™'],
  form: ['FORM', { fillet: 'Fillet', steak: 'Steak' }, 'ShapeFab™'],
  firm: ['TEXTURE', { tender: 'Tender', firm: 'Firm' }, 'FlexScaffold™'],
  aroma: ['AROMA', { base: 'Base', plus: 'Grill+' }, 'AromaSwitch™'],
  shade: ['COLOUR', { light: 'Light', deep: 'Deep' }, 'MyoTone™'],
  cycle: ['GROW', { 14: '14 d', 21: '21 d', 28: '28 d' }],
  plan: ['YIELD', { std: 'Std ×1', a: 'A ×3', b: 'B ×4' }, 'Yield+™'],
  delivery: ['DELIVERY', { std: 'Standard', priority: 'Priority +£4.80' }],
};

export function createProductScreen() {
  const cv = document.createElement('canvas'); cv.width = SW; cv.height = SH;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const g = cv.getContext('2d');
  let regions = [], hover = null, last = null;
  const btn = (x, y, w, h, label, on, act, { size = 22, red = false } = {}) => {
    const hot = hover && JSON.stringify(hover) === JSON.stringify(act);
    g.fillStyle = on ? (red ? '#b3262d' : '#e8e4dc') : hot ? '#2c3034' : '#1b1e21'; g.fillRect(x, y, w, h);
    g.strokeStyle = on ? 'transparent' : hot ? '#8a9096' : '#33373b'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
    g.fillStyle = on ? (red ? '#fff' : '#121315') : '#d8d4cc'; g.font = `600 ${size}px ${SANS}`; g.textAlign = 'center'; g.fillText(label, x + w / 2, y + h / 2 + size * 0.36); g.textAlign = 'left';
    regions.push({ x0: x, y0: y, x1: x + w, y1: y + h, act });
  };
  const frame = (title) => {
    regions = [];
    g.fillStyle = '#0e1012'; g.fillRect(0, 0, SW, SH);
    g.fillStyle = '#e8e4dc'; g.font = `600 22px ${MONO}`; g.fillText('FUTURE MEAT', P, 46);
    g.fillStyle = '#8a8680'; g.font = `400 17px ${MONO}`; g.textAlign = 'right'; g.fillText(title, SW - P - 58, 46); g.textAlign = 'left';
    btn(SW - P - 44, 20, 44, 38, '×', false, { type: 'close' }, { size: 28 });
    g.fillStyle = '#26292c'; g.fillRect(P, 70, SW - 2 * P, 2);
  };
  const scan = () => { for (let y = 0; y < SH; y += 3) { g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(0, y, SW, 1); } tex.needsUpdate = true; };

  function product(v) {
    const { k, opts, options, price } = v;
    frame('GROW TO ORDER');
    g.fillStyle = '#f0ece4'; g.font = `600 32px ${SANS}`; g.fillText(NAME[k], P, 118);
    swatch(SW - P - 92, 84, 92, 64, k, opts);
    g.fillStyle = '#8f949a'; g.font = `400 17px ${MONO}`; g.fillText(`CELL LINE ${LINE[k]} · ${gbp(v.base)} / 200 g`, P, 148);
    // 三个数：培养天数、细胞量、屠宰动物
    const stats = [[String(opts.cycle), 'DAYS TO GROW'], ['×' + v.x, 'YIELD'], ['0', 'ANIMALS SLAUGHTERED*']];
    stats.forEach(([n, l], i) => { const w = (SW - 2 * P - 20) / 3, x = P + i * (w + 10);
      g.fillStyle = '#16191c'; g.fillRect(x, 168, w, 96); g.fillStyle = i === 2 ? '#e0474e' : '#f0ece4'; g.font = `300 46px ${SANS}`; g.fillText(n, x + 14, 222);
      g.fillStyle = '#7d8288'; g.font = `500 12px ${MONO}`; g.fillText(l, x + 14, 250); });
    let y = 296;
    const row = (key, choices) => {
      const [label, names, tech] = OPT[key];
      g.fillStyle = '#b8bcc0'; g.font = `600 17px ${MONO}`; g.fillText(label, P, y + 22);
      if (tech) { g.fillStyle = '#5f646a'; g.font = `400 13px ${MONO}`; g.fillText(tech, P, y + 42); }
      const x0 = P + 150, w = (SW - P - x0 - (choices.length - 1) * 8) / choices.length;
      choices.forEach((c, i) => btn(x0 + i * (w + 8), y, w, 52, names[c] || String(c), String(opts[key]) === String(c), { type: 'opt', key, v: key === 'cycle' ? Number(c) : c }, { size: names[c] && names[c].length > 9 ? 17 : 20 }));
      y += 66;
    };
    for (const o of options) row(o.key, o.choices.map((c) => c[0]));
    row('cycle', [14, 21, 28]); row('plan', ['std', 'a', 'b']);
    // 份量
    g.fillStyle = '#b8bcc0'; g.font = `600 17px ${MONO}`; g.fillText('QTY', P, y + 22); g.fillStyle = '#5f646a'; g.font = `400 13px ${MONO}`; g.fillText('× 200 g', P, y + 42);
    btn(P + 150, y, 64, 52, '−', false, { type: 'qty', d: -1 }, { size: 30 });
    g.fillStyle = '#f0ece4'; g.font = `600 30px ${SANS}`; g.textAlign = 'center'; g.fillText(String(opts.qty), P + 150 + 64 + 50, y + 37); g.textAlign = 'left';
    btn(P + 150 + 64 + 100, y, 64, 52, '+', false, { type: 'qty', d: 1 }, { size: 30 });
    y += 66;
    row('delivery', ['std', 'priority']);
    // 价钱和下单
    g.fillStyle = '#26292c'; g.fillRect(P, SH - 128, SW - 2 * P, 2);
    g.fillStyle = '#7d8288'; g.font = `500 15px ${MONO}`; g.fillText('TOTAL', P, SH - 92);
    g.fillStyle = '#f0ece4'; g.font = `600 46px ${SANS}`; g.fillText(gbp(price), P, SH - 46);
    btn(SW - P - 250, SH - 104, 250, 72, 'START GROWING', true, { type: 'buy' }, { size: 24, red: true });
    g.fillStyle = '#5f646a'; g.font = `400 13px ${MONO}`; g.fillText('grown for you from a cell line · not from the fridge', P, SH - 136);
    g.fillStyle = '#4c5056'; g.font = `400 12px ${MONO}`; g.fillText('*in the culture process. donor sampling not included.', P, SH - 12);
    scan();
  }
  function ordered(v) {
    frame('ORDER ' + v.no);
    g.fillStyle = '#7d8288'; g.font = `500 17px ${MONO}`; g.fillText('NOW GROWING', P, 130);
    g.fillStyle = '#f0ece4'; g.font = `600 34px ${SANS}`; g.fillText(NAME[v.k], P, 176);
    g.fillStyle = '#16191c'; g.fillRect(P, 210, SW - 2 * P, 220);
    g.fillStyle = '#f0ece4'; g.font = `200 150px ${SANS}`; g.fillText(String(v.days), P + 24, 380);
    g.fillStyle = '#7d8288'; g.font = `500 18px ${MONO}`; g.fillText('DAYS UNTIL PICK-UP', P + 24, 414);
    g.fillStyle = '#b8bcc0'; g.font = `400 20px ${SANS}`; g.fillText(`Paid ${gbp(v.price)} · cell line ${LINE[v.k]}`, P, 476);
    btn(P, 540, SW - 2 * P, 84, 'WATCH IT GROW', false, { type: 'go', hash: '#/lab/batch' }, { size: 26 });
    btn(P, 640, SW - 2 * P, 84, 'CHECKOUT', true, { type: 'go', hash: '#/checkout' }, { size: 26, red: true });
    btn(P, 740, SW - 2 * P, 70, 'BACK TO THE SHOP', false, { type: 'go', hash: '#/' }, { size: 22 });
    scan();
  }
  // 定制页右上角的小样：一块肉的剖面，颜色跟着 COLOUR、白色脂肪纹跟着 FAT 变（屏幕上的界面插图，不是柜里的那盒）
  function swatch(x, y, w, h, k, o) {
    const deep = o.shade === 'deep', [a, b] = TONE[k], gr = g.createLinearGradient(x, y, x + w, y + h);
    gr.addColorStop(0, deep ? shade(a, -0.25) : a); gr.addColorStop(1, deep ? shade(b, -0.25) : b);
    g.fillStyle = '#16191c'; g.fillRect(x - 6, y - 6, w + 12, h + 12);
    g.save(); g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w / 2 - 2, h / 2 - 4, -0.1, 0, 7); g.fillStyle = gr; g.fill(); g.clip();
    const n = { low: 2, mid: 5, high: 9 }[o.fat] || 4; g.strokeStyle = 'rgba(255,244,232,.6)'; g.lineWidth = 1.6;
    for (let i = 0; i < n; i++) { const yy = y + 8 + i * (h - 16) / n; g.beginPath(); g.moveTo(x + 4, yy + 4); g.quadraticCurveTo(x + w / 2, yy + (i % 2 ? 9 : -6), x + w - 4, yy + 2); g.stroke(); }
    g.restore();
    g.fillStyle = '#5f646a'; g.font = `400 11px ${MONO}`; g.textAlign = 'center'; g.fillText('PREVIEW', x + w / 2, y + h + 18); g.textAlign = 'left';
  }
  const shade = (hex, d) => { const n = parseInt(hex.slice(1), 16), f = (c) => Math.max(0, Math.min(255, Math.round(c * (1 + d)))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
  const fact = (y, k, v, red) => { g.fillStyle = '#7d8288'; g.font = `500 15px ${MONO}`; g.fillText(k, P, y); g.fillStyle = red ? '#e0474e' : '#f0ece4'; g.font = `500 22px ${SANS}`; g.textAlign = 'right'; g.fillText(v, SW - P, y); g.textAlign = 'left'; g.fillStyle = '#1e2124'; g.fillRect(P, y + 14, SW - 2 * P, 1); };
  // 现货：柜里这一盒。没有任何可选项——只能拿或不拿
  function stock(v) {
    const { k, pack } = v;
    frame('IN THE FRIDGE');
    g.fillStyle = '#7d8288'; g.font = `500 17px ${MONO}`; g.fillText('READY TODAY · THIS PACK', P, 112);
    g.fillStyle = '#f0ece4'; g.font = `600 34px ${SANS}`; g.fillText(NAME[k], P, 156);
    let y = 196;
    if (pack.tag) { g.fillStyle = '#b3262d'; g.fillRect(P, y, SW - 2 * P, 46); g.fillStyle = '#fff'; g.font = `600 17px ${MONO}`; g.fillText(pack.tag, P + 14, y + 29); y += 66; } else y += 10;
    for (const [a, b, red] of [['BATCH', pack.batch], ['CELL LINE', LINE[k]], ['GROWN FOR', pack.grown + ' days'], ['HARVESTED', pack.harvested], ['WEIGHT', pack.grams + ' g'], ['BEST BEFORE', pack.best, pack.soon], ['ORIGINALLY FOR', pack.for]]) { y += 44; fact(y, a, b, red); }
    y += 44; g.fillStyle = '#5f646a'; g.font = `400 14px ${MONO}`;
    g.fillText('Ready-made. Fat, texture and colour are as grown.', P, y + 10); g.fillText('Want it your way? Grow your own below.', P, y + 32);
    g.fillStyle = '#26292c'; g.fillRect(P, SH - 214, SW - 2 * P, 2);
    g.fillStyle = '#7d8288'; g.font = `500 15px ${MONO}`; g.fillText('PRICE', P, SH - 178);
    if (pack.was) { g.fillStyle = '#6a6e72'; g.font = `400 22px ${SANS}`; const w = g.measureText(gbp(pack.was)).width; g.fillText(gbp(pack.was), P + 150, SH - 136); g.fillRect(P + 150, SH - 143, w, 2); }
    g.fillStyle = '#f0ece4'; g.font = `600 46px ${SANS}`; g.fillText(gbp(pack.price), P, SH - 132);
    btn(SW - P - 250, SH - 190, 250, 72, 'TAKE THIS PACK', true, { type: 'take' }, { size: 24, red: true });
    btn(P, SH - 98, SW - 2 * P, 58, 'GROW YOUR OWN ' + NAME[k].split(' ').pop().toUpperCase() + ' INSTEAD ›', false, { type: 'go', hash: '#/fridge/grow/' + k }, { size: 19 });
    g.fillStyle = '#4c5056'; g.font = `400 12px ${MONO}`; g.fillText('grown to someone\'s order · not collected · now in the fridge', P, SH - 14);
    scan();
  }
  function taken(v) {
    frame('IN YOUR BAG');
    g.fillStyle = '#7d8288'; g.font = `500 17px ${MONO}`; g.fillText('ADDED', P, 130);
    g.fillStyle = '#f0ece4'; g.font = `600 34px ${SANS}`; g.fillText(NAME[v.k], P, 176);
    g.fillStyle = '#b8bcc0'; g.font = `400 20px ${SANS}`; g.fillText(`${v.pack.grams} g · batch ${v.pack.batch} · ${gbp(v.pack.price)}`, P, 214);
    g.fillStyle = '#16191c'; g.fillRect(P, 250, SW - 2 * P, 150);
    g.fillStyle = '#f0ece4'; g.font = `200 96px ${SANS}`; g.fillText(String(v.count), P + 24, 360);
    g.fillStyle = '#7d8288'; g.font = `500 18px ${MONO}`; g.fillText(v.count > 1 ? 'PACKS IN YOUR BAG' : 'PACK IN YOUR BAG', P + 24 + g.measureText(String(v.count)).width * 0 + 110, 340);
    g.fillStyle = '#b8bcc0'; g.font = `400 20px ${SANS}`; g.fillText(`Total ${gbp(v.total)}`, P + 134, 372);
    btn(P, 450, SW - 2 * P, 84, 'CHECKOUT', true, { type: 'go', hash: '#/checkout' }, { size: 26, red: true });
    btn(P, 550, SW - 2 * P, 70, 'KEEP SHOPPING', false, { type: 'go', hash: '#/fridge' }, { size: 22 });
    btn(P, 636, SW - 2 * P, 70, 'GROW YOUR OWN ›', false, { type: 'go', hash: '#/fridge/grow' }, { size: 22 });
    scan();
  }
  // 培养定制的第一步：选一种，从它的细胞系开始长
  function growPick(v) {
    frame('GROW TO ORDER');
    g.fillStyle = '#f0ece4'; g.font = `600 34px ${SANS}`; g.fillText('Grow your own', P, 124);
    g.fillStyle = '#8f949a'; g.font = `400 18px ${SANS}`; g.fillText('Started for you from a cell line. Choose fat, texture,', P, 160); g.fillText('colour and more. Ready in 14 – 28 days.', P, 186);
    const TW = (SW - 2 * P - 18) / 2, TH = 250;
    ['beef', 'pork', 'chicken', 'fish'].forEach((k, i) => {
      const x = P + (i % 2) * (TW + 18), y = 220 + Math.floor(i / 2) * (TH + 18), act = { type: 'go', hash: '#/fridge/grow/' + k }, hot = hover && hover.hash === act.hash;
      g.fillStyle = hot ? '#24282c' : '#181b1e'; g.fillRect(x, y, TW, TH); if (hot) { g.strokeStyle = '#6c7276'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, TW - 2, TH - 2); }
      swatch(x + TW / 2 - 70, y + 30, 140, 84, k, { fat: 'mid', shade: 'light' });
      g.fillStyle = '#f0ece4'; g.font = `600 24px ${SANS}`; g.fillText(NAME[k].replace('Cultivated ', '').replace(/^./, (c) => c.toUpperCase()), x + 16, y + 170);
      g.fillStyle = '#8f949a'; g.font = `400 15px ${MONO}`; g.fillText(`CELL LINE ${LINE[k]}`, x + 16, y + 196);
      g.fillStyle = '#e0474e'; g.font = `600 26px ${SANS}`; g.fillText(`from ${gbp(v.prices[k])}`, x + 16, y + 232);
      regions.push({ x0: x, y0: y, x1: x + TW, y1: y + TH, act });
    });
    btn(P, SH - 110, SW - 2 * P, 64, '‹ BACK TO WHAT\'S IN THE FRIDGE', false, { type: 'go', hash: '#/fridge' }, { size: 20 });
    scan();
  }
  const MODES = { ordered, stock, taken, grow: growPick, product };
  const draw = (v) => { last = v; MODES[v.mode](v); };
  const at = (uv) => { if (!uv) return null; const x = uv.x * SW, y = (1 - uv.y) * SH; return regions.find((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1)?.act || null; };
  document.fonts?.ready.then(() => last && draw(last));
  return {
    tex, draw, pick: at,
    hover(uv) { const a = at(uv); if (JSON.stringify(a) !== JSON.stringify(hover)) { hover = a; if (last) draw(last); } return a; },
  };
}
