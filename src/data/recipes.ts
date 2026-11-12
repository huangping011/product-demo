import type { Appliance, Ingredient, MaterialGroup, Recipe, Step, Substitute, Variant, BasisType } from '../types';

/** 以下全部为人工检查的演示菜谱，作者、正文、互动数均为虚构示例，不代表真实小红书笔记。 */
function ing(
  key: string,
  name: string,
  amount: number,
  unit: string,
  group: MaterialGroup,
  opts: Partial<Ingredient> = {},
): Ingredient {
  return { key, name, amount, unit, group, essential: true, allergens: [], ...opts };
}

/** 用量恒显示「适量（按口味）」的材料 */
function loose(key: string, name: string, group: MaterialGroup, opts: Partial<Ingredient> = {}): Ingredient {
  return ing(key, name, 1, '适量', group, { looseAmount: true, essential: false, ...opts });
}

function step(
  id: string,
  title: string,
  text: string,
  setting: string,
  minutes: number,
  doneState: string,
  risk?: string,
  basis?: BasisType,
): Step {
  return { id, title, text, setting, minutes, doneState, risk, basis };
}

const sub = (name: string, note: string, allergens: string[] = []): Substitute => ({ name, note, allergens });

const soySubs = [
  sub('椰子氨基酸调味汁', '不含大豆与小麦，咸度略低，可等量替换'),
  sub('盐 2 g + 清水 15 ml', '只补咸味，成品上色会变浅'),
];

const R1: Recipe = {
  id: 'r1',
  title: '照烧鸡腿｜平底锅 30 分钟',
  subtitle: '酱汁挂得住、鸡皮不破的家常照烧比例',
  author: '小满的厨房',
  authorHandle: '@xiaoman_kitchen（示例账号）',
  cover: { emoji: '🍗', from: '#ffcf9e', to: '#ff8f6b' },
  noteText:
    '下班回家最常做的一道。鸡腿一定要把皮朝下先煎到金黄，再倒酱汁，最后那步收汁别走开。酱汁比例我试了很多次：生抽 15、老抽 5、味淋 15、清水 30（ml），两人份刚好。配一碗米饭，汤汁别浪费。',
  noteSteps: [
    '鸡腿去骨，皮朝下煎到金黄',
    '倒入调好的照烧汁，中小火焖熟',
    '收汁后切条，撒芝麻和葱花',
  ],
  publishedAt: '2026-09-18',
  likes: 2841,
  collects: 1936,
  baseServings: 2,
  servingsBase: 2,
  servingsLabel: '2 人份',
  minutes: 30,
  servingUnit: '人份',
  primaryAppliance: '平底锅',
  appliances: ['平底锅'],
  tags: ['家常菜', '鸡腿', '30 分钟'],
  supportedAppliances: ['平底锅', '电饭煲', '空气炸锅', '烤箱'],
  missingFields: [],
  sourceKind: 'demo',
  sourceNote: '示例菜谱：作者、正文与互动数为人工编写的演示数据；站外无法核验小红书笔记链接，未绑定真实笔记。',
  ingredients: [
    ing('chicken', '去骨鸡腿肉', 2, '块', 'main', { note: '2 块约 300 g' }),
    ing('soy', '生抽', 15, 'ml', 'seasoning', { allergens: ['大豆', '小麦/麸质'], substitutes: soySubs }),
    ing('darkSoy', '老抽', 5, 'ml', 'seasoning', {
      essential: false,
      allergens: ['大豆', '小麦/麸质'],
      substitutes: [sub('省略老抽', '只影响上色，不影响熟成')],
    }),
    ing('mirin', '味淋（或蜂蜜）', 15, 'ml', 'seasoning', {
      substitutes: [sub('蜂蜜 10 ml', '甜度更高，注意后段容易糊锅')],
    }),
    ing('sesame', '熟白芝麻', 2, 'g', 'seasoning', {
      essential: false,
      allergens: ['芝麻'],
      substitutes: [sub('省略白芝麻', '仅影响装饰')],
    }),
    ing('scallion', '小葱', 1, '根', 'main', { essential: false, substitutes: [sub('省略小葱', '可用少量洋葱碎替代香气')] }),
    ing('oil', '食用油', 10, 'ml', 'seasoning', { essential: false, substitutes: [sub('不额外用油', '鸡皮朝下会出油，需使用不粘锅')] }),
    ing('rice', '米饭', 2, '碗', 'staple', { essential: false, substitutes: [sub('省略米饭', '改为配水煮蔬菜')] }),
  ],
  variants: [
    {
      appliance: '平底锅',
      versionName: '原版照烧鸡腿',
      minutes: 30,
      basis: 'author',
      basisNote: '步骤与用量来自原笔记，作者已写明火候与收汁状态。',
      steps: [
        step('s1', '处理鸡腿', '把 {{chicken}} 用厨房纸吸干，两面各划 2 刀，撒 1 g 盐静置。', '常温处理 / 无需加热', 5, '表面无渗水、触感略干', '生鸡肉与熟食砧板分开，处理后洗手', 'author'),
        step('s2', '调照烧汁', '碗中混合 {{soy}}、{{darkSoy}}、{{mirin}} 与 30 ml 清水，搅到无沉淀。', '常温 / 小碗', 2, '酱汁颜色均匀、无结块', undefined, 'author'),
        step('s3', '煎鸡皮', '平底锅倒入 {{oil}} 中火预热 2 分钟，鸡皮朝下放入，中火煎 5 分钟，不要频繁翻动。', '中火 / 平底锅', 7, '鸡皮金黄、边缘微卷', '油面遇水会溅，鸡腿务必擦干', 'author'),
        step('s4', '焖煮收汁', '翻面后倒入照烧汁，转中小火加盖焖 8 分钟，开盖翻面 1 次再收 3 分钟。', '中小火 / 加盖', 11, '酱汁能挂住勺背、鸡肉中心无血水', '计时仅供参考，请确认鸡肉中心完全熟透（无血水、不透明）', 'author'),
        step('s5', '切条装盘', '取出静置 2 分钟，切成 2 cm 宽条，淋锅中余汁，撒 {{sesame}} 与 {{scallion}}，配 {{rice}}。', '常温 / 装盘', 5, '肉汁不大量流出、酱汁均匀裹住切面', undefined, 'author'),
      ],
    },
    {
      appliance: '电饭煲',
      versionName: '电饭煲版照烧鸡腿',
      minutes: 40,
      basis: 'community',
      basisNote: '来自 2 条电饭煲复刻记录的共同做法：以「标准煮饭」一轮替代煎焖，厨房实测记录为示例数据。',
      steps: [
        step('s1', '处理鸡腿', '把 {{chicken}} 吸干水分，两面各划 2 刀，撒 1 g 盐静置。', '常温处理', 5, '表面无渗水', '生鸡肉处理后洗手', 'community'),
        step('s2', '调照烧汁', '碗中混合 {{soy}}、{{darkSoy}}、{{mirin}} 与 30 ml 清水。', '常温 / 小碗', 2, '酱汁颜色均匀', undefined, 'community'),
        step('s3', '入煲焖煮', '内胆刷 {{oil}}，鸡皮朝下平铺，倒入酱汁，选择「标准煮饭」运行一轮（约 30 分钟）。', '电饭煲 / 标准煮饭', 30, '跳闸后开盖有密集小泡、鸡肉中心无血水', '开盖时蒸汽朝向手部和面部，请侧身开启；务必确认鸡肉完全熟透', 'community'),
        step('s4', '收汁切条', '若酱汁偏稀，开盖选择「再加热」5 分钟收浓；取出切条，撒 {{sesame}}、{{scallion}}，配 {{rice}}。', '电饭煲 / 再加热', 8, '酱汁略能挂勺、切面不渗血水', '内胆很烫，取出时垫干布', 'community'),
      ],
    },
    {
      appliance: '空气炸锅',
      versionName: '空气炸锅版照烧鸡腿',
      minutes: 25,
      basis: 'ai',
      basisNote: '按设备特性给出的建议步骤，尚未实测；请以实际熟成状态为准。',
      steps: [
        step('s1', '处理与腌渍', '把 {{chicken}} 吸干，与 {{soy}}、{{mirin}} 拌匀腌 8 分钟。', '常温 / 冷藏更佳', 8, '表面均匀挂上酱色', '腌过生肉的碗不可直接盛熟食', 'ai'),
        step('s2', '预热', '炸篮刷 {{oil}}，180 ℃ 预热 3 分钟。', '空气炸锅 / 180 ℃', 3, '预热提示灯熄灭', undefined, 'ai'),
        step('s3', '烘烤', '鸡皮朝上平铺，180 ℃ 烤 12 分钟，第 8 分钟翻面并刷一次腌料。', '空气炸锅 / 180 ℃', 12, '表面焦糖色、中心无血水', '建议用食物温度计确认中心 ≥ 74 ℃；该温度为本方案给出的参考值', 'ai'),
        step('s4', '装盘', '静置 2 分钟后切条，撒 {{sesame}}、{{scallion}}，配 {{rice}}。', '常温 / 装盘', 4, '切面肉汁清亮', undefined, 'ai'),
      ],
    },
    {
      appliance: '烤箱',
      versionName: '烤箱版照烧鸡腿',
      minutes: 35,
      basis: 'ai',
      basisNote: '按设备特性给出的建议步骤，尚未实测；请以实际熟成状态为准。',
      steps: [
        step('s1', '处理与腌渍', '把 {{chicken}} 吸干，与 {{soy}}、{{darkSoy}}、{{mirin}} 拌匀腌 8 分钟。', '常温 / 烤盘铺锡纸', 8, '表面均匀挂上酱色', '生肉腌料不可直接做蘸料，除非煮沸', 'ai'),
        step('s2', '预热', '烤箱 200 ℃ 上下火预热 10 分钟。', '烤箱 / 200 ℃', 10, '烤箱达到设定温度', undefined, 'ai'),
        step('s3', '烘烤', '鸡皮朝上放入中层，200 ℃ 烤 18 分钟，第 12 分钟刷一次腌料。', '烤箱 / 200 ℃ 中层', 18, '边缘微焦、中心无血水', '建议用食物温度计确认中心 ≥ 74 ℃；该温度为本方案给出的参考值', 'ai'),
        step('s4', '装盘', '静置 2 分钟切条，撒 {{sesame}}、{{scallion}}，配 {{rice}}。', '常温 / 装盘', 4, '切面不渗血水', undefined, 'ai'),
      ],
    },
  ],
};

