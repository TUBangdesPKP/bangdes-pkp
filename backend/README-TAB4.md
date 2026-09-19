# Preview akhir dan konfirmasi rekap tab 4

## Deploy

1. Cadangkan Apps Script dan spreadsheet sebelum memperbarui versi produksi.
2. Ganti seluruh kode backend Apps Script dengan `backend/Code.gs` ini. Jangan menambahkannya di bawah doPost lama. Konstanta ID dipertahankan dari backend yang dilampirkan.
3. Gunakan zona waktu Asia/Jakarta pada proyek Apps Script dan spreadsheet. Deploy versi baru pada deployment web app yang sama. Menyimpan editor saja tidak memperbarui deployment.
4. Bila URL /exec tetap sama, frontend tidak perlu mengganti APPS_SCRIPT_URL. Bila URL berubah, sesuaikan konstanta tersebut di src/App.jsx.
5. Deploy frontend setelah backend. File baru `src/final-recap.jsx` wajib disertakan. Import CSS pada src/main.jsx tetap dipertahankan.
6. Build: `npm run build`. Test backend mock: `node --test backend/attachments.test.mjs`.

## Alur

### Navigasi cepat tab 2–3–4

- Daftar arsip SPT/Cuti, daftar bukti pengumpulan, serta preview tab 4 disimpan dalam memori selama sesi dan konteks NIP/modul/periode yang sama. Ini bukan penanda `uploaded_*` di localStorage; pemeriksaan keberadaan tab 2 tetap membaca server saat memilih file atau Periksa ulang status rekap.
- Respons `proses_bukti` langsung dipakai untuk preview. Tidak ada permintaan `preview_rekap_final` kedua setelah Lanjut Proses. Kembali 4 → 3 → 2 → 3 → 4 tanpa perubahan memakai hasil terakhir dan mempertahankan pilihan konflik/persetujuan yang belum disimpan.
- Lanjut Proses dinonaktifkan setelah berhasil; gunakan tombol tab 4 untuk melihat hasil. Tombol aktif kembali setelah klaim/upload/hapus bukti berhasil atau rekap tab 2 diganti/disimpan ulang.
- Sekadar melihat atau mengedit preview lokal tab 2 tidak menimpa hasil klaim. Perubahan tab 2 baru diterapkan saat Proses & Simpan Bukti/Ganti Dokumen berhasil.
- Refresh browser, ganti akun/modul/NIP/periode, atau tombol muat ulang manual akan membaca ulang data. Perubahan langsung di Google Sheets/Drive tidak dipoll otomatis saat berpindah tab; gunakan Muat ulang daftar/preview. Saat menyimpan hasil akhir, backend tetap memvalidasi revisi untuk mencegah penggunaan data lama.
- Backend kini mengembalikan revisi terbaru setelah konfirmasi akhir agar preview tersimpan dapat digunakan kembali dengan benar. Deploy ulang Code.gs bersama frontend; tidak perlu migrasi sheet untuk perubahan ini.
- Banner submisi dipadatkan (sekitar 65 px pada layar desktop pengujian); ukuran tombol tab tetap 36 × 36 px. Teks proses tab 4 menjadi `memproses data terbaru`.

### Pemeriksaan Dokumen Telah Tersedia pada tab 2

- Frontend tidak lagi membaca/menulis penanda `uploaded_*` di localStorage. Penanda lama boleh dibiarkan; tidak digunakan untuk menentukan status.
- Setiap pemilihan file yang berhasil dibaca memeriksa data terbaru melalui POST `check_status`. Backend mencocokkan modul, NIP, dan periode pada REKAP_TUKIN/REKAP_UANG_MAKAN, lalu memeriksa spreadsheet hasil (kolom J) masih aktif dan berada pada folder tercatat (kolom I).
- Hanya kecocokan yang terverifikasi memunculkan notifikasi kuning. Baris sudah dihapus, spreadsheet sudah di-Trash/tidak tersedia, atau lokasi file tidak cocok: notifikasi tidak muncul. Menghapus PDF/XLSX referensi lama saja tidak menghilangkan status selama spreadsheet hasil dan baris rekap masih valid.
- Tombol **Periksa ulang status rekap** tersedia setelah preview terbaca untuk memeriksa perubahan yang dilakukan melalui Sheets/Drive tanpa memilih ulang file. Kegagalan koneksi/backend ditampilkan sebagai error dan penyimpanan diblokir sampai pemeriksaan berhasil.
- Jika spreadsheet hasil dihapus tetapi foldernya masih valid, penyimpanan tab 2 membuat rekap pengganti di folder tersebut dan memperbarui baris yang sama. Dokumen SPT/Cuti lain tidak dihapus.
- Perubahan ini memerlukan frontend dan **deployment baru Code.gs**. Backend lama ditolak dengan pesan pembaruan, agar frontend tidak mempercayai pemeriksaan lama yang hanya melihat baris sheet.
- Uji: `node --test backend/attachments.test.mjs tests/existing-status.test.mjs`, lalu `npm run build`.

