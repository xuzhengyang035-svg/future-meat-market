// 所有文案和热点都集中在这里，相当于参考网站从 CMS 拉下来的数据。
// 热点位置用三维坐标（x, y, z）表示：换成 360° 全景照片后，方向仍然对应。

export const ORDER = ['chicken', 'beef', 'pork', 'fish'];

export const SPECIES = {
  chicken: {
    zh: 'Chicken', en: 'CHICKEN', title: 'Cultivated chicken breast', id: 'G-0221', price: 68,
    lead: 'High protein, low fat. Grown from chicken muscle cells.',
    donor: 'White broiler · hen · 2 years',
  },
  beef: {
    zh: 'Beef', en: 'BEEF', title: 'Cultivated beef steak', id: 'B-0417', price: 168,
    lead: 'Choose the texture, aroma and colour.',
    donor: 'Holstein bull · 3 years',
  },
  pork: {
    zh: 'Pork', en: 'PORK', title: 'Cultivated pork chop', id: 'P-0932', price: 98,
    lead: 'Choose the fat content.',
    donor: 'Duroc sow · 4 years',
  },
  fish: {
    zh: 'Yellow croaker', en: 'YELLOW CROAKER', title: 'Cultivated yellow croaker', id: 'F-1180', price: 128,
    lead: 'No bones. Fillet or steak.',
    donor: 'Farmed yellow croaker · 2 years',
  },
};

// 每一项定制背后都有一项“专利技术”，点进去是一篇技术报告（papers.js）
const FAT = {
  key: 'fat', label: 'Fat content', choices: [['low', 'Lean'], ['mid', 'Medium'], ['high', 'Rich']],
  tech: 'FatBlend™', techZh: 'Fat-cell co-culture', paper: 'fatblend',
  pitch: 'Muscle and fat cells are grown together in set ratios: 3–21 % fat, in three grades.',
};
export const OPTIONS = {
  chicken: [FAT],
  pork: [FAT],
  fish: [{ key: 'form', label: 'Cut', choices: [['fillet', 'Fillet'], ['steak', 'Steak']],
    tech: 'ShapeFab™', techZh: 'Cell printing', paper: 'shapefab',
    pitch: 'Printed layer by layer from cell ink into a fillet or steak. No bones.' }],
  beef: [
    { key: 'firm', label: 'Texture', choices: [['tender', 'Tender'], ['firm', 'Firm']],
      tech: 'FlexScaffold™', techZh: 'Tunable scaffold', paper: 'scaffold',
      pitch: 'Cells grow on an edible scaffold. A softer scaffold gives a tender cut, a stiffer one more bite.' },
    { key: 'aroma', label: 'Cooking aroma', choices: [['base', 'Standard'], ['plus', 'Extra roast']],
      tech: 'AromaSwitch™', techZh: 'Heat-released flavour', paper: 'aroma',
      pitch: 'Flavour precursors are added while growing and release a roast aroma above 150 °C.' },
    { key: 'shade', label: 'Colour', choices: [['light', 'Light'], ['deep', 'Deep']],
      tech: 'MyoTone™', techZh: 'Myoglobin tuning', paper: 'myotone',
      pitch: 'Colour set by adjusting myoglobin during growth: light or deep.' },
  ],
};

// 冷柜触摸屏上的广告词
export const AD = {
  beef: { slogan: 'Texture, aroma, colour. Your choice.', copy: 'Tender or firm, standard or extra roast, light or deep. Grown after you order.' },
  chicken: { slogan: 'High protein. Low fat.', copy: 'Cultivated chicken breast in three fat grades.' },
  pork: { slogan: 'Pick your fat.', copy: '3–21 % fat: lean, medium or rich.' },
  fish: { slogan: 'Yellow croaker, no bones.', copy: 'Fillet or steak, printed then grown.' },
};

export const GROWTH = {
  cycle: [[14, '14 days'], [21, '21 days'], [28, '28 days']],
  plan: { std: { label: 'Standard', x: 1, price: 1 }, a: { label: 'Recipe A', x: 3, price: 0.82 }, b: { label: 'Recipe B', x: 4, price: 0.74 } },
  tech: 'Yield+™', techZh: 'High-yield recipe', paper: 'yield',
  pitch: 'After 28 days, 3–4× the cells of the standard recipe, at a lower unit price.',
};

