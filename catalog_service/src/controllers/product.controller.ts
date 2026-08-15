import { Request, Response } from "express";
import * as ProductService from "../services/product.service";
import { Product } from "../models/product.model";

export async function createProduct(req: Request, res: Response): Promise<any> {
    try {
        const product = await ProductService.createProduct(req.body);
        return res.status(201).json(product);
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
}

export async function listProducts(req: Request, res: Response): Promise<any> {
    const products = await ProductService.listProducts();
    return res.status(200).json(products);
}

export async function getProduct(req: Request, res: Response): Promise<any> {
    const product = await ProductService.getProduct(req.params.id as string);
    if (!product) {
        return res.status(404).json({ error: "Product not found" });
    }
    return res.status(200).json(product);
}

export async function updateStock(req: Request, res: Response): Promise<any> {
    try {
        const { stock } = req.body;
        const product = await ProductService.updateStock(req.params.id as string, stock);
        if (!product) return res.status(404).json({ error: "Product not found" });
        return res.status(200).json(product);
    } catch (err) {
        return res.status(400).json({ error: (err as Error).message });
    }
}

