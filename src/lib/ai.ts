/**
 * AI 接入层（可插拔）：
 * - 默认使用「本地规则生成的演示方案」，界面明确标注，不伪装实时生成。
 * - 若配置了 VITE_PLAN_API（服务端代理地址），会尝试调用模型；密钥只放服务端。
 * - 模型输出必须通过 validateModelPlan 结构校验；任何失败都降级到示例方案并给出提示。
 * - 模型不得决定跳转地址；采购链接只来自 data/products.ts 的预配置列表。
 */
import type { ChatHint, Conditions, Homework, Plan, Recipe, ReplicationResult } from '../types';
import { RESULT_LABEL } from '../types';
import { RECIPES } from '../data/recipes';
import { preparePlan, validateModelPlan, type PlanResult } from './plan';

const API = (import.meta.env?.VITE_PLAN_API as string | undefined) ?? '';

export function isModelConfigured(): boolean {
  return API.length > 0;
}

export type PlanGenerationResult = PlanResult & {
  fallbackNotice?: string;
  modelFailed?: boolean;
};

async function callModel(recipe: Recipe, conditions: Conditions, signal?: AbortSignal): Promise<Partial<Plan>> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'plan', recipeId: recipe.id, conditions }),
    signal,
  });
  if (!res.ok) throw new Error(`模型代理返回 ${res.status}`);
  const data: unknown = await res.json();
  if (!validateModelPlan(data)) throw new Error('模型返回结构不符合约定');
  return data as Partial<Plan>;
}

export async function generatePlanWithFallback(
  recipe: Recipe,
  conditions: Conditions,
  opts: { simulateFailure?: boolean; signal?: AbortSignal } = {},
): Promise<PlanGenerationResult> {
  const base = preparePlan(recipe, conditions);
  if (!base.ok) return { ...base };

  // 演示开关：用于验证「模型请求失败」时的降级与数据保留
  if (opts.simulateFailure) {
    const notice = '模型请求失败（演示开关已开启）。已切换为本地规则生成的示例方案：不是实时生成，也不代表实测结果。你的条件与原有资料均已保留。';
    return {
      ok: true,
      plan: { ...base.plan, fallbackNotice: notice },
      validation: base.validation,
      fallbackNotice: notice,
      modelFailed: true,
    };
  }

  if (!isModelConfigured()) {
    const notice = '当前未配置模型代理，展示的是本地规则生成的示例方案（非实时 AI 生成）。';
    return {
      ok: true,
      plan: { ...base.plan, fallbackNotice: notice },
      validation: base.validation,
      fallbackNotice: notice,
    };
  }

  try {
    const model = await callModel(recipe, conditions, opts.signal);
    // 只接纳解释性文本；份量、库存、缺口、步骤结构中的安全字段仍以代码计算为准
    const plan: Plan = {
      ...base.plan,
      engine: 'model',
      versionName: model.versionName ?? base.plan.versionName,
      changes: model.changes?.length ? model.changes : base.plan.changes,
      steps: model.steps?.length ? model.steps : base.plan.steps,
      fallbackNotice: undefined,
    };
    return { ok: true, plan, validation: base.validation };
  } catch (err) {
    const notice = `模型请求失败：${err instanceof Error ? err.message : '未知错误'}。已明确降级为本地规则生成的示例方案（非实时生成），你的条件与已有资料未丢失。`;
    return {
      ok: true,
      plan: { ...base.plan, fallbackNotice: notice },
      validation: base.validation,
      fallbackNotice: notice,
      modelFailed: true,
    };
  }
}

/** 解析对话中的自然语言条件（演示用本地规则版，命中项一律标为「待确认」） */
const FOOD_WORDS = ['排骨', '鸡腿', '山药', '玉米', '胡萝卜', '番茄', '西红柿', '鸡蛋', '虾仁', '鸡翅', '面条', '米饭', '小葱', '大蒜'];

