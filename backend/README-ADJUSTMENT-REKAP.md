# Dokumen tambahan, adjustment, dan Rekap Bulanan

Versi backend: `2026-09-25-recap-source`. Pembaruan pembaca dokumen dan penghentian rekap harian: lihat `README-PEMBACA-DOKUMEN.md`.

## Memasang pembaruan

1. Cadangkan project Apps Script dan spreadsheet Kepegawaian.
2. Buka `D:\bangdes-pkp\backend\Code.gs`, salin seluruh isinya. Di editor Apps Script, ganti seluruh kode backend lama, bukan menambahkannya di bawah kode lama. Simpan.
3. Klik **Deploy → Manage deployments → pensil/Edit → Version: New version → Deploy**. Gunakan deployment web app yang sama agar URL `/exec` tidak berubah. Menekan Simpan di editor saja belum memperbarui web app.
4. Periksa URL web app dengan menambahkan `?action=health`. Nilai `backendVersion` harus `2026-09-25-recap-source`.
5. Deploy frontend dari proyek `D:\bangdes-pkp` melalui alur Git/Railway yang biasa digunakan. Sertakan file baru `src/extra-documents.jsx` dan `src/monthly-recap.jsx`, serta perubahan `src/App.jsx`, `src/final-recap.jsx`, dan `src/submission-documents.jsx`.
6. Setelah deployment frontend berhasil, muat ulang browser. Uji satu pegawai terlebih dahulu sebelum digunakan untuk semua pegawai.

Perubahan ini belum dipasang otomatis ke produksi. Tidak perlu membuat sheet baru secara manual.

## Cara menggunakan

1. Simpan hasil presensi pada tab 2 seperti biasa.
2. Tab 3: gunakan **Dokumen Pendukung Lainnya**, pilih Surat Lupa Absen / Surat Tugas Belajar / Dokumen Lainnya, pilih PDF/JPG/PNG maksimal 10 MB, lalu **Upload Dokumen**. Dokumen masuk ke folder pegawai/periode dan daftar bukti bersama. Klik judul Upload SPT/Cuti untuk membuka atau melipat bagian tersebut.
3. Klik **Lanjut Proses**. Pada tab 4, untuk presensi kosong di hari WFO/WFA/WFH, centang **Koreksi datang** atau **Koreksi pulang**, pilih surat, lalu isi jam sebenarnya sesuai bukti. Satu surat boleh digunakan untuk beberapa tanggal.
4. Jika kedua presensi kosong, pilih salah satu saja. Hari tersebut dihitung masuk kerja dan mendapat uang makan setelah satu jam dikoreksi; absen yang tetap kosong tetap dikenai 1,25% dan 240 menit. Jam koreksi bukan otomatis bebas TL/PSW: aturan jam kerja tetap dihitung berdasarkan jam yang diisi.
5. Kuota adalah **4 kejadian per NIP per bulan kalender**, bersama antara Uang Makan dan Tukin. Kejadian yang sama (NIP + tanggal + datang/pulang) tidak menggunakan kuota dua kali. Jam koreksi kejadian yang sama di dua modul harus sama. Tukin dua bulan bisa 8, tetapi masing-masing bulan tetap maksimal 4, termasuk koreksi pada periode lain. Batas ini bukan jumlah file surat. Sistem tidak menyinkronkan otomatis nominal yang telah dihitung di modul lain; konfirmasi ulang submisi tersebut bila koreksinya berubah.
6. Surat Tugas Belajar hanya bukti. Tetapkan TB pada preview tab 2 seperti sebelumnya; tidak ada klaim TB otomatis.
7. Periksa preview, centang konfirmasi, lalu lanjutkan perhitungan. Tab 5 menampilkan jumlah lupa absen, adjustment, dan tidak absen. Jumlah lupa absen dihitung per presensi kosong asli (datang/pulang), sehingga dapat melebihi kuota adjustment. Menghapus surat membatalkan status hasil perhitungan submisi; proses dan konfirmasi ulang untuk memperbarui koreksi.

## Data yang disimpan otomatis

