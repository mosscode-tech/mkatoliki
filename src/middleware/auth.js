import jwt from "jsonwebtoken";
export function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Authentication required" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    if (payload.role !== "admin") return res.status(403).json({ message: "Admin access required" });
    req.user = payload;
    return next();
  } catch { return res.status(401).json({ message: "Invalid or expired token" }); }
}
