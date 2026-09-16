import { z } from "zod";

// ==========================================
// VALIDATION CREATE POST
// ==========================================
export const createPostSchema = z.object({
  userId: z.coerce.number().int().positive(),

  title: z
    .string()
    .min(3, "Title minimal 3 karakter")
    .max(255, "Maksimal 255 karakter"),

  content: z.string().min(10, "Minimal 10 karakter"),
});

// ==========================================
// VALIDATION UPDATE POST
// ==========================================
export const updatePostSchema = z.object({
  title: z
    .string()
    .min(3, "Title minimal 3 karakter")
    .max(255, "Maksimal 255 karakter")
    .optional(),

  content: z.string().min(10, "Minimal 10 karakter").optional(),
});

// ==========================================
// VALIDATION GET POSTS BY USER
// ==========================================
export const userIdSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

// ==========================================
// VALIDATION GET USER POST
// ==========================================
export const userPostParamsSchema = z.object({
  userId: z.coerce.number().int().positive(),

  postId: z.coerce.number().int().positive(),
});
