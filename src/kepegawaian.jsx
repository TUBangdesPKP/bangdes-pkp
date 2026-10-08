import React from 'react';
import { ArrowLeft, Briefcase } from 'lucide-react';

export function KepegawaianPage() {
  return (
    <section aria-labelledby="kepegawaian-title" className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
      <a href="#/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#084C61] hover:underline mb-6">
        <ArrowLeft size={16} /> Kembali ke Beranda
      </a>
      <div className="rounded-2xl bg-[#084C61] text-white p-6 md:p-8 mb-6">
        <h1 id="kepegawaian-title" className="text-2xl md:text-3xl font-black mb-2">Kepegawaian</h1>
        <p className="text-sm md:text-base text-white/90">Data dan informasi pegawai Direktorat Pembangunan Perumahan Perdesaan.</p>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
        <h2 className="text-lg font-extrabold text-[#084C61] mb-2">Bank Data Pegawai</h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-5">Lihat profil pegawai serta cari berdasarkan nama, NIP, jabatan, atau subunit kerja.</p>
        <a href="#/profile" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#084C61] text-white font-bold shadow-sm hover:bg-[#114053] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#084C61]">
          <Briefcase size={18} /> Lihat Bank Data Pegawai
        </a>
      </div>
    </section>
  );
}
