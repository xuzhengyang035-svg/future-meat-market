// 所有文案和热点都集中在这里，相当于参考网站从 CMS 拉下来的数据。
// 热点位置用三维坐标（x, y, z）表示：换成 360° 全景照片后，方向仍然对应。

export const ORDER = ['chicken', 'beef', 'pork', 'fish'];

export const SPECIES = {
  chicken: {
    zh: '鸡', en: 'CHICKEN', title: '培养鸡胸肉', id: 'G-0221', price: 68,
    lead: '高蛋白、低脂肪。由鸡的肌肉细胞培养而成。',
    donor: '白羽肉鸡 · 雌性 · 2 岁',
  },
  beef: {
    zh: '牛', en: 'BEEF', title: '培养牛排', id: 'B-0417', price: 168,
    lead: '口感、香气和颜色可以选择。',
    donor: '荷斯坦公牛 · 3 岁',
  },
  pork: {
    zh: '猪', en: 'PORK', title: '培养猪排', id: 'P-0932', price: 98,
    lead: '脂肪含量可以选择。',
    donor: '杜洛克母猪 · 4 岁',
  },
  fish: {
    zh: '大黄鱼', en: 'YELLOW CROAKER', title: '培养大黄鱼', id: 'F-1180', price: 128,
    lead: '无刺。可选鱼片或鱼排。',
    donor: '养殖大黄鱼 · 2 龄',
  },
};

// 每一项定制背后都有一项“专利技术”，点进去是一篇技术报告（papers.js）
const FAT = {
  key: 'fat', label: '脂肪含量', choices: [['low', '少脂'], ['mid', '适中'], ['high', '丰润']],
  tech: 'FatBlend™', techZh: '脂肪细胞共培养', paper: 'fatblend',
  pitch: '肌肉细胞和脂肪细胞按比例共同培养，脂肪含量在 3%–21% 之间，分三档。',
};
export const OPTIONS = {
  chicken: [FAT],
  pork: [FAT],
  fish: [{ key: 'form', label: '产品形态', choices: [['fillet', '鱼片'], ['steak', '鱼排']],
    tech: 'ShapeFab™', techZh: '细胞打印成型', paper: 'shapefab',
    pitch: '用细胞墨水逐层打印成鱼片或鱼排，不含鱼刺。' }],
  beef: [
    { key: 'firm', label: '口感', choices: [['tender', '柔嫩'], ['firm', '紧实']],
      tech: 'FlexScaffold™', techZh: '可调刚度支架', paper: 'scaffold',
      pitch: '细胞在可食用支架上生长。支架越软，成品越嫩；支架越硬，成品越有嚼劲。' },
    { key: 'aroma', label: '烹饪香气', choices: [['base', '基础'], ['plus', '烤肉香增强']],
      tech: 'AromaSwitch™', techZh: '温控风味释放', paper: 'aroma',
      pitch: '风味前体在培养时加入，煎制温度超过 150 ℃ 时释放烤肉香气。' },
    { key: 'shade', label: '颜色', choices: [['light', '浅'], ['deep', '深']],
      tech: 'MyoTone™', techZh: '肌红蛋白调色', paper: 'myotone',
      pitch: '通过调节培养过程中的肌红蛋白含量改变颜色，分浅、深两档。' },
  ],
};

// 冷柜触摸屏上的广告词
export const AD = {
  beef: { slogan: '口感、香气、颜色，三项可选。', copy: '柔嫩或紧实，基础香气或烤肉香增强，浅色或深色。下单后开始培养。' },
  chicken: { slogan: '高蛋白，低脂肪。', copy: '培养鸡胸肉，脂肪含量分三档可选。' },
  pork: { slogan: '肥瘦比例可选。', copy: '脂肪含量 3%–21%，分少脂、适中、丰润三档。' },
  fish: { slogan: '无刺大黄鱼。', copy: '可选鱼片或鱼排，打印成型后培养。' },
};

