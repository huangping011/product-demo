import React from 'react';
import { BASIS_LABEL, type BasisType } from '../types';
import { useApp } from '../lib/store';

export function Header({
  title, subtitle, right, onBack, showHome = true, showDemo = true,
}: { title: string; subtitle?: string; right?: React.ReactNode; onBack?: () => void; showHome?: boolean; showDemo?: boolean }) {
  const { back, goHome, toast } = useApp();
  return (
    <div className="header">
      <button className="header-back" aria-label="返回" onClick={onBack ?? back}>‹</button>
      <div className="header-titles">
        <div className="header-title">{title}</div>
        {subtitle && <div className="header-sub">{subtitle}</div>}
      </div>
      <div className="header-actions">
        {right}
        {showDemo && <button className="tag tag-demo" style={{ border: 'none' }} onClick={() => toast('本页所有菜谱、复刻、商品与购买入口均为演示数据，不代表真实平台内容。')}>演示</button>}
        {showHome && <button className="header-home" onClick={goHome}>首页</button>}
      </div>
    </div>
  );
}

export function Page({ children, bottomBar }: { children: React.ReactNode; bottomBar?: React.ReactNode }) {
  return (
    <>
      <div className="page">{children}<div className="page-bottom" /></div>
      {bottomBar && <div className="bottom-bar"><div className="bottom-bar-inner">{bottomBar}</div></div>}
    </>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'sm' | 'xs';
  block?: boolean;
};

export function Button({ variant = 'primary', size = 'md', block, className = '', ...rest }: BtnProps) {
  const cls = [
    'btn', `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : size === 'xs' ? 'btn-xs' : '',
    block ? 'btn-block' : '', className,
  ].filter(Boolean).join(' ');
  return <button {...rest} className={cls} />;
}

export function Chip({
  active, onClick, children, disabled, tone = 'brand',
}: { active?: boolean; onClick?: () => void; children: React.ReactNode; disabled?: boolean; tone?: 'brand' | 'danger' | 'ok' }) {
  return (
    <button
      className={`chip ${active ? 'chip-active' : ''} ${disabled ? 'chip-locked' : ''}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  value, options, onChange,
}: {
  value: T;
  options: { value: T; label: string; tone?: 'danger' | 'ok' }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          className={`seg-item ${value === o.value ? `seg-active ${o.tone ? `seg-${o.tone}` : ''}` : ''}`}
          onClick={() => onChange(o.value)}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SectionTitle({ title, extra }: { title: string; extra?: React.ReactNode }) {
  return (
    <div className="section-head">
      <div className="section-title">{title}</div>
      {extra && <div className="section-extra">{extra}</div>}
    </div>
  );
}

export function Thumb({ cover, size = 'sm' }: { cover: { emoji: string; from: string; to: string; image?: string }; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className={`thumb thumb-${size}`} style={cover.image ? undefined : { background: `linear-gradient(135deg, ${cover.from}, ${cover.to})` }}>
      {cover.image ? <img src={cover.image} alt="" loading="lazy" /> : <span>{cover.emoji}</span>}
    </div>
  );
}

export function Tag({ tone = 'demo', children }: { tone?: 'demo' | 'brand' | 'ok' | 'warn' | 'danger' | 'info' | 'outline'; children: React.ReactNode }) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}

export function BasisTag({ basis }: { basis: BasisType }) {
  return <span className={`tag tag-${basis}`}>{BASIS_LABEL[basis]}</span>;
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'danger' | 'demo'; children: React.ReactNode }) {
  return <div className={`notice notice-${tone}`}>{children}</div>;
}

export function Field({ label, hint, children, required }: { label: string; hint?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="section">
      <div className="form-label">{label}{required && <span style={{ color: 'var(--brand)' }}> *</span>}</div>
      {hint && <div className="form-hint">{hint}</div>}
      {children}
    </div>
  );
}

export function Drawer({
  title, onClose, children, footer, subtitle,
}: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="drawer-mask" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="drawer-grab" />
        <div className="drawer-head">
          <div>
            <div className="drawer-title">{title}</div>
            {subtitle && <div className="small muted" style={{ marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="关闭">✕</button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function DemoNote({ children }: { children: React.ReactNode }) {
  return <Notice tone="demo"><b>演示说明：</b>{children}</Notice>;
}
