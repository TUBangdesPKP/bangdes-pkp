import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Eye, Trash2 } from 'lucide-react';
import { driveFileId, sendClaimRequest } from './archive-claims.js';

// One server-backed collection shared by SPT/Cuti claims and direct uploads.
export function useSubmissionDocuments({ endpoint, context, enabled, revision, onPreview }) {
  const key = JSON.stringify(context);
  const currentKey = useRef(key);
  currentKey.current = key;
  const requestVersion = useRef(0);
  const loadedRequest = useRef('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(true);
  const [removing, setRemoving] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    loadedRequest.current = '';
    setFiles([]); setReady(false); setProcessed(false); setError(''); setRemoving(null); setConfirmDelete(null);
  }, [key]);

  useEffect(() => {
    if (!enabled || !context.periode || (!context.nip && !context.nama)) return;
    const requestKey = JSON.stringify([endpoint, key, revision, refreshVersion]);
    if (loadedRequest.current === requestKey) return;
    const version = ++requestVersion.current;
    let cancelled = false;
    setLoading(true);
    setError('');
    sendClaimRequest(endpoint, { ...context, action: 'list_pendukung' })
      .then(result => {
        if (cancelled || currentKey.current !== key || requestVersion.current !== version) return;
        if (!Array.isArray(result.documents)) throw new Error('Perbarui backend Apps Script: respons daftar dokumen belum didukung.');
        setFiles(result.documents);
        setReady(!result.requiresTab2);
        setProcessed(result.processed === true);
        loadedRequest.current = requestKey;
      })
      .catch(err => { if (!cancelled && currentKey.current === key && requestVersion.current === version) { setError(err.message); setReady(false); setProcessed(false); } })
      .finally(() => { if (!cancelled && currentKey.current === key && requestVersion.current === version) setLoading(false); });
    return () => { cancelled = true; };
  }, [endpoint, key, enabled, revision, refreshVersion]);

  const acceptResult = useCallback(result => {
    if (!result.document?.fileId || !result.document?.fileUrl) throw new Error('Backend belum mengembalikan ID salinan. Perbarui Code.gs sebelum melanjutkan.');
    if (currentKey.current !== key) return;
    requestVersion.current++;
    setLoading(false);
    setFiles(previous => [...previous.filter(file => file.fileId !== result.document.fileId), result.document]);
    setReady(true);
    setProcessed(false);
    setError('');
  }, [key]);

  const claim = async payload => {
    if (!ready) throw new Error('Simpan tab 2 dan muat daftar dokumen terlebih dahulu.');
    setClaiming(true);
    try {
      const result = await sendClaimRequest(endpoint, payload);
      acceptResult(result);
    } finally { setClaiming(false); }
  };

  const remove = async file => {
    if (removing) return;
    setRemoving(file.fileId);
    setError('');
    try {
      const result = await sendClaimRequest(endpoint, { ...context, action: 'hapus_pendukung', fileId: file.fileId });
      if (currentKey.current !== key) return;
      if (result.fileId !== file.fileId) throw new Error('Server belum mengonfirmasi file yang dihapus.');
      requestVersion.current++;
      setLoading(false);
      setFiles(previous => previous.filter(item => item.fileId !== file.fileId));
      setConfirmDelete(null);
      setProcessed(false);
    } catch (err) { if (currentKey.current === key) setError(err.message); }
    finally { if (currentKey.current === key) setRemoving(null); }
  };

  const isClaimed = (sourceUrl, type) => files.some(file => file.jenisDokumen === type &&
    (file.sourceFileId === driveFileId(sourceUrl) || file.sourceUrl === sourceUrl));

  const render = () => (
    <section aria-label="Dokumen Bukti Dukung yang sudah diupload" className="rounded-2xl border border-[#B4D6E3] bg-[#EAF5FA] overflow-hidden">
      <button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} className="w-full px-5 py-4 flex items-center justify-between text-[#084C61]">
        <span className="flex items-center gap-2 text-sm font-bold"><CheckCircle2 size={18}/>Dokumen Bukti Dukung yang sudah diupload <span className="bg-[#084C61] text-white text-xs rounded-full px-2">{files.length} file</span></span>
        {expanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
      </button>
      {expanded && <div className="px-5 pb-5 space-y-4">
        {error && <div role="alert" className="text-xs text-red-700 bg-red-50 rounded-lg p-3">{error}</div>}
        {loading && <p className="text-xs text-gray-500">Memuat dokumen dari folder pengumpulan...</p>}
        {!loading && !ready && !error && <p className="text-xs text-gray-600">Simpan file presensi dan rekap pada tab 2 terlebih dahulu.</p>}
        {!loading && ready && files.length === 0 && <p className="text-xs text-gray-500">Belum ada SPT atau Cuti yang dilampirkan pada pengumpulan ini.</p>}
        {['spt', 'cuti'].map(type => {
          const group = files.filter(file => file.jenisDokumen === type);
          return group.length > 0 && <div key={type} className="space-y-2">
            <h4 className="text-xs font-bold text-[#084C61]">{type === 'spt' ? 'SPT' : 'Cuti'} ({group.length} file)</h4>
            {group.map(file => <div key={file.fileId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3">
              <span className="text-xs text-[#084C61] min-w-0 truncate" title={file.fileName}>{file.fileName}</span>
              <div className="flex gap-2 shrink-0">
                <button type="button" onClick={() => onPreview(file)} className="flex items-center gap-1 text-xs text-[#084C61] bg-[#D5EAF3] rounded px-2 py-1"><Eye size={14}/>Lihat</button>
                <button type="button" disabled={!!removing} onClick={() => setConfirmDelete(file)} className="flex items-center gap-1 text-xs text-red-600 bg-red-50 rounded px-2 py-1 disabled:opacity-50"><Trash2 size={14}/>{removing === file.fileId ? 'Menghapus...' : 'Hapus'}</button>
              </div>
            </div>)}
          </div>;
        })}
        <button type="button" disabled={loading || !!removing} onClick={() => setRefreshVersion(v => v + 1)} className="text-xs text-[#084C61] underline">Muat ulang daftar</button>
      </div>}
      {confirmDelete && <div role="dialog" aria-modal="true" aria-label="Hapus salinan pengumpulan" className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md space-y-4 text-gray-800 shadow-xl">
          <h3 className="font-bold">Hapus salinan pengumpulan?</h3>
          <p className="text-sm break-words">{confirmDelete.fileName}</p>
          <p className="text-xs">Salinan di folder pegawai untuk periode ini akan dipindahkan ke Trash. Dokumen sumber dan data rekap SPT/Cuti tetap tersimpan.</p>
          {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <button disabled={!!removing} onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-lg bg-gray-100">Batal</button>
            <button disabled={!!removing} onClick={() => remove(confirmDelete)} className="px-4 py-2 rounded-lg bg-red-600 text-white">{removing ? 'Menghapus...' : 'Hapus salinan'}</button>
          </div>
        </div>
      </div>}
    </section>
  );
  const markProcessed = value => {
    if (currentKey.current !== key) return;
    requestVersion.current++;
    setLoading(false);
    setProcessed(value);
  };
  return { files, ready, loading, processed, markProcessed, refreshVersion, busy: claiming || !!removing, acceptResult, claim, isClaimed, render };
}
