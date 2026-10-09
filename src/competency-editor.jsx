import {useEffect, useRef, useState} from 'react';
import {X} from 'lucide-react';
import {sendClaimRequest} from './archive-claims.js';
import {canManageCompetency, chosenTrainingEmployee, trainingEmployeeLabel} from './competency-model.js';
const fieldClass = 'block mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0E5B73]';

export function CompetencyDialog({endpoint, user, people, revision, course, onAuthenticated, onSaved, onClose}) {
  const dialog = useRef(null), inFlight = useRef(false);
  const [authUser, setAuthUser] = useState(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [loginNip, setLoginNip] = useState(''), [pin, setPin] = useState('');
  const [employee, setEmployee] = useState(''), [title, setTitle] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear())), [jp, setJp] = useState('');
  const actor = authUser || user;
  const allowed = canManageCompetency(actor);
  const selected = chosenTrainingEmployee(people, employee);
  const heading = !allowed ? 'Login Admin Pegawai' : course ? 'Hapus Data Pelatihan?' : 'Tambah Data Pelatihan';
  useEffect(() => {
    const element = dialog.current, previous = document.activeElement;
    element.showModal();
    return () => {element.close(); previous?.focus();};
  }, []);
  const close = () => {if (!inFlight.current) onClose();};
  const submit = async event => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      if (!allowed) {
        const result = await sendClaimRequest(endpoint, {action: 'login_pegawai', nip: loginNip.trim(), pin});
        setPin('');
        const authenticated = {...result.user, sessionToken: result.sessionToken};
        if (!canManageCompetency(authenticated)) throw new Error('Akun ini bukan pegawai dengan Role Admin. Hubungi pengelola.');
        setAuthUser(authenticated); onAuthenticated?.(authenticated);
        return;
      }
      if (!revision) throw new Error('Backend JP belum siap. Perbarui deployment Apps Script, lalu muat ulang data.');
      if (!course && !selected) throw new Error('Pilih satu nama dari daftar Data Pegawai.');
      const payload = {sessionToken: actor.sessionToken, expectedRevision: revision,
        ...(course ? {action: 'hapus_pelatihan_jp', sourceRow: course.sourceRow}
          : {action: 'tambah_pelatihan_jp', employeeNip: selected.NIP, title, year, jp})};
      const result = await sendClaimRequest(endpoint, payload);
      if (result.jpVersion !== 1 || !Array.isArray(result.training) || !result.revision) throw new Error('Respons penyimpanan belum dapat diverifikasi. Tutup formulir dan muat ulang data sebelum mencoba lagi.');
      onSaved(result, course ? 'Pelatihan dihapus dan baris kosong dirapikan.' : 'Data pelatihan berhasil disimpan.');
      onClose();
    } catch (failure) {
      setPin('');
      setError(`${failure.message}${allowed ? ' Jika hasil belum pasti atau data telah berubah, tutup pop up dan muat ulang sebelum mencoba lagi.' : ''}`);
    } finally {inFlight.current = false; setBusy(false);}
  };
  return <dialog ref={dialog} aria-labelledby="jp-dialog-title" onCancel={event => {event.preventDefault(); close();}}
    className="w-[calc(100%_-_2rem)] max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-0 bg-white text-slate-800 shadow-xl backdrop:bg-black/50">
    <div className="p-5 md:p-6"><div className="flex justify-between items-center gap-4 mb-5"><h2 id="jp-dialog-title" className="text-lg font-bold text-[#084C61]">{heading}</h2><button type="button" aria-label="Tutup" disabled={busy} onClick={close} className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"><X size={20}/></button></div>
      <form onSubmit={submit}>
        {!allowed ? <fieldset disabled={busy} className="space-y-4"><p className="text-sm">Masuk dengan NIP pegawai yang memiliki Role Admin. Akun username admin lama tidak memberikan izin menulis data JP.</p>
          <label className="block text-sm font-semibold">NIP<input autoFocus required inputMode="numeric" pattern="[0-9]{18}" autoComplete="username" maxLength={18} value={loginNip} onChange={event => setLoginNip(event.target.value)} className={fieldClass}/></label>
          <label className="block text-sm font-semibold">PIN<input required type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="current-password" value={pin} onChange={event => setPin(event.target.value)} className={fieldClass}/></label>
        </fieldset> : course ? <div className="space-y-3 text-sm"><p>Hapus catatan berikut dari spreadsheet JP?</p><p className="font-bold">{course.name}</p><p>{course.title}</p><p>Tahun {course.year ?? 'belum diisi'} · {course.jp ?? 'belum diisi'} JP</p><p className="text-slate-500">Baris di bawahnya akan bergeser naik. Pelatihan lainnya tetap dipertahankan.</p></div> : <fieldset disabled={busy} className="space-y-4">
          <label className="block text-sm font-semibold">Nama<input autoFocus required list="jp-pegawai-options" value={employee} onChange={event => setEmployee(event.target.value)} placeholder="Ketik nama atau NIP, lalu pilih pegawai" autoComplete="off" className={fieldClass}/></label>
          <datalist id="jp-pegawai-options">{people.filter(person => /^\d{18}$/.test(person.NIP)).map(person => <option key={person.NIP} value={trainingEmployeeLabel(person)}>{person.SubUnitKerja}</option>)}</datalist>
          {employee && !selected && <p className="text-xs text-amber-800">Pilih salah satu hasil dari daftar. Nama bebas tidak dapat disimpan.</p>}
          <label className="block text-sm font-semibold">Nama Sertifikat / Pelatihan<input required maxLength={1000} value={title} onChange={event => setTitle(event.target.value)} className={fieldClass}/></label>
          <div className="grid grid-cols-2 gap-4"><label className="block text-sm font-semibold">Tahun Pelaksanaan<input required type="number" min={1900} max={2199} step={1} value={year} onChange={event => setYear(event.target.value)} className={fieldClass}/></label>
            <label className="block text-sm font-semibold">Jumlah Jam Pelajaran (JP)<input required type="number" min={0} step="0.001" value={jp} onChange={event => setJp(event.target.value)} className={fieldClass}/></label></div>
        </fieldset>}
        {error && <p role="alert" className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</p>}
        <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} onClick={close} className="rounded-xl border px-4 py-2 disabled:opacity-50">Batal</button>
          <button type="submit" disabled={busy || (allowed && !course && !selected)} className={`rounded-xl px-4 py-2 text-white font-semibold disabled:opacity-50 ${course && allowed ? 'bg-red-700' : 'bg-[#084C61]'}`}>{busy ? 'Memproses...' : !allowed ? 'Login' : course ? 'Ya, Hapus Pelatihan' : 'Simpan Pelatihan'}</button></div>
      </form>
    </div>
  </dialog>;
}
