# Blog App — REST API Server

Backend REST API untuk aplikasi blog: **CRUD artikel, kategori otomatis dari hashtag, data user, dan
auth JWT**. Data disimpan di **MySQL** (`db_blog_app`) lewat **Drizzle ORM**, dan gambar artikel
diunggah ke **Cloudinary**.

Base URL:

```
http://localhost:3006/api/v1
```

---

## Fitur

- **CRUD artikel** lewat HTTP method yang sesuai: `GET`, `POST`, `PUT`, `DELETE`
- **Kategori otomatis dari hashtag** — menulis `#kuliner` di konten otomatis bikin kategori `kuliner`
- **Upload gambar** artikel ke Cloudinary (opsional, maks 5MB)
- **Auth JWT** — register & login pakai `bcryptjs` + `jsonwebtoken`
- **Response JSON seragam** `{ success, message, data }` dengan status code `200`, `201`, `400`, `404`, `500`
- **Validasi request body** pakai Zod

## Teknologi

| Library | Fungsi |
| --- | --- |
| `express` | Web framework + routing REST API |
| `drizzle-orm` + `mysql2` | Query builder & koneksi ke MySQL |
| `drizzle-kit` | Tooling schema Drizzle |
| `zod` | Validasi request body |
| `multer` | Menerima upload file (`multipart/form-data`) |
| `cloudinary` | Penyimpanan file gambar |
| `bcryptjs` + `jsonwebtoken` | Hash password & token auth |
| `cors` | Supaya frontend (Flutter Web) boleh memanggil API |
| `dotenv` | Membaca konfigurasi dari `.env` |
| `typescript` + `ts-node` + `nodemon` | Bahasa & auto-reload saat development |

## Struktur Folder

```
src/
├── index.ts                          # Express app: CORS, JSON parser, mounting route, error handler
├── config/
│   ├── db.ts                         # Connection pool MySQL + instance Drizzle
│   ├── schema.ts                     # Definisi tabel users, categories, posts, post_categories
│   └── cloudinary.ts                 # Konfigurasi akun Cloudinary
├── controllers/
│   ├── auth/
│   │   ├── auth.controller.ts        # register & login
│   │   ├── auth.route.ts             # POST /auth/register, POST /auth/login
│   │   ├── posts/posts.controller.ts # CRUD artikel (create/getAll/getById/update/delete)
│   │   └── users/users.controller.ts # profil user, ganti avatar, artikel per user
│   ├── categories/
│   │   └── categories.controller.ts  # search, trending, artikel per kategori
│   └── middleware/
│       ├── auth.middleware.ts        # Cek Bearer token JWT
│       └── upload.middleware.ts      # Multer: terima file gambar (field "image", maks 5MB)
├── routes/                           # Definisi endpoint
│   ├── posts/posts.route.ts
│   ├── categories/categories.route.ts
│   └── users.route.ts
├── services/
│   ├── category.service.ts           # Query kategori (upsert, search, trending, by kategori)
│   └── cloudinary.service.ts         # Upload buffer gambar ke Cloudinary
├── utils/
│   └── hashtag.ts                    # Ekstrak hashtag dari konten (#kuliner -> "kuliner")
└── validations/
    ├── auth.validation.ts            # Skema Zod register & login
    └── post.validation.ts            # Skema Zod create & update artikel

database/
└── db_blog_app.sql                   # Script SQL: buat database + tabel + data contoh
```

## Struktur Database

```
USERS (1) ──────< (N) POSTS
POSTS (1) ──────< (N) POST_CATEGORIES (N) >────── (1) CATEGORIES
```

| Tabel | Kolom penting |
| --- | --- |
| `users` | `id` (PK), `username`, `email` (UNIQUE), `password` (hash bcrypt), `role`, `avatar_url`, `avatar_public_id`, timestamps |
| `categories` | `id` (PK), `name` (UNIQUE, huruf kecil), timestamps |
| `posts` | `id` (PK), `user_id` (**FK** → `users.id`, ON DELETE CASCADE), `title`, `content`, `image_url`, `image_public_id`, `status`, timestamps |
| `post_categories` | `post_id` + `category_id` (**PK gabungan**, **FK** keduanya, ON DELETE CASCADE) — relasi many-to-many |

