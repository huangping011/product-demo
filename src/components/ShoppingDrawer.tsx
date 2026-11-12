import { useEffect, useRef, useState } from 'react';
import { Button, Drawer, Notice, Tag } from './ui';
import { useApp } from '../lib/store';
import { channelsForGap, EXTERNAL_NOTICE, isFreshMaterial, reasonFor, type ProductEntry } from '../data/products';
import { applySubstitute, omitMaterial, markMaterialReady } from '../lib/plan';

import type { MaterialItem } from '../types';

function MaterialRow({
  m, planId,
}: { m: MaterialItem; planId: string }) {
  const app = useApp();
  const [open, setOpen] = useState(false);
  const gapName = m.buyName ?? m.name;
  const channels = channelsForGap(gapName, m.group);
  const [replacing, setReplacing] = useState(false);
  const externals = channels.filter((c) => c.kind !== 'xhs');

  const openExternal = (p: ProductEntry) => {
    app.logEvent('external_purchase_jump', `${gapName} → ${p.channel}（${p.title}）`);
    app.confirm({
      kind: 'confirm',
      title: '即将前往外部平台',
      body: `${EXTERNAL_NOTICE}\n\n本次跳转：${p.title}（搜索页）\n关键词：${gapName}`,
      confirmText: '继续前往',
      returnTo: { kind: 'shopping', planId },
      onConfirm: () => {
        const win = window.open(p.externalUrl, '_blank', 'noopener,noreferrer');
        if (!win) app.toast('浏览器拦截了新窗口，可复制链接自行打开（演示不展示真实商品详情）', 'warn');
        else app.toast('已跳转外部搜索页；材料仍为「待补齐」，需你主动确认已备好', 'info');
      },
    });
  };

  return (
    <div className="card flat" style={{ marginBottom: 9 }}>
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="material-name">{m.name}{m.buyName ? <span className="tiny muted"> → {m.buyName}</span> : null}</div>
          <div className="material-amount">
            需要 {m.amount} · {m.essential ? '必需' : '可选'} · {m.substitutes.length ? '可换一种' : '暂无替换'}
          </div>
          <div className="tiny muted" style={{ marginTop: 2 }}>{reasonFor(gapName, m.amount)}</div>
        </div>
        {m.originalOptional ? <Tag tone="warn">想还原原版·可选</Tag> : <Tag tone="danger">待补齐</Tag>}
      </div>
      <div className="material-actions">
        <Button size="xs" variant="secondary" onClick={() => {
          app.updatePlan(planId, (p) => markMaterialReady(p, m.key));
          app.logEvent('materials_confirmed', `用户主动标记「已备好」：${m.name}`);
          app.toast(`${m.name} 已由你主动标记为备好`, 'success');
        }}>已备好</Button>
        <Button size="xs" variant="secondary" onClick={() => setOpen(!open)}>前往采购</Button>
        <Button size="xs" variant="secondary" disabled={!m.substitutes.length} onClick={() => setReplacing(!replacing)}>更换</Button>
        <Button size="xs" variant="secondary" disabled={m.essential || app.state.plans[planId]?.conditionSnapshot.lockedIngredients.includes(m.key)} onClick={() => app.updatePlan(planId, (p) => omitMaterial(p, m.key))}>省略</Button>
      </div>
      {replacing && m.substitutes.map((option) => (
        <Button key={option.name} size="xs" variant="secondary" onClick={() => {
          app.updatePlan(planId, (p) => applySubstitute(p, m.key, option.name));
          setReplacing(false);
        }}>{option.name}</Button>
      ))}
      {open && (
        <div style={{ marginTop: 8, borderTop: '1px dashed var(--line)', paddingTop: 8 }}>
          <div className="row-between" style={{ padding: '5px 0' }}>
            <div className="small">小红书站内</div>
            <a href={`https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(gapName)}`} target="_blank" rel="noreferrer">去小红书搜索 ›</a>
          </div>
          {externals.map((p) => (
            <div key={p.id} className="row-between" style={{ padding: '5px 0' }}>
              <div className="small">
                {p.title}
                {p.isAd && <Tag tone="warn">广告</Tag>}
                <div className="tiny muted">{p.channel}{m.group !== 'seasoning' && isFreshMaterial(gapName) ? ' · 生鲜优先即时零售' : ''}</div>
              </div>
              <Button size="xs" variant="ghost" onClick={() => openExternal(p)}>前往 ›</Button>
            </div>
          ))}

        </div>
      )}
    </div>
  );
}

