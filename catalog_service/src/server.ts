import dotenv from "dotenv";
import app from "./app";
import { connectDB } from "./config/db";

dotenv.config();

const PORT = process.env.PORT || 3001;

async function start(): Promise<void> {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Catalog service listening on Port ${PORT}`);
    })
}

start().catch((err) => {
    console.log(`Failed to start catalog service: ${err}`);
    process.exit(1);
})