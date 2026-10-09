# Melihat rekap pegawai dari tab 2

Backend tetap Google Apps Script, Spreadsheet, dan Drive.

## Pemasangan

1. Perbarui Apps Script dengan `backend/Code.gs` dan deploy **versi baru** pada deployment yang digunakan aplikasi.
2. Di Apps Script → Project Settings → Script Properties, atur `LEGACY_ADMIN_PIN` menjadi PIN 6 angka pilihan pengelola untuk username `admin`. Jangan masukkan PIN ke kode sumber, Git, atau chat. Tidak ada PIN bawaan. Jangan memakai PIN lama yang pernah tertulis di kode aplikasi.
3. Pertahankan `WRAP_ADMIN_KEY` yang sudah ada (minimal 24 karakter acak). Ini kunci **Buat Rekap**, bukan PIN login. Kunci juga tetap digunakan fitur publikasi/status lama sesuai aturan yang sudah ada.
4. Deploy frontend setelah backend siap. Pengguna username `admin` harus keluar lalu login lagi agar mendapat sesi server. Akun NIP Admin memakai sesi login pegawai yang sudah tersedia.

## Alur

- Admin membuka bulan submisi → tab 2 memuat daftar hasil lengkap otomatis menggunakan sesi login, tanpa kunci Buat Rekap.
- Klik nama → tab 5 membaca rekap tersimpan milik pegawai tersebut. Tab 3 dan 4 menampilkan dokumen serta preview dalam mode hanya lihat; tidak mengunggah, menghitung ulang, atau menyimpan perubahan.
- Kembali ke daftar pegawai/tab 2 untuk memilih nama lain. Pemilihan dihapus saat berganti modul atau periode.
- Pada periode ditutup, tab 2 admin hanya menyediakan daftar dan pembuatan file rekap; upload tetap tidak tersedia.
- Tombol Buat Rekap membutuhkan kunci `WRAP_ADMIN_KEY`; backend memverifikasinya sebelum melakukan perubahan file.

Sesi username admin hanya mengizinkan pembacaan daftar/rekap ini, berlaku 30 menit, dan otomatis tidak berlaku saat PIN diubah. Lima percobaan PIN salah dibatasi selama 15 menit. Role akun NIP diperiksa ulang dari master pegawai, bukan dipercaya dari browser.

## Cek setelah deployment

- Login username admin dan akun NIP ber-Role Admin secara terpisah. Tanpa mengisi kunci rekap, buka daftar kedua modul dan pilih dua pegawai bergantian.
- Pastikan NIP/nama sesuai pada tab 5, 4, dan 3; tidak ada tombol edit/simpan. Uji periode terbuka serta tertutup.
- Kembali ke tab 2, lalu pindah bulan dan modul. Jangan sampai identitas pegawai sebelumnya terbawa.
- Tanpa kunci atau dengan kunci salah, pembuatan rekap harus ditolak. Uji pembuatan file hanya dengan izin pengelola dan pada submisi yang dimaksud.
- Akun pegawai biasa tidak boleh membaca daftar seluruh pegawai.
