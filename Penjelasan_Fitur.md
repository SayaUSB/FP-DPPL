Berdasarkan analisis pada *source code* prototipe aplikasi **SIBANSOS RT**, prototipe ini memiliki 4 modul fitur utama dan beberapa fitur pendukung. Berikut adalah penjelasan mendetail dari setiap fitur yang ada di dalamnya:

### 1. 📊 Statistik Warga & Bantuan (Dashboard / Beranda)
Fitur ini berfungsi sebagai *dashboard* utama yang memberikan ringkasan data warga dan progres penyaluran bantuan sosial.
*   **Kartu Ringkasan (Stat Cards):** Menampilkan empat metrik utama secara cepat: Total warga yang terdaftar, kuota penerima yang sudah ditetapkan berbanding sisa kuota, jumlah data warga yang tervalidasi, serta rata-rata pendapatan keluarga di RT tersebut.
*   **Grafik Distribusi Pendapatan per Kapita:** Sebuah grafik batang (bar chart) yang mengelompokkan warga ke dalam kelas penghasilan tertentu (misal: < 600rb, 600rb–1jt, dsb). Ini membantu RT melihat sebaran kemampuan ekonomi warganya.
*   **Grafik Donut Status Validitas:** Visualisasi berbentuk donat yang memperlihatkan proporsi jumlah data warga yang berstatus **Valid**, **Menunggu**, atau **Perlu Perbaikan**.
*   **Histogram Distribusi Prioritas (Asisten AI):** Menampilkan jumlah warga yang diklasifikasikan ke dalam kategori Sangat Tinggi, Tinggi, Sedang, hingga Rendah berdasarkan perhitungan Asisten AI secara otomatis (berdasarkan kondisi rumah dan ekonomi).
*   **Ekspor Data Laporan:** Memiliki tombol tindakan untuk mengunduh laporan data ke dalam bentuk Excel (`.csv`) dan mencetaknya ke format dokumen PDF.

### 2. 📋 Verifikasi Validitas Data Warga (Pengelolaan Data)
Fitur ini ditujukan agar pengurus RT dapat meninjau dan memverifikasi keakuratan dokumen yang diberikan oleh warga.
*   **Daftar Warga & Filter Validitas:** Menampilkan seluruh warga dalam bentuk tabel. Terdapat filter navigasi (Semua, Menunggu, Valid, Perlu Perbaikan) dan fitur pencarian menggunakan Nama atau NIK.
*   **Panel Detail Pemeriksaan (Drawer):** Apabila tombol "Periksa" diklik, sistem akan memunculkan *drawer* berisi kelengkapan data administratif (pendapatan, tanggungan, dsb) serta 3 jenis foto verifikasi kondisi rumah (Eksterior, Interior, dan Lingkungan).
*   **Checklist Kelengkapan:** Terdapat fitur centang (*checklist*) interaktif untuk memandu pengurus mengecek: KTP sesuai, KK valid, Kewajaran pendapatan, dan Kelengkapan foto rumah.
*   **Penetapan Status Validitas:** Pengurus RT dapat mengambil keputusan untuk mengunci data menjadi **Valid**, atau jika ada yang salah, menetapkannya sebagai **Perlu Perbaikan** / **Tidak Valid**. RT juga dapat memberikan catatan verifikasi.

### 3. 🎯 Status Penerima Bantuan (Seleksi)
Fitur inti untuk menyeleksi dan menetapkan siapa warga yang berhak mendapatkan bantuan sosial pada periode ini.
*   **Pengurutan Prioritas Otomatis:** Tabel secara otomatis mengurutkan warga dari yang memiliki **Skor Prioritas tertinggi hingga terendah**, sehingga pengurus RT langsung melihat warga yang paling membutuhkan berada di peringkat teratas.
*   **Monitor Kuota Terisi:** Sebuah panel progress indikator (*quota bar*) yang selalu memantau total kuota. Jika pengurus RT menetapkan warga sebagai penerima melebihi batas kuota (misal maksimal 5 orang), indikator akan berubah warna menjadi merah sebagai peringatan (*Over Quota*).
*   **Panel Asisten AI (Rekomendasi Cerdas):** Saat membuka detail warga, terdapat *AI Panel* yang memberikan penjelasan naratif mengapa warga tersebut mendapat skor tertentu (skala 0-100). Ini di-breakdown dalam komponen penyumbang skor seperti beban tanggungan, pendapatan per kapita, dan kondisi rumah.
*   **Proteksi Status Validitas:** Sistem akan memunculkan spanduk peringatan berwarna kuning/kemerahan jika pengurus RT mencoba menetapkan bantuan kepada warga yang data validitasnya masih "Menunggu" atau "Perlu Perbaikan".
*   **Penetapan Status & Notifikasi:** Pengurus dapat memutuskan status warga menjadi **Penerima Bantuan**, **Daftar Cadangan**, atau **Bukan Penerima**. Setelah disimpan, sistem mensimulasikan proses pengiriman notifikasi otomatis kepada warga.

### 4. ✏️ Ubah Data Warga (Pengelolaan Data)
Fitur untuk memperbarui profil dan kondisi terbaru dari setiap warga.
*   **Formulir Perubahan Data Dinamis:** Memungkinkan pengubahan detail seperti Kategori Stabilitas Kerja (Tetap, Serabutan, Tidak Bekerja), Pendapatan Keluarga, Jumlah Tanggungan, dan Status Kepemilikan (Milik Sendiri/Sewa/Numpang).
*   **Pratinjau Skor Prioritas (Real-time):** Fitur tercanggih di form ini; saat RT mengetik nominal pendapatan atau tanggungan baru, Asisten AI langsung mensimulasikan dan memperlihatkan **Skor Prioritas Baru** secara *real-time* lengkap dengan indikator selisih skor (naik/turun) dibandingkan skor lama.
*   **Reset Validitas Otomatis:** Untuk mencegah manipulasi data yang tidak terverifikasi, ketika data baru disimpan, sistem akan secara otomatis mencabut status validitas sebelumnya dan meresetnya kembali menjadi status **"Menunggu"**.

### 5. ⚙️ Fitur Pendukung Sistem (Umum)
*   **Navigasi Sidebar:** Tombol menu navigasi di sisi kiri (bisa disembunyikan / dibuka tutup) untuk berpindah antar halaman secara mulus.
*   **Tombol Reset Data Dummy:** Tombol berlogo riwayat (*history*) pada pojok kanan atas untuk memutar kembali semua perubahan modifikasi menjadi state dummy awal (sangat berguna untuk keperluan testing prototipe).
*   **Sistem Notifikasi Pop-up (Toasts):** Setiap aksi interaktif (berhasil menyimpan, mengubah data, mengunduh file) akan memunculkan *banner toast* notifikasi berwarna di layar bagian bawah pengguna.