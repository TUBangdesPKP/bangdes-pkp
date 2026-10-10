# Rekap submisi Uang Makan dan Tukin

## Penerapan

1. Perbarui `Code.gs` pada project Apps Script spreadsheet kepegawaian asli, lalu perbarui versi deployment Web App yang digunakan frontend.
2. Deploy frontend terbaru. Tidak perlu menghapus spreadsheet maupun file presensi lama.
3. Pilih bulan di tab 1. Tab 2 menampilkan seluruh pegawai master, dipisah PNS/PPPK, abjad kiri-ke-kanan dalam enam kolom desktop. Klik nama untuk membuka tab 3. Jumlah centang hijau PNS, PPPK, dan total ada di kanan.
4. Klik **Buat Rekapan PNS & PPPK** tanpa password tambahan. Popup berbunyi **Yakin akan membuat rekap untuk [jumlah] Pegawai yang sudah Submit?**, disertai modul dan periode. Batal tidak mengirim permintaan. Backend memeriksa ulang sesi Admin, konfirmasi, dan jumlah pegawai; bila jumlah berubah, muat ulang daftar dan konfirmasi kembali. Tombol nonaktif jika belum ada yang submit. Hanya hasil lengkap yang sudah disubmit ikut diekspor. Rekap periode yang sama diperbarui dalam file yang sama, sehingga ID/link tetap.

Pembuatan rekap dan unduhan membutuhkan sesi Admin: Role Admin pada Data_Pegawai diverifikasi server, atau `adminSessionToken` dari login Super Admin lama. Kunci publikasi bukan pengganti sesi untuk kedua fitur ini. Sesi kedaluwarsa memerlukan login ulang. Penghapusan password hanya untuk Buat Rekapan submisi; pengamanan publikasi Rekap Bulanan tidak diubah.

Sesi sekarang mengikuti **6 jam tanpa aktivitas**, bukan batas tetap 30 menit. Lihat [sesi aktivitas](README-SESI-AKTIVITAS.md); setelah deployment sesi versi lama perlu login ulang sekali.

## Pilihan bulan/tahun dan akses submisi

Admin memakai halaman **Penghitungan Uang Makan dan Tunjangan Kinerja**, dengan filter jenis dan tahun. Dua belas kartu langsung tersedia tanpa fetch status periode. **Pilih & Lanjut** membuka tab 2. Admin terverifikasi dapat mengelola semua bulan, terlepas dari flag status lama di Script Properties; API status lama dipertahankan untuk kompatibilitas tetapi tidak lagi membatasi penghitungan.

Alur admin memiliki enam tab: **Bulan → Pegawai → Presensi → Bukti Dukung → Preview/penyesuaian → Hasil & Submit**. Rekap pribadi tetap lima tab baca-saja. Pemilih tahun menggunakan dropdown berlabel **Pilih Tahun**; mengganti tahun langsung mengganti kartu tanpa tombol Tampilkan.

Pada tab 3, `presensi_tersimpan` memuat baseline hasil bacaan untuk NIP, modul, dan periode yang dipilih. **Ubah file presensi** membuka picker/drag-and-drop satu PDF/XLSX/XLS. **Batal mengganti file** mengembalikan preview tersimpan. NIP file harus sama dengan kartu pegawai.

PDF referensi baru (maksimal 10 MB, header PDF divalidasi server) disimpan bersama spreadsheet rekap dalam folder pegawai/periode yang sudah ditentukan server. Kolom link file pada master mencatat PDF, sementara kolom spreadsheet tetap menunjuk hasil bacaan untuk penghitungan. **Lihat Dokumen** membuka PDF terdaftar dari panel presensi; tombol tetap tersedia setelah kembali ke pegawai yang sama. Untuk Excel hanya hasil bacaan yang disimpan. PDF versi sebelumnya tidak dihapus saat mengganti referensi; tombol menampilkan versi yang tercatat pada submisi terbaru. File yang dihapus atau dipindahkan keluar dari folder tujuan tidak ditawarkan sebagai preview. PDF lama yang belum pernah diunggah tidak dapat dipulihkan otomatis dari hasil bacaan; gunakan Ubah file presensi untuk mengunggahnya. Notifikasi teknis “PDF lintas halaman” tidak ditampilkan, tetapi pembacaan lintas halaman tetap aktif.

