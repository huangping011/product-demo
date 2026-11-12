/**
 * 方案生成与校验：纯函数层。
 * 代码负责份量、库存状态、必填校验、忌口冲突检查、商品与缺口关联；
 * 默认生成的是「本地规则生成的演示方案」，不会伪装成实时模型生成。
 */
import type {
  Appliance, ChangeItem, Conditions, Ingredient, KitchenProfile, MaterialItem,
  Plan, PlanMode, Recipe, Replica, Step, StockState, Substitute, TastePrefs, Variant, ChatHint,
} from '../types';
import { RECIPES, getVariant } from '../data/recipes';
import { makeId, nowISO } from './utils';

const ALLERGEN_WORDS = ['花生', '蛋', '虾', '蟹', '甲壳', '大豆', '小麦', '麸质', '芝麻', '乳'];

export const DEFAULT_TASTE: TastePrefs = { spice: '按原菜谱', salt: '按原菜谱', oil: '按原菜谱' };
const CN_NUM: Record<string, number> = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8 };

const COUNT_UNITS = ['个', '根', '块', '碗', '瓣', '只', '袋', '段', '片', '勺'];

/** 人数换算始终由代码完成：用量 × 目标人数 ÷ 基准（普通菜=baseServings；「2–3 人份」取 2.5） */
export function scaledNumber(amount: number, factor: number, unit: string): number {
  const raw = amount * factor;
  if (COUNT_UNITS.some((u) => unit.startsWith(u))) {
    // 计数类（根/个/片/勺）：四舍五入，最少 1，并为「半根」类保留 0.5 档
    const rounded = Math.round(raw * 2) / 2;
    return Math.max(rounded % 1 === 0 ? 1 : 0.5, rounded);
  }
  const rounded = Math.round(raw * 10) / 10;
  if (rounded === 0 && amount > 0) return 0.5;
  // 克数类做易读舍入：>=100g 取 10g 档，>=20g 取 5g 档
  if (/g|克/.test(unit) && rounded >= 100) return Math.round(rounded / 10) * 10;
  if (/g|克/.test(unit) && rounded >= 20) return Math.round(rounded / 5) * 5;
  return rounded;
}

/** 面向 UI 的用量文本：盐等 loose 材料恒显示「适量（按口味）」 */
export function quantityText(ing: Ingredient, factor: number, taste: TastePrefs = DEFAULT_TASTE): string {
  if (ing.looseAmount) return '适量（按口味）';
  const n = scaledNumber(ing.amount * tasteFactor(ing, taste), factor, ing.unit);
  return `${n} ${ing.unit}`;
}

/** 换算基准的 UI 说明 */
export function servingsBasisText(recipe: Recipe): string {
  if (recipe.servingsBase !== recipe.baseServings) {
    return `原标注 ${recipe.servingsLabel}，系统以 ${recipe.servingsBase} 人份为估算基准换算用量`;
  }
  return `原方为 ${recipe.servingsLabel}`;
}

function tasteFactor(ing: Ingredient, taste: TastePrefs): number {
  if (taste.salt === '少盐' && (/盐|生抽|老抽|酱油|豉油/.test(ing.name))) return 0.7;
  if (taste.oil === '少油' && (/油/.test(ing.name))) return 0.6;
  return 1;
}

export function ingredientText(ing: Ingredient, factor: number, taste: TastePrefs = DEFAULT_TASTE): string {
  return `${ing.name} ${quantityText(ing, factor, taste)}`;
}

/** 把步骤文本中的 {{key}} 替换为代码计算出的实际用量；已省略 / 已替换的材料也会同步反映 */
export function renderStepText(text: string, recipe: Recipe, factor: number, plan?: Plan): string {
  return text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (full, key: string) => {
    const ing = recipe.ingredients.find((x) => x.key === key);
    if (!ing) return full;
    const material = plan?.materials.find((m) => m.key === key);
    if (material?.omitted) return `（已省略${ing.name}）`;
    if (material?.chosenSubstitute) return material.chosenSubstitute;
    return ingredientText(ing, factor, plan?.conditionSnapshot.taste ?? DEFAULT_TASTE);
  });
}

