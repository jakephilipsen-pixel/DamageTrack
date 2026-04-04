import express from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import path from "path";

import "./types"; // augment express-session types

import authRoutes from "./routes/auth";
import productRoutes from "./routes/products";
import employeeRoutes from "./routes/employees";
import reasonRoutes from "./routes/reasons";
import reportRoutes from "./routes/reports";
import exportRoutes from "./routes/export";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
const isDev = process.env.NODE_ENV !== "production";

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // allow serving uploaded images cross-origin
  })
);

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Session (MemoryStore for dev — fine for 3 users)
// ---------------------------------------------------------------------------
app.use(
  session({
    secret: process.env.SESSION_SECRET || "damagetrack-dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: !isDev, // HTTPS only in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: isDev ? "lax" : "strict",
    },
  })
);

// ---------------------------------------------------------------------------
// Static files — serve uploaded photos and thumbnails
// ---------------------------------------------------------------------------
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/reasons", reasonRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/export", exportRoutes);

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);

  // Multer errors
  if (err.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ error: "File too large. Maximum size is 20MB." });
    return;
  }
  if (err.code === "LIMIT_FILE_COUNT") {
    res.status(413).json({ error: "Too many files. Maximum is 10." });
    return;
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    res.status(400).json({ error: "Unexpected file field" });
    return;
  }

  // Generic multer / validation errors
  if (err.message && err.message.includes("not allowed")) {
    res.status(400).json({ error: err.message });
    return;
  }

  res.status(500).json({
    error: isDev ? err.message : "Internal server error",
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`DamageTrack V2 API running on http://localhost:${PORT}`);
  console.log(`Environment: ${isDev ? "development" : "production"}`);
});

export default app;
