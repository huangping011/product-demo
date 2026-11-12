/** 菜谱实验室 · 全局类型定义。所有数据均为本地演示数据，不对应真实平台内容。 */

export const APPLIANCES = ['炒锅', '平底锅', '电饭煲', '空气炸锅', '烤箱', '微波炉', '蒸锅', '煮锅', '砂锅', '高压锅'] as const;
export type Appliance = (typeof APPLIANCES)[number];

export const COMMON_ALLERGENS = ['花生', '蛋类', '虾蟹/甲壳类', '大豆', '小麦/麸质', '芝麻', '乳制品'] as const;

export type MaterialGroup = 'main' | 'seasoning' | 'staple' | 'cookware';
export type BasisType = 'author' | 'community' | 'ai';
export type StockState = 'have' | 'missing' | 'unsure';
export type Strategy = 'useExisting' | 'canBuy' | 'followOriginal';

export interface Substitute {
  name: string;
  note: string;
  allergens?: string[];
}

export interface Ingredient {
  key: string;
  name: string;
  amount: number;
  unit: string;
  group: MaterialGroup;
  essential: boolean;
  allergens: string[];
  substitutes?: Substitute[];
  note?: string;
  /** 原文写「适量」等无法量化的材料：换算时恒显示「适量（按口味）」 */
  looseAmount?: boolean;
}

/** {{key}} 会在渲染时替换成按人数缩放后的实际用量，用量永远由代码计算 */
export interface Step {
  id: string;
  title: string;
  text: string;
  setting: string;
  minutes: number;
  doneState: string;
  risk?: string;
  basis?: BasisType;
}

export interface Variant {
  appliance: Appliance;
  versionName: string;
  minutes: number;
  basis: BasisType;
  basisNote: string;
  steps: Step[];
  /** 预设适配说明：对照原版的具体影响（锅具/材料替换的风味与口感解释） */
  adaptation?: string[];
  /** 该版本相对原版的风味/口感影响，用于「味道会怎么变」区块 */
  flavorImpact?: string[];
}

export interface Recipe {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  authorHandle: string;
  cover: { emoji: string; from: string; to: string; image?: string };
  noteText: string;
  noteSteps: string[];
  publishedAt: string;
  likes: number;
  collects: number;
  baseServings: number;
  /** 换算基准。普通菜谱 = baseServings；「2–3 人份」类标注取中值 2.5，UI 需说明 */
  servingsBase: number;
  servingsLabel: string;
  minutes: number;
  servingUnit: string;
  primaryAppliance: Appliance;
  appliances: Appliance[];
  tags: string[];
  ingredients: Ingredient[];
  supportedAppliances: Appliance[];
  variants: Variant[];
  missingFields: string[];
  sourceKind: 'demo' | 'user-photo';
  sourceNote: string;
  /** 无法核验真实小红书链接时为空，UI 显示"示例" */
  noteUrl?: string;
}

export type ReplicationResult = 'success' | 'mostly' | 'failed';

export interface ReplicaComment {
  id: string;
  author: string;
  text: string;
  at: string;
}

export interface Replica {
  id: string;
  recipeId: string;
  author: string;
  avatar: string;
  at: string;
  cover: { emoji: string; from: string; to: string };
  appliance: Appliance;
  servings: number;
  result: ReplicationResult;
  adjustments: string[];
  substitutions: string[];
  advice: string;
  helpful: number;
  isDemo: boolean;
  comments: ReplicaComment[];
}

export interface TastePrefs {
  spice: '按原菜谱' | '不辣' | '微辣' | '加辣';
  salt: '按原菜谱' | '少盐';
  oil: '按原菜谱' | '少油';
}

export interface KitchenProfile {
  seasonings: string[];
  appliances: Appliance[];
  avoid: string[];
  taste: TastePrefs;
  savedAt: string;
}

export interface ChatHint {
  label: string;
  value: string;
  confirmed: boolean;
  origin: 'explicit' | 'inferred';
}