export function stepMaterials(step: Step, recipe: Recipe, factor: number, plan?: Plan): { name: string; amount: string }[] {
  const keys = Array.from(new Set(Array.from(step.text.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g), (m) => m[1])));
  return keys.flatMap((key) => {
    const ing = recipe.ingredients.find((x) => x.key === key);
    if (!ing) return [];
    const material = plan?.materials.find((m) => m.key === key);
    if (material?.omitted) return [{ name: ing.name, amount: '本次已省略' }];
    if (material?.chosenSubstitute) return [{ name: material.chosenSubstitute, amount: '用户确认的替代品' }];
    return [{ name: ing.name, amount: quantityText(ing, factor, plan?.conditionSnapshot.taste ?? DEFAULT_TASTE) }];
  });
}

/** 替代方案不能引入用户声明的忌口 / 过敏原 */
export function safeSubstitutes(ing: Ingredient, avoid: string[]): Substitute[] {
  return (ing.substitutes ?? []).filter((s) => {
    const declared = s.allergens ?? [];
    if (declared.some((a) => avoid.includes(a))) return false;
    // 「省略 XX」表示完全不使用该材料，名称里出现过敏原词也应视为安全
    if (s.name.startsWith('省略')) return true;
    const haystack = `${s.name} ${s.note}`
      .replace(/不含[^，。；,、\s]*/g, '')
      .replace(/无[^，。；,、\s]*/g, '')
      .replace(/省略[^，。；,、\s]*/g, '');
    return !avoid.some((tag) =>
      ALLERGEN_WORDS.filter((w) => tag.includes(w)).some((w) => haystack.includes(w)),
    );
  });
}

export interface AllergenConflict {
  key: string;
  name: string;
  matched: string[];
  safeOptions: Substitute[];
  locked: boolean;
  resolved: boolean;
  resolvedWith?: string;
}

export function findAllergenConflicts(recipe: Recipe, conditions: Conditions): AllergenConflict[] {
  const avoid = conditions.avoid;
  if (!avoid.length) return [];
  return recipe.ingredients
    .filter((i) => i.allergens.some((a) => avoid.includes(a)))
    .map((i) => {
      const options = safeSubstitutes(i, avoid);
      const choice = conditions.substituteChoices[i.key];
      return {
        key: i.key,
        name: i.name,
        matched: i.allergens.filter((a) => avoid.includes(a)),
        safeOptions: options,
        locked: conditions.lockedIngredients.includes(i.key),
        resolved: Boolean(choice) && options.some((o) => o.name === choice),
        resolvedWith: choice,
      };
    });
}

export function alternativeRecipes(recipe: Recipe, appliances: Appliance[]): Recipe[] {
  return RECIPES.filter((r) => r.id !== recipe.id && r.supportedAppliances.some((a) => appliances.includes(a)));
}

export type PlanConflict =
  | { type: 'appliance'; message: string; alternatives: Recipe[] }
  | { type: 'allergen'; items: AllergenConflict[]; message: string };

export type Validation =
  | { ok: true; warnings: string[] }
  | { ok: false; errors: string[]; warnings: string[]; conflicts: PlanConflict[] };

export function validateConditions(recipe: Recipe, conditions: Conditions): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!conditions.applianceConfirmed || conditions.appliances.length === 0) {
    errors.push('请先确认至少一种本次可用的厨具');
  }
  if (!conditions.avoidConfirmed) {
    errors.push('请确认忌口与过敏信息（也可主动选择「无已知忌口」）');
  }
  if (conditions.servings < 1 || conditions.servings > 8) {
    errors.push('人数请设置在 1–8 人之间');
  }

  const conflicts: PlanConflict[] = [];
  const usable = conditions.appliances.filter((a) => recipe.supportedAppliances.includes(a));
  if (conditions.appliances.length > 0 && usable.length === 0) {
    conflicts.push({
      type: 'appliance',
      message: `你确认的厨具（${conditions.appliances.join('、')}）无法完成这道菜的已验证做法，系统不会强行生成不可靠的步骤。可以换用已支持的厨具，或查看其他菜谱。`,
      alternatives: alternativeRecipes(recipe, conditions.appliances),
    });
  }

  const allergenItems = findAllergenConflicts(recipe, conditions);
  const unresolved = allergenItems.filter((c) => !c.resolved);
  if (unresolved.length) {
    const names = unresolved.map((c) => `${c.name}（含 ${c.matched.join('、')}）`).join('、');
    conflicts.push({
      type: 'allergen',
      items: allergenItems,
      message: `原菜谱中的 ${names} 与你声明的忌口 / 过敏冲突。为避免风险，不能直接沿用原方案：请先选择不含过敏原的替代品，或换一道菜。`,
    });
  }

  // 多个冲突同时呈现，避免只暴露其中一项而让用户误以为另一项已通过
  if (errors.length || conflicts.length) return { ok: false, errors, warnings, conflicts };
  return { ok: true, warnings };
}

