import { getChannel, ORDER_EVENTS_EXCHANGE  } from "../config/rabbitmq";

const ORDER_CREATED_ROUTING_KEY = "order.created";

interface OrderCreatedPayload {
    orderId: unknown;
    productId: string;
    quantity: number;
    status: string;
    createdAt?: Date;
}

export function publishOrderCreated(payload: OrderCreatedPayload): void {
    try {
        const channel = getChannel();
        channel.publish(
            ORDER_EVENTS_EXCHANGE,
            ORDER_CREATED_ROUTING_KEY,
            Buffer.from(JSON.stringify(payload)),
            { persistent: true }
        );
    } catch (err) {
        // Publish failures are swallowed on purpose for now — an order is still
        // valid even if nobody hears about it yet. This is the exact gap the
        // outbox pattern (Milestone 6) exists to close.
        console.log("Failed to publish order.created event:", (err as Error).message);
    }
}