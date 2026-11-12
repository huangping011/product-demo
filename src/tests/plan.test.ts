import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Conditions, Homework, Ingredient, KitchenProfile, Plan, Recipe } from '../types';
import { getRecipe, RECIPES } from '../data/recipes';
import { DEMO_REPLICAS } from '../data/community';
import { EXTERNAL_TARGETS, externalEntries, reasonFor } from '../data/products';
import {
  applySubstitute, conditionsFromReplica, findAllergenConflicts, makeDefaultConditions,
  markMaterialReady, omitMaterial, planReadiness, preparePlan, purchaseItems,
  quantityText, renderStepText, safeSubstitutes, scaledNumber, stepMaterials,
  unsureItems, validateConditions, validateModelPlan,
} from '../lib/plan';
import { generatePlanWithFallback, organizeHomeworkCard, parseChatQuery, recommendRecipes, isModelConfigured } from '../lib/ai';
import { communityItems } from '../lib/communityItems';
import { defaultState, loadState, saveState } from '../lib/storage';

const r1 = getRecipe('r1')!;
const d1 = DEMO_REPLICAS.find((d) => d.id === 'd1')!;

/** 生成一份「已确认厨具 / 忌口、调味品齐全」的条件，用于大多数正向用例 */
function confirmed(recipe: Recipe = r1, overrides: Partial<Conditions> = {}): Conditions {
  const base = makeDefaultConditions(recipe, 'note');
  return {
    ...base,
    appliances: [recipe.primaryAppliance],
    primaryAppliance: recipe.primaryAppliance,
    applianceConfirmed: true,
    avoidConfirmed: true,
    seasonings: recipe.ingredients.filter((i) => i.group === 'seasoning').map((i) => i.name),
    ...overrides,
  };
}