export function makeDefaultConditions(
  recipe: Recipe,
  source: Conditions['source'],
  profile?: KitchenProfile | null,
  chatHints: ChatHint[] = [],
  replicaId?: string,
): Conditions {
  // 食材由用户逐项勾选或按组确认。
  const stock: Record<string, StockState> = {};
  recipe.ingredients.filter((i) => i.group !== 'seasoning').forEach((i) => { stock[i.key] = 'missing'; });

  // 预选每组的首个快捷选项。
  let servings = 1;
  let timeLimit: number | null = 30;

  // 优先选择厨房档案中适用的锅具。
  let appliance = profile?.appliances.find((a) => recipe.supportedAppliances.includes(a)) ?? recipe.primaryAppliance;
  const seasonings: string[] = [];

  for (const h of chatHints) {
    const size = /^([一二两三四五六七八]|\d+)\s*人份$/.exec(h.value);
    if (size) {
      const n = /^\d+$/.test(size[1]) ? Number.parseInt(size[1], 10) : CN_NUM[size[1]];
      if (n) servings = Math.max(1, Math.min(8, n));
    }
    const minutes = /(\d+)\s*分钟/.exec(h.value);
    if (h.label === '可用时间' && minutes) timeLimit = Number.parseInt(minutes[1], 10);
    if (/^\d+ 分钟内$/.test(h.value)) timeLimit = Number.parseInt(h.value, 10);
    if (h.value.startsWith('有')) {
      const name = h.value.slice(1);
      const matched = recipe.ingredients.find((i) => name.includes(i.name.replace(/（.*）/, '')) || i.name.includes(name));
      if (matched) stock[matched.key] = 'have';
    }
    if (h.label === '厨具' && h.value.startsWith('可用')) {
      const hinted = recipe.supportedAppliances.find((a) => h.value.includes(a));
      if (hinted) appliance = hinted;
    }
  }

  return {
    recipeId: recipe.id,
    source,
    servings,
    timeLimit,
    stock,
    stockAmounts: {},
    extraIngredients: [],
    seasonings,
    appliances: [appliance],
    primaryAppliance: appliance,
    lockedIngredients: [],
    substituteChoices: {},
    substituteHave: {},
    buyChoices: [],
    omittedIngredients: [],
    taste: profile?.taste ? { ...profile.taste } : { ...DEFAULT_TASTE },
    avoid: profile?.avoid ?? [],
    avoidConfirmed: true,
    applianceConfirmed: true,
    strategy: 'useExisting',
    chatHints,
    prefillFromProfile: Boolean(profile),
    replicaId,
  };
}

/**
 * 「按这个版本做」：只带入复刻版本的份量、设备与调整说明，
 * 全部条件仍需用户重新确认，库存与忌口不会套用别人的设置。
 */
export function conditionsFromReplica(
  recipe: Recipe,
  replica: Replica,
  profile?: KitchenProfile | null,
  hints: ChatHint[] = [],
): Conditions {
  const base = makeDefaultConditions(recipe, 'replica', profile, hints, replica.id);
  return {
    ...base,
    servings: replica.servings,
    appliances: [replica.appliance],
    primaryAppliance: replica.appliance,
    applianceConfirmed: true,
    avoidConfirmed: true,
    chatHints: [
      { label: '复刻版本', value: `参考 ${replica.author} 的版本`, confirmed: false, origin: 'inferred' },
      ...replica.adjustments.map((a) => ({ label: '版本调整', value: a, confirmed: false, origin: 'inferred' as const })),
      ...replica.substitutions.map((a) => ({ label: '替换材料', value: a, confirmed: false, origin: 'inferred' as const })),
      ...hints,
    ],
  };
}

