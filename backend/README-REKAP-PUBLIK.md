# Halaman Rekap Kinerja & Kedisiplinan tanpa login

Kartu **Rekap Kinerja & Kedisiplinan** di beranda membuka `#/rekap-publik`.
Alamat setelah deployment: https://bangdes-pkp-production.up.railway.app/#/rekap-publik

Halaman dapat dibuka langsung, di-refresh, dan dibagikan tanpa login. Ada tombol **Kembali ke Beranda**. Tautan lama `#/rekap` juga menampilkan rekap publik jika pengunjung belum login; bagi pengguna login, rute lama tetap membuka dashboard internal.

## Data publik

Halaman hanya-baca: nama, foto profil, SubUnit, statistik, dan peringkat terlihat tanpa login. Respons `rekap_bulanan_publik` tidak memuat NIP asli, PIN, nominal, ID/tautan bukti, atau rincian harian individu. Harian/dokumen diagregasi per SubUnit. Publik dan juara beranda membaca snapshot yang disimpan dan dipublikasikan admin, bukan bulan terbaru otomatis. Filter SubUnit tetap tersedia. Lihat `README-WRAP-BULANAN.md` untuk konfigurasi kunci admin dan alur Simpan → Tampilkan ke Publik.

Perubahan ini membatasi respons halaman publik, bukan mengganti sistem autentikasi seluruh API lama. Rute upload/edit pada frontend tetap meminta login seperti sebelumnya.

## Pemasangan

1. Cadangkan Apps Script, lalu ganti seluruh kode backend dengan `backend/Code.gs` terbaru.
2. **Deploy → Manage deployments → Edit (pensil) → New version → Deploy**, pada deployment web app yang sama.
3. Ikuti konfigurasi `WRAP_ADMIN_KEY`, deployment seluruh frontend/aset, dan publikasi pertama di `README-WRAP-BULANAN.md`. Frontend publik menolak respons live dari backend lama.
4. Setelah deployment selesai, uji dengan jendela privat/incognito: buka beranda, klik kartu rekap, ubah filter, lalu refresh halaman. Tidak boleh muncul formulir login.
5. Periksa rute absensi/upload pada jendela privat tetap meminta login.

`REKAP_WRAP_SNAPSHOT` dibuat saat simpan pertama. Sebelum dipublikasikan, publik menampilkan pesan kosong. Header Direktorat/logo/tautan kembali solid dan penuh selebar browser; banner beranda/judul ganda dihapus. Paling Tepat Waktu memakai kartu foto, lalu daftar Peringkat Kehadiran. Pengujian `tests/public-recap.html` tidak mengakses produksi.
