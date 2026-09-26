import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { sendClaimRequest } from './archive-claims.js';

export function AccountActivation({ endpoint, onActivated, onBusy }) {
  const [nip, setNip] = useState(''), [pin, setPin] = useState(''), [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [alreadyActive, setAlreadyActive] = useState(false);
  async function activate(event) {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (pin !== confirmation) { setError('Konfirmasi PIN tidak sama.'); return; }
    setBusy(true); onBusy(true);
    try {
      const result = await sendClaimRequest(endpoint, { action: 'aktivasi_akun', nip, newPin: pin, confirmPin: confirmation });
      if (result.alreadyActive) { setAlreadyActive(true); setPin(''); setConfirmation(''); }
      else if (result.activated === true) { setPin(''); setConfirmation(''); onActivated(nip); }
      else throw Error('Respons aktivasi tidak sesuai. Hubungi admin.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); onBusy(false); }
  }
  return <>
    <header className="mb-6"><h2 className="text-2xl font-black text-[#084C61] flex items-center gap-2"><KeyRound size={24}/>Aktivasi Akun</h2><p className="text-xs text-slate-500 mt-2">Buat PIN pertama untuk NIP yang terdaftar.</p></header>
    <form onSubmit={activate} className="space-y-4">
      <label className="block text-xs font-bold text-[#084C61]">NIP<input required type="text" inputMode="numeric" autoComplete="username" pattern="[0-9]{18}" minLength={18} maxLength={18} value={nip} onChange={event => setNip(event.target.value.replace(/\D/g, ''))} disabled={busy} placeholder="Masukkan NIP" className="block w-full border rounded-xl p-3 mt-2 font-normal"/></label>
      <label className="block text-xs font-bold text-[#084C61]">Buat PIN<input required type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6}" minLength={6} maxLength={6} value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, ''))} disabled={busy} placeholder="6 digit angka" className="block w-full border rounded-xl p-3 mt-2 font-normal"/></label>
      <label className="block text-xs font-bold text-[#084C61]">Konfirmasi PIN<input required type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6}" minLength={6} maxLength={6} value={confirmation} onChange={event => setConfirmation(event.target.value.replace(/\D/g, ''))} disabled={busy} placeholder="Ulangi PIN" className="block w-full border rounded-xl p-3 mt-2 font-normal"/></label>
      {error && <p role="alert" className="p-3 bg-red-50 text-red-800 rounded-lg text-xs">{error}</p>}
      <button disabled={busy} className="w-full bg-[#084C61] text-white font-bold text-sm rounded-xl p-3 disabled:opacity-50">{busy ? 'Memproses aktivasi…' : 'Aktivasi Akun'}</button>
      <p className="text-xs text-slate-500 border-t pt-4">Aktivasi hanya untuk NIP terdaftar yang belum memiliki PIN. Akun yang sudah aktif harus menghubungi admin jika tidak dapat login.</p>
    </form>
    {alreadyActive && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><div role="alertdialog" aria-modal="true" aria-labelledby="active-account-message" className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center"><p id="active-account-message" className="font-semibold text-[#084C61]">Akun Sudah Aktif, Konfirmasi kepada Admin untuk akses login</p><button autoFocus onClick={() => setAlreadyActive(false)} className="mt-5 bg-[#084C61] text-white rounded-lg px-5 py-2">Tutup</button></div></div>}
  </>;
}
