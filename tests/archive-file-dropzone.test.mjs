import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'vite';
import react from '@vitejs/plugin-react';

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
