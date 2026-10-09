# Peta Progres Fisik

Lokasi: Monitoring Kinerja → Progres Fisik. Perubahan frontend saja; tidak memerlukan perubahan Apps Script, akun layanan, atau migrasi backend.

## Mode dan interaksi

- **Peta** (default): vektor berwarna teal, sage, dan khaki. Warna hanya membedakan wilayah, bukan nilai progres.
- **Satelit**: relief/citra statis NASA GIBS Blue Marble, dengan garis batas dan relief dasar laut yang tetap terlihat. Tint biru teal `#287d92` beropasitas 18% menggantikan penutup laut yang sebelumnya solid. Warna citra disesuaikan ke nuansa biru-teal dengan filter CSS pada layer citra saja; batas, tooltip, kontrol, Peta dan Monokrom tidak ikut difilter. Daratan provinsi tidak ditimpa warna palet kecuali saat disorot. Negara tetangga dapat terlihat sebagai latar, tetapi navigasi tetap dibatasi pada cakupan Indonesia dan hanya wilayah Indonesia yang dapat dipilih. Bukan citra real-time atau bukti kemajuan proyek. Resolusi asli sampai zoom 8, diperbesar di atas level tersebut.
- **Monokrom**: vektor abu-abu untuk latar visualisasi data mendatang.
- Hover menampilkan nama; klik provinsi memfokuskan seluruh geometri provinsi termasuk pulau terpisah dan memuat batas kabupaten/kota. Klik kabupaten/kota memfokuskan wilayah tersebut.
- Dropdown provinsi/kabupaten menyediakan alternatif keyboard/touch untuk wilayah kecil. Tombol Seluruh Indonesia mengembalikan tingkat nasional. Tombol target mengatur ulang cakupan wilayah aktif.
- Zoom dengan tombol +/−, keyboard, scroll mouse, scroll dua jari/gestur pinch trackpad pada browser yang mendukung, dan pinch layar sentuh. Saat kursor berada di peta, scroll memperbesar/memperkecil dengan titik fokus di kursor; di luar peta, scroll tetap menggulir halaman. Menggunakan handler Leaflet pada elemen peta saja, bukan listener global. Sensitivitas roda/trackpad 120 piksel per level, debounce 40 ms, serta batas minimum/maksimum tetap berlaku tanpa pantulan saat pinch.
- Pergantian mode tidak mengganti wilayah aktif atau mengunduh ulang batas. Tidak ada data capaian/progres fiktif.

## Sumber dan cakupan

Snapshot: https://github.com/AlfianAliM/Indonesia-GeoJSON/tree/169e53b256e99ee9d3f30c863c05e964a45f7008

Sumber dataset menyatakan Laravel Nusa / Peta Nusa, referensi Kepmendagri 300.2.2-2138 Tahun 2025, dibuat 16 Februari 2026, lisensi MIT. Salinan lisensi disertakan di `public/maps/indonesia/LICENSE.txt`; metadata, versi, checksum dan ukuran di `manifest.json`.

- 38 provinsi; 514 kabupaten/kota, termasuk 6 provinsi Papua saat ini.
- Seluruh koordinat, ring, dan polygon sumber dipertahankan persis (19.282 polygon provinsi, 19.725 polygon kabupaten). Ini **bukan jaminan** seluruh pulau terluar resmi sudah dipetakan oleh sumber. Batas bersifat indikatif, bukan penetapan legal.
- Tidak ada penyederhanaan atau penghapusan pulau kecil saat pembuatan aset. Leaflet menyederhanakan gambar sesuai zoom di layar, tanpa mengubah data sumber.
- Berkas provinsi lokal ±4,6 MB, dimuat sekali saat membuka peta; 38 berkas kabupaten terpisah dimuat sesuai provinsi pilihan. Data berhasil dimuat di-cache dalam sesi aplikasi. Total aset geometri ±11,2 MB (sebelum kompresi HTTP).
- Sumber dan batasan tampilan tersedia dalam bagian Sumber peta, dan atribusi tetap tampil pada peta.

Untuk menyiapkan ulang aset, unduh `provinsi.geojson` dan `kab_kota.geojson` pada commit di atas ke direktori sementara, lalu jalankan:

```powershell
node scripts/prepare-indonesia-map.mjs "C:/path/to/source"
```

Jangan mengganti sumber tanpa menguji ulang cakupan, pemetaan kode, lisensi, dan geometri. Skrip tidak mengakses atau mengubah data pegawai.

## Citra satelit

Layer: `BlueMarble_ShadedRelief_Bathymetry`, WMTS EPSG:3857, `GoogleMapsCompatible_Level8`, endpoint NASA GIBS. Hanya mode Satelit yang meminta tile. Tidak menggunakan Esri karena akun/lisensi Esri tidak disediakan. Tidak mengunduh paket citra atau memerlukan API key.

Referensi pengguna memakai basemap Esri; penyesuaian ini mendekatkan nuansa laut bertekstur dengan sumber NASA yang sudah digunakan, bukan mengklaim citra atau warna identik. Lapisan tint di luar Indonesia tetap non-interaktif dan ikut dilepas saat pindah mode atau saat citra gagal dimuat.

- Dokumentasi: https://nasa-gibs.github.io/gibs-api-docs/
- Kebijakan data: https://www.earthdata.nasa.gov/engage/open-data-services-software/data-use-policy
- Blue Marble: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/

We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS).

Jika tile gagal, aplikasi berpindah ke mode Peta dengan notifikasi; batas dan interaksi tetap dapat digunakan. Jika batas gagal, tampil Coba lagi. Respons provinsi lama dibatalkan/diabaikan saat pengguna cepat berganti pilihan.

## Verifikasi

```powershell
node --test tests/indonesia-map.test.mjs tests/indonesia-map-controller.test.mjs tests/monitoring-kinerja.test.mjs
npm run build
```

Uji browser: `/tests/monitoring-kinerja-ui.html` → Progres Fisik. Periksa hover/click pada Jawa Barat, Kepulauan Riau (Natuna/Anambas), NTT (Rote Ndao), Sulawesi Utara (Talaud), dan enam provinsi Papua. Ganti ketiga mode saat provinsi aktif; nama, dropdown, batas kabupaten dan posisi harus tetap. Uji kembali nasional, resize/mobile, keyboard dropdown, kegagalan tile, kegagalan GeoJSON, ganti provinsi cepat, serta buka/tutup tab berulang. Semua pengujian ini tidak menulis data backend.

Hasil pemeriksaan 9 Oktober 2026: 250 tes lulus, 9 fixture opsional dilewati, build produksi dan lint file yang diubah lulus. Tes controller menggunakan test double Leaflet; belum menggantikan verifikasi visual. Percobaan browser lokal terhambat `ERR_CONNECTION_TIMED_OUT` ke port Vite 5183. Pengecekan visual/interaksi browser di atas tetap perlu dilakukan sebelum deployment. Tidak ada push, deployment, atau perubahan backend pada pekerjaan ini.
