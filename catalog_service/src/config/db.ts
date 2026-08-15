import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) throw new Error("MONGO_URI is not set");
        console.log("Catalog service connecting to DB:", uri);
        await mongoose.connect(uri);
        console.log("Catalog service connected to DB:", uri);
    } catch (err) {
        throw err;
    }
}