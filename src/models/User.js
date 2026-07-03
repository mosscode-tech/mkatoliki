import mongoose from "mongoose";
const AddressSchema = new mongoose.Schema(
  {
    label: String,
    line1: String,
    line2: String,
    city: String,
    country: String,
    phone: String,
  },
  { _id: false },
);
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    addresses: [AddressSchema],
  },
  { timestamps: true },
);
export const User = mongoose.model("User", UserSchema);