export type PlanResult =
  | { ok: true; plan: Plan; validation: Extract<Validation, { ok: true }> }
  | { ok: false; validation: Extract<Validation, { ok: false }> };

export interface PlanOptions {
  id?: string;
  now?: string;
  engine?: Plan['engine'];
  fallbackNotice?: string;
}

export function preparePlan(recipe: Recipe, conditions: Conditions, opts: PlanOptions = {}): PlanResult {
  const validation = validateConditions(recipe, conditions);
  if (!validation.ok) return { ok: false, validation };

  const usable = conditions.appliances.filter((a) => recipe.supportedAppliances.includes(a));
  const preferred = conditions.primaryAppliance && usable.includes(conditions.primaryAppliance)
    ? conditions.primaryAppliance
    : usable.find((a) => a === recipe.primaryAppliance) ?? usable[0];
  const variant: Variant | undefined = getVariant(recipe, preferred);
  if (!variant) {
    return {
      ok: false,
      validation: { ok: false, errors: ['未找到该设备对应的做法'], warnings: validation.warnings, conflicts: [] },
    };
  }

  const factor = conditions.servings / recipe.servingsBase;
  const warnings = [...validation.warnings];
  const changes: ChangeItem[] = [];
  const materials: MaterialItem[] = [];

  for (const ing of recipe.ingredients) {
    const locked = conditions.lockedIngredients.includes(ing.key);
    const safe = safeSubstitutes(ing, conditions.avoid);
    const preChoice = conditions.substituteChoices[ing.key];
    const chosen = preChoice && safe.some((s) => s.name === preChoice) ? preChoice : undefined;
    const substituteHave = conditions.substituteHave?.[ing.key] !== false;
    const omitted = !ing.essential && (conditions.omittedIngredients?.includes(ing.key) ?? false);
    const buyChosen = conditions.buyChoices?.includes(ing.key) ?? false;

    let state: MaterialItem['state'];
    let reason: string | undefined;
    let originalOptional = false;
    let buyName: string | undefined;

    if (omitted) {
      state = 'owned';
      reason = '你确认本次省略';
      originalOptional = true;
    } else if (chosen) {
      if (substituteHave) {
        state = 'owned';
        reason = `使用手边已有的替代品：${chosen}`;
        originalOptional = true;
      } else {
        state = 'need';
        reason = `已选「${chosen}」替代，手边没有，需要补齐`;
        buyName = chosen;
      }
    } else if (ing.group === 'seasoning') {
      const have = conditions.seasonings.includes(ing.name);
      state = have ? 'owned' : 'need';
      if (!have) {
        reason = buyChosen ? '你选择补齐这项调味品' : '你没勾选这项调味品';
        originalOptional = !buyChosen && !ing.essential;
      }
    } else {
      const s = conditions.stock[ing.key] ?? 'have';
      state = s === 'have' ? 'owned' : s === 'missing' ? 'need' : 'unsure';
      if (state === 'need') {
        reason = buyChosen
          ? '你标记缺少，并选择补齐原料'
          : ing.essential
            ? '必需材料，你标记为缺少'
            : '你标记为缺少，暂列可选补齐';
        originalOptional = !buyChosen && !ing.essential;
      }
      if (state === 'unsure') reason = '库存不确定，需你确认后再决定是否购买';
    }

    if (state === 'need' && !chosen && conditions.strategy === 'followOriginal') {
      reason = `${reason ?? ''}；你选择尽量按原做法，不做替换`;
    }

    const conflictInRecipe = ing.allergens.some((a) => conditions.avoid.includes(a));
    materials.push({
      key: ing.key,
      name: ing.name,
      amount: quantityText(ing, factor, conditions.taste),
      group: ing.group,
      essential: ing.essential,
      state,
      substitutes: locked ? [] : safe,
      chosenSubstitute: chosen,
      buyName,
      omitted,
      originalOptional,
      confirmedReady: false,
      reason,
      stockNote: conditions.stockAmounts?.[ing.key]?.trim() || undefined,
      allergenConflict: conflictInRecipe && !chosen && !omitted,
    });
  }

  for (const extra of conditions.extraIngredients) {
    materials.push({
      key: `extra_${extra.group ?? 'main'}_${extra.name}`,
      name: extra.name,
      amount: '数量未填写',
      group: extra.group ?? 'main',
      essential: false,
      state: extra.state === 'have' ? 'owned' : 'unsure',
      substitutes: [],
      confirmedReady: false,
      reason: '你额外添加的食材',
    });
  }

  // 修改清单：份量与设备由代码计算 / 结构化变体给出
  if (conditions.servings !== recipe.baseServings) {
    changes.push({
      from: recipe.servingsLabel,
      to: `${conditions.servings} 人份`,
      reason: servingsBasisText(recipe) + '，用量由代码换算并做易读舍入',
      basis: 'ai',
    });
  }
  if (variant.appliance !== recipe.primaryAppliance) {
    changes.push({
      from: `原方案使用${recipe.primaryAppliance}`,
      to: `本次使用${variant.appliance}`,
      reason: variant.basisNote,
      basis: variant.basis,
    });
  }
  for (const m of materials.filter((x) => x.chosenSubstitute)) {
    changes.push({
      from: m.name,
      to: `改用 ${m.chosenSubstitute}${m.buyName ? '（待补齐）' : '（手边已有）'}`,
      reason: '你在条件页确认的替换；味道影响见上方摘要',
      basis: 'ai',
    });
  }
  for (const m of materials.filter((x) => x.omitted)) {
    changes.push({
      from: m.name,
      to: '本次省略',
      reason: '你在条件页确认省略，未列入采购',
      basis: 'ai',
    });
  }
  if (conditions.taste.salt === '少盐') {
    changes.push({ from: '按原菜谱调味', to: '含盐调味料减少约 30%', reason: '根据本次口味选择，用量由系统计算', basis: 'ai' });
  }
  if (conditions.taste.oil === '少油') {
    changes.push({ from: '按原菜谱用油', to: '食用油减少约 40%', reason: '根据本次口味选择，用量由系统计算', basis: 'ai' });
  }
  if (conditions.taste.spice !== '按原菜谱' && conditions.taste.spice !== '加辣') {
    changes.push({ from: '按原菜谱辣度', to: conditions.taste.spice, reason: '根据本次口味选择；本菜谱不含辣味主料，实际影响有限', basis: 'ai' });
  }
  if (conditions.timeLimit !== null && conditions.timeLimit < variant.minutes) {
    warnings.push(`这道做法约需 ${variant.minutes} 分钟，超过你设定的 ${conditions.timeLimit} 分钟。步骤时间不会为了凑时间被压缩，可查看更快的菜谱。`);
  }
  const unsureCount = materials.filter((m) => m.state === 'unsure').length;
  if (unsureCount) warnings.push(`有 ${unsureCount} 项库存标为「不确定」，未计入采购清单，开始前请确认。`);
  if (variant.basis === 'ai') warnings.push('该设备版本为依据设备特性生成的建议步骤，标注为「AI 建议，尚未实测」，请以实际熟成状态为准。');
  warnings.push('计时结束不代表食物一定达到安全状态，请以步骤中的可观察完成状态为准。');

  const ownedNames = materials.filter((m) => m.state === 'owned' && m.group === 'main').slice(0, 3).map((m) => m.chosenSubstitute ?? m.name);
  const matchNote = ownedNames.length
    ? `使用你确认拥有的${ownedNames.join('、')}与${variant.appliance}。`
    : `尚未确认任何主料库存，用量按 ${conditions.servings} 人份计算；请先在材料清单中确认。`;

  const plan: Plan = {
    id: opts.id ?? makeId('plan'),
    recipeId: recipe.id,
    createdAt: opts.now ?? nowISO(),
    source: conditions.source,
    engine: opts.engine ?? 'demo-rule',
    fallbackNotice: opts.fallbackNotice,
    mode: conditions.strategy === 'followOriginal' ? 'original' : 'adapted',
    versionName: variant.versionName,
    servings: conditions.servings,
    totalMinutes: variant.minutes,
    appliance: variant.appliance,
    summary: `${variant.versionName} · ${conditions.servings} 人份 · 约 ${variant.minutes} 分钟 · ${variant.appliance}`,
    matchNote,
    flavorImpact: buildFlavorImpact(variant, recipe, materials, conditions),
    adaptationNotes: variant.adaptation ?? [],
    changes,
    materials,
    steps: variant.steps,
    warnings,
    saved: false,
    conditionSnapshot: structuredClone(conditions),
  };

  return { ok: true, plan, validation };
}

