import { expect } from '@esm-bundle/chai';
import { detectChartType } from '../../scripts/utils/chart-engine.js';

describe('chart-engine', () => {
  describe('detectChartType', () => {
    it('returns bar for few categories + numeric values', () => {
      const data = {
        headers: ['Product', 'Sales'],
        rows: [['A', '100'], ['B', '200']],
        sheets: [],
      };
      expect(detectChartType(data)).to.equal('bar');
    });

    it('returns line for time-like first header', () => {
      const data = {
        headers: ['Month', 'Revenue'],
        rows: [['Jan', '1000'], ['Feb', '1200']],
        sheets: [],
      };
      expect(detectChartType(data)).to.equal('line');
    });

    it('returns scatter for two numeric columns', () => {
      const data = {
        headers: ['Name', 'Price', 'Rating'],
        rows: [['A', '10', '4.5'], ['B', '20', '3.2']],
        sheets: [],
      };
      expect(detectChartType(data)).to.equal('scatter');
    });

    it('returns 3d-scatter for three or more numeric columns', () => {
      const data = {
        headers: ['Name', 'X', 'Y', 'Z'],
        rows: [['A', '1', '2', '3']],
        sheets: [],
      };
      expect(detectChartType(data)).to.equal('3d-scatter');
    });

    it('returns bar when no rows', () => {
      const data = { headers: ['A', 'B'], rows: [], sheets: [] };
      expect(detectChartType(data)).to.equal('bar');
    });
  });
});
