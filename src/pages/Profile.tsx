import { Button, Header, Page, SectionTitle } from '../components/ui';
import { useApp } from '../lib/store';
import { getRecipe } from '../data/recipes';
import { RESULT_LABEL } from '../types';

export function Profile() {
  const { state, navigate, setOverlay } = useApp();
  const plans = Object.values(state.plans).filter((plan) => plan.saved);
  const profile = state.profile;

  return (
    <>
      <Header title="我的" showDemo={false} />
      <Page>
        <SectionTitle title="已保存的方案" extra={`${plans.length} 份`} />
        <div className="card flat">
          {plans.length ? plans.map((plan) => (
            <div className="kv-row" key={plan.id}>
              <div>
                <div className="small strong">{getRecipe(plan.recipeId)?.title ?? plan.versionName}</div>
                <div className="tiny muted">{plan.servings} 人份 · {plan.appliance}</div>
              </div>
              <Button size="xs" variant="secondary" onClick={() => navigate({ name: 'plan', planId: plan.id })}>查看方案</Button>
            </div>
          )) : <div className="small muted">在方案页点击「保存方案」，即可在这里查看。</div>}
        </div>

        <SectionTitle title="我的厨房档案" />
        <div className="card flat">
          {profile ? (
            <>
              <div className="kv-row"><span className="kv-key">厨具</span><span className="kv-val">{profile.appliances.join('、') || '未填写'}</span></div>
              <div className="kv-row"><span className="kv-key">常备调味品</span><span className="kv-val">{profile.seasonings.join('、') || '未填写'}</span></div>
              <div className="kv-row"><span className="kv-key">忌口</span><span className="kv-val">{profile.avoid.join('、') || '未填写'}</span></div>
              {profile.taste && <div className="kv-row"><span className="kv-key">口味</span><span className="kv-val">{Object.values(profile.taste).join(' · ')}</span></div>}
            </>
          ) : <div className="small muted">在「我的烹饪条件」页保存厨房档案后，即可在这里查看。</div>}
        </div>

        <SectionTitle title="我的作业" extra={`${state.homework.length} 条`} />
        <div className="card flat">
          {state.homework.length ? state.homework.map((item) => (
            <div className="kv-row" key={item.id}>
              <div>
                <div className="small strong">{getRecipe(item.recipeId)?.title ?? item.versionName}</div>
                <div className="tiny muted">{RESULT_LABEL[item.result]} · {item.visibility === 'public' ? '已发布到复刻区' : '仅自己可见'}</div>
              </div>
              <Button size="xs" variant="secondary" onClick={() => setOverlay({ kind: 'homework', homeworkId: item.id })}>查看作业</Button>
            </div>
          )) : <div className="small muted">保存或发布作业后，即可在这里查看。</div>}
        </div>
      </Page>
    </>
  );
}
