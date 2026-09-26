export function PkpLogo({ className = '' }) {
  return <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0E5B73] ${className}`}>
    <img src="/pkp-logo-khaki.png" alt="Logo Kementerian PKP" width="28" height="30" className="h-[30px] w-7 object-contain"/>
  </span>;
}
