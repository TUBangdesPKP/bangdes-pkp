# Rekap submisi Uang Makan dan Tukin

## Penerapan

1. Perbarui `Code.gs` pada project Apps Script spreadsheet kepegawaian asli, lalu perbarui versi deployment Web App yang digunakan frontend.
2. Deploy frontend terbaru. Tidak perlu menghapus spreadsheet maupun file presensi lama.
3. Pilih bulan di tab 1. Tab 2 menampilkan seluruh pegawai master, dipisah PNS/PPPK, abjad kiri-ke-kanan dalam enam kolom desktop. Klik nama untuk membuka tab 3. Jumlah centang hijau PNS, PPPK, dan total ada di kanan.
4. Masukkan kunci dan verifikasi di server sebelum **Buat Rekapan PNS & PPPK** aktif. Hanya hasil lengkap yang sudah disubmit ikut diekspor. Rekap periode yang sama diperbarui dalam file yang sama, sehingga ID/link tetap.

Admin berdasarkan Role pada Data_Pegawai memakai sesi login server. Akun Super Admin sintetis/lama yang belum mempunyai sesi memakai `WRAP_ADMIN_KEY` yang sama dengan publikasi wrap, bukan PIN login. Kunci tidak disimpan ke localStorage. Sesi yang kedaluwarsa memerlukan login ulang.

## Pilihan bulan/tahun dan akses submisi

Admin memakai halaman **Penghitungan Uang Makan dan Tunjangan Kinerja**, dengan filter jenis dan tahun. Dua belas kartu langsung tersedia tanpa fetch status periode. **Pilih & Lanjut** membuka tab 2. Admin terverifikasi dapat mengelola semua bulan, terlepas dari flag status lama di Script Properties; API status lama dipertahankan untuk kompatibilitas tetapi tidak lagi membatasi penghitungan.

Alur admin memiliki enam tab: **Bulan → Pegawai → Presensi → Bukti Dukung → Preview/penyesuaian → Hasil & Submit**. Rekap pribadi tetap lima tab baca-saja. Pemilih tahun menggunakan dropdown berlabel **Pilih Tahun**; mengganti tahun langsung mengganti kartu tanpa tombol Tampilkan.

Pada tab 3, `presensi_tersimpan` memuat baseline hasil bacaan untuk NIP, modul, dan periode yang dipilih. Ini bukan mengunggah ulang PDF asli. **Ubah file presensi** membuka picker/drag-and-drop satu PDF/XLSX/XLS. **Batal mengganti file** mengembalikan preview tersimpan. NIP file harus sama dengan kartu pegawai.

Pemeriksaan tanggal tidak lagi memangkas baris di luar periode atau menerima toleransi 10 hari. Setiap tanggal kalender dalam periode harus hadir tepat sekali, termasuk Sabtu/Minggu/libur. Jumlah terbaca ditampilkan terpisah dari jumlah yang diharapkan. Frontend dan backend menolak data hilang, ganda, atau di luar periode sebelum penyimpanan. Presensi lama yang tidak lengkap perlu diunggah ulang sebelum disubmit kembali. Upload pendukung lainnya, SPT, dan Cuti pada tab 4 mulai dalam keadaan tertutup.

`list_pegawai_submisi`, `presensi_tersimpan`, dan `validasi_kunci_rekap` memerlukan sesi Admin yang diverifikasi server. Kunci rekap selalu diperiksa lagi saat membuat ekspor. Proses ini tidak menyimpan password di localStorage.

Alur enam tab menulis `Submit_Status = Menunggu submit` ketika hasil perhitungan disimpan. **Selesai & Submit** di tab 6 memanggil `submit_rekap_final`, memeriksa revision dan kelengkapan hasil, lalu menyimpan `Disubmit`. Sebelum tahap ini, kartu tetap silang dan hasil tidak ikut ekspor/nominal kartu pribadi. Hasil lama tanpa kolom/status ini tetap diakui berdasarkan `Hitung_Status = Lengkap`; tidak memerlukan submit ulang massal. Perubahan presensi/bukti membatalkan kelengkapan sampai diperiksa dan disubmit kembali.

Rekap pribadi terpisah untuk semua pegawai, termasuk yang memiliki Role Admin: kartu nominal membuka tab 5 dan tab 2–5 selalu baca-saja. Bulan kosong bertuliskan **Belum ada data**. Lihat [kartu rekap pegawai](README-KARTU-REKAP-PEGAWAI.md) dan [upload pendukung](README-UPLOAD-PENDUKUNG.md).

Deploy backend sebelum frontend. Uang Makan mengikuti bulan kalender; Tukin memakai bulan pembayaran (Januari 2027 = presensi 11 November–10 Desember 2026).

Folder baru selain tahun 2026 diberi akhiran tahun, misalnya `Uang Makan_08_Agustus_2027`, agar pegawai/bukti bulan yang sama tidak bercampur antar-tahun. Folder yang sudah terdaftar tetap memakai ID/lokasi lamanya. Kalender libur nasional tahun berikutnya tetap perlu diisi pada sumber `HARI_LIBUR`; pemilihan tahun tidak otomatis mengunduh kalender libur atau mengubah aturan perhitungan.