const R2: Recipe = {
  id: 'r2',
  title: '番茄炒蛋｜先炒蛋还是先炒番茄',
  subtitle: '不加番茄酱也能出浓汁的顺序',
  author: '阿禾的一人食',
  authorHandle: '@ahe_yirencai（示例账号）',
  cover: { emoji: '🍅', from: '#ffd7a8', to: '#ff7e79' },
  noteText: '番茄要先用小火炒到出沙，再把半熟的蛋倒回去。盐分两次放，番茄里一次、蛋液里一次。全程别用大火，蛋会老。原笔记没写具体时间，我按自己习惯补了一下。',
  noteSteps: ['番茄切块小火炒出沙', '蛋液另锅炒到半凝固', '回锅合炒调味'],
  publishedAt: '2026-08-30',
  likes: 5120,
  collects: 3402,
  baseServings: 2,
  servingsBase: 2,
  servingsLabel: '2 人份',
  minutes: 15,
  servingUnit: '人份',
  primaryAppliance: '炒锅',
  appliances: ['炒锅'],
  tags: ['一人食', '快手', '家常菜'],
  sourceKind: 'demo',
  sourceNote: '示例菜谱：作者、正文与互动数为人工编写的演示数据；站外无法核验小红书笔记链接，未绑定真实笔记。',
  supportedAppliances: ['炒锅', '平底锅', '微波炉'],
  missingFields: ['预计耗时'],
  ingredients: [
    ing('tomato', '番茄', 2, '个', 'main', { note: '2 个约 300 g' }),
    ing('egg', '鸡蛋', 3, '个', 'main', { allergens: ['蛋类'], substitutes: [sub('内酯豆腐 200 g', '不含蛋类，口感更软，需减少翻动')] }),
    ing('scallion', '小葱', 1, '根', 'main', { essential: false, substitutes: [sub('省略小葱', '仅影响香气')] }),
    ing('sugar', '白糖', 5, 'g', 'seasoning', { essential: false, substitutes: [sub('省略白糖', '番茄成熟度足够时可不加')] }),
    ing('salt', '盐', 3, 'g', 'seasoning'),
    ing('oil', '食用油', 20, 'ml', 'seasoning', { substitutes: [sub('减至 10 ml 并使用不粘锅', '少油版本，需降低火力')] }),
    ing('rice', '米饭', 2, '碗', 'staple', { essential: false, substitutes: [sub('省略米饭', '改为直接佐餐')] }),
  ],
  variants: [
    {
      appliance: '炒锅',
      versionName: '原版番茄炒蛋',
      minutes: 15,
      basis: 'author',
      basisNote: '炒制顺序与状态来自原笔记；原笔记未写耗时，15 分钟为演示结构化补充。',
      steps: [
        step('s1', '备料', '{{tomato}} 切 2 cm 块，{{egg}} 打散加 1 g 盐，{{scallion}} 切花。', '常温 / 砧板', 3, '蛋液无成块蛋白', undefined, 'author'),
        step('s2', '炒蛋', '锅中放 {{oil}} 的一半，中火倒入蛋液，凝固到七成即盛出。', '中火 / 炒锅', 3, '蛋块边缘凝固、中心仍湿润', undefined, 'author'),
        step('s3', '炒番茄出沙', '余油下番茄，加 {{sugar}} 与 1 g 盐，小火压炒 5 分钟。', '小火 / 炒锅', 5, '锅底出现浓稠红色汤汁', undefined, 'author'),
        step('s4', '合炒调味', '倒回鸡蛋，加剩余盐翻 1 分钟，撒葱花，配 {{rice}}。', '小火 / 炒锅', 2, '蛋块裹上番茄汁、汤汁不稀', undefined, 'author'),
      ],
    },
    {
      appliance: '平底锅',
      versionName: '平底锅版番茄炒蛋',
      minutes: 16,
      basis: 'community',
      basisNote: '来自 1 条平底锅复刻记录：受热面积更大，番茄需多加 10 ml 水防干。',
      steps: [
        step('s1', '备料', '{{tomato}} 切块，{{egg}} 打散加 1 g 盐，{{scallion}} 切花。', '常温 / 砧板', 3, '蛋液均匀', undefined, 'community'),
        step('s2', '炒蛋', '{{oil}} 取一半，中火摊成蛋饼后铲成大块盛出。', '中火 / 平底锅', 3, '蛋块外层凝固、内部湿润', undefined, 'community'),
        step('s3', '炒番茄', '余油下番茄与 {{sugar}}，加 10 ml 清水，中小火压炒 6 分钟。', '中小火 / 平底锅', 6, '汤汁浓稠、番茄皮自然脱落', undefined, 'community'),
        step('s4', '合炒', '倒回蛋块，加剩余盐翻匀 2 分钟，撒葱花，配 {{rice}}。', '小火 / 平底锅', 2, '汤汁挂住蛋块', undefined, 'community'),
      ],
    },
    {
      appliance: '微波炉',
      versionName: '微波炉版番茄炒蛋',
      minutes: 12,
      basis: 'ai',
      basisNote: '按设备特性给出的建议步骤，尚未实测；务必使用微波适用容器。',
      steps: [
        step('s1', '备料', '{{tomato}} 切小块，{{egg}} 在微波适用碗中打散，加 1 g 盐与 20 ml 清水搅匀。', '常温 / 微波碗', 3, '蛋液无成块蛋白', '鸡蛋必须打散，禁止带壳或整蛋微波加热', 'ai'),
        step('s2', '一次加热', '碗口松盖留缝，600 W 加热 3 分钟，取出搅拌一次。', '微波炉 / 600 W', 3, '边缘开始凝固、中心仍流动', '容器必须标注微波适用；取出时碗体较烫', 'ai'),
        step('s3', '二次加热', '加入番茄块、{{sugar}} 与 {{oil}} 的一半，搅拌后 600 W 再加热 3 分钟。', '微波炉 / 600 W', 3, '番茄出汁、蛋块完全凝固', '确认蛋液完全凝固，无流动液体', 'ai'),
        step('s4', '调味', '拌入剩余盐与 {{scallion}}，静置 1 分钟，配 {{rice}}。', '常温 / 静置', 2, '汤汁均匀、无生蛋液', undefined, 'ai'),
      ],
    },
  ],
};

