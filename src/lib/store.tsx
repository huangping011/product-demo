import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
  BehaviorEvent, ChatHint, ChatMessage, Conditions, CookingProgress, EventType,
  Homework, KitchenProfile, Plan, Replica, ReplicaComment, Route,
} from '../types';
import { getRecipe } from '../data/recipes';
import type { ProductEntry } from '../data/products';
import { conditionsFromReplica, makeDefaultConditions } from './plan';
import { clearState, defaultState, loadState, saveState, type AppState } from './storage';
import { makeId, nowISO } from './utils';

export type Overlay =
  | { kind: 'none' }
  | { kind: 'shopping'; planId: string }
  | { kind: 'replica'; replicaId: string }
  | { kind: 'homework'; homeworkId: string }
  | { kind: 'trouble'; planId: string; stepIndex: number }
  | { kind: 'product'; product: ProductEntry; materialName: string; amount: string; planId: string }
  | { kind: 'events' }
  | { kind: 'community'; recipeId: string }
  | {
      kind: 'confirm';
      title: string;
      body: string;
      confirmText?: string;
      cancelText?: string;
      danger?: boolean;
      onConfirm: () => void;
      onCancel?: () => void;
      returnTo?: Overlay;
    };

export interface ToastItem { id: string; text: string; tone: 'info' | 'warn' | 'success' }

interface AppContextValue {
  state: AppState;
  patch: (p: Partial<AppState>) => void;
  navigate: (route: Route, mode?: 'push' | 'reset' | 'replace') => void;
  back: () => void;
  goHome: () => void;
  overlay: Overlay;
  setOverlay: (o: Overlay) => void;
  confirm: (o: Extract<Overlay, { kind: 'confirm' }>) => void;
  toasts: ToastItem[];
  toast: (text: string, tone?: ToastItem['tone']) => void;
  dismissToast: (id: string) => void;
  logEvent: (type: EventType, detail: string) => void;
  openConditions: (recipeId: string, source: Conditions['source'], hints?: ChatHint[], replica?: Replica) => void;
  updateConditions: (p: Partial<Conditions>) => void;
  saveProfileFromConditions: () => void;
  upsertPlan: (plan: Plan) => void;
  updatePlan: (planId: string, updater: (p: Plan) => Plan) => void;
  upsertHomework: (hw: Homework) => void;
  removeHomework: (id: string) => void;
  updateCooking: (p: CookingProgress) => void;
  setChatMessages: (messages: ChatMessage[]) => void;
  setChatScroll: (top: number) => void;
  toggleHelpful: (id: string) => void;
  addComment: (replicaId: string, text: string) => void;
  resetDemo: () => void;
}

