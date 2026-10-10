// Khaki belongs to admin Tukin calculation only, not personal recap or meal pay.
export function submissionTheme(modul, adminMode = false) {
  const khaki = adminMode && modul === 'tukin';
  return {
    khaki,
    bannerStyle: { backgroundColor: khaki ? '#D5C58A' : '#084C61', color: khaki ? '#000000' : '#FFFFFF', borderBottom: `1px solid ${khaki ? '#B7A66A' : '#0E5B73'}` },
    buttonClass: khaki ? 'bg-[#D5C58A] text-black hover:bg-[#C5B477] focus-visible:ring-[#A39051]' : 'bg-[#143E50] text-white hover:bg-[#084C61] focus-visible:ring-[#084C61]',
    mutedTextClass: khaki ? 'text-black' : 'text-gray-200',
  };
}
