# Hapus arsip Surat Tugas dan Cuti

Backend tetap Google Apps Script, Spreadsheet, dan Drive.

## Memasang pembaruan

1. Salin `backend/Code.gs` terbaru ke project Apps Script spreadsheet kepegawaian yang sudah dipakai.
2. Deploy → Manage deployments → Edit → New version → Deploy pada deployment yang sama, agar URL `/exec` tidak berubah.
3. Setelah backend diperbarui, commit/push frontend untuk deployment aplikasi. Git push saja tidak memperbarui Apps Script.
4. Login ulang bila sesi pegawai kedaluwarsa. Tidak perlu mengubah spreadsheet secara manual.

## Penggunaan dan hak akses

- Buka Arsip Surat Tugas atau Arsip Surat Cuti, lalu buka rincian surat. Tombol **Hapus** terdapat di sebelah nama pegawai.
- **SPT:** semua akun yang login dapat melihat seluruh nama dan arsip. Hak hapus hanya untuk akun yang mengunggah file tersebut, termasuk ketika akunnya memiliki Role Admin. Nama/NIP peserta surat tidak dianggap pengunggah. Tombol kelompok hanya muncul jika seluruh baris yang ditampilkan berasal dari file milik pengunggah.
- **Cuti:** akses lama tetap: pegawai melihat/menghapus baris milik NIP sesi login; Admin berbasis NIP dapat mengelola semua baris. Ringkasan per nama/NIP menampilkan jumlah hari berdasarkan jenis cuti, mengikuti filter bulan/tahun/pencarian yang sama dengan daftar. Tidak mengambil data pegawai lain di luar daftar yang diizinkan backend.
- Pengunggah SPT baru dicatat server di sheet tersembunyi `PENGUNGGAH_ARSIP` (FileId, Pengunggah, Diunggah), terpisah dari kolom tanggal arsip. Upload otomatis, manual, dan upload SPT dari penghitungan menggunakan jalur ini. NIP dari sesi server, bukan nilai dari browser. NIP disimpan sebagai teks. Surat yang diklaim dari arsip tidak berpindah kepemilikan.
- Arsip SPT lama tanpa catatan pengunggah tetap dapat dilihat tetapi **tidak dapat dihapus lewat aplikasi**, termasuk oleh Admin. Tidak ada migrasi kepemilikan berdasarkan tebakan nama. Catatan yang ambigu juga tidak memberi hak hapus.
- Akun Admin khusus lama menggunakan sesi login admin untuk SPT; seluruh pemakai akun admin bersama dianggap satu akun pengunggah. Untuk Cuti, akses kunci publikasi `WRAP_ADMIN_KEY` tetap seperti sebelumnya. Kunci hanya berada di memori halaman dan bukan PIN login.
- Upload SPT dengan peserta/tanggal/tujuan yang sama tidak menimpa baris milik pengunggah lain. Surat baru dicatat terpisah; surat yang diunggah ulang oleh pengunggah yang sama tetap memakai perilaku pembaruan sebelumnya.
- Penghapusan memerlukan konfirmasi yang menampilkan nama/NIP dan jumlah data. Tidak ada tombol mengosongkan seluruh database arsip.

## Perlindungan data

- Endpoint `list_arsip` membaca langsung spreadsheet supaya hasil penghapusan tidak bergantung pada cache CSV publik.
- Endpoint `hapus_arsip` menggunakan script lock, memeriksa seluruh target dan hak akses sebelum menulis, serta menolak ID baris yang sudah berubah sejak daftar dibuka. Tidak ada retry penghapusan otomatis.
- Sebelum baris dihapus, salinan nilai/formula/format dan identitas transaksi disimpan serta diverifikasi pada sheet tersembunyi `ARSIP_TERHAPUS`. Sheet ini hanya cadangan pemulihan manual bagi pengelola spreadsheet, bukan arsip aktif; menyembunyikan sheet bukan mekanisme keamanan terhadap orang yang sudah punya akses spreadsheet.
- Baris dihapus dari `REKAP_SPT` (atau nama lama `REKAP _SPT`) / `REKAP_CUTI`, tanpa meninggalkan baris kosong. Baris pegawai lain dan modul lain tetap ada.
- File Drive asli tidak dihapus/trash, karena dapat digunakan bersama. Salinan klaim, dokumen pendukung, dan hasil keuangan lama tidak ikut dihapus atau dihitung ulang.
- Perhitungan klaim yang sudah ada dapat membaca tanggal sumber dari cadangan bila arsipnya sudah dihapus. Arsip terhapus tidak dapat diklaim baru. Jangan menghapus sheet cadangan karena klaim historis bisa membutuhkannya.
- Jika surat yang salah sudah diklaim, hapus klaimnya pada submisi terkait juga; menghapus arsip saja sengaja tidak mengubah rekap submisi. Periode tertutup perlu dibuka Admin sebelum klaim dapat diperbaiki.
- Jika koneksi terputus atau operasi gagal sebagian, muat ulang daftar sebelum mencoba lagi. Cadangan tetap tersimpan; pemulihan harus mencocokkan transaksi/NIP/surat dan memeriksa duplikasi, bukan menimpa baris berdasarkan nomor lama.

## Pengujian lokal

Jalankan `node --test backend/*.test.mjs tests/*.test.mjs` dan `npm run build`.
Pengujian memakai spreadsheet dan Drive tiruan, tidak menghapus data produksi.
