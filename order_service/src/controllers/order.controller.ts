import { Request, Response } from "express";
import * as OrderService from "../services/order.service";

export async function createOrder(req: Request, res: Response) {
    try {
        const { productId, quantity } = req.body;
        const order = await OrderService.placeOrder(productId, quantity);
        return res.status(201).json(order);
    } catch(err: any) {
        // err.response.status: errors from catalogClient (axios)
        // err.statusCode: our own custom errors, errors from paymentClient
        const statusCode = err.response?.status || err.statusCode || 500;
        const message = err.response?.data?.error || err.message || "something went wrong";
        res.status(statusCode).json({ error: message });
    }
}