Pemeriksaan tanggal tidak lagi memangkas baris di luar periode atau menerima toleransi 10 hari. Setiap tanggal kalender dalam periode harus hadir tepat sekali, termasuk Sabtu/Minggu/libur. Jumlah terbaca ditampilkan terpisah dari jumlah yang diharapkan. Frontend dan backend menolak data hilang, ganda, atau di luar periode sebelum penyimpanan. Presensi lama yang tidak lengkap perlu diunggah ulang sebelum disubmit kembali. Upload pendukung lainnya, SPT, dan Cuti pada tab 4 mulai dalam keadaan tertutup.

Parser PDF Riwayat Presensi menerima penanda zona `WIB/WITA/WIT` serta `+07/+08/+09` (juga `+07:00`/`+0700` dan padanannya). Jam lokal dokumen tidak dikonversi. Kolom Masuk/Keluar tetap terpisah; jam hilang, konflik, atau nilai tidak valid tetap ditolak. Reproducer numeric-offset dapat diuji dengan env `PRESENSI_PDF_NUMERIC_OFFSET` menunjuk PDF lokal, tanpa menyimpan dokumen pribadi dalam repo.

`list_pegawai_submisi`, `presensi_tersimpan`, `buat_rekap_submisi`, dan endpoint unduhan memerlukan sesi Admin yang diverifikasi server. Endpoint verifikasi kunci lama tetap tersedia untuk kompatibilitas, tetapi tidak dipakai oleh tombol Buat Rekapan.

Alur enam tab menulis `Submit_Status = Menunggu submit` ketika hasil perhitungan disimpan. **Selesai & Submit** di tab 6 memanggil `submit_rekap_final`, memeriksa revision dan kelengkapan hasil, lalu menyimpan `Disubmit`. Sebelum tahap ini, kartu tetap silang dan hasil tidak ikut ekspor/nominal kartu pribadi. Hasil lama tanpa kolom/status ini tetap diakui berdasarkan `Hitung_Status = Lengkap`; tidak memerlukan submit ulang massal. Perubahan presensi/bukti membatalkan kelengkapan sampai diperiksa dan disubmit kembali.

Rekap pribadi terpisah untuk semua pegawai, termasuk yang memiliki Role Admin: kartu nominal membuka tab 5 dan tab 2–5 selalu baca-saja. Bulan kosong bertuliskan **Belum ada data**. Lihat [kartu rekap pegawai](README-KARTU-REKAP-PEGAWAI.md) dan [upload pendukung](README-UPLOAD-PENDUKUNG.md).

Deploy backend sebelum frontend. Uang Makan mengikuti bulan kalender; Tukin memakai bulan pembayaran (Januari 2027 = presensi 11 November–10 Desember 2026).

Folder baru selain tahun 2026 diberi akhiran tahun, misalnya `Uang Makan_08_Agustus_2027`, agar pegawai/bukti bulan yang sama tidak bercampur antar-tahun. Folder yang sudah terdaftar tetap memakai ID/lokasi lamanya. Kalender libur nasional tahun berikutnya tetap perlu diisi pada sumber `HARI_LIBUR`; pemilihan tahun tidak otomatis mengunduh kalender libur atau mengubah aturan perhitungan.

## Folder dan template

**Download Bukti Dukung Tukin / Uang Makan** berada di samping Buat Rekapan pada tab 2. Tombol tersedia tanpa kunci publikasi dan tidak bergantung pada jumlah pegawai yang submit. `daftar_unduhan_bukti` mencari folder kategori dan periode yang tepat tanpa membuat folder baru; `unduh_berkas_bukti` memeriksa sesi dan keanggotaan berkas pada folder tersebut di setiap permintaan. Tukin mengikuti bulan pembayaran, termasuk pergantian tahun. ID folder atau nama bulan dari browser tidak dipercaya.

Seluruh file aktif dalam folder periode, termasuk subfolder PNS/PPPK/pegawai dan REKAP bila ada, dikumpulkan bertahap menjadi satu ZIP di browser. Struktur folder dan nama dipertahankan; karakter tidak aman dibersihkan dan nama ganda diberi nomor. PDF/gambar tetap asli, Google Sheets diekspor XLSX, Docs DOCX, Slides PPTX, dan Drawing PDF melalui [Drive files.export](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/export). Ekspor memerlukan akses Drive API dan OAuth Drive + external_request milik deployment; tidak ada perubahan sharing atau file ZIP baru di Drive. Bila muncul HTTP 403 terkait API, periksa aktivasi Drive API pada project Google Cloud dan otorisasi ulang script. Ekspor Google Workspace dibatasi Google 10 MB per file.

