import { useSubmissionDocuments } from './submission-documents.jsx';
import { FinalRecap, FinalRecapSaved } from './final-recap.jsx';
import { ReadOnlyAttendance } from './readonly-attendance.jsx';

// Only read endpoints are mounted here: no upload, claim, process or save panels.
export function ClosedSubmission({ endpoint, context, step, onStep, onPreview, viewingEmployee }) {
  const documents = useSubmissionDocuments({ endpoint, context, enabled: true, readOnly: true, onPreview });
  const moduleLabel = context.modul === 'tukin' ? 'Tunjangan Kinerja' : 'Uang Makan';
  const empty = <div className="rounded-2xl border bg-white p-6 space-y-3">
    <p>Belum ada rekap tersimpan untuk periode ini. Hubungi Admin bila rekap seharusnya sudah tersedia.</p>
    <button onClick={() => onStep(3)} className="text-[#084C61] underline">Lihat dokumen tab 4</button>
  </div>;
  return <div className="space-y-5">
    <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{viewingEmployee ? `Rekap ${viewingEmployee.nama} — NIP ${viewingEmployee.nip} — hanya lihat.` : 'Rekap pegawai — hanya lihat.'} Unggah, klaim, hapus, koreksi jam, dan penyimpanan perubahan tidak tersedia.</p>
    {viewingEmployee && <button onClick={() => onStep(0)} className="text-sm font-bold text-[#084C61] underline">Kembali ke daftar pegawai (tab 2)</button>}
    {step === 0 ? <section className="rounded-2xl border bg-white p-6 space-y-4">
      <h3 className="font-bold">Rekap Pribadi {moduleLabel}</h3>
      <p>{context.nama} — NIP {context.nip}</p>
      <p className="text-sm text-slate-600">{context.periode}</p>
      <button onClick={() => onStep(2)} className="rounded-xl bg-[#084C61] text-white px-5 py-3 text-sm">Lihat Presensi Tab 3</button>
    </section> : step === 2 ? <>
      <ReadOnlyAttendance endpoint={endpoint} context={context} onPreview={onPreview}/>
      <button onClick={() => onStep(3)} className="rounded-xl bg-[#084C61] text-white px-5 py-3 text-sm">Lihat Dokumen Pendukung Tab 4</button>
    </> : step === 3 ? <>
      {documents.render()}
      <button onClick={() => onStep(4)} className="rounded-xl bg-[#084C61] text-white px-5 py-3 text-sm">Lihat Preview Tab 5</button>
    </> : documents.error ? <div role="alert" className="bg-red-50 text-red-700 p-5 rounded-xl">{documents.error}<button onClick={() => onStep(3)} className="block mt-3 underline">Buka tab 4 untuk muat ulang</button></div>
      : documents.loading || !documents.loaded ? <p role="status">Memuat rekap tersimpan...</p>
      : step === 4 ? <>
        {documents.ready && documents.processed ? <FinalRecap endpoint={endpoint} context={context} readOnly onBack={() => onStep(3)} /> : empty}
        <button onClick={() => onStep(5)} className="rounded-xl bg-[#084C61] text-white px-5 py-3 text-sm">Lihat Rekap Tab 6</button>
      </> : documents.savedResult ? <FinalRecapSaved result={documents.savedResult} moduleLabel={moduleLabel} readOnly onBack={() => onStep(4)} onDone={() => onStep(1)} /> : empty}
  </div>;
}
