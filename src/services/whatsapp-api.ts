import axios from "axios";

const WHATSAPP_API_BASE_URL = import.meta.env.VITE_MAIN_ROZANA_WA_URL;

const whatsappApi = axios.create({
  baseURL: WHATSAPP_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface UploadProductRequest {
  retailer_id: string;
  name: string;
  description: string;
  brand: string;
  availability: string;
  image_url: string;
  link: string;
  currency: string;
  price: string;
  sale_price: string;
}

export interface UploadProductResponse {
  message: string;
}

export class WhatsAppApiService {
  static async uploadProduct(
    data: UploadProductRequest
  ): Promise<UploadProductResponse> {
    const res = await whatsappApi.post("/catalog/upload-product", data);
    return res.data;
  }
}
