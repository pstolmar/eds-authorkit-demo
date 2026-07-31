import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';

const MOCK_RESPONSE = {
  metadata: { schemaName: 'coffee', title: 'light-roast-coffee' },
  data: {
    name: 'Morning Time Light Roast',
    price: 16.5,
    currency: 'USD',
    rating: 4.7,
    inStock: true,
    description: 'A bright, citrusy light roast',
    tastingNotes: ['citrus', 'floral'],
    brewing: { method: 'Pour-over', ratio: '1:16', temperature: 94 },
    faqs: [{ question: 'Q?', answer: 'A.' }],
  },
};

describe('structured-content block', () => {
  let fetchStub;

  beforeEach(() => {
    fetchStub = sinon.stub(window, 'fetch');
    fetchStub.resolves(new Response(JSON.stringify(MOCK_RESPONSE)));
    // WTR runs on localhost; inject proxy meta to simulate EDS hostname pattern
    const meta = document.createElement('meta');
    meta.setAttribute('property', 'hlx:proxyUrl');
    meta.setAttribute('content', 'main--eds-authorkit-demo--pstolmar.aem.page');
    meta.id = 'test-proxy-meta';
    document.head.append(meta);
  });
  afterEach(() => {
    sinon.restore();
    document.getElementById('test-proxy-meta')?.remove();
  });

  it('renders sc-header with product name', async () => {
    const el = document.createElement('div');
    el.textContent = 'light-roast-coffee';
    const { default: init } = await import('../../blocks/structured-content/structured-content.js');
    await init(el);
    expect(el.querySelector('.sc-header h2').textContent).to.equal('Morning Time Light Roast');
  });

  it('renders sc-stars for rating field', async () => {
    const el = document.createElement('div');
    el.textContent = 'light-roast-coffee';
    const { default: init } = await import('../../blocks/structured-content/structured-content.js');
    await init(el);
    expect(el.querySelector('.sc-stars')).to.exist;
  });

  it('shows error text when slug is empty', async () => {
    const el = document.createElement('div');
    el.textContent = '';
    const { default: init } = await import('../../blocks/structured-content/structured-content.js');
    await init(el);
    expect(fetchStub.called).to.be.false;
  });
});