export const MARQUEE = 'Cultivated meat · grown after you order · beef · pork · chicken · yellow croaker · ';

// 大厅里可以走过去的几个位置（地上的箭头）：pos 是站的地方（x, z），at 是到了以后先看向哪里
export const ROOM_NAV = {
  // 门店的八个点位；路线都走在桌子、吧台和肉柜之间的空地上
  eye: 1.62, fov: 62, pitch: -8, start: 'door',
  path: { mark: 1.7, width: 0.2, radius: 0.6 },
  keepOut: [[-6, 3.9, 2.2, 7]],   // the street through the front glass is a baked view: stay far enough back for it to hold up
  pace: { speed: 1.85, accel: 1.35, turn: 70 },
  nodes: {
    door:    { name: 'Entrance', at: [0.4, 3.3], face: -6 },
    counter: { name: 'Counter', at: [0.4, -0.45] },
    right:   { name: 'Checkout', at: [2.75, 0.1], face: -84 },                                              // 结算、加工间门
    corner:  { name: 'Notice board', at: [4.1, -1.3] },                                              // 告示栏
    fridge:  { name: 'Meat fridge', at: [-2.3, -2.15] },
    storage: { name: 'Storage door', at: [-4.4, -2.85], face: 108 },                                            // 仓库门
    dining:  { name: 'Dining area', at: [-2.1, 2.6] },
    office:  { name: 'Office', at: [-8.0, 3.85], face: -28 },
    case:    { name: 'Chiller', at: [2.6, 2.4], face: 90 },                                              // 右墙那排冷藏肉柜前
  },
  routes: [
    { a: 'door', b: 'counter' },
    { a: 'door', b: 'fridge', via: [[0.0, 1.3], [-0.35, -0.5], [-0.82, -1.02], [-1.75, -1.32]], markA: 1.0, markB: 1.0, radius: 0.3 },   // 从第三张桌子的长凳角和吧台高凳之间穿过去                            // 进门直接去鲜肉柜
    { a: 'door', b: 'right', via: [[1.9, 2.8], [2.6, 1.9]] },
    { a: 'door', b: 'dining', via: [[-1.0, 2.75]] },
    { a: 'counter', b: 'right' },
    { a: 'right', b: 'corner', via: [[3.7, -0.5]] },
    { a: 'counter', b: 'fridge', via: [[-0.35, -0.75], [-0.82, -1.02], [-1.75, -1.32]], markA: 0.8, markB: 1.0, radius: 0.3 },
    { a: 'fridge', b: 'storage', via: [[-3.4, -2.65]], markA: 0.9 },
    { a: 'door', b: 'case', via: [[1.6, 3.0]] },
    { a: 'right', b: 'case' },
    { a: 'counter', b: 'dining', via: [[0.3, 1.6], [-0.7, 2.9]] },                         // 吧台和用餐区之间直接走，不用先回门口
    { a: 'counter', b: 'corner', via: [[1.5, -0.12], [2.9, -0.45]] },   // 绕开吧台前的湿地警示牌
    { a: 'dining', b: 'office', via: [[-2.5, 3.5], [-3.5, 3.63], [-4.7, 3.66], [-5.6, 3.67], [-6.4, 3.95], [-7.6, 3.95]], radius: 0.4 },
  ],
};

