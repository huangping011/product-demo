import { useEffect, useRef, useState } from 'react';
import { Button, Header } from '../components/ui';
import { ChatRecipeCard } from '../components/RecipeCard';
import { useApp } from '../lib/store';
import { parseChatQuery, recommendRecipes } from '../lib/ai';
import { getRecipe } from '../data/recipes';
import { makeId } from '../lib/utils';
import type { ChatMessage } from '../types';

const QUICK = [
  '排骨怎么做？',
  '想喝清甜一点的汤',
  '家里有鸡腿，今晚一个人吃，能做什么？',
  '只有微波炉，宿舍里能做什么？',
];

const soupReply = '想喝汤就清炖，想配米饭可以做红烧，喜欢酸甜口就做糖醋。今天想吃清淡一点的话，我会推荐山药玉米排骨汤：玉米带点清甜，山药炖好后粉糯，调味也简单。';
export function DianDian() {
  const { state, navigate, openConditions, setChatMessages, setChatScroll } = useApp();
  const [text, setText] = useState('');
  const firstUser = state.chat.messages.findIndex((message) => message.role === 'user');
  const messages = firstUser >= 0 ? state.chat.messages.slice(firstUser) : [];
  const restored = useRef(false);
  const scrollTimer = useRef<number | undefined>(undefined);

  // 从笔记返回时恢复消息与滚动位置
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    window.requestAnimationFrame(() => window.scrollTo(0, state.chat.scrollTop));
  }, [state.chat.scrollTop]);

  useEffect(() => {
    const onScroll = () => {
      window.clearTimeout(scrollTimer.current);
      scrollTimer.current = window.setTimeout(() => setChatScroll(window.scrollY), 180);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(scrollTimer.current);
    };
  }, [setChatScroll]);

  const send = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    const hints = parseChatQuery(q);
    const recs = recommendRecipes(q);
    const userMsg: ChatMessage = { id: makeId('m'), role: 'user', text: q };
    const botMsg: ChatMessage = {
      id: makeId('m'), role: 'bot', query: q, hints,
      cards: recs.map((r) => r.recipe.id),
      text: recs[0]?.recipe.id === 'r6' ? soupReply : recs.length ? '可以从下面这几道里挑一道。看看哪道合口味，再按你手边的食材和锅具调整。' : '我暂时没找到合适的菜。你可以说说手边有什么食材，比如排骨、鸡腿或番茄。',
    };
    setChatMessages([...messages, userMsg, botMsg]);
    setText('');
    window.setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 60);
  };

  return (
    <>
      <Header title="点点" />
      <div className="chat-wrap dian-conversation">
        {messages.map((m) => {
          if (m.role === 'user') {
            return (
              <div className="chat-row right" key={m.id}>
                <div className="chat-bubble">{m.text}</div>
              </div>
            );
          }
          const recs = m.query ? recommendRecipes(m.query) : [];
          return (
            <div className="chat-row left" key={m.id}>
              <div className="dian-answer">
                <p>{m.text}</p>
                {m.cards && m.cards.length > 0 && (
                  <div className="chat-cards">
                    {m.cards.map((id, idx) => {
                      const recipe = getRecipe(id);
                      if (!recipe) return null;
                      return (
                        <ChatRecipeCard
                          key={`${m.id}-${id}`}
                          recipe={recipe}
                          reason={id === 'r6' ? '排骨先焯水，再和玉米、胡萝卜炖汤，山药最后放。点「为我定制化」，可以按人数、锅具和手边材料调整。' : recs[idx]?.reason ?? '家常做法'}
                          hintsCount={m.hints?.length ?? 0}
                          onCondition={() => openConditions(id, 'chat', m.hints ?? [])}
                          onNote={() => { setChatScroll(window.scrollY); navigate({ name: 'note', recipeId: id }); }}
                        />
                      );
                    })}

                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div className="section" style={{ marginTop: 18 }}>
          <div className="form-label">试试这些提问</div>
          <div className="chip-row">
            {QUICK.map((q) => (
              <button key={q} className="chip" onClick={() => send(q)}>{q}</button>
            ))}
          </div>
        </div>
        <div className="tiny muted center" style={{ padding: '16px 0', lineHeight: 1.8 }}>
          示例对话
        </div>
      </div>
      <div className="chat-input-bar">
        <input
          className="input"
          value={text}
          placeholder="说说你有什么食材、几个人吃…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(text); }}
        />
        <Button onClick={() => send(text)} disabled={!text.trim()}>发送</Button>
      </div>
    </>
  );
}



