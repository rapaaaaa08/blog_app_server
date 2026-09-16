import { sql, inArray } from "drizzle-orm";
import { db } from "../config/db";
import { categoriesTable } from "../config/schema";

// Upsert: insert kalau belum ada, skip kalau udah
export async function upsertCategories(names: string[]): Promise<void> {
  if (!names.length) return;
  await db
    .insert(categoriesTable)
    .values(names.map((name) => ({ name })))
    .onDuplicateKeyUpdate({
      // No-op update biar gak error duplicate
      set: { name: sql`VALUES(name)` },
    });
}

// Ambil map name -> id untuk daftar nama kategori
export async function getCategoryIdsByNames(
  names: string[]
): Promise<Map<string, number>> {
  if (!names.length) return new Map();

  const rows = await db
    .select({ id: categoriesTable.id, name: categoriesTable.name })
    .from(categoriesTable)
    .where(inArray(categoriesTable.name, names));

  return new Map(rows.map((row) => [row.name, row.id]));
}

// Autocomplete: cari category dengan prefix tertentu
export async function searchCategories(prefix: string, limit = 10) {
  const clean = prefix.toLowerCase();
  const [rows] = await db.execute(sql`
    SELECT
      c.id,
      c.name,
      (SELECT COUNT(DISTINCT pc.post_id)
       FROM post_categories pc
       JOIN posts p ON p.id = pc.post_id
       WHERE pc.category_id = c.id
         AND p.status = 'published') AS post_count
    FROM categories c
    WHERE c.name LIKE CONCAT(${clean}, '%')
    ORDER BY post_count DESC, c.name ASC
    LIMIT ${limit}
  `);
  return rows;
}

// Trending: top kategori dengan post_count terbanyak
export async function getTrendingCategories(limit = 10) {
  const [rows] = await db.execute(sql`
    SELECT
      c.id,
      c.name,
      (SELECT COUNT(DISTINCT pc.post_id)
       FROM post_categories pc
       JOIN posts p ON p.id = pc.post_id
       WHERE pc.category_id = c.id
         AND p.status = 'published') AS post_count
    FROM categories c
    ORDER BY post_count DESC, c.name ASC
    LIMIT ${limit}
  `);
  return rows;
}

// Ambil post berdasarkan kategori
export async function getPostsByCategory(name: string, limit = 20) {
  const clean = name.toLowerCase();
  const [rows] = await db.execute(sql`
    SELECT
      p.id,
      p.user_id,
      p.title,
      p.content,
      p.image_url,
      p.image_public_id,
      p.status,
      p.created_at,
      p.updated_at,
      u.username AS author_username
    FROM posts p
    JOIN post_categories pc ON pc.post_id = p.id
    JOIN categories c ON c.id = pc.category_id
    LEFT JOIN users u ON u.id = p.user_id
    WHERE c.name = ${clean}
      AND p.status = 'published'
    ORDER BY p.created_at DESC
    LIMIT ${limit}
  `);
  return rows;
}
