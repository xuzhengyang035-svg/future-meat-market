// The old newspapers the shop pasted on the inside of its front glass. One set of sheets, two faces:
// the street sees the front page of each sheet, the shop sees the page printed on its back (plus a faint
// mirrored show-through of the front). Sizes are real: broadsheet page 0.6 × 0.8 m, tabloid 0.42 × 0.56 m,
// a folded half page, small clippings cut out with scissors. Photos are real pictures (farm snapshots,
// meat close-ups, a 1918 cut chart) screened into newsprint halftone.
import * as THREE from 'three';

const SERIF = 'Georgia, "Times New Roman", serif', SANS = '"Inter", Arial, sans-serif';
const PPM = 900;                                                                    // canvas pixels per metre of paper

// Stories. The first five follow real events (the years are on the dateline); the rest are local to this street.
export const STORIES = [
  { head: 'GROWN CHICKEN GOES ON SALE', deck: 'City-state becomes the first to approve meat made from animal cells', photo: 'meat_5.webp', cap: 'Cultivated chicken, plated at the launch dinner.', paper: 'The World Desk', date: 'WEDNESDAY 2 DECEMBER 2020' },
  { head: 'LAB CHICKEN CLEARED FOR US PLATES', deck: 'Two start-ups win final approval after years of review', photo: 'meat_6.webp', cap: 'Grown chicken breast before cooking.', paper: 'The Evening Post', date: 'THURSDAY 22 JUNE 2023' },
  { head: 'ITALY VOTES TO BAN "SYNTHETIC" MEAT', deck: 'Farmers cheer outside parliament; scientists call it a mistake', photo: 'oldphoto_1.jpg', cap: 'A family farm in the north. Opponents say grown meat threatens them.', paper: 'Southside Herald', date: 'FRIDAY 17 NOVEMBER 2023' },
  { head: 'FLORIDA OUTLAWS CULTIVATED MEAT', deck: 'Selling it becomes a criminal offence from July', photo: 'meat_2.webp', cap: 'Marbled beef grown from a single biopsy.', paper: 'The Courier', date: 'THURSDAY 2 MAY 2024' },
  { head: 'FIRST GROWN PET FOOD APPROVED', deck: 'Cultivated chicken for dogs clears UK regulators', photo: 'meat_3.webp', cap: 'The first batch, grown in a 200-litre tank.', paper: 'Market Gazette', date: 'MONDAY 8 JULY 2024' },
  { head: 'MARKET ST BUTCHER GOES "NO KILL"', deck: 'Third-generation shop now sells only meat grown from cells', photo: 'beefcuts_1918.jpg', cap: 'The 1918 cut chart still hangs behind the counter.', paper: 'Old Street Weekly', date: 'SATURDAY 14 MARCH 2026' },
  { head: 'WHERE DOES THE SERUM COME FROM?', deck: 'Growth medium in many tanks still relies on calf blood, critics say', photo: 'oldphoto_2.jpg', cap: 'Calves at a dairy farm. Foetal serum is taken at slaughter.', paper: 'Southside Herald', date: 'TUESDAY 9 JUNE 2026' },
  { head: 'DONOR COW B-0417 TURNS TWELVE', deck: 'One biopsy a year feeds half the borough', photo: 'oldphoto_3.jpg', cap: 'B-0417 on her farm. Her cells are in every sirloin on Market St.', paper: 'Old Street Weekly', date: 'SATURDAY 19 SEPTEMBER 2026' },
  { head: 'HALE FARM DOWN TO ONE PIG', deck: 'Sow 4471 is kept for her cells; the rest of the herd is gone', photo: 'oldphoto_2.jpg', cap: 'Hale Farm, spring 2019.', paper: 'The Evening Post', date: 'MONDAY 12 OCTOBER 2026' },
  { head: 'GROWN STEAK NOW CHEAPER THAN BEEF', deck: 'Price per kilo falls below farmed meat for the first time', photo: 'meat_1.webp', cap: 'A grown sirloin at ¥132 a portion.', paper: 'The Courier', date: 'FRIDAY 6 NOVEMBER 2026' },
  { head: 'CABLE ST SLAUGHTERHOUSE TO CLOSE', deck: '140 jobs go as last abattoir in the borough shuts', photo: 'oldphoto_1.jpg', cap: 'The yard on Cable Street, 1960s.', paper: 'Market Gazette', date: 'WEDNESDAY 18 NOVEMBER 2026' },
  { head: 'TASTE TEST: CAN YOU TELL?', deck: 'Nine out of twenty diners picked the grown pork', photo: 'meat_4.webp', cap: 'Grown (left) and farmed pork belly.', paper: 'Old Street Weekly', date: 'SATURDAY 21 NOVEMBER 2026' },
];
const BODY = ('Regulators said the product was safe to eat after reviewing data on how the cells are grown, fed and harvested. ' +
  'The cells are taken from a living animal by biopsy and multiplied in steel tanks filled with a warm broth of sugars, salts, amino acids and growth factors. ' +
  'After two to four weeks the tissue is harvested, pressed and shaped. Supporters say no animal has to die for the meal. ' +
  'Critics point out that many producers still feed their cultures with foetal bovine serum, which is collected from calves at slaughter. ' +
  'Farmers worry about their livelihoods, and some lawmakers have moved to ban the sale of meat grown in this way. ' +
  'Prices have fallen sharply as tanks grow larger. A spokesman for the company said demand had outstripped supply in the first week. ' +
  'Butchers on Market Street said regulars were curious but cautious. "They ask which animal it came from," one said. "We tell them." ').split(' ');

