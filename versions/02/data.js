// 所有文案和热点都集中在这里，相当于参考网站从 CMS 拉下来的数据.
// 热点位置用三维坐标 (x, y, z）表示：换成 360° 全景照片后，方向仍然对应.

export const ORDER = ['chicken', 'beef', 'pork', 'fish'];

export const SPECIES = {
  chicken: {
    zh: 'Chicken', en: 'CHICKEN', title: 'Cultivated chicken breast', id: 'G-0221', price: 68,
    lead: 'Lighter everyday protein, grown from the muscle cells of an authorised donor.',
    donor: 'White-feather broiler · female · 2 yrs',
  },
  beef: {
    zh: 'Cattle', en: 'BEEF', title: 'Cultivated steak', id: 'B-0417', price: 168,
    lead: 'A steak grown to your texture, aroma and colour.',
    donor: 'Holstein bull · 3 yrs',
  },
  pork: {
    zh: 'Pig', en: 'PORK', title: 'Cultivated pork chop', id: 'P-0932', price: 98,
    lead: 'The fat-to-lean ratio is up to you.',
    donor: 'Duroc sow · 4 yrs',
  },
  fish: {
    zh: 'Yellow croaker', en: 'YELLOW CROAKER', title: 'Cultivated yellow croaker', id: 'F-1180', price: 128,
    lead: 'No bones, no fishy taste, cut to the shape you need.',
    donor: 'Farmed yellow croaker · 2 yrs',
  },
};

// 每一项定制背后都有一项“专利技术”，点进去是一篇技术报告 (papers.js）
const FAT = {
  key: 'fat', label: 'Fat content', choices: [['low', 'Lean'], ['mid', 'Medium'], ['high', 'Rich']],
  tech: 'FatBlend™', techZh: 'Fat-cell co-culture', paper: 'fatblend',
  pitch: 'Muscle and fat cells grown together in proportion. One slide takes you from gym meal to pork belly.',
};
export const OPTIONS = {
  chicken: [FAT],
  pork: [FAT],
  fish: [{ key: 'form', label: 'Product form', choices: [['fillet', 'Fish fillet'], ['steak', 'Fish steak']],
    tech: 'ShapeFab™', techZh: 'Cell printing', paper: 'shapefab',
    pitch: 'One batch of cells, printed into fillets or steaks as you need. Not a single bone.' }],
  beef: [
    { key: 'firm', label: 'Texture', choices: [['tender', 'Tender'], ['firm', 'Firm']],
      tech: 'FlexScaffold™', techZh: 'Tunable-stiffness scaffold', paper: 'scaffold',
      pitch: 'Cells grow on an edible scaffold. A soft scaffold grows melt-in-the-mouth tenderness; a stiff one grows a firm chew.' },
    { key: 'aroma', label: 'Cooking aroma', choices: [['base', 'Base'], ['plus', 'Enhanced roast aroma']],
      tech: 'AromaSwitch™', techZh: 'Heat-triggered flavour', paper: 'aroma',
      pitch: 'Flavour precursors are set into the meat and release only above 150 °C. The char-grilled aroma appears the moment it hits the pan.' },
    { key: 'shade', label: 'Colour', choices: [['light', 'Light'], ['deep', 'Deep']],
      tech: 'MyoTone™', techZh: 'Myoglobin colour', paper: 'myotone',
      pitch: 'Tune the myoglobin in the cells, anywhere from blossom pink to burgundy red.' },
  ],
};

// 冷柜触摸屏上的广告词
export const AD = {
  beef: { slogan: 'A steak that does what you tell it.', copy: 'Tender or firm, rich or clean, blossom pink or burgundy red. Three patented technologies hand the choice back to you.' },
  chicken: { slogan: 'Protein lighter than morning air.', copy: 'High protein, low fat, tender not dry. Set the fat content with one tap.' },
  pork: { slogan: 'Fat or lean, you decide.', copy: 'The flavour of belly, the tenderness of loin: no need to choose. Every piece is just right.' },
  fish: { slogan: 'No bones, and no need for the sea.', copy: 'Tender yellow croaker: no bones, no fishy taste, no heavy metals. Fillet or steak, printed the way you want.' },
};

export const GROWTH = {
  cycle: [[14, '14 days'], [21, '21 days'], [28, '28 days']],
  plan: { std: { label: 'Standard', x: 1, price: 1 }, a: { label: 'Formula A', x: 3, price: 0.82 }, b: { label: 'Formula B', x: 4, price: 0.74 } },
  tech: 'Yield+™', techZh: 'High-yield medium', paper: 'yield',
  pitch: 'In the same 28 days, up to 4× the cells, and at a lower price.',
};

