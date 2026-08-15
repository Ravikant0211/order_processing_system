import { Schema, model, InferSchemaType } from 'mongoose';

const productSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    sku: { type: String, required: true, unique: true },
    stock: { type: Number, required: true, min: 0, default: 0 }
}, { timestamps: true });

export type Product = InferSchemaType<typeof productSchema>;

export const ProductModel = model("Product", productSchema);