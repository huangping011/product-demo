import { useState } from 'react';
import { BasisTag, Button, Drawer, Notice, Tag } from './ui';
import { useApp } from '../lib/store';
import { getRecipe } from '../data/recipes';
import { renderStepText } from '../lib/plan';

const OPTIONS = [
  { id: 'missing', label: '我没有这个材料', change: '在方案页为该材料选择替代品或省略；当前步骤会把该材料标注为「待确认」，不改写已执行步骤的用量。' },
  { id: 'device', label: '我的设备不一样', change: '回到条件页确认可用厨具；当前步骤保留原设备设置作为参考，不静默改成未经验证的火力 / 时间。' },
  { id: 'unclear', label: '看不懂这一步', change: '在本步骤追加更细的动作拆分说明，并再次强调可观察完成状态；原步骤文字保留。' },
  { id: 'different', label: '效果和预期不同', change: '以可观察完成状态为准继续观察，并把你的实际调整提示写入本步骤与作业卡；不自动跳过步骤。' },
];

export function TroubleDrawer({ planId, stepIndex, onClose }: { planId: string; stepIndex: number; onClose: () => void }) {
  const app = useApp();
  const [picked, setPicked] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [savedQuestion, setSavedQuestion] = useState(false);
  const plan = app.state.plans[planId];
  if (!plan) return null;
  const recipe = getRecipe(plan.recipeId)!;
  const step = plan.steps[stepIndex];
  const option = OPTIONS.find((o) => o.id === picked);
  const factor = plan.servings / recipe.baseServings;

  const apply = () => {
    if (!option) return;
    app.updatePlan(planId, (p) => ({
      ...p,
      steps: p.steps.map((s, i) => i === stepIndex
        ? { ...s, text: `${s.text}（问题反馈调整提示：${option.change}）` }
        : s),
      changes: [...p.changes, {
        from: `第 ${stepIndex + 1} 步原说明`,
        to: `追加「${option.label}」的调整提示`,
        reason: `你在做菜中反馈问题后确认的变更；仅作用于第 ${stepIndex + 1} 步及之后的阅读内容，已完成的前 ${stepIndex} 步保持不变`,
        basis: 'ai' as const,
      }],
    }));
    app.toast('变更已应用：先展示后确认，已执行步骤未被重写', 'success');
    onClose();
  };

  return (
    <Drawer title="遇到问题 · 点点" subtitle="携带当前版本、条件与步骤" onClose={onClose} footer={
      <Button variant="ghost" onClick={onClose}>关闭，继续看步骤</Button>
    }>
      <Notice tone="demo">这是本地演示侧栏：只使用已保存的方案与结构化条件，不模拟真人回复，也不会静默重写你已经执行过的步骤。</Notice>

      <div className="card tight">
        <div className="card-title">当前上下文</div>
        <div className="kv">
          <div className="kv-row"><span className="kv-key">菜谱版本</span><span className="kv-val">{plan.versionName}</span></div>
          <div className="kv-row"><span className="kv-key">本次条件</span><span className="kv-val">{plan.servings} 人份 · {plan.appliance}</span></div>
          <div className="kv-row"><span className="kv-key">忌口 / 过敏</span><span className="kv-val">{plan.conditionSnapshot.avoid.join('、') || '未声明'}</span></div>
          <div className="kv-row"><span className="kv-key">调整方式</span><span className="kv-val">{plan.conditionSnapshot.strategy === 'useExisting' ? '优先用现有材料' : plan.conditionSnapshot.strategy === 'canBuy' ? '可以补购' : '尽量按原做法'}</span></div>
          <div className="kv-row"><span className="kv-key">当前步骤</span><span className="kv-val">第 {stepIndex + 1} 步 · {step.title}</span></div>
        </div>
        <div className="small" style={{ lineHeight: 1.75, marginTop: 8, color: 'var(--ink-2)' }}>
          {renderStepText(step.text, recipe, factor, plan)}
        </div>
      </div>

      <div className="section-head"><div className="section-title">你遇到了什么</div></div>
      <div className="chip-row mb10">
        {OPTIONS.map((o) => (
          <button key={o.id} className={`chip ${picked === o.id ? 'chip-active' : ''}`} onClick={() => setPicked(o.id)}>{o.label}</button>
        ))}
      </div>

      {option && (
        <div className="card" style={{ borderColor: '#f4b9a9' }}>
          <div className="row-between">
            <div className="card-title" style={{ margin: 0 }}>建议变更预览</div>
            <BasisTag basis="ai" />
          </div>
          <div className="small" style={{ lineHeight: 1.8, marginTop: 8 }}>{option.change}</div>
          <div className="divider" />
          <div className="kv">
            <div className="kv-row"><span className="kv-key">影响范围</span><span className="kv-val">仅第 {stepIndex + 1} 步及之后</span></div>
            <div className="kv-row"><span className="kv-key">已完成步骤</span><span className="kv-val">第 1 – {stepIndex} 步保持不变</span></div>
            <div className="kv-row"><span className="kv-key">依据</span><span className="kv-val">AI 建议，尚未实测</span></div>
          </div>
          <Button className="mt10" block size="sm" onClick={apply}>确认应用这一变更</Button>
          <div className="tiny muted center mt6">不点确认就不会改动任何步骤</div>
        </div>
      )}

      <div className="card">
        <div className="card-title">问一句（本地保存）</div>
        <div className="form-hint">MVP 只把你的问题存在本浏览器，不模拟真人回复。</div>
        <textarea className="textarea" style={{ minHeight: 66 }} value={question} onChange={(e) => { setQuestion(e.target.value); setSavedQuestion(false); }} placeholder="例如：电饭煲跳闸后酱汁还是很稀怎么办？" />
        <Button className="mt10" size="sm" variant="secondary" disabled={!question.trim()} onClick={() => {
          app.logEvent('comment_submit', `做菜问题（本地）：${question.trim().slice(0, 40)}`);
          setSavedQuestion(true);
          app.toast('问题已保存在本地演示记录中', 'success');
        }}>保存问题</Button>
        {savedQuestion && <div className="tiny" style={{ color: 'var(--green)', marginTop: 6 }}>✓ 已本地保存，不模拟真人回复</div>}
      </div>
      <Notice tone="info">计时结束不代表食物达到安全状态。若设备不同或材料缺失，请回到条件 / 方案页确认，而不是直接沿用当前步骤。</Notice>
    </Drawer>
  );
}
