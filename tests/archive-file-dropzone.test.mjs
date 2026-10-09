import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { manualArchiveFileSelection } from '../src/manual-archive-file.js';
import fs from 'node:fs';

const bundle = await build({ configFile: false, plugins: [react()], logLevel: 'error', ssr: { noExternal: true },
  build: { ssr: 'src/archive-file-dropzone.jsx', write: false, emptyOutDir: false,
    rollupOptions: { external: ['react', 'react/jsx-runtime', 'lucide-react'] } } });
const code = bundle.output.find(item => item.type === 'chunk').code.replace(/(from|import) (["'])(react(?:\/jsx-runtime)?|lucide-react)\2/g,
  (_, keyword, quote, specifier) => `${keyword} ${JSON.stringify(import.meta.resolve(specifier))}`);
const { ArchiveFileDropzone } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));

function dragEvent(files = [], types = ['Files']) {
  return { dataTransfer: { files, types }, prevented: false, stopped: false,
    preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } };
}

for (const documentModule of ['spt', 'cuti']) {
  test(`${documentModule}: drop and picker pass the same files to shared validation without uploading`, () => {
    const calls = [], active = [];
    const zone = ArchiveFileDropzone({ documentModule, onFiles: files => calls.push(files), onDragActiveChange: value => active.push(value) });
    const files = [{ name: 'surat.pdf' }, { name: 'surat.png' }];
    const drop = dragEvent(files);
    zone.props.onDrop(drop);
    assert.equal(drop.prevented, true);
    assert.equal(drop.stopped, true);
    assert.equal(active.at(-1), false);
    const input = zone.props.children.find(child => child.type === 'input');
    assert.equal(input.props.id, `arsip-upload-${documentModule}`);
    assert.equal(input.props.multiple, true);
    assert.equal(input.props.accept, '.pdf,.jpg,.jpeg,.png');
    const selection = { target: { files, value: 'selected.pdf' } };
    input.props.onChange(selection);
    assert.equal(selection.target.value, '');
    assert.deepEqual(calls, [files, files]);
  });
}

test('drag feedback accepts files only and stays active over child elements', () => {
  const active = [];
  const zone = ArchiveFileDropzone({ documentModule: 'spt', onFiles: () => {}, onDragActiveChange: value => active.push(value) });
  for (const handler of ['onDragEnter', 'onDragOver']) {
    const event = dragEvent();
    zone.props[handler](event);
    assert.equal(event.prevented, true);
    assert.equal(event.dataTransfer.dropEffect, 'copy');
    assert.equal(active.at(-1), true);
  }
  const leave = dragEvent();
  leave.currentTarget = { contains: () => true };
  const count = active.length;
  zone.props.onDragLeave(leave);
  assert.equal(active.length, count);
  leave.currentTarget.contains = () => false;
  zone.props.onDragLeave(leave);
  assert.equal(active.at(-1), false);
  const text = dragEvent([], ['text/plain']);
  zone.props.onDragOver(text);
  assert.equal(text.dataTransfer.dropEffect, 'none');
  assert.equal(active.at(-1), false);
});

test('busy archive blocks both drop and picker while preventing browser file navigation', () => {
  const zone = ArchiveFileDropzone({ documentModule: 'cuti', disabled: true, onFiles: () => assert.fail('No file selection while busy'), onDragActiveChange: () => {} });
  const event = dragEvent([{ name: 'surat.pdf' }]);
  zone.props.onDragOver(event);
  assert.equal(event.dataTransfer.dropEffect, 'none');
  zone.props.onDrop(event);
  assert.equal(event.prevented, true);
  assert.equal(event.stopped, true);
  const input = zone.props.children.find(child => child.type === 'input');
  assert.equal(input.props.disabled, true);
  input.props.onChange({ target: { files: event.dataTransfer.files, value: 'surat.pdf' } });
});

