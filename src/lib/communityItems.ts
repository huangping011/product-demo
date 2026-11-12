import type { Homework, Replica, ReplicationResult, Appliance } from '../types';
import { DEMO_REPLICAS } from '../data/community';
import { todayShort } from './utils';

export interface CommunityItem {
  id: string;
  kind: 'demo' | 'mine';
  recipeId: string;
  author: string;
  avatar: string;
  at: string;
  dateText: string;
  cover: { emoji: string; from: string; to: string; image?: string };
  appliance: Appliance;
  servings: number;
  result: ReplicationResult;
  adjustments: string[];
  substitutions: string[];
  advice: string;
  helpful: number;
  isDemo: boolean;
  source: Replica | Homework;
}

export function demoToItem(r: Replica): CommunityItem {
  return {
    id: r.id, kind: 'demo', recipeId: r.recipeId, author: r.author, avatar: r.avatar, at: r.at,
    dateText: r.at.slice(5).replace('-', ' 月 ') + ' 日',
    cover: r.cover, appliance: r.appliance, servings: r.servings, result: r.result,
    adjustments: r.adjustments, substitutions: r.substitutions, advice: r.advice,
    helpful: r.helpful, isDemo: true, source: r,
  };
}

export function homeworkToItem(h: Homework): CommunityItem {
  return {
    id: h.id, kind: 'mine', recipeId: h.recipeId, author: h.author, avatar: '🙂', at: h.createdAt,
    dateText: todayShort(h.createdAt),
    cover: h.photo ? { emoji: h.photo.startsWith('data:image/') ? '🍽️' : h.photo, image: h.photo.startsWith('data:image/') ? h.photo : undefined, from: '#ffdfae', to: '#f19a68' } : { emoji: '🍽️', from: '#f0e6d8', to: '#d9c7ae' },
    appliance: h.appliance, servings: h.servings, result: h.result,
    adjustments: h.adjustments.trim() ? h.adjustments.split(/[；;，,。\n]/).map((s) => s.trim()).filter(Boolean) : [],
    substitutions: [], advice: h.advice, helpful: 0, isDemo: false, source: h,
  };
}

export function communityItems(recipeId: string, homework: Homework[]): CommunityItem[] {
  const demo = DEMO_REPLICAS.filter((r) => r.recipeId === recipeId).map(demoToItem);
  const mine = homework.filter((h) => h.recipeId === recipeId && h.visibility === 'public').map(homeworkToItem);
  return [...mine, ...demo].sort((a, b) => (a.at < b.at ? 1 : -1));
}

