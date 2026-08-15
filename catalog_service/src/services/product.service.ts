import * as ProductRepository from "../repositories/product.repository";
import { Product } from "../models/product.model";

export async function createProduct(data: Product): Promise<Product> {
    return await ProductRepository.createProduct(data);
}

export async function listProducts(): Promise<Product[]> {
    return await ProductRepository.findAll();
}

export async function getProduct(id: string): Promise<Product> {
    return await ProductRepository.findById(id);
}

export async function updateStock(id: string, stock: number): Promise<Product> {
    if (stock < 0) throw new Error("Stock can not be negative");
    return await ProductRepository.updateStock(id, stock);
}