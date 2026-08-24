import { Product, ProductModel } from "../models/product.model";

export async function createProduct(data: Product) {
    return await ProductModel.create(data);
}

export async function findAll() {
    return await ProductModel.find({});
}

export async function findById(id: string) {
    return await ProductModel.findById(id);
}

export async function updateStock(id: string, stock: number) {
    return await ProductModel.findByIdAndUpdate(id, { stock }, { new: true });
}

// Atomic: the `stock >= quantity` condition and the decrement happen as one
// database operation, so a concurrent reservation can't read stale stock and
// oversell. Returns null if the product doesn't exist OR stock is
// insufficient — MongoDB can't distinguish those from one query.
export async function reserveStock(id: string, quantity: number) {
    return await ProductModel.findOneAndUpdate(
        { _id: id, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true }
    );
}

export async function releaseStock(id: string, quantity: number) {
    return await ProductModel.findOneAndUpdate(
        { _id: id },
        { $inc: { stock: quantity } },
        { new: true }
    );
}