Ada progres dan tombol batal. ZIP baru ditawarkan setelah seluruh file berhasil dibaca dan revision daftar masih sama. Perubahan/hilangnya file, sesi kedaluwarsa, shortcut/format Google yang tidak didukung, folder kosong/ganda, atau batas aman menghasilkan pesan gagal, bukan unduhan sebagian. Batas aplikasi: 25 MB per berkas, 512 MB isi ZIP, 2.000 file, 1.000 folder, kedalaman 12. Folder historis di luar susunan kategori/periode standar perlu dirapikan terlebih dahulu; endpoint tidak menebak lokasi atau mengunduh folder induk yang lebih luas.

Folder tujuan ditentukan dari folder presensi yang tercatat pada master. `REKAP` dibuat pada induk submisi yang sama dengan `PNS` dan `PPPK`. Bila lokasi pegawai berbeda-beda atau folder/file hasil bernama ganda, proses berhenti untuk diperiksa, bukan memilih secara acak.

Template tetap asli, disalin pada pembuatan pertama:

Identitas periode pada hasil ekspor:

- Uang Makan PNS/PPPK: B2 tahun (contoh `2026`), B3 nama bulan (`Agustus`), C2 judul (`Uang Makan Agustus 2026`). Nama sheet hasil sama dengan judul C2. Sheet lama `UM_BULAN` otomatis diganti nama saat membuat ulang rekap, tanpa mengganti ID file/sheet. Judul di C1 dari exporter sebelumnya dibersihkan hanya jika sama persis dengan judul periode tersebut.
- Tukin PNS/PPPK: D3 bulan dan tahun submisi (`Oktober 2026`), D4 rentang tanggal periode submisi. Kolom D mulai baris 10 berisi nama bulan (`Oktober`) untuk setiap baris pegawai template, kolom E tahun. H9 ditulis `Tanggal`; H mulai baris 10 diisi tanggal pembuatan rekap terakhir (zona Asia/Jakarta, nilai tanggal numerik dengan format `dd/mm/yyyy`) untuk pegawai yang sudah submit. Satu tanggal dipakai untuk PNS dan PPPK pada proses yang sama. Pembuatan ulang mempertahankan ID file dan memperbarui tanggal, bukan memakai rumus `TODAY()`. Nama sheet Tukin tetap `TUKIN_BULAN`.

| Modul | PNS | PPPK |
| --- | --- | --- |
| Uang Makan | `164EB-7F2QtWowKHrTcm1GYxqAoR0P6-BVQBx9s3hIQQ` | `12I_GwpjdMq87vL21xuWE9QFpnbh2BWoCbU_J9aCCPd0` |
| Tukin | `1ohR7vuIyDk0rtZGzsIUBQG96G7s371QiTygIt8T1d8U` | `1HQurKCxHusAev2ADdqtXGTh1-Dq7t70NUiW-Ep2cFoI` |

- Uang Makan: sheet `UM_BULAN`, NIP B, nama C, tanggal pada row 4, data mulai row 5. Isi `1` hanya untuk WFO/WFA/WFH dengan setidaknya satu presensi. Libur merah `#f4cccc`, Dinas hijau `#c9efbc`, Cuti biru muda `#affdfd`. Pegawai tanpa hasil tetap kosong; tanggal libur tetap diwarnai. Tanggal di luar bulan (contoh 31 April) kosong abu-abu. Kalender memakai `holidayDates_`/`HARI_LIBUR` yang sudah ada.
- Tukin: sheet `TUKIN_BULAN`, NIP F, nama N, data mulai row 10. Potongan absensi tersimpan ditulis ke I dalam **poin persen** (2,5 untuk 2,5%), bukan dibagi 100. L berisi **Besaran Tukin** dari `calculation.amount.tarif` pada hasil yang disetujui saat submit (besaran dasar sebelum potongan, bukan netto dan bukan tarif terbaru Data_Pegawai). Data historis memakai `Hitung_Tarif` tersimpan bila belum memiliki snapshot JSON; tarif historis yang kosong menghentikan ekspor, tidak diganti tarif baru. H dan L pegawai belum submit dikosongkan. Rumus J/K/M tidak ditimpa. Bulan/tahun mengikuti bulan pembayaran submisi; contoh 11 Agustus–10 September untuk Oktober.
- Pencocokan NIP bersifat tepat dan berupa teks. Nama hanya fallback saat NIP template kosong dan nama unik. NIP/nama yang belum dihitung tidak diberi angka nol palsu. Pegawai terhitung yang belum ada di template dilaporkan agar barisnya ditambahkan, bukan dihilangkan diam-diam.
- Penulisan menggunakan blok sel untuk mengurangi panggilan Apps Script. Bila penulisan gagal, data/formula/format sel lama dipulihkan dan file baru yang gagal dipindah ke Trash. Tidak ada perubahan pada template sumber.

