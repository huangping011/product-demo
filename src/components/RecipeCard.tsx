import type { Recipe } from '../types';
import { Button, Thumb } from './ui';

/** 点点对话的紧凑图文卡片：封面、菜名、来源、主按钮 */
export function ChatRecipeCard({
  recipe, reason, hintsCount, onCondition, onNote,
}: {
  recipe: Recipe;
  reason: string;
  hintsCount: number;
  onCondition: () => void;
  onNote: () => void;
}) {
  return (
    <div className="recipe-card">
      <div className="recipe-card-body">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <Thumb cover={recipe.cover} size="md" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="recipe-title">{recipe.title}</div>
            <div className="recipe-meta">
              {recipe.author} · {recipe.minutes} 分钟 · {recipe.appliances.join('/')}
            </div>

          </div>
        </div>
        <div className="recipe-reason">{reason}</div>
        <div className="row-between mt10">
          <button className="text-btn muted" onClick={onNote}>查看原笔记 ›</button>
          <Button size="sm" onClick={onCondition}>为我定制化</Button>
        </div>
        {hintsCount > 0 && (
          <div className="tiny muted mt6">将带入 {hintsCount} 项对话条件，均标「待确认」，不写入厨房档案</div>
        )}
      </div>
    </div>
  );
}

export function MiniRecipeCard({ recipe, onClick }: { recipe: Recipe; onClick: () => void }) {
  return (
    <button className="entry-card" onClick={onClick}>
      <Thumb cover={recipe.cover} size="md" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="recipe-title">{recipe.title}</div>
        <div className="recipe-meta">
          {recipe.author} · {recipe.minutes} 分钟 · {recipe.appliances.join('/')}
        </div>

      </div>
      <span className="muted">›</span>
    </button>
  );
}

