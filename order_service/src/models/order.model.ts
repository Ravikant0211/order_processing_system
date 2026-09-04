import { Schema, model, InferSchemaType } from "mongoose";

const orderSchema = new Schema({
    productId: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    status: { type: String, required: true, default: "PLACED" },
    // The outbox flag: default to false for the same document
    // So an order can never exist without publishing its event
    eventPublished: { type: Boolean, default: false }
}, { timestamps: true });

export type Order = InferSchemaType<typeof orderSchema>;

export const OrderModel = model("Order", orderSchema);