/**
 * 「味道会怎么变」：对照原版、逐条具体。数据来自人工整理的预设适配说明（主推菜）或
 * 通用规则；有可用模型时由模型补写并标注「AI 解释，尚未实测」。
 */
function buildFlavorImpact(
  variant: Variant,
  recipe: Recipe,
  materials: MaterialItem[],
  conditions: Conditions,
): string[] {
  const items: string[] = [...(variant.flavorImpact ?? [])];
  if (variant.appliance !== recipe.primaryAppliance && variant.adaptation) {
    items.push(...variant.adaptation);
  }
  for (const m of materials) {
    if (m.chosenSubstitute) {
      const ing = recipe.ingredients.find((i) => i.key === m.key);
      const s = ing?.substitutes?.find((x) => x.name === m.chosenSubstitute);
      if (s) items.push(`${m.name} → ${s.name}：${s.note}（由你确认的替换，尚未实测）`);
    }
    if (m.omitted) {
      const ing = recipe.ingredients.find((i) => i.key === m.key);
      const omitNote = ing?.substitutes?.find((x) => x.name.startsWith('省略'));
      items.push(`省略${m.name}：${omitNote?.note ?? '对主体风味有影响，以实际口味为准'}（由你确认的省略）`);
    }
  }
  if (conditions.taste.salt === '少盐') items.push('选择少盐：含盐调味料已按代码减少约 30%，汤感更清淡');
  if (conditions.taste.oil === '少油') items.push('选择少油：用油已按代码减少约 40%，香气可能略减');
  if (recipe.servingsBase !== recipe.baseServings && conditions.servings !== recipe.servingsBase) {
    items.push(`人数换算：${servingsBasisText(recipe)}，本次 ${conditions.servings} 人份`);
  }
  return Array.from(new Set(items));
}