export const MARQUEE = 'Freshly grown today · zero slaughter · grown to order · every portion from one cell line · ';

export const HOTSPOTS = [
  { id: 'fridge', label: 'FRESH MEAT · ', pos: [-2.5, 1.25, -3.5], route: 'fridge',
    marquee: 'Pick and customise · four cell lines · growing starts when you order · ' },
  { id: 'brand', label: 'NO KILL · BRAND FILM · ', pos: [-2.5, 2.62, -3.85], route: 'brand',
    marquee: 'Meat without killing · no farming · no slaughter · ' },
  { id: 'tasting', label: 'TASTING · AT THE WINDOW · ', pos: [0.45, 1.3, -2.3], route: 'tasting',
    marquee: 'Seared cultivated steak · free for regulars · scan to review for a voucher · ' },
  { id: 'checkout', label: 'PAY · AT THE WINDOW · ', pos: [2.35, 1.55, -2.25], route: 'checkout',
    marquee: 'Regulars only · scan to pay · comes with a certificate of biological ownership · ', needsOrder: true },
  { id: 'donor', label: 'NOTICE · FOR REGULARS · ', pos: [3.85, 1.45, -3.85], route: 'donor',
    marquee: 'Meet our donors · don\'t ask where the meat comes from · ', subtle: true },
  { id: 'live', label: 'WORKSHOP · ', pos: [4.9, 1.5, -0.3], route: 'lab',
    marquee: 'Regulars\' visits by appointment · seeing is believing · ' },
  { id: 'warehouse', label: 'STORAGE · ', pos: [4.9, 1.4, 2.6], route: 'warehouse',
    marquee: 'Storage · staff only · ', subtle: true },
  { id: 'street', label: 'EXIT · ', pos: [0.55, 1.5, 4.8], route: 'street',
    marquee: 'Mind how you go · come again · don\'t tell anyone · ', subtle: true },
];

// ------------------------------------------------------------------ 店外：伪装成普通老肉铺
export const STREET_MARQUEE = 'Chen\'s Fresh Meat · fresh · frozen · deli · honest trading for thirty years · ';
export const STREET_HOTSPOTS = [
  { id: 'enter', label: 'ENTER · ', pos: [-0.3, 1.5, 0.2], route: '',
    marquee: 'Fresh pork · beef & lamb · frozen · regulars welcome · ' },
  { id: 'window', label: 'WINDOW · ', pos: [-2.7, 1.3, 0.15], subtle: true,
    marquee: 'Today\'s special · pork £0.99/lb · ',
    info: [
      { at: [-2.9, 1.5, 0.05], dx: 40, dy: -150, title: 'Today\'s special  pork £0.99/lb', line: 'Less than half the market price. No feed and no rearing time: the cost of meat is down to medium and electricity.' },
      { at: [-3.4, 0.85, -0.3], dx: -280, dy: 20, title: 'Crates of vegetables', line: 'The window shows ordinary fresh produce: this shop needs to look like any other butcher\'s on the street.' },
    ] },
  { id: 'side', label: 'BACK DOOR · ', pos: [3.55, 1.5, 0.2], route: 'warehouse',
    marquee: 'Deliveries · back door · staff only · ' },
  { id: 'gas', label: 'CYLINDERS · ', pos: [4.2, 1.1, 0.5], subtle: true,
    marquee: 'Why does a butcher need liquid nitrogen and CO₂? · ',
    info: [
      { at: [4.15, 1.2, 0.5], dx: -290, dy: -40, title: 'CO₂ cylinders × 3', line: 'Cell incubators must hold 5% CO₂, just like inside a body. A shop that only sells meat has no use for one.' },
      { at: [2.6, 1.2, 0.75], dx: -300, dy: 90, title: 'LN₂ dewar', line: 'The cell bank is kept in liquid nitrogen at −196 °C. The tanks are labelled with cell-line numbers.' },
      { at: [3.55, 3.7, 0.3], dx: -300, dy: -150, title: 'Steam from the extractor', line: 'The culture equipment out back runs 24 hours; the extractor never stops.' },
    ] },
];

