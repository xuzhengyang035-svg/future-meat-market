// 冷柜屏幕上每一项“专利技术”背后的技术报告.
// 广告只讲好听的部分;报告里写着广告不会说的东西：细胞取自Donor活检、扩增阶段要用胎牛血清 (FBS）、AcknowledgementsDonor编号.
// 报告本身是思辨设计的虚构文本;文末的References是真实发表的研究.
import { SPECIES } from './data.js';

const REF = {
  stiff: ['Nature Communications (2023): scaffold stiffness shapes cell differentiation', 'https://www.nature.com/articles/s41467-023-44359-9'],
  aroma: ['Nature Communications (2024): flavour-switching scaffolds', 'https://www.nature.com/articles/s41467-024-49521-5'],
  color: ['Biomaterials (2021): meat-like colour and marbling', 'https://www.sciencedirect.com/science/article/abs/pii/S0142961221004634'],
  yield: ['Communications Biology (2022): about 3× and 4× cell mass after 28 days', 'https://www.nature.com/articles/s42003-022-03423-8'],
};

export const PAPERS = {
  scaffold: {
    no: 'FM-TR-2026-017', species: 'beef',
    title: 'Effect of tunable-stiffness edible scaffolds on the tenderness of cultivated beef muscle',
    en: 'Tunable-stiffness edible scaffolds modulate the tenderness of cultivated bovine muscle tissue',
    kw: ['Cultivated meat', 'Scaffold', 'Tissue engineering', 'Tenderness', 'Shear force'],
    abstract: 'Tenderness is one of the textures consumers care about most. We grew bovine muscle satellite cells on edible scaffolds of three stiffnesses (2, 8, 25 kPa) and compared differentiation and shear force. Stiffness correlated with shear force, giving a stable switch between "tender" and "firm" for personalised orders.',
    method: 'Scaffolds were made of soy protein and alginate, with stiffness set by crosslink density. Cells were seeded at 1×10⁶ /cm², expanded for 10 days, then moved to differentiation medium for 14 days. Tenderness was measured by Warner-Bratzler shear force.',
    fig: { type: 'bar', title: 'Fig. 1  Scaffold stiffness vs. shear force of the product', y: 'Shear force (N)', bars: [['2 kPa', 18], ['8 kPa', 31], ['25 kPa', 46]] },
    result: 'The 2 kPa scaffold had the lowest shear force (18 N), matching "tender"; the 25 kPa group reached 46 N, matching "firm". Cell viability was above 94% in all three groups.',
    discuss: 'Tuning stiffness does not change the cell line itself, so one line can cover several textures and keep cell-bank costs down.',
    refs: [REF.stiff],
  },
  aroma: {
    no: 'FM-TR-2026-021', species: 'beef',
    title: 'Heat-triggered flavour precursors in cultivated steak',
    en: 'Thermo-responsive flavor precursors for on-demand roast aroma in cultivated steak',
    kw: ['Flavour', 'Maillard reaction', 'Controlled release', 'Sensory panel'],
    abstract: 'Cultivated meat lacks the roasted aroma of conventional meat. We embedded flavour precursors in a heat-sensitive carrier inside the tissue so they release only above 150 °C. In sensory tests the "enhanced roast" group scored 38% higher for aroma than the control.',
    method: 'Flavour precursors (sulphur compounds and reducing sugars) were embedded in a lipid carrier melting at 150 °C and added on day 10 of differentiation. Products were seared at 120–200 °C and volatiles measured by GC-MS.',
    fig: { type: 'line', title: 'Fig. 1  Searing temperature vs. aroma release', y: 'Relative release', x: ['120', '140', '150', '170', '200 ℃'], lines: [[0.05, 0.08, 0.35, 0.82, 1.0], [0.04, 0.06, 0.1, 0.22, 0.31]], legend: ['Enhanced', 'Control'] },
    result: 'Almost nothing is released below 150 °C, so no odour in cold storage or transport; above 170 °C the release rises fast.',
    discuss: '"The aroma only appears the moment it hits the pan" works as a key selling point.',
    refs: [REF.aroma],
  },
  myotone: {
    no: 'FM-TR-2026-024', species: 'beef',
    title: 'Tuning myoglobin expression to customise the colour of cultivated beef',
    en: 'Tuning myoglobin expression for customizable color in cultivated beef',
    kw: ['Myoglobin', 'Colour', 'a* value', 'Consumer preference'],
    abstract: 'Colour is the first thing consumers use to judge freshness. By regulating myoglobin expression in the cultured cells, product redness (a* value) can be set between 9 and 24, matching the "light" and "deep" grades.',
    method: 'Haem precursor and iron levels in the medium were adjusted during differentiation; L*, a*, b* were measured with a colorimeter on day 14.',
    fig: { type: 'bar', title: 'Fig. 1  Myoglobin expression vs. redness a*', y: 'a* value', bars: [['Low', 9], ['Mid', 16], ['High', 24]] },
    result: 'The high-expression group reached a* 24, close to conventional steak; of 400 respondents, 71% thought "deep" looked fresher.',
    discuss: 'Colour can be tuned to market preference and has nothing to do with actual nutrition.',
    refs: [REF.color],
  },
  fatblend: {
    no: 'FM-TR-2026-009', species: null,
    title: 'Effect of muscle-to-fat cell co-culture ratio on the fat content of cultivated meat',
    en: 'Myocyte–adipocyte co-culture ratio determines fat content in cultivated meat',
    kw: ['Co-culture', 'Adipocytes', 'Marbling', 'Custom'],
    abstract: 'Muscle and fat cells were co-cultured at ratios from 9:1 to 6:4; fat content in the product could be set linearly between 3% and 21%, matching the "lean", "medium" and "rich" grades.',
    method: 'Preadipocytes and muscle satellite cells were expanded separately and seeded at set ratios; fat content was measured by Oil Red O staining and Soxhlet extraction.',
    fig: { type: 'bar', title: 'Fig. 1  Adipocyte ratio vs. fat content of the product', y: 'Fat content (%)', bars: [['10%', 3], ['25%', 11], ['40%', 21]] },
    result: 'Fat content tracks the adipocyte ratio almost linearly (R² = 0.97).',
    discuss: 'The same process works for the chicken and pork lines.',
    refs: [],
  },
  shapefab: {
    no: 'FM-TR-2026-012', species: 'fish',
    title: 'Printing yellow croaker muscle tissue from cell ink',
    en: 'Bioprinting of cultivated large yellow croaker muscle with cell-laden inks',
    kw: ['Bioprinting', 'Fish', 'Sarcomere', 'Forming'],
    abstract: 'We made cell ink from yellow croaker muscle cells and printed two forms, "fillet" and "steak", copying the layered structure of natural muscle. The result is boneless and uniform, suited to standardised retail.',
    method: 'The cell ink contains gelatin and transglutaminase; nozzle 0.4 mm, printed layer by layer then cultured at 18 °C for 10 days.',
    fig: { type: 'bar', title: 'Fig. 1  Print fidelity of the two forms', y: 'Fidelity (%)', bars: [['Fish fillet', 92], ['Fish steak', 87]] },
    result: 'Both forms kept above 85% fidelity, and held their structure after steaming.',
    discuss: 'Form can follow the channel, e.g. steaks printed to one size for restaurant clients.',
    refs: [],
  },
  yield: {
    no: 'FM-TR-2026-003', species: null,
    title: 'Effect of high-yield media on 28-day cell expansion',
    en: 'High-yield media formulations increase 28-day cell expansion',
    kw: ['Medium', 'Expansion', 'Cost', 'Scale-up'],
    abstract: 'Culture medium is the main cost of cultivated meat. We compared the standard formula with two high-yield formulas (A, B): after 28 days cell mass reached 3× and 4× the standard, cutting unit cost by 18%–26%.',
    method: 'Glucose, glutamine and growth factors were raised above the standard formula; medium was changed every 48 h, and cells were counted and viability tested.',
    fig: { type: 'line', title: 'Fig. 1  Cell mass at 28 days for three formulas (relative)', y: 'Cell mass', x: ['0', '7', '14', '21', '28 days'], lines: [[0.05, 0.12, 0.3, 0.6, 1.0], [0.05, 0.2, 0.6, 1.5, 3.0], [0.05, 0.25, 0.8, 2.0, 4.0]], legend: ['Standard', 'Formula A', 'Formula B'] },
    result: 'Formula B grows fastest, but after day 21 its viability is about 3 points below the standard formula.',
    discuss: 'For consumers, the high-yield formula can be packaged as the "better value" option.',
    refs: [REF.yield],
  },
};

