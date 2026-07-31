import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';

const MULTI_SHEET_RESPONSE = {
  ':names': ['★ Pro', 'Starter', 'Enterprise'],
  '★ Pro': { data: [{ Feature: 'Users', Value: '10' }, { Feature: 'Price', Value: '29' }] },
  Starter: { data: [{ Feature: 'Users', Value: '1' }, { Feature: 'Price', Value: '9' }] },
  Enterprise: { data: [{ Feature: 'Users', Value: '100' }, { Feature: 'Price', Value: '99' }] },
};

describe('comparison-table block', () => {
  let fetchStub;
  beforeEach(() => {
    fetchStub = sinon.stub(window, 'fetch');
    fetchStub.resolves(new Response(JSON.stringify(MULTI_SHEET_RESPONSE)));
  });
  afterEach(() => sinon.restore());

  it('renders tab buttons for each sheet', async () => {
    const el = document.createElement('div');
    el.className = 'comparison-table';
    el.innerHTML = '<div><a href="/demo/tables/tiers">tiers</a></div>';
    const { default: init } = await import('../../blocks/comparison-table/comparison-table.js');
    await init(el);
    const tabs = el.querySelectorAll('.ct-tab');
    expect(tabs.length).to.equal(3);
  });

  it('marks featured tab with recommended badge', async () => {
    const el = document.createElement('div');
    el.className = 'comparison-table';
    el.innerHTML = '<div><a href="/demo/tables/tiers">tiers</a></div>';
    const { default: init } = await import('../../blocks/comparison-table/comparison-table.js');
    await init(el);
    const activeTab = el.querySelector('.ct-tab.is-active');
    expect(activeTab.textContent).to.include('Pro');
    expect(activeTab.querySelector('.ct-recommended')).to.exist;
  });

  it('renders chart container when "chart" variant present', async () => {
    const el = document.createElement('div');
    el.className = 'comparison-table chart';
    el.innerHTML = '<div><a href="/demo/tables/tiers">tiers</a></div>';
    const { default: init } = await import('../../blocks/comparison-table/comparison-table.js');
    await init(el);
    expect(el.querySelector('.ct-chart')).to.exist;
    expect(el.querySelector('.ct-chart').classList.contains('is-visible')).to.be.true;
  });

  it('chart hidden by default when no chart variant', async () => {
    const el = document.createElement('div');
    el.className = 'comparison-table';
    el.innerHTML = '<div><a href="/demo/tables/tiers">tiers</a></div>';
    const { default: init } = await import('../../blocks/comparison-table/comparison-table.js');
    await init(el);
    const chart = el.querySelector('.ct-chart');
    expect(chart.classList.contains('is-visible')).to.be.false;
  });

  it('eye toggle flips chart visibility', async () => {
    const el = document.createElement('div');
    el.className = 'comparison-table';
    el.innerHTML = '<div><a href="/demo/tables/tiers">tiers</a></div>';
    const { default: init } = await import('../../blocks/comparison-table/comparison-table.js');
    await init(el);
    const toggle = el.querySelector('.ct-chart-toggle');
    toggle.click();
    expect(el.querySelector('.ct-chart').classList.contains('is-visible')).to.be.true;
    toggle.click();
    expect(el.querySelector('.ct-chart').classList.contains('is-visible')).to.be.false;
  });
});
