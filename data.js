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
export const ROOM_STATIONS = [
  { id: 'door', label: '门口', pos: [-0.5, 3.4], at: [-0.5, 1.5, 0] },
  { id: 'dining', label: '用餐区', pos: [-2.3, 3.0], at: [-4.8, 0.9, 0.2] },
  { id: 'fridge', label: '鲜肉柜', pos: [-2.4, -1.95], at: [-2.5, 1.2, -3.6] },
  { id: 'counter', label: '吧台', pos: [0.6, -0.45], at: [0.8, 1.1, -2.6] },
  { id: 'corner', label: '围裙 · 告示栏', pos: [4.0, -1.45], at: [4.5, 1.5, -3.4] },
  { id: 'case', label: '冷藏肉柜', pos: [2.65, 2.25], at: [3.95, 0.8, 2.25] },
  { id: 'doors', label: '加工间', pos: [3.9, -0.35], at: [5.0, 1.4, -0.3] },
  { id: 'storage', label: '仓库门', pos: [-4.2, -2.95], at: [-4.4, 1.3, -4.0] },
  { id: 'office', label: '办公室', pos: [-8.0, 3.85], at: [-10.2, 1.0, 2.2] },
];

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
  { id: 'records', label: 'RECORDS · 供体登记簿 · ', pos: [-9.43, 0.95, 3.12], route: 'records',
    marquee: '办公室 · 供体登记簿 · 档案 · ' },
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
  { id: 'window', label: 'WINDOW · 橱窗 · ', pos: [-4.1, 1.6, 0.3], subtle: true, eye: [-2.6, 1.65, 4.2], at: [-3.0, 1.3, -0.6], fov: 54,
    marquee: '橱窗 · ',
    info: [
      { at: [-4.6, 1.0, -0.6], dx: -300, dy: -160, title: '冷藏肉柜', line: '粉色灯管照着一排牛排和猪排，价签写着当天的价格。' },
      { at: [1.0, 2.4, -0.35], dx: 60, dy: -120, title: '挂着的香肠和火腿', line: '风干香肠、用麻绳捆着的火腿，台面上一台切片机。' },
    ] },
  { id: 'side', label: 'BACK DOOR · 后门 · ', pos: [6.4, 1.6, 0.3], route: 'warehouse',
    marquee: '后门 · 送货通道 · ' },
  { id: 'gas', label: 'CYLINDERS · 气瓶 · ', pos: [3.75, 1.3, 0.5], subtle: true, eye: [5.2, 1.8, 4.0], at: [4.4, 1.8, 0.2], fov: 58,
    marquee: 'CO₂ 气瓶 · 排风口 · ',
    info: [
      { at: [3.75, 1.3, 0.4], dx: -300, dy: -40, title: 'CO₂ 气瓶 × 2', line: '供细胞培养箱使用，箱内需要保持 5% 的二氧化碳浓度。' },
      { at: [6.4, 4.1, 0.3], dx: 60, dy: 10, title: '排风口', line: '加工间的通风和制冷设备在这里排气。' },
    ] },
];

