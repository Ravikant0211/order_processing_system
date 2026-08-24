import * as OrderRepository from "../repositories/order.repository";
import * as CatalogClient from "../clients/catalogClient";
import * as PaymentClient from "../clients/paymentClient";
import { publishOrderCreated } from "../events/orderEvents";

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
            // this compensation later. This is the same class of problem the outbox
            // pattern exists to solve; not fixed here.
            console.log(
                `CRITICAL: failed to release reserved stock for product ${productId} after payment failure:`,
                (releaseErr as Error).message
            );
        }
        throw err;
    }

    // Step 3 (forward): Confirm - only create the order once both the prior steps
    // have actually succeeded. 
    const order = await OrderRepository.createOrder({ productId, quantity, status: "PLACED" });

    publishOrderCreated({
        orderId: order._id,
        productId: order.productId,
        quantity: order.quantity,
        status: order.status,
        createdAt: order.createdAt
    });

    return order;
}