import { useEffect, useMemo, useRef, useState } from 'react';
import { Users, Calendar, Clock, FileText, Plane, Trophy, CheckCircle2, RefreshCw, MapPin, Sparkles, Building2, TrendingUp, Sun, ArrowLeft } from 'lucide-react';
import { sendClaimRequest } from './archive-claims.js';
import { monthLabel, ratio, clock, total, occurrences, isRecapAdmin, monthlyView } from './monthly-recap-model.js';
import { PkpLogo } from './pkp-logo.jsx';
import { WrapPublication } from './wrap-publication.jsx';
import { EmployeePhoto } from './employee-photo.jsx';

const colors = ['#204E6C', '#BCAB88', '#74B9CA', '#476879', '#819C8A'];
const dateLabel = value => value ? new Date(`${value}T12:00:00Z`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }) : '—';
const number = value => Number(value || 0).toLocaleString('id-ID');
const navigation = [['ringkasan', 'Ringkasan', Sparkles], ['kehadiran', 'Kehadiran', CheckCircle2], ['unit', 'Per Unit', Building2], ['juara', 'Juara', Trophy], ['catatan', 'Catatan', TrendingUp], ['dinas', 'Dinas', MapPin]];

function Metric({ icon: Icon, label, value, detail }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 flex justify-between gap-3"><div><p className="uppercase tracking-wider text-[10px] font-bold text-slate-500">{label}</p><strong className="block text-3xl mt-2 text-slate-900">{value}</strong><p className="text-xs text-slate-500 mt-1">{detail}</p></div><Icon className="rounded-full bg-cyan-100 text-[#1C465F] p-3 shrink-0" size={48}/></div>;
}
function SectionTitle({ title, detail }) {
  return <div className="text-center mb-7"><h2 className="text-2xl font-extrabold text-slate-900">{title}</h2><p className="text-sm text-slate-500 mt-2">{detail}</p></div>;
}
function LeaderList({ title, rows, metric, suffix = 'kali' }) {
  return <div className="rounded-2xl border bg-white overflow-hidden"><h3 className="bg-[#1C465F] text-white px-5 py-4 text-xs font-bold uppercase tracking-wide">{title}</h3><div className="p-5 space-y-4">{rows.length ? rows.map(row => <div key={row.nip} className="flex justify-between gap-4 text-xs border-b border-slate-100 pb-3"><span>{row.nama}<small className="block text-slate-500 mt-1">{row.unit}</small></span><strong className="shrink-0">{row[metric]} {suffix}</strong></div>) : <p className="text-xs text-slate-500">Tidak ada catatan.</p>}</div></div>;
}

function PunctualCard({ row, index }) {
  return <article className="rounded-2xl overflow-hidden border bg-[#1C465F] text-white">
    <div className="h-56 relative">
      <EmployeePhoto src={row.photo} name={row.nama} className="h-full w-full"/>
      <span className="absolute left-3 top-3 text-xs bg-white text-[#1C465F] rounded-full px-2 py-1 font-bold">#{index + 1}</span><span className="absolute right-3 top-3 bg-[#1C465F] rounded-full px-2 py-1 text-xs font-bold">{ratio(row.onTime, row.assessed)}</span>
    </div>
    <div className="p-4"><h4 className="text-sm font-bold min-h-10">{row.nama}</h4><p className="text-[10px] mt-2 text-cyan-100">{row.unit}</p><p className="text-xs mt-3">{row.onTime}/{row.assessed} hari tepat waktu</p><p className="text-xs mt-1 text-cyan-100">Rata-rata datang {clock(row.avgArrival)}</p></div>
  </article>;
}

export function MonthlyRecap({ endpoint, publicView = false, role = '' }) {
  const wrapper = useRef(null), header = useRef(null);
  const [month, setMonth] = useState(''), [unit, setUnit] = useState('');
  const [data, setData] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [reload, setReload] = useState(0);
  const [activeSection, setActiveSection] = useState('ringkasan');
  const [busy, setBusy] = useState(false);
  const canChoosePeriod = !publicView && isRecapAdmin(role);
  useEffect(() => {
    if (!header.current) return;
    const updateOffset = () => wrapper.current?.style.setProperty('--wrap-scroll-offset', `${header.current.getBoundingClientRect().height + 20}px`);
    updateOffset();
    const observer = new ResizeObserver(updateOffset);
    observer.observe(header.current);
    return () => observer.disconnect();
  }, [publicView]);
  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      setLoading(true);
      try {
        const result = await sendClaimRequest(endpoint, publicView ? { action: 'rekap_bulanan_publik' } : { action: 'rekap_bulanan_tersimpan', month }, fetch, { timeoutMs: 120000 });
        if (result.wrapVersion !== 2 || !Array.isArray(result.employees) || !Array.isArray(result.months)) throw Error('Deploy backend terbaru untuk mengaktifkan rekap satu bulan kalender.');
        if (publicView && (result.publicView !== true || result.publicationVersion !== 1 || typeof result.published !== 'boolean')) throw Error('Backend publikasi rekap belum diperbarui. Hubungi admin; data langsung tidak ditampilkan sebagai rekap tersimpan.');
        if (!cancelled) { setData(result); setError(''); }
      } catch (err) { if (!cancelled) setError(err.message); }
      finally {
        if (!cancelled) setLoading(false);
      }
    }
    refresh();
    return () => { cancelled = true; };
  }, [endpoint, month, reload, publicView]);
  const view = useMemo(() => monthlyView(data, unit, data?.publicView || publicView), [data, unit, publicView]);
  const { rows, units, chosenUnit, documents, trips, days, dailyWfo, earliest, discipline, punctual, destinations, groups, top } = view;
  const todayParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  const todayMonth = `${todayParts.find(part => part.type === 'year').value}-${todayParts.find(part => part.type === 'month').value}`;
  const selectedMonth = month || data?.month || todayMonth;
  const selectedYear = selectedMonth.slice(0, 4), selectedNumber = selectedMonth.slice(5, 7);
  const currentYear = new Date().getFullYear();
  const years = [...new Set([selectedYear, ...(data?.months || []).map(value => value.slice(0, 4)), ...Array.from({ length: 7 }, (_, i) => String(currentYear + 1 - i))])].sort().reverse();
  const chooseMonth = value => { setMonth(value); setData(null); setError(''); setLoading(true); };
  const coverage = data?.coverage || {};
  const updated = data?.updatedAt ? new Date(data.updatedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' }) : '';
  const visibleGroups = groups.filter(group => !chosenUnit || group.name === chosenUnit);
  const countPeople = total(visibleGroups.map(group => ({ count: group.people.length })), 'count');
  const savePublication = result => setData(current => result.data || (current ? { ...current, publication: result.publication } : current));
  const periodControls = <>
    {canChoosePeriod ? <>
      <label className="sr-only" htmlFor="wrap-month">Bulan rekap</label><select id="wrap-month" disabled={busy} value={selectedNumber} onChange={event => chooseMonth(`${selectedYear}-${event.target.value}`)} className="border rounded-lg p-2 bg-white">{Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(value => <option key={value} value={value}>{monthLabel(`2026-${value}`).replace(' 2026', '')}</option>)}</select>
      <label className="sr-only" htmlFor="wrap-year">Tahun rekap</label><select id="wrap-year" disabled={busy} value={selectedYear} onChange={event => chooseMonth(`${event.target.value}-${selectedNumber}`)} className="border rounded-lg p-2 bg-white">{years.map(value => <option key={value}>{value}</option>)}</select>
    </> : data?.month ? <span className="rounded-full bg-slate-100 px-3 py-2 font-semibold">{monthLabel(data.month)}</span> : null}
  </>;
  const filterControls = <>
    <select aria-label="Filter SubUnit Kerja" value={chosenUnit} onChange={event => setUnit(event.target.value)} className="border rounded-full p-2 bg-slate-50 max-w-[250px]"><option value="">Semua SubUnit Kerja</option>{units.map(value => <option key={value}>{value}</option>)}</select>
    <button aria-label="Muat ulang rekap" title={publicView ? 'Muat ulang rekap yang dipublikasikan admin' : 'Muat ulang data terbaru'} disabled={loading || busy} onClick={() => setReload(value => value + 1)} className="p-2 border rounded-full bg-white disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/></button>
  </>;

  return <div ref={wrapper} className={`${publicView ? 'w-full' : 'max-w-7xl mx-auto'} text-slate-800 [&_section[id]]:scroll-mt-[var(--wrap-scroll-offset,12rem)]`} aria-label="Rekap Bulanan">
    <header ref={header} className={`sticky top-0 z-30 bg-[#F8FAFC] border-b border-slate-200 shadow-sm ${publicView ? '' : 'rounded-t-2xl'}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">{publicView && <PkpLogo className="!h-10 !w-10"/>}<div><h1 className={`${publicView ? 'text-sm md:text-base' : 'text-lg'} font-extrabold text-[#1C465F]`}>{publicView ? 'Direktorat Pembangunan Perumahan Perdesaan' : 'Rekap Kinerja & Kedisiplinan'}</h1>{!publicView && <p className="text-[11px] text-slate-500">Direktorat Pembangunan Perumahan Perdesaan</p>}</div></div>
        {publicView ? <a href="#/" className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-[#0E5B73] py-2"><ArrowLeft size={14}/>Kembali ke Beranda</a> : <div className="flex flex-wrap items-center gap-2 text-xs">{periodControls}{filterControls}</div>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Bagian rekap" className="flex gap-1 overflow-auto text-xs font-semibold max-w-full">{navigation.map(([id, label, Icon]) => <a key={id} href={`#rekap-${id}`} aria-current={activeSection === id ? 'location' : undefined} onClick={event => { event.preventDefault(); setActiveSection(id); document.getElementById(`rekap-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className={`flex items-center gap-2 px-3 py-2 rounded-full shrink-0 ${activeSection === id ? 'bg-cyan-100 text-[#1C465F]' : 'text-slate-500 hover:bg-slate-100'}`}><Icon size={14}/>{label}</a>)}</nav>
        {publicView && <div className="flex flex-wrap items-center gap-2 text-xs">{periodControls}{filterControls}</div>}
      </div>
      </div>
    </header>
    {loading && !data && <p role="status" className="p-8 text-slate-500">Memuat rekap bulanan...</p>}
    {error && <div role="alert" className="bg-amber-50 text-amber-900 rounded-xl p-4 my-4 text-sm max-w-7xl mx-auto">{error}{data && <p className="mt-1">Hasil terakhir tetap ditampilkan. Gunakan tombol muat ulang untuk mencoba lagi.</p>}</div>}
    {canChoosePeriod && <WrapPublication endpoint={endpoint} data={data} month={selectedMonth} loading={loading} onBusy={setBusy} onSaved={savePublication}/>}
    {!publicView && data?.warning && <p role="alert" className="p-4 my-4 rounded-xl bg-amber-50 text-amber-900 text-sm">{data.warning}</p>}
    {data && publicView && !data.published && <p role="status" className="max-w-7xl mx-auto p-12 text-center text-slate-500">Belum ada rekap yang dipublikasikan oleh admin.</p>}
    {data && (!publicView || data.published) && <>
      <section id="rekap-ringkasan" className={`scroll-mt-48 bg-gradient-to-br from-[#204E6C] via-[#183B52] to-[#0A2235] text-white ${publicView ? '' : 'rounded-b-3xl'}`}>
        <div className="max-w-7xl mx-auto px-6 py-10 md:p-12">
        <span className="inline-flex items-center gap-2 text-[11px] tracking-wider uppercase font-bold rounded-full bg-[#C4B391] text-[#17394F] px-4 py-2"><Sparkles size={14}/>{monthLabel(data.month)} WRAP</span>
        <h2 className="text-4xl md:text-5xl leading-tight font-extrabold mt-6">Rekap {monthLabel(data.month)}<br/><span className="text-[#C4B391]">{rows.length ? 'sudah tersedia!' : 'menunggu data'}</span></h2>
        <p className="text-slate-200 text-sm md:text-base max-w-xl mt-5">Melihat kembali kehadiran dan kedisiplinan Direktorat Pembangunan Perumahan Perdesaan sepanjang {monthLabel(data.month)}.</p>
        <div className="grid sm:grid-cols-3 gap-4 mt-8">{[[Users, number(rows.length), 'Pegawai dengan rekap'], [Calendar, number(days.length), 'Hari kerja tercatat'], [CheckCircle2, ratio(total(rows, 'masuk'), total(rows, 'hariKerja')), 'Tingkat kehadiran']].map(([Icon, value, label]) => <div key={label} className="border border-white/20 bg-white/10 rounded-2xl p-5"><Icon className="bg-white/10 rounded-xl p-2" size={40}/><strong className="block text-4xl font-bold mt-3">{value}</strong><span className="text-xs text-slate-200">{label}</span></div>)}</div>
        <p className="text-xs text-slate-300 mt-5">Rasio kehadiran = masuk WFO/WFA/WFH ÷ hari kerja (termasuk Dinas, Cuti, dan TB; tanpa Libur). Jumlah pegawai mengikuti rekap yang sudah tersedia, bukan seluruh pegawai aktif.</p>
        </div>
      </section>
      <div className={publicView ? 'max-w-7xl mx-auto px-4 md:px-6 py-12' : ''}>
      {!publicView && <div className="flex flex-wrap justify-between gap-2 py-4 text-xs text-slate-500" aria-live="polite"><span>{updated ? `Diproses ${updated} WIB` : 'Belum diproses'}</span><span>Gunakan Proses Rekap untuk memperbarui hasil. Halaman publik berubah setelah Publikasikan.</span></div>}
      {!publicView && <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-4 text-xs text-[#1C465F] mb-8" role="status">
        Hasil proses: {coverage.available || 0} dari {coverage.submitted || 0} submisi bulan ini sudah dapat dibaca. Proses kembali untuk menyertakan data baru.
        {coverage.pending > 0 && <span> {coverage.pending} menunggu konfirmasi/perhitungan ulang.</span>}
        {coverage.unavailable > 0 && <span> {coverage.unavailable} file belum dapat dibaca; data pegawai lainnya tetap ditampilkan.</span>}
        {coverage.incomplete > 0 && <span> {coverage.incomplete} rekap memiliki tanggal belum lengkap dan belum masuk peringkat.</span>}
        {chosenUnit && <span> Status kelengkapan ini untuk seluruh SubUnit; statistik di bawah mengikuti filter.</span>}
      </div>}
      {canChoosePeriod && data.issues?.length > 0 && <details className="mb-8 border rounded-xl p-4 text-xs bg-amber-50"><summary className="cursor-pointer font-bold">Periksa sumber data ({data.issues.length})</summary><ul className="list-disc pl-5 mt-3 space-y-2">{data.issues.map((issue, i) => <li key={i}>{issue.nama}: {issue.message}</li>)}</ul></details>}
      {!rows.length ? <p className="bg-white border rounded-2xl text-center p-10 text-sm text-slate-500">{publicView ? 'Tidak ada data untuk SubUnit ini pada rekap yang dipublikasikan.' : 'Belum ada rekap terkonfirmasi untuk bulan dan SubUnit ini. Data akan muncul setelah rekap pegawai selesai diperiksa dan disimpan.'}</p> : <div className="space-y-16 pb-10">
        <section id="rekap-kehadiran" className="scroll-mt-48">
          <SectionTitle title="Statistik Kehadiran" detail="Kehadiran dan aktivitas tim sepanjang satu bulan kalender"/>
          <div className="grid md:grid-cols-3 gap-4"><Metric icon={Sun} label="Presensi paling awal" value={clock(earliest)} detail="Jam datang pada file rekap bulan terpilih"/><Metric icon={CheckCircle2} label="Total kehadiran" value={number(total(rows, 'masuk'))} detail="Hari-orang WFO/WFA/WFH"/><Metric icon={FileText} label="Dokumen diunggah" value={number(occurrences(documents))} detail="Bukti pendukung tercatat aktif"/><Metric icon={Calendar} label="Cuti" value={number(total(rows, 'cuti'))} detail="Akumulasi hari-orang cuti"/><Metric icon={Plane} label="Perjalanan dinas" value={number(occurrences(trips))} detail="Pasangan pegawai dan surat tugas"/><Metric icon={Clock} label="Total hari dinas" value={number(total(rows, 'dinas'))} detail="Akumulasi hari-orang dinas"/></div>
          <div className="grid md:grid-cols-2 gap-4 mt-5">{[['Hari teramai', dailyWfo[0]], ['Hari tersepi', dailyWfo.at(-1)]].map(([title, item], i) => <div key={title} className={`rounded-2xl p-6 flex gap-4 items-center ${i ? 'bg-[#C4B391] text-slate-800' : 'bg-[#1C465F] text-white'}`}><Users size={28}/><div><h3 className="text-[10px] uppercase tracking-widest font-bold opacity-75">{title}</h3><strong className="block mt-1">{dateLabel(item?.date)}</strong><p className="text-xs mt-1">{item?.count || 0} pegawai hadir WFO</p></div></div>)}</div>
        </section>
        <section id="rekap-unit" className="scroll-mt-48">
          <SectionTitle title="Sebaran per SubUnit Kerja" detail="Klik kartu untuk menyaring halaman; klik kembali untuk menampilkan semua unit"/>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{visibleGroups.map(group => <button key={group.name} aria-pressed={chosenUnit === group.name} onClick={() => setUnit(chosenUnit === group.name ? '' : group.name)} className="rounded-2xl border bg-white text-left overflow-hidden hover:shadow-md focus-visible:ring-2 focus-visible:ring-cyan-600"><div style={{ backgroundColor: colors[units.indexOf(group.name) % colors.length] }} className="text-white p-5 text-xs font-bold">{group.name}<span className="block mt-2 font-normal">{group.people.length} pegawai dengan rekap</span></div><div className="grid grid-cols-2 gap-px bg-slate-100">{[['Kehadiran', ratio(total(group.people, 'masuk'), total(group.people, 'hariKerja'))], ['Hari hadir', number(total(group.people, 'masuk'))], ['Perjalanan dinas', number(group.trips)], ['Hari cuti', number(total(group.people, 'cuti'))]].map(([label, value]) => <div key={label} className="bg-white p-4"><span className="text-[10px] font-semibold uppercase text-slate-500">{label}</span><strong className="block text-2xl mt-1">{value}</strong></div>)}</div></button>)}</div>
          <div className="bg-white border rounded-2xl p-5 mt-5"><h3 className="uppercase text-[10px] tracking-wide font-bold text-slate-500">Komposisi pegawai dengan rekap</h3><div aria-hidden="true" className="flex h-3 rounded-full overflow-hidden my-4">{visibleGroups.map(group => <div key={group.name} style={{ width: `${countPeople ? group.people.length / countPeople * 100 : 0}%`, backgroundColor: colors[units.indexOf(group.name) % colors.length] }}/>)}</div><div className="flex flex-wrap gap-4 text-xs">{visibleGroups.map(group => <button key={group.name} className="flex items-center gap-2" onClick={() => setUnit(chosenUnit === group.name ? '' : group.name)}><span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[units.indexOf(group.name) % colors.length] }}/>{group.name} <strong>{group.people.length}</strong><span className="text-slate-500">({ratio(group.people.length, countPeople)})</span></button>)}</div></div>
        </section>
        <section id="rekap-juara" className="scroll-mt-48 space-y-5">
          <SectionTitle title="Apresiasi Kehadiran & Kedisiplinan" detail={`Pencapaian tim pada ${monthLabel(data.month)}`}/>
          <h3 className="text-lg font-bold flex items-center gap-2"><Trophy size={22}/>Paling Tepat Waktu</h3><p className="text-xs text-slate-500">Persentase datang paling lambat pada jam masuk normal/Ramadan, tanpa flexi, dari hari WFO/WFA/WFH. Jika sama, mengikuti peringkat kehadiran. Hanya rekap dengan tanggal lengkap satu bulan yang dinilai.</p>
          <div aria-label="Kartu Paling Tepat Waktu" className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4">{punctual.map((row, i) => <PunctualCard key={row.nip} row={row} index={i}/>)}</div>
          {!punctual.length && <p className="text-sm text-slate-500 rounded-xl bg-slate-100 p-5">Belum ada rekap dengan tanggal lengkap satu bulan untuk diperingkat.</p>}
          <div aria-label="Daftar Peringkat Kehadiran" className="border rounded-2xl bg-slate-50 p-6 space-y-4"><h3 className="text-lg font-bold">Peringkat Kehadiran</h3><p className="text-xs text-slate-500">Urutan: persentase masuk/hari kerja tertinggi → hari flexi paling sedikit → menit flexi paling sedikit → jumlah masuk terbanyak. Hanya rekap dengan tanggal lengkap satu bulan yang dinilai. WFO, WFA, dan WFH dihitung sebagai masuk; Dinas/Cuti/TB bukan hari masuk.</p>{discipline.map((row, i) => <div key={row.nip} className="border-b pb-4 text-xs flex flex-wrap justify-between gap-3"><div><strong>#{i + 1} {row.nama}</strong><span className="block text-slate-500 mt-1">{row.unit}</span></div><div className="text-right"><strong className="text-teal-700">{ratio(row.masuk, row.hariKerja)}</strong><p className="text-slate-500 mt-1">{row.masuk}/{row.hariKerja} hari kerja · Flexi {row.flexi || 0} hari · {row.flexiMinutes || 0} menit</p></div></div>)}{!discipline.length && <p className="text-xs text-slate-500">Belum ada rekap lengkap untuk diperingkat.</p>}</div>
        </section>
        <section id="rekap-catatan" className="scroll-mt-48">
          <SectionTitle title="Lebih Baik di Bulan Berikutnya" detail="Catatan untuk evaluasi dan peningkatan kedisiplinan"/>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4"><LeaderList title="Terlambat" rows={top('terlambat')} metric="terlambat" suffix="hari"/><LeaderList title="Pulang sebelum waktu" rows={top('psw')} metric="psw" suffix="hari"/><LeaderList title="Tidak Absen" rows={top('unadjusted')} metric="unadjusted" suffix="kejadian"/><LeaderList title="Lupa Absen dengan Adjustment" rows={top('adjustmentReported')} metric="adjustmentReported" suffix="catatan"/></div>
        </section>
        <section id="rekap-dinas" className="scroll-mt-48 text-center">
          <SectionTitle title="Tujuan Perjalanan Dinas" detail="Tujuan pada surat tugas yang diklaim untuk rekap bulan ini"/>
          <div className="flex flex-wrap justify-center gap-3">{destinations.map(([name, count]) => <span key={name} className="border bg-white rounded-full px-4 py-2 text-xs">{name} <strong className="ml-2 bg-cyan-50 rounded-full px-2 py-1 text-[#1C465F]">{count}×</strong></span>)}</div>
          {!destinations.length && <p className="text-sm text-slate-500">Belum ada surat tugas yang tercatat untuk pilihan ini.</p>}
          <div className="bg-gradient-to-br from-[#204E6C] to-[#132B3B] rounded-2xl p-8 text-white max-w-3xl mx-auto mt-7"><strong className="block text-5xl font-extrabold">{number(occurrences(trips))}</strong><p className="font-bold mt-2">Total Perjalanan Dinas</p><p className="text-xs text-slate-300 mt-2">Dihitung per pegawai dan surat tugas pada {monthLabel(data.month)}</p></div>
        </section>
        <footer className="text-center text-sm text-slate-500 border-t pt-8">Terima kasih untuk kontribusi seluruh tim. Mari terus meningkatkan kehadiran dan kedisiplinan bersama.</footer>
      </div>}
      </div>
    </>}
  </div>;
}
