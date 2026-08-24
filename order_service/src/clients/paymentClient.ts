// Stands in for a real payment gateway (e.g. Stripe). No network call —
// integrating an actual provider is out of scope for learning the saga
// pattern itself; this simulates one succeeding or declining.

// Dial to 0 or 1 to force a deterministic outcome while testing the saga's
// compensation path.
const PAYMENT_FAILURE_RATE = 0.3;

export interface PaymentResult {
    transactionId: string;
    amount: number;
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function chargePayment(amount: number): Promise<PaymentResult> {
    await delay(3000); // simulating real payment provider latency

    if (Math.random() < PAYMENT_FAILURE_RATE) {
        const err: any = new Error("Payment declined");
        err.statusCode = 402;
        throw err;
    }

    return {
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        amount
    }
}