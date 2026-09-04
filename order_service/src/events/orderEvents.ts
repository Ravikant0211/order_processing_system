import { getChannel, ORDER_EVENTS_EXCHANGE  } from "../config/rabbitmq";

const ORDER_CREATED_ROUTING_KEY = "order.created";

interface OrderCreatedPayload {
    orderId: unknown;
    productId: string;
    quantity: number;
    status: string;
    createdAt?: Date;
}

export function publishOrderCreated(payload: OrderCreatedPayload): Promise<void> {
    const channel = getChannel();

    return new Promise((resolve, reject) => {
        channel.publish(
            ORDER_EVENTS_EXCHANGE,
            ORDER_CREATED_ROUTING_KEY,
            Buffer.from(JSON.stringify(payload)),
            { persistent: true },
            (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            }
        );
    });
}