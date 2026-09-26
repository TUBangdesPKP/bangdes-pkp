import { useState } from 'react';
import { Save, Globe, ExternalLink } from 'lucide-react';
import { sendClaimRequest } from './archive-claims.js';
import { monthLabel } from './monthly-recap-model.js';

const stamp = value => value ? new Date(value).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' }) + ' WIB' : '';

export function WrapPublication({ endpoint, data, month, loading, onBusy, onSaved }) {
  const [adminKey, setAdminKey] = useState(''), [selection, setSelection] = useState('');
  const [busy, setBusy] = useState(''), [notice, setNotice] = useState(''), [error, setError] = useState(''), [confirmation, setConfirmation] = useState(null);
  const catalog = data?.publication, drafts = catalog?.drafts || [];
  const draft = drafts.find(item => item.snapshotId === selection) || drafts.find(item => item.month === month) || drafts[0];
  const published = catalog?.published;
  const ready = catalog?.version === 1;
  const active = draft && published?.snapshotId === draft.snapshotId;

  async function mutate(action, target) {
    if (busy) return;
    setBusy(action); onBusy(true); setNotice(''); setError('');
    try {
      const payload = action === 'proses_wrap_bulanan'
        ? { action, month, adminKey }
        : { action, month: target.month, snapshotId: target.snapshotId, confirmed: true, adminKey };
      const result = await sendClaimRequest(endpoint, payload, fetch, { timeoutMs: 180000 });
      if (result.publication?.version !== 1) throw Error('Respons penyimpanan tidak sesuai. Muat ulang untuk memeriksa status.');
      onSaved(result);
      if (result.draft) setSelection(result.draft.snapshotId);
      setConfirmation(null);
      setNotice(action === 'proses_wrap_bulanan'
        ? `Rekap ${monthLabel(month)} sudah diproses dan disimpan. Halaman publik belum berubah; pilih Publikasikan untuk menerbitkannya.`
        : `Rekap ${monthLabel(target.month)} yang disimpan sudah ditampilkan ke publik.`);
    } catch (err) {
      setError(`${err.message} Jika koneksi terputus, muat ulang rekap untuk memeriksa status sebelum mencoba lagi.`);
    } finally { setBusy(''); onBusy(false); }
  }

  return <section aria-label="Pengaturan publikasi rekap" className="my-5 rounded-2xl border border-slate-200 bg-white p-5 space-y-4 text-sm">
    <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold text-[#1C465F]">Simpan & Tampilkan Rekap</h2><p className="text-xs text-slate-500 mt-1">Simpan seluruh SubUnit pada bulan terpilih, lalu tentukan versi yang ditampilkan tanpa login.</p></div><a href="#/rekap-publik" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-[#0E5B73]"><ExternalLink size={14}/>Lihat halaman publik</a></div>
    <p className="rounded-lg bg-slate-50 p-3 text-xs">Sedang ditampilkan: <strong>{published ? monthLabel(published.month) : 'Belum ada'}</strong>{published && <span> · versi disimpan {stamp(published.savedAt)}</span>}</p>
    {!ready && <p role="status" className="text-amber-800 text-xs">{loading ? 'Memuat status penyimpanan…' : 'Perbarui backend lalu muat ulang untuk mengaktifkan penyimpanan dan publikasi.'}</p>}
    <div className="grid md:grid-cols-2 gap-5">
      <div className="space-y-3">
        <label className="block text-xs font-semibold">Kunci publikasi admin<input type="password" value={adminKey} onChange={event => setAdminKey(event.target.value)} autoComplete="off" placeholder="Kunci dari pengelola Apps Script" className="block border rounded-lg p-2.5 mt-2 w-full font-normal" disabled={Boolean(busy)}/></label>
        <p className="text-xs text-slate-500">Kunci diverifikasi backend dan hanya disimpan sementara selama halaman ini dibuka. Atur WRAP_ADMIN_KEY pada Script Properties.</p>
        <button disabled={!ready || loading || Boolean(busy) || !adminKey} onClick={() => mutate('proses_wrap_bulanan')} className="inline-flex items-center gap-2 rounded-lg bg-[#0E5B73] text-white px-4 py-2.5 font-semibold disabled:opacity-40"><Save size={16}/>{busy === 'proses_wrap_bulanan' ? 'Memproses…' : `Proses Rekap ${monthLabel(month)}`}</button>
        <p className="text-xs text-slate-500">Proses mengambil data terbaru dan menimpa rekap tersimpan untuk bulan/tahun yang sama. Rekap publik tetap sampai dipublikasikan lagi.</p>
      </div>
      <div className="space-y-3">
        <label className="block text-xs font-semibold">Rekap tersimpan<select value={draft?.snapshotId || ''} disabled={Boolean(busy) || !drafts.length} onChange={event => { setSelection(event.target.value); setConfirmation(null); }} className="block border rounded-lg p-2.5 mt-2 w-full bg-white font-normal">{!drafts.length && <option value="">Belum ada rekap tersimpan</option>}{drafts.map(item => <option key={item.snapshotId} value={item.snapshotId}>{monthLabel(item.month)} · {item.employees} pegawai · {stamp(item.savedAt)}</option>)}</select></label>
        <button disabled={!draft || active || Boolean(busy) || !adminKey} onClick={() => setConfirmation(draft)} className="inline-flex items-center gap-2 rounded-lg border border-[#0E5B73] text-[#0E5B73] px-4 py-2.5 font-semibold disabled:opacity-40"><Globe size={16}/>{active ? 'Sudah Tampil di Publik' : 'Publikasikan'}</button>
        {confirmation && <div role="group" aria-label="Konfirmasi publikasi" className="border border-amber-200 bg-amber-50 rounded-lg p-3 text-xs space-y-3"><p>Tampilkan rekap <strong>{monthLabel(confirmation.month)}</strong>, versi disimpan {stamp(confirmation.savedAt)}, kepada pengunjung tanpa login? Rekap publik sebelumnya akan diganti.</p><div className="flex gap-3"><button disabled={Boolean(busy)} onClick={() => mutate('publikasikan_wrap_bulanan', confirmation)} className="bg-[#0E5B73] text-white rounded px-3 py-2 disabled:opacity-40">{busy === 'publikasikan_wrap_bulanan' ? 'Menerbitkan…' : 'Ya, Tampilkan'}</button><button disabled={Boolean(busy)} onClick={() => setConfirmation(null)} className="border rounded px-3 py-2">Batal</button></div></div>}
      </div>
    </div>
    {notice && <p role="status" className="bg-emerald-50 text-emerald-800 rounded-lg p-3 text-xs">{notice}</p>}
    {error && <p role="alert" className="bg-red-50 text-red-800 rounded-lg p-3 text-xs">{error}</p>}
  </section>;
}