export const HOTSPOTS = [
  { id: 'fridge', label: 'Fresh meat · ', pos: [-2.5, 1.25, -3.5], route: 'fridge',
    marquee: 'Fresh meat · four cultivated meats · made to order · ' },
  { id: 'brand', label: 'No kill · brand film · ', pos: [-2.5, 2.62, -3.85], route: 'brand',
    marquee: 'Brand film · ' },
  { id: 'tasting', label: 'Tasting · ', pos: [0.45, 1.3, -1.95], route: 'tasting',
    marquee: 'Tasting · seared cultivated steak · rate it for a voucher · ' },
  { id: 'checkout', label: 'Checkout · ', pos: [2.85, 1.55, -1.95], route: 'checkout',
    marquee: 'Checkout · scan to pay · ', needsOrder: true },
  { id: 'donor', label: 'Notice · regulars · ', pos: [4.15, 1.45, -3.9], route: 'donor',
    marquee: 'Notice board · our donors · ', subtle: true },
  { id: 'live', label: 'Processing room · ', pos: [4.9, 1.5, -0.3], route: 'lab',
    marquee: 'Processing room · visits by appointment · ' },
  { id: 'warehouse', label: 'Storage · ', pos: [-4.4, 1.4, -3.85], route: 'warehouse',
    marquee: 'Storage · staff only · ', subtle: true },
  { id: 'records', label: 'Donor register · ', pos: [-9.43, 0.8, 3.12], route: 'records',
    marquee: 'Office · donor register · files · ' },
  { id: 'board', label: 'Weekly cell-line plan · ', pos: [-7.16, 1.68, 1.95], route: 'board', r: 0.5,
    marquee: 'Office · weekly cell-line plan · ' },
  { id: 'officewh', label: 'To storage · ', pos: [-9.5, 1.5, 1.3], route: 'warehouse',
    marquee: 'Storage · close the door behind you · ', subtle: true },
  { id: 'street', label: 'Exit · ', pos: [0.55, 1.5, 4.8], route: 'street',
    marquee: 'Exit · ', subtle: true },
];

// ------------------------------------------------------------------ 店外：一家普通的肉铺门面
export const STREET_MARQUEE = 'Fresh · frozen · deli · ';
export const STREET_HOTSPOTS = [
  { id: 'enter', label: 'Enter · ', pos: [-1.1, 1.6, 0.4], route: '',
    marquee: 'Enter · ' },
  { id: 'side', label: 'Door 02 · storage · ', pos: [6.4, 1.0, 0.4], route: 'warehouse',
    marquee: 'Door 02 · deliveries · storage · ' },
  // 走近看：橱窗里挂着的风干肉、门口黑板上的菜单、门边的两只气瓶
  { id: 'window', label: 'Window · cured meat · ', pos: [1.3, 2.25, 0.25], eye: [1.25, 1.75, 2.2], at: [1.25, 2.15, -0.4], fov: 48,
    marquee: 'Window · cured sausage · ham · ',
    info: [{ at: [0.95, 2.4, -0.35], title: 'Cured sausage', item: 'salami' }] },
  { id: 'menu', label: "Today's menu · ", pos: [-2.75, 1.5, 1.8], eye: [-2.2, 1.55, 3.4], at: [-2.75, 0.95, 1.75], fov: 46,
    marquee: "Today's menu · prices · where it comes from · ",
    info: [{ at: [-2.7, 1.0, 1.9], title: 'Menu card', item: 'menucard' }] },
  { id: 'gas', label: 'Gas cylinders · CO₂ · ', pos: [3.74, 1.42, 0.4], eye: [3.2, 1.45, 1.9], at: [3.74, 0.95, 0.35], fov: 50,
    marquee: 'Food-grade CO₂ · modified-atmosphere packing · keeps the meat red on the shelf · ',
    info: [{ at: [3.56, 1.3, 0.36], title: 'Open the valve', act: 'valve' }] },
];

