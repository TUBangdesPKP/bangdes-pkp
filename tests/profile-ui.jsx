import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { UserDashboardView } from '../src/App.jsx';
import '../src/index.css';
const person={Nama:'Pegawai Simulasi',NIP:'000000000000000001',Jabatan:'Analis Perumahan',SubUnitKerja:'Subdirektorat Simulasi',sessionToken:'fixture-only',Akun_Role:'pegawai',Foto_Pegawai:''};
window.fetch=async (_url,options)=>{
  if(!options?.body)return Response.json([]);
  const p=JSON.parse(options.body);
  if(p.action==='profil_saya')return Response.json({status:'success',user:person});
  throw Error('Simulasi hanya-baca; tidak mengirim perubahan ke backend.');
};
function Fixture(){const [user,setUser]=useState(person),[view,setView]=useState('profil-saya');return <UserDashboardView loggedInUser={user} onProfileUpdate={setUser} onLogoutRequest={()=>{}} navigate={setView} currentView={view} activeStep={1}/>;}
createRoot(document.getElementById('root')).render(<Fixture/>);