/** 双版本切换：「接近原味」= 缺料进可选采购、不做替换；「用现有条件做」= 按用户确认的替换/省略执行 */
export function switchPlanMode(plan: Plan, mode: PlanMode): Plan {
  if (plan.mode === mode) return plan;
  const recipe = RECIPES.find((r) => r.id === plan.recipeId);
  if (!recipe) return plan;
  const conditions = plan.conditionSnapshot;

  if (mode === 'original') {
    // 接近原味：清除替换与省略；缺料全部进入「想还原原版」可选采购
    const materials = plan.materials.map((m) => {
      const ing = recipe.ingredients.find((i) => i.key === m.key);
      if (!ing) return m;
      const baseState = ing.group === 'seasoning'
        ? (conditions.seasonings.includes(ing.name) ? 'owned' : 'need')
        : ((conditions.stock[ing.key] ?? 'have') === 'have' ? 'owned' : (conditions.stock[ing.key] ?? 'have') === 'missing' ? 'need' : 'unsure');
      const substituted = m.chosenSubstitute || m.omitted;
      return {
        ...m,
        state: baseState,
        chosenSubstitute: undefined,
        omitted: undefined,
        originalOptional: substituted ? true : m.originalOptional,
        reason: substituted ? '原版必需材料；你已选替代方案，此项转为「想还原原版」的可选采购' : m.reason,
      } satisfies MaterialItem;
    });
    if (!conditions.appliances.includes(recipe.primaryAppliance)) {
      materials.push({
        key: 'original-cookware',
        name: recipe.primaryAppliance,
        amount: '1 口',
        group: 'cookware',
        essential: true,
        state: 'need',
        substitutes: [],
        confirmedReady: false,
        reason: '接近原味方案需要使用原方厨具',
      });
    }
    return {
      ...plan,
      mode,
      versionName: `接近原味 · ${recipe.primaryAppliance}版`,
      appliance: recipe.primaryAppliance,
      totalMinutes: recipe.minutes,
      materials,
      steps: recipe.variants.find((v) => v.appliance === recipe.primaryAppliance)?.steps ?? plan.steps,
      flavorImpact: buildFlavorImpact(
        recipe.variants.find((v) => v.appliance === recipe.primaryAppliance) ?? recipe.variants[0],
        recipe, materials, conditions,
      ),
      changes: [
        ...plan.changes.filter((c) => !c.to.startsWith('改用') && !c.to.startsWith('本次省略') && !c.to.includes('使用替代品')),
        { from: '替换 / 省略版本', to: '接近原味版', reason: '按原方材料清单执行；已替换项转入「想还原原版」可选采购', basis: 'author' as const },
      ],
    };
  }

  // 用现有条件做：恢复用户确认的替换/省略
  const res = preparePlan(recipe, conditions, { id: plan.id, engine: plan.engine, fallbackNotice: plan.fallbackNotice });
  return res.ok ? { ...res.plan, saved: plan.saved, mode: 'adapted' } : plan;
}

