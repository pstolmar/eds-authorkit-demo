import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';

describe('data-table block', () => {
  let fetchStub;
  beforeEach(() => {
    fetchStub = sinon.stub(window, 'fetch');
    fetchStub.resolves(new Response(JSON.stringify({ total: 2, data: [{ Name: 'Coffee A', Price: '12.00', Origin: 'Ethiopia' }, { Name: 'Coffee B', Price: '14.00', Origin: 'Colombia' }] })));
  });
  afterEach(() => sinon.restore());

  it('renders a table with thead and tbody when data loads', async () => {
    const el = document.createElement('div');
    el.className = 'data-table';
    el.innerHTML = '<div><a href="/demo/tables/test">test</a></div>';
    const { default: init } = await import('../../blocks/data-table/data-table.js');
    await init(el);
    expect(el.querySelector('table')).to.exist;
    expect(el.querySelector('thead th').textContent).to.equal('Name');
    expect(el.querySelectorAll('tbody tr').length).to.equal(2);
  });

  it('renders empty-state panel when no data source', async () => {
    const el = document.createElement('div');
    el.className = 'data-table';
    const { default: init } = await import('../../blocks/data-table/data-table.js');
    await init(el);
    expect(el.querySelector('.dt-setup-panel')).to.exist;
    expect(fetchStub.called).to.be.false;
  });

  it('sorts column ascending on th click', async () => {
    const el = document.createElement('div');
    el.className = 'data-table';
    el.innerHTML = '<div><a href="/demo/tables/test">test</a></div>';
    const { default: init } = await import('../../blocks/data-table/data-table.js');
    await init(el);
    const priceHeader = el.querySelectorAll('thead th')[1];
    priceHeader.click(); // descending
    priceHeader.click(); // ascending
    const firstCell = el.querySelector('tbody tr:first-child td:nth-child(2)');
    expect(parseFloat(firstCell.textContent)).to.equal(12);
  });
});
