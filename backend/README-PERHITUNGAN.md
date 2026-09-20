# Perhitungan tab 4 dan tab 5 — 20 September 2026

Perubahan ini berada di frontend dan seluruh `backend/Code.gs`. Tidak perlu membuat sheet baru secara manual. Pengujian lokal memakai data simulasi, bukan menulis spreadsheet/Drive produksi.

## Cara menerapkan

1. Cadangkan kode Apps Script dan spreadsheet Kepegawaian.
2. Buka `D:/bangdes-pkp/backend/Code.gs` di VS Code. Salin seluruh isinya.
3. Buka proyek Google Apps Script yang dipakai aplikasi. Ganti seluruh isi Code.gs, jangan menambahkan di bawah kode lama. Simpan.
4. Pilih **Deploy → Manage deployments → pensil/Edit → Version: New version → Deploy**. Gunakan deployment yang sama agar URL `/exec` tidak berubah.
5. Buka URL Web App ditambah `?action=health`. Pastikan `backendVersion` adalah `2026-09-20-attendance-payroll`. Jika URL berubah, perbarui APPS_SCRIPT_URL di `D:/bangdes-pkp/src/App.jsx`.
6. Di terminal VS Code pada folder `D:/bangdes-pkp`, jalankan:

   ```powershell
   node --test backend/attachments.test.mjs tests/existing-status.test.mjs tests/process-recovery.test.mjs
   npm run build
   git status
   git add .
   git commit -m "Tambahkan jam kerja dan perhitungan uang makan serta tukin"
   git push
   ```

   Periksa `git status` dahulu agar perubahan lain yang tidak diinginkan tidak ikut commit. File pengujian boleh ikut repository, tetapi bukan kode yang dijalankan di Apps Script.

7. Tunggu deployment Railway selesai, lalu refresh halaman. Untuk submisi lama, klik **Muat ulang daftar** di tab 3 lalu **Lanjut Proses** bila diminta. Revisi backend baru memerlukan satu proses ulang pertama kali.
8. Pada tab 4 pilih jam kerja per tanggal, selesaikan konflik bila ada, centang persetujuan, lalu klik **Lanjutkan Perhitungan**.
9. Periksa tab 5, spreadsheet pegawai, sheet REKAP_UANG_MAKAN/REKAP_TUKIN, dan tautan file catatan. Uji satu pegawai dahulu dan cocokkan hitungan manual sebelum dipakai untuk pembayaran.

## Tarif dari Data_Pegawai

Pencocokan memakai NIP; nama hanya dipakai bila NIP tidak tersedia. NIP yang tidak ditemukan atau duplikat menghasilkan pesan, bukan memilih pegawai sembarang. Data dibaca langsung oleh backend saat konfirmasi tab 4, bukan dari cache browser atau nilai nominal kiriman frontend.

| Kolom saat ini | Judul kolom | Pemakaian |
| --- | --- | --- |
| Q | Besaran Tunjangan Kinerja | Nominal Tukin dasar |
| S | Persentase SKP | Persentase capaian SKP |
| T | Besaran Uang Makan | Tarif per hari masuk |
| U | Potongan Uang Makan | Persentase potongan uang makan |

Header dicocokkan tanpa membedakan spasi, baris baru, atau huruf besar/kecil sehingga kolom tetap terbaca bila dipindahkan. **R / Nilai SKP tidak digunakan sebagai persentase.** Persentase bertipe angka dengan format `%`, teks `100%`, dan angka `100` (poin persentase) didukung. Jangan menyimpan `0,15` tanpa format persen jika yang dimaksud 15%.

Tarif kosong/invalid bukan nol. Tab 5 menampilkan **Belum dapat dihitung** serta nama input yang perlu diperbaiki; tombol Selesai tidak aktif. Angka nol yang sengaja diisi tetap sah. Setelah memperbaiki Data_Pegawai, kembali tab 4, konfirmasi, dan hitung lagi untuk mengambil tarif terbaru.

## Aturan jam dan perhitungan

