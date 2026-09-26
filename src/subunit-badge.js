// Stable labels and colours, independent of ranking order or the active filter.
export function subunitBadge(value) {
  const fullName = String(value || '').trim().replace(/\s+/g, ' ');
  const name = fullName.toLowerCase();
  if (name === 'direktorat pembangunan perumahan perdesaan' || name === 'direktorat') return { label: 'Direktorat', background: '#204E6C', color: '#FFFFFF' };
  if (name === 'subdirektorat perencanaan teknis' || name === 'rentek') return { label: 'Rentek', background: '#74B9CA', color: '#133B49' };
  if (name === 'subbagian tata usaha' || name === 'tata usaha') return { label: 'Tata Usaha', background: '#BCAB88', color: '#243746' };
  const wilayah = name.match(/^(?:subdirektorat |subdit )?wilayah ([ivx]+)$/);
  if (wilayah) {
    const numeral = wilayah[1].toUpperCase();
    const palette = { I: ['#476879', '#FFFFFF'], II: ['#819C8A', '#17372A'], III: ['#204E6C', '#FFFFFF'], IV: ['#E6DCEF', '#503065'], V: ['#F2DBC3', '#65421F'] };
    const [background, color] = palette[numeral] || ['#E2E8F0', '#334155'];
    return { label: `Wilayah ${numeral}`, background, color };
  }
  return { label: fullName || 'SubUnit belum diisi', background: '#E2E8F0', color: '#334155' };
}

export const recapUnitLabels = ['Rentek', 'Wilayah I', 'Wilayah II', 'Wilayah III', 'Tata Usaha'];

export function leaderComposition(leaders) {
  const groups = new Map();
  leaders.forEach(row => {
    const badge = subunitBadge(row.unit);
    const group = groups.get(badge.label) || { ...badge, count: 0 };
    group.count++; groups.set(badge.label, group);
  });
  const order = ['Direktorat', ...recapUnitLabels];
  return [...groups.values()].map(group => ({ ...group, percentage: group.count / leaders.length * 100 }))
    .sort((a, b) => (order.indexOf(a.label) < 0 ? 99 : order.indexOf(a.label)) - (order.indexOf(b.label) < 0 ? 99 : order.indexOf(b.label)) || a.label.localeCompare(b.label));
}