## Folder dan template

Folder tujuan ditentukan dari folder presensi yang tercatat pada master. `REKAP` dibuat pada induk submisi yang sama dengan `PNS` dan `PPPK`. Bila lokasi pegawai berbeda-beda atau folder/file hasil bernama ganda, proses berhenti untuk diperiksa, bukan memilih secara acak.

Template tetap asli, disalin pada pembuatan pertama:

Identitas periode pada hasil ekspor:

- Uang Makan PNS/PPPK: B2 tahun (contoh `2026`), B3 nama bulan (`Agustus`), C2 judul (`Uang Makan Agustus 2026`). Nama sheet hasil sama dengan judul C2. Sheet lama `UM_BULAN` otomatis diganti nama saat membuat ulang rekap, tanpa mengganti ID file/sheet. Judul di C1 dari exporter sebelumnya dibersihkan hanya jika sama persis dengan judul periode tersebut.
- Tukin PNS/PPPK: D3 bulan dan tahun submisi (`Oktober 2026`), D4 rentang tanggal periode submisi. Kolom D mulai baris 10 berisi nama bulan (`Oktober`) untuk setiap baris pegawai template, kolom E tahun. Nama sheet Tukin tetap `TUKIN_BULAN`.

| Modul | PNS | PPPK |
| --- | --- | --- |
| Uang Makan | `164EB-7F2QtWowKHrTcm1GYxqAoR0P6-BVQBx9s3hIQQ` | `12I_GwpjdMq87vL21xuWE9QFpnbh2BWoCbU_J9aCCPd0` |
| Tukin | `1ohR7vuIyDk0rtZGzsIUBQG96G7s371QiTygIt8T1d8U` | `1HQurKCxHusAev2ADdqtXGTh1-Dq7t70NUiW-Ep2cFoI` |

- Uang Makan: sheet `UM_BULAN`, NIP B, nama C, tanggal pada row 4, data mulai row 5. Isi `1` hanya untuk WFO/WFA/WFH dengan setidaknya satu presensi. Libur merah `#f4cccc`, Dinas hijau `#c9efbc`, Cuti biru muda `#affdfd`. Pegawai tanpa hasil tetap kosong; tanggal libur tetap diwarnai. Tanggal di luar bulan (contoh 31 April) kosong abu-abu. Kalender memakai `holidayDates_`/`HARI_LIBUR` yang sudah ada.
- Tukin: sheet `TUKIN_BULAN`, NIP F, nama N, data mulai row 10. Potongan absensi tersimpan ditulis ke I dalam **poin persen** (2,5 untuk 2,5%), bukan dibagi 100. Rumus J/K/M tidak ditimpa. Bulan/tahun mengikuti bulan pembayaran submisi; contoh 11 Agustus–10 September untuk Oktober.
- Pencocokan NIP bersifat tepat dan berupa teks. Nama hanya fallback saat NIP template kosong dan nama unik. NIP/nama yang belum dihitung tidak diberi angka nol palsu. Pegawai terhitung yang belum ada di template dilaporkan agar barisnya ditambahkan, bukan dihilangkan diam-diam.
- Penulisan menggunakan blok sel untuk mengurangi panggilan Apps Script. Bila penulisan gagal, data/formula/format sel lama dipulihkan dan file baru yang gagal dipindah ke Trash. Tidak ada perubahan pada template sumber.

## Preview, hasil akhir, dan arsip

Jam ditampilkan dan disimpan sebagai teks `HH:mm`, dengan `-` tetap berarti tidak ada presensi. Jam lama tanpa nol awal tetap dikenali sebagai waktu yang sama.

Hasil tab 5 baru disimpan dalam sheet tersembunyi `_HASIL_PERHITUNGAN` pada file presensi pegawai dan diikat ke revision presensi/bukti. Hasil lama bisa dibuka dari ringkasan master tersimpan tanpa menghitung ulang nominal menggunakan tarif terbaru. Rincian tanggal hasil lama tetap tersedia di catatan perhitungan.

Membuka hasil yang tidak berubah tidak menulis ulang. Perubahan bukti, jadwal, penyesuaian atau data presensi tetap membutuhkan pemeriksaan/simpan kembali. Tombol Selesai & Submit membuka pilihan Upload data lain (kembali ke daftar pegawai tab 2) atau Tetap di sini setelah server mengonfirmasi submit.

Arsip akun pegawai non-Admin dibaca melalui `arsip_saya`, dengan NIP dari sesi server. Nama sama dengan NIP berbeda tidak ikut ditampilkan. Endpoint tidak mempercayai role atau NIP buatan browser. Ini membatasi fitur arsip aplikasi; pengaturan publikasi CSV/berbagi Drive yang sudah ada tidak diubah oleh pembaruan ini.

## Verifikasi

Pengujian otomatis memakai Drive/Sheets simulasi: bukan penulisan ke data produksi. Verifikasi template asli dilakukan baca-saja terhadap keempat template, termasuk NIP berupa teks, row header, sheet name dan rumus Tukin. Uji browser lokal memakai seluruh request mock. Setelah deployment, cocokkan satu hasil PNS/PPPK dengan sumber sebelum digunakan untuk administrasi pembayaran.
