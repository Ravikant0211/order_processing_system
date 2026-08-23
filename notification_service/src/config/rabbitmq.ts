import amqp, { Channel } from "amqplib";

const ORDER_EVENTS_EXCHANGE = "order_events";
const ORDER_CREATED_ROUTING_KEY = "order.created";

export const ORDER_CREATED_QUEUE = "notification.order-created";

export async function connectRabbitMQ(): Promise<Channel> {
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
    return channel;
}