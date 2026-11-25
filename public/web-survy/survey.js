import { sections, scale } from './questions.js';
import { downloadAnswerPdf } from './answer-pdf.js';

const key = 'azstudio:finndinskatt-survey:v1';
const form = document.querySelector('#survey-form');
const content = document.querySelector('#form-content');
const message = document.querySelector('#form-message');
const questionIds = new Set(sections.flatMap(section => section.questions.map(([id]) => id)));
let state = { ratings: {}, notes: {}, references: '', questions: '', submissionId: crypto.randomUUID() };
let sending = false;
let finished = false;
try {
  const saved = JSON.parse(localStorage.getItem(key) || 'null');
  if (saved && typeof saved === 'object') {
    state.ratings = Object.fromEntries(Object.entries(saved.ratings || {}).filter(([id, value]) => questionIds.has(id) && Number.isInteger(value) && value >= 1 && value <= 5));
    state.notes = Object.fromEntries(sections.map(({ id }) => [id, typeof saved.notes?.[id] === 'string' ? saved.notes[id].slice(0, 2000) : '']));
    for (const field of ['references', 'questions']) state[field] = typeof saved[field] === 'string' ? saved[field].slice(0, 3000) : '';
    if (typeof saved.submissionId === 'string' && /^[a-f0-9-]{36}$/i.test(saved.submissionId)) state.submissionId = saved.submissionId;
  }
} catch { /* The form also works without browser storage. */ }
function save() { try { localStorage.setItem(key, JSON.stringify(state)); } catch {} }
function textField(id, label, max = 2000, placeholder = '') {
  return `<label class="text-field" for="${id}"><span>${label}<span class="optional">Valgfritt</span></span><textarea id="${id}" maxlength="${max}" rows="3" placeholder="${placeholder}"></textarea></label>`;
}
let number = 0;
content.innerHTML = sections.map(section => `<section class="question-section" aria-labelledby="heading-${section.id}"><h2 class="section-title" id="heading-${section.id}">${section.title}</h2>${section.questions.map(([id, question]) => `<fieldset class="question" id="question-${id}"><legend><span class="question-number">${++number}.</span><span>${question}</span></legend><div class="choices">${scale.map((label, index) => `<label class="choice"><input type="radio" name="${id}" value="${index + 1}" aria-label="${index + 1}, ${label}" required ${state.ratings[id] === index + 1 ? 'checked' : ''}><span>${label}</span></label>`).join('')}</div></fieldset>`).join('')}${textField(`note-${section.id}`, 'Annet du vil legge til?')}</section>`).join('') + `<section class="closing-section" aria-labelledby="closing-heading"><h2 class="section-title" id="closing-heading">Til slutt</h2>${textField('references', 'Har du 1 til 3 nettsider du liker, som vi kan bruke som referanse?', 3000, 'Lim inn lenker her.')}${textField('questions', 'Er det noe du lurer på eller vil spørre om når det gjelder nettsiden?', 3000)}</section>`;
for (const section of sections) document.querySelector(`#note-${section.id}`).value = state.notes[section.id] || '';
for (const id of ['references', 'questions']) document.querySelector(`#${id}`).value = state[id];
form.addEventListener('change', event => {
  const id = event.target.name;
  if (!questionIds.has(id)) return;
  state.ratings[id] = Number(event.target.value);
  state.submissionId = crypto.randomUUID();
  const field = document.querySelector(`#question-${id}`);
  field.classList.remove('invalid'); field.removeAttribute('aria-describedby'); field.removeAttribute('aria-invalid');
  for (const radio of field.querySelectorAll('input')) { radio.removeAttribute('aria-invalid'); radio.removeAttribute('aria-describedby'); }
  field.querySelector('.question-error')?.remove();
  if (!content.querySelector('.invalid')) message.hidden = true;
  save();
});
form.addEventListener('input', event => {
  const { id, value } = event.target;
  if (id.startsWith('note-')) state.notes[id.slice(5)] = value;
  else if (id === 'references' || id === 'questions') state[id] = value;
  else return;
  state.submissionId = crypto.randomUUID(); save();
});
function showError(text) { message.textContent = text; message.hidden = false; }
function validate() {
  const missing = [...questionIds].filter(id => !state.ratings[id]);
  for (const id of missing) {
    const field = document.querySelector(`#question-${id}`);
    field.classList.add('invalid');field.setAttribute('aria-describedby', `error-${id}`);field.setAttribute('aria-invalid', 'true');
    for (const radio of field.querySelectorAll('input')) { radio.setAttribute('aria-invalid', 'true'); radio.setAttribute('aria-describedby', `error-${id}`); }
    if (!field.querySelector('.question-error')) {
      const error = document.createElement('p'); error.className = 'question-error'; error.id = `error-${id}`;
      error.textContent = 'Mangler svar. Velg ett alternativ.'; field.append(error);
    }
  }
  if (missing.length) {
    showError('Noen påstander mangler svar. Tekstfeltene er valgfrie.');
    const first = document.querySelector(`#question-${missing[0]}`);
    first.querySelector('input').focus({ preventScroll: true });
    first.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  return missing.length === 0;
}
function setSending(value) {
  sending = value; form.setAttribute('aria-busy', String(value));
  for (const element of form.querySelectorAll('button, input, textarea')) element.disabled = value;
  document.querySelector('#submit').textContent = value ? 'Sender …' : 'Send inn svar';
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending || finished || !validate()) return;
  setSending(true); message.hidden = true;
  try {
    const response = await fetch('/api/survey', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...state, website: document.querySelector('#website').value }),
      signal: AbortSignal.timeout(25000)
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error('Submission failed');
    finished = true;
    try { localStorage.removeItem(key); } catch {}
    form.innerHTML = '<div class="success-panel"><h2 id="success-title" tabindex="-1">Takk for svarene dine!</h2><p>Skjemaet er sendt inn. Du kan laste ned en PDF med svarene dine.</p><button type="button" id="download-pdf" class="button secondary">Last ned svarene som PDF</button><p id="download-error" class="form-message" role="alert" hidden></p></div>';
    document.querySelector('#download-pdf').addEventListener('click', async event => {
      const button = event.currentTarget;
      const error = document.querySelector('#download-error');
      button.disabled = true; button.textContent = 'Lager PDF …'; error.hidden = true;
      try { await downloadAnswerPdf(state); }
      catch { error.textContent = 'PDF kunne ikke lastes ned. Prøv igjen før du lukker siden.'; error.hidden = false; }
      finally { button.disabled = false; button.textContent = 'Last ned svarene som PDF'; }
    });
    document.querySelector('#success-title').focus();
  } catch {
    setSending(false);
    showError('Svarene kunne ikke sendes. Prøv igjen, eller kontakt oss på mixzq@outlook.com. Svarene dine er fortsatt tilgjengelige i skjemaet.');

  }
});
