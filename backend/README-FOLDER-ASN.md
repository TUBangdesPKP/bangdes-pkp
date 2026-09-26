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

### Langkah pada spreadsheet Kepegawaian asli

Tahap **2 dan seterusnya wajib dilakukan dari project Apps Script milik spreadsheet Kepegawaian asli**, bukan dari spreadsheet salinan, file uji, atau project Apps Script lain. Buka spreadsheet Kepegawaian asli dengan ID `1bIQbiWAQ67TYFmvb3WZkvjJaN1moP1fQlmegsFZJWfI`, lalu pilih **Ekstensi → Apps Script**. Pastikan project tersebut berisi `Code.gs` terbaru dan konstanta `TARGET_SPREADSHEET_ID` menunjuk ke ID yang sama sebelum menjalankan fungsi apa pun.

1. Cadangkan kode Apps Script dan spreadsheet Kepegawaian asli. Pasang seluruh `Code.gs` terbaru pada project Apps Script spreadsheet tersebut. Migrasi hanya tersedia di editor Apps Script, tidak pada endpoint publik.
2. Dari editor Apps Script yang dibuka melalui spreadsheet Kepegawaian asli, pilih **previewMigrasiFolderPNS2026 → Run**, lalu buka **Execution log**. Ini hanya membaca data spreadsheet asli dan struktur Drive; belum membuat atau memindahkan folder.
3. Masih pada project Apps Script spreadsheet asli, periksa `items` (nama, modul, periode, folderId, induk/tujuan), jumlah target, `ready: true`, dan `errors: []`. Bila ada error, perbaiki sumber pada spreadsheet/Drive asli yang dilaporkan, lalu ulangi preview; jangan lanjut ke eksekusi.
4. Di **Execution log**, cari baris pendek `revision: ...` yang muncul sebelum daftar folder. Salin hanya teks setelah `revision:`. Pada project Apps Script spreadsheet asli, buka **Project Settings → Script Properties**, lalu tambahkan **MIGRASI_PNS_2026_REVISI** dengan nilai tersebut. Ini mengikat eksekusi pada target yang baru diperiksa, bukan kunci publikasi rekap. Kode terbaru mencetak `ready`, `jumlah item`, `jumlah error`, serta setiap folder/error di baris tersendiri agar nilai revision tidak terpotong bersama daftar panjang. Bila masih muncul `Logging output too large` pada satu JSON besar, fungsi preview di editor masih versi lama.
5. Dari editor Apps Script spreadsheet asli yang sama, pilih **jalankanMigrasiFolderPNS2026 → Run**. Fungsi memeriksa ulang target, menggunakan lock, lalu melaporkan `moved`, `already`, dan `failed`.
6. Pada spreadsheet Kepegawaian asli, pastikan `failed` kosong. Buka tautan lama pada kolom I/J, daftar bukti, dan preview satu pegawai tiap modul. Tidak perlu mengganti tautan master karena ID folder dan file dipertahankan.
7. Bila sebagian gagal karena Drive/kuota, folder yang sudah berpindah dipertahankan. Dari project Apps Script spreadsheet asli, ulangi preview, periksa hasilnya, perbarui **MIGRASI_PNS_2026_REVISI**, lalu jalankan lagi. Folder yang sudah berada di bawah PNS dilewati tanpa duplikasi.

Pengaman: menolak folder di luar struktur tepat, dipakai pegawai/periode lain, status bukan PNS, tujuan ganda/berbenturan, atau revisi berubah. Tidak ada penggabungan folder, penghapusan, atau penulisan ulang rekap/registri. `fromParentId` dalam laporan bisa dipakai pemilik Drive untuk mengembalikan lokasi secara manual bila perlu.

## Header arsip dan foto

Header SPT/Cuti memakai banner solid di atas area kerja, terpisah dari konten bergulir, tanpa sticky bermargin negatif. Foto bank pegawai/podium memakai bingkai utuh tanpa opacity/cropping, fallback thumbnail lalu ikon. Sharing foto tidak diubah otomatis.
