import dotenv from "dotenv";
dotenv.config();

import { connectRabbitMQ } from "./config/rabbitmq";
import { startOrderCreatedConsumer } from "./consumer/orderCreatedConsumer";

async function start() {
    const channel = await connectRabbitMQ();
    startOrderCreatedConsumer(channel);
}

start().catch((err) => {
    console.log(`Failed to start notification_service:`, err);
    process.exit(1);
})