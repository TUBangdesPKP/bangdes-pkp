const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ');
const present = value => !['', '-', '—', 'null', 'undefined'].includes(clean(value).toLowerCase());
export const UNKNOWN = 'Belum diisi';

export function demographyFields(item) {
  const values = Object.fromEntries(Object.entries(item).map(([key,value]) => [key.toLowerCase().replace(/[^a-z0-9]/g,''),clean(value)]));
  return {
    JenisASN: values.jenisasn || '',
    GolonganRuang: values.golonganruang || [values.golongan,values.ruang].filter(present).join('/') || '',
    PendidikanTerakhir: values.pendidikanterakhir || '',
    Gender: values.gender || values.jeniskelamin || '',
    Generasi: values.generasi || '',
    Umur: values.umur || '',
  };
}

function category(value) { return present(value) ? clean(value) : UNKNOWN; }
function gender(value) {
  const key=clean(value).toLowerCase().replace(/[\s_-]/g,'');
  if(['l','lakilaki','pria','male'].includes(key))return 'Laki-laki';
  if(['p','perempuan','wanita','female'].includes(key))return 'Perempuan';
  return category(value);
}
function generation(value) {
  const match=clean(value).match(/^(?:gen(?:erasi)?\s*)?([xyz])$/i);
  return match ? `Gen ${match[1].toUpperCase()}` : category(value);
}
function count(rows, field, transform=category) {
  const counts=new Map();
  rows.forEach(row=>{const key=transform(row[field]);counts.set(key,(counts.get(key)||0)+1);});
  return [...counts].map(([label,value])=>({label,value})).sort((a,b)=>a.label===UNKNOWN?1:b.label===UNKNOWN?-1:b.value-a.value||a.label.localeCompare(b.label,'id'));
}
export function analyzeDemography(input) {
  const seen=new Set();let duplicates=0;
  const rows=input.filter(row=>{
    if(!present(row.NIP)&&!present(row.Nama))return false;
    const nip=clean(row.NIP).replace(/^'/,'');
    if(nip==='SUPERADMIN')return false;
    if(nip&&seen.has(nip)){duplicates++;return false;}
    if(nip)seen.add(nip);return true;
  }).map(row=>({...row,...demographyFields(row)}));
  const groups=['Gen X','Gen Y','Gen Z'];
  rows.forEach(row=>{const key=generation(row.Generasi);if(!groups.includes(key))groups.push(key);});
  const pyramid=groups.map(label=>{
    const members=rows.filter(row=>generation(row.Generasi)===label), ages=members.map(row=>{
      const match=clean(row.Umur).match(/^(\d{1,3})(?:\s*tahun\b|$)/i);
      return match&&Number(match[1])<=120?Number(match[1]):null;
    }).filter(age=>age!==null);
    return {label,total:members.length,male:members.filter(row=>gender(row.Gender) === 'Laki-laki').length,
      female:members.filter(row=>gender(row.Gender) === 'Perempuan').length,
      other:members.filter(row=>!['Laki-laki','Perempuan'].includes(gender(row.Gender))).length,
      ageRange:ages.length?`${Math.min(...ages)}–${Math.max(...ages)} tahun`:null,agesKnown:ages.length};
  });
  const status=count(rows,'JenisASN',value=>{
    const key=clean(value).toUpperCase();
    return key==='PEGAWAI NEGERI SIPIL'?'PNS':key==='PEGAWAI PEMERINTAH DENGAN PERJANJIAN KERJA'?'PPPK':category(key);
  });
  const education=count(rows,'PendidikanTerakhir',value=>category(value).replace(/\b([SD])\s*-?\s*([1-4])\b/gi,(_,letter,n)=>letter.toUpperCase()+n));
  const educationOrder=['SD','SLTP','SMP','SLTA','SMA','SMK','D1','D2','D3','D4','S1','S2','S3'];
  education.sort((a,b)=>(educationOrder.indexOf(a.label)<0?99:educationOrder.indexOf(a.label))-(educationOrder.indexOf(b.label)<0?99:educationOrder.indexOf(b.label))||a.label.localeCompare(b.label));
  return {total:rows.length,duplicates,status,education,gender:count(rows,'Gender',gender),
    grades:count(rows,'GolonganRuang',value=>category(value).replace(/\s*\/\s*/g,'/')),
    jobs:count(rows,'Jabatan'),pyramid};
}