- Tab 2 hanya membuat spreadsheet rekap dari hasil bacaan dan template. File PDF/XLSX referensi tidak dikirim frontend dan tidak dibuat di folder pegawai oleh backend. File referensi lama yang sudah terunggah tidak dihapus otomatis. Backend menyimpan snapshot hasil bacaan pada sheet tersembunyi `_PRESENSI_TAB2` di spreadsheet rekap yang sama.
- Tab 3 tetap menggunakan salinan SPT/Cuti di folder pengumpulan pegawai. Klaim ulang sumber yang sama menggunakan kembali baris deleted pada DOKUMEN_PENDUKUNG dan mengganti FileId salinannya. Dokumen lain, modul lain, dan periode lain tidak ditimpa. Duplikat lama tidak otomatis dihapus.
- Di tab 3, tombol Kembali dan **Lanjut Proses** berada tepat di bawah daftar Dokumen Bukti Dukung yang sudah diupload, sebelum panel upload SPT/Cuti.
- **Lanjut Proses** memanggil `proses_bukti`: backend membaca snapshot tab 2 dan dokumen active untuk NIP/modul/periode/folder yang sama, lalu memperbarui keterangan dan warna pada spreadsheet rekap yang sama sebelum membuka tab 4. SPT menjadi Dinas; semua Cuti menjadi Cuti. Sabtu/Minggu atau keterangan awal Libur tetap Libur. Jam datang/pulang tidak diubah.
- Tab 4 terkunci sebelum Lanjut Proses berhasil. Kembali ke tab 3 tanpa perubahan tidak menguncinya. Klaim, upload bukti, atau hapus bukti yang berhasil mengunci ulang tab 4 sampai Lanjut Proses diklik kembali. Backend juga memeriksa revisi; akses langsung ke API preview tidak melewati pemeriksaan ini. Simpan ulang tab 2 juga memerlukan proses ulang.
- Tab 4 menampilkan **Preview Bukti Tunjangan Kinerja** atau **Preview Bukti Uang Makan**, dengan tabel scroll lima kolom: Tanggal, Hari, Datang, Pulang, Ket; identitas pegawai dan total hari. Keterangan biasa hanya ditampilkan; dropdown penyesuaian tersedia untuk konflik SPT/Cuti.
- SPT dan Cuti bersamaan pada hari kerja memerlukan pilihan pengguna Dinas atau Cuti di tab 4. Saat Lanjut Proses, tanggal konflik mempertahankan keterangan awal dan diberi warna kuning, bukan diputuskan otomatis. Pilihan yang sudah dikonfirmasi tetap tersimpan jika tidak ada perubahan klaim.
- Setelah checkbox persetujuan dicentang, tombol Lanjutkan Perhitungan Uang Makan/Tunjangan Kinerja mengonfirmasi hasil akhir, termasuk keputusan konflik, pada kolom V mulai baris 6 dan warna baris A:V. ID spreadsheet, jam datang/pulang, kolom lain, formula di luar V, border, dan conditional formatting tidak diganti.
- Backend menghitung ulang dan membandingkan revisi sebelum menyimpan. Jika klaim/presensi berubah setelah preview, pengguna harus memuat ulang dan memeriksa lagi.
- Setelah penyimpanan berhasil, tab 5 menampilkan ringkasan jumlah Dinas/Cuti/Libur dan tautan spreadsheet final. Jumlah ini bukan nominal pembayaran. Rumus tarif, potongan dan nominal uang makan/tukin tidak ditambahkan dalam perubahan ini.
- Setelah klaim dihapus, klik Lanjut Proses kembali. Perhitungan ulang memakai snapshot tab 2, sehingga keterangan yang sebelumnya Dinas/Cuti dapat kembali ke keterangan aslinya.