export const GROWTH = {
  cycle: [[14, '14 天'], [21, '21 天'], [28, '28 天']],
  plan: { std: { label: '标准', x: 1, price: 1 }, a: { label: '配方 A', x: 3, price: 0.82 }, b: { label: '配方 B', x: 4, price: 0.74 } },
  tech: 'Yield+™', techZh: '高产培养配方', paper: 'yield',
  pitch: '28 天后细胞量可达标准配方的 3–4 倍，单价更低。',
};

export const MARQUEE = '培养肉 · 下单后开始培养 · 牛 · 猪 · 鸡 · 大黄鱼 · ';

// 大厅里可以走过去的几个位置（地上的箭头）：pos 是站的地方（x, z），at 是到了以后先看向哪里
export const ROOM_NAV = {
  // 门店的八个点位；路线都走在桌子、吧台和肉柜之间的空地上
  eye: 1.62, fov: 62, pitch: -8, start: 'door',
  path: { mark: 1.7, width: 0.2, radius: 0.6 },
  pace: { speed: 1.85, accel: 1.35, turn: 70 },
  nodes: {
    door:    { name: '门口', at: [0.4, 3.3], face: -6 },
    counter: { name: '吧台', at: [0.4, -0.45] },
    right:   { name: '结算', at: [2.75, 0.1], face: -84 },                                              // 结算、加工间门
    corner:  { name: '告示栏', at: [4.1, -1.3] },                                              // 告示栏
    fridge:  { name: '鲜肉柜', at: [-2.3, -2.15] },
    storage: { name: '仓库门', at: [-4.4, -2.85], face: 108 },                                            // 仓库门
    dining:  { name: '用餐区', at: [-2.1, 2.6] },
    office:  { name: '办公室', at: [-8.0, 3.85], face: -28 },
  },
  routes: [
    { a: 'door', b: 'counter' },
    { a: 'door', b: 'fridge', via: [[0.0, 1.3], [-0.55, -0.6], [-1.75, -1.15]], markA: 1.0 },                            // 进门直接去鲜肉柜
    { a: 'door', b: 'right', via: [[1.9, 2.8], [2.6, 1.9]] },
    { a: 'door', b: 'dining', via: [[-1.0, 2.75]] },
    { a: 'counter', b: 'right' },
    { a: 'right', b: 'corner', via: [[3.7, -0.5]] },
    { a: 'counter', b: 'fridge', via: [[-0.75, -0.85], [-1.75, -1.15]] },
    { a: 'fridge', b: 'storage', via: [[-3.4, -2.65]] },
    { a: 'dining', b: 'office', via: [[-2.5, 3.5], [-3.5, 3.63], [-4.7, 3.66], [-5.6, 3.67], [-6.4, 3.95], [-7.6, 3.95]], radius: 0.4 },
  ],
};

export const HOTSPOTS = [
  { id: 'fridge', label: 'FRESH MEAT · 鲜肉柜 · ', pos: [-2.5, 1.25, -3.5], route: 'fridge',
    marquee: '鲜肉柜 · 四种培养肉 · 可定制 · ' },
  { id: 'brand', label: 'NO KILL · 零屠宰宣传片 · ', pos: [-2.5, 2.62, -3.85], route: 'brand',
    marquee: '品牌宣传片 · ' },
  { id: 'tasting', label: 'TASTING · 窗口试吃 · ', pos: [0.45, 1.3, -1.95], route: 'tasting',
    marquee: '试吃 · 香煎培养牛排 · 扫码评价领券 · ' },
  { id: 'checkout', label: 'PAY · 窗口结算 · ', pos: [2.85, 1.55, -1.95], route: 'checkout',
    marquee: '结算 · 扫码支付 · ', needsOrder: true },
  { id: 'donor', label: 'NOTICE · 熟客须知 · ', pos: [4.15, 1.45, -3.9], route: 'donor',
    marquee: '告示栏 · 供体介绍 · ', subtle: true },
  { id: 'live', label: 'WORKSHOP · 加工间 · ', pos: [4.9, 1.5, -0.3], route: 'lab',
    marquee: '加工间 · 参观请预约 · ' },
  { id: 'warehouse', label: 'STORAGE · 仓库 · ', pos: [-4.4, 1.4, -3.85], route: 'warehouse',
    marquee: '仓库 · 非工作人员勿入 · ', subtle: true },
  { id: 'records', label: 'RECORDS · 供体登记簿 · ', pos: [-9.43, 0.8, 3.12], route: 'records',
    marquee: '办公室 · 供体登记簿 · 档案 · ' },
  { id: 'board', label: 'PLAN · 细胞系周计划 · ', pos: [-7.16, 1.68, 1.95], route: 'board', r: 0.5,
    marquee: '办公室 · 细胞系周计划 · ' },
  { id: 'officewh', label: 'STORAGE · 仓库通道 · ', pos: [-9.5, 1.5, 1.3], route: 'warehouse',
    marquee: '仓库 · 随手关门 · ', subtle: true },
  { id: 'street', label: 'EXIT · 出门 · ', pos: [0.55, 1.5, 4.8], route: 'street',
    marquee: '出门 · ', subtle: true },
];

