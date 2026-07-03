import { Router } from "express";
import { Product } from "../models/Product.js";

export const productsRouter = Router();

/**
 * GET /api/products
 * Fetch all products with optional filters (search, category, price, sorting)
 */
productsRouter.get("/", async (req, res, next) => {
  try {
    const { search, category, minPrice, maxPrice, available, sort } = req.query;
    
    // 1. Build the MongoDB Filter Object dynamically
    const databaseQuery = {};

    // Filter by Search Term (matches Name, Brand, or Description)
    if (search) {
      databaseQuery.$or = [
        { name: { $regex: search, $options: "i" } },        // "i" means case-insensitive
        { brand: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } }
      ];
    }

    // Filter by Category
    if (category && category !== "all") {
      databaseQuery.categoryIds = category;
    }

    // Filter by Price range
    if (minPrice || maxPrice) {
      databaseQuery.price = {};
      if (minPrice) databaseQuery.price.$gte = Number(minPrice); // Greater than or equal to
      if (maxPrice) databaseQuery.price.$lte = Number(maxPrice); // Less than or equal to
    }

    // Filter by Availability
    if (available === "true") {
      databaseQuery.available = true;
    }

    // 2. Determine Sorting Rules
    let sortRule = { popularity: -1 }; // Default: Highest popularity first
    if (sort === "price-asc")  sortRule = { price: 1 };       // Price: Low to High
    if (sort === "price-desc") sortRule = { price: -1 };      // Price: High to Low
    if (sort === "newest")     sortRule = { createdAt: -1 };  // Newest items first

    // 3. Execute the Query in MongoDB
    const foundProducts = await Product.find(databaseQuery)
      .sort(sortRule)
      .lean();

    return res.json(foundProducts);
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/products/:slug
 * Fetch a single product by its unique slug identifier
 */
productsRouter.get("/:slug", async (req, res, next) => {
  try {
    const targetProduct = await Product.findOne({ slug: req.params.slug }).lean();

    if (!targetProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.json(targetProduct);
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/products/:slug/related
 * Fetch up to 4 similar items in the same category
 */
productsRouter.get("/:slug/related", async (req, res, next) => {
  try {
    // Find the original item first
    const originalProduct = await Product.findOne({ slug: req.params.slug }).lean();
    if (!originalProduct) return res.json([]);

    // Find other items sharing any of the same category IDs
    const relatedProducts = await Product.find({
      _id: { $ne: originalProduct._id }, // Don't include the same product
      categoryIds: { $in: originalProduct.categoryIds } // Shares a category
    })
    .limit(4)
    .lean();

    return res.json(relatedProducts);
  } catch (error) {
    return next(error);
  }
});

