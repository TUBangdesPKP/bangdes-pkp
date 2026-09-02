import React, { useState } from 'react';
import { 
  FileText, 
  HelpCircle, 
  MessageCircle, 
  User, 
  Lock, 
  Upload, 
  Trophy, 
  ChevronRight, 
  FileBarChart, 
  Bell,
  ArrowLeft
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

const mockSubmissions = [
  {
    id: 1,
    status: 'DIBUKA',
    title: 'Bukti Dukung Presensi Januari-Juli 2026 PPPK Paruh Waktu',
    date: '1 Jan 2026 - 31 Jul 2026',
    category: 'Rekap Presensi (PPPK Paruh Waktu)',
  },
  {
    id: 2,
    status: 'DIBUKA',
    title: 'Bukti Dukung Lembur Agustus 2026',
    date: '1 Agu 2026 - 31 Agu 2026',
    category: 'Bukti Dukung Lembur',
  },
  {
    id: 3,
    status: 'DIBUKA',
    title: 'Bukti Dukung Presensi PPPK Paruh Waktu Agustus 2026',
    date: '1 Agu 2026 - 31 Agu 2026',
    category: 'Rekap Presensi (PPPK Paruh Waktu)',
  },
  {
    id: 4,
    status: 'DIBUKA',
    title: 'Bukti Dukung Uang Makan Agustus 2026',
    date: '1 Agu 2026 - 31 Agu 2026',
    category: 'Uang Makan',
  }
];

const mockLeaderboard = [
  { id: 1, name: 'Eka Firta Puspitasari, S.E., M.Ak.', role: 'Pranata Keuangan APBN Penyelia', unit: 'Satker Kalteng', initials: 'E', rank: 1 },
  { id: 2, name: 'Anugerah Aditya Purnama, S.T.', role: 'Teknik Tata Bangunan dan Perumahan Ahli Pertama', unit: 'Balai', initials: 'A', rank: 2, avatar: true },
  { id: 3, name: 'Alfonsus Sri Agseyoga, S.T.', role: 'Teknik Tata Bangunan dan Perumahan Ahli Pertama', unit: 'Balai', initials: 'A', rank: 3, avatar: true },
  { id: 4, name: 'M Yovie Oktriadi, A.Md.', role: 'Pengelola Layanan Operasional', unit: 'Satker Kalbar', initials: 'M', rank: 4, avatar: true },
  { id: 5, name: 'Nada Alifia, S.Ars.', role: 'Teknik Tata Bangunan dan Perumahan Ahli Pertama', unit: 'Balai', initials: 'N', rank: 5, avatar: true },
];

const Header = ({ navigate }) => (
  <header className="w-full bg-white border-b border-gray-100 sticky top-0 z-10 px-4 md:px-8 py-4 flex justify-between items-center">
    <div 
      className="flex items-center gap-3 cursor-pointer"
      onClick={() => navigate('home')}
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: colors.midnightGreen }}>
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Pancasila_Coat_of_Arms_of_Indonesia.svg/800px-Pancasila_Coat_of_Arms_of_Indonesia.svg.png" alt="Logo" className="w-6 h-6 object-contain filter brightness-0 invert" />
      </div>
      <div>
        <h1 className="font-bold text-lg leading-tight" style={{ color: colors.midnightGreen }}>Direktorat Pembangunan Perumahan Perdesaan Kementerian PKP</h1>
        <p className="text-xs text-gray-500">Support System</p>
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

    {/* Mobile Menu Button - simplified for this demo */}
    <div className="md:hidden flex items-center">
       <button onClick={() => navigate('profile')} className="p-2">
         <User size={20} style={{ color: colors.midnightGreen }} />
       </button>
    </div>
  </header>
);