export function parseChatQuery(text: string): ChatHint[] {
  const hints: ChatHint[] = [];
  const push = (label: string, value: string, origin: ChatHint['origin'] = 'explicit') => {
    if (!hints.some((h) => h.value === value)) hints.push({ label, value, confirmed: false, origin });
  };
  if (/一人|一个人|1 ?人|今晚一个人/.test(text)) push('份量', '一人份');
  if (/两人|二人|2 ?人/.test(text)) push('份量', '两人份');
  const extraSize = /([三四五六七八]|\d+)\s*个?\s*人/.exec(text);
  if (extraSize) push('份量', `${extraSize[1]}人份`);
  for (const w of FOOD_WORDS) {
    if (text.includes(`有${w}`) || text.includes(`剩下${w}`) || text.includes(`买了${w}`)) push('食材', `有${w}`);
  }
  const minutes = text.match(/(\d{1,3})\s*分钟/);
  if (minutes) push('可用时间', `${minutes[1]} 分钟内`);
  if (/不吃辣|不要辣|怕辣/.test(text)) push('口味', '不辣');
  if (/过敏|忌口|不吃虾|不吃蛋/.test(text)) push('忌口', '需确认忌口');
  if (/宿舍|只有微波|微波炉/.test(text)) push('厨具', '可用微波炉', 'inferred');
  return hints;
}

/** 点点对话的预置示例菜谱检索，不做通用平台搜索 */
export function recommendRecipes(query: string): { recipe: Recipe; reason: string }[] {
  const q = query.trim();
  const hit: { recipe: Recipe; reason: string }[] = [];
  const add = (id: string, reason: string) => {
    const recipe = RECIPES.find((r) => r.id === id);
    if (recipe && !hit.some((h) => h.recipe.id === id)) hit.push({ recipe, reason });
  };

  if (/山药|玉米|排骨|汤/.test(q)) add('r6', '主要食材与你提到的排骨 / 汤一致，原图清甜做法');
  if (/清甜|清淡|润|养生|暖/.test(q)) add('r6', '清甜路线的炖汤，符合你想喝清甜一点的需求');
  if (/鸡腿|照烧/.test(q)) add('r1', '主要食材与你提到的鸡腿一致');
  if (/番茄|西红柿|鸡蛋|一人食|一个人|晚饭/.test(q)) add('r2', '一人份、常见食材，10 分钟出锅');
  if (/微波|宿舍|限电|蒸蛋|虾/.test(q)) add('r3', '只需要微波炉，适合宿舍场景');
  if (/鸡翅|空气炸锅|炸/.test(q)) add('r4', '主要食材与你提到的鸡翅一致');
  if (/面|葱油|素/.test(q)) add('r5', '一人份、材料简单');
  if (!hit.length) {
    add('r6', '主推示例：清甜炖汤，支持多种锅具');
    add('r2', '预置示例库中的快手菜');
    add('r1', '主要食材常见，支持多种厨具');
  }
  return hit.slice(0, 3);
}

/** AI 辅助整理作业卡：只整理用户已填写的内容，不添加未说过的口感、效果或体验 */
export function organizeHomeworkCard(input: {
  versionName: string;
  result: ReplicationResult;
  servings: number;
  appliance: string;
  adjustments: string;
  advice: string;
}): string {
  const lines = [
    `【${input.versionName}】${RESULT_LABEL[input.result]}`,
    `${input.servings} 人份 · 实际使用${input.appliance}`,
  ];
  if (input.adjustments.trim()) lines.push(`实际调整：${input.adjustments.trim()}`);
  if (input.advice.trim()) lines.push(`给下一位的建议：${input.advice.trim()}`);
  return lines.join('\n');
}

export function homeworkToReplicaText(hw: Homework): string {
  return organizeHomeworkCard({
    versionName: hw.versionName,
    result: hw.result,
    servings: hw.servings,
    appliance: hw.appliance,
    adjustments: hw.adjustments,
    advice: hw.advice,
  });
}
