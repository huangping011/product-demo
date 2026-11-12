import { DemoNote, Header, Notice, Page, SectionTitle, Tag, Thumb } from '../components/ui';
import { MiniRecipeCard } from '../components/RecipeCard';
import { COLLECTION_IDS, NON_RECIPE_NOTE, getRecipe } from '../data/recipes';
import { useApp } from '../lib/store';

export function Collections() {
  const { navigate } = useApp();
  const items = COLLECTION_IDS.map((id) => (id === 'x1' ? { type: 'non' as const, note: NON_RECIPE_NOTE } : { type: 'recipe' as const, recipe: getRecipe(id)! }));
  return (
    <>
      <Header title="我的收藏（演示）" subtitle="模拟收藏列表 · 共 6 篇" />
      <Page>
        <DemoNote>这里只用于挑选一篇笔记进入实验室，不做自动扫描全部收藏，也不生成一周菜单。</DemoNote>
        <SectionTitle title="最近收藏" extra="点击任意笔记查看详情" />
        {items.map((item) => item.type === 'recipe' ? (
          <MiniRecipeCard key={item.recipe.id} recipe={item.recipe} onClick={() => navigate({ name: 'note', recipeId: item.recipe.id })} />
        ) : (
          <button key={item.note.id} className="entry-card" onClick={() => navigate({ name: 'note', recipeId: item.note.id })}>
            <Thumb cover={item.note.cover} size="md" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="recipe-title">{item.note.title}</div>
              <div className="recipe-meta">{item.note.author} · ♥ {item.note.likes}</div>
              <div className="badge-row"><Tag tone="warn">非菜谱笔记</Tag><Tag tone="demo">用于演示异常状态</Tag></div>
            </div>
            <span className="muted">›</span>
          </button>
        ))}
        <Notice tone="demo">
          最后一篇是收纳笔记，用来演示「暂未找到完整做法」的异常状态：点击后不会进入条件设置，而是提示并允许补充菜谱文本。
        </Notice>
      </Page>
    </>
  );
}
