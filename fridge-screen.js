// 冷柜触摸屏上的商品页：选完肉以后，定制、产量、份量、交付、下单都直接在这块玻璃屏上点（不再弹一层网页）。
// 画在 600 × 1057 的画布上（屏幕 42 × 74 cm），字都是英文（场景里的字）；点到哪里由 uv 换算回画布坐标，返回一个动作交给 main.js。
import * as THREE from 'three';

const SW = 600, SH = 1057, P = 28;
const MONO = '"IBM Plex Mono", Consolas, monospace', SANS = '"Inter", "Helvetica Neue", Arial, sans-serif';
const NAME = { beef: 'Cultivated beef steak', pork: 'Cultivated pork chop', chicken: 'Cultivated chicken breast', fish: 'Cultivated yellow croaker' };
const LINE = { beef: 'B-0417', pork: 'P-0932', chicken: 'G-0221', fish: 'F-1180' };
const OPT = {
  fat: ['FAT', { low: 'Lean', mid: 'Balanced', high: 'Rich' }, 'FatBlend™'],
  form: ['FORM', { fillet: 'Fillet', steak: 'Steak' }, 'ShapeFab™'],
  firm: ['TEXTURE', { tender: 'Tender', firm: 'Firm' }, 'FlexScaffold™'],
  aroma: ['AROMA', { base: 'Base', plus: 'Grill+' }, 'AromaSwitch™'],
  shade: ['COLOUR', { light: 'Light', deep: 'Deep' }, 'MyoTone™'],
  cycle: ['GROW', { 14: '14 d', 21: '21 d', 28: '28 d' }],
  plan: ['YIELD', { std: 'Std ×1', a: 'A ×3', b: 'B ×4' }, 'Yield+™'],
  delivery: ['DELIVERY', { std: 'Standard', priority: 'Priority +¥48' }],
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
    frame('CUSTOMISE');
    g.fillStyle = '#f0ece4'; g.font = `600 32px ${SANS}`; g.fillText(NAME[k], P, 118);
    g.fillStyle = '#8f949a'; g.font = `400 17px ${MONO}`; g.fillText(`CELL LINE ${LINE[k]} · ¥${v.base} / 200 g`, P, 148);
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
    g.fillStyle = '#f0ece4'; g.font = `600 46px ${SANS}`; g.fillText('¥' + price, P, SH - 46);
    btn(SW - P - 250, SH - 104, 250, 72, 'START GROWING', true, { type: 'buy' }, { size: 24, red: true });
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
    g.fillStyle = '#b8bcc0'; g.font = `400 20px ${SANS}`; g.fillText(`Paid ¥${v.price} · cell line ${LINE[v.k]}`, P, 476);
    btn(P, 540, SW - 2 * P, 84, 'WATCH IT GROW', false, { type: 'go', hash: '#/lab/batch' }, { size: 26 });
    btn(P, 640, SW - 2 * P, 84, 'CHECKOUT', true, { type: 'go', hash: '#/checkout' }, { size: 26, red: true });
    btn(P, 740, SW - 2 * P, 70, 'BACK TO THE SHOP', false, { type: 'go', hash: '#/' }, { size: 22 });
    scan();
  }
  const draw = (v) => { last = v; (v.mode === 'ordered' ? ordered : product)(v); };
  const at = (uv) => { if (!uv) return null; const x = uv.x * SW, y = (1 - uv.y) * SH; return regions.find((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1)?.act || null; };
  document.fonts?.ready.then(() => last && draw(last));
  return {
    tex, draw, pick: at,
    hover(uv) { const a = at(uv); if (JSON.stringify(a) !== JSON.stringify(hover)) { hover = a; if (last) draw(last); } return a; },
  };
}
