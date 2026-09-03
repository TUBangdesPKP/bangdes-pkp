import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  HelpCircle, 
  MessageCircle, 
  User, 
  Trophy, 
  ChevronRight, 
  FileBarChart, 
  ArrowLeft,
  Search,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  LogOut,
  FileCheck,
  KeyRound,
  RotateCcw,
  UploadCloud,
  FileSpreadsheet
} from 'lucide-react';

const colors = {
  krem: '#F2EEDF',
  khaki: '#D5C58A',
  darkAqua: '#0E5B73',
  midnightGreen: '#084C61',
  white: '#FFFFFF',
  textMain: '#1A202C',
  textMuted: '#718096',
  bgGray: '#F7FAFC'
};

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyFp99KsR0PfXVG3IhQ1X2s2n0h44yRhRQuW9tQtxxiXfnUNiQicfpJBGbQwrApYlXw/exec";

const getDriveDirectUrl = (url) => {
  if (!url) return '';
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }
  return url;
};

const normalizePegawai = (item) => {
  if (!item || typeof item !== 'object') return {};
  const normalized = {};
  for (const [key, value] of Object.entries(item)) {
    const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    normalized[cleanKey] = typeof value === 'string' ? value.trim() : (value ?? '');
  }
  return {
    NIP: normalized.nip || '',
    Nama: normalized.nama || '',
    SubUnitKerja: normalized.subunitkerja || normalized.subunit || '',
    Jabatan: normalized.jabatan || '',
    KelasJabatan: normalized.kelasjabatan || normalized.kelas || '',
    EmailDinas: normalized.emaildinas || normalized.email || '',
    AtasanLangsung: normalized.atasanlangsung || normalized.atasan || '',
    Foto_Pegawai: normalized.fotopegawai || normalized.foto || '',
    PIN: normalized.pin || '',
    Akun_Role: normalized.akunrole || normalized.role || 'pegawai'
  };
};

const fetchPegawaiData = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = localStorage.getItem('cached_pegawai_json');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return { data: parsed, source: 'cache' };
        }
      } catch (e) {
        console.error(e);
      }
    }
  }

  try {
    const res = await fetch(APPS_SCRIPT_URL);
    if (!res.ok) throw new Error("HTTP error " + res.status);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const normalizedList = data.map(normalizePegawai);
      localStorage.setItem('cached_pegawai_json', JSON.stringify(normalizedList));
      return { data: normalizedList, source: 'live' };
    }
  } catch (err) {
    console.warn("Direct fetch gagal, mencoba proxy...", err);
  }

  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(APPS_SCRIPT_URL)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error("Proxy error");
    const json = await res.json();
    const data = JSON.parse(json.contents);
    if (Array.isArray(data) && data.length > 0) {
      const normalizedList = data.map(normalizePegawai);
      localStorage.setItem('cached_pegawai_json', JSON.stringify(normalizedList));
      return { data: normalizedList, source: 'proxy' };
    }
  } catch (err) {
    console.warn("Proxy fetch gagal...", err);
  }

  const cached = localStorage.getItem('cached_pegawai_json');
  if (cached) {
    try {
      return { data: JSON.parse(cached), source: 'cache' };
    } catch (e) {
      console.error(e);
    }
  }

  return { data: [], source: 'empty' };
};

const parsePDFPresensi = async (file) => {
  if (!window.pdfjsLib) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageString = textContent.items.map(item => item.str).join(' ');
    fullText += ' ' + pageString;
  }

  const namaMatch = fullText.match(/Nama\s*:\s*([^NIPPeriode]+)/i);
  const nipMatch = fullText.match(/NIP\s*:\s*(\d+)/i);
  const periodeMatch = fullText.match(/Periode\s*:\s*(\d{2}-\d{2}-\d{4})\s*s\/d\s*(\d{2}-\d{2}-\d{4})/i);

  const nama = namaMatch ? namaMatch[1].trim() : '';
  const nip = nipMatch ? nipMatch[1].trim() : '';
  const periode = periodeMatch ? `${periodeMatch[1]} s/d ${periodeMatch[2]}` : '';

  let expectedDays = 31;
  let periodeFolder = 'Periode_2026-08';

  if (periodeMatch) {
    const parts = periodeMatch[1].split('-');
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    expectedDays = new Date(year, month, 0).getDate();
    periodeFolder = `Periode_${year}-${String(month).padStart(2, '0')}`;
  }

  const rows = [];
  const datePattern = /(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu),\s*(\d{1,2})\s*(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s*(\d{4})/gi;
  const matches = [...fullText.matchAll(datePattern)];

  const seenDates = new Set();
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const hari = match[1];
    const tgl = match[2];
    const bln = match[3];
    const thn = match[4];
    const dateKey = `${tgl} ${bln.slice(0, 3)} ${thn}`;

    if (seenDates.has(dateKey)) continue;
    seenDates.add(dateKey);

    const startIndex = match.index;
    const endIndex = (i + 1 < matches.length) ? matches[i + 1].index : fullText.length;
    const block = fullText.substring(startIndex, endIndex);

    const times = [...block.matchAll(/(\d{2}:\d{2})\s*WIB/g)].map(m => m[1]);
    const datang = times[0] || '-';
    const pulang = times.length > 1 ? times[1] : (times[0] && hari !== 'Sabtu' && hari !== 'Minggu' ? times[0] : '-');

    const cleanLocation = (text) => {
      if (!text || text === '-') return '-';
      let cleaned = text.replace(/\b\d{2}:\d{2}\b/g, '').replace(/\bWIB\b/g, '').trim();
      cleaned = cleaned.replace(/\b(Msk|Tit|S|I|TK|D|TL|TB|C|L|HK|WK|Telat|PSW|PL)\b/gi, '').replace(/\b\d+\b/g, '').trim();
      cleaned = cleaned.replace(/\s+/g, ' ');
      if (!cleaned || cleaned.length < 2) return '-';
      const knownLocs = ['BTN Center', 'Wisma Mandiri 2', 'Kantor Pusat', 'Kementerian PKP'];
      for (const loc of knownLocs) {
        if (cleaned.includes(loc)) return loc;
      }
      return cleaned.length > 25 ? 'BTN Center' : cleaned;
    };

    const lokasiMatches = [...block.matchAll(/([A-Za-z0-9\s.,-]+(?:Center|Mandiri|Kantor|Satker|Direktorat)[A-Za-z0-9\s.,-]*)/gi)];
    let lokasiDatang = '-';
    let lokasiPulang = '-';

    if (lokasiMatches.length > 0) {
      lokasiDatang = cleanLocation(lokasiMatches[0][1]);
      lokasiPulang = lokasiMatches.length > 1 ? cleanLocation(lokasiMatches[1][1]) : lokasiDatang;
    } else if (datang !== '-') {
      lokasiDatang = 'BTN Center';
      lokasiPulang = 'BTN Center';
    }

    let status = '-';
    if (/WFO/i.test(block)) status = 'WFO';
    else if (/WFA/i.test(block)) status = 'WFA';
    else if (/WFH/i.test(block)) status = 'WFH';
    else if (/Libur/i.test(block) || hari === 'Sabtu' || hari === 'Minggu') status = 'Libur';
    else if (/Cuti/i.test(block)) status = 'Cuti';
    else if (/Dinas/i.test(block)) status = 'Dinas';

    rows.push({
      tanggal: dateKey,
      hari,
      datang,
      lokasiDatang: datang !== '-' ? lokasiDatang : '-',
      pulang: (pulang !== datang || times.length > 1) ? pulang : '-',
      lokasiPulang: (pulang !== datang || times.length > 1) ? lokasiPulang : '-',
      keterangan: status === '-' && datang !== '-' ? 'WFO' : status
    });
  }

  rows.sort((a, b) => {
    const da = parseInt(a.tanggal.split(' ')[0], 10);
    const db = parseInt(b.tanggal.split(' ')[0], 10);
    return da - db;
  });

  const totalHariMasuk = rows.filter(r => (r.keterangan === 'WFO' || r.keterangan === 'WFA' || r.keterangan === 'Dinas') && r.datang !== '-').length;

  return {
    nama,
    nip,
    periode,
    periodeFolder,
    expectedDays,
    totalRows: rows.length,
    rows,
    totalHariMasuk,
    isValid: rows.length === expectedDays
  };
};

