import test from 'node:test';
import assert from 'node:assert/strict';
import {submissionPeriodCard, submissionIsReadOnly, submissionEntryStep, readOnlySubmissionStep, selectedSubmissionEmployee, submissionViewerIsReadOnly, validateEmployeeRecaps} from '../src/submission-period-model.js';

test('employees enter saved recap for every month; closed periods remain readable without upload',()=>{
  for (const modul of ['uang-makan','tukin']) {
    const closed=submissionPeriodCard(modul,2027,1,'DITUTUP');
    const open=submissionPeriodCard(modul,2027,1,'DIBUKA');
    assert.equal(submissionIsReadOnly(closed),true);
    assert.equal(submissionIsReadOnly(open),false);
    assert.equal(submissionEntryStep(closed,false),5);
    assert.equal(submissionEntryStep(closed,true),2);
    assert.equal(submissionEntryStep(open,false),5);
    assert.equal(submissionEntryStep(open,true),2);
  }
  assert.deepEqual([1,2,3,4,5].filter(readOnlySubmissionStep),[1,2,3,4,5]);
  assert.equal(readOnlySubmissionStep(6),false);
});

test('employees are always read-only; admin editing is retained only for open periods outside employee review', () => {
  const open = submissionPeriodCard('tukin',2026,11,'DIBUKA');
  assert.equal(submissionViewerIsReadOnly(open,false),true);
  assert.equal(submissionViewerIsReadOnly(open,true),false);
  assert.equal(submissionViewerIsReadOnly(open,true,{nip:'TEST'}),true);
  assert.equal(submissionViewerIsReadOnly({...open,status:'DITUTUP'},true),true);
});

test('card data validates identity, module, year, twelve unique months and strict saved numeric amounts', () => {
  const scope = {modul:'tukin',year:2026,nip:'TEST'};
  const data = {employeeRecapVersion:1,...scope,months:Array.from({length:12},(_,i)=>({month:i+1,state:'missing',netto:null}))};
  data.months[0]={month:1,state:'saved',netto:0};
  assert.equal(validateEmployeeRecaps(data,scope)[0].netto,0);
  for (const extra of [{nip:'OTHER'},{year:2027},{modul:'uang-makan'},{employeeRecapVersion:undefined},{months:[]}]) assert.throws(()=>validateEmployeeRecaps({...data,...extra},scope));
  for(const amount of [null,'123',NaN,-1,Infinity]) assert.throws(()=>validateEmployeeRecaps({...data,months:data.months.map((m,i)=>i?m:{...m,netto:amount})},scope));
});

test('admin employee selection is scoped to the module and period and never applies to ordinary employees', () => {
  for (const modul of ['uang-makan','tukin']) {
    const period=submissionPeriodCard(modul,2026,8), employee={nip:'TEST',nama:'Pegawai Uji'};
    const selection={modul,periode:period.periodeEvent,employee};
    assert.equal(selectedSubmissionEmployee(selection,modul,period,true),employee);
    assert.equal(selectedSubmissionEmployee(selection,modul,period,false),null);
    assert.equal(selectedSubmissionEmployee(selection,modul,submissionPeriodCard(modul,2026,9),true),null);
    assert.equal(selectedSubmissionEmployee(selection,modul==='tukin'?'uang-makan':'tukin',period,true),null);
    assert.equal(selectedSubmissionEmployee(null,modul,period,true),null);
  }
});

test('meal periods support future years, leap days and stable legacy identifiers',()=>{
  const leap=submissionPeriodCard('uang-makan',2028,2);
  assert.equal(leap.periodeEvent,'01-02-2028 s/d 29-02-2028');assert.equal(leap.expectedDays,29);
  assert.equal(submissionPeriodCard('uang-makan',2027,2).endDate,'28-02-2027');
  assert.equal(submissionPeriodCard('uang-makan',2026,8).id,'um-2026-08');
  assert.equal(submissionPeriodCard('uang-makan',2035,12).periodeFolder,'Periode_2035-12');
});
test('tukin payment periods correctly cross calendar years',()=>{
  const jan=submissionPeriodCard('tukin',2027,1,'DIBUKA');
  assert.equal(jan.periodeEvent,'11-11-2026 s/d 10-12-2026');assert.equal(jan.status,'DIBUKA');
  assert.equal(submissionPeriodCard('tukin',2027,2).periodeEvent,'11-12-2026 s/d 10-01-2027');
  assert.equal(submissionPeriodCard('tukin',2027,3).periodeEvent,'11-01-2027 s/d 10-02-2027');
  assert.equal(submissionPeriodCard('tukin',2026,10).periodeEvent,'11-08-2026 s/d 10-09-2026');
});
test('invalid period selectors are rejected',()=>{
  for(const args of [['uang-makan',2027,13],['tukin',NaN,1],['spt',2027,1],['tukin',2027.5,1]])assert.throws(()=>submissionPeriodCard(...args));
});
