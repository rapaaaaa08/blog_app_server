import "dotenv/config";
import express from "express";
import cors from "cors";
import os from "os";

import authRoute from "./controllers/auth/auth.route";
import postsRoute from "./routes/posts/posts.route";
import usersRoute from "./routes/users.route";
import categoriesRoute from "./routes/categories/categories.route";

const app = express();
const PORT = 3006;

app.use(cors());
app.use(express.json());

app.use("/api/v1/auth", authRoute);
app.use("/api/v1/posts", postsRoute);
app.use("/api/v1/users", usersRoute);
app.use("/api/v1/categories", categoriesRoute);

app.get("/", (req, res) => {
  res.send("yg baca kek kontol");
});

// ==========================================
// ERROR HANDLER
// ==========================================
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Global error:", err.message);

    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File terlalu besar (max 5MB)",
      });
    }

    if (err.message && err.message.includes("Hanya file gambar")) {
      return res.status(400).json({
        success: false,
        message: "Hanya file gambar yang diperbolehkan",
      });
    }

    return res.status(500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
);

app.listen(PORT, () => {
  const ipaddress =
    Object.values(os.networkInterfaces())
      .flat()
      .find(
        (address) =>
          address && !address.internal && address.family === "IPv4"
      )?.address ?? "localhost";

  console.log(`[server]: server is running at http://localhost:${PORT}`);
  console.log(`[server]: server is running at http://${ipaddress}:${PORT}`);
});