# Halaman Rekap Kinerja & Kedisiplinan tanpa login

Kartu **Rekap Kinerja & Kedisiplinan** di beranda membuka `#/rekap-publik`.
Alamat setelah deployment: https://bangdes-pkp-production.up.railway.app/#/rekap-publik

Halaman dapat dibuka langsung, di-refresh, dan dibagikan tanpa login. Ada tombol **Kembali ke Beranda**. Tautan lama `#/rekap` juga menampilkan rekap publik jika pengunjung belum login; bagi pengguna login, rute lama tetap membuka dashboard internal.

## Data publik

Halaman hanya-baca: tidak menyediakan upload, hapus, edit presensi, atau perhitungan pembayaran. Nama, SubUnit, statistik, dan peringkat kedisiplinan akan terlihat oleh pengunjung tanpa login. Respons khusus `rekap_bulanan_publik` tidak menyertakan NIP asli, foto, PIN, nominal gaji, ID/tautan berkas, atau rincian harian yang dihubungkan ke individu. Statistik harian dan dokumen diagregasi per SubUnit. Filter bulan, modul, dan SubUnit tetap tersedia.

Perubahan ini membatasi respons halaman publik, bukan mengganti sistem autentikasi seluruh API lama. Rute upload/edit pada frontend tetap meminta login seperti sebelumnya.

## Pemasangan

1. Cadangkan Apps Script, lalu ganti seluruh kode backend dengan `backend/Code.gs` terbaru.
2. **Deploy → Manage deployments → Edit (pensil) → New version → Deploy**, pada deployment web app yang sama.
3. Deploy perubahan frontend `src/App.jsx` dan `src/monthly-recap.jsx` melalui alur Git/Railway biasa. Jangan melewatkan backend karena ada action publik baru.
4. Setelah deployment selesai, uji dengan jendela privat/incognito: buka beranda, klik kartu rekap, ubah filter, lalu refresh halaman. Tidak boleh muncul formulir login.
5. Periksa rute absensi/upload pada jendela privat tetap meminta login.

Tidak ada sheet baru atau migrasi data untuk perubahan ini. Angka dashboard berasal dari konfirmasi tab 4 yang sudah tersimpan, sama seperti sebelumnya. Pengujian lokal memakai `tests/public-recap.html`; tidak mengakses backend produksi.
