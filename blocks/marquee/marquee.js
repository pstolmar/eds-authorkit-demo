/**
 * Marquee – full-bleed brand hero shared by all brand sites.
 * Default: stacked headline over an image (bold words take the accent color).
 * overlay-right: body copy + CTA in a card over the image.
 *
 * Authoring: one row, any cell order.
 *  - Headline lines as paragraphs (or a heading); **bold** = accent.
 *  - CTA links (bold link = button).
 *  - First picture = desktop, second = mobile.
 * Lines render as one heading: h1 unless the page already has one. In the DA
 * canvas the authored paragraphs are kept (styled the same) so they stay editable.
 */
import { isAuthoring, pictureHolder } from '../../scripts/utils/authoring.js';

function eager(pic) {
  const img = pic?.querySelector('img');
  if (!img) return;
  img.loading = 'eager';
  img.fetchPriority = 'high';
}

function buildHeadline(el, lines) {
  const authoring = isAuthoring();
  const hasH1 = [...document.querySelectorAll('main h1')].some((h) => !el.contains(h));
  const level = hasH1 ? 2 : 1;
  const heading = document.createElement(authoring ? 'div' : `h${level}`);
  heading.className = 'marquee-headline';
  if (authoring) {
    heading.setAttribute('role', 'heading');
    heading.setAttribute('aria-level', level);
  }
  lines.forEach((line) => {
    if (authoring) {
      line.classList.add('marquee-line');
      heading.append(line);
      return;
    }
    const span = document.createElement('span');
    span.className = 'marquee-line';
    span.append(...line.childNodes);
    heading.append(span);
  });
  return heading;
}

export default function init(el) {
  const pictures = [...el.querySelectorAll('picture')];
  const headings = [...el.querySelectorAll('h1, h2, h3')];
  const paragraphs = [...el.querySelectorAll('p')];
  const ctaParas = paragraphs.filter((p) => p.querySelector('a') && !p.querySelector('picture'));
  const lines = paragraphs.filter((p) => !p.querySelector('a, picture') && p.textContent.trim());

  const copy = document.createElement('div');
  copy.className = 'marquee-copy';
  if (headings.length) {
    headings.forEach((h) => h.classList.add('marquee-headline'));
    copy.append(...headings);
  } else {
    copy.append(buildHeadline(el, lines));
  }

  const media = document.createElement('div');
  media.className = 'marquee-media';
  const [desktop, mobile] = pictures;
  if (desktop) {
    desktop.classList.add('marquee-picture-desktop');
    media.append(pictureHolder(desktop));
  }
  if (mobile) {
    el.classList.add('has-mobile-image');
    mobile.classList.add('marquee-picture-mobile');
    media.append(pictureHolder(mobile));
  }
  eager(window.matchMedia('(width < 681px)').matches && mobile ? mobile : desktop);

  const content = document.createElement('div');
  content.className = 'marquee-content';
  content.append(copy);

  if (ctaParas.length) {
    const ctas = document.createElement('div');
    ctas.className = 'marquee-ctas';
    ctaParas.forEach((p) => {
      p.querySelectorAll('a').forEach((a) => {
        a.className = 'marquee-cta';
        if (a.hostname !== window.location.hostname) {
          a.target = '_blank';
          a.rel = 'noopener';
        }
      });
      ctas.append(p);
    });
    content.append(ctas);
  }

  el.replaceChildren(media, content);
}
