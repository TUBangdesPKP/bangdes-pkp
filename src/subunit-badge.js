// Stable labels and colours, independent of ranking order or the active filter.
export function subunitBadge(value) {
  const fullName = String(value || '').trim().replace(/\s+/g, ' ');
  const name = fullName.toLowerCase();
  if (name === 'subdirektorat perencanaan teknis' || name === 'rentek') return { label: 'Rentek', background: '#D5C58A', color: '#243746' };
  if (name === 'subbagian tata usaha' || name === 'tata usaha') return { label: 'Tata Usaha', background: '#084C61', color: '#FFFFFF' };
  const wilayah = name.match(/^(?:subdirektorat |subdit )?wilayah ([ivx]+)$/);
  if (wilayah) {
    const numeral = wilayah[1].toUpperCase();
    const palette = { I: ['#74B9CA', '#133B49'], II: ['#476879', '#FFFFFF'], III: ['#DCE8D4', '#294A31'], IV: ['#E6DCEF', '#503065'], V: ['#F2DBC3', '#65421F'] };
    const [background, color] = palette[numeral] || ['#E2E8F0', '#334155'];
    return { label: `Wilayah ${numeral}`, background, color };
  }
  return { label: fullName || 'SubUnit belum diisi', background: '#E2E8F0', color: '#334155' };
}
