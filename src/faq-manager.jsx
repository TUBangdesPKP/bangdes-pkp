import { useEffect, useRef, useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { FAQ_MANAGER } from './faq-manager-data.js';

export function FaqManagerProfile() {
  return <div className="flex flex-col items-center gap-4 text-center">
    <div className="w-40 h-48 sm:w-44 sm:h-52 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"><img src={FAQ_MANAGER.photo} alt={`Foto ${FAQ_MANAGER.name}`} width="524" height="800" loading="eager" className="h-full w-full object-contain object-center"/></div>
    <div><h3 className="text-lg sm:text-xl font-extrabold text-[#084C61] break-words">{FAQ_MANAGER.name}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{FAQ_MANAGER.job}</p></div>
  </div>;
}

export function FaqManagerDialog({onClose}) {
  const ref = useRef(null);
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
      <FaqManagerProfile/>
      <div className="mt-6 flex justify-center"><button type="button" onClick={onClose} className="rounded-xl bg-[#084C61] px-6 py-2 text-sm font-bold text-white hover:opacity-90">Tutup</button></div>
    </div>
  </dialog>;
}

export function FaqManager() {
  const [open,setOpen] = useState(false);
  return <><link rel="preload" as="image" href={FAQ_MANAGER.photo}/><button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer"><HelpCircle size={16}/> FAQ</button>
    {open && <FaqManagerDialog onClose={() => setOpen(false)}/>}</>;
}
