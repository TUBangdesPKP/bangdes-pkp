# Pemenuhan Kompetensi / JP — tambah dan hapus pelatihan

## Pemasangan

Tidak perlu membuat Apps Script di spreadsheet JP dan tidak perlu memindahkan datanya.

1. Salin `backend/Code.gs` terbaru ke **proyek Apps Script kepegawaian yang selama ini digunakan**.
2. Pastikan akun pelaksana deployment memiliki akses **Editor** ke file **Pemenuhan JP Bangdes**: https://docs.google.com/spreadsheets/d/1rhPuQqRDtR8U1aIwyJmJyTdw53nYTyUFfdNDjy_xMyE/edit
3. Tab tujuan tetap `Backend` (gid 0), header baris 1: **A Nama**, **B Sertifikasi / Diklat**, **C Tahun**, **D Jumlah JP**. Struktur ini telah diperiksa; tidak ada migrasi kolom otomatis. Tab `Data` beserta rumusnya tidak ditulis ulang.
4. Apps Script → Deploy → Manage deployments → Edit → **New version** → Deploy pada deployment yang sama. URL `/exec` tetap. Bila diminta izin akses spreadsheet, setujui dengan akun pemilik deployment.
5. Deploy/push frontend setelah backend. Git push tidak memperbarui Apps Script.
6. Buka Kepegawaian → Pemenuhan Kompetensi, klik ikon muat ulang. Jika masih ada peringatan data publik/versi backend, jangan mencoba menambah/menghapus sampai backend siap.

## Penggunaan

- **Tambah Data Pelatihan** membuka login NIP/PIN jika belum memiliki sesi pegawai Admin. Role diperiksa dari kolom Role data induk setiap permintaan, bukan dari nilai yang dikirim browser.
- Username `admin` lama hanya memiliki sesi baca dan tidak berwenang menulis JP. Gunakan akun NIP pegawai dengan Role Admin, tanpa kunci publikasi tambahan.
- Pada kolom Nama, ketik nama atau NIP, lalu **pilih salah satu saran daftar**. Nama bebas ditolak; backend memakai nama resmi dari NIP yang dipilih. Tahun dan JP wajib diisi, JP dapat nol/positif dengan maksimal tiga angka desimal.
- Klik nama pegawai di tabel untuk membuka rincian. Tombol **Hapus** hanya tersedia pada sesi pegawai Admin dengan daftar terbaru dari backend. Pop up konfirmasi menampilkan nama, judul, tahun, dan JP.
- Setelah penyimpanan, daftar diperbarui dari respons backend langsung, tidak menunggu publikasi CSV Google. Filter dan urutan pegawai tetap dipertahankan, nomor tampilan selalu 1 sampai jumlah hasil filter.

## Keselamatan data

- `list_pelatihan_jp` hanya mengembalikan rincian A:D yang memang sudah dipublikasikan. Tidak mengembalikan PIN, token, atau kolom cadangan.
- `tambah_pelatihan_jp` dan `hapus_pelatihan_jp` memerlukan sesi NIP Admin aktif. Perubahan Role/PIN di master membuat izin lama tidak berlaku.
- Semua operasi JP memakai script lock dan versi data. Bila spreadsheet berubah, form/konfirmasi lama ditolak: tutup pop up, muat ulang, lalu periksa kembali targetnya. Tidak ada retry tulis otomatis; klik berulang dengan versi lama tidak menggandakan data.
- Penghapusan menyimpan salinan nilai baris terpilih di sheet tersembunyi `JP_PELATIHAN_TERHAPUS` pada **spreadsheet kepegawaian**, lalu memverifikasinya. Sheet ini cadangan pemulihan manual, bukan pelatihan aktif dan bukan kontrol akses untuk orang yang memiliki akses spreadsheet.
- Baris terpilih dihapus dengan operasi baris native. Baris yang benar-benar kosong dirapikan dari bawah ke atas; baris berisi data pada kolom lain tidak dianggap kosong. Tidak ada pengosongan/penulisan ulang seluruh tabel.
- Jika respons terputus, perubahan mungkin sudah tersimpan. Muat ulang dan periksa daftar sebelum mencoba lagi. Riwayat versi Google Sheets serta cadangan penghapusan dapat dipakai untuk pemulihan manual.
- Pengujian otomatis memakai tiruan spreadsheet; tidak membuat atau menghapus pelatihan di data produksi.

## Uji lokal

`node --test backend/*.test.mjs tests/*.test.mjs`

`npm run build`
