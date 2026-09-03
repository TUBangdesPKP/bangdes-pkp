import React, { useState, useEffect } from 'react';
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
  AlertCircle
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

const Header = ({ navigate, loggedInUser, onLogout }) => {
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
              <p className="text-[10px] text-teal-700 font-semibold">{loggedInUser.role === 'admin' ? 'Super Admin' : 'Pegawai'}</p>
            </div>
            <button 
              onClick={onLogout}
              className="px-3 py-1.5 text-xs font-bold bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
            >
              Keluar
            </button>
          </div>
        ) : (
          <button 
            onClick={() => navigate('login')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold text-white shadow-sm transition-transform hover:scale-105"
            style={{ backgroundColor: colors.midnightGreen }}
          >
            <User size={16} /> Login Pegawai
          </button>
        )}
      </div>
    </header>
  );
};

const Dashboard = ({ navigate, loggedInUser }) => {
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
              Rekap Absensi, Cuti Pegawai, Penghitungan Uang Makan dan Tunjangan Kinerja
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
                onClick={() => navigate('upload-uam')}
                className="px-6 py-3 rounded-xl font-bold text-gray-800 bg-white border border-gray-200 flex items-center gap-2 shadow-sm transition-transform hover:scale-[1.02]"
              >
                <span className="text-teal-700 font-bold">↑</span> Upload Bukti Dukung Uang Makan
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
  const [loginNip, setLoginNip] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleLogin = (e) => {
    e.preventDefault();
    if (!loginNip || !loginPin) {
      setMessage({ type: 'error', text: 'NIP dan PIN wajib diisi.' });
      return;
    }

    if (loginNip === 'admin' && loginPin === '123456') {
      const adminUser = { nip: 'admin', Nama: 'Super Admin Direktorat', role: 'admin' };
      onLoginSuccess(adminUser);
      navigate('home');
      return;
    }

    const accounts = JSON.parse(localStorage.getItem('bangdes_accounts') || '{}');
    const userAccount = accounts[loginNip];

    if (!userAccount) {
      setMessage({ type: 'error', text: 'Akun NIP tidak ditemukan atau belum terdaftar.' });
      return;
    }

    if (userAccount.pin !== loginPin) {
      setMessage({ type: 'error', text: 'PIN salah. Silakan coba kembali.' });
      return;
    }

    onLoginSuccess(userAccount);
    navigate('home');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-4 text-white shadow-sm" style={{ backgroundColor: colors.midnightGreen }}>
            <User size={24} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-1">Login Administrator</h2>
          <p className="text-xs text-gray-500">Gunakan NIP dan PIN Administrator untuk otorisasi unggah.</p>
        </div>

        {message.text && (
          <div className={`p-4 rounded-2xl text-xs mb-6 flex items-center gap-3 ${message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-100' : 'bg-emerald-50 text-emerald-800 border border-emerald-100'}`}>
            {message.type === 'error' ? <AlertCircle size={18} className="text-red-600 shrink-0" /> : <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">NIP / ID Administrator</label>
            <input 
              type="text" 
              placeholder="Contoh: admin atau 1994..."
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
            className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-md transition-opacity hover:opacity-90 active:scale-[0.98] mt-4"
            style={{ backgroundColor: colors.midnightGreen }}
          >
            Masuk Sistem
          </button>
        </form>

        <div className="mt-8 pt-4 border-t border-gray-100 text-center">
          <button onClick={() => navigate('home')} className="text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center justify-center gap-1 mx-auto">
            <ArrowLeft size={14} /> Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  );
};

const ProfileView = ({ navigate }) => {
  const [pegawaiList, setPegawaiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const googleSheetCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSZg0RHcCXIRjoKsdZKKZAjUdPwo7eLGf6vSes38wDqcMX5yt97OqBPLRIwXglDoDGlbdb9Hb1Nqe_T/pub?gid=1517384244&single=true&output=csv";

    fetch(googleSheetCsvUrl)
      .then((response) => {
        if (!response.ok) throw new Error("Gagal mengambil data");
        return response.text();
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
            if (insideQuote && nextChar === '"') {
              currentField += '"';
              i++;
            } else {
              insideQuote = !insideQuote;
            }
          } else if (char === ',' && !insideQuote) {
            currentRow.push(currentField.trim());
            currentField = '';
          } else if ((char === '\r' || char === '\n') && !insideQuote) {
            if (char === '\r' && nextChar === '\n') i++;
            currentRow.push(currentField.trim());
            if (currentRow.some(field => field !== '')) rows.push(currentRow);
            currentRow = [];
            currentField = '';
          } else {
            currentField += char;
          }
        }
        if (currentField !== '' || currentRow.length > 0) {
          currentRow.push(currentField.trim());
          if (currentRow.some(field => field !== '')) rows.push(currentRow);
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
        }
        setLoading(false);
      })
      .catch((error) => {
        console.warn("Gagal mengambil data:", error);
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

    // Strict exact or tokenized match for sub-unit to avoid III matching II
    if (term.includes('subdirektorat wilayah')) {
      return subUnit === term;
    }

    return nama.includes(term) || nip.includes(term) || jabatan.includes(term) || subUnit.includes(term);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <button 
            onClick={() => navigate('home')}
            className="text-sm font-semibold flex items-center gap-1.5 text-gray-500 hover:text-gray-800 mb-2 transition-colors"
          >
            <ArrowLeft size={16} /> Kembali ke Dashboard
          </button>
          <h2 className="text-2xl md:text-3xl font-black" style={{ color: colors.midnightGreen }}>
            Bank Data Profil Pegawai
          </h2>
          <p className="text-sm text-gray-500">Direktorat Pembangunan Perumahan Perdesaan ({pegawaiList.length} Pegawai Terdaftar)</p>
        </div>

        <div className="w-full md:w-80 relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            <Search size={18} />
          </span>
          <input 
            type="text"
            placeholder="Cari nama, NIP, sub unit, atau jabatan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-700 shadow-2xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500 font-medium">Memuat data kepegawaian dari Google Spreadsheet...</div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredPegawai.length > 0 ? (
            filteredPegawai.map((item, index) => {
              const subUnit = item.SubUnitKerja || item['Sub Unit Kerja'] || '';
              const rawKelas = item.KelasJabatan || item['Kelas Jabatan'] || '';
              const kelasFormatted = rawKelas ? (rawKelas.toLowerCase().includes('kelas') ? rawKelas : `Kelas Jabatan ${rawKelas}`) : '';
              const atasan = item.AtasanLangsung || item['Atasan Langsung'] || '-';
              const jabatanAtasan = item.JabatanAtasanLangsung || item['Jabatan Atasan Langsung'] || '';
              const email = item.EmailDinas || item['Email Dinas'] || 'email@pkp.go.id';
              const nip = item.NIP || '-';
              const jabatan = item.Jabatan || '-';

              return (
                <div key={index} className="bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all overflow-hidden p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                    <div>
                      <h3 className="font-extrabold text-lg md:text-xl text-gray-900 mb-1.5 leading-snug">{item.Nama}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-gray-500 font-medium">NIP {nip}</span>
                        
                        {subUnit && (
                          <span className="px-3 py-1 rounded-full font-bold text-xs" style={{ backgroundColor: '#E2F0F5', color: colors.darkAqua }}>
                            {subUnit}
                          </span>
                        )}

                        {kelasFormatted && (
                          <span className="px-3 py-1 rounded-full font-bold text-xs" style={{ backgroundColor: colors.krem, color: '#8C7A32' }}>
                            {kelasFormatted}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs md:text-sm">
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1">JABATAN</div>
                      <div className="font-semibold text-gray-800 leading-snug">{jabatan}</div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1">EMAIL DINAS</div>
                      <div className="font-semibold text-gray-800 leading-snug flex items-center gap-1.5">
                        <FileText size={14} className="text-gray-400" /> {email}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1">ATASAN LANGSUNG</div>
                      <div className="font-semibold text-gray-800 leading-snug">{atasan}</div>
                      {jabatanAtasan && (
                        <div className="text-[11px] text-gray-400 mt-0.5 leading-tight">{jabatanAtasan}</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
              Tidak ada data pegawai yang cocok dengan pencarian Anda.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const UploadUamView = ({ navigate, loggedInUser }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploaded, setUploaded] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    setUploaded(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
      <button 
        onClick={() => navigate('home')}
        className="text-sm font-semibold flex items-center gap-1.5 text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Kembali ke Beranda
      </button>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden p-6 md:p-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b border-gray-100 mb-8">
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 uppercase" style={{ backgroundColor: colors.krem, color: colors.midnightGreen }}>
              Uang Makan Agustus 2026
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900">Upload Bukti Dukung Uang Makan</h2>
            <p className="text-sm text-gray-500 mt-1">Periode Event: 1/8/2026 s/d 31/8/2026</p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
            <CheckCircle2 size={16} /> Rentang Tanggal Sesuai
          </div>
        </div>

        {!loggedInUser || loggedInUser.role !== 'admin' ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center text-amber-900 mb-8">
            <AlertCircle size={28} className="mx-auto mb-2 text-amber-600" />
            <h3 className="font-extrabold text-base mb-1">Otorisasi Administrator Diperlukan</h3>
            <p className="text-xs text-amber-700 max-w-md mx-auto mb-4">
              Anda harus masuk sebagai Super Admin untuk melakukan unggah berkas bukti dukung uang makan.
            </p>
            <button 
              onClick={() => navigate('login')}
              className="px-6 py-2.5 rounded-xl text-white font-bold text-xs shadow-md"
              style={{ backgroundColor: colors.midnightGreen }}
            >
              Login Administrator Sekarang
            </button>
          </div>
        ) : (
          <form onSubmit={handleUpload} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="font-extrabold text-base text-gray-900 mb-1">Pilih Berkas Presensi</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Unggah file hasil export dari eOffice atau myPKP berformat PDF Riwayat Presensi. Pastikan bukan hasil scan atau foto.
                </p>
              </div>

              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-teal-700 transition-colors bg-gray-50/50">
                <input 
                  type="file" 
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                />
              </div>

              {selectedFile && (
                <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 text-xs text-teal-900 flex items-center gap-3">
                  File terpilih: <span className="font-bold">{selectedFile.name}</span>
                </div>
              )}

              {uploaded && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-xs text-emerald-900 flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  <span>Berkas bukti dukung berhasil diunggah dan disimpan ke sistem!</span>
                </div>
              )}

              <button 
                type="submit"
                disabled={!selectedFile}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
                style={{ backgroundColor: colors.midnightGreen }}
              >
                Proses & Unggah Bukti Dukung
              </button>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <h4 className="font-extrabold text-sm text-gray-800 mb-3">Ketentuan Berkas:</h4>
              <ul className="space-y-2 text-xs text-gray-600 list-disc list-inside leading-relaxed">
                <li>Format dokumen wajib PDF asli dari sistem absensi kedinasan.</li>
                <li>Periode rekapitulasi mencakup bulan Agustus 2026.</li>
                <li>Pastikan data jam masuk dan pulang terbaca dengan jelas untuk verifikasi uang makan.</li>
              </ul>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const PlaceholderView = ({ title, navigate }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6 shadow-xs" style={{ color: colors.midnightGreen }}>
        <FileText size={32} />
      </div>
      <h2 className="text-2xl font-bold mb-2" style={{ color: colors.midnightGreen }}>Halaman {title}</h2>
      <p className="text-gray-500 mb-8 max-w-md">Fitur {title} sedang dipersiapkan.</p>
      <button 
        onClick={() => navigate('home')}
        className="px-6 py-2.5 rounded-xl text-white font-medium flex items-center gap-2 shadow-sm transition-opacity hover:opacity-90"
        style={{ backgroundColor: colors.midnightGreen }}
      >
        <ArrowLeft size={16} /> Kembali ke Beranda
      </button>
    </div>
  );
};

export default function App() {
  const [currentView, setCurrentView] = useState(() => {
    const hash = window.location.hash.replace('#/', '');
    return hash || 'home';
  });
  const [loggedInUser, setLoggedInUser] = useState(null);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      if (hash) {
        setCurrentView(hash);
      } else {
        setCurrentView('home');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (viewName) => {
    window.location.hash = viewName === 'home' ? '' : `#/${viewName}`;
    setCurrentView(viewName);
    window.scrollTo(0, 0);
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    navigate('home');
  };

  const renderView = () => {
    switch(currentView) {
      case 'home':
        return <Dashboard navigate={navigate} loggedInUser={loggedInUser} />;
      case 'rekap':
        return <PlaceholderView title="Rekap Bulanan" navigate={navigate} />;
      case 'profile':
        return <ProfileView navigate={navigate} />;
      case 'upload-uam':
        return <UploadUamView navigate={navigate} loggedInUser={loggedInUser} />;
      case 'login':
        return <LoginView navigate={navigate} onLoginSuccess={setLoggedInUser} />;
      default:
        return <Dashboard navigate={navigate} loggedInUser={loggedInUser} />;
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-teal-900 selection:text-white bg-[#F7FAFC]">
      <div className="relative z-10">
        <Header navigate={navigate} loggedInUser={loggedInUser} onLogout={handleLogout} />
        <main>
          {renderView()}
        </main>
      </div>
    </div>
  );
}