# Rekap Kinerja & Kedisiplinan — satu bulan kalender

## Perubahan

- Halaman mengikuti bagian Ringkasan, Kehadiran, Per Unit, Juara, Catatan, dan Dinas dari contoh wrap. Tidak ada lembur.
- Admin memilih bulan/tahun untuk preview → **Simpan Rekap** → pilih **Rekap tersimpan** → **Tampilkan ke Publik** → konfirmasi. Simpan tidak otomatis menerbitkan. Publik dan juara beranda membaca versi yang dipublikasikan, bukan data terbaru otomatis.
- Filter SubUnit mengikuti kolom `SubUnitKerja` di `Data_Pegawai`, bukan nama unit dari situs contoh. Filter berlaku pada statistik, peringkat, catatan, dan dinas.
- Preview internal diperbarui setiap dua menit saat aktif, ditunda selama simpan/publikasi. Publik tidak melakukan polling; muat ulang hanya membaca snapshot terpublikasi. Saat gagal, hasil terakhir tetap terlihat dengan peringatan.
- Header publik selebar browser memakai logo PKP lokal, judul Direktorat, dan tautan kembali, tanpa banner beranda/judul ganda. Background solid mencegah tumpukan konten saat digulir.

## Sumber dan ketepatan data

1. Hanya `REKAP_UANG_MAKAN`, dengan periode tepat tanggal 1 sampai hari terakhir bulan yang sama. Periode parsial atau 11–10 tidak digabungkan. Nama modul pembayaran tidak ditampilkan pada halaman wrap.
2. Baris terakhir untuk NIP/bulan adalah sumber yang berlaku. Baris baru yang belum dikonfirmasi tidak boleh digantikan diam-diam dengan hasil lama.
3. Statistik diambil dari spreadsheet hasil rekap pegawai yang tercatat pada kolom J, setelah `Hitung_Status` menjadi `Lengkap` atau `Perlu penyesuaian`. Status kedua berarti nominal pembayaran belum lengkap; statistik presensi tetap tersedia. Rekap yang menunggu proses/konfirmasi ulang belum dihitung.
4. Jam datang, keterangan final, jadwal biasa/Ramadan, dan adjustment dibaca dari file yang sudah digenerate dan snapshot internalnya. Jam datang `-` tidak diganti dengan jam pulang. Tidak mengandalkan jam pada tabel ringkasan master.
5. `DOKUMEN_PENDUKUNG` menyediakan daftar bukti **tercatat aktif**, dan `REKAP_SPT` menyediakan tujuan dinas. Wrap tidak mengulang OCR atau validasi klaim. Jika berkas bukti dihapus langsung di Drive, status registrasinya harus diperbarui melalui alur klaim aplikasi; angka dokumen adalah jumlah registrasi aktif, bukan pemindaian isi Drive.
6. Satu file rekap yang gagal dibaca tidak menggagalkan pegawai lain. Status mencantumkan jumlah submisi tersedia, pending, tidak terbaca, dan tanggal tidak lengkap. Detail kesalahan hanya ada pada respons internal; respons publik tidak memuat nama/ID dari sumber yang gagal.
7. `REKAP_WRAP_SNAPSHOT` dibuat saat simpan pertama, berisi versi JSON terpotong dan checksum; versi lama tidak ditimpa/dihapus. Draft per bulan dan pointer publik berada di Script Properties. Publik hanya membaca snapshot, tidak memindai Drive/file pegawai. Snapshot rusak tidak diganti data live. `REKAP_HARIAN` tetap tidak dipakai; snapshot presensi dan `ADJUSTMENT_PRESENSI` dipertahankan.
8. Penyimpanan menghitung di server dan membandingkan revisi preview. Perubahan sumber sejak preview ditolak untuk diperiksa ulang; data pegawai kiriman browser tidak dipercaya.

## Definisi angka dan peringkat