// ------------------------------------------------------------------ 仓库（交互文字用中文；场景里的牌子、印字保持英文）
export const WH_MARQUEE = 'Storage · staff only · ';
// 仓库里走动（像街景）：站位 + 相邻关系。每个站位只显示通往相邻站位的箭头（贴在地上），点一下走过去一段；
//   [x, z, 眼睛高度]（月台上 2.75）；边上的第三项是路上要经过的点（楼梯、绕开叉车和防撞柱、穿过货架之间的横通道）
export const WH_NAV = {
  // 七个固定点位。routes = 点位之间画好的路：via 是拐点 [x, z, 地面高度]；markA / markB = 两个方向的路标放在路上第几米（不写就用 path.mark）
  eye: 1.65, fov: 64, pitch: -9, start: 'door',
  path: { mark: 3.2, width: 0.36 },
  pace: { speed: 3.7, stairs: 1.8, accel: 1.9, turn: 74 },                  // 仓库大：走得快一点，但还是人的起步和停步
  // 2026-11 重排：每个点位四周有路就都能走——楼梯口是一个点（下了月台能往前门、往冷链收货、往主通道、绕过货架前头去暂存区），
  //   货架那一排两头和中间的横通道都能穿过去；后面细胞库前可以去档案区、冷冻区、02 号门
  nodes: {
    door:   { name: 'Entrance', at: [-1.3, 2.0], face: -22 },
    intake: { name: 'Cold-chain intake', at: [-5.5, -0.9], face: -100 },
    stairs: { name: 'Dock stairs', at: [-5.7, -3.6] },
    dock:   { name: 'Loading dock', at: [-9.9, -3.2, 1.1], face: 36, pitch: -22 },
    dock2:  { name: 'Far end of the dock', at: [-8.95, -20.4, 1.1] },
    mid:    { name: 'Main aisle', at: [-1.6, -11.6] },
    cross:  { name: 'Cross aisle', at: [4.6, -8.4] },
    pack:   { name: 'Packing bench', at: [3.3, 1.9], face: 160 },
    front:  { name: 'Staging', at: [7.8, -2.0] },
    side:   { name: 'Freezers', at: [8.9, -14.8] },
    back:   { name: 'Cell bank', at: [-1.3, -20.8] },
    files:  { name: 'Archive', at: [7.7, -25.7], views: [-20, 72, 170] },
    gate:   { name: 'Door 02', at: [-7.4, -25.9], face: -150 },
  },
  routes: [
    { a: 'door', b: 'intake', via: [[-3.4, 0.9]] },
    { a: 'door', b: 'mid', via: [[-1.0, -1.8], [-1.8, -5.4], [-3.0, -8.6]] },
    { a: 'door', b: 'pack', via: [[0.6, 2.2]] },
    { a: 'door', b: 'stairs', via: [[-3.2, -0.6], [-4.8, -2.8]] },
    { a: 'intake', b: 'stairs' },
    { a: 'stairs', b: 'dock', via: [[-6.3, -4.2], [-6.5, -4.2], [-6.82, -4.2, 0.22], [-8.22, -4.2, 1.14], [-8.6, -4.2, 1.1]], markA: 1.2 },   // 上下楼梯
    { a: 'stairs', b: 'mid', via: [[-4.9, -6.1], [-3.3, -8.6]] },
    { a: 'stairs', b: 'front', via: [[-4.4, -1.8], [-1.0, 1.0], [1.8, 1.55], [4.6, 1.3], [6.6, -0.2]] },   // 下了楼梯绕过货架前头，到货架另一边
    { a: 'pack', b: 'front', via: [[5.0, 1.3], [6.6, -0.2]] },
    { a: 'dock', b: 'dock2', via: [[-9.7, -4.9, 1.1], [-9.4, -6.8, 1.1], [-9.3, -9.4, 1.1], [-9.0, -14.0, 1.1]] },
    { a: 'mid', b: 'cross', via: [[-0.2, -10.9], [1.3, -10.2], [1.5, -8.82], [2.0, -8.72], [2.6, -8.7], [3.8, -8.55]] },   // 穿过货架中间的横通道
    { a: 'mid', b: 'back', via: [[-1.5, -15.0], [-1.5, -17.1]] },
    { a: 'front', b: 'cross', via: [[7.65, -6.2], [6.4, -7.6]] },
    { a: 'front', b: 'side', via: [[7.75, -5.6], [8.0, -7.6], [8.4, -12.2]] },
    { a: 'cross', b: 'side', via: [[7.9, -8.7], [8.4, -12.2]] },
    { a: 'side', b: 'back', via: [[9.1, -18.6], [7.6, -19.3], [4.2, -19.3], [1.2, -18.6]] },
    { a: 'side', b: 'files', via: [[9.1, -18.6], [8.25, -20.0], [8.25, -24.4]] },
    { a: 'back', b: 'files', via: [[1.2, -20.4], [3.15, -24.8], [5.4, -25.6]] },
    { a: 'back', b: 'gate', via: [[-4.2, -21.4], [-6.9, -23.6]] },
  ],
};
// eye / at / fov：点了之后走近到哪里、看向哪里（到了再出引线标注）
export const WH_HOTSPOTS = [
  { id: 'fbs', view: { mode: 'orbit', az: 55, el: [12, 60] }, label: 'Cold-chain intake · ', pos: [-7.5, 1.15, -1.0], eye: [-5.0, 1.75, 0.7], at: [-7.6, 0.55, -1.15], fov: 50,
    marquee: 'Cold-chain intake · foetal bovine serum · −20 °C · ',
    info: [
      { at: [-7.3, 0.55, -0.9], title: 'Foetal bovine serum', item: 'fbs' },
    ] },
  { id: 'packing', view: { mode: 'orbit', az: 45, el: [10, 55] }, label: 'Packing bench · ', pos: [2.0, 1.45, 3.35], eye: [2.9, 1.75, 1.3], at: [2.6, 1.0, 3.5], fov: 50,
    marquee: 'Order packing · packaging · ',
    info: [
      { at: [1.95, 0.98, 3.5], title: 'Order waiting to ship', item: 'order' },
    ] },
  { id: 'cold', view: { mode: 'orbit', az: 40, el: [5, 40] }, label: 'Cell bank · ', pos: [-1.5, 2.6, -24.2], eye: [-0.6, 1.75, -18.6], at: [-1.6, 1.6, -24.3], fov: 56,
    marquee: 'Cold store · cell bank · −196 °C · ',
    info: [
      { at: [-1.3, 1.05, -23.4], title: 'Cryovial', item: 'vial' },
    ] },
  { id: 'freezer', view: { mode: 'track', a: [10.5, 2.1, -16.5], b: [10.5, 2.1, -23.0], look: [0.62, -1.5, 0], u0: 0.3, tilt: 14, fov: 60 }, label: 'Freezers · ', pos: [11.0, 1.25, -19.3], eye: [8.9, 1.7, -17.4], at: [11.0, 0.7, -19.6], fov: 56,
    marquee: 'Freezers · −25 °C · frozen stock · ',
    info: [
      { at: [11.2, 0.62, -18.5], title: 'Frozen meat', item: 'frozen' },
    ] },
  { id: 'crates', view: { mode: 'orbit', az: 50, el: [10, 45] }, label: 'Transport cages · ', pos: [-10.0, 2.9, -15.9], eye: [-8.6, 2.85, -12.8], at: [-10.1, 1.6, -16.2], fov: 54,
    marquee: 'Loading dock · animal transport cages · ',
    info: [
      { at: [-9.8, 1.25, -15.2], title: 'Ear tag in the cage', item: 'eartag' },
    ] },
  { id: 'desk', view: { mode: 'orbit', az: 50, el: [15, 60] }, label: 'Check-in desk · ', pos: [-7.9, 1.3, -11.6], eye: [-6.0, 1.75, -10.8], at: [-7.9, 0.8, -11.6], fov: 46, subtle: true,
    marquee: 'Check-in desk · goods received notes · ',
    info: [
      { at: [-7.9, 0.82, -11.6], title: 'Goods received note', item: 'grn' },
    ] },
  { id: 'atlas', view: { mode: 'orbit', az: 45, el: [22, 68] }, label: 'Archive · ', pos: [5.74, 1.4, -27.9], eye: [5.74, 2.05, -26.55], at: [5.74, 0.98, -27.92], fov: 42,
    marquee: 'Pig genetic records · tissue atlas · returns bin · ' },
  { id: 'lineage', view: { mode: 'orbit', az: 40, el: [8, 45] }, label: 'Photo wall · ', pos: [10.6, 2.35, -29.9], eye: [10.1, 1.75, -27.6], at: [10.4, 1.25, -29.8], fov: 50,
    marquee: 'Old farm photos · pedigree · failed samples · ',
    info: [
      { at: [10.24, 1.5, -29.94], title: 'Old photo', item: 'photo' },
      { at: [9.87, 0.95, -29.66], title: 'Failed sample', item: 'jar' },
    ] },
  { id: 'office', label: 'Office · ', pos: [-4.8, 1.5, 3.9], route: 'office',
    marquee: 'Office · donor register · ' },
  { id: 'back', label: 'Back to the shop · ', pos: [-1.3, 1.5, 3.9], route: '',
    marquee: 'Back to the shop · ' },
];