export function ShoppingDrawer({ planId, onClose }: { planId: string; onClose: () => void }) {
  const app = useApp();
  const plan = app.state.plans[planId];
  const logged = useRef(false);
  const [showOptional, setShowOptional] = useState(false);

  useEffect(() => {
    if (!logged.current && plan) {
      logged.current = true;
      app.logEvent('shopping_view', `打开待采购清单 · ${plan.versionName}`);
    }
  }, [plan, app]);

  if (!plan) return null;
  const mustBuy = plan.materials.filter((m) => m.state === 'need' && !m.originalOptional);
  const optional = plan.materials.filter((m) => m.originalOptional);

  const group = (list: MaterialItem[], label: string) => (
    <>
      <div className="section-head"><div className="section-title">{label}</div><div className="section-extra">{list.length} 项</div></div>
      {list.length === 0 ? <div className="small muted mb10">暂无。</div> :
        list.map((m) => <MaterialRow key={m.key} m={m} planId={planId} />)}
    </>
  );

  return (
    <Drawer title="待采购清单" onClose={onClose} footer={
      <Button variant="secondary" onClick={onClose}>完成，返回方案</Button>
    }>

      {group(mustBuy, '必买')}

      {optional.length > 0 && (
        <>
          <div className="section-head">
            <div className="section-title">可选</div>
            <button className="text-btn" onClick={() => setShowOptional((v) => !v)}>{showOptional ? '收起' : `展开 ${optional.length} 项`}</button>
          </div>
          {showOptional && optional.map((m) => <MaterialRow key={m.key} m={m} planId={planId} />)}
          {!showOptional && <div className="small muted mb10">已用替代 / 省略，希望接近原味可购</div>}
        </>
      )}


    </Drawer>
  );
}

export function ProductDrawer({
  product, materialName, amount, planId, onClose,
}: { product: ProductEntry; materialName: string; amount: string; planId: string; onClose: () => void }) {
  const app = useApp();
  return (
    <Drawer title={product.previewOnly ? '渠道预览' : '商品详情'} subtitle={product.channel} onClose={onClose} footer={
      <>
        <Button variant="ghost" onClick={() => app.setOverlay({ kind: 'shopping', planId })}>返回清单</Button>
        <Button variant="secondary" onClick={() => app.toast('演示商品没有真实购买链接，不会跳转或下单', 'info')}>演示商品</Button>
      </>
    }>
      <div className="card flat">
        <div className="row-between">
          <div className="card-title" style={{ margin: 0 }}>{product.title}</div>
          <Tag tone="brand">商品推荐</Tag>
        </div>
        <div className="badge-row mt10">
          <Tag tone="demo">演示</Tag>
          <Tag tone="outline">{product.channel}</Tag>
          {product.isAd && <Tag tone="warn">付费推广</Tag>}
        </div>
        <div className="divider" />
        <div className="kv">
          <div className="kv-row"><span className="kv-key">推荐理由</span><span className="kv-val">{reasonFor(materialName, amount)}</span></div>
          <div className="kv-row"><span className="kv-key">说明</span><span className="kv-val">{product.spec}</span></div>
          <div className="kv-row"><span className="kv-key">价格 / 库存</span><span className="kv-val">以实际渠道为准（不展示）</span></div>
          <div className="kv-row"><span className="kv-key">送达时间</span><span className="kv-val">以实际渠道为准（不展示）</span></div>
        </div>
      </div>
      <Notice tone="warn">
        {product.previewOnly
          ? '站内暂未配置该品类商品（演示环境无站内商品库）。此为渠道预览：展示该缺口将来在小红书站内的推荐位置与形态，不含可点击的真实商品链接。'
          : '这是明确标注的演示商品，没有真实链接，不会伪装下单成功，也不会替你加购或付款。'}
      </Notice>
      <Notice tone="demo">如需真实购买，请使用清单里的外部渠道入口；{EXTERNAL_NOTICE}</Notice>
    </Drawer>
  );
}




