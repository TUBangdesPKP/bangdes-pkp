import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardModules, canManageSubmission } from '../src/dashboard-navigation.js';

test('admins have seven modules, with a combined calculator immediately below monthly recap',()=>{
  for(const role of ['Admin','Super Administrator']) {
    const modules=dashboardModules(role);
    assert.equal(modules.length,7);
    assert.deepEqual(modules.map(item=>item.view),['profil-saya','rekap','penghitungan','absensi-uang-makan','absensi-tunjangan-kinerja','arsip-surat-tugas','arsip-surat-cuti']);
    assert.equal(canManageSubmission('penghitungan',role),true);
    for(const view of ['absensi-uang-makan','absensi-tunjangan-kinerja'])assert.equal(canManageSubmission(view,role),false);
  }
});
test('employees see personal recap names, with no route authority for calculations',()=>{
  const modules=dashboardModules('pegawai');
  assert.equal(modules.length,5);assert.equal(canManageSubmission('penghitungan','pegawai'),false);
  assert.ok(modules.some(item=>item.label==='Rekap Uang Makan'));
  assert.ok(modules.some(item=>item.label==='Rekap Tunjangan Kinerja'));
  assert.ok(modules.every(item=>!item.label.includes('Absensi')&&!item.label.includes('Penghitungan')));
});
