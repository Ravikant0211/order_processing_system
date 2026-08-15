import { Schema, model, InferSchemaType } from "mongoose";

const orderSchema = new Schema({
    productId: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    status: { type: String, required: true, default: "PLACED" }
}, { timestamps: true });

export type Order = InferSchemaType<typeof orderSchema>;

export const OrderModel = model("Order", orderSchema);