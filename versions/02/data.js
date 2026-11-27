// 所有文案和热点都集中在这里，相当于参考网站从 CMS 拉下来的数据。
// 热点位置用三维坐标（x, y, z）表示：换成 360° 全景照片后，方向仍然对应。

export const ORDER = ['chicken', 'beef', 'pork', 'fish'];

export const SPECIES = {
  chicken: {
    zh: '鸡', en: 'CHICKEN', title: '培养鸡胸肉', id: 'G-0221', price: 68,
    lead: '更轻盈的日常蛋白。由已授权供体的肌肉细胞培养而成。',
    donor: '白羽肉鸡 · 雌性 · 2 岁',
  },
  beef: {
    zh: '牛', en: 'BEEF', title: '培养牛排', id: 'B-0417', price: 168,
    lead: '按你的口感、香气和颜色生长的牛排。',
    donor: '荷斯坦公牛 · 3 岁',
  },
  pork: {
    zh: '猪', en: 'PORK', title: '培养猪排', id: 'P-0932', price: 98,
    lead: '肥瘦比例，由你决定。',
    donor: '杜洛克母猪 · 4 岁',
  },
  fish: {
    zh: '大黄鱼', en: 'YELLOW CROAKER', title: '培养大黄鱼', id: 'F-1180', price: 128,
    lead: '无刺、无腥，切成你需要的形态。',
    donor: '养殖大黄鱼 · 2 龄',
  },
};

// 每一项定制背后都有一项“专利技术”，点进去是一篇技术报告（papers.js）
const FAT = {
  key: 'fat', label: '脂肪含量', choices: [['low', '少脂'], ['mid', '适中'], ['high', '丰润']],
  tech: 'FatBlend™', techZh: '脂肪细胞共培养', paper: 'fatblend',
  pitch: '肌肉细胞和脂肪细胞按比例一起培养。滑一下，就从健身餐变成五花肉。',
};
export const OPTIONS = {
  chicken: [FAT],
  pork: [FAT],
  fish: [{ key: 'form', label: '产品形态', choices: [['fillet', '鱼片'], ['steak', '鱼排']],
    tech: 'ShapeFab™', techZh: '细胞打印成型', paper: 'shapefab',
    pitch: '同一批细胞，按你的需要打印成鱼片或鱼排。没有一根刺。' }],
  beef: [
    { key: 'firm', label: '口感', choices: [['tender', '柔嫩'], ['firm', '紧实']],
      tech: 'FlexScaffold™', techZh: '可调刚度支架', paper: 'scaffold',
      pitch: '细胞长在可食用的支架上。软支架长出入口即化的嫩，硬支架长出有嚼劲的紧实。' },
    { key: 'aroma', label: '烹饪香气', choices: [['base', '基础'], ['plus', '烤肉香增强']],
      tech: 'AromaSwitch™', techZh: '温控风味释放', paper: 'aroma',
      pitch: '风味前体预埋在肉里，只在 150 ℃ 以上释放。下锅的那一刻，炭烤香才出现。' },
    { key: 'shade', label: '颜色', choices: [['light', '浅'], ['deep', '深']],
      tech: 'MyoTone™', techZh: '肌红蛋白调色', paper: 'myotone',
      pitch: '调节细胞里的肌红蛋白，从樱花粉到勃艮第红，任你挑选。' },
  ],
};

// 冷柜触摸屏上的广告词
export const AD = {
  beef: { slogan: '一块，会听你话的牛排。', copy: '柔嫩还是紧实，浓郁还是清爽，樱花粉还是勃艮第红。三项专利技术，把选择权交还给你。' },
  chicken: { slogan: '比清晨还轻盈的蛋白质。', copy: '高蛋白、低脂肪，细嫩不柴。脂肪含量，由你一键设定。' },
  pork: { slogan: '肥瘦，由你说了算。', copy: '五花的香，里脊的嫩，不必再二选一。每一块都刚刚好。' },
  fish: { slogan: '没有刺，也不必有海。', copy: '鲜嫩的大黄鱼，无刺、无腥、不含重金属。鱼片还是鱼排，打印成你想要的样子。' },
};

export const GROWTH = {
  cycle: [[14, '14 天'], [21, '21 天'], [28, '28 天']],
  plan: { std: { label: '标准', x: 1, price: 1 }, a: { label: '配方 A', x: 3, price: 0.82 }, b: { label: '配方 B', x: 4, price: 0.74 } },
  tech: 'Yield+™', techZh: '高产培养配方', paper: 'yield',
  pitch: '同样 28 天，细胞量最多提高到 4 倍，价格反而更低。',
};

export const MARQUEE = '今日新鲜培养 · 零屠宰 · 下单即培养 · 每一份都来自同一个细胞系 · ';