// 品牌告示上的供体介绍。细胞库里的档案对消费者不公开。
export const DONOR_PR = {
  chicken: 'Free-range, under the trees.',
  beef: 'Grazing on the farm.',
  pork: 'Kept in a climate-controlled barn.',
  fish: 'Raised in deep-sea net pens.',
};
export const DONOR_STEPS = [
  ['Source', 'Partner farms, animal-welfare certified.'],
  ['Sampling', 'A little muscle tissue under local anaesthetic*.'],
  ['Afterwards', 'Back to the farm, kept as before.'],
];

// ------------------------------------------------------------------ 生长观察室（透明工坊参观廊）
export const LAB_MARQUEE = 'Processing room gallery · no photos · ';

// 隔着玻璃看：镜头一直在参观廊这一侧（不穿过玻璃），朝着目标；拖动是沿着玻璃横移、抬头低头
const GLASS_Z = -0.32;
export const LAB_DEEP = 0.9;                                                // 帘子后面整体往里让了这么多（tools/blender/lab_kit.py 的 DEEP）
const DZ = -LAB_DEEP;
const peek = (x, to, fov, { reach = 0.6, tilt = 14, y = 1.7, u0 = 0.5 } = {}) => ({ mode: 'track', a: [x - reach, y, GLASS_Z], b: [x + reach, y, GLASS_Z],
  look: [to[0] - x, to[1] - y, to[2] - GLASS_Z], tilt, fov, zoomFov: [Math.max(18, fov * 0.65), Math.min(70, fov * 1.4)], u0 });

