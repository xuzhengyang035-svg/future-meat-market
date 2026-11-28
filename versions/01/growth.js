// 生长模型：一份Order = 一个培养批次.
// Cell density按 logistic 曲线增长：前期指数增长，后期逼近上限、增长放缓.
// 演示中 3 秒 = 1 days.数值是示意，不是真实工艺参数.
import { GROWTH, SPECIES } from './data.js';

export const SEC_PER_DAY = 3;
const N0 = 3e5;                     // 接种密度 cells/mL
const PASSAGE = { chicken: 41, beef: 37, pork: 52, fish: 29 };
const SINCE = { chicken: '2022-02-21', beef: '2023-04-17', pork: '2021-09-30', fish: '2024-11-08' };

export function makeBatch(order) {
  const demo = !order;
  const species = order ? order.species : 'beef';
  return {
    demo, species,
    no: order ? order.no : 'DEMO-0001',
    reactor: 'BR-02',
    cycle: order ? order.opts.cycle : 21,
    x: order ? GROWTH.plan[order.opts.plan].x : 1,
    qty: order ? order.opts.qty : 1,
    day: demo ? 5 : 0,              // 日历days数
    tau: demo ? 5 : 0,              // 生物进度 (加速包会让它跑得比日历快）
    boost: 1,
    name: '',
    passage: PASSAGE[species],
    since: SINCE[species],
    cell: SPECIES[species].id,
  };
}

export function stepBatch(b, dt) {
  const done = b.tau >= b.cycle;
  if (done && b.demo) { b.tau = 0; b.day = 0; return; }
  if (done) return;
  const d = dt / SEC_PER_DAY;
  b.day += d;
  b.tau = Math.min(b.cycle, b.tau + d * b.boost);
}

const K = (b) => 1.2e7 * b.x;
const R = (b) => Math.log((K(b) / N0 - 1) / (1 / 0.97 - 1)) / b.cycle; // 第 cycle days达到上限的 97%
export const fracAt = (b, tau) => 1 / (1 + (K(b) / N0 - 1) * Math.exp(-R(b) * tau));

export function readout(b, t) {
  const f = fracAt(b, b.tau);       // N / K
  const N = f * K(b);
  const muDay = R(b) * b.boost * (1 - f);
  const muH = muDay / 24;
  const peak = R(b) * b.boost / 24;
  const feed = (b.day / 2) % 1;     // 每 2 days补一次培养基
  const acid = feed * Math.min(1, f * 1.6);
  const p = b.tau / b.cycle;
  const done = p >= 1;
  const status = done ? 'Ready for sale · awaiting harvest'
    : p < 0.12 ? 'Seeding · lag phase'
    : (1 - f) > 0.45 ? 'Exponential growth'
    : 'Growth slowing · near plateau';
  return {
    f, N, p, done, status,
    day: Math.floor(b.day),
    muH,
    drop: Math.round((1 - muH / peak) * 100),
    doubling: muH > 1e-5 ? Math.log(2) / muH : Infinity,
    viability: 98.6 - 2.2 * p ** 3 - (b.boost > 1 ? 1.4 : 0) + Math.sin(t * 0.9) * 0.08,
    temp: 37 + Math.sin(t * 0.7) * 0.04,
    ph: 7.26 - 0.2 * acid + Math.sin(t * 0.5) * 0.01,
    oxygen: 42 - 9 * f + Math.sin(t * 0.37) * 2,
    glucose: Math.max(0.6, 4.5 - 3.2 * feed * (0.35 + f)),
    lactate: 0.3 + 1.9 * acid,
    acid,
    grams: Math.round(b.qty * 260 * f),
    eta: done ? 0 : Math.max(0, Math.ceil((b.cycle - b.tau) / b.boost)),
  };
}

// 生长曲线 (0..cycle 的 N/K）
export function curve(b, n = 64) {
  return Array.from({ length: n + 1 }, (_, i) => fracAt(b, (i / n) * b.cycle));
}

export const sci = (n) => {
  const e = Math.floor(Math.log10(n));
  return `${(n / 10 ** e).toFixed(2)} × 10${String(e).split('').map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('')}`;
};