- Setiap tanggal default **Jam Kerja Biasa**, bisa diubah menjadi **Jam Kerja Ramadan**. Pilihan tersimpan pada metadata spreadsheet rekap; kembali antartab tanpa perubahan memakai cache. Mengubah pilihan atau konflik membatalkan persetujuan dan hasil tab 5 lama sampai dihitung ulang.
- Biasa: masuk 07:30, pulang 16:00 Senin–Kamis atau 16:30 Jumat. Ramadan: masuk 08:00, pulang 15:00 Senin–Kamis atau 15:30 Jumat.
- Kedatangan setelah jam masuk sampai 60 menit dihitung **hari flexi**. Pengganti pulang = keterlambatan terhadap jam masuk, maksimal 60 menit. Contoh Senin biasa datang 09:00 tetap wajib pulang 17:00, bukan 17:30. Kedatangan lebih dari 60 menit masuk hitungan hari terlambat, tidak dihitung lagi sebagai hari flexi.
- Biasa TL1 08:31–09:00; TL2 09:01–09:30; TL3 mulai 09:31. Ramadan TL1 09:01–09:30; TL2 09:31–10:00; TL3 mulai 10:01. Potongan masing-masing 0,5%; 0,75%; 1,25%.
- PSW dibandingkan dengan jam pulang wajib setelah pengganti flexi: 1–30 menit = PSW1/0,5%; 31–60 = PSW2/0,75%; 61–90 = PSW3/1%; ≥91 = PSW4/1,25%.
- Tidak absen datang = TL3/1,25% dan 240 menit. Tidak absen pulang = PSW4/1,25% dan 240 menit. Keduanya kosong = total 2,5%, 480 menit konversi, tidak dihitung Masuk Kerja dan tidak mendapat uang makan. Satu presensi yang ada tetap dihitung hari masuk, dengan potongan untuk presensi yang kosong.
- Ketelitian jam adalah menit, sesuai batas yang diberikan. Menit terlambat = kelebihan setelah batas flexi 60 menit. Menit tanpa presensi dipisahkan dari menit TL/PSW aktual agar tidak dijumlah dua kali.
- Hanya WFO/WFA/WFH nonlibur yang dihitung TL/PSW/flexi. Dinas/SPT, semua Cuti, TB/Tugas Belajar, dan Libur tidak dikenakan TL/PSW. Keterangan lain yang belum diberi aturan ditandai perlu penyesuaian, bukan otomatis diberi nominal.
- Hari kerja = semua tanggal nonlibur dalam hasil bacaan, termasuk Dinas/Cuti/TB. Masuk Kerja = WFO/WFA/WFH nonlibur dengan setidaknya satu presensi.
- Uang Makan bruto = Masuk Kerja × tarif T. Potongan = bruto × persentase U. Netto = bruto − potongan.
- Persentase potongan Tukin = 70% × (100% − SKP S) + 30% × jumlah potongan absensi harian. Potongan rupiah = Tukin Q × persentase potongan. Netto = Tukin Q − potongan. Akumulasi absensi >100% ditandai perlu pemeriksaan, tidak diterapkan batas otomatis tanpa aturan.
- Potongan rupiah dibulatkan ke rupiah terdekat. Persentase gabungan ditampilkan sampai 3 desimal agar formula dan nominal bisa dicocokkan.

Contoh: SKP 100%, Tukin Rp6.349.000, total TL/PSW 1,25% → bobot absensi 0,375% → potongan Rp23.809 → diterima Rp6.325.191. Contoh uang makan 2 hari × Rp37.000 dengan potongan 5% → bruto Rp74.000 → diterima Rp70.300.

## Penulisan spreadsheet

Pada spreadsheet rekap per pegawai, baris presensi tetap mulai baris 6. Jam datang/pulang dan snapshot tab 2 tidak diubah. Penanda `v` dan total penanda ditulis pada:

| Kolom | Kondisi |
| --- | --- |
| F | WFO/WFA/WFH |
| K | Dinas/SPT |
| M | TB/Tugas Belajar |
| N | Cuti |
| O | Libur |
| P | Semua nonlibur, termasuk Dinas/Cuti/TB |

Penanda F menyatakan kategori WFO/WFA/WFH; jumlah **hari dibayar** tetap mengecualikan kedua presensi kosong. Kolom di luar F/K/M/N/O/P/V tidak ditimpa. Warna baris mengikuti keterangan, dan Sabtu/Minggu/Libur tetap Libur.

Pada **REKAP_UANG_MAKAN dan REKAP_TUKIN**, backend menambahkan kolom berawalan `Hitung_` setelah kolom yang sudah ada (paling awal K). Ini berisi jumlah masuk/hari kerja/Dinas/Cuti/TB/Libur/flexi/TL/PSW, menit, tarif, SKP, potongan dan netto. Kolom A:J lama dipertahankan. Persentase pada kolom berakhiran `_Persen` adalah angka poin persentase, misalnya `0.5` berarti 0,5%. Jangan memformat kolom tersebut sebagai pecahan persen tanpa membagi nilainya dengan 100.

Tambahan `Catatan_Perhitungan_FileId` dan `Catatan_Perhitungan_URL` melacak file `.txt` di folder pegawai yang sama dengan rekap. File mencatat tanggal, jam kerja, jam asli, jam pulang wajib, TL/PSW, persentase, ringkasan, dan sumber tarif. Hitung ulang memperbarui **ID file yang tercatat**, bukan mencari dan menimpa berdasarkan nama. File yang dipindahkan ke folder lain ditolak untuk ditimpa. Arsip SPT/Cuti tidak dihapus/diubah oleh perhitungan.

Perubahan klaim atau penggantian tab 2 mengosongkan hasil `Hitung_` lama dan menandai **Menunggu perhitungan ulang**. File catatan terakhir masih ada sampai hitung ulang; status master adalah acuan apakah perhitungan sudah terkini. Tidak ada migrasi massal atau penghapusan file produksi otomatis.

## Pemeriksaan lokal

- Uji backend: batas menit TL/PSW kedua jadwal, Jumat, flexi maksimal, tanpa presensi, pengecualian, tarif/format persen, nol vs kosong, ID file catatan, scope NIP/modul/periode, dan revisi klaim.
- Simulasi tampilan: `/tests/final-ui.html` untuk Tukin; tambahkan `?meal=1` untuk Uang Makan. Semua request pada simulasi dimock dan tidak mengubah Drive.
- Uji alur/cache: `/tests/submission-flow.html`. Uji respons 404: tambahkan `?lostResponse=1`.
- Pengujian lokal tidak menggantikan uji satu submisi di deployment Apps Script sesudah penerapan.
