import amqp, { Channel } from "amqplib";

const TIMEOUT_DELAY_MS = 3000;

const ORDER_EVENTS_EXCHANGE = "order_events";
const ORDER_CREATED_ROUTING_KEY = "order.created";

export const ORDER_CREATED_QUEUE = "notification.order-created";

export async function connectRabbitMQ(onConnected: (channel: Channel) => void): Promise<void> {
    const url = process.env.RABBITMQ_URL;
    if (!url) throw new Error("RABBITMQ_URL is not set");

    const connection = await amqp.connect(url);
    const channel = await connection.createChannel();

    // must match with the order-service's declaration (type + durable)
    await channel.assertExchange(ORDER_EVENTS_EXCHANGE, "topic", { durable: true });

    // This queue only belongs to notification-service - 
    // order-service has no knowledge of it
    await channel.assertQueue(ORDER_CREATED_QUEUE, { durable: true });
    await channel.bindQueue(ORDER_CREATED_QUEUE, ORDER_EVENTS_EXCHANGE, ORDER_CREATED_ROUTING_KEY);

    console.log("Connected to RabbitMQ:", url);
    onConnected(channel);

    // amqplib connection doesn't heal itself - without this, a dropped
    // connection leaves a consumer permanently dead, recoverable only by
    // restarting the whole process
    connection.on("close", () => {
        console.warn("[rabbitmq] Connection closed - will attempt to reconnect");
        scheduleReconnect(onConnected)
    });

    connection.on("error", (err) => {
        console.error("[rabbitmq] Connection error:", err.message);
    });
}

function scheduleReconnect(onConnected: (channel: Channel) => void): void {
    setTimeout(() => {
        connectRabbitMQ(onConnected).catch((err) => {
            console.error("[rabbitmq] Reconnect attempt failed:", (err as Error).message);
            scheduleReconnect(onConnected);
        });
    }, TIMEOUT_DELAY_MS);
}