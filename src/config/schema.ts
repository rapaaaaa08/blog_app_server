import { relations } from "drizzle-orm";
import {
  mysqlTable,
  mysqlEnum,
  int,
  varchar,
  text,
  timestamp,
  primaryKey,
} from "drizzle-orm/mysql-core";


export const USER_ROLES = ["user", "admin"] as const;
export const POST_STATUS = ["delete", "published"] as const;

// USERS — tambah avatar
export const usersTable = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 50 }).notNull(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: mysqlEnum("role", USER_ROLES).notNull().default("user"),
  avatarUrl: text("avatar_url"),                                  // ← BARU
  avatarPublicId: varchar("avatar_public_id", { length: 255 }),   // ← BARU
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// CATEGORIES (gak berubah)
export const categoriesTable = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// POSTS
export const postsTable = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  imagePublicId: varchar("image_public_id", { length: 255 }),
  status: mysqlEnum("status", POST_STATUS).notNull().default("published"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});


// POST_CATEGORIES (pivot many-to-many posts <-> categories)
export const postCategoriesTable = mysqlTable(
  "post_categories",
  {
    postId: int("post_id")
      .notNull()
      .references(() => postsTable.id, { onDelete: "cascade" }),
    categoryId: int("category_id")
      .notNull()
      .references(() => categoriesTable.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.postId, table.categoryId] })]
);

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  posts: many(postsTable),
}));

export const categoriesRelations = relations(categoriesTable, ({ many }) => ({
  postCategories: many(postCategoriesTable),
}));

export const postsRelations = relations(postsTable, ({ one, many }) => ({
  author: one(usersTable, {
    fields: [postsTable.userId],
    references: [usersTable.id],
  }),
  postCategories: many(postCategoriesTable),
}));

export const postCategoriesRelations = relations(
  postCategoriesTable,
  ({ one }) => ({
    post: one(postsTable, {
      fields: [postCategoriesTable.postId],
      references: [postsTable.id],
    }),
    category: one(categoriesTable, {
      fields: [postCategoriesTable.categoryId],
      references: [categoriesTable.id],
    }),
  })
);