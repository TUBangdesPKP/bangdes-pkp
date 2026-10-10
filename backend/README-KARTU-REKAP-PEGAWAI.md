# Kartu rekap pegawai (Uang Makan dan Tukin)

## Pemasangan

1. Salin `backend/Code.gs` terbaru ke project Apps Script yang sudah digunakan aplikasi.
2. **Deploy → Manage deployments → Edit → New version → Deploy**, gunakan URL Web App yang sama.
3. Baru deploy frontend terbaru. Pegawai yang sesinya berakhir perlu login kembali.

Tidak perlu memindahkan, menghapus, atau menghitung ulang spreadsheet lama.

## Perilaku

- Pegawai melihat 12 kartu Januari–Desember dan pemilih tahun. Setiap kartu selalu bisa dibuka langsung ke tab 5, tanpa pemeriksaan status buka/tutup. Tab 2–5 hanya baca; tab 2 dan 4 menampilkan presensi/penyesuaian tersimpan, tab 3 bukti dukung, tab 5 hasil akhir.
- Endpoint `rekap_pegawai_tahunan` membutuhkan sesi pegawai dan mengambil NIP dari sesi server. Respons hanya mencakup pegawai tersebut, tidak memuat data pegawai lain atau tautan spreadsheet.
- Nominal berasal dari `Hitung_Netto` dengan `Hitung_Status = Lengkap` pada baris submisi terbaru, bukan tarif terkini di Data_Pegawai. Angka nol yang benar tetap Rp0. Belum ada submisi, menunggu perhitungan, data belum lengkap, dan kegagalan permintaan dibedakan.
- Rentang Tukin mengikuti bulan pembayaran: November 2026 = 11 September–10 Oktober 2026. Uang Makan mengikuti bulan kalender.
- Pembacaan kartu tidak menulis data. Semua mutasi Uang Makan/Tukin kini memerlukan otorisasi admin server, termasuk upload tab 2, klaim/hapus bukti, proses, dan simpan final. Role yang dikirim browser tidak dipercaya. Unggahan arsip SPT/Cuti di luar rekap tidak diubah.
- Admin NIP memakai sesi dengan Role Admin pada Data_Pegawai. Admin lama memakai `WRAP_ADMIN_KEY` untuk pengelolaan; sesi PIN admin lama tetap hanya untuk membaca rekap. Admin terverifikasi dapat mengelola semua bulan tanpa status buka/tutup lama.
- Jika backend lama belum diperbarui atau permintaan nominal gagal, kartu tetap dapat diklik tetapi menampilkan kegagalan pemuatan nominal; tidak menyajikan Rp0 palsu.

## Cek setelah deployment

Login sebagai pegawai, cocokkan nominal satu bulan dengan tab 5 yang sudah disubmit. Bulan kosong bertuliskan **Belum ada data**. Coba pergantian tahun serta tab 2–4: tidak boleh ada tombol simpan/upload/hapus. Admin memiliki tujuh modul: Profil Saya, Rekap Bulanan, Penghitungan Uang Makan dan Tunjangan Kinerja, Rekap Uang Makan, Rekap Tunjangan Kinerja, Arsip Surat Tugas, Arsip Surat Cuti. Kedua modul Rekap pribadi tetap baca-saja bahkan untuk Role Admin. Penghitungan memakai filter Uang Makan/Tunjangan Kinerja di samping tahun, tanpa permintaan daftar status periode. Pengujian lokal memakai simulasi; tidak mengubah data produksi.
