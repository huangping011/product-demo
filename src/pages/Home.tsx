import { useApp } from '../lib/store';

export function Home() {
  const { navigate, confirm, resetDemo, toast } = useApp();

  return (
    <main className="lab-home">
      <div className="lab-home-brand"><span aria-hidden="true" />点点</div>
      <div className="lab-home-cover">
        <img src="./images/soup-yumi-yao.jpg" alt="山药玉米排骨汤" />
      </div>
      <h1>菜谱实验室</h1>
      <p className="lab-home-intro">用手边的食材，做一份适合自己的配方。</p>
      <h2>选择一个入口</h2>
      <button className="lab-home-entry" onClick={() => navigate({ name: 'original-note', recipeId: 'r6' })}>
        <span className="lab-home-letter" aria-hidden="true">A</span>
        <span><strong>菜谱笔记</strong><small>从笔记打开「点点 · 菜谱实验室」</small></span>
        <span aria-hidden="true">›</span>
      </button>
      <button className="lab-home-entry" onClick={() => navigate({ name: 'chat' })}>
        <span className="lab-home-letter" aria-hidden="true">B</span>
        <span><strong>点点对话</strong><small>从推荐菜谱选择「为我定制化」</small></span>
        <span aria-hidden="true">›</span>
      </button>
      <button className="lab-home-entry" onClick={() => navigate({ name: 'profile' })}>
        <span className="lab-home-letter" aria-hidden="true">C</span>
        <span><strong>我的</strong><small>查看保存的方案、厨房档案和作业</small></span>
        <span aria-hidden="true">›</span>
      </button>
      <footer className="lab-home-footer">
        <button className="text-btn muted" onClick={() => confirm({
          kind: 'confirm',
          title: '重置体验？',
          body: '将清除当前浏览器中本 Demo 保存的厨房档案、对话、方案、做菜进度和作业。此操作不可撤销。',
          confirmText: '确认重置',
          danger: true,
          onConfirm: () => { resetDemo(); toast('已重置，可以重新体验', 'success'); },
        })}>重置体验</button>
      </footer>
    </main>
  );
}