const Header = ({ navigate, loggedInUser, onLogoutRequest }) => {
  return (
    <header className="w-full bg-white border-b border-gray-100 sticky top-0 z-10 px-4 md:px-8 py-4 flex justify-between items-center shadow-xs">
      <div 
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => navigate('home')}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shadow-sm transition-transform group-hover:scale-105" style={{ backgroundColor: colors.midnightGreen }}>
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Pancasila_Coat_of_Arms_of_Indonesia.svg/800px-Pancasila_Coat_of_Arms_of_Indonesia.svg.png" alt="Logo" className="w-5 h-5 object-contain filter brightness-0 invert" />
        </div>
        <div>
          <h1 className="font-extrabold text-base md:text-lg leading-tight tracking-tight" style={{ color: colors.midnightGreen }}>Direktorat Pembangunan Perumahan Perdesaan Kementerian PKP</h1>
          <p className="text-[10px] text-gray-500 font-medium">Support System</p>
        </div>
      </div>
      
      <div className="hidden md:flex items-center gap-6 text-sm font-medium" style={{ color: colors.midnightGreen }}>
        <button onClick={() => navigate('home')} className="hover:opacity-80 transition-opacity">Beranda</button>
        <button className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
          <MessageCircle size={16} /> Bantuan
        </button>
        <button className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
          <HelpCircle size={16} /> FAQ
        </button>
      </div>

      <div className="flex items-center gap-3">
        {loggedInUser ? (
          <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-extrabold text-gray-800">{loggedInUser.Nama}</p>
              <p className="text-[10px] text-teal-700 font-semibold">{loggedInUser.Akun_Role === 'admin' ? 'Super Admin' : 'Pegawai'}</p>
            </div>
            <button 
              onClick={() => navigate('absensi-uang-makan')}
              className="px-3 py-1.5 text-xs font-bold bg-teal-50 text-teal-800 rounded-lg hover:bg-teal-100 transition-colors"
            >
              Panel Utama
            </button>
            <button 
              onClick={onLogoutRequest}
              className="px-3 py-1.5 text-xs font-bold bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
            >
              <LogOut size={14} /> Keluar
            </button>
          </div>
        ) : (
          <button 
            onClick={() => navigate('login')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold text-white shadow-sm transition-transform hover:scale-105"
            style={{ backgroundColor: colors.midnightGreen }}
          >
            <User size={16} /> Login Sistem
          </button>
        )}
      </div>
    </header>
  );
};

