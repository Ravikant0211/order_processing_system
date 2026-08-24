import { Request, Response } from "express";
import * as ProductService from "../services/product.service";

export async function createProduct(req: Request, res: Response) {
    try {
        const product = await ProductService.createProduct(req.body);
        return res.status(201).json(product);
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
}

export async function listProducts(req: Request, res: Response) {
    const products = await ProductService.listProducts();
    return res.status(200).json(products);
}

export async function getProduct(req: Request, res: Response) {
    const product = await ProductService.getProduct(req.params.id as string);
    if (!product) {
        return res.status(404).json({ error: "Product not found" });
    }
    return res.status(200).json(product);
}

export async function updateStock(req: Request, res: Response) {
    try {
        const { stock } = req.body;
        const product = await ProductService.updateStock(req.params.id as string, stock);
        if (!product) return res.status(404).json({ error: "Product not found" });
        return res.status(200).json(product);
    } catch (err) {
        return res.status(400).json({ error: (err as Error).message });
    }
}

export async function reserveStock(req: Request, res: Response) {
    try {
        const { quantity } = req.body;
        const product = await ProductService.reserveStock(req.params.id as string, quantity);
        return res.status(200).json(product);
    } catch (err) {
        const statusCode = (err as any).statusCode || 400;
        res.status(statusCode).json({ error: (err as Error).message });
    }
}

export async function releaseStock(req: Request, res: Response) {
    try {
        const { quantity } = req.body;
        const product = await ProductService.releaseStock(req.params.id as string, quantity);
        return res.status(200).json(product);
    } catch (err) {
        const statusCode = (err as any).statusCode || 400;
        res.status(statusCode).json({ error: (err as Error).message });
    }
}