// ------------------------------------------------------------------ sheets: room coordinates on the glass (x, y centre), size, tilt, form, front story, back story
// Three panes between the mullions at x = −5, −3.4, −1.7, −0.1; nothing crosses a mullion.
export const SHEETS = [
  { x: -4.58, y: 1.62, w: 0.6, h: 0.8, rz: 0.015, form: 'broad', f: 0, b: 6 },
  { x: -3.8, y: 1.86, w: 0.42, h: 0.56, rz: -0.03, form: 'tabloid', f: 3, b: 8 },
  { x: -4.52, y: 0.62, w: 0.58, h: 0.42, rz: 0.01, form: 'folded', f: 5, b: 9 },
  { x: -3.72, y: 1.0, w: 0.22, h: 0.3, rz: 0.06, form: 'clip', f: 7, b: 0 },
  { x: -3.82, y: 0.48, w: 0.24, h: 0.32, rz: -0.05, form: 'clip', f: 9, b: 1 },
  { x: -2.98, y: 1.5, w: 0.6, h: 0.8, rz: -0.02, form: 'broad', f: 1, b: 10 },
  { x: -2.12, y: 1.92, w: 0.42, h: 0.56, rz: 0.025, form: 'tabloid', f: 4, b: 11 },
  { x: -2.18, y: 0.72, w: 0.42, h: 0.56, rz: -0.015, form: 'torn', f: 8, b: 2 },
  { x: -2.9, y: 0.5, w: 0.3, h: 0.22, rz: 0.05, form: 'clip', f: 11, b: 3 },
  { x: -1.28, y: 1.62, w: 0.6, h: 0.8, rz: 0.01, form: 'broad', f: 2, b: 5 },
  { x: -0.52, y: 1.18, w: 0.42, h: 0.56, rz: -0.02, form: 'tabloid', f: 6, b: 7 },
  { x: -1.24, y: 0.56, w: 0.58, h: 0.42, rz: 0.0, form: 'folded', f: 10, b: 4 },
  { x: -0.46, y: 2.12, w: 0.22, h: 0.3, rz: 0.08, form: 'clip', f: 9, b: 6 },
];

