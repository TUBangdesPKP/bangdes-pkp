import {createRoot} from 'react-dom/client';
import {KepegawaianPage} from '../src/kepegawaian.jsx';
import {OrganizationPage} from '../src/organization.jsx';
import '../src/index.css';

const jobs=['Direktur Pembangunan Perumahan Perdesaan','Kepala Subdirektorat Perencanaan Teknis','Kepala Subdirektorat Wilayah I','Kepala Subdirektorat Wilayah II','Kepala Subdirektorat Wilayah III','Kepala Subbagian Tata Usaha'];
const units=['Perencanaan Teknis','Wilayah I','Wilayah II','Wilayah III','Tata Usaha','Direktorat Pembangunan Perumahan Perdesaan'];
const data=Array.from({length:48},(_,i)=>({NIP:`19900101202001${String(i+1).padStart(4,'0')}`,Nama:`Pegawai Simulasi ${i+1}, S.T., M.T.`,Jabatan:jobs[i] || 'Penata Kelola Perumahan Ahli Pertama',SubUnitKerja:units[i%6],GolonganRuang:'III/a'}));
const loadPeople=async()=>({data,source:'fixture'});
createRoot(document.getElementById('root')).render(<main className="h-screen bg-[#F7F9FA]"><KepegawaianPage struktur={<OrganizationPage loadPeople={loadPeople}/>} demografi={<p>Demografi simulasi</p>} cuti={<p>Rekap Cuti simulasi</p>} kompetensi={<p>Pemenuhan Kompetensi simulasi</p>}><p>Data Pegawai simulasi</p></KepegawaianPage></main>);
