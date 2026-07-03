import mongoose from "mongoose";
const VariantSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true },
    name: { type: String, required: true },
    price: Number,
    stock: { type: Number, default: 0 },
  },
  { _id: false },
);
const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    brand: String,
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "KES" },
    categoryIds: [{ type: String, index: true }],
    tags: [{ type: String, index: true }],
    images: [String],
    variants: [VariantSchema],
    attributes: mongoose.Schema.Types.Mixed,
    available: { type: Boolean, default: true, index: true },
    popularity: { type: Number, default: 0 },
  },
  { timestamps: true },
);
ProductSchema.index({ name: "text", description: "text", tags: "text" });
export const Product = mongoose.model("Product", ProductSchema);