const R3: Recipe = {
  id: 'r3',
  title: '微波炉虾仁蒸蛋｜宿舍也能做',
  subtitle: '1 : 1.5 的蛋水比，表面不起蜂窝',
  author: '米粒同学',
  authorHandle: '@mili_dorm（示例账号）',
  cover: { emoji: '🍮', from: '#ffe2b0', to: '#ffb06b' },
  noteText: '没有蒸锅也能吃上蒸蛋。鸡蛋和温水按 1 : 1.5，过筛后包保鲜膜扎几个孔，微波炉中火分两段加热。虾仁最后两分钟再放，不会老。',
  noteSteps: ['蛋液加温水打散过筛', '包膜扎孔微波加热', '放虾仁再加热，淋生抽香油'],
  publishedAt: '2026-10-02',
  likes: 1678,
  collects: 1204,
  baseServings: 1,
  servingsBase: 1,
  servingsLabel: '1 人份',
  minutes: 12,
  servingUnit: '人份',
  primaryAppliance: '微波炉',
  appliances: ['微波炉'],
  tags: ['宿舍', '微波炉', '低油'],
  sourceKind: 'demo',
  sourceNote: '示例菜谱：作者、正文与互动数为人工编写的演示数据；站外无法核验小红书笔记链接，未绑定真实笔记。',
  supportedAppliances: ['微波炉', '蒸锅'],
  missingFields: [],
  ingredients: [
    ing('egg', '鸡蛋', 2, '个', 'main', { allergens: ['蛋类'], substitutes: [sub('内酯豆腐 200 g', '不含蛋类，改为豆腐羹做法，无需打散')] }),
    ing('shrimp', '虾仁', 100, 'g', 'main', { essential: false, allergens: ['虾蟹/甲壳类'], substitutes: [sub('鸡胸肉丁 80 g', '不含甲壳类，需延长加热至完全熟透'), sub('省略虾仁', '改为纯蒸蛋')] }),
    ing('salt', '盐', 2, 'g', 'seasoning'),
    ing('soy', '生抽', 5, 'ml', 'seasoning', { essential: false, allergens: ['大豆', '小麦/麸质'], substitutes: [sub('盐 1 g + 温水 5 ml', '不含大豆与小麦，颜色变浅')] }),
    ing('sesameOil', '香油', 3, 'ml', 'seasoning', { essential: false, allergens: ['芝麻'], substitutes: [sub('省略香油', '不影响熟成')] }),
    ing('scallion', '小葱', 1, '根', 'main', { essential: false, substitutes: [sub('省略小葱', '仅影响香气')] }),
  ],
  variants: [
    {
      appliance: '微波炉',
      versionName: '原版微波炉虾仁蒸蛋',
      minutes: 12,
      basis: 'author',
      basisNote: '蛋水比、分段加热与完成状态来自原笔记。',
      steps: [
        step('s1', '调蛋液', '{{egg}} 打散，加 180 ml 约 40 ℃ 温水与 {{salt}}，过筛倒入微波适用深碗。', '常温 / 过筛', 3, '蛋液无泡沫、无絮状物', '禁止使用密封容器或整蛋直接微波', 'author'),
        step('s2', '一次加热', '碗口盖微波专用盖留缝，500 W 加热 4 分钟。', '微波炉 / 500 W', 4, '表面周边凝固、中心轻微晃动', '取出时碗体烫，使用隔热手套', 'author'),
        step('s3', '加虾仁再加热', '铺上 {{shrimp}}，500 W 再加热 3 分钟。', '微波炉 / 500 W', 3, '虾仁变粉红不透明、蛋羹中心凝固', '确认虾仁与蛋液完全熟透', 'author'),
        step('s4', '调味', '淋 {{soy}} 与 {{sesameOil}}，撒 {{scallion}}，静置 1 分钟。', '常温 / 装碗', 2, '表面平整、无流动蛋液', undefined, 'author'),
      ],
    },
    {
      appliance: '蒸锅',
      versionName: '蒸锅版虾仁蒸蛋',
      minutes: 18,
      basis: 'community',
      basisNote: '来自 1 条蒸锅复刻记录：水开后转中小火，避免蜂窝。',
      steps: [
        step('s1', '调蛋液', '{{egg}} 打散，加 180 ml 温水与 {{salt}}，过筛后盖耐高温盘。', '常温 / 过筛', 3, '蛋液无泡沫', undefined, 'community'),
        step('s2', '蒸制', '水开后放入蒸锅，转中小火蒸 10 分钟。', '中小火 / 蒸锅', 10, '表面基本凝固、中心轻晃', '开盖时蒸汽朝向手部，请侧身开启', 'community'),
        step('s3', '加虾仁', '铺上 {{shrimp}}，继续蒸 3 分钟。', '中小火 / 蒸锅', 3, '虾仁变粉红不透明', undefined, 'community'),
        step('s4', '调味', '淋 {{soy}}、{{sesameOil}}，撒 {{scallion}}。', '常温 / 装碗', 2, '蛋羹无蜂窝、无流动液体', undefined, 'community'),
      ],
    },
  ],
};

