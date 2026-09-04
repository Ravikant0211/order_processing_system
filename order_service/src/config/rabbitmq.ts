import amqp, { ConfirmChannel } from "amqplib";

const RECONNECT_DELAY_MS = 3000;

export const ORDER_EVENTS_EXCHANGE = "order_events";

let channel: ConfirmChannel | null = null;

export async function connectRabbitMq(): Promise<void> {
    const uri = process.env.RABBITMQ_URL;
    if (!uri) throw new Error('RABBITMQ_URI is not set');
    const connection = await amqp.connect(uri);
    // Confirm channel not a plain one: gives us real acknowledgement from the broker
    // that it has the message durably
    channel = await connection.createConfirmChannel();
    await channel.assertExchange(ORDER_EVENTS_EXCHANGE, "topic", { durable: true });
    console.log(`Connected to RabbitMQ:`, uri);

    connection.on("close", () => {
        console.warn("[rabbitmq] Connection closed, will try to reconnect");
        channel = null;
        scheduleReconnect();
    })

    connection.on("error", (err) => {
        console.error("[rabbitmq] Connection error:", err.message);
    });
}

function scheduleReconnect(): void {
    setTimeout(() => {
        connectRabbitMq().catch((err) => {
            console.error("[rabbitmq] Reconnect attempt failed:", (err as Error).message);
            scheduleReconnect();
        });
    }, RECONNECT_DELAY_MS);
}

export function getChannel(): ConfirmChannel {
    if (!channel) {
        throw new Error("RabbitMQ channel not initialised - call connectRabbitMq() first.");
    }
    return channel;
}