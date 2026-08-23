import { Schema, model } from "mongoose";

// The unique index on 'orderId' is the actual idempotency mechanism.
// Allows only one insert per unique orderId, no matter how many times the 
// same message gets redelivered or how many consumer instances race on it.
const processedOrderEventSchema = new Schema({
    orderId: { type: String, required: true, unique: true }
}, { timestamps: true });

export const ProcessedOrderEventModel = model("ProcessedOrderEvent", processedOrderEventSchema);