// ------------------------------------------------------------------ halftone photo: grey, contrasty, screened into dots like cheap newsprint
const imgCache = {};
function loadImg(file) { if (!imgCache[file]) imgCache[file] = new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = 'assets/user/' + file; }); return imgCache[file]; }
function halftone(g, im, x, y, w, h, pitch = 3.2) {
  const cols = Math.ceil(w / pitch), rows = Math.ceil(h / pitch), c = document.createElement('canvas'); c.width = cols; c.height = rows;
  const cg = c.getContext('2d'); const s = Math.max(cols / im.width, rows / im.height), sw = cols / s, sh = rows / s;
  cg.filter = 'grayscale(1) contrast(1.35) brightness(1.05)'; cg.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, 0, 0, cols, rows);
  const d = cg.getImageData(0, 0, cols, rows).data;
  g.fillStyle = '#e8e2d0'; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(22,20,18,.92)';
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const v = d[(j * cols + i) * 4] / 255, r = (1 - v) * pitch * 0.62; if (r > 0.25) { g.beginPath(); g.arc(x + (i + 0.5) * pitch, y + (j + 0.5) * pitch, r, 0, 7); g.fill(); } }
  g.strokeStyle = 'rgba(20,20,20,.6)'; g.lineWidth = 1; g.strokeRect(x, y, w, h);
}
// running text that wraps to a column
function column(g, x, y, w, yEnd, seed, px = 11) {
  g.font = `400 ${px}px ${SERIF}`; g.fillStyle = 'rgba(28,26,24,.82)';
  let i = seed * 7 % BODY.length, line = '';
  for (let yy = y; yy < yEnd; ) { const word = BODY[i++ % BODY.length]; if (g.measureText(line + word).width > w) { g.fillText(line, x, yy); yy += px * 1.25; line = ''; } line += word + ' '; }
}
function wrap(g, text, x, y, w, lh) { let line = '', yy = y; for (const word of text.split(' ')) { if (g.measureText(line + word).width > w && line) { g.fillText(line.trim(), x, yy); yy += lh; line = ''; } line += word + ' '; } g.fillText(line.trim(), x, yy); return yy; }