// ------------------------------------------------------------------ 店外：一家普通的肉铺门面
export const STREET_MARQUEE = '鲜肉 · 冻品 · 熟食 · ';
export const STREET_HOTSPOTS = [
  { id: 'enter', label: 'ENTER · 进店 · ', pos: [-1.1, 1.6, 0.4], route: '',
    marquee: '进店 · ' },
  { id: 'side', label: '02 号门 · 仓库 · ', pos: [6.4, 1.0, 0.4], route: 'warehouse',
    marquee: '02 号门 · 收货 · 仓库 · ' },
];

// ------------------------------------------------------------------ 仓库（交互文字用中文；场景里的牌子、印字保持英文）
export const WH_MARQUEE = '仓库 · 闲人免进 · ';
// 仓库里走动（像街景）：站位 + 相邻关系。每个站位只显示通往相邻站位的箭头（贴在地上），点一下走过去一段；
//   [x, z, 眼睛高度]（月台上 2.75）；边上的第三项是路上要经过的点（楼梯、绕开叉车和防撞柱、穿过货架之间的横通道）
export const WH_NAV = {
  // 七个固定点位。routes = 点位之间画好的路：via 是拐点 [x, z, 地面高度]；markA / markB = 两个方向的路标放在路上第几米（不写就用 path.mark）
  eye: 1.65, fov: 64, pitch: -9, start: 'door',
  path: { mark: 3.2, width: 0.36 },
  pace: { speed: 3.7, stairs: 1.8, accel: 1.9, turn: 74 },                  // 仓库大：走得快一点，但还是人的起步和停步
  nodes: {
    door:  { name: '门口', at: [-1.3, 2.0], face: -22 },   // 门口
    mid:   { name: '主通道', at: [-1.6, -11.6] },            // 主通道中间，两排货架之间
    back:  { name: '细胞库', at: [-1.3, -20.8] },            // 细胞库前
    dock:  { name: '月台', at: [-9.9, -3.2, 1.1], face: 36, pitch: -22 },   // 月台上的楼梯口：往里走、下楼都在眼前
    dock2: { name: '月台里端', at: [-8.95, -20.4, 1.1] },       // 月台里端
    front: { name: '暂存区', at: [7.8, -2.0] },              // 货架外侧：暂存、充电
    side:  { name: '冷冻区', at: [8.9, -14.8] },             // 运输笼、休息角、冷冻区
  },
  routes: [
    { a: 'door', b: 'mid', via: [[-1.0, -1.8], [-1.8, -5.4], [-3.0, -8.6]] },
    { a: 'door', b: 'dock', oneWay: true, via: [[-3.2, -0.6], [-5.5, -3.2], [-6.1, -4.2], [-6.5, -4.2], [-6.82, -4.2, 0.22], [-8.22, -4.2, 1.14], [-8.6, -4.2, 1.1]], markA: 7.5 },   // 上楼
    { a: 'dock', b: 'mid', via: [[-8.6, -4.2, 1.1], [-8.22, -4.2, 1.14], [-6.82, -4.2, 0.22], [-6.5, -4.2], [-5.5, -4.4], [-3.3, -8.4]], markA: 1.35, markB: 4.0 },   // 下楼，往第二排货架走
    { a: 'dock', b: 'dock2', via: [[-9.7, -4.9, 1.1], [-9.4, -6.8, 1.1], [-9.3, -9.4, 1.1], [-9.0, -14.0, 1.1]] },
    { a: 'mid', b: 'back', via: [[-1.5, -15.0], [-1.5, -17.1]] },
    { a: 'door', b: 'front', via: [[-0.1, 2.2], [2.4, 1.6], [6.6, -0.2]] },               // 绕过货架端头
    { a: 'front', b: 'mid', via: [[7.65, -6.2], [6.4, -7.6], [3.8, -8.55], [2.6, -8.7], [2.0, -8.72], [1.5, -8.82], [1.3, -10.2], [-0.2, -10.9]] },   // 穿过两排货架之间
    { a: 'front', b: 'side', via: [[7.75, -5.6], [8.0, -7.6], [8.4, -12.2]] },
    { a: 'side', b: 'back', via: [[9.1, -18.6], [7.6, -19.3], [4.2, -19.3], [1.2, -18.6]] },   // 绕过笼子，左拐
  ],
};
// eye / at / fov：点了之后走近到哪里、看向哪里（到了再出引线标注）
export const WH_HOTSPOTS = [
  { id: 'fbs', view: { mode: 'orbit', az: 55, el: [12, 60] }, label: '冷链收货 · ', pos: [-7.5, 1.15, -1.0], eye: [-5.0, 1.75, 0.7], at: [-7.6, 0.55, -1.15], fov: 50,
    marquee: '冷链收货 · 胎牛血清 · −20 ℃ · ',
    info: [
      { at: [-7.3, 0.55, -0.9], title: '胎牛血清', item: 'fbs' },
    ] },
  { id: 'packing', view: { mode: 'orbit', az: 45, el: [10, 55] }, label: '配货台 · ', pos: [2.0, 1.45, 3.35], eye: [2.9, 1.75, 1.3], at: [2.6, 1.0, 3.5], fov: 50,
    marquee: '订单配货 · 包装耗材 · ',
    info: [
      { at: [1.95, 0.98, 3.5], title: '待发的订单', item: 'order' },
    ] },
  { id: 'cold', view: { mode: 'orbit', az: 40, el: [5, 40] }, label: '细胞库 · ', pos: [-1.5, 2.6, -24.2], eye: [-0.6, 1.75, -18.6], at: [-1.6, 1.6, -24.3], fov: 56,
    marquee: '冷库 · 细胞库 · −196 ℃ · ',
    info: [
      { at: [-1.3, 1.05, -23.4], title: '冻存管', item: 'vial' },
    ] },
  { id: 'freezer', view: { mode: 'track', a: [10.5, 2.1, -16.5], b: [10.5, 2.1, -23.0], look: [0.62, -1.5, 0], u0: 0.3, tilt: 14, fov: 60 }, label: '冷冻区 · ', pos: [11.0, 1.25, -19.3], eye: [8.9, 1.7, -17.4], at: [11.0, 0.7, -19.6], fov: 56,
    marquee: '冷冻区 · −25 ℃ · 冻品 · ',
    info: [
      { at: [11.2, 0.62, -18.5], title: '冻肉', item: 'frozen' },
    ] },
  { id: 'crates', view: { mode: 'orbit', az: 50, el: [10, 45] }, label: '运输笼 · ', pos: [-10.0, 2.9, -15.9], eye: [-8.6, 2.85, -12.8], at: [-10.1, 1.6, -16.2], fov: 54,
    marquee: '卸货月台 · 动物运输笼 · ',
    info: [
      { at: [-9.8, 1.25, -15.2], title: '笼里的耳标', item: 'eartag' },
    ] },
  { id: 'desk', view: { mode: 'orbit', az: 50, el: [15, 60] }, label: '点验台 · ', pos: [-7.9, 1.3, -11.6], eye: [-6.0, 1.75, -10.8], at: [-7.9, 0.8, -11.6], fov: 46, subtle: true,
    marquee: '值班点验台 · 三联收货单 · ',
    info: [
      { at: [-7.9, 0.82, -11.6], title: '收货单', item: 'grn' },
    ] },
  { id: 'office', label: '办公室 · ', pos: [-4.8, 1.5, 3.9], route: 'office',
    marquee: '办公室 · 供体登记簿 · ' },
  { id: 'back', label: '回门店 · ', pos: [-1.3, 1.5, 3.9], route: '',
    marquee: '回到门店 · ' },
];


