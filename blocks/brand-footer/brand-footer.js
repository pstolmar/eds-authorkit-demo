import { getConfig } from '../../scripts/ak.js';
import { loadFragment } from '../fragment/fragment.js';

const FOOTER_PATH = '/fragments/nav/footer';

// Social links are image links that leave the site; the logo links home.
const isIconLink = (a) => {
  if (!a?.querySelector('img')) return false;
  try {
    return new URL(a.href).origin !== window.location.origin;
  } catch {
    return false;
  }
};

function buildBrand(section) {
  const brand = document.createElement('div');
  brand.className = 'footer-brand';
  const logo = section.querySelector('picture')?.closest('a');
  const heading = section.querySelector('h1, h2, h3, h4, h5, h6');
  if (logo && !isIconLink(logo)) {
    logo.className = 'footer-logo';
    logo.removeAttribute('title');
    brand.append(logo);
  } else if (heading) {
    const mark = document.createElement('p');
    mark.className = 'footer-wordmark';
    mark.append(...heading.childNodes);
    brand.append(mark);
  }
  section.querySelectorAll('p').forEach((p) => {
    if (!p.textContent.trim() || p.querySelector('picture')) return;
    p.classList.add('footer-copyright');
    brand.append(p);
  });
  return brand;
}

// Current platform marks ship with the code so a rebrand (e.g. Twitter → X)
// doesn't require re-authoring every brand footer.
const SOCIAL_ICONS = [
  { match: /twitter\.com|x\.com/, icon: 'twitter-white' },
  { match: /instagram\.com/, icon: 'instagram' },
  { match: /facebook\.com/, icon: 'facebook' },
];

function socialIcon(a) {
  const found = SOCIAL_ICONS.find(({ match }) => match.test(a.href));
  if (!found) return;
  const img = document.createElement('img');
  img.src = `/img/brands/${found.icon}.svg`;
  img.alt = '';
  img.width = 32;
  img.height = 32;
  img.loading = 'lazy';
  a.replaceChildren(img);
}

function buildSocial(links) {
  const social = document.createElement('div');
  social.className = 'footer-social';
  links.forEach((a) => {
    a.className = 'footer-social-link';
    a.setAttribute('aria-label', a.title || a.querySelector('img')?.alt || 'Social');
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    socialIcon(a);
    social.append(a);
  });
  return social;
}

function buildLegal(list) {
  const legal = document.createElement('nav');
  legal.className = 'footer-legal';
  legal.setAttribute('aria-label', 'Legal');
  list.querySelectorAll('li').forEach((li) => {
    const p = li.querySelector(':scope > p');
    if (p) p.replaceWith(...p.childNodes);
    const a = li.querySelector('a');
    if (a && /\.pdf($|\?)/i.test(a.getAttribute('href'))) {
      a.target = '_blank';
      a.rel = 'noopener';
      a.classList.add('is-document');
    }
  });
  legal.append(list);
  return legal;
}

/**
 * loads and decorates the brand footer
 * @param {Element} el The footer element
 */
export default async function init(el) {
  const { locale } = getConfig();
  const fragment = await loadFragment(`${locale.prefix}${FOOTER_PATH}`);
  const sections = [...fragment.querySelectorAll(':scope > .section')];

  const inner = document.createElement('div');
  inner.className = 'footer-inner';

  const listSection = sections.find((s) => s.querySelector('ul'));
  const brandSection = sections.find((s) => s !== listSection
    && [...s.querySelectorAll('a')].some((a) => !isIconLink(a)));
  if (brandSection) inner.append(buildBrand(brandSection));

  const socialLinks = sections
    .filter((s) => s !== listSection)
    .flatMap((s) => [...s.querySelectorAll('a')].filter(isIconLink));
  if (socialLinks.length) inner.append(buildSocial(socialLinks));

  if (listSection) inner.append(buildLegal(listSection.querySelector('ul')));

  el.append(inner);
}
