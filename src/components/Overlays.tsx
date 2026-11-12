import { Button, Drawer, Notice } from './ui';
import { useApp } from '../lib/store';
import { ShoppingDrawer, ProductDrawer } from './ShoppingDrawer';
import { ReplicaDrawer, MyHomeworkDrawer } from './ReplicaDrawer';
import { TroubleDrawer } from './TroubleDrawer';
import { CommunityList } from './CommunityList';
import { EVENT_LABEL } from '../lib/eventLabels';
import { shortTime } from '../lib/utils';

function EventsDrawer({ onClose }: { onClose: () => void }) {
  const { state } = useApp();
  const events = [...state.events].reverse();
  return (
    <Drawer title="行为事件记录" subtitle={`共 ${events.length} 条 · 仅本浏览器`} onClose={onClose}>
      <Notice tone="demo">
        平台价值验证先记录四类事件：待采购清单查看、商品详情点击、外部采购跳转、用户主动确认已备齐。<b>MVP 不把点击当作成交</b>，不做真实订单与佣金归因。
      </Notice>
      <div className="card">
        {events.length === 0 ? (
          <div className="empty">还没有事件。走一遍「看菜谱 → 生成方案 → 待采购清单 → 做菜 → 交作业」就会记录下来。</div>
        ) : events.map((e) => (
          <div className="event-row" key={e.id}>
            <span className="event-time">{shortTime(e.at)}</span>
            <span className="event-type">{EVENT_LABEL[e.type]}</span>
            <span style={{ color: 'var(--ink-2)', lineHeight: 1.6, wordBreak: 'break-all' }}>{e.detail}</span>
          </div>
        ))}
      </div>
      <div className="tiny muted center" style={{ lineHeight: 1.8, padding: '8px 0' }}>
        事件只保存在本地，用于演示验收，不上传任何服务端。
      </div>
    </Drawer>
  );
}

function ConfirmHost() {
  const { overlay, setOverlay } = useApp();
  if (overlay.kind !== 'confirm') return null;
  const o = overlay;
  const close = () => setOverlay(o.returnTo ?? { kind: 'none' });
  return (
    <div className="confirm-mask" onClick={() => { close(); o.onCancel?.(); }}>
      <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-title">{o.title}</div>
        <div className="confirm-body">{o.body}</div>
        <div className="confirm-actions">
          <Button variant="ghost" onClick={() => { close(); o.onCancel?.(); }}>{o.cancelText ?? '取消'}</Button>
          <Button variant={o.danger ? 'danger' : 'primary'} onClick={() => { close(); o.onConfirm(); }}>{o.confirmText ?? '确认'}</Button>
        </div>
      </div>
    </div>
  );
}

function ToastHost() {
  const { toasts, dismissToast } = useApp();
  if (!toasts.length) return null;
  return (
    <div className="toast-host">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone === 'warn' ? 'toast-warn' : t.tone === 'success' ? 'toast-success' : ''}`} onClick={() => dismissToast(t.id)}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function Overlays() {
  const { overlay, setOverlay } = useApp();
  const close = () => setOverlay({ kind: 'none' });

  return (
    <>
      {overlay.kind === 'shopping' && <ShoppingDrawer planId={overlay.planId} onClose={close} />}
      {overlay.kind === 'product' && (
        <ProductDrawer product={overlay.product} materialName={overlay.materialName} amount={overlay.amount} planId={overlay.planId} onClose={close} />
      )}
      {overlay.kind === 'replica' && <ReplicaDrawer replicaId={overlay.replicaId} onClose={close} />}
      {overlay.kind === 'homework' && <MyHomeworkDrawer homeworkId={overlay.homeworkId} onClose={close} />}
      {overlay.kind === 'trouble' && <TroubleDrawer planId={overlay.planId} stepIndex={overlay.stepIndex} onClose={close} />}
      {overlay.kind === 'community' && (
        <Drawer title="大家的复刻" subtitle="示例数据 + 我的作业" onClose={close}>
          <CommunityList recipeId={overlay.recipeId} />
        </Drawer>
      )}
      {overlay.kind === 'events' && <EventsDrawer onClose={close} />}
      <ConfirmHost />
      <ToastHost />
    </>
  );
}


