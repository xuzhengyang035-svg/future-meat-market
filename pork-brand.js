import { ageCanvas } from './materials.js';
import { canvasTexture } from './textures.js';

const CREAM = '#f0e3c5';
const RED = '#8e302d';
const GREEN = '#203a31';
const DISPLAY = '"Bodoni Moda", Didot, Georgia, serif';
const BOOK = '"Cormorant Garamond", Georgia, serif';
const DETAILS = 'Jost, Arial, sans-serif';

function wordmark(g, x, y, height, ink, accent = ink) {
  g.save();
  g.translate(x, y);
  g.scale(height / 100, height / 100);
  g.fillStyle = accent;
  g.beginPath();
  g.roundRect(0, 2, 124, 96, 38);
  g.fill();
  g.globalCompositeOperation = 'source-over';
  g.strokeStyle = CREAM;
  g.lineWidth = 10;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(23, 35); g.lineTo(42, 50); g.lineTo(23, 65);
  g.moveTo(68, 65); g.lineTo(92, 65);
  g.stroke();
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
