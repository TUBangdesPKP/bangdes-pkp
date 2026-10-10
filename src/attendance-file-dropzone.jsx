import { useState } from 'react';
import { UploadCloud } from 'lucide-react';

export function AttendanceFileDropzone({ disabled, fileName, onFiles }) {
  const [dragging, setDragging] = useState(false);
  const over = event => {
    event.preventDefault(); event.stopPropagation();
    const accepted = !disabled && Array.from(event.dataTransfer.types || []).includes('Files');
    event.dataTransfer.dropEffect = accepted ? 'copy' : 'none';
    setDragging(accepted);
  };
  return <label className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center text-xs focus-within:ring-2 focus-within:ring-[#084C61] ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${dragging ? 'border-[#084C61] bg-teal-50' : 'border-slate-300 bg-slate-50 hover:border-[#084C61]'}`}
    onDragEnter={over} onDragOver={over} onDragLeave={event => { event.preventDefault(); if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
    onDrop={event => { event.preventDefault(); event.stopPropagation(); setDragging(false); if (!disabled) onFiles(event.dataTransfer.files); }}>
    <UploadCloud size={24} className="text-[#084C61]"/>
    <span className="font-bold text-[#084C61] break-all">{dragging ? 'Lepaskan file presensi di sini' : fileName || 'Klik atau drag & drop file presensi'}</span>
    <span className="text-slate-500">1 file PDF atau Excel (.xlsx, .xls)</span>
    <input id="pdf-upload-input" aria-label="Pilih file presensi" type="file" accept=".pdf,.xlsx,.xls" disabled={disabled} className="sr-only"
      onChange={event => { if (!disabled) onFiles(event.target.files); event.target.value = ''; }}/>
  </label>;
}
