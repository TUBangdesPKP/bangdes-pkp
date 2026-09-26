# Rekap Kinerja & Kedisiplinan — satu bulan kalender

## Perubahan

- Halaman mengikuti bagian Ringkasan, Kehadiran, Per Unit, Juara, Catatan, dan Dinas dari contoh wrap. Tidak ada lembur.
- Admin / super admin dapat memilih bulan dan tahun. Pengunjung publik dan pegawai biasa melihat bulan terbaru yang tercatat. Pilihan admin hanya berlaku pada tampilan admin tersebut, tidak mengganti bulan publik secara global.
- Filter SubUnit mengikuti kolom `SubUnitKerja` di `Data_Pegawai`, bukan nama unit dari situs contoh. Filter berlaku pada statistik, peringkat, catatan, dan dinas.
- Halaman mengambil ulang data setiap dua menit **setelah respons terakhir**, hanya saat halaman aktif. Tombol muat ulang juga tersedia. Saat pembaruan gagal, hasil terakhir tetap terlihat dengan peringatan.

## Sumber dan ketepatan data

1. Hanya `REKAP_UANG_MAKAN`, dengan periode tepat tanggal 1 sampai hari terakhir bulan yang sama. Periode parsial atau 11–10 tidak digabungkan. Nama modul pembayaran tidak ditampilkan pada halaman wrap.
2. Baris terakhir untuk NIP/bulan adalah sumber yang berlaku. Baris baru yang belum dikonfirmasi tidak boleh digantikan diam-diam dengan hasil lama.
3. Statistik diambil dari spreadsheet hasil rekap pegawai yang tercatat pada kolom J, setelah `Hitung_Status` menjadi `Lengkap` atau `Perlu penyesuaian`. Status kedua berarti nominal pembayaran belum lengkap; statistik presensi tetap tersedia. Rekap yang menunggu proses/konfirmasi ulang belum dihitung.
4. Jam datang, keterangan final, jadwal biasa/Ramadan, dan adjustment dibaca dari file yang sudah digenerate dan snapshot internalnya. Jam datang `-` tidak diganti dengan jam pulang. Tidak mengandalkan jam pada tabel ringkasan master.
5. `DOKUMEN_PENDUKUNG` menyediakan daftar bukti **tercatat aktif**, dan `REKAP_SPT` menyediakan tujuan dinas. Wrap tidak mengulang OCR atau validasi klaim. Jika berkas bukti dihapus langsung di Drive, status registrasinya harus diperbarui melalui alur klaim aplikasi; angka dokumen adalah jumlah registrasi aktif, bukan pemindaian isi Drive.
6. Satu file rekap yang gagal dibaca tidak menggagalkan pegawai lain. Status mencantumkan jumlah submisi tersedia, pending, tidak terbaca, dan tanggal tidak lengkap. Detail kesalahan hanya ada pada respons internal; respons publik tidak memuat nama/ID dari sumber yang gagal.
7. Tidak ada sheet/kolom baru yang diperlukan. `REKAP_HARIAN` tetap tidak dibuat, dibaca, ditulis, atau dihapus. Snapshot presensi dan `ADJUSTMENT_PRESENSI` tetap dipertahankan.

## Definisi angka dan peringkat

- Pegawai dengan rekap: jumlah pegawai yang file hasilnya berhasil dibaca, bukan total pegawai aktif direktorat.
- Kehadiran = hari masuk WFO/WFA/WFH ÷ seluruh hari kerja tercatat. Hari kerja mencakup Dinas, Cuti, dan TB tetapi tidak Libur. Satu presensi yang ada/koreksi sah tetap mengikuti perhitungan kehadiran aplikasi.
- Peringkat kehadiran: persentase tertinggi, lalu hari flexi paling sedikit, menit flexi paling sedikit, jumlah masuk terbanyak, dan nama sebagai pemecah seri yang stabil. Hanya rekap berisi seluruh tanggal bulan terpilih yang ikut peringkat. Rekap parsial tetap tampil di statistik dengan penanda.
- Flexi: datang setelah jam mulai hingga maksimal 60 menit (inklusi). Lewat 60 menit adalah TL, bukan hari flexi. Memakai jadwal biasa/Ramadan per tanggal yang sudah disimpan.
- Tepat waktu: persentase datang paling lambat pada jam mulai tanpa flexi, untuk WFO/WFA/WFH. Jika sama mengikuti peringkat kehadiran. Rata-rata jam datang ditampilkan sebagai informasi.
- Hari teramai/tersepi: jumlah pegawai WFO hadir per tanggal kerja yang tercatat. Tanggal tanpa data tidak diciptakan menjadi nol.
- Perjalanan dinas: pasangan pegawai/surat tugas unik. Satu surat untuk beberapa pegawai berarti beberapa perjalanan pegawai. Total hari dinas adalah hari-orang.
- Penilaian ini ringkasan deskriptif, bukan keputusan kepegawaian atau perhitungan pembayaran baru.

## Pembaruan ke produksi

1. Cadangkan kode Apps Script saat ini.
2. Ganti isi Apps Script dengan seluruh `backend/Code.gs` terbaru.
3. **Deploy → Manage deployments → pensil → Version: New version → Deploy** pada deployment web app yang sama. URL `/exec` tidak perlu diganti jika memakai deployment yang sama.
4. Cek URL web app dengan `?action=health`. Versi yang diharapkan: `2026-09-26-calendar-wrap`.
5. Deploy frontend melalui Git/Railway seperti biasa, termasuk `src/monthly-recap.jsx`, `src/monthly-recap-model.js`, dan perubahan pemanggil di `src/App.jsx`. Perubahan lokal lain yang masih ada harus ditinjau sebelum commit.
6. Login admin, pilih bulan/tahun, periksa SubUnit, jumlah hadir, flexi, dan jam paling awal terhadap file pegawai. Uji bulan kosong dan bulan yang datanya parsial.
7. Buka `#/rekap-publik` tanpa login: rekap harus muncul, tanpa pemilih periode admin, NIP asli, nominal, atau tautan berkas. Daftar SubUnit tetap tersedia.

Pembacaan banyak file tetap tergantung latensi dan kuota Apps Script. Tidak menahan lock penulisan saat membaca wrap. Data yang sedang diperbarui saat pembacaan mungkin baru terlihat pada refresh berikutnya. Pengujian lokal bukan bukti bahwa deployment produksi telah diperbarui.

## Pengujian

```powershell
cd D:\bangdes-pkp
node --test backend/attachments.test.mjs tests/monthly-recap.test.mjs tests/document-parsers.test.mjs tests/existing-status.test.mjs tests/process-recovery.test.mjs
npm run build
```

Fixture `tests/monthly-ui.html` dan `tests/public-recap.html` hanya menggunakan data buatan. Fixture monthly mempercepat interval menjadi 4 detik untuk menguji data masuk dan kegagalan server; aplikasi sebenarnya tetap dua menit.
