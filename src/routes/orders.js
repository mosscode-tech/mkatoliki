import { Router } from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";
import { Order } from "../models/Order.js";
export const ordersRouter = Router();
function makeReference() { return "MK-" + new Date().toISOString().slice(0, 10).replaceAll("-", "") + "-" + Math.random().toString(36).slice(2, 7).toUpperCase(); }
ordersRouter.post("/", [body("items").isArray({ min: 1 }), body("items.*.name").isString().trim().notEmpty(), body("items.*.price").isFloat({ min: 0 }), body("items.*.quantity").isInt({ min: 1 }), body("contactInfo.email").optional().isEmail().normalizeEmail()], async (req, res, next) => { try {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const totalPrice = req.body.items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  const order = { reference: makeReference(), items: req.body.items, totalPrice, currency: req.body.currency || "KES", contactInfo: req.body.contactInfo || {}, status: "pending", paymentMethod: req.body.paymentMethod || "WhatsApp", paymentStatus: "awaiting_confirmation" };
  if (mongoose.connection.readyState === 1) return res.status(201).json(await Order.create(order));
  return res.status(201).json(order);
} catch (e) { return next(e); } });
