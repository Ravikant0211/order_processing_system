import axios from "axios";

export interface CatalogProduct {
    _id: string;
    name: string;
    stock: number;
}

export async function getProduct(productId: string): Promise<CatalogProduct> {
    const baseUrl = process.env.CATALOG_SERVICE_BASEURL;
    const response = await axios.get(`${baseUrl}/products/${productId}`);
    return response.data;
}