import * as OrderRepository from "../repositories/order.repository";
import * as CatalogClient from "../clients/catalogClient";
import { publishOrderCreated } from "../events/orderEvents";

export async function placeOrder(productId: string, quantity: number) {
    const product = await CatalogClient.getProduct(productId);

    if (!product || product.stock < quantity) {
        const err: any = new Error("Insufficient stock");
        err.statusCode = 409;
        throw err;
    }

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