## Kolom horizontal tanggal

- REKAP_SPT: mulai K, header Tanggal_1, Tanggal_2, dst. Berisi seluruh tanggal kalender dari awal sampai akhir dokumen (inklusif), termasuk akhir pekan/libur.
- REKAP_CUTI: mulai K, berisi hanya tanggal kerja dalam rentang dokumen. Sabtu/Minggu dan hari libur dalam konfigurasi aplikasi tidak dimasukkan. Jumlahnya diperiksa terhadap kolom G (Jumlah Hari Cuti); jika berbeda, migrasi memberi warnings dan klaim/preview ditolak sampai rentang/jumlah/kalender diperiksa, bukan memotong tanggal sembarangan.
- DOKUMEN_PENDUKUNG: mulai O, header Tanggal_1, Tanggal_2, dst. Berisi tanggal dokumen dalam rentang submisi. Ini tanggal cakupan bukti, bukan jumlah hari yang dibayar. Penyesuaian akhir tetap mengikuti status Libur pada presensi.
- Nilai disimpan sebagai nomor seri tanggal bulat dengan format yyyy-mm-dd, tanpa jam dan tanpa konversi zona waktu saat penulisan. Tanggal sumber bertipe Date dibaca mengikuti zona waktu spreadsheet Kepegawaian. Kolom A:J dan A:N tidak digeser.
- Jangan menambahkan kolom lain di area tanggal tersebut. Kode menolak area yang memiliki header berbeda agar tidak menimpa data lain.
- Data baru diisi otomatis saat upload/klaim. Untuk seluruh data lama, jalankan fungsi `isiTanggalArsipDanKlaimLama` secara manual sekali dari editor Apps Script setelah backup. Periksa execution log untuk baris yang dilewati (tanggal invalid atau sumber tidak lagi ada). Fungsi ini hanya mengisi tanggal; tidak menghapus data, membuat salinan Drive, atau mengubah keterangan presensi.
- Baris klaim lama tanpa tanggal masih bisa dipreview dengan membaca rekap arsip sumber. Jika sumber sudah tidak cocok, perbaiki/claim ulang sebelum melanjutkan. Jangan mengarang tanggal ketika sumber tidak ditemukan.

### Perbaikan tanggal mundur sehari

1. Cadangkan spreadsheet Kepegawaian.
2. Ganti Code.gs dengan versi terbaru ini, lalu simpan.
3. Jalankan `isiTanggalArsipDanKlaimLama` kembali sekali. Tanggal dihitung dari kolom E/F sumber, bukan dengan menambahkan satu hari ke hasil lama. Nilai tanggal lama ditimpa dan kolom tanggal berlebih dikosongkan. Tidak ada file Drive yang dihapus, dan kolom E/F/G tidak diubah.
4. Periksa execution log: `skipped` adalah baris gagal diproses; `warnings` adalah ketidaksesuaian jumlah Cuti. Jangan abaikan pesan tersebut.
5. Periksa contoh SPT 25–28 Agustus: hasil 25, 26, 27, 28 Agustus. Contoh Cuti Jumat–Senin tanpa hari libur tambahan: hanya Jumat dan Senin.
6. Deploy versi baru pada deployment web app yang sama, lalu muat ulang preview tab 4. Frontend tidak perlu diubah untuk perbaikan ini. Jangan konfirmasi preview jika log masih menunjukkan masalah pada bukti yang akan digunakan.

