import type {
  BehaviorEvent, ChatMessage, Conditions, CookingProgress, Homework, KitchenProfile,
  Plan, ReplicaComment, Route,
} from '../types';

const KEY = 'recipe-lab:v1';

export interface AppState {
  route: Route;
  stack: Route[];
  profile: KitchenProfile | null;
  plans: Record<string, Plan>;
  currentPlanId: string | null;
  conditions: Conditions | null;
  cooking: Record<string, CookingProgress>;
  homework: Homework[];
  events: BehaviorEvent[];
  chat: { messages: ChatMessage[]; scrollTop: number };
  helpful: string[];
  comments: Record<string, ReplicaComment[]>;
  settings: { simulateAiFailure: boolean };
}

export function defaultState(): AppState {
  return {
    route: { name: 'home' },
    stack: [],
    profile: null,
    plans: {},
    currentPlanId: null,
    conditions: null,
    cooking: {},
    homework: [],
    events: [],
    chat: {
      messages: [
        {
          id: 'm0',
          role: 'bot',
          text: '你好，我是点点（演示）。说说你手上有什么食材、几个人吃、厨房里有什么厨具，我从预置的 6 道示例菜谱里帮你挑。',
        },
      ],
      scrollTop: 0,
    },
    helpful: [],
    comments: {},
    settings: { simulateAiFailure: false },
  };
}

export function loadState(): AppState {
  if (typeof localStorage === 'undefined') return defaultState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const base = defaultState();
    return {
      ...base,
      ...parsed,
      chat: { ...base.chat, ...(parsed.chat ?? {}) },
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
      plans: parsed.plans ?? {},
      homework: parsed.homework ?? [],
      events: parsed.events ?? [],
      cooking: parsed.cooking ?? {},
      comments: parsed.comments ?? {},
      helpful: parsed.helpful ?? [],
      stack: parsed.stack ?? [],
    };
  } catch {
    return defaultState();
  }
}

/** overlay / toast 不持久化，仅持久化业务数据；写入失败（隐私模式）时静默降级为内存态 */
export function saveState(state: AppState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* 存储不可用时仍可继续使用当前会话 */
  }
}

export function clearState(): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}
