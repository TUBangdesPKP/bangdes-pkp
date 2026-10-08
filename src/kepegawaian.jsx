import React, { useState, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';

const tabs = [
  { id: 'data', label: 'Data Pegawai' },
  { id: 'kompetensi', label: 'Pemenuhan Kompetensi Pegawai' },
  { id: 'kredit', label: 'Angka Kredit Pegawai' },
];

export function KepegawaianPage({ children }) {
  const [activeTab, setActiveTab] = useState('data');
  const tabRefs = useRef([]);
  const handleKeyDown = (event, index) => {
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
      : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    setActiveTab(tabs[next].id);
    tabRefs.current[next]?.focus();
  };
  return (
    <section aria-labelledby="kepegawaian-title" className="h-full min-h-0 flex flex-col">
      <h1 id="kepegawaian-title" className="sr-only">Kepegawaian</h1>
      <div className="shrink-0 px-4 md:px-8 pt-4 pb-2">
      <a href="#/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#084C61] hover:underline mb-3">
        <ArrowLeft size={16} /> Kembali ke Beranda
      </a>
      <div role="tablist" aria-label="Modul Kepegawaian" className="flex overflow-x-auto rounded-2xl bg-[#084C61] p-1 text-white">
        {tabs.map((tab, index) => (
          <button key={tab.id} ref={element => { tabRefs.current[index] = element; }}
            type="button" role="tab" id={`kepegawaian-tab-${tab.id}`}
            aria-controls={`kepegawaian-panel-${tab.id}`} aria-selected={activeTab === tab.id}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)} onKeyDown={event => handleKeyDown(event, index)}
            className="shrink-0 px-5 md:px-8 py-3 rounded-xl text-sm md:text-base font-extrabold cursor-pointer hover:bg-white/10 aria-selected:bg-white/15 aria-selected:underline underline-offset-8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
            {tab.label}
          </button>
        ))}
      </div>
      </div>
      {tabs.map(tab => (
        <div key={tab.id} role="tabpanel" id={`kepegawaian-panel-${tab.id}`}
          aria-labelledby={`kepegawaian-tab-${tab.id}`} hidden={activeTab !== tab.id}
          tabIndex={0} className="flex-1 min-h-0 overflow-y-auto focus-visible:outline-none">
          {tab.id === 'data' ? children : null}
        </div>
      ))}
    </section>
  );
}