for (const documentModule of ['cuti','spt']) {
  test(`${documentModule} manual: picker and drop share validation, one-file input and reset for same-file reselection`,()=>{
    const calls=[], active=[];
    const zone=ArchiveFileDropzone({manual:true,entryId:'entry-one',documentModule,fileName:'previous.pdf',onFiles:files=>calls.push(manualArchiveFileSelection(files)),onDragActiveChange:value=>active.push(value)});
    const file={name:'new.pdf',size:1200};
    const event=dragEvent([file]);
    zone.props.onDragOver(event);
    assert.equal(event.dataTransfer.dropEffect,'copy');
    zone.props.onDrop(event);
    assert.equal(event.prevented,true);
    assert.equal(event.stopped,true);
    assert.equal(active.at(-1),false);
    const input=zone.props.children.find(child=>child.type==='input');
    assert.equal(input.props.multiple,false);
    assert.equal(input.props.id,`manual-upload-${documentModule}-entry-one`);
    assert.equal(input.props.className,'sr-only');
    for(let i=0;i<2;i++) {
      const selection={target:{files:[file],value:'new.pdf'}};
      input.props.onChange(selection);
      assert.equal(selection.target.value,'');
    }
    assert.deepEqual(calls,[{file,error:''},{file,error:''},{file,error:''}]);
    const count=calls.length;
    zone.props.onDrop(dragEvent([],['text/plain']));
    assert.equal(calls.length,count);
  });
  test(`${documentModule} manual: busy drop and picker are blocked without browser navigation`,()=>{
    const zone=ArchiveFileDropzone({manual:true,entryId:'busy',documentModule,disabled:true,onFiles:()=>assert.fail('Busy selection must not replace file'),onDragActiveChange:()=>{}});
    const event=dragEvent([{name:'new.png',size:10}]);
    zone.props.onDragOver(event);
    assert.equal(event.dataTransfer.dropEffect,'none');
    zone.props.onDrop(event);
    assert.equal(event.prevented,true);
    assert.equal(event.stopped,true);
    const input=zone.props.children.find(child=>child.type==='input');
    assert.equal(input.props.disabled,true);
    input.props.onChange({target:{files:event.dataTransfer.files,value:'new.png'}});
  });
}

test('manual file validation rejects multiple, unsupported, oversized or empty files and handles cancellation',()=>{
  const file={name:'valid.PDF',size:10*1024*1024};
  for(const name of ['valid.PDF','valid.jpg','valid.JPEG','valid.png'])assert.equal(manualArchiveFileSelection([{...file,name}]).error,'');
  for(const files of [[file,file],[{...file,name:'wrong.xlsx'}],[{...file,name:'wrong.pdf.exe'}],[{...file,size:10*1024*1024+1}],[{...file,size:0}],[{...file,size:NaN}]]) {
    const result=manualArchiveFileSelection(files);
    assert.equal(result.file,null);
    assert.ok(result.error);
  }
  assert.deepEqual(manualArchiveFileSelection([]),{file:null,error:''});
  assert.deepEqual(manualArchiveFileSelection(null),{file:null,error:''});
});

test('manual errors associate with their own input; row updates preserve other entries and form fields',()=>{
  const zone=ArchiveFileDropzone({manual:true,entryId:'entry-two',documentModule:'cuti',error:'File terlalu besar',onFiles:()=>{},onDragActiveChange:()=>{}});
  const input=zone.props.children.find(child=>child.type==='input');
  assert.equal(input.props['aria-invalid'],true);
  assert.equal(input.props['aria-describedby'],'manual-upload-cuti-entry-two-error');
  const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
  const start=app.indexOf('  const handleManualFileChange =');
  const handler=app.slice(start,app.indexOf('  const handleAddPegawaiManual =',start));
  assert.match(handler,/isSubmittingArsip \|\| isReadingArsip/);
  assert.match(handler,/entry.id !== id \? entry/);
  assert.match(handler,/\{\.\.\.entry, fileError: selection.error\}/);
  assert.match(handler,/\{\.\.\.entry, file: selection.file, fileError: ''\}/);
  assert.doesNotMatch(handler,/fetch\(|fileToBase64\(/);
  assert.match(app,/e.file && !e.fileError && !manualArchiveFileSelection\(\[e.file\]\).error/);
  assert.match(app,/onFiles=\{files => handleManualFileChange\(entry.id, files\)\}/);
});
