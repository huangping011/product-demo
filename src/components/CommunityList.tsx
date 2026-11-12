import { useMemo, useState } from 'react';
import { RESULT_LABEL } from '../types';
import { useApp } from '../lib/store';
import { communityItems, type CommunityItem } from '../lib/communityItems';
import { Chip, Empty, SectionTitle, Tag, Thumb } from './ui';

import { getRecipe } from '../data/recipes';

const replacementTags = ['替换食材', '替换调味品', '替换厨具'] as const;
type ReplacementTag = typeof replacementTags[number];

function tagsFor(item: CommunityItem): ReplacementTag[] {
  const recipe = getRecipe(item.recipeId);
  if (!recipe) return [];
  const changes = [...item.substitutions, ...item.adjustments.filter((line) => /换|替代|省略|没有/.test(line))];
  const changedIngredients = recipe.ingredients.filter((ingredient) =>
    changes.some((line) => line.includes(ingredient.name)),
  );
  return replacementTags.filter((tag) => {
    if (tag === '替换厨具') return item.appliance !== recipe.primaryAppliance;
    return changedIngredients.some((ingredient) =>
      tag === '替换调味品' ? ingredient.group === 'seasoning' : ingredient.group !== 'seasoning',
    );
  });
}
function ItemCard({ item, onOpen }: { item: CommunityItem; onOpen: () => void }) {
  const resultTone = item.result === 'success' ? 'ok' : item.result === 'mostly' ? 'warn' : 'danger';
  return (
    <div className="card tight" style={{ marginBottom: 10 }}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <Thumb cover={item.cover} size="md" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row-between">
            <div className="strong" style={{ fontSize: 13 }}>{item.avatar} {item.author}</div>
            <span className="tiny muted">{item.dateText}</span>
          </div>
          <div className="badge-row">
            {!item.isDemo && <Tag tone="brand">我的作业</Tag>}
            <Tag tone={resultTone}>{RESULT_LABEL[item.result]}</Tag>
            {tagsFor(item).map((tag) => <Tag key={tag} tone="outline">{tag}</Tag>)}
            <Tag tone="outline">{item.servings} 人份</Tag>
          </div>
        </div>
      </div>
      <div className="small" style={{ color: 'var(--ink-2)', lineHeight: 1.7, marginTop: 9 }}>
        {item.adjustments.length ? `实际调整：${item.adjustments.slice(0, 2).join('；')}` : '未填写额外调整'}
        {item.substitutions.length > 0 && ` · 含 ${item.substitutions.length} 项替换材料经验`}
      </div>
      <div className="row-between mt10">
        <span className="tiny muted">有帮助 {item.helpful}</span>
        <button className="text-btn" onClick={onOpen}>查看复刻 ›</button>
      </div>
    </div>
  );
}

export function CommunityList({ recipeId, limit, showFilters = true }: { recipeId: string; limit?: number; showFilters?: boolean }) {
  const { state, setOverlay } = useApp();
  const [replacement, setReplacement] = useState<ReplacementTag | null>(null);


  const all = useMemo(() => communityItems(recipeId, state.homework), [recipeId, state.homework]);
  const filtered = useMemo(() => all.filter((i) => {
    if (replacement && !tagsFor(i).includes(replacement)) return false;
    return true;
  }), [all, replacement]);
  const shown = limit ? filtered.slice(0, limit) : filtered;

  return (
    <div className="section">
      <SectionTitle title="大家的复刻" extra={`${all.length} 条`} />
      {showFilters && (
        <div className="chip-row mb10">
          <Chip active={replacement === null} onClick={() => setReplacement(null)}>全部</Chip>
          {replacementTags.map((tag) => <Chip key={tag} active={replacement === tag} onClick={() => setReplacement(replacement === tag ? null : tag)}>{tag}</Chip>)}
        </div>
      )}

      {shown.length === 0 ? (
        <Empty>还没有符合条件的复刻记录。<br />完成一次做菜后，你的作业会出现在这里。</Empty>
      ) : shown.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          onOpen={() => setOverlay(item.kind === 'demo'
            ? { kind: 'replica', replicaId: item.id }
            : { kind: 'homework', homeworkId: item.id })}
        />
      ))}
      {limit && filtered.length > limit && (
        <button className="text-btn muted btn-block" onClick={() => setOverlay({ kind: 'community', recipeId })}>
          查看全部 {filtered.length} 条复刻 ›
        </button>
      )}
    </div>
  );
}




