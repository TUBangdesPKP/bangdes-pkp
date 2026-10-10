# Pengecualian Direktur (10 Oktober 2026)

Aturan aplikasi sesuai permintaan pemilik proses:

- Identifikasi berdasarkan kata `Direktur` pada kolom `Jabatan` di `Data_Pegawai`, tidak peka huruf besar/kecil. Mendukung jabatan panjang dan awalan Plt. Kata `Direktorat` atau `Direktural` saja tidak cocok. Role akun dan parameter browser tidak menentukan pengecualian.
- Tukin: tidak menghitung flexi, TL, PSW, kekurangan jam, lupa absen/adjustment maupun potongan SKP. Potongan 0; nominal diterima sama dengan besaran Tukin yang digunakan saat perhitungan. Tarif kosong tetap memblokir penyelesaian, tidak dianggap nol.
- Kehadiran Direktur mengikuti keterangan akhir WFO/WFA/WFH meskipun jam kosong. Dinas, Cuti, TB, dan Libur tetap kategori terpisah setelah klaim.
- Uang Makan: hari masuk berdasarkan status tersebut dibayar dengan tarif dan pajak yang berlaku. Dinas tidak dibayar uang makan. Aturan pegawai lain tidak diubah.
- Adjustment pada Tukin Direktur tidak diterapkan; dokumen tetap tersimpan. Data jam asli dan penyelesaian konflik SPT/Cuti tetap dipertahankan.
- Pengecualian, jumlah hari, dan nominal disimpan bersama snapshot hasil. Membuka hasil lama tidak menghitung ulang berdasarkan jabatan/tarif terbaru. Hasil lama perlu dihitung dan disubmit ulang secara eksplisit bila ingin menerapkan aturan baru.
- Ekspor mengikuti flag snapshot tersebut. Kalender Uang Makan memasukkan WFO/WFA/WFH Direktur tanpa mensyaratkan jam; Dinas tetap kosong. Total potongan Tukin pada kolom K dibungkus formula nol bertanda `PKP_DIREKTUR_TUKIN`, dengan formula asli tetap tersimpan di dalamnya dan dipulihkan saat regenerasi non-pengecualian. Persentase SKP asli pada template tidak dipalsukan menjadi 100.

Deploy ulang `Code.gs` pada Apps Script dan build/publikasikan frontend agar perubahan aktif. Tidak ada migrasi otomatis atau penulisan ulang terhadap rekap yang telah disubmit.
