/**
 * Marquee – full-bleed brand hero shared by all brand sites.
 * Default: stacked headline over an image (bold words take the accent color).
 * overlay-right: body copy + CTA in a card over the image.
 *
 * Authoring: one row, any cell order.
 *  - Headline lines as paragraphs (or a heading); **bold** = accent.
 *  - CTA links (bold link = button).
 *  - First picture = desktop, second = mobile.
 * Lines render as one heading: h1 unless the page already has one.
 */
function eager(pic) {
  const img = pic?.querySelector('img');
  if (!img) return;
  img.loading = 'eager';
  img.fetchPriority = 'high';
}

function buildHeadline(el, lines) {
  const hasH1 = [...document.querySelectorAll('main h1')].some((h) => !el.contains(h));
  const heading = document.createElement(hasH1 ? 'h2' : 'h1');
  heading.className = 'marquee-headline';
  lines.forEach((line) => {
    const span = document.createElement('span');
    span.className = 'marquee-line';
    span.append(...line.childNodes);
    heading.append(span);
  });
  return heading;
}

export default function init(el) {
  const pictures = [...el.querySelectorAll('picture')];
  const links = [...el.querySelectorAll('a')].filter((a) => !a.querySelector('picture'));
  const headings = [...el.querySelectorAll('h1, h2, h3')];
  const lines = headings.length ? headings : [...el.querySelectorAll('p')]
    .filter((p) => !p.querySelector('a, picture') && p.textContent.trim());
  const headline = buildHeadline(el, lines);
  el.textContent = '';

  const media = document.createElement('div');
  media.className = 'marquee-media';
  const [desktop, mobile] = pictures;
  if (desktop) {
    desktop.classList.add('marquee-picture-desktop');
    media.append(desktop);
  }
  if (mobile) {
    el.classList.add('has-mobile-image');
    mobile.classList.add('marquee-picture-mobile');
    media.append(mobile);
  }
  eager(window.matchMedia('(width < 681px)').matches && mobile ? mobile : desktop);

  const content = document.createElement('div');
  content.className = 'marquee-content';
  const copy = document.createElement('div');
  copy.className = 'marquee-copy';
  copy.append(headline);
  content.append(copy);

  if (links.length) {
    const ctas = document.createElement('p');
    ctas.className = 'marquee-ctas';
    links.forEach((a) => {
      a.className = 'marquee-cta';
      if (a.hostname !== window.location.hostname) {
        a.target = '_blank';
        a.rel = 'noopener';
      }
      ctas.append(a);
    });
    content.append(ctas);
  }

  el.append(media, content);
}