// ------------------------------------------------------------------ 仓库：所有东西都伪装成冻品
export const WH_MARQUEE = 'Frozen dumplings · frozen seafood · soy protein · storage · staff only · ';
export const WH_HOTSPOTS = [
  { id: 'fbs', label: 'FROZEN · DUMPLINGS · ', pos: [-3.6, 1.0, -5.0],
    marquee: 'Frozen dumplings · 20 kg/case · −18 °C · ',
    info: [
      { at: [-3.7, 0.65, -5.0], dx: 40, dy: -180, title: '"Frozen dumplings" · 30 cases', line: 'The opened case holds bottles of fetal bovine serum (FBS). It is taken from the unborn calves of cows pregnant at slaughter, the cheapest "feed" for growing cells.', fine: 'Serum-free media still cost several times more than serum-based formulas.' },
      { at: [-6.6, 0.9, 1.7], dx: 40, dy: 20, title: '−20 °C freezer', line: 'Serum and growth factors must be stored frozen.' },
    ] },
  { id: 'media', label: 'MEDIA · ', pos: [5.0, 2.2, -4.5],
    marquee: 'Single-use culture bags · 50 L × 4 · ',
    info: [
      { at: [5.2, 2.0, -3.4], dx: -300, dy: -160, title: 'Medium · single-use culture bags', line: 'Amino acids, glucose, vitamins, growth factors. Each kilo of meat needs dozens of litres of medium, the biggest cost.' },
      { at: [-5.2, 3.5, -9.7], dx: 40, dy: -40, title: 'Soy protein isolate', line: 'Made into an edible scaffold so the cells grow along it into the shape of "meat".' },
    ] },
  { id: 'cold', label: 'CELL BANK · COLD ROOM · ', pos: [1.0, 2.0, -11.0],
    marquee: 'Cell bank · liquid nitrogen −196 °C · asphyxiation hazard · ',
    info: [
      { at: [1.0, 1.4, -11.0], dx: 40, dy: -170, title: 'Cold room · cell bank MCB-07', line: 'The liquid-nitrogen dewar holds frozen seed cells for each cell line: B-0417, P-0932…' },
      { at: [-3.0, 1.0, -10.4], dx: -320, dy: -20, title: 'Why live animals are still needed', line: 'Primary muscle stem cells age and stop dividing after a few dozen passages (the Hayflick limit). The cell bank runs out, so we must go back to the live donor for a fresh biopsy.' },
    ] },
  { id: 'crates', label: 'CRATES · ', pos: [5.4, 1.4, -10.6], subtle: true,
    marquee: 'Live · disinfected · return → farm 7 · ',
    info: [
      { at: [5.5, 0.8, -10.0], dx: -320, dy: -150, title: 'Empty animal transport crates', line: 'The hay is still fresh. The label says "Live · disinfected · return → farm 7".' },
      { at: [-2.7, 0.8, 2.6], dx: 40, dy: -120, title: 'Stock in / out ledger', line: '"11/13 IN live animals ×2 (farm 7)" sits in the same ledger as the "zero slaughter" slogan.' },
    ] },
  { id: 'back', label: 'BACK TO STORE · ', pos: [0, 1.5, 4.5], route: '',
    marquee: 'Back to the shop · ' },
];


// 品牌对外讲的Donor故事 (公关版本）.真实档案在细胞库里，对消费者是涂黑的.
export const DONOR_PR = {
  chicken: 'She roams free under the trees and gets a full 8 hours of sun every day.',
  beef: 'He runs free on the grassland and never lacks fresh grass.',
  pork: 'She lives in a climate-controlled barn and grew up listening to music.',
  fish: 'It lives in a clean deep-sea net pen.',
};
export const DONOR_STEPS = [
  ['Where they come from', 'From certified partner farms with high welfare standards.'],
  ['What sampling looks like', 'One gentle collection* feeds thousands of families.'],
  ['How they are now', 'They went back to their familiar pasture and live happily on.'],
];

// ------------------------------------------------------------------ 生长观察室 (透明工坊参观廊）
export const LAB_MARQUEE = 'Open workshop · seeing is believing · every order grows up here · no photos in the gallery · ';

export const LAB_HOTSPOTS = [
  { id: 'batch', label: 'YOUR BATCH · ', pos: [0.2, 1.68, -0.6], route: 'lab/batch',
    marquee: 'Live growth data · cell density · viability · doubling time · ' },
  { id: 'hall', label: 'CULTIVATION HALL · ', pos: [2.2, 3.3, -6.5], route: 'lab/hall',
    marquee: '12 × 2,000 L bioreactors · sterile around the clock · ' },
  { id: 'data', label: 'DATA WALL · ', pos: [-4.9, 2.72, 1.6], route: 'lab/data',
    marquee: '3,412 batches · every cell on record · ' },
  { id: 'cellbank', label: 'CELL BANK · ', pos: [-4.25, 1.6, -0.84], route: 'lab/cellbank', locked: true,
    marquee: 'No visitors · authorised staff only · ' },
  { id: 'notice', label: 'VISITOR NOTICE · ', pos: [4.95, 1.45, 2.45], route: 'lab/notice', subtle: true,
    marquee: 'No photos · do not tap the glass · ' },
  { id: 'ask', label: 'ASK US · ', pos: [3.9, 1.62, 0.35], route: 'lab/ask',
    marquee: 'Ask anything · 2,341 questions answered today · ' },
  { id: 'exit', label: 'BACK TO STORE · ', pos: [3.6, 1.55, 3.9], route: '',
    marquee: 'Back to the shop · pay · ' },
];