/** 用户在方案页主动确认使用替代品；不安全的替代品会被拒绝 */
export function applySubstitute(plan: Plan, key: string, substituteName: string): Plan {
  const material = plan.materials.find((m) => m.key === key);
  if (!material) return plan;
  const recipe = RECIPES.find((r) => r.id === plan.recipeId);
  const ing = recipe?.ingredients.find((i) => i.key === key);
  if (!ing) return plan;
  const safe = safeSubstitutes(ing, plan.conditionSnapshot.avoid);
  if (!safe.some((s) => s.name === substituteName)) return plan; // 拒绝含过敏原的替代品
  if (plan.conditionSnapshot.lockedIngredients.includes(key)) return plan;

  return {
    ...plan,
    materials: plan.materials.map((m) =>
      m.key === key
        ? { ...m, state: 'owned', chosenSubstitute: substituteName, buyName: undefined, omitted: false, originalOptional: true, reason: `你确认使用替代品：${substituteName}` }
        : m,
    ),
    changes: [
      ...plan.changes,
      { from: material.name, to: `改用 ${substituteName}`, reason: '你在方案页确认的替代方案，尚未实测', basis: 'ai' },
    ],
  };
}

/** 仅非必需、未锁定材料可省略 */
export function omitMaterial(plan: Plan, key: string): Plan {
  const material = plan.materials.find((m) => m.key === key);
  if (!material || material.essential || plan.conditionSnapshot.lockedIngredients.includes(key)) return plan;
  return {
    ...plan,
    materials: plan.materials.map((m) =>
      m.key === key ? { ...m, state: 'owned', omitted: true, chosenSubstitute: undefined, buyName: undefined, originalOptional: true, reason: '你确认本次省略' } : m,
    ),
    changes: [
      ...plan.changes,
      { from: material.name, to: '本次省略', reason: '该材料非必需，由你确认省略', basis: 'ai' },
    ],
  };
}

/** 只有用户主动操作（家里其实有 / 已备好）才会把材料移出待补齐 */
export function markMaterialReady(plan: Plan, key: string): Plan {
  return {
    ...plan,
    materials: plan.materials.map((m) =>
      m.key === key ? { ...m, state: 'owned', confirmedReady: true, reason: '你已主动标记备好' } : m,
    ),
  };
}

export function markMaterialNeed(plan: Plan, key: string): Plan {
  return {
    ...plan,
    materials: plan.materials.map((m) =>
      m.key === key ? { ...m, state: 'need', confirmedReady: false, reason: '你选择不购买，回到方案调整' } : m,
    ),
  };
}

export function planReadiness(plan: Plan): { blocked: boolean; missingNames: string[]; unsureNames: string[] } {
  const missingNames = plan.materials.filter((m) => m.state === 'need' && m.essential).map((m) => m.name);
  const unsureNames = plan.materials.filter((m) => m.state === 'unsure').map((m) => m.name);
  return { blocked: missingNames.length > 0, missingNames, unsureNames };
}

export function purchaseItems(plan: Plan): MaterialItem[] {
  return plan.materials.filter((m) => m.state === 'need');
}

export function unsureItems(plan: Plan): MaterialItem[] {
  return plan.materials.filter((m) => m.state === 'unsure');
}

/** 校验模型返回的结构，防止模型输出破坏页面状态 */
export function validateModelPlan(value: unknown): value is Partial<Plan> {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.versionName === 'string' &&
    Array.isArray(v.steps) &&
    v.steps.every((s) => s && typeof s === 'object' && typeof (s as Step).text === 'string' && typeof (s as Step).title === 'string') &&
    Array.isArray(v.materials) &&
    Array.isArray(v.changes)
  );
}




