import * as OrderRepository from "../repositories/order.repository";
import * as CatalogClient from "../clients/catalogClient";
import * as PaymentClient from "../clients/paymentClient";
import { publishAndMarkOrderEvent } from "../outbox/orderEventRelay";

export async function placeOrder(productId: string, quantity: number) {
    // step 1 (forward): reserve stock. Atomic on catalog_service's side, so
    // this alone is what protects against overselling.
    const product = await CatalogClient.reserveStock(productId, quantity);

    // Step 2 (forward): charge payment
    try {
        const payment = await PaymentClient.chargePayment(product.price * quantity);
    } catch (err) {
        // compensating transaction. Undo step 1, since step 2 failed.
        try {
            await CatalogClient.releaseStock(productId, quantity);
        } catch (releaseErr) {
            // The compensation itself can fail too. If it does, the catalog_db
            // is now permanently out of sync with reality - stock stays reserved 
            // for an order that never succeed, and we have no durable way to retry
            // this compensation later. A similar relay-based approach to the outbox
            // pattern below could fix this too, but it is not built here.
            console.log(
                `CRITICAL: failed to release reserved stock for product ${productId} after payment failure:`,
                (releaseErr as Error).message
            );
        }
        throw err;
    }

    // Step 3 (forward): Confirm - only create the order once both the prior steps
    // have actually succeeded. eventPublished default to false.
    const order = await OrderRepository.createOrder({ productId, quantity, status: "PLACED" });

    // Best-effort inline publish — deliberately NOT awaited, so the response
    // to the client never depends on RabbitMQ being reachable or fast. If this
    // fails, or we crash before it finishes, eventPublished is still false and
    // the outbox relay's next poll (src/outbox/orderEventRelay.ts) picks this
    // order up automatically.
    publishAndMarkOrderEvent(order).catch((err) => {
        console.log(
            `[outbox] inline publish attempt failed for order ${order._id}, relay will retry`,
            (err as Error).message
        );
    });

    return order;
}