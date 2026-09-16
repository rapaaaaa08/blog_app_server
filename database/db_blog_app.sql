-- ============================================================
--  db_blog_app  —  Database aplikasi blog (Express + Flutter)
--  Dibuat sesuai: server/src/config/schema.ts (Drizzle ORM)
--
--  Cara pakai di MySQL Workbench:
--    File > Open SQL Script... > pilih file ini > Execute (Ctrl+Shift+Enter)
--
--  PERHATIAN: baris DROP DATABASE di bawah menghapus database lama.
--  Hapus/beri komentar kalau tidak ingin menghapus data yang sudah ada.
-- ============================================================

DROP DATABASE IF EXISTS db_blog_app;
CREATE DATABASE db_blog_app
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE db_blog_app;

-- ============================================================
-- 1. USERS  (dibutuhkan posts sebagai foreign key)
-- ============================================================
CREATE TABLE users (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  username         VARCHAR(50)  NOT NULL,
  email            VARCHAR(100) NOT NULL,
  password         VARCHAR(255) NOT NULL,
  role             ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  avatar_url       TEXT,
  avatar_public_id VARCHAR(255),
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT uq_users_username UNIQUE (username)
) ENGINE = InnoDB;

-- ============================================================
-- 2. CATEGORIES  (kategori artikel / sumber hashtag)
-- ============================================================
CREATE TABLE categories (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT uq_categories_name UNIQUE (name)
) ENGINE = InnoDB;

-- ============================================================
-- 3. POSTS  (artikel)
--    Kategori artikel TIDAK disimpan di sini, tapi di tabel pivot
--    post_categories (relasi many-to-many ke tabel categories).
-- ============================================================
CREATE TABLE posts (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  title           VARCHAR(255) NOT NULL,
  content         TEXT NOT NULL,
  image_url       TEXT,
  image_public_id VARCHAR(255),
  status          ENUM('delete', 'published') NOT NULL DEFAULT 'published',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_posts_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  INDEX idx_posts_user (user_id),
  INDEX idx_posts_status (status)
) ENGINE = InnoDB;

-- ============================================================
-- 4. POST_CATEGORIES  (pivot many-to-many posts <-> categories)
--    Primary key gabungan: (post_id, category_id)
-- ============================================================
CREATE TABLE post_categories (
  post_id     INT NOT NULL,
  category_id INT NOT NULL,

  PRIMARY KEY (post_id, category_id),

  CONSTRAINT fk_post_categories_post
    FOREIGN KEY (post_id) REFERENCES posts (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_post_categories_category
    FOREIGN KEY (category_id) REFERENCES categories (id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  INDEX idx_post_categories_category (category_id)
) ENGINE = InnoDB;


-- ============================================================
--  SEED DATA (opsional, untuk uji coba mobile)
-- ============================================================

-- Password semua user demo di bawah = "password123"
INSERT INTO users (username, email, password, role) VALUES
  ('admin', 'admin@blog.com',
   '$2b$10$8cELPAoanLXDY8nAazVqwuXyicBDIIA3M49Z6b/oidLAj7WKWvEJm', 'admin'),
  ('rafa', 'rafa@blog.com',
   '$2b$10$8cELPAoanLXDY8nAazVqwuXyicBDIIA3M49Z6b/oidLAj7WKWvEJm', 'user');

INSERT INTO categories (name) VALUES
  ('kuliner'),    -- id 1
  ('jakarta'),    -- id 2
  ('teknologi'),  -- id 3
  ('review'),     -- id 4
  ('kesehatan'),  -- id 5
  ('travel'),     -- id 6
  ('bandung'),    -- id 7
  ('olahraga'),   -- id 8
  ('otomotif'),   -- id 9
  ('pendidikan'), -- id 10
  ('hiburan');    -- id 11

INSERT INTO posts (user_id, title, content, status) VALUES
  (1, 'Kuliner Malam di Jakarta',
   'Malam minggu enaknya cari makanan. #kuliner #jakarta',
   'published'),
  (2, 'Review Gadget Terbaru 2026',
   'Gadget ini punya spesifikasi mumpuni untuk kerja. #teknologi #review',
   'published'),
  (1, 'Tips Sehat Ala Anak Kos',
   'Mulai dari tidur cukup sampai makan teratur. #kesehatan',
   'published'),
  (2, 'Liburan Murah ke Bandung',
   'Naik kereta aja, murah dan cepat. #travel #bandung',
   'published');

-- relasi artikel <-> kategori (post_id, category_id)
INSERT INTO post_categories (post_id, category_id) VALUES
  (1, 1), (1, 2),   -- Kuliner Malam di Jakarta  : kuliner, jakarta
  (2, 3), (2, 4),   -- Review Gadget Terbaru 2026 : teknologi, review
  (3, 5),           -- Tips Sehat Ala Anak Kos   : kesehatan
  (4, 6), (4, 7);   -- Liburan Murah ke Bandung  : travel, bandung


-- ============================================================
--  VERIFIKASI
-- ============================================================
SELECT 'users' AS tabel, COUNT(*) AS jumlah FROM users
UNION ALL SELECT 'categories', COUNT(*) FROM categories
UNION ALL SELECT 'posts',      COUNT(*) FROM posts
UNION ALL SELECT 'post_categories', COUNT(*) FROM post_categories;