const R4: Recipe = {
  id: 'r4',
  title: '空气炸锅蒜香鸡翅',
  subtitle: '不用裹粉也能有脆皮',
  author: '周末炸厨房',
  authorHandle: '@weekend_fryer（示例账号）',
  cover: { emoji: '🍖', from: '#ffd39b', to: '#e9784f' },
  noteText: '鸡翅两面划刀，蒜末、生抽、蜂蜜抓匀腌 20 分钟以上。炸篮别叠放，200 ℃ 中途翻一次。出锅前撒蒜末再烤 1 分钟，香味完全不一样。',
  noteSteps: ['鸡翅划刀腌 20 分钟', '炸篮平铺 200 ℃ 烤', '中途翻面，出锅前补蒜末'],
  publishedAt: '2026-07-11',
  likes: 3906,
  collects: 2770,
  baseServings: 2,
  servingsBase: 2,
  servingsLabel: '2 人份',
  minutes: 35,
  servingUnit: '人份',
  primaryAppliance: '空气炸锅',
  appliances: ['空气炸锅'],
  tags: ['空气炸锅', '鸡翅', '下饭菜'],
  sourceKind: 'demo',
  sourceNote: '示例菜谱：作者、正文与互动数为人工编写的演示数据；站外无法核验小红书笔记链接，未绑定真实笔记。',
  supportedAppliances: ['空气炸锅', '烤箱', '平底锅'],
  missingFields: [],
  ingredients: [
    ing('wing', '鸡中翅', 8, '个', 'main'),
    ing('garlic', '大蒜', 4, '瓣', 'main', { essential: false, substitutes: [sub('蒜粉 3 g', '风味接近，避免后段烤糊')] }),
    ing('soy', '生抽', 15, 'ml', 'seasoning', { allergens: ['大豆', '小麦/麸质'], substitutes: soySubs }),
    ing('honey', '蜂蜜', 10, 'ml', 'seasoning', { essential: false, substitutes: [sub('白糖 8 g + 清水 5 ml', '甜度接近，上色略浅')] }),
    ing('oil', '食用油', 5, 'ml', 'seasoning', { essential: false, substitutes: [sub('省略食用油', '鸡翅自身会出油')] }),
    ing('salt', '盐', 2, 'g', 'seasoning'),
  ],
  variants: [
    {
      appliance: '空气炸锅',
      versionName: '原版空气炸锅蒜香鸡翅',
      minutes: 35,
      basis: 'author',
      basisNote: '腌制时间、温度与翻面时机来自原笔记。',
      steps: [
        step('s1', '腌制', '{{wing}} 两面各划 2 刀，与 {{garlic}} 一半、{{soy}}、{{honey}}、{{salt}} 抓匀，冷藏腌 20 分钟。', '冷藏 / 0–4 ℃', 20, '表面均匀挂料、碗底无明显积液', '生鸡肉腌料不可直接做蘸料', 'author'),
        step('s2', '预热平铺', '炸篮刷 {{oil}}，200 ℃ 预热 3 分钟，鸡翅单层平铺不重叠。', '空气炸锅 / 200 ℃', 3, '预热完成提示', undefined, 'author'),
        step('s3', '烘烤翻面', '200 ℃ 烤 12 分钟，取出翻面再烤 8 分钟。', '空气炸锅 / 200 ℃', 20, '表面金棕、筷子插入无血水渗出', '确认鸡肉中心完全熟透，计时仅为参考', 'author'),
        step('s4', '补蒜出锅', '撒剩余蒜末再烤 1 分钟，取出静置 2 分钟。', '空气炸锅 / 200 ℃', 3, '蒜末微黄、香气明显', undefined, 'author'),
      ],
    },
    {
      appliance: '烤箱',
      versionName: '烤箱版蒜香鸡翅',
      minutes: 40,
      basis: 'community',
      basisNote: '来自 1 条烤箱复刻记录：上下火 210 ℃，烤盘垫架更利于脆皮。',
      steps: [
        step('s1', '腌制', '{{wing}} 划刀，与 {{garlic}} 一半、{{soy}}、{{honey}}、{{salt}} 抓匀冷藏 20 分钟。', '冷藏 / 0–4 ℃', 20, '表面均匀挂料', '生鸡肉腌料需煮沸才可复用', 'community'),
        step('s2', '预热', '烤箱 210 ℃ 上下火预热 10 分钟，烤盘铺锡纸并放烤架。', '烤箱 / 210 ℃', 10, '达到设定温度', undefined, 'community'),
        step('s3', '烘烤', '鸡翅放烤架，中层烤 18 分钟，第 12 分钟翻面。', '烤箱 / 210 ℃ 中层', 18, '边缘微焦、无血水渗出', '确认鸡肉中心完全熟透', 'community'),
        step('s4', '补蒜', '撒剩余蒜末再烤 2 分钟，取出静置 2 分钟，刷 {{oil}}。', '烤箱 / 210 ℃', 4, '蒜末微黄', undefined, 'community'),
      ],
    },
    {
      appliance: '平底锅',
      versionName: '平底锅版蒜香鸡翅',
      minutes: 35,
      basis: 'ai',
      basisNote: '按设备特性给出的建议步骤，尚未实测；请延长受热并确认熟透。',
      steps: [
        step('s1', '腌制', '{{wing}} 划刀，与 {{soy}}、{{honey}}、{{salt}} 抓匀冷藏 20 分钟。', '冷藏 / 0–4 ℃', 20, '表面均匀挂料', undefined, 'ai'),
        step('s2', '煎制', '平底锅放 {{oil}}，中小火鸡皮朝下煎 8 分钟，翻面再煎 6 分钟，加盖。', '中小火 / 加盖', 14, '两面金棕、筷子插入无血水', '建议用食物温度计确认中心 ≥ 74 ℃', 'ai'),
        step('s3', '收味', '加 {{garlic}} 与 20 ml 清水，加盖焖 4 分钟，开盖收干。', '中小火 / 加盖', 5, '锅中无多余汤汁、蒜末出香', undefined, 'ai'),
        step('s4', '装盘', '关火静置 2 分钟再装盘。', '常温 / 装盘', 2, '肉汁清亮', undefined, 'ai'),
      ],
    },
  ],
};

