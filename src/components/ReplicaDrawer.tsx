import { useState } from 'react';
import { Button, Drawer, Notice, Tag, Thumb } from './ui';
import { RESULT_LABEL } from '../types';
import { useApp } from '../lib/store';
import { DEMO_REPLICAS } from '../data/community';
import { getRecipe } from '../data/recipes';
import { communityItems } from '../lib/communityItems';
import { shortTime } from '../lib/utils';

export function ReplicaDrawer({ replicaId, onClose }: { replicaId: string; onClose: () => void }) {
  const app = useApp();
  const [comment, setComment] = useState('');
  const demo = DEMO_REPLICAS.find((r) => r.id === replicaId);
  if (!demo) return null;
  const recipe = getRecipe(demo.recipeId)!;
  const localComments = app.state.comments[demo.id] ?? [];
  const helpful = app.state.helpful.includes(demo.id);

  return (
    <Drawer title="复刻详情" onClose={onClose} footer={
      <>
        <Button variant="ghost" onClick={onClose}>关闭</Button>
        <Button onClick={() => {
          app.logEvent('replica_reuse', `按 ${demo.author} 的版本做：${recipe.title}`);
          app.openConditions(recipe.id, 'replica', [], demo);
        }}>按这个版本做</Button>
      </>
    }>
      <div className="card">
        <div className="row" style={{ gap: 10 }}>
          <Thumb cover={demo.cover} size="md" />
          <div style={{ flex: 1 }}>
            <div className="strong">{demo.avatar} {demo.author}</div>
            <div className="tiny muted mt6">{demo.at}</div>
            <div className="badge-row">
              <Tag tone={demo.result === 'success' ? 'ok' : demo.result === 'mostly' ? 'warn' : 'danger'}>{RESULT_LABEL[demo.result]}</Tag>
            </div>
          </div>
        </div>
        <div className="divider" />
        <div className="kv">
          <div className="kv-row"><span className="kv-key">实际使用厨具</span><span className="kv-val">{demo.appliance}</span></div>
          <div className="kv-row"><span className="kv-key">份量</span><span className="kv-val">{demo.servings} 人份</span></div>
          <div className="kv-row"><span className="kv-key">主要替换材料</span><span className="kv-val">{demo.substitutions.length ? demo.substitutions.join('、') : '无'}</span></div>
          <div className="kv-row"><span className="kv-key">原菜谱</span><span className="kv-val">{recipe.title}</span></div>
          <div className="kv-row"><span className="kv-key">原作者</span><span className="kv-val">{recipe.author}</span></div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">实际调整</div>
        {demo.adjustments.map((a) => <div key={a} className="small" style={{ lineHeight: 1.8 }}>· {a}</div>)}
        <div className="divider" />
        <div className="card-title">用户报告的结果</div>
        <div className="small" style={{ lineHeight: 1.8 }}>{RESULT_LABEL[demo.result]}。{demo.advice}</div>
        <button className="text-btn mt10" onClick={() => { onClose(); app.navigate({ name: 'note', recipeId: recipe.id }); }}>查看原笔记 ›</button>
      </div>

      <div className="card">
        <div className="row-between">
          <div>
            <div className="small strong">这条复刻有帮助？</div>
          </div>
          <Button size="sm" variant={helpful ? 'secondary' : 'ghost'} onClick={() => {
            app.toggleHelpful(demo.id);
            app.logEvent('helpful_click', `${demo.author} 的示例复刻`);
          }}>{helpful ? '✓ 已标记' : '有帮助'}</Button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">问一句</div>
        <textarea className="textarea" style={{ minHeight: 62 }} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="例如：一人份酱汁大概放多少？" />
        <Button className="mt10" size="sm" variant="secondary" disabled={!comment.trim()} onClick={() => {
          app.addComment(demo.id, comment.trim());
          app.logEvent('comment_submit', `复刻 ${demo.id} 的提问（本地）`);
          setComment('');
          app.toast('评论已保存在本地，不模拟真人回复', 'success');
        }}>提交问题</Button>
        <div className="divider" />
        {demo.comments.map((c) => (
          <div key={c.id} className="small" style={{ padding: '5px 0' }}><b>{c.author}</b>：{c.text} <span className="tiny muted">· {c.at} · 示例评论</span></div>
        ))}
        {localComments.map((c) => (
          <div key={c.id} className="small" style={{ padding: '5px 0' }}><b>{c.author}</b>：{c.text} <span className="tiny muted">· {shortTime(c.at)} · 本地保存</span></div>
        ))}
        {demo.comments.length + localComments.length === 0 && <div className="tiny muted">还没有提问。</div>}
      </div>

    </Drawer>
  );
}

