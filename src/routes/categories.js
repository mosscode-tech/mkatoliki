import { Router } from "express";
import mongoose from "mongoose";
import { Category } from "../models/Category.js";
export const categoriesRouter = Router();
categoriesRouter.get("/", async (_req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1)
      return res.json(
        await Category.find({}).sort({ order: 1, name: 1 }).lean(),
      );
    return res.json(seedCategories);
  } catch (e) {
    return next(e);
  }
});
