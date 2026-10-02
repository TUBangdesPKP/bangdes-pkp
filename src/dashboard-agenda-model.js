export const AGENDA_TIME_ZONE = 'Asia/Jakarta';

export function agendaToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: AGENDA_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = name => parts.find(item => item.type === name).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function agendaDateLabel(date) {
  return new Intl.DateTimeFormat('id-ID', { timeZone: AGENDA_TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00+07:00`));
}

export function agendaFileUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

// Keep the original text/newlines; turn only explicit web addresses into links.
// React renders the text directly, never as HTML from Calendar.
export function agendaLocationParts(value) {
  const text = String(value || '');
  const parts = [];
  let cursor = 0;
  for (const match of text.matchAll(/(?:https?:\/\/|www\.)[^\s<>"']+/gi)) {
    if (match.index > 0 && /[\p{L}\p{N}_@]/u.test(text[match.index - 1])) continue;
    let label = match[0].replace(/[.,;]+$/, '');
    // Sentence-closing parentheses are not part of a URL, balanced path parentheses are.
    const pairs = { ')': '(', ']': '[', '}': '{' };
    while (pairs[label.at(-1)]) {
      const close = label.at(-1), open = pairs[close];
      if (label.split(close).length <= label.split(open).length) break;
      label = label.slice(0, -1).replace(/[.,;]+$/, '');
    }
    if (Array.from(label).some(char => char === '\\' || char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) continue;
    const href = agendaFileUrl(/^www\./i.test(label) ? `https://${label}` : label);
    if (!href) continue;
    if (match.index > cursor) parts.push({ text: text.slice(cursor, match.index) });
    parts.push({ text: label, href });
    cursor = match.index + label.length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts;
}
