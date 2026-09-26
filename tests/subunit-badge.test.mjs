import test from 'node:test';
import assert from 'node:assert/strict';
import { subunitBadge, leaderComposition } from '../src/subunit-badge.js';

test('home badges abbreviate the directorate units with distinct stable colours', () => {
  const units = ['Subdirektorat Perencanaan Teknis', 'Subbagian Tata Usaha', 'Subdirektorat Wilayah I', 'Subdirektorat Wilayah II', 'Subdirektorat Wilayah III'];
  const badges = units.map(subunitBadge);
  assert.deepEqual(badges.map(item => item.label), ['Rentek', 'Tata Usaha', 'Wilayah I', 'Wilayah II', 'Wilayah III']);
  assert.equal(new Set(badges.map(item => item.background)).size, units.length);
  assert.deepEqual(subunitBadge('  subdirektorat   wilayah II '), badges[3]);
  assert.deepEqual(subunitBadge('Tata Usaha'), badges[1]);
  assert.equal(subunitBadge('Direktorat Pembangunan Perumahan Perdesaan').label, 'Direktorat');
  assert.equal(subunitBadge(null).label, 'SubUnit belum diisi');
});
test('composition is based on actual winners, uses matching badge colours and handles empty lists', () => {
  const rows = ['Subbagian Tata Usaha', 'Tata Usaha', 'Subdirektorat Wilayah I', 'Subdirektorat Wilayah II', 'Subdirektorat Wilayah II'].map(unit => ({ unit }));
  const groups = leaderComposition(rows);
  assert.deepEqual(groups.map(group => [group.label, group.count, group.percentage]), [['Wilayah I',1,20],['Wilayah II',2,40],['Tata Usaha',2,40]]);
  assert.equal(groups.reduce((sum, group) => sum + group.percentage, 0), 100);
  groups.forEach(group => assert.equal(group.background, subunitBadge(group.label).background));
  assert.deepEqual(leaderComposition([]), []);
  assert.equal(leaderComposition(rows.slice(0,1))[0].percentage, 100);
});
