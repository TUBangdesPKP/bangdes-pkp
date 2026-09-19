# Preview akhir dan konfirmasi rekap tab 4

## Deploy

1. Cadangkan Apps Script dan spreadsheet sebelum memperbarui versi produksi.
2. Ganti seluruh kode backend Apps Script dengan `backend/Code.gs` ini. Jangan menambahkannya di bawah doPost lama. Konstanta ID dipertahankan dari backend yang dilampirkan.
3. Gunakan zona waktu Asia/Jakarta pada proyek Apps Script dan spreadsheet. Deploy versi baru pada deployment web app yang sama. Menyimpan editor saja tidak memperbarui deployment.
4. Bila URL /exec tetap sama, frontend tidak perlu mengganti APPS_SCRIPT_URL. Bila URL berubah, sesuaikan konstanta tersebut di src/App.jsx.
5. Deploy frontend setelah backend. File baru `src/final-recap.jsx` wajib disertakan. Import CSS pada src/main.jsx tetap dipertahankan.
6. Build: `npm run build`. Test backend mock: `node --test backend/attachments.test.mjs`.

## Alur

- Tab 2 tetap menyimpan file asli dan spreadsheet rekap. Backend juga menyimpan snapshot hasil bacaan yang telah dikonfirmasi pada sheet tersembunyi `_PRESENSI_TAB2` di spreadsheet rekap yang sama.
- Tab 3 tetap menggunakan salinan SPT/Cuti di folder pengumpulan pegawai. Klaim ulang sumber yang sama menggunakan kembali baris deleted pada DOKUMEN_PENDUKUNG dan mengganti FileId salinannya. Dokumen lain, modul lain, dan periode lain tidak ditimpa. Duplikat lama tidak otomatis dihapus.
- Tab 4 memuat data awal dari server dan dokumen active untuk NIP/modul/periode/folder yang sama. Hanya keterangan diubah: SPT menjadi Dinas; semua Cuti menjadi Cuti. Tanggal Sabtu/Minggu atau keterangan awal Libur tetap Libur. Hari libur nasional mengandalkan keterangan Libur dari tab 2; tidak ada kalender baru yang ditebak.
- SPT dan Cuti bersamaan pada hari kerja memerlukan pilihan pengguna Dinas atau Cuti. Pada hari libur tetap ada notifikasi tetapi keterangan terkunci Libur.
- Setelah checkbox persetujuan dicentang, tombol Lanjutkan Perhitungan Uang Makan/Tunjangan Kinerja menulis ulang kolom V mulai baris 6 pada spreadsheet rekap yang sama, beserta warna baris A:V. ID spreadsheet, file Excel asli, jam datang/pulang, kolom lain, formula di luar V, border, dan conditional formatting tidak diganti.
- Backend menghitung ulang dan membandingkan revisi sebelum menyimpan. Jika klaim/presensi berubah setelah preview, pengguna harus memuat ulang dan memeriksa lagi.
- Setelah penyimpanan berhasil, tab 5 menampilkan ringkasan jumlah Dinas/Cuti/Libur dan tautan spreadsheet final. Jumlah ini bukan nominal pembayaran. Rumus tarif, potongan dan nominal uang makan/tukin tidak ditambahkan dalam perubahan ini.
- Kembali ke tab 4 setelah klaim dihapus akan menghitung ulang dari snapshot tab 2, bukan dari keterangan final yang sudah ditimpa.

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

Preview pertama membaca isi spreadsheet rekap yang ada tanpa mengubahnya. Saat konfirmasi final pertama, backend membuat snapshot sebelum menimpa keterangan. Jika rekap lama sudah pernah diedit manual dan Anda membutuhkan data asli sebelumnya, unggah/simpan ulang file asli melalui tab 2 dahulu.

Jangan mengedit/menghapus `_PRESENSI_TAB2` secara manual. Ini acuan penghitungan ulang. Dokumen yang masih tercatat active tetapi salinannya tidak tersedia akan memblokir preview dengan pesan kesalahan, bukan diam-diam diabaikan.

## Verifikasi dan batasan

Sudah dilakukan build frontend, pengujian backend dengan mock Drive/Sheets, dan uji UI lokal (konflik, checkbox, warna baris, tombol lanjut). File Tes Fahmy.xlsx diperiksa read-only: layout A:V, data mulai baris 6, keterangan V. Link Google Sheets contoh tidak dapat dibaca melalui alat web pada sesi ini; kesesuaian hasil di Google Sheets tetap perlu uji satu pegawai setelah deploy.

Tidak ada deployment atau perubahan Drive/Sheets produksi selama pengerjaan. Backend yang ada belum memvalidasi sesi login server; validasi konteks NIP/periode/folder bukan pengganti autentikasi. Penguatan autentikasi tetap pekerjaan terpisah.

Referensi API penulisan nilai dan warna: [Google Apps Script Range](https://developers.google.com/apps-script/reference/spreadsheet/range).