const R5: Recipe = {
  id: 'r5',
  title: '葱油拌面｜一碗到底',
  subtitle: '葱段分两次下，香味不苦',
  author: '面面俱到',
  authorHandle: '@noodle_daily（示例账号）',
  cover: { emoji: '🍜', from: '#ffe0a3', to: '#e9a45c' },
  noteText: '小葱切长段，葱白先下、葱绿后下，小火慢慢熬到微焦。酱汁用生抽、老抽、糖调好，面煮好过一下温水再拌。原笔记没写份量，我按一人份补了比例。',
  noteSteps: ['小火熬葱油', '煮面', '拌酱汁'],
  publishedAt: '2026-06-24',
  likes: 7321,
  collects: 5980,
  baseServings: 1,
  servingsBase: 1,
  servingsLabel: '1 人份（原笔记未提供，演示补充）',
  minutes: 20,
  servingUnit: '人份',
  primaryAppliance: '炒锅',
  appliances: ['炒锅', '煮锅'],
  tags: ['一人食', '面食', '素食可调整'],
  sourceKind: 'demo',
  sourceNote: '示例菜谱：作者、正文与互动数为人工编写的演示数据；站外无法核验小红书笔记链接，未绑定真实笔记。',
  supportedAppliances: ['炒锅', '平底锅', '煮锅'],
  missingFields: ['份量'],
  ingredients: [
    ing('noodle', '细面条', 200, 'g', 'staple', { allergens: ['小麦/麸质'], substitutes: [sub('无麸质米线 200 g', '不含小麦，煮制时间按包装说明')] }),
    ing('scallion', '小葱', 6, '根', 'main'),
    ing('oil', '食用油', 60, 'ml', 'seasoning', { substitutes: [sub('减至 35 ml', '少油版本，葱香会变淡')] }),
    ing('soy', '生抽', 20, 'ml', 'seasoning', { allergens: ['大豆', '小麦/麸质'], substitutes: soySubs }),
    ing('darkSoy', '老抽', 10, 'ml', 'seasoning', { essential: false, allergens: ['大豆', '小麦/麸质'], substitutes: [sub('省略老抽', '颜色变浅')] }),
    ing('sugar', '白糖', 8, 'g', 'seasoning', { essential: false, substitutes: [sub('省略白糖', '酱汁回甘减弱')] }),
  ],
  variants: [
    {
      appliance: '炒锅',
      versionName: '原版葱油拌面',
      minutes: 20,
      basis: 'author',
      basisNote: '葱白葱绿分次下、完成状态来自原笔记；份量比例为演示结构化补充（原笔记未提供份量）。',
      steps: [
        step('s1', '切葱调汁', '{{scallion}} 切 5 cm 长段，葱白葱绿分开；碗中混合 {{soy}}、{{darkSoy}}、{{sugar}}。', '常温 / 砧板', 3, '酱汁无糖粒', undefined, 'author'),
        step('s2', '熬葱油', '冷锅倒入 {{oil}}，下葱白小火熬 8 分钟，再加葱绿熬 4 分钟。', '小火 / 炒锅', 12, '葱段呈深琥珀色但未发黑', '油温升高后会溅，保持小火；葱段发黑立即离火', 'author'),
        step('s3', '煮面', '另锅水开下 {{noodle}}，按包装时间煮（通常 3–4 分钟），捞出过温水。', '大火 / 煮锅', 5, '面条能夹断、中心无白芯', undefined, 'author'),
        step('s4', '拌面', '酱汁碗中舀入 2 勺热葱油，放入面条拌匀，铺上葱段。', '常温 / 拌匀', 2, '每根面条均匀挂酱、碗底无积液', undefined, 'author'),
      ],
    },
    {
      appliance: '平底锅',
      versionName: '平底锅版葱油拌面',
      minutes: 22,
      basis: 'community',
      basisNote: '来自 1 条平底锅复刻记录：锅底更宽，油可减至 45 ml。',
      steps: [
        step('s1', '切葱调汁', '{{scallion}} 切段分葱白葱绿，混合 {{soy}}、{{darkSoy}}、{{sugar}}。', '常温 / 砧板', 3, '酱汁无糖粒', undefined, 'community'),
        step('s2', '熬葱油', '{{oil}} 取 45 ml，冷锅下葱白小火 9 分钟，加葱绿 4 分钟。', '小火 / 平底锅', 13, '葱段琥珀色、油面细密小泡', '葱段发黑立即离火', 'community'),
        step('s3', '煮面', '水开下 {{noodle}} 煮 3–4 分钟，过温水。', '大火 / 煮锅', 5, '面条中心无白芯', undefined, 'community'),
        step('s4', '拌面', '热油激入酱汁，拌入面条，铺葱段。', '常温 / 拌匀', 2, '面条均匀挂酱', undefined, 'community'),
      ],
    },
    {
      appliance: '煮锅',
      versionName: '煮锅极简版葱油拌面',
      minutes: 18,
      basis: 'ai',
      basisNote: '按单锅条件给出的建议步骤，尚未实测；需另备耐热小碗盛热油。',
      steps: [
        step('s1', '煮面', '煮锅水开下 {{noodle}}，按包装时间煮 3–4 分钟，捞出过温水。', '大火 / 煮锅', 5, '面条中心无白芯', undefined, 'ai'),
        step('s2', '调汁', '{{scallion}} 切段，碗中混合 {{soy}}、{{darkSoy}}、{{sugar}}。', '常温 / 砧板', 3, '酱汁无糖粒', undefined, 'ai'),
        step('s3', '热油激香', '同一煮锅擦干，倒入 {{oil}} 与葱白，小火 6 分钟后下葱绿 3 分钟。', '小火 / 煮锅', 9, '葱段微焦、油面有香气', '锅体需完全擦干再倒油，避免溅油；热油倒入碗中时使用隔热手套', 'ai'),
        step('s4', '拌面', '热油连葱段浇入酱汁碗，拌入面条。', '常温 / 拌匀', 2, '面条均匀挂酱', undefined, 'ai'),
      ],
    },
  ],
};