// show：这个标签在哪一幕出现——walk 在参观廊里走、glass 贴着玻璃看实验台、ward 帘子拉开以后
export const LAB_HOTSPOTS = [
  { id: 'glass', label: 'Look through the glass · ', pos: [0.8, 1.75, -1.0], route: 'lab/glass', show: ['walk'],
    marquee: 'Through the glass · lab bench · cultivated meat · ',
    view: { mode: 'track', a: [-2.4, 1.64, -0.1], b: [3.9, 1.64, -0.1], look: [0, -0.27, -1], u0: 0.349, u0p: 0.595, tilt: 24, fov: 60, zoomFov: [32, 68] } },
  { id: 'batch', label: 'Your batch · ', pos: [0.55, 1.36, -1.72], route: 'lab/batch', show: ['glass'],
    marquee: 'Your batch · cell density · viability · doubling time · ' },
  { id: 'bench', label: 'Retained samples · ', pos: [-1.3, 1.08, -1.78], route: 'lab/bench', show: ['glass'],
    marquee: 'Microscope · slide rack · sample tray · handover sheet · ', info: [{ at: [-0.55, 0.95, -1.7], title: 'Handover sheet', item: 'handover' }], view: peek(-0.42, [-0.78, 0.98, -1.8], 44, { reach: 1.2, tilt: 20, y: 1.72 }) },
  { id: 'ward', label: 'Open the curtain · ', pos: [-0.1, 1.72, -2.95], route: 'lab/ward', show: ['glass'],
    marquee: 'Behind the curtain · 5 sampling beds · ',
    view: { mode: 'track', a: [-2.6, 1.78, -0.15], b: [4.2, 1.78, -0.15], look: [0, -0.15, -1], u0: 0.353, tilt: 26, fov: 64, zoomFov: [30, 68] } },
  ...[['P-0932', -6.8, 1.1, -1.7], ['B-0417', -4.1, 1.15, -1.5], ['P-0101', 0, 0.95, 0.2], ['P-1077', 4.1, 1.1, 4.5], ['G-0221', 6.8, 1.08, 4.3]].map(([id, x, y, from], i) => (
    { id: 'bed' + i, label: `${id} · `, pos: [x, y + 0.5, -4.2 + DZ], route: 'lab/bed' + i, show: ['ward'], subtle: true,
      marquee: `Sampling bed ${id} · `, view: peek(from, [x, y, -4.35 + DZ], [24, 34, 34, 32, 25][i], { reach: 0.4, tilt: 11, y: 1.86 }) })),
  { id: 'vessels', label: 'High tanks · ', pos: [1.59, 3.2, -9.2 + DZ], route: 'lab/vessels', show: ['ward'],
    marquee: 'High culture tanks · HT-01 · HT-02 · HT-03 · ', view: peek(-0.3, [1.3, 3.6, -9.8 + DZ], 32, { reach: 2.4, tilt: 9, y: 1.56 }) },
  { id: 'returns', label: 'Returns corner · ', pos: [8.2, 1.4, -9.0 + DZ], route: 'lab/returns', show: ['ward'], subtle: true,
    marquee: 'Clinical waste corner · ', view: peek(4.3, [8.0, 0.75, -9.4 + DZ], 19, { reach: 0.3, tilt: 8, y: 2.1 }) },
  { id: 'data', label: 'Growth data wall · ', pos: [-4.9, 2.72, 1.6], route: 'lab/data', show: ['walk'],
    marquee: 'Growth data wall · 3,412 batches · ' },
  { id: 'cellbank', label: 'Cell bank · ', pos: [-4.25, 1.6, -0.84], route: 'lab/cellbank', show: ['walk'], locked: true,
    marquee: 'No visitors · authorised staff only · ' },
  { id: 'notice', label: 'Visitor notice · ', pos: [4.95, 1.45, 2.45], route: 'lab/notice', show: ['walk'], subtle: true, nopin: true,   // 不放标签：指到墙上那张纸本身就能点
    marquee: 'No photos · do not tap the glass · ' },
  { id: 'ask', label: 'Question terminal · ', pos: [3.9, 1.62, 0.35], route: 'lab/ask', show: ['walk'], nopin: true,
    marquee: 'Question terminal · ' },
  { id: 'exit', label: 'Back to the shop · ', pos: [3.6, 1.55, 3.9], route: '', show: ['walk'], subtle: true,
    marquee: 'Back to the shop · ' },
];

