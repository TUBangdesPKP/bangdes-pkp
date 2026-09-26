# Profil Saya dan rekap manual

## Pemasangan (backend dahulu, frontend sesudahnya)

1. Pada Apps Script **spreadsheet Kepegawaian asli**, perbarui `Kode.gs` dengan isi `backend/Code.gs`. Pertahankan konfigurasi ID dan Script Properties yang sudah ada.
2. Pastikan `Data_Pegawai` mempunyai header `NIP`, `PIN` di **E**, dan `Foto_Pegawai` (atau Foto/Foto_Profil/LinkFoto/URLFoto) di **AR**. Akun harus memiliki NIP unik. PIN berupa 6 angka; PIN angka lama dengan nol depan dibaca dengan padding.
3. Akun yang menjalankan web app harus dapat mengubah spreadsheet dan membuat file di folder foto `1DuhZWVr_T929P6mDac6SqLftUkZK5zEH`. Foto baru dibuat JPG/PNG maksimal 2 MB, diberi akses lihat melalui tautan agar dapat tampil di profil/rekap publik. URL di AR ditimpa; foto lama tidak dihapus.
4. Deploy → Manage deployments → edit deployment web app yang dipakai → **New version** → Deploy. Gunakan URL `/exec` yang sama. Simpan kode saja tidak memperbarui web app.
5. Deploy frontend setelah backend tersedia. Login ulang dengan NIP dan PIN pegawai untuk memperoleh sesi profil. Login pegawai sekarang diverifikasi backend; PIN tidak lagi dikirim melalui daftar pegawai, dan PIN universal `123456` tidak berlaku.

## Rekap

- Saat halaman dibuka/diganti bulan, hanya hasil **tersimpan** yang dibaca. Tidak ada timer 2 menit atau pemrosesan otomatis saat tab kembali aktif.
- **Proses Rekap** membaca spreadsheet rekap pegawai satu bulan kalender dan menyimpan hasil seluruh SubUnit. `WRAP_ADMIN_KEY` tetap diperlukan. Tidak perlu preview revision dari browser.
- `REKAP_WRAP_SNAPSHOT` menyimpan satu hasil terbaru per bulan/tahun, dalam beberapa potongan jika perlu. Pemrosesan ulang mengganti potongan bulan tersebut dan mengosongkan potongan lama/duplikat setelah hasil baru diverifikasi. Bulan lain tidak diubah.
- Kolom penyimpanan diformat teks; pembaca juga mendukung bulan lama yang terkonversi ke tanggal Sheets. Ini memperbaiki kegagalan validasi potongan akibat `yyyy-mm` bukan lagi string.
- **Publikasikan** + konfirmasi menyalin hasil tersimpan ke `REKAP_WRAP_PUBLIK`, lalu mengganti penunjuk publik. Hasil publik tetap stabil saat sumber atau draft berubah. Versi publik sebelumnya dibersihkan setelah penunjuk baru tersimpan.
- Snapshot lama tetap dapat dibaca. Publikasi lama yang masih menunjuk draft dipisahkan sebelum draft ditimpa. Jika snapshot lama benar-benar rusak, jangan hapus sheet/properties secara manual; periksa sumber dan proses ulang bulan tersebut.
- Rekap menampilkan foto saat proses dilakukan; perubahan foto memerlukan Proses Rekap dan Publikasikan ulang agar tampil pada snapshot publik.

## Profil dan keamanan

- Foto dan PIN hanya dapat diubah melalui sesi backend milik pegawai tersebut, bukan berdasarkan NIP/role kiriman browser.
- Sesi profil berlaku maksimal 30 menit dan dapat berakhir lebih awal jika cache Apps Script dibersihkan. Pengguna cukup login kembali.
- Form PIN meminta PIN lama, PIN baru, dan konfirmasi. PIN baru harus 6 angka, sama dengan konfirmasi, dan berbeda dari PIN lama. Lima PIN salah membatasi percobaan akun selama 15 menit.
- PIN tetap disimpan di kolom E sesuai permintaan. Sesudah perubahan PIN, sesi profil lainnya tidak berlaku lagi. Jangan membagikan spreadsheet kepegawaian atau editor Apps Script kepada publik karena PIN masih tersimpan pada sumber tersebut.
- Akun sintetis `SUPERADMIN` lama bukan baris `Data_Pegawai`; tidak dapat mengganti foto/PIN pegawai melalui menu ini. Gunakan akun NIP terdaftar. Mekanisme login admin lama tidak diganti oleh fitur ini; publikasi tetap dilindungi `WRAP_ADMIN_KEY`.

## Uji

`node --test backend/attachments.test.mjs tests/*.test.mjs`

`npm run build`

Simulasi UI tanpa akses backend produksi: `/tests/monthly-ui.html` dan `/tests/profile-ui.html`. Simulasi profil hanya-baca; pengujian perubahan PIN/foto memakai fixture backend lokal, bukan akun asli.
