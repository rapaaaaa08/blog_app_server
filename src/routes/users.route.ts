import { Router } from "express";

import { authenticate } from "../controllers/middleware/auth.middleware";
import { uploadSingleImage } from "../controllers/middleware/upload.middleware";

import UsersController from "../controllers/auth/users/users.controller";

const router = Router();

// ==========================================
// GET ALL USERS
// Dipakai mobile buat pilih penulis artikel (mobile tanpa login).
// ==========================================
router.get("/", UsersController.getAllUsers);

// ==========================================
// GET CURRENT LOGGED-IN USER
// ==========================================
router.get("/me", authenticate, UsersController.getCurrentUser);

// ==========================================
// UPDATE AVATAR  ← INI YANG HARUS ADA
// ==========================================
router.put(
  "/avatar",
  authenticate,
  uploadSingleImage,
  UsersController.updateAvatar,
);

// ==========================================
// GET ALL POSTS BY USER ID
// ==========================================
router.get("/:userId", authenticate, UsersController.getPostsByUserId);

// ==========================================
// GET SPECIFIC POST BY USER ID & POST ID
// ==========================================
router.get("/:userId/posts/:postId", authenticate, UsersController.getUserPost);

export default router;