import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'vite';
import react from '@vitejs/plugin-react';

test('closed preview disables editing and saved recap has no save/upload/editor actions', async () => {
  const bundle = await build({ configFile: false, plugins: [react()], logLevel: 'error',
    ssr: { noExternal: true }, build: { ssr: 'src/final-recap.jsx', write: false, emptyOutDir: false,
      rollupOptions: { external: ['react', 'react/jsx-runtime', 'lucide-react'] } } });
  const code = bundle.output.find(item => item.type === 'chunk').code.replace(/from (["'])(react(?:\/jsx-runtime)?|lucide-react)\1/g, (_, quote, specifier) => `from ${JSON.stringify(import.meta.resolve(specifier))}`);
  const { FinalRecap, FinalRecapSaved } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
    for (const modul of ['uang-makan', 'tukin']) {
      const context = { modul, nip: 'TEST', nama: 'Pegawai Uji', periode: '01-01-2026 s/d 31-01-2026' };
      const preview = { ...context, revision: 'fixture', spreadsheetId: 'fixture', spreadsheetUrl: 'https://example.test/edit',
        adjustments: { '2026-01-05': { datang: { time: '07:30', fileId: 'letter' } } },
        adjustmentDocuments: [{ fileId: 'letter', fileName: 'Surat Uji.pdf' }],
        rows: [{ tanggal: '2026-01-05', hari: 'Senin', datang: '07:30', originalDatang: '-', pulang: '16:00', keterangan: 'WFO', keteranganAwal: 'WFO', jamKerja: 'biasa', dokumen: [] }] };
      const html = renderToStaticMarkup(React.createElement(FinalRecap, { context, readOnly: true, cachedPreview: preview }));
      assert.match(html, /<fieldset disabled=""/);
      assert.match(html, /value="07:30"/);
      assert.doesNotMatch(html, /Lanjutkan Perhitungan|Saya telah memeriksa|Lihat spreadsheet rekap/);
      const result = { ...preview, calculation: { modul, complete: true, totals: {}, amount: {}, days: [], sources: {}, warnings: [] } };
      const saved = renderToStaticMarkup(React.createElement(FinalRecapSaved, { result, readOnly: true, moduleLabel: modul }));
      assert.match(saved, /Kembali ke Daftar Bulan/);
      assert.doesNotMatch(saved, /Upload data lain|Buka spreadsheet rekap|Rekap sudah disimpan/);
      const empty = renderToStaticMarkup(React.createElement(FinalRecapSaved, { readOnly: true, moduleLabel: modul }));
      assert.match(empty, /Belum ada rekap tersimpan/);
      assert.doesNotMatch(empty, /konfirmasi preview|Upload|Perhitungan kembali/);
      const editable = renderToStaticMarkup(React.createElement(FinalRecap, { context, cachedPreview: preview }));
      assert.match(editable, /Lanjutkan Perhitungan/);
      assert.doesNotMatch(editable, /<fieldset disabled=""/);
      for(const readOnly of [true,false]) {
        const previewHtml=renderToStaticMarkup(React.createElement(FinalRecap,{context,readOnly,cachedPreview:preview}));
        const savedHtml=renderToStaticMarkup(React.createElement(FinalRecapSaved,{result,readOnly,moduleLabel:modul}));
        assert.doesNotMatch(previewHtml,/Adjustment maksimal 4 kejadian/);
        assert.doesNotMatch(savedHtml,/Surat tanpa koreksi jam tetap dihitung/);
      }
      const directorPreview = {...preview, directorExempt:modul==='tukin', presenceByStatus:true, adjustments:{},
        rows:[{...preview.rows[0],datang:'-',pulang:'-'}]};
      const directorHtml=renderToStaticMarkup(React.createElement(FinalRecap,{context,cachedPreview:directorPreview}));
      assert.match(directorHtml,/text-teal-700">1 Hari/);
      if(modul==='tukin') {
        assert.match(directorHtml,/Pengecualian Direktur/);
        assert.doesNotMatch(directorHtml,/aria-label="Koreksi/);
        assert.doesNotMatch(directorHtml,/Adjustment maksimal/);
        const directorSaved=renderToStaticMarkup(React.createElement(FinalRecapSaved,{result:{...result,calculation:{...result.calculation,directorExempt:true,presenceByStatus:true}},moduleLabel:modul}));
        assert.match(directorSaved,/besaran Tukin diterima penuh/);
        assert.match(directorSaved,/Bobot SKP 70%/);
        assert.match(directorSaved,/Nominal potongan Tukin Rp0/);
        assert.match(directorSaved,/Catatan Perbaikan Diri/);
        const zeroSaved=renderToStaticMarkup(React.createElement(FinalRecapSaved,{result:{...result,calculation:{...result.calculation,directorExempt:true,amount:{tarif:6349000,skp:70,persenPotongan:0,potonganSkp:0,potongan:0,netto:6349000}}},moduleLabel:modul}));
        assert.match(zeroSaved,/total potongan 0%/);assert.match(zeroSaved,/Potongan \(0,00%\)/);
        assert.doesNotMatch(zeroSaved,/Bobot SKP 70%/);
      } else {
        assert.match(directorHtml,/Dinas dicatat terpisah dan tidak dibayar uang makan/);
        assert.match(directorHtml,/aria-label="Koreksi/);
      }
    }
});

test('saved attendance exposes only PDF viewing and plain-text stored rows',async()=>{
  const bundle=await build({configFile:false,plugins:[react()],logLevel:'error',ssr:{noExternal:true},build:{ssr:'src/readonly-attendance.jsx',write:false,emptyOutDir:false,rollupOptions:{external:['react','react/jsx-runtime','lucide-react']}}});
  const code=bundle.output.find(item=>item.type==='chunk').code.replace(/from (["'])(react(?:\/jsx-runtime)?|lucide-react)\1/g,(_,quote,specifier)=>`from ${JSON.stringify(import.meta.resolve(specifier))}`);
  const {SavedAttendanceView}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  const data={exists:true,nip:'123456',nama:'Pegawai Uji',periode:'01-07-2026 s/d 31-07-2026',referenceDocument:{fileId:'saved-pdf',fileName:'Presensi.pdf'},rows:[{tanggal:'2026-07-06',hari:'Senin',datang:'08:10',pulang:'17:00',keterangan:'WFO'}]};
  const html=renderToStaticMarkup(React.createElement(SavedAttendanceView,{data}));
  for(const value of ['Presensi.pdf','Lihat Dokumen','Preview Data Presensi','2026-07-06','08:10','17:00','WFO']) assert.ok(html.includes(value));
  assert.doesNotMatch(html,/<input|<select|<textarea|Ubah file|Unggah|Simpan|Klaim/);
  const noPdf=renderToStaticMarkup(React.createElement(SavedAttendanceView,{data:{...data,referenceDocument:null}}));
  assert.match(noPdf,/PDF asli belum tersedia/);assert.match(noPdf,/08:10/);assert.doesNotMatch(noPdf,/Lihat Dokumen/);
  assert.match(renderToStaticMarkup(React.createElement(SavedAttendanceView,{data:{exists:false}})),/Belum ada presensi tersimpan/);
  let opened;
  const tree=SavedAttendanceView({data,onPreview:file=>{opened=file;}});
  const visit=node=>{if(!node||typeof node!=='object')return;if(node.type==='button')node.props.onClick();React.Children.forEach(node.props?.children,visit);};
  visit(tree);assert.equal(opened,data.referenceDocument);
});
