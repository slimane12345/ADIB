import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const dbPath = process.env.DATABASE_PATH || "adib.db";
const db = new Database(dbPath);
const JWT_SECRET = process.env.JWT_SECRET || "adib-secret-key-123";

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

db.exec(`
  CREATE TABLE IF NOT EXISTS ads_generated (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    product_name TEXT,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Migration: Add is_admin if it doesn't exist
try {
  db.prepare("SELECT is_admin FROM users LIMIT 1").get();
} catch (e) {
  console.log("Adding is_admin column to users table...");
  db.exec("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`);

// Initialize default settings
const defaultSettings = [
  { key: 'bank_name', value: 'CIH Bank' },
  { key: 'account_name', value: 'ADIB AI PLATFORM' },
  { key: 'rib', value: '230 780 1234567890 1234 567' },
  { key: 'whatsapp_number', value: '06XXXXXXXX' }
];

const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
defaultSettings.forEach(s => insertSetting.run(s.key, s.value));

db.exec(`
  CREATE TABLE IF NOT EXISTS payment_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    email TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Middleware for Admin only
  const adminOnly = (req: any, res: any, next: any) => {
    const user = db.prepare("SELECT is_admin, email FROM users WHERE id = ?").get(req.userId) as any;
    if ((user && user.is_admin) || user?.email === "elegancecom71@gmail.com") {
      next();
    } else {
      res.status(403).json({ success: false, message: "Forbidden: Admin access only" });
    }
  };

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

  // Settings Routes
  app.get("/api/settings", (req, res) => {
    try {
      const settings = db.prepare("SELECT * FROM settings").all() as any[];
      const settingsObj = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
      res.json(settingsObj);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/admin/settings", authenticate, adminOnly, (req, res) => {
    try {
      const updates = req.body; // { key: value, ... }
      const updateStmt = db.prepare("UPDATE settings SET value = ? WHERE key = ?");
      
      db.transaction(() => {
        for (const [key, value] of Object.entries(updates)) {
          updateStmt.run(value as string, key);
        }
      })();
      
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Payment Request Routes
  app.post("/api/payment/request", authenticate, (req: any, res) => {
    try {
      const user = db.prepare("SELECT email FROM users WHERE id = ?").get(req.userId) as any;
      if (!user) return res.status(404).json({ error: "User not found" });

      // Check if there's already a pending request
      const existing = db.prepare("SELECT id FROM payment_requests WHERE user_id = ? AND status = 'pending'").get(req.userId);
      if (existing) {
        return res.json({ success: true, message: "Request already pending" });
      }

      db.prepare("INSERT INTO payment_requests (user_id, email) VALUES (?, ?)").run(req.userId, user.email);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to submit request" });
    }
  });

  app.get("/api/admin/payment-requests", authenticate, adminOnly, (req, res) => {
    try {
      const requests = db.prepare("SELECT * FROM payment_requests ORDER BY created_at DESC").all();
      res.json({ success: true, requests });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  app.post("/api/admin/payment-request/:id/action", authenticate, adminOnly, (req, res) => {
    try {
      const { id } = req.params;
      const { action } = req.body; // 'approve' or 'reject'
      
      const request = db.prepare("SELECT * FROM payment_requests WHERE id = ?").get(id) as any;
      if (!request) return res.status(404).json({ error: "Request not found" });

      if (action === 'approve') {
        db.transaction(() => {
          db.prepare("UPDATE users SET is_pro = 1 WHERE id = ?").run(request.user_id);
          db.prepare("UPDATE payment_requests SET status = 'approved' WHERE id = ?").run(id);
        })();
      } else {
        db.prepare("UPDATE payment_requests SET status = 'rejected' WHERE id = ?").run(id);
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  app.get("/api/user", authenticate, (req: any, res, next) => {
    try {
      const user = db.prepare("SELECT id, email, credits, is_pro, is_admin FROM users WHERE id = ?").get(req.userId) as any;
      if (!user) return res.status(404).json({ success: false, message: "User not found" });
      
      // Force admin for the developer email
      let isAdmin = Boolean(user.is_admin);
      if (user.email === "elegancecom71@gmail.com") {
        isAdmin = true;
        if (!user.is_admin) {
          db.prepare("UPDATE users SET is_admin = 1 WHERE id = ?").run(user.id);
        }
      }

      res.json({
        id: user.id,
        email: user.email,
        credits: user.credits,
        isPro: Boolean(user.is_pro),
        isAdmin: isAdmin
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/use-credit", authenticate, (req: any, res, next) => {
    try {
      const { productName, category } = req.body;
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId) as any;
      
      // Track generation
      db.prepare("INSERT INTO ads_generated (user_id, product_name, category) VALUES (?, ?, ?)").run(req.userId, productName || "Unknown", category || "General");

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
      res.json({ 
        success: true, 
        user: { 
          ...user, 
          isPro: Boolean(user.is_pro), 
          isAdmin: Boolean(user.is_admin) || user.email === "elegancecom71@gmail.com" 
        } 
      });
    } catch (err) {
      next(err);
    }
  });

  // Admin Routes
  app.get("/api/admin/stats", authenticate, adminOnly, (req, res, next) => {
    try {
      const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
      const totalAds = db.prepare("SELECT COUNT(*) as count FROM ads_generated").get() as any;
      const proUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE is_pro = 1").get() as any;
      const adsToday = db.prepare("SELECT COUNT(*) as count FROM ads_generated WHERE date(created_at) = date('now')").get() as any;
      
      const recentActivity = db.prepare(`
        SELECT a.*, u.email 
        FROM ads_generated a 
        JOIN users u ON a.user_id = u.id 
        ORDER BY a.created_at DESC 
        LIMIT 10
      `).all();

      res.json({
        stats: {
          totalUsers: totalUsers.count,
          totalAds: totalAds.count,
          proUsers: proUsers.count,
          adsToday: adsToday.count
        },
        recentActivity
      });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/admin/users", authenticate, adminOnly, (req, res, next) => {
    try {
      const users = db.prepare("SELECT id, email, credits, is_pro, is_admin FROM users ORDER BY id DESC").all();
      res.json({ users });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/admin/users/:id/update", authenticate, adminOnly, (req, res, next) => {
    try {
      const { id } = req.params;
      const { credits, is_pro, is_admin } = req.body;
      db.prepare("UPDATE users SET credits = ?, is_pro = ?, is_admin = ? WHERE id = ?")
        .run(credits, is_pro ? 1 : 0, is_admin ? 1 : 0, id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/admin/users/:id", authenticate, adminOnly, (req, res, next) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM users WHERE id = ?").run(id);
      db.prepare("DELETE FROM ads_generated WHERE user_id = ?").run(id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/admin/export/users", authenticate, adminOnly, (req, res, next) => {
    try {
      const users = db.prepare("SELECT id, email, credits, is_pro, is_admin FROM users").all();
      const csv = [
        ["ID", "Email", "Credits", "Is Pro", "Is Admin"],
        ...users.map((u: any) => [u.id, u.email, u.credits, u.is_pro, u.is_admin])
      ].map(e => e.join(",")).join("\n");
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=users_export.csv");
      res.send(csv);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/admin/export/report", authenticate, adminOnly, (req, res, next) => {
    try {
      const stats = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
      const ads = db.prepare("SELECT COUNT(*) as count FROM ads_generated").get() as any;
      const report = `Adib Platform Report\nGenerated: ${new Date().toISOString()}\nTotal Users: ${stats.count}\nTotal Ads Generated: ${ads.count}`;
      
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Content-Disposition", "attachment; filename=platform_report.txt");
      res.send(report);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/admin/cleanup", authenticate, adminOnly, (req, res, next) => {
    try {
      // Simple cleanup: delete users with no email (shouldn't happen) or very old inactive ones if we had last_login
      // For now, let's just mock a successful cleanup of "fake" looking emails
      const result = db.prepare("DELETE FROM users WHERE email NOT LIKE '%@%.%'").run();
      res.json({ success: true, deletedCount: result.changes });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/admin/broadcast", authenticate, adminOnly, (req, res, next) => {
    try {
      const { message } = req.body;
      // In a real app, we'd save this to a notifications table
      console.log(`BROADCAST MESSAGE: ${message}`);
      res.json({ success: true });
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
