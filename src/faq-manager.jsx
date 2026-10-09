import { useEffect, useRef, useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { EmployeePhoto } from './employee-photo.jsx';
import { findFaqManager } from './faq-manager-model.js';

export function FaqManagerProfile({person}) {
  return <div className="flex flex-col items-center gap-4 text-center">
    <EmployeePhoto src={person.photo} name={person.name} className="w-40 h-48 sm:w-44 sm:h-52 rounded-2xl border border-slate-200"/>
    <div><h3 className="text-lg sm:text-xl font-extrabold text-[#084C61] break-words">{person.name}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{person.job || 'Jabatan belum tersedia'}</p></div>
  </div>;
}

function ManagerDetails({loadPeople}) {
  const [state,setState] = useState({loading:true,person:null,error:''});
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) { cancelled=true; setState({loading:false,person:null,error:'Profil pengelola belum dapat dimuat. Silakan coba lagi.'}); }
    },25000);
    Promise.resolve().then(() => loadPeople(true)).then(result => {
      const person = findFaqManager(result.data);
      if (!person) throw new Error('Profil Ghina Sekarsari belum ditemukan secara unik pada data pegawai.');
      if (!cancelled) setState({loading:false,person,error:''});
    }).catch(() => {
      if (!cancelled) setState({loading:false,person:null,error:'Profil pengelola belum dapat dimuat. Silakan coba lagi.'});
    }).finally(() => clearTimeout(timer));
    return () => { cancelled=true; clearTimeout(timer); };
  },[loadPeople]);
  return <>{state.loading && <p role="status" className="py-12 text-center text-sm text-slate-500">Memuat profil pengelola…</p>}
    {state.error && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{state.error}</p>}
    {state.person && <FaqManagerProfile person={state.person}/>}</>;
}

export function FaqManagerDialog({loadPeople,onClose}) {
  const ref = useRef(null);
  const [revision,setRevision] = useState(0);
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); if (previousFocus?.isConnected) previousFocus.focus(); };
  },[]);
  return <dialog ref={ref} aria-labelledby="faq-manager-title" onClose={onClose}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    className="m-auto w-[calc(100%_-_2rem)] max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/50 text-slate-800">
    <div className="p-6 sm:p-8">
      <div className="flex items-start justify-between gap-3 mb-6"><h2 id="faq-manager-title" className="text-lg font-extrabold text-[#084C61]">Halaman ini dikelola oleh</h2><button type="button" aria-label="Tutup informasi pengelola" onClick={onClose} className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#084C61]"><X size={20}/></button></div>
      <ManagerDetails key={revision} loadPeople={loadPeople}/>
      <div className="mt-6 flex justify-center gap-3"><button type="button" onClick={() => setRevision(value => value+1)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-[#084C61] hover:bg-slate-50">Muat ulang</button><button type="button" onClick={onClose} className="rounded-xl bg-[#084C61] px-6 py-2 text-sm font-bold text-white hover:opacity-90">Tutup</button></div>
    </div>
  </dialog>;
}

export function FaqManager({loadPeople}) {
  const [open,setOpen] = useState(false);
  return <><button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer"><HelpCircle size={16}/> FAQ</button>
    {open && <FaqManagerDialog loadPeople={loadPeople} onClose={() => setOpen(false)}/>}</>;
}
