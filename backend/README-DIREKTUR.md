# Pengecualian Direktur (10 Oktober 2026)

Aturan aplikasi sesuai permintaan pemilik proses:

- Identifikasi berdasarkan kata `Direktur` pada kolom `Jabatan` di `Data_Pegawai`, tidak peka huruf besar/kecil. Mendukung jabatan panjang dan awalan Plt. Kata `Direktorat` atau `Direktural` saja tidak cocok. Role akun dan parameter browser tidak menentukan pengecualian.
- Tukin: flexi, TL, PSW, kekurangan jam, lupa absen/adjustment dan persentase potongan SKP/absensi tetap dihitung untuk pencatatan. Hanya nominal potongan yang Rp0; nominal diterima sama dengan besaran Tukin saat perhitungan. Tarif atau SKP kosong tetap memblokir penyelesaian, tidak dianggap nol.
- Kehadiran Direktur mengikuti keterangan akhir WFO/WFA/WFH meskipun jam kosong. Dinas, Cuti, TB, dan Libur tetap kategori terpisah setelah klaim.
- Uang Makan: hari masuk berdasarkan status tersebut dibayar dengan tarif dan pajak yang berlaku. Dinas tidak dibayar uang makan. Aturan pegawai lain tidak diubah.
- Adjustment pada Tukin Direktur mengikuti validasi surat dan kuota yang sama; koreksi yang sah memengaruhi catatan persentase, tidak mengurangi nominal. Data jam asli dan penyelesaian konflik SPT/Cuti tetap dipertahankan.
- Pengecualian, jumlah hari, dan nominal disimpan bersama snapshot hasil. Membuka hasil lama tidak menghitung ulang berdasarkan jabatan/tarif terbaru. Hasil lama perlu dihitung dan disubmit ulang secara eksplisit bila ingin menerapkan aturan baru.
- Ekspor mengikuti flag snapshot tersebut. Kalender Uang Makan memasukkan WFO/WFA/WFH Direktur tanpa mensyaratkan jam; Dinas tetap kosong. Persentase absensi I dan total persentase K tetap tercatat. Pembungkus nol K dari versi lama dipulihkan ke formula aslinya. Nominal diterima M dibungkus `PKP_DIREKTUR_NETTO` untuk mengembalikan besaran L penuh; formula M asli dipulihkan saat regenerasi non-pengecualian. Persentase SKP asli pada template tidak dipalsukan menjadi 100.
- Sheet hasil bernama `Tukin_<Bulan>` atau `Uang Makan_<Bulan>` berdasarkan bulan pembayaran periode, misalnya `Tukin_November`. Template sumber tidak diubah. Nama sheet hasil versi lama dimigrasikan saat pembuatan ulang dengan ID file/sheet tetap sama; nama ambigu ditolak.

Deploy ulang `Code.gs` pada Apps Script dan build/publikasikan frontend agar perubahan aktif. Tidak ada migrasi otomatis atau penulisan ulang terhadap rekap yang telah disubmit.
