import React from 'react';
import { UploadCloud } from 'lucide-react';

export function ArchiveFileDropzone({ documentModule, disabled, isDragging, onDragActiveChange, onFiles }) {
  const stopDrag = event => {
    event.preventDefault();
    event.stopPropagation();
  };
  const acceptDrag = event => {
    stopDrag(event);
    const hasFiles = Array.from(event.dataTransfer.types || []).includes('Files');
    event.dataTransfer.dropEffect = !disabled && hasFiles ? 'copy' : 'none';
    onDragActiveChange(!disabled && hasFiles);
  };
  return (
    <label
      onDragEnter={acceptDrag} onDragOver={acceptDrag}
      onDragLeave={event => {
        stopDrag(event);
        if (!event.currentTarget.contains(event.relatedTarget)) onDragActiveChange(false);
      }}
      onDrop={event => {
        stopDrag(event);
        onDragActiveChange(false);
        if (!disabled) onFiles(event.dataTransfer.files);
      }}
      className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-colors text-center group mb-6 focus-within:ring-2 focus-within:ring-[#0E5B73] ${disabled ? 'opacity-60 cursor-not-allowed border-gray-200 bg-[#F7FAFC]' : isDragging ? 'border-[#0E5B73] bg-[#EAF5FA] cursor-copy' : 'border-gray-200 hover:border-[#0E5B73] bg-[#F7FAFC] cursor-pointer'}`}>
      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-gray-400 group-hover:text-[#0E5B73] shadow-sm transition-colors">
        <UploadCloud size={24} />
      </div>
      <div>
        <p className="text-sm font-bold text-gray-700 group-hover:text-[#0E5B73]">{isDragging && !disabled ? 'Lepaskan file di sini' : 'Klik atau drag & drop file'}</p>
        <p className="text-[10px] font-medium text-gray-400 mt-1">PDF (1 halaman), JPG, PNG (max 10MB)</p>
      </div>
      <input id={`arsip-upload-${documentModule}`} aria-label={`Pilih dokumen ${documentModule === 'spt' ? 'SPT' : 'Cuti'}`} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple disabled={disabled}
        onChange={event => { if (!disabled) onFiles(event.target.files); event.target.value = ''; }} className="sr-only" />
    </label>
  );
}
