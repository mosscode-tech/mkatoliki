import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { join } from "path";

// Dynamically target the .env file in the parent folder (server root)
dotenv.config({ path: join(process.cwd(), "..", ".env") });

const dbUri = process.env.MONGO_URI;

if (!dbUri) {
  console.error("❌ MONGO_URI is missing from your .env file!");
  console.log("Current path scanned:", join(process.cwd(), "..", ".env"));
  process.exit(1);
}

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, 
  passwordHash: { type: String },            
  role: { type: String, default: "user" },
  name: { type: String, default: "System Admin" }
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

async function runSeeder() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(dbUri);
    console.log("✅ Database connection established.");

    const adminEmail = "admin@mkatoliki.com";
    const adminPassword = "1234";

    console.log(`Checking for existing accounts matching: ${adminEmail}`);
    await User.deleteMany({ email: adminEmail.toLowerCase() });
    console.log("实时 Cleaned old duplicate records.");

    const salt = await bcrypt.genSalt(10);
    const generatedHash = await bcrypt.hash(adminPassword, salt);

    const ultimateAdmin = new User({
      email: adminEmail.toLowerCase(),
      password: generatedHash,     
      passwordHash: generatedHash, 
      role: "admin",
      name: "Mkatoliki Admin"
    });

    await ultimateAdmin.save();

    console.log("\n==================================================");
    console.log("🎉 SUCCESS: Admin user seeded securely into Mongo!");
    console.log(`📧 Email:    ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log(`🛡️  Role:     admin`);
    console.log("==================================================\n");

  } catch (error) {
    console.error("❌ Seeding operation terminated prematurely:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database.");
    process.exit(0);
  }
}

runSeeder();