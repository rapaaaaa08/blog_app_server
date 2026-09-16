import { Router } from "express";
import CategoriesController from "../../controllers/categories/categories.controller";

const router = Router();

// GET /categories/search?q=kul
router.get("/search", CategoriesController.search);

// GET /categories/trending
router.get("/trending", CategoriesController.trending);

// GET /categories/:name/posts
router.get("/:name/posts", CategoriesController.postsByCategory);

export default router;