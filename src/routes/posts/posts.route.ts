import { Router } from "express";

import PostsController from "../../controllers/auth/posts/posts.controller";

import { uploadSingleImage } from "../../controllers/middleware/upload.middleware";

const router = Router();

// ==========================================
// GET ALL POSTS
// ==========================================
router.get("/", PostsController.getAllPosts);

// ==========================================
// GET POST DETAIL
// ==========================================
router.get("/:id", PostsController.getPostById);

// ==========================================
// CREATE POST
// ==========================================
router.post("/", uploadSingleImage, PostsController.createPost);

// ==========================================
// UPDATE POST
// ==========================================
router.put("/:id", uploadSingleImage, PostsController.updatePost);


// ==========================================
// DELETE POST
// ==========================================
router.delete("/:id", PostsController.deletePost);



export default router;
