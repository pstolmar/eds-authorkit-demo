import { expect } from '@esm-bundle/chai';
import { renderField, getBuiltInHints } from '../../scripts/utils/schema-hints.js';

describe('schema-hints', () => {
  describe('getBuiltInHints', () => {
    it('returns coffee hints', () => {
      const h = getBuiltInHints('coffee');
      expect(h.rating).to.equal('stars');
      expect(h.tastingNotes).to.equal('pills');
      expect(h.price).to.equal('price-badge');
      expect(h.faqs).to.equal('accordion');
      expect(h.brewing).to.equal('spec-table');
    });
    it('returns empty object for unknown schema', () => {
      expect(getBuiltInHints('unknown')).to.deep.equal({});
    });
  });

  describe('renderField', () => {
    it('stars: renders span.sc-stars with aria-label', () => {
      const el = renderField('rating', 4.5, 'stars', {});
      expect(el.className).to.equal('sc-stars');
      expect(el.getAttribute('aria-label')).to.equal('4.5 out of 5 stars');
    });

    it('pills: renders ul.sc-pills with one li per item', () => {
      const el = renderField('tags', ['citrus', 'floral'], 'pills', {});
      expect(el.tagName).to.equal('UL');
      expect(el.className).to.equal('sc-pills');
      expect(el.querySelectorAll('li').length).to.equal(2);
    });

    it('price-badge: formats currency from data.currency', () => {
      const el = renderField('price', 16.5, 'price-badge', { currency: 'USD' });
      expect(el.className).to.equal('sc-price-badge');
      expect(el.textContent).to.include('16.50');
    });

    it('accordion: renders dl.sc-accordion with details/summary per item', () => {
      const faqs = [{ question: 'Q1?', answer: 'A1.' }];
      const el = renderField('faqs', faqs, 'accordion', {});
      expect(el.className).to.equal('sc-accordion');
      expect(el.querySelector('summary').textContent).to.equal('Q1?');
    });

    it('spec-table: renders dl.sc-spec-table with dt/dd pairs', () => {
      const el = renderField('brewing', { method: 'V60', ratio: '1:16' }, 'spec-table', {});
      expect(el.className).to.equal('sc-spec-table');
      expect(el.querySelectorAll('dt').length).to.equal(2);
    });

    it('boolean true: renders sc-boolean--true', () => {
      const el = renderField('inStock', true, 'boolean', {});
      expect(el.classList.contains('sc-boolean--true')).to.be.true;
    });

    it('default: renders div.sc-field with dt label and dd value', () => {
      const el = renderField('origin', 'Ethiopia', null, {});
      expect(el.className).to.equal('sc-field');
      expect(el.querySelector('dt').textContent).to.equal('Origin');
      expect(el.querySelector('dd').textContent).to.equal('Ethiopia');
    });
  });
});
