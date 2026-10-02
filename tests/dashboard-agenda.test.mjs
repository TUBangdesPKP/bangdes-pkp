import test from 'node:test';
import assert from 'node:assert/strict';
import { agendaToday, agendaDateLabel, agendaFileUrl, agendaLocationParts } from '../src/dashboard-agenda-model.js';
test('dashboard date defaults to Jakarta and full Indonesian day/date',()=>{
  assert.equal(agendaToday(new Date('2026-10-01T17:30:00Z')),'2026-10-02');
  assert.equal(agendaDateLabel('2026-10-02'),'Jumat, 2 Oktober 2026');
});

test('location links preserve full meeting URLs, query strings and surrounding multiline text', () => {
  const text = 'Ruang Rapat, Jl. Gatot Subroto No. 9\nZoom: https://pkp.go.id/s/RapatProgresRusunMYC2026-2027\nhttps://example.test/j/867?pwd=abc%2Bdef&lang=id\nMeeting ID: 867 8502 5944\nPasscode: lapsukp';
  const parts = agendaLocationParts(text);
  assert.equal(parts.map(part => part.text).join(''), text);
  assert.deepEqual(parts.filter(part => part.href).map(part => part.href), [
    'https://pkp.go.id/s/RapatProgresRusunMYC2026-2027',
    'https://example.test/j/867?pwd=abc%2Bdef&lang=id',
  ]);
});

test('location links support www, punctuation and balanced path parentheses', () => {
  const text = 'Lihat (https://example.test/rapat), www.example.test. https://example.test/a_(b).';
  const parts = agendaLocationParts(text);
  assert.equal(parts.map(part => part.text).join(''), text);
  assert.deepEqual(parts.filter(part => part.href).map(part => part.text), [
    'https://example.test/rapat', 'www.example.test', 'https://example.test/a_(b)',
  ]);
  assert.equal(parts.find(part => part.text === 'www.example.test').href, 'https://www.example.test/');
});

test('addresses, credentials, unsafe protocols and HTML stay plain text', () => {
  const text = 'Jl. Soepomo No.197\nID: 123 456 789\nPasscode: bangdes\njavascript:alert(1) data:text/html,test https://user:pass@example.test xhttps://example.test https://example.test\\path <img src=x onerror=alert(1)>';
  const parts = agendaLocationParts(text);
  assert.equal(parts.some(part => part.href), false);
  assert.equal(parts.map(part => part.text).join(''), text);
  assert.deepEqual(agendaLocationParts(null), []);
});
test('file links allow only absolute web URLs without credentials',()=>{
  assert.equal(agendaFileUrl('https://drive.google.com/file/d/example/view'),'https://drive.google.com/file/d/example/view');
  ['javascript:alert(1)','data:text/html,hello','//example.test','https://user:pass@example.test','not a URL'].forEach(url=>assert.equal(agendaFileUrl(url),''));
});
