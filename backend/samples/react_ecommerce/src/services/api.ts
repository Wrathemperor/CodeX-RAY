// src/services/api.ts
import { Product } from "@/types";

export async function fetchProducts(): Promise<Product[]> {
  return [
    { id: "1", name: "Mechanical Keyboard", price: 129.99 },
    { id: "2", name: "Wireless Mouse", price: 79.99 }
  ];
}
