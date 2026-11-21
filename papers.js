// 冷柜屏幕上每一项“专利技术”背后的技术报告。
// 广告只讲好听的部分；报告里写着广告不会说的东西：细胞取自供体活检、扩增阶段要用胎牛血清（FBS）、致谢供体编号。
// 报告本身是思辨设计的虚构文本；文末的参考文献是真实发表的研究。
import { SPECIES } from './data.js';

const REF = {
  stiff: ['Nature Communications (2023)：支架硬度影响细胞分化', 'https://www.nature.com/articles/s41467-023-44359-9'],
  aroma: ['Nature Communications (2024)：风味可切换支架', 'https://www.nature.com/articles/s41467-024-49521-5'],
  color: ['Biomaterials (2021)：类肉色泽与红白纹理', 'https://www.sciencedirect.com/science/article/abs/pii/S0142961221004634'],
  yield: ['Communications Biology (2022)：28 天后细胞量约 3 倍与 4 倍', 'https://www.nature.com/articles/s42003-022-03423-8'],
};

export const PAPERS = {
  scaffold: {
    no: 'FM-TR-2026-017', species: 'beef',
    title: '可调刚度可食用支架对培养牛肌肉组织嫩度的影响',
    en: 'Tunable-stiffness edible scaffolds modulate the tenderness of cultivated bovine muscle tissue',
    kw: ['培养肉', '支架', '组织工程', '嫩度', '剪切力'],
    abstract: '肉的嫩度是消费者最在意的口感指标之一。本研究在三种刚度（2、8、25 kPa）的可食用支架上培养牛肌卫星细胞，比较其分化程度与成品剪切力。结果显示支架刚度与剪切力呈正相关，可在“柔嫩”与“紧实”两种口感之间稳定切换，满足个性化定制需求。',
    method: '支架以大豆蛋白与海藻酸盐为基材，通过交联密度调节刚度。细胞接种密度 1×10⁶ /cm²，扩增 10 天后转入分化培养基培养 14 天。成品以 Warner-Bratzler 剪切力法测定嫩度。',
    fig: { type: 'bar', title: '图 1　支架刚度与成品剪切力', y: '剪切力 (N)', bars: [['2 kPa', 18], ['8 kPa', 31], ['25 kPa', 46]] },
    result: '2 kPa 支架组剪切力最低（18 N），对应“柔嫩”档；25 kPa 组为 46 N，对应“紧实”档。三组细胞存活率均高于 94%。',
    discuss: '刚度调节不改变细胞系本身，同一细胞系即可覆盖不同口感，有利于降低细胞库维护成本。',
    refs: [REF.stiff],
  },
  aroma: {
    no: 'FM-TR-2026-021', species: 'beef',
    title: '温控释放型风味前体在培养牛排中的应用',
    en: 'Thermo-responsive flavor precursors for on-demand roast aroma in cultivated steak',
    kw: ['风味', '美拉德反应', '温控释放', '感官评价'],
    abstract: '培养肉缺少传统肉类的烤肉香气。本研究将风味前体包埋于温敏载体中并预埋入组织，使其仅在 150 ℃ 以上释放。感官评价显示，“烤肉香增强”组的香气评分较对照组提高 38%。',
    method: '风味前体（含硫化合物与还原糖）包埋于熔点 150 ℃ 的脂质载体，在分化第 10 天加入。成品于 120–200 ℃ 下煎制，用气相色谱-质谱测定挥发性物质。',
    fig: { type: 'line', title: '图 1　煎制温度与香气物质释放量', y: '相对释放量', x: ['120', '140', '150', '170', '200 ℃'], lines: [[0.05, 0.08, 0.35, 0.82, 1.0], [0.04, 0.06, 0.1, 0.22, 0.31]], legend: ['增强组', '对照组'] },
    result: '150 ℃ 以下几乎无释放，冷藏与运输中不会产生异味；170 ℃ 以上释放量迅速上升。',
    discuss: '“下锅的那一刻才出现香气”可作为重要的营销卖点。',
    refs: [REF.aroma],
  },
  myotone: {
    no: 'FM-TR-2026-024', species: 'beef',
    title: '肌红蛋白表达调控与培养牛肉的色泽定制',
    en: 'Tuning myoglobin expression for customizable color in cultivated beef',
    kw: ['肌红蛋白', '色泽', 'a* 值', '消费者偏好'],
    abstract: '颜色是消费者判断肉品新鲜度的首要依据。本研究通过调控培养细胞中肌红蛋白的表达水平，使成品红度（a* 值）在 9–24 之间可调，对应“浅”“深”两档颜色。',
    method: '在分化阶段调节培养基中血红素前体与铁的浓度，第 14 天采用色差仪测定 L*、a*、b* 值。',
    fig: { type: 'bar', title: '图 1　肌红蛋白表达水平与红度 a*', y: 'a* 值', bars: [['低', 9], ['中', 16], ['高', 24]] },
    result: '高表达组 a* 达 24，接近传统牛排；在 400 名受访者中，71% 认为“深色”更新鲜。',
    discuss: '色泽可以按市场偏好调整，与实际营养成分无关。',
    refs: [REF.color],
  },
  fatblend: {
    no: 'FM-TR-2026-009', species: null,
    title: '肌细胞与脂肪细胞共培养比例对培养肉脂肪含量的影响',
    en: 'Myocyte–adipocyte co-culture ratio determines fat content in cultivated meat',
    kw: ['共培养', '脂肪细胞', '大理石花纹', '个性化'],
    abstract: '本研究将肌细胞与脂肪细胞按 9:1 至 6:4 的比例共培养，成品脂肪含量在 3%–21% 之间线性可调，分别对应“少脂”“适中”“丰润”三档。',
    method: '前脂肪细胞与肌卫星细胞分别扩增后按比例混合接种，以油红 O 染色与索氏抽提法测定脂肪含量。',
    fig: { type: 'bar', title: '图 1　脂肪细胞比例与成品脂肪含量', y: '脂肪含量 (%)', bars: [['10%', 3], ['25%', 11], ['40%', 21]] },
    result: '脂肪含量与脂肪细胞比例高度线性相关（R² = 0.97）。',
    discuss: '同一套工艺适用于鸡肉与猪肉产品线。',
    refs: [],
  },
  shapefab: {
    no: 'FM-TR-2026-012', species: 'fish',
    title: '基于细胞墨水的大黄鱼肌肉组织打印成型',
    en: 'Bioprinting of cultivated large yellow croaker muscle with cell-laden inks',
    kw: ['生物打印', '鱼肉', '肌节', '成型'],
    abstract: '本研究以大黄鱼肌细胞制备细胞墨水，打印“鱼片”与“鱼排”两种形态，并模拟天然肌节的层状结构。成品无刺、形态一致，适合标准化零售。',
    method: '细胞墨水含明胶与转谷氨酰胺酶，喷头直径 0.4 mm，逐层打印后于 18 ℃ 培养 10 天。',
    fig: { type: 'bar', title: '图 1　两种形态的打印保真度', y: '保真度 (%)', bars: [['鱼片', 92], ['鱼排', 87]] },
    result: '两种形态保真度均高于 85%，蒸制后结构完整。',
    discuss: '形态可按渠道需求调整，例如为餐饮客户打印统一尺寸的鱼排。',
    refs: [],
  },
  yield: {
    no: 'FM-TR-2026-003', species: null,
    title: '高产培养配方对 28 天细胞扩增量的影响',
    en: 'High-yield media formulations increase 28-day cell expansion',
    kw: ['培养基', '扩增', '成本', '规模化'],
    abstract: '培养基是培养肉成本的主要来源。本研究比较标准配方与两种高产配方（A、B），28 天后细胞量分别达到标准配方的 3 倍与 4 倍，单位成本下降 18%–26%。',
    method: '在标准配方基础上提高葡萄糖、谷氨酰胺与生长因子浓度，每 48 小时换液一次，计数细胞并检测存活率。',
    fig: { type: 'line', title: '图 1　三种配方 28 天细胞量（相对值）', y: '细胞量', x: ['0', '7', '14', '21', '28 天'], lines: [[0.05, 0.12, 0.3, 0.6, 1.0], [0.05, 0.2, 0.6, 1.5, 3.0], [0.05, 0.25, 0.8, 2.0, 4.0]], legend: ['标准', '配方 A', '配方 B'] },
    result: '配方 B 增长最快，但第 21 天后存活率较标准配方低约 3 个百分点。',
    discuss: '在消费者端，可将高产配方包装为“更划算”的选项。',
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
    <p class="pauth">Future Meat 研发中心 · 组织工程与风味实验室<br><small>通讯作者：rd@futuremeat.example · 收稿 2026-03-02 · 内部发布 2026-05-18</small></p>
    <div class="pabs"><b>摘要</b>${p.abstract}<p class="pkw"><b>关键词</b>${p.kw.join('；')}</p></div>
    <div class="pcols">
      <h3>1　引言</h3>
      <p>随着消费者对“零屠宰”蛋白的需求增长，个性化定制成为培养肉品牌差异化竞争的关键。本报告介绍该技术在细胞系 ${id}（${sp.title}）中的应用。</p>
      <h3>2　材料与方法</h3>
      <p><b>2.1 细胞来源</b>　原代肌卫星细胞分离自供体动物的肌肉活检组织，经纯化后建立主细胞库与工作细胞库（细胞系 ${id}）。供体品种、采集方式、采集次数与供体现状见补充材料 S1<span class="redline">（未公开）</span>。</p>
      <p><b>2.2 培养基</b>　扩增阶段使用 DMEM/F12 基础培养基，添加 <mark>10% 胎牛血清（FBS）</mark>、bFGF 5 ng/mL 与 1% 青霉素-链霉素；分化阶段血清浓度降至 2%。</p>
      <p><b>2.3 实验设计</b>　${p.method}</p>
      <h3>3　结果</h3>
      ${figure(p.fig)}
      <p>${p.result}</p>
      <h3>4　讨论</h3>
      <p>${p.discuss}目前无血清配方的成本约为含血清配方的 3–5 倍，商业化批次仍以含血清配方为主。</p>
      <h3>致谢</h3>
      <p>感谢供体 ${id} 对本研究的贡献。</p>
      <h3>参考文献</h3>
      <ol class="prefs">${p.refs.length ? p.refs.map(([t, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${t}</a></li>`).join('') : '<li>内部资料，不对外公开。</li>'}</ol>
    </div>
    <p class="pnote">本报告为思辨性设计中的虚构文本；所列参考文献为真实发表的研究，可延伸阅读。</p>`;
}
