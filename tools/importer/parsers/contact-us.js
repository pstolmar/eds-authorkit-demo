/* eslint-disable */
/* global WebImporter */
/**
 * Parser: source `contact-us` → Contact Us.
 * The source injects a third-party consumer affairs form client-side, so the
 * form itself is rebuilt by the block; the cell carries the form's
 * confirmation copy (plus any authored image).
 */
const CONFIRMATION = [
  'Thank you for contacting us! Our team will be in touch with you within 72 hours. Please check your spam or junk folder if you do not see it in your inbox.',
  'We appreciate your patience.',
];

export default function parse(element, { document }) {
  const pictures = [...element.querySelectorAll('picture')];
  const copy = CONFIRMATION.map((text) => {
    const p = document.createElement('p');
    p.textContent = text;
    return p;
  });
  element.replaceWith(WebImporter.DOMUtils.createTable([['Contact Us'], [[...pictures, ...copy]]], document));
}
