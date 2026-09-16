import { Request, Response } from "express";
import { ZodError } from "zod";
import { eq } from "drizzle-orm";

import { extractHashtags } from "../../../utils/hashtag";
import {
  upsertCategories,
  getCategoryIdsByNames,
} from "../../../services/category.service";
import {
  createPostSchema,
  updatePostSchema,
} from "../../../validations/post.validation";
import { db } from "../../../config/db";
import { postsTable, postCategoriesTable } from "../../../config/schema";
import { uploadToCloudinary } from "../../../services/cloudinary.service";

function toPostResponse<
  T extends { postCategories: Array<{ category: { name: string } | null }> }
>(post: T) {
  const { postCategories, ...rest } = post;
  return {
    ...rest,
    categories: postCategories
      .map((pc) => pc.category?.name)
      .filter((name): name is string => Boolean(name)),
  };
}

export class PostController {
  // ==========================================
  // ERROR HANDLER POST (validasi -> 400)
  // ==========================================
  private handleError(error: unknown, res: Response) {
    console.error("Post error:", error);

    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Data tidak valid",
        errors: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan pada server",
      error: error instanceof Error ? error.message : error,
    });
  }

  // ==========================================
  // CREATE POST
  // ==========================================
  createPost = async (req: Request, res: Response) => {
    try {
      const { userId, title, content } = createPostSchema.parse(req.body);
      const hashtags = extractHashtags(content);

      let imageUrl: string | undefined;
      let imagePublicId: string | undefined;

      if (req.file) {
        const uploadResult = await uploadToCloudinary(req.file.buffer);
        imageUrl = uploadResult.secure_url;
        imagePublicId = uploadResult.public_id;
      }

      if (hashtags.length) {
        await upsertCategories(hashtags);
      }

      const [insertedPost] = await db
        .insert(postsTable)
        .values({ userId, title, content, imageUrl, imagePublicId })
        .$returningId();

      if (hashtags.length) {
        const categoryIds = await getCategoryIdsByNames(hashtags);
        const rows = hashtags
          .map((name) => categoryIds.get(name))
          .filter((id): id is number => typeof id === "number")
          .map((categoryId) => ({ postId: insertedPost.id, categoryId }));

        if (rows.length) {
          await db.insert(postCategoriesTable).values(rows);
        }
      }

      const newPost = await db.query.postsTable.findFirst({
        where: eq(postsTable.id, insertedPost.id),
        with: {
          author: { columns: { id: true, username: true, avatarUrl: true } },
          postCategories: {
            with: { category: { columns: { id: true, name: true } } },
          },
        },
      });

      return res.status(201).json({
        success: true,
        message: "Post created successfully",
        data: { post: newPost ? toPostResponse(newPost) : null },
      });
    } catch (error) {
      return this.handleError(error, res);
    }
  };

  // ==========================================
  // GET ALL POSTS
  // ==========================================
  getAllPosts = async (_req: Request, res: Response) => {
    try {
      const posts = await db.query.postsTable.findMany({
        with: {
          author: { columns: { id: true, username: true, avatarUrl: true } },
          postCategories: {
            with: { category: { columns: { id: true, name: true } } },
          },
        },
        orderBy: (posts, { desc }) => [desc(posts.createdAt)],
      });

      return res.status(200).json({
        success: true,
        message: "Get all posts successfully",
        data: { posts: posts.map((post) => toPostResponse(post)) },
      });
    } catch (error) {
      return this.handleError(error, res);
    }
  };

  // ==========================================
  // GET POST DETAIL
  // ==========================================
  getPostById = async (req: Request, res: Response) => {
    try {
      const postId = Number(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({
          success: false,
          message: "Post ID harus berupa angka",
        });
      }

      const post = await db.query.postsTable.findFirst({
        where: eq(postsTable.id, postId),
        with: {
          author: { columns: { id: true, username: true, avatarUrl: true } },
          postCategories: {
            with: { category: { columns: { id: true, name: true } } },
          },
        },
      });

      if (!post) {
        return res.status(404).json({
          success: false,
          message: "Post tidak ditemukan",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Get post detail successfully",
        data: { post: toPostResponse(post) },
      });
    } catch (error) {
      return this.handleError(error, res);
    }
  };

  // ==========================================
  // UPDATE POST
  // ==========================================
  updatePost = async (req: Request, res: Response) => {
    try {
      const postId = Number(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({
          success: false,
          message: "Post ID harus berupa angka",
        });
      }

      const existingPost = await db.query.postsTable.findFirst({
        where: eq(postsTable.id, postId),
      });

      if (!existingPost) {
        return res.status(404).json({
          success: false,
          message: "Post tidak ditemukan",
        });
      }

      const validatedData = updatePostSchema.parse(req.body);

      const updates: Partial<typeof postsTable.$inferInsert> = {};
      if (validatedData.title !== undefined) {
        updates.title = validatedData.title;
      }
      if (validatedData.content !== undefined) {
        updates.content = validatedData.content;
      }

      // Gambar bersifat OPSIONAL: kalau user pilih gambar baru, upload ke
      // Cloudinary dan ganti image_url-nya. Kalau tidak, gambar lama tetap.
      if (req.file) {
        const uploadResult = await uploadToCloudinary(req.file.buffer);
        updates.imageUrl = uploadResult.secure_url;
        updates.imagePublicId = uploadResult.public_id;
      }

      // updated_at diisi otomatis oleh MySQL (ON UPDATE CURRENT_TIMESTAMP),
      // jadi gak perlu di-set manual dari JS (biar timezone-nya konsisten)
      if (Object.keys(updates).length > 0) {
        await db
          .update(postsTable)
          .set(updates)
          .where(eq(postsTable.id, postId));
      }

      // Kalau content berubah, hashtag ikut berubah -> sinkron ulang kategori
      if (validatedData.content !== undefined) {
        const hashtags = extractHashtags(validatedData.content);

        if (hashtags.length) {
          await upsertCategories(hashtags);
        }

        await db
          .delete(postCategoriesTable)
          .where(eq(postCategoriesTable.postId, postId));

        if (hashtags.length) {
          const categoryIds = await getCategoryIdsByNames(hashtags);
          const rows = hashtags
            .map((name) => categoryIds.get(name))
            .filter((id): id is number => typeof id === "number")
            .map((categoryId) => ({ postId, categoryId }));

          if (rows.length) {
            await db.insert(postCategoriesTable).values(rows);
          }
        }
      }

      const updatedPost = await db.query.postsTable.findFirst({
        where: eq(postsTable.id, postId),
        with: {
          author: { columns: { id: true, username: true, avatarUrl: true } },
          postCategories: {
            with: { category: { columns: { id: true, name: true } } },
          },
        },
      });

      return res.status(200).json({
        success: true,
        message: "Post updated successfully",
        data: { post: updatedPost ? toPostResponse(updatedPost) : null },
      });
    } catch (error) {
      return this.handleError(error, res);
    }
  };

  // ==========================================
  // DELETE POST
  // ==========================================
  deletePost = async (req: Request, res: Response) => {
    try {
      const postId = Number(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({
          success: false,
          message: "Post ID harus berupa angka",
        });
      }

      const existingPost = await db.query.postsTable.findFirst({
        where: eq(postsTable.id, postId),
      });

      if (!existingPost) {
        return res.status(404).json({
          success: false,
          message: "Post tidak ditemukan",
        });
      }

      // Relasi di post_categories ikut terhapus lewat ON DELETE CASCADE
      await db.delete(postsTable).where(eq(postsTable.id, postId));

      return res.status(200).json({
        success: true,
        message: "Post deleted successfully",
      });
    } catch (error) {
      return this.handleError(error, res);
    }
  };
}

export default new PostController();