const DashboardHome = ({ navigate, loggedInUser }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
        <div className="flex-1">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider mb-3 uppercase shadow-2xs" style={{ backgroundColor: colors.krem, color: colors.midnightGreen }}>
              Sistem Kepegawaian
            </span>
            <h1 className="text-3xl md:text-4xl font-black mb-4 leading-tight" style={{ color: colors.midnightGreen }}>
              Dashboard data dan Informasi Direktorat Pembangunan Perumahan Perdesaan
            </h1>
            <p className="text-gray-600 text-base md:text-lg max-w-xl leading-relaxed font-normal mb-6">
              Data kepegawaian, pemantauan kedisiplinan berkala, serta arsip dokumentasi resmi Direktorat Pembangunan Perumahan Perdesaan.
            </p>
            
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => navigate('profile')}
                className="px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 shadow-sm transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: colors.midnightGreen }}
              >
                <Briefcase size={18} /> Lihat Bank Data Pegawai
              </button>

              <button 
                onClick={() => navigate(loggedInUser ? 'absensi-uang-makan' : 'login')}
                className="px-6 py-3 rounded-xl font-bold text-gray-800 bg-white border border-gray-200 flex items-center gap-2 shadow-sm transition-transform hover:scale-[1.02]"
              >
                <span className="text-teal-700 font-bold">↑</span> Upload Dokumen Pendukung
              </button>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[400px] flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="px-5 py-4 text-white font-bold text-sm flex items-center gap-2" style={{ backgroundColor: colors.midnightGreen }}>
              <Trophy size={16} /> PALING DISIPLIN • PERIODE BERKALA
            </div>
            <div className="p-8 text-center">
              <p className="text-xs text-gray-400 italic">
                Data kedisiplinan berkala akan segera diperbarui secara berkala dari sumber data resmi.
              </p>
            </div>
          </div>

          <div 
            onClick={() => navigate('rekap')}
            className="rounded-xl p-4 flex items-center justify-between cursor-pointer text-white shadow-sm hover:shadow-md transition-all active:scale-[0.98]" 
            style={{ backgroundColor: colors.midnightGreen }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/10">
                <FileBarChart size={20} />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">REKAP BULANAN</div>
                <div className="font-bold text-sm">Rekap Kinerja & Kedisiplinan</div>
              </div>
            </div>
            <ChevronRight size={20} className="opacity-80" />
          </div>
        </div>
      </div>
    </div>
  );
};

