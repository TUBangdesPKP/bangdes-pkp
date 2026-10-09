import { useEffect, useState } from 'react';
import { loadCutiCalendar } from './cuti-calendar.js';

export function useCutiCalendar(endpoint, enabled) {
  const [revision,setRevision] = useState(0);
  const [state,setState] = useState(null);
  const key = `${endpoint}:${revision}`;
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadCutiCalendar(endpoint).then(dates => {
      if (!cancelled) setState({key,dates,error:''});
    }).catch(() => {
      if (!cancelled) setState({key,dates:null,error:'Kalender hari libur belum dapat dimuat. Coba lagi; bila tetap gagal, admin perlu memperbarui Apps Script.'});
    });
    return () => { cancelled=true; };
  },[enabled,endpoint,key]);
  const current = enabled && state?.key === key ? state : null;
  return {dates:current?.dates, ready:!enabled || !!current?.dates, loading:enabled && !current,
    error:current?.error || '', reload:() => setRevision(value => value+1)};
}
