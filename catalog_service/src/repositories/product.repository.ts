import { Product, ProductModel } from "../models/product.model";

export async function createProduct(data: Product): Promise<Product> {
    return await ProductModel.create(data);
}

export async function findAll(): Promise<Product[]> {
    return await ProductModel.find({});
}

export async function findById(id: string): Promise<Product> {
    return await ProductModel.findById(id);
}

export async function updateStock(id: string, stock: number): Promise<Product> {
    return await ProductModel.findByIdAndUpdate(id, { stock }, { new: true });
}