// Lay one page out. Returns a promise that resolves once the photo is screened in.
function page(g, W, H, st, form, seed) {
  const paperTone = ['#e2d9c0', '#d9cfb2', '#e6dec8', '#d2c6a6'][seed % 4];
  g.fillStyle = paperTone; g.fillRect(0, 0, W, H);
  const m = W * 0.045, inner = W - 2 * m;
  let y = m;
  if (form !== 'clip') {                                                            // masthead and dateline
    g.fillStyle = '#1a1816'; g.textAlign = 'center'; g.font = `900 ${W * (form === 'tabloid' ? 0.1 : 0.085)}px ${SERIF}`; g.fillText(st.paper, W / 2, y + W * 0.08); g.textAlign = 'left';
    y += W * 0.1; g.fillRect(m, y, inner, 2); g.font = `600 ${W * 0.018}px ${SANS}`; g.fillText(st.date + '   ·   PRICE 80p', m, y + W * 0.03); y += W * 0.042; g.fillRect(m, y, inner, 1); y += W * 0.02;
  }
  g.fillStyle = '#141210'; const hp = W * (form === 'tabloid' ? 0.092 : form === 'clip' ? 0.085 : 0.062);
  g.font = `900 ${hp}px ${form === 'tabloid' ? SANS : SERIF}`; y = wrap(g, st.head, m, y + hp, inner, hp * 1.05) + hp * 0.35;
  g.font = `italic 500 ${hp * 0.42}px ${SERIF}`; g.fillStyle = '#2a2622'; y = wrap(g, st.deck, m, y + hp * 0.3, inner, hp * 0.5) + hp * 0.5;
  const phH = form === 'clip' ? H * 0.28 : form === 'folded' ? H * 0.42 : H * 0.34, phW = form === 'broad' ? inner * 0.62 : inner, py = y;
  const done = loadImg(st.photo).then((im) => { if (im) halftone(g, im, m, py, phW, phH, form === 'clip' ? 2.6 : 3.4); g.font = `italic 400 ${W * 0.017}px ${SERIF}`; g.fillStyle = '#2a2622'; g.fillText(st.cap, m, py + phH + W * 0.024); });
  g.fillStyle = '#cfc6ae'; g.fillRect(m, py, phW, phH);                              // placeholder until the photo arrives
  const colTop = py + phH + W * 0.05, cols = form === 'broad' ? 4 : form === 'clip' ? 1 : 3, cw = (inner - (cols - 1) * W * 0.02) / cols;
  for (let c = 0; c < cols; c++) { const cx = m + c * (cw + W * 0.02); column(g, cx, colTop, cw, H - m, seed * 3 + c, form === 'clip' ? W * 0.034 : W * 0.019); if (c) { g.fillStyle = 'rgba(30,30,30,.35)'; g.fillRect(cx - W * 0.01, colTop - 10, 1, H - colTop - m); } }
  if (form === 'broad') { const sx = m + phW + W * 0.02, sw = inner - phW - W * 0.02; g.fillStyle = '#141210'; g.font = `800 ${W * 0.026}px ${SANS}`; g.fillText('INSIDE', sx, py + W * 0.03); g.fillRect(sx, py + W * 0.038, sw, 1.5); column(g, sx, py + W * 0.07, sw, py + phH, seed + 40, W * 0.017); }
  return done;
}
// ageing: yellowed toward the edges, a fold, damp marks, sun-bleach on the side that faced the street
function age(g, W, H, seed, form) {
  let n = seed * 131 + 7; const r = () => (n = (n * 16807) % 2147483647) / 2147483647;
  g.globalCompositeOperation = 'multiply';
  const rg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75); rg.addColorStop(0, 'rgba(255,250,235,1)'); rg.addColorStop(1, `rgba(${200 + r() * 20},${165 + r() * 20},${105 + r() * 20},1)`); g.fillStyle = rg; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 3; i++) { g.fillStyle = `rgba(170,140,90,${0.15 + r() * 0.2})`; g.beginPath(); g.ellipse(r() * W, r() * H, 20 + r() * 60, 14 + r() * 40, r() * 3, 0, 7); g.fill(); }   // damp rings
  g.globalCompositeOperation = 'source-over';
  if (form === 'folded' || form === 'broad') { g.strokeStyle = 'rgba(90,70,40,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, H * 0.5); g.lineTo(W, H * 0.5 + (r() - 0.5) * 8); g.stroke(); g.fillStyle = 'rgba(255,250,235,.25)'; g.fillRect(0, H * 0.5 - 4, W, 3); }
}
// cut-outs, torn edges and nibbled corners: the same outline on both faces (mirrored on the back)
function outline(g, W, H, form, seed, mirror) {
  let n = seed * 977 + 3; const r = () => (n = (n * 16807) % 2147483647) / 2147483647;
  g.save(); if (mirror) { g.translate(W, 0); g.scale(-1, 1); }
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
  if (form === 'clip') {                                                            // scissor cut: slightly wavy, not quite square
    g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, H); g.lineTo(0, H); g.closePath();
    g.moveTo(6 + r() * 4, 4 + r() * 4); for (let k = 1; k <= 8; k++) g.lineTo(k * W / 8 - 3 + r() * 6, 3 + r() * 5);
    for (let k = 1; k <= 10; k++) g.lineTo(W - 3 - r() * 6, k * H / 10); for (let k = 7; k >= 0; k--) g.lineTo(k * W / 8 + r() * 6, H - 3 - r() * 5);
    for (let k = 9; k >= 1; k--) g.lineTo(3 + r() * 6, k * H / 10); g.closePath(); g.fill('evenodd');
  }
  if (form === 'torn') {                                                            // a ragged tear along one side
    g.beginPath(); g.moveTo(W, 0); let x = W * 0.82; g.lineTo(x, 0); for (let y = 0; y <= H; y += 6) { x += (r() - 0.5) * 10; g.lineTo(Math.min(W, Math.max(W * 0.7, x)), y); } g.lineTo(W, H); g.closePath(); g.fill();
  }
  for (let k = 0; k < 2; k++) { const cx = r() < 0.5 ? 0 : W, cy = r() < 0.5 ? 0 : H; g.beginPath(); g.moveTo(cx, cy); for (let i = 0; i < 6; i++) g.lineTo(Math.abs(cx - (12 + r() * 30) * Math.cos(i / 5 * 1.57)), Math.abs(cy - (12 + r() * 30) * Math.sin(i / 5 * 1.57))); g.fill(); }
  g.restore();
}