// ------------------------------------------------------------------ 仓库
export const WH_MARQUEE = '仓库 · 非工作人员勿入 · ';
// eye / at / fov：点了之后走近到哪里、看向哪里（到了再出引线标注）
export const WH_HOTSPOTS = [
  { id: 'fbs', label: 'COLD INTAKE · 冷链收货 · ', pos: [-7.6, 1.15, -1.0], eye: [-5.0, 1.75, 0.7], at: [-7.7, 0.55, -1.15], fov: 50,
    marquee: '冷链收货 · 胎牛血清 · −20 ℃ · ',
    info: [
      { at: [-7.4, 0.5, -0.9], dx: 50, dy: -170, title: '拆开的泡沫箱', line: '六瓶试制用胎牛血清（FBS），每瓶 500 mL，瓶身贴着批次标签。加在培养基里促进细胞增殖。FBS 采自屠宰场里妊娠母牛体内的胎牛血液。', fine: '也有无血清培养基，但目前价格更高。' },
      { at: [-8.0, 0.95, -1.4], dx: -300, dy: -40, title: '卧式冷柜 · SAMPLE INTAKE', line: '−20 ℃，收货后血清和生长因子先放这里。另一只泡沫箱封条完好，还没验收。' },
    ] },
  { id: 'packing', label: 'PACKING · 订单配货 · ', pos: [2.0, 1.45, 3.35], eye: [2.9, 1.75, 1.3], at: [2.6, 1.0, 3.5], fov: 50,
    marquee: '订单配货台 · 包装耗材 · ',
    info: [
      { at: [1.95, 0.95, 3.5], dx: -320, dy: -140, title: '订单配货台', line: '封口机的手柄抬着，托盘里是一份待封装的培养牛排（ORDER 014），薄膜揭开了一角，订单贴已经打印好；下层是保温配送袋。', fine: '大厅展示顾客怎么选；这里展示员工怎么把那份选择装进袋子。' },
      { at: [4.7, 1.2, 3.6], dx: 60, dy: -150, title: '包装耗材架', line: '回收再用的香蕉箱、叠放的肉托、真空袋、吸水垫、标签卷、培养袋外箱。开过的箱子盖子往外翻着。' },
    ] },
  { id: 'media', label: 'MEDIA · 培养基 · ', pos: [2.1, 2.5, -3.5], eye: [-1.0, 1.75, -1.4], at: [2.4, 1.3, -3.7], fov: 50,
    marquee: '培养基 · 一次性培养袋 · 支架原料 · ',
    info: [
      { at: [2.3, 0.55, -2.86], dx: -310, dy: -60, title: '一次性培养袋', line: '200 L，装进反应器使用，用完即弃。培养基含氨基酸、葡萄糖、维生素和无机盐，是生产成本中占比最大的部分。' },
      { at: [2.3, 1.95, -4.14], dx: 40, dy: -150, title: '大豆分离蛋白', line: '用来制作可食用支架，细胞附着在支架上生长。' },
    ] },
  { id: 'cold', label: 'CELL BANK · 冷库 · ', pos: [-1.5, 2.6, -24.2], eye: [-0.6, 1.75, -16.6], at: [-1.6, 1.6, -24.3], fov: 56,
    marquee: '冷库 · 细胞库 · −196 ℃ · ',
    info: [
      { at: [-0.6, 3.3, -24.15], dx: 150, dy: -60, title: '细胞库 MCB-07', line: '液氮罐里保存各细胞系的冻存细胞，包括 B-0417 和 P-0932。' },
      { at: [-4.4, 1.2, -23.3], dx: -300, dy: 70, title: '液氮罐', line: '原代肌肉干细胞传代几十次后会衰老。冻存细胞用完后，需要重新从活体动物身上活检取样。', fine: '部分公司使用永生化细胞系，可以减少取样次数。' },
      { at: [-1.3, 1.0, -23.3], dx: 60, dy: 60, title: '交接推车', line: '液氮罐用绑带固定在推车上，从细胞库推去加工间。门边的库位牌写着这一罐放在哪一格。', fine: '加工间里看到的是培养设备，这里看到的是细胞怎样被交接。' },
    ] },
  { id: 'crates', label: 'CRATES · 运输笼 · ', pos: [-10.0, 2.9, -15.9], eye: [-7.4, 2.85, -12.6], at: [-10.1, 1.6, -16.4], fov: 54,
    marquee: '卸货区 · 动物运输笼 · ',
    info: [
      { at: [-9.8, 1.8, -15.2], dx: 80, dy: 50, title: '空运输笼', line: '空的，角落里还剩一点干草。插销插着，挂着返还牌：回收 → 牧场 7 号。' },
      { at: [-11.95, 3.4, -17.0], dx: 70, dy: -50, title: '卸货门 2', line: '通往后街。货车在这里装卸。' },
    ] },
  { id: 'desk', label: 'TALLY · 点验台 · ', pos: [-7.9, 1.3, -11.6], eye: [-5.9, 1.75, -10.7], at: [-7.9, 0.8, -11.6], fov: 46, subtle: true,
    marquee: '值班点验台 · 三联收货单 · ',
    info: [
      { at: [-7.9, 0.8, -11.6], dx: 70, dy: -150, title: '三联收货单', line: '夹在夹板上，圆珠笔没盖帽。白联留仓库，黄联给办公室，粉色底联撕下来交给司机。这里只核对“到了几箱”。', fine: '“来自哪只动物”记在办公室的供体登记簿里。' },
    ] },
  { id: 'returns', label: 'RETURNS · 牧场返箱 · ', pos: [-10.9, 2.7, -19.6], eye: [-7.2, 2.2, -17.6], at: [-11.1, 1.7, -19.6], fov: 52, subtle: true,
    marquee: '牧场送样 · 返箱 · 冷链交接 · ',
    info: [
      { at: [-11.0, 1.5, -19.4], dx: 60, dy: -120, title: '牧场送样与返箱区', line: '空保温箱和待返还的箱子，挂着冷链交接单。箱子送回牧场，下一次活检取下的肌肉样本装在里面运回来。' },
    ] },
  { id: 'office', label: 'OFFICE · 办公室 · ', pos: [-4.8, 1.5, 3.9], route: 'office',
    marquee: '办公室 · 供体登记簿 · ' },
  { id: 'back', label: 'BACK TO STORE · 回店里 · ', pos: [-1.3, 1.5, 3.9], route: '',
    marquee: '回店里 · ' },
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

export const LAB_HOTSPOTS = [
  { id: 'batch', label: 'YOUR BATCH · 你的批次 · ', pos: [0.2, 1.68, -0.6], route: 'lab/batch',
    marquee: '你的批次 · 细胞密度 · 存活率 · 倍增时间 · ' },
  { id: 'hall', label: 'WORKSHOP · 加工间 · ', pos: [1.6, 2.1, -6.0], route: 'lab/hall',
    marquee: '加工间 · 6 台 200 L 反应器 · 5 张采样床 · ' },
  { id: 'data', label: 'DATA WALL · 生长数据墙 · ', pos: [-4.9, 2.72, 1.6], route: 'lab/data',
    marquee: '生长数据墙 · 3,412 个批次 · ' },
  { id: 'cellbank', label: 'CELL BANK · 细胞库 · ', pos: [-4.25, 1.6, -0.84], route: 'lab/cellbank', locked: true,
    marquee: '禁止游客进入 · 仅限授权人员 · ' },
  { id: 'notice', label: '参观须知 · NOTICE · ', pos: [4.95, 1.45, 2.45], route: 'lab/notice', subtle: true,
    marquee: '请勿拍照 · 请勿拍打玻璃 · ' },
  { id: 'ask', label: 'ASK US · 提问终端 · ', pos: [3.9, 1.62, 0.35], route: 'lab/ask',
    marquee: '提问终端 · ' },
  { id: 'exit', label: 'BACK TO STORE · 返回门店 · ', pos: [3.6, 1.55, 3.9], route: '',
    marquee: '返回门店 · ' },
];

// 镜头聚焦的位置（观察室里的“子页面”）
export const LAB_FOCUS = {
  batch: { fov: 25 },
  data: { at: [-4.93, 1.5, 1.6], fov: 24.5 },
  hall: { at: [0.2, 1.15, -5.6], fov: 52 },
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

// 提问终端：预设问题和品牌的标准回答。涉及供体动物的问题不正面回答。
export const ASK = [
  ['这块肉是怎么长出来的？', '细胞在 37 ℃ 的生物反应器里培养 3–4 周，收获后成型、包装。'],
  ['培养基里有什么？', '氨基酸、葡萄糖、维生素、无机盐和生长因子*。', '*具体配方属商业机密。'],
  ['细胞最初是从哪里来的？', '来自合作牧场供体动物的肌肉组织。更多信息请联系客服。'],
  ['供体动物现在还活着吗？', '这个问题已记录，会转交相关部门。'],
  ['一个细胞系能用多久？', '细胞系 B-0417 已使用 1,300 多天。'],
  ['我可以进细胞库看看吗？', '细胞库不对游客开放。批次数据可以在数据墙上查看。'],
];
export const ASK_FALLBACK = '这个问题终端无法回答，已转交客服。';
export const ASK_ANIMAL = /供体|动物|屠宰|牛|猪|鸡|鱼|活检|取样|采集|痛|死|活着|农场|牧场|福利/;

// ------------------------------------------------------------------ 门店：走近之后的标注（像观察室里“你的批次”那样，用引线指向实物）
// at 是三维锚点，dx/dy 是标注框相对锚点的屏幕偏移（像素）
export const CALLOUTS = {
  tasting: [
    { at: [0.1, 1.0, -3.7], dx: -300, dy: -170, title: '香煎培养牛排', line: '五分熟 · 在吧台后面的铁板上现煎 · 细胞系 B-0417' },
    { at: [0.45, 1.07, -1.95], dx: 60, dy: 60, title: '试吃块', line: '每人限取 2 块。' },
  ],
  checkout: [],
  records: [
    { at: [-7.12, 1.5, 1.95], dx: 60, dy: -160, title: '批次白板', line: '四个细胞系这个月的培养进度。G-0221 那一行写着“donor gone”：供体鸡已经出栏。' },
    { at: [-8.62, 1.3, 1.85], dx: -320, dy: -120, title: '档案柜', line: '每个细胞系一格：供体编号、取样记录、发票。有一格标着 CONSENT FORMS（同意书）。', fine: '里面是空白表格。' },
  ],
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
  { big: '24', unit: 'h', small: '加工间全天开放参观<sup>*2</sup>' },
  { big: '细胞来自<br>合作牧场', small: '供体动物在牧场饲养。', poster: 'beef' },
];
export const BRAND_FINE = '*1 指培养生产环节不涉及屠宰，不包括供体动物的选育、取样与饲养。 *2 参观范围为细胞培养车间。';
