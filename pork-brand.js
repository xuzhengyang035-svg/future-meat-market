import { ageCanvas } from './materials.js';
import { canvasTexture } from './textures.js';

const CREAM = '#f0e3c5';
const RED = '#8e302d';
const GREEN = '#203a31';
const DISPLAY = '"Bodoni Moda", Didot, Georgia, serif';
const BOOK = '"Cormorant Garamond", Georgia, serif';
const DETAILS = 'Jost, Arial, sans-serif';

const PIG_FACE = new Path2D('M-79 -21 L-79 -70 Q-55 -72 -31 -48 Q0 -57 31 -48 Q55 -72 79 -70 L79 -21 Q91 -7 91 15 Q91 62 0 68 Q-91 62 -91 15 Q-91 -7 -79 -21Z');
const PIG_EARS = new Path2D('M-65 -56 Q-51 -55 -43 -46 M65 -56 Q51 -55 43 -46');
const PROMPT = new Path2D('M-29 18 L-15 27 L-29 36 M7 35 H28');

function pigMark(g, ink, background) {
  g.save();
  g.translate(62, 50);
  g.scale(0.66, 0.66);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.strokeStyle = ink;
  g.lineWidth = 7;
  g.stroke(PIG_FACE);
  g.lineWidth = 5;
  g.stroke(PIG_EARS);
  g.fillStyle = ink;
  for (const x of [-34, 34]) {
    g.beginPath();
    g.arc(x, -11, 5.5, 0, Math.PI * 2);
    g.fill();
  }
  g.beginPath();
  g.ellipse(0, 27, 48, 25, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = background;
  g.lineWidth = 6;
  g.stroke(PROMPT);
  g.restore();
}

function wordmark(g, x, y, height, ink, accent = ink, background = CREAM) {
  g.save();
  g.translate(x, y);
  g.scale(height / 100, height / 100);
  pigMark(g, accent, background);
  g.fillStyle = ink;
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.font = '700 104px ' + DISPLAY;
  const nameWidth = Math.min(g.measureText('PORK').width, 330);
  g.fillText('PORK', 151, 55, nameWidth);
  const next = 151 + nameWidth + 8;
  g.fillStyle = accent;
  g.font = 'italic 700 84px ' + BOOK;
  g.fillText('.exe', next, 59, 165);
  g.restore();
}

export function porkBrandTexture(format, product, price) {
  if (format === 'counter-guide') return canvasTexture(1920, 128, (g, W, H) => {
    g.fillStyle = GREEN;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = CREAM;
    g.lineWidth = 2;
    g.strokeRect(8, 8, W - 16, H - 16);
    g.fillStyle = RED;
    g.fillRect(9, 9, 601, H - 18);
    g.fillStyle = CREAM;
    g.fillRect(610, 18, 2, H - 36);
    g.fillRect(1274, 18, 2, H - 36);
    wordmark(g, 677, 22, 83, CREAM, CREAM, GREEN);

    g.beginPath();
    g.moveTo(115, 63); g.lineTo(46, 63);
    g.moveTo(68, 41); g.lineTo(46, 63); g.lineTo(68, 85);
    g.lineWidth = 7;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.stroke();

    g.font = '700 45px ' + DISPLAY;
    g.fillText('CUSTOM ORDERS', 141, 59, 430);
    g.fillText('READY TO BUY', 1330, 59, 540);
    g.font = '600 27px ' + DETAILS;
    g.fillText('ORDER AT THE LEFT COUNTER', 142, 98, 430);
    g.fillText('PICK A PACK FROM THE DISPLAY CASE', 1332, 98, 530);
    ageCanvas(g, W, H, { amount: 0.22, seed: 72, drips: false });
  });

  if (format === 'wall') return canvasTexture(960, 480, (g, W, H) => {
    g.fillStyle = GREEN;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = CREAM;
    g.lineWidth = 3;
    g.strokeRect(16, 16, W - 32, H - 32);
    wordmark(g, 64, 63, 123, CREAM, CREAM, GREEN);
    g.fillStyle = CREAM;
    g.fillRect(64, 215, W - 128, 2);
    g.font = '700 89px ' + DISPLAY;
    g.fillText(product, 64, 334, W - 128);
    g.font = '600 33px ' + DETAILS;
    g.fillText(price, 67, 405, W - 134);
    ageCanvas(g, W, H, { amount: 0.48, seed: 82, drips: false });
  });

  if (format === 'fascia') return canvasTexture(1200, 160, (g, W, H) => {
    g.fillStyle = CREAM;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = GREEN;
    g.lineWidth = 5;
    g.strokeRect(12, 12, W - 24, H - 24);
    wordmark(g, 36, 23, 114, GREEN, RED);
    g.fillStyle = RED;
    g.fillRect(828, 38, 3, 84);
    g.font = '600 32px ' + DETAILS;
    g.fillText('CULTIVATED', 868, 73);
    g.fillText('BUTCHER & DELI', 868, 110);
    ageCanvas(g, W, H, { amount: 0.45, seed: 52, drips: false });
  });

  if (format === 'poster') return canvasTexture(480, 620, (g, W, H) => {
    g.fillStyle = RED;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = CREAM;
    g.lineWidth = 2;
    g.strokeRect(16, 16, W - 32, H - 32);
    g.fillStyle = CREAM;
    g.fillRect(30, 32, W - 60, 100);
    wordmark(g, 48, 57, 50, GREEN, RED);
    g.textAlign = 'center';
    g.font = '600 26px ' + DETAILS;
    g.fillText('CULTIVATED PORK', W / 2, 200);
    g.font = 'italic 700 76px ' + BOOK;
    g.fillText('Pick your fat.', W / 2, 292, W - 90);
    g.fillStyle = CREAM;
    g.fillRect(56, 344, W - 112, 2);
    g.font = '600 25px ' + DETAILS;
    g.fillText('PORK CHOP · 200 g', W / 2, 405);
    g.font = '700 62px ' + DISPLAY;
    g.fillText('¥98', W / 2, 483);
    g.font = '600 20px ' + DETAILS;
    g.fillText('ORDER AT THE COUNTER', W / 2, 554);
    ageCanvas(g, W, H, { amount: 0.5, seed: 62, drips: false });
  });

  return canvasTexture(480, 240, (g, W, H) => {
    g.fillStyle = CREAM;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = RED;
    g.lineWidth = 4;
    g.strokeRect(8, 8, W - 16, H - 16);
    wordmark(g, 24, 22, 49, GREEN, RED);
    g.fillStyle = GREEN;
    g.font = '700 62px ' + BOOK;
    g.fillText(product, 24, 145, W - 48);
    g.fillStyle = RED;
    g.font = '600 33px ' + DETAILS;
    g.fillText(price, 24, 199, W - 48);
  });
}

export function drawPorkWordmark(g, x, y, height) {
  wordmark(g, x, y, height, GREEN, RED);
}
