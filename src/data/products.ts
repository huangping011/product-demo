import type { MaterialGroup } from '../types';

/**
 * 预配置采购入口。所有链接模板写死在代码里，模型输出不得决定跳转地址。
 * 渠道排序与可用性由配置决定；「站内商品配置」存在时，去小红书购买是首位主按钮。
 */
export type ChannelKind = 'xhs' | 'instant' | 'ecommerce';

export interface ProductEntry {
  id: string;
  materialName: string;
  group: MaterialGroup | 'tool' | 'ingredient';
  title: string;
  spec: string;
  channel: string;
  kind: ChannelKind;
  isDemo: boolean;
  isAd?: boolean;
  externalUrl?: string;
  /** 无可用链接时仅展示渠道预览 */
  previewOnly?: boolean;
  /** 站内已确认的商品配置（演示配置存在 → 「去小红书购买」为首位主按钮） */
  xhsConfigured?: boolean;
}

/** 站内商品配置：目前演示环境没有真实站内商品库，全部走「暂无站内商品」文案 + 渠道预览 */
const XHS_CONFIGURED_MATERIALS: string[] = [];

export function xhsEntryFor(materialName: string): ProductEntry | undefined {
  const configured = XHS_CONFIGURED_MATERIALS.includes(materialName);
  return {
    id: `xhs-${materialName}`,
    materialName,
    group: 'ingredient',
    title: configured ? '去小红书购买' : '本 Demo 暂无站内商品',
    spec: configured
      ? '站内商品 · 演示配置'
      : '站内暂未配置该品类商品；可在小红书 App 内自行搜索，或使用下方外部渠道',
    channel: '小红书站内',
    kind: 'xhs',
    isDemo: true,
    previewOnly: !configured,
    xhsConfigured: configured,
  };
}

/** 生鲜类材料优先即时零售；调味品 / 厨具走综合电商。链接为平台搜索页模板。 */
export const EXTERNAL_TARGETS = [
  { id: 'instant', kind: 'instant' as ChannelKind, label: '去即时零售平台查找', channel: '外部即时零售', template: 'https://search.jd.com/Search?keyword=' },
  { id: 'ecommerce', kind: 'ecommerce' as ChannelKind, label: '去综合电商查找', channel: '外部综合电商', template: 'https://s.taobao.com/search?q=' },
];

export const FRESH_WORDS = ['排骨', '鸡腿', '鸡翅', '虾仁', '番茄', '山药', '玉米', '胡萝卜', '鸡蛋', '小葱', '大蒜', '姜', '面条', '豆腐', '肉', '鱼', '虾', '蔬菜'];

export function isFreshMaterial(name: string): boolean {
  return FRESH_WORDS.some((w) => name.includes(w));
}

/** 按单个缺口匹配渠道：站内优先，其次按材料属性排外部渠道顺序 */
export function channelsForGap(materialName: string, group: MaterialGroup | 'tool'): ProductEntry[] {
  const xhs = xhsEntryFor(materialName);
  const fresh = group !== 'tool' && group !== 'seasoning' && isFreshMaterial(materialName);
  const externals = [...EXTERNAL_TARGETS]
    .sort((a, b) => {
      if (fresh) return a.id === 'instant' ? -1 : b.id === 'instant' ? 1 : 0;
      // 调味品、常温原料走综合电商
      return a.id === 'ecommerce' ? -1 : b.id === 'ecommerce' ? 1 : 0;
    })
    .map((t) => ({
      id: `${t.id}-${materialName}`,
      materialName,
      group,
      title: t.label,
      spec: '将在外部平台完成购买，以该平台库存、配送和价格为准',
      channel: t.channel,
      kind: t.kind as ChannelKind,
      isDemo: false,
      externalUrl: `${t.template}${encodeURIComponent(materialName)}`,
    }));
  return xhs ? [xhs, ...externals] : externals;
}

/** 旧接口兼容：外部入口列表 */
export function externalEntries(materialName: string): ProductEntry[] {
  return channelsForGap(materialName, 'main').filter((p) => p.kind !== 'xhs');
}

export function reasonFor(materialName: string, amount: string): string {
  return `补齐清单缺少：${materialName}${amount && amount !== '适量（按口味）' ? `（需 ${amount}）` : ''}`;
}

export const EXTERNAL_NOTICE =
  '将在外部平台完成购买，以该平台库存、配送和价格为准。本演示不展示未经验证的价格、库存和送达时间，也不会替你加购或下单。';

export const NO_XHS_GOODS_TEXT = '本 Demo 暂无站内商品';

