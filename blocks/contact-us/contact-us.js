/**
 * Contact Us – the brand's consumer affairs form. Authored text is the
 * confirmation shown after submitting; an authored image sits beside the form.
 * The source sites embed a third-party form; this demo renders the same fields
 * natively and does not transmit submissions.
 */
import { isAuthoring } from '../../scripts/utils/authoring.js';

const STATES = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
const COUNTRIES = ['United States', 'Canada', 'Mexico', 'United Kingdom', 'Other'];

const FIELDS = [
  { name: 'first_name', label: 'First Name', required: true, half: true },
  { name: 'last_name', label: 'Last Name', required: true, half: true },
  { name: 'address_1', label: 'Address Line 1', required: true },
  { name: 'address_2', label: 'Address Line 2' },
  { name: 'city', label: 'City', required: true, half: true },
  { name: 'state', label: 'State', required: true, half: true, options: STATES },
  { name: 'postal_code', label: 'Postal Code', required: true, half: true },
  { name: 'country', label: 'Country', required: true, half: true, options: COUNTRIES },
  { name: 'telephone', label: 'Phone Number (only if you want to!)', type: 'tel' },
  { name: 'email', label: 'Email', required: true, type: 'email' },
  { name: 'product', label: 'Which product?', required: true },
  { name: 'lot_code', label: 'Lot Code' },
  { name: 'comment', label: 'Please enter your comments here.', required: true, multiline: true },
];

function buildField(field) {
  const wrap = document.createElement('div');
  wrap.className = `contact-field${field.half ? ' is-half' : ''}`;
  const id = `contact-${field.name}`;
  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = `${field.label}${field.required ? ' *' : ''}`;
  let input;
  if (field.options) {
    input = document.createElement('select');
    input.append(new Option(field.label, ''), ...field.options.map((o) => new Option(o, o)));
  } else if (field.multiline) {
    input = document.createElement('textarea');
    input.rows = 6;
  } else {
    input = document.createElement('input');
    input.type = field.type || 'text';
  }
  input.id = id;
  input.name = field.name;
  input.required = !!field.required;
  if (!field.options) input.placeholder = field.label;
  wrap.append(label, input);
  return wrap;
}

function buildForm(confirmation) {
  const form = document.createElement('form');
  form.className = 'contact-form';
  form.noValidate = false;
  form.append(...FIELDS.map(buildField));
  const actions = document.createElement('div');
  actions.className = 'contact-actions';
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = 'Submit';
  const note = document.createElement('p');
  note.className = 'contact-note';
  note.textContent = 'Demo form – submissions are not sent.';
  actions.append(submit, note);
  form.append(actions);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    confirmation.hidden = false;
    form.replaceWith(confirmation);
    confirmation.focus();
  });
  return form;
}

export default function init(el) {
  const thanks = document.createElement('div');
  thanks.className = 'contact-thanks';
  thanks.setAttribute('role', 'status');
  thanks.tabIndex = -1;
  // Keep the confirmation copy visible (and editable) in the DA canvas
  thanks.hidden = !isAuthoring();
  const media = document.createElement('div');
  media.className = 'contact-media';
  el.querySelectorAll(':scope > div > div').forEach((cell) => {
    [...cell.children].forEach((child) => {
      (child.querySelector('picture') ? media : thanks).append(child);
    });
  });
  const body = document.createElement('div');
  body.className = 'contact-body';
  if (media.children.length) {
    el.classList.add('has-media');
    body.append(media);
  }
  if (!thanks.children.length) thanks.innerHTML = '<p>Thank you for contacting us! Our team will be in touch with you.</p>';
  body.append(buildForm(thanks));
  if (isAuthoring()) body.prepend(thanks);
  el.replaceChildren(body);
}