// 参观廊里的固定点位：门口，玻璃前左、中、右。views = 停下来只朝这几个方向（沿着一排帘子斜着看进去，前面那支箭头也在画面里）
export const LAB_NAV = {
  eye: 1.62, fov: 62, pitch: -12, start: 'entry',
  path: { mark: 1.8, width: 0.2, radius: 0.7 },
  pace: { speed: 1.8, accel: 1.35, turn: 70 },
  nodes: {
    entry: { name: 'Entrance', at: [1.3, 3.05], views: [-7], pitch: -12 },                      // 一进门正对着整面玻璃
    west:  { name: 'Microscope bench', at: [-2.6, 0.75], views: [59] },
    mid:   { name: 'Sample bench', at: [0.1, 0.65], views: [-59, 59] },
    east:  { name: 'Culture tanks', at: [2.7, 0.75], views: [-59] },
    data:  { name: 'Data wall', at: [-3.4, 1.9], face: -82 },                                  // 左墙的生长数据墙前
    board: { name: 'Question terminal', at: [3.0, 2.05], face: 70 },                                 // 右墙：展板、须知、提问终端
  },
  routes: [
    { a: 'entry', b: 'west', via: [[0.6, 1.8], [-1.6, 1.7]] },
    { a: 'entry', b: 'mid' },
    { a: 'entry', b: 'east', via: [[2.5, 2.2]] },
    { a: 'west', b: 'mid' },
    { a: 'mid', b: 'east' },
    { a: 'entry', b: 'data', via: [[0.6, 2.25], [-1.6, 2.2]] },          // 绕过长凳
    { a: 'data', b: 'west' },
    { a: 'data', b: 'mid', via: [[-1.6, 1.6]] },
    { a: 'entry', b: 'board' },
    { a: 'board', b: 'east' },
    { a: 'board', b: 'mid', via: [[1.6, 1.5]] },
  ],
};

