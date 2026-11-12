import { useEffect, useMemo, useState } from 'react';
import {
  Button, Chip, Header, Notice, Page, SectionTitle, Segmented, Tag, Thumb,
} from '../components/ui';
import {
  COMMON_ALLERGENS, type ChatHint, type Conditions as TConditions, type Ingredient, type StockState,
} from '../types';
import { getRecipe, getVariant } from '../data/recipes';
import { useApp } from '../lib/store';
import { generatePlanWithFallback } from '../lib/ai';
import { makeDefaultConditions, quantityText, safeSubstitutes, validateConditions } from '../lib/plan';

const QUICK_SERVINGS = [1, 2, 3, 4];
const QUICK_TIMES = [30, 60, 90];
const MAX_SERVINGS = 8;

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}

/** 数字输入：输入合法值就立即生效，不弹窗、不二次确认 */
function NumberField({
  value, unit, min, max, invalid, onChange,
}: {
  value: string; unit: string; min: number; max?: number; invalid: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-number">
      <input
        className={`input ${invalid ? 'input-error' : ''}`}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        autoFocus
        aria-label={`自定义${unit}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="inline-unit">{unit}</span>
      {invalid && <span className="inline-error">请输入 1–{max ?? 600} 的整数</span>}
    </div>
  );
}

function CustomEntry({ label, onAdd }: { label: string; onAdd: (name: string) => boolean }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  if (!open) return <Button size="xs" variant="secondary" onClick={() => setOpen(true)}>自定义</Button>;
  return (
    <form className="row mt6" onSubmit={(event) => {
      event.preventDefault();
      if (value.trim() && onAdd(value.trim())) {
        setValue('');
        setOpen(false);
      }
    }}>
      <input autoFocus className="input" aria-label={label} placeholder={label} value={value} onChange={(event) => setValue(event.target.value)} />
      <button type="submit" className="text-btn" disabled={!value.trim()}>确认</button>
      <button type="button" className="text-btn" onClick={() => setOpen(false)}>取消</button>
    </form>
  );
}
function GapRow({
  ing, missing, amount, options, substitute, substituteHave, omitted, bought, impact, omitImpact,
  onToggle, onSubstitute, onSubHave, onOmit, onBuy, onUndo,
}: {
  ing: Ingredient;
  missing: boolean;
  amount: string;
  options: { name: string; note: string }[];
  substitute?: string;
  substituteHave?: boolean;
  omitted?: boolean;
  bought?: boolean;
  impact?: string;
  omitImpact?: string;
  onToggle: () => void;
  onSubstitute: (name: string) => void;
  onSubHave: (have: boolean) => void;
  onOmit: () => void;
  onBuy: () => void;
  onUndo: () => void;
}) {
  const [showOptions, setShowOptions] = useState(false);
  const swapOptions = options.filter((s) => !s.name.startsWith('省略'));
  return (
    <div className={`gap-row ${missing ? 'gap-missing' : ''}`}>
      <button type="button" className="gap-head" aria-pressed={!missing} onClick={onToggle}>
        <span className="gap-dot" aria-hidden="true">{missing ? '○' : '✓'}</span>
        <span className="gap-name">
          {ing.name}
          {ing.essential ? <span className="tag tag-danger" style={{ marginLeft: 5 }}>必需</span> : <span className="tag tag-outline" style={{ marginLeft: 5 }}>可选</span>}
        </span>
        <span className="gap-amount">{amount}</span>
        <span className={`tag ${missing ? 'tag-danger' : 'tag-ok'}`}>{missing ? '未勾选' : '已备齐'}</span>
      </button>
      {missing && <button className="text-btn" aria-expanded={showOptions} onClick={() => setShowOptions(!showOptions)}>缺少这项？</button>}
      {missing && (showOptions || substitute || omitted || bought) && (
        <div className="gap-panel">
          {substitute ? (
            <>
              <div className="gap-choice"><b>用「{substitute}」替换</b></div>
              <div className="gap-choice mt6">{impact ?? '暂无风味说明'} <Tag tone="demo">预设说明</Tag></div>
              <div className="chip-row mt6">
                <Chip active={substituteHave !== false} onClick={() => onSubHave(true)}>手边已有{substitute}</Chip>
                <Chip active={substituteHave === false} onClick={() => onSubHave(false)}>没有，需购买</Chip>
              </div>
              <button type="button" className="text-btn" onClick={onUndo}>改回：补齐{ing.name}</button>
            </>
          ) : omitted ? (
            <>
              <div className="gap-choice"><b>本次省略{ing.name}</b></div>
              {omitImpact && <div className="gap-choice mt6">{omitImpact} <Tag tone="demo">预设说明</Tag></div>}
              <button type="button" className="text-btn" onClick={onUndo}>撤销省略</button>
            </>
          ) : bought ? (
            <>
              <div className="gap-choice"><b>已加入待采购清单：{ing.name}</b></div>
              <div className="gap-choice mt6">生成后可在「待采购清单」按渠道购买，采购状态需你主动确认。</div>
              <button type="button" className="text-btn" onClick={onUndo}>改回：换一种 / 省略</button>
            </>
          ) : (
            <>
              <div className="chip-row">
                {swapOptions.map((s) => (
                  <Button key={s.name} size="xs" variant="secondary" onClick={() => onSubstitute(s.name)}>用「{s.name}」替换</Button>
                ))}
                {!ing.essential && <Button size="xs" variant="ghost" onClick={onOmit}>省略</Button>}
                <Button size="xs" variant="secondary" onClick={onBuy}>补齐{ing.name}</Button>
              </div>
              {ing.essential && <div className="tiny muted mt6">必需材料，不能省略；缺了请补齐，或换一道做法。</div>}
              {swapOptions.length === 0 && <div className="tiny muted mt6">没有可靠替换依据，建议补齐原料。</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ConditionsEditor({
  recipe, c, source,
}: {
  recipe: NonNullable<ReturnType<typeof getRecipe>>;
  c: TConditions;
  source: TConditions['source'];
}) {
  const app = useApp();
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [avoidInput, setAvoidInput] = useState('');
  const [customServings, setCustomServings] = useState(!QUICK_SERVINGS.includes(c.servings));
  const [servingsText, setServingsText] = useState(String(c.servings));
  const [customTime, setCustomTime] = useState(c.timeLimit !== null && !QUICK_TIMES.includes(c.timeLimit));
  const [timeText, setTimeText] = useState(c.timeLimit === null ? '' : String(c.timeLimit));

  const set = (p: Partial<TConditions>) => app.updateConditions(p);
  const toggleIn = <T,>(arr: T[], v: T): T[] => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const validation = useMemo(() => validateConditions(recipe, c), [recipe, c]);
  const errors = attempted && validation && !validation.ok ? validation.errors : [];
  const conflicts = validation && !validation.ok ? validation.conflicts : [];
  const applianceConflict = conflicts.find((x) => x.type === 'appliance');
  const allergenConflict = conflicts.find((x) => x.type === 'allergen');

  const mainIngredients = recipe.ingredients.filter((i) => i.group !== 'seasoning');
  const seasoningIngredients = recipe.ingredients.filter((i) => i.group === 'seasoning');
  const allIngredients = [...mainIngredients, ...seasoningIngredients];
  const factor = c.servings / recipe.servingsBase;

  const isMissing = (ing: Ingredient) => ing.group === 'seasoning'
    ? !c.seasonings.includes(ing.name)
    : (c.stock[ing.key] ?? 'missing') === 'missing';
  const isResolved = (ing: Ingredient) => {
    if (c.omittedIngredients.includes(ing.key)) return true;
    if (c.substituteChoices[ing.key]) return c.substituteHave[ing.key] !== false;
    return false;
  };
  const missingCount = allIngredients.filter((i) => isMissing(i) && !isResolved(i)).length;

  const currentAppliance = c.primaryAppliance ?? c.appliances[0] ?? recipe.primaryAppliance;
  const variant = getVariant(recipe, currentAppliance);
  const [shoppingForCookware, setShoppingForCookware] = useState(false);
  const applianceOptions = [recipe.primaryAppliance, ...recipe.supportedAppliances.filter((a) => a !== recipe.primaryAppliance)];
  const profile = app.state.profile;
  const profileHasAppliance = Boolean(profile?.appliances.some((a) => recipe.supportedAppliances.includes(a)));

  const servingsValid = /^\d+$/.test(servingsText) && Number(servingsText) >= 1 && Number(servingsText) <= MAX_SERVINGS;
  const timeValid = /^\d+$/.test(timeText) && Number(timeText) >= 1 && Number(timeText) <= 600;

  const clearChoices = (key: string) => ({
    substituteChoices: without(c.substituteChoices, key),
    substituteHave: without(c.substituteHave, key),
    omittedIngredients: c.omittedIngredients.filter((k) => k !== key),
    buyChoices: c.buyChoices.filter((k) => k !== key),
  });

  const patchStock = (ing: Ingredient, missing: boolean) => {
    if (ing.group === 'seasoning') {
      set({
        seasonings: missing ? c.seasonings.filter((n) => n !== ing.name) : Array.from(new Set([...c.seasonings, ing.name])),
        ...clearChoices(ing.key),
      });
    } else {
      set({ stock: { ...c.stock, [ing.key]: missing ? 'missing' : 'have' }, ...clearChoices(ing.key) });
    }
  };

  const chooseSubstitute = (ing: Ingredient, name: string) => {
    set({
      substituteChoices: { ...c.substituteChoices, [ing.key]: name },
      substituteHave: { ...c.substituteHave, [ing.key]: true },
      omittedIngredients: c.omittedIngredients.filter((k) => k !== ing.key),
      buyChoices: c.buyChoices.filter((k) => k !== ing.key),
    });
  };

  const chooseOmit = (ing: Ingredient) => {
    set({
      omittedIngredients: Array.from(new Set([...c.omittedIngredients, ing.key])),
      substituteChoices: without(c.substituteChoices, ing.key),
      substituteHave: without(c.substituteHave, ing.key),
      buyChoices: c.buyChoices.filter((k) => k !== ing.key),
    });
  };

  const chooseBuy = (ing: Ingredient) => {
    set({
      buyChoices: Array.from(new Set([...c.buyChoices, ing.key])),
      substituteChoices: without(c.substituteChoices, ing.key),
      substituteHave: without(c.substituteHave, ing.key),
      omittedIngredients: c.omittedIngredients.filter((k) => k !== ing.key),
    });
  };

  const fillGroup = (group: 'main' | 'seasoning') => {
    const items = group === 'main' ? mainIngredients : seasoningIngredients;
    const keys = new Set(items.map((item) => item.key));
    set({
      ...(group === 'main'
        ? { stock: { ...c.stock, ...Object.fromEntries(items.map((item) => [item.key, 'have' as StockState])) } }
        : { seasonings: Array.from(new Set([...c.seasonings, ...items.map((item) => item.name)])) }),
      substituteChoices: Object.fromEntries(Object.entries(c.substituteChoices).filter(([key]) => !keys.has(key))),
      substituteHave: Object.fromEntries(Object.entries(c.substituteHave).filter(([key]) => !keys.has(key))),
      omittedIngredients: c.omittedIngredients.filter((key) => !keys.has(key)),
      buyChoices: c.buyChoices.filter((key) => !keys.has(key)),
    });
  };

  const addExtra = (name: string, group: 'main' | 'seasoning') => {
    const existing = allIngredients.find((item) => item.name === name);
    if (existing) patchStock(existing, false);
    else if (!c.extraIngredients.some((item) => item.name === name && (item.group ?? 'main') === group)) {
      set({ extraIngredients: [...c.extraIngredients, { name, group, state: 'have' }] });
    }
    return true;
  };

  const extrasFor = (group: 'main' | 'seasoning') => (
    <>
      {c.extraIngredients.filter((item) => (item.group ?? 'main') === group).map((item) => (
        <Chip key={item.name} active onClick={() => set({ extraIngredients: c.extraIngredients.filter((extra) => extra !== item) })}>
          {item.name} ×
        </Chip>
      ))}
      <CustomEntry label={group === 'main' ? '自定义食材' : '自定义调味品'} onAdd={(name) => addExtra(name, group)} />
    </>
  );

  const changeServings = (n: number) => {
    setCustomServings(false);
    setServingsText(String(n));
    set({ servings: n });
  };

  const changeTime = (v: number | null) => {
    setCustomTime(false);
    setTimeText(v === null ? '' : String(v));
    set({ timeLimit: v });
  };

  const chooseAppliance = (a: TConditions['primaryAppliance']) => {
    setShoppingForCookware(false);
    if (!a) return;
    set({ appliances: [a], primaryAppliance: a, applianceConfirmed: true });
  };

  const selectTimeExact = (minutes: number) => {
    if (QUICK_TIMES.includes(minutes)) changeTime(minutes);
    else { setCustomTime(true); setTimeText(String(minutes)); set({ timeLimit: minutes }); }
  };

  const handleGenerate = async () => {
    if (customServings && !servingsValid) {
      app.toast(`请输入 1–${MAX_SERVINGS} 之间的整数人数`, 'warn');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (customTime && !timeValid) {
      app.toast('请输入大于 0 的整数分钟', 'warn');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setAttempted(true);
    const v = validateConditions(recipe, c);
    if (!v.ok) {
      app.toast(v.errors[0] ?? v.conflicts[0]?.message ?? '请先补全条件', 'warn');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setBusy(true);
    try {
      const res = await generatePlanWithFallback(recipe, c, { simulateFailure: app.state.settings.simulateAiFailure });
      if (!res.ok) {
        app.toast(res.validation.errors[0] ?? res.validation.conflicts[0]?.message ?? '生成失败', 'warn');
        return;
      }
      app.upsertPlan(res.plan);
      app.logEvent('plan_generated', `${recipe.title} → ${res.plan.versionName}（${res.plan.engine === 'model' ? '模型' : '本地规则示例方案'}）`);
      if (res.modelFailed) {
        app.logEvent('model_failure', res.fallbackNotice ?? '模型请求失败，已降级');
        app.toast('模型请求失败，已切换到明确标注的示例方案', 'warn');
      } else {
        app.toast('方案已生成', 'success');
      }
      app.navigate({ name: 'plan', planId: res.plan.id });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProfile = () => {
    app.saveProfileFromConditions();
    app.toast('已保存厨房档案', 'success');
  };

  const timeLabel = c.timeLimit === null ? '不限' : `${c.timeLimit} 分钟`;
  const timeTooShort = c.timeLimit !== null && variant !== undefined && c.timeLimit < variant.minutes;
  const fasterVariants = recipe.supportedAppliances
    .map((a) => getVariant(recipe, a))
    .filter((v): v is NonNullable<typeof v> => !!v && v.minutes < (variant?.minutes ?? recipe.minutes) && v.appliance !== currentAppliance)
    .sort((a, b) => a.minutes - b.minutes)
    .slice(0, 2);

  return (
    <>
      <Header title="我的烹饪条件" subtitle={`${recipe.title} · 第 1 步 / 共 5 步`} showDemo={false} />
      <Page bottomBar={
        <div className="cond-bottom">
          <div className="cond-summary">
            <span className="cond-summary-text">{c.servings} 人份 · {timeLabel} · {currentAppliance} · 缺 {missingCount} 项</span>
          </div>
          <Button block disabled={busy || shoppingForCookware} onClick={handleGenerate}>{busy ? '生成中…' : '生成我的独家配方'}</Button>
        </div>
      }>
        <div className="card flat row" style={{ gap: 10 }}>
          <Thumb cover={recipe.cover} size="md" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="small strong" style={{ lineHeight: 1.5 }}>{recipe.title}</div>
            <div className="tiny muted mt6">作者：{recipe.author}</div>
            <button type="button" className="source-link mt6" onClick={() => app.navigate({ name: 'note', recipeId: recipe.id })}>
              来源：笔记详情<span className="source-link-arrow" aria-hidden="true">›</span>
            </button>
          </div>
        </div>

        <div className="row mb10" style={{ gap: 8 }}>
          <Button size="sm" variant={c.prefillFromProfile ? "primary" : "secondary"} style={{ flex: 1 }} aria-pressed={c.prefillFromProfile} onClick={() => {
            if (!profile) {
              app.toast('还没有厨房档案，可在口味与忌口下方保存。');
              return;
            }
            const appliance = profile.appliances.find((item) => recipe.supportedAppliances.includes(item));
            set({
              seasonings: Array.from(new Set([...c.seasonings, ...profile.seasonings])),
              ...(appliance ? { appliances: [appliance], primaryAppliance: appliance } : {}),
              avoid: [...profile.avoid],
              ...(profile.taste ? { taste: { ...profile.taste } } : {}),
              prefillFromProfile: true,
            });
            app.toast('已使用厨房档案', 'success');
          }}>使用我的厨房档案</Button>
          <Button size="sm" variant={!c.prefillFromProfile ? "primary" : "secondary"} style={{ flex: 1 }} aria-pressed={!c.prefillFromProfile} onClick={() => {
            const defaults = makeDefaultConditions(recipe, source, undefined);
            set({ ...defaults, servings: c.servings, timeLimit: c.timeLimit, chatHints: c.chatHints });
            setAvoidInput('');
          }}>重新填写</Button>
        </div>
        {source === 'chat' && c.chatHints.length > 0 && (
          <Notice tone="info"><b>已从对话带入：</b>{c.chatHints.map((h) => h.value).slice(0, 4).join('、')}。可以直接修改。</Notice>
        )}
        {source === 'replica' && (
          <Notice tone="info"><b>参考复刻版本：</b>份量与锅具已带入，材料、忌口与缺货按你本次的实际情况确认。</Notice>
        )}

        {errors.length > 0 && <Notice tone="danger"><b>还需要补充：</b>{errors.join('；')}</Notice>}
        {applianceConflict && (
          <div className="card flat" style={{ borderColor: 'var(--red)', background: 'var(--red-soft)' }}>
            <div className="card-title">⚠️ 厨具条件冲突</div>
            <div className="card-sub">{applianceConflict.message}</div>
            <div className="divider" />
            <div className="small strong mb6">可用这些厨具做的其他菜谱</div>
            {applianceConflict.alternatives.slice(0, 3).map((r) => (
              <div key={r.id} className="row-between" style={{ padding: '6px 0' }}>
                <div className="small">{r.title}<div className="tiny muted">{r.supportedAppliances.join(' / ')} · {r.minutes} 分钟</div></div>
                <Button size="xs" variant="secondary" onClick={() => app.navigate({ name: 'note', recipeId: r.id })}>查看</Button>
              </div>
            ))}
            {applianceConflict.alternatives.length === 0 && <div className="small muted">预置菜谱中没有匹配的设备组合，可返回修改厨具。</div>}
          </div>
        )}
        {allergenConflict && (
          <div className="card flat" style={{ borderColor: 'var(--red)', background: 'var(--red-soft)' }}>
            <div className="card-title">⚠️ 忌口 / 过敏冲突：不能直接沿用</div>
            <div className="card-sub">{allergenConflict.message}</div>
            <div className="divider" />
            {allergenConflict.items.map((item) => (
              <div key={item.key} style={{ marginBottom: 12 }}>
                <div className="small strong">{item.name} <span className="tag tag-danger">{item.matched.join('、')}</span></div>
                {item.resolved ? (
                  <div className="small mt6" style={{ color: 'var(--green)' }}>✓ 已选择安全替代品：{item.resolvedWith}</div>
                ) : item.locked ? (
                  <div className="small mt6" style={{ color: 'var(--red)' }}>这项设为「不可替换」，请先解除锁定或换一道菜。</div>
                ) : item.safeOptions.length > 0 ? (
                  <>
                    <div className="tiny muted mt6">选择不含过敏原的替代品后才会继续生成：</div>
                    <div className="chip-row mt6">
                      {item.safeOptions.map((s) => (
                        <Chip key={s.name} onClick={() => set({
                          substituteChoices: { ...c.substituteChoices, [item.key]: s.name },
                          substituteHave: { ...c.substituteHave, [item.key]: true },
                        })}>{s.name}</Chip>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="small mt6" style={{ color: 'var(--red)' }}>没有安全的替代品，请换一道菜或修改忌口设置。</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ① 份量 · 时间 */}
        <SectionTitle title="① 烹饪目标" />
        <div className="card flat">
          <div className="small strong mb6">用餐人数</div>
          <div className="chip-row">
            {QUICK_SERVINGS.map((n) => (
              <Chip key={n} active={!customServings && c.servings === n} onClick={() => changeServings(n)}>{n} 人</Chip>
            ))}
            <Chip active={customServings} onClick={() => {
              setCustomServings(true);
              setServingsText(QUICK_SERVINGS.includes(c.servings) ? '' : String(c.servings));
            }}>自定义</Chip>
          </div>
          {customServings && (
            <NumberField
              value={servingsText}
              unit="人"
              min={1}
              max={MAX_SERVINGS}
              invalid={servingsText !== '' && !servingsValid}
              onChange={(v) => {
                setServingsText(v);
                const n = Number(v);
                if (/^\d+$/.test(v) && n >= 1 && n <= MAX_SERVINGS) set({ servings: n });
              }}
            />
          )}

          <div className="divider" />
          <div className="small strong mb6">烹饪时间</div>
          <div className="chip-row">
            {QUICK_TIMES.map((n) => (
              <Chip key={n} active={!customTime && c.timeLimit === n} onClick={() => changeTime(n)}>{n} 分钟</Chip>
            ))}
            <Chip active={!customTime && c.timeLimit === null} onClick={() => changeTime(null)}>不限</Chip>
            <Chip active={customTime} onClick={() => {
              setCustomTime(true);
              setTimeText(c.timeLimit === null || QUICK_TIMES.includes(c.timeLimit) ? '' : String(c.timeLimit));
            }}>自定义</Chip>
          </div>
          {customTime && (
            <NumberField
              value={timeText}
              unit="分钟"
              min={1}
              max={600}
              invalid={timeText !== '' && !timeValid}
              onChange={(v) => {
                setTimeText(v);
                const n = Number(v);
                if (/^\d+$/.test(v) && n >= 1 && n <= 600) set({ timeLimit: n });
              }}
            />
          )}
          {timeTooShort && variant && (
            <Notice tone="warn">
              <b>时间偏紧：</b>当前 {currentAppliance} 预计需要 {variant.minutes} 分钟。
              <div className="chip-row mt6">
                {fasterVariants.map((v) => (
                  <Button key={v.appliance} size="xs" variant="secondary" onClick={() => chooseAppliance(v.appliance)}>换{v.appliance}（{v.minutes} 分钟）</Button>
                ))}
                <Button size="xs" variant="secondary" onClick={() => selectTimeExact(variant.minutes)}>改为 {variant.minutes} 分钟</Button>
              </div>
            </Notice>
          )}
        </div>

        {/* ② 食材 */}
        <SectionTitle title="② 食材" extra={<Button size="xs" variant="secondary" onClick={() => fillGroup('main')}>材料都齐了</Button>} />
        <div className="card flat">
          <div className="form-hint">勾选手边已有的食材。</div>
          {mainIngredients.map((ing) => {
            const missing = isMissing(ing);
            const substitute = c.substituteChoices[ing.key];
            const safe = safeSubstitutes(ing, c.avoid);
            return (
              <GapRow
                key={ing.key}
                ing={ing}
                missing={missing}
                options={safe}
                amount={quantityText(ing, factor, c.taste)}
                substitute={substitute}
                substituteHave={c.substituteHave[ing.key]}
                omitted={c.omittedIngredients.includes(ing.key)}
                bought={c.buyChoices.includes(ing.key)}
                impact={safe.find((s) => s.name === substitute)?.note}
                omitImpact={ing.substitutes?.find((s) => s.name.startsWith('省略'))?.note}
                onToggle={() => patchStock(ing, !missing)}
                onSubstitute={(name) => chooseSubstitute(ing, name)}
                onSubHave={(have) => set({ substituteHave: { ...c.substituteHave, [ing.key]: have } })}
                onOmit={() => chooseOmit(ing)}
                onBuy={() => chooseBuy(ing)}
                onUndo={() => set(clearChoices(ing.key))}
              />
            );
          })}
          {extrasFor('main')}
        </div>

        {/* ③ 调味品 */}
        <SectionTitle title="③ 调味品" extra={<Button size="xs" variant="secondary" onClick={() => fillGroup('seasoning')}>材料都齐了</Button>} />
        <div className="card flat">
          <div className="form-hint">勾选手边已有的调味品。</div>
          {seasoningIngredients.map((ing) => {
            const missing = isMissing(ing);
            const substitute = c.substituteChoices[ing.key];
            const safe = safeSubstitutes(ing, c.avoid);
            return (
              <GapRow
                key={ing.key}
                ing={ing}
                missing={missing}
                options={safe}
                amount={quantityText(ing, factor, c.taste)}
                substitute={substitute}
                substituteHave={c.substituteHave[ing.key]}
                omitted={c.omittedIngredients.includes(ing.key)}
                bought={c.buyChoices.includes(ing.key)}
                impact={safe.find((s) => s.name === substitute)?.note}
                omitImpact={ing.substitutes?.find((s) => s.name.startsWith('省略'))?.note}
                onToggle={() => patchStock(ing, !missing)}
                onSubstitute={(name) => chooseSubstitute(ing, name)}
                onSubHave={(have) => set({ substituteHave: { ...c.substituteHave, [ing.key]: have } })}
                onOmit={() => chooseOmit(ing)}
                onBuy={() => chooseBuy(ing)}
                onUndo={() => set(clearChoices(ing.key))}
              />
            );
          })}
          {extrasFor('seasoning')}
        </div>

        {/* ④ 厨具 */}
        <SectionTitle title="④ 厨具" extra="只选本次使用的一口" />
        <div className="card flat">
          {profile && !profileHasAppliance && (
            <Notice tone="warn">厨房档案里的锅具都不适用于这道菜，请在下面选一口本次能用的锅。</Notice>
          )}
          <div className="chip-row">
            {applianceOptions.map((a) => (
              <Chip key={a} active={!shoppingForCookware && currentAppliance === a} onClick={() => chooseAppliance(a)}>
                {!shoppingForCookware && currentAppliance === a ? '✓ ' : ''}{a}{a === recipe.primaryAppliance ? '（原方）' : ''}
              </Chip>
            ))}
          </div>
          <Button className="mt10" size="sm" variant={shoppingForCookware ? 'primary' : 'secondary'} aria-pressed={shoppingForCookware} aria-expanded={shoppingForCookware} onClick={() => setShoppingForCookware(!shoppingForCookware)}>
            没有合适的厨具，去采购
          </Button>
          {shoppingForCookware && (
            <div className="card flat mt10">
              <div className="small strong">适合这道菜的厨具</div>
              {applianceOptions.map((appliance) => (
                <div key={appliance} className="row-between mt10">
                  <span className="small">{appliance} · 约 {getVariant(recipe, appliance)?.minutes ?? recipe.minutes} 分钟</span>
                  <a className="text-btn" href={`https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(appliance)}`} target="_blank" rel="noreferrer">去小红书搜索 ›</a>
                </div>
              ))}
            </div>
          )}

          <div className="tiny muted mt6">这道菜已验证支持的设备：{recipe.supportedAppliances.join(' / ')}；当前预计约 {variant?.minutes ?? recipe.minutes} 分钟。</div>
          {currentAppliance !== recipe.primaryAppliance && variant && (
            <div className="gap-panel" style={{ margin: '10px 0 0' }}>
              <div className="gap-choice">
                <b>换{currentAppliance}的影响：</b>{variant.adaptation?.[0] ?? variant.flavorImpact?.[0] ?? variant.basisNote}
                {' '}<Tag tone="demo">预设说明</Tag>
              </div>
              {variant.flavorImpact?.[0] && variant.adaptation?.[0] && (
                <div className="gap-choice mt6">{variant.flavorImpact[0]}</div>
              )}
            </div>
          )}
        </div>

        {/* ⑤ 口味 / 忌口 */}
        <SectionTitle title="⑤ 口味与忌口" extra="可选" />
        <div className="card flat">
          <div className="small strong mb6">辣度</div>
          <div className="chip-row">
            {(['按原菜谱', '不辣', '微辣', '加辣'] as const).map((v) => <Chip key={v} active={c.taste.spice === v} onClick={() => set({ taste: { ...c.taste, spice: v } })}>{v}</Chip>)}
          </div>
          <div className="row-between mt10">
            <span className="small strong">咸淡</span>
            <Segmented value={c.taste.salt} options={[{ value: '按原菜谱' as const, label: '按原菜谱' }, { value: '少盐' as const, label: '少盐' }]} onChange={(v) => set({ taste: { ...c.taste, salt: v } })} />
          </div>
          <div className="row-between mt10">
            <span className="small strong">是否少油</span>
            <Segmented value={c.taste.oil} options={[{ value: '按原菜谱' as const, label: '按原菜谱' }, { value: '少油' as const, label: '少油' }]} onChange={(v) => set({ taste: { ...c.taste, oil: v } })} />
          </div>
          <div className="divider" />
          <div className="small strong mb6">忌口 / 过敏</div>
          <div className="chip-row">
            {COMMON_ALLERGENS.map((a) => (
              <Chip key={a} active={c.avoid.includes(a)} onClick={() => set({ avoid: toggleIn(c.avoid, a), avoidConfirmed: true })}>
                {c.avoid.includes(a) ? '✓ ' : ''}{a}
              </Chip>
            ))}
          </div>
          <div className="row mt10" style={{ gap: 8 }}>
            <input className="input" style={{ flex: 1 }} placeholder="自由输入，如：香菜" value={avoidInput} onChange={(e) => setAvoidInput(e.target.value)} />
            <Button size="sm" variant="secondary" disabled={!avoidInput.trim()} onClick={() => {
              set({ avoid: Array.from(new Set([...c.avoid, avoidInput.trim()])), avoidConfirmed: true });
              setAvoidInput('');
            }}>添加</Button>
          </div>
          {c.avoid.length > 0 && <div className="tiny muted mt10">已声明：{c.avoid.join('、')}。与菜谱冲突时会阻止生成并给出替代。</div>}
        </div>

        <Button block variant="secondary" onClick={handleSaveProfile}>保存为我的厨房档案</Button>
        <div className="tiny muted center mt6">系统将为你保存调味品、厨具与忌口偏好</div>
      </Page>
    </>
  );
}

export function ConditionsPage({
  recipeId, source, chatHints = [], replicaId,
}: { recipeId: string; source: TConditions['source']; chatHints?: ChatHint[]; replicaId?: string }) {
  const app = useApp();
  const recipe = getRecipe(recipeId)!;
  const c = app.state.conditions;

  useEffect(() => {
    if (!c || c.recipeId !== recipeId) {
      app.patch({ conditions: makeDefaultConditions(recipe, source, undefined, chatHints, replicaId) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId]);

  if (!c || c.recipeId !== recipeId) {
    return <><Header title="我的烹饪条件" showDemo={false} /><Page><div className="empty">正在准备条件…</div></Page></>;
  }

  const normalized: TConditions = {
    ...c,
    stock: c.stock ?? {},
    seasonings: c.seasonings ?? [],
    appliances: c.appliances?.length ? c.appliances : [recipe.primaryAppliance],
    primaryAppliance: c.primaryAppliance ?? c.appliances?.[0] ?? recipe.primaryAppliance,
    substituteChoices: c.substituteChoices ?? {},
    substituteHave: c.substituteHave ?? {},
    buyChoices: c.buyChoices ?? [],
    omittedIngredients: c.omittedIngredients ?? [],
    avoid: c.avoid ?? [],
    avoidConfirmed: true,
    applianceConfirmed: true,
    taste: c.taste ?? { spice: '按原菜谱', salt: '按原菜谱', oil: '按原菜谱' },
    chatHints: c.chatHints ?? [],
    prefillFromProfile: Boolean(c.prefillFromProfile && app.state.profile),
  };

  return <ConditionsEditor recipe={recipe} c={normalized} source={source} />;
}








