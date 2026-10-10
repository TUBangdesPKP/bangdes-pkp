import { UploadCloud } from 'lucide-react';

export function ArchiveFileDropzone({ documentModule, disabled, isDragging, onDragActiveChange, onFiles, manual = false, entryId, fileName = '', error = '' }) {
  const label = documentModule === 'spt' ? 'SPT' : documentModule === 'extra' ? 'pendukung lainnya' : 'Cuti';
  const inputId = manual ? `manual-upload-${documentModule}-${entryId}` : `arsip-upload-${documentModule}`;
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
        if (!disabled && event.dataTransfer.files?.length) onFiles(event.dataTransfer.files);
      }}
      className={`border-2 border-dashed flex flex-col items-center justify-center transition-colors text-center group focus-within:ring-2 focus-within:ring-[#0E5B73] ${manual ? 'rounded-xl p-4 gap-2 mb-4' : 'rounded-2xl p-8 gap-3 mb-6'} ${disabled ? 'opacity-60 cursor-not-allowed border-gray-200 bg-[#F7FAFC]' : isDragging ? 'border-[#0E5B73] bg-[#EAF5FA] cursor-copy' : 'border-gray-200 hover:border-[#0E5B73] bg-[#F7FAFC] cursor-pointer'}`}>
      <div className={manual ? 'text-gray-400 group-hover:text-[#0E5B73]' : 'w-12 h-12 rounded-full bg-white flex items-center justify-center text-gray-400 group-hover:text-[#0E5B73] shadow-sm transition-colors'}>
        <UploadCloud size={manual ? 20 : 24} />
      </div>
      <div className="min-w-0 max-w-full">
        <p className={`${manual ? 'text-xs font-semibold break-words' : 'text-sm font-bold'} text-gray-700 group-hover:text-[#0E5B73]`}>{isDragging && !disabled ? 'Lepaskan file di sini' : manual && fileName ? fileName : manual ? `Klik atau drag & drop file ${label}` : 'Klik atau drag & drop file'}</p>
        <p className="text-[10px] font-medium text-gray-400 mt-1">{manual ? '1 file PDF, JPG, PNG (maks. 10 MB)' : documentModule === 'extra' ? 'PDF, JPG, PNG · Maksimal 10 dokumen, 10 MB per file' : 'PDF (1 halaman), JPG, PNG (max 10MB)'}</p>
        {error && <p id={`${inputId}-error`} role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
      </div>
      <input id={inputId} aria-label={`Pilih dokumen ${label}${manual ? ' manual' : ''}`} aria-invalid={!!error} aria-describedby={error ? `${inputId}-error` : undefined} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple={!manual} disabled={disabled}
        onChange={event => { if (!disabled) onFiles(event.target.files); event.target.value = ''; }} className="sr-only" />
    </label>
  );
}
