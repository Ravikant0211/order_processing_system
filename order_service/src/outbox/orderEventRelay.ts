import { publishOrderCreated } from "../events/orderEvents";
import { OrderModel } from "../models/order.model";

const RELAY_INTERVAL_MS = 3000;
const BATCH_SIZE = 10;

interface RelayableOrder {
    _id: unknown;
    productId: string;
    quantity: number;
    status: string;
    createdAt?: Date;
}

// Publishes one order's event and atomically marks it published only on confirmed success. 
// Shared by order.service's inline best-effort attempt and
// this file's own poll below — safe to call concurrently for the same
// order from both paths, since the atomic conditional update means only one
// write ever wins; the other becomes a no-op.
export async function publishAndMarkOrderEvent(order: RelayableOrder): Promise<void> {
    await publishOrderCreated({
        orderId: order._id,
        productId: order.productId,
        quantity: order.quantity,
        status: order.status,
        createdAt: order.createdAt
    });

    await OrderModel.findOneAndUpdate(
        { _id: order._id, eventPublished: false },
        { eventPublished: true }
    );
}

async function relayPendingOrderEvents(): Promise<void> {
    const pendingOrders = await OrderModel.find({ eventPublished: false }).limit(BATCH_SIZE);

    for (const order of pendingOrders) {
        try {
            await publishAndMarkOrderEvent(order);
        } catch (err) {
            // Leave eventPublished: false, next relay cycle picks it up
            console.error(
                `[outbox] Failed to relay order.created for order ${order._id}`,
                (err as Error).message
            );
            // throw err;
        }
    }
}

export function startOutboxRelay(): void {
    setInterval(() => {
        relayPendingOrderEvents().catch((err) => {
            console.error("[outbox] Relay cycle failed:", (err as Error).message);
        });
    }, RELAY_INTERVAL_MS);

    console.log(`[outbox] Relay started, Polling every ${RELAY_INTERVAL_MS}ms`);
}