// 品牌告示上的供体介绍。细胞库里的档案对消费者不公开。
export const DONOR_PR = {
  chicken: '林下散养。',
  beef: '牧场放养。',
  pork: '恒温猪舍饲养。',
  fish: '深海网箱养殖。',
};
export const DONOR_STEPS = [
  ['来源', '合作牧场，已通过动物福利认证。'],
  ['取样', '局部麻醉后取少量肌肉组织*。'],
  ['取样后', '回到牧场继续饲养。'],
];

// ------------------------------------------------------------------ 生长观察室（透明工坊参观廊）
export const LAB_MARQUEE = '加工间参观廊 · 请勿拍照 · ';

// 隔着玻璃看：镜头一直在参观廊这一侧（不穿过玻璃），朝着目标；拖动是沿着玻璃横移、抬头低头
const GLASS_Z = -0.32;
export const LAB_DEEP = 0.9;                                                // 帘子后面整体往里让了这么多（tools/blender/lab_kit.py 的 DEEP）
const DZ = -LAB_DEEP;
const peek = (x, to, fov, { reach = 0.6, tilt = 14, y = 1.7, u0 = 0.5 } = {}) => ({ mode: 'track', a: [x - reach, y, GLASS_Z], b: [x + reach, y, GLASS_Z],
  look: [to[0] - x, to[1] - y, to[2] - GLASS_Z], tilt, fov, zoomFov: [Math.max(18, fov * 0.65), Math.min(70, fov * 1.4)], u0 });

