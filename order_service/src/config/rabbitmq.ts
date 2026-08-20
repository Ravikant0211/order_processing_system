import amqp, { Channel } from "amqplib";

export const ORDER_EVENTS_EXCHANGE = "order_events";

let channel: Channel | null = null;

export async function connectRabbitMq(): Promise<void> {
    const uri = process.env.RABBITMQ_URL;
    if (!uri) throw new Error('RABBITMQ_URI is not set');
    const connection = await amqp.connect(uri);
    channel = await connection.createChannel();
    await channel.assertExchange(ORDER_EVENTS_EXCHANGE, "topic", { durable: true });
    console.log(`Connected to RabbitMQ:`, uri);
}

export function getChannel(): Channel {
    if (!channel) {
        throw new Error("RabbitMQ channel not initialised - call connectRabbitMq() first.");
    }
    return channel;
}