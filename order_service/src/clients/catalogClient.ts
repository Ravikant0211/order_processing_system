import axios from "axios";
import CircuitBreaker from "opossum";

const REQUEST_TIMEOUT_MS = 3000;
const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 200;

export interface CatalogProduct {
    _id: string;
    name: string;
    stock: number;
    price: number;
}

function isRetryable(err: any): boolean {
    if (err.code === "ECONNABORTED") return true; // our own timeout is firing.
    if (!err.response) return true; // Connection refused / no response at all.
    return err.response.status >= 500; // catalog-service's own server error
}

// 4XX responses (insufficient stock, not found, bad request) are valid
// business outcomes, not infrastructure failures. They should not
// count as a failure on circuit breaker. The same reasoning keeps
// them out of retry.
function isBusinessRejection(err: any): boolean {
  const status = err.response?.status;
  return status >= 400 && status < 500;
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(makeRequest: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await makeRequest();
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
const breakerOptions: CircuitBreaker.Options = {
  timeout: false as const,
  errorThresholdPercentage: 50,
  volumeThreshold: 2,
  resetTimeout: 10000,
  // Must comfortably outlast a single call's worst case (~9.7s: 3 attempts x
  // up to 3s each, plus backoff), or a failure ages out of the window before
  // the next one lands, and volumeThreshold never gets satisfied.
  rollingCountTimeout: 30000,
  errorFilter: isBusinessRejection
}

function wireBreakerLogs(breaker: CircuitBreaker): void {
  breaker.on("open", () =>
    console.warn(`[catalogClient] circuit OPEN on ${breaker.name} — short-circuiting`)
  );
  breaker.on("halfOpen", () =>
    console.warn(`[catalogClient] circuit HALF-OPEN on ${breaker.name} — trying one request`)
  );
  breaker.on("close", () =>
    console.warn(`[catalogClient] circuit CLOSED on ${breaker.name} — resumed`)
  );
}

async function fetchProduct(productId: string): Promise<CatalogProduct> {
    const baseUrl = process.env.CATALOG_SERVICE_BASEURL;
    const url = `${baseUrl}/products/${productId}`;
    return await withRetry<CatalogProduct>(async () => {
      const response = await axios.get(url, { timeout: REQUEST_TIMEOUT_MS });
      return response.data;
    });
}

async function reserveStockRequest(productId: string, quantity: number): Promise<CatalogProduct> {
  const baseUrl = process.env.CATALOG_SERVICE_BASEURL;
  const url = `${baseUrl}/products/${productId}/reserve`;
  return await withRetry<CatalogProduct>(async () => {
    const response = await axios.post(url, { quantity }, { timeout: REQUEST_TIMEOUT_MS });
    return response.data;
  })
}

async function releaseStockRequest(productId: string, quantity: number): Promise<CatalogProduct> {
  const baseUrl = process.env.CATALOG_SERVICE_BASEURL;
  const url = `${baseUrl}/products/${productId}/release`;
  return await withRetry<CatalogProduct>(async () => {
    const response = await axios.post(url, { quantity }, { timeout: REQUEST_TIMEOUT_MS });
    return response.data;
  })
}

// timeout: false — each attempt already bounds itself via axios's own timeout,
// so this action can never hang; opossum only needs to watch for rejections.
const getProductBreaker = new CircuitBreaker(fetchProduct, { ...breakerOptions, name: "getProduct" });
const reserveStockBreaker = new CircuitBreaker(reserveStockRequest, { ...breakerOptions, name: "reserveStock" });
const releaseStockBreaker = new CircuitBreaker(releaseStockRequest, { ...breakerOptions, name: "releaseStock" });

[getProductBreaker, reserveStockBreaker, releaseStockBreaker].forEach(wireBreakerLogs);

export async function getProduct(productId: string): Promise<CatalogProduct> {
  return getProductBreaker.fire(productId) as Promise<CatalogProduct>;
}

export async function reserveStock(productId: string, quantity: number): Promise<CatalogProduct> {
  return reserveStockBreaker.fire(productId, quantity) as Promise<CatalogProduct>;
}

export async function releaseStock(productId: string, quantity: number): Promise<CatalogProduct> {
  return releaseStockBreaker.fire(productId, quantity);
}

