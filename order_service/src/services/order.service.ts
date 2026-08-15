import * as OrderRepository from "../repositories/order.repository";
import * as CatalogClient from "../clients/catalogClient";

export async function placeOrder(productId: string, quantity: number) {
    const product = await CatalogClient.getProduct(productId);
    if (!product || product.stock < quantity) {
        const err: any = new Error("Insufficient stock");
        err.statusCode = 409;
        throw err;
    }
    return await OrderRepository.createOrder({ productId, quantity, status: "PLACED" });
}