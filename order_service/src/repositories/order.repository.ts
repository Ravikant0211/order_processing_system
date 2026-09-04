import { Order, OrderModel } from "../models/order.model";

type newOrder = Omit<Order, "updatedAt" | "createdAt" | "eventPublished">;

export async function createOrder(data: newOrder) {
    return await OrderModel.create(data);
}