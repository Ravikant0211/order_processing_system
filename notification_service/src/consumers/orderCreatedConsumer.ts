import { Channel, ConsumeMessage } from "amqplib";
import { ORDER_CREATED_QUEUE } from "../config/rabbitmq";
import { ProcessedOrderEventModel } from "../models/processedOrderEvent.model";

const DUPLICATE_KEY_ERROR_CODE = 11000;

export function startOrderCreatedConsumer(channel: Channel): void {
    // 'noAck: false' prevents messages from being removed from the queue without manual acknowledgement
    channel.consume(ORDER_CREATED_QUEUE, async (msg: ConsumeMessage | null) => {
        if (!msg) return;

        try {
            const payload = JSON.parse(msg.content.toString());

            try {
                await ProcessedOrderEventModel.create({ orderId: payload.orderId });
            } catch (err: any) {
                if (err.code === DUPLICATE_KEY_ERROR_CODE) {
                    console.log(
                        `[notification-service] duplicate delivery for orderId ${payload.orderId} - already processed, skipping`
                    );
                    channel.ack(msg);
                    return;
                }
                throw err;
            }

            console.log(
                `[notification-service] Sending order confirmation for order ${payload.orderId} ` +
                `(product ${payload.productId}, qty ${payload.quantity})`
            );
            
            // TEMPORARY, for the Milestone 4 duplicate-delivery exercise only:
            // widens the crash window between "processed" and "acked" so it's
            // humanly possible to kill the process in between on purpose.
            // await new Promise((resolve) => setTimeout(resolve, 5000));

            channel.ack(msg);
        } catch (err) {
            console.log(`Failed to process order.created message:`, (err as Error).message);
            // Reject the message without requeuing - a malformed message will never parse
            // successfully no matter how many times we redeliver it.
            channel.nack(msg, false, false);
        }
    }, { noAck: false });
}