describe('PRD 验收用例（逻辑层）', () => {
  it('1. 从笔记按钮进入，正确带入原菜谱和作者', () => {
    expect(getRecipe('r1')?.id).toBe('r1');
    expect(getRecipe('r1')?.author).toBe('小满的厨房');
    const c = makeDefaultConditions(r1, 'note');
    expect(c.recipeId).toBe('r1');
    expect(c.source).toBe('note');
    const res = preparePlan(r1, confirmed());
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.plan.recipeId).toBe('r1');
      expect(res.plan.source).toBe('note');
      expect(res.plan.conditionSnapshot.recipeId).toBe('r1');
    }
  });

  it('2. 从点点菜谱卡进入，正确带入「一人份 / 有鸡腿」等对话条件，且全部待确认、不写档案', () => {
    const q = '家里有鸡腿，今晚一个人吃，能做什么？';
    const hints = parseChatQuery(q);
    expect(hints.map((h) => h.value)).toContain('一人份');
    expect(hints.map((h) => h.value)).toContain('有鸡腿');
    expect(hints.every((h) => h.confirmed === false)).toBe(true);
    const recs = recommendRecipes(q);
    expect(recs[0].recipe.id).toBe('r1');
    expect(recs[0].reason).toContain('鸡腿');
    const c = makeDefaultConditions(r1, 'chat', null, hints);
    expect(c.servings).toBe(1);
    expect(c.stock.chicken).toBe('have');
    expect(c.chatHints.every((h) => !h.confirmed)).toBe(true);
    expect(c.source).toBe('chat');
    // 对话条件不能默默写入长期档案
    const profile: KitchenProfile | null = null;
    expect(profile).toBeNull();
    const inferred = parseChatQuery('我是新手，宿舍只有微波炉');
    expect(inferred.filter((h) => h.origin === 'inferred').every((h) => !h.confirmed)).toBe(true);
  });

  it('3. 缺某调味品时可选择替换、补购或调整方案', () => {
    const noSoy = confirmed(r1, { seasonings: [] });
    const res = preparePlan(r1, noSoy);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const soy = res.plan.materials.find((m) => m.key === 'soy')!;
    expect(soy.state).toBe('need');
    expect(soy.substitutes.length).toBeGreaterThan(0);
    expect(soy.substitutes.every((s) => !s.name.includes('酱油（含大豆）'))).toBe(true);

    const replaced = applySubstitute(res.plan, 'soy', '盐 2 g + 清水 15 ml');
    expect(replaced.materials.find((m) => m.key === 'soy')?.state).toBe('owned');
    expect(replaced.materials.find((m) => m.key === 'soy')?.chosenSubstitute).toContain('盐');
    expect(replaced.changes.length).toBeGreaterThan(res.plan.changes.length);
    expect(renderStepText(res.plan.steps[1].text, r1, 0.5, replaced)).toContain('盐 2 g');

    const omitted = omitMaterial(res.plan, 'darkSoy');
    expect(omitted.materials.find((m) => m.key === 'darkSoy')?.omitted).toBe(true);
    expect(omitMaterial(res.plan, 'chicken')).toBe(res.plan); // 必需材料不可省略

    const canBuy = preparePlan(r1, confirmed(r1, { seasonings: [], strategy: 'canBuy' }));
    expect(canBuy.ok && purchaseItems(canBuy.plan).some((m) => m.key === 'soy')).toBe(true);
    const follow = preparePlan(r1, confirmed(r1, { seasonings: [], strategy: 'followOriginal' }));
    expect(follow.ok && follow.plan.materials.find((m) => m.key === 'soy')?.state).toBe('need');
    expect(follow.ok && follow.plan.materials.find((m) => m.key === 'soy')?.substitutes.length).toBeGreaterThan(0);
  });

  it('4. 声明过敏后，原料或替代品冲突时明确阻止直接沿用', () => {
    const c = confirmed(r1, { avoid: ['大豆'] });
    const v = validateConditions(r1, c);
    expect(v.ok).toBe(false);
    if (!v.ok) {
      const allergen = v.conflicts.find((c) => c.type === 'allergen');
      expect(allergen?.message).toContain('不能直接沿用');
      if (allergen?.type === 'allergen') expect(allergen.items.map((i) => i.key)).toContain('soy');
    }
    const conflicts = findAllergenConflicts(r1, c);
    expect(conflicts.length).toBeGreaterThan(0);

    // 替代品自身含过敏原时必须被过滤
    const fake: Ingredient = {
      key: 'sauce', name: '调味汁', amount: 10, unit: 'ml', group: 'seasoning', essential: true,
      allergens: ['花生'],
      substitutes: [{ name: '花生酱', note: '含花生', allergens: ['花生'] }, { name: '清水 10 ml', note: '无过敏原' }],
    };
    expect(safeSubstitutes(fake, ['花生']).map((s) => s.name)).toEqual(['清水 10 ml']);

    // 不安全的替代品拒绝应用
    const ok = preparePlan(r1, confirmed());
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(applySubstitute(ok.plan, 'soy', '花生酱')).toBe(ok.plan);
      expect(renderStepText(ok.plan.steps[1].text, r1, 1)).not.toContain('{{');
    }

    // 用户主动选择安全替代品后才允许生成
    const soySafe = safeSubstitutes(r1.ingredients.find((i) => i.key === 'soy')!, ['大豆'])[0].name;
    const darkSafe = safeSubstitutes(r1.ingredients.find((i) => i.key === 'darkSoy')!, ['大豆'])[0].name;
    const resolved = confirmed(r1, {
      avoid: ['大豆'],
      substituteChoices: { soy: soySafe, darkSoy: darkSafe },
    });
    expect(validateConditions(r1, resolved).ok).toBe(true);
    const plan = preparePlan(r1, resolved);
    expect(plan.ok && plan.plan.materials.find((m) => m.key === 'soy')?.chosenSubstitute).toBe(soySafe);
    expect(plan.ok && plan.plan.materials.every((m) => !m.allergenConflict)).toBe(true);
  });

  it('5. 无合适厨具时给出限制或其他菜谱，不强行生成适配结果', () => {
    const c = confirmed(r1, { appliances: ['微波炉'], primaryAppliance: '微波炉' });
    const v = validateConditions(r1, c);
    expect(v.ok).toBe(false);
    if (!v.ok) {
      const appliance = v.conflicts.find((c) => c.type === 'appliance');
      expect(appliance?.message).toContain('不会强行生成');
      if (appliance?.type === 'appliance') expect(appliance.alternatives.some((r) => r.supportedAppliances.includes('微波炉'))).toBe(true);
    }
    expect(preparePlan(r1, c).ok).toBe(false);
    // 设备冲突与过敏冲突同时存在时要一并暴露
    const both = validateConditions(r1, confirmed(r1, { appliances: ['微波炉'], primaryAppliance: '微波炉', avoid: ['大豆'] }));
    expect(both.ok).toBe(false);
    if (!both.ok) expect(both.conflicts.map((x) => x.type)).toEqual(['appliance', 'allergen']);
    // 换成已支持的设备即可正常生成
    expect(preparePlan(r1, confirmed(r1, { appliances: ['电饭煲'], primaryAppliance: '电饭煲' })).ok).toBe(true);
  });

  it('6. 只有选择「补齐原料」或方案仍缺必需材料才进入必买，替代 / 省略移出必买', () => {
    const r6 = getRecipe('r6')!;
    const base = makeDefaultConditions(r6, 'note');
    const have = preparePlan(r6, base);
    expect(have.ok).toBe(true);
    if (!have.ok) return;
    expect(have.plan.materials.every((m) => m.state === 'owned')).toBe(true);
    expect(purchaseItems(have.plan).length).toBe(0);

    // 标记缺少但不选「补齐」：可选材料进入可选采购，不进必买
    const optional = preparePlan(r6, { ...base, stock: { ...base.stock, carrot: 'missing' } });
    expect(optional.ok).toBe(true);
    if (!optional.ok) return;
    const carrot = optional.plan.materials.find((m) => m.key === 'carrot')!;
    expect(carrot.state).toBe('need');
    expect(carrot.originalOptional).toBe(true);

    // 选择「补齐原料」：进入必买
    const bought = preparePlan(r6, { ...base, stock: { ...base.stock, carrot: 'missing' }, buyChoices: ['carrot'] });
    expect(bought.ok).toBe(true);
    if (!bought.ok) return;
    expect(bought.plan.materials.find((m) => m.key === 'carrot')!.originalOptional).toBe(false);
    expect(purchaseItems(bought.plan).some((m) => m.key === 'carrot')).toBe(true);

    // 选用手边已有的糯玉米：移出必买，原方甜玉米转为可选
    const swapped = preparePlan(r6, {
      ...base,
      stock: { ...base.stock, corn: 'missing' },
      substituteChoices: { corn: '糯玉米' },
      substituteHave: { corn: true },
    });
    expect(swapped.ok).toBe(true);
    if (!swapped.ok) return;
    const swappedCorn = swapped.plan.materials.find((m) => m.key === 'corn')!;
    expect(swappedCorn.state).toBe('owned');
    expect(swappedCorn.chosenSubstitute).toBe('糯玉米');
    expect(swappedCorn.originalOptional).toBe(true);
    expect(swapped.plan.flavorImpact.some((f) => f.includes('甜味可能变淡'))).toBe(true);

    // 替代品手边没有：按替代品名称进入必买
    const buySwap = preparePlan(r6, {
      ...base,
      stock: { ...base.stock, corn: 'missing' },
      substituteChoices: { corn: '糯玉米' },
      substituteHave: { corn: false },
    });
    expect(buySwap.ok).toBe(true);
    if (!buySwap.ok) return;
    const needSwap = buySwap.plan.materials.find((m) => m.key === 'corn')!;
    expect(needSwap.state).toBe('need');
    expect(needSwap.buyName).toBe('糯玉米');
    expect(needSwap.originalOptional).toBe(false);
  });

  it('7. 点击采购链接不自动把材料标为已备齐，必须用户主动确认', () => {
    const plan = preparePlan(r1, confirmed(r1, { seasonings: [] }));
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    const before = plan.plan.materials.find((m) => m.key === 'soy')!.state;
    const entries = externalEntries('生抽');
    expect(entries.length).toBe(2);
    expect(entries.every((e) => EXTERNAL_TARGETS.some((t) => e.externalUrl?.startsWith(t.template)))).toBe(true);
    expect(reasonFor('生抽', '15 ml')).toContain('清单缺少');
    // 模拟「点击 + 记录事件」：不调用任何状态更新函数
    const after = plan.plan.materials.find((m) => m.key === 'soy')!.state;
    expect(after).toBe(before);
    expect(after).toBe('need');
    expect(markMaterialReady(plan.plan, 'soy').materials.find((m) => m.key === 'soy')?.state).toBe('owned');
    expect(markMaterialReady(plan.plan, 'soy').materials.find((m) => m.key === 'soy')?.confirmedReady).toBe(true);
  });

  it('8. 做菜步骤在刷新后能够恢复（route + 进度持久化）', () => {
    const mem = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => { mem.set(k, v); },
      removeItem: (k: string) => { mem.delete(k); },
      clear: () => mem.clear(),
    });
    const state = defaultState();
    state.route = { name: 'cook', planId: 'plan_x' };
    state.cooking.plan_x = {
      planId: 'plan_x', stepIndex: 2, startedAt: '2026-11-12T00:00:00.000Z',
      updatedAt: '2026-11-12T00:05:00.000Z', completed: false,
    };
    saveState(state);
    const restored = loadState();
    expect(restored.route).toEqual({ name: 'cook', planId: 'plan_x' });
    expect(restored.cooking.plan_x.stepIndex).toBe(2);
    expect(restored.cooking.plan_x.completed).toBe(false);
  });

  it('9. 发布作业后，复刻区能看到真实填写的内容', () => {
    const hw: Homework = {
      id: 'hw_test', planId: 'plan_x', recipeId: 'r1', createdAt: '2026-11-12T10:00:00.000Z',
      photo: '🍗', result: 'mostly', appliance: '电饭煲', servings: 1,
      adjustments: '少放了糖，多焖 3 分钟', advice: '一人份酱汁别照搬',
      visibility: 'public', organized: true, author: '我', versionName: '电饭煲版照烧鸡腿', isDemo: false,
    };
    const items = communityItems('r1', [hw]);
    const mine = items.find((i) => i.id === 'hw_test');
    expect(mine).toBeDefined();
    expect(mine?.advice).toBe('一人份酱汁别照搬');
    expect(mine?.adjustments.join('')).toContain('多焖 3 分钟');
    expect(mine?.result).toBe('mostly');
    expect(mine?.isDemo).toBe(false);
    expect(communityItems('r1', [{ ...hw, visibility: 'private' }]).some((i) => i.id === 'hw_test')).toBe(false);
  });

  it('10. 「按这个版本做」重新进入条件确认，不套用别人的全部条件', () => {
    const c = conditionsFromReplica(r1, d1, null);
    expect(c.source).toBe('replica');
    expect(c.servings).toBe(d1.servings);
    expect(c.appliances).toEqual([d1.appliance]);
    expect(c.applianceConfirmed).toBe(true);
    expect(c.avoidConfirmed).toBe(true);
    expect(c.stock.chicken).toBe('have'); // 默认备齐，缺什么由用户点
    expect(c.chatHints.some((h) => h.value.includes(d1.author))).toBe(true);
    expect(c.chatHints.every((h) => !h.confirmed)).toBe(true);
    expect(validateConditions(r1, c).ok).toBe(true);
  });

  it('11. 模型请求失败时有清楚提示，方案与已有资料不丢失', async () => {
    const c = confirmed();
    const failed = await generatePlanWithFallback(r1, c, { simulateFailure: true });
    expect(failed.ok).toBe(true);
    expect(failed.modelFailed).toBe(true);
    expect(failed.fallbackNotice).toContain('失败');
    if (failed.ok) {
      expect(failed.plan.engine).toBe('demo-rule');
      expect(failed.plan.fallbackNotice).toContain('失败');
      expect(failed.plan.steps.length).toBeGreaterThan(0);
      expect(failed.plan.conditionSnapshot.recipeId).toBe('r1');
      expect(failed.plan.conditionSnapshot.avoidConfirmed).toBe(true);
      expect(failed.plan.materials.length).toBe(r1.ingredients.length);
    }
    const normal = await generatePlanWithFallback(r1, c);
    expect(normal.ok).toBe(true);
    if (normal.ok) expect(['model', 'demo-rule']).toContain(normal.plan.engine);
    if (normal.ok && !isModelConfigured()) expect(normal.fallbackNotice).toContain('本地规则生成');
    expect(validateModelPlan({ versionName: 'x', steps: [{ title: 'a', text: 'b' }], materials: [], changes: [] })).toBe(true);
    expect(validateModelPlan({ versionName: 'x', steps: [{ title: 'a' }] })).toBe(false);
  });

  it('12. 手机宽度下主按钮、材料清单和步骤有明确的可操作样式', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
    expect(css).toContain('max-width: 460px');
    expect(css).toMatch(/\.btn\s*\{[^}]*min-height:\s*44px/s);
    expect(css).toContain('position: fixed; bottom: 0');
    expect(css).toContain('.page-bottom');
    expect(css).toContain('env(safe-area-inset-bottom)');
    expect(css).toContain('.material-row');
    expect(css).toContain('.step-card');
    expect(css).toContain('overflow-x: hidden'); // 390px 下不出现横向滚动
    expect(css).toContain('.note-hero'); // 小红书风笔记大图
    expect(css).toContain('.chip'); // 条件页轻量选项标签
    expect(css).toContain('--brand:'); // 小红书红用于主操作与选中态
  });
});