// show：这个标签在哪一幕出现——walk 在参观廊里走、glass 贴着玻璃看实验台、ward 帘子拉开以后
export const LAB_HOTSPOTS = [
  { id: 'glass', label: '隔着玻璃观察 · ', pos: [0.8, 1.75, -1.0], route: 'lab/glass', show: ['walk'],
    marquee: '隔着玻璃观察 · 实验台 · 培养肉 · ',
    view: { mode: 'track', a: [-2.4, 1.64, -0.1], b: [3.9, 1.64, -0.1], look: [0, -0.27, -1], u0: 0.349, u0p: 0.595, tilt: 24, fov: 60, zoomFov: [32, 68] } },
  { id: 'batch', label: '你的批次 · ', pos: [0.55, 1.36, -1.72], route: 'lab/batch', show: ['glass'],
    marquee: '你的批次 · 细胞密度 · 存活率 · 倍增时间 · ' },
  { id: 'bench', label: '培养肉留样 · ', pos: [-1.3, 1.08, -1.78], route: 'lab/bench', show: ['glass'],
    marquee: '显微镜 · 切片架 · 留样托盘 · 交班单 · ', info: [{ at: [-0.55, 0.95, -1.7], title: '交班单', item: 'handover' }], view: peek(-0.42, [-0.78, 0.98, -1.8], 44, { reach: 1.2, tilt: 20, y: 1.72 }) },
  { id: 'ward', label: '拉开帘子 · ', pos: [-0.1, 1.72, -2.95], route: 'lab/ward', show: ['glass'],
    marquee: '帘子后面 · 5 张采样床 · ',
    view: { mode: 'track', a: [-2.6, 1.78, -0.15], b: [4.2, 1.78, -0.15], look: [0, -0.15, -1], u0: 0.353, tilt: 26, fov: 64, zoomFov: [30, 68] } },
  ...[['P-0932', -6.8, 1.1, -1.7], ['B-0417', -4.1, 1.15, -1.5], ['P-0101', 0, 0.95, 0.2], ['P-1077', 4.1, 1.1, 4.5], ['G-0221', 6.8, 1.08, 4.3]].map(([id, x, y, from], i) => (
    { id: 'bed' + i, label: `${id} · `, pos: [x, y + 0.5, -4.2 + DZ], route: 'lab/bed' + i, show: ['ward'], subtle: true,
      marquee: `采样床 ${id} · `, view: peek(from, [x, y, -4.35 + DZ], [24, 34, 34, 32, 25][i], { reach: 0.4, tilt: 11, y: 1.86 }) })),
  { id: 'vessels', label: '高位罐 · ', pos: [1.59, 3.2, -9.2 + DZ], route: 'lab/vessels', show: ['ward'],
    marquee: '高位培养罐 · HT-01 · HT-02 · HT-03 · ', view: peek(-0.3, [1.3, 3.6, -9.8 + DZ], 32, { reach: 2.4, tilt: 9, y: 1.56 }) },
  { id: 'returns', label: '回收角 · ', pos: [8.2, 1.4, -9.0 + DZ], route: 'lab/returns', show: ['ward'], subtle: true,
    marquee: '医疗废品回收角 · ', view: peek(4.3, [8.0, 0.75, -9.4 + DZ], 19, { reach: 0.3, tilt: 8, y: 2.1 }) },
  { id: 'data', label: '生长数据墙 · ', pos: [-4.9, 2.72, 1.6], route: 'lab/data', show: ['walk'],
    marquee: '生长数据墙 · 3,412 个批次 · ' },
  { id: 'cellbank', label: '细胞库 · ', pos: [-4.25, 1.6, -0.84], route: 'lab/cellbank', show: ['walk'], locked: true,
    marquee: '禁止游客进入 · 仅限授权人员 · ' },
  { id: 'notice', label: '参观须知 · ', pos: [4.95, 1.45, 2.45], route: 'lab/notice', show: ['walk'], subtle: true, nopin: true,   // 不放标签：指到墙上那张纸本身就能点
    marquee: '请勿拍照 · 请勿拍打玻璃 · ' },
  { id: 'ask', label: '提问终端 · ', pos: [3.9, 1.62, 0.35], route: 'lab/ask', show: ['walk'], nopin: true,
    marquee: '提问终端 · ' },
  { id: 'exit', label: '返回门店 · ', pos: [3.6, 1.55, 3.9], route: '', show: ['walk'], subtle: true,
    marquee: '返回门店 · ' },
];

