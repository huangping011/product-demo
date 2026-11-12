// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../App';
import type { AppState } from '../lib/storage';

const KEY = 'recipe-lab:v1';

function readState(): AppState {
  return JSON.parse(localStorage.getItem(KEY) ?? '{}') as AppState;
}

function click(name: string | RegExp, index = 0) {
  const els = screen.getAllByRole('button', { name });
  expect(els.length).toBeGreaterThan(index);
  fireEvent.click(els[index]);
}

function clickText(name: string | RegExp, index = 0) {
  const els = screen.getAllByText(name);
  expect(els.length).toBeGreaterThan(index);
  fireEvent.click(els[index]);
}

async function openConditionsFromNoteA() {
  click(/入口 A/);
  clickText('识别菜谱');
  await waitFor(() => expect(screen.getAllByRole('button', { name: '为我定制化' }).length).toBeGreaterThan(0));
  click('为我定制化');
  await waitFor(() => expect(screen.getByText('① 几人份 · 多久')).toBeTruthy());
}

function gapRow(name: string) {
  return screen.getByRole('button', { name: new RegExp(`${name}.*(已备齐|缺)$`) });
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('scrollTo', vi.fn());
  vi.stubGlobal('open', vi.fn(() => ({})));
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 0));
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('验收用例 · 端到端交互（jsdom）', () => {
  it('A. 材料齐全：选人数 / 时间 / 锅具，一键确认后直接生成', async () => {
    render(<App />);
    await openConditionsFromNoteA();

    click('2 人');
    click('90 分钟');
    click('高压锅');
    click('材料都齐了');
    expect(screen.getByText(/2 人份 · 90 分钟 · 高压锅 · 缺 0 项/)).toBeTruthy();
    click('生成我的做法');

    await waitFor(() => expect(screen.getByText('本次调整摘要')).toBeTruthy());
    const state = readState();
    const plan = state.plans[state.currentPlanId!];
    expect(state.conditions?.servings).toBe(2);
    expect(plan.servings).toBe(2);
    expect(plan.appliance).toBe('高压锅');
    expect(plan.totalMinutes).toBe(45);
    expect(plan.materials.find((m) => m.key === 'porkRibs')?.amount).toBe('280 g');
    expect(screen.getAllByText(/280 g/).length).toBeGreaterThan(0);

    // 材料齐全 → 必买 0 项
    click(/要补什么/);
    expect(screen.getByText('补齐清单')).toBeTruthy();
    expect(screen.getAllByText('暂无。').length).toBeGreaterThan(0);
    click('完成，返回方案');
    click('开始做菜');
    await waitFor(() => expect(screen.getByText(/STEP 01/)).toBeTruthy());
  });

  it('B. 缺甜玉米和料酒：糯玉米替换移出必买，补齐料酒只对料酒展示渠道；改人数后用量同步', async () => {
    render(<App />);
    await openConditionsFromNoteA();

    click('电饭煲');
    fireEvent.click(gapRow('甜玉米'));
    click('用「糯玉米」替换');
    expect(screen.getByText(/汤的甜味可能变淡/)).toBeTruthy();
    expect(screen.getByText(/已选|用「糯玉米」替换/)).toBeTruthy();

    fireEvent.click(gapRow('料酒'));
    click('补齐料酒');
    expect(screen.getAllByText(/缺 1 项/).length).toBeGreaterThan(0);
    click('生成我的做法');

    await waitFor(() => expect(screen.getByText('本次调整摘要')).toBeTruthy());
    const state = readState();
    const plan = state.plans[state.currentPlanId!];
    const corn = plan.materials.find((m) => m.key === 'corn')!;
    const wine = plan.materials.find((m) => m.key === 'cookingWine')!;
    expect(corn.state).toBe('owned');
    expect(corn.chosenSubstitute).toBe('糯玉米');
    expect(corn.originalOptional).toBe(true);
    expect(wine.state).toBe('need');
    expect(wine.originalOptional).toBe(false);
    expect(plan.flavorImpact.some((f) => f.includes('甜味可能变淡'))).toBe(true);

    // 补齐清单：必买只有料酒一条，甜玉米默认收在「想还原原味」里
    click(/要补什么（1）/);
    const drawer = within(screen.getByRole('dialog'));
    expect(drawer.getAllByText('查看购买渠道').length).toBe(1);
    expect(drawer.queryByText('甜玉米')).toBeNull();
    click('查看购买渠道');
    expect(drawer.getByText(/去综合电商查找/)).toBeTruthy();
    expect(drawer.getByText(/去即时零售平台查找/)).toBeTruthy();
    click(/展开 1 项/);
    expect(drawer.getAllByText('甜玉米').length).toBeGreaterThan(0);
    expect(drawer.getAllByText('想还原原版·可选').length).toBeGreaterThan(0);
    click('完成，返回方案');

    // 改人数：食材、步骤与采购用量一起更新
    click('修改条件');
    await waitFor(() => expect(screen.getByText('① 几人份 · 多久')).toBeTruthy());
    click('4 人');
    click('生成我的做法');
    await waitFor(() => expect(screen.getByText('本次调整摘要')).toBeTruthy());
    const state2 = readState();
    const plan2 = state2.plans[state2.currentPlanId!];
    expect(plan2.id).not.toBe(plan.id);
    expect(plan2.servings).toBe(4);
    expect(plan2.materials.find((m) => m.key === 'porkRibs')?.amount).toBe('560 g');
    expect(plan2.materials.find((m) => m.key === 'cookingWine')?.amount).toBe('1.5 勺');
    expect(screen.getAllByText(/560 g/).length).toBeGreaterThan(0);
    click(/要补什么（1）/);
    const drawer2 = within(screen.getByRole('dialog'));
    expect(drawer2.getByText(/需要 1.5 勺/)).toBeTruthy();
  });

  it('C. 自定义人数 / 时间校验，保存并带入厨房档案', async () => {
    render(<App />);
    await openConditionsFromNoteA();

    // 自定义人数：输入即生效
    const customButtons = screen.getAllByRole('button', { name: '自定义' });
    fireEvent.click(customButtons[0]);
    const servingsInput = screen.getByLabelText('自定义人');
    fireEvent.change(servingsInput, { target: { value: '5' } });
    expect(screen.getByText(/5 人份 ·/)).toBeTruthy();
    // 非正整数：拦截并提示
    fireEvent.change(servingsInput, { target: { value: '0' } });
    expect(screen.getByText(/请输入 1–8 的整数/)).toBeTruthy();
    click('生成我的做法');
    expect(screen.getByText(/请输入 1–8 之间的整数人数/)).toBeTruthy();
    expect(readState().currentPlanId).toBeNull();
    fireEvent.change(servingsInput, { target: { value: '5' } });

    // 自定义时间
    fireEvent.click(screen.getAllByRole('button', { name: '自定义' })[1]);
    const timeInput = screen.getByLabelText('自定义分钟');
    fireEvent.change(timeInput, { target: { value: '45' } });
    expect(screen.getAllByText(/45 分钟/).length).toBeGreaterThan(0);

    // 选一口档案锅具后保存档案
    click('高压锅');
    click('保存为我的厨房档案');
    const saved = readState().profile!;
    expect(saved.appliances).toEqual(['高压锅']);
    expect(saved.seasonings).toContain('盐');
    expect(saved.seasonings).toContain('料酒');

    // 重新进入：档案锅具被预选，并显示「已带入厨房档案」
    cleanup();
    const restored = readState();
    restored.route = { name: 'home' };
    restored.stack = [];
    localStorage.setItem(KEY, JSON.stringify(restored));
    render(<App />);
    await openConditionsFromNoteA();
    expect(readState().profile).toBeTruthy();
    expect(readState().conditions!.prefillFromProfile).toBe(true);
    expect(screen.getByText(/已带入厨房档案/)).toBeTruthy();
    const c = readState().conditions!;
    expect(c.primaryAppliance).toBe('高压锅');
    expect(c.servings).toBe(3); // 人数 / 时间只用于上一次方案，不写档案
    expect(c.timeLimit).toBeNull();
  });

  it('D. 「按这个版本做」带入份量与锅具，可直接生成', async () => {
    render(<App />);
    click(/入口 A/);
    clickText('识别菜谱');
    await waitFor(() => expect(screen.getAllByRole('button', { name: '查看复刻 ›' }).length).toBeGreaterThan(0));
    click('查看复刻 ›');
    await waitFor(() => expect(screen.getByText('复刻详情')).toBeTruthy());
    click('按这个版本做');
    await waitFor(() => expect(screen.getByText('① 几人份 · 多久')).toBeTruthy());
    expect(screen.getByText(/参考复刻版本/)).toBeTruthy();
    const c = readState().conditions!;
    expect(c.source).toBe('replica');
    expect(c.appliances.length).toBe(1);
    click('生成我的做法');
    await waitFor(() => expect(screen.getByText('本次调整摘要')).toBeTruthy());
    expect(readState().currentPlanId).toBeTruthy();
  });
});