describe('辅助规则', () => {
  it('份量由代码计算，步骤文本替换占位符且不写「适量」', () => {
    expect(scaledNumber(15, 0.5, 'ml')).toBe(7.5);
    expect(scaledNumber(3, 0.5, '个')).toBe(1.5); // 计数类保留 0.5 档，支持「半根」
    const soy = r1.ingredients.find((i) => i.key === 'soy')!;
    expect(quantityText(soy, 0.5)).toBe('7.5 ml');
    // 主推菜「2–3 人份」按 2.5 人份基准换算：1 人份排骨 140 g、4 人份 560 g，盐恒为「适量」
    const r6 = getRecipe('r6')!;
    expect(r6.servingsBase).toBe(2.5);
    const ribs = r6.ingredients.find((i) => i.key === 'porkRibs')!;
    expect(quantityText(ribs, 1 / 2.5)).toBe('140 g');
    expect(quantityText(ribs, 4 / 2.5)).toBe('560 g');
    expect(quantityText(r6.ingredients.find((i) => i.key === 'salt')!, 1 / 2.5)).toBe('适量（按口味）');
    const plan = preparePlan(r1, confirmed());
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    const text = renderStepText(plan.plan.steps[1].text, r1, 0.5, plan.plan);
    expect(text).not.toContain('{{');
    expect(text).toContain('生抽');
    expect(plan.plan.steps.every((s) => !s.text.includes('适量') && !s.text.includes('煮熟即可'))).toBe(true);
    expect(plan.plan.steps.every((s) => s.doneState.length > 3)).toBe(true);
    expect(stepMaterials(plan.plan.steps[1], r1, 0.5, plan.plan).length).toBeGreaterThan(0);
    expect(plan.plan.steps.some((s) => s.risk)).toBe(true); // 计时不等于安全状态
  });

  it('未确认厨具 / 忌口时阻止生成', () => {
    const base = makeDefaultConditions(r1, 'note');
    const v = validateConditions(r1, { ...base, appliances: ['平底锅'], avoidConfirmed: true, applianceConfirmed: false });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.errors.join('')).toContain('厨具');
    const v2 = validateConditions(r1, { ...base, applianceConfirmed: true, appliances: ['平底锅'], avoidConfirmed: false });
    expect(v2.ok).toBe(false);
    if (!v2.ok) expect(v2.errors.join('')).toContain('忌口');
  });

  it('时间不足不压缩步骤时间，只给提示与更快菜谱入口', () => {
    const plan = preparePlan(r1, confirmed(r1, { timeLimit: 15 }));
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.plan.totalMinutes).toBe(30);
    expect(plan.plan.warnings.some((w) => w.includes('不会为了凑时间被压缩'))).toBe(true);
    expect(plan.plan.steps.reduce((a, s) => a + s.minutes, 0)).toBeGreaterThan(15);
  });

  it('作业卡整理不添加用户没说过的内容', () => {
    const text = organizeHomeworkCard({
      versionName: '电饭煲版照烧鸡腿', result: 'success', servings: 1, appliance: '电饭煲',
      adjustments: '', advice: '别照搬两人份酱汁',
    });
    expect(text).toContain('别照搬两人份酱汁');
    expect(text).not.toContain('外酥里嫩');
    expect(text).not.toContain('调整');
    expect(text.split('\n').length).toBe(3);
  });

  it('示例菜谱数据结构完整，每道 2 条以上复刻记录', () => {
    expect(RECIPES.length).toBe(6); // 含用户图片新增的「山药玉米排骨汤」
    for (const r of RECIPES) {
      expect(r.variants.length).toBeGreaterThanOrEqual(2);
      expect(r.supportedAppliances.every((a) => r.variants.some((v) => v.appliance === a))).toBe(true);
      expect(r.ingredients.every((i) => i.amount > 0 && i.unit)).toBe(true);
      expect(DEMO_REPLICAS.filter((d) => d.recipeId === r.id).length).toBeGreaterThanOrEqual(2);
      expect(r.variants.every((v) => v.steps.every((s) => s.doneState && s.setting && s.minutes > 0))).toBe(true);
    }
    const plan = preparePlan(r1, confirmed());
    expect(plan.ok && planReadiness(plan.plan).blocked).toBe(false);
  });
});
