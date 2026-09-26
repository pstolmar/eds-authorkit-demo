/* eslint-disable */
/* global WebImporter */
/**
 * Parser: source `hero` / `hero overlay-right` → Marquee / Marquee (overlay-right)
 * Works on the authored block (row of cells) and on the rendered hero.
 * Output row: [ text (headings + CTA) | pictures (desktop, mobile) ]
 */
export default function parse(element, { document }) {
  const variants = [...element.classList]
    .filter((c) => !['hero', 'block'].includes(c) && !c.startsWith('hero-'));
  const name = variants.length ? `Marquee (${variants.join(', ')})` : 'Marquee';

  const pictures = [...element.querySelectorAll('picture')];
  // Headings, or paragraphs that were headings (bold kept, see onLoad)
  const headings = [...element.querySelectorAll('h1, h2, h3, p[data-heading]')];
  const links = [...element.querySelectorAll('a[href]')].filter((a) => !a.querySelector('picture, img'));

  // Headline lines become paragraphs so **accent** words survive conversion
  // (inline formatting inside headings is dropped); the block renders them
  // as a single heading again.
  const text = headings.map((heading) => {
    const p = document.createElement('p');
    p.innerHTML = heading.innerHTML;
    return p;
  });
  links.forEach((link) => {
    const p = document.createElement('p');
    const strong = document.createElement('strong');
    const a = document.createElement('a');
    a.href = link.getAttribute('href');
    a.textContent = link.textContent.trim();
    strong.append(a);
    p.append(strong);
    text.push(p);
  });

  const cells = [[text, pictures]];
  element.replaceWith(WebImporter.DOMUtils.createTable([[name], ...cells], document));
}
