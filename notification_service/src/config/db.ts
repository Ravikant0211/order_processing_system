import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
    const url = process.env.MONGODB_URL;
    if (!url) throw new Error("MONGODB_URL is not set");
    console.log(`notification-service connecting to DB:`, url);
    await mongoose.connect(url);    
    console.log(`notification-service connected to DB:`, url);
}