export const HOTSPOTS = [
  { id: 'fridge', label: 'SMART FRIDGE · 智能鲜肉柜 · ', pos: [0, 1.25, -3.5], route: 'fridge',
    marquee: '即选即定制 · 四种细胞系 · 下单后开始培养 · ' },
  { id: 'brand', label: 'OUR STORY · 品牌故事 · ', pos: [2.55, 2.0, -3.88], route: 'brand',
    marquee: 'GROWN, NOT RAISED. · 无需饲养 · 无需屠宰 · ' },
  { id: 'pairings', label: 'PAIRINGS · 搭配好物 · ', pos: [-2.75, 1.5, -3.6], route: 'pairings',
    marquee: '烧烤酱 · 香草海盐 · 初榨橄榄油 · 好肉配好料 · ' },
  { id: 'ceramic', label: 'COLLECTION · 牧场陶瓷 · ', pos: [-4.45, 1.25, -1.9], route: 'ceramic',
    marquee: '手工釉面 · 牧场系列 · 限量发售 · ' },
  { id: 'tasting', label: 'FREE TASTING · 今日试吃 · ', pos: [-2.1, 1.35, -0.5], route: 'tasting',
    marquee: '现煎培养牛排 · 免费试吃 · 扫码评价领券 · ' },
  { id: 'merch', label: 'SHOP · 吉祥物周边 · ', pos: [-4.5, 1.6, 1.6], route: 'merch',
    marquee: '牛牛 · 小猪 · 咯咯 · 把牧场带回家 · ' },
  { id: 'live', label: 'WORKSHOP · 透明工坊 · ', pos: [4.9, 1.5, -0.3], route: 'lab',
    marquee: '隔着玻璃，看你的那一份长大 · 24 小时开放 · ' },
  { id: 'checkout', label: 'SELF CHECKOUT · 自助结算 · ', pos: [-3.0, 1.3, 3.0], route: 'checkout',
    marquee: '扫码结算 · 附赠生物所有权证书 · ', needsOrder: true },
  { id: 'donor', label: 'NOTICE · 告示栏 · ', pos: [1.95, 1.45, 4.8], route: 'donor',
    marquee: '认识我们的供体 · ', subtle: true },
];

// 品牌对外讲的供体故事（公关版本）。真实档案在细胞库里，对消费者是涂黑的。
export const DONOR_PR = {
  chicken: '她在林下散养，每天晒足 8 小时太阳。',
  beef: '他在草原上自由奔跑，从不缺少新鲜的牧草。',
  pork: '她住在恒温猪舍，听着音乐长大。',
  fish: '它生活在洁净的深海网箱里。',
};
export const DONOR_STEPS = [
  ['它们从哪里来', '来自通过认证的合作牧场，享有高福利养殖标准。'],
  ['取样是怎样的', '只需一次温和的采集*，就能为成千上万个家庭提供美味。'],
  ['它们现在怎么样', '它们回到了熟悉的牧场，继续快乐地生活。'],
];

// ------------------------------------------------------------------ 生长观察室（透明工坊参观廊）
export const LAB_MARQUEE = '透明工坊 · 看得见，才安心 · 每一份订单都在这里长大 · 参观廊请勿拍照 · ';

export const LAB_HOTSPOTS = [
  { id: 'batch', label: 'YOUR BATCH · 你的批次 · ', pos: [0.2, 1.68, -0.6], route: 'lab/batch',
    marquee: '实时生长数据 · 细胞密度 · 存活率 · 倍增时间 · ' },
  { id: 'hall', label: 'CULTIVATION HALL · 培养车间 · ', pos: [2.2, 3.3, -6.5], route: 'lab/hall',
    marquee: '12 座 2,000 L 培养罐 · 全天候无菌运行 · ' },
  { id: 'data', label: 'DATA WALL · 生长数据墙 · ', pos: [-4.9, 2.72, 1.6], route: 'lab/data',
    marquee: '3,412 个批次 · 每个细胞都在记录之中 · ' },
  { id: 'cellbank', label: 'CELL BANK · 细胞库 · ', pos: [-4.25, 1.6, -0.84], route: 'lab/cellbank', locked: true,
    marquee: '禁止游客进入 · 仅限授权人员 · ' },
  { id: 'notice', label: '参观须知 · NOTICE · ', pos: [4.95, 1.45, 2.45], route: 'lab/notice', subtle: true,
    marquee: '请勿拍照 · 请勿拍打玻璃 · ' },
  { id: 'ask', label: 'ASK US · 提问终端 · ', pos: [3.9, 1.62, 0.35], route: 'lab/ask',
    marquee: '有问必答 · 今日已回答 2,341 个问题 · ' },
  { id: 'exit', label: 'BACK TO STORE · 返回门店 · ', pos: [3.6, 1.55, 3.9], route: '',
    marquee: '回到门店 · 去结算 · ' },
];

// 镜头聚焦的位置（观察室里的“子页面”）
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
  ['主细胞库', 'MCB-07 · 工作细胞库 WCB-07-3'],
  ['储存条件', '−196 ℃ 液氮'],
  ['来源动物', null],
  ['采集方式', null],
  ['采集次数', null],
  ['供体现状', null],
];

