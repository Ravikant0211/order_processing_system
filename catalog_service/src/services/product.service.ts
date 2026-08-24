import * as ProductRepository from "../repositories/product.repository";
import { Product } from "../models/product.model";

export async function createProduct(data: Product) {
    return await ProductRepository.createProduct(data);
}

export async function listProducts(): Promise<Product[]> {
    return await ProductRepository.findAll();
}

export async function getProduct(id: string) {
    return await ProductRepository.findById(id);
}

export async function updateStock(id: string, stock: number) {
    if (stock < 0) throw new Error("Stock can not be negative");
    return await ProductRepository.updateStock(id, stock);
}

export async function reserveStock(id: string, quantity: number) {
    if (quantity <= 0) throw new Error("Quantity must be positive");
    const product = await ProductRepository.reserveStock(id, quantity);
    if (!product) {
        const err: any = new Error("Insufficient stock or product not found");
        err.statusCode = 409;
        throw err;
    }
    return product;
}

export async function releaseStock(id: string, quantity: number) {
    if (quantity <= 0) throw new Error("Quantity must be positive");
    const product = await ProductRepository.releaseStock(id, quantity);
    if (!product) {
        const err: any = new Error("Insufficient stock or product not found");
        err.statusCode = 409;
        throw err;
    }
    return product;
}