// 镜头聚焦的位置（观察室里的“子页面”）
export const LAB_FOCUS = {
  batch: { eye: [1.35, 1.64, 0.25], fov: 28 },
  data: { at: [-4.93, 1.5, 1.6], fov: 24.5 },
  hall: { eye: [0.6, 1.66, 0.1], at: [0.4, 1.15, -6.5], fov: 56 },
  cellbank: { at: [-4.25, 1.45, -0.85], fov: 40 },
  notice: { eye: [3.72, 1.52, 2.45], at: [4.99, 1.45, 2.45], fov: 34 },
  ask: { eye: [3.42, 1.56, 1.22], at: [3.9, 1.1, 0.37], fov: 34 },
};

// 细胞库：信息确实存在，只是“已向监管部门备案，不向消费者公开”
export const CELLBANK_ROWS = [
  ['Master cell bank', 'MCB-07 · working cell bank WCB-07-3'],
  ['Storage', '−196 °C liquid nitrogen'],
  ['Source animal', null],
  ['Collection method', null],
  ['Times collected', null],
  ['Donor status', null],
];

// 提问终端：预设问题和品牌的标准回答。涉及供体动物的问题不正面回答。
export const ASK = [
  ['How is this meat grown?', 'Cells grow in a 37 °C bioreactor for 3–4 weeks, then they are harvested, shaped and packed.'],
  ["What's in the growth medium?", 'Amino acids, glucose, vitamins, salts and growth factors*.', '*The exact formula is a trade secret.'],
  ['Where do the cells come from?', 'From muscle tissue of donor animals on our partner farms. Please contact customer care for details.'],
  ['Are the donor animals still alive?', 'Your question has been logged and passed on to the relevant team.'],
  ['How long does a cell line last?', 'Cell line B-0417 has been in use for more than 1,300 days.'],
  ['Can I visit the cell bank?', 'The cell bank is closed to visitors. Batch data is shown on the data wall.'],
];
export const ASK_FALLBACK = "This terminal can't answer that. It has been passed to customer care.";
export const ASK_DONOR = 'Questions about donors are outside what this terminal can answer.';
export const ASK_ANIMAL = /供体|动物|屠宰|牛|猪|鸡|鱼|活检|取样|采集|痛|死|活着|农场|牧场|福利|血|针|donor|animal|slaughter|cow|calf|pig|chicken|hen|biops|pain|hurt|die|dead|alive|kill|farm|welfare|blood|needle/i;

// ------------------------------------------------------------------ 门店：走近之后的标注（像观察室里“你的批次”那样，用引线指向实物）
// at 是三维锚点，dx/dy 是标注框相对锚点的屏幕偏移（像素）
export const CALLOUTS = {
  tasting: [
    { at: [0.45, 1.07, -1.95], title: 'Tasting piece', item: 'sample' },
  ],
  checkout: [],
  records: [],
  board: [],
  donor: [],
  brand: [],
};

// 陶瓷摆件底部的刻字（只有把它翻过来才看得到）
export const CERAMIC_BASE = [
  ['No.0001', 'B-0417', '2021.03.14'],
  ['No.0002', 'P-0932', '2021.05.02'],
  ['No.0003', 'G-0221', '2021.06.20'],
];

// 广告屏：品牌片，一页一页播放
export const BRAND_FILM = [
  { big: 'GROWN,<br>NOT RAISED.', small: 'No farming · No slaughter' },
  { big: '0', unit: 'animals', small: 'slaughtered for your dinner' },
  { big: '24', unit: 'h', small: 'Our processing hall is open to visitors' },
  { big: 'Cells from<br>partner farms', small: 'Donor animals live on the farm.', poster: 'beef' },
];
export const BRAND_FINE = '*1 Refers to the culture process only; excludes breeding, sampling and keeping of donor animals.  *2 Visits cover the cell culture hall only.';
