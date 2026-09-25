import React, { useEffect, useRef, useState } from 'react';

export const EXTRA_TYPES = { lupa_absen: 'Surat Lupa Absen', tugas_belajar: 'Surat Tugas Belajar', lainnya: 'Dokumen Lainnya' };
export function ExtraDocumentsUpload({ context, documents, onBusy }) {
  const [type, setType] = useState('lupa_absen');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef(null), request = useRef(null);
  useEffect(() => { onBusy?.(busy); return () => onBusy?.(false); }, [busy, onBusy]);
  const upload = async event => {
    event.preventDefault();
    const file = input.current?.files[0];
    if (!file || busy) return;
    setError(''); setBusy(true);
    try {
      if (!/\.(pdf|png|jpe?g)$/i.test(file.name) || file.size > 10 * 1024 * 1024 || !file.size) throw new Error('Pilih PDF/JPG/PNG dengan ukuran maksimal 10 MB.');
      const fingerprint = [type, file.name, file.size, file.lastModified].join('|');
      if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, id: crypto.randomUUID() };
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('File tidak dapat dibaca.')); reader.readAsDataURL(file);
      });
      await documents.claim({ ...context, action: 'upload_pendukung_lain', jenisDokumen: type, fileName: file.name, fileBase64: base64, requestId: request.current.id });
      input.current.value = ''; request.current = null;
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <section className="rounded-2xl border bg-white p-5 space-y-3" aria-label="Dokumen Pendukung Lainnya">
    <h3 className="font-bold text-[#084C61]">Dokumen Pendukung Lainnya</h3>
    <p className="text-xs text-gray-600">Surat dapat mencakup beberapa tanggal. Kuota koreksi adalah 4 kejadian datang/pulang per bulan kalender (maksimal 8 pada periode Tukin dua bulan), bukan jumlah file. Surat Tugas Belajar hanya disimpan sebagai bukti.</p>
    <form onSubmit={upload} className="flex flex-wrap gap-3 items-center">
      <select aria-label="Jenis dokumen tambahan" value={type} disabled={busy || documents.busy} onChange={e => setType(e.target.value)} className="border rounded-lg p-2 text-sm">{Object.entries(EXTRA_TYPES).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select>
      <input ref={input} type="file" aria-label="File dokumen tambahan" required accept=".pdf,.png,.jpg,.jpeg" disabled={busy || documents.busy} className="text-sm max-w-full"/>
      <button disabled={busy || documents.busy || !documents.ready} className="bg-[#084C61] text-white rounded-lg px-5 py-2 text-sm disabled:opacity-40">{busy ? 'Mengunggah...' : 'Upload Dokumen'}</button>
    </form>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}
