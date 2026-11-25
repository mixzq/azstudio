import { sections, scale } from './questions.js';

let library;
function loadLibrary() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (!library) library = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/web-survy/vendor/jspdf-4.2.1.umd.min.js';
    script.onload = () => window.jspdf?.jsPDF ? resolve(window.jspdf.jsPDF) : reject(new Error('PDF library unavailable'));
    script.onerror = () => { script.remove(); library = undefined; reject(new Error('PDF library unavailable')); };
    document.head.append(script);
  });
  return library;
}

// Standard PDF fonts cover Norwegian. Other scripts use the browser's font
// fallback and are embedded as high resolution line images without losing text.
const standardText = /^[\u0009\u000a\u000d\u0020-\u007e\u00a0-\u00ff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013\u2014\u2018-\u201e\u2020-\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]*$/u;

export async function createAnswerPdf(answers) {
  const jsPDF = await loadLibrary();
  await document.fonts.ready;
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true, putOnlyUsedFonts: true });
  const title = 'Spørreskjema – nettside for Finndinskatt';
  pdf.setProperties({ title, subject: 'Dine svar', creator: 'AZ Studio' });
  const margin = 48;
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  const textWidth = width - margin * 2;
  const bottom = height - 52;
  let y = margin;
  function room(space) { if (y + space > bottom) { pdf.addPage(); y = margin; } }
  function font(size, bold = false) { pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size); }
  function paragraph(value, { size = 10.5, bold = false, gap = 8, indent = 0, color = 35 } = {}) {
    const text = String(value || 'Ikke oppgitt').replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
    const leading = size * 1.5;
    font(size, bold); pdf.setTextColor(color);
    if (standardText.test(text)) {
      const lines = pdf.splitTextToSize(text, textWidth - indent);
      for (const line of lines) { room(leading); pdf.text(line, margin + indent, y + size); y += leading; }
    } else {
      // This also preserves Chinese notes, emoji and other Unicode input.
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const ratio = 3;
      const cssFont = `${bold ? 600 : 400} ${size}px Manrope, system-ui, sans-serif`;
      context.font = cssFont;
      const lines = [];
      const segments = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'word' }) : null;
      const limit = textWidth - indent;
      for (const block of text.split('\n')) {
        let line = '';
        const tokens = segments ? [...segments.segment(block)].map(item => item.segment) : [...block];
        for (const token of tokens) {
          if (line && context.measureText(line + token).width > limit) { lines.push(line.trimEnd()); line = ''; }
          if (context.measureText(token).width > limit) {
            for (const glyph of token) {
              if (line && context.measureText(line + glyph).width > limit) { lines.push(line); line = ''; }
              line += glyph;
            }
          } else line += line ? token : token.trimStart();
        }
        lines.push(line);
      }
      canvas.width = Math.ceil((textWidth - indent) * ratio);
      canvas.height = Math.ceil(leading * ratio);
      for (const line of lines) {
        room(leading);
        if (line) {
          context.setTransform(ratio, 0, 0, ratio, 0, 0);
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.font = cssFont; context.textBaseline = 'alphabetic';
          context.fillStyle = `rgb(${color}, ${color}, ${color})`;
          context.fillText(line, 0, size * 1.15);
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin + indent, y, textWidth - indent, leading);
        }
        y += leading;
      }
    }
    y += gap;
  }
  function heading(value) {
    room(75); y += 7;
    paragraph(value, { size: 12, bold: true, gap: 9 });
    pdf.setDrawColor(210); pdf.setLineWidth(0.5);
    pdf.line(margin, y, width - margin, y); y += 15;
  }
  paragraph(title, { size: 19, bold: true, gap: 9 });
  paragraph('Dine svar', { size: 12, gap: 3 });
  paragraph(`Lagret ${new Date().toLocaleDateString('nb-NO')}`, { size: 9, color: 100, gap: 12 });
  let number = 0;
  for (const section of sections) {
    heading(section.title);
    for (const [id, question] of section.questions) {
      font(10.5, true);
      const lines = pdf.splitTextToSize(`${++number}. ${question}`, textWidth);
      const noteSpace = id === section.questions.at(-1)[0] && (answers.notes?.[section.id]?.length || 0) < 240 ? 45 : 0;
      room(lines.length * 15.75 + 34 + noteSpace);
      paragraph(`${number}. ${question}`, { bold: true, gap: 3 });
      const rating = answers.ratings[id];
      paragraph(rating ? `Svar: ${rating} av 5 · ${scale[rating - 1]}` : 'Ikke besvart', { color: 80, gap: 13, indent: 14 });
    }
    room(42); paragraph('Annet du vil legge til?', { bold: true, gap: 3 });
    paragraph(answers.notes?.[section.id], { color: 80, gap: 12 });
  }
  heading('Til slutt');
  paragraph('Har du 1 til 3 nettsider du liker, som vi kan bruke som referanse?', { bold: true, gap: 3 });
  paragraph(answers.references, { color: 80, gap: 15 });
  room(50);
  paragraph('Er det noe du lurer på eller vil spørre om når det gjelder nettsiden?', { bold: true, gap: 3 });
  paragraph(answers.questions, { color: 80, gap: 12 });
  const count = pdf.getNumberOfPages();
  for (let page = 1; page <= count; page++) {
    pdf.setPage(page); font(8); pdf.setTextColor(110);
    pdf.text('Finndinskatt', margin, height - 27);
    pdf.text(`Side ${page} av ${count}`, width - margin, height - 27, { align: 'right' });
  }
  return pdf.output('blob');
}

export async function downloadAnswerPdf(answers) {
  const blob = await createAnswerPdf(answers);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'Finndinskatt-svar.pdf';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
