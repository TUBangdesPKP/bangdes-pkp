# Hapus arsip Surat Tugas dan Cuti

Backend tetap Google Apps Script, Spreadsheet, dan Drive.

## Memasang pembaruan

1. Salin `backend/Code.gs` terbaru ke project Apps Script spreadsheet kepegawaian yang sudah dipakai.
2. Deploy → Manage deployments → Edit → New version → Deploy pada deployment yang sama, agar URL `/exec` tidak berubah.
3. Setelah backend diperbarui, commit/push frontend untuk deployment aplikasi. Git push saja tidak memperbarui Apps Script.
4. Login ulang bila sesi pegawai kedaluwarsa. Tidak perlu mengubah spreadsheet secara manual.

## Penggunaan dan hak akses

- Buka Arsip Surat Tugas atau Arsip Surat Cuti, lalu buka rincian surat. Tombol **Hapus** terdapat di sebelah nama pegawai.
- Pegawai hanya memperoleh daftar miliknya dan hanya dapat menghapus baris dengan NIP sesi login tersebut. Nama atau role yang dikirim browser bukan dasar izin.
- Admin berbasis NIP mengikuti Role dari Data_Pegawai pada setiap permintaan. Admin dapat menghapus baris siapa pun, atau semua peserta surat yang sedang ditampilkan. Bila daftar difilter dengan pencarian, tombol kelompok hanya menghapus peserta yang ditampilkan dan tercantum pada konfirmasi, bukan data tersembunyi.
- Akun Admin khusus lama tanpa sesi pegawai perlu memasukkan kunci publikasi `WRAP_ADMIN_KEY`, lalu **Verifikasi & muat arsip**. Kunci hanya berada di memori halaman dan bukan PIN login.
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
