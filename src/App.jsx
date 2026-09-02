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
  Mail
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

const fallbackPegawaiData = [
  { 
    Nama: "Rini Dyah Mawarty, S.T., M.T.", 
    NIP: "197012151998032007", 
    Golongan: "IV/b", 
    Jabatan: "Direktur Pembangunan Perumahan Perdesaan", 
    JenisASN: "PNS", 
    EmailDinas: "rinidm@pkp.go.id",
    SubUnitKerja: "Direktorat Pembangunan Perumahan Perdesaan",
    KelasJabatan: "15",
    AtasanLangsung: "Direktur Jenderal",
    JabatanAtasanLangsung: "Direktur Jenderal Perumahan"
  },
  { 
    Nama: "Ir. Marlina Rumiris S., S.T., M.Si.", 
    NIP: "197505182006052001", 
    Golongan: "IV/b", 
    Jabatan: "Kepala Subdirektorat Perencanaan Teknis Pembangunan Perumahan Perdesaan", 
    JenisASN: "PNS", 
    EmailDinas: "marlina.rumiris@pkp.go.id",
    SubUnitKerja: "Subdit Perencanaan Teknis",
    KelasJabatan: "11",
    AtasanLangsung: "Rini Dyah Mawarty, S.T., M.T.",
    JabatanAtasanLangsung: "Direktur Pembangunan Perumahan Perdesaan"
  }
];

const Header = ({ navigate }) => {
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
        <button className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
          <MessageCircle size={16} /> Bantuan
        </button>
        <button className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
          <HelpCircle size={16} /> FAQ
        </button>
        <button 
          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity pl-4 border-l border-gray-200"
          onClick={() => navigate('profile')}
        >
          <User size={16} /> Profil Pegawai
        </button>
      </div>

      <div className="md:hidden flex items-center gap-2">
         <button onClick={() => navigate('profile')} className="p-2 rounded-lg bg-gray-50">
           <User size={18} style={{ color: colors.midnightGreen }} />
         </button>
      </div>
    </header>
  );
};

const Dashboard = ({ navigate }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
        
        <div className="flex-1">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider mb-3 uppercase shadow-2xs" style={{ backgroundColor: colors.krem, color: colors.midnightGreen }}>
              SISTEM KEPEGAWAIAN
            </span>
            <h1 className="text-3xl md:text-5xl font-black mb-4 leading-tight" style={{ color: colors.midnightGreen }}>
              Direktorat Pembangunan<br/>Perumahan Perdesaan,<br/>Kementerian PKP
            </h1>
            <p className="text-gray-600 text-base md:text-lg max-w-xl leading-relaxed font-normal mb-6">
              Data kepegawaian, pemantauan kedisiplinan berkala, serta arsip dokumentasi resmi Direktorat Pembangunan Perumahan Perdesaan.
            </p>
            
            <button 
              onClick={() => navigate('profile')}
              className="px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 shadow-sm transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: colors.midnightGreen }}
            >
              <Briefcase size={18} /> Lihat Bank Data Pegawai
            </button>
          </div>
        </div>

        <div className="w-full lg:w-[400px] flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="px-5 py-4 text-white font-bold text-sm flex items-center gap-2" style={{ backgroundColor: colors.midnightGreen }}>
              <Trophy size={16} /> PALING DISIPLIN • PERIODE BERKALA
            </div>
            
            <div className="p-8 text-center text-gray-400 text-sm italic">
              Data kedisiplinan berkala akan segera diperbarui secara berkala dari sumber data resmi.
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

const ProfileView = ({ navigate }) => {
  const [pegawaiList, setPegawaiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const googleSheetCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSZg0RHcCXIRjoKsdZKKZAjUdPwo7eLGf6vSes38wDqcMX5yt97OqBPLRIwXglDoDGlbdb9Hb1Nqe_T/pub?gid=1517384244&single=true&output=csv";

    fetch(googleSheetCsvUrl)
      .then((response) => {
        if (!response.ok) throw new Error("Gagal mengambil data dari Google Spreadsheet");
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
            if (char === '\r' && nextChar === '\n') {
              i++;
            }
            currentRow.push(currentField.trim());
            if (currentRow.some(field => field !== '')) {
              rows.push(currentRow);
            }
            currentRow = [];
            currentField = '';
          } else {
            currentField += char;
          }
        }
        if (currentField !== '' || currentRow.length > 0) {
          currentRow.push(currentField.trim());
          if (currentRow.some(field => field !== '')) {
            rows.push(currentRow);
          }
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
          if (data.length > 0) {
            setPegawaiList(data);
          } else {
            setPegawaiList(fallbackPegawaiData);
          }
        } else {
          setPegawaiList(fallbackPegawaiData);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.warn("Menggunakan data cadangan:", error);
        setPegawaiList(fallbackPegawaiData);
        setLoading(false);
      });
  }, []);

  const filteredPegawai = pegawaiList.filter(item => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;

    const nama = (item.Nama || '').toLowerCase();
    const nip = (item.NIP || '').toLowerCase();
    const jabatan = (item.Jabatan || '').toLowerCase();
    const subUnit = (item.SubUnitKerja || item['Sub Unit Kerja'] || '').toLowerCase();

    // Strict and precise matching for sub-unit fields to prevent unwanted overlap (e.g., Wilayah II vs Wilayah III)
    if (term.includes('wilayah iii') || term === 'wilayah iii') {
      return subUnit.includes('wilayah iii');
    }
    if (term.includes('wilayah ii') && !term.includes('wilayah iii')) {
      return subUnit.includes('wilayah ii') && !subUnit.includes('wilayah iii');
    }
    if (term.includes('wilayah i') && !term.includes('wilayah ii') && !term.includes('wilayah iii')) {
      return subUnit.includes('wilayah i') && !subUnit.includes('wilayah ii') && !subUnit.includes('wilayah iii');
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

        <div className="w-full md:w-72 relative">
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
                        <Mail size={14} className="text-gray-400" /> {email}
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
        <ArrowLeft size={16} /> Kembali ke Dashboard
      </button>
    </div>
  );
};

export default function App() {
  const [currentView, setCurrentView] = useState('home');

  const renderView = () => {
    switch(currentView) {
      case 'home':
        return <Dashboard navigate={setCurrentView} />;
      case 'rekap':
        return <PlaceholderView title="Rekap Bulanan" navigate={setCurrentView} />;
      case 'profile':
        return <ProfileView navigate={setCurrentView} />;
      default:
        return <Dashboard navigate={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-teal-900 selection:text-white bg-[#FAFAFA]">
      <div className="relative z-10">
        <Header navigate={setCurrentView} />
        <main>
          {renderView()}
        </main>
      </div>
    </div>
  );
}