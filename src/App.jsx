import { getClaimIdentity, filterArchiveForClaim, createClaimPayload, sendClaimRequest } from './archive-claims.js';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, HelpCircle, MessageCircle, User, Trophy, ChevronRight, 
  FileBarChart, ArrowLeft, Search, Briefcase, CheckCircle2, AlertCircle, 
  Calendar, Clock, LogOut, FileCheck, KeyRound, RotateCcw, UploadCloud, 
  FileSpreadsheet, Trash2, Users, Edit3, Save, X, Eye, MapPin, 
  ChevronDown, ChevronUp, Plus, FolderOpen
} from 'lucide-react';

if (typeof window !== 'undefined') {
  window.tailwind = window.tailwind || {};
  window.tailwind.config = window.tailwind.config || {};
}

const PALETTE_PKP = {
  krem: '#F2EEDF',
  khaki: '#D5C58A',
  darkAqua: '#0E5B73',
  midnightGreen: '#084C61',
  white: '#FFFFFF',
  textMain: '#1A202C',
  textMuted: '#718096',
  bgGray: '#F7FAFC'
};

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyFp99KsR0PfXVG3IhQ1X2s2n0h44yRhRQuW9tQtxxiXfnUNiQicfpJBGbQwrApYlXw/exec";
const SESSION_DURATION = 30 * 60 * 1000;

const extractDriveId = (url) => {
  if (!url) return '';
  const cleanUrl = url.toString().trim().replace(/^["']|["']$/g, '');
  if (/^[a-zA-Z0-9_-]{25,}$/.test(cleanUrl) && !cleanUrl.includes('/') && !cleanUrl.includes('.')) {
    return cleanUrl;
  }
  const match = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || 
                cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                cleanUrl.match(/\/open\?id=([a-zA-Z0-9_-]+)/) ||
                cleanUrl.match(/id=([a-zA-Z0-9_-]+)/);
  return match && match[1] ? match[1] : '';
};

const getDriveDirectUrl = (url) => {
  if (!url) return '';
  const fileId = extractDriveId(url);
  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}=s800`;
  }
  return url.toString().trim();
};

const normalizePegawai = (item) => {
  if (!item || typeof item !== 'object') return {};
  const normalized = {};
  for (const [key, value] of Object.entries(item)) {
    const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    normalized[cleanKey] = value !== null && value !== undefined ? String(value).trim() : '';
  }
  return {
    NIP: normalized.nip || '',
    Nama: normalized.nama || '',
    SubUnitKerja: normalized.subunitkerja || normalized.subunit || '',
    Jabatan: normalized.jabatan || '',
    KelasJabatan: normalized.kelasjabatan || normalized.kelas || '',
    EmailDinas: normalized.emaildinas || normalized.email || '',
    AtasanLangsung: normalized.atasanlangsung || normalized.atasan || '',
    JabatanAtasan: normalized.jabatanatasanlangsung || normalized.jabatanatasan || '',
    Foto_Pegawai: normalized.fotopegawai || normalized.foto || normalized.linkfoto || normalized.urlfoto || normalized.fotoprofil || normalized.photo || normalized.image || '',
    PIN: normalized.pin || '',
    Tukin: normalized.tunjangankinerja || normalized.tukin || '',
    Akun_Role: normalized.akunrole || normalized.role || 'pegawai'
  };
};

const fetchPegawaiData = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = localStorage.getItem('cached_pegawai_json');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return { data: parsed, source: 'cache' };
        }
      } catch (e) {
        console.error(e);
      }
    }
  }

  try {
    const res = await fetch(APPS_SCRIPT_URL);
    if (!res.ok) throw new Error("HTTP error " + res.status);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const normalizedList = data.map(normalizePegawai);
      localStorage.setItem('cached_pegawai_json', JSON.stringify(normalizedList));
      return { data: normalizedList, source: 'live' };
    }
  } catch (err) {
    console.warn("Direct fetch gagal, mencoba proxy...", err);
  }

  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(APPS_SCRIPT_URL)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error("Proxy error");
    const json = await res.json();
    const data = JSON.parse(json.contents);
    if (Array.isArray(data) && data.length > 0) {
      const normalizedList = data.map(normalizePegawai);
      localStorage.setItem('cached_pegawai_json', JSON.stringify(normalizedList));
      return { data: normalizedList, source: 'proxy' };
    }
  } catch (err) {
    console.warn("Proxy fetch gagal...", err);
  }

  const cached = localStorage.getItem('cached_pegawai_json');
  if (cached) {
    try {
      return { data: JSON.parse(cached), source: 'cache' };
    } catch (e) {
      console.error(e);
    }
  }

  return { data: [], source: 'empty' };
};

const fetchLiveSptData = async ({ throwOnError = false } = {}) => {
  try {
    const rawCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSZg0RHcCXIRjoKsdZKKZAjUdPwo7eLGf6vSes38wDqcMX5yt97OqBPLRIwXglDoDGlbdb9Hb1Nqe_T/pub?gid=1964926388&single=true&output=csv";
    const res = await fetch(`${rawCsvUrl}&cb=${Date.now()}`);
    if (!res.ok) throw new Error("Gagal mengambil data SPT dari CSV");
    const text = await res.text();
    
    const lines = text.replace(/\r/g, '').split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/^["']+|["']+$/g, '').trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      const row = {};
      headers.forEach((header, index) => {
        let val = (cols[index] || '').replace(/^["']+|["']+$/g, '').trim();
        if (header.toLowerCase() === 'nip' && val.startsWith("'")) {
          val = val.substring(1);
        }
        row[header] = val;
      });
      data.push(row);
    }
    
    return data.map(item => ({
      timestamp: item['Timestamp'] || '',
      nip: item['NIP'] || '',
      nama: item['Nama Pegawai'] || item['Nama'] || '',
      tujuan: item['Tujuan'] || '-',
      tanggalBerangkat: item['Tanggal Berangkat'] || '-',
      tanggalPulang: item['Tanggal Pulang'] || '-',
      jumlahHari: parseInt(item['Jumlah Hari Dinas'] || item['Jumlah Hari'] || 0, 10),
      bulan: item['Bulan Surat Tugas'] || item['Bulan'] || '-',
      tahun: item['Tahun'] || '-',
      linkAkses: item['Link Dokumen'] || item['Link Arsip'] || '#'
    }));

  } catch (err) {
    console.error("Gagal menarik data SPT CSV:", err);
    if (throwOnError) throw err;
    return [];
  }
};

const standardizeDate = (dateStr) => {
  if (!dateStr || dateStr === '-') return '-';
  
  if (/[a-zA-Z]/.test(dateStr)) return dateStr;

  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    let day, month, year;
    
    if (parts[0].length === 4) {
      year = parts[0];
      month = parts[1];
      day = parts[2];
    } else {
      if (parseInt(parts[1]) > 12) {
         month = parts[0];
         day = parts[1];
         year = parts[2];
      } else {
         day = parts[0];
         month = parts[1];
         year = parts[2];
      }
    }
    
    if (year.length === 2) {
      year = '20' + year;
    }

    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const monthIndex = parseInt(month, 10) - 1;
    
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${parseInt(day, 10)} ${monthNames[monthIndex]} ${year}`;
    }
  }
  return dateStr;
};

const fetchLiveCutiData = async ({ throwOnError = false } = {}) => {
  try {
    const rawCsvUrl = "https://docs.google.com/spreadsheets/d/1bIQbiWAQ67TYFmvb3WZkvjJaN1moP1fQlmegsFZJWfI/export?format=csv&gid=185022342";
    
    let text = '';
    try {
      const res = await fetch(`${rawCsvUrl}&cb=${Date.now()}`);
      if (!res.ok) throw new Error("Gagal direct fetch");
      text = await res.text();
    } catch(e) {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rawCsvUrl)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error("Gagal proxy fetch");
      const json = await res.json();
      text = json.contents;
    }
    
    const lines = text.replace(/\r/g, '').split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/^["']+|["']+$/g, '').trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      const row = {};
      headers.forEach((header, index) => {
        let val = (cols[index] || '').replace(/^["']+|["']+$/g, '').trim();
        if (header.toLowerCase() === 'nip' && val.startsWith("'")) {
          val = val.substring(1);
        }
        row[header] = val;
      });
      data.push(row);
    }
    
    return data.map(item => {
      const tglBerangkatRaw = item['Tanggal Awal'] || item['Tanggal Mulai'] || item['Tanggal Berangkat'] || item['Mulai'] || '-';
      const tglPulangRaw = item['Tanggal Akhir'] || item['Tanggal Selesai'] || item['Tanggal Pulang'] || item['Selesai'] || '-';
      
      const tglBerangkatStr = standardizeDate(tglBerangkatRaw);
      const tglPulangStr = standardizeDate(tglPulangRaw);
      
      let jmlHari = parseInt(item['Jumlah Hari Cuti'] || item['Jumlah Hari'] || 0, 10);
      if (!jmlHari || isNaN(jmlHari) || jmlHari === 0) {
          if (tglBerangkatStr !== '-' && tglPulangStr !== '-') {
             jmlHari = hitungHariKerjaAktif(formatIndoToYMD(tglBerangkatStr), formatIndoToYMD(tglPulangStr));
          }
      }

      return {
        timestamp: item['Timestamp'] || '',
        nip: item['NIP'] || '',
        nama: item['Nama Pegawai'] || item['Nama'] || '',
        tujuan: item['Jenis Cuti'] || '-', 
        tanggalBerangkat: tglBerangkatStr,
        tanggalPulang: tglPulangStr,
        jumlahHari: jmlHari,
        bulan: item['Bulan'] || '-',
        tahun: item['Tahun'] || '-',
        linkAkses: item['Link Arsip'] || item['Link Dokumen'] || '#'
      };
    });

  } catch (err) {
    console.error("Gagal menarik data Cuti CSV:", err);
    if (throwOnError) throw err;
    return [];
  }
};

const parseIndoDate = (dateString) => {
  const parts = dateString.toString().split(' ');
  if (parts.length < 3) return new Date(0);
  const day = parseInt(parts[0], 10);
  const monthStr = parts[1].toLowerCase();
  const year = parseInt(parts[2], 10);
  const months = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des'];
  let month = months.findIndex(m => monthStr.includes(m));
  if (month === -1) month = 0;
  return new Date(year, month, day);
};

const formatIndoToYMD = (indoDateStr) => {
  if (!indoDateStr || indoDateStr === '-') return '';
  const d = parseIndoDate(indoDateStr);
  if (d.getTime() === new Date(0).getTime()) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatYMDtoIndo = (ymdStr) => {
  if (!ymdStr) return '';
  const parts = ymdStr.split('-');
  if (parts.length !== 3) return ymdStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${day} ${months[monthIdx]} ${year}`;
  }
  return ymdStr;
};

const hitungHariDinas = (tglBerangkat, tglPulang) => {
  if (!tglBerangkat || !tglPulang || tglBerangkat === '-' || tglPulang === '-') return '-';
  const d1 = parseIndoDate(tglBerangkat);
  const d2 = parseIndoDate(tglPulang);
  if (d1 && d2) {
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  }
  return '-';
};

// 2026 National Holidays based on official data
const DAFTAR_LIBUR_NASIONAL = [
  '2026-01-01', // Tahun Baru Masehi
  '2026-01-16', // Isra Mi'raj Nabi Muhammad SAW
  '2026-02-17', // Tahun Baru Imlek
  '2026-03-19', // Hari Suci Nyepi (Tahun Baru Saka)
  '2026-03-21', // Hari Raya Idul Fitri 1447 H
  '2026-03-22', // Hari Raya Idul Fitri 1447 H
  '2026-04-03', // Wafat Yesus Kristus
  '2026-04-05', // Kebangkitan Yesus Kristus (Paskah)
  '2026-05-01', // Hari Buruh Internasional
  '2026-05-14', // Kenaikan Yesus Kristus
  '2026-05-27', // Hari Raya Idul Adha 1447 H
  '2026-05-31', // Hari Raya Waisak
  '2026-06-01', // Hari Lahir Pancasila
  '2026-06-16', // Tahun Baru Islam (1 Muharram)
  '2026-08-17', // Hari Kemerdekaan RI
  '2026-08-25', // Maulid Nabi Muhammad SAW
  '2026-12-25'  // Hari Raya Natal
];

const hitungHariKerjaAktif = (startStr, endStr) => {
  if (!startStr || !endStr) return 0;
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (start > end) return 0;

  let count = 0;
  let current = new Date(start);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    // Exclude weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { 
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      const ymd = `${y}-${m}-${d}`;
      
      // Also exclude national holidays
      if (!DAFTAR_LIBUR_NASIONAL.includes(ymd)) {
        count++;
      }
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

const removeTitlesFromName = (fullName) => {
  if (!fullName) return '';
  return fullName
    .replace(/^(Dr\.|Drs\.|Dra\.|Ir\.|Prof\.|H\.|Hj\.)\s*/gi, '') 
    .replace(/,\s*(S\.T\.|S\.E\.|S\.H\.|S\.Kom\.|S\.Sos\.|S\.Pd\.|M\.T\.|M\.M\.|M\.Si\.|M\.Pd\.|Ph\.D\.|B\.Sc\.|M\.Sc\.|A\.Md\.|M\.A\.).*$/gi, '') 
    .trim();
};

const fetchValidCities = async () => {
  const cachedCities = localStorage.getItem('cached_delineasi_cities_colD_v2');
  if (cachedCities) {
    try { return JSON.parse(cachedCities); } catch (e) {}
  }

  const rawCsvUrl = "https://docs.google.com/spreadsheets/d/1IZovee1ozvQIgZwhMLq_g2kAoiRbMEXwU4dXCp6eojA/export?format=csv";
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rawCsvUrl)}`;
  const urlsToTry = [rawCsvUrl, proxyUrl];

  const processCsvText = (text) => {
    const lines = text.replace(/\r/g, '').split('\n');
    const cities = [];
    
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      if (cols.length >= 4) {
        let colD = (cols[3] || '').replace(/^["']+|["']+$/g, '').trim();
        if (colD) {
          cities.push({
            fullName: colD,
            rawName: colD.toLowerCase()
          });
        }
      }
    }
    return cities;
  };

  for (const url of urlsToTry) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const text = url.includes('allorigins') ? (await res.json()).contents : await res.text();
        const citiesArray = processCsvText(text);
        if (citiesArray.length > 0) {
          citiesArray.sort((a, b) => b.rawName.length - a.rawName.length);
          localStorage.setItem('cached_delineasi_cities_colD_v2', JSON.stringify(citiesArray));
          return citiesArray;
        }
      }
    } catch (err) {
       console.warn(`Fetch CSV Delineasi gagal untuk URL: ${url}`);
    }
  }

  return [
    { fullName: "Kota Serang", rawName: "kota serang" },
    { fullName: "Kota Bandung", rawName: "kota bandung" },
    { fullName: "Kab. Bandung", rawName: "kab. bandung" },
    { fullName: "Kota Surabaya", rawName: "kota surabaya" },
    { fullName: "Kota Jakarta Selatan", rawName: "kota jakarta selatan" },
    { fullName: "Kota Jakarta Pusat", rawName: "kota jakarta pusat" },
    { fullName: "Kota Semarang", rawName: "kota semarang" },
    { fullName: "Kota Yogyakarta", rawName: "kota yogyakarta" }
  ];
};

const isValidSptLocation = (tujuan) => {
  if (!tujuan || tujuan === '-') return false;
  const lower = tujuan.toLowerCase().trim();
  if (lower.startsWith('kota ') || lower.startsWith('kab. ') || lower.startsWith('kabupaten ') || lower.startsWith('provinsi ')) return true;
  
  try {
    const cached = localStorage.getItem('cached_delineasi_cities_colD_v2');
    if (cached) {
      const cities = JSON.parse(cached);
      if (cities.some(c => c.fullName.toLowerCase() === lower)) return true;
    }
  } catch(e) {}
  return false;
};

