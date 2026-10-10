# Sesi berbasis aktivitas (pegawai dan admin)

- Batas **6 jam tanpa aktivitas**, bukan 6 jam sejak login. Akun yang terus digunakan dapat tetap masuk lebih dari 6 jam.
- Mouse/pointer, keyboard, scroll/wheel, dan sentuhan pada tab terlihat memperbarui waktu aktivitas lokal. Heartbeat `aktivitas_sesi` dibatasi sekali per menit, ditambah sinkronisasi saat tab berubah visibilitas; dikirim hanya bila ada aktivitas yang belum tersinkron.
- Timer, polling data, respons unduhan dan tab yang sekadar terbuka tidak dianggap aktivitas. `activityAgeMs` menyatakan umur input terakhir sehingga heartbeat tidak menambahkan waktu diam sebagai aktivitas baru. Server menolak refresh pada token yang sudah kedaluwarsa.
- Frontend memeriksa idle setiap 15 detik, juga sebelum input dan saat kembali dari sleep/berpindah tab. Input pertama setelah idle >=6 jam tidak boleh menghidupkan sesi kembali. Aktivitas dan logout disinkronkan antar-tab melalui penyimpanan lokal; pergantian akun di tab lain tidak menghapus sesi akun baru.
- Metadata sesi disimpan privat dalam Script Properties dengan awalan `AUTH_SESSION_V2_`, memakai hash token, fingerprint PIN, dan waktu kedaluwarsa. CacheService tidak lagi menjadi satu-satunya penyimpanan sehingga eviksi cache tidak mengeluarkan pengguna lebih dini. Token asli tidak dicatat dalam properti. Bukan data publik atau kolom Data_Pegawai.
- Login membersihkan entri sesi kedaluwarsa; maksimum 1.000 sesi aktif menjaga penggunaan ruang properti. Sesi pengguna lain yang masih valid tidak dihapus. Semua login/refresh/logout diserialisasi dengan script lock.
- `keluar_sesi` mencabut token di server saat logout. Mengubah PIN membatalkan token lama, dan pemeriksaan Role Admin tetap menggunakan master pada tiap operasi berwenang. Error autentikasi memakai `code: SESSION_EXPIRED`; jaringan lambat/offline tidak otomatis dianggap sesi berakhir.

## Deployment

Deploy `backend/Code.gs` lalu frontend. Semua pengguna dengan sesi cache versi lama perlu **login ulang satu kali**; token lama/expired tidak dimigrasikan atau dihidupkan kembali dari timestamp browser. Heartbeat memerlukan koneksi; aktivitas selama offline lebih dari masa berlaku server tetap perlu login ulang. Tidak mengubah password/kunci publikasi Rekap Bulanan.

Referensi perilaku penyimpanan: [CacheService](https://developers.google.com/apps-script/reference/cache/cache) dan [Properties Service](https://developers.google.com/apps-script/guides/properties).

Pengujian simulasi: akun pegawai/admin aktif >8 jam, cache kosong, timeout tepat batas 6 jam, baca/polling tanpa renewal, fingerprint PIN, logout/revokasi, heartbeat terlambat, sleep/wake, storage antar-tab, input sintetis, pembatasan request, dan gangguan jaringan.
