import { useRef, useState } from 'react';
import { Page } from '../components/ui';
import { getRecipe } from '../data/recipes';
import { useApp } from '../lib/store';

const originalNoteUrl = 'https://xhslink.cn/o/47FKmA0fF8s';
const comments = [
  { name: '大美的日子', text: '一个人也得开火，煮碗面卧个蛋、撒把青菜，比在外头随便对付一口强。', date: '10-09 广东', likes: 4, avatar: '🍜' },
  { name: '花花爱养生', text: '天冷了就想吃火锅', date: '昨天 11:35 浙江', likes: 1, avatar: '🌷' },
  { name: '优雅可爱的雾', text: '能不能解放山药和玉米，胡萝卜，排骨一起炖啊？', date: '10-19 河北', likes: 0, avatar: '☁', mention: true },
];

export function OriginalNote({ recipeId }: { recipeId: string }) {
  const { navigate, toast } = useApp();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const commentsSection = useRef<HTMLElement>(null);
  const recipe = getRecipe(recipeId);
  if (!recipe) return <p>未找到笔记</p>;
  const goToComments = () => commentsSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="shared-note">
      <header className="shared-note-header">
        <button className="note-action" aria-label="返回入口选择" onClick={() => navigate({ name: 'home' })}>×</button>
        <span className="shared-note-avatar" aria-hidden="true">🍲</span>
        <span className="shared-note-author">食味人间小记</span>
        <button className="shared-note-follow" aria-pressed={following} onClick={() => setFollowing(!following)}>
          {following ? '已关注' : '关注'}
        </button>
        <button className="header-home" onClick={() => navigate({ name: 'home' })}>首页</button>
      </header>
      <Page bottomBar={
        <div className="shared-note-toolbar">
          <button className="shared-note-reply" onClick={goToComments}>登录后评论</button>
          <button className="note-action" aria-label="点赞" aria-pressed={liked} onClick={() => setLiked(!liked)}>
            <span>{liked ? '♥' : '♡'}</span>{5935 + Number(liked)}
          </button>
          <button className="note-action" aria-label="收藏" aria-pressed={saved} onClick={() => setSaved(!saved)}>
            <span>{saved ? '★' : '☆'}</span>{6403 + Number(saved)}
          </button>
          <button className="note-action" aria-label="查看评论" onClick={goToComments}><span>♧</span>54</button>
          <button className="note-action" aria-label="打开原笔记分享页" onClick={() => window.open(originalNoteUrl, '_blank', 'noopener,noreferrer')}>↗</button>
        </div>
      }>
        <div className="shared-note-image">
          {recipe.cover.image && <img src={recipe.cover.image} alt={recipe.title} />}
        </div>
        <article className="shared-note-copy">
          <h1>入秋必喝 7 碗清润汤 🍲 一周不重样</h1>
          <p>入秋之后，就爱喝暖暖的炖汤 🍂<br />整理了 7 款家常靓汤，一周不重样！<br />有浓郁肉汤，也有清爽快手汤，食材都是菜市场随手能买到的，做法简单，新手也能一次成功 ✅</p>
          <p>🍲 7 款汤清单<br />山药玉米排骨汤 · 清甜软糯</p>
          <a className="recipe-mini-link" href="#recipe-info" onClick={(event) => {
            event.preventDefault();
            navigate({ name: 'note', recipeId });
          }}><span aria-hidden="true">⬡</span> <strong>点点</strong><span className="recipe-mini-divider">·</span>菜谱实验室</a>
        </article>
        <section className="shared-note-comments" ref={commentsSection} aria-label="评论">
          <h2>共 54 条评论</h2>
          {comments.map((comment, index) => (
            <div className="shared-note-comment" key={comment.name}>
              <span className="shared-note-avatar" aria-hidden="true">{comment.avatar}</span>
              <div>
                <div className="shared-note-comment-name">{comment.name}</div>
                <div>{comment.text} {comment.mention && <button className="shared-note-link note-action" onClick={() => navigate({ name: 'chat' })}>@点点</button>}</div>
                <div className="shared-note-comment-meta">{comment.date}</div>
                <div className="shared-note-comment-meta">♡ {comment.likes || '赞'}　<button className="note-action" onClick={() => toast('请在小红书原笔记中回复')}>回复</button></div>
                {index === 0 && <div className="shared-note-nested">
                  <div className="shared-note-comment-name">小梅子养生日记</div>
                  <div>潇洒又自在</div>
                  <div className="shared-note-comment-meta">10-11 湖南　♡ 2</div>
                </div>}
              </div>
            </div>
          ))}
        </section>
      </Page>
    </div>
  );
}