- `DOKUMEN_PENDUKUNG`: file tambahan menggunakan jenis `lupa_absen`, `tugas_belajar`, atau `lainnya`. Tidak mengubah kolom O+ yang dipakai tanggal SPT/Cuti.
- `ADJUSTMENT_PRESENSI`: NIP, modul, periode, tanggal, datang/pulang, jam koreksi, FileId surat, status, dan waktu pembaruan. Digunakan untuk validasi kuota lintas modul. Jangan menghapus barisnya untuk mengubah kuota; batalkan koreksi lewat tab 4 lalu simpan.
- `REKAP_HARIAN`: tidak lagi dibuat, dibaca, atau ditulis. Data lama tidak dihapus otomatis. Dashboard membaca spreadsheet hasil final per pegawai pada bulan kalender terpilih dari `REKAP_UANG_MAKAN` saja.
- `REKAP_UANG_MAKAN` / `REKAP_TUKIN`: kolom tambahan `Hitung_Lupa_Absen`, `Hitung_Adjustment`, `Hitung_Tidak_Absen`, dan `Hitung_Adjustment_Bulanan`. Kolom lama tidak dipindah.
- Spreadsheet per pegawai: jam hasil koreksi ditulis pada D/E. Snapshot tab 2 tetap menyimpan jam asli; data koreksi disimpan terpisah pada sheet internal. Catatan perhitungan TXT mencatat tanggal, jam koreksi, dan ID surat.

## Rekap Bulanan

Ketentuan terbaru ada di `README-WRAP-BULANAN.md`. Admin memilih bulan/tahun dan SubUnit Kerja; publik melihat bulan terbaru. Sumber hanya `REKAP_UANG_MAKAN` untuk rentang penuh 1–akhir bulan. Filter SubUnit mengikuti `Data_Pegawai`. Dashboard menampilkan hasil yang sudah dikonfirmasi di tab 4 (`Hitung_Status` Lengkap / Perlu penyesuaian), bukan seluruh pegawai yang belum mengirim data. Tidak diperlukan migrasi dari `REKAP_HARIAN`; spreadsheet per pegawai dan snapshot internalnya harus tetap tersedia.

- Bulan berdasarkan periode kalender lengkap, bukan bulan pembayaran Tukin. Angka hanya memakai tanggal yang benar-benar tercatat pada bulan tersebut.
- Sumber Tukin/periode parsial tidak disertakan; baris terbaru untuk NIP/bulan yang sama menggantikan baris lama.
- Tingkat masuk = hari WFO/WFA/WFH yang hadir ÷ seluruh hari kerja tercatat. Dinas/Cuti/TB tidak masuk pembilang ini; bukan ukuran menyeluruh kepatuhan pegawai.
- Perjalanan dihitung per pasangan pegawai/surat tugas; satu surat untuk beberapa pegawai berarti beberapa perjalanan pegawai. Total hari dinas adalah hari-orang, bukan jumlah surat.
- Bukti tambahan berkaitan dengan periode submisi satu bulan kalender, berdasarkan registrasi aktif.
- Ranking bersifat ringkasan mekanis, bukan keputusan kepegawaian. Ranking memakai persentase masuk/hari kerja, hari flexi paling sedikit, lalu menit flexi paling sedikit; hanya tanggal lengkap satu bulan yang diperingkat. Ranking tepat waktu memakai kedatangan tanpa flexi.
- Perubahan klaim melalui aplikasi membuat rekap menunggu konfirmasi ulang dan sementara tidak ditampilkan. Sumber/berkas yang hilang dilaporkan sebagai belum terbaca tanpa menggagalkan pegawai lainnya atau dianggap nol hadir. Hanya file pada bulan terpilih yang dibaca.

## Pengujian lokal

```powershell
cd D:\bangdes-pkp
node --test backend/attachments.test.mjs tests/existing-status.test.mjs tests/process-recovery.test.mjs
npm run build
```

Simulasi UI: `tests/final-ui.html`, `tests/monthly-ui.html`, dan `tests/submission-flow.html` melalui server Vite. Seluruh permintaan backend pada fixture tersebut dimock; tidak mengubah Drive produksi.