const LoginView = ({ navigate, onLoginSuccess }) => {
  const [step, setStep] = useState(1);
  const [loginNip, setLoginNip] = useState('');
  const [targetUser, setTargetUser] = useState(null);
  const [pinDigits, setPinDigits] = useState(['', '', '', '', '', '']);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const cleanNip = loginNip.trim().toLowerCase();
  const isNipAdmin = cleanNip === 'admin';
  const isNipComplete = cleanNip.length > 0;
  const pinValue = pinDigits.join('');
  const isPinComplete = pinValue.length === 6;

  const handleNipSubmit = async (e) => {
    e.preventDefault();
    if (!isNipComplete) return;

    if (isNipAdmin) {
      setTargetUser({
        NIP: 'SUPERADMIN',
        Nama: 'Super Administrator',
        Akun_Role: 'admin',
        SubUnitKerja: 'Direktorat Pembangunan Perumahan Perdesaan',
        Jabatan: 'Super Administrator Sistem Informasi',
        AtasanLangsung: 'Direktur Jenderal',
        KelasJabatan: '17',
        EmailDinas: 'admin.bangdes@pkp.go.id',
        Foto_Pegawai: '',
        PIN: '111111'
      });
      setMessage({ type: '', text: '' });
      setPinDigits(['', '', '', '', '', '']);
      setStep(2);
      setTimeout(() => document.getElementById('pin-box-0')?.focus(), 100);
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { data } = await fetchPegawaiData(false);
      if (!data || data.length === 0) {
        throw new Error("Data spreadsheet kosong.");
      }

      const inputNip = loginNip.trim();
      const found = data.find(item => item.NIP === inputNip);

      if (found) {
        setTargetUser(found);
        setPinDigits(['', '', '', '', '', '']);
        setStep(2);
        setTimeout(() => document.getElementById('pin-box-0')?.focus(), 100);
      } else {
        setMessage({ type: 'error', text: 'NIP tidak ditemukan dalam database kepegawaian.' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Gagal terhubung ke database. Silakan coba kembali.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (index, value) => {
    const val = value.replace(/\D/g, '');
    if (!val && value !== '') return;

    const newPinDigits = [...pinDigits];
    newPinDigits[index] = val ? val[val.length - 1] : '';
    setPinDigits(newPinDigits);

    if (val && index < 5) {
      const nextInput = document.getElementById(`pin-box-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      const prevInput = document.getElementById(`pin-box-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handlePinPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setPinDigits(newDigits);
    const nextFocus = Math.min(pasted.length, 5);
    document.getElementById(`pin-box-${nextFocus}`)?.focus();
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (!isPinComplete) return;

    const isSuperAdmin = targetUser && targetUser.NIP === 'SUPERADMIN';
    if (isSuperAdmin && pinValue === '111111') {
      onLoginSuccess(targetUser);
      navigate('absensi-uang-makan');
      return;
    }

    const sheetPin = (targetUser?.PIN || '').toString().trim();
    if (sheetPin === pinValue) {
      onLoginSuccess(targetUser);
      navigate('absensi-uang-makan');
    } else {
      setMessage({ type: 'error', text: 'PIN salah. Silakan coba kembali.' });
      setPinDigits(['', '', '', '', '', '']);
      setTimeout(() => document.getElementById('pin-box-0')?.focus(), 50);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-8">
        {step === 1 ? (
          <div>
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-4 text-white shadow-sm" style={{ backgroundColor: colors.midnightGreen }}>
                <User size={24} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">Login Sistem</h2>
              <p className="text-xs text-gray-500">Masukkan NIP Anda untuk masuk ke sistem.</p>
            </div>

            {message.text && (
              <div className="p-4 rounded-2xl text-xs mb-6 flex items-center gap-3 bg-red-50 text-red-800 border border-red-100">
                <AlertCircle size={18} className="text-red-600 shrink-0" />
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleNipSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">NIP</label>
                <input 
                  type="text" 
                  placeholder="Masukkan NIP"
                  value={loginNip}
                  onChange={(e) => setLoginNip(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-700 text-center tracking-widest font-semibold"
                />
              </div>

              <button 
                type="submit"
                disabled={!isNipComplete || loading}
                className={`w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-md transition-all mt-4 ${
                  isNipComplete && !loading
                    ? 'opacity-100 hover:opacity-95 active:scale-[0.99] cursor-pointer' 
                    : 'opacity-40 cursor-not-allowed'
                }`}
                style={{ backgroundColor: colors.midnightGreen }}
              >
                {loading ? 'Memeriksa NIP...' : 'Lanjutkan'}
              </button>
            </form>

            <div className="mt-8 pt-4 border-t border-gray-100 text-center">
              <button onClick={() => navigate('home')} className="text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center justify-center gap-1 mx-auto">
                <ArrowLeft size={14} /> Kembali ke Beranda
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <button 
                type="button"
                onClick={() => { setStep(1); setMessage({ type: '', text: '' }); setPinDigits(['', '', '', '', '', '']); }} 
                className="text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft size={14} /> Kembali
              </button>
            </div>

            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 text-[#0E5B73] bg-[#DDF1F5] shadow-xs">
                <KeyRound size={28} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">Profil Pegawai</h2>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Halo <strong className="text-gray-800 font-bold">{targetUser?.Nama}</strong>, masukkan PIN Anda
              </p>
            </div>

            {message.text && (
              <div className="p-4 rounded-2xl text-xs mb-6 flex items-center gap-3 bg-red-50 text-red-800 border border-red-100">
                <AlertCircle size={18} className="text-red-600 shrink-0" />
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handlePinSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-4 text-center">Masukkan PIN</label>
                <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePinPaste}>
                  {pinDigits.map((digit, index) => (
                    <input
                      key={index}
                      id={`pin-box-${index}`}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinChange(index, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(index, e)}
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-[#0E5B73] focus:ring-2 focus:ring-[#DDF1F5] transition-all shadow-2xs"
                    />
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                disabled={!isPinComplete}
                className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md transition-all ${
                  isPinComplete 
                    ? 'text-white opacity-100 hover:opacity-95 active:scale-[0.99] cursor-pointer' 
                    : 'text-white/90 opacity-50 cursor-not-allowed'
                }`}
                style={{ backgroundColor: isPinComplete ? colors.midnightGreen : '#849BAA' }}
              >
                Masuk
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

const getPeriodEvents = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  let tukinYear = currentYear;
  let tukinMonth = currentMonth;
  if (currentDay < 11 && currentMonth === 1) {
    tukinYear = currentYear - 1;
    tukinMonth = 12;
  } else if (currentDay < 11) {
    tukinMonth = currentMonth - 1;
  }

  const tukinStartDate = new Date(tukinYear, tukinMonth - 1, 11);
  const tukinEndDate = new Date(tukinYear, tukinMonth, 10);
  const paymentMonthDate = new Date(tukinYear, tukinMonth, 1);

  const formatShortDate = (d) => `${d.getDate()} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()]} ${d.getFullYear()}`;
  const formatNumDate = (d) => `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
  const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const paymentMonthName = monthNames[paymentMonthDate.getMonth()];

  const tukinId = `tukin-${tukinYear}-${String(tukinMonth).padStart(2, '0')}`;
  const tukinFolder = `Periode_Tukin_${tukinYear}-${String(tukinMonth).padStart(2, '0')}`;

  return {
    'uang-makan': [
      {
        id: 'um-2026-08',
        status: 'DIBUKA',
        title: 'Bukti Dukung Uang Makan Agustus 2026',
        periodeLabel: '1 Agu 2026 – 31 Agu 2026',
        periodeEvent: '01-08-2026 s/d 31-08-2026',
        startDate: '01-08-2026',
        endDate: '31-08-2026',
        periodeFolder: 'Periode_2026-08',
        tipe: 'Uang Makan',
        expectedDays: 31
      }
    ],
    'tukin': [
      {
        id: tukinId,
        status: 'DIBUKA',
        title: `Bukti Dukung Tunjangan Kinerja Bulan ${paymentMonthName} ${paymentMonthDate.getFullYear()}`,
        periodeLabel: `${formatShortDate(tukinStartDate)} – ${formatShortDate(tukinEndDate)}`,
        periodeEvent: `${formatNumDate(tukinStartDate)} s/d ${formatNumDate(tukinEndDate)}`,
        startDate: formatNumDate(tukinStartDate),
        endDate: formatNumDate(tukinEndDate),
        periodeFolder: tukinFolder,
        tipe: `Tunjangan Kinerja (Pembayaran ${paymentMonthName} ${paymentMonthDate.getFullYear()})`,
        expectedDays: 31
      }
    ]
  };
};

const UserDashboardView = ({ loggedInUser, onLogoutRequest, navigate, currentView }) => {
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const [pendingTargetView, setPendingTargetView] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const getModuleKey = (view) => {
    switch(view) {
      case 'absensi-uang-makan': return 'uang-makan';
      case 'absensi-tunjangan-kinerja': return 'tukin';
      case 'arsip-surat-tugas': return 'spt';
      case 'arsip-surat-cuti': return 'cuti';
      default: return 'uang-makan';
    }
  };

  const activeTab = getModuleKey(currentView);
  const PERIOD_EVENTS = getPeriodEvents();

  useEffect(() => {
    setSelectedPeriod(null);
    resetUploadState();
  }, [currentView]);

  const handleTabClick = (targetView) => {
    if (selectedFile && !submitResult) {
      setPendingTargetView(targetView);
      setShowConfirmModal(true);
    } else {
      setSelectedPeriod(null);
      resetUploadState();
      navigate(targetView);
    }
  };

  const confirmSwitchModule = (proceed) => {
    if (proceed) {
      if (pendingTargetView === 'BACK_TO_PERIODS') {
        setSelectedPeriod(null);
        resetUploadState();
      } else if (pendingTargetView) {
        setSelectedPeriod(null);
        resetUploadState();
        navigate(pendingTargetView);
      }
    }
    setShowConfirmModal(false);
    setPendingTargetView(null);
  };

  const resetUploadState = () => {
    setSelectedFile(null);
    setParsedData(null);
    setSubmitResult(null);
    setIsParsing(false);
    setIsSubmitting(false);
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setSubmitResult(null);
      setIsParsing(true);

      try {
        const result = await parsePDFPresensi(file);
        setParsedData(result);
      } catch (err) {
        console.error("Gagal membaca PDF:", err);
        alert("Gagal membaca struktur PDF presensi. Pastikan file bukan hasil scan atau foto.");
        setSelectedFile(null);
        setParsedData(null);
      } finally {
        setIsParsing(false);
      }
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile || !parsedData || !parsedData.isValid) return;

    setIsSubmitting(true);
    try {
      const base64Data = await fileToBase64(selectedFile);
      const payload = {
        modul: activeTab,
        // Ubah bagian ini agar menggunakan data dari parsedData (hasil ekstrak PDF)
        nip: parsedData.nip || loggedInUser.NIP,
        nama: parsedData.nama || loggedInUser.Nama,
        periode: parsedData.periode || '01-08-2026 s/d 31-08-2026',
        bulanTahun: parsedData.periodeFolder || 'Periode_2026-08',
        fileName: selectedFile.name,
        fileBase64: base64Data,
        ringkasan: {
          totalHariKalender: parsedData.expectedDays,
          totalHariMasuk: parsedData.totalHariMasuk,
          totalJamKerja: '163j 30m',
          totalTelat: '0',
          totalPSW: '0'
        }
      };

      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.status === 'success') {
        setSubmitResult({ type: 'success', message: 'Data dan dokumen berhasil disimpan ke Google Drive & Database!', url: json.fileUrl });
      } else {
        throw new Error(json.message || 'Gagal menyimpan data');
      }
    } catch (err) {
      console.error(err);
      setSubmitResult({ type: 'error', message: 'Gagal mengunggah ke server: ' + err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPeriodList = PERIOD_EVENTS[activeTab] || [];
  const firstName = loggedInUser?.Nama?.split(/[\s,]+/)[0] || 'Rekan';

  return (
    <div className="min-h-screen bg-[#112233] flex flex-col md:flex-row text-gray-100 font-sans relative">
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white text-gray-900 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-xl font-black mb-2">Konfirmasi Pindah Halaman</h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              Anda telah memilih dokumen yang belum disimpan. Apakah Anda yakin ingin keluar? Berkas yang dipilih akan dibatalkan.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => confirmSwitchModule(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Tetap Disini
              </button>
              <button 
                onClick={() => confirmSwitchModule(true)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
              >
                Ya, Batalkan
              </button>
            </div>
          </div>
        </div>
      )}

      <aside className="w-full md:w-72 bg-[#091522] border-r border-white/5 flex flex-col justify-between p-6 shrink-0">
        <div>
          <div className="mb-8">
            <div className="text-[10px] font-bold text-teal-400 uppercase tracking-widest mb-1">Profil Pegawai</div>
            <div className="text-xs font-medium text-gray-300">{loggedInUser?.SubUnitKerja || 'Direktorat Pembangunan Perumahan Perdesaan'}</div>
          </div>

          <div className="flex items-center gap-3 mb-8 p-3 rounded-2xl bg-white/5 border border-white/5">
            {loggedInUser?.Foto_Pegawai ? (
              <img src={getDriveDirectUrl(loggedInUser.Foto_Pegawai)} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-teal-500/30" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-teal-700 font-bold flex items-center justify-center text-white text-sm">
                {loggedInUser?.Nama ? loggedInUser.Nama.charAt(0) : 'A'}
              </div>
            )}
            <div className="overflow-hidden">
              <div className="font-extrabold text-xs text-white truncate">{loggedInUser?.Nama || 'Pengguna'}</div>
              <div className="text-[10px] text-gray-400 truncate">NIP {loggedInUser?.NIP || '-'}</div>
            </div>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => handleTabClick('absensi-uang-makan')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'uang-makan' ? 'bg-[#D5C58A] text-gray-900 shadow-md' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
            >
              <Calendar size={16} /> Absensi Uang Makan
            </button>
            <button 
              onClick={() => handleTabClick('absensi-tunjangan-kinerja')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'tukin' ? 'bg-[#D5C58A] text-gray-900 shadow-md' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
            >
              <FileCheck size={16} /> Absensi Tunjangan Kinerja
            </button>
            <button 
              onClick={() => handleTabClick('arsip-surat-tugas')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'spt' ? 'bg-[#D5C58A] text-gray-900 shadow-md' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
            >
              <FileText size={16} /> Arsip Surat Tugas
            </button>
            <button 
              onClick={() => handleTabClick('arsip-surat-cuti')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'cuti' ? 'bg-[#D5C58A] text-gray-900 shadow-md' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
            >
              <Clock size={16} /> Arsip Surat Cuti
            </button>
          </nav>
        </div>

        <div className="pt-6 border-t border-white/10 space-y-2">
          <button 
            onClick={() => navigate('home')}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-gray-300 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Beranda Utama
          </button>
          <button 
            onClick={onLogoutRequest}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold bg-red-950/40 text-red-300 hover:bg-red-900/50 transition-colors border border-red-900/50 cursor-pointer"
          >
            <LogOut size={14} /> Keluar
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-[#F8FAFC] text-gray-900 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          
          {!selectedPeriod ? (
            <div>
              <div className="mb-6">
                <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">
                  {activeTab === 'uang-makan' ? 'Absensi Uang Makan' : 'Absensi Tunjangan Kinerja'}
                </h1>
                <p className="text-xs text-gray-500">Pilih periode pengumpulan bukti dukung yang sedang dibuka.</p>
              </div>

              <div className="space-y-4">
                {currentPeriodList.map((period) => (
                  <div 
                    key={period.id}
                    className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#143E50] transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          {period.status}
                        </span>
                      </div>
                      <h3 className="text-lg md:text-xl font-black text-gray-900">{period.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-gray-400" />
                          {period.periodeLabel}
                        </span>
                        <span>•</span>
                        <span>{period.tipe}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedPeriod(period);
                        resetUploadState();
                      }}
                      className="px-6 py-3 rounded-2xl font-bold text-xs text-white shadow-sm flex items-center justify-center gap-2 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                      style={{ backgroundColor: '#143E50' }}
                    >
                      <UploadCloud size={16} />
                      <span>Submit</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <button 
                onClick={() => {
                  if (selectedFile && !submitResult) {
                    setPendingTargetView('BACK_TO_PERIODS');
                    setShowConfirmModal(true);
                  } else {
                    setSelectedPeriod(null);
                    resetUploadState();
                  }
                }}
                className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-4 transition-colors cursor-pointer"
              >
                <span>— Kembali</span>
              </button>

              <div 
                className="rounded-3xl p-6 sm:p-8 text-white mb-8 relative overflow-hidden shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                style={{ backgroundColor: '#143E50' }}
              >
                <div className="space-y-2">
                  <span className="inline-block px-3 py-1 rounded-md text-[10px] font-extrabold bg-white/20 tracking-wider uppercase">
                    OPEN
                  </span>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black leading-tight">
                    {selectedPeriod.title}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-gray-200">
                    <Calendar size={14} />
                    <span>{selectedPeriod.periodeLabel}</span>
                    <span>•</span>
                    <span>{selectedPeriod.tipe}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 bg-white/10 backdrop-blur-xs p-3.5 sm:p-4 rounded-2xl border border-white/15 max-w-sm self-stretch md:self-auto">
                  <p className="text-xs text-gray-200 leading-snug font-medium text-right flex-1">
                    <strong className="text-white font-bold">{firstName}</strong>, let's go, waktunya upload bukti dukungnya!
                  </p>
                  {loggedInUser?.Foto_Pegawai ? (
                    <img src={getDriveDirectUrl(loggedInUser.Foto_Pegawai)} alt="Avatar" className="w-12 h-12 rounded-full object-cover border-2 border-white/40 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0 text-sm">
                      {loggedInUser?.Nama ? loggedInUser.Nama.charAt(0) : 'U'}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 mb-8">
                {[1, 2, 3, 4, 5, 6].map((num) => {
                  const isActive = num === 3;
                  return (
                    <div
                      key={num}
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        isActive
                          ? 'bg-[#143E50] text-white ring-4 ring-[#143E50]/15 shadow-sm scale-105'
                          : 'bg-[#D9EDF7] text-[#245D77]'
                      }`}
                    >
                      {num}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-200 shadow-xs p-6 sm:p-7 space-y-6">
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 mb-1.5">Upload Bukti Dukung</h3>
                    <p className="text-xs text-gray-600 leading-relaxed font-normal">
                      Upload file bukti presensi:
                    </p>
                    <ul className="text-xs text-gray-500 mt-2 space-y-1 pl-1">
                      <li>• File hasil export dari <strong>eOffice</strong> atau <strong>myPKP</strong></li>
                      <li>• Format yang diterima: <strong>PDF Riwayat Presensi</strong></li>
                      <li>• PDF harus hasil export, <strong>bukan hasil scan atau foto</strong></li>
                    </ul>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">File Presensi</label>
                    <div className="border border-gray-200 rounded-2xl p-2 bg-white flex items-center justify-between">
                      <label className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-700 border border-gray-200 transition-colors cursor-pointer whitespace-nowrap">
                        Choose File
                        <input 
                          type="file" 
                          accept=".pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      <span className="text-xs text-gray-500 truncate px-2 font-medium">
                        {selectedFile ? selectedFile.name : 'No file chosen'}
                      </span>
                    </div>
                  </div>

                  {isParsing && (
                    <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-800 text-xs flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Mengekstrak dan memverifikasi data kalender presensi...</span>
                    </div>
                  )}

                  {parsedData && (
                    <div className="p-3.5 bg-[#EAF5FA] border border-[#CDE5F1] rounded-2xl text-xs text-[#1E5D77] flex items-center gap-2">
                      <FileSpreadsheet size={16} className="text-[#114053] shrink-0" />
                      <span>File presensi berisi <strong className="font-extrabold text-[#114053]">{parsedData.totalRows} baris data</strong></span>
                    </div>
                  )}

                  {parsedData && !parsedData.isValid && (
                    <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                      <AlertCircle size={18} className="shrink-0 text-red-600" />
                      <span>Data presensi tidak terbaca dengan benar atau format PDF tidak sesuai.</span>
                    </div>
                  )}

                  {submitResult && (
                    <div className={`p-4 rounded-2xl text-xs flex items-start gap-2 ${submitResult.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'}`}>
                      {submitResult.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0" /> : <AlertCircle size={18} className="text-red-600 shrink-0" />}
                      <div>
                        <p className="font-semibold">{submitResult.message}</p>
                        {submitResult.url && (
                          <a href={submitResult.url} target="_blank" rel="noreferrer" className="text-teal-700 underline font-bold mt-1 inline-block">
                            Buka Dokumen di Google Drive
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={handleUploadSubmit}
                    disabled={!parsedData || !parsedData.isValid || isSubmitting}
                    className={`w-full py-3.5 rounded-2xl text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                      parsedData && parsedData.isValid && !isSubmitting
                        ? 'hover:opacity-95 active:scale-[0.99] cursor-pointer' 
                        : 'opacity-40 cursor-not-allowed'
                    }`}
                    style={{ backgroundColor: colors.midnightGreen }}
                  >
                    <UploadCloud size={16} />
                    {isSubmitting ? 'Menyimpan ke Server...' : 'Proses & Simpan Bukti'}
                  </button>
                </div>

                <div className="lg:col-span-7 space-y-4">
                  {parsedData && parsedData.isValid ? (
                    <div className="p-4 rounded-2xl bg-[#D7F7E6] border border-[#A5ECC5] text-[#0A5A36] flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2 font-black text-sm">
                        <CheckCircle2 size={18} className="text-[#0A5A36]" />
                        <span>✓ Rentang Tanggal Sesuai</span>
                      </div>
                      <div className="text-xs font-extrabold text-[#0D6B41] bg-white/70 px-3 py-1 rounded-xl border border-[#A5ECC5]/50 self-start sm:self-auto">
                        Periode Event: {selectedPeriod.periodeEvent}
                      </div>
                    </div>
                  ) : null}

                  <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6">
                    <div className="mb-4">
                      <h3 className="text-sm font-black text-gray-900">Preview Data Presensi</h3>
                      <p className="text-[11px] text-gray-500 font-medium">Lokasi absen hanya tersedia pada file PDF Riwayat Presensi.</p>
                    </div>

                    <div className="overflow-x-auto max-h-[500px] border border-gray-200 rounded-2xl bg-white shadow-2xs">
                      <table className="w-full text-left text-[11px] text-gray-700 border-collapse">
                        <thead className="sticky top-0 bg-[#F8FAFC] border-b border-gray-200 text-[10px] font-black uppercase text-gray-500 tracking-wider z-10">
                          <tr>
                            <th className="py-3 px-3.5 whitespace-nowrap">TANGGAL</th>
                            <th className="py-3 px-3 whitespace-nowrap">HARI</th>
                            <th className="py-3 px-3 whitespace-nowrap">DATANG</th>
                            <th className="py-3 px-3 min-w-[130px]">LOKASI DATANG</th>
                            <th className="py-3 px-3 whitespace-nowrap">PULANG</th>
                            <th className="py-3 px-3 min-w-[130px]">LOKASI PULANG</th>
                            <th className="py-3 px-3 text-center whitespace-nowrap">KET</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                          {parsedData && parsedData.rows && parsedData.rows.length > 0 ? (
                            parsedData.rows.map((row, idx) => (
                              <tr key={idx} className={row.keterangan === 'Libur' ? 'bg-gray-50/40 text-gray-400' : 'hover:bg-teal-50/30 transition-colors'}>
                                <td className="py-3 px-3.5 font-bold text-gray-900 whitespace-nowrap">{row.tanggal}</td>
                                <td className="py-3 px-3 whitespace-nowrap">{row.hari}</td>
                                <td className={`py-3 px-3 whitespace-nowrap font-semibold ${row.datang !== '-' ? 'text-gray-900' : 'text-gray-400'}`}>{row.datang}</td>
                                <td className="py-3 px-3 text-[10px] leading-relaxed text-gray-600">{row.lokasiDatang}</td>
                                <td className={`py-3 px-3 whitespace-nowrap font-semibold ${row.pulang !== '-' ? 'text-gray-900' : 'text-gray-400'}`}>{row.pulang}</td>
                                <td className="py-3 px-3 text-[10px] leading-relaxed text-gray-600">{row.lokasiPulang}</td>
                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                  <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wide ${
                                    row.keterangan === 'WFO' || row.keterangan === 'WFA' || row.keterangan === 'Dinas'
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                      : row.keterangan === 'Libur' 
                                      ? 'bg-gray-100 text-gray-400' 
                                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                                  }`}>
                                    {row.keterangan}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="7" className="text-center py-14 text-gray-400 italic text-xs">
                                Belum ada file PDF yang dipilih untuk pratinjau data.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

const ProfileView = ({ navigate }) => {
  const [pegawaiList, setPegawaiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubUnit, setSelectedSubUnit] = useState('ALL');
  const [dataSource, setDataSource] = useState('');

  const loadData = async () => {
    setLoading(true);
    const { data, source } = await fetchPegawaiData(true);
    setPegawaiList(data);
    setDataSource(source);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const subUnitCategories = useMemo(() => {
    const units = new Set();
    pegawaiList.forEach((item) => {
      const unit = (item.SubUnitKerja || '').trim();
      if (unit) units.add(unit);
    });
    return Array.from(units).sort();
  }, [pegawaiList]);

  const filteredPegawai = pegawaiList.filter((item) => {
    const subUnit = (item.SubUnitKerja || '').trim();
    if (selectedSubUnit !== 'ALL' && subUnit !== selectedSubUnit) {
      return false;
    }

    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;

    const nama = (item.Nama || '').toLowerCase();
    const nip = (item.NIP || '').toString().toLowerCase();
    const jabatan = (item.Jabatan || '').toLowerCase();
    const subUnitText = subUnit.toLowerCase();

    if (/\bwilayah\s+(i|1)\b/i.test(term)) {
      const isWilayah1 = /\bwilayah\s+(i|1)\b/i.test(subUnitText) && !/\bwilayah\s+(ii|iii|2|3)\b/i.test(subUnitText);
      return isWilayah1 || nama.includes(term) || nip.includes(term) || jabatan.includes(term);
    }

    return (
      nama.includes(term) ||
      nip.includes(term) ||
      subUnitText.includes(term) ||
      jabatan.includes(term)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <button onClick={() => navigate('home')} className="text-sm font-semibold flex items-center gap-1.5 text-gray-500 hover:text-gray-800 mb-2 cursor-pointer">
            <ArrowLeft size={16} /> Kembali ke Beranda
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl md:text-3xl font-black" style={{ color: colors.midnightGreen }}>Bank Data Profil Pegawai</h2>
            <button
              onClick={loadData}
              title="Perbarui Data"
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <RotateCcw size={16} />
            </button>
          </div>
          <p className="text-sm text-gray-500">
            Direktorat Pembangunan Perumahan Perdesaan ({filteredPegawai.length} dari {pegawaiList.length} Pegawai Ditampilkan)
          </p>
        </div>

        <div className="w-full md:w-80 relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><Search size={18} /></span>
          <input
            type="text"
            placeholder="Cari nama, NIP, sub unit kerja..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-700 shadow-2xs transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
              title="Hapus pencarian"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="mb-8 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 max-w-xl">
            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-2 flex items-center gap-2">
              <Briefcase size={16} className="text-[#084C61]" />
              <span>Filter Berdasarkan Sub Unit Kerja</span>
            </label>

            <div className="relative">
              <select
                value={selectedSubUnit}
                onChange={(e) => setSelectedSubUnit(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs md:text-sm font-semibold text-gray-800 focus:outline-none focus:border-[#084C61] focus:bg-white transition-all cursor-pointer appearance-none"
              >
                <option value="ALL">Semua Sub Unit Kerja (Tanpa Filter) — {pegawaiList.length} Pegawai</option>
                {subUnitCategories.map((cat, idx) => {
                  const count = pegawaiList.filter((p) => (p.SubUnitKerja || '').trim() === cat).length;
                  return (
                    <option key={idx} value={cat}>
                      {cat} ({count} Pegawai)
                    </option>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center pt-2 sm:pt-4">
            {(selectedSubUnit !== 'ALL' || searchTerm) ? (
              <button
                onClick={() => { setSelectedSubUnit('ALL'); setSearchTerm(''); }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>✕</span> Reset Filter & Pencarian
              </button>
            ) : (
              <span className="text-xs text-gray-400 italic">
                Menampilkan seluruh data
              </span>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500 flex items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-teal-800 border-t-transparent rounded-full animate-spin"></div>
          <span>Memuat data kepegawaian...</span>
        </div>
      ) : filteredPegawai.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 shadow-xs p-8">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle size={24} />
          </div>
          <h3 className="font-extrabold text-base text-gray-900 mb-1">Pegawai Tidak Ditemukan</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
            Tidak ada data pegawai yang cocok dengan filter Sub Unit Kerja atau kata kunci pencarian yang dimasukkan.
          </p>
          <button
            onClick={() => { setSelectedSubUnit('ALL'); setSearchTerm(''); }}
            className="px-4 py-2 bg-[#084C61] text-white text-xs font-bold rounded-xl shadow-xs hover:opacity-90 cursor-pointer"
          >
            Kembalikan ke Tanpa Filter
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {filteredPegawai.map((item, index) => {
            const fotoUrl = getDriveDirectUrl(item.Foto_Pegawai || '');
            const subUnit = item.SubUnitKerja || '';
            const kelas = item.KelasJabatan || '';
            const jabatan = item.Jabatan || '';
            const email = item.EmailDinas || '';
            const atasan = item.AtasanLangsung || '';

            return (
              <div key={index} className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col lg:flex-row justify-between items-stretch hover:shadow-md transition-shadow">
                <div className="p-6 md:p-8 flex-1 space-y-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-gray-900">{item.Nama}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                      <span className="text-gray-500 font-medium">NIP {item.NIP}</span>
                      {subUnit && <span className="px-3 py-0.5 rounded-full font-bold bg-teal-50 text-teal-800">{subUnit}</span>}
                      {kelas && <span className="px-3 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800">Kelas Jabatan {kelas}</span>}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-gray-400">JABATAN</div>
                      <div className="font-semibold text-gray-800 mt-0.5">{jabatan}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-gray-400">EMAIL DINAS</div>
                      <div className="font-semibold text-gray-800 mt-0.5">{email}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-gray-400">ATASAN LANGSUNG</div>
                      <div className="font-semibold text-gray-800 mt-0.5">{atasan}</div>
                    </div>
                  </div>
                </div>

                {fotoUrl && (
                  <div className="w-full lg:w-64 h-56 lg:h-auto relative overflow-hidden shrink-0 bg-[#084C61] flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-r from-white via-white/20 to-transparent z-10 hidden lg:block"></div>
                    <img src={fotoUrl} alt={item.Nama} className="w-full h-full object-cover object-top" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const PlaceholderView = ({ title, navigate }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
    <h2 className="text-2xl font-bold mb-2" style={{ color: colors.midnightGreen }}>{title}</h2>
    <p className="text-gray-500 mb-8">Fitur ini sedang dipersiapkan.</p>
    <button onClick={() => navigate('home')} className="px-6 py-2.5 rounded-xl text-white font-medium flex items-center gap-2 cursor-pointer" style={{ backgroundColor: colors.midnightGreen }}>
      <ArrowLeft size={16} /> Kembali ke Beranda
    </button>
  </div>
);

export default function App() {
  const [currentView, setCurrentView] = useState(() => {
    const hash = window.location.hash.replace('#/', '');
    return hash || 'home';
  });
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    fetchPegawaiData(false);

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      setCurrentView(hash || 'home');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (viewName) => {
    window.location.hash = viewName === 'home' ? '' : `#/${viewName}`;
    setCurrentView(viewName);
    window.scrollTo(0, 0);
  };

  const handleLogoutConfirm = () => {
    setLoggedInUser(null);
    setShowLogoutModal(false);
    navigate('home');
  };

  const isDashboardView = ['absensi-uang-makan', 'absensi-tunjangan-kinerja', 'arsip-surat-tugas', 'arsip-surat-cuti'].includes(currentView);

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <DashboardHome navigate={navigate} loggedInUser={loggedInUser} />;
      case 'absensi-uang-makan':
      case 'absensi-tunjangan-kinerja':
      case 'arsip-surat-tugas':
      case 'arsip-surat-cuti':
        return loggedInUser ? (
          <UserDashboardView
            loggedInUser={loggedInUser}
            onLogoutRequest={() => setShowLogoutModal(true)}
            navigate={navigate}
            currentView={currentView}
          />
        ) : (
          <LoginView navigate={navigate} onLoginSuccess={setLoggedInUser} />
        );
      case 'profile':
        return <ProfileView navigate={navigate} />;
      case 'rekap':
        return <PlaceholderView title="Rekap Bulanan" navigate={navigate} />;
      case 'login':
        return <LoginView navigate={navigate} onLoginSuccess={setLoggedInUser} />;
      default:
        return <DashboardHome navigate={navigate} loggedInUser={loggedInUser} />;
    }
  };

  return (
    <div className="min-h-screen font-sans bg-[#F7FAFC]">
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white text-gray-900 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-gray-100 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <LogOut size={24} />
            </div>
            <h3 className="text-lg font-black mb-2">Konfirmasi Keluar</h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              Apakah Anda yakin ingin keluar dari sesi akun sistem kepegawaian ini?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {!isDashboardView && (
        <Header
          navigate={navigate}
          loggedInUser={loggedInUser}
          onLogoutRequest={() => setShowLogoutModal(true)}
        />
      )}
      <main>{renderView()}</main>
    </div>
  );
}