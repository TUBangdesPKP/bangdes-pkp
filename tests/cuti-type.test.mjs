import test from 'node:test';
import assert from 'node:assert/strict';
import { extractCutiType, cutiTypeRegion } from '../src/cuti-type.js';
import { recognizeCutiImage } from '../src/cuti-ocr.js';

const labels = ['CUTI TAHUNAN','CUTI SAKIT','CUTI KARENA ALASAN PENTING','CUTI BESAR','CUTI MELAHIRKAN','CUTI DILUAR TANGGUNGAN NEGARA'];
const names = ['Cuti Tahunan','Cuti Sakit','Cuti Karena Alasan Penting','Cuti Besar','Cuti Melahirkan','Cuti diluar Tanggungan Negara'];
const form = (selected,mark='V') => `II. JENIS CUTI YANG DIAMBIL**\n${labels.map((label,i)=>`${[1,3,5,2,4,6][i]}. ${label} ${selected.includes(i)?mark:''}`).join(' | ')}\nIII. ALASAN CUTI\nKeperluan pribadi\nIV. LAMANYA CUTI\n18 Mei 2026 18 Mei 2026\nV. CATATAN CUTI\nCUTI TAHUNAN V\nVII. PERTIMBANGAN ATASAN V`;

test('all six choices use only the check after their own label in Bab II',()=>{
  for(let i=0;i<labels.length;i++) for(const mark of ['v','V','√','✓','✔','☑','✅','∨']) {
    assert.equal(extractCutiType(form([i],mark)),names[i],`${i}: ${mark}`);
  }
});
test('blank, ambiguous and non-check text never infer a leave type',()=>{
  assert.equal(extractCutiType(form([])),null);
  assert.equal(extractCutiType(form([0,1])),null);
  for(const mark of ['¥','valid','X','12']) assert.equal(extractCutiType(form([0],mark)),null);
  assert.equal(extractCutiType('FORMULIR CUTI\nCATATAN CUTI\nCUTI TAHUNAN V'),null);
  assert.equal(extractCutiType('II. JENIS CUTI\nCUTI TAHUNAN\nV. CATATAN CUTI'),null);
});
test('observed scan and digital PDF spacing, border noise and glued option numbers',()=>{
  for(const text of ['CUTI TAHUNANV 3. CUTI SAKIT','CUTI TAHUNAN v3. CUTISAKIT','CUTI TAHUNAN √ | 3. CUTI SAKIT']) assert.equal(extractCutiType(text),'Cuti Tahunan');
  assert.equal(extractCutiType('JENIS CUT] YANG DIAMBIL\n1. CUTI TAHUNAN 3. CUTI SAKIT V__5. CUTI KARENA ALASAN PENTING\nIII. ALASAN CUTI'),'Cuti Sakit');
  assert.equal(extractCutiType('JENIS CUTI\nCUTI DI LUAR TANGGUNGAN NEGARA V\nTl. ALASAN CUT'),'Cuti diluar Tanggungan Negara');
});
test('OCR retries Bab II even when dates are complete; supports block-based geometry',async()=>{
  const lines=[
    {text:'II. JENIS CUTI YANG DIAMBIL',bbox:{x0:100,y0:100,x1:400,y1:112}},
    {text:'CUTI TAHUNAN ¥ 3. CUTISAKIT',bbox:{x0:100,y0:116,x1:700,y1:128}},
    {text:'III. ALASAN CUTI',bbox:{x0:100,y0:150,x1:400,y1:162}},
  ];
  let calls=0,closed=false;
  const Tesseract={createWorker:async()=>({setParameters:async()=>{},terminate:async()=>{closed=true;},recognize:async(_,options)=>{
    assert.equal(closed,false);
    if(++calls===1)return {data:{text:form([0],'¥'),blocks:[{paragraphs:[{lines}]}]}};
    assert.deepEqual(options.rectangle,cutiTypeRegion(lines,800,1000));
    return {data:{text:'1. CUTI TAHUNAN v3. CUTISAKIT 5. CUTI KARENA ALASAN PENTING\n2. CUTIBESAR 4. CUTI MELAHIRKAN 6. CUTI DILUAR TANGGUNGAN NEGARA'}};
  }})};
  const result=await recognizeCutiImage({width:800,height:1000},Tesseract);
  assert.equal(result.type,'Cuti Tahunan');assert.equal(result.period.duration,null);
  assert.equal(result.period.warning,undefined);assert.equal(calls,2);assert.equal(closed,true);
});
