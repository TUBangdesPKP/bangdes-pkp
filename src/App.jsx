import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  RotateCcw
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

const APPS_SCRIPT_JSON_URL = "https://script.google.com/macros/s/AKfycbyFp99KsR0PfXVG3IhQ1X2s2n0h44yRhRQuW9tQtxxiXfnUNiQicfpJBGbQwrApYlXw/exec";

const normalizePegawai = (item) => {
  if (!item || typeof item !== 'object') return null;
  const norm = {};
  Object.keys(item).forEach((k) => {
    const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    norm[cleanKey] = item[k];
  });

  return {
    ...item,
    NIP: (norm['nip'] || item.NIP || item.nip || '').toString().trim(),
    Nama: (norm['nama'] || norm['namalengkap'] || item.Nama || item.nama || '').toString().trim(),
    SubUnitKerja: (norm['subunitkerja'] || norm['subunit'] || item.SubUnitKerja || item['Sub Unit Kerja'] || '').toString().trim(),
    Jabatan: (norm['jabatan'] || item.Jabatan || item.jabatan || '').toString().trim(),
    KelasJabatan: (norm['kelasjabatan'] || norm['kelas'] || item.KelasJabatan || item['Kelas Jabatan'] || '').toString().trim(),
    EmailDinas: (norm['emaildinas'] || norm['email'] || item.EmailDinas || item['Email Dinas'] || '').toString().trim(),
    AtasanLangsung: (norm['atasanlangsung'] || norm['atasan'] || item.AtasanLangsung || item['Atasan Langsung'] || '').toString().trim(),
    Foto_Pegawai: (norm['fotopegawei'] || norm['foto'] || norm['fotoprofil'] || item.Foto_Pegawai || item['Foto Pegawai'] || '').toString().trim(),
    PIN: (norm['pin'] || item.PIN || item.pin || '').toString().trim(),
    Role: (norm['role'] || norm['akunrole'] || item.Role || item.Akun_Role || 'pegawai').toString().trim().toLowerCase()
  };
};

const getDriveDirectUrl = (url) => {
  if (!url) return '';
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }
  const matchId = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) {
    return `https://drive.google.com/uc?export=view&id=${matchId[1]}`;
  }
  return url;
};

