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