/**
 * 主推用例：山药玉米排骨汤。
 * 来源为用户提供的菜谱图片，作者名取自入口 A 笔记页；
 * 原图信息逐字录入，原文外链无法核验，因此不绑定外链。
 */
const R6: Recipe = {
  id: 'r6',
  title: '山药玉米排骨汤',
  subtitle: '清甜不腻的家常炖汤 · 用户提供的菜谱图片',
  author: '食味人间小记',
  authorHandle: '入口 A 笔记页展示的账号',
  cover: { emoji: '🍲', from: '#ffe9c7', to: '#f4b96a', image: './images/soup-yumi-yao.jpg' },
  noteText:
    '原图标注 2–3 人份。用料：排骨 350g、铁棍山药半根、甜玉米 1 根、胡萝卜半根、姜 3 片、盐适量、料酒 1 勺。做法：排骨加姜和料酒焯水；转砂锅加热水炖 40 分钟；加玉米和胡萝卜再炖 20 分钟；最后加山药炖 15–20 分钟，出锅前加盐。',
  noteSteps: [
    '排骨加姜 3 片和料酒 1 勺，冷水下锅焯水，撇净浮沫捞出',
    '转砂锅，加足量热水，炖 40 分钟',
    '加玉米段和胡萝卜块，再炖 20 分钟',
    '最后加山药，炖 15–20 分钟，出锅前加盐',
  ],
  publishedAt: '2026-11-12',
  likes: 0,
  collects: 0,
  baseServings: 2.5,
  servingsBase: 2.5,
  servingsLabel: '2–3 人份（按 2.5 人份估算）',
  minutes: 80,
  servingUnit: '人份',
  primaryAppliance: '砂锅',
  appliances: ['砂锅'],
  tags: ['主推', '炖汤', '清甜', '用户图片'],
  supportedAppliances: ['砂锅', '煮锅', '电饭煲', '高压锅'],
  missingFields: [],
  sourceKind: 'user-photo',
  sourceNote: '本用例来自用户提供的菜谱图片，作者名取自入口 A 笔记页（食味人间小记）；图片信息已逐字录入，做法与用量以原图为准；原文外链无法核验，因此不绑定外链。',
  ingredients: [
    ing('porkRibs', '排骨', 350, 'g', 'main', { note: '原图 350 g（2–3 人份）', substitutes: [sub('鸡骨架 / 鸡腿肉 300 g', '汤更清淡，炖煮时间可略减'), sub('纯素版：玉米胡萝卜加量', '无肉香，汤体更轻，需接受口味差异')] }),
    ing('yam', '铁棍山药', 0.5, '根', 'main', { substitutes: [sub('普通山药 / 脆山药', '口感更脆，久炖不易散；铁棍山药更面更糯')] }),
    ing('corn', '甜玉米', 1, '根', 'main', { substitutes: [sub('糯玉米', '汤的甜味可能变淡，玉米口感更糯')] }),
    ing('carrot', '胡萝卜', 0.5, '根', 'main', { essential: false, substitutes: [sub('省略胡萝卜', '汤色略浅，甜味略降，不影响成立')] }),
    ing('ginger', '姜', 3, '片', 'main', { essential: false, substitutes: [sub('省略姜', '去腥力减弱，焯水步骤需更彻底撇沫')] }),
    loose('salt', '盐', 'seasoning', { essential: true }),
    ing('cookingWine', '料酒', 1, '勺', 'seasoning', { essential: false, substitutes: [sub('省略料酒', '排骨气味可能更明显，焯水需撇净浮沫弥补')] }),
  ],
  variants: [
    {
      appliance: '砂锅',
      versionName: '原版砂锅炖汤',
      minutes: 80,
      basis: 'author',
      basisNote: '步骤与用量来自用户提供的菜谱图片原文；图片标注 2–3 人份，系统按 2.5 人份估算基准换算用量。',
      steps: [
        step('s1', '焯水', '{{porkRibs}} 冷水下锅，加 {{ginger}} 与 {{cookingWine}}，大火煮开撇净浮沫，捞出用温水冲净。', '大火 / 焯水锅', 8, '水面浮沫撇净、排骨表面无血沫', '焯水后用温水冲洗，冷水会让肉质收紧发柴', 'author'),
        step('s2', '炖排骨', '排骨转入砂锅，一次性加足热水（没过排骨约 3 cm），大火烧开转小火炖 40 分钟。', '小火 / 砂锅加盖', 40, '汤面保持微沸、排骨用筷可插入但不脱骨', '中途尽量不添水；确需添水只加热水', 'author'),
        step('s3', '加玉米胡萝卜', '加入 {{corn}} 段与 {{carrot}} 块，继续小火炖 20 分钟。', '小火 / 砂锅加盖', 20, '玉米变亮、胡萝卜边缘变软、汤色金黄', undefined, 'author'),
        step('s4', '加山药收尾', '加入 {{yam}} 块，炖 15–20 分钟至山药粉糯，出锅前加 {{salt}}。', '小火 / 砂锅', 18, '山药边角圆润、筷子可轻松夹断，汤有清甜香', '山药黏液可能致手痒，削皮建议戴手套；盐最后放，过早放盐肉易柴', 'author'),
      ],
      flavorImpact: ['原版：砂锅透气、蒸发适中，汤色清亮、味道最接近原图。'],
    },
    {
      appliance: '煮锅',
      versionName: '煮锅版（预设适配说明）',
      minutes: 75,
      basis: 'ai',
      basisNote: '预设适配说明：煮锅与砂锅炖煮逻辑一致，只是保温性稍差；以下影响已对照原版标注，尚未实测。',
      steps: [
        step('s1', '焯水', '{{porkRibs}} 冷水下锅，加 {{ginger}} 与 {{cookingWine}}，煮开撇沫，温水冲净。', '大火 / 焯水锅', 8, '浮沫撇净、排骨无血沫', undefined, 'ai'),
        step('s2', '炖排骨', '排骨入煮锅加热水，烧开后转最小火，锅盖留缝，炖 40 分钟。', '最小火 / 锅盖留缝', 40, '汤面微微冒泡、排骨可插入', '煮锅蒸发比砂锅大，水量比砂锅版多加 1 成；汤味可能略浓于原版', 'ai'),
        step('s3', '加玉米胡萝卜', '下 {{corn}} 与 {{carrot}}，再炖 20 分钟。', '最小火 / 加盖留缝', 20, '玉米变亮、胡萝卜变软', undefined, 'ai'),
        step('s4', '加山药收尾', '下 {{yam}} 炖 15 分钟，出锅前 {{salt}} 调味。', '最小火', 15, '山药粉糯、汤清甜', undefined, 'ai'),
      ],
      adaptation: ['砂锅 → 煮锅：保温性略差，火候更敏感，需全程最小火并留缝防溢。'],
      flavorImpact: ['相对原版：蒸发略多，汤味可能略浓；若补热水及时，整体差异不大。'],
    },
    {
      appliance: '电饭煲',
      versionName: '电饭煲版（预设适配说明）',
      minutes: 95,
      basis: 'ai',
      basisNote: '预设适配说明：需要有煲汤/炖煮功能的电饭煲；以下影响已对照原版标注，尚未实测。',
      steps: [
        step('s1', '焯水', '{{porkRibs}} 与 {{ginger}}、{{cookingWine}} 冷水下锅焯净，温水冲净。', '大火 / 焯水可用电饭煲烧水', 8, '浮沫撇净', undefined, 'ai'),
        step('s2', '炖排骨', '排骨入内胆，加热水至最高水位线内，选「煲汤/炖汤」模式运行约 50 分钟。', '电饭煲 / 煲汤模式', 50, '程序结束后排骨可插入、汤面有清亮油花', '水位不要超过内胆最高线，防溢', 'ai'),
        step('s3', '加玉米胡萝卜', '开盖下 {{corn}}、{{carrot}}，再运行 20 分钟（或「再加热」两轮）。', '电饭煲 / 煲汤或再加热', 20, '玉米变亮、胡萝卜变软', undefined, 'ai'),
        step('s4', '加山药收尾', '下 {{yam}} 再加热 15 分钟，出锅前 {{salt}}。', '电饭煲 / 再加热', 15, '山药粉糯', undefined, 'ai'),
      ],
      adaptation: ['砂锅 → 电饭煲：需有煲汤功能；无法中途调火，总时长比砂锅版长约 15 分钟。'],
      flavorImpact: ['相对原版：电饭煲密封好、蒸发量可能更少，汤味可能偏清淡，可在收尾阶段开盖略收，或盐分酌情减少。'],
    },
    {
      appliance: '高压锅',
      versionName: '高压锅版（预设适配说明）',
      minutes: 45,
      basis: 'ai',
      basisNote: '预设适配说明：高压锅上汽后计时；山药易碎，必须最后另锅煮或开盖再压，以下影响已对照原版标注，尚未实测。',
      steps: [
        step('s1', '焯水', '{{porkRibs}} 与 {{ginger}}、{{cookingWine}} 焯净，温水冲净。', '大火 / 焯水锅', 8, '浮沫撇净', undefined, 'ai'),
        step('s2', '压排骨', '排骨入锅加热水，上汽后转小火压 15 分钟，自然泄压。', '高压锅 / 上汽后 15 分钟', 20, '泄压开盖后排骨接近脱骨', '严格执行锅具说明的上限水位与泄压方式，切勿强行开盖', 'ai'),
        step('s3', '开盖炖蔬菜', '开盖下 {{corn}}、{{carrot}}，不加盖煮 8 分钟。', '开盖 / 中小火', 8, '玉米变亮、胡萝卜变软', undefined, 'ai'),
        step('s4', '加山药收尾', '下 {{yam}} 煮 6 分钟左右至粉糯，出锅前 {{salt}}。', '开盖 / 小火', 6, '山药粉糯但不散', '高压下山药会碎，切勿与排骨同压', 'ai'),
      ],
      adaptation: ['砂锅 → 高压锅：排骨软烂更快、总时长最短；山药、玉米不能与排骨同压，需开盖分段煮。'],
      flavorImpact: ['相对原版：汤体更浓白（乳化更多），清甜感可能略弱于砂锅慢炖；玉米脆感保留更好。'],
    },
  ],
};

