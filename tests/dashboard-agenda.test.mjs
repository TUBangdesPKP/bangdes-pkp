import test from 'node:test';
import assert from 'node:assert/strict';
import { agendaToday, agendaDateLabel, agendaFileUrl } from '../src/dashboard-agenda-model.js';
test('dashboard date defaults to Jakarta and full Indonesian day/date',()=>{
  assert.equal(agendaToday(new Date('2026-10-01T17:30:00Z')),'2026-10-02');
  assert.equal(agendaDateLabel('2026-10-02'),'Jumat, 2 Oktober 2026');
});
test('file links allow only absolute web URLs without credentials',()=>{
  assert.equal(agendaFileUrl('https://drive.google.com/file/d/example/view'),'https://drive.google.com/file/d/example/view');
  ['javascript:alert(1)','data:text/html,hello','//example.test','https://user:pass@example.test','not a URL'].forEach(url=>assert.equal(agendaFileUrl(url),''));
});
