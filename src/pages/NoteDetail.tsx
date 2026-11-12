import { useState } from 'react';
import { Button, Header, Notice, Page, SectionTitle } from '../components/ui';
import { CommunityList } from '../components/CommunityList';
import { NON_RECIPE_NOTE, getRecipe } from '../data/recipes';
import { useApp } from '../lib/store';

export function NoteDetail({ recipeId }: { recipeId: string }) {
  const { navigate, openConditions, toast } = useApp();
  const [extraText, setExtraText] = useState('');
  const recipe = getRecipe(recipeId);

  if (!recipe) {
    const note = NON_RECIPE_NOTE;
    return (
      <>
        <Header title="笔记" subtitle={note.author} />
        <Page bottomBar={<Button variant="ghost" disabled>无法为我定制化</Button>}>
          <div className="note-hero"><div className="thumb-fallback" style={{ background: `linear-gradient(135deg, ${note.cover.from}, ${note.cover.to})` }}>🧺</div></div>
          <div style={{ padding: '0 16px' }}>
            <div className="note-author-row">
              <div className="note-avatar">🗂️</div>
              <div style={{ flex: 1 }}>
                <div className="note-author-name">{note.author}</div>
                <div className="note-author-sub">示例笔记 · 收藏 {note.collects}</div>
              </div>
            </div>
            <div className="note-title" style={{ fontSize: 17 }}>{note.title}</div>
            <div className="note-text" style={{ fontSize: 14 }}>{note.body}</div>
            <Notice tone="warn"><b>暂未找到完整做法。</b>这篇内容无法识别为菜谱，不会生成方案，也不会把 AI 补充的步骤伪装成作者原文。</Notice>
            <div className="card flat">
              <div className="card-title">补充菜谱文本（演示）</div>
              <div className="form-hint">本演示只做本地记录，不会解析成真实菜谱。</div>
              <textarea className="textarea" value={extraText} onChange={(e) => setExtraText(e.target.value)} placeholder="例如：鸡腿 2 块、生抽 15 ml……先煎后焖 10 分钟" />
              <Button className="mt10" variant="secondary" block disabled={!extraText.trim()} onClick={() => toast('已记录补充文本（演示）。不会自动生成做法。')}>提交补充文本</Button>
            </div>
            <Notice tone="demo">可以返回收藏列表，换一篇完整菜谱笔记进入实验室。</Notice>
          </div>
        </Page>
      </>
    );
  }

  const missing = recipe.missingFields;
  const isPhoto = recipe.sourceKind === 'user-photo';

  return (
    <>
      <Header title="笔记"  />
      <Page bottomBar={
        <>
          <Button variant="ghost" onClick={() => toast('点赞为演示界面')}>♥ {recipe.likes}</Button>
          <Button variant="ghost" onClick={() => toast('收藏为演示界面')}>☆ {recipe.collects}</Button>
        </>
      }>
        {['r6', 'r7'].includes(recipe.id) && (
          <div className="chip-row" aria-label="识别到的菜谱" style={{ flexWrap: 'nowrap', overflowX: 'auto', padding: '10px 16px' }}>
            {['r6', 'r7'].map((id) => (
              <button key={id} className={`chip ${id === recipe.id ? 'chip-active' : ''}`}
                style={{ flexShrink: 0, whiteSpace: 'nowrap' }} aria-pressed={id === recipe.id}
                onClick={() => navigate({ name: 'note', recipeId: id })}>{getRecipe(id)?.title}</button>
            ))}
          </div>
        )}
        {/* 大图 */}
        <div className="note-hero">
          {recipe.cover.image
            ? <img src={recipe.cover.image} alt={recipe.title} />
            : <div className="thumb-fallback" style={{ background: `linear-gradient(135deg, ${recipe.cover.from}, ${recipe.cover.to})` }}>{recipe.cover.emoji}</div>}
        </div>

        <div style={{ padding: '0 16px' }}>
          {/* 标题 */}
          <div className="note-title">{recipe.title}</div>

          {/* 原菜谱信息 */}
          <div className="mt14">
            <SectionTitle title="原菜谱信息" />
            <div className="card flat kv" style={{ padding: '4px 12px' }}>
              <div className="kv-row"><span className="kv-key">份量</span><span className="kv-val">{recipe.servingsLabel}</span></div>
              <div className="kv-row"><span className="kv-key">预计耗时</span><span className="kv-val">{missing.includes('预计耗时') ? '原笔记未提供' : `${recipe.minutes} 分钟`}</span></div>
              <div className="kv-row"><span className="kv-key">主要厨具</span><span className="kv-val">{recipe.appliances.join(' / ')}</span></div>
              <div className="kv-row"><span className="kv-key">主要食材</span><span className="kv-val">{recipe.ingredients.filter((i) => i.group === 'main').map((i) => i.name).join('、')}</span></div>
            </div>
            {!recipe.noteUrl && recipe.sourceKind === 'demo' && (
              <Notice tone="demo">来源说明：示例笔记，未绑定真实小红书链接（站外无法核验笔记可达性）。{recipe.sourceNote}</Notice>
            )}
          </div>

          {/* 原笔记做法 */}
          <SectionTitle title="原笔记中的做法" extra={isPhoto ? undefined : '作者原文（示例）'} />
          <div className="card flat" style={{ padding: '6px 12px' }}>
            {recipe.noteSteps.map((s, i) => (
              <div key={s} className="row" style={{ alignItems: 'flex-start', padding: '8px 0', gap: 9, borderBottom: i < recipe.noteSteps.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <span className="tag tag-brand" style={{ flex: 'none' }}>{i + 1}</span>
                <span className="small" style={{ lineHeight: 1.7 }}>{s}</span>
              </div>
            ))}
          </div>

          {/* 主操作 */}
          <Button className="mt14" block onClick={() => openConditions(recipe.id, 'note')}>为我定制化</Button>

          <div className="mt14">
            <CommunityList recipeId={recipe.id} limit={2} />
          </div>
        </div>
      </Page>
    </>
  );
}


