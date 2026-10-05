const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL ?? 'mixzq@outlook.com';
const CONTACT_FROM_EMAIL = process.env.CONTACT_FROM_EMAIL ?? 'AZ Studio Website <onboarding@resend.dev>';

function text(value, maximumLength) {
  return typeof value === 'string'
    ? value.trim().slice(0, maximumLength)
    : '';
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function safeSubjectName(value) {
  return value.replace(/[\r\n]+/g, ' ').slice(0, 80);
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('Contact form is missing RESEND_API_KEY');
    response.status(503).json({ error: 'Email service is not configured' });
    return;
  }

  const body = request.body ?? {};
  const name = text(body.name, 100);
  const email = text(body.email, 254).toLowerCase();
  const project = text(body.project, 160);
  const message = text(body.message, 5000);
  const source = text(body.source, 120);
  const website = text(body.website, 200);

  if (website) {
    response.status(200).json({ ok: true });
    return;
  }

  if (!name || !validEmail(email) || !message) {
    response.status(400).json({ error: 'Please complete the required fields' });
    return;
  }

  const emailBody = [
    'New project enquiry from azstudio.no',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Project: ${project || 'Not specified'}`,
    `Source: ${source || 'Contact form'}`,
    '',
    'Message:',
    message
  ].join('\n');

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: CONTACT_FROM_EMAIL,
        to: [CONTACT_TO_EMAIL],
        reply_to: email,
        subject: `New project enquiry from ${safeSubjectName(name)}`,
        text: emailBody
      })
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();
      console.error('Resend rejected contact email', resendResponse.status, resendError);
      response.status(502).json({ error: 'Email could not be sent' });
      return;
    }

    const result = await resendResponse.json();
    response.status(200).json({ ok: true, id: result.id });
  } catch (error) {
    console.error('Contact email failed', error);
    response.status(502).json({ error: 'Email could not be sent' });
  }
}