Detail lengkap tabel, primary key, foreign key, dan DDL-nya ada di file
[`database/db_blog_app.sql`](database/db_blog_app.sql).

## Cara Menjalankan

### 1. Prasyarat

- Node.js
- MySQL (di sini dipakai Laragon, default user `root` tanpa password, port `3306`)

### 2. Konfigurasi `.env`

Copy `.env.example` jadi `.env`, lalu isi sesuai environment kamu:

| Variabel | Keterangan |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Koneksi MySQL (`DB_NAME=db_blog_app`) |
| `JWT_SECRET` | Rahasia untuk menandatangani token login |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Kredensial akun Cloudinary |

> File `.env` **tidak ikut di-commit** (sudah masuk `.gitignore`) karena isinya rahasia.

### 3. Import database

```bash
mysql -u root < database/db_blog_app.sql
```

Atau lewat MySQL Workbench: `File` → `Open SQL Script...` → pilih `database/db_blog_app.sql` →
jalankan (`Ctrl + Shift + Enter`).

> ⚠️ Script ini diawali `DROP DATABASE IF EXISTS db_blog_app;` jadi database lama akan dihapus dan
> dibuat ulang.

### 4. Install & jalankan server

```bash
npm install
npm run dev
```

Kalau berhasil akan muncul:

```
[server]: server is running at http://localhost:3006
[server]: server is running at http://192.168.1.9:3006
```

Alamat kedua (IP LAN) itu yang dipakai kalau aplikasi mobile diuji di HP fisik.

> `npm run dev` memakai `nodemon` yang hanya memantau folder `src/`. Kalau kamu mengubah `.env`,
> hentikan server (`Ctrl + C`) lalu jalankan ulang.

### 5. Cek cepat

```bash
# 1) server sudah hidup? (tidak menyentuh database)
curl http://localhost:3006

# 2) sudah tersambung ke database?
curl http://localhost:3006/api/v1/posts
```

Kalau yang pertama balik JSON info API tapi yang kedua error, berarti servernya jalan tapi koneksi
MySQL-nya bermasalah. Kalau yang kedua balik JSON berisi artikel, berarti server + MySQL sudah
tersambung.

### 6. Cek tipe TypeScript

```bash
npx tsc --noEmit
```

## Daftar Endpoint

### Info API

Endpoint ini diakses **langsung dari root server** (di luar prefix `/api/v1`):

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/` | Info API: nama, versi, base URL, dan daftar endpoint yang tersedia |

Contoh response:

```json
{
  "success": true,
  "message": "Blog App REST API aktif",
  "data": {
    "name": "Blog App Server",
    "version": "1.0.0",
    "baseUrl": "/api/v1",
    "endpoints": {
      "auth": "/api/v1/auth",
      "posts": "/api/v1/posts",
      "categories": "/api/v1/categories",
      "users": "/api/v1/users"
    }
  }
}
```

### Artikel

| Method | Endpoint | Fungsi | Sukses | Gagal |
| --- | --- | --- | --- | --- |
| `GET` | `/posts` | Ambil semua artikel | 200 | 500 |
| `GET` | `/posts/:id` | Ambil 1 artikel | 200 | 400, 404, 500 |
| `POST` | `/posts` | Buat artikel | 201 | 400, 500 |
| `PUT` | `/posts/:id` | Update artikel | 200 | 400, 404, 500 |
| `DELETE` | `/posts/:id` | Hapus artikel | 200 | 400, 404, 500 |

Body `POST` / `PUT` dikirim sebagai `multipart/form-data`:

| Field | Wajib? | Keterangan |
| --- | --- | --- |
| `userId` | Ya (saat create) | ID penulis artikel |
| `title` | Ya | Minimal 3 karakter, maksimal 255 |
| `content` | Ya | Minimal 10 karakter |
| `image` | Tidak | File gambar (maks 5MB). Kalau kosong, artikel dibuat tanpa gambar |

Contoh response sukses:

```json
{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "post": {
      "id": 9,
      "userId": 1,
      "title": "Artikel Dengan Gambar",
      "content": "Konten uji upload gambar #gambar",
      "imageUrl": "https://res.cloudinary.com/.../posts/xxxx.png",
      "status": "published",
      "author": { "id": 1, "username": "admin", "avatarUrl": null },
      "categories": ["gambar"]
    }
  }
}
```

Contoh response validasi gagal:

```json
{
  "success": false,
  "message": "Data tidak valid",
  "errors": [{ "field": "title", "message": "Title minimal 3 karakter" }]
}
```

### Kategori

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/categories/search?q=kul` | Autocomplete kategori berdasar awalan huruf |
| `GET` | `/categories/trending` | Kategori terpopuler + jumlah artikelnya |
| `GET` | `/categories/:name/posts` | Artikel yang punya kategori tertentu |