const Ctx = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());
  const [overlay, setOverlay] = useState<Overlay>({ kind: 'none' });
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => { saveState(state); }, [state]);
  useEffect(() => () => { timers.current.forEach((t) => window.clearTimeout(t)); }, []);

  const patch = useCallback((p: Partial<AppState>) => setState((s) => ({ ...s, ...p })), []);

  const navigate = useCallback((route: Route, mode: 'push' | 'reset' | 'replace' = 'push') => {
    setState((s) => ({
      ...s,
      route,
      stack: mode === 'push' ? [...s.stack, s.route] : mode === 'reset' ? [] : s.stack,
    }));
    setOverlay({ kind: 'none' });
    window.scrollTo({ top: 0 });
  }, []);

  const back = useCallback(() => {
    setState((s) => {
      const stack = [...s.stack];
      const prev = stack.pop();
      return { ...s, route: prev ?? { name: 'home' }, stack };
    });
    setOverlay({ kind: 'none' });
    window.scrollTo({ top: 0 });
  }, []);

  const goHome = useCallback(() => navigate({ name: 'home' }, 'reset'), [navigate]);

  const toast = useCallback((text: string, tone: ToastItem['tone'] = 'info') => {
    const id = makeId('toast');
    setToasts((t) => [...t, { id, text, tone }]);
    const timer = window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
    timers.current.push(timer);
  }, []);

  const dismissToast = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const logEvent = useCallback((type: EventType, detail: string) => {
    setState((s) => ({
      ...s,
      events: [...s.events, { id: makeId('ev'), type, at: nowISO(), detail }].slice(-300),
    }));
  }, []);

  const confirm = useCallback((o: Extract<Overlay, { kind: 'confirm' }>) => setOverlay(o), []);

  const openConditions = useCallback(
    (recipeId: string, source: Conditions['source'], hints: ChatHint[] = [], replica?: Replica) => {
      const recipe = getRecipe(recipeId);
      if (!recipe) return;
      const conditions = replica
        ? conditionsFromReplica(recipe, replica, state.profile, hints)
        : makeDefaultConditions(recipe, source, undefined, hints);
      setState((s) => ({
        ...s,
        conditions,
        route: { name: 'conditions', recipeId, source, chatHints: hints, replicaId: replica?.id },
        stack: [...s.stack, s.route],
      }));
      setOverlay({ kind: 'none' });
      window.scrollTo({ top: 0 });
      logEvent('entry_click', `${source === 'note' ? '笔记详情' : source === 'chat' ? '点点菜谱卡' : '复刻版本'} → 条件设置（${recipe.title}）`);
    },
    [state.profile, logEvent],
  );

  const updateConditions = useCallback((p: Partial<Conditions>) => {
    setState((s) => (s.conditions ? { ...s, conditions: { ...s.conditions, ...p } } : s));
  }, []);

  const saveProfileFromConditions = useCallback(() => {
    setState((s) => {
      if (!s.conditions) return s;
      const c = s.conditions;
      const profile: KitchenProfile = {
        seasonings: Array.from(new Set([...(s.profile?.seasonings ?? []), ...c.seasonings])),
        appliances: [...c.appliances],
        avoid: [...c.avoid],
        taste: { ...c.taste },
        savedAt: nowISO(),
      };
      return { ...s, profile };
    });
  }, []);

  const upsertPlan = useCallback((plan: Plan) => {
    setState((s) => ({
      ...s,
      plans: { ...s.plans, [plan.id]: plan },
      currentPlanId: plan.id,
    }));
  }, []);

  const updatePlan = useCallback((planId: string, updater: (p: Plan) => Plan) => {
    setState((s) => {
      const p = s.plans[planId];
      if (!p) return s;
      return { ...s, plans: { ...s.plans, [planId]: updater(p) } };
    });
  }, []);

  const upsertHomework = useCallback((hw: Homework) => {
    setState((s) => {
      const exists = s.homework.some((h) => h.id === hw.id);
      return { ...s, homework: exists ? s.homework.map((h) => (h.id === hw.id ? hw : h)) : [...s.homework, hw] };
    });
  }, []);

  const removeHomework = useCallback((id: string) => {
    setState((s) => ({ ...s, homework: s.homework.filter((h) => h.id !== id) }));
  }, []);

  const updateCooking = useCallback((p: CookingProgress) => {
    setState((s) => ({ ...s, cooking: { ...s.cooking, [p.planId]: p } }));
  }, []);

  const setChatMessages = useCallback((messages: ChatMessage[]) => {
    setState((s) => ({ ...s, chat: { ...s.chat, messages } }));
  }, []);

  const setChatScroll = useCallback((top: number) => {
    setState((s) => (s.chat.scrollTop === top ? s : { ...s, chat: { ...s.chat, scrollTop: top } }));
  }, []);

  const toggleHelpful = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      helpful: s.helpful.includes(id) ? s.helpful.filter((x) => x !== id) : [...s.helpful, id],
    }));
  }, []);

  const addComment = useCallback((replicaId: string, text: string) => {
    const c: ReplicaComment = { id: makeId('cm'), author: '我', text, at: nowISO() };
    setState((s) => ({
      ...s,
      comments: { ...s.comments, [replicaId]: [...(s.comments[replicaId] ?? []), c] },
    }));
  }, []);

  const resetDemo = useCallback(() => {
    clearState();
    setState(defaultState());
    setOverlay({ kind: 'none' });
    setToasts([]);
    window.scrollTo({ top: 0 });
  }, []);

  const value = useMemo<AppContextValue>(() => ({
    state, patch, navigate, back, goHome, overlay, setOverlay, confirm, toasts, toast, dismissToast,
    logEvent, openConditions, updateConditions, saveProfileFromConditions, upsertPlan, updatePlan,
    upsertHomework, removeHomework, updateCooking, setChatMessages, setChatScroll, toggleHelpful,
    addComment, resetDemo,
  }), [
    state, patch, navigate, back, goHome, overlay, confirm, toasts, toast, dismissToast, logEvent,
    openConditions, updateConditions, saveProfileFromConditions, upsertPlan, updatePlan,
    upsertHomework, removeHomework, updateCooking, setChatMessages, setChatScroll, toggleHelpful,
    addComment, resetDemo,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

