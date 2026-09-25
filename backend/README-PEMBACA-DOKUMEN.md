# Pembaca Cuti, jam presensi, dan penghentian REKAP_HARIAN

## Perubahan

- Cuti: baca seluruh bagian **IV. LAMANYA CUTI**, hingga bagian Catatan Cuti. Tanggal kepala surat tidak menjadi cadangan tanggal cuti. Contoh surat bertanggal 21 Agustus dengan Bab IV `Selama 2 hari, 3 September 2026 s/d 4 September 2026` harus menghasilkan **2 hari, 3–4 September 2026**.
- OCR yang tidak menghasilkan jumlah/rentang lengkap meminta Upload Manual Cuti. Akhir cuti tidak ditebak dengan menambahkan jumlah hari kalender.
- Preview menampilkan jumlah hari dari Bab IV, terpisah dari jumlah hari kalender kerja. Jumlah pada surat dapat dikoreksi melalui **Ubah Data → Hari cuti**; jumlah ini dikirim ke backend. Validasi hari libur dan kecocokan jumlah saat klaim tetap berlaku.
- Excel presensi: tanggal dari C, datang dari D, pulang dari E. Sel kosong atau `-` menjadi `-`, bukan mengambil jam kolom sebelah. Satu digit jam seperti `7:06` dinormalisasi menjadi `07:06`. Perubahan ini tidak mengubah pembaca presensi PDF menjadi pembaca kolom Excel.
- Backend tidak lagi membuat, membaca, atau menulis `REKAP_HARIAN`. Rekap Bulanan internal/publik membaca spreadsheet final per pegawai sesuai bulan/modul, termasuk jam kerja dan adjustment yang tersimpan. Ringkasan di `REKAP_UANG_MAKAN`, `REKAP_TUKIN`, serta audit `ADJUSTMENT_PRESENSI` tetap dipertahankan.
- Sheet `REKAP_HARIAN` yang sudah ada tidak dihapus otomatis. Sesudah mencadangkan dan menguji versi baru, sheet lama boleh dihapus manual. Jangan hapus snapshot `_PRESENSI_TAB2` di spreadsheet pegawai atau `ADJUSTMENT_PRESENSI`.

## Memasang

1. Cadangkan kode Apps Script dan spreadsheet Kepegawaian.
2. Ganti **seluruh** kode Apps Script dengan `D:\bangdes-pkp\backend\Code.gs` terbaru. Simpan, lalu **Deploy → Manage deployments → pensil/Edit → New version → Deploy** pada deployment yang sama.
3. Cek web app `/exec?action=health`: `backendVersion` harus `2026-09-25-recap-source`.
4. Deploy frontend dari `D:\bangdes-pkp` melalui Git/Railway. Sertakan `src/App.jsx` **dan file baru `src/document-parsers.js`**. Menyalin Code.gs saja belum memperbaiki pembaca file di browser.
5. Setelah deployment selesai, muat ulang browser, baca kembali file contoh, lalu periksa preview sebelum menyimpan.

Data yang sudah salah tersimpan tidak dibetulkan massal. Untuk presensi, gunakan **Ganti Dokumen** di tab 2, periksa D/E, lalu proses ulang tab 3–5. Untuk Cuti, perbaiki tanggal/jumlah pada arsip yang salah atau unggah hasil yang benar; jangan mengklaim kedua versi. Jika klaim lama sudah dipakai, hapus klaim lama melalui aplikasi lalu klaim versi yang benar dan proses ulang hasilnya.

## Pengujian

```powershell
cd D:\bangdes-pkp
node --test backend/attachments.test.mjs tests/document-parsers.test.mjs tests/existing-status.test.mjs tests/process-recovery.test.mjs
npm run build
```

Tes parser memakai teks OCR simulasi, termasuk Bab IV yang terpecah lebih dari empat baris; kualitas OCR scan asli masih perlu diperiksa pada preview browser. Pengujian file Excel contoh secara lokal dilakukan tanpa mengubah file sumber. Tidak ada upload/deploy atau perubahan data produksi otomatis.
