import test from 'node:test';
import assert from 'node:assert/strict';
import { subunitBadge } from '../src/subunit-badge.js';

test('home badges abbreviate the directorate units with distinct stable colours', () => {
  const units = ['Subdirektorat Perencanaan Teknis', 'Subbagian Tata Usaha', 'Subdirektorat Wilayah I', 'Subdirektorat Wilayah II', 'Subdirektorat Wilayah III'];
  const badges = units.map(subunitBadge);
  assert.deepEqual(badges.map(item => item.label), ['Rentek', 'Tata Usaha', 'Wilayah I', 'Wilayah II', 'Wilayah III']);
  assert.equal(new Set(badges.map(item => item.background)).size, units.length);
  assert.deepEqual(subunitBadge('  subdirektorat   wilayah II '), badges[3]);
  assert.deepEqual(subunitBadge('Tata Usaha'), badges[1]);
  assert.equal(subunitBadge('Direktorat Pembangunan Perumahan Perdesaan').label, 'Direktorat Pembangunan Perumahan Perdesaan');
  assert.equal(subunitBadge(null).label, 'SubUnit belum diisi');
});
