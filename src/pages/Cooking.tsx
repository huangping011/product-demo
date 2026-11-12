import { useEffect, useState } from 'react';
import { BasisTag, Button, Header, Page, Tag } from '../components/ui';
import { useApp } from '../lib/store';
import { getRecipe } from '../data/recipes';
import { renderStepText, stepMaterials } from '../lib/plan';
import { nowISO } from '../lib/utils';
import type { CookingProgress } from '../types';

function mmss(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function CookingPage({ planId }: { planId: string }) {
  const app = useApp();
  const plan = app.state.plans[planId];
  const recipe = plan ? getRecipe(plan.recipeId) : undefined;
  const saved = app.state.cooking[planId];
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setTick(Date.now()), 500);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (plan && !saved) {
      app.updateCooking({ planId, stepIndex: 0, startedAt: nowISO(), updatedAt: nowISO(), completed: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!plan || !recipe) {
    return <><Header title="开始做菜" /><Page><div className="empty">没有找到方案，可能已被重置。</div></Page></>;
  }

  const progress: CookingProgress = saved ?? { planId, stepIndex: 0, startedAt: nowISO(), updatedAt: nowISO(), completed: false };
  const index = Math.min(progress.stepIndex, plan.steps.length - 1);
  const step = plan.steps[index];
  const factor = plan.servings / recipe.servingsBase;
  const isLast = index === plan.steps.length - 1;

  const timerActive = Boolean(progress.timerEndsAt && progress.timerStepId === step.id);
  const remaining = timerActive ? (progress.timerEndsAt ?? 0) - tick : 0;
  const timerDone = timerActive && remaining <= 0;

  const persist = (p: Partial<CookingProgress>) => app.updateCooking({ ...progress, ...p, updatedAt: nowISO() });

  const goStep = (next: number) => {
    if (next < 0 || next >= plan.steps.length) return;
    persist({ stepIndex: next, timerEndsAt: undefined, timerStepId: undefined });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const finish = (destination: 'home' | 'homework') => {
    persist({ completed: true, timerEndsAt: undefined, timerStepId: undefined });
    if (destination === 'home') app.goHome();
    else app.navigate({ name: 'homework', planId });
  };

  return (
    <>
      <Header title="开始做菜" subtitle={`${plan.versionName} · 第 ${index + 1} 步 / 共 ${plan.steps.length} 步`} />
      <Page bottomBar={
        <>
          {isLast ? (
            <>
              <Button variant="secondary" onClick={() => finish('home')}>完成</Button>
              <Button onClick={() => finish('homework')}>交作业</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" disabled={index === 0} onClick={() => goStep(index - 1)}>上一步</Button>
              <Button onClick={() => goStep(index + 1)}>下一步</Button>
            </>
          )}
        </>
      }>

        <div className="row-between mb10">
          <div className="small strong">{plan.versionName}</div>
          <Tag tone="brand">第 {index + 1} / {plan.steps.length} 步</Tag>
        </div>
        <div className="progress-track mb10"><div className="progress-fill" style={{ width: `${((index + 1) / plan.steps.length) * 100}%` }} /></div>

        <div className="step-card">
          <div className="row-between">
            <span className="step-num">STEP {String(index + 1).padStart(2, '0')} / {String(plan.steps.length).padStart(2, '0')}</span>
            <BasisTag basis={step.basis ?? 'ai'} />
          </div>
          <div className="step-title">{step.title}</div>
          <div className="step-text">{renderStepText(step.text, recipe, factor, plan)}</div>

          <div className="step-box">
            <b>本步材料与用量：</b>{stepMaterials(step, recipe, factor, plan).map((m) => `${m.name} ${m.amount}`).join('、') || '无额外材料'}
          </div>
          <div className="step-box"><b>设备 / 火力设置：</b>{step.setting}</div>
          <div className="step-box"><b>参考时间：</b>{step.minutes} 分钟　<b>可观察完成状态：</b>{step.doneState}</div>
          {step.risk && <div className="step-risk">⚠️ 风险提示：{step.risk}</div>}

          <div className="timer-box">
            <div>
              <div className="tiny muted">本步计时</div>
              <div className="timer-value">{timerActive ? (timerDone ? '计时结束' : mmss(remaining)) : `${String(step.minutes).padStart(2, '0')}:00`}</div>
            </div>
            {timerActive ? (
              <Button size="sm" variant="ghost" onClick={() => persist({ timerEndsAt: undefined, timerStepId: undefined })}>停止 / 重置</Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => { const startedAt = Date.now(); setTick(startedAt); persist({ timerEndsAt: startedAt + step.minutes * 60 * 1000, timerStepId: step.id }); }}>启动计时</Button>
            )}
          </div>
          {timerDone && <div className="notice notice-warn mt10" style={{ marginBottom: 0 }}>计时结束仅代表参考时间到，<b>不代表食物一定达到安全状态</b>。请按上面的可观察完成状态确认后再进入下一步。</div>}
        </div>

      </Page>
    </>
  );
}



