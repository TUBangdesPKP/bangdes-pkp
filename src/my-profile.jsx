import { useEffect, useState } from 'react';
import { Camera, KeyRound } from 'lucide-react';
import { EmployeePhoto } from './employee-photo.jsx';
import { sendClaimRequest } from './archive-claims.js';

export function MyProfile({ endpoint, user, onUpdate, onRelogin }) {
  const [profile, setProfile] = useState(user), [busy, setBusy] = useState('');
  const [notice, setNotice] = useState(''), [error, setError] = useState('');
  const [oldPin, setOldPin] = useState(''), [newPin, setNewPin] = useState(''), [confirmPin, setConfirmPin] = useState('');
  const token = user?.sessionToken, systemAccount = user?.NIP === 'SUPERADMIN';
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    sendClaimRequest(endpoint, { action: 'profil_saya', sessionToken: token }).then(result => {
      if (!cancelled) setProfile(result.user);
    }).catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [endpoint, token]);

  async function changePhoto(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    setNotice(''); setError('');
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 2 * 1024 * 1024) { setError('Pilih foto JPG/PNG maksimal 2 MB.'); return; }
    setBusy('photo');
    try {
      const base64 = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(Error('Foto tidak dapat dibaca.')); reader.readAsDataURL(file); });
      const result = await sendClaimRequest(endpoint, { action: 'ubah_foto_profil', sessionToken: token, fileBase64: base64 });
      setProfile(result.user); onUpdate({ ...result.user, sessionToken: token });
      setNotice('Foto profil sudah diperbarui. Rekap yang telah dipublikasikan tetap memakai foto tersimpan sampai diproses dan dipublikasikan ulang.');
    } catch (err) { setError(err.message); } finally { setBusy(''); }
  }
  async function changePin(event) {
    event.preventDefault(); setNotice(''); setError('');
    if (newPin !== confirmPin) { setError('Konfirmasi PIN baru tidak sama.'); return; }
    setBusy('pin');
    try {
      const result = await sendClaimRequest(endpoint, { action: 'ubah_pin', sessionToken: token, oldPin, newPin, confirmPin });
      setOldPin(''); setNewPin(''); setConfirmPin('');
      setNotice(result.message); setBusy('changed');
      onUpdate({ ...profile, sessionToken: '' });
    } catch (err) { setError(err.message); setBusy(''); }
  }
  return <div className="max-w-3xl mx-auto p-6 md:p-10 space-y-6">
    <header><h1 className="text-2xl font-extrabold text-[#084C61]">Profil Saya</h1><p className="text-sm text-slate-500 mt-1">Kelola foto profil dan keamanan akun Anda</p></header>
    <section className="bg-white border rounded-2xl p-6 space-y-6">
      <div className="flex flex-col items-center gap-3"><EmployeePhoto src={profile?.Foto_Pegawai} name={profile?.Nama} className="w-36 h-36 rounded-full overflow-hidden"/>
        <label className={`inline-flex gap-2 items-center border rounded-lg px-4 py-2 text-sm text-[#084C61] ${!token || busy ? 'opacity-50' : 'cursor-pointer hover:bg-cyan-50'}`}><Camera size={16}/>{busy === 'photo' ? 'Menyimpan foto…' : 'Ubah Foto Profil'}<input aria-label="Ubah Foto Profil" type="file" accept="image/jpeg,image/png" className="sr-only" disabled={!token || Boolean(busy)} onChange={changePhoto}/></label>
        <p className="text-xs text-slate-500 text-center">JPG/PNG, maksimal 2 MB. Foto digunakan pada profil dan tampilan rekap publik.</p></div>
      <dl className="space-y-4">{[['Nama', profile?.Nama], ['NIP', profile?.NIP], ['Jabatan', profile?.Jabatan], ['Sub Unit Kerja', profile?.SubUnitKerja]].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold text-[#084C61] mb-2">{label}</dt><dd className="border bg-slate-50 rounded-lg p-3 text-sm break-words">{value || '—'}</dd></div>)}</dl>
    </section>
    {systemAccount ? <p className="bg-amber-50 border rounded-xl p-4 text-sm">Akun administrator sistem tidak memiliki baris pegawai. Perubahan foto dan PIN tersedia setelah login dengan NIP yang terdaftar di Data_Pegawai.</p> : !token ? <div className="bg-cyan-50 border rounded-xl p-4 text-sm"><p>{busy === 'changed' ? 'PIN berhasil diubah. Login kembali dengan PIN baru.' : 'Login kembali untuk memverifikasi akses perubahan profil.'}</p><button onClick={onRelogin} className="mt-3 bg-[#084C61] text-white rounded-lg px-4 py-2">Login kembali</button></div> :
    <form onSubmit={changePin} className="bg-white border rounded-2xl p-6 space-y-4"><h2 className="font-bold text-[#084C61] flex items-center gap-2"><KeyRound size={20}/>Ubah PIN Akun</h2><p className="text-xs text-slate-500">Gunakan 6 angka. Setelah berhasil, login kembali dengan PIN baru.</p>
      {[[oldPin, setOldPin, 'PIN lama', 'current-password'], [newPin, setNewPin, 'PIN baru', 'new-password'], [confirmPin, setConfirmPin, 'Konfirmasi PIN baru', 'new-password']].map(([value, setter, label, complete]) => <label key={label} className="block text-sm">{label}<input type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} minLength={6} required autoComplete={complete} value={value} onChange={event => setter(event.target.value.replace(/\D/g, ''))} disabled={Boolean(busy)} className="block w-full border rounded-lg p-3 mt-2 tracking-widest"/></label>)}
      <button disabled={Boolean(busy)} className="bg-[#084C61] text-white rounded-lg px-5 py-2.5 disabled:opacity-50">{busy === 'pin' ? 'Menyimpan…' : 'Simpan PIN Baru'}</button>
    </form>}
    {notice && <p role="status" className="rounded-lg p-4 bg-emerald-50 text-emerald-800 text-sm">{notice}</p>}{error && <p role="alert" className="rounded-lg p-4 bg-red-50 text-red-800 text-sm">{error}</p>}
  </div>;
}