// ------------------------------------------------------------------ textures for one sheet face
export function sheetTexture(s, side, i) {
  const W = Math.round(s.w * PPM), H = Math.round(s.h * PPM), c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const front = document.createElement('canvas'); front.width = W; front.height = H; const fg = front.getContext('2d');
  const draw = () => {
    if (side === 'front') { g.clearRect(0, 0, W, H); g.drawImage(front, 0, 0); }
    else {
      g.clearRect(0, 0, W, H);
      const back = document.createElement('canvas'); back.width = W; back.height = H; const bg = back.getContext('2d');
      return page(bg, W, H, STORIES[s.b], s.form === 'clip' ? 'clip' : s.form === 'tabloid' ? 'tabloid' : 'broad', i * 5 + 1).then(() => {
        g.drawImage(back, 0, 0);
        g.save(); g.globalAlpha = 0.09; g.translate(W, 0); g.scale(-1, 1); g.drawImage(front, 0, 0); g.restore();     // the front page shows through, mirrored
        age(g, W, H, i * 3 + 1, s.form); outline(g, W, H, s.form, i, true); t.needsUpdate = true;
      });
    }
    age(g, W, H, i * 3 + 2, s.form); outline(g, W, H, s.form, i, false); t.needsUpdate = true;
  };
  page(fg, W, H, STORIES[s.f], s.form === 'torn' ? 'tabloid' : s.form, i * 5).then(draw);
  fg.fillStyle = '#d8cfb4'; g.fillStyle = '#d8cfb4'; g.fillRect(0, 0, W, H);
  return t;
}

// ------------------------------------------------------------------ meshes: paper stands off the glass a little, curls at a loose corner, ridges at a fold
export function addSheets(parent, side, { dx = 0, glassZ = 5.0 } = {}) {
  const tape = new THREE.MeshPhysicalMaterial({ color: 0xd8c898, roughness: 0.45, transparent: true, opacity: 0.78 });
  SHEETS.forEach((s, i) => {
    const geo = new THREE.PlaneGeometry(s.w, s.h, 10, 12), p = geo.attributes.position;
    let n = i * 71 + 5; const r = () => (n = (n * 16807) % 2147483647) / 2147483647;
    const loose = [r() < 0.5 ? -1 : 1, r() < 0.6 ? -1 : 1], lift = 0.012 + r() * 0.03;   // one corner came unstuck
    for (let k = 0; k < p.count; k++) {
      const u = p.getX(k) / s.w * 2, v = p.getY(k) / s.h * 2;
      let d = 0.003 + 0.004 * (1 - u * u) * (1 - v * v);                             // middle bellies off the glass
      const cu = Math.max(0, u * loose[0]), cv = Math.max(0, v * loose[1]); d += lift * Math.pow(cu * cv, 2);
      if (s.form === 'folded' || s.form === 'broad') d += 0.006 * Math.max(0, 1 - Math.abs(v) * 8);   // fold ridge across the middle
      p.setZ(k, side === 'back' ? d : -d);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: sheetTexture(s, side, i), roughness: 0.95, alphaTest: 0.5, side: THREE.DoubleSide }));
    m.position.set(s.x + dx, s.y, glassZ - 0.012); m.rotation.set(0, side === 'back' ? Math.PI : 0, side === 'back' ? s.rz : -s.rz); parent.add(m);
    // tape on the corners that are still stuck (skip the loose one)
    for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      if (sx === loose[0] && sy === loose[1]) continue; if (s.form === 'clip' && r() < 0.5) continue;
      const t = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.03), tape); t.position.set(sx * s.w / 2 * 0.94, sy * s.h / 2 * 0.94, side === 'back' ? 0.0048 : -0.0048); t.rotation.z = sx * sy * 0.78; m.add(t);
    }
  });
}