export function MyHomeworkDrawer({ homeworkId, onClose }: { homeworkId: string; onClose: () => void }) {
  const app = useApp();
  const hw = app.state.homework.find((h) => h.id === homeworkId);
  if (!hw) return null;
  const recipe = getRecipe(hw.recipeId)!;
  const item = communityItems(hw.recipeId, app.state.homework).find((i) => i.id === hw.id);

  return (
    <Drawer title="我的作业" subtitle="本地演示社区记录" onClose={onClose} footer={
      <>
        <Button variant="ghost" onClick={() => { onClose(); app.navigate({ name: 'homework', planId: hw.planId }); }}>编辑</Button>
        <Button variant="danger" onClick={() => app.confirm({
          kind: 'confirm', title: '删除这条作业？', body: '删除后复刻区将不再显示这条记录。', confirmText: '删除', danger: true,
          onConfirm: () => { app.removeHomework(hw.id); onClose(); app.toast('作业已删除', 'success'); },
        })}>删除</Button>
      </>
    }>
      <div className="card">
        <div className="row" style={{ gap: 10 }}>
          <Thumb cover={item?.cover ?? { emoji: '🍽️', from: '#f0e6d8', to: '#d9c7ae' }} size="md" />
          <div>
            <div className="strong">🙂 我 <Tag tone="brand">我的作业</Tag></div>
            <div className="tiny muted mt6">{shortTime(hw.createdAt)} · {hw.visibility === 'public' ? '已发布到复刻区' : '仅自己保存'}</div>
            <div className="badge-row"><Tag tone={hw.result === 'success' ? 'ok' : hw.result === 'mostly' ? 'warn' : 'danger'}>{RESULT_LABEL[hw.result]}</Tag></div>
          </div>
        </div>
        <div className="divider" />
        <div className="kv">
          <div className="kv-row"><span className="kv-key">实际厨具</span><span className="kv-val">{hw.appliance}</span></div>
          <div className="kv-row"><span className="kv-key">份量</span><span className="kv-val">{hw.servings} 人份</span></div>
          <div className="kv-row"><span className="kv-key">调整版本</span><span className="kv-val">{hw.versionName}</span></div>
          <div className="kv-row"><span className="kv-key">原菜谱 / 作者</span><span className="kv-val">{recipe.title} · {recipe.author}</span></div>
          <div className="kv-row"><span className="kv-key">AI 整理</span><span className="kv-val">{hw.organized ? '已由我确认预览' : '未使用'}</span></div>
        </div>
      </div>
      <div className="card">
        <div className="card-title">我填写的内容</div>
        <div className="small" style={{ lineHeight: 1.8 }}><b>实际调整：</b>{hw.adjustments || '（未填写）'}</div>
        <div className="small mt6" style={{ lineHeight: 1.8 }}><b>给下一位的建议：</b>{hw.advice || '（未填写）'}</div>
        <div className="small mt6" style={{ lineHeight: 1.8 }}><b>成品照片：</b>{hw.photo?.startsWith('data:image/') ? <img src={hw.photo} alt="成品照片" style={{ display: 'block', maxWidth: '100%', maxHeight: 280, borderRadius: 12 }} /> : hw.photo ?? '（未添加）'}</div>
      </div>
      <Notice tone="demo">这条记录只写入本浏览器的演示社区，不会发布到真实小红书。其他用户点「按这个版本做」时会重新确认条件。</Notice>
    </Drawer>
  );
}


