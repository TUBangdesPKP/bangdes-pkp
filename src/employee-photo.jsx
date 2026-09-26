import { useState } from 'react';
import { User } from 'lucide-react';
import { employeePhotoSources } from './employee-photo.js';

function Photo({ src, name, className }) {
  const sources = employeePhotoSources(src), [attempt, setAttempt] = useState(0);
  return <div className={`flex items-center justify-center overflow-hidden bg-slate-100 ${className}`}>
    {sources[attempt] ? <img src={sources[attempt]} alt={`Foto ${name || 'pegawai'}`} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-contain object-center" onError={() => setAttempt(value => value + 1)}/> : <User aria-label={`Foto ${name || 'pegawai'} belum tersedia`} className="text-slate-400 w-1/2 h-1/2"/>}
  </div>;
}

// Reset fallback state when the actual employee photo changes.
export function EmployeePhoto(props) { return <Photo key={props.src || ''} {...props}/>; }
