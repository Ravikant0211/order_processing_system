import { Request, Response } from "express";
import * as OrderService from "../services/order.service";

export async function createOrder(req: Request, res: Response) {
    try {
        const { productId, quantity } = req.body;
        const order = await OrderService.placeOrder(productId, quantity);
        return res.status(201).json(order);
    } catch(err: any) {
        if (err.response?.status === "404") {
            return res.status(404).json({ error: "Product not found" });
        }
        const statusCode = err.statusCode || 500;
        res.status(statusCode).json({ error: err.message || "Something went wrong" });
    }
}