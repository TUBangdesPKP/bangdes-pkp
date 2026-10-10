import test from 'node:test';
import assert from 'node:assert/strict';
import { addExtraFiles, EXTRA_TYPES } from '../src/extra-document-model.js';

test('extra file selection accepts multiple files, requires explicit categories and deduplicates picker/drop selections',()=>{
  const files=[{name:'A.pdf',size:100,lastModified:1},{name:'B.PNG',size:100,lastModified:2}];
  let id=0; const rows=addExtraFiles([],files,0,()=>String(++id));
  assert.equal(rows.length,2);assert.ok(rows.every(row=>row.type===''&&!row.attempted));
  assert.deepEqual(Object.values(EXTRA_TYPES),['Surat Lupa Absen','Surat Tugas Belajar','Dokumen Lainnya']);
  assert.deepEqual(addExtraFiles(rows,files),rows);
  assert.equal(addExtraFiles([],files,8).length,2);
  assert.throws(()=>addExtraFiles([],files,9),/Maksimal 10/);
  for(const file of [{name:'a.exe',size:1},{name:'empty.pdf',size:0},{name:'large.jpg',size:10485761}])assert.throws(()=>addExtraFiles(rows,[file]),/10 MB/);
  assert.equal(rows.length,2);
});
