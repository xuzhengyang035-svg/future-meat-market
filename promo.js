// 广告播完以后的那段小动画：像便宜的店内电视广告，低分辨率、扫描线、偶尔串色。
//   培养皿里的细胞一分为二、越分越多 → 长成一整块带脂肪纹的肉 → 摔进烧热的铸铁锅、冒油冒烟 → 切开，粉色的芯
//   → 结尾大字“NO ANIMALS WERE HARMED.”，信号抖一下，后面冒出一行小字“*today”。
// 画在 256 × 144 的小画布上再放大，故意糊一点。
const W = 256, H = 144, LEN = 16;

const rand = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);

export function playPromo(canvas, { onEnd } = {}) {
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  const r = rand(91);
  const cells = Array.from({ length: 1 }, () => ({ x: W / 2, y: H / 2, r: 9, born: 0 }));
  const sparks = [];
  let t0 = performance.now(), raf = 0, stopped = false;

  const font = (px, w = 700, fam = '"Noto Serif SC", Georgia, serif') => `${w} ${px}px ${fam}`;
  const centered = (s, y, px, col = '#fff', w = 700, fam) => { g.font = font(px, w, fam); g.fillStyle = col; g.textAlign = 'center'; g.fillText(s, W / 2, y); g.textAlign = 'left'; };

  function marbled(x, y, w, h, raw, sear = 0) {
    g.save();
    g.beginPath(); g.ellipse(x, y, w, h, -0.08, 0, Math.PI * 2); g.clip();
    const base = g.createRadialGradient(x - w * 0.2, y - h * 0.3, 2, x, y, w * 1.1);
    base.addColorStop(0, raw ? '#d4434a' : '#8a3a24'); base.addColorStop(1, raw ? '#8e1d26' : '#3a1a10');
    g.fillStyle = base; g.fillRect(x - w, y - h, w * 2, h * 2);
    const rr = rand(7); g.strokeStyle = raw ? 'rgba(250,230,220,.75)' : 'rgba(230,190,120,.6)'; g.lineWidth = 1.3;
    for (let i = 0; i < 14; i++) { g.beginPath(); let px = x - w + rr() * w * 2, py = y - h + rr() * h * 2; g.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (rr() - 0.4) * 14; py += (rr() - 0.5) * 8; g.lineTo(px, py); } g.stroke(); }
    if (sear) { g.fillStyle = `rgba(30,12,6,${0.55 * sear})`; for (let i = -3; i <= 3; i++) g.fillRect(x - w, y + i * h * 0.3 - 1.5, w * 2, 3 * sear); }
    g.restore();
  }

  function frame(now) {
    if (stopped) return;
    const t = (now - t0) / 1000;
    if (t > LEN) { stopped = true; onEnd?.(); return; }
    g.fillStyle = '#0d0b0a'; g.fillRect(0, 0, W, H);

    if (t < 4.2) {                                                             // 1 培养皿
      g.fillStyle = '#16211f'; g.beginPath(); g.arc(W / 2, H / 2, 62, 0, 7); g.fill();
      g.strokeStyle = 'rgba(200,230,225,.5)'; g.lineWidth = 2; g.stroke();
      for (const c of [...cells]) if (t - c.born > 0.7 && cells.length < 90) {
        c.born = t; const a = r() * 6.28, d = c.r * 0.9;
        cells.push({ x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d, r: c.r * 0.93, born: t });
        c.x -= Math.cos(a) * d * 0.4; c.y -= Math.sin(a) * d * 0.4;
      }
      for (const c of cells) {
        const dx = c.x - W / 2, dy = c.y - H / 2, dd = Math.hypot(dx, dy); if (dd > 54) { c.x -= dx / dd * (dd - 54); c.y -= dy / dd * (dd - 54); }
        g.fillStyle = '#b8323a'; g.beginPath(); g.arc(c.x, c.y, Math.max(2.5, c.r * 0.55), 0, 7); g.fill();
        g.fillStyle = '#e48a8a'; g.beginPath(); g.arc(c.x - 1, c.y - 1, 1.2, 0, 7); g.fill();
      }
      g.font = font(9, 500, 'monospace'); g.fillStyle = '#9fd8cc'; g.fillText(`DAY ${Math.min(28, Math.floor(t * 6.6) + 1)}`, 12, 18);
    } else if (t < 7.6) {                                                      // 2 长成一块肉
      const k = Math.min(1, (t - 4.2) / 2.4);
      marbled(W / 2, H / 2 + 6, 30 + 62 * k, 18 + 30 * k, true);
      g.font = font(9, 500, 'monospace'); g.fillStyle = '#9fd8cc'; g.fillText('DAY 28', 12, 18);
      centered('GROWN', H - 14, 14, `rgba(255,255,255,${k})`);
    } else if (t < 11.6) {                                                     // 3 下锅
      const k = Math.min(1, (t - 7.6) / 0.35), sear = Math.min(1, (t - 8.2) / 3);
      g.fillStyle = '#1a1a1a'; g.beginPath(); g.ellipse(W / 2, H / 2 + 22, 98, 40, 0, 0, 7); g.fill();
      g.strokeStyle = '#2c2c2c'; g.lineWidth = 6; g.stroke();
      g.fillStyle = '#242424'; g.fillRect(W / 2 + 92, H / 2 + 14, 70, 12);
      marbled(W / 2, H / 2 + 14 - (1 - k) * 70, 64, 26, false, sear);
      if (t > 7.95) for (let i = 0; i < 4; i++) sparks.push({ x: W / 2 + (r() - 0.5) * 130, y: H / 2 + 20, vx: (r() - 0.5) * 60, vy: -40 - r() * 70, life: 0.6 });
      for (const s of sparks) { s.life -= 1 / 60; s.x += s.vx / 60; s.y += s.vy / 60; s.vy += 140 / 60; if (s.life > 0) { g.fillStyle = `rgba(255,${190 + r() * 60},120,${s.life * 1.4})`; g.fillRect(s.x, s.y, 1.5, 1.5); } }
      g.fillStyle = 'rgba(220,220,210,.06)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(W / 2 + Math.sin(t * 2 + i) * 40, H / 2 - 20 - ((t * 30 + i * 20) % 60), 14, 0, 7); g.fill(); }
      centered('SEARED', H - 10, 14, '#fff');
    } else if (t < 13.4) {                                                     // 4 切开
      marbled(W / 2 - 34, H / 2, 46, 26, false, 1);
      g.save(); g.translate(W / 2 + 30, H / 2 + 4); g.rotate(0.12);
      g.fillStyle = '#4a2214'; g.fillRect(-26, -24, 52, 48);
      const pink = g.createLinearGradient(-20, 0, 20, 0); pink.addColorStop(0, '#7a2a1c'); pink.addColorStop(0.2, '#d9707a'); pink.addColorStop(0.8, '#d9707a'); pink.addColorStop(1, '#7a2a1c');
      g.fillStyle = pink; g.fillRect(-22, -20, 44, 40); g.restore();
      centered('GROWN, NOT RAISED.', H - 12, 15, '#fff');
    } else {                                                                   // 5 结尾
      g.fillStyle = '#b3262d'; g.fillRect(0, 0, W, H);
      centered('NO ANIMALS', 58, 22, '#fff'); centered('WERE HARMED.', 84, 22, '#fff');
      g.font = font(7, 600, 'sans-serif'); g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText('FUTURE MEAT MARKET', 12, 16);
      if (t > 14.6) { g.font = font(9, 500, 'monospace'); g.fillStyle = 'rgba(255,255,255,.8)'; g.textAlign = 'right'; g.fillText('*today', W - 14, H - 14); g.textAlign = 'left'; }
    }

    // 便宜电视的毛病：扫描线、颗粒、偶尔整行错位、红蓝串色
    const img = g.getImageData(0, 0, W, H), d = img.data, src = d.slice();
    const glitch = (t > 14.45 && t < 14.7) || r() < 0.015;
    for (let y = 0; y < H; y++) {
      const shift = glitch && r() < 0.25 ? Math.round((r() - 0.5) * 18) : 0, dim = y % 2 ? 0.78 : 1;
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4, sx = Math.min(W - 1, Math.max(0, x + shift)), j = (y * W + sx) * 4, n = (r() - 0.5) * 22;
        d[i] = (src[Math.min(j + 8, d.length - 4)] + n) * dim; d[i + 1] = (src[j + 1] + n) * dim; d[i + 2] = (src[Math.max(j - 8, 0) + 2] + n) * dim;
      }
    }
    g.putImageData(img, 0, 0);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return () => { stopped = true; cancelAnimationFrame(raf); };
}
