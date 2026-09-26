export function employeePhotoSources(value) {
  const raw = String(value || '').trim().replace(/^["']|["']$/g, '');
  const id = raw.match(/\/(?:file\/)?d\/([\w-]+)/)?.[1] || raw.match(/[?&]id=([\w-]+)/)?.[1] || (/^[\w-]{25,}$/.test(raw) ? raw : '');
  if (id) return [`https://lh3.googleusercontent.com/d/${id}=s800`, `https://drive.google.com/thumbnail?id=${id}&sz=w800`];
  // Profile fields are untrusted data; never render script/file URLs.
  return /^https:\/\//i.test(raw) ? [raw] : [];
}
