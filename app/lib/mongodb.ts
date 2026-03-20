// /app/lib/mongodb.ts
// MongoDB connection singleton for serverless (Vercel)

import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;

if (!uri) throw new Error("MONGODB_URI environment variable not set");

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  // In development, use a global variable to preserve connection across HMR
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production, create a new client
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export default clientPromise;

export async function getDb() {
  const client = await clientPromise;
  return client.db("boxboxboard");
}

export async function getUserDoc(custId: number) {
  const db = await getDb();
  return db.collection("users").findOne({ cust_id: custId });
}

export async function upsertUserDoc(
  custId: number,
  data: Partial<{ favorites: number[]; schedule: number[] }>,
) {
  const db = await getDb();
  return db
    .collection("users")
    .updateOne(
      { cust_id: custId },
      {
        $set: { ...data, updatedAt: new Date() },
        $setOnInsert: { cust_id: custId, createdAt: new Date() },
      },
      { upsert: true },
    );
}
