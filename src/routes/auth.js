import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  const { email, password } = req.body;
  console.log(email, password)

  try {
    // 1. Basic input validation
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // 2. Lookup user in the database
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 3. Determine the stored hash field (handles schema property variations gracefully)
    const storedPasswordHash = user.password || user.passwordHash;
    if (!storedPasswordHash) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 4. Compare the supplied plain text password against the stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, storedPasswordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 5. Generate a secure signature token valid for 8 hours
    const token = jwt.sign(
      { id: user._id || user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "8h" },
    );

    // 6. Return response payload to user interface matching frontend expectancies
    return res.json({
      token,
      user: { 
        name: user.name || user.email.split("@")[0], // Fallback if name field isn't present
        email: user.email, 
        role: user.role 
      },
    });

  } catch (error) {
    return next(error);
  }
});