const fetchPegawaiData = async () => {
  let cachedData = null;
  try {
    const rawCache = localStorage.getItem('cached_pkp_json_v2');
    if (rawCache) {
      const parsed = JSON.parse(rawCache);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedData = parsed.map(normalizePegawai).filter(Boolean);
      }
    }
  } catch (e) {
    // Abaikan pembatasan local storage
  }

  // 1. Direct fetch ke Web App Apps Script
  try {
    const directResp = await fetch(APPS_SCRIPT_JSON_URL, {
      method: 'GET',
      redirect: 'follow'
    });
    if (directResp.ok) {
      const jsonData = await directResp.json();
      if (Array.isArray(jsonData) && jsonData.length > 0) {
        const normalized = jsonData.map(normalizePegawai).filter(Boolean);
        try { localStorage.setItem('cached_pkp_json_v2', JSON.stringify(jsonData)); } catch (e) {}
        return { data: normalized, source: 'live' };
      }
    }
  } catch (err) {
    // Lanjut ke proxy
  }

  // 2. Proxy fetch bila terkena restriksi CORS browser
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(APPS_SCRIPT_JSON_URL)}&timestamp=${Date.now()}`;
    const proxyResp = await fetch(proxyUrl);
    if (proxyResp.ok) {
      const wrapper = await proxyResp.json();
      if (wrapper && wrapper.contents) {
        const jsonData = JSON.parse(wrapper.contents);
        if (Array.isArray(jsonData) && jsonData.length > 0) {
          const normalized = jsonData.map(normalizePegawai).filter(Boolean);
          try { localStorage.setItem('cached_pkp_json_v2', JSON.stringify(jsonData)); } catch (e) {}
          return { data: normalized, source: 'live' };
        }
      }
    }
  } catch (err) {
    // Lanjut ke cache
  }

  if (cachedData && cachedData.length > 0) {
    return { data: cachedData, source: 'cache' };
  }

  return { data: [], source: 'error' };
};

const Header = ({ navigate, loggedInUser, onLogoutRequest }) => {
  return (
    <header className="w-full bg-white border-b border-gray-100 sticky top-0 z-10 px-4 md:px-8 py-4 flex justify-between items-center shadow-xs">
      <div
        className="flex items-center gap-3 cursor-pointer group select-none"
        onClick={() => navigate('home')}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shadow-sm transition-transform group-hover:scale-105"
          style={{ backgroundColor: colors.midnightGreen }}
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Pancasila_Coat_of_Arms_of_Indonesia.svg/800px-Pancasila_Coat_of_Arms_of_Indonesia.svg.png"
            alt="Logo"
            className="w-5 h-5 object-contain filter brightness-0 invert"
          />
        </div>
        <div>
          <h1 className="font-extrabold text-base md:text-lg leading-tight tracking-tight" style={{ color: colors.midnightGreen }}>
            Direktorat Pembangunan Perumahan Perdesaan Kementerian PKP
          </h1>
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
              <p className="text-[10px] text-teal-700 font-semibold">{loggedInUser.role === 'admin' ? 'Super Admin' : 'Pegawai'}</p>
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
  const [step, setStep] = useState('nip');
  const [loginNip, setLoginNip] = useState('');
  const [pinDigits, setPinDigits] = useState(['', '', '', '', '', '']);
  const [matchedUser, setMatchedUser] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const pinInputRefs = useRef([]);

  const isNipAdmin = loginNip.trim().toLowerCase() === 'admin';
  const isNipComplete = loginNip.trim().length === 18 || isNipAdmin;

  const handleNipSubmit = (e) => {
    e.preventDefault();
    const cleanNip = loginNip.trim();
    if (!cleanNip) {
      setMessage({ type: 'error', text: 'Silakan masukkan NIP atau username terlebih dahulu.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    if (cleanNip.toLowerCase() === 'admin') {
      const superAdminUser = {
        NIP: 'SUPERADMIN',
        Nama: 'Super Administrator',
        Role: 'admin',
        SubUnitKerja: 'Direktorat Pembangunan Perumahan Perdesaan',
        Jabatan: 'Super Administrator Sistem Informasi',
        KelasJabatan: '17',
        EmailDinas: 'superadmin.perdesaan@pkp.go.id',
        AtasanLangsung: 'Direktur Pembangunan Perumahan Perdesaan',
        Foto_Pegawai: '',
        PIN: '111111',
        isShortcutAdmin: true
      };

      setMatchedUser(superAdminUser);
      setStep('pin');
      setPinDigits(['', '', '', '', '', '']);
      setLoading(false);
      setTimeout(() => pinInputRefs.current[0]?.focus(), 150);
      return;
    }

    fetchPegawaiData()
      .then((result) => {
        const pegawaiData = result.data || [];
        if (!pegawaiData || pegawaiData.length === 0) {
          setLoading(false);
          setMessage({ type: 'error', text: 'Tidak dapat memuat database JSON. Periksa koneksi web app.' });
          return;
        }

        const foundUser = pegawaiData.find((u) => (u.NIP || '').toString().trim() === cleanNip);

        if (foundUser) {
          setMatchedUser(foundUser);
          setStep('pin');
          setPinDigits(['', '', '', '', '', '']);
          setLoading(false);
          setTimeout(() => pinInputRefs.current[0]?.focus(), 150);
        } else {
          setLoading(false);
          setMessage({ type: 'error', text: 'NIP tidak ditemukan dalam database kepegawaian.' });
        }
      })
      .catch(() => {
        setLoading(false);
        setMessage({ type: 'error', text: 'Gagal memuat database JSON. Silakan coba kembali.' });
      });
  };

  const handlePinChange = (index, value) => {
    const numericVal = value.replace(/\D/g, '');
    if (!numericVal) {
      const newDigits = [...pinDigits];
      newDigits[index] = '';
      setPinDigits(newDigits);
      return;
    }

    const char = numericVal.slice(-1);
    const newDigits = [...pinDigits];
    newDigits[index] = char;
    setPinDigits(newDigits);

    if (index < 5 && char) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
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
    pinInputRefs.current[nextFocus]?.focus();
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    const enteredPin = pinDigits.join('').trim();
    if (enteredPin.length < 6) {
      setMessage({ type: 'error', text: 'Silakan lengkapi 6 digit PIN Anda.' });
      return;
    }

    const validPin = (matchedUser.PIN || '').toString().trim();
    const isShortcut = matchedUser.isShortcutAdmin || matchedUser.NIP === 'SUPERADMIN';
    const isPinValid = enteredPin === validPin || (isShortcut && enteredPin === '111111');

    if (isPinValid) {
      const roleNormalized = (matchedUser.Role || '').toString().trim().toLowerCase();
      const userData = {
        nip: matchedUser.NIP || 'SUPERADMIN',
        Nama: matchedUser.Nama || 'Super Administrator',
        role: (isShortcut || roleNormalized === 'admin') ? 'admin' : 'pegawai',
        subUnit: matchedUser.SubUnitKerja || 'Direktorat Pembangunan Perumahan Perdesaan',
        jabatan: matchedUser.Jabatan || 'Pejabat Fungsional',
        atasan: matchedUser.AtasanLangsung || 'Direktur Pembangunan Perumahan Perdesaan',
        kelasJabatan: matchedUser.KelasJabatan || '8',
        email: matchedUser.EmailDinas || 'admin@pkp.go.id',
        foto: getDriveDirectUrl(matchedUser.Foto_Pegawai || '')
      };
      onLoginSuccess(userData);
      navigate('absensi-uang-makan');
    } else {
      setMessage({ type: 'error', text: 'PIN yang Anda masukkan salah. Silakan coba kembali.' });
      setPinDigits(['', '', '', '', '', '']);
      pinInputRefs.current[0]?.focus();
    }
  };

  const isPinComplete = pinDigits.join('').length === 6;

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-8">
        <div className="mb-6 flex items-center justify-between">
          {step === 'pin' ? (
            <button
              type="button"
              onClick={() => { setStep('nip'); setMessage({ type: '', text: '' }); }}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowLeft size={16} /> Kembali
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('home')}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowLeft size={16} /> Kembali ke Beranda
            </button>
          )}
        </div>

        {message.text && (
          <div className={`p-4 rounded-2xl text-xs mb-6 flex items-center gap-3 ${message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-100' : 'bg-emerald-50 text-emerald-800 border border-emerald-100'}`}>
            {message.type === 'error' ? <AlertCircle size={18} className="text-red-600 shrink-0" /> : <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {step === 'nip' && (
          <div>
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 text-white shadow-sm" style={{ backgroundColor: colors.midnightGreen }}>
                <User size={26} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">Login Sistem</h2>
              <p className="text-xs text-gray-500">Masukkan NIP Anda untuk melanjutkan verifikasi akun.</p>
            </div>

            <form onSubmit={handleNipSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">NIP (Nomor Induk Pegawai)</label>
                <input
                  type="text"
                  maxLength={18}
                  placeholder="Masukkan NIP"
                  value={loginNip}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d*$/.test(val) || /^admin$/i.test(val) || 'admin'.startsWith(val.toLowerCase())) {
                      setLoginNip(val);
                    }
                  }}
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold tracking-wider focus:outline-none focus:border-teal-700 focus:bg-white transition-all text-center"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || !isNipComplete}
                className={`w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  isNipComplete
                    ? 'opacity-100 shadow-md hover:opacity-95 active:scale-[0.98] cursor-pointer'
                    : 'opacity-40 cursor-not-allowed shadow-none'
                }`}
                style={{ backgroundColor: colors.midnightGreen }}
              >
                {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                <span>{loading ? 'Memeriksa Data Pegawai...' : 'Lanjutkan'}</span>
              </button>
            </form>
          </div>
        )}

        {step === 'pin' && (
          <div className="py-2">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 bg-[#DDF1F5] text-[#1E677D] shadow-xs">
                <KeyRound size={28} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-1.5 tracking-tight">Profil Pegawai</h2>
              <p className="text-xs text-gray-600 font-normal">
                Halo <strong className="font-bold text-gray-800">{matchedUser?.Nama || 'Administrator'}</strong>, masukkan PIN Anda
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-gray-600 text-center mb-3.5">
                  Masukkan PIN
                </label>
                <div className="flex justify-center gap-2.5 sm:gap-3" onPaste={handlePinPaste}>
                  {pinDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (pinInputRefs.current[idx] = el)}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinChange(idx, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(idx, e)}
                      className="w-11 h-14 sm:w-12 sm:h-14 text-center text-xl font-black rounded-2xl bg-white border border-gray-300 focus:border-[#0E5B73] focus:ring-2 focus:ring-[#0E5B73]/20 focus:outline-none transition-all shadow-2xs"
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!isPinComplete}
                className={`w-full py-3.5 rounded-2xl text-white font-bold text-sm transition-all shadow-sm ${
                  isPinComplete
                    ? 'opacity-100 hover:opacity-95 active:scale-[0.98] cursor-pointer shadow-md'
                    : 'opacity-50 cursor-not-allowed'
                }`}
                style={{
                  backgroundColor: isPinComplete ? colors.midnightGreen : '#849BAA'
                }}
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

const UserDashboardView = ({ loggedInUser, onLogoutRequest, navigate, currentView }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploaded, setUploaded] = useState(false);
  const [pendingTargetView, setPendingTargetView] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const getModuleKey = (view) => {
    switch (view) {
      case 'absensi-uang-makan': return 'uang-makan';
      case 'absensi-tunjangan-kinerja': return 'tukin';
      case 'arsip-surat-tugas': return 'spt';
      case 'arsip-surat-cuti': return 'cuti';
      default: return 'uang-makan';
    }
  };

  const activeTab = getModuleKey(currentView);

  const handleTabClick = (targetView) => {
    if (selectedFile && !uploaded) {
      setPendingTargetView(targetView);
      setShowConfirmModal(true);
    } else {
      navigate(targetView);
    }
  };

  const confirmSwitchModule = (proceed) => {
    if (proceed && pendingTargetView) {
      setSelectedFile(null);
      setUploaded(false);
      navigate(pendingTargetView);
    }
    setShowConfirmModal(false);
    setPendingTargetView(null);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploaded(false);
    }
  };

  const handleUpload = (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    setUploaded(true);
  };

  return (
    <div className="min-h-screen bg-[#112233] flex flex-col md:flex-row text-gray-100 font-sans relative">
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white text-gray-900 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-xl font-black mb-2">Konfirmasi Pindah Modul</h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              Anda telah memilih dokumen yang belum diunggah. Apakah Anda yakin ingin pindah modul? Perubahan atau berkas yang dipilih akan direset.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => confirmSwitchModule(false)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Tidak, Tetap Disini
              </button>
              <button
                onClick={() => confirmSwitchModule(true)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
              >
                Ya, Pindah & Reset
              </button>
            </div>
          </div>
        </div>
      )}

      <aside className="w-full md:w-72 bg-[#091522] border-r border-white/5 flex flex-col justify-between p-6 shrink-0">
        <div>
          <div className="mb-8">
            <div className="text-[10px] font-bold text-teal-400 uppercase tracking-widest mb-1">Profil Pegawai</div>
            <div className="text-xs font-medium text-gray-300">{loggedInUser?.subUnit || 'Direktorat Pembangunan Perumahan Perdesaan'}</div>
          </div>

          <div className="flex items-center gap-3 mb-8 p-3 rounded-2xl bg-white/5 border border-white/5">
            {loggedInUser?.foto ? (
              <img src={loggedInUser.foto} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-teal-500/30" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-teal-700 font-bold flex items-center justify-center text-white text-sm">
                {loggedInUser?.Nama ? loggedInUser.Nama.charAt(0) : 'A'}
              </div>
            )}
            <div className="overflow-hidden">
              <div className="font-extrabold text-xs text-white truncate">{loggedInUser?.Nama || 'Pengguna'}</div>
              <div className="text-[10px] text-gray-400 truncate">NIP {loggedInUser?.nip || '-'}</div>
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
          <div className="mb-6">
            <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">Riwayat & Modul Pengisian</h1>
            <p className="text-xs text-gray-500">Kelola dan input dokumen pendukung resmi kedinasan Anda.</p>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm mb-8 relative overflow-hidden flex flex-col lg:flex-row justify-between items-stretch">
            <div className="p-6 md:p-8 space-y-4 flex-1 z-10">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">{loggedInUser?.Nama}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                  <span className="text-gray-500">NIP {loggedInUser?.nip}</span>
                  <span className="px-3 py-0.5 rounded-full font-bold bg-teal-50 text-teal-800">{loggedInUser?.subUnit}</span>
                  <span className="px-3 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800">Kelas Jabatan {loggedInUser?.kelasJabatan || '8'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-100 text-xs">
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-400">JABATAN</div>
                  <div className="font-semibold text-gray-800 mt-0.5">{loggedInUser?.jabatan}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-400">EMAIL DINAS</div>
                  <div className="font-semibold text-gray-800 mt-0.5">{loggedInUser?.email}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-gray-400">ATASAN LANGSUNG</div>
                  <div className="font-semibold text-gray-800 mt-0.5">{loggedInUser?.atasan}</div>
                </div>
              </div>
            </div>

            {loggedInUser?.foto && (
              <div className="w-full lg:w-64 h-56 lg:h-auto relative overflow-hidden shrink-0 bg-[#084C61] flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-r from-white via-white/20 to-transparent z-10 hidden lg:block"></div>
                <img
                  src={loggedInUser.foto}
                  alt={loggedInUser.Nama}
                  className="w-full h-full object-cover object-top"
                />
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 md:p-8">
            <div className="flex items-center justify-between pb-6 border-b border-gray-100 mb-6">
              <div>
                <span className="text-[10px] font-extrabold uppercase px-3 py-1 bg-teal-50 text-teal-800 rounded-full">
                  Form Unggah Dokumen Resmi
                </span>
                <h3 className="text-xl font-black text-gray-900 mt-2">
                  {activeTab === 'uang-makan' && 'Modul Input Absensi Uang Makan'}
                  {activeTab === 'tukin' && 'Modul Input Absensi Tunjangan Kinerja'}
                  {activeTab === 'spt' && 'Arsip dan Input Surat Tugas Dinas'}
                  {activeTab === 'cuti' && 'Arsip dan Input Surat Cuti Pegawai'}
                </h3>
              </div>
            </div>

            <form onSubmit={handleUpload} className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Pilih Berkas Dokumen (Format PDF)</label>
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center bg-gray-50 hover:border-teal-700 transition-colors">
                  <input
                    key={activeTab + (selectedFile ? selectedFile.name : 'empty')}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-700 cursor-pointer"
                  />
                </div>
              </div>

              {selectedFile && (
                <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 text-xs text-teal-900 flex items-center justify-between">
                  <span>File terpilih: <strong className="font-bold">{selectedFile.name}</strong></span>
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); setUploaded(false); }}
                    className="text-red-600 font-bold text-xs hover:underline cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
              )}

              {uploaded && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-xs text-emerald-900 flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  <span>Berkas berhasil diunggah dan disimpan ke sistem!</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedFile}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                style={{ backgroundColor: colors.midnightGreen }}
              >
                Proses & Unggah Dokumen
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

const ProfileView = ({ navigate }) => {
  const [pegawaiList, setPegawaiList] = useState([]);
  const [dataSource, setDataSource] = useState('live');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubUnit, setSelectedSubUnit] = useState('ALL');

  const loadData = () => {
    setLoading(true);
    fetchPegawaiData()
      .then((result) => {
        setPegawaiList(result.data || []);
        setDataSource(result.source || 'live');
        setLoading(false);
      })
      .catch(() => {
        setPegawaiList([]);
        setDataSource('error');
        setLoading(false);
      });
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

  // Logika Filter Presisi & Sesuai Kesepakatan
  const filteredPegawai = pegawaiList.filter((item) => {
    const subUnit = (item.SubUnitKerja || '').trim();

    // 1. Filter Dropdown Sub Unit Kerja
    if (selectedSubUnit !== 'ALL' && subUnit !== selectedSubUnit) {
      return false;
    }

    // 2. Filter Kotak Pencarian
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;

    const nama = (item.Nama || '').toLowerCase();
    const nip = (item.NIP || '').toString().toLowerCase();
    const jabatan = (item.Jabatan || '').toLowerCase();
    const subUnitText = subUnit.toLowerCase();

    // Presisi khusus kata 'wilayah i' agar tidak mencocokkan 'wilayah ii' atau 'wilayah iii'
    if (/\bwilayah\s+i\b/i.test(term)) {
      return (
        (/\bwilayah\s+i\b/i.test(subUnitText) && !/\bwilayah\s+ii\b/i.test(subUnitText) && !/\bwilayah\s+iii\b/i.test(subUnitText)) ||
        nama.includes(term) ||
        nip.includes(term) ||
        jabatan.includes(term)
      );
    }

    // Presisi khusus kata 'wilayah ii' agar tidak mencocokkan 'wilayah iii'
    if (/\bwilayah\s+ii\b/i.test(term)) {
      return (
        (/\bwilayah\s+ii\b/i.test(subUnitText) && !/\bwilayah\s+iii\b/i.test(subUnitText)) ||
        nama.includes(term) ||
        nip.includes(term) ||
        jabatan.includes(term)
      );
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
          {dataSource === 'error' && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-800 text-[11px] font-semibold">
              <span>⚠️ Gagal memuat data dari Web App JSON.</span>
              <button onClick={loadData} className="underline hover:text-red-950 ml-1 cursor-pointer font-bold">Coba Sinkron Ulang</button>
            </div>
          )}
        </div>

        {/* Input Pencarian dengan tombol hapus (X) */}
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

      {/* Filter Bar Dropdown */}
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

          {/* Tombol Reset Filter & Pencarian */}
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