### Auth & User

| Method | Endpoint | Fungsi | Butuh token? |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Daftar user baru | Tidak |
| `POST` | `/auth/login` | Login, menghasilkan token JWT | Tidak |
| `GET` | `/users` | Daftar user (id + username) | Tidak |
| `GET` | `/users/me` | Data user yang sedang login | Ya |
| `PUT` | `/users/avatar` | Ganti foto profil | Ya |
| `GET` | `/users/:userId` | Artikel milik user tertentu | Ya |
| `GET` | `/users/:userId/posts/:postId` | Satu artikel milik user tertentu | Ya |

Token dikirim lewat header `Authorization: Bearer <token>`.

## Aturan Hashtag → Kategori

Waktu artikel disimpan, server menjalankan `extractHashtags(content)` (`src/utils/hashtag.ts`) yang
mengambil semua kata berawalan `#`, mengubahnya jadi huruf kecil, dan membuang duplikat:

```
"Lagi makan enak #Mukbang #kuliner"  ->  ["mukbang", "kuliner"]
```

Hashtag itu otomatis masuk ke tabel `categories` (kalau belum ada) dan dihubungkan ke artikel lewat
`post_categories`. **Hashtag tetap tersimpan utuh di kolom `content`** supaya waktu artikel diedit,
kategorinya masih bisa ditentukan ulang.

## Upload Gambar

- Gambar **opsional** — kalau tidak ada, artikel tetap tersimpan (`image_url` bernilai `NULL`).
- Urutan proses: `multer` menerima file (field `image`, maks 5MB, hanya `image/*`) → diunggah ke
  Cloudinary → URL-nya disimpan di `posts.image_url`.
- Saat **update**: kalau tidak ada gambar baru dikirim, gambar lama tetap dipakai.

## Akun Contoh (dari seed SQL)

| Username | Email | Password | Role |
| --- | --- | --- | --- |
| `admin` | `admin@blog.com` | `password123` | admin |
| `rafa` | `rafa@blog.com` | `password123` | user |

## Troubleshooting

| Masalah | Penyebab & Solusi |
| --- | --- |
| `Access denied for user 'root'@'localhost'` | Password di `.env` beda dengan MySQL. Default Laragon kosong (`DB_PASSWORD=`). Setelah diubah, restart server. |
| Endpoint balik 500 + `Failed query` | Koneksi database gagal. Cek MySQL sudah jalan, lalu cek `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME`. |
| `Table 'db_blog_app.post_categories' doesn't exist` | Script SQL versi lama. Jalankan ulang `database/db_blog_app.sql`. |
| Upload gambar ditolak 400 | File bukan gambar, atau ukurannya lebih dari 5MB. |
| Perubahan `.env` tidak berpengaruh | `nodemon` hanya memantau `src/`. Hentikan server lalu jalankan ulang. |