// 参观廊里的固定点位：门口，玻璃前左、中、右。views = 停下来只朝这几个方向（沿着一排帘子斜着看进去，前面那支箭头也在画面里）
export const LAB_NAV = {
  eye: 1.62, fov: 62, pitch: -12, start: 'entry',
  path: { mark: 1.8, width: 0.2, radius: 0.7 },
  pace: { speed: 1.8, accel: 1.35, turn: 70 },
  nodes: {
    entry: { name: '入口', at: [1.3, 3.05], views: [-7], pitch: -12 },                      // 一进门正对着整面玻璃
    west:  { name: '显微镜台', at: [-2.6, 0.75], views: [59] },
    mid:   { name: '留样台', at: [0.1, 0.65], views: [-59, 59] },
    east:  { name: '培养罐', at: [2.7, 0.75], views: [-59] },
  },
  routes: [
    { a: 'entry', b: 'west', via: [[0.6, 1.8], [-1.6, 1.7]] },
    { a: 'entry', b: 'mid' },
    { a: 'entry', b: 'east', via: [[2.5, 2.2]] },
    { a: 'west', b: 'mid' },
    { a: 'mid', b: 'east' },
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
  ['主细胞库', 'MCB-07 · 工作细胞库 WCB-07-3'],
  ['储存条件', '−196 ℃ 液氮'],
  ['来源动物', null],
  ['采集方式', null],
  ['采集次数', null],
  ['供体现状', null],
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
    { at: [0.45, 1.07, -1.95], title: '试吃块', item: 'sample' },
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
export const BRAND_FINE = '*1 指培养生产环节不涉及屠宰，不包括供体动物的选育、取样与饲养。 *2 参观范围为细胞培养车间。';