Kalender backend mengikuti daftar tanggal libur tahun 2026 yang sudah ada pada frontend, bukan kalender baru yang diverifikasi dari sumber eksternal. Untuk libur tambahan/cuti bersama yang memang berlaku, buat sheet opsional `HARI_LIBUR` pada spreadsheet Kepegawaian: A1 `Tanggal`, B1 `Keterangan`, lalu isi tanggal libur pada A2 dan seterusnya sebagai tanggal atau teks yyyy-mm-dd. Semua baris terisi diperlakukan sebagai libur. Tahun lain memerlukan kalender yang sesuai. Jika kalender tambahan mengubah jumlah hari pada upload baru, verifikasi kembali jumlah hari Cuti yang dikirim frontend. Jangan ubah jumlah di kolom G hanya supaya peringatan hilang tanpa memeriksa dokumen.

Preview tab 4 menghitung ulang dari tanggal sumber arsip, sehingga tidak menggunakan kolom hasil lama yang mungkin masih bergeser. Cuti juga tidak diterapkan pada baris presensi awal berketerangan Libur.

Referensi representasi tanggal tanpa jam: [Google Sheets date serial numbers](https://developers.google.com/workspace/sheets/api/guides/formats).

## Rekap lama tanpa snapshot

Saat Lanjut Proses pertama, backend membuat snapshot dari isi rekap lama sebelum menimpa keterangannya. Jika rekap lama sudah pernah diedit manual dan Anda membutuhkan data asli sebelumnya, pilih/simpan ulang file referensi melalui tab 2 dahulu.

Jangan mengedit/menghapus `_PRESENSI_TAB2` secara manual. Ini acuan penghitungan ulang. Dokumen yang masih tercatat active tetapi salinannya tidak tersedia akan memblokir preview dengan pesan kesalahan, bukan diam-diam diabaikan.

## Uji setelah deploy versi ini

1. Simpan backup. Perbarui dan deploy Code.gs terlebih dahulu, kemudian build/push frontend termasuk App.jsx, submission-documents.jsx, final-recap.jsx dan file dependensi yang sudah ada.
2. Pilih satu pegawai/periode uji. Pilih file presensi di tab 2, periksa bacaannya, lalu Proses & Simpan Bukti. Pastikan folder berisi spreadsheet rekap, tanpa salinan baru PDF/XLSX referensi.
3. Di tab 3 klaim SPT/Cuti. Pastikan tab 4 belum aktif. Klik Lanjut Proses di bawah daftar bukti.
4. Pastikan ID spreadsheet tidak berubah, keterangan pada tanggal klaim menjadi Dinas/Cuti, tanggal Libur dan jam datang/pulang tetap. Preview tab 4 harus sama dengan spreadsheet; konflik diberi peringatan.
5. Kembali ke tab 3 tanpa perubahan: tab 4 tetap bisa dibuka. Hapus salah satu salinan bukti: tab 4 terkunci kembali. Klik Lanjut Proses lagi dan periksa keterangan kembali ke acuan tab 2 pada tanggal yang tidak lagi punya bukti.
6. Jika ada konflik, tentukan Dinas atau Cuti, centang persetujuan, lalu Lanjutkan Perhitungan. Ulangi pemeriksaan pada modul lainnya.

Penanda proses dan keputusan konflik disimpan otomatis di B1/B2 sheet internal `_PRESENSI_TAB2`; tidak perlu menambah kolom pada sheet Kepegawaian untuk fitur penguncian ini. Tes lokal tanpa backend produksi: `tests/submission-flow.html` (alur tab) dan `tests/final-ui.html` (konflik).

## Verifikasi dan batasan

Sudah dilakukan build frontend, pengujian backend dengan mock Drive/Sheets, dan uji UI lokal (konflik, checkbox, warna baris, tombol lanjut). File Tes Fahmy.xlsx diperiksa read-only: layout A:V, data mulai baris 6, keterangan V. Link Google Sheets contoh tidak dapat dibaca melalui alat web pada sesi ini; kesesuaian hasil di Google Sheets tetap perlu uji satu pegawai setelah deploy.

Tidak ada deployment atau perubahan Drive/Sheets produksi selama pengerjaan. Backend yang ada belum memvalidasi sesi login server; validasi konteks NIP/periode/folder bukan pengganti autentikasi. Penguatan autentikasi tetap pekerjaan terpisah.

Referensi API penulisan nilai dan warna: [Google Apps Script Range](https://developers.google.com/apps-script/reference/spreadsheet/range).
