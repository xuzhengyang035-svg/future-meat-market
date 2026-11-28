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
  { id: 'fridge', label: 'SMART FRIDGE · ', pos: [0, 1.25, -3.5], route: 'fridge',
    marquee: 'Pick and customise · four cell lines · growing starts when you order · ' },
  { id: 'brand', label: 'OUR STORY · ', pos: [2.55, 2.0, -3.88], route: 'brand',
    marquee: 'GROWN, NOT RAISED. · NO FARMING · NO SLAUGHTER · ' },
  { id: 'pairings', label: 'PAIRINGS · ', pos: [-2.75, 1.5, -3.6], route: 'pairings',
    marquee: 'BBQ sauce · herb sea salt · extra virgin olive oil · good meat, good partners · ' },
  { id: 'ceramic', label: 'COLLECTION · FARM CERAMICS · ', pos: [-4.45, 1.25, -1.9], route: 'ceramic',
    marquee: 'Hand-glazed · Farm series · limited edition · ' },
  { id: 'tasting', label: 'FREE TASTING · ', pos: [-2.1, 1.35, -0.5], route: 'tasting',
    marquee: 'Seared cultivated steak · free tasting · scan to review for a voucher · ' },
  { id: 'merch', label: 'SHOP · MASCOT GOODS · ', pos: [-4.5, 1.6, 1.6], route: 'merch',
    marquee: 'Moo · Piglet · Cluck · take the farm home · ' },
  { id: 'live', label: 'WORKSHOP · OPEN VIEW · ', pos: [4.9, 1.5, -0.3], route: 'lab',
    marquee: 'Through the glass, watch your portion grow · open 24 hours · ' },
  { id: 'checkout', label: 'SELF CHECKOUT · ', pos: [-3.0, 1.3, 3.0], route: 'checkout',
    marquee: 'Scan to pay · comes with a certificate of biological ownership · ', needsOrder: true },
  { id: 'donor', label: 'NOTICE · ', pos: [1.95, 1.45, 4.8], route: 'donor',
    marquee: 'Meet our donors · ', subtle: true },
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
  pairings: [
    { at: [-3.7, 1.84, -3.7], dx: 40, dy: -120, title: 'Chilli sauce', price: 26, line: 'With pork chops, every bite tastes better.', buy: 'Chilli sauce' },
    { at: [-1.8, 1.47, -3.7], dx: -290, dy: -120, title: 'Extra virgin olive oil', price: 68, line: 'Cold-pressed extra virgin: chicken breast won\'t stick.', buy: 'Olive oil' },
    { at: [-3.7, 1.0, -3.7], dx: 40, dy: -30, title: 'Herb sea salt', price: 28, line: 'Rosemary and thyme: a pinch, like a barbecue on the farm.', buy: 'Herb sea salt' },
    { at: [-1.8, 0.63, -3.7], dx: -290, dy: 10, title: 'BBQ sauce', price: 32, line: 'Smoked for 12 slow hours, a perfect match for cultivated steak.', buy: 'BBQ sauce' },
  ],
  merch: [
    { at: [-4.6, 1.45, 1.1], dx: 60, dy: -70, title: 'Plush toy · Moo', price: 89, line: 'Brand ambassador. Soft, and just right to hug at night.', buy: 'Moo' },
    { at: [-4.6, 1.45, 1.6], dx: -60, dy: -160, title: 'Plush toy · Piglet', price: 89, line: 'The mascot kids love most.', buy: 'Piglet' },
    { at: [-4.6, 1.47, 2.1], dx: -290, dy: -60, title: 'Plush toy · Cluck', price: 79, line: 'The one that "gets a full 8 hours of sun every day".', buy: 'Cluck' },
    { at: [-4.58, 0.68, 1.1], dx: 90, dy: 20, title: 'Tote bag · GROWN NOT RAISED', price: 59, line: 'Bring it along when you buy meat.', buy: 'Tote bag' },
    { at: [-4.6, 0.68, 2.1], dx: -310, dy: 30, note: true, line: 'For every item sold, we donate £0.10 to an "animal-friendly" charity*.', fine: '*Project details are subject to official brand announcements.' },
  ],
  ceramic: [
    { at: [-4.45, 1.1, -3.0], dx: -150, dy: 130, title: 'Holstein cow', price: 129, line: 'Hand-glazed ceramic · Farm series No.1', flip: 0 },
    { at: [-4.45, 1.28, -1.9], dx: 110, dy: -170, title: 'Pink pig', price: 129, line: 'Hand-glazed ceramic · Farm series No.2', flip: 1 },
    { at: [-4.45, 1.0, -0.8], dx: 60, dy: 90, title: 'White-feather hen', price: 99, line: 'Hand-glazed ceramic · Farm series No.3', flip: 2 },
  ],
  tasting: [
    { at: [-2.1, 1.0, -0.05], dx: 40, dy: -190, title: 'Seared cultivated steak', line: 'Medium · seared and sliced to order · cell line B-0417' },
    { at: [-2.1, 0.97, -0.75], dx: -300, dy: 90, title: 'Tasting pieces', line: 'Two pieces per person. Please use a toothpick.' },
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
