// 1. Force load the .env file immediately from the absolute root path
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import mongoose from "mongoose";

import { productsRouter } from "./routes/products.js";
import { categoriesRouter } from "./routes/categories.js";
import { ordersRouter } from "./routes/orders.js";
import { authRouter } from "./routes/auth.js";
import { adminRouter } from "./routes/admin.js";

const app = express();
const defaultPort = Number(process.env.PORT || 4000);

const allowedOrigins = [
  "http://localhost:5173",
  "https://mkatoliki.co.ke",
  "https://www.mkatoliki.co.ke",
];

// Middleware
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no Origin (Postman, curl, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 250,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// Health Check Route
app.get("/api/health", (_req, res) =>
  res.json({
    ok: true,
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  }),
);

// Routes
app.use("/api/products", productsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin/fucktheadmin", adminRouter);

// Global Error Handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .json({ message: err.message || "Something went wrong" });
});

// Unconditional Database Startup
async function start() {
  if (!process.env.MONGO_URI) {
    console.error("❌ Error: MONGODB_URI is totally missing from your .env file!");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB successfully connected!");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }

  const server = app.listen(defaultPort,'0.0.0.0', () =>
    console.log("🚀 mkatoliki API listening on http://localhost:" + defaultPort),
  );

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`❌ Port ${defaultPort} is already in use. Please stop the existing process or set PORT to a different value.`);
      process.exit(1);
    } else {
      console.error("❌ Server startup failed:", error.message);
      process.exit(1);
    }
  });
}

start();