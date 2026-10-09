# Perhitungan hari cuti manual dan otomatis

- Rentang awal/akhir tetap sesuai surat. Jumlah hari dihitung dari hari kerja dalam rentang, tanpa Sabtu–Minggu, libur nasional, dan cuti bersama.
- Jumlah hari hasil OCR/Bab IV tetap ditampilkan sebagai referensi; tidak menggantikan jumlah hari kerja yang dikirim untuk disimpan.
- Backend menghitung ulang jumlah hari dan menulis tanggal kerja yang sama ke kolom tanggal arsip. Angka dari browser tidak dipercaya sebagai jumlah final. Rentang tanpa hari kerja ditolak sebelum file dibuat.
- Daftar bawaan frontend/backend mencakup libur nasional dan cuti bersama 2026, serta daftar 2027 yang sebelumnya ditambahkan. Preview manual dan otomatis memuat kalender melalui endpoint baca-saja `kalender_cuti`, termasuk tanggal tambahan dari tab `HARI_LIBUR` pada master kepegawaian. Endpoint hanya mengembalikan tanggal, tanpa identitas pegawai atau keterangan internal.
- Saat kalender belum dimuat atau gagal dimuat, jumlah preview ditandai “Menunggu kalender” dan submit cuti dinonaktifkan. Tombol Muat ulang kalender memungkinkan mencoba kembali. Jangan deploy frontend sebelum Apps Script diperbarui.
- Arsip lama tidak dihitung ulang atau diubah massal oleh perbaikan ini. Jika perlu memperbaiki arsip tertentu, periksa lalu unggah ulang dokumen pada NIP, rentang, dan jenis cuti yang sama menggunakan alur aplikasi.
- SPT tetap menghitung hari kalender seperti sebelumnya.

## Contoh regresi

26 Mei–2 Juni 2026 menjadi **3 hari**: 26 Mei, 29 Mei, 2 Juni.
27 Mei (Idul Adha), 28 Mei (cuti bersama), 30–31 Mei (akhir pekan/Waisak), dan 1 Juni (Pancasila) tidak dihitung.

Sumber tanggal 2026: https://kemenkopmk.go.id/pemerintah-tetapkan-17-hari-libur-nasional-dan-8-hari-cuti-bersama-tahun-2026

## Pemasangan

1. Perbarui `Code.gs` di proyek Apps Script yang sama dan deploy **New version**, tetap memakai URL `/exec` yang sama.
2. Deploy frontend hasil build terbaru.
3. Baca ulang dokumen atau isi ulang rentang manual. Pastikan contoh di atas tampil 3 hari sebelum submit.

Pengujian menggunakan spreadsheet/Drive tiruan; tidak menulis data produksi.
