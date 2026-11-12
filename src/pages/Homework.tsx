import { useState } from 'react';
import { Button, Header, Page, SectionTitle } from '../components/ui';
import { APPLIANCES, RESULT_LABEL, type Homework as THomework, type ReplicationResult } from '../types';
import { useApp } from '../lib/store';
import { getRecipe } from '../data/recipes';
import { makeId, nowISO } from '../lib/utils';


export function HomeworkPage({ planId }: { planId: string }) {
  const app = useApp();
  const plan = app.state.plans[planId];
  const recipe = plan ? getRecipe(plan.recipeId) : undefined;
  const existing = app.state.homework.find((h) => h.planId === planId);

  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [result, setResult] = useState<ReplicationResult>(existing?.result ?? 'success');
  const [photo, setPhoto] = useState<string | null>(existing?.photo ?? null);
  const [appliance, setAppliance] = useState<string>(existing?.appliance ?? plan?.appliance ?? '炒锅');
  const [adjustments, setAdjustments] = useState(existing?.adjustments ?? '');
  const [advice, setAdvice] = useState(existing?.advice ?? '');
  const [visibility, setVisibility] = useState<'private' | 'public'>(existing?.visibility ?? 'private');
  const [publishedId, setPublishedId] = useState<string | null>(existing?.id ?? null);

  if (!plan || !recipe) {
    return <><Header title="交作业" /><Page><div className="empty">没有找到方案，可能已被重置。</div></Page></>;
  }

  const uploadPhoto = async (file: File) => {
    setLoadingPhoto(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const ratio = Math.min(1, 960 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * ratio));
      canvas.height = Math.max(1, Math.round(image.height * ratio));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      setPhoto(canvas.toDataURL('image/jpeg', 0.74));
    } catch {
      app.toast('无法读取图片，请试试 JPG 或 PNG。', 'warn');
    } finally {
      URL.revokeObjectURL(url);
      setLoadingPhoto(false);
    }
  };

  const publish = (visibility: 'private' | 'public') => {
    const hw: THomework = {
      id: publishedId ?? makeId('hw'),
      planId,
      recipeId: recipe.id,
      createdAt: publishedId ? (app.state.homework.find((h) => h.id === publishedId)?.createdAt ?? nowISO()) : nowISO(),
      photo,
      result,
      appliance: appliance as THomework['appliance'],
      servings: plan.servings,
      adjustments,
      advice,
      visibility,
      organized: false,
      author: '我',
      versionName: plan.versionName,
      isDemo: false,
    };
    app.upsertHomework(hw);
    app.logEvent('homework_published', visibility === 'public' ? `发布到复刻区：${plan.versionName}` : `仅自己保存：${plan.versionName}`);
    setPublishedId(hw.id);
    setVisibility(visibility);
    app.toast(visibility === 'public' ? '已加入这道菜的复刻区（本地演示社区）' : '作业已仅自己保存', 'success');
  };

  return (
    <>
      <Header title="交作业" subtitle={`${plan.versionName}`} />
      <Page bottomBar={
        <>
          <Button variant="secondary" disabled={loadingPhoto} onClick={() => publish('private')}>仅自己保存</Button>
          <Button disabled={loadingPhoto} onClick={() => publish('public')}>发布到复刻区</Button>
        </>
      }>

        {publishedId && (
          <div className="card" style={{ borderColor: '#b9e2c9', background: '#f4fbf6' }}>
            <div className="card-title">✓ {visibility === 'public' ? '已加入这道菜的复刻区' : '已仅自己保存'}</div>
            <div className="card-sub">你可以在方案页的「大家的复刻」里看到自己真实填写的内容；也可以继续编辑或删除。</div>
            <div className="row wrap mt10" style={{ gap: 8 }}>
              <Button size="sm" variant="secondary" onClick={() => app.navigate({ name: 'plan', planId })}>返回方案查看</Button>
              <Button size="sm" variant="ghost" onClick={() => app.setOverlay({ kind: 'homework', homeworkId: publishedId })}>查看作业详情</Button>
              <Button size="sm" variant="ghost" onClick={() => app.confirm({
                kind: 'confirm', title: '删除这条作业？', body: '该操作不可撤销，仅影响本浏览器的演示数据。',
                confirmText: '删除', danger: true,
                onConfirm: () => { app.removeHomework(publishedId); setPublishedId(null); app.toast('作业已删除', 'success'); },
              })}>删除作业</Button>
            </div>
          </div>
        )}

        <SectionTitle title="成品照片" extra="可选" />
        <div className="card">
          {photo?.startsWith('data:image/') && <img src={photo} alt="成品照片预览" style={{ display: 'block', maxWidth: '100%', maxHeight: 220, borderRadius: 12, marginBottom: 10 }} />}
          <label className="btn btn-secondary btn-sm">
            {loadingPhoto ? '正在读取照片…' : '上传成品照片'}
            <input type="file" accept="image/*" disabled={loadingPhoto} aria-label="上传成品照片"
              style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                if (file) void uploadPhoto(file);
              }} />
          </label>
          {photo && <Button size="sm" variant="ghost" disabled={loadingPhoto} onClick={() => setPhoto(null)}>移除照片</Button>}
        </div>

        <SectionTitle title="整体结果" extra="必填" />
        <div className="card">
          <div className="chip-row">
            {(['success', 'mostly', 'failed'] as ReplicationResult[]).map((r) => (
              <button key={r} className={`chip ${result === r ? 'chip-active' : ''}`} onClick={() => setResult(r)}>{RESULT_LABEL[r]}</button>
            ))}
          </div>
        </div>

        <SectionTitle title="实际使用厨具" />
        <div className="card">
          <div className="chip-row">
            {APPLIANCES.map((a) => (
              <button key={a} className={`chip ${appliance === a ? 'chip-active' : ''}`} onClick={() => setAppliance(a)}>{a}</button>
            ))}
          </div>
        </div>

        <SectionTitle title="实际调整" extra="可选" />
        <div className="card">
          <textarea className="textarea" value={adjustments} onChange={(e) => setAdjustments(e.target.value)} placeholder="例如：少放了糖、多焖了 3 分钟、用蜂蜜代替味淋" />
        </div>

        <SectionTitle title="给下一位的建议" extra="一句话，可选" />
        <div className="card">
          <input className="input" value={advice} onChange={(e) => setAdvice(e.target.value)} placeholder="例如：一人份酱汁别照搬两人份，会偏咸" />
        </div>

      </Page>
    </>
  );
}


