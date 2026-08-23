import dotenv from "dotenv";
dotenv.config();

import { connectRabbitMQ } from "./config/rabbitmq";
import { connectDB } from "./config/db";
import { startOrderCreatedConsumer } from "./consumers/orderCreatedConsumer";

async function start() {
    await connectDB();
    const channel = await connectRabbitMQ();
    startOrderCreatedConsumer(channel);
}

start().catch((err) => {
    console.log(`Failed to start notification_service:`, err);
    process.exit(1);
})