// 提问终端：预设问题和品牌的标准回答。和动物有关的问题，都会被礼貌地绕开。
export const ASK = [
  ['这块肉是怎么长出来的？', '我们从优质细胞出发，在 37 ℃ 的培养罐里为它们提供营养，大约 3–4 周就能长成你餐桌上的美味。整个过程你都可以隔着玻璃看到。'],
  ['培养基里有什么？', '我们使用专有的营养配方，包含氨基酸、糖、维生素和生长因子*。', '*具体配方属商业机密。'],
  ['细胞最初是从哪里来的？', '我们的种子细胞来自通过认证的合作牧场的优质供体。如需了解更多，欢迎联系客服。'],
  ['供体动物现在还活着吗？', '感谢你的关注！这个问题已经记录，我们会转交相关部门。'],
  ['一个细胞系能用多久？', '理论上可以长期传代。细胞系 B-0417 已经连续为我们的顾客供应 1,300 多天。'],
  ['我可以进细胞库看看吗？', '为保障生物安全与商业机密，细胞库禁止游客进入。你可以在数据墙上查看所有批次的实时数据。'],
];
export const ASK_FALLBACK = '感谢你的提问！这个问题暂时无法在终端回答，我们已转交客服。';
export const ASK_ANIMAL = /供体|动物|屠宰|牛|猪|鸡|鱼|活检|取样|采集|痛|死|活着|农场|牧场|福利/;

// ------------------------------------------------------------------ 门店：走近之后的标注（像观察室里“你的批次”那样，用引线指向实物）
// at 是三维锚点，dx/dy 是标注框相对锚点的屏幕偏移（像素）
export const CALLOUTS = {
  pairings: [
    { at: [-3.7, 1.84, -3.7], dx: 40, dy: -120, title: '辣椒酱', price: 26, line: '配猪排，越吃越香。', buy: '辣椒酱' },
    { at: [-1.8, 1.47, -3.7], dx: -290, dy: -120, title: '初榨橄榄油', price: 68, line: '冷压初榨，煎鸡胸不粘锅。', buy: '橄榄油' },
    { at: [-3.7, 1.0, -3.7], dx: 40, dy: -30, title: '香草海盐', price: 28, line: '迷迭香和百里香，撒一点，像在牧场里烤肉。', buy: '香草海盐' },
    { at: [-1.8, 0.63, -3.7], dx: -290, dy: 10, title: '烧烤酱 BBQ', price: 32, line: '慢熬 12 小时的烟熏风味，和培养牛排是绝配。', buy: '烧烤酱' },
  ],
  merch: [
    { at: [-4.6, 1.45, 1.1], dx: 60, dy: -70, title: '毛绒公仔 · 牛牛', price: 89, line: '品牌大使。软软的，抱着睡觉刚刚好。', buy: '牛牛' },
    { at: [-4.6, 1.45, 1.6], dx: -60, dy: -160, title: '毛绒公仔 · 小猪', price: 89, line: '最受小朋友欢迎的吉祥物。', buy: '小猪' },
    { at: [-4.6, 1.47, 2.1], dx: -290, dy: -60, title: '毛绒公仔 · 咯咯', price: 79, line: '“每天晒足 8 小时太阳”的那只。', buy: '咯咯' },
    { at: [-4.58, 0.68, 1.1], dx: 90, dy: 20, title: '帆布袋 · GROWN NOT RAISED', price: 59, line: '买肉的时候，记得带上它。', buy: '帆布袋' },
    { at: [-4.6, 0.68, 2.1], dx: -310, dy: 30, note: true, line: '每售出一件周边，我们将捐出 ¥1 用于“动物友好”公益项目*。', fine: '*项目详情以品牌官方公告为准。' },
  ],
  ceramic: [
    { at: [-4.45, 1.1, -3.0], dx: -150, dy: 130, title: '荷斯坦奶牛', price: 129, line: '手工釉面陶瓷 · 牧场系列 No.1', flip: 0 },
    { at: [-4.45, 1.28, -1.9], dx: 110, dy: -170, title: '粉猪', price: 129, line: '手工釉面陶瓷 · 牧场系列 No.2', flip: 1 },
    { at: [-4.45, 1.0, -0.8], dx: 60, dy: 90, title: '白羽母鸡', price: 99, line: '手工釉面陶瓷 · 牧场系列 No.3', flip: 2 },
  ],
  tasting: [
    { at: [-2.1, 1.0, -0.05], dx: 40, dy: -190, title: '香煎培养牛排', line: '五分熟 · 现煎现切 · 细胞系 B-0417' },
    { at: [-2.1, 0.97, -0.75], dx: -300, dy: 90, title: '试吃块', line: '每人限取 2 块。请使用牙签。' },
  ],
  checkout: [],
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
  { big: 'GROWN,<br>NOT RAISED.', small: '无需饲养 · 无需屠宰' },
  { big: '0', unit: '头', small: '动物因你的晚餐被屠宰<sup>*1</sup>' },
  { big: '24', unit: 'h', small: '透明工坊全天开放参观<sup>*2</sup>' },
  { big: '来自阳光牧场的<br>每一个细胞', small: '每一份美味，都始于一段美好的生活。', poster: 'beef' },
];
export const BRAND_FINE = '*1 指培养生产环节不涉及屠宰，不包括供体动物的选育、取样与饲养。 *2 参观范围为细胞培养车间。';