const R7: Recipe = {
  ...R6,
  id: 'r7',
  title: '莲藕花生排骨汤',
  subtitle: '粉糯鲜甜，越炖越香',
  cover: { ...R6.cover, image: './images/soup-lotus-peanut.jpg' },
  noteText: '花生提前浸泡，排骨焯水后与花生同炖，再加入莲藕和红枣。',
  minutes: 120,
  supportedAppliances: ['砂锅'],
  ingredients: [
    ing('porkRibs', '排骨', 350, 'g', 'main'),
    ing('lotusRoot', '莲藕', 300, 'g', 'main'),
    ing('peanuts', '花生', 40, 'g', 'main', { allergens: ['花生'] }),
    ing('dates', '红枣', 4, '颗', 'main'),
    ing('ginger', '姜', 3, '片', 'main'),
    loose('salt', '盐', 'seasoning', { essential: true }),
    ing('cookingWine', '料酒', 1, '勺', 'seasoning', { essential: false }),
  ],
  noteSteps: [
    '花生提前浸泡 30 分钟。',
    '排骨冷水下锅，加姜片和料酒焯水。',
    '排骨、花生、姜片加热水炖 50 分钟。',
    '加莲藕和红枣继续炖 30–40 分钟，最后加盐。',
  ],
  variants: [{
    appliance: '砂锅', versionName: '莲藕花生排骨汤 · 砂锅', minutes: 120,
    basis: 'author', basisNote: '根据用户提供的菜谱图，含花生浸泡时间。',
    steps: [
      step('s1', '泡花生', '{{peanuts}} 提前浸泡 30 分钟。', '常温', 30, '花生吸水', undefined, 'author'),
      step('s2', '焯水', '{{porkRibs}} 冷水下锅，加 {{ginger}} 和 {{cookingWine}} 焯水。', '焯水锅', 5, '撇去浮沫', undefined, 'author'),
      step('s3', '炖排骨', '排骨、花生与姜片加热水炖 50 分钟。', '砂锅', 50, '保持微沸', undefined, 'author'),
      step('s4', '加入莲藕', '加入 {{lotusRoot}} 和 {{dates}}，炖 30–40 分钟，最后加 {{salt}}。', '砂锅', 35, '莲藕软糯', undefined, 'author'),
    ],
  }],
};

