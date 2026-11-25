import { sections, scale } from '../public/web-survy/questions.js';

const questionIds = sections.flatMap(section => section.questions.map(([id]) => id));
const sectionIds = sections.map(section => section.id);
const validText = (value, limit) => value === undefined || (typeof value === 'string' && value.length <= limit);
const clean = value => typeof value === 'string' ? value.trim() : '';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed' });
  }
  let body = request.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); }
    catch { return response.status(400).json({ error: 'Invalid JSON' }); }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return response.status(400).json({ error: 'Invalid submission' });
  if (body.website) return response.status(200).json({ ok: true });
  const { ratings, notes = {}, references = '', questions = '', email = '', submissionId } = body;
  if (!ratings || typeof ratings !== 'object' || Array.isArray(ratings)
    || Object.keys(ratings).length !== questionIds.length
    || questionIds.some(id => !Number.isInteger(ratings[id]) || ratings[id] < 1 || ratings[id] > 5)
    || !notes || typeof notes !== 'object' || Array.isArray(notes)
    || Object.keys(notes).some(id => !sectionIds.includes(id))
    || sectionIds.some(id => !validText(notes[id], 2000))
    || !validText(references, 3000) || !validText(questions, 3000)
    || !validText(email, 254)
    || (clean(email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(email)))
    || typeof submissionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId)) {
    return response.status(400).json({ error: 'Invalid or incomplete answers' });
  }
  if (!process.env.RESEND_API_KEY) return response.status(503).json({ error: 'Email service is not configured' });
  const record = {
    questionnaire: 'Finndinskatt', version: 1, submissionId,
    ratings: Object.fromEntries(questionIds.map(id => [id, ratings[id]])),
    notes: Object.fromEntries(sectionIds.map(id => [id, clean(notes[id])])),
    references: clean(references), questions: clean(questions), email: clean(email).toLowerCase()
  };
  const text = [
    'Finndinskatt · Spørreskjema om ny nettside',
    `Referanse: ${submissionId}`, `Ønsker en kopi: ${record.email ? 'Ja' : 'Nei'}`, `Epost for kopi: ${record.email || 'Ikke oppgitt'}`, '',
    ...sections.flatMap(section => [
      section.title, ...section.questions.map(([id, question]) => `${id}. ${question}\nSvar: ${ratings[id]} av 5 (${scale[ratings[id] - 1]})`),
      `Andre tanker: ${record.notes[section.id] || 'Ikke oppgitt'}`, ''
    ]),
    `Referansenettsider:\n${record.references || 'Ikke oppgitt'}`, '',
    `Spørsmål:\n${record.questions || 'Ikke oppgitt'}`
  ].join('\n');
  try {
    const email = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `finndinskatt-${submissionId}` },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL ?? 'AZ Studio Website <onboarding@resend.dev>',
        to: [process.env.SURVEY_TO_EMAIL ?? process.env.CONTACT_TO_EMAIL ?? 'mixzq@outlook.com'],
        ...(record.email ? { reply_to: record.email } : {}),
        subject: 'Finndinskatt: nye svar om nettsiden', text,
        attachments: [{ filename: 'finndinskatt-svar.json', content: Buffer.from(JSON.stringify(record, null, 2)).toString('base64') }]
      }),
      signal: AbortSignal.timeout(15000)
    });
    if (!email.ok) {
      console.error('Survey email delivery failed', email.status);
      return response.status(502).json({ error: 'Could not deliver answers' });
    }
    const delivered = await email.json();
    return response.status(200).json({ ok: true, id: delivered.id });
  } catch {
    console.error('Survey email delivery unavailable');
    return response.status(502).json({ error: 'Could not deliver answers' });
  }
}
