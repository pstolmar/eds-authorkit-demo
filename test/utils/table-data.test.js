import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { parseInlineTable, loadTableData, loadFromUrl } from '../../scripts/utils/table-data.js';

describe('table-data', () => {
  describe('parseInlineTable', () => {
    it('extracts headers from thead and rows from tbody', () => {
      const table = document.createElement('table');
      table.innerHTML = `
        <thead><tr><th>Name</th><th>Price</th></tr></thead>
        <tbody>
          <tr><td>Coffee A</td><td>12.00</td></tr>
          <tr><td>Coffee B</td><td>14.00</td></tr>
        </tbody>`;
      const result = parseInlineTable(table);
      expect(result.headers).to.deep.equal(['Name', 'Price']);
      expect(result.rows.length).to.equal(2);
      expect(result.rows[0]).to.deep.equal(['Coffee A', '12.00']);
      expect(result.sheets[0].name).to.equal('Table');
    });
  });

  describe('loadFromUrl — DA JSON (single sheet)', () => {
    let fetchStub;
    beforeEach(() => {
      fetchStub = sinon.stub(window, 'fetch');
    });
    afterEach(() => sinon.restore());

    it('parses single-sheet DA JSON response', async () => {
      fetchStub.resolves(new Response(JSON.stringify({
        total: 2,
        limit: 256,
        offset: 0,
        data: [{ Name: 'Coffee A', Price: '12' }, { Name: 'Coffee B', Price: '14' }],
      })));
      const result = await loadFromUrl('https://example.com/sheet');
      expect(result.headers).to.deep.equal(['Name', 'Price']);
      expect(result.rows.length).to.equal(2);
      expect(result.sheets.length).to.equal(1);
      expect(result.sheets[0].featured).to.be.false;
    });

    it('parses multi-sheet DA JSON response', async () => {
      fetchStub.resolves(new Response(JSON.stringify({
        ':names': ['★ Pro', 'Starter'],
        '★ Pro': { data: [{ Feature: 'Users', Value: '10' }] },
        Starter: { data: [{ Feature: 'Users', Value: '1' }] },
      })));
      const result = await loadFromUrl('https://example.com/sheet');
      expect(result.sheets.length).to.equal(2);
      expect(result.sheets[0].featured).to.be.true;
      expect(result.sheets[0].name).to.equal('Pro');
    });
  });

  describe('loadTableData', () => {
    let fetchStub;
    beforeEach(() => { fetchStub = sinon.stub(window, 'fetch'); });
    afterEach(() => sinon.restore());

    it('returns null when no link and no table', async () => {
      const el = document.createElement('div');
      el.textContent = 'hello';
      const result = await loadTableData(el);
      expect(result).to.be.null;
    });

    it('calls loadFromUrl when a link is present', async () => {
      fetchStub.resolves(new Response(JSON.stringify({ total: 0, data: [] })));
      const el = document.createElement('div');
      el.innerHTML = '<a href="/demo/tables/test">test</a>';
      await loadTableData(el);
      expect(fetchStub.calledOnce).to.be.true;
      expect(fetchStub.args[0][0]).to.include('/demo/tables/test');
    });

    it('calls parseInlineTable when an inline table is present', async () => {
      const el = document.createElement('div');
      el.innerHTML = '<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>';
      const result = await loadTableData(el);
      expect(fetchStub.called).to.be.false;
      expect(result.headers).to.deep.equal(['A']);
    });
  });
});