export function getRecipe(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}

export const RECIPES: Recipe[] = [R6, R7, R1, R2, R3, R4, R5];

export function getVariant(recipe: Recipe, appliance: Appliance): Variant | undefined {
  return recipe.variants.find((v) => v.appliance === appliance);
}

export const NON_RECIPE_NOTE = {
  id: 'x1',
  title: '厨房收纳｜3 个让台面变清爽的小物',
  author: '整理收纳研究所',
  cover: { emoji: '🧺', from: '#dfe9df', to: '#a9c8ae' },
  body: '最近把调料都挪到了免打孔置物架上，台面一下空了一半……（这是一篇收纳笔记，不含完整做法）',
  likes: 892,
  collects: 410,
};

export const COLLECTION_IDS = ['r6', 'r1', 'r2', 'r4', 'r5', 'r3', 'x1'];

/** 真实来源核验说明：小红书笔记页对站外抓取不可见，无法逐条核验可公开打开的链接。 */
export const SOURCE_VERIFICATION_NOTE =
  '我尝试逐条核验真实小红书笔记链接：站外无法打开笔记内容（返回不可见/404），因此未给示例菜谱绑定具体笔记链接。山药玉米排骨汤来自你提供的菜谱图片，作者名取自入口 A 笔记页（食味人间小记）；原文外链仍无法核验，因此不绑定外链。';

