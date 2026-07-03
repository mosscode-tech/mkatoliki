import { Router } from "express";
import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { Category } from "../models/Category.js";
import { Order } from "../models/Order.js";
import { requireAdmin } from "../middleware/auth.js";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

export const adminRouter = Router(); 

// 1. Configure Multer memory storage allocation middleware
const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).single("image");

const editableProductFields = [
  "name",
  "brand",
  "description",
  "price",
  "available",
  "images",
  "variants",
  "categoryIds",
  "tags",
  "attributes",
];

function productMatches(product, id) {
  return product.id === id || product.slug === id || String(product._id) === id;
}

function sanitizeProductUpdate(body) {
  const update = {};
  for (const field of editableProductFields) {
    if (body[field] !== undefined) update[field] = body[field];
  }
  if (update.price !== undefined) update.price = Number(update.price);
  if (update.currency === undefined) update.currency = "KES";
  return update;
}

adminRouter.get("/analytics", requireAdmin, async (_req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const [orders, productCount, categoryCount] = await Promise.all([
        Order.find({}).lean(),
        Product.countDocuments(),
        Category.countDocuments(),
      ]);
      return res.json({
        revenue: orders.reduce(
          (sum, order) => sum + Number(order.totalPrice || 0),
          0,
        ),
        orders: orders.length,
        productCount,
        categoryCount,
      });
    }
    return res.json({
      revenue: 0,
      orders: 0,
      productCount: 0,
      categoryCount: 0,
    });
  } catch (e) {
    return next(e);
  }
});

adminRouter.get("/products", requireAdmin, async (_req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1)
      return res.json(await Product.find({}).lean());
    return res.json([]);
  } catch (e) {
    return next(e);
  }
});


adminRouter.patch("/products/:id", requireAdmin, upload, async (req, res, next) => {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const query = mongoose.isValidObjectId(req.params.id)
      ? { _id: req.params.id }
      : { slug: req.params.id };

    const existingProduct = await Product.findOne(query);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    const update = sanitizeProductUpdate(req.body);

    if (req.file) {
      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      
      const uploadResponse = await cloudinary.uploader.upload(base64Image, {
        folder: "mkatoliki_products",
      });

      update.images = [uploadResponse.secure_url];
    }

    if (req.body.available !== undefined) {
      update.available = req.body.available === "true" || req.body.available === true;
    }

    if (update.name && update.name !== existingProduct.name) {
      update.slug = update.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");
    }

    const updatedProduct = await Product.findOneAndUpdate(query, update, {
      new: true,
      runValidators: true,
    }).lean();

    return res.json({ message: "Product updated successfully", product: updatedProduct });
  } catch (e) {
    return next(e);
  }
});


adminRouter.delete("/products/:id", requireAdmin, async (req, res, next) => {
  try {
    const paramId = req.params.id;

    // Build a flexible query array targeting any possible identifier structural variation
    const queryConditions = [
      { slug: paramId },
      { id: paramId }
    ];

    // Explicitly safe-guard hex validations to prevent Mongoose CastErrors
    if (mongoose.isValidObjectId(paramId)) {
      queryConditions.push({ _id: paramId });
    }

    // Execute lookup targeting any matching profile property criteria
    const deletedProduct = await Product.findOneAndDelete({ $or: queryConditions });
    
    if (!deletedProduct) {
      return res.status(404).json({ 
        message: `Product matching reference "${paramId}" not found or already removed.` 
      });
    }

    return res.json({ 
      message: `Product "${deletedProduct.name}" removed successfully from inventory.` 
    });
  } catch (e) {
    return next(e);
  }
});

adminRouter.post("/products", requireAdmin, upload, async (req, res, next) => {
  try {
    // ✅ FIX: Force Cloudinary initialization here to guarantee .env variables exist in runtime context
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const { name, price, description, available } = req.body;

    // Validation
    if (!name || !price || !description) {
      return res.status(400).json({ 
        message: "Validation Failed: Name, price, and description are required." 
      });
    }

    let imageUrls = [];

    // If the frontend sent an image file, upload it to Cloudinary
    if (req.file) {
      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      
      const uploadResponse = await cloudinary.uploader.upload(base64Image, {
        folder: "mkatoliki_products",
      });

      imageUrls.push(uploadResponse.secure_url); // Save live standard HTTPS URL
    }

    // Generate URL slug
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

    // Create and save the product inside MongoDB
    const newProduct = new Product({
      name,
      slug,
      description,
      price: Number(price),
      currency: "KES",
      available: available === "true" || available === true, 
      images: imageUrls,
      popularity: 0,
      createdAt: new Date().toISOString()
    });

    await newProduct.save();

    return res.status(201).json({
      message: "Product created successfully!",
      product: newProduct,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "A product with a similar name already exists." });
    }
    return next(error);
  }
});