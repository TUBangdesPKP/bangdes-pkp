# Agenda beranda

Beranda menampilkan agenda harian Google Calendar di kiri dan juara rekap di kanan. Tanggal awal mengikuti WIB. Pengunjung dapat memilih tanggal, kembali ke hari ini, dan memuat ulang. Tabel bergulir vertikal setelah 520 px; layar sempit dapat menggulir tabel secara horizontal. Tidak ada baris kosong buatan atau batas jumlah agenda/lampiran di antarmuka.

## Sumber dan pencocokan

- Calendar tetap: `tubangdespkp@gmail.com`, sesuai tautan kalender yang diberikan. Semua halaman hasil Calendar dibaca, termasuk kejadian berulang dan acara sepanjang hari. Acara dibatalkan tidak ditampilkan.
- Spreadsheet publik: [JADWAL DIR. BANGDES](https://docs.google.com/spreadsheets/d/e/2PACX-1vThPxE5x03a5bSMlq23PaYCAOMPDKf8fI7UIv_Es3CjI7sd04vaYZbDsciZ2AMtRTIaCUurTfVA2iM2/pubhtml?gid=470452082&single=true).
- Kolom A = tanggal, D = waktu, E = tempat, F = agenda rapat, G = Disposisi. Tanggal kosong pada baris lanjutan mengikuti tanggal kelompok sebelumnya (sel gabungan).
- Calendar menentukan jumlah, urutan, waktu, judul, lokasi, serta lampiran. Disposisi diambil dari G dengan tanggal mulai acara dan judul yang sama, mengabaikan kapitalisasi, spasi, dan tanda baca. Jika judul berulang, jam mulai harus mengidentifikasi satu baris secara unik. Lokasi dari E hanya menjadi cadangan bila lokasi Calendar kosong dan baris sudah cocok.
- Acara tanpa pasangan atau pasangan ambigu tetap tampil, tetapi Disposisi tidak ditebak. Jika judul diubah di salah satu sumber saja, samakan kembali judulnya agar cocok.
- Tombol file berasal dari lampiran Calendar serta tautan Drive/deskripsi pada bagian `Link Dokumen / Undangan:` atau `Lampiran:`. Lampiran yang sama digabung menurut ID Drive. Setiap file dibuka sendiri pada tab baru; tidak membuka banyak tab sekaligus.
- Respons publik tidak memuat daftar tamu, email peserta, respons undangan, deskripsi mentah, maupun kredensial. Pemilik telah menyetujui agenda dan tautan file tampil umum. Tidak ada perubahan izin Calendar/Drive. File yang belum dibagikan tetap mengikuti izin akses Drive ketika dibuka.

## Mengaktifkan pada Apps Script asli

1. Perbarui `Code.gs` di project Apps Script spreadsheet kepegawaian dengan kode repo ini. Tidak perlu membuat sheet baru atau mengubah spreadsheet agenda.
2. Di editor Apps Script, sebelah **Services / Layanan**, klik **+**, pilih **Google Calendar API**, versi **v3**, identifier **Calendar**, lalu **Add / Tambahkan**. Ini layanan lanjutan, bukan hanya `CalendarApp`.
3. Akun pemilik deployment harus memiliki akses membaca rincian kalender `tubangdespkp@gmail.com`. Jalankan fungsi **periksaKoneksiAgendaDashboard** dari editor dan selesaikan otorisasi Google sendiri. Fungsi ini hanya membaca data dan mencatat tanggal, jumlah agenda, serta peringatan; tidak membuat/mengubah acara atau file.
4. Jika project memakai project Google Cloud standar, aktifkan juga Google Calendar API di project Cloud tersebut. Bila manifest sudah mengatur `oauthScopes` secara eksplisit, tambahkan `https://www.googleapis.com/auth/calendar.readonly` sambil mempertahankan seluruh scope lama. Jangan mengganti manifest proyek secara keseluruhan.
5. Perbarui deployment Web App ke versi baru dengan URL `/exec` yang sama. Eksekusi sebagai pemilik deployment agar pengunjung tidak perlu login Google untuk membaca agenda. Pertahankan pengaturan lain yang sudah digunakan aplikasi.
6. Build/deploy frontend. Buka beranda, pilih tanggal yang memiliki acara, lalu cocokkan jumlah agenda, Disposisi, dan seluruh lampiran dengan Calendar/spreadsheet. Cache backend bertahan paling lama 120 detik (30 detik saat spreadsheet gagal). Tombol muat ulang tidak melewati cache tersebut.

Jika Calendar gagal/izin belum lengkap, UI menampilkan kegagalan pemuatan, bukan `0 agenda`. Jika hanya spreadsheet gagal, agenda tetap tampil dengan peringatan Disposisi. Endpoint publik tidak menerima URL/ID sumber dari pengunjung.

Referensi resmi: [Advanced Calendar service](https://developers.google.com/apps-script/advanced/calendar), [Events.list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list), [Attachments pada Events](https://developers.google.com/workspace/calendar/api/v3/reference/events).

## Verifikasi lokal

```powershell
node --test backend/*.test.mjs tests/*.test.mjs
node node_modules/vite/bin/vite.js build
```

`tests/dashboard-agenda.html` memakai data simulasi, tidak mengirim permintaan ke backend produksi. Skenario tanggal 3 kosong, tanggal 4 gagal, tanggal 5 Disposisi gagal, tanggal 6 respons lambat untuk memeriksa pergantian tanggal. Hari lain berisi delapan acara dengan beberapa lampiran.