// 镜头聚焦的位置 (观察室里的“子页面”）
export const LAB_FOCUS = {
  batch: { fov: 25 },
  data: { at: [-4.93, 1.5, 1.6], fov: 24.5 },
  hall: { at: [1.2, 2.4, -8], fov: 44 },
  cellbank: { at: [-4.25, 1.45, -0.85], fov: 40 },
  notice: { at: [4.99, 1.45, 2.45], fov: 18 },
  ask: { at: [3.9, 1.2, 0.35], fov: 34 },
};

// 细胞库：信息确实存在，只是“已向监管部门备案，不向消费者公开”
export const CELLBANK_ROWS = [
  ['Master cell bank', 'MCB-07 · working cell bank WCB-07-3'],
  ['Storage', '−196 °C liquid nitrogen'],
  ['Source animal', null],
  ['Collection method', null],
  ['Collections', null],
  ['Donor status', null],
];

// 提问终端：预设问题和品牌的标准回答.和动物有关的问题，都会被礼貌地绕开.
export const ASK = [
  ['How is this meat grown?', 'We start from premium cells and feed them in a 37 °C bioreactor; in about 3–4 weeks they become the dish on your table. You can watch the whole process through the glass.'],
  ['What\'s in the growth medium?', 'We use a proprietary nutrient formula of amino acids, sugars, vitamins and growth factors*.', '*The exact formula is a trade secret.'],
  ['Where did the cells come from in the first place?', 'Our seed cells come from premium donors at certified partner farms. For more, please contact customer service.'],
  ['Is the donor animal still alive?', 'Thank you for your interest! Your question has been logged and passed to the right team.'],
  ['How long does one cell line last?', 'In theory it can be passaged indefinitely. Cell line B-0417 has supplied our customers for over 1,300 days.'],
  ['Can I visit the cell bank?', 'For biosafety and trade secrets, visitors may not enter the cell bank. Live data for every batch is on the data wall.'],
];
export const ASK_FALLBACK = 'Thanks for asking! The terminal can\'t answer this one; we have passed it to customer service.';
export const ASK_ANIMAL = /Donor|动物|屠宰|牛|猪|鸡|鱼|活检|取样|采集|痛|死|活着|农场|牧场|福利/;

// ------------------------------------------------------------------ Shop：走近之后的标注 (像观察室里“Your batch”那样，用引线指向实物）
// at 是三维锚点，dx/dy 是标注框相对锚点的屏幕偏移 (像素）
export const CALLOUTS = {
  tasting: [
    { at: [0.05, 1.12, -2.9], dx: -300, dy: -170, title: 'Seared cultivated steak', line: 'Medium · seared behind the window · cell line B-0417' },
    { at: [0.45, 1.08, -2.32], dx: 60, dy: 60, title: 'Tasting pieces', line: 'Handed out from the tray. Two pieces per person.' },
  ],
  checkout: [],
  donor: [],
  brand: [],
};

// 陶瓷摆件底部的刻字 (只有把它翻过来才看得到）
export const CERAMIC_BASE = [
  ['No.0001', 'B-0417', '2021.03.14'],
  ['No.0002', 'P-0932', '2021.05.02'],
  ['No.0003', 'G-0221', '2021.06.20'],
];

// 广告屏：品牌片，一页一页播放
export const BRAND_FILM = [
  { big: 'GROWN,<br>NOT RAISED.', small: 'No farming · no slaughter' },
  { big: '0', unit: '', small: 'animals slaughtered for your dinner<sup>*1</sup>' },
  { big: '24', unit: 'h', small: 'Open workshop, open all day<sup>*2</sup>' },
  { big: 'Every cell from<br>Sunshine Farm', small: 'Every delicious bite begins with a good life.', poster: 'beef' },
];
export const BRAND_FINE = '*1 Refers only to the cultivation stage, which involves no slaughter; excludes breeding, sampling and keeping of donor animals. *2 Visits cover the cell-culture hall only.';
