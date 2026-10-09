# Rekap Cuti pada Kepegawaian

Menu baca-saja, tanpa mengubah arsip atau perhitungan presensi/uang makan/tukin.

## Pemasangan

1. Perbarui `backend/Code.gs` pada proyek Apps Script kepegawaian yang sudah dipakai.
2. Deploy → Manage deployments → Edit → New version → Deploy dengan URL `/exec` yang sama.
3. Deploy frontend, lalu buka Kepegawaian → Rekap Cuti. Git push frontend tidak memperbarui Apps Script.

## Sumber dan perhitungan

- Nama, NIP, subunit dan urutan pegawai mengikuti `Data_Pegawai`.
- Endpoint `rekap_cuti_kepegawaian` membaca `REKAP_CUTI` A:I dan hanya mengirim agregat NIP, jenis cuti, tahun, serta jumlah hari. Tanggal, alasan dan tautan surat tidak dikirim ke halaman publik ini.
- Hari dijumlahkan dari `Jumlah Hari Cuti` (G), bukan dihitung ulang dari rentang tanggal. Semua catatan arsip aktif dihitung; cadangan arsip terhapus tidak disertakan.
- Filter tahun mengikuti nilai kolom `Tahun` (I). Termasuk untuk cuti lintas tahun: seluruh jumlah hari mengikuti tahun yang tercatat, bukan dibagi atau ditebak dari tanggal. Bawaan Semua tahun; tahun kosong/tidak valid tersedia terpisah agar tidak hilang diam-diam.
- Tiga kolom dasar: Cuti Tahunan, Cuti Sakit, Cuti Karena Alasan Penting. Jenis lain muncul otomatis, ejaan kapital/spasi umum diseragamkan. Jenis kosong ditampilkan sebagai Jenis belum diisi.
- NIP tidak valid atau jumlah hari kosong/tidak valid tidak dihitung; peringatan ditampilkan. NIP yang tidak ditemukan pada master juga ditandai sebagai belum cocok, tanpa menebak nama.
- Pegawai tanpa catatan cuti bernilai 0. Ini rekap arsip yang tersimpan, bukan sisa hak cuti tahunan, bukan persetujuan otomatis, dan bukan bukti seluruh data historis sudah lengkap.
- Filter subunit dan pencarian nama/NIP tetap mempertahankan urutan master; nomor tampilan mulai dari 1 mengikuti hasil filter.
- Jika sumber gagal dimuat, halaman menampilkan error, bukan mengubah seluruh hasil menjadi 0. Tidak ada fallback publik yang membocorkan rincian surat.

## Pengujian

`node --test backend/*.test.mjs tests/*.test.mjs`

`npm run build`

Tes backend menggunakan spreadsheet tiruan; tidak menulis/menghapus data produksi.
