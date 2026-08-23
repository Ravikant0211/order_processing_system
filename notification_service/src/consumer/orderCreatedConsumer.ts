import { Channel, ConsumeMessage } from "amqplib";
import { ORDER_CREATED_QUEUE } from "../config/rabbitmq";

export function startOrderCreatedConsumer(channel: Channel): void {
    // 'noAck: false' prevents messages from being removed from the queue without manual acknowledgement
    channel.consume(ORDER_CREATED_QUEUE, (msg: ConsumeMessage | null) => {
        if (!msg) return;

        try {
            const payload = JSON.parse(msg.content.toString());
            console.log(
                `[notification-service] Sending order confirmation for order ${payload.orderId} ` +
                `(product ${payload.productId}, qty ${payload.quantity})`
            );
            channel.ack(msg);
        } catch (err) {
            console.log(`Failed to process order.created message:`, (err as Error).message);
            // Reject the message without requeuing - a malformed message will never parse
            // successfully no matter how many times we redeliver it.
            channel.nack(msg, false, false);
        }
    }, { noAck: false });
}