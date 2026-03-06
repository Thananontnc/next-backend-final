import { getClientPromise } from "@/lib/mongodb";
import bcrypt from "bcrypt";

export async function ensureIndexes() {
  const client = await getClientPromise();
  const db = client.db("library");
  const userCollection = db.collection("users");
  await userCollection.createIndex({ email: 1 }, { unique: true });

  const adminExists = await userCollection.findOne({ email: "admin@test.com" });
  if (!adminExists) {
    const adminPassword = await bcrypt.hash("admin123", 10);
    await userCollection.insertOne({
      email: "admin@test.com",
      password: adminPassword,
      role: "ADMIN"
    });
  }

  const userExists = await userCollection.findOne({ email: "user@test.com" });
  if (!userExists) {
    const userPassword = await bcrypt.hash("user123", 10);
    await userCollection.insertOne({
      email: "user@test.com",
      password: userPassword,
      role: "USER"
    });
  }
}