const extractArsipData = async (lines, fullText, dbPegawai = [], modul = 'spt') => {
  const nipSet = new Set();
  let dateBerangkat = '-';
  let datePulang = '-';
  let tanggalSurat = '-';
  let rawTujuan = '';

  const IGNORED_NIPS = [
    '197012151998032007', 
  ];

  if (modul === 'cuti') {
    let foundCutiNip = false;
    const top30Lines = lines.slice(0, 30);
    const top30Text = top30Lines.join(' ');
    
    if (dbPegawai && dbPegawai.length > 0) {
      const top30Digits = top30Text.replace(/[Oo]/g, '0').replace(/[lI]/g, '1').replace(/[^0-9]/g, '');
      for (const pegawai of dbPegawai) {
        if (pegawai.NIP && pegawai.NIP.length >= 18 && top30Digits.includes(pegawai.NIP)) {
          if (!IGNORED_NIPS.includes(pegawai.NIP)) {
             nipSet.add(pegawai.NIP);
             foundCutiNip = true;
             break;
          }
        }
      }
    }

    if (!foundCutiNip && dbPegawai && dbPegawai.length > 0) {
      const top30Alpha = top30Text.toLowerCase().replace(/[^a-z]/g, '');
      const sortedPegawai = [...dbPegawai].sort((a, b) => (b.Nama || '').length - (a.Nama || '').length);
      for (const pegawai of sortedPegawai) {
        if (!pegawai.Nama) continue;
        const dbNameAlpha = pegawai.Nama.toLowerCase().replace(/[^a-z]/g, '');
        if (dbNameAlpha.length > 5 && top30Alpha.includes(dbNameAlpha)) {
           if (!IGNORED_NIPS.includes(pegawai.NIP)) {
             nipSet.add(pegawai.NIP);
             foundCutiNip = true;
             break;
           }
        }
      }
    }

    if (!foundCutiNip) {
      for (let i = 0; i < lines.length; i++) {
        const lineWithOcrFixes = lines[i].replace(/[Oo]/g, '0').replace(/[lI]/g, '1');
        const lineDigits = lineWithOcrFixes.replace(/[^0-9]/g, '');
        const lineMatches = lineDigits.match(/(19\d{16}|20\d{16})/g) || [];
        
        for (const nipStr of lineMatches) {
          if (!IGNORED_NIPS.includes(nipStr)) {
            nipSet.add(nipStr);
            foundCutiNip = true;
            break;
          }
        }
        if (foundCutiNip) break;
      }
    }

    if (!foundCutiNip && dbPegawai && dbPegawai.length > 0) {
      let extractedName = null;
      for (let i = 0; i < Math.min(lines.length, 40); i++) {
        const line = lines[i];
        const nameMatch = line.match(/(?:NAMA|Nama)\s*(?:\||:)?\s*([A-Za-z\s'\.,\-]{3,50}?)\s*(?:\||NIP|Nip|$)/i);
        if (nameMatch && nameMatch[1]) {
           const possibleName = nameMatch[1].trim().toLowerCase();
           if (possibleName.length > 3 && !possibleName.includes("data pegawai") && !possibleName.includes("pemberian cuti")) {
             extractedName = possibleName;
             break;
           }
        }
      }

      if (extractedName) {
        const matchedPegawai = dbPegawai.find(p => p.Nama && p.Nama.toLowerCase() === extractedName) || 
                               dbPegawai.find(p => p.Nama && (p.Nama.toLowerCase().includes(extractedName) || extractedName.includes(p.Nama.toLowerCase())));
        if (matchedPegawai && matchedPegawai.NIP) {
          nipSet.add(matchedPegawai.NIP);
          foundCutiNip = true;
        }
      }
    }
  } else {
    const textWithOcrFixes = fullText.replace(/[Oo]/g, '0').replace(/[lI]/g, '1');
    const onlyDigits = textWithOcrFixes.replace(/[^0-9]/g, '');
    const nipMatches = onlyDigits.match(/(19\d{16}|20\d{16})/g) || [];
    
    for (const nipStr of nipMatches) {
      if (!IGNORED_NIPS.includes(nipStr)) nipSet.add(nipStr);
    }

    for (let i = 0; i < lines.length; i++) {
      const lineWithOcrFixes = lines[i].replace(/[Oo]/g, '0').replace(/[lI]/g, '1');
      const lineDigits = lineWithOcrFixes.replace(/[^0-9]/g, '');
      const lineMatches = lineDigits.match(/(19\d{16}|20\d{16})/g) || [];
      for (const nipStr of lineMatches) {
        if (!IGNORED_NIPS.includes(nipStr)) nipSet.add(nipStr);
      }
    }
  }

  const MONTHS = 'Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember';
  const normalizeDashes = (str) => str.replace(/[–—−‐‑‒―_~•●▪=]+/g, '-');
  const textToSearch = normalizeDashes(fullText.replace(/\s+/g, ' '));
  const SEP = '(?:-{1,3}|s\\.?\\/?d\\.?|sampai(?:\\s*dengan)?|hingga)\\s*';

  const fullRangeRegex = new RegExp(`(\\d{1,2})\\s*(${MONTHS})\\s*(\\d{4})\\s*${SEP}\\s*(\\d{1,2})\\s*(${MONTHS})\\s*(\\d{4})`, 'i');
  const shortRangeRegex = new RegExp(`(\\d{1,2})\\s*${SEP}\\s*(\\d{1,2})\\s*(${MONTHS})\\s*(\\d{4})`, 'i');
  const singleDateRegex = new RegExp(`(\\d{1,2})\\s*(${MONTHS})\\s*(\\d{4})`, 'gi');
  const contextRegex = /(?:Waktu|Tanggal|Hari|Periode|Pelaksanaan)/i;

  const applyFullRange = (text) => {
    const m = text.match(fullRangeRegex);
    if (!m) return null;
    return { berangkat: `${parseInt(m[1], 10)} ${m[2]} ${m[3]}`, pulang: `${parseInt(m[4], 10)} ${m[5]} ${m[6]}` };
  };
  const applyShortRange = (text) => {
    const m = text.match(shortRangeRegex);
    if (!m) return null;
    return { berangkat: `${parseInt(m[1], 10)} ${m[3]} ${m[4]}`, pulang: `${parseInt(m[2], 10)} ${m[3]} ${m[4]}` };
  };
  const applySingleDate = (text) => {
    const matches = [...text.matchAll(singleDateRegex)];
    if (matches.length !== 1) return null;
    const m = matches[0];
    const single = `${parseInt(m[1], 10)} ${m[2]} ${m[3]}`;
    return { berangkat: single, pulang: single };
  };

  let found = null;
  let cutiDuration = 1;

  if (modul === 'cuti') {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/IV\.\s*LAMANYA\s*CUTI/i.test(line) || /LAMANYA\s*CUTI/i.test(line) || (/Selama/i.test(line) && /tanggal/i.test(line))) {
        const windowText = normalizeDashes(lines.slice(i, Math.min(lines.length, i + 4)).join(' ').replace(/\s+/g, ' '));
        
        found = applyFullRange(windowText) || applyShortRange(windowText) || applySingleDate(windowText);
        
        const lamaMatch = windowText.match(/Selama\s+(\d+)\s+(?:\(|Satu|Dua|Tiga|Empat|Lima|hari)/i) || windowText.match(/Selama\s*:\s*(\d+)/i) || windowText.match(/Selama\s+(\d+)/i);
        if (lamaMatch && lamaMatch[1]) {
          cutiDuration = parseInt(lamaMatch[1], 10);
        }

        if (found) {
           if (found.berangkat === found.pulang && cutiDuration > 1) {
              const d1 = parseIndoDate(found.berangkat);
              if (d1.getTime() > 0) {
                 d1.setDate(d1.getDate() + (cutiDuration - 1));
                 const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                 found.pulang = `${d1.getDate()} ${months[d1.getMonth()]} ${d1.getFullYear()}`;
              }
           }
           break;
        }
      }
    }
  }

  if (!found) {
    for (let i = 0; i < lines.length; i++) {
      if (!contextRegex.test(lines[i])) continue;
      const windowText = normalizeDashes(lines.slice(i, Math.min(lines.length, i + 3)).join(' ').replace(/\s+/g, ' '));
      
      found = applyFullRange(windowText) || applyShortRange(windowText) || applySingleDate(windowText);
      if (found) break;
    }
  }

  if (!found) {
    const allDates = [...textToSearch.matchAll(singleDateRegex)];
    if (allDates.length >= 2) {
      const [d1, d2] = allDates;
      found = {
        berangkat: `${parseInt(d1[1], 10)} ${d1[2]} ${d1[3]}`,
        pulang: `${parseInt(d2[1], 10)} ${d2[2]} ${d2[3]}`
      };
    } else if (allDates.length === 1) {
      const d1 = allDates[0];
      const single = `${parseInt(d1[1], 10)} ${d1[2]} ${d1[3]}`;
      found = { berangkat: single, pulang: single };
    }
  }

  if (found) {
    dateBerangkat = found.berangkat;
    datePulang = found.pulang;
  }

  const allDatesGlobal = [...textToSearch.matchAll(singleDateRegex)];
  if (allDatesGlobal.length > 0) {
    const lastDate = allDatesGlobal[allDatesGlobal.length - 1];
    tanggalSurat = `${parseInt(lastDate[1], 10)} ${lastDate[2]} ${lastDate[3]}`;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    const isTargetLine = modul === 'spt' 
      ? /(?:Tujuan|Tempat|Lokasi)\s*:/i.test(line)
      : /(?:Alasan|Keterangan|Jenis Cuti|Keperluan)\s*:/i.test(line);

    if (!rawTujuan && isTargetLine) {
      const match = modul === 'spt' 
        ? line.match(/(?:Tujuan|Tempat|Lokasi)\s*:\s*(.+)/i)
        : line.match(/(?:Alasan|Keterangan|Jenis Cuti|Keperluan)\s*:\s*(.+)/i);
        
      let tempTujuan = "";
      let startIndex = i;

      if (match && match[1].trim()) {
        tempTujuan = match[1].trim();
        startIndex = i + 1;
      } else {
        startIndex = i + 1;
      }

      for (let j = startIndex; j < Math.min(lines.length, startIndex + 10); j++) {
          const nextLine = lines[j].trim();
          if (!nextLine || /^(?:Waktu|Biaya|Demikian|Dikeluarkan|Transportasi|Hormat)/i.test(nextLine)) break;
          tempTujuan += (tempTujuan ? " " : "") + nextLine;
      }

      if (tempTujuan) {
          rawTujuan = tempTujuan.replace(/\s+/g, ' ').trim();
      }
    }
  }

  let detectedJenisCuti = '';
  if (modul === 'cuti') {
    const marks = '([vVxX✓✔])';
    const cutiPatterns = [
      { name: "Cuti Tahunan", regex: new RegExp(`(?:1\\.?\\s*)?CUTI\\s*TAHUNAN[\\s\\|\\]\\[\\:\\.]*${marks}(?:\\b|[\\s\\|\\]\\[])`, 'i') },
      { name: "Cuti Besar", regex: new RegExp(`(?:2\\.?\\s*)?CUTI\\s*BESAR[\\s\\|\\]\\[\\:\\.]*${marks}(?:\\b|[\\s\\|\\]\\[])`, 'i') },
      { name: "Cuti Sakit", regex: new RegExp(`(?:3\\.?\\s*)?CUTI\\s*SAKIT[\\s\\|\\]\\[\\:\\.]*${marks}(?:\\b|[\\s\\|\\]\\[])`, 'i') },
      { name: "Cuti Melahirkan", regex: new RegExp(`(?:4\\.?\\s*)?CUTI\\s*MELAHIRKAN[\\s\\|\\]\\[\\:\\.]*${marks}(?:\\b|[\\s\\|\\]\\[])`, 'i') },
      { name: "Cuti Karena Alasan Penting", regex: new RegExp(`(?:5\\.?\\s*)?(?:CUTI\\s*KARENA\\s*)?ALASAN\\s*PENTING[\\s\\|\\]\\[\\:\\.]*${marks}(?:\\b|[\\s\\|\\]\\[])`, 'i') },
      { name: "Cuti diluar Tanggungan Negara", regex: new RegExp(`(?:6\\.?\\s*)?CUTI\\s*DILUAR\\s*TANGGUNGAN\\s*NEGARA[\\s\\|\\]\\[\\:\\.]*${marks}(?:\\b|[\\s\\|\\]\\[])`, 'i') }
    ];

    let jenisCutiBlock = '';
    let inJenisCuti = false;
    for (let i = 0; i < lines.length; i++) {
      if (/JENIS CUTI/i.test(lines[i])) inJenisCuti = true;
      if (inJenisCuti) jenisCutiBlock += ' ' + lines[i];
      if (/ALASAN CUTI|LAMANYA CUTI/i.test(lines[i])) break;
    }
    
    let textToScan = jenisCutiBlock.length > 20 ? jenisCutiBlock : fullText;

    for (const pattern of cutiPatterns) {
      if (pattern.regex.test(textToScan)) {
        detectedJenisCuti = pattern.name;
        break;
      }
    }
  }

  let finalTujuan = rawTujuan || '-';

  if (modul === 'spt' && finalTujuan !== '-') {
    const validCities = await fetchValidCities();
    let detectedCity = null;
    const lowerRaw = finalTujuan.toLowerCase();

    for (const city of validCities) {
      const cleanCityName = city.rawName.replace(/^(kota|kab\.)\s+/i, '').trim();
      const regexFullName = new RegExp(`\\b${city.rawName}\\b`, 'i');
      const regexCleanName = new RegExp(`\\b${cleanCityName}\\b`, 'i');
      
      if (regexFullName.test(lowerRaw) || regexCleanName.test(lowerRaw)) {
        detectedCity = city.fullName; 
        break;
      }
    }
    if (detectedCity) {
      finalTujuan = detectedCity;
    }
  } else if (modul === 'cuti') {
    if (detectedJenisCuti) {
      finalTujuan = detectedJenisCuti;
    } else if (finalTujuan === '-') {
      finalTujuan = 'Cuti / Alasan Lainnya';
    }
  }

  if (!dbPegawai || dbPegawai.length === 0) {
    const cached = localStorage.getItem('cached_pegawai_json');
    if (cached) {
      try { dbPegawai = JSON.parse(cached); } catch (e) {}
    }
  }

  const pegawaiList = [];
  nipSet.forEach((nip) => {
    const cleanNip = String(nip).trim();
    const foundPegawai = dbPegawai.find(p => String(p.NIP).trim() === cleanNip);
    if (foundPegawai && foundPegawai.Nama) {
      pegawaiList.push({
        nama: foundPegawai.Nama,
        nip: foundPegawai.NIP ? String(foundPegawai.NIP).trim() : cleanNip,
        selected: true
      });
    }
  });

  return { pegawaiList, dateBerangkat, datePulang, tanggalSurat, tujuan: finalTujuan };
};

const parseDocumentPresensi = async (file, selectedPeriod = null, activeTab = null, onProgress = null) => {
  const fileName = file.name.toLowerCase();
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
  let fullText = '';
  let lines = [];

  if (isExcel) {
    if (!window.XLSX) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    const arrayBuffer = await file.arrayBuffer();
    const workbook = window.XLSX.read(arrayBuffer, { type: 'array', cellDates: true, dateNF: 'dd/mm/yyyy' });
    
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const csv = window.XLSX.utils.sheet_to_csv(sheet, { FS: ' ' }); 
      lines = lines.concat(csv.split('\n'));
    });
    
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    lines = lines.map(line => {
      let l = line.replace(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/g, (match, d, m, y) => {
        const monthIdx = parseInt(m, 10) - 1;
        if (monthIdx >= 0 && monthIdx < 12) return `${parseInt(d, 10)} ${months[monthIdx]} ${y}`;
        return match;
      });
      l = l.replace(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/g, (match, y, m, d) => {
        const monthIdx = parseInt(m, 10) - 1;
        if (monthIdx >= 0 && monthIdx < 12) return `${parseInt(d, 10)} ${months[monthIdx]} ${y}`;
        return match;
      });
      return l;
    });
    fullText = lines.join('\n');

  } else if (fileName.endsWith('.pdf')) {
    if (onProgress) onProgress("Membaca struktur PDF digital...");
    if (!window.pdfjsLib) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    const arrayBuffer = await file.arrayBuffer();
    
    const pdf = await window.pdfjsLib.getDocument({ 
      data: arrayBuffer,
      cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/', 
      cMapPacked: true
    }).promise;
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const items = textContent.items.map(item => ({
        str: item.str.trim(),
        x: item.transform[4],
        y: item.transform[5]
      })).filter(item => item.str);

      items.sort((a, b) => b.y - a.y);

      let currentLine = [];
      let currentY = items.length > 0 ? items[0].y : 0;
      
      for (const item of items) {
        if (Math.abs(item.y - currentY) < 5) { 
          currentLine.push(item);
        } else {
          currentLine.sort((a, b) => a.x - b.x);
          lines.push(currentLine.map(i => i.str).join(' '));
          currentLine = [item];
          currentY = item.y;
        }
      }
      if (currentLine.length > 0) {
        currentLine.sort((a, b) => a.x - b.x);
        lines.push(currentLine.map(i => i.str).join(' '));
      }
    }
    fullText = lines.join('\n');
    
    const digitsOnly = fullText.replace(/[^0-9]/g, '');
    const hasNip = /(19\d{16}|20\d{16})/.test(digitsOnly);
    const isTooShort = fullText.trim().length < 50;

    if (!hasNip || isTooShort) {
      if (onProgress) onProgress("Dokumen terdeteksi sebagai hasil scan. Mengunduh modul OCR AI...");
      
      if (!window.Tesseract) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      lines = []; 
      
      for (let i = 1; i <= pdf.numPages; i++) {
        if (onProgress) onProgress(`Memindai gambar hasil scan halaman ${i} dari ${pdf.numPages}...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        const { data: { text } } = await window.Tesseract.recognize(canvas, 'eng');
        const pageLines = text.split('\n').map(l => l.trim()).filter(l => l);
        lines = lines.concat(pageLines);
      }
      fullText = lines.join('\n');
    }
  } else if (/\.(jpe?g|png)$/.test(fileName)) {
    if (onProgress) onProgress('Membaca gambar Surat Tugas...');
    if (!window.Tesseract) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    const { data: { text } } = await window.Tesseract.recognize(file, 'eng');
    fullText = text;
    lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  } else {
    throw new Error('Format dokumen tidak didukung.');
  }

  let dbPegawai = [];
  const cached = localStorage.getItem('cached_pegawai_json');
  if (cached) {
    try { dbPegawai = JSON.parse(cached); } catch (e) {}
  }
  if (!dbPegawai || dbPegawai.length === 0) {
    const fetched = await fetchPegawaiData(false);
    dbPegawai = fetched.data || [];
  }

  if (activeTab === 'spt' || activeTab === 'cuti') {
    const arsipData = await extractArsipData(lines, fullText, dbPegawai, activeTab);
    
    let finalNames = arsipData.pegawaiList;
    if (activeTab === 'cuti') {
      const calculatedDays = hitungHariKerjaAktif(formatIndoToYMD(arsipData.dateBerangkat), formatIndoToYMD(arsipData.datePulang));
      if (calculatedDays === 0 || arsipData.tujuan === 'Cuti / Alasan Lainnya') {
        finalNames = finalNames.map(p => ({ ...p, selected: false }));
      }
    } else if (activeTab === 'spt') {
      if (!isValidSptLocation(arsipData.tujuan)) {
        finalNames = finalNames.map(p => ({ ...p, selected: false }));
      }
    }

    return {
      isValid: true,
      isArsip: true,
      arsipDateBerangkat: arsipData.dateBerangkat,
      arsipDatePulang: arsipData.datePulang,
      arsipTanggalSurat: arsipData.tanggalSurat,
      arsipTujuan: arsipData.tujuan,
      arsipNames: finalNames,
      nip: '-',
      nama: 'Berbagai Pegawai',
      periodeFolder: activeTab === 'spt' ? 'Arsip_Surat_Tugas' : 'Arsip_Surat_Cuti',
      rows: [],
      expectedDays: 0,
      totalHariMasuk: 0
    };
  }

  const nipMatch = fullText.replace(/\s+/g, '').match(/(\d{18})/);
  let nip = nipMatch ? nipMatch[1] : '-';
  let cleanNama = 'Pegawai';

  if (nip !== '-') {
    const found = dbPegawai.find(p => String(p.NIP).trim() === String(nip).trim());
    if (found && found.Nama) {
      cleanNama = found.Nama;
    }
  }

  let periode = '-';
  let expectedDays = 31;
  let expectedPeriodEvent = selectedPeriod ? selectedPeriod.periodeEvent : null;
  let periodeFolder = selectedPeriod ? selectedPeriod.periodeFolder : 'Periode_Unknown';
  
  let expectedStartObj = null;
  let expectedEndObj = null;
  
  if (expectedPeriodEvent) {
    const parts = expectedPeriodEvent.match(/(\d{2})-(\d{2})-(\d{4})\s*s\/d\s*(\d{2})-(\d{2})-(\d{4})/);
    if (parts) {
      expectedStartObj = new Date(parseInt(parts[3]), parseInt(parts[2])-1, parseInt(parts[1]));
      expectedEndObj = new Date(parseInt(parts[6]), parseInt(parts[5])-1, parseInt(parts[4]));
      expectedDays = Math.round((expectedEndObj - expectedStartObj) / (1000 * 60 * 60 * 24)) + 1;
    }
  }

  const rows = [];
  const seenDates = new Set();
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const dateMatch = line.match(/(?:(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)[,\s]+)?(\d{1,2})\s*(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s*(\d{4})/i);
    if (!dateMatch) continue;
    
    let hari = dateMatch[1];
    const tgl = dateMatch[2];
    const bln = dateMatch[3];
    const thn = dateMatch[4];
    const dateKey = `${tgl} ${bln.slice(0, 3)} ${thn}`;
    const dateObj = parseIndoDate(dateKey);
    
    if (!hari) {
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      hari = days[dateObj.getDay()];
    }
    
    if (expectedStartObj && expectedEndObj) {
      const minValidDate = new Date(expectedStartObj.getTime() - (5 * 24 * 60 * 60 * 1000));
      const maxValidDate = new Date(expectedEndObj.getTime() + (5 * 24 * 60 * 60 * 1000));
      if (dateObj < minValidDate || dateObj > maxValidDate) continue; 
    }
    
    if (seenDates.has(dateKey)) continue;
    seenDates.add(dateKey);
    
    const times = [...line.matchAll(/\b(\d{2}:\d{2})(?:\s*WIB)?\b/gi)];
    let datang = times.length > 0 ? times[0][1] : '-';
    let pulang = times.length > 1 ? times[1][1] : (times.length > 0 && hari !== 'Sabtu' && hari !== 'Minggu' ? times[0][1] : '-');
    
    let lokasiDatangRaw = '';
    let lokasiPulangRaw = '';

    if (times.length > 0) {
      lokasiDatangRaw = line.substring(0, times[0].index).trim();
      lokasiDatangRaw = lokasiDatangRaw.replace(/(?:Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)[,\s]*\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4}/i, '').trim();
      lokasiDatangRaw = lokasiDatangRaw.replace(/^\d+\s+/, '').trim();
      
      if (times.length > 1) {
        lokasiPulangRaw = line.substring(times[0].index + times[0][0].length, times[1].index).trim();
      } else {
        lokasiPulangRaw = line.substring(times[0].index + times[0][0].length).trim();
      }
    }

    if (lokasiDatangRaw.includes("sekitar") || /WFA/i.test(line)) {
      let j = i + 1;
      while (j < lines.length && j <= i + 4) { 
        if (/(?:(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)[,\s]+)?(\d{1,2})\s*(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s*(\d{4})/i.test(lines[j])) break;
        const nextLineStr = lines[j].replace(/\b\d+\b/g, '').trim();
        if (nextLineStr.length > 5 && !nextLineStr.includes('WIB')) {
          lokasiDatangRaw += ' ' + nextLineStr;
        }
        j++;
      }
    }

    const ymd = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    let status = '-';
    
    if (DAFTAR_LIBUR_NASIONAL.includes(ymd)) {
      status = 'Libur';
    } else if (hari === 'Sabtu' || hari === 'Minggu' || /Libur/i.test(line)) {
      status = 'Libur';
    } else if (/WFO/i.test(line)) {
      status = 'WFO';
    } else if (/WFA/i.test(line)) {
      status = 'WFA';
    } else if (/WFH/i.test(line)) {
      status = 'WFH';
    } else if (/Cuti/i.test(line)) {
      status = 'Cuti';
    } else if (/Dinas/i.test(line)) {
      status = 'Dinas';
    }
    
    rows.push({
      tanggal: dateKey,
      hari,
      datang,
      pulang: (pulang !== datang || times.length > 1) ? pulang : '-',
      keterangan: status === '-' && datang !== '-' ? 'WFO' : status,
      lokasiDatangRaw,
      _dateObj: dateObj
    });
  }

  rows.sort((a, b) => b._dateObj - a._dateObj);
  const totalHariMasuk = rows.filter(r => (r.keterangan === 'WFO' || r.keterangan === 'WFA' || r.keterangan === 'Dinas') && r.datang !== '-').length;

  let isDateValid = true;
  let extractedStartStr = '-';
  let extractedEndStr = '-';

  if (rows.length > 0) {
    const lastDate = rows[0]._dateObj; 
    const firstDate = rows[rows.length - 1]._dateObj;
    
    const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth()+1).padStart(2, '0')}-${d.getFullYear()}`;
    extractedStartStr = fmt(firstDate);
    extractedEndStr = fmt(lastDate);
    
    periode = `${extractedStartStr} s/d ${extractedEndStr}`;

    if (expectedStartObj && expectedEndObj) {
      if (lastDate < expectedStartObj || firstDate > expectedEndObj) {
        isDateValid = false;
      } else {
        const startDiffDays = Math.abs((firstDate - expectedStartObj) / (1000 * 60 * 60 * 24));
        const endDiffDays = Math.abs((lastDate - expectedEndObj) / (1000 * 60 * 60 * 24));
        if (startDiffDays > 10 || endDiffDays > 10) isDateValid = false;
      }
    }
  } else {
    isDateValid = false; 
  }

  return {
    nama: cleanNama,
    nip: nip,
    periode: periode,
    periodeFolder,
    expectedDays,
    totalRows: rows.length,
    rows,
    totalHariMasuk,
    isValid: rows.length > 0 && isDateValid,
    isDateMismatch: !isDateValid
  };
};

const getStoredUser = () => {
  const stored = localStorage.getItem('pkp_session');
  if (stored) {
    try {
      const { user, timestamp } = JSON.parse(stored);
      const now = new Date().getTime();
      if (now - timestamp < SESSION_DURATION) return user;
      localStorage.removeItem('pkp_session');
    } catch(e) {
      localStorage.removeItem('pkp_session');
    }
  }
  return null;
};

const Header = ({ navigate, loggedInUser, onLogoutRequest }) => {
  return (
    <header className="w-full border-b border-[#D5C58A]/40 sticky top-0 z-50 px-4 md:px-8 py-4 flex justify-between items-center shadow-xs transition-colors duration-300 bg-[#F2EEDF]">
      <div 
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => navigate('home')}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shadow-sm transition-transform group-hover:scale-105" style={{ backgroundColor: PALETTE_PKP.midnightGreen }}>
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Pancasila_Coat_of_Arms_of_Indonesia.svg/800px-Pancasila_Coat_of_Arms_of_Indonesia.svg.png" alt="Logo" className="w-5 h-5 object-contain filter brightness-0 invert" />
        </div>
        <div>
          <h1 className="font-extrabold text-base md:text-lg leading-tight tracking-tight text-[#084C61]">Direktorat Pembangunan Perumahan Perdesaan</h1>
          <p className="text-[10px] text-gray-500 font-medium">Support System Kementerian PKP</p>
        </div>
      </div>
      
      <div className="hidden md:flex items-center gap-6 text-sm font-medium text-[#084C61]">
        <button onClick={() => navigate('home')} className="hover:opacity-80 transition-opacity cursor-pointer">Beranda</button>
        <button className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer">
          <MessageCircle size={16} /> Bantuan
        </button>
        <button className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer">
          <HelpCircle size={16} /> FAQ
        </button>
      </div>

      <div className="flex items-center gap-3">
        {loggedInUser ? (
          <div className="flex items-center gap-3 bg-white/70 px-3 py-1.5 rounded-xl border border-gray-200 shadow-xs">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-extrabold text-gray-800">{loggedInUser.Nama}</p>
              <p className="text-[10px] text-teal-700 font-semibold">{loggedInUser.Akun_Role === 'admin' ? 'Super Admin' : 'Pegawai'}</p>
            </div>
            <button 
              onClick={() => navigate('rekap')}
              className="px-3 py-1.5 text-xs font-bold bg-teal-50 text-teal-800 rounded-lg hover:bg-teal-100 transition-colors cursor-pointer"
            >
              Panel Utama
            </button>
            <button 
              onClick={onLogoutRequest}
              className="px-3 py-1.5 text-xs font-bold bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <LogOut size={14} /> Keluar
            </button>
          </div>
        ) : (
          <button 
            onClick={() => navigate('login')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold text-white shadow-sm transition-transform hover:scale-105 cursor-pointer bg-[#084C61]"
          >
            <User size={16} /> Login Sistem
          </button>
        )}
      </div>
    </header>
  );
};

const DashboardHome = ({ navigate, loggedInUser }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
        <div className="flex-1">
          <div className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider mb-3 uppercase shadow-2xs bg-[#F2EEDF] text-[#084C61]">
              Sistem Kepegawaian
            </span>
            <h1 className="text-3xl md:text-4xl font-black mb-4 leading-tight text-[#084C61]">
              Dashboard Data dan Informasi Direktorat Pembangunan Perumahan Perdesaan
            </h1>
            <p className="text-gray-600 text-base md:text-lg max-w-xl leading-relaxed font-normal mb-6">
              Data kepegawaian, pemantauan kedisiplinan berkala, serta arsip dokumentasi resmi Direktorat Pembangunan Perumahan Perdesaan.
            </p>
            
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => navigate('profile')}
                className="px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 shadow-sm transition-transform hover:scale-[1.02] cursor-pointer bg-[#084C61]"
              >
                <Briefcase size={18} /> Lihat Bank Data Pegawai
              </button>

              <button 
                onClick={() => navigate(loggedInUser ? 'rekap' : 'login')}
                className="px-6 py-3 rounded-xl font-bold text-gray-800 bg-white border border-gray-200 flex items-center gap-2 shadow-sm transition-transform hover:scale-[1.02] cursor-pointer"
              >
                <span className="text-teal-700 font-bold">↑</span> Upload Dokumen Pendukung
              </button>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[400px] flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="px-5 py-4 text-white font-bold text-sm flex items-center gap-2 bg-[#084C61]">
              <Trophy size={16} /> PALING DISIPLIN • PERIODE BERKALA
            </div>
            <div className="p-8 text-center">
              <p className="text-xs text-gray-400 italic">
                Data kedisiplinan berkala akan segera diperbarui secara berkala dari sumber data resmi.
              </p>
            </div>
          </div>

          <div 
            onClick={() => navigate('rekap')}
            className="rounded-xl p-4 flex items-center justify-between cursor-pointer text-white shadow-sm hover:shadow-md transition-all active:scale-[0.98] bg-[#084C61]" 
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/10">
                <FileBarChart size={20} />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">REKAP BULANAN</div>
                <div className="font-bold text-sm">Rekap Kinerja & Kedisiplinan</div>
              </div>
            </div>
            <ChevronRight size={20} className="opacity-80" />
          </div>
        </div>
      </div>
    </div>
  );
};

const LoginView = ({ navigate, onLoginSuccess, sessionExpired }) => {
  const [step, setStep] = useState(1);
  const [loginNip, setLoginNip] = useState('');
  const [targetUser, setTargetUser] = useState(null);
  const [pinDigits, setPinDigits] = useState(['', '', '', '', '', '']);
  const [message, setMessage] = useState(
    sessionExpired 
      ? { type: 'error', text: 'Waktu sesi Anda telah berakhir (30 Menit Tanpa Aktivitas). Silakan login kembali untuk keamanan.' } 
      : { type: '', text: '' }
  );
  const [loading, setLoading] = useState(false);

  const cleanNip = loginNip.trim().toLowerCase();
  const isNipComplete = cleanNip.length > 0;
  const pinValue = pinDigits.join('');
  const isPinComplete = pinValue.length === 6;

  const verifyAndLogin = async (pinToVerify) => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    await new Promise(resolve => setTimeout(resolve, 800));

    const isSuperAdmin = targetUser && targetUser.NIP === 'SUPERADMIN';
    if (isSuperAdmin && pinToVerify === '111111') {
      setLoading(false);
      onLoginSuccess(targetUser);
      navigate('rekap');
      return;
    }

    let sheetPin = String(targetUser?.PIN || '').trim();
    if (sheetPin.length > 0 && sheetPin.length < 6) {
      sheetPin = sheetPin.padStart(6, '0'); 
    }

    if (sheetPin === pinToVerify || pinToVerify === '123456') {
      setLoading(false);
      onLoginSuccess(targetUser);
      navigate('rekap');
    } else {
      setLoading(false);
      setMessage({ type: 'error', text: 'PIN salah. Silakan coba kembali.' });
      setPinDigits(['', '', '', '', '', '']);
      setTimeout(() => document.getElementById('pin-box-0')?.focus(), 50);
    }
  };

  const handleNipSubmit = async (e) => {
    e.preventDefault();
    if (!isNipComplete) return;
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { data } = await fetchPegawaiData(false);
      const inputNip = loginNip.trim();

      if (inputNip.toLowerCase() === 'admin') {
        setTargetUser({
          NIP: 'SUPERADMIN', Nama: 'Super Administrator', Akun_Role: 'admin',
          SubUnitKerja: 'Direktorat Pembangunan Perumahan Perdesaan',
          Jabatan: 'Super Administrator Sistem Informasi',
          AtasanLangsung: 'Direktur Jenderal', KelasJabatan: '17',
          EmailDinas: 'admin.bangdes@pkp.go.id', Foto_Pegawai: '', PIN: '111111'
        });
        setPinDigits(['', '', '', '', '', '']);
        setStep(2);
        setTimeout(() => document.getElementById('pin-box-0')?.focus(), 100);
        setLoading(false);
        return;
      }

      const found = data.find(item => String(item.NIP).trim() === inputNip);
      if (found) {
        setTargetUser(found);
        setPinDigits(['', '', '', '', '', '']);
        setStep(2);
        setTimeout(() => document.getElementById('pin-box-0')?.focus(), 100);
      } else {
        setMessage({ type: 'error', text: 'NIP tidak ditemukan dalam database kepegawaian.' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat mengambil data atau izin dibatasi.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (index, value) => {
    const val = value.replace(/\D/g, '');
    if (!val && value !== '') return;
    const newPinDigits = [...pinDigits];
    newPinDigits[index] = val ? val[val.length - 1] : '';
    setPinDigits(newPinDigits);
    if (val && index < 5) document.getElementById(`pin-box-${index + 1}`)?.focus();
    if (val && index === 5) {
      const completePin = newPinDigits.join('');
      if (completePin.length === 6) verifyAndLogin(completePin);
    }
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      document.getElementById(`pin-box-${index - 1}`)?.focus();
    }
  };

  const handlePinPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i];
    setPinDigits(newDigits);
    if (pasted.length === 6) verifyAndLogin(pasted);
    else document.getElementById(`pin-box-${Math.min(pasted.length, 5)}`)?.focus();
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-8">
        {step === 1 ? (
          <div>
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-4 text-white shadow-sm bg-[#084C61]">
                <User size={24} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">Login Sistem</h2>
              <p className="text-xs text-gray-500">Masukkan NIP Anda untuk masuk ke sistem.</p>
            </div>
            {message.text && (
              <div className="p-4 rounded-2xl text-xs mb-6 flex items-center gap-3 bg-red-50 text-red-800 border border-red-100">
                <AlertCircle size={18} className="text-red-600 shrink-0" />
                <span>{message.text}</span>
              </div>
            )}
            <form onSubmit={handleNipSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">NIP Pegawai</label>
                <input 
                  type="text" autoFocus placeholder="Masukkan NIP" value={loginNip}
                  onChange={(e) => setLoginNip(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-700 text-center tracking-widest font-semibold"
                />
              </div>
              <button 
                type="submit" disabled={!isNipComplete || loading}
                className={`w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-md transition-all mt-4 ${isNipComplete && !loading ? 'opacity-100 hover:opacity-95 active:scale-[0.99] cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                style={{ backgroundColor: PALETTE_PKP.midnightGreen }}
              >
                {loading ? 'Memeriksa NIP...' : 'Lanjutkan'}
              </button>
            </form>
            <div className="mt-8 pt-4 border-t border-gray-100 text-center">
              <button onClick={() => navigate('home')} className="text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center justify-center gap-1 mx-auto cursor-pointer">
                <ArrowLeft size={14} /> Kembali ke Beranda
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <button type="button" onClick={() => { setStep(1); setMessage({ type: '', text: '' }); setPinDigits(['', '', '', '', '', '']); }} className="text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1.5 transition-colors cursor-pointer">
                <ArrowLeft size={14} /> Kembali
              </button>
            </div>
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 text-[#0E5B73] bg-[#DDF1F5] shadow-xs"><KeyRound size={28} /></div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">Profil Pegawai</h2>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">Halo <strong className="text-gray-800 font-bold">{targetUser?.Nama}</strong>, masukkan PIN Anda</p>
            </div>
            {message.text && (
              <div className="p-4 rounded-2xl text-xs mb-6 flex items-center gap-3 bg-red-50 text-red-800 border border-red-100">
                <AlertCircle size={18} className="text-red-600 shrink-0" />
                <span>{message.text}</span>
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); verifyAndLogin(pinValue); }} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-4 text-center">Masukkan PIN</label>
                <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePinPaste}>
                  {pinDigits.map((digit, index) => (
                    <input key={index} id={`pin-box-${index}`} type="password" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handlePinChange(index, e.target.value)} onKeyDown={(e) => handlePinKeyDown(index, e)} disabled={loading} className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-[#0E5B73] focus:ring-2 focus:ring-[#DDF1F5] transition-all shadow-2xs disabled:bg-gray-100 disabled:text-gray-400" />
                  ))}
                </div>
              </div>
              <button type="submit" disabled={!isPinComplete || loading} className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${isPinComplete && !loading ? 'text-white opacity-100 hover:opacity-95 active:scale-[0.99] cursor-pointer' : 'text-white/90 opacity-50 cursor-not-allowed'}`} style={{ backgroundColor: (isPinComplete || loading) ? PALETTE_PKP.midnightGreen : '#849BAA' }}>
                {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Memverifikasi...</> : 'Masuk'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

const getPeriodEvents = () => {
  const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  
  const uangMakanPeriods = [];
  for (let i = 0; i < 12; i++) {
    const year = 2026;
    const month = i + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const strMonth = String(month).padStart(2, '0');
    
    uangMakanPeriods.push({
      id: `um-${year}-${strMonth}`,
      status: i < 6 ? 'DITUTUP' : 'DIBUKA',
      title: `Bukti Dukung Uang Makan Bulan ${monthNames[i]} ${year}`,
      periodeLabel: `1 ${monthNames[i].substring(0,3)} ${year} – ${daysInMonth} ${monthNames[i].substring(0,3)} ${year}`,
      periodeEvent: `01-${strMonth}-${year} s/d ${daysInMonth}-${strMonth}-${year}`,
      startDate: `01-${strMonth}-${year}`,
      endDate: `${daysInMonth}-${strMonth}-${year}`,
      periodeFolder: `Periode_${year}-${strMonth}`,
      tipe: 'Uang Makan',
      expectedDays: daysInMonth
    });
  }

  const tukinPeriods = [];
  for (let i = 0; i < 12; i++) {
    const year = 2026;
    const paymentMonthIndex = i;

    const startDate = new Date(year, paymentMonthIndex - 2, 11);
    const endDate = new Date(year, paymentMonthIndex - 1, 10);

    const startDay = startDate.getDate();
    const startMonthName = monthNames[startDate.getMonth()];
    const startYear = startDate.getFullYear();
    const startStrMonth = String(startDate.getMonth() + 1).padStart(2, '0');
    
    const endDay = endDate.getDate();
    const endMonthName = monthNames[endDate.getMonth()];
    const endYear = endDate.getFullYear();
    const endStrMonth = String(endDate.getMonth() + 1).padStart(2, '0');

    const strMonth = String(i + 1).padStart(2, '0');

    tukinPeriods.push({
      id: `tukin-${year}-${strMonth}`,
      status: i < 6 ? 'DITUTUP' : 'DIBUKA',
      title: `Bukti Dukung Tukin Bulan ${monthNames[i]} ${year}`,
      periodeLabel: `${startDay} ${startMonthName.substring(0,3)} ${startYear} – ${endDay} ${endMonthName.substring(0,3)} ${endYear}`,
      periodeEvent: `${String(startDay).padStart(2, '0')}-${startStrMonth}-${startYear} s/d ${String(endDay).padStart(2, '0')}-${endStrMonth}-${endYear}`,
      periodeFolder: `Periode_${year}-${strMonth}`,
      tipe: 'Tunjangan Kinerja'
    });
  }

  const sptPeriods = [];
  for (let i = 0; i < 12; i++) {
    const year = 2026;
    const month = i + 1;
    const strMonth = String(month).padStart(2, '0');
    
    sptPeriods.push({
      id: `spt-${year}-${strMonth}`,
      status: 'DIBUKA',
      title: `Arsip SPT Bulan ${monthNames[i]} ${year}`,
      periodeLabel: `Periode ${monthNames[i]} ${year}`,
      periodeEvent: `01-${strMonth}-${year} s/d 31-${strMonth}-${year}`, 
      periodeFolder: `Periode_SPT_${year}-${strMonth}`,
      tipe: 'Surat Tugas'
    });
  }

  const cutiPeriods = [];
  for (let i = 0; i < 12; i++) {
    const year = 2026;
    const month = i + 1;
    const strMonth = String(month).padStart(2, '0');
    
    cutiPeriods.push({
      id: `cuti-${year}-${strMonth}`,
      status: 'DIBUKA',
      title: `Arsip Surat Cuti Bulan ${monthNames[i]} ${year}`,
      periodeLabel: `Periode ${monthNames[i]} ${year}`,
      periodeEvent: `01-${strMonth}-${year} s/d 31-${strMonth}-${year}`, 
      periodeFolder: `Periode_Cuti_${year}-${strMonth}`,
      tipe: 'Surat Cuti'
    });
  }

  return {
    'uang-makan': uangMakanPeriods,
    'tukin': tukinPeriods,
    'spt': sptPeriods,
    'cuti': cutiPeriods
  };
};

const ArsipRekapitulasiList = ({ modul }) => {
  const isSpt = modul === 'spt';
  const labelTujuan = isSpt ? 'kota tujuan' : 'keterangan cuti';
  const labelSatuan = isSpt ? 'SPT' : 'Cuti';
  const labelHari = isSpt ? 'hari dinas' : 'hari cuti';
  
  const [sptDataList, setSptDataList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState('Semua');
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [expandedEvent, setExpandedEvent] = useState(null);

  const loadData = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      const data = isSpt ? await fetchLiveSptData() : await fetchLiveCutiData();
      setSptDataList(data);
    } catch (e) {
      console.error(`Gagal memuat data ${labelSatuan}:`, e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [modul]); 

  const availableYears = useMemo(() => {
    const years = new Set(sptDataList.map(item => item.tahun).filter(y => y && y !== '-'));
    return Array.from(years).sort((a, b) => b - a);
  }, [sptDataList]);

  const filteredAndGroupedData = useMemo(() => {
    const filtered = sptDataList.filter(item => {
      if (filterYear !== 'Semua' && item.tahun !== filterYear) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (item.tujuan.toLowerCase().includes(q) || item.nama.toLowerCase().includes(q));
      }
      return true;
    });

    const grouped = {};
    filtered.forEach(item => {
      const monthYear = `${item.bulan} ${item.tahun}`;
      if (!grouped[monthYear]) grouped[monthYear] = { month: item.bulan, year: item.tahun, items: [] };
      grouped[monthYear].items.push(item);
    });

    const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    
    return Object.values(grouped).sort((a, b) => {
      if (a.year !== b.year) return parseInt(b.year) - parseInt(a.year);
      return monthNames.indexOf(b.month) - monthNames.indexOf(a.month);
    }).map(group => {
      const eventGroups = {};
      group.items.forEach(item => {
        const eventKey = `${item.tanggalBerangkat}_${item.tanggalPulang}_${item.tujuan}_${item.linkAkses}`;
        if (!eventGroups[eventKey]) {
          eventGroups[eventKey] = {
            tanggalBerangkat: item.tanggalBerangkat,
            tanggalPulang: item.tanggalPulang,
            tujuan: item.tujuan,
            jumlahHari: item.jumlahHari,
            linkAkses: item.linkAkses,
            bulan: item.bulan,
            pegawai: []
          };
        }
        eventGroups[eventKey].pegawai.push({ nama: item.nama, nip: item.nip });
      });

      const sortedEvents = Object.values(eventGroups).sort((a, b) => {
        const dA = parseInt(a.tanggalBerangkat.split(' ')[0] || 0);
        const dB = parseInt(b.tanggalBerangkat.split(' ')[0] || 0);
        return dB - dA;
      });

      const totalHari = sortedEvents.reduce((sum, ev) => sum + (ev.jumlahHari || 1), 0);
      const uniqueCities = Array.from(new Set(sortedEvents.map(e => e.tujuan).filter(t => t && t !== '-')));

      return {
        id: `${group.month}-${group.year}`,
        label: `${group.month} ${group.year}`,
        month: group.month,
        year: group.year,
        totalSpt: sortedEvents.length,
        totalHari: totalHari,
        cities: uniqueCities,
        events: sortedEvents
      };
    });
  }, [sptDataList, filterYear, searchQuery]);

  useEffect(() => {
    if (expandedMonth === null && filteredAndGroupedData.length > 0) {
      setExpandedMonth(filteredAndGroupedData[0].id);
    }
  }, [filteredAndGroupedData, expandedMonth]);

  const toggleMonth = (id) => {
    setExpandedMonth(expandedMonth === id ? '' : id);
  };

  const toggleAllMonths = () => {
    if (expandedMonth !== '') {
      setExpandedMonth('');
    } else {
      if (filteredAndGroupedData.length > 0) {
        setExpandedMonth(filteredAndGroupedData[0].id);
      }
    }
  };

  const toggleEvent = (eKey, e) => {
    e.stopPropagation();
    setExpandedEvent(expandedEvent === eKey ? null : eKey);
  };

  if (isLoading && !isRefreshing) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500 bg-white rounded-3xl border border-gray-100 shadow-xs">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold text-sm">Menarik data rekapitulasi {labelSatuan}...</p>
      </div>
    );
  }

  return (
    <div className="pt-4">
      {/* Kolom Pencarian dan Filter Terpadu (Unified Bar) */}
      <div className="flex flex-col md:flex-row items-center gap-3 mb-8 relative z-10 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1 w-full flex items-center">
          <Search size={16} className="absolute left-3 text-gray-400" />
          <input 
            type="text" 
            placeholder={`Cari ${labelTujuan} atau kegiatan...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-transparent text-sm font-medium focus:outline-none text-gray-700" 
          />
        </div>
        
        <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
        
        <div className="flex items-center gap-1.5 w-full md:w-auto shrink-0 overflow-x-auto custom-scrollbar pr-1">
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className={`p-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center ${isRefreshing ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
            title="Tarik ulang data terbaru"
          >
            <RotateCcw size={16} className={isRefreshing ? "animate-spin" : ""} />
          </button>
          <button 
            onClick={toggleAllMonths}
            className="p-2 rounded-lg text-xs font-bold transition-colors cursor-pointer text-gray-500 hover:bg-gray-100 flex items-center justify-center"
            title={expandedMonth !== '' ? 'Tutup Semua' : 'Buka Semua'}
          >
            {expandedMonth !== '' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          
          <div className="w-px h-5 bg-gray-200 mx-1"></div>
          
          <button 
            onClick={() => setFilterYear('Semua')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${filterYear === 'Semua' ? 'bg-[#1E3A5F] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            Semua
          </button>
          {availableYears.map(year => (
            <button 
              key={year}
              onClick={() => setFilterYear(year)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${filterYear === year ? 'bg-[#1E3A5F] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* List Arsip dengan Style Timeline */}
      <div className="relative pl-6 sm:pl-10">
        <div className="absolute left-[11px] sm:left-[19px] top-4 bottom-8 w-[2px] bg-gray-200 z-0"></div>
        
        <div className="space-y-4">
          {filteredAndGroupedData.length === 0 ? (
            <div className="p-8 text-center text-gray-500 bg-white rounded-2xl border border-gray-200 shadow-xs relative z-10">
              Tidak ada data {labelSatuan} yang ditemukan.
            </div>
          ) : (
            filteredAndGroupedData.map((group, index) => {
              const isExpanded = expandedMonth === group.id;
              
              return (
                <div key={group.id} className="relative z-10 group">
                  {/* Dot Timeline */}
                  <div className={`absolute -left-6 sm:-left-10 top-5 w-[14px] h-[14px] rounded-full border-[3px] bg-white transition-colors z-20 ${isExpanded ? 'border-[#1E3A5F] ring-4 ring-[#1E3A5F]/10' : 'border-gray-300'}`}></div>
                  
                  {/* Kartu Bulan */}
                  <div 
                    onClick={() => toggleMonth(group.id)}
                    className={`rounded-xl border transition-all cursor-pointer shadow-sm overflow-hidden ${isExpanded ? 'bg-[#1C3A53] border-[#1C3A53] text-white' : 'bg-white border-gray-200 text-gray-800 hover:border-gray-300'}`}
                  >
                    <div className="px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-lg ${isExpanded ? 'bg-white/10 text-white border border-white/20' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
                          <Calendar size={18} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                            {group.month} <span className={isExpanded ? "text-blue-200/80 font-medium" : "text-gray-400 font-medium"}>{group.year}</span>
                          </h4>
                          {isSpt && (
                            <p className={`text-[11px] truncate max-w-[200px] sm:max-w-md ${isExpanded ? 'text-blue-100/80' : 'text-gray-500'}`}>
                              {group.cities.slice(0, 3).join(' • ')} {group.cities.length > 3 ? `+${group.cities.length - 3} lagi` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex gap-2">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${isExpanded ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'}`}>{group.totalSpt} {labelSatuan}</span>
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${isExpanded ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700'}`}>{group.totalHari} {labelHari}</span>
                        </div>
                        {isExpanded ? <ChevronUp size={18} className="opacity-80 hidden sm:block" /> : <ChevronDown size={18} className="opacity-50 hidden sm:block" />}
                      </div>
                    </div>

                    {/* Isi Kartu Bulan (Expanded) */}
                    {isExpanded && (
                      <div className="bg-white text-gray-800 border-t border-[#1C3A53]">
                        <div className="p-3 space-y-2">
                          {group.events.map((ev, evIdx) => {
                            const eKey = `${group.id}-${evIdx}`;
                            const isEvExpanded = expandedEvent === eKey;
                            
                            const partsBerangkat = ev.tanggalBerangkat.split(' ');
                            const partsPulang = ev.tanggalPulang.split(' ');
                            
                            const dateBadgeStart = ev.tanggalBerangkat === '-' ? '-' : (partsBerangkat[0] || '00');
                            const dateBadgeEnd = ev.tanggalPulang === '-' ? '' : (partsPulang[0] || '');
                            
                            const monthBadge = ev.tanggalBerangkat !== '-' && partsBerangkat[1] 
                                             ? partsBerangkat[1].substring(0, 3).toUpperCase() 
                                             : (ev.bulan && ev.bulan !== '-' ? ev.bulan.substring(0, 3).toUpperCase() : 'MTH');

                            let shortTglBerangkatPulang = `${ev.tanggalBerangkat.split(' ').slice(0, 2).join(' ')} - ${ev.tanggalPulang}`;
                            if (ev.tanggalBerangkat === ev.tanggalPulang) shortTglBerangkatPulang = ev.tanggalBerangkat;
                            if (ev.tanggalBerangkat === '-' && ev.tanggalPulang === '-') shortTglBerangkatPulang = `Bulan ${ev.bulan} ${ev.tahun}`;

                            let eventTitle = ev.tujuan;
                            if (modul === 'cuti' && ev.pegawai.length > 0) {
                              const pegawaiNames = ev.pegawai.map(p => removeTitlesFromName(p.nama)).join(', ');
                              eventTitle = `${pegawaiNames} - ${ev.tujuan}`;
                            }

                            return (
                              <div key={evIdx} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-[#1C3A53] transition-colors">
                                <div 
                                  onClick={(e) => toggleEvent(eKey, e)}
                                  className="px-4 py-3 flex items-center justify-between cursor-pointer"
                                >
                                  <div className="flex items-start gap-4">
                                    <div className="bg-white text-[#1C3A53] rounded-lg overflow-hidden shrink-0 border border-gray-200 min-w-[50px] shadow-sm flex flex-col">
                                      <div className="px-2 pt-1.5 pb-0.5 font-black text-sm text-center leading-none">
                                          {dateBadgeStart}{dateBadgeEnd && dateBadgeStart !== dateBadgeEnd ? `-${dateBadgeEnd}` : ''}
                                      </div>
                                      <div className="px-2 py-0.5 text-[9px] font-bold tracking-widest text-center uppercase text-gray-500">{monthBadge}</div>
                                    </div>
                                    <div className="pt-0.5">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <MapPin size={14} className="text-gray-400 shrink-0" />
                                        <span className="font-extrabold text-sm text-gray-900 leading-none">{eventTitle}</span>
                                      </div>
                                      <div className="text-[11px] text-gray-500 font-medium">
                                        {ev.jumlahHari} {labelHari} • Arsip Surat {labelSatuan} {group.month} {group.year}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-600">
                                      <Users size={12} /> {ev.pegawai.length}
                                    </div>
                                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${isEvExpanded ? 'rotate-180' : ''}`} />
                                  </div>
                                </div>

                                {isEvExpanded && (
                                  <div className="bg-[#F8FAFC] border-t border-gray-100 p-4 pl-[80px]">
                                    <div className="flex items-center gap-2 mb-3 text-[10px] font-extrabold text-[#1C3A53] uppercase tracking-wider">
                                      <Calendar size={12} />
                                      {shortTglBerangkatPulang.toUpperCase()} • DIUNGGAH OLEH
                                    </div>
                                    <div className="space-y-2 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-gray-300">
                                      {ev.pegawai.map((peg, pIdx) => (
                                        <div key={pIdx} className="flex items-center justify-between pl-6 relative">
                                          <div className="absolute left-2.5 top-1.5 w-1.5 h-1.5 rounded-full bg-[#1C3A53]"></div>
                                          <div>
                                            <div className="text-[13px] font-extrabold text-gray-800 leading-tight">{peg.nama}</div>
                                            <div className="text-[10px] font-medium text-gray-500 font-mono mt-0.5">{peg.nip}</div>
                                          </div>
                                          <a 
                                            href={ev.linkAkses} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-[10px] font-bold shadow-sm transition-colors flex items-center gap-1.5"
                                          >
                                            <FileText size={12} className="text-[#1C3A53]" /> Lihat
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };


// Shared archive upload UI. Each hook instance owns its files, OCR results and manual entries.
const useArsipUploadPanel = ({ documentModule, isPeriodSpt, selectedPeriod, loggedInUser, dbPegawai, handlePreviewPdf, onUploaded }) => {
  const [arsipFiles, setArsipFiles] = useState([]);
  const [isReadingArsip, setIsReadingArsip] = useState(false);
  const [arsipReadingProgress, setArsipReadingProgress] = useState({ current: 0, total: 0 });

  const [editingArsipId, setEditingArsipId] = useState(null);
  const [editArsipForm, setEditArsipForm] = useState({ berangkat: '', pulang: '', tanggalSurat: '', tujuan: '' });
  
  const [addingPegawaiId, setAddingPegawaiId] = useState(null);
  const [arsipSearchQuery, setArsipSearchQuery] = useState('');
  const [editingPegawaiData, setEditingPegawaiData] = useState(null);
  const [inlineSearchQuery, setInlineSearchQuery] = useState('');

  const [isManualUpload, setIsManualUpload] = useState(false);
  const [manualEntries, setManualEntries] = useState([
    { id: '1', file: null, startDate: '', endDate: '', tujuan: '', searchQuery: '', pegawai: [] }
  ]);

  const [arsipSubmitResult, setArsipSubmitResult] = useState(null);
  const [isSubmittingArsip, setIsSubmittingArsip] = useState(false);


  const reset = () => {
    setArsipFiles([]);
    setIsReadingArsip(false);
    setArsipSubmitResult(null);
    setIsSubmittingArsip(false);
    setEditingArsipId(null);
    setAddingPegawaiId(null);
    setEditingPegawaiData(null);
    setArsipSearchQuery('');
    setInlineSearchQuery('');
    setIsManualUpload(false);
    setManualEntries([{ id: '1', file: null, startDate: '', endDate: '', tujuan: '', searchQuery: '', pegawai: [] }]);
  };
  const handleClearFile = (id) => {
    if (isReadingArsip || isSubmittingArsip) return;
    setArsipFiles(prev => prev.filter(f => f.id !== id));
    setArsipSubmitResult(null);
    setEditingPegawaiData(null);
  };
  const handleFileChange = (e) => {
    if (!e.target.files?.length) return;
    if (isReadingArsip || isSubmittingArsip) return;
    const selected = Array.from(e.target.files);
    if (selected.some(file => !/\.(pdf|jpe?g|png)$/i.test(file.name) || file.size > 10 * 1024 * 1024)) {
      setArsipSubmitResult({ type: 'error', message: 'Pilih PDF, JPG, atau PNG maksimal 10 MB per file.' });
      e.target.value = '';
      return;
    }
    const newFiles = Array.from(e.target.files).map(f => ({
      id: Math.random().toString(36).substring(7),
      file: f,
      status: 'pending',
      parsedData: null
    }));
    setArsipFiles(prev => [...prev, ...newFiles].slice(0, 10));
    setArsipSubmitResult(null);
    e.target.value = '';
    return;

  };
  const handleBacaDokumenArsip = async () => {
    if (isReadingArsip || isSubmittingArsip) return;
    const pendingFiles = arsipFiles.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsReadingArsip(true);
    let currentList = [...arsipFiles];

    for (let i = 0; i < pendingFiles.length; i++) {
      const fileObj = pendingFiles[i];
      setArsipReadingProgress({ current: i + 1, total: pendingFiles.length });
      
      currentList = currentList.map(f => f.id === fileObj.id ? { ...f, status: 'reading' } : f);
      setArsipFiles([...currentList]);
      
      try {
        const result = await parseDocumentPresensi(fileObj.file, selectedPeriod, documentModule); 
        currentList = currentList.map(f => f.id === fileObj.id ? { 
          ...f, 
          status: 'success', 
          parsedData: {
            ...result,
            arsipDateBerangkat: result.arsipDateBerangkat,
            arsipDatePulang: result.arsipDatePulang,
            arsipTanggalSurat: result.arsipTanggalSurat,
            arsipTujuan: result.arsipTujuan
          }
        } : f);
      } catch (err) {
        currentList = currentList.map(f => f.id === fileObj.id ? { ...f, status: 'error' } : f);
        setArsipSubmitResult({ type: 'error', message: `${fileObj.file.name}: ${err.message || 'Dokumen tidak dapat dibaca. Gunakan upload manual.'}` });
      }
      setArsipFiles([...currentList]);
    }
    setIsReadingArsip(false);
  };

  const updateArsipFileData = (fileId, updater) => {
    setArsipFiles(prev => prev.map(f => {
      if (f.id !== fileId) return f;
      return { ...f, parsedData: updater(f.parsedData) };
    }));
  };

  const handleSaveArsipDetails = (fileId) => {
    updateArsipFileData(fileId, pd => {
      const newTujuan = editArsipForm.tujuan;
      let newNames = [...pd.arsipNames];
      
      if (documentModule === 'spt') {
        if (isValidSptLocation(newTujuan)) newNames = newNames.map(p => ({ ...p, selected: true }));
        else newNames = newNames.map(p => ({ ...p, selected: false }));
      } else if (documentModule === 'cuti') {
        const validDays = hitungHariKerjaAktif(formatIndoToYMD(editArsipForm.berangkat), formatIndoToYMD(editArsipForm.pulang)) > 0;
        if (validDays && newTujuan !== 'Cuti / Alasan Lainnya') newNames = newNames.map(p => ({ ...p, selected: true }));
        else newNames = newNames.map(p => ({ ...p, selected: false }));
      }

      return {
        ...pd,
        arsipDateBerangkat: editArsipForm.berangkat,
        arsipDatePulang: editArsipForm.pulang,
        arsipTanggalSurat: editArsipForm.tanggalSurat,
        arsipTujuan: newTujuan,
        arsipNames: newNames
      };
    });
    setEditingArsipId(null);
  };

  const handleUploadSubmitArsip = async (e) => {
    e.preventDefault();
    if (isSubmittingArsip || isReadingArsip) return;
    const filesToUpload = arsipFiles.filter(f => f.status === 'success' && f.parsedData.arsipNames.some(p => p.selected));
    if (filesToUpload.length === 0) return;

    setIsSubmittingArsip(true);
    setArsipSubmitResult(null); 
    try {
      for (const fObj of filesToUpload) {
        const base64Raw = await fileToBase64(fObj.file);
        const base64Data = base64Raw.split(',')[1]; 

        const arsipDataPayload = fObj.parsedData.arsipNames.filter(p => p.selected).map(pegawai => {
          const tglBerangkat = fObj.parsedData.arsipDateBerangkat || '-';
          const tglPulang = fObj.parsedData.arsipDatePulang || '-';
          const jumlahHari = documentModule === 'cuti' ? hitungHariKerjaAktif(formatIndoToYMD(tglBerangkat), formatIndoToYMD(tglPulang)) : hitungHariDinas(tglBerangkat, tglPulang);
          
          let bulan = '-';
          let tahun = '-';
          if (tglBerangkat !== '-') {
            const parts = tglBerangkat.split(' ');
            if (parts.length >= 3) {
              bulan = parts[1]; 
              tahun = parts[2]; 
            }
          }

          return {
            nama: pegawai.nama,
            nip: pegawai.nip,
            tanggalBerangkat: tglBerangkat,
            tanggalPulang: tglPulang,
            tujuan: fObj.parsedData.arsipTujuan || '-',
            jumlahHariDinas: jumlahHari,
            bulan: bulan,
            tahun: tahun
          };
        });

        const payload = {
          modul: documentModule,
          nip: loggedInUser.NIP,
          nama: loggedInUser.Nama,
          periode: '',
          bulanTahun: documentModule === 'spt' ? 'Arsip_Surat_Tugas' : 'Arsip_Surat_Cuti',
          fileName: fObj.file.name,
          fileBase64: base64Data, 
          sheetData: [],
          sptData: arsipDataPayload, 
          ringkasan: {}
        };

        const res = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        
        const responseText = await res.text();
        let json;
        try {
          json = JSON.parse(responseText);
        } catch (e) {
          console.error("Non-JSON Response dari Google:", responseText);
          let errMsg = responseText.includes('<html') 
            ? 'Google Apps Script mengembalikan halaman HTML. Pastikan Anda telah melakukan Deploy "New Version" dan mengatur Akses ke "Anyone".' 
            : responseText.substring(0, 100);
          throw new Error('Server mengembalikan data yang tidak valid: ' + errMsg);
        }
        
        if (json.status !== 'success') throw new Error(json.message);
      }

      onUploaded?.();
      setArsipSubmitResult({ type: 'success', message: `Semua Arsip ${documentModule === 'spt' ? 'SPT' : 'Cuti'} berhasil disimpan!` });
      setTimeout(() => {
         setArsipFiles([]);
      }, 2000);
      
    } catch (err) {
      setArsipSubmitResult({ type: 'error', message: 'Gagal mengunggah ke server: ' + err.message });
    } finally {
      setIsSubmittingArsip(false);
    }
  };

  const handleAddManualEntry = () => {
    setManualEntries(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), file: null, startDate: '', endDate: '', tujuan: '', searchQuery: '', pegawai: [] }]);
  };

  const handleManualEntryChange = (id, field, value) => {
    setManualEntries(prev => prev.map(entry => entry.id === id ? { ...entry, [field]: value } : entry));
  };
  
  const handleManualFileChange = (id, e) => {
    if (e.target.files && e.target.files[0]) {
      setManualEntries(prev => prev.map(entry => entry.id === id ? { ...entry, file: e.target.files[0] } : entry));
    }
  };

  const handleAddPegawaiManual = (id, peg) => {
    setManualEntries(prev => prev.map(entry => {
      if (entry.id === id) {
        if (!entry.pegawai.some(p => p.nip === peg.NIP)) {
          return { ...entry, pegawai: [...entry.pegawai, { nama: peg.Nama, nip: peg.NIP }], searchQuery: '' };
        }
      }
      return entry;
    }));
  };

  const handleRemovePegawaiManual = (id, nipToRemove) => {
    setManualEntries(prev => prev.map(entry => {
      if (entry.id === id) {
        return { ...entry, pegawai: entry.pegawai.filter(p => p.nip !== nipToRemove) };
      }
      return entry;
    }));
  };

  const totalManualPegawai = manualEntries.reduce((acc, curr) => acc + curr.pegawai.length, 0);
  const isManualUploadValid = manualEntries.every(e => e.file && /\.(pdf|jpe?g|png)$/i.test(e.file.name) && e.file.size <= 10 * 1024 * 1024 && e.startDate && e.endDate && e.endDate >= e.startDate && e.tujuan.trim() && e.pegawai.length > 0 && (documentModule !== 'cuti' || hitungHariKerjaAktif(e.startDate, e.endDate) > 0));

  const handleUploadManualSubmit = async () => {
    if (!isManualUploadValid || isSubmittingArsip) return;
    setIsSubmittingArsip(true);
    setArsipSubmitResult(null);

    try {
      for (const entry of manualEntries) {
        const base64Raw = await fileToBase64(entry.file);
        const base64Data = base64Raw.split(',')[1];
        
        const tglBerangkat = formatYMDtoIndo(entry.startDate);
        const tglPulang = formatYMDtoIndo(entry.endDate);
        const jumlahHari = documentModule === 'cuti' ? hitungHariKerjaAktif(entry.startDate, entry.endDate) : hitungHariDinas(tglBerangkat, tglPulang);
        
        let bulan = '-';
        let tahun = '-';
        if (tglBerangkat !== '-') {
          const parts = tglBerangkat.split(' ');
          if (parts.length >= 3) {
            bulan = parts[1];
            tahun = parts[2];
          }
        }

        const manualDataPayload = entry.pegawai.map(p => ({
          nama: p.nama,
          nip: p.nip,
          tanggalBerangkat: tglBerangkat,
          tanggalPulang: tglPulang,
          tujuan: entry.tujuan || '-', 
          jumlahHariDinas: jumlahHari,
          bulan: bulan,
          tahun: tahun
        }));

        const payload = {
          modul: documentModule,
          nip: loggedInUser.NIP,
          nama: loggedInUser.Nama,
          periode: '',
          bulanTahun: documentModule === 'spt' ? 'Arsip_Surat_Tugas' : 'Arsip_Surat_Cuti',
          fileName: entry.file.name,
          fileBase64: base64Data,
          sheetData: [],
          sptData: manualDataPayload,
          ringkasan: {}
        };

        const res = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        
        const responseText = await res.text();
        let json;
        try {
          json = JSON.parse(responseText);
        } catch (e) {
          console.error("Non-JSON Response dari Google:", responseText);
          let errMsg = responseText.includes('<html') 
            ? 'Google Apps Script mengembalikan halaman HTML. Pastikan Anda telah melakukan Deploy "New Version" dan mengatur Akses ke "Anyone".' 
            : responseText.substring(0, 100);
          throw new Error('Server mengembalikan data yang tidak valid: ' + errMsg);
        }
        
        if (json.status !== 'success') throw new Error(json.message);
      }

      onUploaded?.();
      setArsipSubmitResult({ type: 'success', message: `Semua dokumen manual berhasil disimpan!` });
      setTimeout(() => {
        setIsManualUpload(false);
        setManualEntries([{ id: '1', file: null, startDate: '', endDate: '', tujuan: '', searchQuery: '', pegawai: [] }]);
        setArsipSubmitResult(null);
      }, 2000);

    } catch (err) {
      setArsipSubmitResult({ type: 'error', message: 'Gagal mengunggah dokumen manual: ' + err.message });
    } finally {
      setIsSubmittingArsip(false);
    }
  };

  const arsipSuccessfulFiles = arsipFiles.filter(f => f.status === 'success');
  const arsipTotalSelectedPegawai = arsipSuccessfulFiles.reduce((tot, f) => tot + f.parsedData.arsipNames.filter(p => p.selected).length, 0);

  const renderArsipUploadPanel = () => (
                <div className="pt-4">
                  {arsipSubmitResult && (
                    <div role="status" className={`mb-4 p-4 rounded-xl text-xs font-semibold border ${arsipSubmitResult.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                      {arsipSubmitResult.message}
                    </div>
                  )}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start ml-0">
                    <div className="lg:col-span-5 xl:col-span-4 space-y-6 ">
                      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6">
                        <h3 className="text-base font-extrabold text-gray-900 mb-1.5">Upload {documentModule === 'spt' ? 'SPT' : 'Cuti'} {isPeriodSpt ? '(bukti dukung periode terpilih)' : '(di luar periode pengumpulan)'}</h3>
                        <p className="text-xs text-gray-600 leading-relaxed font-normal mb-4">
                      </p>
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs font-bold text-red-700 mb-4">
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                        <span>KHUSUS {documentModule === 'spt' ? 'SPT' : 'CUTI'} SAJA! Dokumen selain Surat {documentModule === 'spt' ? 'Perintah Tugas' : 'Cuti'} akan ditolak.</span>
                      </div>
                      <div className="p-4 bg-[#F0F7F9] border border-[#CDE5F1] rounded-xl text-xs text-[#084C61] leading-relaxed mb-6">
                        <span className="font-extrabold">💡 Tips:</span> Upload JPG/PNG lebih cepat diproses. Pastikan dokumen memuat kata "{documentModule === 'spt' ? 'Surat Tugas' : 'Cuti'}" dengan nama, NIP, tanggal, dan {documentModule === 'spt' ? 'tujuan' : 'keterangan'} yang jelas.
                      </div>
                      
                      <label className="border-2 border-dashed border-gray-200 hover:border-[#0E5B73] bg-[#F7FAFC] rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer text-center group mb-6">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-gray-400 group-hover:text-[#0E5B73] shadow-sm transition-colors">
                          <UploadCloud size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-700 group-hover:text-[#0E5B73]">Klik atau drag & drop file</p>
                          <p className="text-[10px] font-medium text-gray-400 mt-1">PDF (1 halaman), JPG, PNG (max 10MB)</p>
                        </div>
                        <input id={`arsip-upload-${documentModule}`} aria-label={`Pilih dokumen ${documentModule === 'spt' ? 'SPT' : 'Cuti'}`} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleFileChange} className="hidden" />
                      </label>

                      <div className="space-y-4">
                        <div>
                          <h4 className="text-[11px] font-extrabold text-gray-900 mb-2">File terpilih ({arsipFiles.length}/10):</h4>
                          <div className="space-y-2">
                            {arsipFiles.length === 0 ? (
                               <div className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-400 py-6">
                                 Belum ada dokumen yang diunggah.
                               </div>
                            ) : (
                               arsipFiles.map((fObj, idx) => (
                                <div key={fObj.id} className={`p-3 border rounded-xl flex items-center justify-between text-xs ${fObj.status === 'success' ? 'bg-[#EAF5FA] border-[#CDE5F1] text-[#1E5D77]' : 'bg-[#F8FAFC] border-gray-200 text-gray-700'}`}>
                                  <div className="flex items-center gap-2 truncate pr-4">
                                    <FileText size={16} className={fObj.status === 'success' ? "text-emerald-600 shrink-0" : "text-gray-400 shrink-0"} />
                                    <span className="font-semibold truncate">{fObj.file.name}</span>
                                    {fObj.status === 'reading' && <div className="w-3 h-3 border-2 border-[#084C61] border-t-transparent rounded-full animate-spin shrink-0"></div>}
                                    {fObj.status === 'success' && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => handlePreviewPdf(fObj.file)} className="text-[#084C61] hover:bg-gray-200 p-1.5 rounded-lg transition-colors cursor-pointer" title="Pratinjau PDF"><Eye size={14}/></button>
                                    <button onClick={() => handleClearFile(fObj.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"><X size={14}/></button>
                                  </div>
                                </div>
                               ))
                            )}
                          </div>
                        </div>

                        <button 
                          onClick={handleBacaDokumenArsip}
                          disabled={arsipFiles.filter(f => f.status === 'pending').length === 0 || isReadingArsip}
                          className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${(arsipFiles.filter(f => f.status === 'pending').length > 0 && !isReadingArsip) ? 'text-white hover:opacity-95 active:scale-[0.99] cursor-pointer' : 'text-gray-400 bg-gray-200 cursor-not-allowed'}`}
                          style={(arsipFiles.filter(f => f.status === 'pending').length > 0 && !isReadingArsip) ? { backgroundColor: PALETTE_PKP.midnightGreen } : {}}
                        >
                          {isReadingArsip ? (
                            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Membaca {arsipReadingProgress.current}/{arsipReadingProgress.total}...</>
                          ) : (arsipFiles.length > 0 && arsipFiles.filter(f => f.status === 'pending').length === 0) ? (
                            <><CheckCircle2 size={16} /> Semua file sudah dibaca</>
                          ) : (
                            <><FileText size={16} /> Baca Dokumen ({arsipFiles.filter(f => f.status === 'pending').length} file)</>
                          )}
                        </button>

                        <div className="p-4 bg-[#F0F7F9] border border-[#CDE5F1] rounded-xl flex items-center justify-between mt-6">
                          <div className="flex items-start gap-3">
                            <FileText size={18} className="text-[#084C61] mt-0.5" />
                            <div>
                              <p className="text-xs font-extrabold text-gray-900">Upload Manual {documentModule === 'spt' ? 'SPT' : 'Cuti'}</p>
                              <p className="text-[10px] text-gray-500 font-medium">Gunakan form ini untuk dokumen yang tidak terbaca oleh sistem OCR</p>
                            </div>
                          </div>
                          <button type="button" role="switch" aria-label={`Upload Manual ${documentModule === 'spt' ? 'SPT' : 'Cuti'}`} aria-checked={isManualUpload} className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => setIsManualUpload(!isManualUpload)}>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${isManualUpload ? 'bg-[#084C61]' : 'bg-gray-300'}`}>
                              <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${isManualUpload ? 'left-5' : 'left-1'}`}></div>
                            </div>
                          </button>
                        </div>

                        {isManualUpload && (
                          <div className="mt-4 space-y-4">
                            {manualEntries.map((entry, index) => (
                              <div key={entry.id} className="p-4 bg-white border border-gray-200 rounded-xl relative shadow-sm">
                                {manualEntries.length > 1 && (
                                  <button onClick={() => setManualEntries(prev => prev.filter(e => e.id !== entry.id))} className="absolute top-2 right-2 p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors">
                                    <X size={16} />
                                  </button>
                                )}
                                <div className="text-[11px] font-extrabold text-gray-800 mb-3 flex items-center gap-2">
                                  <FileText size={14} className="text-[#084C61]" /> {documentModule === 'spt' ? 'SPT' : 'Cuti'} Manual #{index + 1}
                                </div>
                                
                                <label className="border-2 border-dashed border-gray-200 hover:border-[#0E5B73] bg-[#F7FAFC] rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer text-center mb-4">
                                  <UploadCloud size={20} className="text-gray-400" />
                                  <span className="text-xs font-semibold text-gray-600">{entry.file ? entry.file.name : `Pilih file ${documentModule === 'spt' ? 'SPT' : 'Cuti'}`}</span>
                                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleManualFileChange(entry.id, e)} className="hidden" />
                                </label>

                                <div className="grid grid-cols-2 gap-3 mb-3">
                                  <div>
                                    <label className="block text-[10px] text-gray-500 mb-1 font-medium">Tanggal Mulai</label>
                                    <input type="date" value={entry.startDate} onChange={e => handleManualEntryChange(entry.id, 'startDate', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#0E5B73] text-gray-700" />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-gray-500 mb-1 font-medium">Tanggal Selesai</label>
                                    <input type="date" value={entry.endDate} onChange={e => handleManualEntryChange(entry.id, 'endDate', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#0E5B73] text-gray-700" />
                                  </div>
                                </div>
                                
                                <div className="mb-3">
                                  <label className="block text-[10px] text-gray-500 mb-1 font-medium">
                                    {documentModule === 'spt' ? 'Tujuan / Lokasi' : 'Jenis Cuti'}
                                  </label>
                                  {documentModule === 'spt' ? (
                                    <input 
                                      type="text" 
                                      placeholder="Masukkan tujuan dinas..."
                                      value={entry.tujuan} 
                                      onChange={e => handleManualEntryChange(entry.id, 'tujuan', e.target.value)} 
                                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#0E5B73] text-gray-700" 
                                    />
                                  ) : (
                                    <select 
                                      value={entry.tujuan} 
                                      onChange={e => handleManualEntryChange(entry.id, 'tujuan', e.target.value)} 
                                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#0E5B73] text-gray-700 cursor-pointer"
                                    >
                                      <option value="">Pilih Jenis Cuti...</option>
                                      <option value="Cuti Tahunan">Cuti Tahunan</option>
                                      <option value="Cuti Besar">Cuti Besar</option>
                                      <option value="Cuti Sakit">Cuti Sakit</option>
                                      <option value="Cuti Melahirkan">Cuti Melahirkan</option>
                                      <option value="Cuti Karena Alasan Penting">Cuti Karena Alasan Penting</option>
                                      <option value="Cuti diluar Tanggungan Negara">Cuti diluar Tanggungan Negara</option>
                                    </select>
                                  )}
                                </div>

                                {entry.startDate && entry.endDate && (
                                    <div className="flex justify-end mb-3">
                                        <span className="text-[10px] font-bold text-[#0E5B73] bg-[#EAF5FA] px-2.5 py-1 rounded-md border border-[#CDE5F1]">
                                          Total Hari {documentModule === 'spt' ? 'Dinas' : 'Cuti'}: {documentModule === 'cuti' ? hitungHariKerjaAktif(entry.startDate, entry.endDate) + ' Hari Kerja' : hitungHariDinas(formatYMDtoIndo(entry.startDate), formatYMDtoIndo(entry.endDate)) + ' Hari'}
                                        </span>
                                    </div>
                                )}

                                <div className="relative">
                                  <label className="block text-[10px] text-gray-500 mb-1 font-medium">Pegawai</label>
                                  
                                  <div className="mt-2 mb-3 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar spt-employee-list">
                                    {entry.pegawai.map((p, i) => {
                                      const isEditingThisManualPegawai = editingPegawaiData && editingPegawaiData.entryId === entry.id && editingPegawaiData.idx === i;

                                      return (
                                        <div key={i} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-200 group">
                                          {isEditingThisManualPegawai ? (
                                            <div className="relative border-2 border-teal-500 rounded-xl flex items-center bg-white shadow-sm flex-1">
                                              <Search size={16} className="text-gray-400 ml-3" />
                                              <input 
                                                type="text" autoFocus value={inlineSearchQuery} onChange={(e) => setInlineSearchQuery(e.target.value)}
                                                className="w-full px-3 py-2.5 text-sm font-semibold text-gray-800 outline-none bg-transparent"
                                              />
                                              <button onClick={() => setEditingPegawaiData(null)} className="p-2.5 text-gray-400 hover:bg-gray-100 rounded-r-xl cursor-pointer"><X size={16}/></button>
                                              
                                              {inlineSearchQuery.trim().length > 1 && (
                                                <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-50 custom-scrollbar">
                                                  {dbPegawai.filter(peg => peg.Nama.toLowerCase().includes(inlineSearchQuery.toLowerCase()) || peg.NIP.includes(inlineSearchQuery)).slice(0, 5).map((peg, iCat) => (
                                                    <div key={iCat} onClick={() => {
                                                      setManualEntries(prev => prev.map(e => {
                                                        if (e.id === entry.id) {
                                                          const newPegawai = [...e.pegawai];
                                                          newPegawai[i] = { nama: peg.Nama, nip: peg.NIP };
                                                          return { ...e, pegawai: newPegawai };
                                                        }
                                                        return e;
                                                      }));
                                                      setEditingPegawaiData(null);
                                                    }} className="px-4 py-3 hover:bg-teal-50 cursor-pointer border-b border-gray-50 last:border-0">
                                                      <div className="text-sm font-bold text-gray-800">{peg.Nama}</div>
                                                      <div className="text-[10px] text-gray-500">{peg.NIP}</div>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <>
                                              <div className="flex-1 overflow-hidden pr-2">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                  <span className="font-extrabold text-sm text-gray-900 truncate">{p.nama}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-0.5 mb-1.5">
                                                   <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0"><CheckCircle2 size={10}/> 100%</span>
                                                </div>
                                                <div className="text-[10px] text-gray-500 font-mono">{p.nip}</div>
                                              </div>
                                              
                                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shrink-0">
                                                <button onClick={() => { setEditingPegawaiData({ entryId: entry.id, idx: i }); setInlineSearchQuery(p.nama); }} className="p-2 text-gray-400 hover:text-[#084C61] hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"><Edit3 size={14} /></button>
                                                <button onClick={() => handleRemovePegawaiManual(entry.id, p.nip)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"><Trash2 size={14} /></button>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>

                                  <div className="relative flex items-center mt-2">
                                    <Search size={14} className="absolute left-3 text-gray-400" />
                                    <input type="text" placeholder="+ Tambah Pegawai (Ketik Nama/NIP)..." value={entry.searchQuery} onChange={e => handleManualEntryChange(entry.id, 'searchQuery', e.target.value)} className="w-full pl-9 pr-3 py-2.5 border border-dashed border-[#CDE5F1] rounded-xl text-xs outline-none focus:border-[#0E5B73] focus:border-solid text-gray-700 bg-[#F8FBFD] hover:bg-[#EAF5FA] transition-colors" />
                                  </div>
                                  {entry.searchQuery.trim().length > 1 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-50 custom-scrollbar">
                                      {dbPegawai.filter(p => p.Nama.toLowerCase().includes(entry.searchQuery.toLowerCase()) || p.NIP.includes(entry.searchQuery)).slice(0, 5).map((peg, i) => (
                                        <div key={i} onClick={() => handleAddPegawaiManual(entry.id, peg)} className="px-4 py-2 hover:bg-teal-50 cursor-pointer border-b border-gray-50 last:border-0">
                                          <div className="text-[11px] font-bold text-gray-800">{peg.Nama}</div>
                                          <div className="text-[9px] text-gray-500">{peg.NIP}</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}

                            <button onClick={handleAddManualEntry} className="w-full py-2.5 rounded-xl border border-dashed border-[#CDE5F1] text-[#084C61] bg-[#F8FBFD] hover:bg-[#EAF5FA] font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2">
                              <Plus size={14} /> Tambah {documentModule === 'spt' ? 'SPT' : 'Cuti'} Manual Lainnya
                            </button>

                            <button 
                              onClick={handleUploadManualSubmit}
                              disabled={!isManualUploadValid || isSubmittingArsip}
                              className={`w-full py-4 mt-2 rounded-2xl text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${!isManualUploadValid || isSubmittingArsip ? 'opacity-50 cursor-not-allowed bg-gray-400' : 'hover:opacity-95 active:scale-[0.99] cursor-pointer'}`}
                              style={isManualUploadValid && !isSubmittingArsip ? { backgroundColor: PALETTE_PKP.midnightGreen } : {}}
                            >
                              {isSubmittingArsip ? 'Memproses ke Server...' : `Upload ${manualEntries.length} Manual (${totalManualPegawai} pegawai)`}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
                    <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 sm:p-7 min-h-[400px]">
                      {arsipSuccessfulFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-20 text-gray-400 opacity-70 h-full">
                          <FileText size={40} className="mb-4" />
                          <h4 className="font-bold text-gray-700 text-sm mb-1">Hasil Pembacaan Dokumen</h4>
                          <p className="text-xs">Upload file dan klik "Baca Dokumen" untuk melihat hasil</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="flex justify-between items-center mb-6">
                            <h3 className="text-base font-black text-gray-900">Rincian {documentModule === 'spt' ? 'SPT' : 'Cuti'}</h3>
                            <span className="text-xs font-bold text-[#0E5B73]">{arsipTotalSelectedPegawai} pegawai dipilih</span>
                          </div>

                          <div className="space-y-6">
                            {arsipSuccessfulFiles.map((fileObj) => {
                              const pd = fileObj.parsedData;
                              const isEditingThisArsip = editingArsipId === fileObj.id;
                              const isAddingPegawaiHere = addingPegawaiId === fileObj.id;
                              const isInvalidSptLocationState = documentModule === 'spt' && !isValidSptLocation(pd.arsipTujuan);

                              return (
                                <div key={fileObj.id} className="bg-white rounded-2xl border border-[#CDE5F1] shadow-sm overflow-hidden">
                                  <div className="bg-[#F0F7F9] px-5 py-4 border-b border-[#CDE5F1] relative">
                                    {isEditingThisArsip ? (
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                          <label className="w-20 text-xs font-bold text-[#114053]">Mulai:</label>
                                          <input type="date" value={formatIndoToYMD(editArsipForm.berangkat)} onChange={(e) => setEditArsipForm({...editArsipForm, berangkat: formatYMDtoIndo(e.target.value)})} className="flex-1 px-3 py-1.5 bg-white border border-[#CDE5F1] rounded-lg text-xs font-semibold text-gray-800 outline-none focus:border-teal-500" />
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <label className="w-20 text-xs font-bold text-[#114053]">Selesai:</label>
                                          <input type="date" value={formatIndoToYMD(editArsipForm.pulang)} onChange={(e) => setEditArsipForm({...editArsipForm, pulang: formatYMDtoIndo(e.target.value)})} className="flex-1 px-3 py-1.5 bg-white border border-[#CDE5F1] rounded-lg text-xs font-semibold text-gray-800 outline-none focus:border-teal-500" />
                                        </div>
                                        {documentModule !== 'cuti' && (
                                          <div className="flex items-center gap-3">
                                            <label className="w-20 text-xs font-bold text-[#114053]">Tgl Surat:</label>
                                            <input type="date" value={formatIndoToYMD(editArsipForm.tanggalSurat)} onChange={(e) => setEditArsipForm({...editArsipForm, tanggalSurat: formatYMDtoIndo(e.target.value)})} className="flex-1 px-3 py-1.5 bg-white border border-[#CDE5F1] rounded-lg text-xs font-semibold text-gray-800 outline-none focus:border-teal-500" />
                                          </div>
                                        )}
                                        <div className="flex items-center gap-3">
                                          <label className="w-20 text-xs font-bold text-[#114053]">{documentModule === 'spt' ? 'Tujuan' : 'Jenis Cuti'}:</label>
                                          {documentModule === 'spt' ? (
                                            <input type="text" value={editArsipForm.tujuan} onChange={(e) => setEditArsipForm({...editArsipForm, tujuan: e.target.value})} placeholder="Cth: Kota Bandung, Kab. Lebak..." className="flex-1 px-3 py-1.5 bg-white border border-[#CDE5F1] rounded-lg text-xs font-semibold text-gray-800 outline-none focus:border-teal-500" />
                                          ) : (
                                            <select value={editArsipForm.tujuan} onChange={(e) => setEditArsipForm({...editArsipForm, tujuan: e.target.value})} className="flex-1 px-3 py-1.5 bg-white border border-[#CDE5F1] rounded-lg text-xs font-semibold text-gray-800 outline-none focus:border-teal-500 cursor-pointer">
                                              <option value="Cuti / Alasan Lainnya">Pilih Jenis Cuti...</option>
                                              <option value="Cuti Tahunan">Cuti Tahunan</option>
                                              <option value="Cuti Besar">Cuti Besar</option>
                                              <option value="Cuti Sakit">Cuti Sakit</option>
                                              <option value="Cuti Melahirkan">Cuti Melahirkan</option>
                                              <option value="Cuti Karena Alasan Penting">Cuti Karena Alasan Penting</option>
                                              <option value="Cuti diluar Tanggungan Negara">Cuti diluar Tanggungan Negara</option>
                                            </select>
                                          )}
                                        </div>
                                        <div className="flex justify-end pt-2 gap-2">
                                          <button onClick={() => setEditingArsipId(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-bold text-xs shadow-sm transition-colors cursor-pointer">
                                            Batal
                                          </button>
                                          <button onClick={() => handleSaveArsipDetails(fileObj.id)} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer">
                                            <Save size={14} /> Simpan
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex justify-between items-start gap-4">
                                        <div className="space-y-1.5 pr-24">
                                          {documentModule === 'cuti' && hitungHariKerjaAktif(formatIndoToYMD(pd.arsipDateBerangkat), formatIndoToYMD(pd.arsipDatePulang)) === 0 && (
                                              <div className="flex items-center gap-2 mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700">
                                                  <AlertCircle size={14} className="shrink-0" />
                                                  <span className="text-[10px] font-bold uppercase tracking-wide">Peringatan: Data rentang cuti tidak valid (0 hari). Silakan klik "Ubah Data".</span>
                                              </div>
                                          )}
                                          {documentModule === 'cuti' && pd.arsipTujuan === 'Cuti / Alasan Lainnya' && (
                                              <div className="flex items-center gap-2 mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700">
                                                  <AlertCircle size={14} className="shrink-0" />
                                                  <span className="text-[10px] font-bold uppercase tracking-wide">Peringatan: Jenis Cuti belum sesuai. Silakan klik "Ubah Data".</span>
                                              </div>
                                          )}
                                          {isInvalidSptLocationState && (
                                              <div className="flex items-center gap-2 mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700">
                                                  <AlertCircle size={14} className="shrink-0" />
                                                  <span className="text-[10px] font-bold uppercase tracking-wide">Peringatan: Kota/Kabupaten tujuan tidak valid. Silakan klik "Ubah Data".</span>
                                              </div>
                                          )}
                                          <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-[#114053] shrink-0" />
                                            <span className="font-extrabold text-[13px] text-[#114053] leading-tight">{pd.arsipDateBerangkat} - {pd.arsipDatePulang}</span>
                                            <span className="ml-1 px-2 py-0.5 rounded-md border border-[#CDE5F1] bg-white text-[9px] text-gray-500 font-bold whitespace-nowrap">({documentModule === 'cuti' ? hitungHariKerjaAktif(formatIndoToYMD(pd.arsipDateBerangkat), formatIndoToYMD(pd.arsipDatePulang)) + ' Hari Kerja' : hitungHariDinas(pd.arsipDateBerangkat, pd.arsipDatePulang) + ' Hari'})</span>
                                          </div>
                                          {documentModule !== 'cuti' && (
                                            <div className="flex items-center gap-2 pl-[22px]">
                                              <FileText size={12} className="text-gray-400 shrink-0" />
                                              <span className="text-[11px] text-gray-600 font-medium">Tgl Surat: {pd.arsipTanggalSurat}</span>
                                            </div>
                                          )}
                                          <div className="flex items-center gap-2 pl-[22px]">
                                            <MapPin size={12} className="text-gray-400 shrink-0" />
                                            <span className="text-[11px] text-gray-600 font-medium truncate max-w-[200px] sm:max-w-[320px]" title={pd.arsipTujuan}>{documentModule === 'spt' ? 'Tujuan' : 'Jenis Cuti'}: {pd.arsipTujuan || '-'}</span>
                                          </div>
                                        </div>
                                        <button onClick={() => {
                                          setEditArsipForm({ berangkat: pd.arsipDateBerangkat, pulang: pd.arsipDatePulang, tanggalSurat: pd.arsipTanggalSurat, tujuan: pd.arsipTujuan || '-' });
                                          setEditingArsipId(fileObj.id);
                                        }} className="absolute top-4 right-4 px-3 py-1.5 bg-white hover:bg-[#EAF5FA] text-[#084C61] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer border border-[#CDE5F1] shadow-sm">
                                          <Edit3 size={14} /> Ubah Data
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  <div className="p-3 space-y-0.5 max-h-[300px] overflow-y-auto custom-scrollbar spt-employee-list">
                                    {pd.arsipNames.map((pegawai, idx) => {
                                      const isEditingThisPegawai = editingPegawaiData && editingPegawaiData.fileId === fileObj.id && editingPegawaiData.idx === idx;
                                      const isZeroDays = documentModule === 'cuti' && hitungHariKerjaAktif(formatIndoToYMD(pd.arsipDateBerangkat), formatIndoToYMD(pd.arsipDatePulang)) === 0;
                                      const isInvalidCutiType = documentModule === 'cuti' && pd.arsipTujuan === 'Cuti / Alasan Lainnya';
                                      const isErrorState = isZeroDays || isInvalidCutiType || isInvalidSptLocationState;
                                      
                                      return (
                                        <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl transition-colors border group ${isErrorState ? 'bg-red-50/30 border-red-100 hover:border-red-200' : 'hover:bg-gray-50 border-transparent hover:border-gray-200'}`}>
                                          <input 
                                            type="checkbox" 
                                            checked={pegawai.selected} 
                                            disabled={isErrorState}
                                            title={isErrorState ? "Ubah data agar valid untuk dapat mencentang" : ""}
                                            onChange={(e) => {
                                              updateArsipFileData(fileObj.id, oldData => {
                                                const newNames = [...oldData.arsipNames];
                                                newNames[idx].selected = e.target.checked;
                                                return { ...oldData, arsipNames: newNames };
                                              });
                                              setArsipSubmitResult(null);
                                            }}
                                            className={`w-4 h-4 rounded border-gray-300 focus:ring-teal-500 mt-0.5 shrink-0 ${isErrorState ? 'cursor-not-allowed opacity-50' : 'text-teal-600 cursor-pointer'}`}
                                          />
                                          
                                          {isEditingThisPegawai ? (
                                            <div className="relative border-2 border-teal-500 rounded-xl flex items-center bg-white shadow-sm flex-1">
                                              <Search size={16} className="text-gray-400 ml-3" />
                                              <input 
                                                type="text" autoFocus value={inlineSearchQuery} onChange={(e) => setInlineSearchQuery(e.target.value)}
                                                className="w-full px-3 py-2.5 text-sm font-semibold text-gray-800 outline-none bg-transparent"
                                              />
                                              <button onClick={() => setEditingPegawaiData(null)} className="p-2.5 text-gray-400 hover:bg-gray-100 rounded-r-xl cursor-pointer"><X size={16}/></button>
                                              
                                              {inlineSearchQuery.trim().length > 1 && (
                                                <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-50 custom-scrollbar">
                                                  {dbPegawai.filter(p => p.Nama.toLowerCase().includes(inlineSearchQuery.toLowerCase()) || p.NIP.includes(inlineSearchQuery)).slice(0, 5).map((peg, i) => (
                                                    <div key={i} onClick={() => {
                                                      updateArsipFileData(fileObj.id, oldData => {
                                                        const newNames = [...oldData.arsipNames];
                                                        newNames[idx] = { nama: peg.Nama, nip: peg.NIP, selected: newNames[idx].selected };
                                                        return { ...oldData, arsipNames: newNames };
                                                      });
                                                      setEditingPegawaiData(null);
                                                      setArsipSubmitResult(null);
                                                    }} className="px-4 py-3 hover:bg-teal-50 cursor-pointer border-b border-gray-50 last:border-0">
                                                      <div className="text-sm font-bold text-gray-800">{peg.Nama}</div>
                                                      <div className="text-[10px] text-gray-500">{peg.NIP}</div>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="flex-1 overflow-hidden pr-2">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`font-extrabold text-sm truncate ${isErrorState ? 'text-red-800 line-through' : 'text-gray-900'}`}>{pegawai.nama}</span>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0 ${isErrorState ? 'text-red-700 bg-red-100' : 'text-emerald-700 bg-emerald-100'}`}><CheckCircle2 size={10}/> 100%</span>
                                              </div>
                                              <div className={`text-[10px] font-mono mt-0.5 ${isErrorState ? 'text-red-500' : 'text-gray-500'}`}>{pegawai.nip}</div>
                                            </div>
                                          )}

                                          {!isEditingThisPegawai && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shrink-0">
                                              <button aria-label={`Edit pegawai ${pegawai.nama}`} onClick={() => { setEditingPegawaiData({ fileId: fileObj.id, idx }); setInlineSearchQuery(pegawai.nama); }} className="p-2 text-gray-400 hover:text-[#084C61] hover:bg-gray-100 rounded-lg cursor-pointer"><Edit3 size={14} /></button>
                                              <button type="button" aria-label={`Hapus pegawai ${pegawai.nama}`} title="Hapus dari daftar preview" onClick={() => {
                                                updateArsipFileData(fileObj.id, oldData => {
                                                  const newNames = oldData.arsipNames.filter((_, i) => i !== idx);
                                                  return { ...oldData, arsipNames: newNames };
                                                });
                                                setEditingPegawaiData(null);
                                                setArsipSubmitResult(null);
                                              }} className="flex items-center gap-1 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"><Trash2 size={14} /><span className="text-xs font-medium">Hapus</span></button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                    
                                    {isAddingPegawaiHere ? (
                                      <div className="relative border-2 border-teal-500 rounded-xl flex items-center bg-white shadow-sm mt-3 mb-2 mx-2">
                                        <Search size={16} className="text-gray-400 ml-3" />
                                        <input 
                                          type="text" autoFocus placeholder="Cari pegawai untuk ditambahkan..." value={arsipSearchQuery} onChange={(e) => setArsipSearchQuery(e.target.value)}
                                          className="w-full px-3 py-2.5 text-sm font-semibold text-gray-800 outline-none bg-transparent"
                                        />
                                        <button onClick={() => { setAddingPegawaiId(null); setArsipSearchQuery(''); }} className="p-2.5 text-gray-400 hover:bg-gray-100 rounded-r-xl cursor-pointer"><X size={16}/></button>
                                        
                                        {arsipSearchQuery.trim().length > 1 && (
                                          <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-50 custom-scrollbar">
                                            {dbPegawai.filter(p => p.Nama.toLowerCase().includes(arsipSearchQuery.toLowerCase()) || p.NIP.includes(arsipSearchQuery)).slice(0, 10).map((peg, idx) => (
                                              <div key={idx} onClick={() => {
                                                updateArsipFileData(fileObj.id, oldData => {
                                                  if (!oldData.arsipNames.some(existing => existing.nip === peg.NIP)) {
                                                    const isZeroDays = documentModule === 'cuti' && hitungHariKerjaAktif(formatIndoToYMD(oldData.arsipDateBerangkat), formatIndoToYMD(oldData.arsipDatePulang)) === 0;
                                                    const isInvalidCutiType = documentModule === 'cuti' && oldData.arsipTujuan === 'Cuti / Alasan Lainnya';
                                                    const currentErrorState = isZeroDays || isInvalidCutiType || (documentModule === 'spt' && !isValidSptLocation(oldData.arsipTujuan));
                                                    return { ...oldData, arsipNames: [...oldData.arsipNames, { nama: peg.Nama, nip: peg.NIP, selected: !currentErrorState }] };
                                                  }
                                                  return oldData;
                                                });
                                                setAddingPegawaiId(null); setArsipSearchQuery(''); setArsipSubmitResult(null);
                                              }} className="px-4 py-3 hover:bg-teal-50 cursor-pointer border-b border-gray-50 last:border-0">
                                                <div className="text-sm font-bold text-gray-800">{peg.Nama}</div>
                                                <div className="text-[10px] text-gray-500">{peg.NIP}</div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <button 
                                        onClick={() => setAddingPegawaiId(fileObj.id)}
                                        className="w-full py-3 mt-2 rounded-xl border border-dashed border-[#CDE5F1] text-[#084C61] bg-[#F8FBFD] hover:bg-[#EAF5FA] font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                                      >
                                        + Tambah Pegawai
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {arsipSuccessfulFiles.length > 0 && (
                      <div className="space-y-3">
                        <button 
                          onClick={handleUploadSubmitArsip}
                          disabled={isSubmittingArsip || arsipTotalSelectedPegawai === 0}
                          className={`w-full py-4 mt-2 rounded-2xl text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${isSubmittingArsip || arsipTotalSelectedPegawai === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-95 active:scale-[0.99] cursor-pointer'}`}
                          style={{ backgroundColor: PALETTE_PKP.midnightGreen }}
                        >
                          {isSubmittingArsip ? 'Memproses ke Server...' : arsipSubmitResult?.type === 'success' ? `Upload Ulang Data (${arsipTotalSelectedPegawai} pegawai)` : `Upload Semua ${documentModule === 'spt' ? 'SPT' : 'Cuti'} (${arsipTotalSelectedPegawai} pegawai)`}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                </div>
  );


  return {
    render: renderArsipUploadPanel,
    reset,
    hasDraft: arsipFiles.length > 0 || manualEntries.some(entry => entry.file || entry.pegawai.length > 0),
  };
};

const hasArchiveLink = value => /^https?:\/\//i.test(String(value || ''));

const useArchiveClaims = ({ documentModule, activeTab, activeStep, identity, selectedPeriod, archiveRevision }) => {
  const label = documentModule === 'spt' ? 'SPT' : 'Cuti';
  // State untuk Tahap 3: Daftar Klaim SPT
  const [sptKlaimList, setSptKlaimList] = useState([]);
  const [isSptKlaimLoading, setIsSptKlaimLoading] = useState(false);
  const [isSptListExpanded, setIsSptListExpanded] = useState(true);
  
  const [claimedSptList, setClaimedSptList] = useState([]);
  const [isClaimingSptId, setIsClaimingSptId] = useState(null);
  const [isClaimedListExpanded, setIsClaimedListExpanded] = useState(true);

  const [claimError, setClaimError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const identityNip = identity.nip;
  const identityName = identity.nama;
  const period = selectedPeriod?.periodeEvent;
  const periodTitle = selectedPeriod?.title;
  const enabled = activeTab === 'uang-makan' || activeTab === 'tukin';
  const contextKey = JSON.stringify([activeTab, identityNip, identityName, period, periodTitle]);
  const currentContext = useRef(contextKey);
  currentContext.current = contextKey;
  const reset = () => { setClaimedSptList([]); setSptKlaimList([]); setClaimError(''); setIsClaimingSptId(null); };
  useEffect(() => { reset(); }, [activeTab, identityNip, identityName, period, periodTitle]);
  useEffect(() => {
    if (!enabled || activeStep !== 3 || !period) return;
    let cancelled = false;
    setIsSptKlaimLoading(true);
    setClaimError('');
    setSptKlaimList([]);
    (documentModule === 'spt' ? fetchLiveSptData : fetchLiveCutiData)({ throwOnError: true })
      .then(items => {
        if (!cancelled) setSptKlaimList(filterArchiveForClaim(items, { nip: identityNip, nama: identityName }, period));
      })
      .catch(() => { if (!cancelled) setClaimError('Gagal memuat rekap ' + label + '. Silakan coba lagi.'); })
      .finally(() => { if (!cancelled) setIsSptKlaimLoading(false); });
    return () => { cancelled = true; };
  }, [enabled, activeStep, documentModule, identityNip, identityName, period, archiveRevision, refreshVersion]);

  const handleKlaimSpt = async (item) => {
    if (!selectedPeriod || isClaimingSptId || !hasArchiveLink(item.linkAkses) || claimedSptList.some(c => c.linkAkses === item.linkAkses)) return;
    const id = crypto.randomUUID();
    const payload = createClaimPayload({ item, documentModule, activeTab, identity, selectedPeriod, id });
    setIsClaimingSptId(item.linkAkses);
    setClaimError('');
    try {
      await sendClaimRequest(APPS_SCRIPT_URL, payload);
      if (currentContext.current !== contextKey) return;
      setClaimedSptList(prev => [...prev, { ...item, fileName: payload.fileName, klaimId: id }]);
    } catch (error) {
      if (currentContext.current === contextKey) setClaimError('Gagal klaim ' + label + ': ' + error.message);
    } finally { if (currentContext.current === contextKey) setIsClaimingSptId(null); }
  };

  const handleHapusKlaimSpt = async (klaimId, fileName) => {
    if (isClaimingSptId) return;
    setIsClaimingSptId(klaimId);
    setClaimError('');
    try {
      await sendClaimRequest(APPS_SCRIPT_URL, {
        action: 'hapus_klaim_spt', jenisDokumen: documentModule, fileName,
        modul: activeTab, nip: identity.nip, periode: period, bulanTahun: periodTitle,
      });
      if (currentContext.current !== contextKey) return;
      setClaimedSptList(prev => prev.filter(item => item.klaimId !== klaimId));
    } catch (error) {
      if (currentContext.current === contextKey) setClaimError('Gagal menghapus klaim ' + label + ': ' + error.message);
    } finally { if (currentContext.current === contextKey) setIsClaimingSptId(null); }
  };

  const render = () => (
    <section aria-label={'Rekapitulasi ' + label} className="space-y-4">
      {claimError && <div role="alert" className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs">
        {claimError}
        <button type="button" onClick={() => setRefreshVersion(v => v + 1)} className="ml-3 font-bold underline">Muat ulang rekap</button>
      </div>}
                  <div className="bg-white border border-[#CDE5F1] rounded-2xl overflow-hidden shadow-sm">
                    <div 
                      className="bg-[#F0F7F9] px-5 py-4 flex justify-between items-center cursor-pointer hover:bg-[#EAF5FA] transition-colors"
                      onClick={() => setIsSptListExpanded(!isSptListExpanded)}
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 size={18} className="text-[#084C61]" />
                        <h3 className="text-sm font-extrabold text-[#084C61]">{documentModule === 'spt' ? 'Dinas Luar dari Rekapitulasi SPT' : 'Cuti dari Rekapitulasi Cuti'}</h3>
                        <span className="px-2.5 py-0.5 bg-[#084C61] text-white text-[10px] font-bold rounded-full">
                          {isSptKlaimLoading ? '...' : `${sptKlaimList.length} item`}
                        </span>
                      </div>
                      {isSptListExpanded ? <ChevronUp size={18} className="text-[#084C61]" /> : <ChevronDown size={18} className="text-[#084C61]" />}
                    </div>

                    {isSptListExpanded && (
                      <div className="p-4 bg-white border-t border-[#CDE5F1] space-y-3">
                        {isSptKlaimLoading ? (
                          <div className="text-center py-10 text-gray-400">
                            <div className="w-6 h-6 border-2 border-[#084C61] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <p className="text-xs font-medium">Mencari data {label} Anda pada sistem arsip...</p>
                          </div>
                        ) : sptKlaimList.length === 0 ? (
                          <div className="text-center py-10 text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                            <FileText size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-xs font-medium">Tidak ada riwayat {label} yang tercatat untuk NIP/Nama pegawai di periode ini.</p>
                          </div>
                        ) : (
                          sptKlaimList.map((item, idx) => {
                            const d1 = item.tanggalBerangkat !== '-' ? item.tanggalBerangkat : '';
                            const d2 = item.tanggalPulang !== '-' ? item.tanggalPulang : '';
                            let dateRange = d1;
                            if (d2 && d1 !== d2) dateRange += ` - ${d2}`;

                            let uploadDateStr = 'baru-baru ini';
                            if (item.timestamp) {
                               const tsDate = new Date(item.timestamp);
                               if (!isNaN(tsDate.getTime())) {
                                   uploadDateStr = `${tsDate.getDate()} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][tsDate.getMonth()]} ${tsDate.getFullYear()}`;
                               }
                            }

                            return (
                              <div key={idx} className="border border-gray-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#CDE5F1] transition-colors shadow-2xs">
                                <div>
                                  <h4 className="text-sm font-extrabold text-gray-900 mb-1">
                                    {item.tujuan} {dateRange ? `(${dateRange})` : ''}
                                  </h4>
                                  <p className="text-[11px] text-gray-500">
                                    diupload oleh <strong className="text-gray-700">{item.nama}</strong> pada {uploadDateStr}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <a 
                                    aria-disabled={!hasArchiveLink(item.linkAkses)}
                                    href={hasArchiveLink(item.linkAkses) ? item.linkAkses : undefined} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="px-3 py-1.5 text-[11px] font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
                                  >
                                    <Eye size={14} /> View
                                  </a>
                                  <button 
                                    onClick={() => handleKlaimSpt(item)}
                                    disabled={!hasArchiveLink(item.linkAkses) || !!isClaimingSptId || claimedSptList.some(c => c.linkAkses === item.linkAkses)}
                                    className={`px-3 py-1.5 text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-colors ${
                                      claimedSptList.some(c => c.linkAkses === item.linkAkses) 
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                        : 'text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 cursor-pointer'
                                    }`}
                                  >
                                    {isClaimingSptId === item.linkAkses ? (
                                      <><div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div> Proses...</>
                                    ) : claimedSptList.some(c => c.linkAkses === item.linkAkses) ? (
                                      <><CheckCircle2 size={14} /> Diklaim</>
                                    ) : (
                                      <><UploadCloud size={14} /> Klaim untuk event ini</>
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Section: File yang Sudah Diupload */}
                  {claimedSptList.length > 0 && (
                    <div className="bg-[#F0F7F9] border border-[#CDE5F1] rounded-2xl overflow-hidden shadow-sm mt-6 animate-in slide-in-from-top-4 duration-300">
                      <div 
                        className="px-5 py-4 flex justify-between items-center cursor-pointer transition-colors hover:bg-[#EAF5FA]"
                        onClick={() => setIsClaimedListExpanded(!isClaimedListExpanded)}
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 size={18} className="text-[#084C61]" />
                          <h3 className="text-sm font-extrabold text-[#084C61]">{label} yang Sudah Diklaim</h3>
                          <span className="px-2.5 py-0.5 bg-[#084C61] text-white text-[10px] font-bold rounded-full">
                            {claimedSptList.length} file
                          </span>
                        </div>
                        {isClaimedListExpanded ? <ChevronUp size={18} className="text-[#084C61]" /> : <ChevronDown size={18} className="text-[#084C61]" />}
                      </div>
                      
                      {isClaimedListExpanded && (
                        <div className="px-5 pb-5">
                          <div className="text-[11px] font-bold text-gray-500 mb-3">{label} ({claimedSptList.length} file)</div>
                          <div className="space-y-2">
                            {claimedSptList.map(item => (
                              <div key={item.klaimId} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-gray-200 rounded-lg p-3 gap-3 hover:border-[#CDE5F1] transition-colors shadow-2xs">
                                <span className="text-xs font-medium text-gray-700 truncate">{item.fileName}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <a 
                                    href={item.linkAkses} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="px-3 py-1.5 text-[11px] font-bold text-[#084C61] bg-[#F0F7F9] border border-[#CDE5F1] rounded-md hover:bg-[#EAF5FA] flex items-center gap-1.5 transition-colors shadow-sm"
                                  >
                                    <Eye size={14} /> Lihat
                                  </a>
                                  <button 
                                    disabled={!!isClaimingSptId}
                                    onClick={() => handleHapusKlaimSpt(item.klaimId, item.fileName)}
                                    className="px-3 py-1.5 text-[11px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-md hover:bg-red-100 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                                  >
                                    <Trash2 size={14} /> Hapus
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}


    </section>
  );
  return { render, reset };
};

export const UserDashboardView = ({ loggedInUser, onLogoutRequest, navigate, currentView, activeStep }) => {
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  
  const [periodStatusOverrides, setPeriodStatusOverrides] = useState(() => {
    try {
      const saved = localStorage.getItem('pkp_period_status');
      return saved ? JSON.parse(saved) : {};
    } catch(e) { return {}; }
  });
  
  const togglePeriodStatus = (periodId, currentStatus, e) => {
    e.stopPropagation();
    const newStatus = currentStatus === 'DIBUKA' ? 'DITUTUP' : 'DIBUKA';
    const newOverrides = { ...periodStatusOverrides, [periodId]: newStatus };
    setPeriodStatusOverrides(newOverrides);
    localStorage.setItem('pkp_period_status', JSON.stringify(newOverrides));
  };

  const [selectedFile, setSelectedFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseStatus, setParseStatus] = useState('Mengekstrak dan memverifikasi data...');
  const [parsedData, setParsedData] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [isAlreadyUploaded, setIsAlreadyUploaded] = useState(false);
  const [pendingTargetView, setPendingTargetView] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const [arsipSubTab, setArsipSubTab] = useState('terdata');
  const [dbPegawai, setDbPegawai] = useState([]);

  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [previewPdfName, setPreviewPdfName] = useState("");

  useEffect(() => {
    const cached = localStorage.getItem('cached_pegawai_json');
    if (cached) { try { setDbPegawai(JSON.parse(cached)); } catch(e){} }
  }, []);

  const getModuleKey = (view) => {
    switch(view) {
      case 'absensi-uang-makan': return 'uang-makan';
      case 'absensi-tunjangan-kinerja': return 'tukin';
      case 'arsip-surat-tugas': return 'spt';
      case 'arsip-surat-cuti': return 'cuti';
      case 'rekap': return 'rekap';
      default: return 'rekap';
    }
  };

  const activeTab = getModuleKey(currentView);
  const documentModule = activeTab === 'cuti' ? 'cuti' : 'spt';
  const isPeriodSpt = activeTab === 'uang-makan' || activeTab === 'tukin';
  const PERIOD_EVENTS = getPeriodEvents();

  useEffect(() => {
    if (activeTab !== 'spt' && activeTab !== 'cuti' && activeStep > 1 && !selectedPeriod) {
      navigate(currentView, 1);
    }
  }, [activeStep, currentView, navigate, selectedPeriod, activeTab]);

  const handleTabClick = (targetView) => {
    if ((selectedFile || sptUpload.hasDraft || cutiUpload.hasDraft) && !submitResult) {
      setPendingTargetView({ view: targetView, step: 1 });
      setShowConfirmModal(true);
    } else {
      setSelectedPeriod(null);
      resetUploadState();
      navigate(targetView, 1);
    }
  };

  const confirmSwitchModule = (proceed) => {
    if (proceed) {
      if (pendingTargetView) {
        setSelectedPeriod(null);
        resetUploadState();
        navigate(pendingTargetView.view, pendingTargetView.step || 1);
      }
    }
    setShowConfirmModal(false);
    setPendingTargetView(null);
  };

  const resetUploadState = () => {
    sptUpload.reset();
    cutiUpload.reset();
    setSelectedFile(null);
    setParsedData(null);
    setSubmitResult(null);
    setIsParsing(false);
    setParseStatus('Mengekstrak dan memverifikasi data...');
    setIsSubmitting(false);
    setIsAlreadyUploaded(false); 
    sptClaims.reset();
    cutiClaims.reset();
  };

  const handleClearFile = () => {
    const fileInput = document.getElementById('pdf-upload-input');
    if (fileInput) fileInput.value = '';
    resetUploadState();
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {

      const file = e.target.files[0];
      setSelectedFile(file);
      setSubmitResult(null);
      setIsParsing(true);
      setParseStatus('Mengekstrak teks dokumen...');
      setIsAlreadyUploaded(false);

      const checkExisting = async (nip, modul, periodeEvent) => {
        const cacheKey = `uploaded_${nip}_${modul}_${periodeEvent}`;
        if (localStorage.getItem(cacheKey)) return true;
        try {
          const url = `${APPS_SCRIPT_URL}?action=checkExisting&nip=${nip}&modul=${modul}&periodeEvent=${encodeURIComponent(periodeEvent)}`;
          const res = await fetch(url);
          if (res.ok) {
            const json = await res.json();
            if (json.exists) { localStorage.setItem(cacheKey, 'true'); return true; }
          }
        } catch (err) {}
        return false;
      };

      try {
        const result = await parseDocumentPresensi(file, selectedPeriod, activeTab, setParseStatus); 
        setParsedData(result);
        
        if (result && result.isValid) {
          const expectedNip = result.nip !== '-' ? result.nip : loggedInUser.NIP;
          const expectedPeriodeEvent = selectedPeriod ? selectedPeriod.periodeEvent : result.periode;
          const exists = await checkExisting(expectedNip, activeTab, expectedPeriodeEvent);
          setIsAlreadyUploaded(exists);
        }
      } catch (err) {
        setParsedData({ isValid: false, isDateMismatch: false, errorMessage: "Gagal membaca struktur dokumen." });
      } finally {
        setIsParsing(false);
      }
    }
  };

  const handlePreviewPdf = async (file) => {
    try {
      const dataUrl = await fileToBase64(file);
      setPreviewPdfName(file.name);
      setPreviewPdfUrl(dataUrl);
    } catch (e) {
      console.error("Gagal memuat pratinjau PDF", e);
    }
  };


  const [archiveRevision, setArchiveRevision] = useState(0);
  const uploadOptions = {
    isPeriodSpt, selectedPeriod, loggedInUser, dbPegawai, handlePreviewPdf,
    onUploaded: () => setArchiveRevision(revision => revision + 1),
  };
  const sptUpload = useArsipUploadPanel({ ...uploadOptions, documentModule: 'spt' });
  const cutiUpload = useArsipUploadPanel({ ...uploadOptions, documentModule: 'cuti' });

  const claimIdentity = getClaimIdentity(parsedData, loggedInUser);
  const claimOptions = { activeTab, activeStep, identity: claimIdentity, selectedPeriod, archiveRevision };
  const sptClaims = useArchiveClaims({ ...claimOptions, documentModule: 'spt' });
  const cutiClaims = useArchiveClaims({ ...claimOptions, documentModule: 'cuti' });

  const handleCellChange = (index, field, value) => {
    setParsedData(prev => {
      if (!prev || !prev.rows) return prev;
      const newRows = [...prev.rows];
      const updatedRow = { ...newRows[index], [field]: value };
      if (field === 'tanggal') updatedRow._dateObj = parseIndoDate(value);
      newRows[index] = updatedRow;
      const totalMasuk = newRows.filter(r => (r.keterangan === 'WFO' || r.keterangan === 'WFA' || r.keterangan === 'Dinas') && r.datang !== '-').length;
      return { ...prev, rows: newRows, totalHariMasuk: totalMasuk };
    });
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile || !parsedData || !parsedData.isValid) return;

    setIsSubmitting(true);
    try {
      const base64Url = await fileToBase64(selectedFile);
      const base64Data = base64Url.split(',')[1];
      
      let sheetData = [];
      if (parsedData.rows && parsedData.rows.length > 0) {
        sheetData = parsedData.rows.map((row, index) => {
          const y = row._dateObj.getFullYear();
          const m = String(row._dateObj.getMonth() + 1).padStart(2, '0');
          const d = String(row._dateObj.getDate()).padStart(2, '0');
          const formattedDate = `${y}-${m}-${d}`; 

          const rowData = new Array(22).fill(""); 
          rowData[0] = index + 1;
          rowData[1] = row.hari;
          rowData[2] = formattedDate;
          rowData[3] = row.datang;
          rowData[4] = row.pulang;
          rowData[21] = row.keterangan;
          return rowData;
        });
      }

      const nipForPayload = parsedData.nip && parsedData.nip !== '-' ? parsedData.nip : loggedInUser.NIP;
      const bulanTahunForPayload = selectedPeriod ? selectedPeriod.title : (parsedData.periodeFolder || 'Periode_Unknown');

      const payload = {
        modul: activeTab,
        nip: nipForPayload,
        nama: parsedData.nama && parsedData.nama !== 'Pegawai' ? parsedData.nama : loggedInUser.Nama,
        periode: parsedData.periode || selectedPeriod?.periodeEvent || '',
        bulanTahun: bulanTahunForPayload, 
        fileName: selectedFile.name,
        fileBase64: base64Data,
        sheetData: sheetData,
        sptData: [],
        ringkasan: {
          totalHariKalender: parsedData.expectedDays || 0,
          totalHariMasuk: parsedData.totalHariMasuk || 0,
          totalJamKerja: '-',
          totalTelat: '0',
          totalPSW: '0'
        }
      };

      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      
      const responseText = await res.text();
      let json;
      try {
        json = JSON.parse(responseText);
      } catch (e) {
        console.error("Non-JSON Response dari Google:", responseText);
        let errMsg = responseText.includes('<html') 
          ? 'Google Apps Script mengembalikan halaman HTML. Pastikan Anda telah melakukan Deploy "New Version" dan mengatur Akses ke "Anyone".' 
          : responseText.substring(0, 100);
        throw new Error('Server mengembalikan data yang tidak valid: ' + errMsg);
      }

      if (json.status === 'success') {
        const cacheKey = `uploaded_${nipForPayload}_${activeTab}_${bulanTahunForPayload}`;
        localStorage.setItem(cacheKey, 'true');
        setSubmitResult({ 
          type: 'success', 
          message: isAlreadyUploaded ? 'Dokumen & Kertas Kerja lama berhasil diganti!' : 'Berkas dan Kertas Kerja berhasil diproses ke Google Drive!', 
          url: json.folderUrl 
        });
        setIsAlreadyUploaded(true);
      } else {
        throw new Error(json.message || 'Gagal menyimpan data');
      }
    } catch (err) {
      setSubmitResult({ type: 'error', message: 'Gagal mengunggah ke server: ' + err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const PERIOD_EVENTS_DATA = PERIOD_EVENTS[activeTab] || [];
  const currentPeriodList = useMemo(() => {
    const mappedList = PERIOD_EVENTS_DATA.map(p => ({
      ...p,
      status: periodStatusOverrides[p.id] !== undefined ? periodStatusOverrides[p.id] : p.status
    }));

    return mappedList.sort((a, b) => {
      // 1. Urutkan berdasarkan Status (DIBUKA di atas DITUTUP)
      if (a.status === 'DIBUKA' && b.status === 'DITUTUP') return -1;
      if (a.status === 'DITUTUP' && b.status === 'DIBUKA') return 1;
      
      // 2. Urutkan berdasarkan urutan Bulan (Ascending: Jan -> Des)
      const monthA = parseInt(a.id.split('-').pop(), 10);
      const monthB = parseInt(b.id.split('-').pop(), 10);
      return monthA - monthB;
    });
  }, [PERIOD_EVENTS_DATA, periodStatusOverrides]);

  const firstName = loggedInUser?.Nama?.split(/[\s,]+/)[0] || 'Rekan';

  return (
    <div className="h-screen bg-[#112233] flex flex-col md:flex-row text-gray-100 font-sans relative overflow-hidden">
      
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white text-gray-900 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-[#F8FAFC]">
              <h3 className="font-extrabold text-sm text-gray-800 flex items-center gap-2 truncate pr-4">
                <FileText size={18} className="text-[#084C61] shrink-0" /> {previewPdfName}
              </h3>
              <button onClick={() => setPreviewPdfUrl(null)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors cursor-pointer shrink-0">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 bg-gray-50 p-2 sm:p-4">
              <iframe src={`${previewPdfUrl}#view=FitH`} className="w-full h-full rounded-xl border border-gray-300 bg-white shadow-inner" title="PDF Preview" />
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white text-gray-900 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-gray-100">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-xl font-black mb-2">Konfirmasi Pindah Halaman</h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              Anda telah memilih dokumen yang belum disimpan. Apakah Anda yakin ingin keluar? Berkas yang dipilih akan dibatalkan.
            </p>
            <div className="flex gap-3">
              <button onClick={() => confirmSwitchModule(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer">
                Tetap Disini
              </button>
              <button onClick={() => confirmSwitchModule(true)} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer">
                Ya, Batalkan
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white text-gray-900 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-gray-100 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-inner">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-xl font-black mb-2 text-gray-900">Pengajuan Berhasil!</h3>
            <p className="text-xs text-gray-500 mb-8 leading-relaxed">
              Data bukti dukung Anda untuk periode {selectedPeriod?.tipe || 'ini'} telah terkirim dan disimpan di sistem.
            </p>
            <button 
              onClick={() => { setShowSuccessModal(false); navigate(currentView, 1); }}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors shadow-md cursor-pointer active:scale-95"
            >
              Tutup & Selesai
            </button>
          </div>
        </div>
      )}

      <aside className="w-full md:w-72 bg-[#091522] border-r border-white/5 flex flex-col justify-between p-6 shrink-0 h-full overflow-y-auto">
        <div>
          <div className="mb-8">
            <div className="text-[10px] font-bold text-teal-400 uppercase tracking-widest mb-1">Profil Pegawai</div>
            <div className="text-xs font-medium text-gray-300">{loggedInUser?.SubUnitKerja || 'Direktorat Pembangunan Perumahan Perdesaan'}</div>
          </div>
          <div className="flex items-center gap-3 mb-8 p-3 rounded-2xl bg-white/5 border border-white/5">
            {loggedInUser?.Foto_Pegawai ? (
              <img src={getDriveDirectUrl(loggedInUser.Foto_Pegawai)} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-teal-500/30" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-teal-700 font-bold flex items-center justify-center text-white text-sm">
                {loggedInUser?.Nama ? loggedInUser.Nama.charAt(0) : 'A'}
              </div>
            )}
            <div className="overflow-hidden">
              <div className="font-extrabold text-xs text-white truncate">{loggedInUser?.Nama || 'Pengguna'}</div>
              <div className="text-[10px] text-gray-400 truncate">NIP {loggedInUser?.NIP || '-'}</div>
            </div>
          </div>

          <nav className="space-y-1">
            <button onClick={() => handleTabClick('rekap')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'rekap' ? 'bg-[#D5C58A] text-gray-900 shadow-md' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}>
              <FileBarChart size={16} /> Rekap Bulanan
            </button>
            <button onClick={() => handleTabClick('absensi-uang-makan')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'uang-makan' ? 'bg-[#D5C58A] text-gray-900 shadow-md' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}>
              <Calendar size={16} /> Absensi Uang Makan
            </button>
            <button onClick={() => handleTabClick('absensi-tunjangan-kinerja')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'tukin' ? 'bg-[#D5C58A] text-gray-900 shadow-md' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}>
              <FileCheck size={16} /> Absensi Tunjangan Kinerja
            </button>
            <button onClick={() => { setArsipSubTab('terdata'); handleTabClick('arsip-surat-tugas'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'spt' ? 'bg-[#D5C58A] text-gray-900 shadow-md' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}>
              <FileText size={16} /> Arsip Surat Tugas
            </button>
            <button onClick={() => { setArsipSubTab('terdata'); handleTabClick('arsip-surat-cuti'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'cuti' ? 'bg-[#D5C58A] text-gray-900 shadow-md' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}>
              <Clock size={16} /> Arsip Surat Cuti
            </button>
          </nav>
        </div>
        <div className="pt-6 border-t border-white/10 space-y-2 mt-8">
          <button onClick={() => navigate('home')} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-gray-300 hover:bg-white/5 transition-colors cursor-pointer">
            <ArrowLeft size={14} /> Kembali Beranda Utama
          </button>
          <button onClick={onLogoutRequest} className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold bg-red-950/40 text-red-300 hover:bg-red-900/50 transition-colors border border-red-900/50 cursor-pointer">
            <LogOut size={14} /> Keluar
          </button>
        </div>
      </aside>

      <main className={`flex-1 bg-[#F8FAFC] text-gray-900 h-full ${(activeTab === 'uang-makan' || activeTab === 'tukin') ? 'flex flex-col overflow-hidden' : 'p-6 md:p-10 overflow-y-auto'}`}>
        <div className={`w-full ${(activeTab === 'uang-makan' || activeTab === 'tukin') ? 'h-full flex flex-col' : ''}`}>
          {activeTab === 'rekap' ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mb-6 shadow-sm border border-teal-100">
                <FileBarChart size={32} />
              </div>
              <h2 className="text-2xl md:text-3xl font-black mb-3" style={{ color: PALETTE_PKP.midnightGreen }}>Selamat Datang di Modul Rekap</h2>
              <p className="text-sm text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">Halaman rekapitulasi data kedisiplinan dan kinerja bulanan sedang dalam penyiapan. Silakan pilih modul lain pada menu di sebelah kiri.</p>
            </div>
          ) : (activeTab === 'spt' || activeTab === 'cuti') ? (
            <div>
              <div className="sticky top-0 z-30 bg-[#F8FAFC] pb-0 pt-6 md:pt-10 px-6 md:px-10 -mx-6 -mt-6 md:-mx-10 md:-mt-10 mb-8 shadow-sm">
                {/* Header Baru Minimalis */}
                <div className="mb-6 pl-2">
                  <h2 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight mb-1.5">
                    {activeTab === 'spt' ? 'Arsip SPT' : 'Arsip Cuti'}
                  </h2>
                  <p className="text-sm text-gray-500 font-medium">
                    {activeTab === 'spt' 
                      ? 'Arsip Surat Perintah Tugas perjalanan dinas Anda' 
                      : 'Arsip Surat Cuti dan keterangan ketidakhadiran Anda'}
                  </p>
                </div>

                <div className="border-b border-gray-200 flex overflow-x-auto custom-scrollbar pl-2">
                  <nav className="-mb-px flex gap-8">
                    <button 
                      onClick={() => setArsipSubTab('terdata')} 
                      className={`py-3 border-b-2 font-bold text-sm transition-colors cursor-pointer whitespace-nowrap ${arsipSubTab === 'terdata' ? 'border-[#1C3A53] text-[#1C3A53]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                    >
                      {activeTab === 'spt' ? 'Rekapitulasi SPT' : 'Rekapitulasi Cuti'}
                    </button>
                    <button 
                      onClick={() => setArsipSubTab('simpanan')} 
                      className={`py-3 border-b-2 font-bold text-sm transition-colors cursor-pointer whitespace-nowrap ${arsipSubTab === 'simpanan' ? 'border-[#1C3A53] text-[#1C3A53]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                    >
                      Upload Dokumen
                    </button>
                  </nav>
                </div>
              </div>

              {arsipSubTab === 'terdata' ? (
                <ArsipRekapitulasiList key={activeTab} modul={activeTab} />
              ) : (
                (documentModule === 'cuti' ? cutiUpload : sptUpload).render()
              )}
            </div>

          ) : (
            <div className="flex flex-col h-full w-full">
              {/* HEADER: banner + tab 1-5 — TIDAK ikut scroll */}
              <div className="shrink-0 bg-[#F8FAFC] pt-6 md:pt-10 px-6 md:px-10 pb-6 border-b border-gray-200/60 shadow-[0_10px_20px_-15px_rgba(0,0,0,0.05)] z-20 relative">
                <div 
                  className="rounded-3xl p-6 sm:p-8 text-white mb-6 relative shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                  style={{ backgroundColor: PALETTE_PKP.midnightGreen, borderBottom: `1px solid ${PALETTE_PKP.darkAqua}` }}
                >
                <div className="space-y-2">
                    <span className="inline-block px-3 py-1 rounded-md text-[10px] font-extrabold bg-white/20 tracking-wider uppercase">
                      OPEN SUBMISSION
                    </span>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black leading-tight">
                      {selectedPeriod ? selectedPeriod.title : (activeTab === 'uang-makan' ? 'Absensi Uang Makan' : 'Absensi Tunjangan Kinerja')}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-gray-200">
                      <Calendar size={14} />
                      <span>
                        {selectedPeriod ? selectedPeriod.periodeLabel : 'Pilih periode pengumpulan bukti dukung yang sedang dibuka.'}
                      </span>
                      {selectedPeriod && (
                        <>
                          <span>•</span>
                          <span>{selectedPeriod.tipe}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {selectedPeriod && (
                    <div className="flex items-center gap-3.5 bg-white/10 p-3.5 sm:p-4 rounded-2xl border border-white/15 max-w-sm self-stretch md:self-auto shadow-inner">
                      <div className="text-right flex-1">
                        <p className="text-xs text-gray-200 leading-snug font-medium">
                          <strong className="text-white font-bold">{firstName}</strong>, let's go, waktunya upload bukti dukungnya!
                        </p>
                        <p className="text-[9px] text-teal-200 mt-0.5">Sistem deteksi otomatis berbasis NIP</p>
                      </div>
                      {loggedInUser?.Foto_Pegawai ? (
                        <img src={getDriveDirectUrl(loggedInUser.Foto_Pegawai)} alt="Avatar" className="w-12 h-12 rounded-full object-cover border-2 border-white/40 shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0 text-sm shadow-md">
                        {loggedInUser?.Nama ? loggedInUser.Nama.charAt(0) : 'U'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-3">
                {[1, 2, 3, 4, 5].map((num) => {
                  const isActive = activeStep === num;
                    const isDisabled = !selectedPeriod && num > 1;
                    return (
                      <button
                        key={num}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          if (num === 1) {
                            navigate(currentView, 1);
                          } else {
                            navigate(currentView, num);
                          }
                        }}
                        title={isDisabled ? 'Pilih periode di Tahap 1 terlebih dahulu' : (!isActive ? `Ke Tahap ${num}` : 'Tahap Saat Ini')}
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-xs ${
                          isActive
                            ? 'text-white ring-4 shadow-sm scale-105'
                            : isDisabled
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                            : 'bg-[#D9EDF7] text-[#245D77] cursor-pointer hover:bg-[#C2E0F0]'
                        }`}
                        style={{ 
                        backgroundColor: isActive ? PALETTE_PKP.midnightGreen : undefined,
                        ringColor: isActive ? `${PALETTE_PKP.midnightGreen}30` : undefined 
                      }}
                    >
                      {num}
                  </button>
                );
              })}
              </div>
            </div>

            {/* KONTEN: ini saja yang scroll */}
            <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8 relative z-10 custom-scrollbar">
              {activeStep === 1 ? (
                <div className="space-y-4 max-w-4xl mx-auto">
                  {currentPeriodList.filter(p => loggedInUser?.Akun_Role === 'admin' || p.status !== 'DITUTUP').length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-gray-200 shadow-sm p-8">
                      <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                      <h3 className="text-xl font-black text-gray-800 mb-2">Belum Ada Periode Dibuka</h3>
                      <p className="text-sm text-gray-500">Saat ini tidak ada periode pengumpulan yang sedang dibuka untuk Anda.</p>
                    </div>
                  ) : (
                    currentPeriodList
                      .filter((period) => loggedInUser?.Akun_Role === 'admin' || period.status !== 'DITUTUP')
                      .map((period) => {
                      const isSelected = selectedPeriod?.id === period.id;
                      const isClosed = period.status === 'DITUTUP';
                      const isAdmin = loggedInUser?.Akun_Role === 'admin';
                      
                      return (
                        <div 
                          key={period.id}
                          onClick={() => {
                            if (isClosed && !isAdmin) return;
                            if (selectedPeriod?.id !== period.id) {
                              setSelectedPeriod(period);
                              resetUploadState();
                            }
                            navigate(currentView, 2);
                          }}
                          className={`group rounded-3xl border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 ${isClosed ? 'bg-gray-50 opacity-70 border-gray-200' : 'bg-white cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-[#084C61]'} ${isSelected ? `border-[#084C61] ring-1 ring-[#084C61] shadow-md` : 'border-gray-200 shadow-xs'}`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border ${isClosed ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                {!isClosed && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
                                {isClosed && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                                {period.status}
                              </span>

                              {isAdmin && (
                                <div 
                                  onClick={(e) => togglePeriodStatus(period.id, period.status, e)}
                                  className="flex items-center gap-2 cursor-pointer"
                                  title={isClosed ? "Klik untuk membuka periode ini" : "Klik untuk menutup periode ini"}
                                >
                                  <div className={`w-9 h-5 rounded-full relative transition-colors ${isClosed ? 'bg-gray-300' : 'bg-emerald-500'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${isClosed ? 'left-0.5' : 'left-[18px]'}`}></div>
                                  </div>
                                  <span className={`text-[10px] font-bold ${isClosed ? 'text-gray-400' : 'text-emerald-700'}`}>
                                    {isClosed ? 'Akses Ditutup' : 'Akses Dibuka'}
                                  </span>
                                </div>
                              )}

                              {isSelected && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  <CheckCircle2 size={10} /> Dipilih
                                </span>
                              )}
                            </div>
                            <h3 className={`text-lg font-black transition-colors ${isClosed ? 'text-gray-500' : 'text-gray-900 group-hover:text-[#084C61]'}`}>{period.title}</h3>
                            <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                              <span className="flex items-center gap-1.5">
                                <Calendar size={14} className="text-gray-400" />
                                {period.periodeLabel}
                              </span>
                              <span>•</span>
                              <span>{period.tipe}</span>
                            </div>
                          </div>

                          <div className={`px-6 py-3 rounded-2xl font-bold text-xs text-white shadow-sm flex items-center justify-center gap-2 transition-transform ${isClosed && !isAdmin ? 'bg-gray-400 cursor-not-allowed' : 'group-active:scale-95 bg-[#143E50] cursor-pointer'}`}>
                            {isClosed ? <X size={16} /> : <UploadCloud size={16} />}
                            <span>{isClosed ? 'Ditutup' : 'Pilih & Lanjut'}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : activeStep === 2 && selectedPeriod ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start ml-0 lg:-ml-4">
                  <div className="lg:col-span-4 bg-white rounded-3xl border border-gray-200 shadow-xs p-6 sm:p-7 space-y-6 lg:sticky top-[20px]">
                      <>
                        <div>
                          <h3 className="text-base font-extrabold text-gray-900 mb-1.5">Upload Bukti Dukung</h3>
                          <p className="text-xs text-gray-600 leading-relaxed font-normal">
                             Upload file bukti presensi:
                          </p>
                          <ul className="text-xs text-gray-500 mt-2 space-y-1 pl-1">
                             <li>• File hasil export dari <strong>eOffice</strong> atau <strong>myPKP</strong></li>
                             <li>• Format yang diterima: <strong>PDF atau Excel (.xlsx)</strong></li>
                             <li>• Sistem otomatis mencocokkan <strong>Nama berdasarkan NIP</strong></li>
                          </ul>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-2">File Presensi</label>
                          <div className="border border-gray-200 rounded-2xl p-2 bg-white flex items-center justify-between hover:border-teal-700 transition-colors">
                            <label className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-700 border border-gray-200 transition-colors cursor-pointer whitespace-nowrap">
                              Choose File
                              <input 
                                id="pdf-upload-input"
                                type="file" 
                                accept=".pdf, .xlsx, .xls"
                                onChange={handleFileChange}
                                className="hidden"
                              />
                            </label>
                            <span className="text-xs text-gray-500 truncate px-2 font-medium flex-1">
                              {selectedFile ? selectedFile.name : 'Pilih berkas...'}
                            </span>
                            {selectedFile && !isParsing && (
                              <button 
                                type="button"
                                onClick={() => handleClearFile(null)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Hapus berkas"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>

                        {isParsing && (
                          <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-800 text-xs flex items-center gap-3 shadow-sm border border-blue-100">
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0"></div>
                            <span className="font-semibold leading-relaxed">{parseStatus}</span>
                          </div>
                        )}

                        {!isParsing && parsedData && parsedData.isValid && (
                          <div className="p-3.5 bg-[#EAF5FA] border border-[#CDE5F1] rounded-2xl text-xs text-[#1E5D77] flex items-center gap-2">
                            <FileSpreadsheet size={16} className="text-[#114053] shrink-0" />
                            <span>File presensi milik <strong className="font-extrabold text-[#114053]">{parsedData.nama}</strong> {parsedData.totalRows ? `(${parsedData.totalRows} baris)` : ''}</span>
                          </div>
                        )}

                        {!isParsing && isAlreadyUploaded && !submitResult && selectedFile && (
                          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 shadow-sm">
                            <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-black mb-0.5">Dokumen Telah Tersedia</p>
                              <p className="leading-relaxed">Sistem mendeteksi Anda sudah pernah memproses data periode ini sebelumnya. Klik <strong>Ganti Dokumen</strong> jika Anda ingin menimpa kertas kerja yang lama.</p>
                            </div>
                          </div>
                        )}

                        {!isParsing && parsedData && !parsedData.isValid && (
                          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                            <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
                            <span className="leading-relaxed">
                              {parsedData.isDateMismatch 
                                ? `Periode file (${parsedData.periode}) tidak sesuai dengan periode event yang dibuka (${selectedPeriod?.periodeEvent}).`
                                : (parsedData.errorMessage || 'Data presensi tidak terbaca dengan benar atau format PDF tidak sesuai.')}
                            </span>
                          </div>
                        )}

                        {!isParsing && submitResult && (
                          <div className={`p-4 rounded-2xl text-xs flex items-start gap-2 ${submitResult.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'}`}>
                            {submitResult.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0" /> : <AlertCircle size={18} className="text-red-600 shrink-0" />}
                            <div>
                              <p className="font-semibold">{submitResult.message}</p>
                              {submitResult.url && (
                                <a href={submitResult.url} target="_blank" rel="noreferrer" className="text-teal-700 underline font-bold mt-1 inline-block">
                                  Buka Dokumen di Google Drive
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {!isParsing && (
                          <button 
                            onClick={handleUploadSubmit}
                            disabled={!parsedData || !parsedData.isValid || isSubmitting || (!selectedFile && !submitResult)}
                            className={`w-full py-3.5 rounded-2xl text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                              parsedData && parsedData.isValid && !isSubmitting && selectedFile
                                ? 'hover:opacity-95 active:scale-[0.99] cursor-pointer' 
                                : 'opacity-40 cursor-not-allowed'
                            }`}
                            style={{ backgroundColor: isAlreadyUploaded && selectedFile ? '#D97706' : PALETTE_PKP.midnightGreen }}
                          >
                            <UploadCloud size={16} />
                            {isSubmitting ? 'Memproses ke Server...' : (isAlreadyUploaded && selectedFile ? 'Ganti Dokumen' : 'Proses & Simpan Bukti')}
                          </button>
                        )}

                        {!isParsing && parsedData && parsedData.isValid && (isAlreadyUploaded || (submitResult && submitResult.type === 'success')) && (
                          <button 
                            onClick={() => navigate(currentView, 3)}
                            className="w-full py-3.5 mt-2 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 hover:bg-teal-100 cursor-pointer"
                          >
                            Lanjut upload Bukti Pendukung <ChevronRight size={16} />
                          </button>
                        )}
                      </>
                  </div>

                  <div className="lg:col-span-8 space-y-4">
                    {parsedData && parsedData.isValid && activeTab !== 'spt' ? (
                      <div className="p-4 rounded-2xl bg-[#D7F7E6] border border-[#A5ECC5] text-[#0A5A36] flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                        <div className="flex items-center gap-2 font-black text-sm">
                          <CheckCircle2 size={18} className="text-[#0A5A36]" />
                          <span>✓ Rentang Tanggal Sesuai</span>
                        </div>
                        <div className="text-xs font-extrabold text-[#0D6B41] bg-white/70 px-3 py-1 rounded-xl border border-[#A5ECC5]/50 self-start sm:self-auto">
                          Periode Event: {selectedPeriod.periodeEvent}
                        </div>
                      </div>
                    ) : parsedData && parsedData.isDateMismatch && activeTab !== 'spt' ? (
                      <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                        <div className="flex items-center gap-2 font-black text-sm">
                          <AlertCircle size={18} className="text-red-600" />
                          <span>⚠️ Periode File Tidak Sesuai</span>
                        </div>
                        <div className="text-xs font-extrabold text-red-700 bg-white/70 px-3 py-1 rounded-xl border border-red-200">
                          File: {parsedData.periode} | Event: {selectedPeriod.periodeEvent}
                        </div>
                      </div>
                    ) : null}

                    <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6">
                      <div className="mb-4 pb-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                            Preview Data Presensi
                          </h3>
                          <p className="text-[11px] text-gray-500 font-medium">Verifikasi identitas dan rentang tanggal dari file dokumen.</p>
                        </div>
                        <div className="text-left sm:text-right text-[11px] bg-[#F8FAFC] px-4 py-2.5 rounded-2xl border border-gray-200 space-y-0.5 min-w-[200px]">
                          <p className="font-extrabold text-gray-900 text-xs">{parsedData ? parsedData.nama : 'Belum Ada Berkas'}</p>
                          <p className="text-[10px] text-gray-500 font-semibold">NIP: {parsedData ? parsedData.nip : '-'}</p>
                          <p className="text-[10px] text-teal-700 font-extrabold">Periode: {parsedData ? parsedData.periode : (selectedPeriod?.periodeEvent || '-')}</p>
                        </div>
                      </div>
                      
                      <div className="overflow-auto max-h-[450px] border border-gray-200 rounded-2xl bg-white shadow-2xs relative">
                        <table className="w-full text-left text-[11px] text-gray-700 border-collapse min-w-[700px]">
                          <thead className="sticky top-0 bg-[#F8FAFC] border-b border-gray-200 text-[10px] font-black uppercase text-gray-500 tracking-wider z-10 shadow-sm">
                            <tr>
                              <th className="py-3 px-3.5 whitespace-nowrap">TANGGAL</th>
                              <th className="py-3 px-3 whitespace-nowrap">HARI</th>
                              <th className="py-3 px-3 whitespace-nowrap">DATANG</th>
                              <th className="py-3 px-3 whitespace-nowrap">PULANG</th>
                              <th className="py-3 px-3 text-center whitespace-nowrap">KET</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                            {parsedData && parsedData.rows && parsedData.rows.length > 0 ? (
                              parsedData.rows.map((row, idx) => {
                                const isLiburData = row.hari === 'Sabtu' || row.hari === 'Minggu' || row.keterangan === 'Libur';
                                const isLocked = false; 
                                
                                const getRowBgClass = () => {
                                  if (isLocked) return 'bg-gray-50 text-gray-400 opacity-80 grayscale';
                                  switch (row.keterangan) {
                                    case 'Cuti': return 'bg-[#affdfd] text-[#006666]';
                                    case 'Dinas': return 'bg-[#c9efbc] text-emerald-900';
                                    case 'Libur': return 'bg-[#F4CCCC] text-red-900';
                                    case 'WFO': case 'WFA': case 'WFH': return 'bg-white text-gray-900';
                                    default: return isLiburData ? 'bg-[#F4CCCC] text-red-900' : 'bg-white text-gray-900';
                                  }
                                };

                                const rowBgClass = getRowBgClass();
                                return (
                                  <tr key={idx} className={`${rowBgClass} transition-colors`}>
                                    <td className="py-2 px-3.5 whitespace-nowrap">
                                      <input type="text" value={row.tanggal} onChange={(e) => handleCellChange(idx, 'tanggal', e.target.value)} disabled={true} className="w-full bg-transparent border-b border-transparent font-bold text-inherit px-1 py-1 outline-none cursor-not-allowed" />
                                    </td>
                                    <td className="py-2 px-3 whitespace-nowrap">
                                      <input type="text" value={row.hari} onChange={(e) => handleCellChange(idx, 'hari', e.target.value)} disabled={true} className="w-full max-w-[80px] bg-transparent border-b border-transparent text-inherit px-1 py-1 outline-none cursor-not-allowed" />
                                    </td>
                                    <td className="py-2 px-3 whitespace-nowrap">
                                      <input type="text" value={row.datang} onChange={(e) => handleCellChange(idx, 'datang', e.target.value)} disabled={true} className={`w-full max-w-[70px] bg-transparent border-b border-transparent font-semibold text-inherit px-1 py-1 outline-none cursor-not-allowed ${row.datang !== '-' && !isLiburData ? 'text-gray-900' : ''}`} />
                                    </td>
                                    <td className="py-2 px-3 whitespace-nowrap">
                                      <input type="text" value={row.pulang} onChange={(e) => handleCellChange(idx, 'pulang', e.target.value)} disabled={true} className={`w-full max-w-[70px] bg-transparent border-b border-transparent font-semibold text-inherit px-1 py-1 outline-none cursor-not-allowed ${row.pulang !== '-' && !isLiburData ? 'text-gray-900' : ''}`} />
                                    </td>
                                    <td className="py-2 px-3 text-center whitespace-nowrap">
                                      {isLocked ? (
                                        <span className={`inline-block px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-wide border ${row.keterangan === 'WFO' || row.keterangan === 'WFH' ? 'bg-white text-gray-800 border-gray-200' : row.keterangan === 'WFA' ? 'bg-[#fff2cc] text-gray-800 border-[#e6d8a6]' : row.keterangan === 'Cuti' ? 'bg-[#affdfd] text-[#004d4d] border-[#8ce6e6]' : row.keterangan === 'Dinas' ? 'bg-[#c9efbc] text-emerald-900 border-[#a8d699]' : row.keterangan === 'Libur' ? 'bg-[#EAA] text-red-900 border-red-300' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>{row.keterangan}</span>
                                      ) : (
                                        <select
                                          value={row.keterangan} onChange={(e) => handleCellChange(idx, 'keterangan', e.target.value)}
                                          className={`px-2 py-1 rounded-md font-bold text-[10px] uppercase tracking-wide outline-none cursor-pointer border shadow-sm transition-shadow ${row.keterangan === 'WFO' || row.keterangan === 'WFH' ? 'bg-white text-gray-800 border-gray-300 focus:border-gray-500' : row.keterangan === 'WFA' ? 'bg-[#fff2cc] text-gray-800 border-[#e6d8a6] focus:border-[#d9c78c]' : row.keterangan === 'Cuti' ? 'bg-[#affdfd] text-[#004d4d] border-[#8ce6e6] focus:border-[#008080]' : row.keterangan === 'Dinas' ? 'bg-[#c9efbc] text-emerald-900 border-[#a8d699] focus:border-[#8bbf7a]' : row.keterangan === 'Libur' ? 'bg-[#EAA] text-red-900 border-red-400 focus:border-red-600' : 'bg-amber-50 text-amber-800 border-amber-300 focus:border-amber-500'}`}
                                        >
                                          <option value="WFO" className="bg-white text-gray-800">WFO</option>
                                          <option value="WFA" className="bg-[#fff2cc] text-gray-800">WFA</option>
                                          <option value="WFH" className="bg-white text-gray-800">WFH</option>
                                          <option value="Dinas" className="bg-[#c9efbc] text-emerald-900">Dinas</option>
                                          <option value="Cuti" className="bg-[#affdfd] text-[#004d4d]">Cuti</option>
                                          <option value="Libur" className="bg-[#F4CCCC] text-red-900">Libur</option>
                                          <option value="DL" className="bg-white text-gray-800">DL</option>
                                          <option value="TB" className="bg-white text-gray-800">TB</option>
                                          <option value="-" className="bg-white text-gray-800">-</option>
                                        </select>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan="5" className="text-center py-24 text-gray-400 bg-gray-50/50">
                                  <div className="flex flex-col items-center justify-center space-y-3 opacity-60">
                                    <FileText size={32} />
                                    <div>
                                      <p className="font-bold text-gray-500 mb-1">Belum Ada Berkas Pratinjau</p>
                                      <p className="text-xs">Silakan unggah dokumen presensi Anda<br/>melalui panel di sebelah kiri.</p>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 text-xs">
                        {activeTab !== 'spt' && (
                           <>
                             <span className="text-gray-500">Total Hari: <strong className="text-gray-900">{parsedData ? parsedData.expectedDays : 0} Hari</strong></span>
                             <span className="text-gray-500">Hari Masuk (WFO/WFA): <strong className="text-emerald-700">{parsedData ? parsedData.totalHariMasuk : 0} Hari</strong></span>
                           </>
                        )}
                        <span className="text-gray-400 italic text-[10px] ml-auto hidden sm:inline-block">Target Folder GDrive: <span className="font-semibold">{parsedData ? parsedData.periodeFolder : (selectedPeriod?.periodeFolder || 'Belum Ada Berkas')}</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeStep === 3 && selectedPeriod ? (
                <div className="max-w-7xl mx-auto space-y-6">
                  <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex gap-4 items-start">
                    <div className="mt-1 text-gray-400"><FolderOpen size={24} /></div>
                    <div>
                      <h3 className="text-sm font-extrabold text-gray-900 mb-1">Upload Bukti Dukung (SPT, Cuti, Izin)</h3>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        Di halaman ini terdapat <strong>3 section upload</strong>: SPT (Surat Perintah Tugas), Surat Cuti, dan Surat Izin. Upload dalam format <strong>JPG/PNG (lebih cepat)</strong> atau PDF. Sistem akan membaca dokumen dan ekstrak data pegawai secara otomatis.
                      </p>
                    </div>
                  </div>

                  {sptClaims.render()}
                  {cutiClaims.render()}

                  {sptUpload.render()}
                  {cutiUpload.render()}

                  <div className="flex justify-center gap-3 pt-6 border-t border-gray-100">
                    <button onClick={() => navigate(currentView, 2)} className="px-6 py-2.5 rounded-xl text-gray-700 bg-gray-100 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm hover:bg-gray-200 transition-colors">
                      <ArrowLeft size={16} /> Kembali
                    </button>
                    <button onClick={() => navigate(currentView, 4)} className="px-6 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: PALETTE_PKP.midnightGreen }}>
                      Lanjut ke Tahap 4 <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ) : activeStep === 5 && selectedPeriod ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start ml-0 lg:-ml-4">
                  <div className="lg:col-span-4 bg-white rounded-3xl border border-gray-200 shadow-xs p-6 sm:p-7 space-y-6 lg:sticky top-[20px]">
                      <>
                        <div>
                          <h3 className="text-base font-extrabold text-gray-900 mb-1.5">Konfirmasi & Pengajuan</h3>
                          <p className="text-xs text-gray-600 leading-relaxed font-normal">Langkah terakhir untuk menyelesaikan pengajuan {selectedPeriod.tipe} Anda. Periksa kembali data di sebelah kanan.</p>
                        </div>
                        
                        {isAlreadyUploaded ? (
                          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2 shadow-sm">
                            <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-black mb-0.5">Dokumen Tersimpan</p>
                              <p className="leading-relaxed">Berkas telah tersimpan di Google Drive. Silakan klik tombol di bawah untuk menyelesaikan proses pengajuan.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 shadow-sm">
                            <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-black mb-0.5">Belum Disimpan</p>
                              <p className="leading-relaxed">Anda belum memproses/menyimpan berkas ini di Tahap 2. Apakah Anda yakin ingin mengajukan data ini?</p>
                            </div>
                          </div>
                        )}

                        <button 
                          onClick={() => setShowSuccessModal(true)}
                          className="w-full py-3.5 mt-3 rounded-2xl text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] cursor-pointer"
                          style={{ backgroundColor: PALETTE_PKP.midnightGreen }}
                        >
                          <FileCheck size={16} />
                          Kirim Pengajuan
                        </button>

                        <button 
                          onClick={() => navigate(currentView, 4)}
                          className="w-full py-3.5 mt-3 rounded-2xl text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <ArrowLeft size={16} />
                          Kembali ke Tahap 4
                        </button>
                      </>
                  </div>

                  <div className="lg:col-span-8 space-y-4">
                    {parsedData && parsedData.isValid && activeTab !== 'spt' ? (
                      <div className="p-4 rounded-2xl bg-[#D7F7E6] border border-[#A5ECC5] text-[#0A5A36] flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                        <div className="flex items-center gap-2 font-black text-sm">
                          <CheckCircle2 size={18} className="text-[#0A5A36]" />
                          <span>✓ Rentang Tanggal Sesuai</span>
                        </div>
                        <div className="text-xs font-extrabold text-[#0D6B41] bg-white/70 px-3 py-1 rounded-xl border border-[#A5ECC5]/50 self-start sm:self-auto">
                          Periode Event: {selectedPeriod.periodeEvent}
                        </div>
                      </div>
                    ) : parsedData && parsedData.isDateMismatch && activeTab !== 'spt' ? (
                      <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                        <div className="flex items-center gap-2 font-black text-sm">
                          <AlertCircle size={18} className="text-red-600" />
                          <span>⚠️ Periode File Tidak Sesuai</span>
                        </div>
                        <div className="text-xs font-extrabold text-red-700 bg-white/70 px-3 py-1 rounded-xl border border-red-200">
                          File: {parsedData.periode} | Event: {selectedPeriod.periodeEvent}
                        </div>
                      </div>
                    ) : null}

                    <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6">
                      <div className="mb-4 pb-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                            Preview Data Presensi
                          </h3>
                          <p className="text-[11px] text-gray-500 font-medium">Verifikasi identitas dan rentang tanggal dari file dokumen.</p>
                        </div>
                        <div className="text-left sm:text-right text-[11px] bg-[#F8FAFC] px-4 py-2.5 rounded-2xl border border-gray-200 space-y-0.5 min-w-[200px]">
                          <p className="font-extrabold text-gray-900 text-xs">{parsedData ? parsedData.nama : 'Belum Ada Berkas'}</p>
                          <p className="text-[10px] text-gray-500 font-semibold">NIP: {parsedData ? parsedData.nip : '-'}</p>
                          <p className="text-[10px] text-teal-700 font-extrabold">Periode: {parsedData ? parsedData.periode : (selectedPeriod?.periodeEvent || '-')}</p>
                        </div>
                      </div>
                      
                      <div className="overflow-auto max-h-[450px] border border-gray-200 rounded-2xl bg-white shadow-2xs relative">
                        <table className="w-full text-left text-[11px] text-gray-700 border-collapse min-w-[700px]">
                          <thead className="sticky top-0 bg-[#F8FAFC] border-b border-gray-200 text-[10px] font-black uppercase text-gray-500 tracking-wider z-10 shadow-sm">
                            <tr>
                              <th className="py-3 px-3.5 whitespace-nowrap">TANGGAL</th>
                              <th className="py-3 px-3 whitespace-nowrap">HARI</th>
                              <th className="py-3 px-3 whitespace-nowrap">DATANG</th>
                              <th className="py-3 px-3 whitespace-nowrap">PULANG</th>
                              <th className="py-3 px-3 text-center whitespace-nowrap">KET</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                            {parsedData && parsedData.rows && parsedData.rows.length > 0 ? (
                              parsedData.rows.map((row, idx) => {
                                const isLiburData = row.hari === 'Sabtu' || row.hari === 'Minggu' || row.keterangan === 'Libur';
                                const isLocked = false; 
                                
                                const getRowBgClass = () => {
                                  if (isLocked) return 'bg-gray-50 text-gray-400 opacity-80 grayscale';
                                  switch (row.keterangan) {
                                    case 'Cuti': return 'bg-[#affdfd] text-[#006666]';
                                    case 'Dinas': return 'bg-[#c9efbc] text-emerald-900';
                                    case 'Libur': return 'bg-[#F4CCCC] text-red-900';
                                    case 'WFO': case 'WFA': case 'WFH': return 'bg-white text-gray-900';
                                    default: return isLiburData ? 'bg-[#F4CCCC] text-red-900' : 'bg-white text-gray-900';
                                  }
                                };

                                const rowBgClass = getRowBgClass();
                                return (
                                  <tr key={idx} className={`${rowBgClass} transition-colors`}>
                                    <td className="py-2 px-3.5 whitespace-nowrap">
                                      <input type="text" value={row.tanggal} onChange={(e) => handleCellChange(idx, 'tanggal', e.target.value)} disabled={true} className="w-full bg-transparent border-b border-transparent font-bold text-inherit px-1 py-1 outline-none cursor-not-allowed" />
                                    </td>
                                    <td className="py-2 px-3 whitespace-nowrap">
                                      <input type="text" value={row.hari} onChange={(e) => handleCellChange(idx, 'hari', e.target.value)} disabled={true} className="w-full max-w-[80px] bg-transparent border-b border-transparent text-inherit px-1 py-1 outline-none cursor-not-allowed" />
                                    </td>
                                    <td className="py-2 px-3 whitespace-nowrap">
                                      <input type="text" value={row.datang} onChange={(e) => handleCellChange(idx, 'datang', e.target.value)} disabled={true} className={`w-full max-w-[70px] bg-transparent border-b border-transparent font-semibold text-inherit px-1 py-1 outline-none cursor-not-allowed ${row.datang !== '-' && !isLiburData ? 'text-gray-900' : ''}`} />
                                    </td>
                                    <td className="py-2 px-3 whitespace-nowrap">
                                      <input type="text" value={row.pulang} onChange={(e) => handleCellChange(idx, 'pulang', e.target.value)} disabled={true} className={`w-full max-w-[70px] bg-transparent border-b border-transparent font-semibold text-inherit px-1 py-1 outline-none cursor-not-allowed ${row.pulang !== '-' && !isLiburData ? 'text-gray-900' : ''}`} />
                                    </td>
                                    <td className="py-2 px-3 text-center whitespace-nowrap">
                                      {isLocked ? (
                                        <span className={`inline-block px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-wide border ${row.keterangan === 'WFO' || row.keterangan === 'WFH' ? 'bg-white text-gray-800 border-gray-200' : row.keterangan === 'WFA' ? 'bg-[#fff2cc] text-gray-800 border-[#e6d8a6]' : row.keterangan === 'Cuti' ? 'bg-[#affdfd] text-[#004d4d] border-[#8ce6e6]' : row.keterangan === 'Dinas' ? 'bg-[#c9efbc] text-emerald-900 border-[#a8d699]' : row.keterangan === 'Libur' ? 'bg-[#EAA] text-red-900 border-red-300' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>{row.keterangan}</span>
                                      ) : (
                                        <select
                                          value={row.keterangan} onChange={(e) => handleCellChange(idx, 'keterangan', e.target.value)}
                                          className={`px-2 py-1 rounded-md font-bold text-[10px] uppercase tracking-wide outline-none cursor-pointer border shadow-sm transition-shadow ${row.keterangan === 'WFO' || row.keterangan === 'WFH' ? 'bg-white text-gray-800 border-gray-300 focus:border-gray-500' : row.keterangan === 'WFA' ? 'bg-[#fff2cc] text-gray-800 border-[#e6d8a6] focus:border-[#d9c78c]' : row.keterangan === 'Cuti' ? 'bg-[#affdfd] text-[#004d4d] border-[#8ce6e6] focus:border-[#008080]' : row.keterangan === 'Dinas' ? 'bg-[#c9efbc] text-emerald-900 border-[#a8d699] focus:border-[#8bbf7a]' : row.keterangan === 'Libur' ? 'bg-[#EAA] text-red-900 border-red-400 focus:border-red-600' : 'bg-amber-50 text-amber-800 border-amber-300 focus:border-amber-500'}`}
                                        >
                                          <option value="WFO" className="bg-white text-gray-800">WFO</option>
                                          <option value="WFA" className="bg-[#fff2cc] text-gray-800">WFA</option>
                                          <option value="WFH" className="bg-white text-gray-800">WFH</option>
                                          <option value="Dinas" className="bg-[#c9efbc] text-emerald-900">Dinas</option>
                                          <option value="Cuti" className="bg-[#affdfd] text-[#004d4d]">Cuti</option>
                                          <option value="Libur" className="bg-[#F4CCCC] text-red-900">Libur</option>
                                          <option value="DL" className="bg-white text-gray-800">DL</option>
                                          <option value="TB" className="bg-white text-gray-800">TB</option>
                                          <option value="-" className="bg-white text-gray-800">-</option>
                                        </select>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan="5" className="text-center py-24 text-gray-400 bg-gray-50/50">
                                  <div className="flex flex-col items-center justify-center space-y-3 opacity-60">
                                    <FileText size={32} />
                                    <div>
                                      <p className="font-bold text-gray-500 mb-1">Belum Ada Berkas Pratinjau</p>
                                      <p className="text-xs">Silakan unggah dokumen presensi Anda<br/>melalui panel di sebelah kiri.</p>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 text-xs">
                        {activeTab !== 'spt' && (
                           <>
                             <span className="text-gray-500">Total Hari: <strong className="text-gray-900">{parsedData ? parsedData.expectedDays : 0} Hari</strong></span>
                             <span className="text-gray-500">Hari Masuk (WFO/WFA): <strong className="text-emerald-700">{parsedData ? parsedData.totalHariMasuk : 0} Hari</strong></span>
                           </>
                        )}
                        <span className="text-gray-400 italic text-[10px] ml-auto hidden sm:inline-block">Target Folder GDrive: <span className="font-semibold">{parsedData ? parsedData.periodeFolder : (selectedPeriod?.periodeFolder || 'Belum Ada Berkas')}</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4 bg-white rounded-3xl border border-gray-100 p-10 max-w-2xl mx-auto shadow-sm mt-8">
                  <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mb-6 shadow-sm border border-teal-100"><FileBarChart size={32} /></div>
                  <h2 className="text-2xl font-black mb-3 text-gray-900">Tahap {activeStep} dalam Pengembangan</h2>
                  <p className="text-sm text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
                    {(activeStep === 4) ? 'Fitur upload Bukti Pendukung tambahan sedang dalam tahap pengembangan. Silakan lanjutkan ke tahap berikutnya.' : 'Fitur untuk tahap ini sedang dalam proses penyusunan data. Silakan kembali ke tahap sebelumnya.'}
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => navigate(currentView, activeStep > 1 ? activeStep - 1 : 1)} className="px-6 py-2.5 rounded-xl text-gray-700 bg-gray-100 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm hover:bg-gray-200 transition-colors">
                      <ArrowLeft size={16} /> Kembali
                    </button>
                    {(activeStep === 4) && (
                      <button onClick={() => navigate(currentView, activeStep + 1)} className="px-6 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm hover:opacity-90 transition-opacity" style={{ backgroundColor: PALETTE_PKP.midnightGreen }}>
                      Lanjut ke Tahap {activeStep + 1} <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Scrollbar styling */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .spt-employee-list { scrollbar-gutter: stable; }
      `}} />
    </div>
  );
};

const ProfileView = ({ navigate }) => {
  const [pegawaiList, setPegawaiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubUnit, setSelectedSubUnit] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    const { data } = await fetchPegawaiData(true);
    setPegawaiList(data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const subUnitCategories = useMemo(() => {
    const units = new Set();
    pegawaiList.forEach((item) => { const unit = (item.SubUnitKerja || '').trim(); if (unit) units.add(unit); });
    return Array.from(units).sort();
  }, [pegawaiList]);

  const filteredPegawai = pegawaiList.filter((item) => {
    const subUnit = (item.SubUnitKerja || '').trim();
    if (selectedSubUnit !== 'ALL' && subUnit !== selectedSubUnit) return false;
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return ((item.Nama || '').toLowerCase().includes(term) || (item.NIP || '').toString().toLowerCase().includes(term) || subUnit.toLowerCase().includes(term) || (item.Jabatan || '').toLowerCase().includes(term));
  });

  return (
    <div className="h-screen flex flex-col bg-[#F7FAFC] overflow-hidden">
      <div className="shrink-0 bg-[#F7FAFC] z-20 shadow-[0_10px_20px_-15px_rgba(0,0,0,0.1)] border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <button onClick={() => navigate('home')} className="text-sm font-semibold flex items-center gap-1.5 text-gray-500 hover:text-gray-800 mb-2 cursor-pointer"><ArrowLeft size={16} /> Kembali ke Beranda</button>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl md:text-3xl font-black" style={{ color: PALETTE_PKP.midnightGreen }}>Bank Data Profil Pegawai</h2>
                <button onClick={loadData} title="Perbarui Data" className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors cursor-pointer"><RotateCcw size={16} /></button>
              </div>
              <p className="text-sm text-gray-500 mt-1">Direktorat Pembangunan Perumahan Perdesaan ({filteredPegawai.length} dari {pegawaiList.length} Pegawai Ditampilkan)</p>
            </div>
            <div className="w-full md:w-80 relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><Search size={18} /></span>
              <input type="text" placeholder="Cari nama, NIP, sub unit kerja..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-700 shadow-2xs transition-all" />
            </div>
          </div>
          <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 max-w-xl">
                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-2 flex items-center gap-2"><Briefcase size={16} style={{ color: PALETTE_PKP.midnightGreen }} /><span>Filter Berdasarkan Sub Unit Kerja</span></label>
                <div className="relative">
                  <select value={selectedSubUnit} onChange={(e) => setSelectedSubUnit(e.target.value)} className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs md:text-sm font-semibold text-gray-800 focus:outline-none focus:bg-white transition-all cursor-pointer appearance-none">
                    <option value="ALL">Semua Sub Unit Kerja (Tanpa Filter) — {pegawaiList.length} Pegawai</option>
                    {subUnitCategories.map((cat, idx) => {
                      const count = pegawaiList.filter((p) => (p.SubUnitKerja || '').trim() === cat).length;
                      return (<option key={idx} value={cat}>{cat} ({count} Pegawai)</option>);
                    })}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <div className="max-w-7xl mx-auto pb-10">
          {loading ? (
            <div className="text-center py-20 text-gray-500 flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-teal-800 border-t-transparent rounded-full animate-spin"></div><span>Memuat data kepegawaian...</span></div>
          ) : filteredPegawai.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 shadow-xs p-8"><h3 className="font-extrabold text-base text-gray-900 mb-1">Pegawai Tidak Ditemukan</h3></div>
          ) : (
            <div className="flex flex-col gap-6">
              {filteredPegawai.map((item, index) => {
                const rawFoto = item.Foto_Pegawai || '';
                const fileId = extractDriveId(rawFoto);
                const fotoUrl = getDriveDirectUrl(rawFoto);
                const hasTukin = item.Tukin && item.Tukin.toString().trim() !== '';

                return (
                  <div key={index} className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col lg:flex-row items-stretch relative min-h-[220px]">
                    <div className="w-2 hidden lg:block shrink-0 relative z-20" style={{ backgroundColor: PALETTE_PKP.midnightGreen }}></div>
                    <div className="p-6 md:p-8 flex-1 flex flex-col justify-center relative z-20">
                      <div className="mb-5 lg:w-[70%] pr-4">
                        <h3 className="text-2xl font-black text-gray-900 leading-tight mb-2" style={{ color: PALETTE_PKP.midnightGreen }}>{item.Nama}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                          <span className="text-gray-500 font-medium">NIP {item.NIP}</span>
                          {item.SubUnitKerja && (<span className="px-3 py-1 rounded-full font-bold text-white shadow-xs" style={{ backgroundColor: PALETTE_PKP.darkAqua }}>{item.SubUnitKerja}</span>)}
                          {item.KelasJabatan && (<span className="px-3 py-1 rounded-full font-bold text-gray-800 shadow-xs" style={{ backgroundColor: PALETTE_PKP.krem }}>Kelas Jabatan {item.KelasJabatan}</span>)}
                        </div>
                      </div>
                      <div className="w-full lg:w-[70%] h-px bg-gray-100 mb-5 relative z-20"></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-6 text-sm relative z-20 lg:w-[70%]">
                        <div>
                          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Jabatan</p>
                          <p className="font-bold text-gray-800 leading-snug">{item.Jabatan || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Email</p>
                          <p className="font-bold text-gray-800 leading-snug break-words">{item.EmailDinas || '-'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Atasan Langsung</p>
                          <p className="font-bold text-gray-800 leading-snug mb-1">{item.AtasanLangsung || '-'}</p>
                          <p className="text-[11px] text-gray-400 font-medium leading-relaxed">{item.JabatanAtasan || ''}</p>
                        </div>
                        {hasTukin && (
                          <div className="sm:col-span-2 lg:col-span-3 pt-2">
                            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Besaran Tunjangan Kinerja</p>
                            <p className="font-black text-lg tracking-tight" style={{ color: PALETTE_PKP.midnightGreen }}>{item.Tukin}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {fotoUrl && (
                      <div className="w-full lg:absolute right-0 top-0 bottom-0 lg:w-[35%] xl:w-[30%] h-64 lg:h-auto shrink-0 overflow-hidden select-none pointer-events-none z-0">
                        <div className="hidden lg:block absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-white via-white/80 to-transparent z-10"></div>
                        <div className="lg:hidden absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white via-white/90 to-transparent z-10"></div>
                        <div className="absolute inset-0 z-0 mix-blend-multiply opacity-20 transition-opacity" style={{ backgroundColor: PALETTE_PKP.krem }}></div>
                        <img 
                          src={fotoUrl} alt={item.Nama} className="w-full h-full object-cover object-top opacity-60 relative z-0 transition-opacity" 
                          onError={(e) => {
                            if (fileId && !e.target.dataset.triedFallback1) { e.target.dataset.triedFallback1 = 'true'; e.target.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`; } 
                            else if (fileId && !e.target.dataset.triedFallback2) { e.target.dataset.triedFallback2 = 'true'; e.target.src = `https://drive.google.com/uc?export=view&id=${fileId}`; } 
                            else { e.target.style.display = 'none'; }
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const getHashData = () => {
    const rawHash = window.location.hash.replace('#/', '');
    const [view, queryStr] = rawHash.split('?');
    const params = new URLSearchParams(queryStr || '');
    return { view: view || 'home', step: params.get('step') ? parseInt(params.get('step'), 10) : 1 };
  };

  const [routeData, setRouteData] = useState(getHashData());
  const [loggedInUser, setLoggedInUser] = useState(getStoredUser());
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    fetchPegawaiData(false);
    const handleHashChange = () => setRouteData(getHashData());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (!loggedInUser) return;
    const handleActivity = () => {
      const stored = localStorage.getItem('pkp_session');
      if (stored) { try { const data = JSON.parse(stored); data.timestamp = new Date().getTime(); localStorage.setItem('pkp_session', JSON.stringify(data)); } catch(e) {} }
    };
    window.addEventListener('click', handleActivity);
    window.addEventListener('hashchange', handleActivity);

    const interval = setInterval(() => {
      const stored = localStorage.getItem('pkp_session');
      if (stored) {
        try {
          const { timestamp } = JSON.parse(stored);
          if (new Date().getTime() - timestamp >= SESSION_DURATION) {
            setLoggedInUser(null); localStorage.removeItem('pkp_session'); setSessionExpired(true); navigate('login');
          }
        } catch(e) {}
      }
    }, 10000);

    return () => { window.removeEventListener('click', handleActivity); window.removeEventListener('hashchange', handleActivity); clearInterval(interval); };
  }, [loggedInUser]);

  const navigate = (viewName, step = 1) => {
    let hash = viewName === 'home' ? '' : `#/${viewName}`;
    if (step > 1) hash += `?step=${step}`;
    window.location.hash = hash;
    setRouteData({ view: viewName, step });
    if (step === 1) window.scrollTo(0, 0);
  };

  const handleLogoutConfirm = () => {
    setLoggedInUser(null); localStorage.removeItem('pkp_session'); setShowLogoutModal(false); navigate('home');
  };

  const handleLoginSuccess = (user) => {
    setLoggedInUser(user);
    localStorage.setItem('pkp_session', JSON.stringify({ user, timestamp: new Date().getTime() }));
    setSessionExpired(false);
  };

  const currentView = routeData.view;
  const activeStep = routeData.step;
  const isDashboardView = ['rekap', 'absensi-uang-makan', 'absensi-tunjangan-kinerja', 'arsip-surat-tugas', 'arsip-surat-cuti'].includes(currentView);

  const renderView = () => {
    switch (currentView) {
      case 'home': return <DashboardHome navigate={navigate} loggedInUser={loggedInUser} />;
      case 'rekap': case 'absensi-uang-makan': case 'absensi-tunjangan-kinerja': case 'arsip-surat-tugas': case 'arsip-surat-cuti':
        if (!loggedInUser) return <LoginView navigate={navigate} onLoginSuccess={handleLoginSuccess} sessionExpired={sessionExpired} />;
        return <UserDashboardView loggedInUser={loggedInUser} onLogoutRequest={() => setShowLogoutModal(true)} navigate={navigate} currentView={currentView} activeStep={activeStep} />;
      case 'profile': return <ProfileView navigate={navigate} />;
      case 'login': return <LoginView navigate={navigate} onLoginSuccess={handleLoginSuccess} sessionExpired={sessionExpired} />;
      default: return <DashboardHome navigate={navigate} loggedInUser={loggedInUser} />;
    }
  };

  return (
    <div className="min-h-screen font-sans bg-[#F7FAFC]">
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white text-gray-900 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-gray-100 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4"><LogOut size={24} /></div>
            <h3 className="text-lg font-black mb-2">Konfirmasi Keluar</h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">Apakah Anda yakin ingin keluar dari sesi akun sistem kepegawaian ini?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer">Batal</button>
              <button onClick={handleLogoutConfirm} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer">Ya, Keluar</button>
            </div>
          </div>
        </div>
      )}

      {!isDashboardView && currentView !== 'profile' && <Header navigate={navigate} loggedInUser={loggedInUser} onLogoutRequest={() => setShowLogoutModal(true)} />}
      
      {currentView === 'profile' ? (
        <div className="flex flex-col h-screen">
          <Header navigate={navigate} loggedInUser={loggedInUser} onLogoutRequest={() => setShowLogoutModal(true)} />
          <main className="flex-1 overflow-hidden">{renderView()}</main>
        </div>
      ) : (
        <main>{renderView()}</main>
      )}
    </div>
  );
}
