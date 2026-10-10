import { useEffect, useRef, useState } from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { ArchiveFileDropzone } from './archive-file-dropzone.jsx';
import { EXTRA_TYPES, addExtraFiles } from './extra-document-model.js';
export { EXTRA_TYPES } from './extra-document-model.js';

export function ExtraDocumentsUpload({ context, documents, onBusy }) {
  const [items, setItems] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const running = useRef(false);
  const stored = (documents.files || []).filter(file => Object.hasOwn(EXTRA_TYPES, file.jenisDokumen)).length;
  const disabled = busy || documents.busy || !documents.ready;
  useEffect(() => { onBusy?.(busy); return () => onBusy?.(false); }, [busy, onBusy]);
  const selectFiles = files => {
    if (disabled || running.current) return;
    try { setItems(addExtraFiles(items, files, stored)); setError(''); }
    catch (err) { setError(err.message); }
  };
  const upload = async event => {
    event.preventDefault();
    if (running.current || disabled || !items.length || items.some(item => !Object.hasOwn(EXTRA_TYPES, item.type))) return;
    running.current = true; setBusy(true); setError('');
    try {
      for (const [index, item] of items.entries()) {
        setProgress(`Mengunggah ${index + 1}/${items.length}: ${item.file.name}`);
        // Retries retain the same request ID and category, even after a lost response.
        setItems(previous => previous.map(row => row.id === item.id ? { ...row, attempted: true } : row));
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('File tidak dapat dibaca.')); reader.readAsDataURL(item.file);
        });
        await documents.claim({ ...context, action: 'upload_pendukung_lain', jenisDokumen: item.type, fileName: item.file.name, fileBase64: base64, requestId: item.id });
        // Keep failed/unattempted files; never resend acknowledged uploads.
        setItems(previous => previous.filter(row => row.id !== item.id));
      }
      setProgress('Semua dokumen berhasil diunggah.');
    } catch (err) { setError(`${err.message} File yang belum berhasil tetap di daftar untuk dicoba kembali.`); setProgress(''); }
    finally { running.current = false; setBusy(false); }
  };
  return <section className="rounded-2xl border bg-white p-5 space-y-4" aria-label="Dokumen Pendukung Lainnya">
    <h3 className="font-bold text-[#084C61]">Dokumen Pendukung Lainnya</h3>
    <ArchiveFileDropzone documentModule="extra" disabled={disabled || stored + items.length >= 10} isDragging={dragging} onDragActiveChange={setDragging} onFiles={selectFiles}/>
    <p className="text-xs text-slate-600">Dokumen tersimpan: {stored}/10 · File dipilih: {items.length}</p>
    <form onSubmit={upload} className="space-y-3">
      {items.map(item => <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border bg-slate-50 p-3">
        <div className="flex items-center gap-2 min-w-0 flex-1"><FileText size={18} className="shrink-0 text-[#084C61]"/><span className="text-sm break-all">{item.file.name}</span></div>
        <select aria-label={`Jenis dokumen ${item.file.name}`} required value={item.type} disabled={disabled || item.attempted} onChange={event => setItems(previous => previous.map(row => row.id === item.id ? { ...row, type: event.target.value } : row))} className="border rounded-lg p-2 text-sm sm:w-52">
          <option value="" disabled>Pilih jenis dokumen</option>{Object.entries(EXTRA_TYPES).map(([id,label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <button type="button" aria-label={`Hapus pilihan ${item.file.name}`} disabled={disabled} onClick={() => setItems(previous => previous.filter(row => row.id !== item.id))} className="p-2 text-red-600 disabled:opacity-40"><Trash2 size={17}/></button>
      </div>)}
      <button disabled={disabled || !items.length || items.some(item => !item.type)} className="bg-[#084C61] text-white rounded-xl px-5 py-3 text-sm font-bold disabled:opacity-40">{busy ? 'Mengunggah…' : `Upload ${items.length} Dokumen`}</button>
    </form>
    {progress && <p role="status" className="text-sm text-teal-700">{progress}</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}
