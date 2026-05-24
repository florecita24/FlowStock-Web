# FlowStock-Web

FlowStock-Web adalah aplikasi web untuk memantau stok, melihat prediksi penjualan, dan membaca insight AI dari data FlowStock.

## Cara Clone dan Menjalankan Secara Lokal

Kalau kamu baru pertama kali mau menjalankan project ini di laptop, ikuti langkah berikut:

### 1. Clone repository

```bash
git clone https://github.com/florecita24/FlowStock-Web.git
cd FlowStock-Web
```

### 2. Install dependency

Project ini memakai `pnpm`.

```bash
pnpm install
```

### 3. Siapkan file environment

Buat file `.env` di root project, lalu isi minimal variabel berikut:

```bash
SUPABASE_URL=isi_dengan_url_supabase
SUPABASE_ANON_KEY=isi_dengan_anon_key_supabase
FLOWSTOCK_AI_1_BASE_URL=https://fhatikaadr-flowstock-ai-1.hf.space
VITE_FLOWSTOCK_AI_2_BASE_URL=https://fhatikaadr-flowstock-ai-2.hf.space
VITE_FLOWSTOCK_AI_3_BASE_URL=https://fhatikaadr-flowstock-ai-3.hf.space
VITE_SALES_FORECAST_BASE_URL=https://naraurst-sales-prediction.hf.space
```

Untuk mengetahui isi dari variabel tersebut dapat menghubungi pemilik repo.

### 4. Jalankan aplikasi

```bash
pnpm dev
```

Lalu buka alamat yang muncul di terminal, biasanya `http://localhost:8080`.

### 5. Cek hasil build lokal

Kalau ingin memastikan project bisa di-build sebelum deploy:

```bash
pnpm build:client
```

Kalau ingin build penuh:

```bash
pnpm build
```

## Cara Memakai

1. Buka halaman utama aplikasi.
2. Di menu samping kiri, pilih halaman yang ingin dilihat:
	- `Main Dashboard` untuk ringkasan kondisi stok dan insight utama.
	- `Inventory Management` untuk melihat daftar inventori, status stok, dan rekomendasi tindakan.
	- `Sales Prediction` untuk melihat grafik penjualan historis dan prediksi AI.
3. Gunakan filter yang tersedia di tiap halaman untuk memilih produk, bulan, atau gudang.
4. Klik tombol aksi jika ingin melihat detail solusi AI atau menjalankan simulasi tertentu.

## Penjelasan Halaman

### 1. Main Dashboard

Halaman ini menampilkan:
- ringkasan nilai inventori,
- jumlah stok kritis,
- barang hampir kedaluwarsa,
- barang overstock,
- peta distribusi stok regional,
- dan daftar alert AI.

### 2. Inventory Management

Halaman ini digunakan untuk:
- melihat daftar inventori per produk dan gudang,
- mengecek status stok,
- melihat saran tindakan seperti transfer, order, atau discount,
- dan melakukan sinkronisasi data AI.

### 3. Sales Prediction

Halaman ini menampilkan:
- grafik penjualan historis,
- prediksi penjualan dari AI,
- serta insight AI untuk produk yang dipilih.

## Kalau Data Belum Muncul

Jika halaman sudah terbuka tetapi data kosong atau error, biasanya penyebabnya:
- koneksi ke Supabase belum aktif,
- env variable belum diisi di Vercel,
- atau service AI belum merespons.

Pastikan aplikasi sudah terhubung ke:
- Supabase,
- FlowStock AI service,
- dan API pendukung lain yang dipakai aplikasi.

## Catatan

- Web ini bisa dibuka di browser biasa tanpa instal apa pun jika sudah dideploy.
- Jika dijalankan lokal, pastikan server dan env variable sudah disiapkan.
