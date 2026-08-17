import axios from "axios";
import CircuitBreaker from "opossum";

const REQUEST_TIMEOUT_MS = 3000;
const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 200;

export interface CatalogProduct {
    _id: string;
    name: string;
    stock: number;
}

function isRetryable(err: any): boolean {
    if (err.code === "ECONNABORTED") return true; // our own timeout is firing.
    if (!err.response) return true; // Connection refused / no response at all.
    return err.response.status >= 500; // catalog-service's own server error
}

async function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchProductWithRetry(productId: string): Promise<CatalogProduct> {
    const baseUrl = process.env.CATALOG_SERVICE_BASEURL;
    const url = `${baseUrl}/products/${productId}`;

    for (let attempt = 0; ; attempt++) {
        try {
            const response = await axios.get(url, { timeout: REQUEST_TIMEOUT_MS });
            return response.data;
        } catch (err) {
            const canRetry = attempt < MAX_RETRIES && isRetryable(err);
            if (!canRetry) throw err;

            const backoff = BASE_BACKOFF_MS * 2 ** attempt;
            const jitter = Math.random() * backoff * 0.5; 
            await delay(backoff + jitter);
        }
    }
}

// timeout: false — each attempt already bounds itself via axios's own timeout,
// so this action can never hang; opossum only needs to watch for rejections.
const breaker = new CircuitBreaker(fetchProductWithRetry, {
  timeout: false,
  errorThresholdPercentage: 50,
  volumeThreshold: 2,
  resetTimeout: 10000,
  rollingCountTimeout: 30000
});

breaker.on("open", () =>
  console.warn("[catalogClient] circuit OPEN — short-circuiting calls to catalog-service")
);
breaker.on("halfOpen", () =>
  console.warn("[catalogClient] circuit HALF-OPEN — trying one request to catalog-service")
);
breaker.on("close", () =>
  console.warn("[catalogClient] circuit CLOSED — calls to catalog-service resumed")
);

export async function getProduct(productId: string): Promise<CatalogProduct> {
  return breaker.fire(productId) as Promise<CatalogProduct>;
}



