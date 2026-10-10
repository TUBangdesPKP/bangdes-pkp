# Penghitungan admin dan dokumen pendukung lainnya

Deploy versi baru `Code.gs` dahulu, kemudian frontend. Tidak ada migrasi atau perubahan nama otomatis terhadap file lama.

- Kartu Penghitungan admin dibuat lokal tanpa fetch status periode, pemeriksaan saat klik, atau refresh saat fokus jendela. Semua bulan langsung menuju tab 2. Backend tetap memverifikasi Admin untuk semua penulisan; pegawai tidak dapat mengedit.
- Tab 3 menerima drag-and-drop/pemilih banyak file PDF/JPG/PNG, maksimal 10 MB per file dan 10 dokumen tambahan aktif per pegawai/periode/modul. Batas juga diperiksa backend. SPT/Cuti tidak masuk kuota ini.
- Pilih kategori di kanan setiap file: Surat Lupa Absen, Surat Tugas Belajar, Dokumen Lainnya. Kategori awal kosong untuk mencegah salah jenis. Upload berjalan satu per satu; file berhasil dihapus dari antrean. File gagal mempertahankan ID permintaan agar retry tidak membuat salinan ganda. Kategori percobaan yang gagal dikunci sampai retry selesai.
- Nama server: `Jenis Surat_Nama_01_Bukti Dukung Tunjangan Kinerja.pdf` atau `Jenis Surat_Nama_01_Bukti Dukung Uang Makan.pdf`. Nama pegawai dari submisi tersimpan, ekstensi dipertahankan. Nomor urut bersama untuk ketiga jenis surat dalam satu submisi; nomor yang sudah dihapus tidak dipakai kembali.
- Tab 4 tetap menyimpan koreksi jam/tanggal dan menghitung rekap, tetapi **tidak mengganti nama file atau nama pada registry bukti**. Nama lama juga dibiarkan tetap.

Uji produksi setelah deployment: gunakan satu pegawai, upload dua jenis surat, cocokkan nama Drive dan daftar tab 3, lalu simpan adjustment tab 4 dan pastikan nama/ID bukti tidak berubah. Tidak ada upload atau perubahan data produksi yang dijalankan oleh pengujian lokal.
