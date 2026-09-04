import dotenv from "dotenv";
import app from "./app";
import { connectDB } from "./config/db";
import { connectRabbitMq } from "./config/rabbitmq";
import { startOutboxRelay } from "./outbox/orderEventRelay";

dotenv.config();

const PORT = process.env.PORT || 3002;

async function start(): Promise<void> {
    await connectDB();
    await connectRabbitMq();
    startOutboxRelay();
    app.listen(PORT, () => {
        console.log(`Order service listening on PORT: ${PORT}`);
    })
}

start().catch((err) => {
    console.log(`Failed to start the Order service:`, err);
    process.exit(1);
})