export interface Conditions {
  recipeId: string;
  source: 'note' | 'chat' | 'replica';
  servings: number;
  timeLimit: number | null;
  stock: Record<string, StockState>;
  stockAmounts: Record<string, string>;
  extraIngredients: { name: string; state: StockState; group?: 'main' | 'seasoning' }[];
  seasonings: string[];
  appliances: Appliance[];
  primaryAppliance: Appliance | null;
  lockedIngredients: string[];
  substituteChoices: Record<string, string>;
  /** 用户选中的替代品是否已在家中：false 时替代品本身进入补齐清单 */
  substituteHave: Record<string, boolean>;
  /** 本次明确选择「补齐原料」的材料 key（非常备项只有在选中后才进必买） */
  buyChoices: string[];
  /** 本次主动省略的材料 key */
  omittedIngredients: string[];
  taste: TastePrefs;
  avoid: string[];
  avoidConfirmed: boolean;
  applianceConfirmed: boolean;
  strategy: Strategy;
  chatHints: ChatHint[];
  prefillFromProfile: boolean;
  replicaId?: string;
}

export interface ChangeItem {
  from: string;
  to: string;
  reason: string;
  basis: BasisType;
}

export interface MaterialItem {
  key: string;
  name: string;
  amount: string;
  group: MaterialGroup;
  essential: boolean;
  state: 'owned' | 'need' | 'unsure';
  substitutes: Substitute[];
  chosenSubstitute?: string;
  /** 替代品需要采购时，清单与渠道按这个名称展示 */
  buyName?: string;
  omitted?: boolean;
  confirmedReady: boolean;
  reason?: string;
  stockNote?: string;
  allergenConflict?: boolean;
  /** 「想还原原版」可选采购：已被替代/省略解决的缺口标记为可选 */
  originalOptional?: boolean;
}

/** 双版本：「接近原味」= 尽量按原方（缺料进可选采购）；「用现有条件做」= 按用户确认的替换/省略执行 */
export type PlanMode = 'original' | 'adapted';

export interface Plan {
  id: string;
  recipeId: string;
  createdAt: string;
  source: Conditions['source'];
  engine: 'demo-rule' | 'model';
  fallbackNotice?: string;
  conditionSnapshot: Conditions;
  mode: PlanMode;
  versionName: string;
  servings: number;
  totalMinutes: number;
  appliance: Appliance;
  summary: string;
  matchNote: string;
  /** 「味道会怎么变」：对照原版、逐条具体的风味/口感影响 */
  flavorImpact: string[];
  /** 「怎么调整的」：锅具等适配说明 */
  adaptationNotes: string[];
  changes: ChangeItem[];
  materials: MaterialItem[];
  steps: Step[];
  warnings: string[];
  saved: boolean;
}

export interface Homework {
  id: string;
  planId: string;
  recipeId: string;
  createdAt: string;
  photo: string | null;
  result: ReplicationResult;
  appliance: Appliance;
  servings: number;
  adjustments: string;
  advice: string;
  visibility: 'private' | 'public';
  organized: boolean;
  author: string;
  versionName: string;
  isDemo: false;
}

export type EventType =
  | 'entry_click'
  | 'plan_generated'
  | 'shopping_view'
  | 'product_detail_click'
  | 'external_purchase_jump'
  | 'materials_confirmed'
  | 'cooking_started'
  | 'homework_published'
  | 'helpful_click'
  | 'comment_submit'
  | 'replica_reuse'
  | 'model_failure';

export interface BehaviorEvent {
  id: string;
  type: EventType;
  at: string;
  detail: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text?: string;
  cards?: string[];
  reason?: string;
  hints?: ChatHint[];
  query?: string;
}

export interface CookingProgress {
  planId: string;
  stepIndex: number;
  startedAt: string;
  updatedAt: string;
  timerEndsAt?: number;
  timerStepId?: string;
  completed: boolean;
}

export type Route =
  | { name: 'home' }
  | { name: 'profile' }
  | { name: 'collections' }
  | { name: 'original-note'; recipeId: string }
  | { name: 'note'; recipeId: string }
  | { name: 'chat' }
  | { name: 'conditions'; recipeId: string; source: 'note' | 'chat' | 'replica'; chatHints?: ChatHint[]; replicaId?: string }
  | { name: 'plan'; planId: string }
  | { name: 'cook'; planId: string }
  | { name: 'homework'; planId: string };

export const BASIS_LABEL: Record<BasisType, string> = {
  author: '原作者做法',
  community: '社区复刻参考',
  ai: 'AI 建议，尚未实测',
};

export const GROUP_LABEL: Record<MaterialGroup, string> = {
  main: '食材',
  seasoning: '调味品',
  staple: '主食 / 配菜',
  cookware: '厨具',
};

export const RESULT_LABEL: Record<ReplicationResult, string> = {
  success: '成功',
  mostly: '基本成功',
  failed: '未达到预期',
};