- Pegawai dengan rekap: jumlah pegawai yang file hasilnya berhasil dibaca, bukan total pegawai aktif direktorat.
- Kehadiran = hari masuk WFO/WFA/WFH ÷ seluruh hari kerja tercatat. Hari kerja mencakup Dinas, Cuti, dan TB tetapi tidak Libur. Satu presensi yang ada/koreksi sah tetap mengikuti perhitungan kehadiran aplikasi.
- Peringkat kehadiran: persentase tertinggi, lalu hari flexi paling sedikit, menit flexi paling sedikit, jumlah masuk terbanyak, dan nama sebagai pemecah seri yang stabil. Hanya rekap berisi seluruh tanggal bulan terpilih yang ikut peringkat. Rekap parsial tetap tampil di statistik dengan penanda.
- Flexi: datang setelah jam mulai hingga maksimal 60 menit (inklusi). Lewat 60 menit adalah TL, bukan hari flexi. Memakai jadwal biasa/Ramadan per tanggal yang sudah disimpan.
- Tepat waktu: persentase datang paling lambat pada jam mulai tanpa flexi, untuk WFO/WFA/WFH. Jika sama mengikuti peringkat kehadiran. Rata-rata jam datang ditampilkan sebagai informasi.
- Paling Tepat Waktu menjadi kartu foto di atas; Peringkat Kehadiran menjadi daftar di bawah. Beranda menampilkan maksimal lima juara tepat waktu dari snapshot publik yang sama. Foto berbingkai utuh tanpa cropping/pemudaran, thumbnail 800px, fallback ikon bila gagal. Tidak mengubah izin Drive.
- Hari teramai/tersepi: jumlah pegawai WFO hadir per tanggal kerja yang tercatat. Tanggal tanpa data tidak diciptakan menjadi nol.
- Perjalanan dinas: pasangan pegawai/surat tugas unik. Satu surat untuk beberapa pegawai berarti beberapa perjalanan pegawai. Total hari dinas adalah hari-orang.
- Catatan evaluasi terdiri dari Terlambat, PSW, Tidak Absen, dan Lupa Absen dengan Adjustment, tanpa tabel rincian lipat. Adjustment mencakup surat aktif tanpa edit jam; surat yang sudah digunakan tidak ditambahkan lagi di atas jumlah koreksinya. Tidak Absen tetap berdasarkan jam yang kosong. Definisi penyimpanan dan TXT ada di `README-ADJUSTMENT-REKAP.md`.
- Penilaian ini ringkasan deskriptif, bukan keputusan kepegawaian atau perhitungan pembayaran baru.

## Pembaruan ke produksi

1. Cadangkan kode Apps Script saat ini.
2. Ganti isi Apps Script dengan seluruh `backend/Code.gs` terbaru.
3. **Project Settings → Script Properties → Add script property**: tambahkan `WRAP_ADMIN_KEY` dengan nilai acak rahasia minimal 24 karakter (disarankan 32+). Jangan taruh di kode, Git, URL, atau chat. Hanya berikan kepada admin yang boleh menerbitkan.
4. **Deploy → Manage deployments → pensil → New version → Deploy** pada deployment yang sama. Periksa `?action=health`: versi `2026-09-26-published-wrap`.
5. Deploy seluruh perubahan frontend/aset via Git/Railway, termasuk komponen `wrap-publication`, `employee-photo`, `published-leaders`, `pkp-logo`, dan `public/pkp-logo-khaki.png`.
6. Login admin, pilih bulan/tahun, periksa hasil. Masukkan kunci publikasi lalu **Simpan Rekap** (seluruh SubUnit, terlepas filter aktif). Pilih **Rekap tersimpan → Tampilkan ke Publik → Ya, Tampilkan**. Bisa memilih bulan tersimpan sebelumnya. Untuk memperbarui bulan sama: muat ulang → simpan → publikasikan lagi.
7. Buka beranda dan `#/rekap-publik` tanpa login: keduanya mengikuti versi terpublikasi, tanpa NIP asli, nominal, atau tautan bukti. Foto profil diperbolehkan pada podium. Sebelum publikasi pertama, tampil pesan belum tersedia.

Login lama diverifikasi di browser. Endpoint baru wajib memeriksa kunci di backend, tidak mempercayai role/NIP/PIN browser. Ini bukan penggantian autentikasi seluruh API lama. Tanpa konfigurasi kunci, operasi baru ditolak. Frontend menyimpan kunci hanya di state panel, bukan localStorage.

Pembacaan banyak file tetap tergantung latensi dan kuota Apps Script. Tidak menahan lock penulisan saat membaca wrap. Data yang sedang diperbarui saat pembacaan mungkin baru terlihat pada refresh berikutnya. Pengujian lokal bukan bukti bahwa deployment produksi telah diperbarui.

## Pengujian

```powershell
cd D:\bangdes-pkp
node --test backend/attachments.test.mjs tests/monthly-recap.test.mjs tests/document-parsers.test.mjs tests/existing-status.test.mjs tests/process-recovery.test.mjs
npm run build
```

Fixture `tests/monthly-ui.html` dan `tests/public-recap.html` memakai data buatan. Monthly memakai kunci dummy `fixture-key`, interval preview 4 detik; aplikasi tetap dua menit. Pemisahan folder/migrasi ada di `README-FOLDER-ASN.md`.
