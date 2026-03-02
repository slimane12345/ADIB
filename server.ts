import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const db = new Database("adib.db");
const JWT_SECRET = "adib-secret-key-123";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    credits INTEGER DEFAULT 5,
    is_pro BOOLEAN DEFAULT 0,
    is_admin BOOLEAN DEFAULT 0
  )
`);

// Migration: Add is_admin if it doesn't exist
try {
  db.prepare("SELECT is_admin FROM users LIMIT 1").get();
} catch (e) {
  console.log("Adding is_admin column to users table...");
  db.exec("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
      const isAdmin = userCount.count === 0 ? 1 : 0;
      
      const info = db.prepare("INSERT INTO users (email, password, is_admin) VALUES (?, ?, ?)").run(email, hashedPassword, isAdmin);
      const token = jwt.sign({ userId: info.lastInsertRowid }, JWT_SECRET);
      res.json({ success: true, token });
    } catch (err: any) {
      if (err.message.includes("UNIQUE constraint failed")) {
        return res.status(400).json({ success: false, message: "Email already exists" });
      }
      next(err);
    }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }
      const token = jwt.sign({ userId: user.id }, JWT_SECRET);
      res.json({ success: true, token });
    } catch (err) {
      next(err);
    }
  });

  // Middleware to authenticate JWT
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.userId = decoded.userId;
      next();
    } catch (err) {
      res.status(401).json({ success: false, message: "Invalid token" });
    }
  };

  app.get("/api/user", authenticate, (req: any, res, next) => {
    try {
      const user = db.prepare("SELECT id, email, credits, is_pro, is_admin FROM users WHERE id = ?").get(req.userId) as any;
      if (!user) return res.status(404).json({ success: false, message: "User not found" });
      res.json({
        id: user.id,
        email: user.email,
        credits: user.credits,
        isPro: Boolean(user.is_pro),
        isAdmin: Boolean(user.is_admin)
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/use-credit", authenticate, (req: any, res, next) => {
    try {
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId) as any;
      if (user.is_pro) {
        return res.json({ success: true, credits: user.credits, isPro: true });
      }
      if (user.credits > 0) {
        const newCredits = user.credits - 1;
        db.prepare("UPDATE users SET credits = ? WHERE id = ?").run(newCredits, req.userId);
        return res.json({ success: true, credits: newCredits, isPro: false });
      }
      res.status(403).json({ success: false, message: "No credits left" });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/upgrade", authenticate, (req: any, res, next) => {
    try {
      db.prepare("UPDATE users SET is_pro = 1, credits = 999999 WHERE id = ?").run(req.userId);
      const user = db.prepare("SELECT id, email, credits, is_pro, is_admin FROM users WHERE id = ?").get(req.userId) as any;
      res.json({ success: true, user: { ...user, isPro: Boolean(user.is_pro), isAdmin: Boolean(user.is_admin) } });
    } catch (err) {
      next(err);
    }
  });

  // Error handler for API routes
  app.use("/api", (err: any, req: any, res: any, next: any) => {
    console.error("API Error:", err);
    res.status(500).json({ success: false, message: err.message || "Internal server error" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
