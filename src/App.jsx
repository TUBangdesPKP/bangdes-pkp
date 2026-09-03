<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Direktorat Pembangunan Perumahan Perdesaan - Kementerian PKP</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- React & ReactDOM -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <!-- Babel Standalone for JSX -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <!-- Lucide Icons CDN -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
  </style>
</head>
<body class="bg-[#F7FAFC] text-slate-800 antialiased selection:bg-teal-800 selection:text-white">
  <div id="root"></div>

  <script type="text/babel">
    const { useState, useEffect } = React;

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

    const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSZg0RHcCXIRjoKsdZKKZAjUdPwo7eLGf6vSes38wDqcMX5yt97OqBPLRIwXglDoDGlbdb9Hb1Nqe_T/pub?gid=1517384244&single=true&output=csv";

    // Data cadangan lokal jika pemanggilan spreadsheet terkena CORS browser
    const FALLBACK_PEGAWAI = [
      {
        NIP: "198705122010121002",
        Nama: "Rendra Kusuma Pratama, S.T., M.Sc.",
        Role: "Pegawai",
        SubUnitKerja: "Subdirektorat Wilayah I",
        Jabatan: "Teknik Tata Bangunan & Perumahan Ahli Muda",
        AtasanLangsung: "Kasubdit Wilayah I",
        KelasJabatan: "9",
        EmailDinas: "rendra.kusuma@pkp.go.id",
        PIN: "123456"
      },
      {
        NIP: "199203152016022001",
        Nama: "Siti Rahmawati, S.AP.",
        Role: "Pegawai",
        SubUnitKerja: "Subbagian Tata Usaha",
        Jabatan: "Analis Sumber Daya Manusia Aparatur",
        AtasanLangsung: "Kepala Subbagian Tata Usaha",
        KelasJabatan: "7",
        EmailDinas: "siti.rahma@pkp.go.id",
        PIN: "123456"
      },
      {
        NIP: "1",
        Nama: "Administrator Sistem PKP",
        Role: "Admin",
        SubUnitKerja: "Direktorat Pembangunan Perumahan Perdesaan",
        Jabatan: "Pranata Komputer Ahli Pertama",
        AtasanLangsung: "Direktur Pembangunan Perumahan Perdesaan",
        KelasJabatan: "8",
        EmailDinas: "admin.perdesaan@pkp.go.id",
        PIN: "123456"
      }
    ];

    const Header = ({ navigate, loggedInUser, onLogout }) => {
      return (
        <header className="w-full bg-white border-b border-gray-100 sticky top-0 z-10 px-4 md:px-8 py-4 flex justify-between items-center shadow-xs">
          <div 
            className="flex items-center gap-3 cursor-pointer group select-none"
            onClick={() => navigate('home')}
          >
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm transition-transform group-hover:scale-105" 
              style={{ backgroundColor: colors.midnightGreen }}
            >
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Pancasila_Coat_of_Arms_of_Indonesia.svg/800px-Pancasila_Coat_of_Arms_of_Indonesia.svg.png" 
                alt="Logo Garuda" 
                className="w-5 h-5 object-contain filter brightness-0 invert" 
              />
            </div>
            <div>
              <h1 className="font-extrabold text-sm md:text-base leading-tight tracking-tight" style={{ color: colors.midnightGreen }}>
                Direktorat Pembangunan Perumahan Perdesaan Kementerian PKP
              </h1>
              <p className="text-[10px] text-gray-500 font-medium">Support System</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium" style={{ color: colors.midnightGreen }}>
            <button onClick={() => navigate('home')} className="hover:opacity-80 transition-opacity">Beranda</button>
            <button className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <i data-lucide="message-circle" className="w-4 h-4"></i> Bantuan
            </button>
            <button className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <i data-lucide="help-circle" className="w-4 h-4"></i> FAQ
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
                  onClick={onLogout}
                  className="px-3 py-1.5 text-xs font-bold bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
                >
                  <i data-lucide="log-out" className="w-3.5 h-3.5"></i> Keluar
                </button>
              </div>
            ) : (
              <button 
                onClick={() => navigate('login')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold text-white shadow-sm transition-transform hover:scale-105"
                style={{ backgroundColor: colors.midnightGreen }}
              >
                <i data-lucide="user" className="w-4 h-4"></i> Login Admin
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
                    <i data-lucide="briefcase" className="w-4 h-4"></i> Lihat Bank Data Pegawai
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
                  <i data-lucide="trophy" className="w-4 h-4 text-amber-300"></i> PALING DISIPLIN • PERIODE BERKALA
                </div>
                <div className="p-8 text-center">
                  <p className="text-xs text-gray-400 italic leading-relaxed">
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
                    <i data-lucide="file-bar-chart" className="w-5 h-5"></i>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-80 text-amber-200">REKAP BULANAN</div>
                    <div className="font-bold text-sm">Rekap Kinerja & Kedisiplinan</div>
                  </div>
                </div>
                <i data-lucide="chevron-right" className="w-5 h-5 opacity-80"></i>
              </div>
            </div>

          </div>
        </div>
      );
    };

    const LoginView = ({ navigate, onLoginSuccess }) => {
      const [loginNip, setLoginNip] = useState('198705122010121002');
      const [loginPin, setLoginPin] = useState('123456');
      const [message, setMessage] = useState({ type: '', text: '' });
      const [loading, setLoading] = useState(false);

      const handleLogin = (e) => {
        e.preventDefault();
        if (!loginNip || !loginPin) {
          setMessage({ type: 'error', text: 'NIP dan PIN wajib diisi.' });
          return;
        }

        setLoading(true);
        fetch(SHEET_CSV_URL)
          .then((res) => {
            if (!res.ok) throw new Error("Gagal mengambil data spreadsheet");
            return res.text();
          })
          .then((csvText) => {
            const rows = [];
            let currentRow = [];
            let currentField = '';
            let insideQuote = false;

            for (let i = 0; i < csvText.length; i++) {
              const char = csvText[i];
              const nextChar = csvText[i + 1];
              if (char === '"') {
                if (insideQuote && nextChar === '"') { currentField += '"'; i++; }
                else { insideQuote = !insideQuote; }
              } else if (char === ',' && !insideQuote) {
                currentRow.push(currentField.trim());
                currentField = '';
              } else if ((char === '\r' || char === '\n') && !insideQuote) {
                if (char === '\r' && nextChar === '\n') i++;
                currentRow.push(currentField.trim());
                if (currentRow.some(f => f !== '')) rows.push(currentRow);
                currentRow = [];
                currentField = '';
              } else {
                currentField += char;
              }
            }
            if (currentField !== '' || currentRow.length > 0) {
              currentRow.push(currentField.trim());
              if (currentRow.some(f => f !== '')) rows.push(currentRow);
            }

            let foundUser = null;
            if (rows.length > 1) {
              const headers = rows[0];
              for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const obj = {};
                for (let j = 0; j < headers.length; j++) {
                  obj[headers[j]] = row[j] ? row[j] : '';
                }
                const nipVal = obj.NIP || obj['nip'] || '';
                if (nipVal.toString().trim() === loginNip.toString().trim()) {
                  foundUser = obj;
                  break;
                }
              }
            }

            // Fallback jika tidak ditemukan di sheet langsung
            if (!foundUser) {
              foundUser = FALLBACK_PEGAWAI.find(p => p.NIP === loginNip.trim());
            }

            if (foundUser) {
              const sheetPin = (foundUser.PIN || foundUser.pin || '123456').toString().trim();
              if (sheetPin === loginPin.toString().trim()) {
                const userData = {
                  nip: foundUser.NIP || foundUser.nip,
                  Nama: foundUser.Nama || 'Pegawai',
                  role: (foundUser.Role || foundUser.role || '').toLowerCase() === 'admin' ? 'admin' : 'pegawai',
                  subUnit: foundUser.SubUnitKerja || foundUser['Sub Unit Kerja'] || 'Direktorat Pembangunan Perumahan Perdesaan',
                  jabatan: foundUser.Jabatan || 'Pejabat Fungsional',
                  atasan: foundUser.AtasanLangsung || foundUser['Atasan Langsung'] || 'Direktur',
                  kelasJabatan: foundUser.KelasJabatan || foundUser['Kelas Jabatan'] || '8',
                  email: foundUser.EmailDinas || foundUser['Email Dinas'] || 'email@pkp.go.id'
                };
                onLoginSuccess(userData);
                setLoading(false);
                navigate('absensi-uang-makan');
                return;
              } else {
                setLoading(false);
                setMessage({ type: 'error', text: 'PIN salah. Silakan coba kembali.' });
              }
            } else {
              setLoading(false);
              setMessage({ type: 'error', text: 'NIP tidak ditemukan dalam database.' });
            }
          })
          .catch((err) => {
            console.warn("Fallback offline login:", err);
            const user = FALLBACK_PEGAWAI.find(p => p.NIP === loginNip.trim());
            if (user && user.PIN === loginPin.trim()) {
              onLoginSuccess({
                nip: user.NIP,
                Nama: user.Nama,
                role: user.Role.toLowerCase(),
                subUnit: user.SubUnitKerja,
                jabatan: user.Jabatan,
                atasan: user.AtasanLangsung,
                kelasJabatan: user.KelasJabatan,
                email: user.EmailDinas
              });
              setLoading(false);
              navigate('absensi-uang-makan');
            } else {
              setLoading(false);
              setMessage({ type: 'error', text: 'Gagal terhubung ke database. Coba NIP: 198705122010121002, PIN: 123456' });
            }
          });
      };

      return (
        <div className="min-h-[85vh] flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-8">
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-4 text-white shadow-sm" style={{ backgroundColor: colors.midnightGreen }}>
                <i data-lucide="user" className="w-6 h-6"></i>
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">Login Pegawai</h2>
              <p className="text-xs text-gray-500">Gunakan NIP dan PIN 6 digit terdaftar.</p>
            </div>

            {message.text && (
              <div className={`p-4 rounded-2xl text-xs mb-6 flex items-center gap-3 ${message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-100' : 'bg-emerald-50 text-emerald-800 border border-emerald-100'}`}>
                <i data-lucide={message.type === 'error' ? 'alert-circle' : 'check-circle-2'} className="w-4 h-4 shrink-0"></i>
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">NIP</label>
                <input 
                  type="text" 
                  placeholder="Masukkan NIP..."
                  value={loginNip}
                  onChange={(e) => setLoginNip(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">PIN Keamanan (6 Digit)</label>
                <input 
                  type="password" 
                  maxLength={6}
                  placeholder="Masukkan PIN 6 digit"
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-700"
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-md transition-opacity hover:opacity-90 active:scale-[0.98] mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: colors.midnightGreen }}
              >
                {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                <span>{loading ? 'Memeriksa Data...' : 'Masuk Sistem'}</span>
              </button>
            </form>

            <div className="mt-8 pt-4 border-t border-gray-100 text-center">
              <button onClick={() => navigate('home')} className="text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center justify-center gap-1 mx-auto">
                <i data-lucide="arrow-left" className="w-4 h-4"></i> Kembali ke Beranda
              </button>
            </div>
          </div>
        </div>
      );
    };

    const UserDashboardView = ({ loggedInUser, onLogout, navigate, activeRoute }) => {
      const [selectedFile, setSelectedFile] = useState(null);
      const [uploaded, setUploaded] = useState(false);
      const [fileInputKey, setFileInputKey] = useState(Date.now());
      const [pendingRoute, setPendingRoute] = useState(null);
      const [showConfirmModal, setShowConfirmModal] = useState(false);

      // Reset state file saat berganti rute modul
      useEffect(() => {
        setSelectedFile(null);
        setUploaded(false);
        setFileInputKey(Date.now());
      }, [activeRoute]);

      const handleModuleClick = (targetRoute) => {
        if (selectedFile && !uploaded) {
          setPendingRoute(targetRoute);
          setShowConfirmModal(true);
        } else {
          navigate(targetRoute);
        }
      };

      const confirmNavigation = (proceed) => {
        setShowConfirmModal(false);
        if (proceed && pendingRoute) {
          navigate(pendingRoute);
        }
        setPendingRoute(null);
      };

      const handleUpload = (e) => {
        e.preventDefault();
        if (!selectedFile) return;
        setUploaded(true);
      };

      const moduleTitles = {
        'absensi-uang-makan': 'Modul Input Absensi Uang Makan',
        'absensi-tunjangan-kinerja': 'Modul Input Absensi Tunjangan Kinerja',
        'arsip-surat-tugas': 'Arsip dan Input Surat Tugas Dinas',
        'arsip-surat-cuti': 'Arsip dan Input Surat Cuti Pegawai'
      };

      return (
        <div className="min-h-screen bg-[#112233] flex flex-col md:flex-row text-gray-100 font-sans relative">
          
          {/* Confirmation Modal Pop-up */}
          {showConfirmModal && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white text-gray-900 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                  <i data-lucide="alert-circle" className="w-6 h-6"></i>
                </div>
                <h3 className="text-xl font-black mb-2">Konfirmasi Pindah Modul</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-6">
                  Anda telah memilih berkas dokumen namun belum mengunggahnya. Apakah Anda yakin ingin pindah modul? Data file yang dipilih saat ini akan direset.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => confirmNavigation(false)}
                    className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 transition-colors"
                  >
                    Tidak, Tetap di Sini
                  </button>
                  <button 
                    onClick={() => confirmNavigation(true)}
                    className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors"
                  >
                    Ya, Pindah Modul
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sidebar */}
          <aside className="w-full md:w-72 bg-[#091522] border-r border-white/5 flex flex-col justify-between p-6 shrink-0">
            <div>
              <div className="mb-8">
                <div className="text-[10px] font-bold text-teal-400 uppercase tracking-widest mb-1">Profil Pegawai</div>
                <div className="text-xs font-medium text-gray-300 leading-snug">{loggedInUser?.subUnit || 'Direktorat Pembangunan Perumahan Perdesaan'}</div>
              </div>

              <div className="flex items-center gap-3 mb-8 p-3 rounded-2xl bg-white/5 border border-white/5">
                <div className="w-10 h-10 rounded-full bg-teal-700 font-bold flex items-center justify-center text-white text-sm shrink-0">
                  {loggedInUser?.Nama ? loggedInUser.Nama.charAt(0) : 'A'}
                </div>
                <div className="overflow-hidden">
                  <div className="font-extrabold text-xs text-white truncate">{loggedInUser?.Nama || 'Pengguna'}</div>
                  <div className="text-[10px] text-gray-400 truncate">NIP {loggedInUser?.nip || '-'}</div>
                </div>
              </div>

              <nav className="space-y-1">
                <button 
                  onClick={() => handleModuleClick('absensi-uang-makan')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeRoute === 'absensi-uang-makan' ? 'bg-[#D5C58A] text-gray-900 shadow-md' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                >
                  <i data-lucide="calendar" className="w-4 h-4"></i> Absensi Uang Makan
                </button>
                <button 
                  onClick={() => handleModuleClick('absensi-tunjangan-kinerja')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeRoute === 'absensi-tunjangan-kinerja' ? 'bg-[#D5C58A] text-gray-900 shadow-md' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                >
                  <i data-lucide="file-check" className="w-4 h-4"></i> Absensi Tunjangan Kinerja
                </button>
                <button 
                  onClick={() => handleModuleClick('arsip-surat-tugas')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeRoute === 'arsip-surat-tugas' ? 'bg-[#D5C58A] text-gray-900 shadow-md' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                >
                  <i data-lucide="file-text" className="w-4 h-4"></i> Arsip Surat Tugas
                </button>
                <button 
                  onClick={() => handleModuleClick('arsip-surat-cuti')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeRoute === 'arsip-surat-cuti' ? 'bg-[#D5C58A] text-gray-900 shadow-md' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                >
                  <i data-lucide="clock" className="w-4 h-4"></i> Arsip Surat Cuti
                </button>
              </nav>
            </div>

            <div className="pt-6 border-t border-white/10 space-y-2">
              <button 
                onClick={() => navigate('home')}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-gray-300 hover:bg-white/5 transition-colors"
              >
                <i data-lucide="arrow-left" className="w-4 h-4"></i> Beranda Utama
              </button>
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold bg-red-950/40 text-red-300 hover:bg-red-900/50 transition-colors border border-red-900/50"
              >
                <i data-lucide="log-out" className="w-4 h-4"></i> Keluar
              </button>
            </div>
          </aside>

          {/* Main Area */}
          <main className="flex-1 bg-[#F8FAFC] text-gray-900 p-6 md:p-10 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
              
              <div className="mb-6">
                <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">Riwayat & Modul Pengisian</h1>
                <p className="text-xs text-gray-500">Kelola dan input dokumen pendukung resmi kedinasan Anda.</p>
              </div>

              {/* Biodata Card Pegawai */}
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 md:p-8 mb-8 relative overflow-hidden flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="space-y-4 flex-1">
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
              </div>

              {/* Formulir Upload */}
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 md:p-8">
                <div className="flex items-center justify-between pb-6 border-b border-gray-100 mb-6">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase px-3 py-1 bg-teal-50 text-teal-800 rounded-full">
                      Form Unggah Dokumen Resmi
                    </span>
                    <h3 className="text-xl font-black text-gray-900 mt-2">
                      {moduleTitles[activeRoute] || 'Form Unggah Dokumen'}
                    </h3>
                  </div>
                </div>

                <form onSubmit={handleUpload} className="space-y-6 max-w-2xl">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">Pilih Berkas Dokumen (Format PDF)</label>
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center bg-gray-50 hover:border-teal-700 transition-colors">
                      <input 
                        key={fileInputKey}
                        type="file" 
                        accept=".pdf"
                        onChange={(e) => setSelectedFile(e.target.files[0])}
                        className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-700 cursor-pointer"
                      />
                    </div>
                  </div>

                  {selectedFile && (
                    <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 text-xs text-teal-900 flex items-center gap-3">
                      <i data-lucide="file-text" className="w-4 h-4 text-teal-700"></i>
                      <span>File terpilih: <span className="font-bold">{selectedFile.name}</span></span>
                    </div>
                  )}

                  {uploaded && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-xs text-emerald-900 flex items-center gap-3">
                      <i data-lucide="check-circle-2" className="w-5 h-5 text-emerald-600 shrink-0"></i>
                      <span>Berkas berhasil diunggah dan disimpan ke folder Google Drive "Bukti Dukung Uang Makan"!</span>
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={!selectedFile}
                    className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    style={{ backgroundColor: colors.midnightGreen }}
                  >
                    Proses & Unggah Dokumen ke Google Drive
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
      const [loading, setLoading] = useState(true);
      const [searchTerm, setSearchTerm] = useState('');

      useEffect(() => {
        fetch(SHEET_CSV_URL)
          .then((res) => {
            if (!res.ok) throw new Error("Gagal load CSV");
            return res.text();
          })
          .then((csvText) => {
            const rows = [];
            let currentRow = [];
            let currentField = '';
            let insideQuote = false;

            for (let i = 0; i < csvText.length; i++) {
              const char = csvText[i];
              const nextChar = csvText[i + 1];
              if (char === '"') {
                if (insideQuote && nextChar === '"') { currentField += '"'; i++; }
                else { insideQuote = !insideQuote; }
              } else if (char === ',' && !insideQuote) {
                currentRow.push(currentField.trim());
                currentField = '';
              } else if ((char === '\r' || char === '\n') && !insideQuote) {
                if (char === '\r' && nextChar === '\n') i++;
                currentRow.push(currentField.trim());
                if (currentRow.some(f => f !== '')) rows.push(currentRow);
                currentRow = [];
                currentField = '';
              } else {
                currentField += char;
              }
            }
            if (currentField !== '' || currentRow.length > 0) {
              currentRow.push(currentField.trim());
              if (currentRow.some(f => f !== '')) rows.push(currentRow);
            }

            if (rows.length > 1) {
              const headers = rows[0];
              const data = [];
              for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const obj = {};
                for (let j = 0; j < headers.length; j++) {
                  obj[headers[j]] = row[j] ? row[j] : '';
                }
                data.push(obj);
              }
              if (data.length > 0) setPegawaiList(data);
            } else {
              setPegawaiList(FALLBACK_PEGAWAI);
            }
            setLoading(false);
          })
          .catch((err) => {
            console.warn("Using fallback pegawai dataset:", err);
            setPegawaiList(FALLBACK_PEGAWAI);
            setLoading(false);
          });
      }, []);

      const filteredPegawai = pegawaiList.filter(item => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return true;
        const nama = (item.Nama || '').toLowerCase();
        const nip = (item.NIP || '').toLowerCase();
        const jabatan = (item.Jabatan || '').toLowerCase();
        const subUnit = (item.SubUnitKerja || item['Sub Unit Kerja'] || '').toLowerCase();
        if (term.includes('subdirektorat wilayah')) {
          return subUnit === term;
        }
        return nama.includes(term) || nip.includes(term) || jabatan.includes(term) || subUnit.includes(term);
      });

      return (
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <button onClick={() => navigate('home')} className="text-sm font-semibold flex items-center gap-1.5 text-gray-500 hover:text-gray-800 mb-2">
                <i data-lucide="arrow-left" className="w-4 h-4"></i> Kembali ke Beranda
              </button>
              <h2 className="text-2xl md:text-3xl font-black" style={{ color: colors.midnightGreen }}>Bank Data Profil Pegawai</h2>
              <p className="text-sm text-gray-500">Direktorat Pembangunan Perumahan Perdesaan ({pegawaiList.length} Pegawai Terdaftar)</p>
            </div>
            <div className="w-full md:w-80 relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <i data-lucide="search" className="w-4 h-4"></i>
              </span>
              <input 
                type="text" 
                placeholder="Cari nama, NIP, sub unit..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-700 shadow-2xs" 
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-gray-500 flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-teal-800 border-t-transparent rounded-full animate-spin"></div>
              <span>Memuat data kepegawaian...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredPegawai.map((item, index) => (
                <div key={index} className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 hover:shadow-md transition-shadow">
                  <h3 className="font-extrabold text-lg text-gray-900 mb-1">{item.Nama}</h3>
                  <p className="text-xs text-gray-500">NIP {item.NIP} • {item.SubUnitKerja || item['Sub Unit Kerja']}</p>
                  <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div><span className="font-bold text-gray-400">JABATAN:</span><div className="font-semibold text-gray-800 mt-0.5">{item.Jabatan}</div></div>
                    <div><span className="font-bold text-gray-400">EMAIL:</span><div className="font-semibold text-teal-700 mt-0.5">{item.EmailDinas || item['Email Dinas']}</div></div>
                    <div><span className="font-bold text-gray-400">ATASAN:</span><div className="font-semibold text-gray-800 mt-0.5">{item.AtasanLangsung || item['Atasan Langsung']}</div></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    };

    const PlaceholderView = ({ title, navigate }) => (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
          <i data-lucide="file-bar-chart" className="w-7 h-7"></i>
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: colors.midnightGreen }}>{title}</h2>
        <p className="text-gray-500 mb-8 max-w-sm text-sm">Fitur ini sedang dalam tahap sinkronisasi data rekapitulasi berkala.</p>
        <button onClick={() => navigate('home')} className="px-6 py-2.5 rounded-xl text-white font-medium flex items-center gap-2" style={{ backgroundColor: colors.midnightGreen }}>
          <i data-lucide="arrow-left" className="w-4 h-4"></i> Kembali ke Beranda
        </button>
      </div>
    );

    function App() {
      const [currentView, setCurrentView] = useState(() => {
        const hash = window.location.hash.replace('#/', '');
        return hash || 'home';
      });
      const [loggedInUser, setLoggedInUser] = useState(null);

      useEffect(() => {
        const handleHashChange = () => {
          const hash = window.location.hash.replace('#/', '');
          setCurrentView(hash || 'home');
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
      }, []);

      useEffect(() => {
        if (window.lucide) {
          window.lucide.createIcons();
        }
      }, [currentView, loggedInUser]);

      const navigate = (viewName) => {
        window.location.hash = viewName === 'home' ? '' : `#/${viewName}`;
        setCurrentView(viewName);
        window.scrollTo(0, 0);
      };

      const handleLogout = () => {
        setLoggedInUser(null);
        navigate('home');
      };

      const dashboardRoutes = ['absensi-uang-makan', 'absensi-tunjangan-kinerja', 'arsip-surat-tugas', 'arsip-surat-cuti'];

      const renderView = () => {
        if (dashboardRoutes.includes(currentView)) {
          if (!loggedInUser) return <LoginView navigate={navigate} onLoginSuccess={setLoggedInUser} />;
          return <UserDashboardView loggedInUser={loggedInUser} onLogout={handleLogout} navigate={navigate} activeRoute={currentView} />;
        }

        switch(currentView) {
          case 'home':
            return <DashboardHome navigate={navigate} loggedInUser={loggedInUser} />;
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

      const isDashboardRoute = dashboardRoutes.includes(currentView);

      return (
        <div className="min-h-screen font-sans bg-[#F7FAFC]">
          {!isDashboardRoute && <Header navigate={navigate} loggedInUser={loggedInUser} onLogout={handleLogout} />}
          <main>{renderView()}</main>
        </div>
      );
    }

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>