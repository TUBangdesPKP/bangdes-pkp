# Aktivasi, role, dan kartu juara

## Sumber data dan publikasi

- Jabatan mengambil kolom **M (Jabatan)** pada `Data_Pegawai`. Jika ada beberapa header Jabatan, kolom M diprioritaskan. Pemetaan berdasarkan header tetap tersedia untuk format sheet lama yang belum mempunyai kolom M tersebut.
- Saat login, role mengambil kolom **D (Role/Akun_Role)**, bukan role dari browser. Akun non-admin masuk ke Profil Saya dan tidak melihat modul Rekap Bulanan. Membuka rute internal rekap secara langsung dengan akun non-admin juga menampilkan Profil Saya. Halaman wrap publik tetap dapat diakses semua pengunjung.
- Header publik tidak menampilkan chip bulan di samping filter. Tombol Direktorat menampilkan seluruh SubUnit; Rentek, Wilayah I–III, dan Tata Usaha menyaring unit terkait. Tombol unit yang belum ada dalam hasil tersimpan dinonaktifkan.
- Bar di bawah kartu juara menghitung komposisi **daftar juara yang benar-benar tampil**, bukan seluruh pegawai. Persentase = jumlah juara suatu unit / total juara yang ditampilkan.
- Snapshot lama mungkin belum memiliki `jabatan`. Setelah memasang backend/frontend terbaru, pilih bulan yang bersangkutan, tekan **Proses Rekap**, lalu **Publikasikan**. Tidak ada pembacaan data pegawai langsung dari halaman publik untuk mengisi snapshot lama secara diam-diam.

## Aktivasi pertama

Form pada halaman login hanya meminta NIP, Buat PIN, dan Konfirmasi PIN. Backend menerima `aktivasi_akun`, memeriksa NIP 18 angka yang sudah terdaftar dan PIN 6 angka dengan konfirmasi yang sama. Hanya kolom **E (PIN)** pegawai tersebut yang ditulis, sebagai teks agar nol depan tidak hilang.

Pemeriksaan dan penulisan berada dalam script lock yang sama. Jika PIN berisi apa pun, termasuk nilai numerik nol atau nilai tidak valid, tidak boleh ditimpa. Respons memunculkan pesan:

> Akun Sudah Aktif, Konfirmasi kepada Admin untuk akses login

Aktivasi tidak membuat baris pegawai baru, mengubah role, atau otomatis login. Setelah berhasil, pengguna dikembalikan ke form Masuk dengan NIP terisi. Jika koneksi terputus setelah penulisan, jangan mengosongkan PIN; coba login dengan PIN yang baru dibuat.

**Batas keamanan:** aktivasi NIP saja mengikuti permintaan, tetapi bukan verifikasi identitas. Orang lain yang mengetahui NIP kosong-PIN dapat mengklaim akun lebih dahulu. Untuk penggunaan yang membutuhkan verifikasi pemilik, tambahkan persetujuan admin atau OTP melalui kanal terverifikasi sebelum membuka aktivasi ke publik. Tidak ada akun/PIN asli yang diaktifkan dalam pengujian ini.

Pasang `Code.gs` ke deployment Apps Script yang sama lebih dahulu, lalu frontend. Perubahan lokal tidak otomatis memperbarui web app Apps Script ataupun Railway.
