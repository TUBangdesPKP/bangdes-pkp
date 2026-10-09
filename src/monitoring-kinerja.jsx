import { ArrowLeft } from 'lucide-react';

export function MonitoringKinerjaPage() {
  return (
    <section aria-labelledby="monitoring-kinerja-title" className="h-full min-h-0 flex flex-col">
      <div className="shrink-0 px-4 md:px-8 pt-4 pb-2">
        <a href="#/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#084C61] hover:underline mb-3">
          <ArrowLeft size={16} /> Kembali ke Beranda
        </a>
        <div className="rounded-2xl bg-[#084C61] text-white px-5 py-4">
          <h1 id="monitoring-kinerja-title" className="text-base font-extrabold">Monitoring Kinerja</h1>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto" />
    </section>
  );
}
