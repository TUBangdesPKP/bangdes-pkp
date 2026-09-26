import test from 'node:test';
import assert from 'node:assert/strict';
import { monthlyView, compareAttendance, isRecapAdmin, clock, monthLabel } from '../src/monthly-recap-model.js';

const person = (nip, fields = {}) => ({ nip, nama:nip, unit:'Unit A', completeMonth:true, masuk:20, hariKerja:20, flexi:2, flexiMinutes:60, assessed:20, onTime:18, ...fields });
test('ranking prioritizes attendance ratio, then fewer flexi days and minutes, then attendance volume', () => {
  const rows = [person('a'),person('b',{masuk:19,flexi:0}),person('c',{flexi:1}),person('d',{flexi:1,flexiMinutes:30}),person('e',{masuk:10,hariKerja:10,flexi:1,flexiMinutes:30})];
  assert.deepEqual(rows.sort(compareAttendance).map(row=>row.nip),['d','e','c','a','b']);
  const view=monthlyView({employees:[...rows,person('incomplete',{masuk:1,hariKerja:1,flexi:0,completeMonth:false})]});
  assert.equal(view.rows.length,6);assert.equal(view.discipline.some(row=>row.nip==='incomplete'),false);
});
test('SubUnit filter applies to counts, earliest arrival, rankings and trips including public aggregates', () => {
  const employees=[person('a'),person('b',{unit:'Unit B'})];
  const daily=[{nip:'a',unit:'Unit A',tanggal:'2026-08-03',status:'WFO',libur:false,hadir:true,arrival:450,count:2},{nip:'b',unit:'Unit B',tanggal:'2026-08-03',status:'WFO',libur:false,hadir:true,arrival:400,count:3}];
  const documents=[{nip:'a',unit:'Unit A',type:'spt',tujuan:'Kota Uji',count:2},{nip:'b',unit:'Unit B',type:'spt',tujuan:'Kota Lain',count:1}];
  for(const publicView of [false,true]){
    const view=monthlyView({employees,daily,documents,units:['Unit A','Unit B','Unit Kosong']},'Unit A',publicView);
    assert.equal(view.earliest,450);assert.equal(view.rows.length,1);assert.equal(view.discipline.length,1);
    assert.equal(view.dailyWfo[0].count,2);assert.deepEqual(view.destinations,[['Kota Uji',2]]);
    assert.equal(view.groups[0].trips,2);
    assert.equal(monthlyView({employees,daily,documents,units:['Unit Kosong']},'Unit Kosong',publicView).rows.length,0);
  }
});
test('missing arrival cannot be treated as midnight or replaced by departure', () => {
  const view=monthlyView({employees:[person('a')],daily:[{nip:'a',hadir:true,arrival:null,pulang:1000}]});
  assert.equal(view.earliest,null);assert.equal(clock(view.earliest),'—');
});
test('period controls recognize only admin and superadmin role variants', () => {
  for(const role of ['admin','Super Admin','super_admin','super-admin','Super Administrator'])assert.equal(isRecapAdmin(role),true);
  for(const role of ['',null,'pegawai','notadmin'])assert.equal(isRecapAdmin(role),false);
  assert.equal(monthLabel('2026-08'),'Agustus 2026');
});
