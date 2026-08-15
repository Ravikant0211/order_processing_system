import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) throw new Error("MONGO_URI is not set");
        console.log(`Order service connecting to DB:`, uri);
        await mongoose.connect(uri);
        console.log(`Order service connected to DB:`, uri);
    } catch(err) {
        throw err;
    }
}