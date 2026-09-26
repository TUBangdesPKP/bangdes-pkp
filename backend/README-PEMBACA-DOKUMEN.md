# Pembaca Cuti, jam presensi, dan penghentian REKAP_HARIAN

## Perubahan

- Cuti: baca seluruh bagian **IV. LAMANYA CUTI**, hingga bagian Catatan Cuti. Tanggal kepala surat tidak menjadi cadangan tanggal cuti. Contoh surat bertanggal 21 Agustus dengan Bab IV `Selama 2 hari, 3 September 2026 s/d 4 September 2026` harus menghasilkan **2 hari, 3–4 September 2026**.
- Pembaca menerima `s/d`, `s.d`, `s.d.`, tanggal tunggal, tanggal sama yang diulang, serta tahun yang hanya dicantumkan pada tanggal akhir (`26 Agustus s/d 27 Agustus 2026`). Hilangnya kata Selama/huruf akhir CUTI dan garis tabel yang terbaca sebagai karakter tidak langsung menggagalkan dokumen.
- Bila OCR satu halaman melewatkan isi tabel, pembaca mengulangi hanya baris di bawah Lamanya Cuti atau baris Mulai Tanggal, kemudian sel jumlah hari bila diperlukan. Foto kecil diperbesar sebelum OCR. Posisi diambil dari dokumen, bukan koordinat tetap atau nama file.
- Jika tanggal terbaca tetapi jumlah belum jelas, preview tetap muncul dengan peringatan dan pegawai belum dapat dipilih sampai **Ubah Data → Hari cuti** diperiksa/disimpan. Bila tidak ada tanggal pada bagian cuti, gunakan Upload Manual Cuti. Akhir cuti tidak ditebak dari jumlah hari kalender.
- Preview menampilkan jumlah hari dari Bab IV, terpisah dari jumlah hari kalender kerja. Jumlah pada surat dapat dikoreksi melalui **Ubah Data → Hari cuti**; jumlah ini dikirim ke backend. Validasi hari libur dan kecocokan jumlah saat klaim tetap berlaku.
- Excel presensi: tanggal dari C, datang dari D, pulang dari E. Sel kosong atau `-` menjadi `-`, bukan mengambil jam kolom sebelah. Satu digit jam seperti `7:06` dinormalisasi menjadi `07:06`. Perubahan ini tidak mengubah pembaca presensi PDF menjadi pembaca kolom Excel.
- Backend tidak lagi membuat, membaca, atau menulis `REKAP_HARIAN`. Rekap Bulanan internal/publik membaca spreadsheet final per pegawai sesuai bulan/modul, termasuk jam kerja dan adjustment yang tersimpan. Ringkasan di `REKAP_UANG_MAKAN`, `REKAP_TUKIN`, serta audit `ADJUSTMENT_PRESENSI` tetap dipertahankan.
- Sheet `REKAP_HARIAN` yang sudah ada tidak dihapus otomatis. Sesudah mencadangkan dan menguji versi baru, sheet lama boleh dihapus manual. Jangan hapus snapshot `_PRESENSI_TAB2` di spreadsheet pegawai atau `ADJUSTMENT_PRESENSI`.

## Memasang

1. Cadangkan kode Apps Script dan spreadsheet Kepegawaian.
2. Ganti **seluruh** kode Apps Script dengan `D:\bangdes-pkp\backend\Code.gs` terbaru. Simpan, lalu **Deploy → Manage deployments → pensil/Edit → New version → Deploy** pada deployment yang sama.
3. Cek web app `/exec?action=health`: `backendVersion` harus `2026-09-25-recap-source`.
4. Deploy frontend dari `D:\bangdes-pkp` melalui Git/Railway. Sertakan `src/App.jsx`, `src/document-parsers.js`, **dan file baru `src/cuti-ocr.js`**. Perbaikan lanjutan OCR ini hanya mengubah frontend; tidak perlu deploy ulang Apps Script bila backend versi di atas sudah terpasang.
5. Setelah deployment selesai, muat ulang browser, baca kembali file contoh, lalu periksa preview sebelum menyimpan.

Data yang sudah salah tersimpan tidak dibetulkan massal. Untuk presensi, gunakan **Ganti Dokumen** di tab 2, periksa D/E, lalu proses ulang tab 3–5. Untuk Cuti, perbaiki tanggal/jumlah pada arsip yang salah atau unggah hasil yang benar; jangan mengklaim kedua versi. Jika klaim lama sudah dipakai, hapus klaim lama melalui aplikasi lalu klaim versi yang benar dan proses ulang hasilnya.

## Pengujian

```powershell
cd D:\bangdes-pkp
node --test backend/attachments.test.mjs tests/document-parsers.test.mjs tests/existing-status.test.mjs tests/process-recovery.test.mjs
npm run build
```

Perbaikan lanjutan diuji dengan Tesseract.js 5 pada empat PDF (dirender 144 dpi) dan satu foto contoh secara lokal: Sahri 26–27 Agustus 2026 (tertulis 1 hari), Ayu 3–4 September (2 hari), Fahmy 21 Agustus (1 hari), Ghina 24 Agustus (1 hari), Decha 21–26 Agustus (3 hari). Surat Sahri memang memuat jumlah hari yang berbeda dari rentang; peringatan perbandingan kalender tetap muncul, bukan diubah diam-diam. Tes regresi memakai cuplikan bagian cuti dari hasil OCR tersebut tanpa identitas pegawai, termasuk pengulangan baca baris/sel jumlah hari. Tetap periksa preview sebelum menyimpan. Tidak ada upload/deploy atau perubahan data produksi otomatis.
