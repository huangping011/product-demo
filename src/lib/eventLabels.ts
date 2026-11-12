import type { EventType } from '../types';

export const EVENT_LABEL: Record<EventType, string> = {
  entry_click: '入口点击',
  plan_generated: '方案生成',
  shopping_view: '待采购清单查看',
  product_detail_click: '商品详情点击',
  external_purchase_jump: '外部采购跳转',
  materials_confirmed: '主动确认已备齐',
  cooking_started: '开始做菜',
  homework_published: '作业发布',
  helpful_click: '有帮助',
  comment_submit: '提交提问',
  replica_reuse: '按这个版本做',
  model_failure: '模型请求失败',
};