## Preview, hasil akhir, dan arsip

Jam ditampilkan dan disimpan sebagai teks `HH:mm`, dengan `-` tetap berarti tidak ada presensi. Jam lama tanpa nol awal tetap dikenali sebagai waktu yang sama.

Hasil tab 5 baru disimpan dalam sheet tersembunyi `_HASIL_PERHITUNGAN` pada file presensi pegawai dan diikat ke revision presensi/bukti. Hasil lama bisa dibuka dari ringkasan master tersimpan tanpa menghitung ulang nominal menggunakan tarif terbaru. Rincian tanggal hasil lama tetap tersedia di catatan perhitungan.

Saat submit, ringkasan tarif/bruto/potongan/netto pada master diselaraskan ke hasil perhitungan yang telah diperiksa, tanpa membaca ulang tarif Data_Pegawai. Kartu pribadi memakai `Hitung_Netto` tersimpan; rincian pribadi memakai snapshot hasil atau ringkasan historis tersimpan. Perubahan tarif, SKP, atau pajak master sesudahnya tidak menghitung ulang rekap pribadi maupun besaran L pada ekspor. Mengubah nominal hasil suatu periode perlu proses pemeriksaan/perhitungan dan submit kembali secara eksplisit.

Membuka hasil yang tidak berubah tidak menulis ulang. Perubahan bukti, jadwal, penyesuaian atau data presensi tetap membutuhkan pemeriksaan/simpan kembali. Tombol Selesai & Submit membuka pilihan Upload data lain (kembali ke daftar pegawai tab 2) atau Tetap di sini setelah server mengonfirmasi submit.

Arsip akun pegawai non-Admin dibaca melalui `arsip_saya`, dengan NIP dari sesi server. Nama sama dengan NIP berbeda tidak ikut ditampilkan. Endpoint tidak mempercayai role atau NIP buatan browser. Ini membatasi fitur arsip aplikasi; pengaturan publikasi CSV/berbagi Drive yang sudah ada tidak diubah oleh pembaruan ini.

## Verifikasi

### Klaim beberapa SPT/Cuti (tab 4 admin)

Centang beberapa dokumen atau **Pilih semua**, lalu klik **Klaim N Dokumen SPT/Cuti**. Pilihan dipisahkan per jenis dokumen. Antrean mengirim satu penulisan pada satu waktu, dengan progres dan hasil per dokumen. Dokumen yang sudah dikonfirmasi tidak dikirim ulang; dokumen gagal/belum diproses tetap dipilih. Respons terputus atau sesi kedaluwarsa menghentikan antrean, lalu daftar pengumpulan dibaca kembali. Hapus, upload lain, dan lanjut proses tidak dapat dijalankan selama antrean berjalan.

Penulisan backend tetap memakai script lock bersama dan melakukan `SpreadsheetApp.flush()` sebelum mengonfirmasi klaim. Identitas unik klaim adalah modul, NIP, periode, folder tujuan, jenis dokumen, dan ID sumber; tautan alternatif ke file yang sama tidak membuat salinan kedua. Setiap surat memiliki baris registry sendiri. Beberapa surat pada tanggal yang sama tidak menambah baris presensi; konflik SPT/Cuti tetap perlu diselesaikan pada preview sebelum hasil akhir disimpan. Perubahan ini memerlukan pembaruan frontend dan deployment `Code.gs`; pengujian lokal tidak mengubah data produksi.

Pengujian otomatis memakai Drive/Sheets simulasi: bukan penulisan ke data produksi. Verifikasi template asli dilakukan baca-saja terhadap keempat template, termasuk NIP berupa teks, row header, sheet name dan rumus Tukin. Uji browser lokal memakai seluruh request mock. Setelah deployment, cocokkan satu hasil PNS/PPPK dengan sumber sebelum digunakan untuk administrasi pembayaran.
