// The technical report behind each "patented technology" on the fridge screen.
// 广告只讲好听的部分；报告里写着广告不会说的东西：细胞取自供体活检、扩增阶段要用胎牛血清（FBS）、致谢供体编号。
// 报告本身是思辨设计的虚构文本；文末的参考文献是真实发表的研究。
import { SPECIES } from './data.js';

const REF = {
  stiff: ['Nature Communications (2023): scaffold stiffness steers cell differentiation', 'https://www.nature.com/articles/s41467-023-44359-9'],
  aroma: ['Nature Communications (2024): flavour-switchable scaffolds', 'https://www.nature.com/articles/s41467-024-49521-5'],
  color: ['Biomaterials (2021): meat-like colour and red-white texture', 'https://www.sciencedirect.com/science/article/abs/pii/S0142961221004634'],
  yield: ['Communications Biology (2022): about 3× and 4× the cells after 28 days', 'https://www.nature.com/articles/s42003-022-03423-8'],
};

export const PAPERS = {
  scaffold: {
    no: 'FM-TR-2026-017', species: 'beef',
    title: 'Tunable-stiffness edible scaffolds modulate the tenderness of cultivated bovine muscle tissue',
    kw: ['cultivated meat', 'scaffold', 'tissue engineering', 'tenderness', 'shear force'],
    abstract: 'Tenderness is one of the texture traits consumers care about most. We grew bovine satellite cells on edible scaffolds of three stiffnesses (2, 8 and 25 kPa) and compared differentiation and the shear force of the finished product. Stiffness correlated with shear force, giving a stable switch between a "tender" and a "firm" texture for made-to-order products.',
    method: 'Scaffolds were soy protein and alginate, with stiffness set by crosslink density. Cells were seeded at 1×10⁶ /cm², expanded for 10 days, then moved to differentiation medium for 14 days. Tenderness was measured by Warner-Bratzler shear force.',
    fig: { type: 'bar', title: 'Fig. 1  Scaffold stiffness and shear force of the product', y: 'Shear (N)', bars: [['2 kPa', 18], ['8 kPa', 31], ['25 kPa', 46]] },
    result: 'The 2 kPa group had the lowest shear force (18 N), matching the "tender" grade; the 25 kPa group reached 46 N, matching "firm". Cell viability stayed above 94 % in all groups.',
    discuss: 'Changing stiffness does not change the cell line, so one line covers several textures and keeps cell-bank upkeep down.',
    refs: [REF.stiff],
  },
  aroma: {
    no: 'FM-TR-2026-021', species: 'beef',
    title: 'Thermo-responsive flavour precursors for on-demand roast aroma in cultivated steak',
    kw: ['flavour', 'Maillard reaction', 'heat-triggered release', 'sensory panel'],
    abstract: 'Cultivated meat lacks the roast aroma of conventional meat. We embedded flavour precursors in a heat-sensitive carrier inside the tissue so that they release only above 150 °C. In sensory tests the "extra roast" group scored 38 % higher on aroma than the control.',
    method: 'Precursors (sulphur compounds and reducing sugars) were encapsulated in a lipid carrier melting at 150 °C and added on day 10 of differentiation. Products were seared at 120–200 °C and volatiles measured by GC-MS.',
    fig: { type: 'line', title: 'Fig. 1  Searing temperature and aroma release', y: 'Release', x: ['120', '140', '150', '170', '200 °C'], lines: [[0.05, 0.08, 0.35, 0.82, 1.0], [0.04, 0.06, 0.1, 0.22, 0.31]], legend: ['enhanced', 'control'] },
    result: 'Almost nothing is released below 150 °C, so no off-odours form in storage or transport; above 170 °C release rises sharply.',
    discuss: '"The aroma appears the moment it hits the pan" is a strong marketing point.',
    refs: [REF.aroma],
  },
  myotone: {
    no: 'FM-TR-2026-024', species: 'beef',
    title: 'Tuning myoglobin expression for customisable colour in cultivated beef',
    kw: ['myoglobin', 'colour', 'a* value', 'consumer preference'],
    abstract: 'Colour is the first cue consumers use to judge freshness. By regulating myoglobin expression in cultured cells we set the redness (a*) of the product anywhere from 9 to 24, offered as a "light" and a "deep" grade.',
    method: 'Haem precursor and iron in the medium were adjusted during differentiation; L*, a* and b* were measured by colorimeter on day 14.',
    fig: { type: 'bar', title: 'Fig. 1  Myoglobin expression and redness a*', y: 'a*', bars: [['low', 9], ['mid', 16], ['high', 24]] },
    result: 'The high-expression group reached a* 24, close to a conventional steak; of 400 respondents, 71 % judged the "deep" grade fresher.',
    discuss: 'Colour can follow market preference and has nothing to do with actual nutrition.',
    refs: [REF.color],
  },
  fatblend: {
    no: 'FM-TR-2026-009', species: null,
    title: 'Myocyte–adipocyte co-culture ratio determines fat content in cultivated meat',
    kw: ['co-culture', 'adipocytes', 'marbling', 'personalisation'],
    abstract: 'Myocytes and adipocytes were co-cultured at ratios from 9:1 to 6:4. Fat content of the product varied linearly from 3 % to 21 %, offered as "lean", "medium" and "rich".',
    method: 'Pre-adipocytes and satellite cells were expanded separately, then mixed and seeded in set ratios. Fat was measured by Oil Red O staining and Soxhlet extraction.',
    fig: { type: 'bar', title: 'Fig. 1  Adipocyte share and fat content of the product', y: 'Fat (%)', bars: [['10%', 3], ['25%', 11], ['40%', 21]] },
    result: 'Fat content tracked adipocyte share closely (R² = 0.97).',
    discuss: 'The same process serves the chicken and pork lines.',
    refs: [],
  },
  shapefab: {
    no: 'FM-TR-2026-012', species: 'fish',
    title: 'Bioprinting cultivated large yellow croaker muscle with cell-laden inks',
    kw: ['bioprinting', 'fish', 'myomere', 'shaping'],
    abstract: 'Yellow croaker muscle cells were made into a cell ink and printed as a "fillet" and a "steak", copying the layered structure of natural myomeres. The products have no bones and a consistent shape, suited to standard retail.',
    method: 'The ink contained gelatin and transglutaminase; nozzle 0.4 mm; printed layer by layer, then grown at 18 °C for 10 days.',
    fig: { type: 'bar', title: 'Fig. 1  Print fidelity of the two cuts', y: 'Fidelity (%)', bars: [['fillet', 92], ['steak', 87]] },
    result: 'Both cuts printed above 85 % fidelity and kept their structure after steaming.',
    discuss: 'Shape can follow the sales channel, e.g. uniform steaks for restaurant customers.',
    refs: [],
  },
  yield: {
    no: 'FM-TR-2026-003', species: null,
    title: 'High-yield media formulations increase 28-day cell expansion',
    kw: ['medium', 'expansion', 'cost', 'scale-up'],
    abstract: 'Growth medium is the main cost of cultivated meat. We compared the standard recipe with two high-yield recipes (A and B): after 28 days they gave 3× and 4× the cells of the standard, cutting unit cost by 18–26 %.',
    method: 'Glucose, glutamine and growth factors were raised over the standard recipe; medium changed every 48 h; cells counted and viability measured.',
    fig: { type: 'line', title: 'Fig. 1  Cell mass over 28 days, three recipes (relative)', y: 'Cells', x: ['0', '7', '14', '21', '28 d'], lines: [[0.05, 0.12, 0.3, 0.6, 1.0], [0.05, 0.2, 0.6, 1.5, 3.0], [0.05, 0.25, 0.8, 2.0, 4.0]], legend: ['standard', 'recipe A', 'recipe B'] },
    result: 'Recipe B grew fastest, but after day 21 its viability ran about 3 points below the standard.',
    discuss: 'For consumers, the high-yield recipes can be presented as the "better value" option.',
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
    <p class="pauth">Future Meat R&amp;D Centre · Tissue Engineering and Flavour Lab<br><small>Correspondence: rd@futuremeat.example · received 2026-03-02 · internal release 2026-05-18</small></p>
    <div class="pabs"><b>Abstract</b>${p.abstract}<p class="pkw"><b>Keywords</b>${p.kw.join('; ')}</p></div>
    <div class="pcols">
      <h3>1  Introduction</h3>
      <p>As demand grows for "slaughter-free" protein, made-to-order products are how cultivated-meat brands set themselves apart. This report describes the technique as applied to cell line ${id} (${sp.title}).</p>
      <h3>2  Materials and methods</h3>
      <p><b>2.1 Cell source</b>  Primary satellite cells were isolated from muscle biopsies of a donor animal, purified, and banked as a master and working cell bank (cell line ${id}). Donor breed, collection method, number of collections and current status of the donor are given in Supplement S1<span class="redline"> (not published)</span>.</p>
      <p><b>2.2 Medium</b>  Expansion used DMEM/F12 with <mark>10 % foetal bovine serum (FBS)</mark>, bFGF 5 ng/mL and 1 % penicillin-streptomycin; serum was lowered to 2 % for differentiation.</p>
      <p><b>2.3 Design</b>  ${p.method}</p>
      <h3>3  Results</h3>
      ${figure(p.fig)}
      <p>${p.result}</p>
      <h3>4  Discussion</h3>
      <p>${p.discuss} Serum-free media currently cost 3–5× as much as serum-based ones, so commercial batches still mostly use serum.</p>
      <h3>Acknowledgements</h3>
      <p>We thank donor ${id} for its contribution to this work.</p>
      <h3>References</h3>
      <ol class="prefs">${p.refs.length ? p.refs.map(([t, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${t}</a></li>`).join('') : '<li>Internal data, not published.</li>'}</ol>
    </div>
    <p class="pnote">This report is fiction, part of a speculative design project; the references listed are real published research.</p>`;
}
