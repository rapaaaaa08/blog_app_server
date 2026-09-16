import { Request, Response } from "express";

import {
  userIdSchema,
  userPostParamsSchema,
} from "../../../validations/post.validation";

import { db } from "../../../config/db";

import { postsTable, usersTable } from "../../../config/schema";

import { and, desc, eq } from "drizzle-orm";

import { AuthRequest } from "../../middleware/auth.middleware";

import { uploadToCloudinary } from "../../../services/cloudinary.service";

export class UsersController {
  // ==========================================
  // GET ALL USERS
  // Dipakai mobile buat dropdown "Penulis" waktu bikin artikel.
  // ==========================================
  getAllUsers = async (_req: Request, res: Response) => {
    try {
      const users = await db
        .select({
          id: usersTable.id,
          username: usersTable.username,
        })
        .from(usersTable)
        .orderBy(usersTable.id);

      return res.status(200).json({
        success: true,
        message: "Get all users successfully",
        data: { users },
      });
    } catch (error: any) {
      console.error("Get all users error:", error);

      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  };

  // ==========================================
  // GET CURRENT USER / USER YANG SEDANG LOGIN
  // ==========================================
  getCurrentUser = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "User belum login",
        });
      }

      const [user] = await db
        .select({
          id: usersTable.id,
          username: usersTable.username,
          email: usersTable.email,
          role: usersTable.role,
          avatarUrl: usersTable.avatarUrl,
          avatarPublicId: usersTable.avatarPublicId,
          createdAt: usersTable.createdAt,
          updatedAt: usersTable.updatedAt,
        })
        .from(usersTable)
        .where(eq(usersTable.id, req.user.id));

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User tidak ditemukan",
        });
      }

      return res.status(200).json({
        success: true,
        message: "User retrieved successfully",
        data: {
          user,
        },
      });
    } catch (error: any) {
      console.error("Get current user error:", error);

      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  };

  // ==========================================
  // GET ALL POSTS BY USER ID
  // ==========================================
  getPostsByUserId = async (req: Request, res: Response) => {
    try {
      const validateParams = userIdSchema.parse(req.params);
      const { userId } = validateParams;

      const posts = await db
        .select()
        .from(postsTable)
        .where(
          and(
            eq(postsTable.userId, userId),
            eq(postsTable.status, "published"),
          ),
        )
        .orderBy(desc(postsTable.createdAt));

      return res.status(200).json({
        success: true,
        message: "Retrieving post succesfully",
        data: {
          posts,
        },
      });
    } catch (error: any) {
      console.error("Read post by user ID error:", error);

      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  };

  // ==========================================
  // GET SPECIFIC POST BY USER ID & POST ID
  // ==========================================
  getUserPost = async (req: Request, res: Response) => {
    try {
      const validatedParams = userPostParamsSchema.parse(req.params);
      const { userId, postId } = validatedParams;

      const [post] = await db
        .select()
        .from(postsTable)
        .where(
          and(
            eq(postsTable.id, postId),
            eq(postsTable.userId, userId),
            eq(postsTable.status, "published"),
          ),
        );

      if (!post) {
        return res.status(404).json({
          success: false,
          message: "Post not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Post retrieved successfully",
        data: {
          post,
        },
      });
    } catch (error: any) {
      console.error("Get user post error:", error);

      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  };

  // ==========================================
  // UPDATE AVATAR (BARU)
  // ==========================================
  updateAvatar = async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "User belum login",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "File gambar wajib diupload",
        });
      }

      const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, req.user.id),
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User tidak ditemukan",
        });
      }

      // Upload ke Cloudinary
      const uploadResult = await uploadToCloudinary(req.file.buffer);

      // Update DB
      await db
        .update(usersTable)
        .set({
          avatarUrl: uploadResult.secure_url,
          avatarPublicId: uploadResult.public_id,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, req.user.id));

      const updatedUser = await db.query.usersTable.findFirst({
        where: eq(usersTable.id, req.user.id),
        columns: {
          id: true,
          username: true,
          email: true,
          role: true,
          avatarUrl: true,
          avatarPublicId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Avatar updated successfully",
        data: { user: updatedUser },
      });
    } catch (error: any) {
      console.error("Update avatar error:", error);

      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  };
}

export default new UsersController();