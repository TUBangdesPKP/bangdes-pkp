# Folder PNS / PPPK dan migrasi lama

## Unggahan baru

Backend membaca `Data_Pegawai.Jenis_ASN` (kolom H) berdasarkan NIP tepat; nama hanya fallback bila NIP tidak diberikan. Nilai harus PNS/PPPK. Data kosong/tidak dikenal/ganda ditolak sebelum membuat folder, tidak mengikuti jenis ASN dari browser.

```text
BUKTI_UANG_MAKAN / Uang Makan_08_Agustus / PNS atau PPPK / Nama pegawai
BUKTI_TUNJANGAN_KINERJA / Tunjangan Kinerja_10_Oktober / PNS atau PPPK / Nama pegawai
```

Submisi yang sudah ada tetap memakai folder ID tercatat. Arsip SPT/Cuti asli tidak diubah.

## Migrasi terbatas — belum dijalankan pada Drive produksi

Target hanya Uang Makan **01-08-2026 s/d 31-08-2026** dan Tukin Oktober **11-08-2026 s/d 10-09-2026**, sesuai pemetaan bulan bayar aplikasi. Status setiap pegawai diverifikasi PNS.

Folder pegawai dipindahkan utuh, bukan disalin/dibuat ulang: ID folder/file, spreadsheet, catatan, bukti dan tautan tetap sama. Memakai [Folder.moveTo](https://developers.google.com/apps-script/reference/drive/folder#movetodestination). Izin turunan dapat mengikuti induk baru; periksa akses setelah pindah.

### Langkah pemilik Apps Script

1. Cadangkan kode dan spreadsheet master. Pasang seluruh `Code.gs` terbaru. Migrasi hanya tersedia di editor, tidak pada endpoint publik.
2. Pilih **previewMigrasiFolderPNS2026 → Run**, buka **Execution log**. Ini hanya membaca, belum membuat/memindahkan folder.
3. Periksa `items` (nama, modul, periode, folderId, induk/tujuan), jumlah target, `ready: true`, dan `errors: []`. Bila error, perbaiki sumber yang dilaporkan lalu ulangi preview; jangan lanjut.
4. Salin `revision` hasil preview. Tambahkan Script Property **MIGRASI_PNS_2026_REVISI** dengan nilai tersebut melalui **Project Settings → Script Properties**. Ini mengikat eksekusi pada target yang diperiksa, bukan kunci publikasi rekap.
5. Pilih **jalankanMigrasiFolderPNS2026 → Run**. Fungsi memeriksa ulang target, menggunakan lock, lalu melaporkan `moved`, `already`, dan `failed`.
6. Pastikan `failed` kosong. Buka tautan lama kolom I/J, daftar bukti, dan preview satu pegawai tiap modul. Tidak perlu mengganti tautan master.
7. Bila sebagian gagal karena Drive/kuota, yang sudah pindah dipertahankan. Ulangi preview, periksa, perbarui `MIGRASI_PNS_2026_REVISI`, lalu jalankan lagi. Yang sudah di PNS dilewati tanpa duplikasi.

Pengaman: menolak folder di luar struktur tepat, dipakai pegawai/periode lain, status bukan PNS, tujuan ganda/berbenturan, atau revisi berubah. Tidak ada penggabungan folder, penghapusan, atau penulisan ulang rekap/registri. `fromParentId` dalam laporan bisa dipakai pemilik Drive untuk mengembalikan lokasi secara manual bila perlu.

## Header arsip dan foto

Header SPT/Cuti memakai banner solid di atas area kerja, terpisah dari konten bergulir, tanpa sticky bermargin negatif. Foto bank pegawai/podium memakai bingkai utuh tanpa opacity/cropping, fallback thumbnail lalu ikon. Sharing foto tidak diubah otomatis.