function figure(f) {
  const W = 440, H = 190, L = 48, B = 34, T = 14;
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="pfig">`;
  svg += `<line x1="${L}" y1="${T}" x2="${L}" y2="${H - B}"/><line x1="${L}" y1="${H - B}" x2="${W - 10}" y2="${H - B}"/>`;
  svg += `<text x="6" y="${T + 4}" class="ax">${f.y}</text>`;
  if (f.type === 'bar') {
    const max = Math.max(...f.bars.map((b) => b[1])) * 1.15, n = f.bars.length, w = (W - L - 30) / n;
    f.bars.forEach(([lab, v], i) => {
      const h = (v / max) * (H - B - T), x = L + 15 + i * w + w * 0.2;
      svg += `<rect x="${x}" y="${H - B - h}" width="${w * 0.6}" height="${h}"/><text x="${x + w * 0.3}" y="${H - B - h - 5}" class="v">${v}</text><text x="${x + w * 0.3}" y="${H - B + 16}" class="xl">${lab}</text>`;
    });
  } else {
    const max = Math.max(...f.lines.flat()) * 1.1, n = f.x.length, step = (W - L - 30) / (n - 1);
    f.x.forEach((lab, i) => { svg += `<text x="${L + 10 + i * step}" y="${H - B + 16}" class="xl">${lab}</text>`; });
    f.lines.forEach((ln, k) => {
      const pts = ln.map((v, i) => `${L + 10 + i * step},${H - B - (v / max) * (H - B - T)}`).join(' ');
      svg += `<polyline points="${pts}" class="l${k}"/>`;
      svg += `<text x="${W - 90}" y="${T + 10 + k * 15}" class="lg l${k}">— ${f.legend[k]}</text>`;
    });
  }
  return svg + `</svg><div class="pcap">${f.title}</div>`;
}

export function paperHTML(key, species) {
  const p = PAPERS[key];
  const sp = SPECIES[p.species || species] || SPECIES.beef;
  const id = sp.id;
  return `
    <div class="phead"><span>Future Meat Technical Report</span><span>${p.no}</span></div>
    <h1>${p.title}</h1>
    <p class="pen">${p.en}</p>
    <p class="pauth">Future Meat R&D Centre · Tissue Engineering & Flavour Lab<br><small>Corresponding author: rd@futuremeat.example · received 2026-03-02 · internal release 2026-05-18</small></p>
    <div class="pabs"><b>Abstract</b>${p.abstract}<p class="pkw"><b>Keywords</b>${p.kw.join(';')}</p></div>
    <div class="pcols">
      <h3>1  Introduction</h3>
      <p>As demand for "zero-slaughter" protein grows, personalisation becomes key to how cultivated-meat brands compete. This report describes the technique applied to cell line ${id} (${sp.title}).</p>
      <h3>2  Materials and methods</h3>
      <p><b>2.1 Cell source</b> Primary muscle satellite cells were isolated from muscle biopsies of donor animals and purified to build master and working cell banks (cell line ${id}). Donor breed, collection method, number of collections and donor status are in supplement S1<span class="redline">(not published)</span>.</p>
      <p><b>2.2 Medium</b> Expansion used DMEM/F12 base medium with <mark>10% fetal bovine serum (FBS)</mark>, bFGF 5 ng/mL and 1% penicillin-streptomycin; serum was cut to 2% for differentiation.</p>
      <p><b>2.3 Design</b> ${p.method}</p>
      <h3>3  Results</h3>
      ${figure(p.fig)}
      <p>${p.result}</p>
      <h3>4  Discussion</h3>
      <p>${p.discuss}Serum-free formulas currently cost about 3–5× serum-based ones, so commercial batches still use serum.</p>
      <h3>Acknowledgements</h3>
      <p>We thank donor ${id} for its contribution to this study.</p>
      <h3>References</h3>
      <ol class="prefs">${p.refs.length ? p.refs.map(([t, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${t}</a></li>`).join('') : '<li>Internal document, not public.</li>'}</ol>
    </div>
    <p class="pnote">This report is fictional text within a speculative design; the references are real published studies for further reading.</p>`;
}
