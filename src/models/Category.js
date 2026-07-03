import mongoose from "mongoose";
const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    parentId: String,
    description: String,
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);
export const Category = mongoose.model("Category", CategorySchema);