const Dashboard = ({ navigate }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
        
        {/* Left Column - Main Content */}
        <div className="flex-1">
          <div className="mb-10">
            <h2 className="text-sm font-bold tracking-wider mb-2 uppercase" style={{ color: colors.darkAqua }}>
              SISTEM KEPEGAWAIAN 
            </h2>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight" style={{ color: colors.midnightGreen }}>
              Direktorat Pembangunan Perumahan Perdesaan,<br/> Kementerian PKP
            </h1>
            <p className="text-gray-600 text-lg max-w-xl leading-relaxed">
              Unggah dokumen presensi, lacak riwayat pengumpulan, dan urus surat keperluan Anda — semuanya dari satu aplikasi.
            </p>
          </div>

          <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
            <Lock size={14} /> SEDANG DIBUKA
          </div>

          <div className="space-y-4">
            {mockSubmissions.map((item) => (
              <div key={item.id} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    <span className="text-xs font-bold text-green-600 uppercase tracking-wider">{item.status}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-1" style={{ color: colors.midnightGreen }}>{item.title}</h3>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                       <FileText size={14} /> {item.date}
                    </span>
                    <span className="hidden sm:inline">•</span>
                    <span>{item.category}</span>
                  </div>
                </div>
                <button 
                  onClick={() => navigate('upload')}
                  className="w-full md:w-auto px-6 py-2.5 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-transform active:scale-95"
                  style={{ backgroundColor: colors.midnightGreen }}
                >
                  <Upload size={16} /> Submit
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="w-full lg:w-[400px] flex flex-col gap-4">
          
          {/* Leaderboard Card */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="px-5 py-3 text-white font-bold text-sm flex items-center gap-2" style={{ backgroundColor: colors.midnightGreen }}>
              <Trophy size={16} /> PALING DISIPLIN • JULI 2026
            </div>
            <div className="p-0">
              {mockLeaderboard.map((person, index) => (
                <div key={person.id} className={`flex items-start gap-3 p-4 ${index !== mockLeaderboard.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <div className="relative">
                    {person.avatar ? (
                       <img src={`https://i.pravatar.cc/150?u=${person.id}`} alt={person.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold" style={{ backgroundColor: colors.krem, color: colors.midnightGreen }}>
                        {person.initials}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm" style={{ backgroundColor: person.rank <= 3 ? colors.khaki : colors.darkAqua }}>
                      {person.rank}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <h4 className="font-bold text-sm truncate pr-2" style={{ color: colors.textMain }}>{person.name}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ backgroundColor: colors.darkAqua, color: 'white' }}>
                        {person.unit}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-tight truncate">{person.role}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 bg-gray-50/50 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-wider">SEBARAN PALING DISIPLIN PER UNIT</p>
              <div className="w-full h-1.5 rounded-full flex overflow-hidden mb-2">
                <div className="h-full bg-blue-500" style={{ width: '60%' }}></div>
                <div className="h-full" style={{ width: '20%', backgroundColor: colors.khaki }}></div>
                <div className="h-full" style={{ width: '20%', backgroundColor: colors.darkAqua }}></div>
              </div>
              <div className="flex justify-between text-[10px] font-medium text-gray-600">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Balai 60%</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.khaki }}></span> Satker Kalbar 20%</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.darkAqua }}></span> Satker Kalteng 20%</div>
              </div>
            </div>
          </div>

          {/* Action Cards */}
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
                <div className="font-bold">Rekap Juli 2026</div>
              </div>
            </div>
            <ChevronRight size={20} className="opacity-80" />
          </div>

          <div className="rounded-xl p-4 flex items-center justify-between cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-[0.98]" style={{ backgroundColor: colors.khaki }}>
            <div className="flex items-center gap-3">
               <div className="p-2 rounded-lg bg-black/5" style={{ color: colors.midnightGreen }}>
                <FileText size={20} />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.midnightGreen, opacity: 0.8 }}>LAPORAN SURVEY</div>
                <div className="font-bold text-sm" style={{ color: colors.midnightGreen }}>Hasil Survei Kenyamanan Lingkungan Kerja BP3KP...</div>
              </div>
            </div>
            <ChevronRight size={20} style={{ color: colors.midnightGreen, opacity: 0.8 }} />
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-between cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
            <div className="flex items-center gap-3">
               <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Bell size={20} />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">PENGUMUMAN</div>
                <div className="font-bold text-sm" style={{ color: colors.midnightGreen }}>2 Fitur Baru di Menu Arsip SPT! (Buka di Profil Peg...</div>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </div>

        </div>
      </div>
    </div>
  );
};

const PlaceholderView = ({ title, navigate }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6" style={{ color: colors.midnightGreen }}>
      <FileText size={32} />
    </div>
    <h2 className="text-2xl font-bold mb-2" style={{ color: colors.midnightGreen }}>Halaman {title}</h2>
    <p className="text-gray-500 mb-8 max-w-md">Ini adalah halaman placeholder untuk fitur {title}. Dalam aplikasi nyata, ini akan berisi form atau data yang relevan.</p>
    <button 
      onClick={() => navigate('home')}
      className="px-6 py-2.5 rounded-lg text-white font-medium flex items-center gap-2"
      style={{ backgroundColor: colors.midnightGreen }}
    >
      <ArrowLeft size={16} /> Kembali ke Dashboard
    </button>
  </div>
);

const UploadView = ({ navigate }) => (
  <div className="max-w-3xl mx-auto px-4 py-8">
    <button 
      onClick={() => navigate('home')}
      className="flex items-center gap-2 text-sm font-medium mb-6 hover:underline"
      style={{ color: colors.darkAqua }}
    >
      <ArrowLeft size={16} /> Kembali
    </button>
    <div className="bg-white rounded-xl p-6 md:p-8 border border-gray-100 shadow-sm">
      <h2 className="text-2xl font-bold mb-6" style={{ color: colors.midnightGreen }}>Upload Bukti Dukung</h2>
      
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center mb-6 bg-gray-50">
        <Upload size={40} className="text-gray-400 mb-4" />
        <p className="font-medium text-gray-700 mb-1">Pilih file atau tarik ke sini</p>
        <p className="text-sm text-gray-500 mb-4">Mendukung PDF, JPG, PNG (Max 5MB)</p>
        <button className="px-4 py-2 rounded border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50">
          Pilih File
        </button>
      </div>

      <div className="flex justify-end">
         <button 
          className="px-6 py-2.5 rounded-lg text-white font-medium"
          style={{ backgroundColor: colors.midnightGreen }}
        >
          Kirim Dokumen
        </button>
      </div>
    </div>
  </div>
);

export default function App() {
  const [currentView, setCurrentView] = useState('home');

  // Simple router
  const renderView = () => {
    switch(currentView) {
      case 'home':
        return <Dashboard navigate={setCurrentView} />;
      case 'upload':
        return <UploadView navigate={setCurrentView} />;
      case 'rekap':
        return <PlaceholderView title="Rekap Bulanan" navigate={setCurrentView} />;
      case 'profile':
        return <PlaceholderView title="Profil Pegawai" navigate={setCurrentView} />;
      default:
        return <Dashboard navigate={setCurrentView} />;
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-teal-900 selection:text-white" style={{ backgroundColor: '#FAFAFA' }}>
      {/* Dynamic background element for aesthetic similar to reference */}
      <div 
        className="fixed top-0 right-0 w-1/2 h-screen opacity-10 pointer-events-none z-0"
        style={{
          background: `radial-gradient(circle at top right, ${colors.darkAqua} 0%, transparent 70%)`
        }}
      />
      
      <div className="relative z-10">
        <Header navigate={setCurrentView} />
        <main>
          {renderView()}
        </main>
      </div>
    </div>
  );
}