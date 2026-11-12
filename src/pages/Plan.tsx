import { useMemo, useState } from 'react';
import {
  BasisTag, Button, Header, Page, SectionTitle, Tag, Thumb,
} from '../components/ui';
import { GROUP_LABEL } from '../types';
import type { MaterialItem, Plan as TPlan, PlanMode } from '../types';
import { getRecipe } from '../data/recipes';
import { useApp } from '../lib/store';
import { communityItems } from '../lib/communityItems';
import {
  applySubstitute, omitMaterial, planReadiness,
  renderStepText, stepMaterials, switchPlanMode,
} from '../lib/plan';
import { minutesText } from '../lib/utils';

const MODE_LABEL: Record<PlanMode, { title: string; desc: string }> = {
  original: { title: '接近原味', desc: '按原方材料执行' },
  adapted: { title: '用现有条件做', desc: '按你确认的替换 / 省略执行，缺什么补什么' },
};

export function PlanPage({ planId }: { planId: string }) {
  const app = useApp();
  const plan = app.state.plans[planId];
  const [substituteFor, setSubstituteFor] = useState<string | null>(null);
  const recipe = plan ? getRecipe(plan.recipeId) : undefined;

  const related = useMemo(() => {
    if (!plan) return [];
    return communityItems(plan.recipeId, app.state.homework)
      .map((item) => ({
        item,
        score: (item.appliance === plan.appliance ? 2 : 0) + (item.servings === plan.servings ? 1 : 0) + (item.substitutions.length ? 1 : 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => x.item);
  }, [plan, app.state.homework]);

  if (!plan || !recipe) {
    return <><Header title="我的方案" /><Page><div className="empty">没有找到这个方案。<br /><Button className="mt10" onClick={app.goHome}>回到首页</Button></div></Page></>;
  }

  const factor = plan.servings / recipe.servingsBase;
  const owned = plan.materials.filter((m) => m.state === 'owned');
  const needAll = plan.materials.filter((m) => m.state === 'need');
  const need = needAll.filter((m) => !m.originalOptional);
  const optional = needAll.filter((m) => m.originalOptional);
  const readiness = planReadiness(plan);
  const mode = MODE_LABEL[plan.mode];

  const changePlan = (fn: (p: TPlan) => TPlan) => app.updatePlan(plan.id, fn);
  const openShopping = () => app.setOverlay({ kind: 'shopping', planId: plan.id });

  const switchMode = (next: PlanMode) => {
    if (plan.mode === next) return;
    const updated = switchPlanMode(plan, next);
    if (updated === plan) { app.toast('当前条件无法切换到该版本', 'warn'); return; }
    changePlan(() => updated);
    app.toast(`已切换为「${MODE_LABEL[next].title}」：步骤与待采购清单已同步更新`, 'success');
  };

  const goCook = () => {
    app.logEvent('cooking_started', `${plan.versionName} · ${plan.steps.length} 步`);
app.updateCooking({ planId: plan.id, stepIndex: 0, startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), completed: false });
    app.navigate({ name: 'cook', planId: plan.id });
  };

  const startCooking = () => {
    if (readiness.blocked) {
      app.confirm({
        kind: 'confirm',
        title: '还有必需材料待补齐',
        body: `以下必需材料仍标为「需要补齐」：${readiness.missingNames.join('、')}。\n系统不会假定你已经购买。可切换「接近原味」查看可选采购，或确认你已自备。`,
        confirmText: '我已自行备齐，继续',
        cancelText: '去待采购清单',
        onConfirm: goCook,
        onCancel: openShopping,
      });
      return;
    }
    goCook();
  };

  return (
    <>
      <Header title="我的方案" subtitle={`${recipe.title} · ${plan.servings} 人份`} />
      <Page bottomBar={
        <>
          <Button variant="secondary" onClick={openShopping}>待采购清单（{need.length}）</Button>
          <Button onClick={startCooking}>开始做菜</Button>
        </>
      }>

        {/* ===== ① 能怎么做 ===== */}
        <SectionTitle title="烹饪方案" extra={minutesText(plan.totalMinutes)} />
        <div className="card">
          <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
            <Thumb cover={recipe.cover} size="md" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="card-title" style={{ fontSize: 16, marginBottom: 3 }}>{plan.versionName.replace(/（预设适配说明）/g, '')}</div>
              <div className="small muted">{plan.servings} 人份 · 约 {plan.totalMinutes} 分钟 · {plan.appliance}</div>
              <div className="badge-row">
                <Tag tone="brand">{mode.title}</Tag>
              </div>
            </div>
          </div>
          <div className="row-between mt10" style={{ gap: 8 }}>
            <div className="tiny muted" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>原作者：{recipe.author}</div>
            <button className="text-btn" style={{ flex: 'none', whiteSpace: 'nowrap' }} onClick={() => app.navigate({ name: 'note', recipeId: recipe.id })}>查看原笔记 ›</button>
          </div>
          <div className="small" style={{ lineHeight: 1.8, marginTop: 10 }}>{plan.matchNote}</div>

          <div className="divider" />
          <div className="small strong mb6">两种可选做法</div>
          {(['adapted', 'original'] as PlanMode[]).map((m) => (
            <button
              key={m}
              className="row"
              style={{ width: '100%', textAlign: 'left', background: plan.mode === m ? 'var(--brand-soft)' : 'transparent', border: `1px solid ${plan.mode === m ? 'var(--brand)' : 'var(--line-strong)'}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}
              onClick={() => switchMode(m)}
            >
              <span style={{ width: 17, height: 17, borderRadius: '50%', border: `2px solid ${plan.mode === m ? 'var(--brand)' : '#cdc4ba'}`, display: 'grid', placeItems: 'center', flex: 'none' }}>
                {plan.mode === m && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand)' }} />}
              </span>
              <span>
                <span className="small strong">{MODE_LABEL[m].title}</span>
                <span className="tiny muted" style={{ display: 'block', marginTop: 2, lineHeight: 1.6 }}>{MODE_LABEL[m].desc}</span>
              </span>
            </button>
          ))}
        </div>

        {/* ===== ② 味道会怎么变 ===== */}
        <SectionTitle title="味道预测" />
        <div className="card flat">
          {plan.flavorImpact.length === 0 ? (
            <div className="small muted">本次与原版条件一致，风味预计无变化。</div>
          ) : plan.flavorImpact.map((f, i) => (
            <div key={i} className="small" style={{ lineHeight: 1.8, padding: '6px 0', borderBottom: i < plan.flavorImpact.length - 1 ? '1px solid var(--line)' : 'none' }}>· {f}</div>
          ))}
        </div>

        {/* ===== ③ 要补什么 ===== */}
        <SectionTitle title="待采购清单" extra={`${need.length} 待补`} />
        <MaterialList
          title="需要补齐" tone="danger" items={need} plan={plan}
          onSubstitute={(m) => setSubstituteFor(substituteFor === m.key ? null : m.key)}
          onOmit={(m) => { changePlan((p) => omitMaterial(p, m.key)); app.toast(`已省略 ${m.name}`, 'success'); }}
          onShopping={openShopping}
          emptyText="没有需要补齐的材料。"
        />
        {need.length > 0 && (
          <Button size="sm" block className="mb10" onClick={openShopping}>打开待采购清单</Button>
        )}
        {optional.length > 0 && (
          <div className="tiny muted mb10">想还原原味可选：{optional.map((m) => m.name).join('、')}（不进入必买清单）</div>
        )}
        <MaterialList title="已确认拥有" tone="ok" items={owned} plan={plan} onSubstitute={() => {}} onOmit={() => {}} onShopping={openShopping} emptyText="" />

        {substituteFor && (() => {
          const m = plan.materials.find((x) => x.key === substituteFor);
          if (!m) return null;
          return (
            <div className="card flat" style={{ borderColor: 'var(--brand)' }}>
              <div className="card-title">为「{m.name}」换一种</div>
              <div className="form-hint">已排除含你声明过敏原的选项；选择后同步更新步骤与待采购清单，并移除对应必买缺口。</div>
              {m.substitutes.map((s) => (
                <button key={s.name} className="entry-card" style={{ marginBottom: 8, padding: 10 }} onClick={() => {
                  const next = applySubstitute(plan, m.key, s.name);
                  if (next === plan) { app.toast('该替代品不可用（可能含忌口成分或材料已锁定）', 'warn'); return; }
                  changePlan(() => next);
                  setSubstituteFor(null);
                  app.toast(`已确认使用：${s.name}，对应必买缺口已移除`, 'success');
                }}>
                  <div style={{ flex: 1 }}>
                    <div className="small strong">{s.name}</div>
                    <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.6 }}>{s.note}</div>
                  </div>
                  <BasisTag basis="ai" />
                </button>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setSubstituteFor(null)}>取消</Button>
            </div>
          );
        })()}

        <SectionTitle title="材料用量" extra={`${plan.servings} 人份`} />
        <div className="card flat" style={{ padding: '4px 12px' }}>
          {plan.materials.map((m) => (
            <div className="kv-row small" style={{ alignItems: 'baseline', lineHeight: 1.6 }} key={m.key}>
              <span className="kv-key" style={{ flex: '1 1 auto', minWidth: 0 }}>{m.name} · {GROUP_LABEL[m.group]}{m.essential ? '' : '（可选）'}</span>
              <span className="kv-val">
                {m.chosenSubstitute ? m.chosenSubstitute : m.omitted ? '本次省略' : m.amount}
                {m.state === 'need' && !m.chosenSubstitute && !m.omitted && <span className="tag tag-danger" style={{ marginLeft: 6 }}>待补</span>}
                {m.state === 'unsure' && <span className="tag tag-warn" style={{ marginLeft: 6 }}>先确认</span>}
              </span>
            </div>
          ))}
        </div>

        {/* ===== ⑥ 详细步骤（放最后） ===== */}
        <SectionTitle title="详细步骤" extra={`共 ${plan.steps.length} 步 · 约 ${plan.totalMinutes} 分钟`} />
        <div className="card flat" style={{ padding: '4px 12px' }}>
          {plan.steps.map((s, i) => (
            <div key={s.id} style={{ padding: '11px 0', borderBottom: i < plan.steps.length - 1 ? '1px solid var(--line)' : 'none' }}>
              <div className="row-between">
                <div className="small strong">{i + 1}. {s.title}</div>
                
              </div>
              <div className="small" style={{ lineHeight: 1.8, marginTop: 6 }}>{renderStepText(s.text, recipe, factor, plan)}</div>
              <div className="tiny muted mt6">
                {s.setting} · 参考 {s.minutes} 分钟 · 完成：{s.doneState}
                {stepMaterials(s, recipe, factor, plan).length > 0 && ` · ${stepMaterials(s, recipe, factor, plan).map((x) => `${x.name} ${x.amount}`).join('、')}`}
              </div>
              {s.risk && <div className="step-risk">⚠️ {s.risk}</div>}
            </div>
          ))}
        </div>

        {/* ===== ⑦ 社区参考 ===== */}
        <SectionTitle title="社区参考" />
        <div className="card flat">
          {related.length === 0 ? <div className="small muted">暂无相关复刻记录。</div> : related.map((item) => (
            <div key={item.id} className="row" style={{ alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid var(--line)', gap: 9 }}>
              <Thumb cover={item.cover} size="sm" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="small strong">{item.author} {!item.isDemo && <Tag tone="brand">我的作业</Tag>}</div>
                <div className="tiny muted mt6">{item.appliance} · {item.servings} 人份</div>
                <div className="small" style={{ lineHeight: 1.6, marginTop: 4 }}>{item.advice}</div>
              </div>
              <button className="text-btn" onClick={() => app.setOverlay(item.kind === 'demo' ? { kind: 'replica', replicaId: item.id } : { kind: 'homework', homeworkId: item.id })}>查看 ›</button>
            </div>
          ))}
          <Button className="mt10" size="sm" variant="ghost" block onClick={() => app.setOverlay({ kind: 'community', recipeId: recipe.id })}>查看全部复刻</Button>
        </div>

        <div className="card flat">
          <div className="card-title">开始前请留意</div>
          {plan.warnings.map((w, i) => <div key={i} className="small" style={{ lineHeight: 1.75, marginBottom: 6 }}>· {w}</div>)}
        </div>

        <div className="row" style={{ gap: 8, marginBottom: 14, justifyContent: 'center' }}>
          <Button variant="secondary" size="sm" onClick={() => app.navigate({ name: 'conditions', recipeId: recipe.id, source: plan.source })}>修改条件</Button>
          <Button variant="secondary" size="sm" onClick={() => { changePlan((p) => ({ ...p, saved: true })); app.toast('方案已保存到当前浏览器', 'success'); }}>
            {plan.saved ? '✓ 已保存' : '保存方案'}
          </Button>
        </div>
      </Page>
    </>
  );
}

function MaterialList({
  title, tone, items, plan, onSubstitute, onOmit, onReady, onShopping, emptyText,
}: {
  title: string;
  tone: 'ok' | 'warn' | 'danger';
  items: MaterialItem[];
  plan: TPlan;
  onSubstitute: (m: MaterialItem) => void;
  onOmit: (m: MaterialItem) => void;
  onReady?: (m: MaterialItem) => void;
  onShopping: () => void;
  emptyText: string;
}) {
  if (items.length === 0 && !emptyText) return null;
  return (
    <>
      <div className="group-head">
        <span className={`tag tag-${tone}`}>{title}</span>
        <span className="group-count">{items.length} 项</span>
      </div>
      {items.length === 0 ? <div className="small muted mb10">{emptyText}</div> : (
        <div className="card flat" style={{ padding: '4px 12px', marginBottom: 10 }}>
          {items.map((m) => (
            <div className="material-row" key={m.key}>
              <div className="material-main">
                <div className="material-name">
                  {m.name}
                  {m.originalOptional && <span className="tag tag-warn" style={{ marginLeft: 5 }}>还原原版·可选</span>}
                </div>
                <div className="material-amount">
                  需要 {m.amount}
                  {m.stockNote ? ` · 你填的库存：${m.stockNote}` : ''}
                </div>
                {m.chosenSubstitute && <div className="tiny" style={{ color: 'var(--green)', marginTop: 3 }}>✓ 替代：{m.chosenSubstitute}（必买缺口已移除）</div>}
                {m.omitted && <div className="tiny" style={{ color: 'var(--green)', marginTop: 3 }}>✓ 本次省略</div>}
                {!m.chosenSubstitute && !m.omitted && m.reason && <div className="tiny muted" style={{ marginTop: 3 }}>{m.reason}</div>}
                <div className="material-actions">
                  {m.state === 'need' && m.substitutes.length > 0 && <Button size="xs" variant="secondary" onClick={() => onSubstitute(m)}>更换</Button>}
                  {m.state === 'need' && !m.essential && !plan.conditionSnapshot.lockedIngredients.includes(m.key) && <Button size="xs" variant="secondary" onClick={() => onOmit(m)}>省略</Button>}
                  {m.state === 'need' && <Button size="xs" variant="secondary" onClick={onShopping}>前往采购</Button>}
                  {m.state === 'unsure' && onReady && <Button size="xs" variant="secondary" onClick={() => onReady(m)}>家里其实有</Button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}






